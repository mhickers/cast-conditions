import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { inject } from '@vercel/analytics';

inject();

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<React.StrictMode><App /></React.StrictMode>);

// Offline support: cache the app shell and last-loaded data
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
