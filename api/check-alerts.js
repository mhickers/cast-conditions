// Daily cron — checks each alert subscription's location, computes the
// fishing score for today, and emails subscribers when it crosses their threshold.

const { createClient } = require('@supabase/supabase-js');

// See notify.js — set MAIL_FROM in Vercel after verifying the domain in Resend.
const MAIL_FROM = process.env.MAIL_FROM || 'FishCondish <onboarding@resend.dev>';

function moonPhaseDays(d) {
  const known = new Date(2000, 0, 6, 18, 14, 0);
  const cycle = 29.53058867;
  const diff = (d.getTime() - known.getTime()) / 86400000;
  return ((diff % cycle) + cycle) % cycle;
}

function calcScore(windMph, waveFt, pressureMb) {
  let s = 5;
  if (windMph < 8) s += 1.2; else if (windMph > 18) s -= 1.2;
  if (waveFt != null) { if (waveFt < 2) s += 1; else if (waveFt > 4) s -= 1.5; }
  if (pressureMb > 1015) s += 0.5; else if (pressureMb < 1005) s -= 0.5;
  const phase = moonPhaseDays(new Date());
  if (Math.abs(phase - 14.77) < 3) s += 1;
  else if (phase < 3 || phase > 27) s += 0.5;
  return Math.min(10, Math.max(1, Math.round(s * 10) / 10));
}

module.exports = async (req, res) => {
  // Vercel cron sends Authorization: Bearer <CRON_SECRET> when CRON_SECRET is set
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers['authorization'] !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  if (!supabaseUrl || !serviceKey || !resendKey) {
    return res.status(500).json({ error: 'Env vars not configured' });
  }

  const supa = createClient(supabaseUrl, serviceKey);
  const today = new Date().toISOString().slice(0, 10);

  const { data: alerts, error } = await supa.from('alerts').select('*').limit(100);
  if (error) return res.status(500).json({ error: 'Failed to read alerts' });

  let sent = 0;
  for (const a of alerts || []) {
    if (a.last_notified === today) continue;
    try {
      const [wRes, mRes] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${a.lat}&longitude=${a.lon}&hourly=wind_speed_10m,surface_pressure&wind_speed_unit=mph&timezone=auto&start_date=${today}&end_date=${today}`),
        fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${a.lat}&longitude=${a.lon}&hourly=wave_height&length_unit=imperial&timezone=auto&start_date=${today}&end_date=${today}`),
      ]);
      const [w, m] = await Promise.all([wRes.json(), mRes.json()]);
      const idx = 12; // midday
      const wind = w.hourly?.wind_speed_10m?.[idx] ?? 10;
      const pressure = w.hourly?.surface_pressure?.[idx] ?? 1013;
      const wave = m.hourly?.wave_height?.[idx] ?? null;
      const score = calcScore(wind, wave, pressure);

      if (score >= (a.threshold ?? 7.5)) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendKey}` },
          body: JSON.stringify({
            from: MAIL_FROM,
            to: [a.email],
            subject: `🎣 Great fishing conditions today at ${a.label} — score ${score}/10`,
            html: `
              <h2>Today looks great at ${a.label}!</h2>
              <p>The fishing score is <strong>${score}/10</strong> — wind ${Math.round(wind)} mph${wave != null ? `, waves ${wave.toFixed(1)} ft` : ''}.</p>
              <p><a href="https://fishcondish.com">Check the full conditions →</a></p>
              <p style="font-size:12px;color:#888;">You get this alert when ${a.label} scores ${a.threshold ?? 7.5}+. <a href="https://fishcondish.com/api/unsubscribe?id=${a.id}">Unsubscribe</a></p>
            `,
          }),
        });
        await supa.from('alerts').update({ last_notified: today }).eq('id', a.id);
        sent++;
      }
    } catch {}
  }

  return res.status(200).json({ checked: (alerts || []).length, sent });
};
