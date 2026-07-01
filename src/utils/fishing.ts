import type { MoonInfo, FishingScore, Conditions, Species, WaterClarity } from '../types';

export function degToCompass(d: number): string {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(d / 22.5) % 16];
}

export function getMoonPhase(forDate?: Date): MoonInfo {
  const now = forDate ?? new Date();
  const known = new Date(2000, 0, 6, 18, 14, 0);
  const diff = (now.getTime() - known.getTime()) / 86400000;
  const cycle = 29.53058867;
  const phase = ((diff % cycle) + cycle) % cycle;
  const illum = Math.round(50 * (1 - Math.cos(2 * Math.PI * phase / cycle)));
  let name: string, desc: string;
  // Each cardinal phase (new/first quarter/full/last quarter) sits at the CENTER
  // of its ~3.7-day window; the four intermediate phases fill the gaps. The full
  // window (12.93–16.61) brackets the 14.77 midpoint so a 100%-lit moon reads as
  // "Full moon" rather than slipping into "Waxing gibbous" just before the peak.
  if (phase < 1.84)       { name = 'New moon';        desc = 'Dark skies — great night fishing'; }
  else if (phase < 5.54)  { name = 'Waxing crescent'; desc = 'Rising light, active bite'; }
  else if (phase < 9.22)  { name = 'First quarter';   desc = 'Half lit, moderate activity'; }
  else if (phase < 12.93) { name = 'Waxing gibbous';  desc = 'Bright nights, surface feeding'; }
  else if (phase < 16.61) { name = 'Full moon';        desc = 'Peak night feeding activity'; }
  else if (phase < 20.30) { name = 'Waning gibbous';  desc = 'Still bright, good feeding'; }
  else if (phase < 23.99) { name = 'Last quarter';    desc = 'Decreasing light'; }
  else if (phase < 27.69) { name = 'Waning crescent'; desc = 'Quiet nights, good dawn bite'; }
  else                    { name = 'New moon';        desc = 'Dark skies — great night fishing'; }
  return { phase, illum, name, desc };
}

export function calcFishingScore(d: Partial<Conditions>, forDate?: Date): FishingScore {
  let s = 5;
  const factors: Array<{ label: string; delta: number }> = [];
  const add = (label: string, delta: number) => { s += delta; factors.push({ label, delta }); };
  const moon = getMoonPhase(forDate);

  // Wind
  if (d.windMph != null) {
    if (d.windMph < 8) add('Calm winds', 1.2);
    else if (d.windMph > 18) add('Strong winds', -1.4);
    else if (d.windMph > 13) add('Stiff breeze', -0.5);
  }
  // Seas (when wave data exists)
  if (d.waveFt != null) {
    if (d.waveFt < 2) add('Manageable seas', 0.8);
    else if (d.waveFt > 4) add('Rough seas', -1.5);
  }
  // Pressure TREND beats absolute pressure — falling ahead of a front is the
  // classic bite trigger; sharply rising post-front slows things down.
  if (d.pressureTrend != null) {
    if (d.pressureTrend <= -2) add('Falling pressure (front approaching)', 1.0);
    else if (d.pressureTrend >= 3) add('Rapidly rising pressure', -0.8);
    else add('Steady pressure', 0.2);
  } else if (d.pressureMb != null) {
    if (d.pressureMb < 1000) add('Very low pressure (stormy)', -0.5);
  }
  // Moon
  if (Math.abs(moon.phase - 14.77) < 3) add('Full moon feeding', 0.9);
  else if (moon.phase < 3 || moon.phase > 27) add('New moon tides', 0.5);
  // Water temp
  if (d.waterTempF != null && d.waterTempF > 58 && d.waterTempF < 78) add('Productive water temp', 0.5);
  // Tide movement
  if (d.tideDirection === 'rising') add('Incoming tide', 0.5);
  else if (d.tideDirection === 'falling') add('Outgoing tide', 0.2);

  s = Math.min(10, Math.max(1, Math.round(s * 10) / 10));
  const label = s >= 7.5 ? 'Great conditions' : s >= 5.5 ? 'Decent conditions' : s >= 3.5 ? 'Fair conditions' : 'Tough conditions';
  return { score: s, tips: factors.map(f => f.label.toLowerCase()), label, factors };
}

export function calcSpecies(d: Partial<Conditions>): Species[] {
  const moon = getMoonPhase();
  const isFullMoon = Math.abs(moon.phase - 14.77) < 4;
  const rising = d.tideDirection === 'rising';
  const wt = d.waterTempF ?? 68;
  const w = d.windMph ?? 10;
  const wv = d.waveFt ?? 2;
  const p = d.pressureMb ?? 1013;

  const raw: Array<{ name: string; icon: string; score: number; tip: string }> = [
    { name: 'Striped bass', icon: '🎣',  score: (rising?30:15)+(wt>54&&wt<72?30:5)+(isFullMoon?20:0)+(w<12?15:0), tip: 'Bite best on incoming tide near structure. Dawn and dusk are prime windows.' },
    { name: 'Flounder',     icon: '🐟', score: (wt>58&&wt<78?35:10)+(wv<3?25:5)+(p>1010?20:5)+(rising?15:5),     tip: 'Prefer calmer water. Fish bottom near sandy channels on incoming tide.' },
    { name: 'Bluefish',     icon: '🌊', score: (wt>62?30:10)+(w>5?20:10)+(isFullMoon?15:5)+(wv>1?15:5),           tip: 'Aggressive surface feeders. Active in choppy conditions. Topwater lures work well.' },
    { name: 'Sea bass',     icon: '⚓', score: (wt>52&&wt<72?35:10)+(p>1012?20:10)+(wv<3?25:5)+10,               tip: 'Rocky bottom dwellers. Best around structure and reefs in moderate conditions.' },
    { name: 'Weakfish',     icon: '🌙', score: (isFullMoon?30:10)+(wt>60&&wt<76?30:10)+(rising?20:8)+(w<10?10:0), tip: 'Excellent night bite near full moon. Fish tidal creeks and flats on incoming.' },
    { name: 'Kingfish',     icon: '☀️', score: (wt>62&&wt<82?35:5)+(wv<2?25:8)+(p>1010?20:8)+10,                 tip: 'Summer species, love calm surf. Small hooks and fresh bait in the wash.' },
  ];

  return raw.map(r => {
    const biteScore = Math.min(100, Math.round(r.score));
    const biteLabel: Species['biteLabel'] = biteScore > 70 ? 'Hot bite' : biteScore > 45 ? 'Active' : 'Slow';
    return { name: r.name, icon: r.icon, biteScore, biteLabel, tip: r.tip };
  });
}

export function scoreColor(score: number): { bg: string; text: string } {
  if (score >= 7.5) return { bg: '#E1F5EE', text: '#0F6E56' };
  if (score >= 5.5) return { bg: '#E6F1FB', text: '#185FA5' };
  if (score >= 3.5) return { bg: '#FAEEDA', text: '#854F0B' };
  return { bg: '#FAECE7', text: '#993C1D' };
}

// Approximate solunar feeding periods. Majors center on lunar transit
// (moon overhead / underfoot), minors on moonrise / moonset.
export interface SolunarPeriods {
  majors: Array<[string, string]>;
  minors: Array<[string, string]>;
  majorHours: number[];
  minorHours: number[];
}

export function getSolunarPeriods(forDate: Date): SolunarPeriods {
  const { phase } = getMoonPhase(forDate);
  const transit = (12 + phase * 0.84) % 24; // moon lags the sun ~50 min/day
  const underfoot = (transit + 12.42) % 24;
  const rise = (transit - 6.21 + 24) % 24;
  const set = (transit + 6.21) % 24;
  const fmtT = (h: number) => {
    const norm = ((h % 24) + 24) % 24;
    const hh = Math.floor(norm);
    const mm = Math.round((norm - hh) * 60);
    return new Date(2000, 0, 1, hh, mm).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };
  return {
    majors: [
      [fmtT(transit - 1), fmtT(transit + 1)],
      [fmtT(underfoot - 1), fmtT(underfoot + 1)],
    ],
    minors: [
      [fmtT(rise - 0.5), fmtT(rise + 0.5)],
      [fmtT(set - 0.5), fmtT(set + 0.5)],
    ],
    majorHours: [transit, underfoot],
    minorHours: [rise, set],
  };
}

// Derived water-clarity estimate. There's no clean free real-time clarity feed
// (especially saltwater), so we infer it from data we already pull. Strongest
// for the surf (wave height + wind churn sand); for inland we lean on recent /
// incoming wet weather, which is the best signal available without rain history.
export function calcWaterClarity(c: Partial<Conditions>, isInland: boolean): WaterClarity {
  const wave = c.waveFt ?? 0;
  const wind = c.windMph ?? 0;
  const rain = c.precipChance ?? 0;
  const wet = /rain|storm|shower|drizzle|thunder|squall/i.test(c.conditionLabel || '');

  if (!isInland) {
    if (wave >= 4 || wind >= 22)
      return { level: 'Muddy', reason: 'Heavy surf and wind are churning up sand and sediment.', lureHint: 'Go bright and loud — chartreuse, white, rattles, or added scent.' };
    if (wave >= 2 || wind >= 14 || (wet && rain >= 60))
      return { level: 'Stained', reason: 'Chop and wind are putting some color in the water.', lureHint: 'Split the difference — natural colors with a little flash or contrast.' };
    return { level: 'Clear', reason: 'Calm seas and light wind mean clean water and good visibility.', lureHint: 'Favor natural colors and finesse presentations — fish can see well.' };
  }

  if (wet && rain >= 70)
    return { level: 'Muddy', reason: 'Active wet weather likely has the water up and off-color.', lureHint: 'Go bright and loud — chartreuse, dark silhouettes, rattles, or scent.' };
  if (rain >= 40 || wet)
    return { level: 'Stained', reason: 'Recent or incoming rain may be putting a stain in the water.', lureHint: 'Natural colors with some contrast or flash tend to work best.' };
  return { level: 'Clear', reason: 'Stable, dry conditions — the water is likely running clear.', lureHint: 'Favor natural colors and finesse presentations — fish can see well.' };
}
