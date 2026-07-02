const CACHE_NAME = 'outbase-core01-ux01-v1';
const APP_SHELL = [
  './',
  './index.html',
  './styles/app-ux01.css',
  './src_ux01/main.js',
  './src_ux01/config/version.js',
  './src_ux01/core/router.js',
  './src_ux01/core/storage.js',
  './src_ux01/core/store.js',
  './src_ux01/domain/schema.js',
  './src_ux01/ui/components.js',
  './src_ux01/modules/home/home.js',
  './src_ux01/modules/prep/prep.js',
  './src_ux01/modules/prep/prepEngine.js',
  './src_ux01/modules/import/import.js',
  './src_ux01/modules/walk/walk.js',
  './src_ux01/modules/review/review.js',
  './src_ux01/modules/pwa/pwa.js'
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
  event.respondWith(fetch(event.request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request)));
});
