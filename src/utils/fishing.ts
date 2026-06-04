import type { MoonInfo, FishingScore, Conditions, Species } from '../types';

export function degToCompass(d: number): string {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(d / 22.5) % 16];
}

export function getMoonPhase(): MoonInfo {
  const now = new Date();
  const known = new Date(2000, 0, 6, 18, 14, 0);
  const diff = (now.getTime() - known.getTime()) / 86400000;
  const cycle = 29.53058867;
  const phase = ((diff % cycle) + cycle) % cycle;
  const illum = Math.round(50 * (1 - Math.cos(2 * Math.PI * phase / cycle)));
  let name: string, desc: string;
  if (phase < 1.85)       { name = 'New moon';        desc = 'Dark skies — great night fishing'; }
  else if (phase < 7.38)  { name = 'Waxing crescent'; desc = 'Rising light, active bite'; }
  else if (phase < 9.22)  { name = 'First quarter';   desc = 'Half lit, moderate activity'; }
  else if (phase < 14.77) { name = 'Waxing gibbous';  desc = 'Bright nights, surface feeding'; }
  else if (phase < 16.61) { name = 'Full moon';        desc = 'Peak night feeding activity'; }
  else if (phase < 22.15) { name = 'Waning gibbous';  desc = 'Still bright, good feeding'; }
  else if (phase < 23.99) { name = 'Last quarter';    desc = 'Decreasing light'; }
  else                    { name = 'Waning crescent'; desc = 'Quiet nights, good dawn bite'; }
  return { phase, illum, name, desc };
}

export function calcFishingScore(d: Partial<Conditions>): FishingScore {
  let s = 5;
  const tips: string[] = [];
  const moon = getMoonPhase();
  if ((d.windMph ?? 10) < 8)  { s += 1.2; tips.push('calm winds'); }
  else if ((d.windMph ?? 10) > 18) { s -= 1.2; tips.push('strong wind'); }
  if ((d.waveFt ?? 2) < 2)    { s += 1;   tips.push('smooth seas'); }
  else if ((d.waveFt ?? 2) > 4) { s -= 1.5; tips.push('choppy seas'); }
  if ((d.pressureMb ?? 1013) > 1015) { s += 0.5; tips.push('high pressure'); }
  else if ((d.pressureMb ?? 1013) < 1005) { s -= 0.5; tips.push('falling pressure'); }
  if (Math.abs(moon.phase - 14.77) < 3) { s += 1; tips.push('full moon feeding'); }
  else if (moon.phase < 3 || moon.phase > 27) { s += 0.5; tips.push('new moon'); }
  const wt = d.waterTempF ?? 65;
  if (wt > 58 && wt < 78) { s += 0.5; tips.push('ideal water temp'); }
  s = Math.min(10, Math.max(1, Math.round(s * 10) / 10));
  let label = s >= 7.5 ? 'Great conditions' : s >= 5.5 ? 'Decent day' : s >= 3.5 ? 'Fair conditions' : 'Tough conditions';
  return { score: s, tips, label };
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
