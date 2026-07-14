(() => {
  'use strict';

  const loaded=new Map();

  function absoluteUrl(source){
    return new URL(source,document.baseURI).href;
  }

  function load(source,{timeoutMs=20000}={}){
    const url=absoluteUrl(source);
    if(loaded.has(url))return loaded.get(url);

    const promise=new Promise((resolve,reject)=>{
      const existing=[...document.scripts].find(script=>script.src===url);
      if(existing?.dataset.outbaseLoaded==='1'){
        resolve({source,url,reused:true});
        return;
      }

      const script=existing||document.createElement('script');
      script.src=url;
      script.async=false;
      script.dataset.outbaseRuntime='1';

      let settled=false;
      const timer=setTimeout(()=>finish(new Error(`Timed out while loading ${source}`)),timeoutMs);
      function finish(error){
        if(settled)return;
        settled=true;
        clearTimeout(timer);
        script.onload=null;
        script.onerror=null;
        if(error){loaded.delete(url);reject(error);return;}
        script.dataset.outbaseLoaded='1';
        resolve({source,url,reused:Boolean(existing)});
      }

      script.onload=()=>finish();
      script.onerror=()=>finish(new Error(`Unable to load ${source}`));
      if(!existing)document.head.appendChild(script);
    });

    loaded.set(url,promise);
    return promise;
  }

  async function loadSeries(sources,options={}){
    const results=[];
    for(const source of sources||[])results.push(await load(source,options));
    return results;
  }

  globalThis.OUTBASE_SCRIPT_LOADER=Object.freeze({load,loadSeries,absoluteUrl});
})();
