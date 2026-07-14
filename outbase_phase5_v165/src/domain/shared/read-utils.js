(() => {
  'use strict';

  const ACTIVE_STATES=Object.freeze(['active','paused']);
  const FUTURE_STATES=Object.freeze(['candidate','planned','preparing']);
  const MEMORY_STATES=Object.freeze(['organizing','completed','archived']);

  function asDate(value){
    if(!value)return null;
    const date=new Date(value);
    return Number.isNaN(date.getTime())?null:date;
  }

  function iso(value){return asDate(value)?.toISOString()||null;}
  function text(value,fallback=''){return String(value??fallback).trim();}
  function unique(values){return [...new Set((values||[]).filter(Boolean))];}
  function indexBy(rows,key='id'){return new Map((rows||[]).map(row=>[row?.[key],row]).filter(([id])=>id));}
  function groupBy(rows,key){
    const result=new Map();
    for(const row of rows||[]){
      const value=typeof key==='function'?key(row):row?.[key];
      if(value===null||value===undefined||value==='')continue;
      const list=result.get(value)||[];
      list.push(row);
      result.set(value,list);
    }
    return result;
  }
  function compareDate(a,b,key='start_at'){
    return Number(asDate(a?.[key])||0)-Number(asDate(b?.[key])||0);
  }
  function limit(rows,count=200){return (rows||[]).slice(0,Math.max(0,Number(count)||0));}
  async function runtimeContext(){return globalThis.OUTBASE_REPOSITORIES_V160?.runtimeContext?.()||null;}
  function legacySessionActive(){
    return ['active','paused'].includes(localStorage.getItem('outbase_record_session_state')||'idle');
  }
  function activeActivityId(){
    return localStorage.getItem('outbase_core_activity_id')||
      localStorage.getItem('outbase_primary_activity_id_v2')||null;
  }
  function legacyPlanId(activity={}){
    const ref=text(activity.legacy_ref);
    if(ref.startsWith('plan:'))return ref.slice(5);
    const plan=activity.metadata?.legacy_plan;
    return text(plan?.id||plan?.planId)||null;
  }
  function publicActivity(row={}){
    return Object.freeze({
      id:row.id,
      type:text(row.type,'other'),
      title:text(row.title,'名称未設定の活動'),
      state:text(row.state,'candidate'),
      startAt:iso(row.start_at),
      endAt:iso(row.end_at),
      timezone:text(row.timezone,'Asia/Tokyo'),
      visibility:text(row.visibility,'private'),
      legacyPlanId:legacyPlanId(row),
      updatedAt:iso(row.updated_at),
      metadata:row.metadata??null
    });
  }

  globalThis.OUTBASE_DOMAIN_UTILS_V162=Object.freeze({
    ACTIVE_STATES,FUTURE_STATES,MEMORY_STATES,
    asDate,iso,text,unique,indexBy,groupBy,compareDate,limit,runtimeContext,
    legacySessionActive,activeActivityId,legacyPlanId,publicActivity
  });
})();
