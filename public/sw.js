// OMEGA GYM - High-Speed Service Worker Cache Engine
// v5: build with lazy Firebase chunk + async web fonts. Bumping the name makes
// every client drop the previous cache on activate, so a deploy is picked up
// immediately instead of serving stale hashed assets.
const CACHE_NAME = 'omega-gym-v5';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon.svg',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;600;700&display=swap'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // One request per asset: a single failure (e.g. the Google Fonts CSS while
      // offline) can no longer abort the whole precache like cache.addAll() did.
      return Promise.allSettled(STATIC_ASSETS.map(url =>
        cache.add(new Request(url, { mode: url.startsWith('https://fonts.') ? 'cors' : 'same-origin' }))
      ));
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Do not intercept non-GET, dev HMR, source modules, Firebase, Google Drive, or WebSockets
  if (req.method !== 'GET') return;
  if (url.pathname.startsWith('/@') || url.pathname.startsWith('/src/') || url.pathname.includes('node_modules') || url.search.includes('t=')) return;
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname.endsWith('.e2b.app')) return;
  if (url.hostname.includes('firebaseio.com') ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('accounts.google.com')) {
    return;
  }

  // HTML navigation: Stale-While-Revalidate or Network-First
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        if (res && res.status === 200) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        }
        return res;
      }).catch(() => caches.match('/index.html') || caches.match('/'))
    );
    return;
  }

  // Content-hashed build assets (/assets/index-abc123.js) are immutable: serve
  // straight from cache and never spend a request re-validating them.
  const isImmutableAsset = url.pathname.startsWith('/assets/') && /\.[0-9a-zA-Z_-]{8}\.(js|css)$/.test(url.pathname);
  if (isImmutableAsset) {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return res;
      }))
    );
    return;
  }

  // Other static assets (JS, CSS, fonts, images): Cache First + background update.
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
