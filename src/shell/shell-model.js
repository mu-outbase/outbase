(() => {
  'use strict';
  const NAV=Object.freeze([
    {id:'home',label:'ホーム'},{id:'search',label:'探す'},{id:'central',label:'追加'},{id:'vault',label:'保管庫'}
  ]);
  const CACHE_TTL_MS=30000;
  const cache=new Map();

  function keyFor(route){
    if(route.name==='activity')return `activity:${route.activityId||''}`;
    if(route.name==='calendar')return `calendar:${route.month||''}:${route.people||''}`;
    return route.name;
  }
  function valid(entry){return entry&&Date.now()-entry.createdAt<CACHE_TTL_MS;}
  async function routePayload(route,{force=false}={}){
    const key=keyFor(route);
    const existing=cache.get(key);
    if(!force&&valid(existing))return existing.value;

    let value={};
    if(route.name==='home'){
      value={home:await globalThis.OUTBASE_HOME_SCREEN_MODEL_V164.build()};
    }else if(route.name==='vault'){
      value={vault:await globalThis.OUTBASE_VAULT_SCREEN_MODEL_V162.build({activityLimit:12,recordLimit:8,assetLimit:8})};
    }else if(route.name==='activity'){
      value={detail:await globalThis.OUTBASE_ACTIVITY_DETAIL_SCREEN_MODEL_V165.build(route.activityId)};
    }else if(route.name==='calendar'){
      value={calendar:await globalThis.OUTBASE_CALENDAR_SCREEN_MODEL_V165.build({month:route.month,selected:route.people})};
    }
    cache.set(key,{createdAt:Date.now(),value});
    return value;
  }
  async function build(options={}){
    const route=globalThis.OUTBASE_ROUTER.current();
    const legacy=(globalThis.OUTBASE_LEGACY_UI_V165||globalThis.OUTBASE_LEGACY_UI_V164).session();
    const payload=await routePayload(route,options);
    const home=payload.home||null;
    const vault=payload.vault||null;
    return Object.freeze({
      version:'v166.2-density-lock',route,legacy,online:navigator.onLine,nav:NAV,
      home,detail:payload.detail||null,calendar:payload.calendar||null,
      now:home?.current||[],next:home?.next||[],quick:home?.quick||[],recent:home?.recent||[],family:home?.family||null,
      calendarUrl:globalThis.OUTBASE_ROUTER.shellUrl('calendar'),
      vaultSummary:vault?.summary||{activityCount:0,recordCount:0,assetCount:0},
      vaultActivities:(vault?.activities||[]).slice(0,12),assets:(vault?.assets||[]).slice(0,5),generatedAt:new Date().toISOString()
    });
  }
  function invalidate(match=''){
    if(!match){cache.clear();return;}
    for(const key of cache.keys())if(key===match||key.startsWith(`${match}:`))cache.delete(key);
  }
  async function preload(name,values={}){
    const route={name,activityId:values.activityId||null,month:values.month||null,people:values.people||''};
    try{return await routePayload(route);}catch(_error){return null;}
  }
  const api=Object.freeze({build,NAV,invalidate,preload,keyFor,CACHE_TTL_MS});
  globalThis.OUTBASE_SHELL_MODEL_V166=api;
  globalThis.OUTBASE_SHELL_MODEL_V165=api;
  globalThis.OUTBASE_SHELL_MODEL_V164=api;
})();
