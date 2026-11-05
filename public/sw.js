// OMEGA GYM - High-Speed Service Worker Cache Engine
// تحسينات: معالجة الأخطاء، آلية Fallback، إدارة كاش محسنة للسرعة والاستقرار
// التحديث التلقائي: عند نشر نسخة جديدة يتم تحديث الكاش تلقائيًا
const CACHE_NAME = 'omega-gym-v8';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon.svg',
  // Local fonts must remain available after the first offline visit.
  ...['arabic', 'latin'].flatMap((subset) =>
    [400, 500, 700].map((weight) => `/fonts/tajawal-${subset}-${weight}-normal.woff2`)
  )
];

// Fallback responses for offline scenarios
const FALLBACK_HTML = `<!DOCTYPE html><html lang="ar"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>OMEGA GYM - غير متصل</title></head><body style="font-family:Tahoma,Arial,sans-serif;text-align:center;padding:40px;direction:rtl;background:#f5f5f5;color:#333;"><h1>OMEGA GYM</h1><p style="font-size:18px;color:#666;">أنت غير متصل بالإنترنت حاليًا.</p><p style="margin-top:16px;">يُرجى التحقق من اتصال الشبكة والمحاولة مرة أخرى.</p></body></html>`;

// Helper: create a basic offline HTML response
function offlineHtmlResponse() {
  return new Response(FALLBACK_HTML, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    status: 200
  });
}

// Helper: generic offline response
function offlineResponse() {
  return new Response('', { status: 200, statusText: 'Offline Cache Fallback' });
}

// Helper: safe cache put that never throws (quota errors, etc.)
async function safeCachePut(cache, req, res) {
  try {
    if (cache && res) {
      await cache.put(req, res.clone());
    }
  } catch (err) {
    console.warn('[SW] Cache put skipped:', err?.message || err);
  }
}

// Helper: determine if a request should bypass the service worker
function shouldBypass(req) {
  const url = new URL(req.url);
  if (req.method !== 'GET') return true;
  if (url.pathname.startsWith('/@') || url.pathname.startsWith('/src/')) return true;
  if (url.pathname.includes('node_modules')) return true;
  if (url.search.includes('t=')) return true;
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return true;
  // Preview/sandbox environments bypass the SW so dev changes appear instantly
  if (url.hostname.endsWith('.e2b.app')) return true;
  // Firebase / Google services are managed by the Firebase SDK, not the SW
  if (url.hostname.includes('firebaseio.com') ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('accounts.google.com') ||
      url.hostname.includes('firebasedatabase.app')) {
    return true;
  }
  return false;
}

// ------------------------------------------------------------------
// Install: cache all static assets immediately, activate right away
// ------------------------------------------------------------------
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Install cache partial failure:', err?.message || err);
      });
    }).catch((err) => {
      console.warn('[SW] Install cache open failure:', err?.message || err);
    })
  );
});

// ------------------------------------------------------------------
// Activate: clean old caches, take control of all open tabs
// ------------------------------------------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k.startsWith('omega-gym-') && k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim()).catch((err) => {
      console.warn('[SW] Activate cleanup failure:', err?.message || err);
    })
  );
});

// ------------------------------------------------------------------
// Message handler: app can request cache refresh or check version
// ------------------------------------------------------------------
self.addEventListener('message', (event) => {
  if (!event.data) return;

  // Command: force-refresh all cached static assets
  if (event.data.type === 'REFRESH_CACHE') {
    event.waitUntil(
      caches.open(CACHE_NAME).then(async (cache) => {
        for (const url of STATIC_ASSETS) {
          try {
            const res = await fetch(url, { cache: 'no-store' });
            if (res && res.ok) await safeCachePut(cache, new Request(url), res);
          } catch (e) { /* skip failed assets */ }
        }
        // Notify the client that refresh is done
        if (event.source) {
          event.source.postMessage({ type: 'CACHE_REFRESHED', version: CACHE_NAME });
        }
      }).catch((err) => {
        console.warn('[SW] Cache refresh failed:', err?.message || err);
      })
    );
    return;
  }

  // Command: return current cache version
  if (event.data.type === 'GET_VERSION') {
    if (event.source) {
      event.source.postMessage({ type: 'SW_VERSION', version: CACHE_NAME });
    }
    return;
  }
});

// ------------------------------------------------------------------
// Fetch: serve cached content, update in background
// ------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Bypass non-GET and external/managed requests
  if (shouldBypass(req)) return;

  const url = new URL(req.url);

  // -----------------------------------------------------------
  // 1. HTML navigation: Network-First with cache fallback
  // -----------------------------------------------------------
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkRes = await fetch(req);
          if (networkRes && networkRes.status === 200) {
            try {
              const cache = await caches.open(CACHE_NAME);
              await safeCachePut(cache, req, networkRes.clone());
            } catch (cacheErr) {
              console.warn('[SW] Navigate cache write skipped:', cacheErr?.message || cacheErr);
            }
          }
          return networkRes;
        } catch (networkErr) {
          try {
            const cached = await caches.match(req.url);
            if (cached) return cached;
            const indexHtml = await caches.match('/index.html');
            if (indexHtml) return indexHtml;
            const root = await caches.match('/');
            if (root) return root;
            return offlineHtmlResponse();
          } catch (cacheErr) {
            console.warn('[SW] Navigate cache read failure:', cacheErr?.message || cacheErr);
            return offlineHtmlResponse();
          }
        }
      })()
    );
    return;
  }

  // -----------------------------------------------------------
  // 2. Content-hashed build assets (immutable): Cache First
  // -----------------------------------------------------------
  if (url.origin === self.location.origin && /^\/assets\/.+[-][\w-]{8,}\.(js|css)$/.test(url.pathname)) {
    event.respondWith(
      (async () => {
        try {
          const cached = await caches.match(req);
          if (cached) return cached;

          try {
            const networkRes = await fetch(req);
            if (networkRes && networkRes.ok) {
              try {
                const cache = await caches.open(CACHE_NAME);
                await safeCachePut(cache, req, networkRes.clone());
              } catch (cacheErr) {
                console.warn('[SW] Asset cache write skipped:', cacheErr?.message || cacheErr);
              }
            }
            return networkRes || offlineResponse();
          } catch (networkErr) {
            const cached2 = await caches.match(req);
            if (cached2) return cached2;
            return offlineResponse();
          }
        } catch (err) {
          console.warn('[SW] Asset handler error:', err?.message || err);
          try {
            const cached = await caches.match(req);
            if (cached) return cached;
          } catch {} // ignore
          return offlineResponse();
        }
      })()
    );
    return;
  }

  // -----------------------------------------------------------
  // 3. Static Assets: Stale-While-Revalidate
  // -----------------------------------------------------------
  event.respondWith(
    (async () => {
      try {
        const cached = await caches.match(req);

        let networkRes;
        try {
          networkRes = await fetch(req);
          if (networkRes && networkRes.status === 200) {
            try {
              const cache = await caches.open(CACHE_NAME);
              await safeCachePut(cache, req, networkRes.clone());
            } catch (cacheErr) {
              console.warn('[SW] Static asset cache write skipped:', cacheErr?.message || cacheErr);
            }
          }
        } catch (networkErr) {
          console.warn('[SW] Static asset fetch failed, using cache:', networkErr?.message || networkErr);
        }

        if (cached) return cached;
        if (networkRes) return networkRes;

        // Neither cache nor network — fallback by content type
        const accept = req.headers.get('accept') || '';
        if (accept.includes('text/html')) return offlineHtmlResponse();
        if (accept.includes('image/')) {
          try {
            const icon = await caches.match('/icon-192.png');
            if (icon) return icon;
          } catch {} // ignore
        }
        return offlineResponse();
      } catch (err) {
        console.warn('[SW] Static asset handler error:', err?.message || err);
        try {
          const cached = await caches.match(req);
          if (cached) return cached;
        } catch {} // ignore
        return offlineHtmlResponse();
      }
    })()
  );
});
