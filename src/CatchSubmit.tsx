import React, { useState } from 'react';
import { supabase } from './supabase';
import './CatchSubmit.css';

interface Props {
  onClose: () => void;
}

const SPECIES_GROUPS: { group: string; options: string[] }[] = [
  {
    group: 'Saltwater',
    options: [
      'Striped bass', 'Bluefish', 'Fluke (summer flounder)', 'Winter flounder',
      'Black sea bass', 'Tautog (blackfish)', 'Weakfish', 'Porgy (scup)',
      'Kingfish', 'Red drum (redfish)', 'Black drum', 'Spotted seatrout',
      'Snook', 'Tarpon', 'Sheepshead', 'Pompano', 'Spanish mackerel',
      'Atlantic mackerel', 'False albacore', 'Bonito', 'Bluefin tuna',
      'Yellowfin tuna', 'Mahi-mahi', 'Wahoo', 'Cobia', 'Amberjack',
      'Grouper', 'Snapper', 'Southern flounder', 'Halibut', 'Lingcod',
      'Rockfish', 'Surfperch', 'Croaker', 'Spot', 'Whiting', 'Triggerfish',
      'Spadefish', 'Shark', 'Skate',
    ],
  },
  {
    group: 'Freshwater',
    options: [
      'Largemouth bass', 'Smallmouth bass', 'Spotted bass', 'White bass',
      'Hybrid striped bass (wiper)', 'Landlocked striped bass', 'Bluegill',
      'Pumpkinseed', 'Redear sunfish', 'Black crappie', 'White crappie',
      'Yellow perch', 'Walleye', 'Sauger', 'Northern pike',
      'Muskellunge (muskie)', 'Chain pickerel', 'Channel catfish',
      'Blue catfish', 'Flathead catfish', 'Bullhead', 'Rainbow trout',
      'Brown trout', 'Brook trout', 'Lake trout', 'Cutthroat trout',
      'Steelhead', 'Chinook salmon', 'Coho salmon', 'Atlantic salmon',
      'Kokanee', 'Common carp', 'Freshwater drum', 'Bowfin', 'Longnose gar',
      'Sturgeon', 'Whitefish',
    ],
  },
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
          catch_date: catchDate || new Date().toISOString().slice(0, 10),
          angler_name: anglerName.trim() || 'Anonymous',
          approved: false,
        });

      if (insertError) throw insertError;
      // Fire-and-forget owner notification — never blocks or fails the user flow
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'catch', species, location: location.trim(), angler_name: anglerName.trim() }),
      }).catch(() => {});
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
            <label className="cs-label">Your name <span className="cs-optional">(optional)</span></label>
            <input className="search-input" value={anglerName} onChange={e => setAnglerName(e.target.value)} placeholder="e.g. Mike H." />
          </div>

          <div className="cs-field">
            <label className="cs-label">Species</label>
            <select className="search-input cs-select" value={species} onChange={e => setSpecies(e.target.value)}>
              <option value="">Select species...</option>
              {SPECIES_GROUPS.map(g => (
                <optgroup key={g.group} label={g.group}>
                  {g.options.map(s => <option key={s} value={s}>{s}</option>)}
                </optgroup>
              ))}
              <option value="Other">Other / not listed</option>
            </select>
          </div>

          <div className="cs-field">
            <label className="cs-label">Location <span className="cs-optional">(optional)</span></label>
            <input className="search-input" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Margate City, NJ" />
          </div>

          <div className="cs-field">
            <label className="cs-label">Date caught <span className="cs-optional">(optional)</span></label>
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
