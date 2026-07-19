(() => {
  'use strict';

  if(globalThis.OUTBASE_LEGACY_RETURN_BRIDGE_V18)return;

  const contextApi=globalThis.OUTBASE_ACTIVITY_CONTEXT_V18||globalThis.OUTBASE_ACTIVITY_CONTEXT;
  const query=new URLSearchParams(location.search);
  const context=contextApi?.current?.()||{};
  const storedReturn=contextApi?.returnContext?.()||{};
  const targetName=query.get('returnShell')||context.returnShell||storedReturn.returnShell||'';
  const activityId=query.get('returnActivityId')||query.get('activityId')||context.returnActivityId||context.activityId||storedReturn.activityId||'';
  const planId=query.get('planId')||context.planId||storedReturn.planId||'';
  const allowed=new Set(['home','activity','preparation','vault']);
  if(!allowed.has(targetName))return;

  const labels=Object.freeze({
    home:'OUTBASEへ戻る',
    activity:'予定詳細へ戻る',
    preparation:'準備へ戻る',
    vault:'思い出へ戻る'
  });

  function bridgeContext(){
    return contextApi?.normalize?.({
      ...context,
      activityId,
      planId,
      returnShell:targetName,
      returnActivityId:activityId,
      source:'legacy-return-bridge-v18'
    },context)||{activityId,planId,returnShell:targetName,returnActivityId:activityId};
  }

  function seedContext(){
    const value=bridgeContext();
    if(contextApi?.seedLocal){
      contextApi.seedLocal(value,{source:'legacy-return-bridge-v18',record:query.get('tab')==='record'});
      return true;
    }
    try{
      if(activityId){
        localStorage.setItem('outbase_core_activity_id',String(activityId));
        localStorage.setItem('outbase_primary_activity_id_v2',String(activityId));
      }
      if(planId)localStorage.setItem('outbase_active_plan_id',String(planId));
      return true;
    }catch(_error){return false;}
  }

  function persistContextWhenReady(){
    if(!activityId)return;
    let attempts=0;
    const run=async()=>{
      attempts+=1;
      if(contextApi?.persist){
        try{if(await contextApi.persist(bridgeContext()))return;}catch(_error){}
      }else{
        const repo=globalThis.OUTBASE_REPOSITORIES_V160;
        if(repo?.setCurrentActivity){
          try{await repo.setCurrentActivity(activityId,{mode:'legacy-shadow',current_plan_id:planId||null});return;}catch(_error){}
        }
      }
      if(attempts<40)setTimeout(run,250);
    };
    run();
  }

  const sessionState=()=>{
    try{
      const value=localStorage.getItem('outbase_record_session_state')||'idle';
      return ['active','paused'].includes(value)?value:'idle';
    }catch(_error){return 'idle';}
  };

  const targetUrl=()=>{
    const value=bridgeContext();
    if(contextApi?.shellUrl)return contextApi.shellUrl(targetName,value,{
      activityId,
      planId,
      returnShell:undefined,
      returnActivityId:undefined
    });
    const next=new URL(location.pathname,location.href);
    next.searchParams.set('shell','1');
    next.searchParams.set('view',targetName);
    if(activityId)next.searchParams.set('activityId',activityId);
    if(planId)next.searchParams.set('planId',planId);
    return next.href;
  };

  const css=`
    #outbaseLegacyReturnBridge{
      position:fixed;z-index:2147483200;left:12px;right:12px;
      bottom:calc(84px + env(safe-area-inset-bottom));display:flex;justify-content:center;pointer-events:none;
    }
    #outbaseLegacyReturnBridge button{
      min-height:44px;max-width:360px;width:100%;padding:0 18px;
      border:1px solid rgba(255,255,255,.26);border-radius:15px;background:#0d4e38;color:#fff;
      box-shadow:0 10px 30px rgba(7,48,33,.25);font:800 13px/1 system-ui,-apple-system,"Noto Sans JP",sans-serif;
      letter-spacing:.01em;pointer-events:auto;
    }
    #outbaseLegacyReturnBridge button[disabled]{opacity:.72;background:#4b5851;box-shadow:none}
    @media(max-width:370px){#outbaseLegacyReturnBridge{left:8px;right:8px}}
  `;

  function ensure(){
    let host=document.getElementById('outbaseLegacyReturnBridge');
    if(host)return host;
    let style=document.getElementById('outbaseLegacyReturnBridgeStyle');
    if(!style){
      style=document.createElement('style');style.id='outbaseLegacyReturnBridgeStyle';style.textContent=css;document.head.appendChild(style);
    }
    host=document.createElement('div');host.id='outbaseLegacyReturnBridge';host.setAttribute('aria-live','polite');
    host.innerHTML='<button type="button"></button>';
    document.body.appendChild(host);
    host.querySelector('button').addEventListener('click',()=>{
      if(sessionState()!=='idle')return;
      location.assign(targetUrl());
    });
    return host;
  }

  function sync(){
    const host=ensure();
    const button=host.querySelector('button');
    const state=sessionState();
    const active=state!=='idle';
    button.disabled=active;
    button.textContent=active?'活動終了後に予定へ戻れます':(labels[targetName]||'OUTBASEへ戻る');
    host.hidden=false;
  }

  const start=()=>{
    seedContext();
    persistContextWhenReady();
    sync();
    setInterval(sync,500);
    addEventListener('storage',event=>{if(event.key==='outbase_record_session_state')sync();});
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();

  const api=Object.freeze({targetName,activityId,planId,targetUrl,sessionState,seedContext,persistContextWhenReady,sync});
  globalThis.OUTBASE_LEGACY_RETURN_BRIDGE_V18=api;
  globalThis.OUTBASE_LEGACY_RETURN_BRIDGE_V17=api;
})();
