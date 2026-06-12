// Lightweight health check for an external uptime monitor (UptimeRobot, etc.).
// Verifies the two things that can silently take the app down: the Supabase
// backend and the weather source. Returns 200 when both are reachable, 503
// otherwise — so the monitor can alert the moment something breaks.

const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  const checks = { supabase: 'unknown', weather: 'unknown' };

  // Supabase — do a tiny real query so a bad URL/key/paused project is caught
  try {
    const url = process.env.REACT_APP_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('missing env vars');
    const supa = createClient(url, key);
    const { error } = await supa.from('feedback').select('id').limit(1);
    checks.supabase = error ? `down: ${error.message}` : 'ok';
  } catch (e) {
    checks.supabase = `down: ${(e && e.message) || 'error'}`;
  }

  // Weather — Open-Meteo (the essential data source)
  try {
    const r = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=39.33&longitude=-74.51&current=temperature_2m'
    );
    checks.weather = r.ok ? 'ok' : `down: HTTP ${r.status}`;
  } catch (e) {
    checks.weather = `down: ${(e && e.message) || 'error'}`;
  }

  const healthy = checks.supabase === 'ok' && checks.weather === 'ok';
  res.setHeader('Cache-Control', 'no-store');
  return res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    checks,
    time: new Date().toISOString(),
  });
};
