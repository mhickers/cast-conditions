import type { Conditions, TidePrediction, HourlyForecast } from '../types';
import { degToCompass } from './fishing';

const NOAA_STATION = '8534720';

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
  return dateStr === new Date().toISOString().slice(0, 10);
}

// Fetch weather for a specific date (today = live current data; future = forecast for that day)
export async function fetchWeather(lat: number, lon: number, dateStr: string): Promise<{ conditions: Partial<Conditions>; hourly: HourlyForecast }> {
  const today = isToday(dateStr);
  const dateParams = `&start_date=${dateStr}&end_date=${dateStr}`;

  const [wRes, mRes] = await Promise.all([
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}${today ? '&current=temperature_2m,wind_speed_10m,wind_direction_10m,surface_pressure,weather_code,precipitation' : ''}&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,surface_pressure,weather_code,precipitation_probability&daily=sunrise,sunset&wind_speed_unit=mph&temperature_unit=fahrenheit&timezone=auto${dateParams}`),
    fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}${today ? '&current=wave_height,wave_period' : ''}&hourly=wave_height,wave_period&length_unit=imperial&timezone=auto${dateParams}`),
  ]);
  const [wJson, mJson] = await Promise.all([wRes.json(), mRes.json()]);
  const h = wJson.hourly;
  const mh = mJson.hourly;

  let conditions: Partial<Conditions>;

  if (today && wJson.current) {
    const c = wJson.current;
    const mc = mJson.current;
    const wc = weatherCodeToCondition(c.weather_code ?? 0);
    conditions = {
      windMph: c.wind_speed_10m,
      windDir: degToCompass(c.wind_direction_10m),
      windDeg: c.wind_direction_10m,
      airTempF: Math.round(c.temperature_2m),
      pressureMb: Math.round(c.surface_pressure),
      waveFt: parseFloat((mc?.wave_height ?? 0).toFixed(1)),
      wavePeriod: Math.round(mc?.wave_period ?? 0),
      conditionLabel: wc.label,
      conditionIcon: wc.icon,
      precipChance: h?.precipitation_probability ? Math.max(...h.precipitation_probability.slice(new Date().getHours(), new Date().getHours() + 6)) : null,
      sunrise: wJson.daily?.sunrise?.[0] ?? null,
      sunset: wJson.daily?.sunset?.[0] ?? null,
    };
  } else {
    // Future date — use midday (12:00) values as representative, max precip chance for the day
    const idx = Math.min(12, (h?.time?.length ?? 1) - 1);
    const wc = weatherCodeToCondition(h?.weather_code?.[idx] ?? 0);
    conditions = {
      windMph: h?.wind_speed_10m?.[idx] ?? 0,
      windDir: degToCompass(h?.wind_direction_10m?.[idx] ?? 0),
      windDeg: h?.wind_direction_10m?.[idx] ?? 0,
      airTempF: Math.round(h?.temperature_2m?.[idx] ?? 0),
      pressureMb: Math.round(h?.surface_pressure?.[idx] ?? 1013),
      waveFt: parseFloat((mh?.wave_height?.[idx] ?? 0).toFixed(1)),
      wavePeriod: Math.round(mh?.wave_period?.[idx] ?? 0),
      conditionLabel: wc.label,
      conditionIcon: wc.icon,
      precipChance: h?.precipitation_probability ? Math.max(...h.precipitation_probability) : null,
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
      wave_height: mh?.wave_height ?? null,
      weather_code: h?.weather_code ?? null,
      precipitation_probability: h?.precipitation_probability ?? null,
    },
  };
}

export async function fetchWaterTemp(): Promise<number | null> {
  try {
    const res = await fetch(`https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=${NOAA_STATION}&product=water_temperature&datum=MLLW&time_zone=lst_ldt&units=english&format=json&date=latest`);
    const d = await res.json();
    if (d.data?.[0]) return parseFloat(d.data[0].v);
  } catch {}
  return null;
}

export async function fetchTides(dateStr: string): Promise<TidePrediction[]> {
  try {
    // Fetch a 3-day window (day before → day after) so current-tide
    // interpolation always has bracketing events, even late at night.
    const center = new Date(dateStr + 'T12:00:00');
    const before = new Date(center); before.setDate(before.getDate() - 1);
    const after = new Date(center); after.setDate(after.getDate() + 1);
    const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
    const res = await fetch(`https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=${NOAA_STATION}&product=predictions&datum=MLLW&time_zone=lst_ldt&interval=hilo&units=english&format=json&begin_date=${fmt(before)}&end_date=${fmt(after)}`);
    const d = await res.json();
    return d.predictions ?? [];
  } catch {}
  return [];
}

export async function fetchAISummary(conditions: Partial<Conditions>, moonName: string, moonIllum: number, score: number, location: string, dateStr: string): Promise<string> {
  const isFuture = !isToday(dateStr);
  const dayLabel = isFuture
    ? new Date(dateStr + 'T12:00:00').toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
    : 'today';

  const prompt = `You are a knowledgeable fishing guide. Given these ${isFuture ? 'forecasted' : 'current'} conditions at ${location} for ${dayLabel}, write a 2-3 sentence plain-English fishing summary. Be specific, practical, and conversational. Mention what species to target and best tactics.

Conditions:
- Weather: ${conditions.conditionLabel ?? 'unknown'}, ${conditions.precipChance != null ? conditions.precipChance + '% chance of rain' : 'precipitation unknown'}
- Wind: ${conditions.windMph?.toFixed(0)} mph from ${conditions.windDir}
- Air temp: ${conditions.airTempF}°F, Water temp: ${conditions.waterTempF ?? 'unknown'}°F
- Wave height: ${conditions.waveFt} ft, Wave period: ${conditions.wavePeriod} sec
- Barometric pressure: ${conditions.pressureMb} mb (${(conditions.pressureMb ?? 1013) > 1013 ? 'high/stable' : 'low/falling'})
- Moon: ${moonName} (${moonIllum}% illuminated)
- Tide direction: ${conditions.tideDirection ?? 'unknown'}
- Overall fishing score: ${score}/10

Keep it to 2-3 sentences max. Be warm and helpful like a local fishing guide.`;

  // Calls our own serverless function (/api/summary) which holds the API key
  // server-side — more reliable and keeps the key out of the browser.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      if (data.text) return data.text;
    } catch (e) {
      if (attempt === 1) console.error('AI summary failed:', e);
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  return 'AI summary is temporarily unavailable — the conditions data above is still live and accurate.';
}
