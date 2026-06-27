// AI summary proxy with per-IP rate limiting and plain-text output.

const hits = new Map(); // ip -> { count, reset }
const LIMIT = 20; // requests per hour per IP
const WINDOW = 60 * 60 * 1000;

module.exports = async (req, res) => {
  // CORS: the native app calls this cross-origin from capacitor://localhost.
  // These endpoints carry no cookies/credentials, so a wildcard origin is safe.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Basic rate limit — protects your API credits from abuse
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.reset) {
    hits.set(ip, { count: 1, reset: now + WINDOW });
  } else if (entry.count >= LIMIT) {
    return res.status(429).json({ error: 'Too many requests — try again later' });
  } else {
    entry.count++;
  }
  if (hits.size > 5000) hits.clear(); // prevent unbounded memory growth

  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.REACT_APP_ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== 'string' || prompt.length > 4000) {
    return res.status(400).json({ error: 'Invalid prompt' });
  }

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
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt + '\n\nRespond in plain text only — no markdown formatting, no asterisks, no bullet points.' }],
      }),
    });

    const data = await r.json();
    if (!r.ok) {
      console.error('summary: Anthropic API error', r.status, data?.error?.message || data);
      return res.status(502).json({ error: 'AI summary temporarily unavailable' });
    }

    const text = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .replace(/\*/g, '');

    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: 'Request failed' });
  }
};
