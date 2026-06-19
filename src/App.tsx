import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import About from './About';
import CatchFeed from './CatchFeed';
import CatchSubmit from './CatchSubmit';
import Admin from './Admin';
import Feedback from './Feedback';
import AlertSignup from './AlertSignup';
import BaitAdvisor from './BaitAdvisor';
import { getSpeciesForLocation, buildScoreNarrative } from './species';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Tooltip, Filler,
} from 'chart.js';
import type { Conditions, TideData, HourlyForecast, SavedSpot, RiverData } from './types';
import { getMoonPhase, calcFishingScore, scoreColor, getSolunarPeriods, degToCompass, calcWaterClarity } from './utils/fishing';
import { fetchWeather, fetchWaterTemp, fetchTides, fetchAISummary, fetchWeekOutlook, fetchRiverData, weatherCodeToCondition, localToday } from './utils/api';
import {
  Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, Snowflake, Zap,
  Wind, Thermometer, Gauge, Droplets, Droplet, Waves, Timer, ArrowUpDown,
  Sunrise, Sunset, MapPin, Heart, Share2, RefreshCw, Trash2, Moon as MoonIcon, Bell, Eye, ChevronDown,
} from 'lucide-react';
import CatchLog from './CatchLog';
import SpeciesIcon from './SpeciesIcon';
import { resolveLocation, suggestLocations, reverseGeocode, GeoResult } from './utils/geocode';
import { isNative, getCurrentPositionNative, remindAtDawn } from './native';
import { crossCheckWeather } from './utils/crosscheck';
import { findNearestStation, findNearbyStations, NearestStation } from './utils/stations';
import './App.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

function MoonSVG({ phase }: { phase: number }) {
  const lit = phase / 29.53;
  let cx = 24, rx = 20;
  if (lit < 0.5) { cx = 24 + 20 * (1 - lit * 4); rx = 20 * Math.abs(1 - lit * 4); }
  else { cx = 24 - 20 * ((lit - 0.5) * 4); rx = 20 * Math.abs((lit - 0.5) * 4); }
  return (
    <svg width="52" height="52" viewBox="0 0 48 48" aria-hidden="true">
      <defs><clipPath id="mc"><circle cx="24" cy="24" r="20" /></clipPath></defs>
      <circle cx="24" cy="24" r="20" fill="#D3D1C7" />
      <ellipse cx={cx} cy={24} rx={rx} ry={20} fill="#444441" clipPath="url(#mc)" />
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
  const [aiSummary, setAiSummary] = useState('Analyzing conditions...');
  const [loading, setLoading] = useState(true);
  const [tideLoading, setTideLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [spots, setSpots] = useState<SavedSpot[]>(() => {
    try { return JSON.parse(localStorage.getItem('castSpots') || '[]'); } catch { return []; }
  });
  const [spotName, setSpotName] = useState('');
  const [showAbout, setShowAbout] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
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
  const [riverLoading, setRiverLoading] = useState(false);
  const [weekScores, setWeekScores] = useState<Array<{ date: string; score: number }>>([]);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [theme, setTheme] = useState<string>(() => {
    try {
      return localStorage.getItem('theme')
        || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    } catch { return 'light'; }
  });
  const [spotMsg, setSpotMsg] = useState('');
  const [stationChecked, setStationChecked] = useState(false);
  const [openSpecies, setOpenSpecies] = useState<Set<number>>(() => new Set());
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

  // Coastal spots sit within a few miles of a NOAA tide station; an inland
  // lake near the coast can still have one 15-25 mi away, which used to make
  // it read as coastal (showing saltwater species). Treat a distant station
  // as inland so freshwater spots get freshwater species + river/lake data.
  const isInland = stationChecked && (!tideStation || tideStation.distanceMi > 12);
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
  const { score, label: scoreLabel, factors: scoreFactors } = calcFishingScore(conditions, new Date(selectedDate + 'T12:00:00'));
  const { bg: scoreBg, text: scoreText } = scoreColor(score);
  const waterClarity = calcWaterClarity(conditions, isInland);
  const species = getSpeciesForLocation(
    lat, lon, conditions.waterTempF ?? null, conditions.windMph ?? 10,
    conditions.waveFt ?? 2, conditions.pressureMb ?? 1013,
    conditions.tideDirection ?? null, moon.phase, isInland
  );
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
          tideSt ? Promise.resolve([] as RiverData[]) : fetchRiverData(la, lo),
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
        return { waterTemp: finalWaterTemp, tideData };
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

      fetchWeekOutlook(la, lo).then(ws => { if (seq === loadSeq.current) setWeekScores(ws); }).catch(() => {});

      const extra = await stationsChain;
      if (seq !== loadSeq.current) return;

      // AI summary in the background — never blocks the page
      const dayMoon = getMoonPhase(new Date(dateStr + 'T12:00:00'));
      const snapshot: Partial<Conditions> = {
        ...weather.conditions,
        waterTempF: extra?.waterTemp ?? null,
        tideDirection: extra ? (tideAt(extra.tideData.curve, refTime)?.dir ?? null) : null,
      };
      const { score: sc } = calcFishingScore(snapshot);
      fetchAISummary(snapshot, dayMoon.name, dayMoon.illum, sc, lbl, dateStr).then(s => {
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
  }, []);

  useEffect(() => { loadData(lon, lat, locationLabel, selectedDate, selectedTime); }, []); // eslint-disable-line

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('theme', theme); } catch {}
  }, [theme]);

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
    const url = `${window.location.origin}/?${params.toString()}`;
    const text = `Fishing conditions for ${locationLabel}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Fish Condish', text, url }); return; } catch {}
    }
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
        tideDirection: tide?.dir ?? null,
      } as Partial<Conditions>, new Date(selectedDate + 'T12:00:00')).score;
      // Prime-time bonuses: dawn/dusk and solunar majors — this is also what
      // keeps the timeline visually consistent with the solunar table below
      if (sunriseH != null && Math.abs(hh - sunriseH) <= 1.5) s += 0.8;
      if (sunsetH != null && Math.abs(hh - sunsetH) <= 1.5) s += 0.8;
      if (sol.majorHours.some(m => Math.abs(hh - m) <= 1 || Math.abs(hh - m) >= 23)) s += 0.5;
      return Math.min(10, Math.round(s * 10) / 10);
    });
  }, [hourly, tides, conditions.waterTempF, conditions.sunrise, conditions.sunset, selectedDate]);

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
    const slots: { time: Date; wind: number; dir: string; temp: number | null; wave: number | null; cond: string; precip: number | null }[] = [];
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
        precip: hourly.precipitation_probability?.[i] ?? null,
      });
    }
    return slots;
  })();

  if (isAdmin) return <Admin />;

  return (
    <div className="app">
      {showAbout && <About onClose={() => setShowAbout(false)} />}
      {showSubmit && <CatchSubmit onClose={() => setShowSubmit(false)} />}
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <img src="/logo.svg" alt="" className="logo-img" />
            <span className="logo-text">Fish Condish</span>
          </div>
          <div className="header-right">
            {lastUpdated && <span className="updated-txt">Updated {lastUpdated} · {locationLabel}</span>}
            <button className="btn-icon" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} title="Toggle dark mode">{theme === 'dark' ? <Sun size={15} /> : <MoonIcon size={15} />}</button>
            <button className="btn-icon" onClick={() => setShowAbout(true)} title="About">?</button>
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
            <input
              className="search-input date-input"
              type="date"
              value={selectedDate}
              min={todayStr}
              max={maxDateStr}
              onChange={e => handleDateChange(e.target.value)}
              aria-label="Forecast date"
            />
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
              <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedDate(todayStr); setSelectedTime('now'); loadData(lon, lat, locationLabel, todayStr, 'now'); }}>← Back to now</button>
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
            <StatCard icon={<Wind size={18} />} value={conditions.windMph ? Math.round(conditions.windMph).toString() : '--'} unit={conditions.windDir ? `mph · ${conditions.windDir}` : 'mph'} label="Wind" sub={conditions.windGustMph != null ? `gusts to ${Math.round(conditions.windGustMph)} mph` : undefined} />
            <StatCard icon={<Thermometer size={18} />} value={conditions.airTempF?.toString() ?? '--'} unit="°F" label="Air temp" />
            <StatCard icon={<Gauge size={18} />} value={conditions.pressureMb?.toString() ?? '--'} unit={conditions.pressureTrend != null ? `mb ${conditions.pressureTrend <= -1 ? '▼' : conditions.pressureTrend >= 1 ? '▲' : '→'} ${conditions.pressureTrend > 0 ? '+' : ''}${conditions.pressureTrend.toFixed(1)}/6h` : 'mb'} label="Barometric" />
          </div>
        </section>

        {precipHours.length > 0 && (
          <section className="section">
            <h3 className="section-label">
              Rain chance — {isToday ? 'today' : dateShort}
              {precipPeak.max >= 15 && <span className="best-window-tag">Peak: {precipPeak.max}% around {fmtHour(precipPeak.hour)}</span>}
            </h3>
            {precipPeak.max >= 15 ? (
              <>
                <div className="precip-row" role="img" aria-label="Hourly chance of rain">
                  {precipHours.map((p, hh) => (
                    <div
                      key={hh}
                      className="precip-seg"
                      style={{ height: `${Math.max(4, Math.round(p))}%`, opacity: 0.35 + (p / 100) * 0.65 }}
                      title={`${fmtHour(hh)}: ${Math.round(p)}% chance of rain`}
                    />
                  ))}
                </div>
                <div className="timeline-labels">
                  <span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>11 PM</span>
                </div>
              </>
            ) : (
              <p className="muted precip-clear">{precipPeak.max < 5 ? 'No rain expected today.' : `Rain unlikely today — peaks around ${precipPeak.max}%.`}</p>
            )}
          </section>
        )}

        <section className="section">
          <h3 className="section-label">{isToday ? '24-hour forecast' : `Hourly forecast — ${dateShort}`}</h3>
          <div className="forecast-scroll">
            {forecastSlots.map((s, i) => (
              <div key={i} className="fc-card">
                <div className="fc-time">{s.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                <div className="fc-icon">{condIcon(s.cond)}</div>
                {s.precip != null && s.precip > 0 && <div className="fc-precip"><Droplet size={10} style={{ verticalAlign: '-1px' }} /> {s.precip}%</div>}
                {s.temp != null && <div className="fc-val">{s.temp}°F</div>}
                <div className="fc-sub">{s.wind} mph {s.dir}</div>
                {s.wave != null && <div className="fc-sub">{s.wave.toFixed(1)} ft waves</div>}
              </div>
            ))}
            {forecastSlots.length === 0 && <span className="muted">Loading forecast...</span>}
          </div>
        </section>

        {!isInland && (
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
              }) : <span className="muted">{stationChecked && !tideStation ? 'No nearby tide station' : 'Loading...'}</span>}
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
          </div>
        )}

        {isInland && (
          <section className="section">
            <h3 className="section-label">River &amp; lake conditions{timeContext}</h3>
            {riverStation ? (
              <>
                <div className="stat-grid-3">
                  <StatCard icon={<Droplets size={18} />} value={conditions.waterTempF != null ? conditions.waterTempF.toFixed(1) : '--'} unit="°F" label={isNow ? 'Water temp' : 'Water temp (latest)'} />
                  <StatCard icon={<Waves size={18} />} value={riverStation.flowCfs != null ? Math.round(riverStation.flowCfs).toLocaleString() : '--'} unit="cfs" label="Flow (discharge)" />
                  <StatCard icon={<ArrowUpDown size={18} />} value={riverStation.gageFt != null ? riverStation.gageFt.toFixed(2) : '--'} unit="ft" label="Gage height" />
                </div>
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
          </section>
        )}

        {!isInland ? (
          <div className="water-cols">
            <section className="section">
              <h3 className="section-label">Water conditions{timeContext}</h3>
              <div className="stat-grid-4">
                <StatCard icon={<Droplets size={18} />} value={conditions.waterTempF?.toFixed(1) ?? '--'} unit="°F" label={isNow ? 'Water temp' : 'Water temp (latest reading)'} />
                <StatCard icon={<Waves size={18} />} value={conditions.waveFt?.toFixed(1) ?? '--'} unit="ft" label="Wave height" />
                <StatCard icon={<Timer size={18} />} value={conditions.wavePeriod?.toString() ?? '--'} unit="sec" label="Wave period" />
                <StatCard icon={<ArrowUpDown size={18} />} value={conditions.tideNow != null ? conditions.tideNow.toFixed(1) : '--'} unit={conditions.tideDirection ? `ft · ${conditions.tideDirection}` : 'ft'} label={isNow ? 'Tide now' : `Tide at ${fmtHour(selectedTime === 'now' ? 12 : selectedTime)}`} />
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
            <div className="ai-header">✦ AI fishing guide</div>
            <p className="ai-text">{aiSummary}</p>
          </div>
        </section>

        <section className="section">
          <h3 className="section-label">Species bite forecast — {locationLabel}{isInland ? ' (freshwater)' : ''}</h3>
          {!stationChecked && <p className="muted" style={{ padding: '4px 0' }}>Loading species for this location...</p>}
          <div className="species-grid" style={!stationChecked ? { display: 'none' } : undefined}>
            {[...species].sort((a, b) => b.biteScore - a.biteScore).slice(0, 6).map((sp, i) => {
              const color = sp.biteScore > 70 ? '#1D9E75' : sp.biteScore > 45 ? '#185FA5' : '#888780';
              const open = openSpecies.has(i);
              return (
                <div key={i} className={`species-card${open ? ' species-open' : ''}`}>
                  <button
                    type="button"
                    className="species-header"
                    aria-expanded={open}
                    onClick={() => setOpenSpecies(prev => {
                      const next = new Set(prev);
                      if (next.has(i)) next.delete(i); else next.add(i);
                      return next;
                    })}
                  >
                    <span className="species-icon"><SpeciesIcon name={sp.name} size={30} /></span>
                    <span className="species-name">{sp.name}</span>
                    <span className="bite-label" style={{ color }}>{sp.biteLabel}</span>
                    <ChevronDown size={16} className="species-chevron" />
                  </button>
                  <div className="bite-bar-wrap">
                    <div className="bite-bar" style={{ width: `${sp.biteScore}%`, background: color }} />
                  </div>
                  {open && (
                    <div className="species-detail">
                      <p className="species-tip">{sp.tip}</p>
                      <p className="species-lures"><strong>Lures:</strong> {sp.lures}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <BaitAdvisor
          locationLabel={locationLabel}
          dateStr={selectedDate}
          speciesOptions={species.map(sp => sp.name)}
          topSpecies={[...species].sort((a, b) => b.biteScore - a.biteScore).slice(0, 3).map(sp => sp.name)}
          conditions={conditions}
          isInland={isInland}
          waterClarity={waterClarity.level}
        />

        {weekScores.length > 0 && (
          <section className="section">
            <h3 className="section-label">7-Day Outlook — When Should I Go?</h3>
            <p className="muted" style={{ marginTop: -2, marginBottom: 10 }}>
              Each day is a quick midday forecast for planning ahead. The big score up top is for your selected time and also folds in live water temp and tide, so the two can differ. Tap a day to see its full breakdown.
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

        <CatchLog
          speciesOptions={species.map(sp => sp.name)}
          locationLabel={locationLabel}
          conditions={conditions}
          score={score}
          moonName={moon.name}
        />

        <AlertSignup locationLabel={locationLabel} lat={lat} lon={lon} />

        <CatchFeed onSubmitClick={() => setShowSubmit(true)} />

        <Feedback />

        <footer className="footer">
          <span>Data: Open-Meteo · NOAA CO-OPS · NWS · Claude AI</span>
          <button className="btn btn-secondary" onClick={() => loadData(lon, lat, locationLabel, selectedDate, selectedTime)}><RefreshCw size={13} style={{ verticalAlign: '-2px' }} /> Refresh</button>
        </footer>
      </main>
    </div>
  );
}
