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


const US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

async function geocodeQuery(name: string, count: number): Promise<any[]> {
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=${count}&language=en&format=json`);
    const d = await res.json();
    return d.results ?? [];
  } catch {}
  return [];
}

// The geocoder only understands bare place names — "Margate City, NJ" returns
// nothing. So: try the full string, then fall back to the part before the
// comma and use the state/region part to pick the right match.
async function geocodeSmart(query: string, count: number): Promise<any[]> {
  const parts = query.split(',').map(p => p.trim()).filter(Boolean);
  let results = await geocodeQuery(query, count);
  if (!results.length && parts.length > 1) {
    results = await geocodeQuery(parts[0], Math.max(count, 5));
    if (results.length && parts[1]) {
      const hint = parts[1].toUpperCase();
      const fullState = (US_STATES[hint] || parts[1]).toLowerCase();
      const matched = results.filter((r: any) => {
        const admin = (r.admin1 || '').toLowerCase();
        const country = (r.country_code || '').toLowerCase();
        return admin === fullState || admin.startsWith(parts[1].toLowerCase()) || country === parts[1].toLowerCase();
      });
      if (matched.length) results = matched;
    }
  }
  return results;
}

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

  // 3. City name (handles "City", "City, NJ", and "City, NJ, US" formats)
  const results = await geocodeSmart(trimmed, 1);
  if (results.length) {
    const r = results[0];
    return {
      lat: r.latitude,
      lon: r.longitude,
      label: [r.name, r.admin1, r.country_code].filter(Boolean).join(', '),
    };
  }
  return null;
}

// Reverse-geocode coordinates to a friendly place label
export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
    const d = await res.json();
    if (d.city || d.locality) return `${d.city || d.locality}${d.principalSubdivisionCode ? ', ' + d.principalSubdivisionCode.replace('US-', '') : ''}`;
  } catch {}
  return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}

// Autocomplete suggestions for the search box
export async function suggestLocations(query: string): Promise<GeoResult[]> {
  if (query.trim().length < 2 || COORD_REGEX.test(query) || ZIP_REGEX.test(query)) return [];
  const results = await geocodeSmart(query.trim(), 5);
  return results.map((r: any) => ({
    lat: r.latitude,
    lon: r.longitude,
    label: [r.name, r.admin1, r.country_code].filter(Boolean).join(', '),
  }));
}
