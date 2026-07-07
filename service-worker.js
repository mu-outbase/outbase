const CACHE_NAME = 'outbase-restart-42-mvp-line-lock';
const ASSETS = [
  './',
  './index.html?v=restart-42-mvp-line-lock',
  './style.css?v=restart-42-mvp-line-lock',
  './src/app.js?v=restart-42-mvp-line-lock',
  './manifest.json?v=restart-42-mvp-line-lock'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS).catch(() => undefined)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => undefined);
      return response;
    }).catch(() => caches.match(event.request))
  );
});
