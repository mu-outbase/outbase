(() => {
  'use strict';
  const lifecycle=globalThis.OUTBASE_LIFECYCLE,manifest=globalThis.OUTBASE_MODULE_MANIFEST,loader=globalThis.OUTBASE_SCRIPT_LOADER;
  const router=globalThis.OUTBASE_ROUTER;

  function sessionState(){
    const query=new URLSearchParams(location.search);
    const value=query.get('recordState')||localStorage.getItem('outbase_record_session_state')||'idle';
    return ['active','paused'].includes(value)?value:'idle';
  }
  function fastShellRequested(){return router?.shellRequested?.()===true&&sessionState()==='idle';}
  async function loadLegacy(){
    lifecycle.emit('loading-legacy',{count:manifest.legacy.length});
    await loader.loadSeries(manifest.legacy);
    lifecycle.emit('legacy-ready',{count:manifest.legacy.length});
    return {status:'ready'};
  }
  async function loadShellRuntime(){
    lifecycle.emit('loading-data',{count:manifest.data.length});
    await loader.loadSeries(manifest.data);
    lifecycle.emit('data-modules-ready',{count:manifest.data.length});
    const dataResult=globalThis.OUTBASE_DATA_V160?.ready?await globalThis.OUTBASE_DATA_V160.ready:{status:'unavailable'};
    lifecycle.emit('data-ready',{status:dataResult?.status||'ready',cutover:Boolean(dataResult?.cutover)});

    lifecycle.emit('loading-domain',{count:manifest.domain.length});
    await loader.loadSeries(manifest.domain);
    const domainResult=globalThis.OUTBASE_PHASE2B_V162?.ready?await globalThis.OUTBASE_PHASE2B_V162.ready:{status:'unavailable'};
    lifecycle.emit('domain-ready',{status:domainResult?.status||'ready',count:manifest.domain.length,cutover:false});

    lifecycle.emit('loading-shell',{count:manifest.shell.length});
    await loader.loadSeries(manifest.shell);
    const shellResult=globalThis.OUTBASE_SHELL_V166?.ready||globalThis.OUTBASE_SHELL_V165?.ready||{status:'unavailable'};
    const resolvedShell=typeof shellResult?.then==='function'?await shellResult:shellResult;
    lifecycle.emit('shell-ready',{status:resolvedShell?.status||'ready',count:manifest.shell.length,cutover:false,previewOnly:true});
    if(resolvedShell?.status==='fallback')await loadLegacy();
    return {dataResult,domainResult,shellResult:resolvedShell};
  }
  async function start(){
    if(!lifecycle||!manifest||!loader||!router)throw new Error('OUTBASE startup dependencies are missing');
    const fastShell=fastShellRequested();
    lifecycle.emit('starting',{version:globalThis.OUTBASE_VERSION?.app,mode:fastShell?'shell-fast':'legacy'});

    let dataResult={status:'not_loaded'},domainResult={status:'not_loaded'},shellResult={status:'not_loaded'};
    if(fastShell){
      const runtime=await loadShellRuntime();
      dataResult=runtime.dataResult;domainResult=runtime.domainResult;shellResult=runtime.shellResult;
    }else{
      await loadLegacy();
    }

    const state=await globalThis.OUTBASE_APP_STATE.snapshot();
    lifecycle.emit('ready',{route:router.current(),state,mode:fastShell?'shell-fast':'legacy'});
    globalThis.dispatchEvent(new CustomEvent('outbase:app-ready',{detail:{version:globalThis.OUTBASE_VERSION,state,dataResult,domainResult,shellResult,mode:fastShell?'shell-fast':'legacy'}}));
    return state;
  }
  const ready=start().catch(error=>{
    lifecycle?.fail(error);console.error('[OUTBASE] Startup failed.',error);
    document.documentElement.classList.remove('outbaseShellBoot');
    document.getElementById('outbaseBootScreen')?.remove();
    const root=document.getElementById('app');
    if(root&&!root.childElementCount)root.innerHTML='<main style="padding:24px;font-family:system-ui"><h1>OUTBASEを起動できませんでした</h1><p>通信状態を確認して、もう一度開いてください。保存済みデータは削除されていません。</p><button type="button" onclick="location.reload()" style="min-height:48px;padding:0 18px">もう一度開く</button></main>';
    throw error;
  });
  globalThis.OUTBASE_APP=Object.freeze({ready,start,state:globalThis.OUTBASE_APP_STATE,router});
})();
