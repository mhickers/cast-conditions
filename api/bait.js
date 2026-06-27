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
      const { data: hit } = await supa.from('bait_cache').select('advice, sources, created_at').eq('key', cacheKey).maybeSingle();
      if (hit && Date.now() - new Date(hit.created_at).getTime() < 12 * 3600 * 1000) {
        return res.status(200).json({ text: hit.advice, sources: Array.isArray(hit.sources) ? hit.sources : [], cached: true });
      }
    } catch {}
  }

  const grounding = `You are an expert local fishing guide for the area around ${location}. Today is ${dateLabel}.${conditionsSummary ? ` Current conditions: ${conditionsSummary}.` : ''}

Requested species: ${species}.

First, use web search to find the MOST RECENT fishing reports for this area — ideally from the last 1-3 weeks. Look at local bait and tackle shop report pages, regional fishing report sites${isInland ? ', fly shop reports' : ''}, and public forum posts. Search for things like "${location.split(',')[0]} fishing report", "${species.split(',')[0]} ${location.split(',')[0]}", and the same with the current month. Prioritize the newest reports; ignore reports more than ~2 months old unless nothing newer exists.

Weigh any report intel against the current conditions above. If conditions now differ from when a report was written (e.g. a cold front has since moved through, or water temps have shifted), adjust the advice accordingly rather than repeating the report verbatim.

HONESTY ABOUT COVERAGE: If you cannot find recent, area-specific reports, do NOT invent or imply that there is current report activity. In that case, base the advice on well-established seasonal patterns for this exact area and month, keep it appropriately general, and never fabricate a "hot bite" or a specific recent catch. Accurate-but-general beats confident-but-wrong.

Never state specific size limits, slot limits, bag limits, or season open/close dates for any species — these change often, vary by state, and a wrong number (like an outdated striped bass slot) misleads anglers. If harvest rules might matter, simply remind the reader to check current local regulations before keeping fish. Give the full bait and lure advice regardless, since people fish catch-and-release and plan ahead.`;

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
      console.error('bait: Anthropic API error', r.status, data?.error?.message || data);
      return res.status(502).json({ error: 'AI advisor temporarily unavailable' });
    }

    const content = data.content || [];
    const text = content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .replace(/\*/g, '')
      .trim();

    // Pull the real reports out of the response so the UI can show dated, linkable
    // sources. Two tiers: every result the search surfaced ("scanned"), and the
    // subset the model actually cited in its answer ("cited"). Showing real URLs
    // also makes hallucinated reports much harder — the model can't link to a
    // report that the search never returned.
    const scanned = [];
    const seenUrls = new Set();
    const citedUrls = new Set();
    for (const b of content) {
      if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) {
        for (const rsl of b.content) {
          if (rsl && rsl.type === 'web_search_result' && rsl.url && !seenUrls.has(rsl.url)) {
            seenUrls.add(rsl.url);
            scanned.push({ url: rsl.url, title: rsl.title || rsl.url, age: rsl.page_age || null });
          }
        }
      }
      if (b.type === 'text' && Array.isArray(b.citations)) {
        for (const c of b.citations) {
          if (c && c.url) citedUrls.add(c.url);
        }
      }
    }
    // Cited reports first (they directly back the advice), then the rest of the
    // scanned reports, capped so the UI stays tidy.
    const sources = [
      ...scanned.filter((s) => citedUrls.has(s.url)).map((s) => ({ ...s, cited: true })),
      ...scanned.filter((s) => !citedUrls.has(s.url)).map((s) => ({ ...s, cited: false })),
    ].slice(0, 6);

    if (!text) return res.status(502).json({ error: 'Empty response' });
    if (supa) {
      try { await supa.from('bait_cache').upsert({ key: cacheKey, advice: text, sources, created_at: new Date().toISOString() }); } catch {}
    }
    return res.status(200).json({ text, sources });
  } catch {
    return res.status(500).json({ error: 'Request failed' });
  }
};
