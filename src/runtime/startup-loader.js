(() => {
  'use strict';
  // Static entry dependencies must finish before their consumers execute.
  const sources=[
    [
        "src/config/version.js?v=outbase-mvp-preparation-share-20261115-v1",
        "OUTBASE_VERSION"
    ],
    [
        "src/config/module-manifest.js?v=outbase-mvp-preparation-share-20261115-v1",
        "OUTBASE_MODULE_MANIFEST"
    ],
    [
        "src/runtime/script-loader.js?v=outbase-v1663-visual",
        "OUTBASE_SCRIPT_LOADER"
    ],
    [
        "src/runtime/lifecycle.js?v=outbase-v1663-visual",
        "OUTBASE_LIFECYCLE"
    ],
    [
        "src/state/app-state.js?v=outbase-v1663-visual",
        "OUTBASE_APP_STATE"
    ],
    [
        "src/router.js?v=outbase-v16631-r3-route-cutover-fix-v222-router",
        "OUTBASE_ROUTER"
    ],
    [
        "src/design/theme-controller.js?v=outbase-v1663-visual",
        "OUTBASE_THEME_V166"
    ],
    [
        "src/services/weather-service.js?v=outbase-mvp-preparation-share-20261115-v1",
        null
    ],
    [
        "src/services/weather-custom-location-fix.js?v=outbase-mvp-preparation-share-20261115-v1",
        null
    ],
    [
        "src/services/weather-external-links.js?v=outbase-v1663-home-v36-r34",
        null
    ],
    [
        "src/main.js?v=outbase-v1663-visual",
        "OUTBASE_APP"
    ],
    [
        "src/shell/navigation-audit-fix.js?v=outbase-v1663-home-v36-r34-nav1",
        null
    ],
    [
        "src/shell/about-outbase.js?v=outbase-r3-route-cutover-fix-v222",
        null
    ]
];
  function load(source,expected){
    return new Promise((resolve,reject)=>{
      let attempt=0;
      const append=()=>{
        const script=document.createElement('script');script.src=source;script.async=false;
        let settled=false;
        const timer=setTimeout(()=>finish(new Error('Startup request timed out: '+source),false),20000);
        function finish(error,retry){
          if(settled)return;settled=true;clearTimeout(timer);script.onload=script.onerror=null;
          if(error){script.remove();if(retry&&attempt++===0){append();return;}reject(error);return;}
          resolve();
        }
        script.onload=()=>finish(expected&&!globalThis[expected]?new Error('Startup dependency unavailable: '+expected):null,false);
        // Only retry a failed request, never a timeout or a partially executed script.
        script.onerror=()=>finish(new Error('Unable to load startup dependency: '+source),true);
        document.head.appendChild(script);
      };
      append();
    });
  }
  function failed(error){
    globalThis.OUTBASE_STARTUP_ERROR=error.message;
    globalThis.OUTBASE_LIFECYCLE?.fail?.(error);
    document.documentElement.classList.remove('outbaseShellBoot');
    document.getElementById('outbaseBootScreen')?.remove();
    const root=document.getElementById('app');
    if(root){
      root.replaceChildren();const box=document.createElement('main');box.style.cssText='padding:24px;font-family:system-ui';
      const heading=document.createElement('h1');heading.textContent='OUTBASEを起動できませんでした';
      const message=document.createElement('p');message.textContent='必要なファイルを取得できませんでした。通信状態を確認して、もう一度開いてください。保存済みデータは削除されていません。';
      const retry=document.createElement('button');retry.type='button';retry.textContent='もう一度開く';retry.style.cssText='min-height:48px;padding:0 18px';retry.addEventListener('click',()=>location.reload());
      box.append(heading,message,retry);root.append(box);
    }
    console.error('[OUTBASE startup dependencies]',error);
    return {status:'failed',error:error.message};
  }
  globalThis.OUTBASE_STARTUP_READY=(async()=>{
    try{for(const [source,expected] of sources)await load(source,expected);return {status:'ready'};}
    catch(error){return failed(error);}
  })();
})();
