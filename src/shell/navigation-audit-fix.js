(() => {
  'use strict';

  const RETURN_KEY='outbase_shell_return_context_v1';
  const ROUTE_KEYS=Object.freeze(['activityId','planId','month','people','sheet']);

  function router(){return globalThis.OUTBASE_ROUTER||null;}
  function shellMounted(){return document.body.classList.contains('outbaseShellPreview')||Boolean(document.getElementById('outbaseShellRoot'))&&router()?.shellRequested?.();}
  function plainPrimaryClick(event){return event.button===0&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey;}
  function valuesFromAnchor(anchor){
    const values={};
    try{
      const url=new URL(anchor.href,location.href);
      ROUTE_KEYS.forEach(key=>{const value=url.searchParams.get(key);if(value)values[key]=value;});
    }catch(_error){}
    const dataset=anchor.dataset||{};
    if(dataset.ob5ActivityId)values.activityId=dataset.ob5ActivityId;
    if(dataset.ob5PlanId)values.planId=dataset.ob5PlanId;
    if(dataset.ob5Month)values.month=dataset.ob5Month;
    if(dataset.ob5People)values.people=dataset.ob5People;
    if(dataset.ob5Sheet)values.sheet=dataset.ob5Sheet;
    return values;
  }
  function isActivityBack(anchor){
    const current=router()?.current?.();
    return current?.name==='activity'&&anchor.dataset?.ob5Route==='home'&&Boolean(anchor.closest('.ob6-detail-tools,.ob7-detail-content'));
  }
  function canReturnWithinShell(){return history.length>1&&history.state?.outbaseShell===true;}
  function rememberLegacyBoundary(anchor){
    if(!shellMounted())return;
    let url;try{url=new URL(anchor.href,location.href);}catch(_error){return;}
    if(url.origin!==location.origin||url.searchParams.get('shell')==='1'||!url.searchParams.has('tab'))return;
    const current=router()?.current?.();
    const context={
      url:location.href,
      scrollY:Math.max(0,Math.round(Number(globalThis.scrollY)||0)),
      route:current?.name||'home',
      activityId:current?.activityId||null,
      planId:current?.planId||null,
      month:current?.month||null,
      people:current?.people||'',
      savedAt:Date.now()
    };
    try{sessionStorage.setItem(RETURN_KEY,JSON.stringify(context));}catch(_error){}
  }

  addEventListener('click',event=>{
    if(!plainPrimaryClick(event)||event.defaultPrevented)return;
    const anchor=event.target?.closest?.('a');
    if(!anchor||anchor.target==='_blank'||anchor.hasAttribute('download'))return;

    if(anchor.matches('[data-ob5-nav]')){
      const api=router();if(!api?.navigate)return;
      event.preventDefault();event.stopImmediatePropagation();
      if(isActivityBack(anchor)&&canReturnWithinShell()){api.back();return;}
      api.navigate(anchor.dataset.ob5Route||'home',valuesFromAnchor(anchor));
      return;
    }

    rememberLegacyBoundary(anchor);
  },{capture:true});

  globalThis.OUTBASE_NAVIGATION_AUDIT_FIX_V1=Object.freeze({
    version:'v166.3-home-v36-r34-nav1',
    returnKey:RETURN_KEY,
    valuesFromAnchor
  });
})();
