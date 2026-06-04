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
  wave_height: number[] | null;
}
