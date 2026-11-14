(() => {
  'use strict';

  const base=globalThis.OUTBASE_HOME_SCREEN_MODEL_V164;
  if(!base)throw new Error('OUTBASE home screen model is not ready');
  if(base.__realDataOnlyV182)return;

  const realRows=rows=>Object.freeze((Array.isArray(rows)?rows:[]).filter(item=>item&&!item.sample));
  const stored=value=>{
    try{return localStorage.getItem(value)||'';}catch(_error){return '';}
  };

  function displayPlans(rows){return realRows(rows);}

  // The v44 calendar remains the owner of these rows. Read them without
  // migrating them into Story DB or creating synthetic activities.
  function calendarSnapshot(){return stored('outbase_calendar_complete_v3_events');}
  function storedArray(key){
    try{const rows=JSON.parse(stored(key)||'[]');return Array.isArray(rows)?rows:[];}catch(_error){return [];}
  }
  function dateKey(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
  function nextRepeat(date,freq,interval){
    const next=new Date(date);
    if(freq==='daily')next.setDate(next.getDate()+interval);
    else if(freq==='weekly')next.setDate(next.getDate()+7*interval);
    else if(freq==='monthly'||freq==='yearly'){
      const day=next.getDate();next.setDate(1);
      if(freq==='monthly')next.setMonth(next.getMonth()+interval);
      else next.setFullYear(next.getFullYear()+interval);
      next.setDate(Math.min(day,new Date(next.getFullYear(),next.getMonth()+1,0).getDate()));
    }
    return next;
  }
  function calendarPlans(now){
    const rangeEnd=new Date(now);rangeEnd.setDate(rangeEnd.getDate()+180);rangeEnd.setHours(23,59,59,999);
    const labels=new Map([['activity','活動'],['camp','キャンプ'],['walk','散歩'],['family','家族'],['work','仕事'],['personal','個人']]);
    for(const type of storedArray('outbase_calendar_custom_types_v1'))if(type?.id&&type?.name)labels.set(type.id,type.name);
    const plans=[];
    for(const event of storedArray('outbase_calendar_complete_v3_events')){
      if(!event||typeof event.id!=='string'||!event.id||typeof event.title!=='string'||!event.title.trim()||event.deleted_at)continue;
      const start=new Date(event.start),end=new Date(event.end||event.start);
      if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<start)continue;
      const duration=end-start,repeat=event.repeat||{};
      const until=repeat.until?new Date(`${repeat.until}T23:59:59`):null;
      let cursor=start;
      // Match v44's recurrence bounds and month-end clamping.
      for(let guard=0;guard<1000&&cursor<=rangeEnd;guard++){
        if(until&&cursor>until)break;
        const finish=new Date(cursor.getTime()+duration);
        const visibleEnd=new Date(finish);if(event.allDay)visibleEnd.setHours(23,59,59,999);
        if(visibleEnd>=now){
          plans.push(Object.freeze({
            id:`calendar-v44:${event.id}:${cursor.toISOString()}`,calendarEventId:event.id,
            calendarMonth:dateKey(cursor).slice(0,7),title:event.title,place:event.place||'',
            type:event.calendarId||'other',typeLabel:labels.get(event.calendarId)||'活動',
            startAt:cursor.toISOString(),endAt:finish.toISOString(),allDay:Boolean(event.allDay),
            participants:Object.freeze({rows:Object.freeze((Array.isArray(event.participants)?event.participants:[]).map(name=>({name,type:'member'})))}),
            sample:false
          }));
        }
        if(!['daily','weekly','monthly','yearly'].includes(repeat.freq))break;
        const next=nextRepeat(cursor,repeat.freq,Math.max(1,Number(repeat.interval)||1));
        if(!Number.isFinite(next.getTime())||next<=cursor)break;
        cursor=next;
      }
    }
    return plans;
  }

  async function build(options={}){
    const now=options.now instanceof Date?options.now:new Date(options.now||Date.now());
    const value=await base.build(options);
    const next=Object.freeze([...realRows(value?.next),...calendarPlans(now)]
      .sort((a,b)=>new Date(a.startAt)-new Date(b.startAt)).slice(0,5));
    const selectedId=stored(base.WEATHER_PLAN_KEY||'outbase_home_weather_plan_v36');
    const selected=next.find(item=>String(item?.id||'')===selectedId)||next[0]||null;
    const weather=base.weatherPreview?.(now,selected)||value.weather;
    const weatherIntel=base.weatherIntel?.(selected,now)||value.weatherIntel;
    const todaySummary=base.smartLine?.({...value,next,weather})||value.todaySummary;

    return Object.freeze({
      ...value,
      next,
      selectedPlanId:selected?.id||null,
      selectedPlan:selected,
      todaySummary,
      weather,
      weatherIntel,
      demoPreview:false,
      version:'v166.31-home-real-data-only-v18.2'
    });
  }

  const api=Object.freeze({
    ...base,
    __realDataOnlyV182:true,
    build,
    calendarSnapshot,
    displayPlans,
    samplePlans:()=>Object.freeze([])
  });

  globalThis.OUTBASE_HOME_SCREEN_MODEL_V164=api;
})();
