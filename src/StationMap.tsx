import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { RiverData } from './types';
import type { NearestStation } from './utils/stations';
import { UnitSystem, convDist, distLabel } from './utils/units';

interface Props {
  lat: number;
  lon: number;
  locationLabel: string;
  tideStations: NearestStation[];
  currentTideId: string | null;
  onSelectTide: (id: string) => void;
  rivers: RiverData[];
  currentRiverId: string | null;
  onSelectRiver: (siteId: string) => void;
  units: UnitSystem;
}

export default function StationMap({ lat, lon, locationLabel, tideStations, currentTideId, onSelectTide, rivers, currentRiverId, onSelectRiver, units }: Props) {
  const fmtDist = (mi: number) => `${convDist(mi, units).toFixed(1)} ${distLabel(units)}`;
  return (
    <div className="station-map-wrap">
      <MapContainer center={[lat, lon]} zoom={10} scrollWheelZoom={false} className="station-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CircleMarker center={[lat, lon]} radius={8} pathOptions={{ color: '#BA7517', fillColor: '#BA7517', fillOpacity: 0.9 }}>
          <Popup><strong>{locationLabel}</strong><br />Your spot</Popup>
        </CircleMarker>
        {tideStations.map(s => {
          const active = s.id === currentTideId;
          return (
            <CircleMarker key={`t-${s.id}`} center={[s.lat, s.lon]} radius={active ? 9 : 7} pathOptions={{ color: '#185FA5', fillColor: '#185FA5', fillOpacity: active ? 0.95 : 0.55, weight: active ? 3 : 1.5 }}>
              <Popup>
                <strong>{s.name}</strong><br />
                NOAA tide station &middot; {fmtDist(s.distanceMi)}<br />
                {active ? <em>Currently selected</em> : (
                  <button type="button" className="map-select-btn" onClick={() => onSelectTide(s.id)}>Use this station</button>
                )}
              </Popup>
            </CircleMarker>
          );
        })}
        {rivers.map(r => {
          const active = r.siteId === currentRiverId;
          return (
            <CircleMarker key={`r-${r.siteId}`} center={[r.lat, r.lon]} radius={active ? 9 : 7} pathOptions={{ color: '#1D9E75', fillColor: '#1D9E75', fillOpacity: active ? 0.95 : 0.55, weight: active ? 3 : 1.5 }}>
              <Popup>
                <strong>{r.siteName}</strong><br />
                USGS river gauge &middot; {fmtDist(r.distanceMi)}<br />
                {r.flowCfs != null && <>Flow: {Math.round(r.flowCfs).toLocaleString()} cfs<br /></>}
                {active ? <em>Currently selected</em> : (
                  <button type="button" className="map-select-btn" onClick={() => onSelectRiver(r.siteId)}>Use this gauge</button>
                )}
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
      <p className="map-legend">
        <span className="legend-dot" style={{ background: '#BA7517' }} /> Your spot
        <span className="legend-dot" style={{ background: '#185FA5' }} /> Tide stations
        <span className="legend-dot" style={{ background: '#1D9E75' }} /> River gauges
      </p>
    </div>
  );
}
