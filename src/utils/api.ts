import type { Conditions, HourlyForecast, TideData } from '../types';
import { degToCompass, calcFishingScore } from './fishing';

// "Today" in the user's local timezone (toISOString alone gives UTC,
// which flips to tomorrow for US users in the evening)
export function localToday(d: Date = new Date()): string {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

// Add one calendar day to a YYYY-MM-DD string. Anchored at local noon so a
// 1-hour DST shift can never bump it to the wrong date.
function nextDay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  return localToday(d);
}

// Fetch JSON with retry; returns null instead of throwing so one flaky
// source (or an ad blocker) can't take down the whole dashboard.
async function fetchJson(url: string, tries = 2): Promise<any | null> {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      // Parse the body even on errors — Open-Meteo returns { error, reason }
      // which tells us exactly what went wrong instead of failing silently.
      return await res.json();
    } catch {}
    await new Promise(r => setTimeout(r, 400));
  }
  return null;
}


// Map Open-Meteo weather codes to a simple condition + icon
export function weatherCodeToCondition(code: number): { label: string; icon: string } {
  if (code === 0) return { label: 'Sunny', icon: '☀️' };
  if (code === 1) return { label: 'Mostly sunny', icon: '🌤️' };
  if (code === 2) return { label: 'Partly cloudy', icon: '⛅' };
  if (code === 3) return { label: 'Cloudy', icon: '☁️' };
  if (code === 45 || code === 48) return { label: 'Foggy', icon: '🌫️' };
  if (code >= 51 && code <= 57) return { label: 'Drizzle', icon: '🌦️' };
  if (code >= 61 && code <= 67) return { label: 'Rain', icon: '🌧️' };
  if (code >= 71 && code <= 77) return { label: 'Snow', icon: '🌨️' };
  if (code >= 80 && code <= 82) return { label: 'Showers', icon: '🌧️' };
  if (code >= 95) return { label: 'Thunderstorms', icon: '⛈️' };
  return { label: 'Mixed', icon: '🌥️' };
}

export async function geocodeLocation(query: string): Promise<{ lat: number; lon: number; label: string } | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  const d = await res.json();
  if (d.results?.length) {
    const r = d.results[0];
    const label = [r.name, r.admin1, r.country_code].filter(Boolean).join(', ');
    return { lat: r.latitude, lon: r.longitude, label };
  }
  return null;
}

function isToday(dateStr: string): boolean {
  return dateStr === localToday();
}

// Fetch weather for a specific date and time.
// hour === null means "now" (live current data, today only); a number 0-23 picks that hour.
export async function fetchWeather(lat: number, lon: number, dateStr: string, hour: number | null): Promise<{ conditions: Partial<Conditions>; hourly: HourlyForecast }> {
  const today = isToday(dateStr);
  const useNow = today && hour === null;
  // For "today", fetch through tomorrow as well so the 24-hour forecast can
  // roll past midnight instead of running out at the end of the calendar day.
  const endDate = today ? nextDay(dateStr) : dateStr;
  const dateParams = `&start_date=${dateStr}&end_date=${endDate}`;

  const hourlyParams = 'hourly=temperature_2m,wind_speed_10m,wind_direction_10m,surface_pressure,weather_code,precipitation_probability&daily=sunrise,sunset&wind_speed_unit=mph&temperature_unit=fahrenheit&timezone=auto';
  const currentParams = today ? '&current=temperature_2m,wind_speed_10m,wind_direction_10m,surface_pressure,weather_code,precipitation' : '';

  let [wJson, mJson] = await Promise.all([
    fetchJson(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}${currentParams}&${hourlyParams}${dateParams}`),
    fetchJson(`https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}${today ? '&current=wave_height,wave_period' : ''}&hourly=wave_height,wave_period&length_unit=imperial&timezone=auto${dateParams}`),
  ]);

  // If the full request failed, retry once with a simpler request shape
  if (!wJson || wJson.error || !wJson.hourly) {
    wJson = await fetchJson(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&${hourlyParams}${dateParams}`);
  }

  // Weather is essential; waves are optional (marine API has outages and
  // some ad blockers block it — the dashboard still works without it)
  if (!wJson || wJson.error || !wJson.hourly) {
    throw new Error(wJson?.reason || 'no response — network blocked or service down');
  }
  if (mJson?.error) mJson = null;
  const h = wJson.hourly;
  const mh = mJson?.hourly;

  let conditions: Partial<Conditions>;

  if (useNow && wJson.current) {
    const c = wJson.current;
    const mc = mJson?.current;
    const wc = weatherCodeToCondition(c.weather_code ?? 0);
    conditions = {
      windMph: c.wind_speed_10m,
      windDir: degToCompass(c.wind_direction_10m),
      windDeg: c.wind_direction_10m,
      airTempF: Math.round(c.temperature_2m),
      pressureMb: Math.round(c.surface_pressure),
      waveFt: mc?.wave_height != null ? parseFloat(mc.wave_height.toFixed(1)) : undefined,
      wavePeriod: mc?.wave_period != null ? Math.round(mc.wave_period) : undefined,
      conditionLabel: wc.label,
      conditionIcon: wc.icon,
      precipChance: h?.precipitation_probability ? Math.max(...h.precipitation_probability.slice(new Date().getHours(), new Date().getHours() + 6)) : null,
      sunrise: wJson.daily?.sunrise?.[0] ?? null,
      sunset: wJson.daily?.sunset?.[0] ?? null,
    };
  } else {
    // Specific hour (0-23) of the selected date; defaults to midday
    const idx = Math.min(hour ?? (today ? new Date().getHours() : 12), (h?.time?.length ?? 1) - 1);
    const wc = weatherCodeToCondition(h?.weather_code?.[idx] ?? 0);
    const waveVal = mh?.wave_height?.[idx];
    const periodVal = mh?.wave_period?.[idx];
    conditions = {
      windMph: h?.wind_speed_10m?.[idx] ?? 0,
      windDir: degToCompass(h?.wind_direction_10m?.[idx] ?? 0),
      windDeg: h?.wind_direction_10m?.[idx] ?? 0,
      airTempF: Math.round(h?.temperature_2m?.[idx] ?? 0),
      pressureMb: Math.round(h?.surface_pressure?.[idx] ?? 1013),
      waveFt: waveVal != null ? parseFloat(waveVal.toFixed(1)) : undefined,
      wavePeriod: periodVal != null ? Math.round(periodVal) : undefined,
      conditionLabel: wc.label,
      conditionIcon: wc.icon,
      precipChance: h?.precipitation_probability ? Math.max(...h.precipitation_probability.slice(Math.max(0, idx - 1), idx + 4)) : null,
      sunrise: wJson.daily?.sunrise?.[0] ?? null,
      sunset: wJson.daily?.sunset?.[0] ?? null,
    };
  }

  return {
    conditions,
    hourly: {
      time: h?.time ?? [],
      wind_speed_10m: h?.wind_speed_10m ?? [],
      wind_direction_10m: h?.wind_direction_10m ?? [],
      temperature_2m: h?.temperature_2m ?? null,
      surface_pressure: h?.surface_pressure ?? null,
      wave_height: mh?.wave_height ?? null,
      weather_code: h?.weather_code ?? null,
      precipitation_probability: h?.precipitation_probability ?? null,
    },
  };
}

export async function fetchWaterTemp(stationId: string): Promise<number | null> {
  try {
    const res = await fetch(`https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=${stationId}&product=water_temperature&datum=MLLW&time_zone=lst_ldt&units=english&format=json&date=latest`);
    const d = await res.json();
    if (d.data?.[0]) return parseFloat(d.data[0].v);
  } catch {}
  return null;
}

export async function fetchTides(dateStr: string, stationId: string): Promise<TideData> {
  try {
    // 3-day window (day before -> day after) so interpolation always brackets.
    const center = new Date(dateStr + 'T12:00:00');
    const before = new Date(center); before.setDate(before.getDate() - 1);
    const after = new Date(center); after.setDate(after.getDate() + 1);
    const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
    const base = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=${stationId}&product=predictions&datum=MLLW&time_zone=lst_ldt&units=english&format=json&begin_date=${fmt(before)}&end_date=${fmt(after)}`;
    const [eventsRes, curveRes] = await Promise.all([
      fetch(base + '&interval=hilo'),
      fetch(base + '&interval=30'), // smooth 30-minute curve for the chart
    ]);
    const [eventsD, curveD] = await Promise.all([eventsRes.json(), curveRes.json()]);
    const events = eventsD.predictions ?? [];
    let curve = curveD.predictions ?? [];
    // Subordinate NOAA stations only publish high/low events — synthesize a
    // smooth curve between them (cosine interpolation, the standard approximation)
    if (!curve.length && events.length > 1) {
      curve = [];
      const fmtLocal = (d: Date) => {
        const p = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
      };
      for (let i = 0; i < events.length - 1; i++) {
        const t1 = new Date(events[i].t.replace(' ', 'T')).getTime();
        const t2 = new Date(events[i + 1].t.replace(' ', 'T')).getTime();
        const v1 = parseFloat(events[i].v), v2 = parseFloat(events[i + 1].v);
        for (let t = t1; t < t2; t += 30 * 60000) {
          const frac = (t - t1) / (t2 - t1);
          const v = v1 + (v2 - v1) * (1 - Math.cos(Math.PI * frac)) / 2;
          curve.push({ t: fmtLocal(new Date(t)), v: v.toFixed(2) });
        }
      }
    }
    return { events, curve };
  } catch {}
  return { events: [], curve: [] };
}

export async function fetchAISummary(conditions: Partial<Conditions>, moonName: string, moonIllum: number, score: number, location: string, dateStr: string): Promise<string> {
  const isFuture = !isToday(dateStr);
  const dayLabel = isFuture
    ? new Date(dateStr + 'T12:00:00').toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
    : 'today';

  // Build the conditions list ONLY from data we actually have — the AI must
  // never narrate values the dashboard shows as unavailable.
  const lines: string[] = [];
  if (conditions.conditionLabel) lines.push(`- Weather: ${conditions.conditionLabel}${conditions.precipChance != null ? `, ${conditions.precipChance}% chance of rain` : ''}`);
  if (conditions.windMph != null) lines.push(`- Wind: ${conditions.windMph.toFixed(0)} mph${conditions.windDir ? ` from ${conditions.windDir}` : ''}`);
  if (conditions.airTempF != null) lines.push(`- Air temp: ${conditions.airTempF}°F`);
  if (conditions.waterTempF != null) lines.push(`- Water temp: ${conditions.waterTempF.toFixed(0)}°F`);
  if (conditions.waveFt != null) lines.push(`- Wave height: ${conditions.waveFt} ft${conditions.wavePeriod ? `, period ${conditions.wavePeriod} sec` : ''}`);
  if (conditions.pressureMb != null) {
    const t = conditions.pressureTrend;
    lines.push(`- Barometric pressure: ${conditions.pressureMb} mb${t != null ? ` (${t <= -2 ? 'falling — front approaching' : t >= 3 ? 'rising quickly' : 'steady'})` : ''}`);
  }
  lines.push(`- Moon: ${moonName} (${moonIllum}% illuminated)`);
  if (conditions.tideDirection) lines.push(`- Tide: ${conditions.tideDirection}`);
  lines.push(`- Overall fishing score: ${score}/10`);

  const prompt = `You are a knowledgeable fishing guide. Given these ${isFuture ? 'forecasted' : 'current'} conditions at ${location} for ${dayLabel}, write a 2-3 sentence plain-English fishing summary. Be specific, practical, and conversational. Mention what species to target and best tactics.

Conditions:
${lines.join('\n')}

STRICT RULES:
- Reference ONLY the conditions listed above. If tide is not listed, do not mention tides at all. Same for waves, water temp, or any other missing value.
- Your tone must match the score: below 5 is a tough day, 5-6.5 is mixed, above 6.5 is promising. Never call a below-6 day "great" or "solid".
- Keep it to 2-3 sentences max. Warm and helpful like a local guide. Plain text only — no markdown, no asterisks, no bullet points.`;

  // Calls our own serverless function (/api/summary) which holds the API key
  // server-side — more reliable and keeps the key out of the browser.
  let lastError = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        lastError = data?.error || `HTTP ${res.status}`;
        throw new Error(lastError);
      }
      if (data.text) return data.text.replace(/\*/g, '');
      lastError = 'Empty response';
    } catch (e: any) {
      if (!lastError) lastError = e?.message || 'Network error';
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  return `AI summary unavailable (${lastError}) — the conditions data above is still live and accurate.`;
}

// Generic AI advice call (used by the bait & lure advisor)
export async function fetchAIAdvice(prompt: string): Promise<string | null> {
  try {
    const res = await fetch('/api/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.text) return data.text.replace(/\*/g, '');
  } catch {}
  return null;
}

// 7-day outlook: one daily score per day (midday conditions + pressure trend)
export async function fetchWeekOutlook(lat: number, lon: number): Promise<Array<{ date: string; score: number }>> {
  const start = localToday();
  const endD = new Date(); endD.setDate(endD.getDate() + 6);
  const end = localToday(endD);
  const [w, m] = await Promise.all([
    fetchJson(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=wind_speed_10m,surface_pressure&wind_speed_unit=mph&timezone=auto&start_date=${start}&end_date=${end}`),
    fetchJson(`https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=wave_height&length_unit=imperial&timezone=auto&start_date=${start}&end_date=${end}`),
  ]);
  if (!w?.hourly?.time?.length) return [];
  const out: Array<{ date: string; score: number }> = [];
  const days = Math.floor(w.hourly.time.length / 24);
  for (let d = 0; d < Math.min(7, days); d++) {
    const idx = d * 24 + 12;
    const dateStr = w.hourly.time[idx].slice(0, 10);
    const trend = w.hourly.surface_pressure ? w.hourly.surface_pressure[idx] - w.hourly.surface_pressure[idx - 6] : null;
    const { score } = calcFishingScore({
      windMph: w.hourly.wind_speed_10m?.[idx],
      waveFt: m?.hourly?.wave_height?.[idx] ?? undefined,
      pressureMb: w.hourly.surface_pressure?.[idx],
      pressureTrend: trend,
    } as any, new Date(dateStr + 'T12:00:00'));
    out.push({ date: dateStr, score });
  }
  return out;
}
