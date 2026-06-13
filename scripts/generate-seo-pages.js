// Generates static SEO landing pages (one per target town) into public/fishing/,
// plus sitemap.xml. Runs automatically before every build via the "prebuild" npm
// script, so the pages always carry the current year/branding with zero manual steps.
//
// Why static pages: the React app is client-rendered, so Google sees little
// per-location content. These pages give each town a real, crawlable URL
// ("fishcondish.com/fishing/margate-city-nj/") with unique copy, and a CTA that
// deep-links into the live app (/?lat=..&lon=..&label=..).
//
// Adding a town: add one line to TOWNS below. Slug is derived from the name.

const fs = require('fs');
const path = require('path');

const SITE = 'https://fishcondish.com';

// type: 'coastal' | 'inland' — drives the species copy and wording
const TOWNS = [
  // --- South Jersey shore ---
  { name: 'Margate City, NJ', lat: 39.3298, lon: -74.5021, type: 'coastal', water: 'the back bays and ocean surf' },
  { name: 'Atlantic City, NJ', lat: 39.3643, lon: -74.4229, type: 'coastal', water: 'Absecon Inlet, the back bays, and the surf' },
  { name: 'Ventnor City, NJ', lat: 39.3401, lon: -74.4774, type: 'coastal', water: 'the surf, jetties, and back bays' },
  { name: 'Longport, NJ', lat: 39.3093, lon: -74.5335, type: 'coastal', water: 'Great Egg Harbor Inlet and the surf' },
  { name: 'Brigantine, NJ', lat: 39.4101, lon: -74.3646, type: 'coastal', water: 'the north-end surf and Absecon Inlet' },
  { name: 'Ocean City, NJ', lat: 39.2776, lon: -74.5746, type: 'coastal', water: 'Great Egg Harbor Bay and the surf' },
  { name: 'Somers Point, NJ', lat: 39.3176, lon: -74.5946, type: 'coastal', water: 'Great Egg Harbor Bay and the rips' },
  { name: 'Sea Isle City, NJ', lat: 39.1534, lon: -74.6929, type: 'coastal', water: 'Ludlam Bay and the beachfront' },
  { name: 'Avalon, NJ', lat: 39.1012, lon: -74.7177, type: 'coastal', water: 'Townsends Inlet and the back sounds' },
  { name: 'Stone Harbor, NJ', lat: 39.0526, lon: -74.7644, type: 'coastal', water: 'Hereford Inlet and the sounds' },
  { name: 'Wildwood, NJ', lat: 38.9918, lon: -74.8149, type: 'coastal', water: 'Hereford Inlet, the back bays, and the beach' },
  { name: 'Cape May, NJ', lat: 38.9351, lon: -74.906, type: 'coastal', water: 'Delaware Bay, the rips, and the jetties' },
  { name: 'Tuckerton, NJ', lat: 39.6034, lon: -74.3401, type: 'coastal', water: 'Great Bay and Little Egg Harbor' },
  { name: 'Beach Haven, NJ', lat: 39.5593, lon: -74.2432, type: 'coastal', water: 'Little Egg Inlet and the LBI surf' },
  { name: 'Barnegat Light, NJ', lat: 39.757, lon: -74.1065, type: 'coastal', water: 'Barnegat Inlet and the bay' },
  { name: 'Forked River, NJ', lat: 39.8412, lon: -74.1907, type: 'coastal', water: 'Barnegat Bay and Oyster Creek' },
  { name: 'Toms River, NJ', lat: 39.9537, lon: -74.1979, type: 'coastal', water: 'Barnegat Bay and the Toms River' },
  { name: 'Point Pleasant Beach, NJ', lat: 40.0917, lon: -74.0479, type: 'coastal', water: 'Manasquan Inlet and the surf' },
  { name: 'Manasquan, NJ', lat: 40.1262, lon: -74.0493, type: 'coastal', water: 'Manasquan Inlet and the river' },
  { name: 'Belmar, NJ', lat: 40.1784, lon: -74.0218, type: 'coastal', water: 'Shark River Inlet and the surf' },
  { name: 'Asbury Park, NJ', lat: 40.2204, lon: -74.0121, type: 'coastal', water: 'the rock jetties and beachfront' },
  { name: 'Atlantic Highlands, NJ', lat: 40.4079, lon: -74.0343, type: 'coastal', water: 'Sandy Hook Bay and Raritan Bay' },
  { name: 'Highlands, NJ', lat: 40.404, lon: -73.9924, type: 'coastal', water: 'Sandy Hook, the rips, and the bay' },
  // --- Inland / rivers & lakes ---
  { name: 'Trenton, NJ', lat: 40.2206, lon: -74.7597, type: 'inland', water: 'the Delaware River' },
  { name: 'Lambertville, NJ', lat: 40.3659, lon: -74.943, type: 'inland', water: 'the Delaware River and feeder creeks' },
  { name: 'Frenchtown, NJ', lat: 40.5262, lon: -75.0618, type: 'inland', water: 'the upper Delaware River' },
  { name: 'Lebanon, NJ (Round Valley)', lat: 40.6234, lon: -74.835, type: 'inland', water: 'Round Valley Reservoir' },
  { name: 'Lake Hopatcong, NJ', lat: 40.9415, lon: -74.661, type: 'inland', water: 'Lake Hopatcong' },
  { name: 'Greenwood Lake, NJ', lat: 41.1726, lon: -74.3457, type: 'inland', water: 'Greenwood Lake' },
  { name: 'Hackettstown, NJ', lat: 40.854, lon: -74.829, type: 'inland', water: 'the Musconetcong River' },
];

const COASTAL_SPECIES = 'striped bass, fluke (summer flounder), bluefish, black sea bass, tautog, weakfish, and kingfish';
const INLAND_SPECIES = 'largemouth and smallmouth bass, trout, walleye, chain pickerel, catfish, and panfish';

const slugify = (name) =>
  name.toLowerCase().replace(/[(),.]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function pageHtml(town, allTowns) {
  const slug = slugify(town.name);
  const url = `${SITE}/fishing/${slug}/`;
  const appLink = `/?lat=${town.lat.toFixed(4)}&lon=${town.lon.toFixed(4)}&label=${encodeURIComponent(town.name)}`;
  const species = town.type === 'coastal' ? COASTAL_SPECIES : INLAND_SPECIES;
  const waterData = town.type === 'coastal'
    ? 'live tides from the nearest NOAA station, water temperature, wave height, and wind'
    : 'real-time river flow and gage height from the nearest USGS gauge, water temperature, and wind';
  const title = `${town.name} Fishing Report & Conditions — Fish Condish`;
  const desc = `Live fishing conditions for ${town.name}: fishing score, best times to fish, ${town.type === 'coastal' ? 'tides, water temp' : 'river flow, water temp'}, weather, and a species bite forecast. Free, updated in real time.`;

  // Nearby-town links (same type first), for internal linking
  const nearby = allTowns
    .filter(t => t.name !== town.name)
    .sort((a, b) => (a.type === town.type ? 0 : 1) - (b.type === town.type ? 0 : 1))
    .slice(0, 8);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}"/>
<link rel="canonical" href="${url}"/>
<meta property="og:type" content="website"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(desc)}"/>
<meta property="og:url" content="${url}"/>
<meta property="og:image" content="${SITE}/og.png"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="theme-color" content="#0C2340"/>
<link rel="icon" href="/favicon.ico"/>
<script type="application/ld+json">
${JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: title,
  description: desc,
  url,
  isPartOf: { '@type': 'WebSite', name: 'Fish Condish', url: SITE },
})}
</script>
<style>
:root{--navy:#0C2340;--ocean:#1E5F9E;--sky:#DCEBF7;--cream:#F5F0E8;--text:#22303C;--muted:#5B6B7A}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Georgia,'Times New Roman',serif;background:var(--cream);color:var(--text);line-height:1.6}
header{background:var(--navy);color:#fff;padding:14px 20px;display:flex;align-items:center;gap:10px}
header img{width:34px;height:34px}
header a{color:#fff;text-decoration:none;font-size:20px;font-weight:bold}
main{max-width:760px;margin:0 auto;padding:28px 20px 60px}
h1{font-size:30px;color:var(--navy);line-height:1.25;margin-bottom:10px}
h2{font-size:20px;color:var(--navy);margin:28px 0 8px}
p{margin:10px 0;font-size:16px}
.cta{display:inline-block;background:var(--ocean);color:#fff;text-decoration:none;font-weight:bold;padding:13px 26px;border-radius:10px;margin:18px 0;font-family:Arial,Helvetica,sans-serif}
.cta:hover{background:#174a7c}
ul{margin:8px 0 8px 22px}
li{margin:4px 0}
.nearby{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.nearby a{background:var(--sky);color:var(--navy);text-decoration:none;font-size:14px;padding:6px 12px;border-radius:999px;font-family:Arial,Helvetica,sans-serif}
footer{text-align:center;font-size:13px;color:var(--muted);padding:24px;font-family:Arial,Helvetica,sans-serif}
footer a{color:var(--ocean)}
</style>
</head>
<body>
<header><img src="/logo.svg" alt="Fish Condish logo"/><a href="/">Fish Condish</a></header>
<main>
<h1>${esc(town.name)} Fishing Report &amp; Live Conditions</h1>
<p>Planning to fish ${esc(town.water)}? Fish Condish gives you a live, data-driven read on whether it's worth the trip — a <strong>1–10 fishing score</strong> for ${esc(town.name)} right now, the <strong>best times to fish today</strong>, and a <strong>species-by-species bite forecast</strong>.</p>
<a class="cta" href="${appLink}">See live ${esc(town.name)} conditions →</a>
<h2>What you'll get for ${esc(town.name)}</h2>
<ul>
<li><strong>Fishing score (1–10)</strong> — one number that weighs ${waterData} into a single read on the bite.</li>
<li><strong>Best-time windows</strong> — an hour-by-hour timeline for today plus a 7-day outlook, graded by ${town.type === 'coastal' ? 'tide stage, pressure trend, and dawn/dusk' : 'pressure trend, dawn/dusk, and solunar periods'}.</li>
<li><strong>Species bite forecast</strong> — what's likely feeding near ${esc(town.name)}: ${species}.</li>
<li><strong>Bait &amp; lure advisor</strong> — AI suggestions grounded in recent local fishing reports.</li>
<li><strong>Solunar feeding periods, moon phase, sunrise/sunset</strong> — the timing details anglers actually use.</li>
</ul>
<h2>Live ${town.type === 'coastal' ? 'tide and water' : 'river and water'} data</h2>
<p>${town.type === 'coastal'
  ? `Tides and water temperature for ${esc(town.name)} come straight from the nearest NOAA station, with a smooth tide curve, today's highs and lows, and a station picker if you fish a different part of ${esc(town.water)}.`
  : `River conditions for ${esc(town.name)} come straight from the nearest USGS stream gauge — live flow (cfs), gage height, and water temperature — with a gauge picker if you fish a different stretch of ${esc(town.water)}.`}</p>
<p>It's free, works on your phone, and installs like an app. Local anglers also share recent catches right in the feed.</p>
<a class="cta" href="${appLink}">Check the ${esc(town.name)} fishing score →</a>
<h2>Nearby spots</h2>
<div class="nearby">
${nearby.map(t => `<a href="/fishing/${slugify(t.name)}/">${esc(t.name)}</a>`).join('\n')}
</div>
</main>
<footer>© ${new Date().getFullYear()} Fish Condish · <a href="/">Open the live dashboard</a></footer>
</body>
</html>`;
}

// ---- generate ----
const outRoot = path.join(__dirname, '..', 'public', 'fishing');
fs.rmSync(outRoot, { recursive: true, force: true });
fs.mkdirSync(outRoot, { recursive: true });

for (const town of TOWNS) {
  const dir = path.join(outRoot, slugify(town.name));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), pageHtml(town, TOWNS));
}

// sitemap.xml (homepage + all town pages)
const today = new Date().toISOString().slice(0, 10);
const urls = [`${SITE}/`, ...TOWNS.map(t => `${SITE}/fishing/${slugify(t.name)}/`)];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(__dirname, '..', 'public', 'sitemap.xml'), sitemap);

console.log(`Generated ${TOWNS.length} SEO pages in public/fishing/ + sitemap.xml`);
