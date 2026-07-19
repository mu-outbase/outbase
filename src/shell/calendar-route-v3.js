(() => {
  'use strict';

  const CALENDAR_URL='./calendar-preview.html?integrated=1&v=3&source=shell';

  function isCalendarRoute(){
    const query=new URLSearchParams(location.search);
    return query.get('shell')==='1'&&query.get('view')==='calendar';
  }

  function handoff(){
    if(!isCalendarRoute())return;
    const key='outbase_calendar_v3_handoff';
    try{
      if(sessionStorage.getItem(key)===location.href)return;
      sessionStorage.setItem(key,location.href);
    }catch(_error){}
    location.replace(CALENDAR_URL);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',handoff,{once:true});
  }else{
    handoff();
  }

  addEventListener('outbase:navigation',event=>{
    if(event.detail?.route?.name==='calendar')handoff();
  });
})();