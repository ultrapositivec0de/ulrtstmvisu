const CACHE_NAME = 'steem-editor-pro-v4.8.0';
const RELATIVE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.png',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './icon.png',
  './icon.svg',
  './lite.html'
];

// On install, pre-cache core shell assets safely using relative resolution
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      const urlsToCache = RELATIVE_ASSETS.map((asset) => new URL(asset, self.location).href);
      return Promise.allSettled(
        urlsToCache.map((url) =>
          cache.add(url).catch((err) => console.warn('Failed to pre-cache asset:', url, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// Clean up stale caches on activation and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Allow client to trigger skipWaiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch handler: Intelligent routing avoiding overly aggressive HTML caching
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 1. External fonts & style CDNs: Cache-First with network fallback
  if (url.origin !== self.location.origin) {
    if (url.host.includes('fonts.googleapis.com') || url.host.includes('fonts.gstatic.com') || url.pathname.endsWith('.woff2')) {
      event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const cacheCopy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cacheCopy));
            }
            return networkResponse;
          }).catch(() => cachedResponse);
        })
      );
    }
    return;
  }

  // Dynamic base URL for this service worker
  const swBasePath = new URL('./', self.location).pathname;

  // 2. Navigation / HTML Document requests: Network-First with Cache Fallback
  // This guarantees users always get the latest version when online, while preserving 100% offline access
  if (event.request.mode === 'navigate' || url.pathname === swBasePath || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cacheCopy));
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback
          return caches.match(event.request).then((cached) => {
            return cached || caches.match(new URL('./index.html', self.location).href) || caches.match(new URL('./', self.location).href);
          });
        })
    );
    return;
  }

  // 3. Vite content-hashed static assets (assets/.*) -> Cache-First
  const isHashedAsset = url.pathname.includes('/assets/');
  if (isHashedAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cacheCopy));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 4. Non-hashed static files (manifest, icons, images): Stale-While-Revalidate
  const isStaticFile = /\.(png|jpg|jpeg|gif|svg|webp|ico|json)$/i.test(url.pathname);
  if (isStaticFile) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cacheCopy));
          }
          return networkResponse;
        }).catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 5. Default: Network with Cache fallback
  event.respondWith(
    fetch(event.request).then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
        const cacheCopy = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cacheCopy));
      }
      return networkResponse;
    }).catch(() => {
      return caches.match(event.request);
    })
  );
});

