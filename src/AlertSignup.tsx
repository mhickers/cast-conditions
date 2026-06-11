import React, { useState } from 'react';
import { supabase } from './supabase';

interface Props {
  locationLabel: string;
  lat: number;
  lon: number;
}

export default function AlertSignup({ locationLabel, lat, lon }: Props) {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const subscribe = async () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setError('Please enter a valid email.'); return; }
    setBusy(true); setError('');
    try {
      const { error: err } = await supabase.from('alerts').insert({
        email: email.trim(), label: locationLabel, lat, lon, threshold: 7.5,
      });
      if (err) throw err;
      setDone(true);
    } catch {
      setError('Something went wrong — please try again.');
    }
    setBusy(false);
  };

  return (
    <section className="section">
      <h3 className="section-label">Condition alerts</h3>
      <div className="card">
        {done ? (
          <p className="alert-success">✓ You're set! We'll email you when {locationLabel} scores 7.5 or higher.</p>
        ) : (
          <>
            <p className="alert-desc">Get an email when conditions at <strong>{locationLabel}</strong> hit a fishing score of 7.5+ (checked each morning).</p>
            <div className="add-spot-row">
              <input
                className="search-input"
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && subscribe()}
                placeholder="you@email.com"
                aria-label="Alert email address"
              />
              <button className="btn" onClick={subscribe} disabled={busy}>{busy ? 'Saving...' : '🔔 Alert me'}</button>
            </div>
            {error && <div className="search-error" style={{ marginTop: 8 }}>{error}</div>}
          </>
        )}
      </div>
    </section>
  );
}
