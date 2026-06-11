// Species database with regional coverage
// Regions: northeast, midatlantic, southeast, gulf, pacific, pacific_northwest, alaska, hawaii

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
  { name: 'Striped bass',    icon: '🎣', regions: ['northeast','midatlantic'],                         tempMin: 45, tempMax: 72, lures: 'Bucktails, swim shads, topwater plugs; clams or bunker chunks', tip: 'Bite best on incoming tide near structure. Dawn and dusk are prime windows.' },
  { name: 'Bluefish',        icon: '🌊', regions: ['northeast','midatlantic','southeast'],              tempMin: 58, tempMax: 82, lures: 'Metal spoons, poppers with wire leaders; cut bait', tip: 'Aggressive surface feeders. Active in choppy conditions. Topwater lures work well.' },
  { name: 'Flounder',        icon: '🐟', regions: ['northeast','midatlantic','southeast','gulf'],       tempMin: 55, tempMax: 80, lures: 'Gulp swimming mullet on bucktails; minnow-and-squid rigs', tip: 'Prefer calmer water. Fish bottom near sandy channels on incoming tide.' },
  { name: 'Weakfish',        icon: '🌙', regions: ['midatlantic'],                                     tempMin: 58, tempMax: 78, lures: 'Pink soft plastics, small jigs; live grass shrimp', tip: 'Night feeders — work tidal creeks and flats after dark on moving water.' },
  { name: 'Kingfish',        icon: '☀️', regions: ['midatlantic','southeast','gulf'],                  tempMin: 62, tempMax: 84, lures: 'Bloodworms or Fishbites on small hooks, hi-lo rigs', tip: 'Summer species, love calm surf. Small hooks and fresh bait in the wash.' },
  { name: 'Sea bass',        icon: '⚓', regions: ['northeast','midatlantic','southeast'],              tempMin: 50, tempMax: 72, lures: 'Squid strips and clam on hi-lo rigs; diamond jigs', tip: 'Rocky bottom dwellers. Best around structure and reefs in moderate conditions.' },
  { name: 'Red drum',        icon: '🔴', regions: ['midatlantic','southeast','gulf'],                  tempMin: 60, tempMax: 85, lures: 'Gold spoons, scented paddletails; cut mullet or blue crab', tip: 'Tailing in shallow flats on rising tide. Look for nervous water.' },
  { name: 'Speckled trout',  icon: '🫧', regions: ['southeast','gulf'],                               tempMin: 58, tempMax: 82, lures: 'Popping cork with live shrimp; soft plastic paddletails', tip: 'Early morning topwater action in grass flats. Slow down in cold fronts.' },
  { name: 'Tarpon',          icon: '🌟', regions: ['southeast','gulf','hawaii'],                       tempMin: 72, tempMax: 90, lures: 'Live mullet or pass crabs; large swimbaits', tip: 'Follow migration routes in summer. Pass crabs and live mullet work best.' },
  { name: 'Snook',           icon: '🌴', regions: ['southeast','gulf'],                               tempMin: 68, tempMax: 88, lures: 'Live pilchards; flair hawk jigs and swimbaits at night', tip: 'Structure-oriented. Work dock lights at night and mangrove edges on tide changes.' },
  { name: 'Pompano',         icon: '🌞', regions: ['southeast','gulf'],                               tempMin: 65, tempMax: 84, lures: 'Sand fleas and Fishbites on pompano rigs; banana jigs', tip: 'Surf species. Sand fleas and small jigs in the wash near troughs.' },
  { name: 'Grouper',         icon: '🪸', regions: ['southeast','gulf','pacific'],                     tempMin: 60, tempMax: 82, lures: 'Live pinfish or large cut baits fished on bottom', tip: 'Deep structure fish. Live bait on the bottom near ledges and wrecks.' },
  { name: 'Mahi-mahi',       icon: '🐬', regions: ['southeast','gulf','pacific','hawaii'],             tempMin: 70, tempMax: 88, lures: 'Rigged ballyhoo, trolling skirts; jigs near weedlines', tip: 'Follow weedlines and color changes offshore. Highly active in warm blue water.' },
  { name: 'Yellowfin tuna',  icon: '🚤', regions: ['southeast','gulf','pacific','hawaii'],             tempMin: 68, tempMax: 86, lures: 'Trolled ballyhoo, cedar plugs; chunked butterfish', tip: 'Offshore species. Follow birds and temperature breaks. Chunking or trolling work well.' },
  { name: 'King mackerel',   icon: '⚡', regions: ['southeast','gulf'],                               tempMin: 68, tempMax: 86, lures: 'Slow-trolled live menhaden; drone spoons', tip: 'Fast trolling with live baits near structure. Watch for baitfish schools.' },
  { name: 'Cobia',           icon: '🦈', regions: ['midatlantic','southeast','gulf'],                 tempMin: 65, tempMax: 85, lures: 'Bucktail jigs, live eels; sight-cast swimbaits', tip: 'Follow cownose rays in spring. Often seen cruising near the surface solo.' },
  { name: 'Halibut',         icon: '🧊', regions: ['pacific_northwest','alaska'],                     tempMin: 38, tempMax: 58, lures: 'Whole herring or large jigs bounced on bottom', tip: 'Deep, flat sandy bottom. Heavy jigs or whole herring on the bottom.' },
  { name: 'Salmon',          icon: '🐡', regions: ['pacific_northwest','alaska','pacific'],            tempMin: 42, tempMax: 62, lures: 'Spoons, spinners, cut-plug herring; roe near river mouths', tip: 'Follow river mouths during runs. Spinners, spoons, and eggs all produce.' },
  { name: 'Rockfish',        icon: '🪨', regions: ['pacific','pacific_northwest'],                    tempMin: 45, tempMax: 62, lures: 'Shrimp flies, metal jigs tipped with squid', tip: 'Rocky reefs and kelp beds. Jigs and live bait near structure at depth.' },
  { name: 'Lingcod',         icon: '🌿', regions: ['pacific','pacific_northwest'],                    tempMin: 42, tempMax: 58, lures: 'Large lead-head jigs with grub tails', tip: 'Aggressive predators on rocky structure. Large jigs or live rockfish work well.' },
  { name: 'Yellowtail',      icon: '💛', regions: ['pacific'],                                        tempMin: 62, tempMax: 80, lures: 'Live sardines; surface iron jigs in current', tip: 'Kelp paddies and offshore structure. Sardines and iron jigs in current.' },
  { name: 'Bonefish',        icon: '🏝️', regions: ['hawaii','southeast'],                            tempMin: 72, tempMax: 88, lures: 'Small crab and shrimp flies; skimmer jigs with shrimp', tip: 'Sight fishing in shallow flats. Small crabs and shrimp on light tackle.' },
  { name: 'Tuna (bluefin)',  icon: '🔵', regions: ['northeast','midatlantic'],                        tempMin: 55, tempMax: 72, lures: 'Chunked butterfish; trolled spreader bars and jigs', tip: 'Offshore canyon fishing. Chunking butterfish or trolling skirted lures.' },
  { name: 'Pollock',         icon: '❄️', regions: ['northeast','alaska'],                             tempMin: 38, tempMax: 58, lures: 'Diamond jigs with teaser flies worked fast', tip: 'Deep water species. Diamond jigs worked fast near the bottom.' },
  { name: 'Cod',             icon: '🐠', regions: ['northeast'],                                      tempMin: 38, tempMax: 58, lures: 'Fresh clams; jigs with curly tails near bottom', tip: 'Deep, cold water near rocky structure. Clam, squid, or jigs on bottom.' },
  { name: 'Largemouth bass', icon: '🐸', regions: ['inland_north','inland_south','inland_west'], tempMin: 58, tempMax: 85, lures: 'Texas-rigged worms, spinnerbaits; frogs over weeds', tip: 'Target cover — docks, weed edges, laydowns. Slow down in cold water, topwater at dawn in summer.' },
  { name: 'Smallmouth bass', icon: '🟤', regions: ['inland_north','inland_west'],                  tempMin: 55, tempMax: 75, lures: 'Ned rigs, tubes, small crankbaits on rock', tip: 'Rocky points and current breaks. Tubes, ned rigs, and crankbaits near gravel and boulders.' },
  { name: 'Walleye',          icon: '👁️', regions: ['inland_north'],                               tempMin: 45, tempMax: 70, lures: 'Jig and minnow, crawler harnesses, deep crankbaits', tip: 'Low-light feeders. Jig and minnow near bottom at dawn, dusk, or on overcast days.' },
  { name: 'Northern pike',    icon: '🐊', regions: ['inland_north'],                               tempMin: 40, tempMax: 65, lures: 'Large spoons and spinnerbaits on a steel leader', tip: 'Ambush predators in weedy bays. Large spoons, spinnerbaits, and steel leaders a must.' },
  { name: 'Muskie',           icon: '🦖', regions: ['inland_north'],                               tempMin: 50, tempMax: 72, lures: 'Big bucktails, glide baits; figure-8 every cast', tip: 'The fish of 10,000 casts. Big bucktails and glide baits over weed edges; figure-8 at the boat.' },
  { name: 'Rainbow trout',    icon: '🌈', regions: ['inland_west','inland_north'],                 tempMin: 42, tempMax: 65, lures: 'Small spinners, PowerBait; nymphs and dries to match the hatch', tip: 'Cold, oxygenated water. Drift nymphs in riffles or troll small spoons in stocked lakes.' },
  { name: 'Brown trout',      icon: '🟫', regions: ['inland_west','inland_north'],                 tempMin: 44, tempMax: 68, lures: 'Streamers and nymphs; spinners at dawn and dusk', tip: 'Wary and selective. Streamers at dawn and dusk; match the hatch on pressured water.' },
  { name: 'Lake trout',       icon: '🏔️', regions: ['inland_north'],                              tempMin: 38, tempMax: 55, lures: 'Heavy jigs or spoons trolled deep', tip: 'Deep, cold water in summer — jig near bottom. Shallower in spring and fall turnover.' },
  { name: 'Channel catfish',  icon: '🐱', regions: ['inland_south','inland_north'],                tempMin: 65, tempMax: 90, lures: 'Cut bait, chicken liver, or stink bait on bottom', tip: 'Night feeders on scent. Cut bait or chicken liver on bottom near holes and channel bends.' },
  { name: 'Crappie',          icon: '⚪', regions: ['inland_north','inland_south','inland_west'],  tempMin: 55, tempMax: 75, lures: 'Small jigs or minnows under a float near brush', tip: 'School around brush piles and bridge pilings. Small jigs under a float; spring is prime.' },
  { name: 'Bluegill',         icon: '🔵', regions: ['inland_north','inland_south','inland_west'],  tempMin: 60, tempMax: 85, lures: 'Worms, crickets, or tiny jigs near shoreline cover', tip: 'Spawning beds in late spring. Crickets, worms, or tiny jigs near shoreline cover.' },
  { name: 'Yellow perch',     icon: '🟡', regions: ['inland_north'],                               tempMin: 45, tempMax: 70, lures: 'Small minnows and ice jigs tipped with worm', tip: 'Schooling fish — find one, find fifty. Small minnows or jigs near weed beds and drop-offs.' },
  { name: 'Hybrid striper',   icon: '⚡', regions: ['inland_south'],                               tempMin: 55, tempMax: 78, lures: 'Live shad, swimbaits; topwater when they bust', tip: 'Chase shad schools in open reservoir water. Watch for surface busts at dawn.' },
  { name: 'White bass',       icon: '⬜', regions: ['inland_south','inland_north'],                tempMin: 55, tempMax: 80, lures: 'Small white jigs and inline spinners in current', tip: 'Spring river runs are legendary. Small white jigs and spinners in current.' },
];

// Map lat/lon to an inland (freshwater) fishing region
export function getInlandRegion(lat: number, lon: number): string {
  if (lon < -105) return 'inland_west';
  if (lat >= 40) return 'inland_north';
  return 'inland_south';
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
): Array<{ name: string; icon: string; biteScore: number; biteLabel: 'Hot bite' | 'Active' | 'Slow'; tip: string; lures: string }> {
  const region = isInland ? getInlandRegion(lat, lon) : getRegion(lat, lon);
  const wt = waterTempF ?? 68;
  const isFullMoon = Math.abs(moonPhase - 14.77) < 4;
  const rising = tideDirection === 'rising';

  const regional = ALL_SPECIES.filter(s => s.regions.includes(region));

  return regional.map(sp => {
    let score = 40; // base

    // Water temp bonus
    if (wt >= sp.tempMin && wt <= sp.tempMax) score += 30;
    else if (wt < sp.tempMin - 10 || wt > sp.tempMax + 10) score -= 20;

    // Wind
    if (windMph < 8) score += 10;
    else if (windMph > 20) score -= 15;

    // Waves & tide only matter on the coast
    if (!isInland) {
      if (waveFt < 2) score += 8;
      else if (waveFt > 4) score -= 12;
      if (rising) score += 8;
    } else {
      score += 8; // neutral baseline so inland scores aren't penalized
    }

    // Pressure
    if (pressureMb > 1015) score += 8;
    else if (pressureMb < 1005) score -= 8;

    // Moon
    if (isFullMoon) score += 10;

    const biteScore = Math.min(100, Math.max(0, Math.round(score)));
    const biteLabel: 'Hot bite' | 'Active' | 'Slow' = biteScore > 75 ? 'Hot bite' : biteScore > 52 ? 'Active' : 'Slow';
    return { name: sp.name, icon: sp.icon, biteScore, biteLabel, tip: sp.tip, lures: sp.lures };
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
  const region = isInland ? getInlandRegion(lat, lon) : getRegion(lat, lon);
  const regional = ALL_SPECIES.filter(s => s.regions.includes(region));
  const wt = waterTempF;

  const positives: string[] = [];
  const negatives: string[] = [];

  // Water temp vs species
  if (wt != null) {
    const inRange = regional.filter(s => wt >= s.tempMin && wt <= s.tempMax).slice(0, 2);
    if (inRange.length >= 2) positives.push(`ideal water temp for ${inRange[0].name.toLowerCase()} and ${inRange[1].name.toLowerCase()}`);
    else if (inRange.length === 1) positives.push(`ideal water temp for ${inRange[0].name.toLowerCase()}`);
    else negatives.push(`water temp is outside the comfort zone for most local species`);
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
