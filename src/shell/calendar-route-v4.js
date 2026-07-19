(() => {
  'use strict';

  const FRAME_ID='outbaseIntegratedCalendar';
  const ROUTE_KEYS=['activityId','planId','month','people','sheet'];

  function router(){return globalThis.OUTBASE_ROUTER||null;}
  function current(){return router()?.current?.()||null;}
  function shellRoot(){return document.getElementById('outbaseShellRoot')||document.querySelector('.ob3-shell')?.parentElement||document.getElementById('app');}
  function shellMain(){return document.querySelector('.ob3-shell .ob3-main');}

  function calendarUrl(route=current()){
    const query=new URLSearchParams({embedded:'1',source:'shell',release:'formal-v44-shell1'});
    ROUTE_KEYS.forEach(key=>{
      const value=route?.[key];
      if(value)query.set(key,String(value));
    });
    return `./calendar-formal-v44.html?${query.toString()}`;
  }

  function setCalendarNavActive(){
    document.querySelectorAll('[data-ob3-route]').forEach(node=>{
      const name=node.dataset.ob3Route;
      const active=name==='calendar';
      node.classList.toggle('active',active);
      if(active)node.setAttribute('aria-current','page');else node.removeAttribute('aria-current');
    });
  }

  function mountCalendar(){
    const route=current();
    if(route?.name!=='calendar')return false;
    const main=shellMain();
    if(!main)return false;

    let frame=document.getElementById(FRAME_ID);
    if(!frame){
      main.innerHTML=`<section class="ob-calendar-integrated" aria-label="カレンダー">
        <iframe id="${FRAME_ID}" title="OUTBASE カレンダー" loading="eager"></iframe>
      </section>`;
      frame=document.getElementById(FRAME_ID);
    }

    const next=calendarUrl(route);
    const active=new URL(frame.src||location.href,location.href);
    const wanted=new URL(next,location.href);
    if(active.pathname!==wanted.pathname||active.search!==wanted.search)frame.src=next;

    document.documentElement.classList.add('outbaseCalendarIntegrated');
    setCalendarNavActive();
    requestAnimationFrame(()=>scrollTo({top:0,behavior:'auto'}));
    return true;
  }

  function unmountCalendar(){
    document.documentElement.classList.remove('outbaseCalendarIntegrated');
  }

  function interceptCalendarClicks(event){
    const node=event.target?.closest?.(
      '[data-ob3-action="calendar"],[data-ob3-route="calendar"],[data-ob5-route="calendar"],'+
      '[data-ob6-route="calendar"],[data-ob7-route="calendar"],a[href*="view=calendar"]'
    );
    if(!node)return;
    const api=router();
    if(!api?.navigate)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const values={};
    try{
      const url=new URL(node.href||'',location.href);
      ROUTE_KEYS.forEach(key=>{const value=url.searchParams.get(key);if(value)values[key]=value;});
    }catch(_error){}
    if(node.dataset.ob5Month)values.month=node.dataset.ob5Month;
    api.navigate('calendar',values);
  }

  addEventListener('message',event=>{
    if(event.origin!==location.origin)return;
    if(event.data?.type==='OUTBASE_CALENDAR_RESIZE'){
      const frame=document.getElementById(FRAME_ID);
      if(frame)frame.style.height=`${Math.max(720,Number(event.data.height)||0)}px`;
    }
    if(event.data?.type==='OUTBASE_CALENDAR_STATE'){
      const value=event.data.value||{};
      const route=current();
      if(route?.name!=='calendar')return;
      const values={};
      if(value.month)values.month=value.month;
      if(Array.isArray(value.people))values.people=value.people.join(',');
      router()?.navigate?.('calendar',values,{replace:true,preserveScroll:true,skipTransition:true});
    }
  });

  document.addEventListener('click',interceptCalendarClicks,true);

  function boot(){
    const api=router();
    if(!api){setTimeout(boot,30);return}
    api.subscribe?.(route=>{
      if(route?.name==='calendar')setTimeout(mountCalendar,0);
      else unmountCalendar();
    });

    const waitForShell=()=>{
      if(current()?.name!=='calendar')return;
      if(mountCalendar())return;
      requestAnimationFrame(waitForShell);
    };
    waitForShell();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();

  globalThis.OUTBASE_CALENDAR_SHELL_INTEGRATION_V1=Object.freeze({
    version:'formal-v44-shell1',
    mount:mountCalendar,
    frameId:FRAME_ID
  });
})();
