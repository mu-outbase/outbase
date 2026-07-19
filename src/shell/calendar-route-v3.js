(() => {
  'use strict';
  const ID='outbaseCalendarRouteFrame';
  const SRC='./calendar-preview.html?integrated=1&v=3';
  const isCalendar=route=>route?.shell===true&&route?.name==='calendar';
  function sync(route){
    const root=document.getElementById('app');
    if(!root)return;
    if(!isCalendar(route)){
      document.documentElement.classList.remove('outbaseCalendarRoute');
      return;
    }
    document.documentElement.classList.add('outbaseCalendarRoute','outbaseShellReady');
    if(document.getElementById(ID))return;
    root.replaceChildren();
    const frame=document.createElement('iframe');
    frame.id=ID;
    frame.className='obCalendarRouteFrame';
    frame.title='OUTBASE カレンダー';
    frame.src=SRC;
    root.appendChild(frame);
  }
  function boot(){
    const router=globalThis.OUTBASE_ROUTER;
    if(!router){setTimeout(boot,25);return}
    router.subscribe(route=>queueMicrotask(()=>sync(route)));
    addEventListener('outbase:navigation',event=>queueMicrotask(()=>sync(event.detail?.route)));
    sync(router.current());
  }
  addEventListener('message',event=>{
    if(event.origin!==location.origin)return;
    if(event.data?.type!=='OUTBASE_CALENDAR_NAVIGATE')return;
    const name=event.data?.name;
    if(['home','vault','search'].includes(name))globalThis.OUTBASE_ROUTER?.navigate?.(name,{}, {transition:false});
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();