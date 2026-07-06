const CACHE_NAME = 'outbase-restart-23-font-adjust-lock';
const APP_SHELL = [
  './',
  './index.html?v=restart-23-font-adjust-lock',
  './style.css?v=restart-23-font-adjust-lock',
  './src/app.js?v=restart-23-font-adjust-lock',
  './manifest.json?v=restart-23-font-adjust-lock'
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
    caches.match(event.request).then((cached) => cached || fetch(event.request).catch(() => caches.match('./index.html?v=restart-23-font-adjust-lock')))
  );
});
