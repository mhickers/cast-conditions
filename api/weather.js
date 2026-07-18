// Same-origin proxy for the app's external data sources. The app calls
// /api/weather?u=<url> instead of hitting the source directly, which buys:
//
//   1. Ad-blocker immunity (the original reason — open-meteo is widely blocked)
//   2. Outage absorption for NOAA/USGS. In July 2026 NOAA's cloud-migrated
//      gateway began flapping (502/504) for browser traffic. This proxy
//      retries flapped requests server-side and caches successes at Vercel's
//      edge, so one good upstream response serves every user for hours.
//
// Locked down: only the hosts below — never an arbitrary URL.
//
// Cache policy (edge cache keys on the full URL, so each station/day caches
// separately). Successes only — an error must NEVER be cached:
//   - NOAA tide predictions (begin_date in URL): deterministic for a given
//     station + window -> 6h, serve stale up to a day while revalidating
//   - NOAA station directory / datums: near-static -> 24h
//   - NOAA "latest" observations + USGS instantaneous values: live-ish -> 10m
//   - USGS site/stat lookups: near-static -> 24h
//   - Open-Meteo: 5m (as before)

const ALLOWED_HOSTS = new Set([
  'api.open-meteo.com',
  'marine-api.open-meteo.com',
  'geocoding-api.open-meteo.com',
  'air-quality-api.open-meteo.com',
  'api.tidesandcurrents.noaa.gov',
  'waterservices.usgs.gov',
]);

// 2 attempts x 4s: a DEGRADED upstream (answering in 3-5s) must be given time
// to answer — 3 short attempts against a slow server just manufactures failure
// out of slowness. Worst case ~8.3s stays inside Vercel's 10s window, and the
// client side allows 12s so it never hangs up while the proxy is still working.
const RETRIES = 2;
const ATTEMPT_TIMEOUT_MS = 4000;
const BACKOFF_MS = 250;

// NOAA's datagetter reports application errors inside an HTTP 200 —
// {"error":{"message":"..."}} — including transiently while their gateway is
// recovering from an outage. A status check alone lets one of those get
// stamped with a 6h cache policy and frozen at the edge for every user
// (July 18, 2026: cached "No Predictions data was found" while NOAA was
// healthy). Cheap sniff of the body head; real payloads from every allowed
// host start with a data key ("predictions", "stations", "latitude", ...),
// never a top-level "error".
function bodyIsError(body) {
  return /^\s*\{\s*"error"\s*:/.test((body || '').slice(0, 200));
}

function cachePolicy(target) {
  const host = target.hostname;
  const u = target.href;
  if (host === 'api.tidesandcurrents.noaa.gov') {
    if (u.includes('begin_date=')) return 's-maxage=21600, stale-while-revalidate=86400';
    if (u.includes('stations.json') || u.includes('datums.json')) return 's-maxage=86400, stale-while-revalidate=86400';
    return 's-maxage=600, stale-while-revalidate=3600'; // date=latest observations
  }
  if (host === 'waterservices.usgs.gov') {
    if (u.includes('/nwis/iv')) return 's-maxage=600, stale-while-revalidate=3600';
    return 's-maxage=86400, stale-while-revalidate=86400'; // site + stat services
  }
  return 's-maxage=300, stale-while-revalidate=600'; // open-meteo
}

async function attempt(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ATTEMPT_TIMEOUT_MS);
  try {
    const upstream = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    const body = await upstream.text();
    return { status: upstream.status, body, contentType: upstream.headers.get('content-type') || 'application/json' };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async (req, res) => {
  const u = req.query && req.query.u;
  if (!u) return res.status(400).json({ error: 'Missing "u" parameter' });

  let target;
  try {
    target = new URL(u);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }
  if (target.protocol !== 'https:' || !ALLOWED_HOSTS.has(target.hostname)) {
    return res.status(403).json({ error: 'Host not allowed' });
  }

  // NOAA asks API consumers to identify themselves via the application
  // parameter, and applies per-customer throttling under load — an identified,
  // consistent caller gets better treatment than anonymous traffic.
  if (target.hostname === 'api.tidesandcurrents.noaa.gov' && !target.searchParams.has('application')) {
    target.searchParams.set('application', 'FishCondish');
  }

  let last = null;
  for (let i = 0; i < RETRIES; i++) {
    try {
      last = await attempt(target.toString());
      // Retry 5xx, and also 2xx whose body is an upstream error payload —
      // during NOAA's recovery those clear up between attempts.
      if (last.status < 500 && !(last.status < 300 && bodyIsError(last.body))) break;
    } catch (e) {
      last = { status: 502, body: JSON.stringify({ error: 'Upstream fetch failed', detail: e && e.message }), contentType: 'application/json' };
    }
    if (i < RETRIES - 1) await new Promise(r => setTimeout(r, BACKOFF_MS));
  }

  res.setHeader('Content-Type', last.contentType);
  if (last.status >= 200 && last.status < 300 && !bodyIsError(last.body)) {
    res.setHeader('Cache-Control', cachePolicy(target));
  } else {
    // Never let the edge cache an upstream failure.
    res.setHeader('Cache-Control', 'no-store');
    if (last.status >= 500) console.error('proxy upstream failing after retries:', target.hostname, last.status);
  }
  return res.status(last.status).send(last.body);
};
