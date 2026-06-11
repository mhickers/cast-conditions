import React, { useState } from 'react';
import { supabase, CatchPost } from './supabase';
import './Admin.css';

const ADMIN_PASSWORD = process.env.REACT_APP_ADMIN_PASSWORD || 'fishconditions2024';

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState(false);
  const [pending, setPending] = useState<CatchPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const login = () => {
    if (pw === ADMIN_PASSWORD) { setAuthed(true); loadPending(); }
    else { setPwError(true); }
  };

  const loadPending = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('catches')
      .select('*')
      .eq('approved', false)
      .order('created_at', { ascending: true });
    if (data) setPending(data);
    setLoading(false);
  };

  const approve = async (id: string) => {
    await supabase.from('catches').update({ approved: true }).eq('id', id);
    setPending(p => p.filter(x => x.id !== id));
    setActionMsg('✓ Approved');
    setTimeout(() => setActionMsg(''), 2000);
  };

  const reject = async (id: string, photoUrl: string) => {
    // Delete photo from storage
    const filename = photoUrl.split('/').pop();
    if (filename) await supabase.storage.from('catch-photos').remove([filename]);
    await supabase.from('catches').delete().eq('id', id);
    setPending(p => p.filter(x => x.id !== id));
    setActionMsg('✕ Rejected');
    setTimeout(() => setActionMsg(''), 2000);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

  if (!authed) {
    return (
      <div className="admin-wrap">
        <div className="admin-login">
          <h2 className="admin-title">🎣 Fish Conditions — Admin</h2>
          <p className="admin-sub">Enter your admin password to review catch submissions.</p>
          <input
            className="search-input"
            type="password"
            placeholder="Admin password"
            value={pw}
            onChange={e => { setPw(e.target.value); setPwError(false); }}
            onKeyDown={e => e.key === 'Enter' && login()}
          />
          {pwError && <div className="admin-error">Incorrect password.</div>}
          <button className="btn" onClick={login} style={{ marginTop: 12, width: '100%' }}>Log in</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-wrap">
      <div className="admin-header">
        <h2 className="admin-title">🎣 Catch moderation</h2>
        {actionMsg && <span className="admin-action-msg">{actionMsg}</span>}
        <button className="btn btn-secondary" onClick={loadPending} style={{ marginLeft: 'auto' }}>↻ Refresh</button>
      </div>

      {loading && <p className="muted">Loading pending submissions...</p>}

      {!loading && pending.length === 0 && (
        <div className="admin-empty">
          <p>No pending submissions — all caught up! 🎣</p>
        </div>
      )}

      <div className="admin-grid">
        {pending.map(c => (
          <div key={c.id} className="admin-card">
            <img src={c.photo_url} alt={c.species} className="admin-img" />
            <div className="admin-card-info">
              <div className="admin-species">{c.species}</div>
              <div className="admin-meta">📍 {c.location}</div>
              <div className="admin-meta">📅 {formatDate(c.catch_date)}</div>
              <div className="admin-meta">👤 {c.angler_name}</div>
              <div className="admin-meta" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Submitted {new Date(c.created_at).toLocaleString()}
              </div>
            </div>
            <div className="admin-actions">
              <button className="btn admin-approve" onClick={() => approve(c.id)}>✓ Approve</button>
              <button className="btn admin-reject" onClick={() => reject(c.id, c.photo_url)}>✕ Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
