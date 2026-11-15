(() => {
  'use strict';
  const KEY='outbase_calendar_complete_v3_events';
  function location(candidate){
    const latitude=candidate?.latitude,longitude=candidate?.longitude,label=String(candidate?.label||'').trim();
    if(!label||!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)throw Error('invalid_place');
    return {label,address:String(candidate.address||label),latitude,longitude,source:String(candidate.source||'openstreetmap-photon'),selectedAt:new Date().toISOString()};
  }
  function activityPlace(row){const meta=row.metadata||{},legacy=meta.legacy_plan||{},core=meta.legacy_core_activity||{};return String(legacy.location||legacy.placeName||core.location||meta.location||'').trim();}
  async function select(plan,candidate){
    if(!plan?.id||plan.sample)throw Error('invalid_plan');const point=location(candidate);
    if(plan.calendarEventId){
      const rows=JSON.parse(localStorage.getItem(KEY)||'[]');if(!Array.isArray(rows))throw Error('invalid_calendar');
      const index=rows.findIndex(row=>row.id===plan.calendarEventId&&!row.deleted_at);if(index<0)throw Error('missing_plan');
      const row=rows[index];if(row.title!==plan.title||String(row.place||'')!==String(plan.place||''))throw Error('changed_plan');
      rows[index]={...row,place:point.label,weatherLocation:point};localStorage.setItem(KEY,JSON.stringify(rows));
    }else{
      let failure;
      try{await globalThis.OUTBASE_DB_V160.transaction(['activities'],'readwrite',tx=>{
        const store=tx.objectStore('activities'),request=store.get(plan.id);
        request.onsuccess=()=>{try{
          const row=request.result;if(!row||row.deleted_at)throw Error('missing_plan');
          if(row.title!==plan.title||activityPlace(row)!==String(plan.place||''))throw Error('changed_plan');
          const meta=row.metadata||{},legacy=meta.legacy_plan||{};
          const saved=globalThis.OUTBASE_REPOSITORIES_V160.activities.normalize({...row,updated_at:globalThis.OUTBASE_IDS.nowIso(),metadata:{...meta,location:point.label,placeName:point.label,weather_location:point,legacy_plan:{...legacy,location:point.label,placeName:point.label}}});
          globalThis.OUTBASE_VALIDATION.assertEntity('activities',saved);store.put(saved);
        }catch(error){failure=error;tx.abort();}};
      });}catch(error){throw failure||error;}
    }
    return point;
  }
  globalThis.OUTBASE_PLAN_LOCATION=Object.freeze({select});
})();
