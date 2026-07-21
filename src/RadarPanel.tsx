import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Play, Pause } from 'lucide-react';
import { API_BASE } from './utils/api';

// Animated precipitation radar over the fishing spot, using RainViewer's free
// Weather Maps API (past ~2h of real radar + short nowcast forecast, refreshed
// every ~5 min). Radar TILES load direct into Leaflet (they are image tiles and
// cannot be proxied); the small timeline JSON goes through our caching proxy so
// it is ad-blocker-immune and native-webview-CORS-safe, exactly like our other
// data. Attribution to RainViewer is mandatory under the free terms and is
// rendered below the map.
//
// RainViewer tile URL shape (from their official example):
//   {host}{frame.path}/{size}/{z}/{x}/{y}/{color}/{options}.png
// color 2 = Universal Blue, options 1_1 = smooth + snow. size 256.

interface RadarFrame { time: number; path: string; }
interface Props { lat: number; lon: number; locationLabel: string; }

const RV_JSON = 'https://api.rainviewer.com/public/weather-maps.json';
const TILE_SIZE = 256;
const COLOR = 2;      // Universal Blue
const OPTIONS = '1_1'; // smooth_snow
const FRAME_MS = 500;

// Swaps the active radar tile layer as the animation advances. Keeps a small
// cache of layers so scrubbing back and forth does not re-request tiles, and
// preloads the next frame's tiles at low opacity to avoid a flash on advance.
function RadarLayers({ host, frames, index }: { host: string; frames: RadarFrame[]; index: number }) {
  const map = useMap();
  const layerCache = useRef<Map<string, any>>(new Map());
  const currentPath = useRef<string | null>(null);

  useEffect(() => {
    if (!frames.length) return;
    const frame = frames[Math.max(0, Math.min(index, frames.length - 1))];
    if (!frame) return;

    const url = `${host}${frame.path}/${TILE_SIZE}/{z}/{x}/{y}/${COLOR}/${OPTIONS}.png`;
    let layer = layerCache.current.get(frame.path);
    if (!layer) {
      layer = L.tileLayer(url, { opacity: 0, tileSize: TILE_SIZE, zIndex: 400 });
      layer.addTo(map);
      layerCache.current.set(frame.path, layer);
    }
    // Fade the chosen frame in, everything else out.
    layerCache.current.forEach((lyr, path) => {
      lyr.setOpacity(path === frame.path ? 0.7 : 0);
    });
    currentPath.current = frame.path;

    return () => { /* layers persist in cache across index changes */ };
  }, [host, frames, index, map]);

  // Full cleanup on unmount: remove every cached layer from the map.
  useEffect(() => {
    const cache = layerCache.current;
    const m = map;
    return () => { cache.forEach(lyr => { try { m.removeLayer(lyr); } catch { /* noop */ } }); cache.clear(); };
  }, [map]);

  return null;
}

export default function RadarPanel({ lat, lon, locationLabel }: Props) {
  const [host, setHost] = useState<string>('');
  const [frames, setFrames] = useState<RadarFrame[]>([]);
  const [nowIndex, setNowIndex] = useState(0); // boundary between past and nowcast
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Proxy the JSON (ad-blocker + native CORS safety); tiles stay direct.
        const res = await fetch(`${API_BASE}/api/weather?u=${encodeURIComponent(RV_JSON)}`);
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (cancelled) return;
        const past: RadarFrame[] = data?.radar?.past ?? [];
        const nowcast: RadarFrame[] = data?.radar?.nowcast ?? [];
        const all = [...past, ...nowcast];
        if (!data?.host || !all.length) throw new Error('no frames');
        setHost(data.host);
        setFrames(all);
        setNowIndex(Math.max(0, past.length - 1));
        setIndex(Math.max(0, past.length - 1)); // start at "now"
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!playing || status !== 'ready' || frames.length < 2) return;
    timer.current = setInterval(() => {
      setIndex(i => (i + 1) % frames.length);
    }, FRAME_MS);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [playing, status, frames.length]);

  const activeFrame = frames[index];
  const label = useMemo(() => {
    if (!activeFrame) return '';
    const d = new Date(activeFrame.time * 1000);
    const t = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (index > nowIndex) return `${t} · forecast`;
    if (index === nowIndex) return `${t} · now`;
    return t;
  }, [activeFrame, index, nowIndex]);

  if (status === 'error') {
    return <p className="muted" style={{ padding: '0.5rem 0' }}>Radar is unavailable right now. It updates every few minutes — try again shortly.</p>;
  }

  return (
    <div className="radar-wrap">
      <div className="radar-map-wrap">
        <MapContainer center={[lat, lon]} zoom={8} scrollWheelZoom={false} className="radar-map">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {status === 'ready' && host && <RadarLayers host={host} frames={frames} index={index} />}
          <CircleMarker center={[lat, lon]} radius={7} pathOptions={{ color: '#BA7517', fillColor: '#BA7517', fillOpacity: 0.9, weight: 2 }} />
        </MapContainer>
      </div>

      <div className="radar-controls">
        <button
          type="button"
          className="radar-play"
          onClick={() => setPlaying(p => !p)}
          aria-label={playing ? 'Pause radar animation' : 'Play radar animation'}
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <input
          type="range"
          className="radar-scrubber"
          min={0}
          max={Math.max(0, frames.length - 1)}
          value={index}
          onChange={e => { setPlaying(false); setIndex(parseInt(e.target.value, 10)); }}
          aria-label="Radar time"
          disabled={status !== 'ready'}
        />
        <span className="radar-time">{status === 'loading' ? 'Loading…' : label}</span>
      </div>

      <p className="radar-credit">
        Radar: <a href="https://www.rainviewer.com/" target="_blank" rel="noopener noreferrer">RainViewer</a> · showing {locationLabel}
      </p>
    </div>
  );
}
