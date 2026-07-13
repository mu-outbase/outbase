const CACHE_NAME='outbase-field03-core01b';
const CORE_ASSETS=[
  './',
  './index.html',
  './style.css?v=outbase-field03-core01b',
  './style-flow.css?v=outbase-field03-core01b',
  './style-entry.css?v=outbase-field03-core01b',
  './style-activity.css?v=outbase-field03-core01b',
  './src/app.js?v=outbase-field03-core01b',
  './src/outbase-core.js?v=outbase-field03-core01b',
  './src/outbase-flow.js?v=outbase-field03-core01b',
  './src/outbase-entry.js?v=outbase-field03-core01b',
  './src/outbase-activity.js?v=outbase-field03-core01b',
  './manifest.json?v=outbase-field03-core01b',
  './outbase_library10a/style.css?v=outbase-field03-core01b'
];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request).then(response=>{
      const copy=response.clone();
      caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));
      return response;
    }).catch(()=>caches.match('./index.html')));
    return;
  }
  if(url.origin!==self.location.origin)return;
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
    const copy=response.clone();
    caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));
    return response;
  })));
});
