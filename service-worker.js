const CACHE='outbase-core08-f1-full-mode-experience-20260705';
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(['./','./index.html','./styles/app.css','./src/app.js','./manifest.json']))));
self.addEventListener('fetch',event=>event.respondWith(caches.match(event.request).then(r=>r||fetch(event.request))));
