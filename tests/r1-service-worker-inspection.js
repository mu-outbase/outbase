(() => {
  'use strict';

  const MODULES=[
    '/src/storage/outbase-db-accessor.js',
    '/src/storage/persistence-guard.js',
    '/src/storage/non-destructive-export.js',
    '/src/data/safe-memo.js'
  ];

  async function cacheMatches(url,cacheNames){
    const absolute=new URL(url,location.origin).href;
    const matches=[];
    for(const cacheName of cacheNames){
      const cache=await caches.open(cacheName);
      if(await cache.match(absolute))matches.push(cacheName);
    }
    return matches;
  }

  async function run(){
    const registration=await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_,reject)=>setTimeout(()=>reject(new Error('service_worker_ready_timeout')),5000))
    ]);
    const registrations=await navigator.serviceWorker.getRegistrations();
    const cacheNames=await caches.keys();
    const modules=[];
    for(const url of MODULES){
      const response=await fetch(url,{cache:'no-store'});
      modules.push({
        url,
        status:response.status,
        ok:response.ok,
        contentType:response.headers.get('content-type'),
        cacheMatches:await cacheMatches(url,cacheNames)
      });
    }
    const result={
      ok:modules.every(module=>module.ok),
      controller:navigator.serviceWorker.controller?.scriptURL||null,
      active:registration.active?.scriptURL||null,
      scope:registration.scope,
      registrations:registrations.map(item=>({
        scope:item.scope,
        active:item.active?.scriptURL||null
      })),
      cacheNames,
      modules
    };
    document.getElementById('result').textContent=JSON.stringify(result,null,2);
    document.title=`${result.ok?'READY':'FAIL'}: OUTBASE R1 Service Worker inspection`;
    globalThis.OUTBASE_R1_SERVICE_WORKER_INSPECTION=result;
  }

  run().catch(error=>{
    const result={ok:false,error:String(error?.stack||error)};
    document.getElementById('result').textContent=JSON.stringify(result,null,2);
    document.title='FAIL: OUTBASE R1 Service Worker inspection';
  });
})();
