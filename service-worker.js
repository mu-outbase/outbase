const CACHE_VERSION = 'core06-09-premium-interaction-ux-20260704';
const CACHE_NAME = `outbase-${CACHE_VERSION}`;
const APP_SHELL = [
  './',
  './index.html?v=core06-09-premium-interaction-ux-20260704',
  './manifest.json?v=core06-09-premium-interaction-ux-20260704',
  './styles/app.css?v=core06-09-premium-interaction-ux-20260704',
  './styles/core05-16.css?v=core06-09-premium-interaction-ux-20260704',
  './styles/core06-01.css?v=core06-09-premium-interaction-ux-20260704',
  './styles/core06-02.css?v=core06-09-premium-interaction-ux-20260704',
  './styles/core06-03.css?v=core06-09-premium-interaction-ux-20260704',
  './styles/core06-04.css?v=core06-09-premium-interaction-ux-20260704',
  './styles/core06-05.css?v=core06-09-premium-interaction-ux-20260704',
  './styles/core06-06.css?v=core06-09-premium-interaction-ux-20260704',
  './styles/core06-07.css?v=core06-09-premium-interaction-ux-20260704',
  './styles/core06-08.css?v=core06-09-premium-interaction-ux-20260704',
  './styles/core06-09.css?v=core06-09-premium-interaction-ux-20260704',
  './src/main.js?v=core06-09-premium-interaction-ux-20260704',
  './src/config/version.js?v=core06-09-premium-interaction-ux-20260704',
  './src/core/router.js?v=core06-09-premium-interaction-ux-20260704',
  './src/core/store.js?v=core06-09-premium-interaction-ux-20260704',
  './src/core/storage.js?v=core06-09-premium-interaction-ux-20260704',
  './src/ui/components.js?v=core06-09-premium-interaction-ux-20260704',
  './src/domain/schema.js?v=core06-09-premium-interaction-ux-20260704',
  './src/modules/home/home.js?v=core06-09-premium-interaction-ux-20260704',
  './src/modules/search/search.js?v=core06-09-premium-interaction-ux-20260704',
  './src/modules/prep/prep.js?v=core06-09-premium-interaction-ux-20260704',
  './src/modules/prep/prepEngine.js?v=core06-09-premium-interaction-ux-20260704',
  './src/modules/import/import.js?v=core06-09-premium-interaction-ux-20260704',
  './src/modules/day/day.js?v=core06-09-premium-interaction-ux-20260704',
  './src/modules/walk/walk.js?v=core06-09-premium-interaction-ux-20260704',
  './src/modules/memory/memory.js?v=core06-09-premium-interaction-ux-20260704',
  './src/modules/pwa/pwa.js?v=core06-09-premium-interaction-ux-20260704'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => undefined)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => undefined);
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('./index.html?v=core06-09-premium-interaction-ux-20260704')))
  );
});
