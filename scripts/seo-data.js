// Build-time data enrichment for the SEO spot pages.
//
// WHY: the generated pages used to *describe* live data ("tides from the nearest
// NOAA station") without containing any. Google reads that as commodity content
// — the same words on 700 pages. This module bakes the real numbers in so each
// page is the answer, not a brochure for the answer.
//
// CACHE (scripts/seo-cache.json, COMMITTED) has three buckets, deliberately
// separated so a partial fetch can never be cached as if it were complete:
//   spots[slug]     -> which station/gauge serves this town (expensive to
//                      discover, never changes). kind 'none' = definitively no
//                      station/gauge nearby, so we stop re-checking every build.
//   stations[id]    -> { meanRangeFt }        (only written on a real success)
//   gauges[siteId]  -> { monthlyMedianCfs }   (only written on a real success)
// Anything missing is simply retried next build. Nothing is ever cached as null.
//
// VOLATILE tide predictions are fetched every build and never cached to disk:
// tide times shift ~50 min/day, so a stale table would be wrong, and wrong tide
// times are worse than none.
//
// PHASE BUDGETS: each phase gets its own clock, and TIDES RUN FIRST. An earlier
// version used one global budget with tides last; the slow USGS phase ate the
// whole budget and every tide fetch short-circuited, producing 0 tide tables.
// Phases are ordered by value: tides > datums > inland stats.
//
// SAFETY: every failure path degrades to "no data block" and the build still
// succeeds. A NOAA outage must never break a deploy. SEO_DATA=off skips all
// network access (fast local builds).

const fs = require('fs');
const path = require('path');

const CACHE_PATH = path.join(__dirname, 'seo-cache.json');
const CACHE_VERSION = 2;
const TIDE_DAYS = 10;
const CONCURRENCY = 8;
const FETCH_TIMEOUT_MS = 20000;

// Per-phase ceilings. Only ever hit on a cold cache; once the cache is committed
// and complete, the durable phases cost zero fetches and a build spends ~1 min
// refreshing tide tables.
const BUDGET = {
  tides: 6 * 60 * 1000,
  datums: 5 * 60 * 1000,
  inland: 15 * 60 * 1000,
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// ---------------------------------------------------------------- utilities

let _deadline = Infinity;
const overBudget = () => Date.now() > _deadline;
const startPhase = (ms) => { _deadline = Date.now() + ms; };

const haversineMi = (lat1, lon1, lat2, lon2) => {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

// Never throws. Returns { ok, body }. ok:false means "we do not know" — callers
// must NOT read it as "no data exists", or a timeout gets cached as a real miss.
async function getRaw(url, kind = 'json') {
  if (overBudget()) return { ok: false, body: null };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'FishCondish/1.0 (+https://fishcondish.com)' } });
    if (!res.ok) return { ok: false, body: null };
    return { ok: true, body: kind === 'json' ? await res.json() : await res.text() };
  } catch {
    return { ok: false, body: null };
  } finally {
    clearTimeout(timer);
  }
}

async function pool(items, limit, worker) {
  const out = new Array(items.length);
  let i = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const idx = i++;
      if (idx >= items.length) return;
      try { out[idx] = await worker(items[idx], idx); } catch { out[idx] = null; }
    }
  });
  await Promise.all(runners);
  return out;
}

// USGS RDB: tab-delimited, '#' comments, row 0 = header, row 1 = format spec.
function parseRdb(text) {
  if (!text) return [];
  const lines = text.split('\n').filter(l => l && !l.startsWith('#'));
  if (lines.length < 3) return [];
  const header = lines[0].split('\t');
  const rows = [];
  for (let k = 2; k < lines.length; k++) {
    const cols = lines[k].split('\t');
    if (cols.length < header.length) continue;
    const o = {};
    header.forEach((h, j) => { o[h] = cols[j]; });
    rows.push(o);
  }
  return rows;
}

const median = (arr) => {
  const a = arr.filter(Number.isFinite).sort((x, y) => x - y);
  if (!a.length) return null;
  const mid = a.length >> 1;
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
};

const ymd = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

// ---------------------------------------------------------------- cache

// v1 -> v2. Preserves the expensive discovery work (which station/gauge serves a
// town) and any values genuinely fetched, while dropping the nulls a blown
// budget wrote — those get retried instead of being trusted forever.
function migrate(old) {
  const c = { version: CACHE_VERSION, spots: {}, stations: {}, gauges: {} };
  if (!old || !old.spots) return c;
  let kept = 0;
  for (const [slug, v] of Object.entries(old.spots)) {
    if (!v || !v.kind) continue;
    if (v.kind === 'coastal' && v.station && v.station.id) {
      c.spots[slug] = { kind: 'coastal', station: v.station };
      if (v.meanRangeFt != null) c.stations[v.station.id] = { meanRangeFt: v.meanRangeFt };
      kept++;
    } else if (v.kind === 'inland' && v.gauge && v.gauge.siteId) {
      c.spots[slug] = { kind: 'inland', gauge: v.gauge };
      if (v.monthlyMedianCfs) c.gauges[v.gauge.siteId] = { monthlyMedianCfs: v.monthlyMedianCfs };
      kept++;
    } else if (v.kind === 'none') {
      c.spots[slug] = { kind: 'none' };
    }
  }
  if (kept) console.log(`[seo-data] migrated ${kept} cached spot assignments to cache v${CACHE_VERSION}`);
  return c;
}

function loadCache() {
  let raw = null;
  try { raw = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')); } catch { return { version: CACHE_VERSION, spots: {}, stations: {}, gauges: {} }; }
  if (raw && raw.version === CACHE_VERSION && raw.spots) {
    return { version: CACHE_VERSION, spots: raw.spots || {}, stations: raw.stations || {}, gauges: raw.gauges || {} };
  }
  return migrate(raw);
}

function saveCache(cache) {
  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0) + '\n');
  } catch (e) {
    console.warn(`[seo-data] could not write cache: ${e.message}`);
  }
}

// ---------------------------------------------------------------- NOAA

let _stationDir = null;
async function stationDirectory() {
  if (_stationDir) return _stationDir;
  const r = await getRaw('https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=tidepredictions');
  if (!r.ok || !r.body || !Array.isArray(r.body.stations)) return null;
  _stationDir = r.body.stations
    .filter(s => s && s.lat != null && s.lng != null)
    .map(s => ({ id: s.id, name: s.name, lat: s.lat, lon: s.lng }));
  return _stationDir;
}

async function meanRangeFt(stationId) {
  const r = await getRaw(`https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations/${stationId}/datums.json`);
  if (!r.ok || !r.body) return { ok: false, value: null };
  const list = Array.isArray(r.body.datums) ? r.body.datums : [];
  const mn = list.find(x => x && x.name === 'MN');
  const v = mn ? parseFloat(mn.value) : NaN;
  // A successful response with no MN datum is a real answer: this station simply
  // has no published mean range (common at subordinate stations).
  return { ok: true, value: Number.isFinite(v) ? Math.round(v * 10) / 10 : null };
}

async function tidePredictions(stationId, start, end) {
  const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=${stationId}` +
    `&product=predictions&datum=MLLW&time_zone=lst_ldt&units=english&format=json&interval=hilo` +
    `&begin_date=${ymd(start)}&end_date=${ymd(end)}`;
  const r = await getRaw(url);
  if (!r.ok || !r.body || !Array.isArray(r.body.predictions)) return null;
  const byDay = {};
  for (const p of r.body.predictions) {
    if (!p || typeof p.t !== 'string') continue;
    const [date, time] = p.t.split(' ');
    const v = parseFloat(p.v);
    if (!date || !time || !Number.isFinite(v)) continue;
    (byDay[date] = byDay[date] || []).push({ time, ft: Math.round(v * 10) / 10, type: p.type === 'H' ? 'H' : 'L' });
  }
  return Object.keys(byDay).length ? byDay : null;
}

// ---------------------------------------------------------------- USGS

// Returns { definitive, site }. definitive:true + site:null means USGS answered
// and there genuinely is no active discharge gauge nearby — safe to cache as a
// miss. definitive:false means we never got a clean answer: retry next build.
async function nearestGauge(lat, lon) {
  let anyOk = false;
  for (const d of [0.35, 0.75, 1.5]) {
    const bbox = [(lon - d).toFixed(4), (lat - d).toFixed(4), (lon + d).toFixed(4), (lat + d).toFixed(4)].join(',');
    const r = await getRaw(
      `https://waterservices.usgs.gov/nwis/site/?format=rdb&bBox=${bbox}` +
      `&siteOutput=expanded&parameterCd=00060&siteType=ST&hasDataTypeCd=iv&siteStatus=active`, 'text');
    if (!r.ok) continue;
    anyOk = true;
    const sites = parseRdb(r.body).map(row => {
      const sLat = parseFloat(row.dec_lat_va), sLon = parseFloat(row.dec_long_va);
      if (!Number.isFinite(sLat) || !Number.isFinite(sLon)) return null;
      const area = parseFloat(row.drain_area_va);
      return {
        siteId: row.site_no,
        name: (row.station_nm || '').trim(),
        distanceMi: Math.round(haversineMi(lat, lon, sLat, sLon) * 10) / 10,
        drainageSqMi: Number.isFinite(area) ? area : null,
      };
    }).filter(Boolean).sort((a, b) => a.distanceMi - b.distanceMi);
    if (sites.length) return { definitive: true, site: sites[0] };
  }
  return { definitive: anyOk, site: null };
}

async function monthlyMedianFlow(siteId) {
  const r = await getRaw(
    `https://waterservices.usgs.gov/nwis/stat/?format=rdb&sites=${siteId}` +
    `&statReportType=daily&statTypeCd=p50&parameterCd=00060`, 'text');
  if (!r.ok) return { ok: false, value: null };
  const rows = parseRdb(r.body);
  const buckets = {};
  for (const row of rows) {
    const mo = parseInt(row.month_nu, 10);
    const v = parseFloat(row.p50_va);
    if (!(mo >= 1 && mo <= 12) || !Number.isFinite(v)) continue;
    (buckets[mo] = buckets[mo] || []).push(v);
  }
  const out = {};
  let any = false;
  for (let m = 1; m <= 12; m++) {
    const med = buckets[m] ? median(buckets[m]) : null;
    if (med != null) { out[m] = Math.round(med); any = true; }
  }
  return { ok: true, value: any ? out : null };
}

// ---------------------------------------------------------------- public API

async function enrichTowns(towns, slugify) {
  if (String(process.env.SEO_DATA || '').toLowerCase() === 'off') {
    console.log('[seo-data] SEO_DATA=off — skipping data enrichment');
    return new Map();
  }
  if (typeof fetch !== 'function') {
    console.warn('[seo-data] global fetch unavailable — skipping data enrichment');
    return new Map();
  }

  const out = new Map();
  const t0 = Date.now();
  let dirty = false;
  const warn = [];
  let stationIds = [];

  try {
    const cache = loadCache();
    const coastal = towns.filter(t => t.type === 'coastal');
    const inland = towns.filter(t => t.type !== 'coastal');

    // --- Phase 1: coastal station assignment (1 directory fetch, then local) --
    startPhase(BUDGET.tides);
    const needDir = coastal.some(t => !cache.spots[slugify(t.name)]);
    let dir = null;
    if (needDir) {
      dir = await stationDirectory();
      if (!dir) warn.push('NOAA station directory unavailable');
    }
    for (const t of coastal) {
      const slug = slugify(t.name);
      if (cache.spots[slug]) continue;
      if (!dir) continue;
      const near = dir
        .map(s => ({ ...s, distanceMi: Math.round(haversineMi(t.lat, t.lon, s.lat, s.lon) * 10) / 10 }))
        .filter(s => s.distanceMi <= 45)
        .sort((a, b) => a.distanceMi - b.distanceMi)[0];
      cache.spots[slug] = near
        ? { kind: 'coastal', station: { id: near.id, name: near.name, distanceMi: near.distanceMi } }
        : { kind: 'none' };
      dirty = true;
    }

    // --- Phase 2: TIDE PREDICTIONS (the headline; runs before anything slow) --
    stationIds = [...new Set(
      coastal.map(t => cache.spots[slugify(t.name)]).filter(v => v && v.kind === 'coastal').map(v => v.station.id)
    )];
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + TIDE_DAYS - 1);
    const tideByStation = new Map();
    if (stationIds.length) {
      const preds = await pool(stationIds, CONCURRENCY, id => tidePredictions(id, start, end));
      stationIds.forEach((id, i) => { if (preds[i]) tideByStation.set(id, preds[i]); });
    }
    if (overBudget()) warn.push('tide phase hit its budget');

    // --- Phase 3: datums / mean tide range (durable, per station) ------------
    startPhase(BUDGET.datums);
    const needDatum = stationIds.filter(id => !cache.stations[id]);
    if (needDatum.length) {
      const got = await pool(needDatum, CONCURRENCY, id => meanRangeFt(id));
      needDatum.forEach((id, i) => {
        const g = got[i];
        if (g && g.ok) { cache.stations[id] = { meanRangeFt: g.value }; dirty = true; }
      });
    }
    if (overBudget()) warn.push('datum phase hit its budget');

    // --- Phase 4: inland gauges + monthly medians (slowest, runs last) -------
    startPhase(BUDGET.inland);
    const needGauge = inland.filter(t => !cache.spots[slugify(t.name)]);
    if (needGauge.length) {
      const found = await pool(needGauge, CONCURRENCY, t => nearestGauge(t.lat, t.lon));
      needGauge.forEach((t, i) => {
        const f = found[i];
        if (!f || !f.definitive) return;         // unknown -> retry next build
        const slug = slugify(t.name);
        cache.spots[slug] = f.site ? { kind: 'inland', gauge: f.site } : { kind: 'none' };
        dirty = true;
      });
    }
    const siteIds = [...new Set(
      inland.map(t => cache.spots[slugify(t.name)]).filter(v => v && v.kind === 'inland').map(v => v.gauge.siteId)
    )];
    const needStat = siteIds.filter(id => !cache.gauges[id]);
    if (needStat.length) {
      const got = await pool(needStat, CONCURRENCY, id => monthlyMedianFlow(id));
      needStat.forEach((id, i) => {
        const g = got[i];
        if (g && g.ok) { cache.gauges[id] = { monthlyMedianCfs: g.value }; dirty = true; }
      });
    }
    if (overBudget()) warn.push('inland phase hit its budget');

    if (dirty) saveCache(cache);
    _deadline = Infinity;

    // --- Assemble -----------------------------------------------------------
    for (const t of towns) {
      const slug = slugify(t.name);
      const v = cache.spots[slug];
      if (!v || v.kind === 'none') continue;
      if (v.kind === 'coastal') {
        const st = cache.stations[v.station.id];
        out.set(slug, {
          kind: 'coastal',
          station: v.station,
          meanRangeFt: st ? st.meanRangeFt : null,
          tideDays: tideByStation.get(v.station.id) || null,
        });
      } else if (v.kind === 'inland') {
        const g = cache.gauges[v.gauge.siteId];
        out.set(slug, { kind: 'inland', gauge: v.gauge, monthlyMedianCfs: g ? g.monthlyMedianCfs : null });
      }
    }

    const withTides = [...out.values()].filter(v => v.tideDays).length;
    const coastalResolved = [...out.values()].filter(v => v.kind === 'coastal').length;
    const pending = towns.filter(t => !cache.spots[slugify(t.name)]).length;
    if (warn.length) console.warn(`[seo-data] INCOMPLETE — ${warn.join('; ')}. Re-run the build to fill the cache.`);
    console.log(
      `[seo-data] ${out.size}/${towns.length} spots enriched | ${withTides}/${coastalResolved} coastal pages with tide tables ` +
      `(${stationIds.length} unique stations) | ${pending} still undiscovered | ${((Date.now() - t0) / 1000).toFixed(1)}s`
    );
  } catch (e) {
    console.warn(`[seo-data] enrichment failed, pages will build without data: ${e && e.message}`);
  }
  _deadline = Infinity;
  return out;
}

module.exports = { enrichTowns, MONTHS, MONTHS_FULL, CACHE_PATH };
