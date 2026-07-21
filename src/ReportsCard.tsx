import React, { useState, useEffect } from 'react';
import { Newspaper, RefreshCw, ExternalLink } from 'lucide-react';
import { API_BASE } from './utils/api';

interface Props {
  locationLabel: string;
  dateStr: string;
  targetSpecies: string | null;
  isInland: boolean;
}

// Recent local reports, scoped to the user's selected target species. Reuses the
// server-side web-search + guardrails via /api/reports. The summary is grounded
// in real search results server-side; the user-facing link is a plain Google
// search URL, so there is nothing here that can hallucinate a citation.
export default function ReportsCard({ locationLabel, dateStr, targetSpecies, isInland }: Props) {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ranFor, setRanFor] = useState<string | null>(null);

  // Clear the summary when the target species changes — a summary for one
  // species must never linger under a different species heading.
  useEffect(() => {
    setSummary('');
    setError('');
    setRanFor(null);
  }, [targetSpecies, locationLabel]);

  const town = locationLabel.split(',')[0];
  const searchUrl = targetSpecies
    ? `https://www.google.com/search?q=${encodeURIComponent(`${targetSpecies} ${town} fishing report`)}`
    : '';

  const load = async () => {
    if (!targetSpecies) return;
    setLoading(true);
    setError('');
    setSummary('');
    const dateLabel = new Date(dateStr + 'T12:00:00').toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
    try {
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: locationLabel, species: targetSpecies, dateLabel, isInland }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.text) throw new Error(data?.error || 'failed');
      setSummary(data.text);
      setRanFor(targetSpecies);
    } catch (e: any) {
      setError(e?.message === 'Too many requests — try again later'
        ? 'You\u2019ve hit the hourly limit for report scans — try again in a bit.'
        : 'Couldn\u2019t load reports right now — try again in a minute.');
    }
    setLoading(false);
  };

  return (
    <section className="section">
      <h3 className="section-label">Recent local reports</h3>
      <div className="card">
        {!targetSpecies ? (
          <p className="alert-desc" style={{ margin: 0 }}>
            Pick a <strong>target species</strong> above to scan recent fishing reports for it near {town}.
          </p>
        ) : (
          <>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 6px' }}>
              What anglers are reporting for {targetSpecies} near {town}
            </p>

            {!summary && !loading && !error && (
              <p className="alert-desc" style={{ margin: '0 0 10px' }}>
                Scans recent bait-shop and forum reports and sums up what&rsquo;s working now.
              </p>
            )}

            {loading && (
              <p className="muted" style={{ margin: '4px 0' }}>
                <RefreshCw size={14} className="spin" style={{ verticalAlign: '-2px', marginRight: 6 }} />
                Scanning recent reports…
              </p>
            )}

            {error && <p className="report-error" style={{ margin: '4px 0' }}>{error}</p>}

            {summary && (
              <p className="report-summary" style={{ margin: '0 0 10px' }}>{summary}</p>
            )}

            <div className="report-actions">
              <button type="button" className="btn btn-secondary report-scan-btn" onClick={load} disabled={loading}>
                <Newspaper size={15} style={{ verticalAlign: '-3px', marginRight: 6 }} />
                {ranFor === targetSpecies ? 'Refresh reports' : 'Scan recent reports'}
              </button>
              <a className="report-search-link" href={searchUrl} target="_blank" rel="noopener noreferrer">
                See full reports <ExternalLink size={12} style={{ verticalAlign: '-1px' }} />
              </a>
            </div>

            <p className="report-disclaimer">
              Report summaries describe fishing activity, not rules — always check current local regulations before you keep a fish.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
