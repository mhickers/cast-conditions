// Bait & lure advisor — uses Claude with live web search to scan recent
// local fishing reports (bait shop pages, report sites, public forums),
// then blends them with seasonal patterns for the location.

const { createClient } = require('@supabase/supabase-js');

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

  const { location, species, dateLabel, conditionsSummary, isInland, detail } = req.body || {};
  if (!location || !species || typeof location !== 'string' || typeof species !== 'string'
      || location.length > 120 || species.length > 200) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  // Detailed mode = a single species was picked (not the "top species" summary)
  const detailed = detail === true && !species.includes(',');

  // Cache: identical location+species+day+mode requests are free and instant
  const cacheKey = `${location}|${species}|${dateLabel}|${detailed ? 'd' : 's'}`.toLowerCase().slice(0, 250);
  const supaUrl = process.env.REACT_APP_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supa = supaUrl && serviceKey ? createClient(supaUrl, serviceKey) : null;
  if (supa) {
    try {
      const { data: hit } = await supa.from('bait_cache').select('advice, created_at').eq('key', cacheKey).maybeSingle();
      if (hit && Date.now() - new Date(hit.created_at).getTime() < 12 * 3600 * 1000) {
        return res.status(200).json({ text: hit.advice, cached: true });
      }
    } catch {}
  }

  const grounding = `You are an expert local fishing guide for the area around ${location}. Today is ${dateLabel}.${conditionsSummary ? ` Current conditions: ${conditionsSummary}.` : ''}

Requested species: ${species}.

First, use web search to find RECENT fishing reports for this area — local bait and tackle shop report pages, regional fishing report sites${isInland ? ', fly shop reports' : ''}, and public forum posts from the last few weeks. Search for things like "${location.split(',')[0]} fishing report" and "${species.split(',')[0]} ${location.split(',')[0]}".

If a requested species is out of season or closed to harvest here on this date, add one short note saying so (and to check local regulations) — but still give the full bait and lure advice anyway, since people fish catch-and-release and plan ahead.`;

  const detailedPrompt = `${grounding}

Then write a detailed report for ${species} ONLY at this location, as plain text. Use these exact labels, each on its own line, with a blank line between them:

Baits & lures: the specific baits, lure types, sizes, and colors producing now.
Technique: how to present them — retrieve, depth, rigging, and speed.
Where to fish: the structure and water to target on this kind of waterbody.
Timing & conditions: the best time of day, ${isInland ? 'water temp, and weather' : 'tide stage, time of day, and weather'} for this date.

STRICT RULES:
- Cover ONLY ${species}. Never mention other species, regulations, or slot limits.
- Keep the whole report under ~160 words. Plain text only — no markdown, asterisks, bullets, or headers other than the four labels above.
- Work recent report intel in where you have it; otherwise rely on seasonal patterns for this exact area and month.`;

  const summaryPrompt = `${grounding}

Then answer in this EXACT compact format — one line per requested species, nothing else before or after:

SpeciesName: what's biting and the specific baits/lures to use, with sizes and colors.

Example of the style: "Rainbow trout: PMDs and caddis coming off — try a size 16 Elk Hair Caddis or size 18 Pheasant Tail; spin anglers doing well on gold spinners."

STRICT RULES:
- Cover ONLY the requested species (${species}). Never mention other species, their regulations, or slot limits.
- Max 40 words per species line.
- Plain text only — no markdown, no asterisks, no bullets, no headers, no intro or closing sentence.
- If recent reports mention the requested species, work that intel into the line; if not, rely on seasonal patterns for this exact area and month.`;

  const prompt = detailed ? detailedPrompt : summaryPrompt;

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
    if (supa) {
      try { await supa.from('bait_cache').upsert({ key: cacheKey, advice: text, created_at: new Date().toISOString() }); } catch {}
    }
    return res.status(200).json({ text });
  } catch {
    return res.status(500).json({ error: 'Request failed' });
  }
};
