import React from 'react';
import './About.css';

interface Props {
  onClose: () => void;
}

export default function About({ onClose }: Props) {
  return (
    <div className="about-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="About Cast Conditions">
      <div className="about-modal" onClick={e => e.stopPropagation()}>
        <div className="about-header">
          <span className="about-logo">⚓ Fish Conditions</span>
          <button className="about-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <p className="about-lead">Real-time fishing conditions for US coastal anglers.</p>

        <div className="about-section">
          <h3>What it shows</h3>
          <ul>
            <li><strong>Fishing score</strong> — a 1–10 rating based on wind, waves, pressure, tide, moon, and water temp combined</li>
            <li><strong>AI guide</strong> — a plain-English summary of today's conditions and what to target</li>
            <li><strong>Atmosphere & water</strong> — live wind speed/direction, air temp, barometric pressure, water temp, wave height, and wave period</li>
            <li><strong>Tides</strong> — today's high/low tide times with a visual chart and current tide level</li>
            <li><strong>Moon phase</strong> — current phase and its effect on feeding activity</li>
            <li><strong>Species forecast</strong> — bite likelihood for striped bass, flounder, bluefish, sea bass, weakfish, and kingfish</li>
            <li><strong>24-hour forecast</strong> — hourly wind and wave outlook</li>
          </ul>
        </div>

        <div className="about-section">
          <h3>How to use it</h3>
          <ul>
            <li>Type any coastal city or town in the search bar and press <strong>Search</strong></li>
            <li>Click <strong>Save spot</strong> to bookmark locations you fish regularly — they persist between visits</li>
            <li>Hit <strong>Refresh</strong> anytime for the latest conditions</li>
            <li>On mobile, tap Share → <strong>Add to Home Screen</strong> to install it as an app</li>
          </ul>
        </div>

        <div className="about-section">
          <h3>Coverage</h3>
          <p>Weather and wave data works for any coastal location worldwide. Tide and water temperature data currently uses NOAA station 8534720 (Atlantic City, NJ) — best for the South Jersey coast. Expanded tide coverage coming soon.</p>
        </div>

        <div className="about-footer">
          Built for anglers, by anglers. More species and inland fishing support coming soon.
        </div>
      </div>
    </div>
  );
}
