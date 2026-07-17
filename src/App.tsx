import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import About from './About';
import Admin from './Admin';
import Feedback from './Feedback';
import AlertSignup from './AlertSignup';
import BaitAdvisor from './BaitAdvisor';
import { getSpeciesForLocation, buildScoreNarrative } from './species';
import { tackleSearchUrl, AFFILIATE_ACTIVE } from './utils/affiliate';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Tooltip, Filler,
} from 'chart.js';
import type { Conditions, TideData, HourlyForecast, SavedSpot, RiverData, RiverDetail } from './types';
import { getMoonPhase, calcFishingScore, scoreColor, getSolunarPeriods, degToCompass, calcWaterClarity } from './utils/fishing';
import { fetchWeather, fetchWaterTemp, fetchTides, fetchAISummary, fetchWeekOutlook, fetchRiverData, fetchRiverDetail, fetchWindModels, weatherCodeToCondition, localToday } from './utils/api';
import { UnitSystem, convTemp, convWind, convWave, tempLabel, windLabel, waveLabel, fmtTemp, fmtWind, fmtWave, defaultUnitsFromLabel } from './utils/units';
import type { WindModelSeries } from './utils/api';
import {
  Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, Snowflake, Zap,
  Wind, Thermometer, Gauge, Droplets, Droplet, Waves, Timer, ArrowUpDown, Navigation,
  Sunrise, Sunset, MapPin, Heart, Share2, RefreshCw, Trash2, Moon as MoonIcon, Bell, Eye, ChevronDown, ChevronLeft, ChevronRight, Menu, ShoppingBag,
} from 'lucide-react';
import CatchLog from './CatchLog';
import StationMap from './StationMap';
import WeightEstimator from './WeightEstimator';
import SpeciesIcon from './SpeciesIcon';
import { resolveLocation, suggestLocations, reverseGeocode, GeoResult } from './utils/geocode';
import { isNative, getCurrentPositionNative, remindAtDawn, noteGoodMoment, openExternal, shareLink } from './native';
import { QRCodeSVG } from 'qrcode.react';
import { READING_CONDITIONS, FRESHWATER_SPECIES, SALTWATER_SPECIES } from './data/tipsMenu';
import { crossCheckWeather } from './utils/crosscheck';
import { findNearestStation, findNearbyStations, NearestStation } from './utils/stations';
import './App.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

function MoonSVG({ phase }: { phase: number }) {
  const cycle = 29.53058867;
  const a = (((phase % cycle) + cycle) % cycle) / cycle; // 0 = new, 0.5 = full
  const cx = 24, cy = 24, r = 20;
  const cosA = Math.cos(2 * Math.PI * a);
  const k = (1 - cosA) / 2;          // illuminated fraction (0 new → 1 full)
  const tx = r * Math.abs(cosA);     // terminator ellipse x-radius (0 at quarters)
  const waxing = a < 0.5;            // N. hemisphere: lit limb on the right when waxing
  const DARK = '#444441', LIGHT = '#D3D1C7';
  const litX = waxing ? cx : cx - r; // lit semicircle covers the right (or left) half
  const ellipseFill = k > 0.5 ? LIGHT : DARK; // gibbous adds light; crescent eats it
  return (
    <svg width="52" height="52" viewBox="0 0 48 48" aria-hidden="true">
      <defs><clipPath id="mc"><circle cx={cx} cy={cy} r={r} /></clipPath></defs>
      <g clipPath="url(#mc)">
        <circle cx={cx} cy={cy} r={r} fill={DARK} />
        <rect x={litX} y={cy - r} width={r} height={2 * r} fill={LIGHT} />
        <ellipse cx={cx} cy={cy} rx={tx} ry={r} fill={ellipseFill} />
      </g>
    </svg>
  );
}

const condIcon = (label?: string | null) => {
  const map: Record<string, React.ReactNode> = {
    'Sunny': <Sun size={18} />, 'Mostly sunny': <CloudSun size={18} />, 'Partly cloudy': <CloudSun size={18} />,
    'Cloudy': <Cloud size={18} />, 'Foggy': <CloudFog size={18} />, 'Drizzle': <CloudDrizzle size={18} />,
    'Rain': <CloudRain size={18} />, 'Showers': <CloudRain size={18} />, 'Snow': <Snowflake size={18} />,
    'Thunderstorms': <Zap size={18} />,
  };
  return (label && map[label]) || <CloudSun size={18} />;
};

function StatCard({ icon, value, unit, label, sub }: { icon: React.ReactNode; value: string; unit: string; label: string; sub?: string }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-val">{value}</div>
      <div className="stat-unit">{unit}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

// Interpolate tide level at a moment from the smooth curve
function tideAt(curve: TideData['curve'], timeMs: number): { v: number; dir: 'rising' | 'falling' } | null {
  for (let i = 0; i < curve.length - 1; i++) {
    const t1 = new Date(curve[i].t).getTime();
    const t2 = new Date(curve[i + 1].t).getTime();
    if (timeMs >= t1 && timeMs <= t2) {
      const frac = (timeMs - t1) / (t2 - t1);
      const v1 = parseFloat(curve[i].v), v2 = parseFloat(curve[i + 1].v);
      return { v: v1 + frac * (v2 - v1), dir: v2 > v1 ? 'rising' : 'falling' };
    }
  }
  return null;
}

const LAST_LOC_KEY = 'lastLocation';

// App Store link for the desktop download badge. Set REACT_APP_APP_STORE_URL in
// Vercel (and locally) to your listing URL, e.g.
// https://apps.apple.com/us/app/fishcondish-fishing-report/id0000000000
// The badge only renders once this is set, so no broken link ever ships.
const APP_STORE_URL = (process.env.REACT_APP_APP_STORE_URL || '').trim();
// Numeric App Store id (e.g. from .../id0000000000) drives Safari's Smart App
// Banner, which funnels mobile web visitors to the App Store / opens the app.
const APP_STORE_ID = (APP_STORE_URL.match(/id(\d+)/) || [])[1] || '';

// Shared links must point at the public site. In the native app,
// window.location.origin is capacitor://localhost, which is useless to a
// recipient, so we always build share links against the canonical domain.
const SITE_ORIGIN = 'https://fishcondish.com';

// How close a NOAA tide station must be for its tides to describe the water the
// user is actually fishing. Stations are searched out to 60 mi so tidal rivers
// find one; this is the gate on treating those tides as real for this spot.
const TIDE_NEAR_MI = 12;

export default function App() {
  const saved = (() => { try { return JSON.parse(localStorage.getItem(LAST_LOC_KEY) || 'null'); } catch { return null; } })();
  // Shared links: ?lat=..&lon=..&label=..&date=.. override the remembered location
  const urlP = new URLSearchParams(window.location.search);
  const pLat = parseFloat(urlP.get('lat') || '');
  const pLon = parseFloat(urlP.get('lon') || '');
  const hasShared = !isNaN(pLat) && !isNaN(pLon) && Math.abs(pLat) <= 90 && Math.abs(pLon) <= 180;
  const pLabel = hasShared ? (urlP.get('label') || `${pLat.toFixed(3)}, ${pLon.toFixed(3)}`) : null;
  const pDate = urlP.get('date') || '';

  const [lat, setLat] = useState(hasShared ? pLat : (saved?.lat ?? 39.3298));
  const [lon, setLon] = useState(hasShared ? pLon : (saved?.lon ?? -74.5021));
  const [locationLabel, setLocationLabel] = useState(pLabel ?? saved?.label ?? 'Margate City, NJ');
  const [searchInput, setSearchInput] = useState(pLabel ?? saved?.label ?? 'Margate City, NJ');
  const [shareMsg, setShareMsg] = useState('');
  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const [searchError, setSearchError] = useState('');
  const [conditions, setConditions] = useState<Partial<Conditions>>({});
  const [tides, setTides] = useState<TideData>({ events: [], curve: [] });
  const [hourly, setHourly] = useState<HourlyForecast | null>(null);
  const [targetSpecies, setTargetSpecies] = useState<string | null>(null);
  const [targetNonce, setTargetNonce] = useState(0);
  const [mapOpen, setMapOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState('Analyzing conditions...');
  const [loading, setLoading] = useState(true);
  const [tideLoading, setTideLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [spots, setSpots] = useState<SavedSpot[]>(() => {
    try { return JSON.parse(localStorage.getItem('castSpots') || '[]'); } catch { return []; }
  });
  const [spotName, setSpotName] = useState('');
  const [showAbout, setShowAbout] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    const t = localToday();
    const max = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return localToday(d); })();
    return /^\d{4}-\d{2}-\d{2}$/.test(pDate) && pDate >= t && pDate <= max ? pDate : t;
  });
  const [selectedTime, setSelectedTime] = useState<'now' | number>(() =>
    /^\d{4}-\d{2}-\d{2}$/.test(pDate) && pDate !== localToday() ? 12 : 'now'
  );
  const [tideStation, setTideStation] = useState<NearestStation | null>(null);
  const [nearbyStations, setNearbyStations] = useState<NearestStation[]>([]);
  const [rivers, setRivers] = useState<RiverData[]>([]);
  const [riverStation, setRiverStation] = useState<RiverData | null>(null);
  // Tidal-inland spots (e.g. Philadelphia) have both NOAA tide stations and USGS
  // gauges. 'auto' follows the inland/coastal classification; the user can pin
  // 'tide' or 'river' to switch which dataset the page shows.
  const [waterView, setWaterView] = useState<'auto' | 'tide' | 'river'>('auto');
  const [riverDetail, setRiverDetail] = useState<RiverDetail | null>(null);
  const [riverLoading, setRiverLoading] = useState(false);
  const [weekScores, setWeekScores] = useState<Array<{ date: string; score: number }>>([]);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [windOpen, setWindOpen] = useState(false);
  const [precipOpen, setPrecipOpen] = useState(false);
  const [precipSel, setPrecipSel] = useState<number | null>(null);
  const [showWindModels, setShowWindModels] = useState(false);
  const [windCursor, setWindCursor] = useState<number | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [navSection, setNavSection] = useState<string | null>(null);
  const [windModels, setWindModels] = useState<WindModelSeries | null>(null);
  const [windLoading, setWindLoading] = useState(false);
  const [theme, setTheme] = useState<string>(() => {
    try {
      return localStorage.getItem('theme') || 'light';
    } catch { return 'light'; }
  });
  const [units, setUnits] = useState<UnitSystem>(() => {
    try { const s = localStorage.getItem('castUnits'); if (s === 'imperial' || s === 'metric') return s; } catch {}
    return 'imperial';
  });
  useEffect(() => { try { localStorage.setItem('castUnits', units); } catch {} }, [units]);
  const unitsManual = useRef<boolean>((() => { try { return localStorage.getItem('castUnitsManual') === '1'; } catch { return false; } })());
  const toggleUnits = () => {
    unitsManual.current = true;
    try { localStorage.setItem('castUnitsManual', '1'); } catch {}
    setUnits(u => (u === 'imperial' ? 'metric' : 'imperial'));
  };
  const [spotMsg, setSpotMsg] = useState('');
  // Default units from detected country on location change, unless the user chose manually.
  useEffect(() => {
    if (unitsManual.current || !locationLabel) return;
    setUnits(defaultUnitsFromLabel(locationLabel));
  }, [locationLabel]);
  const [stationChecked, setStationChecked] = useState(false);
  const [openSpecies, setOpenSpecies] = useState<Set<number>>(() => new Set());
  // Species grid is 3 columns on desktop, 2 on phones — track it so expanding
  // one card can expand its whole visual row (no blank stretched neighbor).
  const speciesColsRef = useRef(3);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const apply = () => { speciesColsRef.current = mq.matches ? 2 : 3; };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  // Mobile "get the app" banner. iOS web only (the app is iOS-only), and only in
  // non-Safari iOS browsers — Safari already shows Apple's Smart App Banner, so
  // this fills the gap without doubling up. Dismissal is remembered.
  const [showAppBanner, setShowAppBanner] = useState(() => {
    try {
      if (isNative() || !APP_STORE_URL) return false;
      if (localStorage.getItem('appBannerDismissed') === '1') return false;
      const ua = navigator.userAgent || '';
      return /iPad|iPhone|iPod/.test(ua) && /(CriOS|FxiOS|EdgiOS)/.test(ua);
    } catch { return false; }
  });
  const dismissAppBanner = () => {
    setShowAppBanner(false);
    try { localStorage.setItem('appBannerDismissed', '1'); } catch {}
  };
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewIsNow = useRef(true);
  const loadSeq = useRef(0);
  const isAdmin = window.location.pathname === '/admin';

  const todayStr = localToday();
  const maxDateStr = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return localToday(d); })();
  const isToday = selectedDate === todayStr;
  const isNow = isToday && selectedTime === 'now';
  const fmtHour = (hh: number) => new Date(2000, 0, 1, hh).toLocaleTimeString([], { hour: 'numeric' });
  const dateShort = new Date(selectedDate + 'T12:00:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const timeContext = isNow ? '' : ` — ${isToday ? 'today' : dateShort}, ${fmtHour(selectedTime === 'now' ? 12 : selectedTime)}`;
  // Copy that names the day: "today" only when the selected date really is today.
  const dayWord = isToday ? 'today' : `on ${dateShort}`;

  // Coastal/saltwater now REQUIRES real marine data (Open-Meteo wave or SST),
  // not just a nearby NOAA tide station. Tidal rivers (e.g. the Delaware at
  // Philadelphia) have a station right in town but no ocean marine grid, so they
  // correctly resolve to freshwater. During load we stay optimistic about a near
  // station to avoid a species flicker, then require marine once loaded.
  const hasMarine = conditions.waveFt != null || conditions.sstF != null;
  const stationNear = !!tideStation && tideStation.distanceMi <= TIDE_NEAR_MI;
  const isInland = stationChecked && !(stationNear && (hasMarine || loading));
  // Tide only belongs in the score when the station is actually on this water.
  // Stations are searched out to 60 mi so tidal rivers (Philadelphia) resolve,
  // but a lake 30 mi inland must never inherit ocean tides. stationNear is the
  // right discriminator: true for the ocean AND for a tidal river in town,
  // false for a lake with the nearest station half a county away.
  const tideAffectsScore = stationNear;
  // A tidal-inland spot has both nearby tide stations and USGS gauges, so we
  // offer a toggle between the two. The default view stays inland (rivers/lakes);
  // effectiveInland only diverges from isInland when the user picks a view.
  // The toggle is for genuinely tidal inland water (Philadelphia on the tidal
  // Delaware), so it keys off stationNear — not merely "a station exists within
  // the 60-mile search radius", which would offer ocean tides on a lake.
  const hasRiverOption = rivers.length > 0;
  const showWaterToggle = isInland && stationNear && hasRiverOption;
  const effectiveInland = showWaterToggle
    ? waterView !== 'tide'
    : isInland;
  const isSaved = spots.some(s => s.label === locationLabel);

  const getStationOverride = (lbl: string): NearestStation | null => {
    try {
      const map = JSON.parse(localStorage.getItem('tideStationOverrides') || '{}');
      return map[lbl] ?? null;
    } catch { return null; }
  };
  const saveStationOverride = (lbl: string, st: NearestStation) => {
    try {
      const map = JSON.parse(localStorage.getItem('tideStationOverrides') || '{}');
      map[lbl] = st;
      localStorage.setItem('tideStationOverrides', JSON.stringify(map));
    } catch {}
  };
  const getRiverOverride = (lbl: string): RiverData | null => {
    try { return (JSON.parse(localStorage.getItem('riverGaugeOverrides') || '{}'))[lbl] ?? null; } catch { return null; }
  };
  const saveRiverOverride = (lbl: string, r: RiverData) => {
    try {
      const map = JSON.parse(localStorage.getItem('riverGaugeOverrides') || '{}');
      map[lbl] = r;
      localStorage.setItem('riverGaugeOverrides', JSON.stringify(map));
    } catch {}
  };
  const moon = getMoonPhase(new Date(selectedDate + 'T12:00:00'));
  const solunar = getSolunarPeriods(new Date(selectedDate + 'T12:00:00'));
  // Everything downstream of the score reads tide through this, so an inland
  // lake near the coast can't pick up an ocean tide factor.
  const scoreConditions = tideAffectsScore ? conditions : { ...conditions, tideDirection: null };
  const { score, label: scoreLabel, factors: scoreFactors } = calcFishingScore(scoreConditions, new Date(selectedDate + 'T12:00:00'));
  const { bg: scoreBg, text: scoreText } = scoreColor(score);
  const waterClarity = calcWaterClarity(conditions, isInland);
  const species = getSpeciesForLocation(
    lat, lon, conditions.waterTempF ?? null, conditions.windMph ?? 10,
    conditions.waveFt ?? 2, conditions.pressureMb ?? 1013,
    scoreConditions.tideDirection ?? null, moon.phase, isInland
  );
  const speciesKey = species.map(sp => sp.name).join('|');
  useEffect(() => {
    let saved: string | null = null;
    try {
      const map = JSON.parse(localStorage.getItem('fc_target_species') || '{}');
      if (typeof map[locationLabel] === 'string') saved = map[locationLabel];
    } catch { saved = null; }
    setTargetSpecies(saved && speciesKey.split('|').includes(saved) ? saved : null);
  }, [locationLabel, speciesKey]);

  const chooseTargetSpecies = (name: string) => {
    const val = name === '' ? null : name;
    setTargetSpecies(val);
    if (val) setTargetNonce(n => n + 1);
    try {
      const map = JSON.parse(localStorage.getItem('fc_target_species') || '{}');
      if (val) map[locationLabel] = val; else delete map[locationLabel];
      localStorage.setItem('fc_target_species', JSON.stringify(map));
    } catch { /* localStorage unavailable */ }
  };

  const scoreNarrative = buildScoreNarrative(
    lat, lon, conditions.waterTempF ?? null, conditions.windMph ?? 10,
    conditions.waveFt ?? 2, conditions.pressureMb ?? 1013, moon.phase, isInland, score
  );

  // 6-hour pressure delta from the hourly series (the angler's "trend")
  const pressureTrendAt = (h: HourlyForecast | null, idx: number): number | null => {
    if (!h?.surface_pressure || idx < 3) return null;
    const prev = h.surface_pressure[Math.max(0, idx - 6)];
    const now = h.surface_pressure[Math.min(idx, h.surface_pressure.length - 1)];
    if (prev == null || now == null) return null;
    return Math.round((now - prev) * 10) / 10;
  };

  // ---- Data loading: progressive (weather renders first, the rest streams in) ----
  const loadData = useCallback(async (lo: number, la: number, lbl: string, dateStr: string, time: 'now' | number) => {
    const seq = ++loadSeq.current;
    viewIsNow.current = time === 'now';
    setLoading(true);
    setTideLoading(true);
    setRivers([]);
    setRiverStation(null);
    setRiverLoading(true);
    setStationChecked(false);
    setTideStation(null);
    setNearbyStations([]);
    setSearchError('');
    setAiSummary('Analyzing conditions with AI...');
    const hour = time === 'now' ? null : time;
    const refTime = time === 'now' && dateStr === localToday()
      ? Date.now()
      : new Date(`${dateStr}T${String(time === 'now' ? 12 : time).padStart(2, '0')}:00:00`).getTime();

    // Stations -> tides -> water temp: runs independently of weather, so a
    // weather outage can't block the inland/coastal check or species list.
    const stationsChain = (async () => {
      try {
        const [nearby, tempSt] = await Promise.all([
          findNearbyStations(la, lo, 'tidepredictions', 8, 60),
          findNearestStation(la, lo, 'watertemp', 150),
        ]);
        if (seq !== loadSeq.current) return null;
        // Respect a station the user manually chose for this location
        const override = getStationOverride(lbl);
        const tideSt = (override && nearby.find(s => s.id === override.id)) || nearby[0] || null;
        setNearbyStations(nearby);
        setTideStation(tideSt);
        setStationChecked(true);
        const [waterTemp, tideData, riverList] = await Promise.all([
          tempSt ? fetchWaterTemp(tempSt.id) : Promise.resolve(null),
          tideSt ? fetchTides(dateStr, tideSt.id) : Promise.resolve({ events: [], curve: [] } as TideData),
          fetchRiverData(la, lo),
        ]);
        if (seq !== loadSeq.current) return null;
        setRivers(riverList);
        // Default to a remembered gauge, else the nearest one that reports
        // discharge (a real river), else simply the nearest.
        const rOverride = getRiverOverride(lbl);
        const selRiver =
          (rOverride && riverList.find(r => r.siteId === rOverride.siteId)) ||
          riverList.find(r => r.flowCfs != null) ||
          riverList[0] || null;
        setRiverStation(selRiver);
        setRiverLoading(false);
        setTides(tideData);
        setTideLoading(false);
        const tide = tideAt(tideData.curve, refTime);
        // Inland spots have no NOAA water-temp station, so fall back to the selected USGS gauge.
        const finalWaterTemp = waterTemp ?? selRiver?.waterTempF ?? null;
        setConditions(c => ({ ...c, waterTempF: finalWaterTemp, tideNow: tide?.v ?? null, tideDirection: tide?.dir ?? null }));
        return { waterTemp: finalWaterTemp, tideData, tideNear: !!tideSt && tideSt.distanceMi <= TIDE_NEAR_MI };
      } catch {
        if (seq === loadSeq.current) { setStationChecked(true); setTideLoading(false); setRiverLoading(false); }
        return null;
      }
    })();

    try {
      const weather = await fetchWeather(la, lo, dateStr, hour);
      if (seq !== loadSeq.current) return;
      const trendIdx = hour ?? (dateStr === localToday() ? new Date().getHours() : 12);
      const pTrend = pressureTrendAt(weather.hourly, trendIdx);
      setConditions(c => ({ ...c, ...weather.conditions, pressureTrend: pTrend, sourcesUsed: 1, verified: false }));
      setHourly(weather.hourly);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setLoading(false);

      const extra = await stationsChain;
      if (seq !== loadSeq.current) return;

      // Week outlook shares the current water temp so its daily scores line up
      // with the top-of-page score (which also factors water temp in).
      fetchWeekOutlook(la, lo, extra?.waterTemp ?? null).then(ws => { if (seq === loadSeq.current) setWeekScores(ws); }).catch(() => {});

      // AI summary in the background — never blocks the page
      const dayMoon = getMoonPhase(new Date(dateStr + 'T12:00:00'));
      const snapshot: Partial<Conditions> = {
        ...weather.conditions,
        waterTempF: extra?.waterTemp ?? null,
        tideDirection: extra && extra.tideNear ? (tideAt(extra.tideData.curve, refTime)?.dir ?? null) : null,
      };
      const { score: sc } = calcFishingScore(snapshot);
      fetchAISummary(snapshot, dayMoon.name, dayMoon.illum, sc, lbl, dateStr, units).then(s => {
        if (seq === loadSeq.current) setAiSummary(s);
      }).catch(() => {});

      // NWS cross-check in the background — updates the badge when done
      if (dateStr === localToday() && time === 'now') {
        crossCheckWeather(la, lo, weather.conditions.windMph ?? 0, weather.conditions.airTempF ?? 0).then(check => {
          if (seq === loadSeq.current && viewIsNow.current) {
            setConditions(c => ({ ...c, windMph: check.windMph, airTempF: check.airTempF, sourcesUsed: check.sourcesUsed, verified: check.verified }));
          }
        }).catch(() => {});
      }
    } catch (err: any) {
      if (seq === loadSeq.current) {
        setLoading(false);
        const reason = err?.message ? ` (${err.message})` : '';
        setSearchError(`Couldn\u2019t load weather data${reason} — try Refresh in a moment. If this keeps happening, an ad blocker or extension may be blocking api.open-meteo.com.`);
        setAiSummary('Unable to load conditions.');
        // Self-heal: an outdated offline worker can interfere with data
        // requests — unregister it so the next reload starts clean.
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations()
            .then(regs => regs.forEach(r => r.unregister()))
            .catch(() => {});
        }
      }
    }
  }, [units]);

  // Initial load. A deep link (?lat&lon&label — used by every SEO spot page and
  // every shared link) is also remembered here, so the next direct visit reopens
  // that spot instead of falling back to the Margate City default.
  useEffect(() => {
    if (hasShared) rememberLocation(lat, lon, locationLabel);
    loadData(lon, lat, locationLabel, selectedDate, selectedTime);
  }, []); // eslint-disable-line

  // Safari Smart App Banner: on iOS web (not the native app), advertise the app
  // at the top of the page so SEO/search visitors can install it in one tap.
  useEffect(() => {
    if (isNative() || !APP_STORE_ID) return;
    if (document.querySelector('meta[name="apple-itunes-app"]')) return;
    const m = document.createElement('meta');
    m.name = 'apple-itunes-app';
    m.content = `app-id=${APP_STORE_ID}`;
    document.head.appendChild(m);
  }, []);

  // Count a "great score" as a positive moment once per session (throttled inside).
  const highScoreNoted = useRef(false);
  useEffect(() => {
    if (!loading && score >= 8 && !highScoreNoted.current) {
      highScoreNoted.current = true;
      noteGoodMoment();
    }
  }, [loading, score]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('theme', theme); } catch {}
  }, [theme]);

  // Prefill the custom-spot input with wherever the user currently is, so
  // saving a spot is one tap — the field stays editable for a personal name
  // ("Dock behind Lucy the Elephant") and refreshes on each new location.
  useEffect(() => { setSpotName(locationLabel); }, [locationLabel]);

  // Whenever the selected gauge changes (default pick or manual), pull its
  // recent-flow series + historical-median read. Cancels if it changes again.
  useEffect(() => {
    if (!riverStation) { setRiverDetail(null); return; }
    let cancelled = false;
    setRiverDetail(null);
    fetchRiverDetail(riverStation.siteId)
      .then(d => { if (!cancelled) setRiverDetail(d); })
      .catch(() => { if (!cancelled) setRiverDetail(null); });
    return () => { cancelled = true; };
  }, [riverStation]);

  // Wind models are lazy-loaded: only fetched when the Wind detail dropdown is
  // opened, and cleared whenever the location or date changes so it refetches.
  useEffect(() => { setWindModels(null); }, [lat, lon, selectedDate]);
  useEffect(() => {
    if (windOpen && !windModels && !windLoading) {
      setWindLoading(true);
      fetchWindModels(lat, lon, selectedDate)
        .then(setWindModels)
        .catch(() => setWindModels(null))
        .finally(() => setWindLoading(false));
    }
  }, [windOpen, windModels, windLoading, lat, lon, selectedDate]);

  const rememberLocation = (la: number, lo: number, lbl: string) => {
    try { localStorage.setItem(LAST_LOC_KEY, JSON.stringify({ lat: la, lon: lo, label: lbl })); } catch {}
  };

  // ---- Instant time changes: derive from hourly data already in memory ----
  const applyHour = (hh: number) => {
    viewIsNow.current = false;
    if (!hourly || !hourly.time.length) return;
    const idx = Math.min(hh, hourly.time.length - 1);
    const wc = weatherCodeToCondition(hourly.weather_code?.[idx] ?? 0);
    const waveVal = hourly.wave_height?.[idx];
    const refTime = new Date(`${selectedDate}T${String(hh).padStart(2, '0')}:00:00`).getTime();
    const tide = tideAt(tides.curve, refTime);
    setConditions(c => ({
      ...c,
      windMph: hourly.wind_speed_10m[idx] ?? c.windMph,
      windDir: degToCompass(hourly.wind_direction_10m[idx] ?? 0),
      airTempF: hourly.temperature_2m ? Math.round(hourly.temperature_2m[idx]) : c.airTempF,
      pressureMb: hourly.surface_pressure ? Math.round(hourly.surface_pressure[idx]) : c.pressureMb,
      waveFt: waveVal != null ? parseFloat(waveVal.toFixed(1)) : undefined,
      conditionLabel: wc.label,
      conditionIcon: wc.icon,
      precipChance: hourly.precipitation_probability
        ? Math.max(...hourly.precipitation_probability.slice(Math.max(0, idx - 1), idx + 4)) : c.precipChance,
      tideNow: tide?.v ?? null,
      tideDirection: tide?.dir ?? null,
      pressureTrend: pressureTrendAt(hourly, idx),
      verified: false,
      sourcesUsed: 1,
    }));
  };

  const changeStation = async (id: string) => {
    const st = nearbyStations.find(s => s.id === id);
    if (!st) return;
    setTideStation(st);
    setWaterView('tide');
    saveStationOverride(locationLabel, st);
    setTideLoading(true);
    const seq = ++loadSeq.current;
    const hour = selectedTime === 'now' ? null : selectedTime;
    const refTime = isNow ? Date.now() : new Date(`${selectedDate}T${String(selectedTime === 'now' ? 12 : selectedTime).padStart(2, '0')}:00:00`).getTime();
    try {
      // Re-center weather, marine, and water temp on the chosen station's
      // location so every reading corresponds to that spot, not the search point.
      const [weather, tempSt] = await Promise.all([
        fetchWeather(st.lat, st.lon, selectedDate, hour),
        findNearestStation(st.lat, st.lon, 'watertemp', 150),
      ]);
      if (seq !== loadSeq.current) return;
      const [waterTemp, tideData] = await Promise.all([
        tempSt ? fetchWaterTemp(tempSt.id) : Promise.resolve(null),
        fetchTides(selectedDate, st.id),
      ]);
      if (seq !== loadSeq.current) return;
      const tide = tideAt(tideData.curve, refTime);
      const trendIdx = hour ?? (selectedDate === localToday() ? new Date().getHours() : 12);
      setConditions(c => ({
        ...c, ...weather.conditions,
        pressureTrend: pressureTrendAt(weather.hourly, trendIdx),
        waterTempF: waterTemp ?? c.waterTempF ?? null,
        tideNow: tide?.v ?? null, tideDirection: tide?.dir ?? null,
        sourcesUsed: 1, verified: false,
      }));
      setHourly(weather.hourly);
      setTides(tideData);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch {
      // keep the prior readings if the re-fetch fails
    } finally {
      if (seq === loadSeq.current) setTideLoading(false);
    }
  };

  const changeRiverGauge = async (siteId: string) => {
    const r = rivers.find(x => x.siteId === siteId);
    if (!r) return;
    setRiverStation(r);
    setWaterView('river');
    saveRiverOverride(locationLabel, r);
    const seq = ++loadSeq.current;
    const hour = selectedTime === 'now' ? null : selectedTime;
    // Reflect the gauge's own water temp immediately (drives card + score + species)
    setConditions(c => ({ ...c, waterTempF: r.waterTempF ?? null }));
    try {
      // Re-center weather on the chosen gauge's location, same as tide stations
      const weather = await fetchWeather(r.lat, r.lon, selectedDate, hour);
      if (seq !== loadSeq.current) return;
      const trendIdx = hour ?? (selectedDate === localToday() ? new Date().getHours() : 12);
      setConditions(c => ({
        ...c, ...weather.conditions,
        pressureTrend: pressureTrendAt(weather.hourly, trendIdx),
        waterTempF: r.waterTempF ?? c.waterTempF ?? null,
        sourcesUsed: 1, verified: false,
      }));
      setHourly(weather.hourly);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch {
      // keep prior readings if the re-fetch fails
    }
  };

  const handleTimeChange = (val: string) => {
    if (val === 'now') {
      setSelectedTime('now');
      loadData(lon, lat, locationLabel, selectedDate, 'now');
    } else {
      const hh = parseInt(val, 10);
      setSelectedTime(hh);
      applyHour(hh); // instant — no network calls
    }
  };

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    let time = selectedTime;
    if (newDate !== todayStr && selectedTime === 'now') { time = 12; setSelectedTime(12); }
    loadData(lon, lat, locationLabel, newDate, time);
  };

  // Step the forecast date one day at a time, clamped to the allowed range.
  const shiftDate = (delta: number) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    const ns = localToday(d);
    if (ns < todayStr || ns > maxDateStr) return;
    handleDateChange(ns);
  };

  // In the native app the Fishing Tips pages live on the website, so open any
  // tapped tip link in the in-app browser rather than navigating the app shell.
  const handleTipsNavClick = (e: React.MouseEvent) => {
    if (!isNative()) return;
    const a = (e.target as HTMLElement).closest('a[href^="/fishing-tips"]') as HTMLAnchorElement | null;
    if (!a) return;
    e.preventDefault();
    setNavOpen(false);
    setNavSection(null);
    openExternal(a.getAttribute('href') || '/fishing-tips/');
  };

  // ---- Search with suggestions, errors, and geolocation ----
  const handleSearchInput = (v: string) => {
    setSearchInput(v);
    setSearchError('');
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    suggestTimer.current = setTimeout(async () => {
      setSuggestions(await suggestLocations(v));
    }, 300);
  };

  const goToLocation = (la: number, lo: number, lbl: string) => {
    setLat(la); setLon(lo); setLocationLabel(lbl); setSearchInput(lbl);
    setSuggestions([]);
    setWaterView('auto');
    rememberLocation(la, lo, lbl);
    loadData(lo, la, lbl, selectedDate, selectedTime);
  };

  const handleSearch = async () => {
    const match = suggestions.find(s => s.label === searchInput);
    if (match) { goToLocation(match.lat, match.lon, match.label); return; }
    const geo = await resolveLocation(searchInput);
    if (geo) goToLocation(geo.lat, geo.lon, geo.label);
    else setSearchError(`Couldn't find "${searchInput}" — try a town, a lake/river/bay name, a zip code, or coordinates like 39.33, -74.50`);
  };

  const shareConditions = async () => {
    const params = new URLSearchParams({
      lat: lat.toFixed(4), lon: lon.toFixed(4), label: locationLabel, date: selectedDate,
    });
    const url = `${SITE_ORIGIN}/?${params.toString()}`;
    const text = `Fishing conditions for ${locationLabel}`;
    // Native app: use the OS share sheet (Messages, Mail, etc.).
    if (isNative()) {
      const ok = await shareLink('FishCondish', text, url);
      if (!ok) { setShareMsg(url); setTimeout(() => setShareMsg(''), 4000); }
      return;
    }
    // Web: native browser share sheet where available.
    if (navigator.share) {
      try { await navigator.share({ title: 'FishCondish', text, url }); return; } catch {}
    }
    // Web fallback: copy to clipboard.
    try {
      await navigator.clipboard.writeText(url);
      setShareMsg('Link copied!');
      setTimeout(() => setShareMsg(''), 2500);
    } catch { setShareMsg(url); }
  };

  const useMyLocation = async () => {
    setSearchError('');
    if (isNative()) {
      const p = await getCurrentPositionNative();
      if (p) {
        const lbl = await reverseGeocode(p.lat, p.lon);
        goToLocation(p.lat, p.lon, lbl);
        return;
      }
      // native GPS failed/denied — fall through to the browser API
    }
    if (!navigator.geolocation) { setSearchError('Location access is not supported by this browser.'); return; }
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const la = pos.coords.latitude, lo = pos.coords.longitude;
        const lbl = await reverseGeocode(la, lo);
        goToLocation(la, lo, lbl);
      },
      () => setSearchError('Location access was denied — you can still search by city or zip.')
    );
  };

  const remindMe = async () => {
    const ok = await remindAtDawn(locationLabel, conditions.sunrise);
    setSpotMsg(ok ? 'Dawn reminder set ✓' : 'Enable notifications in Settings to set a reminder');
    setTimeout(() => setSpotMsg(''), 2500);
  };

  // ---- Saved spots ----
  const saveSpot = () => {
    if (isSaved) { setSpotMsg('Already in your saved spots'); setTimeout(() => setSpotMsg(''), 2000); return; }
    const newSpots = [...spots, { id: Date.now().toString(), label: locationLabel, lat, lon }];
    setSpots(newSpots);
    localStorage.setItem('castSpots', JSON.stringify(newSpots));
    setSpotMsg('Spot saved ✓');
    setTimeout(() => setSpotMsg(''), 2000);
    noteGoodMoment();
  };
  const addNamedSpot = () => {
    if (!spotName.trim()) return;
    const newSpots = [...spots, { id: Date.now().toString(), label: spotName.trim(), lat, lon }];
    setSpots(newSpots); setSpotName('');
    localStorage.setItem('castSpots', JSON.stringify(newSpots));
  };
  const deleteSpot = (id: string) => {
    const newSpots = spots.filter(s => s.id !== id);
    setSpots(newSpots);
    localStorage.setItem('castSpots', JSON.stringify(newSpots));
  };
  const loadSpot = (s: SavedSpot) => goToLocation(s.lat, s.lon, s.label);

  // ---- Best time to fish: hourly score timeline ----
  const hourlyScores = useMemo(() => {
    if (!hourly || !hourly.time.length) return [];
    const sunriseH = conditions.sunrise ? new Date(conditions.sunrise).getHours() + new Date(conditions.sunrise).getMinutes() / 60 : null;
    const sunsetH = conditions.sunset ? new Date(conditions.sunset).getHours() + new Date(conditions.sunset).getMinutes() / 60 : null;
    const sol = getSolunarPeriods(new Date(selectedDate + 'T12:00:00'));
    return Array.from({ length: Math.min(24, hourly.time.length) }, (_, hh) => {
      const refTime = new Date(`${selectedDate}T${String(hh).padStart(2, '0')}:00:00`).getTime();
      const tide = tideAt(tides.curve, refTime);
      const trend = hourly.surface_pressure && hh >= 3
        ? hourly.surface_pressure[hh] - hourly.surface_pressure[Math.max(0, hh - 6)] : null;
      let s = calcFishingScore({
        windMph: hourly.wind_speed_10m[hh],
        waveFt: hourly.wave_height?.[hh] ?? undefined,
        pressureMb: hourly.surface_pressure?.[hh] ?? undefined,
        pressureTrend: trend,
        waterTempF: conditions.waterTempF ?? null,
        tideDirection: tideAffectsScore ? (tide?.dir ?? null) : null,
      } as Partial<Conditions>, new Date(selectedDate + 'T12:00:00')).score;
      // Prime-time bonuses: dawn/dusk and solunar majors — this is also what
      // keeps the timeline visually consistent with the solunar table below
      if (sunriseH != null && Math.abs(hh - sunriseH) <= 1.5) s += 0.8;
      if (sunsetH != null && Math.abs(hh - sunsetH) <= 1.5) s += 0.8;
      if (sol.majorHours.some(m => Math.abs(hh - m) <= 1 || Math.abs(hh - m) >= 23)) s += 0.5;
      return Math.min(10, Math.round(s * 10) / 10);
    });
  }, [hourly, tides, conditions.waterTempF, conditions.sunrise, conditions.sunset, selectedDate, tideAffectsScore]);

  const bestWindow = useMemo(() => {
    if (hourlyScores.length < 3) return null;
    let bestStart = 0, bestAvg = -1;
    for (let i = 0; i <= hourlyScores.length - 3; i++) {
      const avg = (hourlyScores[i] + hourlyScores[i + 1] + hourlyScores[i + 2]) / 3;
      if (avg > bestAvg) { bestAvg = avg; bestStart = i; }
    }
    return { start: bestStart, end: bestStart + 3, avg: bestAvg };
  }, [hourlyScores]);

  // Hourly rain-chance chart (Open-Meteo precipitation_probability, already fetched)
  const precipHours = useMemo(() =>
    hourly?.precipitation_probability
      ? hourly.precipitation_probability.slice(0, 24).map(v => v ?? 0)
      : [],
    [hourly]);
  const precipPeak = useMemo(() => {
    let max = 0, hour = 0;
    precipHours.forEach((p, h) => { if (p > max) { max = p; hour = h; } });
    return { max: Math.round(max), hour };
  }, [precipHours]);
  // Thunderstorm hours come from WMO weather codes 95/96/99, which the hourly
  // forecast already carries — no extra API call. Lightning matters more to an
  // angler than rain does (open water, graphite rods), so it leads the summary.
  const stormHours = useMemo(() => {
    const codes = hourly?.weather_code;
    if (!codes) return [] as number[];
    const out: number[] = [];
    codes.slice(0, 24).forEach((c, h) => { if (c != null && c >= 95) out.push(h); });
    return out;
  }, [hourly]);
  const stormSet = useMemo(() => new Set(stormHours), [stormHours]);
  // Group into contiguous runs so a 3 AM storm and a 3 PM storm never render as
  // "3 AM-3 PM". Lightning timing is a safety call — it has to be precise.
  const stormLabel = useMemo(() => {
    if (!stormHours.length) return null;
    const runs: number[][] = [];
    stormHours.forEach(h => {
      const last = runs[runs.length - 1];
      if (last && h === last[last.length - 1] + 1) last.push(h);
      else runs.push([h]);
    });
    const fmtRun = (r: number[]) => r.length === 1
      ? fmtHour(r[0])
      : `${fmtHour(r[0])}\u2013${fmtHour(r[r.length - 1])}`;
    if (runs.length === 1) return runs[0].length === 1 ? `around ${fmtRun(runs[0])}` : fmtRun(runs[0]);
    if (runs.length === 2) return `${fmtRun(runs[0])} and ${fmtRun(runs[1])}`;
    return 'on and off through the day';
  }, [stormHours]); // eslint-disable-line react-hooks/exhaustive-deps

  // Day's high/low from the hourly temps (indices 0-23 = the selected day).
  const dayTemps = useMemo(() => {
    const t = (hourly?.temperature_2m ?? []).slice(0, 24).filter((v): v is number => v != null);
    if (!t.length) return null;
    return { hi: Math.round(Math.max(...t)), lo: Math.round(Math.min(...t)) };
  }, [hourly]);

  // Wind model consensus: per-hour min/mean/max across models, plus an
  // agreement read (tight spread = models agree = higher confidence).
  const windChart = useMemo(() => {
    if (!windModels || !windModels.models.length) return null;
    const N = Math.min(24, ...windModels.models.map(m => m.speed.length));
    if (N < 6) return null;
    const hours: Array<{ h: number; min: number; max: number; mean: number; gust: number | null; dir: number | null } | null> = [];
    let spreadSum = 0, spreadCount = 0;
    for (let h = 0; h < N; h++) {
      const speeds = windModels.models.map(m => m.speed[h]).filter((v): v is number => v != null);
      if (!speeds.length) { hours.push(null); continue; }
      const gusts = windModels.models.map(m => m.gust[h]).filter((v): v is number => v != null);
      const dirs = windModels.models.map(m => m.dir[h]).filter((v): v is number => v != null);
      const min = Math.min(...speeds), max = Math.max(...speeds);
      const mean = speeds.reduce((a, b) => a + b, 0) / speeds.length;
      let dir: number | null = null;
      if (dirs.length) {
        const sx = dirs.reduce((a, d) => a + Math.sin(d * Math.PI / 180), 0);
        const cy = dirs.reduce((a, d) => a + Math.cos(d * Math.PI / 180), 0);
        dir = (Math.atan2(sx, cy) * 180 / Math.PI + 360) % 360;
      }
      hours.push({ h, min, max, mean, gust: gusts.length ? Math.max(...gusts) : null, dir });
      spreadSum += (max - min); spreadCount++;
    }
    const valid = hours.filter((x): x is NonNullable<typeof x> => x != null);
    if (!valid.length) return null;
    const avgSpread = spreadCount ? spreadSum / spreadCount : 0;
    const conf: 'high' | 'medium' | 'low' = avgSpread <= 4 ? 'high' : avgSpread <= 8 ? 'medium' : 'low';
    const overallMin = Math.round(Math.min(...valid.map(v => v.min)));
    const overallMax = Math.round(Math.max(...valid.map(v => v.max)));
    const yMax = Math.max(10, Math.ceil(Math.max(...valid.map(v => v.gust ?? v.max)) / 5) * 5);
    return { hours, conf, overallMin, overallMax, yMax, modelCount: windModels.models.length, labels: windModels.models.map(m => m.label) };
  }, [windModels]);

  const timelineColor = (s: number) =>
    s >= 8 ? '#168A63' : s >= 7 ? '#1D9E75' : s >= 6 ? '#2C9ED4' : s >= 5 ? '#378ADD'
    : s >= 4 ? '#EF9F27' : s >= 3 ? '#E07B2E' : '#E24B4A';

  // ---- Tide chart data (smooth curve, selected day only) ----
  const dayCurve = tides.curve.filter(p => p.t.startsWith(selectedDate));
  const dayEvents = tides.events.filter(p => p.t.startsWith(selectedDate));
  const tideChartData = {
    labels: dayCurve.map(p => new Date(p.t).toLocaleTimeString([], { hour: 'numeric' })),
    datasets: [{
      label: 'Tide (ft)',
      data: dayCurve.map(p => parseFloat(p.v)),
      borderColor: '#185FA5',
      backgroundColor: 'rgba(55,138,221,0.15)',
      fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2,
    }],
  };
  const tideChartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: any) => `${ctx.parsed.y.toFixed(1)} ft` } } },
    scales: {
      x: { ticks: { font: { size: 11 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 }, grid: { display: false } },
      y: { ticks: { font: { size: 11 }, callback: (v: any) => v.toFixed(1) + ' ft' }, grid: { color: 'rgba(128,128,128,0.1)' } },
    },
  };

  // ---- Hourly forecast cards ----
  const forecastSlots = (() => {
    if (!hourly) return [];
    const slots: { time: Date; wind: number; dir: string; temp: number | null; wave: number | null; cond: string; emoji: string; precip: number | null }[] = [];
    const startIdx = isToday
      ? hourly.time.findIndex(t => new Date(t) >= new Date())
      : 5;
    const step = isToday ? 1 : 2;
    const maxSlots = isToday ? 24 : 12;
    for (let i = Math.max(0, startIdx); i < hourly.time.length && slots.length < maxSlots; i += step) {
      const wc = weatherCodeToCondition(hourly.weather_code?.[i] ?? 0);
      slots.push({
        time: new Date(hourly.time[i]),
        wind: Math.round(hourly.wind_speed_10m[i]),
        dir: degToCompass(hourly.wind_direction_10m[i] ?? 0),
        temp: hourly.temperature_2m ? Math.round(hourly.temperature_2m[i]) : null,
        wave: hourly.wave_height ? hourly.wave_height[i] : null,
        cond: wc.label,
        emoji: wc.icon,
        precip: hourly.precipitation_probability?.[i] ?? null,
      });
    }
    return slots;
  })();

  if (isAdmin) return <Admin />;

  return (
    <div className="app">
      {showAppBanner && (
        <div className="app-banner">
          <img src="/logo192.png" alt="" className="app-banner-icon" width="32" height="32" />
          <div className="app-banner-txt">
            <strong>FishCondish</strong>
            <span>Get the app for the best experience</span>
          </div>
          <a className="app-banner-cta" href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">Get</a>
          <button className="app-banner-x" onClick={dismissAppBanner} aria-label="Dismiss">✕</button>
        </div>
      )}
      {showAbout && <About onClose={() => setShowAbout(false)} />}
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <img src="/logo.svg" alt="" className="logo-img" />
            <span className="logo-text">FishCondish</span>
            <span className="logo-tagline">Know before you go</span>
          </div>
          <div className="header-right">
            {!isNative() && <a className="btn-icon nav-tips" href="/fishing-tips" title="Fishing Tips">Fishing Tips</a>}
            <div className="nav-menu">
              <button className="btn-icon nav-menu-btn" onClick={() => setNavOpen(o => !o)} aria-label="Menu" aria-expanded={navOpen} title="Menu"><Menu size={16} /></button>
              {navOpen && (
                <>
                  <div className="nav-menu-backdrop" onClick={() => { setNavOpen(false); setNavSection(null); }} />
                  <nav className="nav-menu-dropdown" role="menu" onClick={handleTipsNavClick}>
                    <a className="nav-menu-link" href="/fishing-tips/" role="menuitem" onClick={() => setNavOpen(false)}>Fishing Tips</a>

                    <button className="nav-menu-section" aria-expanded={navSection === 'reading'} onClick={() => setNavSection(s => s === 'reading' ? null : 'reading')}>
                      <span>Reading Fishing Conditions</span>
                      <ChevronDown size={15} className={`nav-chev${navSection === 'reading' ? ' open' : ''}`} />
                    </button>
                    {navSection === 'reading' && (
                      <div className="nav-submenu">
                        {READING_CONDITIONS.map(t => (
                          <a key={t.slug} href={`/fishing-tips/${t.slug}/`} onClick={() => setNavOpen(false)}>{t.title}</a>
                        ))}
                      </div>
                    )}

                    <button className="nav-menu-section" aria-expanded={navSection === 'fresh'} onClick={() => setNavSection(s => s === 'fresh' ? null : 'fresh')}>
                      <span>Freshwater Species Tips</span>
                      <ChevronDown size={15} className={`nav-chev${navSection === 'fresh' ? ' open' : ''}`} />
                    </button>
                    {navSection === 'fresh' && (
                      <div className="nav-submenu">
                        {FRESHWATER_SPECIES.map(t => (
                          <a key={t.slug} href={`/fishing-tips/${t.slug}/`} onClick={() => setNavOpen(false)}>{t.title}</a>
                        ))}
                      </div>
                    )}

                    <button className="nav-menu-section" aria-expanded={navSection === 'salt'} onClick={() => setNavSection(s => s === 'salt' ? null : 'salt')}>
                      <span>Saltwater Species Tips</span>
                      <ChevronDown size={15} className={`nav-chev${navSection === 'salt' ? ' open' : ''}`} />
                    </button>
                    {navSection === 'salt' && (
                      <div className="nav-submenu">
                        {SALTWATER_SPECIES.map(t => (
                          <a key={t.slug} href={`/fishing-tips/${t.slug}/`} onClick={() => setNavOpen(false)}>{t.title}</a>
                        ))}
                      </div>
                    )}

                    <div className="nav-menu-divider" />
                    <button className="nav-menu-toggle" role="menuitem" onClick={toggleUnits} aria-label="Toggle units (imperial / metric)">
                      <span>Units</span>
                      <span className="nav-menu-value">{units === 'metric' ? '°C' : '°F'}</span>
                    </button>
                    <button className="nav-menu-plain" role="menuitem" onClick={() => { setNavOpen(false); setNavSection(null); setShowAbout(true); }}>About &amp; how it works</button>
                  </nav>
                </>
              )}
            </div>
            {lastUpdated && <span className="updated-txt">Updated {lastUpdated} · {locationLabel}</span>}
            <button className="btn-icon" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} title="Toggle dark mode">{theme === 'dark' ? <Sun size={15} /> : <MoonIcon size={15} />}</button>
            <button className="btn-icon btn-units" onClick={toggleUnits} title="Toggle units (imperial / metric)" aria-label="Toggle units">{units === 'metric' ? '°C' : '°F'}</button>
            <button className="btn-icon btn-about" onClick={() => setShowAbout(true)} title="About">?</button>
            <button className="btn-icon" onClick={() => loadData(lon, lat, locationLabel, selectedDate, selectedTime)} title="Refresh"><RefreshCw size={15} /></button>
          </div>
        </div>
      </header>

      <main className="main">
        <section className="section">
          <div className="search-primary">
            <input
              className="search-input search-input-lg"
              list="loc-suggestions"
              value={searchInput}
              onChange={e => handleSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search any city, zip, lake, or GPS coordinates"
              aria-label="Location search"
            />
            <datalist id="loc-suggestions">
              {suggestions.map(s => <option key={s.label} value={s.label} />)}
            </datalist>
            <button className="btn" onClick={handleSearch}>Search</button>
            <button className="btn btn-secondary" onClick={useMyLocation} title="Use my location"><MapPin size={15} /></button>
          </div>
          {shareMsg && <div className="share-msg">{shareMsg}</div>}
          {spotMsg && <div className="share-msg">{spotMsg}</div>}
          {searchError && <div className="search-error">{searchError}</div>}
          <div className="date-row">
            <label className="date-label">Date:</label>
            <div className="date-stepper">
              <button
                type="button"
                className="date-arrow"
                onClick={() => shiftDate(-1)}
                disabled={selectedDate <= todayStr}
                aria-label="Previous day"
              >
                <ChevronLeft size={16} />
              </button>
              <input
                className="search-input date-input"
                type="date"
                value={selectedDate}
                min={todayStr}
                max={maxDateStr}
                onChange={e => handleDateChange(e.target.value)}
                aria-label="Forecast date"
              />
              <button
                type="button"
                className="date-arrow"
                onClick={() => shiftDate(1)}
                disabled={selectedDate >= maxDateStr}
                aria-label="Next day"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <label className="date-label">Time:</label>
            <select
              className="search-input time-input"
              value={String(selectedTime)}
              onChange={e => handleTimeChange(e.target.value)}
              aria-label="Forecast time"
            >
              {isToday && <option value="now">Now</option>}
              {Array.from({ length: 24 }, (_, i) => i).map(hh => (
                <option key={hh} value={hh}>{fmtHour(hh)}</option>
              ))}
            </select>
            {!isNow && (
              <button className="btn btn-secondary btn-sm back-now" onClick={() => { setSelectedDate(todayStr); setSelectedTime('now'); loadData(lon, lat, locationLabel, todayStr, 'now'); }}>←&nbsp;<span className="bn-long">Back to now</span><span className="bn-short">Now</span></button>
            )}
            <span className="date-actions">
              <button className="btn btn-secondary" onClick={saveSpot}><Heart size={14} fill={isSaved ? 'currentColor' : 'none'} style={{ verticalAlign: '-2px' }} /> {isSaved ? 'Saved' : 'Save spot'}</button>
              <button className="btn btn-secondary" onClick={shareConditions}><Share2 size={14} style={{ verticalAlign: '-2px' }} /> Share</button>
              {isNative() && <button className="btn btn-secondary" onClick={remindMe} title="Remind me at dawn"><Bell size={14} style={{ verticalAlign: '-2px' }} /> Remind me</button>}
            </span>
          </div>
        </section>

        <section className="score-section">
          <div className="score-bar">
            <div className="score-circle" style={{ background: scoreBg, color: scoreText }}>
              <span className="score-num">{loading ? '--' : score.toFixed(1)}</span>
              <span className="score-denom">/ 10</span>
            </div>
            <div className="score-info">
              <h2 className="score-label">{loading ? 'Loading conditions...' : scoreLabel}</h2>
              <p className="score-tips">
                {loading ? `Fetching live data for ${locationLabel}` : scoreNarrative.length ? scoreNarrative.join(' ') : 'Based on current conditions.'}
                {!loading && conditions.verified && <span className="verified-badge" title="Wind and temperature agree across NOAA weather stations and the Open-Meteo forecast model">✓ NOAA + Open-Meteo</span>}
              </p>
              {!loading && scoreFactors.length > 0 && (
                <button className="breakdown-toggle" onClick={() => setShowBreakdown(v => !v)}>
                  {showBreakdown ? 'Hide breakdown' : 'How is this scored?'}
                </button>
              )}
              {showBreakdown && (
                <div className="breakdown">
                  <div className="breakdown-row"><span>Baseline</span><span>5.0</span></div>
                  {scoreFactors.map((f, i) => (
                    <div key={i} className="breakdown-row">
                      <span>{f.label}</span>
                      <span className={f.delta >= 0 ? 'delta-pos' : 'delta-neg'}>{f.delta >= 0 ? '+' : ''}{f.delta.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {hourlyScores.length > 0 && (
          <section className="section">
            <h3 className="section-label">
              Best time to fish — {isToday ? 'today' : dateShort}
              {bestWindow && <span className="best-window-tag">Best window: {fmtHour(bestWindow.start)}–{fmtHour(bestWindow.end)} ({bestWindow.avg.toFixed(1)} avg)</span>}
            </h3>
            <div className="timeline-row" role="img" aria-label="Hourly fishing score timeline">
              {hourlyScores.map((s, hh) => (
                <div
                  key={hh}
                  className={`timeline-seg${selectedTime === hh ? ' timeline-active' : ''}`}
                  style={{ background: timelineColor(s), height: `${Math.round(25 + ((s - 1) / 9) * 75)}%` }}
                  title={`${fmtHour(hh)}: ${s.toFixed(1)}/10 — click to view`}
                  onClick={() => handleTimeChange(String(hh))}
                />
              ))}
            </div>
            <div className="timeline-labels">
              <span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>11 PM</span>
            </div>
          </section>
        )}

        <section className="section">
          <h3 className="section-label">Atmosphere{timeContext}</h3>
          <div className="stat-grid-4">
            <StatCard icon={condIcon(conditions.conditionLabel)} value={conditions.conditionLabel ?? '--'} unit={conditions.precipChance != null ? `${conditions.precipChance}% rain` : ''} label="Conditions" />
            <StatCard icon={<Wind size={18} />} value={conditions.windMph != null ? Math.round(convWind(conditions.windMph, units)).toString() : '--'} unit={conditions.windDir ? `${windLabel(units)} · ${conditions.windDir}` : windLabel(units)} label="Wind" sub={conditions.windGustMph != null ? `gusts to ${fmtWind(conditions.windGustMph, units)}` : undefined} />
            <StatCard icon={<Thermometer size={18} />} value={conditions.airTempF != null ? Math.round(convTemp(conditions.airTempF, units)).toString() : '--'} unit={tempLabel(units)} label="Air temp" sub={dayTemps ? `H ${Math.round(convTemp(dayTemps.hi, units))}° · L ${Math.round(convTemp(dayTemps.lo, units))}°` : undefined} />
            <StatCard icon={<Gauge size={18} />} value={conditions.pressureMb?.toString() ?? '--'} unit={conditions.pressureTrend != null ? `mb ${conditions.pressureTrend <= -1 ? '▼' : conditions.pressureTrend >= 1 ? '▲' : '→'} ${conditions.pressureTrend > 0 ? '+' : ''}${conditions.pressureTrend.toFixed(1)}/6h` : 'mb'} label="Barometric" />
          </div>

          <button className="detail-toggle" onClick={() => setWindOpen(o => !o)} aria-expanded={windOpen}>
            <Wind size={15} />
            <span className="detail-title">Wind detail</span>
            <span className="detail-hint">hourly + 3-model consensus</span>
            <ChevronDown size={16} className={`detail-chevron${windOpen ? ' open' : ''}`} />
          </button>
          {windOpen && (
            <div className="detail-body">
              {windLoading && !windChart && <p className="muted detail-msg">Loading wind models…</p>}
              {!windLoading && !windChart && <p className="muted detail-msg">Wind model data isn't available for this spot right now.</p>}
              {windChart && (() => {
                const pts = windChart.hours;
                const N = pts.length;
                const xx = (i: number) => N > 1 ? (i / (N - 1)) * 100 : 0;
                const yy = (v: number) => 38 - (Math.min(v, windChart.yMax) / windChart.yMax) * 36;
                const meanPts = pts.map((p, i) => p ? `${xx(i).toFixed(1)},${yy(p.mean).toFixed(1)}` : '').filter(Boolean).join(' ');
                const gustPts = pts.map((p, i) => (p && p.gust != null) ? `${xx(i).toFixed(1)},${yy(p.gust).toFixed(1)}` : '').filter(Boolean).join(' ');
                const bandTop = pts.map((p, i) => p ? `${xx(i).toFixed(1)},${yy(p.max).toFixed(1)}` : '').filter(Boolean);
                const bandBot = pts.map((p, i) => p ? `${xx(i).toFixed(1)},${yy(p.min).toFixed(1)}` : '').filter(Boolean).reverse();
                const bandPath = bandTop.length ? `M${bandTop.join(' L')} L${bandBot.join(' L')} Z` : '';
                const modelColors = ['#185FA5', '#1D9E75', '#E07B2E'];
                const compass = (d: number) => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(d / 45) % 8];
                const confText = windChart.conf === 'high' ? 'Models agree' : windChart.conf === 'medium' ? 'Models mostly agree' : 'Models disagree';
                const arrowIdx = pts.map((p, i) => (p && i % 3 === 0) ? i : -1).filter(i => i >= 0);
                return (
                  <>
                    <div className={`wind-consensus wind-conf-${windChart.conf}`}>
                      <strong>{confText}</strong> · {Math.round(convWind(windChart.overallMin, units))}–{Math.round(convWind(windChart.overallMax, units))} {windLabel(units)}{windChart.conf === 'low' ? ' · lower confidence' : ''}
                    </div>
                    <div className="chart-block">
                      <div className="chart-yaxis"><span>{Math.round(convWind(windChart.yMax, units))} {windLabel(units)}</span><span>{Math.round(convWind(windChart.yMax * 0.75, units))}</span><span>{Math.round(convWind(windChart.yMax / 2, units))}</span><span>{Math.round(convWind(windChart.yMax * 0.25, units))}</span><span>0</span></div>
                      <div
                        className="wind-chart-wrap"
                        onPointerDown={(e) => {
                          e.currentTarget.setPointerCapture?.(e.pointerId);
                          const r = e.currentTarget.getBoundingClientRect();
                          setWindCursor(Math.max(0, Math.min(N - 1, Math.round(((e.clientX - r.left) / r.width) * (N - 1)))));
                        }}
                        onPointerMove={(e) => {
                          const r = e.currentTarget.getBoundingClientRect();
                          setWindCursor(Math.max(0, Math.min(N - 1, Math.round(((e.clientX - r.left) / r.width) * (N - 1)))));
                        }}
                        onPointerLeave={() => setWindCursor(null)}
                      >
                        <svg className="wind-chart" viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label="Hourly wind speed by model">
                          {[0, 0.25, 0.5, 0.75, 1].map(f => <line key={`h${f}`} x1="0" x2="100" y1={38 - f * 36} y2={38 - f * 36} className="chart-grid" vectorEffect="non-scaling-stroke" />)}
                          {[0, 1, 2, 3, 4, 5, 6].map(i => <line key={`v${i}`} x1={i * (100 / 6)} x2={i * (100 / 6)} y1="2" y2="38" className="chart-grid" vectorEffect="non-scaling-stroke" />)}
                          {bandPath && <path d={bandPath} className="wind-band" />}
                          {showWindModels && windModels && windModels.models.map((m, mi) => (
                            <polyline key={m.id} className="wind-model-line" style={{ stroke: modelColors[mi % 3] }} vectorEffect="non-scaling-stroke"
                              points={m.speed.slice(0, N).map((v, i) => v != null ? `${xx(i).toFixed(1)},${yy(v).toFixed(1)}` : '').filter(Boolean).join(' ')} />
                          ))}
                          <polyline className="wind-gust-line" vectorEffect="non-scaling-stroke" points={gustPts} />
                          <polyline className="wind-mean-line" vectorEffect="non-scaling-stroke" points={meanPts} />
                          {windCursor != null && pts[windCursor] && (
                            <line x1={xx(windCursor)} y1="0" x2={xx(windCursor)} y2="40" className="wind-cursor-line" vectorEffect="non-scaling-stroke" />
                          )}
                        </svg>
                        {windCursor != null && pts[windCursor] && (() => {
                          const cp = pts[windCursor]!;
                          const lp = xx(windCursor);
                          const tp = (yy(cp.mean) / 40) * 100;
                          const labelLeft = Math.max(16, Math.min(84, lp));
                          return (
                            <>
                              <div className="wind-cursor-dot" style={{ left: `${lp}%`, top: `${tp}%` }} />
                              <div className="wind-cursor-readout" style={{ left: `${labelLeft}%` }}>
                                <strong>{fmtHour(windCursor)}</strong>
                                <span>{fmtWind(cp.mean, units)}{cp.gust != null ? ` · gust ${Math.round(convWind(cp.gust, units))}` : ''}</span>
                                <span className="wind-cursor-range">range {Math.round(convWind(cp.min, units))}–{Math.round(convWind(cp.max, units))} {windLabel(units)}</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      <div className="chart-below">
                        <div className="wind-arrows" aria-hidden="true">
                          {arrowIdx.map(i => {
                            const p = pts[i]!;
                            return <span key={i} className="wind-arrow" title={`${fmtHour(i)}: ${fmtWind(p.mean, units)}${p.dir != null ? ' ' + compass(p.dir) : ''}`} style={{ transform: p.dir != null ? `rotate(${(p.dir + 180) % 360}deg)` : undefined }}>↑</span>;
                          })}
                        </div>
                        <div className="timeline-labels"><span>12 AM</span><span>4 AM</span><span>8 AM</span><span>12 PM</span><span>4 PM</span><span>8 PM</span><span>11 PM</span></div>
                      </div>
                    </div>
                    <div className="wind-legend">
                      <span><i className="lg-mean" /> avg</span>
                      <span><i className="lg-gust" /> gusts</span>
                      <span><i className="lg-band" /> model range</span>
                      <button className="wind-models-toggle" onClick={() => setShowWindModels(s => !s)}>{showWindModels ? 'Hide models' : `Show ${windChart.modelCount} models`}</button>
                    </div>
                    {showWindModels && <div className="wind-model-legend">{windChart.labels.map((l, i) => <span key={l}><i style={{ background: modelColors[i % 3] }} /> {l}</span>)}</div>}
                  </>
                );
              })()}
            </div>
          )}

          {precipHours.length > 0 && (<>
            <button className="detail-toggle" onClick={() => setPrecipOpen(o => !o)} aria-expanded={precipOpen}>
              <Droplet size={15} />
              <span className="detail-title">Rain &amp; lightning</span>
              <span className={`detail-hint${stormLabel ? ' hint-storm' : ''}`}>{stormLabel ? `\u26C8\uFE0F storms ${stormLabel}` : precipPeak.max >= 15 ? `peaks ${precipPeak.max}% around ${fmtHour(precipPeak.hour)}` : precipPeak.max < 5 ? 'none expected' : `low, ~${precipPeak.max}%`}</span>
              <ChevronDown size={16} className={`detail-chevron${precipOpen ? ' open' : ''}`} />
            </button>
            {precipOpen && (
              <div className="detail-body">
                {stormLabel && (
                  <p className="storm-note">
                    <span aria-hidden="true">&#9928;&#65039;</span> <strong>Thunderstorms in the forecast {stormLabel}{isToday ? '' : ` ${dayWord}`}.</strong> Lightning is a serious risk on open water — plan to be off before it moves in.
                  </p>
                )}
                <div className="chart-block">
                  <div className="chart-yaxis"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div>
                  <div className="precip-wrap">
                    <div className="precip-grid" aria-hidden="true">
                      {[0, 1, 2, 3, 4].map(i => <div key={i} className="precip-gridline" />)}
                    </div>
                    <div className="precip-row" role="img" aria-label="Hourly chance of rain and thunderstorms">
                      {precipHours.map((p, hh) => {
                        const sel = precipSel === hh;
                        const storm = stormSet.has(hh);
                        return (
                          <button
                            key={hh}
                            type="button"
                            className={`precip-col${sel ? ' precip-col-sel' : ''}`}
                            title={`${fmtHour(hh)}: ${Math.round(p)}% chance of rain${storm ? ' \u00B7 thunderstorms' : ''}`}
                            aria-label={`${fmtHour(hh)}: ${Math.round(p)} percent chance of rain${storm ? ', thunderstorms in the forecast' : ''}`}
                            onClick={() => setPrecipSel(s => (s === hh ? null : hh))}
                          >
                            <span
                              className={`precip-bar${storm ? ' precip-bar-storm' : ''}`}
                              style={{ height: `${Math.round(p)}%`, opacity: sel ? 1 : 0.35 + (p / 100) * 0.65 }}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="chart-below">
                    <div className="timeline-labels"><span>12 AM</span><span>4 AM</span><span>8 AM</span><span>12 PM</span><span>4 PM</span><span>8 PM</span><span>11 PM</span></div>
                  </div>
                </div>
                {stormLabel && <p className="storm-legend"><span className="legend-dot dot-rain" /> rain chance <span className="legend-dot dot-storm" /> thunderstorms</p>}
                {precipSel != null && precipHours[precipSel] != null && (
                  <p className="precip-readout"><strong>{fmtHour(precipSel)}</strong> · {Math.round(precipHours[precipSel])}% chance of rain{stormSet.has(precipSel) ? ' · thunderstorms in the forecast' : ''}</p>
                )}
                {precipPeak.max < 15 && (
                  <p className="muted precip-clear">{precipPeak.max < 5 ? `No rain expected ${dayWord}.` : `Rain unlikely ${dayWord} — peaks around ${precipPeak.max}%.`} Tap any hour for its exact chance.</p>
                )}
              </div>
            )}
          </>)}
        </section>

        <section className="section">
          <h3 className="section-label">{isToday ? '24-hour forecast' : `Hourly forecast — ${dateShort}`}</h3>
          <div className="forecast-scroll">
            {forecastSlots.map((s, i) => (
              <div key={i} className="fc-card">
                <div className="fc-time">{s.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                <div className="fc-icon" aria-label={s.cond}>{s.emoji}</div>
                {s.precip != null && s.precip > 0 && <div className="fc-precip"><Droplet size={10} style={{ verticalAlign: '-1px' }} /> {s.precip}%</div>}
                {s.temp != null && <div className="fc-val">{fmtTemp(s.temp, units)}</div>}
                <div className="fc-sub">{fmtWind(s.wind, units)} {s.dir}</div>
                {s.wave != null && <div className="fc-sub">{fmtWave(s.wave, units)} waves</div>}
              </div>
            ))}
            {forecastSlots.length === 0 && <span className="muted">Loading forecast...</span>}
          </div>
        </section>

        {showWaterToggle && (
          <div className="water-toggle" role="tablist" aria-label="Water data view">
            <button
              type="button"
              role="tab"
              aria-selected={effectiveInland}
              className={`water-toggle-btn${effectiveInland ? ' active' : ''}`}
              onClick={() => setWaterView('river')}
            >River &amp; lake</button>
            <button
              type="button"
              role="tab"
              aria-selected={!effectiveInland}
              className={`water-toggle-btn${!effectiveInland ? ' active' : ''}`}
              onClick={() => setWaterView('tide')}
            >Tides</button>
          </div>
        )}

        {!effectiveInland && (
          <div className="tide-cols">
          <section className="section">
            <h3 className="section-label">{isToday ? "Today's" : 'Forecasted'} tide events</h3>
            <div className="card">
              {dayEvents.length > 0 ? dayEvents.slice(0, 4).map((p, i) => {
                const isH = p.type === 'H';
                const t = new Date(p.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={i} className="tide-row">
                    <span className="tide-type">{isH ? '▲' : '▼'} {isH ? 'High' : 'Low'}</span>
                    <span className="tide-time">{t}</span>
                    <span className="tide-ht">{parseFloat(p.v).toFixed(1)} ft</span>
                  </div>
                );
              }) : <span className="muted">{stationChecked && !tideStation ? 'No nearby tide station' : tideLoading ? 'Loading...' : 'Tide data unavailable — tap the refresh icon above to retry'}</span>}
            </div>
            {tideStation && (
              <div className="station-row">
                <span className="station-note">Tide data from NOAA station:</span>
                <select
                  className="search-input station-select"
                  value={tideStation.id}
                  onChange={e => changeStation(e.target.value)}
                  aria-label="Choose tide station"
                >
                  {nearbyStations.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.distanceMi} mi)</option>
                  ))}
                </select>
              </div>
            )}
          </section>
          <section className="section">
            <h3 className="section-label">Tide chart — {isToday ? 'today' : dateShort}</h3>
            <div className="chart-wrap">
              {dayCurve.length > 0
                ? <Line data={tideChartData} options={tideChartOpts as any} aria-label="Tide height chart" />
                : <div className="muted" style={{ padding: '2rem 0' }}>
                    {stationChecked && !tideStation
                      ? 'No NOAA tide station within 100 miles — this looks like an inland spot, so tide data isn\u2019t available here.'
                      : tideLoading ? 'Loading tide data...' : 'Tide data unavailable'}
                  </div>}
            </div>
          </section>
          <div className="station-map-block tide-map-full">
            <button className="detail-toggle" onClick={() => setMapOpen(o => !o)} aria-expanded={mapOpen}>
              {mapOpen ? 'Hide station map' : 'View tide + river stations on map'}
            </button>
            {mapOpen && (
              <StationMap
                lat={lat}
                lon={lon}
                locationLabel={locationLabel}
                tideStations={nearbyStations}
                currentTideId={tideStation ? tideStation.id : null}
                onSelectTide={changeStation}
                rivers={rivers}
                currentRiverId={riverStation ? riverStation.siteId : null}
                onSelectRiver={changeRiverGauge}
                units={units}
              />
            )}
          </div>
          </div>
        )}

        {effectiveInland && (
          <section className="section">
            <h3 className="section-label">River &amp; lake conditions{timeContext}</h3>
            {riverStation ? (
              <>
                <div className="stat-grid-3">
                  <StatCard icon={<Droplets size={18} />} value={conditions.waterTempF != null ? convTemp(conditions.waterTempF, units).toFixed(1) : '--'} unit={tempLabel(units)} label={isNow ? 'Water temp' : 'Water temp (latest)'} />
                  <StatCard icon={<Waves size={18} />} value={riverStation.flowCfs != null ? Math.round(riverStation.flowCfs).toLocaleString() : '--'} unit="cfs" label="Flow (discharge)"
                    sub={riverDetail ? ([
                      riverDetail.flowTrend ? `${riverDetail.flowTrend === 'rising' ? '▲' : riverDetail.flowTrend === 'falling' ? '▼' : '→'}${riverDetail.flowChangePct != null && riverDetail.flowTrend !== 'steady' ? ` ${riverDetail.flowChangePct > 0 ? '+' : ''}${riverDetail.flowChangePct}%` : ''}` : null,
                      riverDetail.normalLabel,
                    ].filter(Boolean).join(' · ') || undefined) : undefined} />
                  <StatCard icon={<ArrowUpDown size={18} />} value={riverStation.gageFt != null ? riverStation.gageFt.toFixed(2) : '--'} unit="ft" label="Gage height" />
                </div>
                {riverDetail && riverDetail.flowSeries.length >= 8 && (() => {
                  const s = riverDetail.flowSeries;
                  const N = s.length;
                  const step = Math.max(1, Math.floor(N / 48));
                  const pts: number[] = [];
                  for (let i = 0; i < N; i += step) pts.push(s[i]);
                  if (pts[pts.length - 1] !== s[N - 1]) pts.push(s[N - 1]);
                  const min = Math.min(...pts), max = Math.max(...pts), range = (max - min) || 1;
                  const coords = pts.map((v, i) => `${(i / (pts.length - 1) * 100).toFixed(1)},${(28 - ((v - min) / range) * 26).toFixed(1)}`).join(' ');
                  return (
                    <div className="flow-spark">
                      <div className="flow-spark-head">
                        <span>Flow trend · last 48h</span>
                        {riverDetail.medianCfs != null && <span className="muted">normal for today ≈ {Math.round(riverDetail.medianCfs).toLocaleString()} cfs</span>}
                      </div>
                      <svg className="flow-spark-svg" viewBox="0 0 100 30" preserveAspectRatio="none" role="img" aria-label="Recent river flow trend">
                        <polyline className="flow-spark-line" vectorEffect="non-scaling-stroke" points={coords} />
                      </svg>
                    </div>
                  );
                })()}
                <div className="station-row">
                  <span className="station-note">USGS gauge:</span>
                  <select
                    className="search-input station-select"
                    value={riverStation.siteId}
                    onChange={e => changeRiverGauge(e.target.value)}
                    aria-label="Choose river gauge"
                  >
                    {rivers.map(r => (
                      <option key={r.siteId} value={r.siteId}>{r.siteName} ({r.distanceMi} mi)</option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <div className="muted" style={{ padding: '1rem 0' }}>
                {riverLoading ? 'Loading river data...' : 'No USGS stream gauge found near this spot.'}
              </div>
            )}
            <div className="station-map-block">
              <button className="detail-toggle" onClick={() => setMapOpen(o => !o)} aria-expanded={mapOpen}>
                {mapOpen ? 'Hide station map' : 'View tide + river stations on map'}
              </button>
              {mapOpen && (
                <StationMap
                  lat={lat}
                  lon={lon}
                  locationLabel={locationLabel}
                  tideStations={nearbyStations}
                  currentTideId={tideStation ? tideStation.id : null}
                  onSelectTide={changeStation}
                  rivers={rivers}
                  currentRiverId={riverStation ? riverStation.siteId : null}
                  onSelectRiver={changeRiverGauge}
                  units={units}
                />
              )}
            </div>
          </section>
        )}

        {!isInland ? (
          <div className="water-cols">
            <section className="section">
              <h3 className="section-label">Water conditions{timeContext}</h3>
              <div className="stat-grid-auto">
                <StatCard icon={<Droplets size={18} />} value={(conditions.waterTempF ?? conditions.sstF) != null ? convTemp((conditions.waterTempF ?? conditions.sstF)!, units).toFixed(1) : '--'} unit={tempLabel(units)} label={isNow ? 'Water temp' : 'Water temp (latest reading)'} sub={conditions.waterTempF == null && conditions.sstF != null ? 'satellite SST' : undefined} />
                <StatCard icon={<Waves size={18} />} value={conditions.waveFt != null ? convWave(conditions.waveFt, units).toFixed(1) : '--'} unit={waveLabel(units)} label="Wave height" />
                <StatCard icon={<Timer size={18} />} value={conditions.wavePeriod?.toString() ?? '--'} unit="sec" label="Wave period" />
                <StatCard icon={<Navigation size={18} />} value={conditions.currentKn != null ? conditions.currentKn.toFixed(1) : '--'} unit={conditions.currentDir ? `kn · ${conditions.currentDir}` : 'kn'} label="Current" />
              </div>
            </section>
            <section className="section">
              <h3 className="section-label">Water clarity{timeContext}</h3>
              <div className={`clarity-card clarity-${waterClarity.level.toLowerCase()}`}>
                <Eye size={20} className="clarity-icon" />
                <div className="clarity-text">
                  <div className="clarity-level">{waterClarity.level}</div>
                  <div className="clarity-reason">{waterClarity.reason}</div>
                  <div className="clarity-hint">{waterClarity.lureHint}</div>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <section className="section">
            <h3 className="section-label">Water clarity{timeContext}</h3>
            <div className={`clarity-card clarity-${waterClarity.level.toLowerCase()}`}>
              <Eye size={20} className="clarity-icon" />
              <div className="clarity-text">
                <div className="clarity-level">{waterClarity.level}</div>
                <div className="clarity-reason">{waterClarity.reason}</div>
                <div className="clarity-hint">{waterClarity.lureHint}</div>
              </div>
            </div>
          </section>
        )}

        <section className="section">
          <h3 className="section-label">Sun & moon</h3>
          <div className="card">
            <div className="sun-row">
              <div className="sun-item">
                <span className="sun-icon"><Sunrise size={22} /></span>
                <div>
                  <div className="sun-time">{conditions.sunrise ? new Date(conditions.sunrise).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</div>
                  <div className="sun-label">Sunrise</div>
                </div>
              </div>
              <div className="sun-item">
                <span className="sun-icon"><Sunset size={22} /></span>
                <div>
                  <div className="sun-time">{conditions.sunset ? new Date(conditions.sunset).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</div>
                  <div className="sun-label">Sunset</div>
                </div>
              </div>
            </div>
            <div className="moon-solunar">
              <div className="moon-card">
                <MoonSVG phase={moon.phase} />
                <div>
                  <div className="moon-name">{moon.name}</div>
                  <div className="moon-desc">{moon.desc}</div>
                  <div className="moon-illum">{moon.illum}% illuminated</div>
                </div>
              </div>
              <div className="solunar-block">
                <div className="solunar-title">Solunar feeding periods (approx.)</div>
                <div className="solunar-row"><strong>Major:</strong> {solunar.majors.map(m => m.join('–')).join(' · ')}</div>
                <div className="solunar-row"><strong>Minor:</strong> {solunar.minors.map(m => m.join('–')).join(' · ')}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="ai-card">
            <div className="ai-header">✦ Real-time fishing guide</div>
            <p className="ai-text">{aiSummary}</p>
          </div>
        </section>

        <section className="section">
          <h3 className="section-label">Species bite forecast — {locationLabel}{isInland ? ' (freshwater)' : ''}</h3>
          {stationChecked && species.length > 0 && (
            <div className="target-species-row">
              <label className="target-species-label" htmlFor="target-species">Target species</label>
              <select id="target-species" className="search-input target-species-select" value={targetSpecies ?? ''} onChange={e => chooseTargetSpecies(e.target.value)}>
                <option value="">All species</option>
                {species.map(sp => sp.name).sort().map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          )}
          {!stationChecked && <p className="muted" style={{ padding: '4px 0' }}>Loading species for this location...</p>}
          <div className="species-grid" style={!stationChecked ? { display: 'none' } : undefined}>
            {[...species].sort((a, b) => (Number(b.name === targetSpecies) - Number(a.name === targetSpecies)) || (b.popularity - a.popularity) || (b.biteScore - a.biteScore)).slice(0, 6).map((sp, i) => {
              const color = sp.biteScore > 70 ? '#1D9E75' : sp.biteScore > 45 ? '#185FA5' : '#888780';
              const open = openSpecies.has(i);
              return (
                <div key={i} className={`species-card${open ? ' species-open' : ''}`}>
                  <button
                    type="button"
                    className="species-header"
                    aria-expanded={open}
                    onClick={() => setOpenSpecies(prev => {
                      const cols = speciesColsRef.current;
                      const total = Math.min(6, species.length);
                      const rowStart = Math.floor(i / cols) * cols;
                      const willOpen = !prev.has(i);
                      const next = new Set(prev);
                      for (let k = rowStart; k < rowStart + cols && k < total; k++) {
                        if (willOpen) next.add(k); else next.delete(k);
                      }
                      return next;
                    })}
                  >
                    <div className="species-title-row">
                      <span className="species-icon"><SpeciesIcon name={sp.name} size={30} /></span>
                      <span className="species-name">{sp.name}</span>
                    </div>
                    <div className="species-meta-row">
                      <span className="bite-label" style={{ color }}>{sp.biteLabel}</span>
                      <ChevronDown size={16} className="species-chevron" />
                    </div>
                  </button>
                  <div className="bite-bar-wrap">
                    <div className="bite-bar" style={{ width: `${sp.biteScore}%`, background: color }} />
                  </div>
                  {open && (
                    <div className="species-detail">
                      <p className="species-tip">{sp.tip}</p>
                      <p className="species-lures"><strong>Lures:</strong> {sp.lures}</p>
                      <a
                        className="tackle-link"
                        href={tackleSearchUrl(sp.name)}
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                      >
                        <ShoppingBag size={12} /> Shop {sp.name.toLowerCase()} tackle
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {AFFILIATE_ACTIVE && (
            <p className="affiliate-disclosure">
              Tackle links are affiliate links — as an Amazon Associate we may earn from qualifying purchases, at no extra cost to you.
            </p>
          )}
        </section>

        <BaitAdvisor
          locationLabel={locationLabel}
          dateStr={selectedDate}
          speciesOptions={species.map(sp => sp.name)}
          topSpecies={[...species].sort((a, b) => (b.popularity - a.popularity) || (b.biteScore - a.biteScore)).slice(0, 3).map(sp => sp.name)}
          defaultSpecies={targetSpecies}
          autoRunNonce={targetNonce}
          conditions={conditions}
          isInland={isInland}
          waterClarity={waterClarity.level}
          units={units}
        />

        {weekScores.length > 0 && (
          <section className="section">
            <h3 className="section-label">7-Day Outlook — When Should I Go?</h3>
            <p className="muted" style={{ marginTop: -2, marginBottom: 10 }}>
              Each day is a quick midday forecast for planning ahead. The big score up top is for your selected time and also folds in live water temp{tideAffectsScore ? ' and tide' : ''}, so the two can differ. Tap a day to see its full breakdown.
            </p>
            <div className="week-strip">
              {weekScores.map(d => {
                const dt = new Date(d.date + 'T12:00:00');
                const active = d.date === selectedDate;
                return (
                  <button
                    key={d.date}
                    className={`week-card${active ? ' week-active' : ''}`}
                    onClick={() => handleDateChange(d.date)}
                    title={`View ${dt.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}`}
                  >
                    <span className="week-day">{dt.toLocaleDateString([], { weekday: 'short' })}</span>
                    <span className="week-date">{dt.getDate()}</span>
                    <span className="week-score" style={{ background: timelineColor(d.score) }}>{d.score.toFixed(1)}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="section">
          <h3 className="section-label">Saved spots <span className="log-private-tag">private — saved on this device</span></h3>
          <div className="card">
            {spots.length === 0 && <p className="muted" style={{ padding: '4px 0 8px' }}>No saved spots yet. Search a location and click "Save spot".</p>}
            {spots.map(s => (
              <div key={s.id} className="spot-row">
                <span className="spot-pin"><MapPin size={15} /></span>
                <span className="spot-name">{s.label}</span>
                <button className="btn btn-sm" onClick={() => loadSpot(s)}>Load</button>
                <button className="btn-ghost" onClick={() => deleteSpot(s.id)} aria-label={`Delete ${s.label}`}><Trash2 size={15} /></button>
              </div>
            ))}
            <div className="add-spot-row">
              <input className="search-input" value={spotName} onChange={e => setSpotName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNamedSpot()} placeholder="Custom spot name..." aria-label="Spot name" />
              <button className="btn" onClick={addNamedSpot}>+ Add</button>
            </div>
          </div>
        </section>

        <WeightEstimator speciesOptions={species.map(sp => sp.name)} units={units} />

        <CatchLog
          speciesOptions={species.map(sp => sp.name)}
          locationLabel={locationLabel}
          conditions={conditions}
          score={score}
          moonName={moon.name}
          units={units}
        />

        <AlertSignup locationLabel={locationLabel} lat={lat} lon={lon} />

        <Feedback />

        <footer className="footer">
          {!isNative() && APP_STORE_URL && (
            <div className="footer-cta">
              <span className="footer-cta-txt">Fishing on the go? Get the free iOS app.</span>
              <div className="footer-cta-actions">
                <a className="appstore-badge" href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" aria-label="Download FishCondish on the App Store">
                  <svg viewBox="0 0 384 512" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
                  <span className="appstore-badge-txt"><small>Download on the</small>App Store</span>
                </a>
                <div className="footer-qr" aria-hidden="true">
                  <div className="footer-qr-code"><QRCodeSVG value={APP_STORE_URL} size={88} bgColor="#ffffff" fgColor="#0C2340" level="M" /></div>
                  <span className="footer-qr-cap">Scan to install</span>
                </div>
              </div>
            </div>
          )}
          <div className="footer-row">
            <span>Data: Open-Meteo · NOAA CO-OPS · NWS · Claude AI</span>
            <button className="btn btn-secondary" onClick={() => loadData(lon, lat, locationLabel, selectedDate, selectedTime)}><RefreshCw size={13} style={{ verticalAlign: '-2px' }} /> Refresh</button>
          </div>
        </footer>
      </main>
    </div>
  );
}
