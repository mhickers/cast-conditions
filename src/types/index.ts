export interface Conditions {
  windMph: number;
  windDir: string;
  windDeg: number;
  airTempF: number;
  pressureMb: number;
  waterTempF: number | null;
  waveFt: number;
  wavePeriod: number;
  tideNow: number | null;
  tideDirection: 'rising' | 'falling' | null;
  conditionLabel: string;
  conditionIcon: string;
  precipChance: number | null;
  sunrise: string | null;
  sunset: string | null;
  sourcesUsed: number;
  verified: boolean;
  pressureTrend: number | null;
}

export interface TidePrediction {
  t: string;
  v: string;
  type: 'H' | 'L';
}

export interface MoonInfo {
  phase: number;
  illum: number;
  name: string;
  desc: string;
}

export interface FishingScore {
  score: number;
  tips: string[];
  label: string;
  factors: Array<{ label: string; delta: number }>;
}

export interface Species {
  name: string;
  icon: string;
  biteScore: number;
  biteLabel: 'Hot bite' | 'Active' | 'Slow';
  tip: string;
}

export interface SavedSpot {
  id: string;
  label: string;
  lat: number;
  lon: number;
}

export interface HourlyForecast {
  time: string[];
  wind_speed_10m: number[];
  wind_direction_10m: number[];
  temperature_2m: number[] | null;
  surface_pressure: number[] | null;
  wave_height: number[] | null;
  weather_code: number[] | null;
  precipitation_probability: number[] | null;
}

export interface TideCurvePoint {
  t: string;
  v: string;
}

export interface TideData {
  events: TidePrediction[];
  curve: TideCurvePoint[];
}
