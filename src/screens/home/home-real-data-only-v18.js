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

  async function build(options={}){
    const now=options.now instanceof Date?options.now:new Date(options.now||Date.now());
    const value=await base.build(options);
    const next=realRows(value?.next);
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
    displayPlans,
    samplePlans:()=>Object.freeze([])
  });

  globalThis.OUTBASE_HOME_SCREEN_MODEL_V164=api;
})();
