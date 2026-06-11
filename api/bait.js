// Bait & lure advisor — uses Claude with live web search to scan recent
// local fishing reports (bait shop pages, report sites, public forums),
// then blends them with seasonal patterns for the location.

const hits = new Map();
const LIMIT = 10; // searches are pricier than plain summaries
const WINDOW = 60 * 60 * 1000;

module.exports = async (req, res) => {
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

  const { location, species, dateLabel, conditionsSummary, isInland } = req.body || {};
  if (!location || !species || typeof location !== 'string' || typeof species !== 'string'
      || location.length > 120 || species.length > 200) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  const prompt = `You are an expert local fishing guide for the area around ${location}. Today is ${dateLabel}.${conditionsSummary ? ` Current conditions: ${conditionsSummary}.` : ''}

Target species: ${species}.

First, use web search to find RECENT fishing reports for this area — local bait and tackle shop report pages, regional fishing report sites${isInland ? ', fly shop reports' : ''}, and public forum posts from the last few weeks. Search for things like "${location.split(',')[0]} fishing report" and "${species} ${location.split(',')[0]} report".

Then combine what the recent reports actually say with proven seasonal patterns for this area and time of year. Give:
1. What's working right now according to recent reports (mention where the intel came from, e.g. "local shop reports say...")
2. Specific bait, lure${isInland ? ', and fly' : ''} recommendations with sizes and colors${isInland ? '. If this is trout water, name this month\u2019s likely hatches and matching patterns with hook sizes' : ''}
3. One tactical tip for current conditions

Keep it under 200 words. Plain text only — no markdown, no asterisks, no bullet symbols. Write like the counter guy at the local tackle shop.`;

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
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      }),
    });

    const data = await r.json();
    if (!r.ok) {
      return res.status(502).json({ error: data?.error?.message || 'Upstream error' });
    }

    const text = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .replace(/\*/g, '')
      .trim();

    if (!text) return res.status(502).json({ error: 'Empty response' });
    return res.status(200).json({ text });
  } catch {
    return res.status(500).json({ error: 'Request failed' });
  }
};
