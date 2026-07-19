(() => {
  'use strict';

  if(globalThis.OUTBASE_ACTIVITY_CONTEXT_V18)return;

  const VERSION='v18.1-r1-home-alignment';
  const CONTEXT_KEY='outbase_activity_context_v1';
  const PENDING_KEY='outbase_pending_activity_context_v1';
  const RETURN_KEY='outbase_return_context_v1';
  const TYPE_KEY='outbase_record_activity_type_v1';
  const ACTIVITY_KEY='outbase_record_activity_id_v1';
  const PLAN_KEY='outbase_record_plan_id_v1';
  const SOURCE_KEY='outbase_activity_context_source_v1';
  const ALLOWED_RETURN=new Set(['home','activity','preparation','vault']);
  const TYPE_LABELS=Object.freeze({
    camp:'キャンプ',walk:'散歩',drive:'ドライブ',shopping:'ショッピング',event:'イベント',other:'活動',
    'キャンプ':'キャンプ','散歩':'散歩','ドライブ散歩':'ドライブ散歩','ドライブ':'ドライブ','ショッピング':'ショッピング','イベント':'イベント','予定':'予定'
  });

  const text=value=>String(value??'').trim();
  const now=()=>Date.now();

  function safeGet(key,fallback=''){
    try{return localStorage.getItem(key)??fallback;}catch(_error){return fallback;}
  }
  function safeSet(key,value){
    try{
      if(value===null||value===undefined||value==='')localStorage.removeItem(key);
      else localStorage.setItem(key,String(value));
      return true;
    }catch(_error){return false;}
  }
  function readJson(key,fallback=null){
    try{
      const value=JSON.parse(safeGet(key,'null'));
      return value&&typeof value==='object'?value:fallback;
    }catch(_error){return fallback;}
  }
  function writeJson(key,value){
    try{localStorage.setItem(key,JSON.stringify(value));return true;}catch(_error){return false;}
  }

  function planIdFrom(item={}){
    return text(item.planId||item.legacyPlanId||item.currentPlanId||item.metadata?.legacy_plan?.id||item.metadata?.legacy_plan?.planId);
  }
  function typeFrom(item={}){
    return text(item.activityType||item.type||item.typeLabel||item.metadata?.legacy_plan?.type||item.metadata?.legacy_plan?.activityType);
  }
  function titleFrom(item={}){
    return text(item.activityTitle||item.title||item.name||item.metadata?.legacy_plan?.title||item.metadata?.legacy_plan?.name);
  }
  function typeLabel(value){
    const raw=text(value);
    return TYPE_LABELS[raw]||raw||'活動';
  }

  function normalize(input={},fallback={}){
    const directActivityId=text(input.activityId||input.id||input.current_activity_id||input.returnActivityId);
    const fallbackActivityId=text(fallback.activityId||fallback.id||fallback.current_activity_id);
    const activityId=directActivityId||fallbackActivityId;
    const compatible=!directActivityId||!fallbackActivityId||directActivityId===fallbackActivityId;

    const directPlanId=text(input.planId||input.legacyPlanId||input.current_plan_id||planIdFrom(input));
    const fallbackPlanId=text(fallback.planId||fallback.legacyPlanId||fallback.current_plan_id||planIdFrom(fallback));
    const planId=directPlanId||(compatible?fallbackPlanId:'');

    const activityType=text(input.activityType||input.type)||(compatible?text(fallback.activityType||fallback.type):'');
    const activityTitle=text(input.activityTitle||input.title)||(compatible?text(fallback.activityTitle||fallback.title):'');
    const returnShellRaw=text(input.returnShell)||(compatible?text(fallback.returnShell):'');
    const returnShell=ALLOWED_RETURN.has(returnShellRaw)?returnShellRaw:'';
    const returnActivityId=text(input.returnActivityId)||(compatible?text(fallback.returnActivityId):'')||activityId;

    return Object.freeze({
      version:VERSION,
      activityId,
      planId,
      activityType,
      activityTypeLabel:typeLabel(activityType),
      activityTitle,
      startAt:text(input.startAt)||(compatible?text(fallback.startAt):''),
      endAt:text(input.endAt)||(compatible?text(fallback.endAt):''),
      returnShell,
      returnActivityId,
      source:text(input.source)||(compatible?text(fallback.source):''),
      savedAt:Number(input.savedAt||(compatible?fallback.savedAt:0)||0)
    });
  }

  function fromActivity(item={},overrides={}){
    return normalize({
      activityId:item.id||item.activityId,
      planId:planIdFrom(item),
      activityType:typeFrom(item),
      activityTitle:titleFrom(item),
      startAt:item.startAt||item.calendar?.[0]?.startAt,
      endAt:item.endAt||item.calendar?.[0]?.endAt,
      ...overrides
    },current());
  }

  function queryContext(search=location.search){
    const query=search instanceof URLSearchParams?search:new URLSearchParams(search||'');
    return {
      activityId:query.get('activityId')||query.get('returnActivityId')||'',
      planId:query.get('planId')||'',
      activityType:query.get('activityType')||'',
      activityTitle:query.get('activityTitle')||'',
      startAt:query.get('startAt')||'',
      endAt:query.get('endAt')||'',
      returnShell:query.get('returnShell')||'',
      returnActivityId:query.get('returnActivityId')||query.get('activityId')||'',
      source:'url'
    };
  }

  function stored(){return normalize(readJson(CONTEXT_KEY,{})||{});}
  function pending(){return normalize(readJson(PENDING_KEY,{})||{});}
  function current(){
    const base=stored();
    const pendingValue=pending();
    const pendingCompatible=pendingValue.activityId&&(!base.activityId||pendingValue.activityId===base.activityId);
    const fallback=pendingCompatible?normalize(pendingValue,base):base;
    return normalize(queryContext(),fallback);
  }

  function dispatch(context,reason='changed'){
    try{
      globalThis.dispatchEvent(new CustomEvent('outbase:context-changed',{detail:{context,reason}}));
    }catch(_error){}
  }

  function seedLocal(input={},options={}){
    const context=normalize({...input,source:options.source||input.source||'local',savedAt:now()},current());
    if(!context.activityId)return context;

    writeJson(CONTEXT_KEY,context);
    writeJson(PENDING_KEY,context);
    safeSet(SOURCE_KEY,context.source||'local');
    safeSet('outbase_core_activity_id',context.activityId);
    safeSet('outbase_primary_activity_id_v2',context.activityId);
    safeSet(ACTIVITY_KEY,context.activityId);

    if(context.planId){
      safeSet('outbase_active_plan_id',context.planId);
      safeSet('outbase_active_plan_id_v1',context.planId);
      safeSet(PLAN_KEY,context.planId);
    }
    if(context.activityType)safeSet(TYPE_KEY,context.activityType);

    const query=new URLSearchParams(location.search);
    const recordMode=options.record===true||query.get('tab')==='record';
    if(recordMode){
      const target=context.activityTitle||context.activityTypeLabel||'活動';
      if(target)safeSet('outbase_record_target',target);
    }

    if(context.returnShell){
      writeJson(RETURN_KEY,{
        returnShell:context.returnShell,
        activityId:context.returnActivityId||context.activityId,
        planId:context.planId,
        savedAt:now()
      });
    }

    dispatch(context,options.reason||'seed-local');
    return context;
  }

  async function persist(input={}){
    const context=normalize(input,current());
    if(!context.activityId)return false;
    const repo=globalThis.OUTBASE_REPOSITORIES_V160;
    if(!repo?.setCurrentActivity)return false;
    try{
      await repo.setCurrentActivity(context.activityId,{
        mode:'legacy-shadow',
        current_plan_id:context.planId||null,
        activity_type:context.activityType||null,
        activity_title:context.activityTitle||null,
        context_version:VERSION
      });
      const pendingValue=readJson(PENDING_KEY,{})||{};
      if(text(pendingValue.activityId)===context.activityId)safeSet(PENDING_KEY,'');
      dispatch(context,'persisted');
      return true;
    }catch(_error){return false;}
  }

  function activate(input={},options={}){
    const base=input?.id||input?.metadata?fromActivity(input,options):normalize({...input,...options},current());
    const context=seedLocal(base,{source:options.source||base.source||'activate',record:options.record,reason:options.reason||'activate'});
    const persisted=options.persist===false?Promise.resolve(false):persist(context);
    return Object.freeze({context,persisted});
  }

  function params(input={},extra={}){
    const context=normalize(input,current());
    return {
      activityId:context.activityId||undefined,
      planId:context.planId||undefined,
      activityType:context.activityType||undefined,
      activityTitle:context.activityTitle||undefined,
      returnShell:context.returnShell||undefined,
      returnActivityId:context.returnActivityId||context.activityId||undefined,
      ...extra
    };
  }

  function shellUrl(name,input={},extra={}){
    const router=globalThis.OUTBASE_ROUTER;
    return router?.shellUrl?.(name,params(input,extra))||`${location.pathname}?shell=1&view=${encodeURIComponent(name)}`;
  }
  function legacyUrl(name,input={},extra={}){
    const router=globalThis.OUTBASE_ROUTER;
    return router?.legacyUrl?.(name,params(input,extra))||`${location.pathname}?tab=${encodeURIComponent(name)}`;
  }

  function returnContext(){
    const value=readJson(RETURN_KEY,{})||{};
    return Object.freeze({
      returnShell:ALLOWED_RETURN.has(text(value.returnShell))?text(value.returnShell):'',
      activityId:text(value.activityId),
      planId:text(value.planId),
      savedAt:Number(value.savedAt||0)
    });
  }

  function syncFromUrl(){
    const query=new URLSearchParams(location.search);
    const hasContext=['activityId','returnActivityId','planId','activityType','activityTitle','returnShell'].some(key=>query.has(key));
    const pendingValue=readJson(PENDING_KEY,null);
    if(!hasContext&&!pendingValue)return current();
    const context=normalize(queryContext(query),pendingValue||stored());
    if(!context.activityId)return context;
    return seedLocal(context,{source:'url-bootstrap',record:query.get('tab')==='record',reason:'url-bootstrap'});
  }

  const api=Object.freeze({
    VERSION,CONTEXT_KEY,PENDING_KEY,RETURN_KEY,TYPE_LABELS,
    normalize,fromActivity,queryContext,stored,pending,current,seedLocal,persist,activate,params,
    shellUrl,legacyUrl,returnContext,syncFromUrl,planIdFrom,typeFrom,titleFrom,typeLabel
  });
  globalThis.OUTBASE_ACTIVITY_CONTEXT_V18=api;
  globalThis.OUTBASE_ACTIVITY_CONTEXT=api;
  syncFromUrl();
})();
