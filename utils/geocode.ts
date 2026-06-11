// Flexible location resolution: city name, US zip code, or GPS coordinates

export interface GeoResult {
  lat: number;
  lon: number;
  label: string;
}

// "39.33, -74.50" or "39.33 -74.50" or "39.3298,-74.5021"
const COORD_REGEX = /^\s*(-?\d{1,3}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;
// 5-digit US zip, optionally ZIP+4
const ZIP_REGEX = /^\s*(\d{5})(?:-\d{4})?\s*$/;

export async function resolveLocation(query: string): Promise<GeoResult | null> {
  const trimmed = query.trim();

  // 1. GPS coordinates
  const coordMatch = trimmed.match(COORD_REGEX);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lon = parseFloat(coordMatch[2]);
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      // Reverse-geocode for a friendly label (best effort)
      let label = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
      try {
        const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
        const d = await res.json();
        if (d.city || d.locality) label = `${d.city || d.locality}${d.principalSubdivisionCode ? ', ' + d.principalSubdivisionCode.replace('US-','') : ''}`;
      } catch {}
      return { lat, lon, label };
    }
  }

  // 2. US zip code
  const zipMatch = trimmed.match(ZIP_REGEX);
  if (zipMatch) {
    try {
      const res = await fetch(`https://api.zippopotam.us/us/${zipMatch[1]}`);
      if (res.ok) {
        const d = await res.json();
        const place = d.places?.[0];
        if (place) {
          return {
            lat: parseFloat(place.latitude),
            lon: parseFloat(place.longitude),
            label: `${place['place name']}, ${place['state abbreviation']}`,
          };
        }
      }
    } catch {}
  }

  // 3. City name (Open-Meteo geocoding)
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=1&language=en&format=json`);
    const d = await res.json();
    if (d.results?.length) {
      const r = d.results[0];
      return {
        lat: r.latitude,
        lon: r.longitude,
        label: [r.name, r.admin1, r.country_code].filter(Boolean).join(', '),
      };
    }
  } catch {}

  return null;
}
