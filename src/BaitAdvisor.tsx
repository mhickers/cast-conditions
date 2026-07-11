import React, { useState, useEffect } from 'react';
import { Anchor, RefreshCw, ExternalLink } from 'lucide-react';
import type { Conditions } from './types';
import { UnitSystem, fmtWind, fmtTemp } from './utils/units';
import { API_BASE } from './utils/api';

// Normalize the model's report text into clean paragraphs: strip stray bullet/
// asterisk markers, collapse runs of blank lines, and split on blank lines so
// spacing is controlled by CSS instead of however many newlines the API returned.
function cleanAdvice(text: string): string[] {
  return text
    .replace(/\r/g, '')
    .replace(/^[\t ]*[-•*]\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .split(/\n{2,}/)
    .map(s => s.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean);
}

// A real report the search surfaced. `cited` means the model's advice actually
// leaned on it (vs. just appearing in the scan) — we mark those so the user
// can see the advice is grounded in something real.
interface Source {
  url: string;
  title: string;
  age?: string | null;
  cited?: boolean;
}

interface Props {
  locationLabel: string;
  dateStr: string;
  speciesOptions: string[];
  topSpecies: string[];
  defaultSpecies?: string | null;
  autoRunNonce?: number;
  conditions: Partial<Conditions>;
  isInland: boolean;
  waterClarity?: string;
  units: UnitSystem;
}

export default function BaitAdvisor({ locationLabel, dateStr, speciesOptions, topSpecies, defaultSpecies, autoRunNonce, conditions, isInland, waterClarity, units }: Props) {
  const [selected, setSelected] = useState('top');
  const [advice, setAdvice] = useState('');
  const [sources, setSources] = useState<Source[]>([]);
  const [scanned, setScanned] = useState(false); // a scan has completed at least once this render
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setSelected(defaultSpecies && speciesOptions.includes(defaultSpecies) ? defaultSpecies : 'top');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultSpecies]);
  useEffect(() => {
    if (!autoRunNonce) return;
    if (defaultSpecies && speciesOptions.includes(defaultSpecies)) getAdvice(defaultSpecies);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRunNonce]);


  const getAdvice = async (speciesOverride?: string) => {
    setLoading(true);
    setError('');
    setAdvice('');
    setSources([]);
    const sel = speciesOverride ?? selected;
    const speciesStr = sel === 'top' ? topSpecies.join(', ') : sel;
    const dateLabel = new Date(dateStr + 'T12:00:00').toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
    const condBits: string[] = [];
    if (conditions.conditionLabel) condBits.push(conditions.conditionLabel.toLowerCase());
    if (conditions.windMph != null) condBits.push(`${fmtWind(conditions.windMph, units)} wind`);
    if (conditions.waterTempF != null) condBits.push(`${fmtTemp(conditions.waterTempF, units)} water`);
    if (conditions.pressureMb != null) condBits.push(`${conditions.pressureMb} mb pressure`);
    if (waterClarity) condBits.push(`${waterClarity.toLowerCase()} water clarity`);

    try {
      const res = await fetch(`${API_BASE}/api/bait`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: locationLabel,
          species: speciesStr,
          dateLabel,
          conditionsSummary: condBits.join(', '),
          isInland,
          detail: sel !== 'top',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.text) throw new Error(data?.error || 'failed');
      setAdvice(data.text);
      setSources(Array.isArray(data.sources) ? data.sources : []);
      setScanned(true);
    } catch (e: any) {
      setError(e?.message === 'Too many requests — try again later'
        ? 'You\u2019ve hit the hourly limit for report scans — try again in a bit.'
        : 'Couldn\u2019t complete the report scan right now — try again in a minute.');
    }
    setLoading(false);
  };

  return (
    <section className="section">
      <h3 className="section-label">Local Bite Report</h3>
      <div className="card">
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 6px' }}>
          Scans recent local reports for what&rsquo;s biting now.
        </p>
        <p className="alert-desc">
          Blends recent public reports near <strong>{locationLabel}</strong> with seasonal patterns for this date.
          Keep it on <strong>Top species</strong> for a quick rundown, or pick one for a full breakdown.
        </p>
        <div className="add-spot-row">
          <select className="search-input" value={selected} onChange={e => setSelected(e.target.value)} aria-label="Species for bite report">
            <option value="top">Top species here ({topSpecies.slice(0, 2).join(', ')}...)</option>
            {speciesOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn" onClick={() => getAdvice()} disabled={loading}>
            {loading ? 'Scanning...' : 'Get report'}
          </button>
        </div>

        {loading && <p className="muted" style={{ marginTop: 10 }}>Scanning recent local reports — this takes 10–20 seconds...</p>}
        {error && <div className="search-error" style={{ marginTop: 10 }}>{error}</div>}

        {advice && (
          <>
            <div className="bait-advice-wrap">
              {cleanAdvice(advice).map((p, i) => <p key={i} className="bait-advice">{p}</p>)}
            </div>

            {sources.length > 0 ? (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <div className="muted" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.02em', marginBottom: 7 }}>
                  Reports scanned ({sources.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {sources.map((s, i) => (
                    <a
                      key={i}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 12.5, lineHeight: 1.4, color: 'var(--ocean)', textDecoration: 'none', display: 'flex', alignItems: 'flex-start', gap: 5, wordBreak: 'break-word' }}
                    >
                      <ExternalLink size={12} style={{ flexShrink: 0, marginTop: 2, opacity: 0.7 }} />
                      <span>
                        {s.title}
                        {s.cited && <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}> · cited</span>}
                        {s.age && <span style={{ color: 'var(--text-muted)' }}> · {s.age}</span>}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            ) : scanned ? (
              <p className="muted" style={{ marginTop: 12, fontSize: 12.5, lineHeight: 1.5 }}>
                No recent local reports surfaced for this area — this rundown leans on seasonal patterns and the current conditions, so treat it as a starting point rather than a live bite report.
              </p>
            ) : null}

            <div className="bait-footer">
              <span className="bait-source-note"><Anchor size={11} style={{ verticalAlign: '-1px' }} /> Aggregated from recent public reports + seasonal patterns — verify with your local shop.</span>
              <button className="btn btn-secondary btn-sm" onClick={() => getAdvice()}><RefreshCw size={12} style={{ verticalAlign: '-1px' }} /> Refresh</button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
