#!/usr/bin/env node
/*
 * generate-blog-pages.js
 * -----------------------------------------------------------------------------
 * Generates the static "Fishing Tips & Tactics" section from a single markdown
 * source file. Produces one clean-URL page per post plus a section index page.
 *
 * Pattern mirrors scripts/generate-seo-pages.js: a standalone Node script that
 * writes real .html files into the build output. Real files are served by Vercel
 * BEFORE any SPA catch-all rewrite, so these coexist with the Create React App.
 *
 * Run:  node scripts/generate-blog-pages.js
 *
 * Zero dependencies (no npm install). Pure Node + fs.
 * -----------------------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');

// ============================ CONFIG ========================================
// Edit these to match your generate-seo-pages.js conventions if they differ.
const SOURCE_MD   = path.join(__dirname, '..', 'content', 'fishing-tips-tactics.md');
const OUTPUT_DIR  = path.join(__dirname, '..', 'public', 'fishing-tips');
const SITE_URL    = 'https://fishcondish.com';   // no trailing slash
const SECTION_URL = '/fishing-tips';             // section base path
const APP_URL     = 'https://fishcondish.com';   // link back to the live app
const BRAND       = 'FishCondish';
const PAGE_TITLE  = 'Fishing Tips & Tactics';
const NAV_LABEL   = 'Fishing Tips';

// Optional spot dataset for species -> spot cross-links. If this file is
// missing, species pages fall back to a "find spots near you" CTA instead.
// Expected shape: JSON array of objects with at least { name, url } and
// ideally { state, water }. Point this at whatever generate-seo-pages.js uses.
const SPOTS_DATA  = path.join(__dirname, '..', 'content', 'spots.json');
// ===========================================================================

const tipLinks = require('./tip-links');

// Spot list for species -> spot cross-links. Preferred source: the TOWNS array
// already maintained in generate-seo-pages.js (single source of truth). Falls
// back to content/spots.json, then to a CTA if neither is available.
let SPOTS = [];
try {
  const seo = require('./generate-seo-pages');
  if (seo && Array.isArray(seo.TOWNS)) {
    SPOTS = seo.TOWNS.map((t) => ({
      name: t.name,
      url: `/fishing/${seo.slugify(t.name)}/`,
      state: (t.name.split(',').pop() || '').trim(),
      water: t.type // 'coastal' | 'inland' — normalized inside tip-links
    }));
  }
} catch (e) {
  // fall back to spots.json below
}
if (!SPOTS.length) {
  try {
    if (fs.existsSync(SPOTS_DATA)) {
      const j = JSON.parse(fs.readFileSync(SPOTS_DATA, 'utf8'));
      if (Array.isArray(j)) SPOTS = j;
    }
  } catch (e) {
    SPOTS = [];
  }
}

// --------------------------- small helpers ---------------------------------
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// anchor (e.g. "pompano") -> URL segment (e.g. "florida-pompano")
const anchorToSegment = {};

function rewriteLink(url) {
  if (url && url.charAt(0) === '#') {
    const seg = anchorToSegment[url.slice(1)];
    if (seg) return `${SECTION_URL}/${seg}`;
    return url; // unknown anchor: leave as-is so it's easy to spot
  }
  return url;
}

// inline markdown -> html (escape first, then introduce tags)
function inlineMd(s) {
  s = escapeHtml(s);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, t, u) => `<a href="${rewriteLink(u)}">${t}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return s;
}

// block-level markdown subset -> html (headings, lists, paragraphs)
function bodyToHtml(md) {
  const lines = md.split('\n');
  let html = '';
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*$/.test(line)) { i++; continue; }
    if (/^### /.test(line)) {
      html += `<h3>${inlineMd(line.replace(/^###\s+/, ''))}</h3>\n`;
      i++; continue;
    }
    if (/^- /.test(line)) {
      const items = [];
      while (i < lines.length && /^- /.test(lines[i])) {
        items.push(`  <li>${inlineMd(lines[i].replace(/^-\s+/, ''))}</li>`);
        i++;
      }
      html += `<ul>\n${items.join('\n')}\n</ul>\n`;
      continue;
    }
    const para = [];
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^### /.test(lines[i]) && !/^- /.test(lines[i])) {
      para.push(lines[i]); i++;
    }
    html += `<p>${inlineMd(para.join(' '))}</p>\n`;
  }
  return html;
}

// ----------------------------- parse source --------------------------------
const raw = fs.readFileSync(SOURCE_MD, 'utf8');
const allLines = raw.split('\n');

// locate post starts ("## 1. ...") and the closing notes ("# Research...")
const postStartIdx = [];
let closingIdx = allLines.length;
for (let i = 0; i < allLines.length; i++) {
  if (/^## \d+\. /.test(allLines[i])) postStartIdx.push(i);
  if (/^# Research & source notes/.test(allLines[i])) { closingIdx = i; break; }
}

const frontMatter = allLines.slice(0, postStartIdx[0]).join('\n');

// build post slices
const posts = [];
for (let p = 0; p < postStartIdx.length; p++) {
  const start = postStartIdx[p];
  const end = (p + 1 < postStartIdx.length) ? postStartIdx[p + 1] : closingIdx;
  const slice = allLines.slice(start, end);

  // header line: "## N. Title {#anchor}"
  const header = slice[0];
  const anchorMatch = header.match(/\{#([^}]+)\}\s*$/);
  const anchor = anchorMatch ? anchorMatch[1] : '';
  const title = header
    .replace(/^##\s+\d+\.\s+/, '')
    .replace(/\s*\{#[^}]+\}\s*$/, '')
    .trim();

  // meta + slug
  let meta = '';
  let segment = anchor;
  for (const l of slice) {
    const m = l.match(/^\*\*Meta description:\*\*\s*(.+)$/);
    if (m) meta = m[1].trim();
    const s = l.match(/^\*\*URL slug:\*\*\s*`([^`]+)`/);
    if (s) segment = s[1].split('/').filter(Boolean).pop();
  }

  // find commercial-notes marker
  let commercialStart = slice.length;
  for (let k = 0; k < slice.length; k++) {
    if (/Build & commercial notes/.test(slice[k])) { commercialStart = k; break; }
  }

  // body = after slug line up to commercial marker
  let bodyStart = 1;
  for (let k = 1; k < slice.length; k++) {
    if (/^\*\*URL slug:\*\*/.test(slice[k])) { bodyStart = k + 1; break; }
  }
  const bodyLines = slice.slice(bodyStart, commercialStart);
  const commercialLines = slice.slice(commercialStart, slice.length);

  // parse commercial block
  let affiliate = '';
  const related = [];
  const faq = [];
  let inFaq = false;
  for (let k = 0; k < commercialLines.length; k++) {
    const l = commercialLines[k];
    const a = l.match(/^- \*\*Affiliate gear categories:\*\*\s*(.+)$/);
    if (a) { affiliate = a[1].trim(); continue; }
    const il = l.match(/^- \*\*Internal links:\*\*\s*(.+)$/);
    if (il) {
      const re = /\[([^\]]+)\]\(([^)]+)\)/g;
      let mm;
      while ((mm = re.exec(il[1])) !== null) related.push({ text: mm[1], url: mm[2] });
      continue;
    }
    if (/^- \*\*FAQ:\*\*/.test(l)) { inFaq = true; continue; }
    // Only indented sub-bullets after the FAQ marker count as Q/A pairs.
    if (inFaq) {
      const fq = l.match(/^\s+-\s+\*(.+?)\*\s+(.+)$/);
      if (fq) faq.push({ q: fq[1].trim(), a: fq[2].trim() });
    }
  }

  posts.push({ title, anchor, segment, meta, bodyLines, affiliate, related, faq });
  if (anchor) anchorToSegment[anchor] = segment;
}

// --------------------------- shared CSS ------------------------------------
const CSS = `
:root{--navy:#0C2340;--ocean:#1E5F9E;--sky:#DCEBF7;--cream:#F5F0E8;--text:#22303C;--muted:#5B6B7A;--rule:#d9e4ef}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--cream);color:var(--text);font-family:'Inter',system-ui,sans-serif;line-height:1.7}
.wrap{max-width:760px;margin:0 auto;padding:0 22px}
header.site{background:var(--navy);display:flex;align-items:center;gap:14px;padding:14px 22px;flex-wrap:wrap}
header.site .brand{display:flex;align-items:center;gap:10px;text-decoration:none}
header.site .logo-img{width:34px;height:34px}
header.site .logo-text{color:#fff;font-family:'Space Grotesk',system-ui,sans-serif;font-size:20px;font-weight:700}
header.site .tagline{color:#9fb4cc;font-size:14px;padding-left:14px;border-left:1px solid rgba(255,255,255,.18)}
header.site .header-nav{margin-left:auto;display:flex;gap:18px}
header.site .header-nav a{color:#dce8f5;text-decoration:none;font-weight:600;font-size:15px}
header.site .header-nav a:hover{color:#fff}
main{padding:30px 0 10px}
h1{font-family:'Space Grotesk',system-ui,sans-serif;font-size:30px;line-height:1.25;color:var(--navy);margin:8px 0 8px}
h2{font-family:'Space Grotesk',system-ui,sans-serif;font-size:22px;color:var(--navy);margin:32px 0 8px}
h3{font-family:'Space Grotesk',system-ui,sans-serif;font-size:18px;color:var(--navy);margin:24px 0 6px}
p{margin:0 0 14px;font-size:16px}
ul{margin:0 0 16px;padding-left:22px}
li{margin:5px 0}
a{color:var(--ocean)}
code{background:#fff;border:1px solid var(--rule);padding:1px 5px;border-radius:4px;font-size:.92em}
.lede{color:var(--muted);font-size:18px}
.breadcrumb{font-size:13px;color:var(--muted);margin:0 0 8px}
.breadcrumb a{color:var(--ocean);text-decoration:none}
.faq{margin-top:30px;border-top:1px solid var(--rule);padding-top:6px}
.faq h2{margin-top:18px}
.faq dt{font-weight:700;color:var(--navy);margin-top:16px;font-size:16px}
.faq dd{margin:4px 0 0;font-size:15px}
.related{margin-top:30px;border-top:1px solid var(--rule);padding-top:14px}
.related ul{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:8px}
.related li{margin:0}
.related a{display:inline-block;background:var(--sky);color:var(--navy);border-radius:999px;padding:6px 14px;text-decoration:none;font-size:14px}
.related a:hover{background:#cbe0f3}
.applink{margin-top:26px;background:#fff;border:1px solid var(--rule);border-left:4px solid var(--ocean);border-radius:10px;padding:16px 20px}
.applink p{margin:0}
.applink a{color:var(--ocean);font-weight:700}
footer.site{border-top:1px solid var(--rule);margin-top:42px;padding:22px 0 50px;color:var(--muted);font-size:14px}
footer.site a{color:var(--ocean)}
.cards{list-style:none;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:8px 0}
.cards li{margin:0}
.cards a{display:block;background:#fff;border:1px solid var(--rule);border-radius:10px;padding:12px 14px;text-decoration:none;color:var(--navy);font-weight:600}
.cards a:hover{border-color:var(--ocean)}
.rationale li{margin:8px 0}
@media(max-width:560px){.cards{grid-template-columns:1fr}h1{font-size:26px}header.site .tagline{display:none}}
`.trim();

function siteHeader() {
  return `<header class="site">
  <a class="brand" href="${APP_URL}"><img src="/logo.svg" alt="" class="logo-img"><span class="logo-text">${BRAND}</span></a>
  <span class="tagline">Know when to fish before you go</span>
  <nav class="header-nav"><a href="${SECTION_URL}">${escapeHtml(NAV_LABEL)}</a><a href="${APP_URL}">Live Conditions</a></nav>
</header>`;
}

function siteFooter() {
  return `<footer class="site"><div class="wrap">
  <p>Gear sizes, rigs, and tactics here are starting points for beginner and intermediate anglers. Local knowledge and current regulations always take precedence. <strong>Always check your current state and local fishing regulations before keeping any fish.</strong></p>
  <p><a href="${APP_URL}">${BRAND}</a> &middot; real-time fishing conditions for any US spot.</p>
</div></footer>`;
}

function pageShell({ title, description, canonical, bodyHtml, jsonLd }) {
  const head = [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta name="theme-color" content="#0C2340">',
    '<link rel="icon" href="/favicon.ico">',
    `<title>${escapeHtml(title)}</title>`,
    description ? `<meta name="description" content="${escapeHtml(description)}">` : '',
    `<link rel="canonical" href="${canonical}">`,
    `<meta property="og:type" content="article">`,
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    description ? `<meta property="og:description" content="${escapeHtml(description)}">` : '',
    `<meta property="og:url" content="${canonical}">`,
    `<meta property="og:site_name" content="${BRAND}">`,
    `<meta property="og:image" content="${SITE_URL}/og.png">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    jsonLd ? `<script type="application/ld+json">${jsonLd}</script>` : '',
    '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">',
    `<style>${CSS}</style>`,
    '</head>',
    '<body>'
  ].filter(Boolean).join('\n');
  return `${head}
${siteHeader()}
<main><div class="wrap">
${bodyHtml}
</div></main>
${siteFooter()}
</body>
</html>`;
}

// ----------------------------- render posts --------------------------------
function renderPost(post) {
  const canonical = `${SITE_URL}${SECTION_URL}/${post.segment}`;

  // water type for this post: species lookup, else infer from the conditions slug
  const speciesEntry = tipLinks.SPECIES_TIPS.find((s) => s.slug === post.segment);
  let postWater = speciesEntry ? speciesEntry.water : null;
  if (!postWater) {
    if (/freshwater/.test(post.segment)) postWater = 'fresh';
    else if (/saltwater/.test(post.segment)) postWater = 'salt';
  }

  let body = '';
  body += `<p class="breadcrumb"><a href="${SECTION_URL}">${escapeHtml(NAV_LABEL)}</a> &rsaquo; ${escapeHtml(post.title)}</p>\n`;
  body += `<h1>${escapeHtml(post.title)}</h1>\n`;
  body += bodyToHtml(post.bodyLines.join('\n'));

  // affiliate categories: invisible note for later monetization, not shown to readers
  if (post.affiliate) {
    body += `\n<!-- Recommended gear (add affiliate links here): ${escapeHtml(post.affiliate)} -->\n`;
  }

  // related guides — guarantee the matching "reading conditions" guide is linked
  const related = post.related.slice();
  if (postWater) {
    const cond = tipLinks.conditionsTipForWater(postWater);
    if (cond && cond.slug !== post.segment) {
      const target = `${SECTION_URL}/${cond.slug}`;
      const already = related.some((r) => rewriteLink(r.url) === target);
      if (!already) related.push({ text: `Reading ${postWater === 'salt' ? 'Saltwater' : 'Freshwater'} Conditions`, url: target });
    }
  }
  if (related.length) {
    body += `\n<section class="related"><h2>Related guides</h2>\n<ul>\n`;
    for (const r of related) {
      body += `  <li><a href="${rewriteLink(r.url)}">${escapeHtml(r.text)}</a></li>\n`;
    }
    body += `</ul></section>\n`;
  }

  // species -> spots cross-link (lights up when content/spots.json is present)
  const plainName = speciesEntry
    ? speciesEntry.title.replace(/\s*\(.*\)\s*$/, '')
    : post.title.replace(/^How to (Catch|Read)\s+/i, '').replace(/\s*\(.*\)\s*$/, '');
  let shownSpeciesCta = false;
  if (speciesEntry) {
    const spots = tipLinks.spotsForSpecies(post.segment, SPOTS, { limit: 8 });
    if (spots.length) {
      body += `\n<section class="related"><h2>Where to fish for ${escapeHtml(plainName)}</h2>\n<ul>\n`;
      for (const sp of spots) {
        const href = sp.url || sp.path || '#';
        const name = sp.name || sp.title || sp.slug || 'Fishing spot';
        body += `  <li><a href="${escapeHtml(href)}">${escapeHtml(name)}</a></li>\n`;
      }
      body += `</ul></section>\n`;
    } else {
      body += `\n<section class="applink"><p>Find ${escapeHtml(plainName)} waters near you — search your town on <a href="${APP_URL}">${BRAND}</a> for live conditions and a species bite forecast.</p></section>\n`;
      shownSpeciesCta = true;
    }
  }

  // general app cross-link (skip if the species CTA already covered it)
  if (!shownSpeciesCta) {
    body += `\n<section class="applink"><p>Planning a trip? Check the live tides, wind, water temperature, and bite forecast for your exact spot on <a href="${APP_URL}">${BRAND}</a> before you go.</p></section>\n`;
  }

  // FAQ + JSON-LD
  let jsonLd = '';
  if (post.faq.length) {
    body += `\n<section class="faq"><h2>Frequently asked questions</h2>\n<dl>\n`;
    for (const f of post.faq) {
      body += `  <dt>${inlineMd(f.q)}</dt>\n  <dd>${inlineMd(f.a)}</dd>\n`;
    }
    body += `</dl></section>\n`;

    const faqLd = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: post.faq.map((f) => ({
        '@type': 'Question',
        name: f.q.replace(/[*`]/g, ''),
        acceptedAnswer: { '@type': 'Answer', text: f.a.replace(/[*`]/g, '') }
      }))
    };
    jsonLd = JSON.stringify(faqLd);
  }

  return pageShell({
    title: `${post.title} | ${BRAND}`,
    description: post.meta,
    canonical,
    bodyHtml: body,
    jsonLd
  });
}

// ----------------------------- render index --------------------------------
function renderIndex() {
  const canonical = `${SITE_URL}${SECTION_URL}`;
  const fmLines = frontMatter.split('\n');

  // Welcome intro: from "## Welcome to the water" to next "## "
  function grabSection(startRe) {
    const out = [];
    let on = false;
    for (let i = 0; i < fmLines.length; i++) {
      if (startRe.test(fmLines[i])) { on = true; continue; }
      if (on && /^## /.test(fmLines[i])) break;
      if (on) out.push(fmLines[i]);
    }
    return out.join('\n').trim();
  }

  const welcome = grabSection(/^## Welcome to the water/);

  // Index ToC: three "### category" groups with numbered links.
  // Collect each group, then emit "Reading Conditions" first.
  const idxLines = grabSection(/^## Index/).split('\n');
  const groups = [];
  let i = 0;
  while (i < idxLines.length) {
    const l = idxLines[i];
    if (/^### /.test(l)) {
      const heading = l.replace(/^###\s+/, '');
      let items = '';
      i++;
      while (i < idxLines.length && !/^### /.test(idxLines[i])) {
        const m = idxLines[i].match(/^\d+\.\s+\[([^\]]+)\]\(([^)]+)\)/);
        if (m) items += `  <li><a href="${rewriteLink(m[2])}">${escapeHtml(m[1])}</a></li>\n`;
        i++;
      }
      groups.push({ heading, items });
    } else {
      i++;
    }
  }
  // Reading/Conditions group leads, the rest keep their order.
  groups.sort((a, b) => {
    const ac = /conditions|reading/i.test(a.heading) ? 0 : 1;
    const bc = /conditions|reading/i.test(b.heading) ? 0 : 1;
    return ac - bc;
  });
  let toc = '';
  for (const g of groups) {
    toc += `<h2>${inlineMd(g.heading)}</h2>\n<ul class="cards">\n${g.items}</ul>\n`;
  }

  let body = '';
  body += `<h1>${escapeHtml(PAGE_TITLE)}</h1>\n`;
  body += bodyToHtml(welcome).replace('<p>', '<p class="lede">'); // first para as lede
  body += `\n${toc}\n`;

  return pageShell({
    title: `${PAGE_TITLE} | ${BRAND}`,
    description: 'Beginner-friendly fishing tips and tactics for 25 popular freshwater and saltwater species, plus how to read fishing conditions.',
    canonical,
    bodyHtml: body,
    jsonLd: ''
  });
}

// ------------------------------- write -------------------------------------
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// index at /fishing-tips
fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), renderIndex(), 'utf8');

// each post at /fishing-tips/<segment>/index.html  (clean URL, no vercel.json needed)
const written = [];
for (const post of posts) {
  const dir = path.join(OUTPUT_DIR, post.segment);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), renderPost(post), 'utf8');
  written.push(`${SECTION_URL}/${post.segment}`);
}

// sitemap for the tips section (slugs are apostrophe-free, so URLs are safe)
const today = new Date().toISOString().slice(0, 10);
const urls = [`${SITE_URL}${SECTION_URL}`].concat(
  posts.map((p) => `${SITE_URL}${SECTION_URL}/${p.segment}`)
);
const sitemap =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map((u) =>
    `  <url><loc>${u}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq></url>`
  ).join('\n') +
  '\n</urlset>\n';
fs.writeFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), sitemap, 'utf8');

console.log(`Generated ${posts.length} post pages + 1 index page.`);
console.log(`Output: ${OUTPUT_DIR}`);
console.log(`Sitemap: ${path.join(OUTPUT_DIR, 'sitemap.xml')} (${urls.length} URLs)`);
console.log(`Spots data: ${SPOTS.length ? SPOTS.length + ' spots loaded' : 'none found — species pages use CTA fallback'}`);
written.forEach((u) => console.log('  ' + u));
