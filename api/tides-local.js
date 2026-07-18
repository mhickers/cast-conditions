// Self-hosted tide predictions, independent of NOAA's live services.
//
// July 2026: NOAA CO-OPS' cloud-migrated predictions service went down for
// days (first 502/504, then 200-with-error-body). Predictions are pure math —
// a sum of ~37 harmonic constituents whose amplitudes/phases NOAA publishes
// and which change roughly annually — so this endpoint computes them locally:
//
//   - @neaps/tide-database: public-domain snapshot of NOAA's station
//     directory (6,000+ stations) with harmonic constants, datums, and
//     subordinate-station offsets
//   - @neaps/tide-predictor: harmonic synthesis (Schureman/NOAA convention)
//
// The response mirrors NOAA datagetter's shape ({"predictions":[{t,v,type}]})
// so the client can consume it with the same parser. It is the client's
// FALLBACK when NOAA's live feed fails — NOAA stays authoritative when up.
//
// Correctness notes (validated in sandbox against Atlantic City 8534720):
//   - Database amplitudes/datums are METERS; we convert to feet (english).
//   - Heights are presented in MLLW via a Z0 offset = MSL - MLLW from the
//     station datums. Stations missing either datum return empty rather than
//     a wrong-datum height.
//   - Subordinate stations: reference station constituents + published
//     time/height offsets — NOAA's own published-table method. Ratio offsets
//     multiply the MLLW-referenced height (matches NOAA convention; verified
//     against the library's implementation). Subordinates get hilo events
//     only — the client already synthesizes curves from events (cosine),
//     exactly as it does for NOAA subordinate responses.
//   - The low-level createTidePredictor API is used throughout: the
//     useStation wrapper silently drops subordinate offsets (library bug
//     found in testing).
//   - Times are formatted in the station's IANA timezone, matching the
//     lst_ldt times the client expects from NOAA.

// The database's CJS build has a broken kdbush interop ("l.default.from is
// not a function"), so both packages are loaded via dynamic import() — the
// ESM builds work. Cached at module scope so warm invocations pay nothing.
const M_TO_FT = 3.28084;

let loaded = null;
function load() {
  if (!loaded) {
    loaded = Promise.all([
      import('@neaps/tide-database'),
      import('@neaps/tide-predictor'),
    ]).then(([db, tp]) => {
      const byId = new Map();
      for (const s of db.stations) {
        if (s.source && s.source.id) byId.set(String(s.source.id), s);
      }
      return { byId, createTidePredictor: tp.createTidePredictor };
    });
  }
  return loaded;
}

// yyyymmdd -> 'yyyy-mm-dd' (no timezone math; used for local-date filtering)
function dashDate(yyyymmdd) {
  if (!/^\d{8}$/.test(yyyymmdd || '')) return null;
  return yyyymmdd.slice(0, 4) + '-' + yyyymmdd.slice(4, 6) + '-' + yyyymmdd.slice(6, 8);
}

// Format a Date in the station's timezone as 'yyyy-mm-dd HH:mm' (NOAA style)
function localFormatter(timeZone) {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  return (d) => {
    const parts = {};
    for (const p of f.formatToParts(d)) parts[p.type] = p.value;
    return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
  };
}

function send(res, status, body, cacheable) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Deterministic astronomy: cache real predictions hard; never cache empties
  // or errors (a future database update or bug fix must be able to land).
  res.setHeader('Cache-Control', cacheable
    ? 'public, s-maxage=21600, stale-while-revalidate=86400'
    : 'no-store');
  return res.status(status).json(body);
}

module.exports = async (req, res) => {
  try {
    const q = req.query || {};
    const stationId = String(q.station || '');
    const begin = dashDate(String(q.begin_date || ''));
    const end = dashDate(String(q.end_date || ''));
    const interval = String(q.interval || 'hilo');
    if (!stationId || !begin || !end) {
      return send(res, 400, { error: 'station, begin_date, end_date (yyyymmdd) required' }, false);
    }

    const { byId: idx, createTidePredictor } = await load();
    const station = idx.get(stationId);
    if (!station) return send(res, 200, { predictions: [] }, false);

    // Resolve constituents + datums (one reference hop for subordinates)
    let source = station;
    let offsets;
    if (station.type === 'subordinate') {
      const refId = station.offsets && station.offsets.reference
        ? String(station.offsets.reference).split('/').pop() : null;
      source = refId ? idx.get(refId) : null;
      offsets = station.offsets;
    }
    if (!source || !Array.isArray(source.harmonic_constituents) || !source.harmonic_constituents.length) {
      return send(res, 200, { predictions: [] }, false);
    }
    const d = source.datums || {};
    if (typeof d.MSL !== 'number' || typeof d.MLLW !== 'number') {
      return send(res, 200, { predictions: [] }, false);
    }

    const predictor = createTidePredictor(source.harmonic_constituents, { offset: d.MSL - d.MLLW });
    const fmt = localFormatter(station.timezone || 'UTC');
    // Padded UTC window covers every timezone; results filtered by local date.
    const start = new Date(begin + 'T00:00:00Z');
    start.setUTCDate(start.getUTCDate() - 1);
    const stop = new Date(end + 'T00:00:00Z');
    stop.setUTCDate(stop.getUTCDate() + 2);
    const inRange = (t) => { const day = t.slice(0, 10); return day >= begin && day <= end; };

    let predictions = [];
    if (interval === 'hilo') {
      const extremes = predictor.getExtremesPrediction({ start, end: stop, offsets });
      predictions = extremes
        .map(e => ({ t: fmt(e.time), v: (e.level * M_TO_FT).toFixed(3), type: e.high ? 'H' : 'L' }))
        .filter(p => inRange(p.t));
    } else {
      // Curve request. Subordinates have no defined continuous curve (time
      // offsets differ for highs vs lows) — return empty; the client
      // synthesizes from events, same as it does for NOAA subordinates.
      if (offsets) return send(res, 200, { predictions: [] }, true);
      const minutes = Math.max(6, parseInt(interval, 10) || 30);
      const r = predictor.getTimelinePrediction({ start, end: stop, timeFidelity: minutes * 60 });
      predictions = r
        .map(p => ({ t: fmt(p.time), v: (p.level * M_TO_FT).toFixed(3) }))
        .filter(p => inRange(p.t));
    }

    return send(res, 200, { predictions }, predictions.length > 0);
  } catch (e) {
    return send(res, 500, { error: 'Tide computation failed', detail: e && e.message }, false);
  }
};
