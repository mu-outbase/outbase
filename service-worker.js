const CACHE_NAME = 'outbase-core05-1-cache-fix-v1';
const BUILD_ID = 'core05-1-cache-fix-20260703';
const APP_SHELL = [
  './?v=' + BUILD_ID,
  './index.html?v=' + BUILD_ID,
  './manifest.json?v=' + BUILD_ID,
  './styles/app.css?v=' + BUILD_ID,
  './src/main.js?v=' + BUILD_ID,
  './src/config/version.js?v=' + BUILD_ID,
  './src/core/router.js?v=' + BUILD_ID,
  './src/core/storage.js?v=' + BUILD_ID,
  './src/core/store.js?v=' + BUILD_ID,
  './src/domain/schema.js?v=' + BUILD_ID,
  './src/ui/components.js?v=' + BUILD_ID,
  './src/modules/home/home.js?v=' + BUILD_ID,
  './src/modules/prep/prep.js?v=' + BUILD_ID,
  './src/modules/prep/prepEngine.js?v=' + BUILD_ID,
  './src/modules/import/import.js?v=' + BUILD_ID,
  './src/modules/walk/walk.js?v=' + BUILD_ID,
  './src/modules/review/review.js?v=' + BUILD_ID,
  './src/modules/pwa/pwa.js?v=' + BUILD_ID
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html?v=' + BUILD_ID)))
  );
});
