const CACHE_NAME = 'materi-interaktif-v12';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './css/style.css?v=12',
  './js/app.js',
  './js/app.js?v=12',
  './js/audio.js',
  './js/quiz-data.js',
  './manifest.json',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon.svg',
  './assets/slides/slide_1.webp'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching offline assets...');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('[Service Worker] Failed to cache some assets', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Let video requests stream natively with HTTP Range headers
  if (event.request.url.includes('.mp4') || event.request.headers.get('range')) {
    return;
  }

  // Bypass cross-origin requests (Wordwall, Sketchfab, Google Fonts, etc.)
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Network-First untuk navigasi (HTML) agar update halaman langsung diterima saat online
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Fallback to cached index.html for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
