import React, { useState } from 'react';
import { Anchor, RefreshCw } from 'lucide-react';
import type { Conditions } from './types';

interface Props {
  locationLabel: string;
  dateStr: string;
  speciesOptions: string[];
  topSpecies: string[];
  conditions: Partial<Conditions>;
  isInland: boolean;
  waterClarity?: string;
}

export default function BaitAdvisor({ locationLabel, dateStr, speciesOptions, topSpecies, conditions, isInland, waterClarity }: Props) {
  const [selected, setSelected] = useState('top');
  const [advice, setAdvice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getAdvice = async () => {
    setLoading(true);
    setError('');
    setAdvice('');
    const speciesStr = selected === 'top' ? topSpecies.join(', ') : selected;
    const dateLabel = new Date(dateStr + 'T12:00:00').toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
    const condBits: string[] = [];
    if (conditions.conditionLabel) condBits.push(conditions.conditionLabel.toLowerCase());
    if (conditions.windMph != null) condBits.push(`${Math.round(conditions.windMph)} mph wind`);
    if (conditions.waterTempF != null) condBits.push(`${conditions.waterTempF.toFixed(0)}°F water`);
    if (conditions.pressureMb != null) condBits.push(`${conditions.pressureMb} mb pressure`);
    if (waterClarity) condBits.push(`${waterClarity.toLowerCase()} water clarity`);

    try {
      const res = await fetch('/api/bait', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: locationLabel,
          species: speciesStr,
          dateLabel,
          conditionsSummary: condBits.join(', '),
          isInland,
          detail: selected !== 'top',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.text) throw new Error(data?.error || 'failed');
      setAdvice(data.text);
    } catch (e: any) {
      setError(e?.message === 'Too many requests — try again later'
        ? 'You\u2019ve hit the hourly limit for report scans — try again in a bit.'
        : 'Couldn\u2019t complete the report scan right now — try again in a minute.');
    }
    setLoading(false);
  };

  return (
    <section className="section">
      <h3 className="section-label">Bait & lure advisor</h3>
      <div className="card">
        <p className="alert-desc">
          Scans recent public fishing reports near <strong>{locationLabel}</strong> — bait shop report pages,
          regional report sites, and forums — and blends them with seasonal patterns for this date.
          Leave it on <strong>Top species</strong> for a quick rundown, or pick one species for a full breakdown of baits, lures, technique, where to fish, and timing.
        </p>
        <div className="add-spot-row">
          <select className="search-input" value={selected} onChange={e => setSelected(e.target.value)} aria-label="Species for bait advice">
            <option value="top">Top species here ({topSpecies.slice(0, 2).join(', ')}...)</option>
            {speciesOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn" onClick={getAdvice} disabled={loading}>
            {loading ? 'Scanning...' : 'Get suggestions'}
          </button>
        </div>

        {loading && <p className="muted" style={{ marginTop: 10 }}>Scanning recent local reports — this takes 10–20 seconds...</p>}
        {error && <div className="search-error" style={{ marginTop: 10 }}>{error}</div>}

        {advice && (
          <>
            <p className="bait-advice" style={{ marginTop: 12 }}>{advice}</p>
            <div className="bait-footer">
              <span className="bait-source-note"><Anchor size={11} style={{ verticalAlign: '-1px' }} /> Aggregated from recent public reports + seasonal patterns — verify with your local shop.</span>
              <button className="btn btn-secondary btn-sm" onClick={getAdvice}><RefreshCw size={12} style={{ verticalAlign: '-1px' }} /> Refresh</button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
