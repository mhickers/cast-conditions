// Weekly Vercel cron — triggers a fresh production build so the SEO pages
// (generated in the `prebuild` step) regenerate with updated lastmod/dateModified,
// keeping the "fishing report" pages looking fresh to search engines.
//
// One-time setup:
//   1) Vercel -> Project -> Settings -> Git -> Deploy Hooks: create a hook on the
//      production branch and copy its URL.
//   2) Settings -> Environment Variables: add DEPLOY_HOOK_URL = that URL.
//   3) (optional) add CRON_SECRET; Vercel sends it to the cron as a Bearer token.
// The schedule itself lives in vercel.json ("0 8 * * 1" = Mondays 08:00 UTC).

module.exports = async (req, res) => {
  // If CRON_SECRET is set, only allow requests that carry it (Vercel cron does).
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.authorization || '';
    if (auth !== `Bearer ${secret}`) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
  }

  const hook = process.env.DEPLOY_HOOK_URL;
  if (!hook) {
    res.status(500).json({ error: 'DEPLOY_HOOK_URL not configured' });
    return;
  }

  try {
    const r = await fetch(hook, { method: 'POST' });
    res.status(200).json({ ok: true, triggered: r.status });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
};
