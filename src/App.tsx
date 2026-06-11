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
import type { Conditions, TideData, HourlyForecast, SavedSpot } from './types';
import { getMoonPhase, calcFishingScore, scoreColor, getSolunarPeriods, degToCompass } from './utils/fishing';
import { fetchWeather, fetchWaterTemp, fetchTides, fetchAISummary, weatherCodeToCondition } from './utils/api';
import { resolveLocation, suggestLocations, reverseGeocode, GeoResult } from './utils/geocode';
import { crossCheckWeather } from './utils/crosscheck';
import { findNearestStation, NearestStation } from './utils/stations';
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

function StatCard({ icon, value, unit, label }: { icon: string; value: string; unit: string; label: string }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-val">{value}</div>
      <div className="stat-unit">{unit}</div>
      <div className="stat-label">{label}</div>
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
    const t = new Date().toISOString().slice(0, 10);
    const max = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); })();
    return /^\d{4}-\d{2}-\d{2}$/.test(pDate) && pDate >= t && pDate <= max ? pDate : t;
  });
  const [selectedTime, setSelectedTime] = useState<'now' | number>(() =>
    /^\d{4}-\d{2}-\d{2}$/.test(pDate) && pDate !== new Date().toISOString().slice(0, 10) ? 12 : 'now'
  );
  const [tideStation, setTideStation] = useState<NearestStation | null>(null);
  const [stationChecked, setStationChecked] = useState(false);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewIsNow = useRef(true);
  const loadSeq = useRef(0);
  const isAdmin = window.location.pathname === '/admin';

  const todayStr = new Date().toISOString().slice(0, 10);
  const maxDateStr = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); })();
  const isToday = selectedDate === todayStr;
  const isNow = isToday && selectedTime === 'now';
  const fmtHour = (hh: number) => new Date(2000, 0, 1, hh).toLocaleTimeString([], { hour: 'numeric' });
  const dateShort = new Date(selectedDate + 'T12:00:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const timeContext = isNow ? '' : ` — ${isToday ? 'today' : dateShort}, ${fmtHour(selectedTime === 'now' ? 12 : selectedTime)}`;

  const isInland = stationChecked && !tideStation;
  const moon = getMoonPhase(new Date(selectedDate + 'T12:00:00'));
  const solunar = getSolunarPeriods(new Date(selectedDate + 'T12:00:00'));
  const { score, label: scoreLabel } = calcFishingScore(conditions);
  const { bg: scoreBg, text: scoreText } = scoreColor(score);
  const species = getSpeciesForLocation(
    lat, lon, conditions.waterTempF ?? null, conditions.windMph ?? 10,
    conditions.waveFt ?? 2, conditions.pressureMb ?? 1013,
    conditions.tideDirection ?? null, moon.phase, isInland
  );
  const scoreNarrative = buildScoreNarrative(
    lat, lon, conditions.waterTempF ?? null, conditions.windMph ?? 10,
    conditions.waveFt ?? 2, conditions.pressureMb ?? 1013, moon.phase, isInland
  );

  // ---- Data loading: progressive (weather renders first, the rest streams in) ----
  const loadData = useCallback(async (lo: number, la: number, lbl: string, dateStr: string, time: 'now' | number) => {
    const seq = ++loadSeq.current;
    viewIsNow.current = time === 'now';
    setLoading(true);
    setTideLoading(true);
    setSearchError('');
    setAiSummary('Analyzing conditions with AI...');
    try {
      const hour = time === 'now' ? null : time;
      const stationsP = Promise.all([
        findNearestStation(la, lo, 'tidepredictions'),
        findNearestStation(la, lo, 'watertemp', 150),
      ]);

      // 1. Weather first — fastest call, gets the page on screen
      const weather = await fetchWeather(la, lo, dateStr, hour);
      if (seq !== loadSeq.current) return;
      let conds: Partial<Conditions> = { ...weather.conditions, sourcesUsed: 1, verified: false };
      setConditions(conds);
      setHourly(weather.hourly);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setLoading(false);

      // 2. Stations, tides, water temp stream in next
      const [tideSt, tempSt] = await stationsP;
      if (seq !== loadSeq.current) return;
      setTideStation(tideSt);
      setStationChecked(true);
      const [waterTemp, tideData] = await Promise.all([
        tempSt ? fetchWaterTemp(tempSt.id) : Promise.resolve(null),
        tideSt ? fetchTides(dateStr, tideSt.id) : Promise.resolve({ events: [], curve: [] } as TideData),
      ]);
      if (seq !== loadSeq.current) return;

      const refTime = time === 'now' && dateStr === new Date().toISOString().slice(0, 10)
        ? Date.now()
        : new Date(`${dateStr}T${String(time === 'now' ? 12 : time).padStart(2, '0')}:00:00`).getTime();
      const tide = tideAt(tideData.curve, refTime);
      conds = { ...conds, waterTempF: waterTemp, tideNow: tide?.v ?? null, tideDirection: tide?.dir ?? null };
      setConditions(conds);
      setTides(tideData);
      setTideLoading(false);

      // 3. AI summary in the background — never blocks the page
      const dayMoon = getMoonPhase(new Date(dateStr + 'T12:00:00'));
      const { score: sc } = calcFishingScore(conds);
      fetchAISummary(conds, dayMoon.name, dayMoon.illum, sc, lbl, dateStr).then(s => {
        if (seq === loadSeq.current) setAiSummary(s);
      });

      // 4. NWS cross-check in the background — updates the badge when done
      if (dateStr === new Date().toISOString().slice(0, 10) && time === 'now') {
        crossCheckWeather(la, lo, conds.windMph ?? 0, conds.airTempF ?? 0).then(check => {
          if (seq === loadSeq.current && viewIsNow.current) {
            setConditions(c => ({ ...c, windMph: check.windMph, airTempF: check.airTempF, sourcesUsed: check.sourcesUsed, verified: check.verified }));
          }
        });
      }
    } catch {
      if (seq === loadSeq.current) {
        setLoading(false);
        setTideLoading(false);
        setSearchError('Unable to load conditions. Check your connection and try again.');
        setAiSummary('Unable to load conditions.');
      }
    }
  }, []);

  useEffect(() => { loadData(lon, lat, locationLabel, selectedDate, selectedTime); }, []); // eslint-disable-line

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
      verified: false,
      sourcesUsed: 1,
    }));
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
    else setSearchError(`Couldn't find "${searchInput}" — try a city name, zip code, or coordinates like 39.33, -74.50`);
  };

  const shareConditions = async () => {
    const params = new URLSearchParams({
      lat: lat.toFixed(4), lon: lon.toFixed(4), label: locationLabel, date: selectedDate,
    });
    const url = `${window.location.origin}/?${params.toString()}`;
    const text = `Fishing conditions for ${locationLabel}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Fish Conditions', text, url }); return; } catch {}
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareMsg('Link copied!');
      setTimeout(() => setShareMsg(''), 2500);
    } catch { setShareMsg(url); }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) { setSearchError('Location access is not supported by this browser.'); return; }
    setSearchError('');
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const la = pos.coords.latitude, lo = pos.coords.longitude;
        const lbl = await reverseGeocode(la, lo);
        goToLocation(la, lo, lbl);
      },
      () => setSearchError('Location access was denied — you can still search by city or zip.')
    );
  };

  // ---- Saved spots ----
  const saveSpot = () => {
    const newSpots = [...spots, { id: Date.now().toString(), label: locationLabel, lat, lon }];
    setSpots(newSpots);
    localStorage.setItem('castSpots', JSON.stringify(newSpots));
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
    return Array.from({ length: Math.min(24, hourly.time.length) }, (_, hh) => {
      const refTime = new Date(`${selectedDate}T${String(hh).padStart(2, '0')}:00:00`).getTime();
      const tide = tideAt(tides.curve, refTime);
      const { score: s } = calcFishingScore({
        windMph: hourly.wind_speed_10m[hh],
        waveFt: hourly.wave_height?.[hh] ?? undefined,
        pressureMb: hourly.surface_pressure?.[hh] ?? undefined,
        waterTempF: conditions.waterTempF ?? null,
        tideDirection: tide?.dir ?? null,
      } as Partial<Conditions>);
      return s;
    });
  }, [hourly, tides, conditions.waterTempF, selectedDate]);

  const bestWindow = useMemo(() => {
    if (hourlyScores.length < 3) return null;
    let bestStart = 0, bestAvg = -1;
    for (let i = 0; i <= hourlyScores.length - 3; i++) {
      const avg = (hourlyScores[i] + hourlyScores[i + 1] + hourlyScores[i + 2]) / 3;
      if (avg > bestAvg) { bestAvg = avg; bestStart = i; }
    }
    return { start: bestStart, end: bestStart + 3, avg: bestAvg };
  }, [hourlyScores]);

  const timelineColor = (s: number) =>
    s >= 7.5 ? '#1D9E75' : s >= 5.5 ? '#378ADD' : s >= 3.5 ? '#EF9F27' : '#E24B4A';

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
    const slots: { time: Date; wind: number; dir: string; temp: number | null; wave: number | null; icon: string; precip: number | null }[] = [];
    const startIdx = isToday
      ? hourly.time.findIndex(t => new Date(t) >= new Date())
      : 5;
    const step = isToday ? 1 : 2;
    for (let i = Math.max(0, startIdx); i < hourly.time.length && slots.length < 12; i += step) {
      const wc = weatherCodeToCondition(hourly.weather_code?.[i] ?? 0);
      slots.push({
        time: new Date(hourly.time[i]),
        wind: Math.round(hourly.wind_speed_10m[i]),
        dir: degToCompass(hourly.wind_direction_10m[i] ?? 0),
        temp: hourly.temperature_2m ? Math.round(hourly.temperature_2m[i]) : null,
        wave: hourly.wave_height ? hourly.wave_height[i] : null,
        icon: wc.icon,
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
            <span className="logo-text">Fish Conditions</span>
          </div>
          <div className="header-right">
            {lastUpdated && <span className="updated-txt">Updated {lastUpdated} · {locationLabel}</span>}
            <button className="btn-icon" onClick={() => setShowAbout(true)} title="About">?</button>
            <button className="btn-icon" onClick={() => loadData(lon, lat, locationLabel, selectedDate, selectedTime)} title="Refresh">↻</button>
          </div>
        </div>
      </header>

      <main className="main">
        <section className="section">
          <div className="search-row">
            <input
              className="search-input"
              list="loc-suggestions"
              value={searchInput}
              onChange={e => handleSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="City, zip code, or GPS coordinates"
              aria-label="Location search"
            />
            <datalist id="loc-suggestions">
              {suggestions.map(s => <option key={s.label} value={s.label} />)}
            </datalist>
            <button className="btn btn-secondary" onClick={useMyLocation} title="Use my location">📍</button>
            <button className="btn" onClick={handleSearch}>Search</button>
            <button className="btn btn-secondary" onClick={saveSpot}>♡ Save spot</button>
            <button className="btn btn-secondary" onClick={shareConditions}>↗ Share</button>
          </div>
          {shareMsg && <div className="share-msg">{shareMsg}</div>}
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
                {!loading && conditions.verified && <span className="verified-badge" title="Wind and temperature cross-checked against the National Weather Service">✓ Multi-source verified</span>}
              </p>
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
                  style={{ background: timelineColor(s) }}
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
          <div className="ai-card">
            <div className="ai-header">✦ AI fishing guide</div>
            <p className="ai-text">{aiSummary}</p>
          </div>
        </section>

        <section className="section">
          <h3 className="section-label">Atmosphere{timeContext}</h3>
          <div className="stat-grid-5">
            <StatCard icon={conditions.conditionIcon ?? '🌤️'} value={conditions.conditionLabel ?? '--'} unit={conditions.precipChance != null ? `${conditions.precipChance}% rain` : ''} label="Conditions" />
            <StatCard icon="💨" value={conditions.windMph ? Math.round(conditions.windMph).toString() : '--'} unit="mph" label="Wind speed" />
            <StatCard icon="🧭" value={conditions.windDir ?? '--'} unit="" label="Wind direction" />
            <StatCard icon="🌡️" value={conditions.airTempF?.toString() ?? '--'} unit="°F" label="Air temp" />
            <StatCard icon="📊" value={conditions.pressureMb?.toString() ?? '--'} unit="mb" label="Barometric" />
          </div>
        </section>

        {!isInland && (
          <section className="section">
            <h3 className="section-label">Water conditions{timeContext}</h3>
            <div className="stat-grid-4">
              <StatCard icon="🌊" value={conditions.waterTempF?.toFixed(1) ?? '--'} unit="°F" label={isNow ? 'Water temp' : 'Water temp (latest reading)'} />
              <StatCard icon="〰️" value={conditions.waveFt?.toFixed(1) ?? '--'} unit="ft" label="Wave height" />
              <StatCard icon="⏱️" value={conditions.wavePeriod?.toString() ?? '--'} unit="sec" label="Wave period" />
              <StatCard icon="↕️" value={conditions.tideNow != null ? conditions.tideNow.toFixed(1) : '--'} unit={conditions.tideDirection ? `ft · ${conditions.tideDirection}` : 'ft'} label={isNow ? 'Tide now' : `Tide at ${fmtHour(selectedTime === 'now' ? 12 : selectedTime)}`} />
            </div>
          </section>
        )}

        <section className="section">
          <h3 className="section-label">{isToday ? '24-hour forecast' : `Hourly forecast — ${dateShort}`}</h3>
          <div className="forecast-scroll">
            {forecastSlots.map((s, i) => (
              <div key={i} className="fc-card">
                <div className="fc-time">{s.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                <div className="fc-icon">{s.icon}</div>
                {s.precip != null && s.precip > 0 && <div className="fc-precip">💧 {s.precip}%</div>}
                {s.temp != null && <div className="fc-val">{s.temp}°F</div>}
                <div className="fc-sub">💨 {s.wind} mph {s.dir}</div>
                {s.wave != null && <div className="fc-sub">〰️ {s.wave.toFixed(1)} ft</div>}
              </div>
            ))}
            {forecastSlots.length === 0 && <span className="muted">Loading forecast...</span>}
          </div>
        </section>

        {!isInland && (
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
            {tideStation && <p className="station-note">Tide data from NOAA station: {tideStation.name} ({tideStation.distanceMi} mi away)</p>}
          </section>
        )}

        <div className="two-col">
          {!isInland && (
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
            </section>
          )}
          <section className="section" style={isInland ? { gridColumn: '1 / -1' } : undefined}>
            <h3 className="section-label">Sun & moon</h3>
            <div className="card">
              <div className="sun-row">
                <div className="sun-item">
                  <span className="sun-icon">🌅</span>
                  <div>
                    <div className="sun-time">{conditions.sunrise ? new Date(conditions.sunrise).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</div>
                    <div className="sun-label">Sunrise</div>
                  </div>
                </div>
                <div className="sun-item">
                  <span className="sun-icon">🌇</span>
                  <div>
                    <div className="sun-time">{conditions.sunset ? new Date(conditions.sunset).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</div>
                    <div className="sun-label">Sunset</div>
                  </div>
                </div>
              </div>
              <div className="moon-card" style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
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
          </section>
        </div>

        <section className="section">
          <h3 className="section-label">Species bite forecast — {locationLabel}{isInland ? ' (freshwater)' : ''}</h3>
          <div className="species-grid">
            {species.map((sp, i) => {
              const color = sp.biteScore > 70 ? '#1D9E75' : sp.biteScore > 45 ? '#185FA5' : '#888780';
              return (
                <div key={i} className="species-card">
                  <div className="species-header">
                    <span className="species-icon">{sp.icon}</span>
                    <span className="species-name">{sp.name}</span>
                    <span className="bite-label" style={{ color }}>{sp.biteLabel}</span>
                  </div>
                  <div className="bite-bar-wrap">
                    <div className="bite-bar" style={{ width: `${sp.biteScore}%`, background: color }} />
                  </div>
                  <p className="species-tip">{sp.tip}</p>
                  <p className="species-lures">🪝 {sp.lures}</p>
                </div>
              );
            })}
          </div>
        </section>

        <BaitAdvisor
          locationLabel={locationLabel}
          dateStr={selectedDate}
          topSpecies={[...species].sort((a, b) => b.biteScore - a.biteScore).slice(0, 3).map(s => s.name)}
          waterTempF={conditions.waterTempF ?? null}
          isInland={isInland}
        />

        <section className="section">
          <h3 className="section-label">Saved spots</h3>
          <div className="card">
            {spots.length === 0 && <p className="muted" style={{ padding: '4px 0 8px' }}>No saved spots yet. Search a location and click "Save spot".</p>}
            {spots.map(s => (
              <div key={s.id} className="spot-row">
                <span className="spot-pin">📍</span>
                <span className="spot-name">{s.label}</span>
                <button className="btn btn-sm" onClick={() => loadSpot(s)}>Load</button>
                <button className="btn-ghost" onClick={() => deleteSpot(s.id)} aria-label={`Delete ${s.label}`}>🗑</button>
              </div>
            ))}
            <div className="add-spot-row">
              <input className="search-input" value={spotName} onChange={e => setSpotName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNamedSpot()} placeholder="Custom spot name..." aria-label="Spot name" />
              <button className="btn" onClick={addNamedSpot}>+ Add</button>
            </div>
          </div>
        </section>

        <AlertSignup locationLabel={locationLabel} lat={lat} lon={lon} />

        <Feedback />

        <CatchFeed onSubmitClick={() => setShowSubmit(true)} />

        <footer className="footer">
          <span>Data: Open-Meteo · NOAA CO-OPS · NWS · Claude AI</span>
          <button className="btn btn-secondary" onClick={() => loadData(lon, lat, locationLabel, selectedDate, selectedTime)}>↻ Refresh</button>
        </footer>
      </main>
    </div>
  );
}
