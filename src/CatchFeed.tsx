import React, { useEffect, useState } from 'react';
import { supabase, CatchPost } from './supabase';
import './CatchFeed.css';

interface Props {
  onSubmitClick: () => void;
}

export default function CatchFeed({ onSubmitClick }: Props) {
  const [catches, setCatches] = useState<CatchPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from('catches')
        .select('*')
        .eq('approved', true)
        .order('catch_date', { ascending: false })
        .limit(20);
      if (!error && data) setCatches(data);
      setLoading(false);
    }
    load();
  }, []);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="cf-wrap">
      <div className="cf-header-row">
        <div>
          <h3 className="section-label" style={{ marginBottom: 2 }}>Recent catches</h3>
          <p className="cf-sub">Submitted by local anglers</p>
        </div>
        <button className="btn" onClick={onSubmitClick}>+ Share a catch</button>
      </div>

      {loading && <div className="muted cf-loading">Loading catches...</div>}

      {!loading && catches.length === 0 && (
        <div className="cf-empty cf-empty-compact">
          <p>Caught something good? Share it with local anglers —</p>
          <button className="btn" onClick={onSubmitClick}>Share a catch</button>
        </div>
      )}

      {!loading && catches.length > 0 && (
        <div className="cf-grid">
          {catches.map(c => (
            <div key={c.id} className="cf-card" onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
              <div className="cf-img-wrap">
                <img src={c.photo_url} alt={`${c.species} caught at ${c.location}`} className="cf-img" loading="lazy" />
                <div className="cf-species-badge">{c.species}</div>
              </div>
              <div className="cf-info">
                <div className="cf-location">📍 {c.location}</div>
                <div className="cf-meta">{formatDate(c.catch_date)} · {c.angler_name}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Expanded photo modal */}
      {expanded && (() => {
        const c = catches.find(x => x.id === expanded);
        if (!c) return null;
        return (
          <div className="cf-lightbox" onClick={() => setExpanded(null)} role="dialog" aria-modal="true">
            <div className="cf-lightbox-inner" onClick={e => e.stopPropagation()}>
              <button className="about-close cf-lbclose" onClick={() => setExpanded(null)} aria-label="Close">✕</button>
              <img src={c.photo_url} alt={c.species} className="cf-lightbox-img" />
              <div className="cf-lightbox-info">
                <strong>{c.species}</strong> · {c.location} · {formatDate(c.catch_date)}
                <div style={{ marginTop: 4, fontSize: 13, color: 'var(--text-muted)' }}>Shared by {c.angler_name}</div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
