(() => {
  'use strict';

  const TARGET='./calendar-formal-v42.html?source=shell&release=formal-v42-1';
  let leaving=false;

  function openCalendar(){
    if(leaving)return;
    leaving=true;
    location.href=TARGET;
  }

  function isCalendarElement(target){
    const node=target?.closest?.(
      '[data-ob3-action="calendar"],'+
      '[data-ob3-route="calendar"],'+
      '[data-ob5-route="calendar"],'+
      '[data-ob6-route="calendar"],'+
      '[data-ob7-route="calendar"],'+
      'a[href*="view=calendar"],'+
      'a[href*="route=calendar"]'
    );
    return node||null;
  }

  // Capture phase: run before existing bootstrap navigation listeners.
  document.addEventListener('click',event=>{
    const node=isCalendarElement(event.target);
    if(!node)return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openCalendar();
  },true);

  // Keyboard activation of buttons/links.
  document.addEventListener('keydown',event=>{
    if(!['Enter',' '].includes(event.key))return;
    const node=isCalendarElement(event.target);
    if(!node)return;
    event.preventDefault();
    event.stopPropagation();
    openCalendar();
  },true);

  // Direct URL entry to the old shell calendar.
  function redirectOldRoute(){
    const q=new URLSearchParams(location.search);
    if(q.get('shell')==='1'&&q.get('view')==='calendar')openCalendar();
  }

  // Router calls not initiated by a DOM click.
  function guardRouter(){
    const router=globalThis.OUTBASE_ROUTER;
    if(!router){setTimeout(guardRouter,30);return}
    if(router.__calendarV3Guarded)return;
    const original=router.navigate?.bind(router);
    if(original){
      router.navigate=(name,params,options)=>{
        if(name==='calendar'){openCalendar();return null}
        return original(name,params,options);
      };
    }
    Object.defineProperty(router,'__calendarV3Guarded',{value:true});
    router.subscribe?.(route=>{
      if(route?.name==='calendar')openCalendar();
    });
    redirectOldRoute();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{redirectOldRoute();guardRouter()},{once:true});
  }else{
    redirectOldRoute();
    guardRouter();
  }
})();