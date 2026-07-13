const CACHE_NAME='outbase-field03-flow015';
const CORE_ASSETS=[
  './',
  './index.html',
  './style.css?v=outbase-field03-flow015',
  './style-flow.css?v=outbase-field03-flow015',
  './src/app.js?v=outbase-field03-flow015',
  './src/outbase-flow.js?v=outbase-field03-flow015',
  './manifest.json?v=outbase-field03-flow015',
  './outbase_library10a/style.css?v=outbase-field03-flow015'
];
const OPTIONAL_EXTERNAL_ASSETS=[
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
  'https://cdn.jsdelivr.net/npm/tesseract.js@7/dist/tesseract.min.js'
];

async function cacheOptionalExternalAssets(cache){
  await Promise.allSettled(OPTIONAL_EXTERNAL_ASSETS.map(async url=>{
    const request=new Request(url,{mode:'no-cors',cache:'reload'});
    const response=await fetch(request);
    if(response)await cache.put(request,response.clone());
  }));
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    await cache.addAll(CORE_ASSETS);
    await cacheOptionalExternalAssets(cache);
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

async function networkFirst(request,fallback){
  const cache=await caches.open(CACHE_NAME);
  try{
    const response=await fetch(request);
    if(response&&(response.ok||response.type==='opaque'))await cache.put(request,response.clone());
    return response;
  }catch(_error){
    return (await cache.match(request))||(fallback?await cache.match(fallback):undefined);
  }
}

async function cacheFirst(request){
  const cache=await caches.open(CACHE_NAME);
  const cached=await cache.match(request);
  if(cached)return cached;
  const response=await fetch(request);
  if(response&&(response.ok||response.type==='opaque'))await cache.put(request,response.clone());
  return response;
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(event.request.mode==='navigate'){
    event.respondWith(networkFirst(event.request,'./index.html'));
    return;
  }
  if(url.origin!==self.location.origin){
    event.respondWith(cacheFirst(event.request));
    return;
  }
  event.respondWith(cacheFirst(event.request));
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});
