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

  // ===== Top US fishing destinations (national) =====
  // --- Northeast coast ---
  { name: 'Montauk, NY', lat: 41.0359, lon: -71.9545, type: 'coastal', water: 'Montauk Point and the rips', species: 'striped bass, bluefish, false albacore, fluke, and black sea bass' },
  { name: 'Gloucester, MA', lat: 42.6159, lon: -70.6620, type: 'coastal', water: 'Cape Ann and Massachusetts Bay', species: 'striped bass, bluefish, haddock, and cod' },
  { name: 'Chatham, MA', lat: 41.6818, lon: -69.9597, type: 'coastal', water: 'the Cape Cod flats and rips', species: 'striped bass, bluefish, fluke, and black sea bass' },
  { name: 'Block Island, RI', lat: 41.1712, lon: -71.5580, type: 'coastal', water: "the island's rips and reefs", species: 'striped bass, bluefish, fluke, and false albacore' },
  // --- Mid-Atlantic ---
  { name: 'Ocean City, MD', lat: 38.3365, lon: -75.0849, type: 'coastal', water: 'the inlet, surf, and back bays', species: 'striped bass, flounder, tautog, and bluefish' },
  { name: 'Virginia Beach, VA', lat: 36.8529, lon: -75.9780, type: 'coastal', water: 'the Chesapeake Bay mouth and surf', species: 'striped bass (rockfish), red drum, flounder, and cobia' },
  // --- Southeast coast ---
  { name: 'Nags Head, NC', lat: 35.9573, lon: -75.6240, type: 'coastal', water: 'the Outer Banks surf and sounds', species: 'red drum, striped bass, bluefish, and flounder' },
  { name: 'Cape Hatteras, NC', lat: 35.2493, lon: -75.5288, type: 'coastal', water: 'the Hatteras surf and inlet', species: 'red drum, false albacore, bluefish, and king mackerel' },
  { name: 'Morehead City, NC', lat: 34.7229, lon: -76.7261, type: 'coastal', water: 'Bogue Sound and the nearshore reefs' },
  { name: 'Charleston, SC', lat: 32.7765, lon: -79.9311, type: 'coastal', water: 'the harbor, creeks, and nearshore reefs', species: 'red drum, spotted seatrout, flounder, and sheepshead' },
  { name: 'Hilton Head Island, SC', lat: 32.2163, lon: -80.7526, type: 'coastal', water: 'the sounds and tidal creeks' },
  { name: 'Savannah, GA', lat: 32.0809, lon: -81.0912, type: 'coastal', water: 'the tidal rivers and sounds' },
  // --- Florida ---
  { name: 'Jacksonville, FL', lat: 30.3322, lon: -81.6557, type: 'coastal', water: 'the St. Johns River mouth and surf' },
  { name: 'St. Augustine, FL', lat: 29.9012, lon: -81.3124, type: 'coastal', water: 'the inlet, ICW, and surf' },
  { name: 'Stuart, FL', lat: 27.1973, lon: -80.2528, type: 'coastal', water: 'the St. Lucie Inlet and offshore', species: 'sailfish, snook, tarpon, and snapper' },
  { name: 'Boca Grande, FL', lat: 26.7484, lon: -82.2596, type: 'coastal', water: 'Boca Grande Pass and the harbor', species: 'tarpon, snook, redfish, and grouper' },
  { name: 'Naples, FL', lat: 26.1420, lon: -81.7948, type: 'coastal', water: 'the passes and nearshore reefs' },
  { name: 'Islamorada, FL', lat: 24.9243, lon: -80.6276, type: 'coastal', water: 'the Florida Keys flats and reef', species: 'bonefish, tarpon, permit, mahi-mahi, and snapper' },
  { name: 'Key West, FL', lat: 24.5551, lon: -81.7800, type: 'coastal', water: 'the reef, wrecks, and flats', species: 'tarpon, permit, snapper, grouper, and mahi-mahi' },
  { name: 'Miami, FL', lat: 25.7617, lon: -80.1918, type: 'coastal', water: 'Biscayne Bay and the Gulf Stream' },
  { name: 'Tampa, FL', lat: 27.9506, lon: -82.4572, type: 'coastal', water: "Tampa Bay's flats and passes", species: 'snook, redfish, spotted seatrout, and tarpon' },
  { name: 'Destin, FL', lat: 30.3935, lon: -86.4958, type: 'coastal', water: 'Destin Pass and the offshore grounds', species: 'red snapper, king mackerel, cobia, and grouper' },
  { name: 'Pensacola, FL', lat: 30.4213, lon: -87.2169, type: 'coastal', water: 'the pass, bay, and Gulf' },
  // --- Gulf coast ---
  { name: 'Orange Beach, AL', lat: 30.2697, lon: -87.5836, type: 'coastal', water: 'Perdido Pass and the Gulf reefs' },
  { name: 'Biloxi, MS', lat: 30.3960, lon: -88.8853, type: 'coastal', water: 'the Mississippi Sound and barrier islands' },
  { name: 'Venice, LA', lat: 29.2769, lon: -89.3540, type: 'coastal', water: 'the Mississippi Delta passes', species: 'redfish, speckled trout, yellowfin tuna, and cobia' },
  { name: 'Grand Isle, LA', lat: 29.2366, lon: -89.9873, type: 'coastal', water: 'the surf, passes, and rigs' },
  { name: 'Galveston, TX', lat: 29.3013, lon: -94.7977, type: 'coastal', water: 'the jetties, bay, and surf', species: 'redfish, speckled trout, flounder, and red snapper' },
  { name: 'Port Aransas, TX', lat: 27.8339, lon: -97.0611, type: 'coastal', water: 'the jetties and Aransas Pass' },
  { name: 'South Padre Island, TX', lat: 26.1118, lon: -97.1681, type: 'coastal', water: 'the Lower Laguna Madre and Gulf' },
  // --- Pacific coast ---
  { name: 'San Diego, CA', lat: 32.7157, lon: -117.1611, type: 'coastal', water: 'the kelp beds and offshore banks', species: 'yellowtail, tuna, calico bass, and rockfish' },
  { name: 'Bodega Bay, CA', lat: 38.3332, lon: -123.0480, type: 'coastal', water: 'the bay and coastal reefs', species: 'rockfish, lingcod, salmon, and Dungeness crab' },
  { name: 'Astoria, OR', lat: 46.1879, lon: -123.8313, type: 'coastal', water: 'the Columbia River mouth', species: 'Chinook salmon, sturgeon, and steelhead' },
  { name: 'Westport, WA', lat: 46.9043, lon: -124.1048, type: 'coastal', water: 'Grays Harbor and the coast' },
  // --- Alaska ---
  { name: 'Sitka, AK', lat: 57.0531, lon: -135.3300, type: 'coastal', water: 'the sounds and outer coast', species: 'king and coho salmon, halibut, and rockfish' },
  { name: 'Homer, AK', lat: 59.6425, lon: -151.5483, type: 'coastal', water: 'Kachemak Bay and Cook Inlet', species: 'halibut, king salmon, and rockfish' },
  // --- Inland lakes & rivers ---
  { name: 'Lake of the Ozarks, MO', lat: 38.1989, lon: -92.7560, type: 'inland', water: 'Lake of the Ozarks', species: 'largemouth and spotted bass, crappie, catfish, and white bass' },
  { name: 'Lake Guntersville, AL', lat: 34.3580, lon: -86.2947, type: 'inland', water: 'Lake Guntersville', species: 'largemouth bass, crappie, and catfish' },
  { name: 'Lake Fork, TX', lat: 32.8390, lon: -95.5666, type: 'inland', water: 'Lake Fork Reservoir', species: 'trophy largemouth bass and crappie' },
  { name: 'Lake Okeechobee, FL', lat: 27.0500, lon: -80.8300, type: 'inland', water: 'Lake Okeechobee', species: 'largemouth bass, black crappie (specks), and bluegill' },
  { name: 'Lake Champlain, VT', lat: 44.4759, lon: -73.2121, type: 'inland', water: 'Lake Champlain', species: 'smallmouth and largemouth bass, lake trout, and walleye' },
  { name: 'Port Clinton, OH', lat: 41.5125, lon: -82.9377, type: 'inland', water: "Lake Erie's western basin", species: 'walleye, yellow perch, and smallmouth bass' },
  { name: 'Mille Lacs Lake, MN', lat: 46.2480, lon: -93.6530, type: 'inland', water: 'Mille Lacs Lake', species: 'walleye, smallmouth bass, and northern pike' },
  { name: 'Lake Tahoe, CA', lat: 38.9399, lon: -119.9772, type: 'inland', water: 'Lake Tahoe', species: 'mackinaw (lake trout), rainbow trout, and kokanee' },
  { name: 'Lake Havasu City, AZ', lat: 34.4839, lon: -114.3225, type: 'inland', water: 'Lake Havasu', species: 'largemouth and smallmouth bass, striped bass, and catfish' },
  { name: 'Toledo Bend, TX', lat: 31.1800, lon: -93.5700, type: 'inland', water: 'Toledo Bend Reservoir', species: 'largemouth bass, crappie, and catfish' },
  { name: 'Kentucky Lake, KY', lat: 36.9900, lon: -88.2700, type: 'inland', water: 'Kentucky Lake', species: 'largemouth and smallmouth bass, crappie, and catfish' },
  { name: 'Bull Shoals Lake, AR', lat: 36.3780, lon: -92.5810, type: 'inland', water: 'Bull Shoals Lake', species: 'largemouth, smallmouth, and spotted bass; trout below the dam' },
  { name: 'Ennis, MT', lat: 45.3490, lon: -111.7280, type: 'inland', water: 'the Madison River', species: 'wild rainbow and brown trout' },
  { name: 'Lake Powell, AZ', lat: 36.9147, lon: -111.4558, type: 'inland', water: 'Lake Powell', species: 'striped bass, largemouth and smallmouth bass, and walleye' },
];

const COASTAL_SPECIES = 'striped bass, fluke (summer flounder), bluefish, black sea bass, tautog, weakfish, and kingfish';
const INLAND_SPECIES = 'largemouth and smallmouth bass, trout, walleye, chain pickerel, catfish, and panfish';

const slugify = (name) =>
  name.toLowerCase().replace(/[(),.]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Distance in miles (for geographic "nearby spots" internal links)
const distMi = (a, b, c, d) => {
  const R = 3958.8, p = Math.PI / 180;
  const dLat = (c - a) * p, dLon = (d - b) * p;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a * p) * Math.cos(c * p) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

function pageHtml(town, allTowns) {
  const slug = slugify(town.name);
  const url = `${SITE}/fishing/${slug}/`;
  const appLink = `/?lat=${town.lat.toFixed(4)}&lon=${town.lon.toFixed(4)}&label=${encodeURIComponent(town.name)}`;
  const species = town.species || (town.type === 'coastal' ? COASTAL_SPECIES : INLAND_SPECIES);
  const waterData = town.type === 'coastal'
    ? 'live tides from the nearest NOAA station, water temperature, wave height, and wind'
    : 'real-time flow and water level from the nearest USGS gauge, water temperature, and wind';
  const title = `${town.name} Fishing Report & Conditions — Fish Condish`;
  const desc = `Live fishing conditions for ${town.name}: fishing score, best times to fish, ${town.type === 'coastal' ? 'tides, water temp' : 'river flow, water temp'}, weather, and a species bite forecast. Free, updated in real time.`;

  // Nearest towns by distance, for sensible internal linking
  const nearby = allTowns
    .filter(t => t.name !== town.name)
    .map(t => ({ ...t, _d: distMi(town.lat, town.lon, t.lat, t.lon) }))
    .sort((a, b) => a._d - b._d)
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
<h2>Live ${town.type === 'coastal' ? 'tide and water' : 'water'} data</h2>
<p>${town.type === 'coastal'
  ? `Tides and water temperature for ${esc(town.name)} come straight from the nearest NOAA station, with a smooth tide curve, today's highs and lows, and a station picker if you fish a different part of ${esc(town.water)}.`
  : `Water conditions for ${esc(town.name)} come straight from the nearest USGS gauge — flow, gage height, and water temperature where it's reported — with a picker to switch between nearby monitoring sites on ${esc(town.water)}.`}</p>
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
