const CACHE_NAME = 'outbase-restart-32-smart-calendar-lock';
const APP_SHELL = [
  './',
  './index.html?v=restart-32-smart-calendar-lock',
  './style.css?v=restart-32-smart-calendar-lock',
  './src/app.js?v=restart-32-smart-calendar-lock',
  './manifest.json?v=restart-32-smart-calendar-lock'
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
    caches.match(event.request).then((cached) => cached || fetch(event.request).catch(() => caches.match('./index.html?v=restart-32-smart-calendar-lock')))
  );
});
