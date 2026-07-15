(() => {
  'use strict';
  const listeners=new Set();
  const legacyToRoute=Object.freeze({plan:'home',search:'search',prep:'activity',record:'record',memory:'vault'});
  const routeToLegacy=Object.freeze({home:'plan',search:'search',activity:'prep',record:'record',calendar:'plan',vault:'memory'});
  const SHELL_ROUTES=new Set(['home','search','vault','activity','calendar']);
  const RESERVED=new Set(['shell','view']);
  const SCROLL_KEY='outbaseScrollY';

  function params(){return new URLSearchParams(location.search);}
  function shellRequested(){return params().get('shell')==='1';}
  function current(){
    const query=params();
    const legacy=query.get('tab')||location.hash.replace('#','')||'plan';
    const shellName=query.get('view');
    const name=shellRequested()&&SHELL_ROUTES.has(shellName)?shellName:(legacyToRoute[legacy]||'home');
    return Object.freeze({
      name,legacyTab:legacy,shell:shellRequested(),
      activityId:query.get('activityId')||localStorage.getItem('outbase_core_activity_id')||null,
      planId:query.get('planId')||localStorage.getItem('outbase_active_plan_id')||null,
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
  function viewportScrollY(){return normalizeScroll(globalThis.scrollY??document.scrollingElement?.scrollTop??document.documentElement?.scrollTop??0);}
  function savedScrollY(){return normalizeScroll(history.state?.[SCROLL_KEY]);}
  function rememberScroll(){
    const route=current();
    const state={...(history.state||{}),outbaseShell:true,route:route.name,[SCROLL_KEY]:viewportScrollY()};
    history.replaceState(state,'',location.href);
    return state[SCROLL_KEY];
  }

  function notify(reason='navigation'){
    const route=current();
    listeners.forEach(listener=>{try{listener(route,reason);}catch(error){console.error('[OUTBASE router]',error);}});
    globalThis.dispatchEvent?.(new CustomEvent('outbase:navigation',{detail:{route,reason}}));
    return route;
  }

  function navigate(name,values={},options={}){
    const url=shellUrl(name,values);
    if(options.replace){
      const state={...(history.state||{}),outbaseShell:true,route:name,[SCROLL_KEY]:options.preserveScroll?savedScrollY()||viewportScrollY():0};
      history.replaceState(state,'',url);
      return notify(options.preserveScroll?'replace-preserve':'replace');
    }
    rememberScroll();
    history.pushState({outbaseShell:true,route:name,[SCROLL_KEY]:0},'',url);
    return notify('push');
  }

  function open(route,values={}){location.assign(legacyUrl(route,values));}
  function back(){history.back();}
  function subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);}
  addEventListener('popstate',()=>notify('popstate'));

  globalThis.OUTBASE_ROUTER=Object.freeze({
    current,legacyUrl,shellUrl,open,navigate,back,subscribe,shellRequested,
    rememberScroll,savedScrollY,viewportScrollY,SCROLL_KEY,
    legacyToRoute,routeToLegacy,SHELL_ROUTES:Object.freeze([...SHELL_ROUTES])
  });
})();
