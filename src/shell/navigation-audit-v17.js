(() => {
  'use strict';

  if(globalThis.OUTBASE_NAVIGATION_AUDIT_V18)return;

  const router=globalThis.OUTBASE_ROUTER;
  if(!router)return;
  const contextApi=()=>globalThis.OUTBASE_ACTIVITY_CONTEXT_V18||globalThis.OUTBASE_ACTIVITY_CONTEXT;

  function valuesFrom(url){
    const values={};
    for(const [key,value] of url.searchParams.entries()){
      if(key==='shell'||key==='view'||value==='')continue;
      values[key]=value;
    }
    const context=contextApi()?.current?.()||{};
    if(!values.activityId&&context.activityId)values.activityId=context.activityId;
    if(!values.planId&&context.planId)values.planId=context.planId;
    if(!values.activityType&&context.activityType)values.activityType=context.activityType;
    if(!values.activityTitle&&context.activityTitle)values.activityTitle=context.activityTitle;
    return values;
  }

  function navigate(name,values={},options={}){
    const context=contextApi()?.current?.()||{};
    const merged={
      activityId:values.activityId||context.activityId||undefined,
      planId:values.planId||context.planId||undefined,
      activityType:values.activityType||context.activityType||undefined,
      activityTitle:values.activityTitle||context.activityTitle||undefined,
      ...values
    };
    return router.navigate(name,merged,options);
  }

  document.addEventListener('click',event=>{
    if(event.defaultPrevented||event.button>0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const link=event.target.closest?.('a[href]');
    if(!link||link.target==='_blank'||link.hasAttribute('download'))return;
    if(link.matches('[data-ob5-nav],[data-ob3-route],[data-ob17-context],[data-ob18-plan-switch]'))return;

    let url;
    try{url=new URL(link.href,location.href);}catch(_error){return;}
    if(url.origin!==location.origin)return;
    if(url.searchParams.get('shell')!=='1')return;

    const name=url.searchParams.get('view')||'home';
    if(!router.SHELL_ROUTES?.includes?.(name))return;

    event.preventDefault();
    navigate(name,valuesFrom(url),{transition:true});
  },true);

  addEventListener('message',event=>{
    if(event.origin!==location.origin)return;
    if(event.data?.type!=='OUTBASE_CALENDAR_NAVIGATE')return;
    const name=String(event.data?.name||'');
    if(!router.SHELL_ROUTES?.includes?.(name))return;
    navigate(name,event.data?.values||{},{transition:true});
  });

  const api=Object.freeze({version:'v18.1-r1-home-alignment',valuesFrom,navigate});
  globalThis.OUTBASE_NAVIGATION_AUDIT_V18=api;
  globalThis.OUTBASE_NAVIGATION_AUDIT_V17=api;
})();
