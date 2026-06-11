import React, { useState } from 'react';
import { supabase } from './supabase';
import './Feedback.css';

const CATEGORIES = ['Bug report', 'Feature request', 'Data issue', 'General feedback'];

export default function Feedback() {
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!category) { setError('Please select a category.'); return; }
    if (!message.trim() || message.trim().length < 10) { setError('Please enter at least 10 characters.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const { error: err } = await supabase.from('feedback').insert({
        category,
        message: message.trim(),
        email: email.trim() || null,
      });
      if (err) throw err;
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="fb-wrap">
        <div className="fb-success">
          <span className="fb-success-icon">✓</span>
          <div>
            <div className="fb-success-title">Thanks for the feedback!</div>
            <div className="fb-success-sub">We read every submission and use it to improve the app.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fb-wrap">
      <div className="fb-header-row">
        <div>
          <h3 className="section-label" style={{ marginBottom: 2 }}>Feedback</h3>
          <p className="fb-sub">Report a bug or suggest an improvement</p>
        </div>
      </div>

      <div className="fb-card">
        <div className="fb-cat-row">
          {CATEGORIES.map(c => (
            <button
              key={c}
              className={`fb-cat-btn${category === c ? ' active' : ''}`}
              onClick={() => { setCategory(c); setError(''); }}
            >
              {c}
            </button>
          ))}
        </div>

        <textarea
          className="fb-textarea"
          placeholder="Tell us what you're experiencing or what you'd like to see..."
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={3}
          aria-label="Feedback message"
        />

        <div className="fb-bottom-row">
          <input
            className="search-input fb-email"
            type="email"
            placeholder="Email (optional, if you'd like a reply)"
            value={email}
            onChange={e => setEmail(e.target.value)}
            aria-label="Email address"
          />
          <button className="btn" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Sending...' : 'Send feedback'}
          </button>
        </div>

        {error && <div className="fb-error">{error}</div>}
      </div>
    </div>
  );
}
