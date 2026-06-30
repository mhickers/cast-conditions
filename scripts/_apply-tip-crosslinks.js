/*
 * _apply-tip-crosslinks.js
 * One-time migration: adds the spot-page -> fishing-tips cross-links and the
 * fishing-tips URLs to the sitemap, inside scripts/generate-seo-pages.js.
 *
 * Safe to run more than once — each change is applied only if it's missing, and
 * your TOWNS list is never touched (this only inserts, never deletes).
 *
 * Run from the repo root:  node scripts/_apply-tip-crosslinks.js
 */
const fs = require('fs');
const path = require('path');

const f = path.join(__dirname, 'generate-seo-pages.js');
let s = fs.readFileSync(f, 'utf8');
const changed = [];
const warnings = [];

// --- Edit 1: require the shared cross-link module ---
if (!s.includes("require('./tip-links')")) {
  if (s.includes("const path = require('path');")) {
    s = s.replace(
      "const path = require('path');",
      "const path = require('path');\nconst tipLinks = require('./tip-links');"
    );
    changed.push('require');
  } else {
    warnings.push('Could not find "const path = require(\'path\');" — add  const tipLinks = require(\'./tip-links\');  near the top yourself.');
  }
}

// --- Edit 2: per-spot "Fishing tips for ..." section, just above "Nearby spots" ---
if (!s.includes('tipLinks.tipsForSpot')) {
  const EDIT2 = `\${(() => {
  const { species: sp, conditions } = tipLinks.tipsForSpot({ state: stateAbbrOf(town), water: town.type }, { limit: 6 });
  const items = sp.concat(conditions);
  return items.length ? \`<h2>Fishing tips for \${esc(town.name)}</h2>
<p>New to these waters? Start with these beginner-friendly guides:</p>
<div class="nearby">
\${items.map(t => \`<a href="/fishing-tips/\${t.slug}/">\${esc(t.title)}</a>\`).join('\\n')}
</div>\` : ''})()}
`;
  if (s.includes('<h2>Nearby spots</h2>')) {
    s = s.replace('<h2>Nearby spots</h2>', EDIT2 + '<h2>Nearby spots</h2>');
    changed.push('spot -> tips section');
  } else {
    warnings.push('Could not find "<h2>Nearby spots</h2>" — tips section not added.');
  }
}

// --- Edit 3: include the fishing-tips pages in the sitemap ---
if (!s.includes('tipUrls')) {
  const oldUrls = "  const urls = [`${SITE}/`, ...hubs.map(h => `${SITE}${h.path}`), ...TOWNS.map(t => `${SITE}/fishing/${slugify(t.name)}/`)];";
  const newUrls =
    "  const tipUrls = [`${SITE}/fishing-tips/`, ...tipLinks.SPECIES_TIPS.map(t => `${SITE}/fishing-tips/${t.slug}/`), ...tipLinks.CONDITIONS_TIPS.map(t => `${SITE}/fishing-tips/${t.slug}/`)];\n" +
    "  const urls = [`${SITE}/`, ...hubs.map(h => `${SITE}${h.path}`), ...TOWNS.map(t => `${SITE}/fishing/${slugify(t.name)}/`), ...tipUrls];";
  if (s.includes(oldUrls)) {
    s = s.replace(oldUrls, newUrls);
    changed.push('sitemap');
  } else {
    warnings.push('Could not find the sitemap urls line — fishing-tips URLs not added to sitemap.');
  }
}

if (changed.length) {
  fs.writeFileSync(f, s);
  console.log('Patched generate-seo-pages.js — added: ' + changed.join(', '));
} else {
  console.log('Already fully patched — no change needed.');
}
warnings.forEach((w) => console.log('NOTE: ' + w));
