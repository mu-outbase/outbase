const CACHE_NAME='outbase-field03-compact-1';
const CORE_ASSETS=[
  './','./index.html',
  './style.css?v=outbase-field03-compact-1','./style-flow.css?v=outbase-field03-compact-1','./style-memo.css?v=outbase-field03-compact-1',
  './style-review.css?v=outbase-field03-compact-1','./style-entry.css?v=outbase-field03-compact-1','./style-activity.css?v=outbase-field03-compact-1','./style-chappy.css?v=outbase-field03-compact-1',
  './style-scenarios.css?v=outbase-field03-compact-1','./style-compact-ui.css?v=outbase-field03-compact-1',
  './src/app.js?v=outbase-field03-compact-1','./src/outbase-core.js?v=outbase-field03-compact-1',
  './src/outbase-chappy.js?v=outbase-field03-compact-1','./src/outbase-chappy-ui.js?v=outbase-field03-compact-1','./src/outbase-import.js?v=outbase-field03-compact-1','./src/outbase-memo-ui.js?v=outbase-field03-compact-1',
  './src/outbase-review-ui.js?v=outbase-field03-compact-1','./src/outbase-flow.js?v=outbase-field03-compact-1','./src/outbase-entry.js?v=outbase-field03-compact-1',
  './src/outbase-activity.js?v=outbase-field03-compact-1','./src/outbase-navigation-guard.js?v=outbase-field03-compact-1','./src/outbase-scenarios.js?v=outbase-field03-compact-1',
  './src/outbase-activity-title-guard.js?v=outbase-field03-compact-1','./src/outbase-compact-ui.js?v=outbase-field03-compact-1',
  './manifest.json?v=outbase-field03-compact-1','./outbase_library10a/style.css?v=outbase-field03-compact-1'
];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE_ASSETS)));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
async function networkFirst(request,fallback){const cache=await caches.open(CACHE_NAME);try{const response=await fetch(request);if(response&&(response.ok||response.type==='opaque'))await cache.put(request,response.clone());return response;}catch(_error){return(await cache.match(request))||(fallback?await cache.match(fallback):undefined);}}
async function cacheFirst(request){const cache=await caches.open(CACHE_NAME);const cached=await cache.match(request);if(cached)return cached;const response=await fetch(request);if(response&&(response.ok||response.type==='opaque'))await cache.put(request,response.clone());return response;}
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;const url=new URL(event.request.url);if(event.request.mode==='navigate'){event.respondWith(networkFirst(event.request,'./index.html'));return;}if(url.origin!==self.location.origin)return;event.respondWith(cacheFirst(event.request));});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
