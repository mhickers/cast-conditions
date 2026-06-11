import React, { useState } from 'react';
import { supabase } from './supabase';
import './CatchSubmit.css';

interface Props {
  onClose: () => void;
}

const SPECIES = [
  'Striped bass', 'Flounder', 'Bluefish', 'Sea bass',
  'Weakfish', 'Kingfish', 'Tuna', 'Mahi-mahi',
  'Fluke', 'Porgy', 'Red drum', 'Other',
];

export default function CatchSubmit({ onClose }: Props) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [species, setSpecies] = useState('');
  const [location, setLocation] = useState('');
  const [catchDate, setCatchDate] = useState(new Date().toISOString().slice(0, 10));
  const [anglerName, setAnglerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { setError('Photo must be under 8MB.'); return; }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError('');
  };

  const handleSubmit = async () => {
    if (!photo) { setError('Please add a photo.'); return; }
    if (!species) { setError('Please select a species.'); return; }
    if (!location.trim()) { setError('Please enter a location.'); return; }
    if (!anglerName.trim()) { setError('Please enter your name.'); return; }

    setSubmitting(true);
    setError('');

    try {
      // Upload photo to Supabase storage
      const ext = photo.name.split('.').pop();
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('catch-photos')
        .upload(filename, photo, { contentType: photo.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('catch-photos')
        .getPublicUrl(filename);

      // Insert record (approved: false — awaits moderation)
      const { error: insertError } = await supabase
        .from('catches')
        .insert({
          photo_url: urlData.publicUrl,
          species,
          location: location.trim(),
          catch_date: catchDate,
          angler_name: anglerName.trim(),
          approved: false,
        });

      if (insertError) throw insertError;
      setSubmitted(true);
    } catch (e: any) {
      setError('Something went wrong. Please try again.');
      console.error(e);
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="cs-overlay" onClick={onClose} role="dialog" aria-modal="true">
        <div className="cs-modal" onClick={e => e.stopPropagation()}>
          <div className="cs-success">
            <div className="cs-success-icon">🎣</div>
            <h3>Catch submitted!</h3>
            <p>Your catch will appear in the feed once approved. Thanks for sharing!</p>
            <button className="btn" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cs-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Submit a catch">
      <div className="cs-modal" onClick={e => e.stopPropagation()}>
        <div className="cs-header">
          <span className="cs-title">Share a catch</span>
          <button className="about-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Photo upload */}
        <div className="cs-photo-area" onClick={() => document.getElementById('photo-input')?.click()}>
          {photoPreview
            ? <img src={photoPreview} alt="Preview" className="cs-preview" />
            : <div className="cs-photo-placeholder">
                <span className="cs-photo-icon">📷</span>
                <span>Tap to add photo</span>
              </div>
          }
          <input id="photo-input" type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
        </div>

        <div className="cs-fields">
          <div className="cs-field">
            <label className="cs-label">Your name</label>
            <input className="search-input" value={anglerName} onChange={e => setAnglerName(e.target.value)} placeholder="e.g. Mike H." />
          </div>

          <div className="cs-field">
            <label className="cs-label">Species</label>
            <select className="search-input cs-select" value={species} onChange={e => setSpecies(e.target.value)}>
              <option value="">Select species...</option>
              {SPECIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="cs-field">
            <label className="cs-label">Location</label>
            <input className="search-input" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Margate City, NJ" />
          </div>

          <div className="cs-field">
            <label className="cs-label">Date caught</label>
            <input className="search-input" type="date" value={catchDate} onChange={e => setCatchDate(e.target.value)} />
          </div>
        </div>

        {error && <div className="cs-error">{error}</div>}

        <button className="btn cs-submit" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit catch'}
        </button>

        <p className="cs-note">Photos are reviewed before appearing publicly.</p>
      </div>
    </div>
  );
}
