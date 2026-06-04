import type { Conditions, TidePrediction, HourlyForecast } from '../types';
import { degToCompass } from './fishing';

const NOAA_STATION = '8534720';

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

export async function fetchWeather(lat: number, lon: number): Promise<{ conditions: Partial<Conditions>; hourly: HourlyForecast }> {
  const [wRes, mRes] = await Promise.all([
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,wind_direction_10m,surface_pressure&hourly=wind_speed_10m,wind_direction_10m&wind_speed_unit=mph&temperature_unit=fahrenheit&timezone=auto&forecast_days=1`),
    fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&current=wave_height,wave_period&hourly=wave_height&length_unit=imperial&timezone=auto&forecast_days=1`),
  ]);
  const [wJson, mJson] = await Promise.all([wRes.json(), mRes.json()]);
  const c = wJson.current;
  const mc = mJson.current;
  return {
    conditions: {
      windMph: c.wind_speed_10m,
      windDir: degToCompass(c.wind_direction_10m),
      windDeg: c.wind_direction_10m,
      airTempF: Math.round(c.temperature_2m),
      pressureMb: Math.round(c.surface_pressure),
      waveFt: parseFloat(mc.wave_height.toFixed(1)),
      wavePeriod: Math.round(mc.wave_period),
    },
    hourly: {
      time: wJson.hourly.time,
      wind_speed_10m: wJson.hourly.wind_speed_10m,
      wind_direction_10m: wJson.hourly.wind_direction_10m,
      wave_height: mJson.hourly?.wave_height ?? null,
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

export async function fetchTides(): Promise<TidePrediction[]> {
  try {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const res = await fetch(`https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=${NOAA_STATION}&product=predictions&datum=MLLW&time_zone=lst_ldt&interval=hilo&units=english&format=json&begin_date=${today}&end_date=${today}`);
    const d = await res.json();
    return d.predictions ?? [];
  } catch {}
  return [];
}

export async function fetchAISummary(conditions: Partial<Conditions>, moonName: string, moonIllum: number, score: number, location: string): Promise<string> {
  const prompt = `You are a knowledgeable fishing guide. Given these conditions at ${location}, write a 2-3 sentence plain-English fishing summary for today. Be specific, practical, and conversational. Mention what species to target and best tactics.

Conditions:
- Wind: ${conditions.windMph?.toFixed(0)} mph from ${conditions.windDir}
- Air temp: ${conditions.airTempF}°F, Water temp: ${conditions.waterTempF ?? 'unknown'}°F
- Wave height: ${conditions.waveFt} ft, Wave period: ${conditions.wavePeriod} sec
- Barometric pressure: ${conditions.pressureMb} mb (${(conditions.pressureMb ?? 1013) > 1013 ? 'high/stable' : 'low/falling'})
- Moon: ${moonName} (${moonIllum}% illuminated)
- Tide direction: ${conditions.tideDirection ?? 'unknown'}
- Overall fishing score: ${score}/10

Keep it to 2-3 sentences max. Be warm and helpful like a local fishing guide.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text ?? 'Conditions look fishable — check the metrics above for details.';
}
