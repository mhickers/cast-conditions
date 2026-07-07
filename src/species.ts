// Species database with regional coverage.
// Coastal regions: northeast, midatlantic, southeast, gulf, pacific, pacific_northwest, alaska, hawaii
// Inland regions: inland_north, inland_west, inland_pacific, inland_southwest, inland_southcentral, inland_southeast

export interface SpeciesInfo {
  name: string;
  icon: string;
  regions: string[];
  tempMin: number; // °F water temp min
  tempMax: number; // °F water temp max
  tip: string;
  lures: string;
}

export const ALL_SPECIES: SpeciesInfo[] = [
  { name: 'Striped bass',    icon: '🎣', regions: ['northeast','midatlantic','pacific','inland_north','inland_southwest','inland_southcentral','inland_southeast','inland_pacific'],                         tempMin: 45, tempMax: 72, lures: 'Bucktails, swim shads, topwater plugs; clams or bunker chunks', tip: 'Bite best on incoming tide near structure. Dawn and dusk are prime windows.' },
  { name: 'Bluefish',        icon: '🌊', regions: ['northeast','midatlantic','southeast'],              tempMin: 58, tempMax: 82, lures: 'Metal spoons, poppers with wire leaders; cut bait', tip: 'Aggressive surface feeders. Active in choppy conditions. Topwater lures work well.' },
  { name: 'Flounder',        icon: '🐟', regions: ['northeast','midatlantic','southeast','gulf'],       tempMin: 55, tempMax: 80, lures: 'Gulp swimming mullet on bucktails; minnow-and-squid rigs', tip: 'Prefer calmer water. Fish bottom near sandy channels on incoming tide.' },
  { name: 'Weakfish',        icon: '🌙', regions: ['midatlantic'],                                     tempMin: 58, tempMax: 78, lures: 'Pink soft plastics, small jigs; live grass shrimp', tip: 'Night feeders — work tidal creeks and flats after dark on moving water.' },
  { name: 'Kingfish',        icon: '☀️', regions: ['midatlantic','southeast','gulf'],                  tempMin: 62, tempMax: 84, lures: 'Bloodworms or Fishbites on small hooks, hi-lo rigs', tip: 'Summer species, love calm surf. Small hooks and fresh bait in the wash.' },
  { name: 'Sea bass',        icon: '⚓', regions: ['northeast','midatlantic','southeast'],              tempMin: 50, tempMax: 72, lures: 'Squid strips and clam on hi-lo rigs; diamond jigs', tip: 'Rocky bottom dwellers. Best around structure and reefs in moderate conditions.' },
  { name: 'Red drum',        icon: '🔴', regions: ['midatlantic','southeast','gulf'],                  tempMin: 60, tempMax: 85, lures: 'Gold spoons, scented paddletails; cut mullet or blue crab', tip: 'Tailing in shallow flats on rising tide. Look for nervous water.' },
  { name: 'Speckled trout',  icon: '🫧', regions: ['southeast','gulf'],                               tempMin: 58, tempMax: 82, lures: 'Popping cork with live shrimp; soft plastic paddletails', tip: 'Early morning topwater action in grass flats. Slow down in cold fronts.' },
  { name: 'Tarpon',          icon: '🌟', regions: ['southeast','gulf','hawaii'],                       tempMin: 72, tempMax: 90, lures: 'Live mullet or pass crabs; large swimbaits', tip: 'Follow migration routes in summer. Pass crabs and live mullet work best.' },
  { name: 'Snook',           icon: '🌴', regions: ['southeast','gulf'],                               tempMin: 68, tempMax: 88, lures: 'Live pilchards; flair hawk jigs and swimbaits at night', tip: 'Structure-oriented. Work dock lights at night and mangrove edges on tide changes.' },
  { name: 'Grouper',         icon: '🪸', regions: ['southeast','gulf','pacific'],                     tempMin: 60, tempMax: 82, lures: 'Live pinfish or large cut baits fished on bottom', tip: 'Deep structure fish. Live bait on the bottom near ledges and wrecks.' },
  { name: 'Mahi-mahi',       icon: '🐬', regions: ['southeast','gulf','pacific','hawaii'],             tempMin: 70, tempMax: 88, lures: 'Rigged ballyhoo, trolling skirts; jigs near weedlines', tip: 'Follow weedlines and color changes offshore. Highly active in warm blue water.' },
  { name: 'Yellowfin tuna',  icon: '🚤', regions: ['southeast','gulf','pacific','hawaii'],             tempMin: 68, tempMax: 86, lures: 'Trolled ballyhoo, cedar plugs; chunked butterfish', tip: 'Offshore species. Follow birds and temperature breaks. Chunking or trolling work well.' },
  { name: 'King mackerel',   icon: '⚡', regions: ['southeast','gulf'],                               tempMin: 68, tempMax: 86, lures: 'Slow-trolled live menhaden; drone spoons', tip: 'Fast trolling with live baits near structure. Watch for baitfish schools.' },
  { name: 'Cobia',           icon: '🦈', regions: ['midatlantic','southeast','gulf'],                 tempMin: 65, tempMax: 85, lures: 'Bucktail jigs, live eels; sight-cast swimbaits', tip: 'Follow cownose rays in spring. Often seen cruising near the surface solo.' },
  { name: 'Halibut',         icon: '🧊', regions: ['pacific_northwest','alaska'],                     tempMin: 38, tempMax: 58, lures: 'Whole herring or large jigs bounced on bottom', tip: 'Deep, flat sandy bottom. Heavy jigs or whole herring on the bottom.' },
  { name: 'Salmon',          icon: '🐡', regions: ['pacific_northwest','alaska','pacific','inland_pacific','inland_west','inland_north'], tempMin: 42, tempMax: 62, lures: 'Spoons, spinners, cut-plug herring; roe near river mouths', tip: 'Follow river mouths during runs. Spinners, spoons, and eggs all produce.' },
  { name: 'Steelhead',       icon: '🌈', regions: ['inland_pacific','inland_west','inland_north'],       tempMin: 40, tempMax: 62, lures: 'Drifted roe, beads, and egg patterns; spinners and swung streamers', tip: 'Sea-run rainbows hold in cold river runs and tailouts. Drift eggs and beads through deep slots, or swing streamers as the river rises or drops.' },
  { name: 'Rockfish',        icon: '🪨', regions: ['pacific','pacific_northwest'],                    tempMin: 45, tempMax: 62, lures: 'Shrimp flies, metal jigs tipped with squid', tip: 'Rocky reefs and kelp beds. Jigs and live bait near structure at depth.' },
  { name: 'Lingcod',         icon: '🌿', regions: ['pacific','pacific_northwest'],                    tempMin: 42, tempMax: 58, lures: 'Large lead-head jigs with grub tails', tip: 'Aggressive predators on rocky structure. Large jigs or live rockfish work well.' },
  { name: 'Yellowtail',      icon: '💛', regions: ['pacific'],                                        tempMin: 62, tempMax: 80, lures: 'Live sardines; surface iron jigs in current', tip: 'Kelp paddies and offshore structure. Sardines and iron jigs in current.' },
  { name: 'Bonefish',        icon: '🏝️', regions: ['hawaii','southeast'],                            tempMin: 72, tempMax: 88, lures: 'Small crab and shrimp flies; skimmer jigs with shrimp', tip: 'Sight fishing in shallow flats. Small crabs and shrimp on light tackle.' },
  { name: 'Tuna (bluefin)',  icon: '🔵', regions: ['northeast','midatlantic'],                        tempMin: 55, tempMax: 72, lures: 'Chunked butterfish; trolled spreader bars and jigs', tip: 'Offshore canyon fishing. Chunking butterfish or trolling skirted lures.' },
  { name: 'Pollock',         icon: '❄️', regions: ['northeast','alaska'],                             tempMin: 38, tempMax: 58, lures: 'Diamond jigs with teaser flies worked fast', tip: 'Deep water species. Diamond jigs worked fast near the bottom.' },
  { name: 'Cod',             icon: '🐠', regions: ['northeast'],                                      tempMin: 38, tempMax: 58, lures: 'Fresh clams; jigs with curly tails near bottom', tip: 'Deep, cold water near rocky structure. Clam, squid, or jigs on bottom.' },
  { name: 'Largemouth bass', icon: '🐸', regions: ['inland_north','inland_west','inland_southwest','inland_southcentral','inland_southeast','inland_pacific'], tempMin: 58, tempMax: 85, lures: 'Texas-rigged worms, spinnerbaits; frogs over weeds', tip: 'Target cover — docks, weed edges, laydowns. Slow down in cold water, topwater at dawn in summer.' },
  { name: 'Smallmouth bass', icon: '🟤', regions: ['inland_north','inland_west','inland_southwest','inland_southcentral','inland_pacific'],                  tempMin: 55, tempMax: 75, lures: 'Ned rigs, tubes, small crankbaits on rock', tip: 'Rocky points and current breaks. Tubes, ned rigs, and crankbaits near gravel and boulders.' },
  { name: 'Walleye',          icon: '👁️', regions: ['inland_north','inland_west','inland_southcentral','inland_pacific'],                               tempMin: 45, tempMax: 70, lures: 'Jig and minnow, crawler harnesses, deep crankbaits', tip: 'Low-light feeders. Jig and minnow near bottom at dawn, dusk, or on overcast days.' },
  { name: 'Northern pike',    icon: '🐊', regions: ['inland_north','inland_west'],                               tempMin: 40, tempMax: 65, lures: 'Large spoons and spinnerbaits on a steel leader', tip: 'Ambush predators in weedy bays. Large spoons, spinnerbaits, and steel leaders a must.' },
  { name: 'Muskie',           icon: '🦖', regions: ['inland_north'],                               tempMin: 50, tempMax: 72, lures: 'Big bucktails, glide baits; figure-8 every cast', tip: 'The fish of 10,000 casts. Big bucktails and glide baits over weed edges; figure-8 at the boat.' },
  { name: 'Rainbow trout',    icon: '🌈', regions: ['inland_west','inland_north','inland_southwest','inland_pacific'],                 tempMin: 42, tempMax: 65, lures: 'Small spinners, PowerBait; nymphs and dries to match the hatch', tip: 'Cold, oxygenated water. Drift nymphs in riffles or troll small spoons in stocked lakes.' },
  { name: 'Brown trout',      icon: '🟫', regions: ['inland_west','inland_north','inland_southwest','inland_pacific'],                 tempMin: 44, tempMax: 68, lures: 'Streamers and nymphs; spinners at dawn and dusk', tip: 'Wary and selective. Streamers at dawn and dusk; match the hatch on pressured water.' },
  { name: 'Lake trout',       icon: '🏔️', regions: ['inland_north','inland_west','inland_pacific'],                              tempMin: 38, tempMax: 55, lures: 'Heavy jigs or spoons trolled deep', tip: 'Deep, cold water in summer — jig near bottom. Shallower in spring and fall turnover.' },
  { name: 'Channel catfish',  icon: '🐱', regions: ['inland_north','inland_west','inland_southwest','inland_southcentral','inland_southeast','inland_pacific'],                tempMin: 65, tempMax: 90, lures: 'Cut bait, chicken liver, or stink bait on bottom', tip: 'Night feeders on scent. Cut bait or chicken liver on bottom near holes and channel bends.' },
  { name: 'Crappie',          icon: '⚪', regions: ['inland_north','inland_west','inland_southwest','inland_southcentral','inland_southeast','inland_pacific'],  tempMin: 55, tempMax: 75, lures: 'Small jigs or minnows under a float near brush', tip: 'School around brush piles and bridge pilings. Small jigs under a float; spring is prime.' },
  { name: 'Bluegill',         icon: '🔵', regions: ['inland_north','inland_west','inland_southwest','inland_southcentral','inland_southeast','inland_pacific'],  tempMin: 60, tempMax: 85, lures: 'Worms, crickets, or tiny jigs near shoreline cover', tip: 'Spawning beds in late spring. Crickets, worms, or tiny jigs near shoreline cover.' },
  { name: 'Yellow perch',     icon: '🟡', regions: ['inland_north','inland_west'],                               tempMin: 45, tempMax: 70, lures: 'Small minnows and ice jigs tipped with worm', tip: 'Schooling fish — find one, find fifty. Small minnows or jigs near weed beds and drop-offs.' },
  { name: 'Hybrid striper',   icon: '⚡', regions: ['inland_north','inland_west','inland_southwest','inland_southcentral','inland_southeast','inland_pacific'],                               tempMin: 55, tempMax: 78, lures: 'Live shad, swimbaits; topwater when they bust', tip: 'Chase shad schools in open reservoir water. Watch for surface busts at dawn.' },
  { name: 'White bass',       icon: '⬜', regions: ['inland_north','inland_southcentral','inland_southeast','inland_southwest','inland_pacific'],                tempMin: 55, tempMax: 80, lures: 'Small white jigs and inline spinners in current', tip: 'Spring river runs are legendary. Small white jigs and spinners in current.' },
  { name: 'Tautog',          icon: '🪨', regions: ['northeast','midatlantic'],                       tempMin: 45, tempMax: 65, lures: 'Green crabs, white-leggers, and Asian crabs on jigs or hi-lo rigs', tip: 'Hug structure — wrecks, rocks, and jetties. Fish the slack around tide changes.' },
  { name: 'Sheepshead',      icon: '🐑', regions: ['midatlantic','southeast','gulf'],                 tempMin: 60, tempMax: 80, lures: 'Fiddler crabs, sand fleas, and barnacle bits on small strong hooks', tip: 'Tight to pilings, bridges, and jetties. Set the hook early — they steal bait fast.' },
  { name: 'Scup (porgy)',    icon: '🐟', regions: ['northeast','midatlantic'],                        tempMin: 55, tempMax: 75, lures: 'Squid strips, clams, and bloodworms on small hi-lo rigs', tip: 'Bottom feeders over rocky and reefy ground. Light tackle and small hooks.' },
  { name: 'Black drum',      icon: '🥁', regions: ['midatlantic','southeast','gulf'],                 tempMin: 55, tempMax: 80, lures: 'Fresh clam, blue crab, and shrimp on fishfinder rigs', tip: 'Work channels, bridges, and bayside flats. Big spring fish hold near deep structure.' },
  { name: 'Spanish mackerel',icon: '⚡', regions: ['midatlantic','southeast','gulf'],                 tempMin: 68, tempMax: 85, lures: 'Small shiny spoons, Gotcha plugs, and jigs retrieved fast', tip: 'Fast, toothy schools chasing bait — cast into surface blitzes and burn it back.' },
  { name: 'Atlantic bonito', icon: '🐟', regions: ['northeast','midatlantic'],                        tempMin: 60, tempMax: 72, lures: 'Small epoxy jigs, Deadly Dicks, and fast-retrieved metals', tip: 'Speedy fall blitzes near inlets and rips — match the small bait and retrieve fast.' },
  { name: 'False albacore',  icon: '🐟', regions: ['northeast','midatlantic','southeast'],            tempMin: 60, tempMax: 74, lures: 'Albie snax, epoxy jigs, and small metals on light leader', tip: 'Run-and-gun the fall blitzes — long casts into breaking fish, then a fast retrieve.' },
  { name: 'Spadefish',       icon: '🐟', regions: ['midatlantic','southeast','gulf'],                 tempMin: 68, tempMax: 84, lures: 'Small bits of clam or jellyball on tiny hooks', tip: 'Schools hover around buoys, wrecks, and pilings. Chum and fish light.' },
  { name: 'Triggerfish',     icon: '🐟', regions: ['midatlantic','southeast','gulf'],                 tempMin: 65, tempMax: 85, lures: 'Squid and shrimp bits on small strong hooks', tip: 'Around wrecks, reefs, and structure. Tough mouths — use sharp small hooks.' },
  { name: 'Pompano',         icon: '🐟', regions: ['midatlantic','southeast','gulf'],                 tempMin: 65, tempMax: 85, lures: 'Sand fleas, Fishbites, and small pink jigs in the wash', tip: 'Work the trough and sloughs in the surf. Keep baits moving with the current.' },
  { name: 'Atlantic croaker',icon: '🐟', regions: ['midatlantic','southeast','gulf'],                 tempMin: 60, tempMax: 82, lures: 'Bloodworms, shrimp, and squid on small hi-lo rigs', tip: 'Bayside and surf bottom on moving water. Small hooks and fresh bait.' },
  { name: 'Spot',            icon: '🐟', regions: ['midatlantic','southeast'],                        tempMin: 60, tempMax: 80, lures: 'Bloodworms and Fishbites on tiny hooks', tip: 'Schooling panfish of the bays — light rigs and small baits near the bottom.' },
];

// Map lat/lon to an inland (freshwater) fishing region.
// Geographic-only, so it's approximate (a trout river and a bass lake at the
// same coordinates resolve the same), but it keeps obviously-wrong species out
// of a region — no trout in Florida, no walleye in the desert, etc.
export function getInlandRegion(lat: number, lon: number): string {
  // West of the Rockies / High Plains line
  if (lon < -104) {
    // Pacific slope warm/mixed waters (CA Delta + reservoirs, SW Oregon):
    // striped bass, black bass, trout, catfish all coexist here.
    if (lon < -119 && lat < 42) return 'inland_pacific';
    return lat < 38 ? 'inland_southwest' : 'inland_west';
  }
  // Great Plains / South-Central (Rockies to roughly the Mississippi)
  if (lon < -90) {
    return lat < 40 ? 'inland_southcentral' : 'inland_north';
  }
  // East of -90
  // East of -90: the mid-Atlantic/Northeast inland (PA, NJ, MD, OH valley, NY)
  // gets the cool-water set (trout, walleye, smallmouth, pike); the true South
  // (lat < 39) gets the warm-water set. Philadelphia (~40) lands in the north.
  return lat >= 39 ? 'inland_north' : 'inland_southeast';
}

// Map lat/lon to a coastal fishing region
export function getRegion(lat: number, lon: number): string {
  // Alaska
  if (lat > 54) return 'alaska';
  // Hawaii
  if (lat < 25 && lon < -140) return 'hawaii';
  // Pacific Northwest (WA, OR, northern CA)
  if (lon < -115 && lat > 38) return 'pacific_northwest';
  // Pacific (CA south of SF, Baja)
  if (lon < -115 && lat <= 38) return 'pacific';
  // Gulf Coast (FL panhandle west, AL, MS, LA, TX)
  if (lat < 31 && lon > -98 && lon < -80) return 'gulf';
  // Southeast (FL peninsula, GA, SC, NC south)
  if (lat < 36 && lon > -82) return 'southeast';
  // Mid-Atlantic (NJ, DE, MD, VA, NC north)
  if (lat >= 36 && lat < 42) return 'midatlantic';
  // Northeast (NY north, New England)
  if (lat >= 42) return 'northeast';
  // Fallback
  return 'midatlantic';
}

// How commonly anglers target each species (1-10). Drives display order so the
// list leads with what people actually fish for in an area (e.g. rainbow trout
// over channel catfish in the Mountain West), not whatever scores highest today.
const POPULARITY: Record<string, number> = {
  // freshwater
  'Largemouth bass': 10, 'Rainbow trout': 9, 'Smallmouth bass': 9, 'Walleye': 9,
  'Brown trout': 8, 'Crappie': 8, 'Channel catfish': 7, 'Northern pike': 7,
  'Bluegill': 7, 'Yellow perch': 7, 'Muskie': 6, 'Lake trout': 6,
  'Hybrid striper': 6, 'White bass': 5, 'Steelhead': 8,
  // saltwater
  'Striped bass': 10, 'Flounder': 9, 'Red drum': 9, 'Salmon': 9, 'Snook': 8,
  'Speckled trout': 8, 'Bluefish': 8, 'Halibut': 8, 'Sea bass': 7, 'Tautog': 7,
  'Sheepshead': 7, 'Grouper': 7, 'Rockfish': 7, 'Tarpon': 7, 'Cod': 6,
  'Black drum': 6, 'Spanish mackerel': 6, 'Pompano': 6, 'Lingcod': 6, 'Yellowtail': 6,
  'Bonefish': 6, 'Cobia': 6, 'Mahi-mahi': 6, 'Weakfish': 5, 'Kingfish': 5,
  'Scup (porgy)': 5, 'King mackerel': 5, 'Yellowfin tuna': 5, 'Tuna (bluefin)': 5,
  'False albacore': 5, 'Pollock': 4, 'Atlantic bonito': 4, 'Triggerfish': 4,
  'Atlantic croaker': 4, 'Spadefish': 3, 'Spot': 3,
};

// Region-specific popularity overrides. The global POPULARITY map reflects how
// marquee a species is overall, but a fish can be a top target in one region and
// an incidental catch in another. We override popularity ONLY where the global
// number misranks the local "hot bite" cards — this never changes which species
// are valid for a region (red drum stays a valid mid-Atlantic entry), only how
// it's ranked among the six cards shown. Example: red drum is a marquee fish in
// the Southeast and Gulf, but is seldom targeted in the mid-Atlantic, so its
// global 9 shouldn't float it into Margate's top six.
// To tune a region, add `region: { 'Species': n }` entries below.
const REGION_POPULARITY: Record<string, Record<string, number>> = {
  midatlantic: {
    'Red drum': 4,
  },
  northeast: {
    // New England + Atlantic Canada (NS/NB): groundfish and bluefin rank higher here.
    'Cod': 8, 'Pollock': 6, 'Tuna (bluefin)': 6,
  },
  southeast: {
    // SE Atlantic structure-and-beach staples.
    'Sheepshead': 8, 'Spanish mackerel': 7,
  },
  gulf: {
    // The Gulf inshore slam leads: trout / redfish / sheepshead / black drum / pompano.
    'Speckled trout': 9, 'Sheepshead': 8, 'Black drum': 7, 'Pompano': 7,
  },
  pacific: {
    // US West Coast + BC: cold-water bottomfish rank alongside salmon.
    'Rockfish': 8, 'Lingcod': 7,
  },
  pacific_northwest: {
    // WA/OR/northern CA coast: salmon is the marquee target, with rockfish and
    // lingcod as the year-round bottomfish staples.
    'Salmon': 10, 'Rockfish': 8, 'Lingcod': 7,
  },
  alaska: {
    // Salmon and halibut co-headline every Alaska trip.
    'Salmon': 10, 'Halibut': 10, 'Rockfish': 7,
  },
  hawaii: {
    // Ahi and mahi lead offshore, oio (bonefish) leads the flats. Tarpon are an
    // introduced afterthought here, so they should not float into the top cards.
    'Yellowfin tuna': 9, 'Mahi-mahi': 8, 'Bonefish': 8, 'Tarpon': 3,
  },
  inland_north: {
    // Great Lakes, Ontario/Quebec, the Prairies: walleye/pike/lake trout/muskie country.
    'Walleye': 10, 'Northern pike': 8, 'Lake trout': 7, 'Muskie': 7,
  },
  inland_west: {
    // Mountain West (MT/WY/CO/ID/UT): trout country first, with salmon and
    // steelhead runs on the Columbia/Snake systems.
    'Rainbow trout': 10, 'Brown trout': 9, 'Steelhead': 9,
  },
  inland_southwest: {
    // Desert reservoirs (Mead/Powell/Havasu): bass and stripers lead, and
    // catfish rank higher here than the national baseline.
    'Channel catfish': 8,
  },
  inland_southcentral: {
    // TX/OK/AR/MO: crappie culture is huge, catfish and the white bass /
    // hybrid run rank above their national numbers.
    'Crappie': 9, 'Channel catfish': 8, 'Hybrid striper': 7, 'White bass': 6,
  },
  inland_southeast: {
    // The South: crappie (specks), bream, and catfish rank alongside bass.
    'Crappie': 9, 'Bluegill': 8, 'Channel catfish': 8,
  },
  inland_pacific: {
    // BC interior + PNW: rainbow (Kamloops) trout water.
    'Rainbow trout': 10, 'Lake trout': 7,
  },
};

function popularityFor(region: string, name: string): number {
  return REGION_POPULARITY[region]?.[name] ?? POPULARITY[name] ?? 5;
}

export function getSpeciesForLocation(
  lat: number,
  lon: number,
  waterTempF: number | null,
  windMph: number,
  waveFt: number,
  pressureMb: number,
  tideDirection: 'rising' | 'falling' | null,
  moonPhase: number,
  isInland: boolean = false
): Array<{ name: string; icon: string; biteScore: number; biteLabel: 'Hot bite' | 'Active' | 'Slow'; tip: string; lures: string; popularity: number }> {
  const region = isInland ? getInlandRegion(lat, lon) : getRegion(lat, lon);
  const wt = waterTempF ?? 68;
  const isFullMoon = Math.abs(moonPhase - 14.77) < 4;
  const rising = tideDirection === 'rising';

  const regional = ALL_SPECIES.filter(s => s.regions.includes(region));

  return regional.map(sp => {
    // Graded temperature match: peaks only near the species' optimal mid-range,
    // so simply being in range no longer makes nearly everything a Hot bite.
    let score = 28;
    const mid = (sp.tempMin + sp.tempMax) / 2;
    const half = Math.max(1, (sp.tempMax - sp.tempMin) / 2);
    if (wt >= sp.tempMin && wt <= sp.tempMax) {
      const closeness = 1 - Math.abs(wt - mid) / half; // 1 at optimal, 0 at the edges
      score += 12 + 26 * closeness;                    // 12..38
    } else {
      const over = wt < sp.tempMin ? sp.tempMin - wt : wt - sp.tempMax;
      score -= Math.min(38, 8 + over * 1.6);
    }

    // Wind
    if (windMph < 8) score += 8;
    else if (windMph > 18) score -= 12;
    else if (windMph > 12) score -= 4;

    // Waves & tide only matter on the coast
    if (!isInland) {
      if (waveFt < 2) score += 6;
      else if (waveFt > 4) score -= 10;
      if (rising) score += 6;
    } else {
      score += 4; // mild neutral baseline inland
    }

    // Pressure
    if (pressureMb < 1005) score += 6;       // falling/low often triggers feeding
    else if (pressureMb > 1020) score -= 6;  // high & bluebird tends to slow it
    else if (pressureMb >= 1012) score += 3;

    // Moon
    if (isFullMoon) score += 6;

    const biteScore = Math.min(100, Math.max(0, Math.round(score)));
    const biteLabel: 'Hot bite' | 'Active' | 'Slow' = biteScore >= 80 ? 'Hot bite' : biteScore >= 56 ? 'Active' : 'Slow';
    return { name: sp.name, icon: sp.icon, biteScore, biteLabel, tip: sp.tip, lures: sp.lures, popularity: popularityFor(region, sp.name) };
  });
}

// Build 2-3 readable narrative factors explaining the fishing score,
// e.g. "Ideal water temp for flounder and striped bass, but high winds
// are making conditions difficult."
export function buildScoreNarrative(
  lat: number,
  lon: number,
  waterTempF: number | null,
  windMph: number,
  waveFt: number,
  pressureMb: number,
  moonPhase: number,
  isInland: boolean = false,
  score?: number
): string[] {
  const wt = waterTempF;

  const positives: string[] = [];
  const negatives: string[] = [];

  // Water temp — described generically. We deliberately do NOT name species
  // here: the regional model is coarse, and naming the wrong fish for a
  // location erodes trust faster than anything else on the page.
  if (wt != null) {
    if (wt >= 55 && wt <= 75) positives.push('water temperature is in a generally productive range');
    else if (wt >= 50 && wt < 55) positives.push('water is a little cool but still fishable');
    else if (wt > 75 && wt <= 82) positives.push('water is on the warm side, so fish may hold deeper or feed best at first and last light');
    else if (wt < 50) negatives.push('cold water is likely to slow the bite');
    else negatives.push('very warm water can push fish deep and slow the bite');
  }

  // Wind
  if (windMph < 8) positives.push('light winds keeping things comfortable');
  else if (windMph > 18) negatives.push('high winds are making conditions difficult');
  else if (windMph > 12) negatives.push('a stiff breeze may complicate casting');

  // Seas (coastal only)
  if (!isInland) {
    if (waveFt < 1.5) positives.push('calm seas');
    else if (waveFt > 4) negatives.push('rough seas could keep small boats at the dock');
  }

  // Moon
  const nearFull = Math.abs(moonPhase - 14.77) < 3;
  const nearNew = moonPhase < 2.5 || moonPhase > 27;
  if (nearFull) positives.push('the full moon should boost nighttime feeding activity');
  else if (nearNew) positives.push(isInland ? 'the new moon favors strong dawn and dusk bites' : 'the new moon favors strong tidal movement and dawn bites');

  // Pressure
  if (pressureMb > 1020) negatives.push('barometric pressure is running high, which can slow the bite');
  else if (pressureMb < 1005) positives.push('falling pressure often triggers a feeding window before weather arrives');
  else if (pressureMb >= 1012 && pressureMb <= 1020) positives.push('stable pressure');

  // Compose into 1-3 sentences pairing positives with contrasting negatives
  const sentences: string[] = [];
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  if (positives.length && negatives.length) {
    sentences.push(`${cap(positives[0])}, but ${negatives[0]}.`);
    const restPos = positives.slice(1, 3);
    const restNeg = negatives.slice(1, 2);
    if (restPos.length && restNeg.length) sentences.push(`${cap(restPos.join(' and '))}; however, ${restNeg[0]}.`);
    else if (restPos.length) sentences.push(`${cap(restPos.join(' and '))}.`);
    else if (restNeg.length) sentences.push(`${cap(restNeg[0])}.`);
  } else if (positives.length) {
    const tail = score == null || score >= 6.5 ? ' — a solid day to be on the water.' : '.';
    sentences.push(`${cap(positives.slice(0, 3).join(', '))}${tail}`);
  } else if (negatives.length) {
    sentences.push(`${cap(negatives.slice(0, 3).join(', and '))}.`);
  }

  return sentences.slice(0, 3);
}
