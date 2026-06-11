// Fish Conditions service worker v2 — offline app shell only.
// v1 intercepted cross-origin API calls (weather/tides), which could break
// data loading on some setups. v2 caches ONLY same-origin app files and
// never touches API requests.
const CACHE = 'fish-conditions-v2';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => k !== CACHE ? caches.delete(k) : null)))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Only handle our own origin; let all API/data requests pass straight through
  if (url.origin !== self.location.origin) return;
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
