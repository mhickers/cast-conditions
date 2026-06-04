import React, { useState, useEffect, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Tooltip, Filler,
} from 'chart.js';
import type { Conditions, TidePrediction, HourlyForecast, SavedSpot } from './types';
import { getMoonPhase, calcFishingScore, calcSpecies, scoreColor } from './utils/fishing';
import { geocodeLocation, fetchWeather, fetchWaterTemp, fetchTides, fetchAISummary } from './utils/api';
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

export default function App() {
  const [lat, setLat] = useState(39.3298);
  const [lon, setLon] = useState(-74.5021);
  const [locationLabel, setLocationLabel] = useState('Margate City, NJ');
  const [searchInput, setSearchInput] = useState('Margate City, NJ');
  const [conditions, setConditions] = useState<Partial<Conditions>>({});
  const [tides, setTides] = useState<TidePrediction[]>([]);
  const [hourly, setHourly] = useState<HourlyForecast | null>(null);
  const [aiSummary, setAiSummary] = useState('Analyzing conditions...');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [spots, setSpots] = useState<SavedSpot[]>(() => {
    try { return JSON.parse(localStorage.getItem('castSpots') || '[]'); } catch { return []; }
  });
  const [spotName, setSpotName] = useState('');

  const moon = getMoonPhase();
  const { score, tips, label: scoreLabel } = calcFishingScore(conditions);
  const { bg: scoreBg, text: scoreText } = scoreColor(score);
  const species = calcSpecies(conditions);

  const loadData = useCallback(async (lo: number, la: number, lbl: string) => {
    setLoading(true);
    setAiSummary('Analyzing conditions with AI...');
    try {
      const [weather, waterTemp, tidePreds] = await Promise.all([
        fetchWeather(la, lo),
        fetchWaterTemp(),
        fetchTides(),
      ]);
      const conds: Partial<Conditions> = { ...weather.conditions, waterTempF: waterTemp };
      const now = Date.now();
      for (let i = 0; i < tidePreds.length - 1; i++) {
        const t1 = new Date(tidePreds[i].t).getTime();
        const t2 = new Date(tidePreds[i + 1].t).getTime();
        if (now >= t1 && now <= t2) {
          const frac = (now - t1) / (t2 - t1);
          conds.tideNow = parseFloat(tidePreds[i].v) + frac * (parseFloat(tidePreds[i + 1].v) - parseFloat(tidePreds[i].v));
          conds.tideDirection = parseFloat(tidePreds[i + 1].v) > parseFloat(tidePreds[i].v) ? 'rising' : 'falling';
          break;
        }
      }
      setConditions(conds);
      setTides(tidePreds);
      setHourly(weather.hourly);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      const { score: sc } = calcFishingScore(conds);
      const summary = await fetchAISummary(conds, moon.name, moon.illum, sc, lbl);
      setAiSummary(summary);
    } catch {
      setAiSummary('Unable to load conditions. Check your connection and try again.');
    }
    setLoading(false);
  }, [moon.name, moon.illum]);

  useEffect(() => { loadData(lon, lat, locationLabel); }, []); // eslint-disable-line

  const handleSearch = async () => {
    const geo = await geocodeLocation(searchInput);
    if (geo) {
      setLat(geo.lat); setLon(geo.lon); setLocationLabel(geo.label);
      setSearchInput(geo.label);
      loadData(geo.lon, geo.lat, geo.label);
    }
  };

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

  const loadSpot = (s: SavedSpot) => {
    setLat(s.lat); setLon(s.lon); setLocationLabel(s.label); setSearchInput(s.label);
    loadData(s.lon, s.lat, s.label);
  };

  const tideChartData = {
    labels: tides.map(p => new Date(p.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
    datasets: [{
      label: 'Tide (ft)',
      data: tides.map(p => parseFloat(p.v)),
      borderColor: '#185FA5',
      backgroundColor: 'rgba(55,138,221,0.15)',
      fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#185FA5',
    }],
  };
  const tideChartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: any) => `${ctx.parsed.y.toFixed(1)} ft` } } },
    scales: {
      x: { ticks: { font: { size: 11 }, maxRotation: 45, autoSkip: true, maxTicksLimit: 8 }, grid: { display: false } },
      y: { ticks: { font: { size: 11 }, callback: (v: any) => v.toFixed(1) + ' ft' }, grid: { color: 'rgba(128,128,128,0.1)' } },
    },
  };

  const forecastSlots = (() => {
    if (!hourly) return [];
    const now = new Date();
    const slots: { time: Date; wind: number; dir: number; wave: number | null }[] = [];
    for (let i = 0; i < hourly.time.length && slots.length < 12; i++) {
      const t = new Date(hourly.time[i]);
      if (t >= now) slots.push({ time: t, wind: Math.round(hourly.wind_speed_10m[i]), dir: Math.round(hourly.wind_direction_10m[i]), wave: hourly.wave_height ? hourly.wave_height[i] : null });
    }
    return slots;
  })();

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">⚓</span>
            <span className="logo-text">Cast Conditions</span>
          </div>
          <div className="header-right">
            {lastUpdated && <span className="updated-txt">Updated {lastUpdated} · {locationLabel}</span>}
            <button className="btn-icon" onClick={() => loadData(lon, lat, locationLabel)} title="Refresh">↻</button>
          </div>
        </div>
      </header>

      <main className="main">
        <section className="section">
          <div className="search-row">
            <input className="search-input" value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} placeholder="Enter city or coastal spot..." aria-label="Location search" />
            <button className="btn" onClick={handleSearch}>Search</button>
            <button className="btn btn-secondary" onClick={saveSpot}>♡ Save spot</button>
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
              <p className="score-tips">{loading ? `Fetching live data for ${locationLabel}` : tips.length ? `Factors: ${tips.join(', ')}.` : 'Based on current conditions.'}</p>
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
          <h3 className="section-label">Atmosphere</h3>
          <div className="stat-grid-4">
            <StatCard icon="💨" value={conditions.windMph ? Math.round(conditions.windMph).toString() : '--'} unit="mph" label="Wind speed" />
            <StatCard icon="🧭" value={conditions.windDir ?? '--'} unit="" label="Wind direction" />
            <StatCard icon="🌡️" value={conditions.airTempF?.toString() ?? '--'} unit="°F" label="Air temp" />
            <StatCard icon="📊" value={conditions.pressureMb?.toString() ?? '--'} unit="mb" label="Barometric" />
          </div>
        </section>

        <section className="section">
          <h3 className="section-label">Water conditions</h3>
          <div className="stat-grid-4">
            <StatCard icon="🌊" value={conditions.waterTempF?.toFixed(1) ?? '--'} unit="°F" label="Water temp" />
            <StatCard icon="〰️" value={conditions.waveFt?.toFixed(1) ?? '--'} unit="ft" label="Wave height" />
            <StatCard icon="⏱️" value={conditions.wavePeriod?.toString() ?? '--'} unit="sec" label="Wave period" />
            <StatCard icon="↕️" value={conditions.tideNow != null ? conditions.tideNow.toFixed(1) : '--'} unit={conditions.tideDirection ? `ft · ${conditions.tideDirection}` : 'ft'} label="Tide now" />
          </div>
        </section>

        <section className="section">
          <h3 className="section-label">24-hour forecast</h3>
          <div className="forecast-scroll">
            {forecastSlots.map((s, i) => (
              <div key={i} className="fc-card">
                <div className="fc-time">{s.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                <div className="fc-icon">💨</div>
                <div className="fc-val">{s.wind} mph</div>
                <div className="fc-sub">{s.dir}°</div>
                {s.wave != null && <div className="fc-sub">{s.wave.toFixed(1)} ft</div>}
              </div>
            ))}
            {forecastSlots.length === 0 && <span className="muted">Loading forecast...</span>}
          </div>
        </section>

        <section className="section">
          <h3 className="section-label">Tide chart — today</h3>
          <div className="chart-wrap">
            {tides.length > 0
              ? <Line data={tideChartData} options={tideChartOpts as any} aria-label="Tide height chart for today" />
              : <div className="muted" style={{ padding: '2rem 0' }}>Loading tide data...</div>}
          </div>
        </section>

        <div className="two-col">
          <section className="section">
            <h3 className="section-label">Today's tide events</h3>
            <div className="card">
              {tides.length > 0 ? tides.slice(0, 4).map((p, i) => {
                const isH = p.type === 'H';
                const t = new Date(p.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={i} className="tide-row">
                    <span className="tide-type">{isH ? '▲' : '▼'} {isH ? 'High' : 'Low'}</span>
                    <span className="tide-time">{t}</span>
                    <span className="tide-ht">{parseFloat(p.v).toFixed(1)} ft</span>
                  </div>
                );
              }) : <span className="muted">Loading...</span>}
            </div>
          </section>
          <section className="section">
            <h3 className="section-label">Moon phase</h3>
            <div className="card moon-card">
              <MoonSVG phase={moon.phase} />
              <div>
                <div className="moon-name">{moon.name}</div>
                <div className="moon-desc">{moon.desc}</div>
                <div className="moon-illum">{moon.illum}% illuminated</div>
              </div>
            </div>
          </section>
        </div>

        <section className="section">
          <h3 className="section-label">Species bite forecast</h3>
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
                </div>
              );
            })}
          </div>
        </section>

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

        <footer className="footer">
          <span>Data: Open-Meteo · NOAA CO-OPS · Claude AI</span>
          <button className="btn btn-secondary" onClick={() => loadData(lon, lat, locationLabel)}>↻ Refresh</button>
        </footer>
      </main>
    </div>
  );
}
