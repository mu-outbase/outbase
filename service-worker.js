const CACHE_VERSION = 'core05-12-calendar-edit-recurring-20260703';
const CACHE_NAME = `outbase-${CACHE_VERSION}`;
const APP_SHELL = [
  './',
  './index.html?v=core05-12-calendar-edit-recurring-20260703',
  './manifest.json?v=core05-12-calendar-edit-recurring-20260703',
  './styles/app.css?v=core05-12-calendar-edit-recurring-20260703',
  './styles/core05-12.css?v=core05-12-calendar-edit-recurring-20260703',
  './src/main.js?v=core05-12-calendar-edit-recurring-20260703',
  './src/config/version.js?v=core05-12-calendar-edit-recurring-20260703',
  './src/core/router.js?v=core05-12-calendar-edit-recurring-20260703',
  './src/core/store.js?v=core05-12-calendar-edit-recurring-20260703',
  './src/core/storage.js?v=core05-12-calendar-edit-recurring-20260703',
  './src/ui/components.js?v=core05-12-calendar-edit-recurring-20260703',
  './src/domain/schema.js?v=core05-12-calendar-edit-recurring-20260703',
  './src/modules/home/home.js?v=core05-12-calendar-edit-recurring-20260703',
  './src/modules/search/search.js?v=core05-12-calendar-edit-recurring-20260703',
  './src/modules/prep/prep.js?v=core05-12-calendar-edit-recurring-20260703',
  './src/modules/prep/prepEngine.js?v=core05-12-calendar-edit-recurring-20260703',
  './src/modules/import/import.js?v=core05-12-calendar-edit-recurring-20260703',
  './src/modules/day/day.js?v=core05-12-calendar-edit-recurring-20260703',
  './src/modules/walk/walk.js?v=core05-12-calendar-edit-recurring-20260703',
  './src/modules/memory/memory.js?v=core05-12-calendar-edit-recurring-20260703',
  './src/modules/pwa/pwa.js?v=core05-12-calendar-edit-recurring-20260703'
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
      .catch(() => caches.match(request).then((cached) => cached || caches.match('./index.html?v=core05-12-calendar-edit-recurring-20260703')))
  );
});
