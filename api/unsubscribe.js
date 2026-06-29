// One-click unsubscribe for condition alerts.
// Linked from every alert email: /api/unsubscribe?id=<alert uuid>

const { createClient } = require('@supabase/supabase-js');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const page = (title, body) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — FishCondish</title>
<style>body{font-family:system-ui,sans-serif;background:#F5F0E8;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.card{background:white;border-radius:14px;padding:2.5rem;max-width:420px;text-align:center;box-shadow:0 4px 24px rgba(12,35,64,0.1)}
h1{font-size:20px;color:#0C2340;margin:0 0 8px}p{font-size:15px;color:#5F5E5A;line-height:1.6}
a{color:#185FA5}</style></head>
<body><div class="card"><h1>${title}</h1><p>${body}</p>
<p><a href="https://fishcondish.com">← Back to FishCondish</a></p></div></body></html>`;

module.exports = async (req, res) => {
  const id = (req.query && req.query.id) || '';
  if (!UUID_RE.test(id)) {
    res.setHeader('Content-Type', 'text/html');
    return res.status(400).send(page('Invalid link', 'This unsubscribe link looks incomplete. Try clicking it directly from your alert email.'));
  }

  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    res.setHeader('Content-Type', 'text/html');
    return res.status(500).send(page('Something went wrong', 'Please try again later.'));
  }

  try {
    const supa = createClient(supabaseUrl, serviceKey);
    await supa.from('alerts').delete().eq('id', id);
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(page("You're unsubscribed", "You won't receive any more condition alerts for this spot. You can re-subscribe anytime on the site."));
  } catch {
    res.setHeader('Content-Type', 'text/html');
    return res.status(500).send(page('Something went wrong', 'Please try again later.'));
  }
};
