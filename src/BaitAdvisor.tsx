import React, { useState } from 'react';
import { fetchAIAdvice } from './utils/api';

interface Props {
  locationLabel: string;
  dateStr: string;
  topSpecies: string[];
  waterTempF: number | null;
  isInland: boolean;
}

export default function BaitAdvisor({ locationLabel, dateStr, topSpecies, waterTempF, isInland }: Props) {
  const [advice, setAdvice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getAdvice = async () => {
    setLoading(true);
    setError('');
    const dayLabel = new Date(dateStr + 'T12:00:00').toLocaleDateString([], { month: 'long', day: 'numeric' });
    const prompt = `You are an expert local fishing guide for the area around ${locationLabel}. Date: ${dayLabel}.${waterTempF ? ` Water temp: ${waterTempF.toFixed(0)}°F.` : ''} The most active species right now: ${topSpecies.join(', ')}.

Give specific bait, lure${isInland ? ', and fly' : ''} recommendations for each of those species for this exact location and time of year. ${isInland ? 'If this is trout water, name the likely hatches this month and matching fly patterns with sizes. ' : ''}Mention colors and sizes where they matter. Be concrete and local, like advice from the counter of the nearest tackle shop. Keep it under 130 words. Format as one short line per species like "Striped bass: ...". Plain text only — no markdown, no asterisks.`;

    const result = await fetchAIAdvice(prompt);
    if (result) setAdvice(result);
    else setError('Could not load suggestions right now — try again in a minute.');
    setLoading(false);
  };

  return (
    <section className="section">
      <h3 className="section-label">Bait & lure advisor</h3>
      <div className="card">
        {!advice && !loading && (
          <>
            <p className="alert-desc">Get bait, lure{isInland ? ', fly, and hatch' : ''} recommendations tailored to <strong>{locationLabel}</strong> for this date — like asking the local tackle shop.</p>
            <button className="btn" onClick={getAdvice}>🪝 Get local suggestions</button>
            {error && <div className="search-error" style={{ marginTop: 8 }}>{error}</div>}
          </>
        )}
        {loading && <p className="muted">Asking the local guide...</p>}
        {advice && (
          <>
            <p className="bait-advice">{advice}</p>
            <button className="btn btn-secondary btn-sm" onClick={getAdvice} style={{ marginTop: 10 }}>↻ Refresh suggestions</button>
          </>
        )}
      </div>
    </section>
  );
}
