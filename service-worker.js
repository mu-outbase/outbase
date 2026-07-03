const CACHE_NAME = 'outbase-core04-review-to-prep-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './styles/app.css',
  './src/main.js',
  './src/config/version.js',
  './src/core/router.js',
  './src/core/storage.js',
  './src/core/store.js',
  './src/domain/schema.js',
  './src/ui/components.js',
  './src/modules/home/home.js',
  './src/modules/prep/prep.js',
  './src/modules/prep/prepEngine.js',
  './src/modules/import/import.js',
  './src/modules/walk/walk.js',
  './src/modules/review/review.js',
  './src/modules/pwa/pwa.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
  );
});
