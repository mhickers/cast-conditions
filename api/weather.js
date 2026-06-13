// Same-origin proxy for Open-Meteo. The app calls /api/weather?u=<open-meteo url>
// instead of hitting open-meteo.com directly, so ad blockers (which block the
// open-meteo.com domains) can't break weather, marine, or geocoding data.
//
// Locked down: only proxies the Open-Meteo hosts below — never an arbitrary URL.

const ALLOWED_HOSTS = new Set([
  'api.open-meteo.com',
  'marine-api.open-meteo.com',
  'geocoding-api.open-meteo.com',
  'air-quality-api.open-meteo.com',
]);

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

  try {
    const upstream = await fetch(target.toString(), { headers: { Accept: 'application/json' } });
    const body = await upstream.text();
    res.setHeader('Content-Type', 'application/json');
    // Weather changes slowly — cache briefly at Vercel's edge to cut repeat calls.
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(upstream.status).send(body);
  } catch (e) {
    return res.status(502).json({ error: 'Upstream fetch failed' });
  }
};
