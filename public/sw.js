// Fish Conditions service worker — offline support.
// Network-first with cache fallback: at a remote spot with no signal,
// the app shows the last-loaded conditions instead of a blank screen.
const CACHE = 'fish-conditions-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Never cache our own serverless endpoints (AI, admin, alerts)
  if (url.pathname.startsWith('/api/')) return;

  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then(m => m || (req.mode === 'navigate' ? caches.match('/') : Promise.reject()))
      )
  );
});
