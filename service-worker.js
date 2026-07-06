const CACHE_NAME = 'outbase-restart-28-no迷い-lock';
const APP_SHELL = [
  './',
  './index.html?v=restart-28-no迷い-lock',
  './style.css?v=restart-28-no迷い-lock',
  './src/app.js?v=restart-28-no迷い-lock',
  './manifest.json?v=restart-28-no迷い-lock'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).catch(() => caches.match('./index.html?v=restart-28-no迷い-lock')))
  );
});
