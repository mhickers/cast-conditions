// Find the nearest NOAA station to any lat/lon.
// Station directory is fetched once per session and cached.

export interface NearestStation {
  id: string;
  name: string;
  distanceMi: number;
  lat: number;
  lon: number;
}

const cache: Record<string, Array<{ id: string; name: string; lat: number; lng: number }>> = {};

function haversineMi(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function loadDirectory(type: 'tidepredictions' | 'watertemp') {
  if (!cache[type]) {
    // Try localStorage first (cached up to 7 days) so repeat visits skip the big download
    const lsKey = `noaa-stations-${type}`;
    try {
      const stored = JSON.parse(localStorage.getItem(lsKey) || 'null');
      if (stored && Date.now() - stored.ts < 7 * 86400000) cache[type] = stored.stations;
    } catch {}
    if (!cache[type]) {
      const res = await fetch(`https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=${type}`);
      const d = await res.json();
      cache[type] = (d.stations ?? []).map((s: any) => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng }));
      try { localStorage.setItem(lsKey, JSON.stringify({ ts: Date.now(), stations: cache[type] })); } catch {}
    }
  }
  return cache[type];
}

// type: 'tidepredictions' for tide stations, 'watertemp' for water temperature sensors
export async function findNearestStation(
  lat: number,
  lon: number,
  type: 'tidepredictions' | 'watertemp',
  maxMiles = 100
): Promise<NearestStation | null> {
  const list = await findNearbyStations(lat, lon, type, 1, maxMiles);
  return list[0] ?? null;
}

// All stations near a point, closest first — powers the station picker
export async function findNearbyStations(
  lat: number,
  lon: number,
  type: 'tidepredictions' | 'watertemp',
  count = 8,
  maxMiles = 60
): Promise<NearestStation[]> {
  try {
    const dir = await loadDirectory(type);
    return dir
      .filter(s => s.lat != null && s.lng != null)
      .map(s => ({ id: s.id, name: s.name, lat: s.lat, lon: s.lng, distanceMi: Math.round(haversineMi(lat, lon, s.lat, s.lng) * 10) / 10 }))
      .filter(s => s.distanceMi <= maxMiles)
      .sort((a, b) => a.distanceMi - b.distanceMi)
      .slice(0, count);
  } catch {
    return [];
  }
}
