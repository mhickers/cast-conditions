// Find the nearest NOAA station to any lat/lon.
// Station directory is fetched once per session and cached.

export interface NearestStation {
  id: string;
  name: string;
  distanceMi: number;
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

// type: 'tidepredictions' for tide stations, 'watertemp' for water temperature sensors
export async function findNearestStation(
  lat: number,
  lon: number,
  type: 'tidepredictions' | 'watertemp',
  maxMiles = 100
): Promise<NearestStation | null> {
  try {
    if (!cache[type]) {
      const res = await fetch(`https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=${type}`);
      const d = await res.json();
      cache[type] = (d.stations ?? []).map((s: any) => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng }));
    }
    let best: NearestStation | null = null;
    let bestD = Infinity;
    for (const s of cache[type]) {
      if (s.lat == null || s.lng == null) continue;
      const d = haversineMi(lat, lon, s.lat, s.lng);
      if (d < bestD) { bestD = d; best = { id: s.id, name: s.name, distanceMi: Math.round(d) }; }
    }
    return best && bestD <= maxMiles ? best : null;
  } catch {
    return null;
  }
}
