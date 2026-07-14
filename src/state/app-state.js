(() => {
  'use strict';
  const listeners=new Set();
  const safeJson=(key,fallback)=>{try{const raw=localStorage.getItem(key);return raw===null?fallback:JSON.parse(raw);}catch(_error){return fallback;}};
  function legacySnapshot(){
    const status=localStorage.getItem('outbase_record_session_state')||'idle';
    return Object.freeze({
      tab:new URLSearchParams(location.search).get('tab')||location.hash.replace('#','')||'plan',
      recordState:['active','paused'].includes(status)?status:'idle',recordTarget:localStorage.getItem('outbase_record_target')||'未選択',
      sessionId:localStorage.getItem('outbase_record_session_id')||null,activePlanId:localStorage.getItem('outbase_active_plan_id')||null,
      currentActivityId:localStorage.getItem('outbase_core_activity_id')||localStorage.getItem('outbase_primary_activity_id_v2')||null,
      savedRecordCount:(safeJson('outbase_record_saved_records',[])||[]).length,online:navigator.onLine,visibility:document.visibilityState
    });
  }
  async function snapshot(){
    const legacy=legacySnapshot();let story=null,phase2b=null,phase4=null;
    try{story=await globalThis.OUTBASE_DATA_V160?.repositories?.runtimeContext?.()||null;}catch(_error){}
    try{phase2b=await globalThis.OUTBASE_PHASE2B_V162?.snapshot?.()||null;}catch(_error){}
    try{phase4=globalThis.OUTBASE_SHELL_V164?.snapshot?.()||null;}catch(_error){}
    return Object.freeze({legacy,story,phase2b,phase4,generatedAt:new Date().toISOString()});
  }
  async function notify(reason){const value=await snapshot();for(const listener of listeners){try{listener(value,reason);}catch(error){console.error('[OUTBASE state listener]',error);}}globalThis.dispatchEvent(new CustomEvent('outbase:state-change',{detail:{value,reason}}));return value;}
  function subscribe(listener){if(typeof listener!=='function')throw new TypeError('listener must be a function');listeners.add(listener);return()=>listeners.delete(listener);}
  addEventListener('online',()=>notify('online'));addEventListener('offline',()=>notify('offline'));addEventListener('popstate',()=>notify('navigation'));addEventListener('hashchange',()=>notify('navigation'));
  addEventListener('storage',event=>{if(event.key?.startsWith('outbase_'))notify('storage');});
  addEventListener('outbase:data-v160-ready',()=>notify('data-ready'));addEventListener('outbase:phase2b-ready',()=>notify('phase2b-ready'));addEventListener('outbase:phase4-ready',()=>notify('phase4-ready'));
  document.addEventListener('visibilitychange',()=>notify('visibility'));
  globalThis.OUTBASE_APP_STATE=Object.freeze({snapshot,legacySnapshot,notify,subscribe});
})();
