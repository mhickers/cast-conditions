// Recent local reports — uses Claude with live web search to scan the most
// recent fishing reports for ONE target species near a location, and returns a
// short summary of what anglers are actually reporting right now. Sibling to
// api/bait.js and deliberately mirrors its guardrails, rate limiting, and
// 12h Supabase caching (bait_cache table, key prefixed to avoid collisions).
//
// Difference from bait.js: the bait advisor uses report intel SILENTLY to
// inform lure advice. This card SURFACES a summary of the reports, which is
// more useful but raises the regulation-hallucination risk (report pages are
// full of "keeper size", "season opened", "slot" language). So the
// regulation guardrail here is at least as strict, and the model is told to
// summarize activity/patterns, never rules. User-facing links are a single
// Google search URL built client-side — nothing to fabricate a citation to.

const { createClient } = require('@supabase/supabase-js');

const hits = new Map();
const LIMIT = 10; // web-search calls are pricier — same budget as bait
const WINDOW = 60 * 60 * 1000;

module.exports = async (req, res) => {
  // CORS: native app calls this cross-origin from capacitor://localhost.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.reset) hits.set(ip, { count: 1, reset: now + WINDOW });
  else if (entry.count >= LIMIT) return res.status(429).json({ error: 'Too many requests — try again later' });
  else entry.count++;
  if (hits.size > 5000) hits.clear();

  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.REACT_APP_ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const { location, species, dateLabel, isInland } = req.body || {};
  // ONE species only — this card is target-species-scoped by design.
  if (!location || !species || typeof location !== 'string' || typeof species !== 'string'
      || location.length > 120 || species.length > 60 || species.includes(',')) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  const cacheKey = `reports|${location}|${species}|${dateLabel}`.toLowerCase().slice(0, 250);
  const supaUrl = process.env.REACT_APP_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supa = supaUrl && serviceKey ? createClient(supaUrl, serviceKey) : null;
  if (supa) {
    try {
      const { data: hit } = await supa.from('bait_cache').select('advice, sources, created_at').eq('key', cacheKey).maybeSingle();
      if (hit && Date.now() - new Date(hit.created_at).getTime() < 12 * 3600 * 1000) {
        return res.status(200).json({ text: hit.advice, found: (hit.sources && hit.sources.found) !== false, cached: true });
      }
    } catch {}
  }

  const prompt = `You are a local fishing guide summarizing RECENT fishing-report activity for ${species} near ${location}. Today is ${dateLabel}.

Silently use web search to find the MOST RECENT reports mentioning ${species} in this area — ideally the last 1-3 weeks. Check local bait and tackle shop report pages, regional fishing report sites${isInland ? ', fly shop reports' : ''}, and public forum posts. Search queries like "${location.split(',')[0]} fishing report", "${species} ${location.split(',')[0]}", and the same with the current month. Prioritize the newest reports; ignore anything more than ~2 months old unless nothing newer exists.

Then write a SHORT summary (2-3 sentences, under 60 words, plain text) of what anglers are currently reporting for ${species} here: whether the bite is on or slow, what is working, and where or how fish are being caught. Write it as a synthesis of what the reports say — natural prose, no bullet points, no markdown.

COVERAGE HONESTY — this is critical:
- If you find recent, area-specific reports for ${species}, summarize them.
- If you find only older or thin coverage, say so plainly (e.g. "Recent ${species} reports for this area are limited, but...") and add brief seasonal context.
- If you find essentially NO relevant reports, respond with EXACTLY this and nothing else: NO_REPORTS
- Never invent a "hot bite", a specific catch, a named angler, or a report that the search did not actually return. Accurate-but-thin beats confident-but-fabricated.

NEVER STATE REGULATIONS AS FACT. Do not mention size limits, slot limits, bag/creel limits, keeper sizes, season open/close dates, or gear/method rules — even if a report you read states them. These vary by state, change often, and a wrong rule misleads anglers. Summarize fishing ACTIVITY and PATTERNS only. If harvest rules seem relevant, the app reminds users elsewhere to check current local regulations — you do not.

Do NOT describe your search, list report names or dates, or explain your reasoning. Output ONLY the summary sentences, or the single token NO_REPORTS.`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      }),
    });

    const data = await r.json();
    if (!r.ok) {
      console.error('reports: Anthropic API error', r.status, data?.error?.message || data);
      return res.status(502).json({ error: 'Reports temporarily unavailable' });
    }

    const content = data.content || [];
    let text = content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .replace(/\*/g, '')
      .trim();

    // Did the search actually surface anything? Belt-and-suspenders against a
    // model that summarizes with zero real results behind it.
    let searchResultCount = 0;
    for (const b of content) {
      if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) {
        for (const rsl of b.content) {
          if (rsl && rsl.type === 'web_search_result' && rsl.url) searchResultCount++;
        }
      }
    }

    const noReports = /^NO_REPORTS/i.test(text) || searchResultCount === 0;
    const found = !noReports;
    if (noReports) {
      text = `No recent ${species} reports turned up for this area. That is common for smaller spots — the bite forecast above still reflects current conditions.`;
    }

    if (!text) return res.status(502).json({ error: 'Empty response' });
    if (supa) {
      try { await supa.from('bait_cache').upsert({ key: cacheKey, advice: text, sources: { found }, created_at: new Date().toISOString() }); } catch {}
    }
    return res.status(200).json({ text, found });
  } catch {
    return res.status(500).json({ error: 'Request failed' });
  }
};
