// Sends a notification email to the site owner (NOTIFY_EMAIL) when someone
// submits feedback or shares a catch. The client calls this fire-and-forget
// right after a successful insert, so a failure here never affects the user.
//
// Note: there's no auth on this endpoint — worst case someone POSTs a bogus
// notification to your own inbox. Low risk for now; can be hardened later
// (e.g. a shared token or rate limit) if it ever gets abused.

const SITE = 'https://fishcondish.com';

// Sender for outbound email. Defaults to Resend's shared address so mail keeps
// working before domain verification; set MAIL_FROM in Vercel once fishcondish.com
// is verified in Resend (e.g. 'Fish Condish <alerts@fishcondish.com>').
const MAIL_FROM = process.env.MAIL_FROM || 'Fish Condish <onboarding@resend.dev>';

// Basic HTML-escape + length cap so user-supplied text can't inject markup
const esc = (s) =>
  String(s ?? '')
    .replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))
    .slice(0, 2000);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const resendKey = process.env.RESEND_API_KEY;
  const notifyEmail = process.env.NOTIFY_EMAIL;
  if (!resendKey || !notifyEmail) {
    return res.status(500).json({ error: 'Notify env vars not configured' });
  }

  const body = req.body || {};
  const { type } = body;

  let subject, html;
  if (type === 'feedback') {
    subject = `📝 New feedback: ${esc(body.category) || 'General'}`;
    html = `
      <h2>New feedback submitted</h2>
      <p><strong>Category:</strong> ${esc(body.category) || '—'}</p>
      <p><strong>Message:</strong><br>${esc(body.message)}</p>
      <p><strong>From:</strong> ${body.email ? esc(body.email) : 'no email provided'}</p>
      <p style="font-size:12px;color:#888;"><a href="${SITE}/admin">Open admin →</a></p>
    `;
  } else if (type === 'catch') {
    subject = `🎣 New catch pending: ${esc(body.species)} at ${esc(body.location)}`;
    html = `
      <h2>New catch awaiting moderation</h2>
      <p><strong>Species:</strong> ${esc(body.species)}</p>
      <p><strong>Location:</strong> ${esc(body.location)}</p>
      <p><strong>Angler:</strong> ${esc(body.angler_name)}</p>
      <p style="font-size:12px;color:#888;"><a href="${SITE}/admin">Review in admin →</a></p>
    `;
  } else {
    return res.status(400).json({ error: 'Unknown notify type' });
  }

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: [notifyEmail],
        subject,
        html,
      }),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      return res.status(502).json({ error: `Resend failed: ${r.status} ${t.slice(0, 200)}` });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: (e && e.message) || 'send failed' });
  }
};
