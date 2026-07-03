const CACHE_VERSION = 'core05-13-calendar-entry-redesign-20260704';
const CACHE_NAME = `outbase-${CACHE_VERSION}`;
const APP_SHELL = [
  './',
  './index.html?v=core05-13-calendar-entry-redesign-20260704',
  './manifest.json?v=core05-13-calendar-entry-redesign-20260704',
  './styles/app.css?v=core05-13-calendar-entry-redesign-20260704',
  './styles/core05-13.css?v=core05-13-calendar-entry-redesign-20260704',
  './src/main.js?v=core05-13-calendar-entry-redesign-20260704',
  './src/config/version.js?v=core05-13-calendar-entry-redesign-20260704',
  './src/core/router.js?v=core05-13-calendar-entry-redesign-20260704',
  './src/core/store.js?v=core05-13-calendar-entry-redesign-20260704',
  './src/core/storage.js?v=core05-13-calendar-entry-redesign-20260704',
  './src/ui/components.js?v=core05-13-calendar-entry-redesign-20260704',
  './src/domain/schema.js?v=core05-13-calendar-entry-redesign-20260704',
  './src/modules/home/home.js?v=core05-13-calendar-entry-redesign-20260704',
  './src/modules/search/search.js?v=core05-13-calendar-entry-redesign-20260704',
  './src/modules/prep/prep.js?v=core05-13-calendar-entry-redesign-20260704',
  './src/modules/prep/prepEngine.js?v=core05-13-calendar-entry-redesign-20260704',
  './src/modules/import/import.js?v=core05-13-calendar-entry-redesign-20260704',
  './src/modules/day/day.js?v=core05-13-calendar-entry-redesign-20260704',
  './src/modules/walk/walk.js?v=core05-13-calendar-entry-redesign-20260704',
  './src/modules/memory/memory.js?v=core05-13-calendar-entry-redesign-20260704',
  './src/modules/pwa/pwa.js?v=core05-13-calendar-entry-redesign-20260704'
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
      .catch(() => caches.match(request).then((cached) => cached || caches.match('./index.html?v=core05-13-calendar-entry-redesign-20260704')))
  );
});
