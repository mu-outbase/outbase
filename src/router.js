(() => {
  'use strict';
  const listeners=new Set();
  const legacyToRoute=Object.freeze({plan:'home',search:'search',prep:'activity',record:'record',memory:'vault'});
  const routeToLegacy=Object.freeze({home:'plan',search:'search',activity:'prep',preparation:'prep',record:'record',calendar:'plan',vault:'memory'});
  const SHELL_ROUTES=new Set(['home','search','vault','activity','preparation','record','calendar','plan-editor','preparation-detail','start','memo','places','assets']);
  const RESERVED=new Set(['shell','view']);
  const SCROLL_KEY='outbaseScrollY';
  const SCROLL_ROUTE_KEY='outbaseScrollRouteKey';
  const CONTEXT_KEY='outbase_activity_context_v1';
  const PENDING_KEY='outbase_pending_activity_context_v1';
  const popListeners=new Set();
  const routeScrollSnapshots=new Map();
  let userScrollIntentUntil=0;
  let userScrollCaptureFrame=0;

  function safeJson(key){
    try{const value=JSON.parse(localStorage.getItem(key)||'null');return value&&typeof value==='object'?value:{};}
    catch(_error){return {};}
  }
  function params(){return new URLSearchParams(location.search);}
  function shellRequested(){return params().get('shell')==='1';}
  function current(){
    const query=params();
    const legacy=query.get('tab')||location.hash.replace('#','')||'plan';
    const shellName=query.get('view');
    const name=shellRequested()&&SHELL_ROUTES.has(shellName)?shellName:(legacyToRoute[legacy]||'home');
    const queryActivity=query.get('activityId')||query.get('returnActivityId')||'';
    const runtimeContext=globalThis.OUTBASE_ACTIVITY_CONTEXT_V18?.current?.()||{};
    const compatibleRuntime=!queryActivity||!runtimeContext.activityId||
      String(runtimeContext.activityId)===String(queryActivity);
    const fallback=compatibleRuntime?runtimeContext:{};
    const activityId=queryActivity||fallback.activityId||null;
    const planId=query.get('planId')||fallback.planId||null;
    return Object.freeze({
      name,legacyTab:legacy,shell:shellRequested(),
      activityId,
      planId,
      activityType:query.get('activityType')||fallback.activityType||'',
      activityTitle:query.get('activityTitle')||fallback.activityTitle||'',
      returnShell:query.get('returnShell')||fallback.returnShell||'',
      returnActivityId:query.get('returnActivityId')||fallback.returnActivityId||activityId||null,
      sheet:query.get('sheet')||query.get('planSheet')||null,
      month:query.get('month')||null,
      people:query.get('people')||'',
      query:Object.freeze(Object.fromEntries(query.entries()))
    });
  }

  function addValues(query,values={}){
    for(const [key,value] of Object.entries(values||{})){
      if(RESERVED.has(key)||value===null||value===undefined||value==='')continue;
      const normalized=Array.isArray(value)?value.join(','):String(value);
      if(normalized)query.set(key,normalized);
    }
    return query;
  }

  function legacyUrl(route,values={}){
    const name=typeof route==='string'?route:route?.name;
    const tab=routeToLegacy[name]||'plan';
    const routeValues=route&&typeof route==='object'?route:{};
    const query=addValues(new URLSearchParams({tab}),{...routeValues,...values});
    return `${location.pathname}?${query.toString()}`;
  }

  function shellUrl(name,values={}){
    const route=SHELL_ROUTES.has(name)?name:'home';
    const query=addValues(new URLSearchParams({shell:'1',view:route}),values);
    return `${location.pathname}?${query.toString()}`;
  }

  function normalizeScroll(value){const number=Number(value);return Number.isFinite(number)&&number>0?Math.round(number):0;}
  function currentScrollKey(url=location.href){
    try{
      const value=new URL(url,location.href);
      return `${value.pathname}?${value.searchParams.toString()}`;
    }catch(_error){return String(url||'');}
  }
  function scrollContainer(){
    const explicit=document.querySelector?.('[data-outbase-scroll-container]');
    if(explicit)return explicit;
    const library=document.querySelector?.('.libraryPageScroll');
    if(library&&library.scrollHeight>library.clientHeight)return library;
    return document.scrollingElement||document.documentElement||document.body||null;
  }
  function viewportScrollY(){
    const container=scrollContainer();
    const elementTop=normalizeScroll(container?.scrollTop);
    const documentContainer=container===document.scrollingElement||container===document.documentElement||container===document.body;
    return documentContainer?Math.max(elementTop,normalizeScroll(globalThis.scrollY)):elementTop;
  }
  function storeRouteScroll(value=viewportScrollY(),key=currentScrollKey()){
    if(routeScrollSnapshots.size>=80&&!routeScrollSnapshots.has(key))routeScrollSnapshots.delete(routeScrollSnapshots.keys().next().value);
    const top=normalizeScroll(value);
    routeScrollSnapshots.set(key,top);
    return top;
  }
  function scheduleUserScrollCapture(){
    const key=currentScrollKey();
    userScrollIntentUntil=Date.now()+250;
    if(userScrollCaptureFrame||typeof globalThis.requestAnimationFrame!=='function')return;
    userScrollCaptureFrame=globalThis.requestAnimationFrame(()=>globalThis.requestAnimationFrame(()=>{
      userScrollCaptureFrame=0;
      if(key===currentScrollKey())storeRouteScroll(viewportScrollY(),key);
    }));
  }
  function captureUserScroll(){
    if(Date.now()>userScrollIntentUntil)return;
    storeRouteScroll(viewportScrollY());
  }
  function rememberedRouteScroll(){
    const key=currentScrollKey();
    return routeScrollSnapshots.has(key)?routeScrollSnapshots.get(key):viewportScrollY();
  }
  function applyScrollY(value){
    const top=normalizeScroll(value);
    const container=scrollContainer();
    if(container)container.scrollTop=top;
    const documentContainer=container===document.scrollingElement||container===document.documentElement||container===document.body;
    if(documentContainer&&typeof globalThis.scrollTo==='function')globalThis.scrollTo(0,top);
    storeRouteScroll(top);
    return top;
  }
  function savedScrollY(){
    const state=history.state||{};
    if(state[SCROLL_ROUTE_KEY]&&state[SCROLL_ROUTE_KEY]!==currentScrollKey())return 0;
    return normalizeScroll(state[SCROLL_KEY]);
  }
  function replaceHistoryState(state,url=location.href){
    history.replaceState(state,'',url);
    return state;
  }
  function pushHistoryState(state,url=location.href){
    history.pushState(state,'',url);
    return state;
  }
  function goHistory(delta){history.go(Number(delta)||0);}
  function backHistory(){history.back();}
  function rememberScroll(){
    const route=current();
    const scrollKey=currentScrollKey();
    const state={
      ...(history.state||{}),
      outbaseShell:true,
      route:route.name,
      [SCROLL_KEY]:rememberedRouteScroll(),
      [SCROLL_ROUTE_KEY]:scrollKey
    };
    replaceHistoryState(state,location.href);
    return state[SCROLL_KEY];
  }

  function notify(reason='navigation'){
    const route=current();
    const pending=[];
    listeners.forEach(listener=>{
      try{const result=listener(route,reason);if(result&&typeof result.then==='function')pending.push(result);}
      catch(error){console.error('[OUTBASE router]',error);}
    });
    globalThis.dispatchEvent?.(new CustomEvent('outbase:navigation',{detail:{route,reason}}));
    return pending.length?Promise.allSettled(pending).then(()=>route):route;
  }

  function reducedMotion(){return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;}
  function transition(commit,options={}){
    if(options.transition!==true||options.skipTransition||reducedMotion()||typeof document?.startViewTransition!=='function')return commit();
    try{
      const value=document.startViewTransition(()=>Promise.resolve(commit()));
      return value.finished.catch(()=>current());
    }catch(_error){return commit();}
  }

  function absoluteUrl(value){try{return new URL(value,location.href).href;}catch(_error){return String(value||'');}}
  function routeHistoryState(name,scroll=0,scrollKey=currentScrollKey()){
    const currentState={...(history.state||{})};delete currentState.outbaseModal;
    return {...currentState,outbaseShell:true,route:name,[SCROLL_KEY]:scroll,[SCROLL_ROUTE_KEY]:scrollKey};
  }
  function navigate(name,values={},options={}){
    const url=shellUrl(name,values);
    const nextHref=absoluteUrl(url);
    const currentHref=absoluteUrl(location.href);
    return transition(()=>{
      if(nextHref===currentHref){
        const state=routeHistoryState(name,options.preserveScroll?savedScrollY()||viewportScrollY():0,currentScrollKey(nextHref));
        replaceHistoryState(state,url);
        return notify(options.preserveScroll?'same-preserve':'same');
      }
      if(options.replace){
        const state=routeHistoryState(name,options.preserveScroll?savedScrollY()||viewportScrollY():0,currentScrollKey(nextHref));
        replaceHistoryState(state,url);
        return notify(options.preserveScroll?'replace-preserve':'replace');
      }
      rememberScroll();
      pushHistoryState({
        outbaseShell:true,
        route:name,
        [SCROLL_KEY]:0,
        [SCROLL_ROUTE_KEY]:currentScrollKey(nextHref)
      },url);
      return notify('push');
    },options);
  }

  function open(route,values={}){location.assign(legacyUrl(route,values));}
  function back(){backHistory();}
  function subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);}
  function subscribePop(listener){popListeners.add(listener);return()=>popListeners.delete(listener);}
  addEventListener('wheel',scheduleUserScrollCapture,{capture:true,passive:true});
  addEventListener('touchmove',scheduleUserScrollCapture,{capture:true,passive:true});
  addEventListener('scroll',captureUserScroll,{capture:true,passive:true});
  addEventListener('keydown',event=>{
    if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key))scheduleUserScrollCapture();
  },true);
  addEventListener('popstate',event=>{
    popListeners.forEach(listener=>{
      try{listener(event,current());}catch(error){console.error('[OUTBASE router popstate]',error);}
    });
    notify('popstate');
  });

  const historyApi=Object.freeze({
    replace:(state,url=location.href)=>replaceHistoryState(state,url),
    push:(state,url=location.href)=>pushHistoryState(state,url),
    go:goHistory,
    back:backHistory,
    state:()=>history.state
  });

  globalThis.OUTBASE_ROUTER=Object.freeze({
    routineTransitions:false,
    current,legacyUrl,shellUrl,open,navigate,back,subscribe,shellRequested,
    rememberScroll,savedScrollY,viewportScrollY,applyScrollY,scrollContainer,
    currentScrollKey,SCROLL_KEY,SCROLL_ROUTE_KEY,reducedMotion,
    history:historyApi,subscribePop,
    legacyToRoute,routeToLegacy,SHELL_ROUTES:Object.freeze([...SHELL_ROUTES])
  });
})();
