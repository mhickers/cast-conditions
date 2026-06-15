// Generates grounded, location-specific AI fishing reports for the SEO pages and
// caches them in scripts/ai-reports.json. This is a SEPARATE, intentional step —
// the normal build just reads the cache (it never calls the API).
//
// Usage (needs your Anthropic key):
//   ANTHROPIC_API_KEY=sk-... node scripts/generate-ai-reports.js          # pilot set
//   ANTHROPIC_API_KEY=sk-... node scripts/generate-ai-reports.js --all     # every town
//   ANTHROPIC_API_KEY=sk-... node scripts/generate-ai-reports.js --force   # re-do cached ones
//   ANTHROPIC_API_KEY=sk-... node scripts/generate-ai-reports.js boise-id miami-fl   # specific slugs
//
// Then run `npm run build` and deploy — the pages will include the reports.

const fs = require('fs');
const path = require('path');
const { TOWNS, slugify } = require('./generate-seo-pages.js');

const MODEL = 'claude-sonnet-4-6';
const CACHE = path.join(__dirname, 'ai-reports.json');

// Pilot: the pages already getting Search Console impressions + the indexed NJ ones.
const PILOT = [
  'devils-lake-nd', 'mille-lacs-lake-mn', 'lake-coeur-dalene-id', 'steinhatchee-fl',
  'anchorage-ak', 'san-juan-river-nm', 'st-simons-island-ga',
  'brigantine-nj', 'barnegat-light-nj', 'somers-point-nj', 'atlantic-highlands-nj',
];

const COASTAL_SPECIES = 'striped bass, fluke (summer flounder), bluefish, black sea bass, tautog, weakfish, and kingfish';
const INLAND_SPECIES = 'largemouth and smallmouth bass, trout, walleye, chain pickerel, catfish, and panfish';

function buildPrompt(town) {
  const species = town.species || (town.type === 'coastal' ? COASTAL_SPECIES : INLAND_SPECIES);
  const readBy = town.type === 'coastal'
    ? 'tides, wind, and water temperature'
    : 'water temperature, flow, and seasonal timing';
  return `You are a veteran local fishing guide writing a short, genuinely useful fishing report for an angler planning a trip to ${town.name}. They'll be fishing ${town.water}.

Write exactly 2 short paragraphs (about 90-130 words total):
- Paragraph 1: what anglers target here and how the fishing changes through the seasons for THIS water.
- Paragraph 2: practical tactics — where fish hold, productive techniques and lure/bait types, and how to read ${readBy}.

Weave in these target species naturally: ${species}.

STRICT RULES:
- Be specific and genuinely useful — real species behavior, seasonal patterns, and techniques for THIS particular water. No generic filler that could apply to any lake or coastline.
- Do NOT invent specifics you can't reliably know: no exact boat-ramp names, business names, regulations, size/bag limits, dates, or record claims. Stick to species behavior, seasonal timing, and technique.
- Evergreen: do not reference a specific current year or "this week".
- Plain text only. Two paragraphs separated by one blank line. No markdown, no headers, no bullet points, no asterisks.`;
}

async function generateOne(town) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 500,
      messages: [{ role: 'user', content: buildPrompt(town) }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').replace(/\*/g, '').trim();
  const paragraphs = text.split(/\n\s*\n/).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (!paragraphs.length) throw new Error('empty response');
  return paragraphs;
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Set ANTHROPIC_API_KEY first:  ANTHROPIC_API_KEY=sk-... node scripts/generate-ai-reports.js');
    process.exit(1);
  }
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const all = args.includes('--all');
  const explicit = args.filter(a => !a.startsWith('--'));

  const targetSlugs = explicit.length ? explicit : all ? TOWNS.map(t => slugify(t.name)) : PILOT;
  const bySlug = new Map(TOWNS.map(t => [slugify(t.name), t]));

  let cache = {};
  try { cache = JSON.parse(fs.readFileSync(CACHE, 'utf8')); } catch {}

  let done = 0, skipped = 0, failed = 0;
  for (const slug of targetSlugs) {
    const town = bySlug.get(slug);
    if (!town) { console.warn(`  ? no town for slug "${slug}" — skipping`); continue; }
    if (cache[slug] && !force) { skipped++; continue; }
    try {
      const paragraphs = await generateOne(town);
      cache[slug] = { paragraphs, model: MODEL, updated: new Date().toISOString() };
      fs.writeFileSync(CACHE, JSON.stringify(cache, null, 2)); // save after each (resumable)
      done++;
      console.log(`  ✓ ${slug}`);
      await new Promise(r => setTimeout(r, 600)); // be polite to the API
    } catch (e) {
      failed++;
      console.error(`  ✗ ${slug}: ${e.message}`);
    }
  }
  console.log(`\nDone. generated=${done} skipped(cached)=${skipped} failed=${failed}. Cache: ${path.relative(process.cwd(), CACHE)}`);
  console.log('Next: npm run build  (the pages will now include these reports)');
}

main();
