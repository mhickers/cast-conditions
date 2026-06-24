// Imperial <-> metric unit handling. The app stores and SCORES everything in
// imperial canonical units (windMph, airTempF, pressureMb, waveFt, etc.). These
// helpers convert ONLY at display time so the fishing score never changes.
export type UnitSystem = 'imperial' | 'metric';

const fToC = (f: number) => (f - 32) * 5 / 9;
const mphToKmh = (m: number) => m * 1.609344;
const ftToM = (ft: number) => ft * 0.3048;
const miToKm = (mi: number) => mi * 1.609344;

// numeric converters (call site decides rounding)
export const convTemp = (f: number, s: UnitSystem) => (s === 'metric' ? fToC(f) : f);
export const convWind = (m: number, s: UnitSystem) => (s === 'metric' ? mphToKmh(m) : m);
export const convWave = (ft: number, s: UnitSystem) => (s === 'metric' ? ftToM(ft) : ft);
export const convDist = (mi: number, s: UnitSystem) => (s === 'metric' ? miToKm(mi) : mi);

// unit labels
export const tempLabel = (s: UnitSystem) => (s === 'metric' ? '°C' : '°F');
export const windLabel = (s: UnitSystem) => (s === 'metric' ? 'km/h' : 'mph');
export const waveLabel = (s: UnitSystem) => (s === 'metric' ? 'm' : 'ft');
export const distLabel = (s: UnitSystem) => (s === 'metric' ? 'km' : 'miles');

// combined "value + unit" strings for inline text (forecast cards, AI prose, logs)
export const fmtTemp = (f: number, s: UnitSystem) => `${Math.round(convTemp(f, s))}${tempLabel(s)}`;
export const fmtWind = (m: number, s: UnitSystem) => `${Math.round(convWind(m, s))} ${windLabel(s)}`;
export const fmtWave = (ft: number, s: UnitSystem) => `${convWave(ft, s).toFixed(1)} ${waveLabel(s)}`;

// Best-effort default from a resolved location label. Labels are built as
// "[name, admin1, country_code]" (e.g. "Toronto, Ontario, CA") or end in a US
// state for domestic GPS ("Margate, NJ"). Bias to imperial unless clearly non-US.
const US_STATES = new Set(['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC','PR']);
export function defaultUnitsFromLabel(label: string): UnitSystem {
  const last = (label.split(',').pop() || '').trim().toUpperCase().split('-')[0];
  if (last === 'US' || last === 'USA') return 'imperial';
  if (US_STATES.has(last)) return 'imperial';
  if (/^[A-Z]{2}$/.test(last)) return 'metric';   // a non-US 2-letter country code
  return 'imperial';
}
