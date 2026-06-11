// Species database with regional coverage
// Regions: northeast, midatlantic, southeast, gulf, pacific, pacific_northwest, alaska, hawaii

export interface SpeciesInfo {
  name: string;
  icon: string;
  regions: string[];
  tempMin: number; // °F water temp min
  tempMax: number; // °F water temp max
  tip: string;
}

export const ALL_SPECIES: SpeciesInfo[] = [
  { name: 'Striped bass',    icon: '🎣', regions: ['northeast','midatlantic'],                         tempMin: 45, tempMax: 72, tip: 'Bite best on incoming tide near structure. Dawn and dusk are prime windows.' },
  { name: 'Bluefish',        icon: '🌊', regions: ['northeast','midatlantic','southeast'],              tempMin: 58, tempMax: 82, tip: 'Aggressive surface feeders. Active in choppy conditions. Topwater lures work well.' },
  { name: 'Flounder',        icon: '🐟', regions: ['northeast','midatlantic','southeast','gulf'],       tempMin: 55, tempMax: 80, tip: 'Prefer calmer water. Fish bottom near sandy channels on incoming tide.' },
  { name: 'Weakfish',        icon: '🌙', regions: ['midatlantic'],                                     tempMin: 58, tempMax: 78, tip: 'Excellent night bite near full moon. Fish tidal creeks and flats on incoming.' },
  { name: 'Kingfish',        icon: '☀️', regions: ['midatlantic','southeast','gulf'],                  tempMin: 62, tempMax: 84, tip: 'Summer species, love calm surf. Small hooks and fresh bait in the wash.' },
  { name: 'Sea bass',        icon: '⚓', regions: ['northeast','midatlantic','southeast'],              tempMin: 50, tempMax: 72, tip: 'Rocky bottom dwellers. Best around structure and reefs in moderate conditions.' },
  { name: 'Red drum',        icon: '🔴', regions: ['midatlantic','southeast','gulf'],                  tempMin: 60, tempMax: 85, tip: 'Tailing in shallow flats on rising tide. Look for nervous water.' },
  { name: 'Speckled trout',  icon: '🫧', regions: ['southeast','gulf'],                               tempMin: 58, tempMax: 82, tip: 'Early morning topwater action in grass flats. Slow down in cold fronts.' },
  { name: 'Tarpon',          icon: '🌟', regions: ['southeast','gulf','hawaii'],                       tempMin: 72, tempMax: 90, tip: 'Follow migration routes in summer. Pass crabs and live mullet work best.' },
  { name: 'Snook',           icon: '🌴', regions: ['southeast','gulf'],                               tempMin: 68, tempMax: 88, tip: 'Structure-oriented. Work dock lights at night and mangrove edges on tide changes.' },
  { name: 'Pompano',         icon: '🌞', regions: ['southeast','gulf'],                               tempMin: 65, tempMax: 84, tip: 'Surf species. Sand fleas and small jigs in the wash near troughs.' },
  { name: 'Grouper',         icon: '🪸', regions: ['southeast','gulf','pacific'],                     tempMin: 60, tempMax: 82, tip: 'Deep structure fish. Live bait on the bottom near ledges and wrecks.' },
  { name: 'Mahi-mahi',       icon: '🐬', regions: ['southeast','gulf','pacific','hawaii'],             tempMin: 70, tempMax: 88, tip: 'Follow weedlines and color changes offshore. Highly active in warm blue water.' },
  { name: 'Yellowfin tuna',  icon: '🚤', regions: ['southeast','gulf','pacific','hawaii'],             tempMin: 68, tempMax: 86, tip: 'Offshore species. Follow birds and temperature breaks. Chunking or trolling work well.' },
  { name: 'King mackerel',   icon: '⚡', regions: ['southeast','gulf'],                               tempMin: 68, tempMax: 86, tip: 'Fast trolling with live baits near structure. Watch for baitfish schools.' },
  { name: 'Cobia',           icon: '🦈', regions: ['midatlantic','southeast','gulf'],                 tempMin: 65, tempMax: 85, tip: 'Follow cownose rays in spring. Often seen cruising near the surface solo.' },
  { name: 'Halibut',         icon: '🧊', regions: ['pacific_northwest','alaska'],                     tempMin: 38, tempMax: 58, tip: 'Deep, flat sandy bottom. Heavy jigs or whole herring on the bottom.' },
  { name: 'Salmon',          icon: '🐡', regions: ['pacific_northwest','alaska','pacific'],            tempMin: 42, tempMax: 62, tip: 'Follow river mouths during runs. Spinners, spoons, and eggs all produce.' },
  { name: 'Rockfish',        icon: '🪨', regions: ['pacific','pacific_northwest'],                    tempMin: 45, tempMax: 62, tip: 'Rocky reefs and kelp beds. Jigs and live bait near structure at depth.' },
  { name: 'Lingcod',         icon: '🌿', regions: ['pacific','pacific_northwest'],                    tempMin: 42, tempMax: 58, tip: 'Aggressive predators on rocky structure. Large jigs or live rockfish work well.' },
  { name: 'Yellowtail',      icon: '💛', regions: ['pacific'],                                        tempMin: 62, tempMax: 80, tip: 'Kelp paddies and offshore structure. Sardines and iron jigs in current.' },
  { name: 'Bonefish',        icon: '🏝️', regions: ['hawaii','southeast'],                            tempMin: 72, tempMax: 88, tip: 'Sight fishing in shallow flats. Small crabs and shrimp on light tackle.' },
  { name: 'Tuna (bluefin)',  icon: '🔵', regions: ['northeast','midatlantic'],                        tempMin: 55, tempMax: 72, tip: 'Offshore canyon fishing. Chunking butterfish or trolling skirted lures.' },
  { name: 'Pollock',         icon: '❄️', regions: ['northeast','alaska'],                             tempMin: 38, tempMax: 58, tip: 'Deep water species. Diamond jigs worked fast near the bottom.' },
  { name: 'Cod',             icon: '🐠', regions: ['northeast'],                                      tempMin: 38, tempMax: 58, tip: 'Deep, cold water near rocky structure. Clam, squid, or jigs on bottom.' },
];

// Map lat/lon to a fishing region
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
  moonPhase: number
): Array<{ name: string; icon: string; biteScore: number; biteLabel: 'Hot bite' | 'Active' | 'Slow'; tip: string }> {
  const region = getRegion(lat, lon);
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

    // Waves
    if (waveFt < 2) score += 8;
    else if (waveFt > 4) score -= 12;

    // Pressure
    if (pressureMb > 1015) score += 8;
    else if (pressureMb < 1005) score -= 8;

    // Tide
    if (rising) score += 8;

    // Moon
    if (isFullMoon) score += 10;

    const biteScore = Math.min(100, Math.max(0, Math.round(score)));
    const biteLabel: 'Hot bite' | 'Active' | 'Slow' = biteScore > 70 ? 'Hot bite' : biteScore > 45 ? 'Active' : 'Slow';
    return { name: sp.name, icon: sp.icon, biteScore, biteLabel, tip: sp.tip };
  });
}
