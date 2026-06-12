import React, { useState } from 'react';
import { CatchPost } from './supabase';
import './Admin.css';

interface FeedbackPost {
  id: string;
  created_at: string;
  category: string;
  message: string;
  email: string | null;
}

async function adminCall(password: string, action: string, extra: Record<string, any> = {}) {
  const res = await fetch('/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, action, ...extra }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Request failed');
  return data;
}

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [tab, setTab] = useState<'catches' | 'feedback'>('catches');
  const [pending, setPending] = useState<CatchPost[]>([]);
  const [feedback, setFeedback] = useState<FeedbackPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [fbLoading, setFbLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const loadPending = async (password: string) => {
    setLoading(true);
    try {
      const data = await adminCall(password, 'pending');
      setPending(data.pending ?? []);
    } catch (e: any) { setActionMsg(`Failed to load: ${e?.message || 'unknown error'}`); }
    setLoading(false);
  };

  const loadFeedback = async (password: string) => {
    setFbLoading(true);
    try {
      const data = await adminCall(password, 'feedback');
      setFeedback(data.feedback ?? []);
    } catch (e: any) { setActionMsg(`Failed to load: ${e?.message || 'unknown error'}`); }
    setFbLoading(false);
  };

  const login = async () => {
    setPwError('');
    try {
      await adminCall(pw, 'login');
      setAuthed(true);
      sessionStorage.setItem('adminAuthed', '1');
      loadPending(pw);
    } catch (e: any) {
      setPwError(e.message === 'Incorrect password' ? 'Incorrect password.' : 'Login failed — try again.');
    }
  };

  const switchTab = (t: 'catches' | 'feedback') => {
    setActionMsg('');
    setTab(t);
    if (t === 'feedback') loadFeedback(pw);
  };

  const refresh = () => (tab === 'catches' ? loadPending(pw) : loadFeedback(pw));

  const approve = async (id: string) => {
    try {
      await adminCall(pw, 'approve', { id });
      setPending(p => p.filter(x => x.id !== id));
      setActionMsg('✓ Approved');
      setTimeout(() => setActionMsg(''), 2000);
    } catch { setActionMsg('Failed'); }
  };

  const reject = async (id: string, photoUrl: string) => {
    try {
      await adminCall(pw, 'reject', { id, photo_url: photoUrl });
      setPending(p => p.filter(x => x.id !== id));
      setActionMsg('✕ Rejected');
      setTimeout(() => setActionMsg(''), 2000);
    } catch { setActionMsg('Failed'); }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

  if (!authed) {
    return (
      <div className="admin-wrap">
        <div className="admin-login">
          <h2 className="admin-title">🎣 Fish Condish — Admin</h2>
          <p className="admin-sub">Enter your admin password to review submissions.</p>
          <input
            className="search-input"
            type="password"
            placeholder="Admin password"
            value={pw}
            onChange={e => { setPw(e.target.value); setPwError(''); }}
            onKeyDown={e => e.key === 'Enter' && login()}
          />
          {pwError && <div className="admin-error">{pwError}</div>}
          <button className="btn" onClick={login} style={{ marginTop: 12, width: '100%' }}>Log in</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-wrap">
      <div className="admin-header">
        <div className="admin-tabs">
          <button className={`admin-tab${tab === 'catches' ? ' active' : ''}`} onClick={() => switchTab('catches')}>
            Catch moderation{pending.length ? ` (${pending.length})` : ''}
          </button>
          <button className={`admin-tab${tab === 'feedback' ? ' active' : ''}`} onClick={() => switchTab('feedback')}>
            Feedback
          </button>
        </div>
        {actionMsg && <span className="admin-action-msg">{actionMsg}</span>}
        <button className="btn btn-secondary" onClick={refresh} style={{ marginLeft: 'auto' }}>↻ Refresh</button>
      </div>

      {tab === 'catches' && (
        <>
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
                  {c.location && <div className="admin-meta">📍 {c.location}</div>}
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
        </>
      )}

      {tab === 'feedback' && (
        <>
          {fbLoading && <p className="muted">Loading feedback...</p>}

          {!fbLoading && feedback.length === 0 && (
            <div className="admin-empty">
              <p>No feedback yet.</p>
            </div>
          )}

          <div className="fb-admin-list">
            {feedback.map(f => (
              <div key={f.id} className="fb-admin-card">
                <div className="fb-admin-top">
                  <span className={`fb-admin-cat fb-cat-${f.category.toLowerCase().split(' ')[0]}`}>{f.category}</span>
                  <span className="fb-admin-date">{new Date(f.created_at).toLocaleString()}</span>
                </div>
                <p className="fb-admin-msg">{f.message}</p>
                {f.email && (
                  <a className="fb-admin-email" href={`mailto:${f.email}`}>✉ {f.email}</a>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
