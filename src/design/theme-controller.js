(() => {
  'use strict';

  const NORTH='north';
  const TRAIL='trail';
  const ACTIVE_STATES=new Set(['active','paused']);
  const CLASS_NAMES=['outbaseNorth','outbaseTrailLens'];
  let scheduled=false;

  function query(){return new URLSearchParams(location.search);}
  function sessionState(){
    const value=query().get('recordState')||localStorage.getItem('outbase_record_session_state')||'idle';
    return ACTIVE_STATES.has(value)?value:'idle';
  }
  function mode(){return ACTIVE_STATES.has(sessionState())?TRAIL:NORTH;}
  function route(){
    const values=query();
    return Object.freeze({
      shell:values.get('shell')==='1',
      view:values.get('view')||'',
      tab:values.get('tab')||location.hash.replace('#','')||'plan'
    });
  }
  function applyThemeColor(value){
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.setAttribute('content',value===TRAIL?'#07110E':'#0A3328');
  }
  function sync(reason='sync'){
    if(!document.body)return null;
    const value=mode();
    const state=sessionState();
    const currentRoute=route();
    document.body.classList.remove(...CLASS_NAMES);
    document.body.classList.add(value===TRAIL?'outbaseTrailLens':'outbaseNorth');
    document.body.dataset.outbaseMode=value;
    document.body.dataset.outbaseSessionState=state;
    document.body.dataset.outbaseSurface=currentRoute.shell?`shell-${currentRoute.view||'home'}`:`legacy-${currentRoute.tab}`;
    document.documentElement.style.colorScheme=value===TRAIL?'dark':'light';
    applyThemeColor(value);
    const detail=Object.freeze({version:'v166.2-density-lock',mode:value,state,route:currentRoute,reason});
    globalThis.dispatchEvent?.(new CustomEvent('outbase:theme-change',{detail}));
    return detail;
  }
  function schedule(reason='interaction'){
    if(scheduled)return;
    scheduled=true;
    setTimeout(()=>{scheduled=false;sync(reason);},0);
  }
  function bind(){
    document.addEventListener('click',()=>schedule('click'));
    document.addEventListener('submit',()=>schedule('submit'));
    addEventListener('pageshow',()=>sync('pageshow'));
    addEventListener('popstate',()=>sync('popstate'));
    addEventListener('storage',event=>{if(event.key==='outbase_record_session_state')sync('storage');});
    addEventListener('online',()=>sync('online'));
    addEventListener('offline',()=>sync('offline'));
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')sync('visible');});
  }

  const api=Object.freeze({NORTH,TRAIL,mode,sessionState,route,sync,schedule});
  globalThis.OUTBASE_THEME_V166=api;
  bind();
  sync('startup');
})();
