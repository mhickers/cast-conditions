// Cross-check weather data against the National Weather Service (api.weather.gov)
// NWS is free, no API key, US-only. For US locations we fetch NWS and blend
// with Open-Meteo; if values agree the data is "verified", if they diverge we average.

export interface CrossCheckResult {
  windMph: number;
  airTempF: number;
  sourcesUsed: number;
  verified: boolean; // true when 2+ sources agree within tolerance
}

export async function crossCheckWeather(
  lat: number,
  lon: number,
  openMeteoWindMph: number,
  openMeteoTempF: number
): Promise<CrossCheckResult> {
  const fallback: CrossCheckResult = {
    windMph: openMeteoWindMph,
    airTempF: openMeteoTempF,
    sourcesUsed: 1,
    verified: false,
  };

  // NWS only covers the US
  if (lat < 18 || lat > 72 || lon < -180 || lon > -60) return fallback;

  try {
    // NWS requires a two-step lookup: point -> forecast office/grid -> latest observation
    const pointRes = await fetch(`https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`, {
      headers: { 'Accept': 'application/geo+json' },
    });
    if (!pointRes.ok) return fallback;
    const pointData = await pointRes.json();
    const stationsUrl = pointData.properties?.observationStations;
    if (!stationsUrl) return fallback;

    const stationsRes = await fetch(stationsUrl, { headers: { 'Accept': 'application/geo+json' } });
    if (!stationsRes.ok) return fallback;
    const stationsData = await stationsRes.json();
    const stationId = stationsData.features?.[0]?.properties?.stationIdentifier;
    if (!stationId) return fallback;

    const obsRes = await fetch(`https://api.weather.gov/stations/${stationId}/observations/latest`, {
      headers: { 'Accept': 'application/geo+json' },
    });
    if (!obsRes.ok) return fallback;
    const obs = await obsRes.json();
    const p = obs.properties;

    const nwsTempC = p?.temperature?.value;
    const nwsWindKmh = p?.windSpeed?.value;

    let windMph = openMeteoWindMph;
    let airTempF = openMeteoTempF;
    let sources = 1;
    let agree = true;

    if (nwsTempC != null) {
      const nwsTempF = nwsTempC * 9 / 5 + 32;
      sources = 2;
      if (Math.abs(nwsTempF - openMeteoTempF) > 6) agree = false;
      airTempF = Math.round((nwsTempF + openMeteoTempF) / 2);
    }
    if (nwsWindKmh != null) {
      const nwsWindMph = nwsWindKmh * 0.621371;
      sources = 2;
      if (Math.abs(nwsWindMph - openMeteoWindMph) > 7) agree = false;
      windMph = (nwsWindMph + openMeteoWindMph) / 2;
    }

    return { windMph, airTempF, sourcesUsed: sources, verified: sources >= 2 && agree };
  } catch {
    return fallback;
  }
}
