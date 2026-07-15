// Build-time data enrichment for the SEO spot pages.
//
// WHY: the generated pages used to *describe* live data ("tides from the nearest
// NOAA station") without containing any. Google reads that as commodity content
// — the same words on 700 pages — which is why so many sat in "Crawled –
// currently not indexed". This module bakes the real numbers into the HTML so
// each page is the answer, not a brochure for the answer.
//
// TWO TIERS, on purpose:
//   1. DURABLE facts (which station serves a town, its mean tide range, the
//      nearest gauge, its drainage area, its month-by-month median flow) never
//      change. They're cached in scripts/seo-cache.json, which is COMMITTED, so
//      Vercel builds don't refetch ~1,700 endpoints every deploy.
//   2. VOLATILE facts (tide predictions) are fetched fresh on every build and
//      never cached to disk. Tide times shift ~50 min/day, so a stale cached
//      table would be wrong — and wrong tide times are worse than none.
//
// SAFETY: every failure path degrades to "no data block" and the build still
// succeeds. A NOAA outage must never break a deploy. Set SEO_DATA=off to skip
// all network access (fast local builds).

const fs = require('fs');
const path = require('path');

const CACHE_PATH = path.join(__dirname, 'seo-cache.json');
const CACHE_VERSION = 1;
const TIDE_DAYS = 10;          // window baked into each coastal page
const CONCURRENCY = 6;         // polite to NOAA/USGS
const FETCH_TIMEOUT_MS = 20000;
// Hard ceiling on the whole enrichment step. A *dead* API fails fast, but a
// *slow* one could otherwise stall the build for 30+ minutes and blow Vercel's
// timeout. Past the deadline every fetch short-circuits to null and the build
// ships with whatever it already has.
const TIME_BUDGET_MS = 8 * 60 * 1000;
let _deadline = Infinity;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// ---------------------------------------------------------------- utilities

const haversineMi = (lat1, lon1, lat2, lon2) => {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

// Never throws. Returns null on any failure (timeout, non-2xx, bad body).
async function get(url, kind = 'json') {
  if (Date.now() > _deadline) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'FishCondish/1.0 (+https://fishcondish.com)' } });
    if (!res.ok) return null;
    return kind === 'json' ? await res.json() : await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Bounded-concurrency map. Rejections are impossible: worker swallows them.
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

// Parse a USGS RDB body into objects. RDB = tab-delimited, '#' comments,
// row 0 = header, row 1 = format spec (skipped).
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

function loadCache() {
  try {
    const c = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
    if (c && c.version === CACHE_VERSION && c.spots) return c;
  } catch {}
  return { version: CACHE_VERSION, spots: {} };
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
  const d = await get('https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=tidepredictions');
  _stationDir = Array.isArray(d && d.stations)
    ? d.stations.filter(s => s && s.lat != null && s.lng != null).map(s => ({ id: s.id, name: s.name, lat: s.lat, lon: s.lng }))
    : [];
  return _stationDir;
}

// Mean Range of Tide (datum "MN") — a durable, genuinely per-station fact.
async function meanRangeFt(stationId) {
  const d = await get(`https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations/${stationId}/datums.json`);
  const list = d && Array.isArray(d.datums) ? d.datums : [];
  const mn = list.find(x => x && x.name === 'MN');
  const v = mn ? parseFloat(mn.value) : NaN;
  return Number.isFinite(v) ? Math.round(v * 10) / 10 : null;
}

// High/low predictions for the baked window. Fetched every build, never cached.
async function tidePredictions(stationId, start, end) {
  const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=${stationId}` +
    `&product=predictions&datum=MLLW&time_zone=lst_ldt&units=english&format=json&interval=hilo` +
    `&begin_date=${ymd(start)}&end_date=${ymd(end)}`;
  const d = await get(url);
  const preds = d && Array.isArray(d.predictions) ? d.predictions : [];
  const byDay = {};
  for (const p of preds) {
    if (!p || typeof p.t !== 'string') continue;
    const [date, time] = p.t.split(' ');
    const v = parseFloat(p.v);
    if (!date || !time || !Number.isFinite(v)) continue;
    (byDay[date] = byDay[date] || []).push({ time, ft: Math.round(v * 10) / 10, type: p.type === 'H' ? 'H' : 'L' });
  }
  return Object.keys(byDay).length ? byDay : null;
}

// ---------------------------------------------------------------- USGS

// Nearest active discharge gauge. Expands the search box like the app does.
async function nearestGauge(lat, lon) {
  for (const d of [0.35, 0.75, 1.5]) {
    const bbox = [ (lon - d).toFixed(4), (lat - d).toFixed(4), (lon + d).toFixed(4), (lat + d).toFixed(4) ].join(',');
    const text = await get(
      `https://waterservices.usgs.gov/nwis/site/?format=rdb&bBox=${bbox}` +
      `&siteOutput=expanded&parameterCd=00060&siteType=ST&hasDataTypeCd=iv&siteStatus=active`, 'text');
    const rows = parseRdb(text);
    const sites = rows.map(r => {
      const sLat = parseFloat(r.dec_lat_va), sLon = parseFloat(r.dec_long_va);
      if (!Number.isFinite(sLat) || !Number.isFinite(sLon)) return null;
      const area = parseFloat(r.drain_area_va);
      return {
        siteId: r.site_no,
        name: (r.station_nm || '').trim(),
        distanceMi: Math.round(haversineMi(lat, lon, sLat, sLon) * 10) / 10,
        drainageSqMi: Number.isFinite(area) ? area : null,
      };
    }).filter(Boolean).sort((a, b) => a.distanceMi - b.distanceMi);
    if (sites.length) return sites[0];
  }
  return null;
}

// Month-by-month median discharge from USGS daily statistics. Durable: these are
// long-term percentiles, not a live reading, so they're cached indefinitely.
async function monthlyMedianFlow(siteId) {
  const text = await get(
    `https://waterservices.usgs.gov/nwis/stat/?format=rdb&sites=${siteId}` +
    `&statReportType=daily&statTypeCd=p50&parameterCd=00060`, 'text');
  const rows = parseRdb(text);
  if (!rows.length) return null;
  const buckets = {};
  for (const r of rows) {
    const mo = parseInt(r.month_nu, 10);
    const v = parseFloat(r.p50_va);
    if (!(mo >= 1 && mo <= 12) || !Number.isFinite(v)) continue;
    (buckets[mo] = buckets[mo] || []).push(v);
  }
  const out = {};
  let any = false;
  for (let m = 1; m <= 12; m++) {
    const med = buckets[m] ? median(buckets[m]) : null;
    if (med != null) { out[m] = Math.round(med); any = true; }
  }
  return any ? out : null;
}

// ---------------------------------------------------------------- durable tier

async function buildDurable(town, slug, cache) {
  if (cache.spots[slug]) return cache.spots[slug];

  let entry = null;
  if (town.type === 'coastal') {
    const dir = await stationDirectory();
    if (!dir.length) return null;
    const near = dir
      .map(s => ({ ...s, distanceMi: Math.round(haversineMi(town.lat, town.lon, s.lat, s.lon) * 10) / 10 }))
      .filter(s => s.distanceMi <= 45)
      .sort((a, b) => a.distanceMi - b.distanceMi)[0];
    if (!near) return null;
    entry = {
      kind: 'coastal',
      station: { id: near.id, name: near.name, distanceMi: near.distanceMi },
      meanRangeFt: await meanRangeFt(near.id),
    };
  } else {
    const g = await nearestGauge(town.lat, town.lon);
    if (!g) return null;
    entry = {
      kind: 'inland',
      gauge: { siteId: g.siteId, name: g.name, distanceMi: g.distanceMi, drainageSqMi: g.drainageSqMi },
      monthlyMedianCfs: await monthlyMedianFlow(g.siteId),
    };
  }
  cache.spots[slug] = entry;
  return entry;
}

// ---------------------------------------------------------------- public API

/**
 * Enrich towns with real, per-spot data for the static pages.
 * Returns Map<slug, data>. Never throws; a total failure yields an empty Map
 * and the generator simply omits the data block.
 */
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
  try {
    _deadline = Date.now() + TIME_BUDGET_MS;
    const cache = loadCache();
    const cachedBefore = Object.keys(cache.spots).length;
    const t0 = Date.now();

    // --- Tier 1: durable facts (cache-first) --------------------------------
    const durables = await pool(towns, CONCURRENCY, async (town) => {
      const slug = slugify(town.name);
      const d = await buildDurable(town, slug, cache);
      return d ? { slug, town, d } : null;
    });

    const resolved = durables.filter(Boolean);
    const newlyFetched = Object.keys(cache.spots).length - cachedBefore;
    if (newlyFetched > 0) saveCache(cache);

    // --- Tier 2: volatile tide predictions (never cached to disk) -----------
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + TIDE_DAYS - 1);

    const stationIds = [...new Set(resolved.filter(r => r.d.kind === 'coastal').map(r => r.d.station.id))];
    const tideByStation = new Map();
    if (stationIds.length) {
      const preds = await pool(stationIds, CONCURRENCY, id => tidePredictions(id, start, end));
      stationIds.forEach((id, idx) => { if (preds[idx]) tideByStation.set(id, preds[idx]); });
    }

    for (const { slug, d } of resolved) {
      const data = { ...d };
      if (d.kind === 'coastal') {
        const t = tideByStation.get(d.station.id);
        if (t) data.tideDays = t;
      }
      out.set(slug, data);
    }

    const withTides = [...out.values()].filter(v => v.tideDays).length;
    if (Date.now() > _deadline) {
      console.warn('[seo-data] TIME BUDGET EXCEEDED — shipped partial data. Check NOAA/USGS responsiveness.');
    }
    console.log(
      `[seo-data] ${out.size}/${towns.length} spots enriched ` +
      `(${cachedBefore} from cache, ${newlyFetched} newly fetched, ${withTides} with tide tables) ` +
      `in ${((Date.now() - t0) / 1000).toFixed(1)}s`
    );
  } catch (e) {
    console.warn(`[seo-data] enrichment failed, pages will build without data: ${e && e.message}`);
    return out;
  }
  return out;
}

module.exports = { enrichTowns, MONTHS, MONTHS_FULL, CACHE_PATH };
