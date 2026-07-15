const CACHE_NAME='outbase-field03-v1661-performance';
const CORE_ASSETS=[
  './','./index.html','./manifest.json?v=outbase-v1661-performance','./icons/outbase-192.png','./icons/outbase-512.png',
  './style.css?v=outbase-field03-compact-2','./style-flow.css?v=outbase-field03-compact-2','./style-memo.css?v=outbase-field03-compact-2',
  './style-review.css?v=outbase-field03-compact-2','./style-entry.css?v=outbase-field03-compact-2','./style-activity.css?v=outbase-field03-compact-2',
  './style-chappy.css?v=outbase-field03-compact-2','./style-scenarios.css?v=outbase-field03-compact-2','./style-compact-ui.css?v=outbase-field03-compact-2',
  './style-shell.css?v=outbase-v1661-performance','./style-design-system.css?v=outbase-v1661-performance','./src/config/version.js?v=outbase-v1661-performance','./src/config/module-manifest.js?v=outbase-v1661-performance',
  './src/runtime/script-loader.js?v=outbase-v1661-performance','./src/runtime/lifecycle.js?v=outbase-v1661-performance','./src/state/app-state.js?v=outbase-v1661-performance',
  './src/router.js?v=outbase-v1661-performance','./src/design/theme-controller.js?v=outbase-v1661-performance','./src/main.js?v=outbase-v1661-performance',
  './src/app.js?v=outbase-field03-compact-2','./src/outbase-core.js?v=outbase-field03-compact-2','./src/outbase-chappy.js?v=outbase-field03-compact-2',
  './src/outbase-chappy-ui.js?v=outbase-field03-compact-2','./src/outbase-import.js?v=outbase-field03-compact-2','./src/outbase-memo-ui.js?v=outbase-field03-compact-2',
  './src/outbase-review-ui.js?v=outbase-field03-compact-2','./src/outbase-flow.js?v=outbase-field03-compact-2','./src/outbase-entry.js?v=outbase-field03-compact-2',
  './src/outbase-activity.js?v=outbase-field03-compact-2','./src/outbase-navigation-guard.js?v=outbase-field03-compact-2','./src/outbase-scenarios.js?v=outbase-field03-compact-2',
  './src/outbase-activity-title-guard.js?v=outbase-field03-compact-2','./src/outbase-compact-ui.js?v=outbase-field03-compact-2',
  './src/data/ids.js?v=outbase-v160-phase1','./src/data/validation.js?v=outbase-v160-phase1','./src/data/database.js?v=outbase-v160-phase1',
  './src/data/repositories.js?v=outbase-v160-phase1','./src/data/legacy-adapter.js?v=outbase-v160-phase1','./src/data/migrations.js?v=outbase-v160-phase1','./src/data/bootstrap.js?v=outbase-v160-phase1',
  './src/domain/shared/read-utils.js?v=outbase-v1661-performance','./src/domain/plans/plan-domain.js?v=outbase-v1661-performance',
  './src/domain/preparation/preparation-domain.js?v=outbase-v1661-performance','./src/domain/vault/vault-domain.js?v=outbase-v1661-performance',
  './src/screens/plan/plan-screen-model.js?v=outbase-v1661-performance','./src/screens/preparation/preparation-screen-model.js?v=outbase-v1661-performance',
  './src/screens/vault/vault-screen-model.js?v=outbase-v1661-performance','./src/domain/bootstrap.js?v=outbase-v1661-performance',
  './src/domain/home/home-domain.js?v=outbase-v1661-performance','./src/screens/home/home-screen-model.js?v=outbase-v1661-performance',
  './src/domain/filters/family-filter-domain.js?v=outbase-v1661-performance','./src/domain/calendar/calendar-domain.js?v=outbase-v1661-performance',
  './src/screens/calendar/calendar-screen-model.js?v=outbase-v1661-performance','./src/domain/activity/activity-detail-domain.js?v=outbase-v1661-performance',
  './src/screens/activity/activity-detail-screen-model.js?v=outbase-v1661-performance','./src/shell/legacy-adapter.js?v=outbase-v1661-performance',
  './src/shell/modal-stack.js?v=outbase-v1661-performance','./src/shell/shell-model.js?v=outbase-v1661-performance',
  './src/shell/shell-renderer.js?v=outbase-v1661-performance','./src/shell/bootstrap.js?v=outbase-v1661-performance',
  './outbase_library10a/style.css?v=outbase-field03-compact-2'
];

self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE_ASSETS)));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
async function networkFirst(request,fallback){const cache=await caches.open(CACHE_NAME);try{const response=await fetch(request);if(response&&(response.ok||response.type==='opaque'))await cache.put(request,response.clone());return response;}catch(_error){return(await cache.match(request))||(fallback?await cache.match(fallback):undefined);}}
async function cacheFirst(request){const cache=await caches.open(CACHE_NAME);const cached=await cache.match(request);if(cached)return cached;const response=await fetch(request);if(response&&(response.ok||response.type==='opaque'))await cache.put(request,response.clone());return response;}
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;const url=new URL(event.request.url);if(event.request.mode==='navigate'){event.respondWith(networkFirst(event.request,'./index.html'));return;}if(url.origin!==self.location.origin)return;event.respondWith(cacheFirst(event.request));});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
