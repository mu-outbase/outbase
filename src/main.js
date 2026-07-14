(() => {
  'use strict';
  const lifecycle=globalThis.OUTBASE_LIFECYCLE,manifest=globalThis.OUTBASE_MODULE_MANIFEST,loader=globalThis.OUTBASE_SCRIPT_LOADER;
  async function start(){
    if(!lifecycle||!manifest||!loader)throw new Error('OUTBASE startup dependencies are missing');
    lifecycle.emit('starting',{version:globalThis.OUTBASE_VERSION?.app});
    lifecycle.emit('loading-legacy',{count:manifest.legacy.length});await loader.loadSeries(manifest.legacy);lifecycle.emit('legacy-ready',{count:manifest.legacy.length});
    lifecycle.emit('loading-data',{count:manifest.data.length});await loader.loadSeries(manifest.data);lifecycle.emit('data-modules-ready',{count:manifest.data.length});
    const dataResult=globalThis.OUTBASE_DATA_V160?.ready?await globalThis.OUTBASE_DATA_V160.ready:{status:'unavailable'};lifecycle.emit('data-ready',{status:dataResult?.status||'ready',cutover:Boolean(dataResult?.cutover)});
    lifecycle.emit('loading-domain',{count:manifest.domain.length});await loader.loadSeries(manifest.domain);
    const domainResult=globalThis.OUTBASE_PHASE2B_V162?.ready?await globalThis.OUTBASE_PHASE2B_V162.ready:{status:'unavailable'};lifecycle.emit('domain-ready',{status:domainResult?.status||'ready',count:manifest.domain.length,cutover:false});
    lifecycle.emit('loading-shell',{count:manifest.shell.length});await loader.loadSeries(manifest.shell);
    const shellResult=globalThis.OUTBASE_SHELL_V165?.ready?await globalThis.OUTBASE_SHELL_V165.ready:{status:'unavailable'};lifecycle.emit('shell-ready',{status:shellResult?.status||'ready',count:manifest.shell.length,cutover:false,previewOnly:true});
    const state=await globalThis.OUTBASE_APP_STATE.snapshot();lifecycle.emit('ready',{route:globalThis.OUTBASE_ROUTER.current(),state});
    globalThis.dispatchEvent(new CustomEvent('outbase:app-ready',{detail:{version:globalThis.OUTBASE_VERSION,state,dataResult,domainResult,shellResult}}));return state;
  }
  const ready=start().catch(error=>{lifecycle?.fail(error);console.error('[OUTBASE] Startup failed.',error);const root=document.getElementById('app');if(root&&!root.childElementCount){root.innerHTML='<main style="padding:24px;font-family:system-ui"><h1>OUTBASEを起動できませんでした</h1><p>通信状態を確認して、もう一度開いてください。保存済みデータは削除されていません。</p><button type="button" onclick="location.reload()" style="min-height:48px;padding:0 18px">もう一度開く</button></main>';}throw error;});
  globalThis.OUTBASE_APP=Object.freeze({ready,start,state:globalThis.OUTBASE_APP_STATE,router:globalThis.OUTBASE_ROUTER});
})();
