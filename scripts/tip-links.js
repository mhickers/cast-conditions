/*
 * tip-links.js
 * -----------------------------------------------------------------------------
 * Shared cross-link layer between the Fishing Tips articles and the 593 spot
 * pages. Required by BOTH generate-blog-pages.js (species -> spots) and
 * generate-seo-pages.js (spot -> species tips).
 *
 * Pure data + pure functions. No URL formatting in here — each generator builds
 * its own hrefs from its own base path, so this module stays reusable.
 *
 * APOSTROPHE-SAFE BY DESIGN: every string value below is free of apostrophes,
 * so these values are safe to drop into single-quoted strings in either
 * generator without the silent page-break that apostrophes cause.
 * -----------------------------------------------------------------------------
 */

// water: "fresh" | "salt"
// states: USPS codes where the species is a meaningful target; "*" = nationwide.
const SPECIES_TIPS = [
  { slug: "largemouth-bass",   title: "Largemouth Bass",         water: "fresh", states: ["*"] },
  { slug: "smallmouth-bass",   title: "Smallmouth Bass",         water: "fresh", states: ["*"] },
  { slug: "rainbow-trout",     title: "Rainbow Trout",           water: "fresh", states: ["*"] },
  { slug: "brown-trout",       title: "Brown Trout",             water: "fresh", states: ["*"] },
  { slug: "brook-trout",       title: "Brook Trout",             water: "fresh",
    states: ["ME","NH","VT","MA","RI","CT","NY","PA","NJ","MD","VA","WV","NC","TN","GA","MI","WI","MN","CO","MT","WY","ID","UT"] },
  { slug: "walleye",           title: "Walleye",                 water: "fresh",
    states: ["MN","WI","MI","OH","PA","NY","ND","SD","NE","IA","IL","IN","MO","KS","CO","MT","WY","TN","KY","VT","ME","NH"] },
  { slug: "crappie",           title: "Crappie",                 water: "fresh", states: ["*"] },
  { slug: "bluegill",          title: "Bluegill",                water: "fresh", states: ["*"] },
  { slug: "yellow-perch",      title: "Yellow Perch",            water: "fresh", states: ["*"] },
  { slug: "channel-catfish",   title: "Channel Catfish",         water: "fresh", states: ["*"] },
  { slug: "northern-pike",     title: "Northern Pike",           water: "fresh",
    states: ["MN","WI","MI","ND","SD","NE","IA","IL","IN","OH","PA","NY","VT","NH","ME","MT","WY","CO","ID","WA","AK"] },

  { slug: "striped-bass",      title: "Striped Bass",            water: "salt",
    states: ["ME","NH","MA","RI","CT","NY","NJ","DE","MD","VA","NC","CA"] },
  { slug: "redfish",           title: "Redfish (Red Drum)",      water: "salt",
    states: ["NC","SC","GA","FL","AL","MS","LA","TX"] },
  { slug: "speckled-trout",    title: "Speckled Trout",          water: "salt",
    states: ["VA","NC","SC","GA","FL","AL","MS","LA","TX"] },
  { slug: "fluke",             title: "Fluke (Summer Flounder)", water: "salt",
    states: ["MA","RI","CT","NY","NJ","DE","MD","VA","NC"] },
  { slug: "snook",             title: "Snook",                   water: "salt", states: ["FL","TX"] },
  { slug: "sheepshead",        title: "Sheepshead",              water: "salt",
    states: ["NJ","DE","MD","VA","NC","SC","GA","FL","AL","MS","LA","TX"] },
  { slug: "black-drum",        title: "Black Drum",              water: "salt",
    states: ["NJ","DE","MD","VA","NC","SC","GA","FL","AL","MS","LA","TX"] },
  { slug: "florida-pompano",   title: "Florida Pompano",         water: "salt",
    states: ["NC","SC","GA","FL","AL","MS","LA","TX"] },
  { slug: "black-sea-bass",    title: "Black Sea Bass",          water: "salt",
    states: ["ME","NH","MA","RI","CT","NY","NJ","DE","MD","VA","NC","SC","GA","FL"] },
  { slug: "tautog",            title: "Tautog (Blackfish)",      water: "salt",
    states: ["ME","NH","MA","RI","CT","NY","NJ","DE","MD","VA"] },
  { slug: "bluefish",          title: "Bluefish",                water: "salt",
    states: ["ME","NH","MA","RI","CT","NY","NJ","DE","MD","VA","NC","SC","GA","FL","AL","MS","LA","TX"] },
  { slug: "kingfish",          title: "Kingfish (Whiting)",      water: "salt",
    states: ["NJ","DE","MD","VA","NC","SC","GA","FL","AL","MS","LA","TX"] },
  { slug: "red-snapper",       title: "Red Snapper",             water: "salt",
    states: ["NC","SC","GA","FL","AL","MS","LA","TX"] },
  { slug: "spanish-mackerel",  title: "Spanish Mackerel",        water: "salt",
    states: ["NJ","NY","DE","MD","VA","NC","SC","GA","FL","AL","MS","LA","TX"] }
];

// Non-species "reading conditions" guides, one per water type.
const CONDITIONS_TIPS = [
  { slug: "reading-freshwater-conditions", title: "Reading Freshwater Conditions", water: "fresh" },
  { slug: "reading-saltwater-conditions",  title: "Reading Saltwater Conditions",  water: "salt"  }
];

function normWater(w) {
  if (!w) return null;
  const s = String(w).toLowerCase();
  if (s.indexOf("salt") === 0 || s === "coastal" || s === "sea" || s === "marine") return "salt";
  if (s.indexOf("fresh") === 0 || s === "inland" || s === "lake" || s === "river") return "fresh";
  if (s === "both") return "both";
  return null;
}

// Given a spot, return the species tips relevant to it (plus the matching
// conditions guide). spot shape (all optional): { state, water, region }.
// Matching is tolerant: missing water -> match both; missing state -> skip the
// state filter (region-only or everything).
function tipsForSpot(spot, opts) {
  opts = opts || {};
  const limit = opts.limit || 6;
  const st = (spot && spot.state ? String(spot.state) : "").toUpperCase();
  const w = normWater(spot && spot.water);
  const waters = w === "both" || w === null ? ["salt", "fresh"] : [w];

  const species = SPECIES_TIPS.filter(function (s) {
    if (waters.indexOf(s.water) === -1) return false;
    if (!st) return true;
    return s.states.indexOf("*") !== -1 || s.states.indexOf(st) !== -1;
  });

  // Append the conditions guide(s) for the matched water type(s).
  const conditions = CONDITIONS_TIPS.filter(function (c) {
    return waters.indexOf(c.water) !== -1;
  });

  return { species: species.slice(0, limit), conditions: conditions };
}

// Inverse: given a species tip slug and the full spot list, return spots where
// that species is a meaningful target. Used by the blog generator.
// spot shape (all optional): { state, water }. Returns the caller's spot objects.
function spotsForSpecies(speciesSlug, allSpots, opts) {
  opts = opts || {};
  const limit = opts.limit || 8;
  const species = SPECIES_TIPS.filter(function (s) { return s.slug === speciesSlug; })[0];
  if (!species || !Array.isArray(allSpots)) return [];

  // collect every matching spot
  const matches = [];
  for (let i = 0; i < allSpots.length; i++) {
    const spot = allSpots[i] || {};
    const st = (spot.state ? String(spot.state) : "").toUpperCase();
    const w = normWater(spot.water);
    if (w && w !== "both" && w !== species.water) continue;
    if (st && species.states.indexOf("*") === -1 && species.states.indexOf(st) === -1) continue;
    matches.push(spot);
  }

  // round-robin by state so a nationwide species shows a spread, not 8 from one state
  const byState = {};
  const order = [];
  for (const s of matches) {
    const st = (s.state ? String(s.state) : "??").toUpperCase();
    if (!byState[st]) { byState[st] = []; order.push(st); }
    byState[st].push(s);
  }
  const out = [];
  let pass = 0;
  while (out.length < limit) {
    let added = false;
    for (const st of order) {
      if (byState[st][pass]) { out.push(byState[st][pass]); added = true; if (out.length >= limit) break; }
    }
    if (!added) break;
    pass++;
  }
  return out;
}

function conditionsTipForWater(water) {
  const w = normWater(water);
  return CONDITIONS_TIPS.filter(function (c) { return c.water === w; })[0] || null;
}

module.exports = {
  SPECIES_TIPS: SPECIES_TIPS,
  CONDITIONS_TIPS: CONDITIONS_TIPS,
  tipsForSpot: tipsForSpot,
  spotsForSpecies: spotsForSpecies,
  conditionsTipForWater: conditionsTipForWater,
  normWater: normWater
};
