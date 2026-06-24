import React, { useState } from 'react';
import { BookOpen, Trash2, Plus } from 'lucide-react';
import type { Conditions } from './types';
import { UnitSystem, fmtWind, fmtTemp } from './utils/units';

interface LogEntry {
  id: string;
  loggedAt: string;
  species: string;
  notes: string;
  location: string;
  snapshot: {
    windMph: number | null;
    airTempF: number | null;
    waterTempF: number | null;
    pressureMb: number | null;
    waveFt: number | null;
    tideDirection: string | null;
    moonName: string;
    score: number;
    conditionLabel: string | null;
  };
}

interface Props {
  speciesOptions: string[];
  locationLabel: string;
  conditions: Partial<Conditions>;
  score: number;
  moonName: string;
  units: UnitSystem;
}

const LOG_KEY = 'personalCatchLog';

export default function CatchLog({ speciesOptions, locationLabel, conditions, score, moonName, units }: Props) {
  const [entries, setEntries] = useState<LogEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch { return []; }
  });
  const [showForm, setShowForm] = useState(false);
  const [species, setSpecies] = useState('');
  const [notes, setNotes] = useState('');

  const save = (next: LogEntry[]) => {
    setEntries(next);
    try { localStorage.setItem(LOG_KEY, JSON.stringify(next)); } catch {}
  };

  const logCatch = () => {
    if (!species) return;
    const entry: LogEntry = {
      id: Date.now().toString(),
      loggedAt: new Date().toISOString(),
      species,
      notes: notes.trim(),
      location: locationLabel,
      snapshot: {
        windMph: conditions.windMph != null ? Math.round(conditions.windMph) : null,
        airTempF: conditions.airTempF ?? null,
        waterTempF: conditions.waterTempF != null ? Math.round(conditions.waterTempF) : null,
        pressureMb: conditions.pressureMb ?? null,
        waveFt: conditions.waveFt ?? null,
        tideDirection: conditions.tideDirection ?? null,
        moonName,
        score,
        conditionLabel: conditions.conditionLabel ?? null,
      },
    };
    save([entry, ...entries]);
    setSpecies(''); setNotes(''); setShowForm(false);
  };

  const deleteEntry = (id: string) => save(entries.filter(e => e.id !== id));

  // Simple pattern insights once there's enough history
  const insights = (() => {
    if (entries.length < 3) return null;
    const withTide = entries.filter(e => e.snapshot.tideDirection);
    const rising = withTide.filter(e => e.snapshot.tideDirection === 'rising').length;
    const avgScore = entries.reduce((s, e) => s + (e.snapshot.score || 0), 0) / entries.length;
    const counts: Record<string, number> = {};
    entries.forEach(e => { counts[e.species] = (counts[e.species] || 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    const bits: string[] = [];
    if (withTide.length >= 3) bits.push(`${rising} of ${withTide.length} catches came on a rising tide`);
    bits.push(`your average catch-day score is ${avgScore.toFixed(1)}/10`);
    if (top) bits.push(`${top[0].toLowerCase()} is your most-logged species (${top[1]})`);
    return bits.join(' · ');
  })();

  const fmtSnapshot = (s: LogEntry['snapshot']) => {
    const bits: string[] = [];
    if (s.conditionLabel) bits.push(s.conditionLabel);
    if (s.windMph != null) bits.push(`${fmtWind(s.windMph, units)} wind`);
    if (s.waterTempF != null) bits.push(`${fmtTemp(s.waterTempF, units)} water`);
    if (s.tideDirection) bits.push(`${s.tideDirection} tide`);
    bits.push(s.moonName.toLowerCase());
    bits.push(`score ${s.score}/10`);
    return bits.join(' · ');
  };

  return (
    <section className="section">
      <h3 className="section-label">My catch log <span className="log-private-tag">private — saved on this device</span></h3>
      <div className="card">
        {insights && <p className="log-insights">📈 {insights}</p>}

        {entries.length === 0 && !showForm && (
          <p className="muted" style={{ padding: '4px 0 10px' }}>
            Log your catches and the app snapshots the exact conditions — over time you'll see what works for you.
          </p>
        )}

        {!showForm && (
          <button className="btn" onClick={() => setShowForm(true)}>
            <Plus size={14} style={{ verticalAlign: '-2px' }} /> Log a catch at {locationLabel}
          </button>
        )}

        {showForm && (
          <div className="log-form">
            <select className="search-input" value={species} onChange={e => setSpecies(e.target.value)} aria-label="Species caught">
              <option value="">What did you catch?</option>
              {speciesOptions.map(s => <option key={s} value={s}>{s}</option>)}
              <option value="Other">Other</option>
            </select>
            <input
              className="search-input"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notes — bait used, size, spot details (optional)"
              aria-label="Catch notes"
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={logCatch} disabled={!species}>Save with current conditions</button>
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        {entries.length > 0 && (
          <div className="log-list">
            {entries.slice(0, 20).map(e => (
              <div key={e.id} className="log-entry">
                <div className="log-entry-head">
                  <BookOpen size={14} className="log-icon" />
                  <strong>{e.species}</strong>
                  <span className="log-meta">{e.location} · {new Date(e.loggedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                  <button className="btn-ghost" onClick={() => deleteEntry(e.id)} aria-label="Delete entry"><Trash2 size={14} /></button>
                </div>
                {e.notes && <div className="log-notes">{e.notes}</div>}
                <div className="log-snapshot">{fmtSnapshot(e.snapshot)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
