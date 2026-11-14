(() => {
  'use strict';
  const EVENTS=Object.freeze({pee:'おしっこ',poop:'うんち',water:'水分',rest:'休憩'});
  const isWalk=a=>a?.subtype==='kota_walk'&&a?.metadata?.kota_walk_v1?.companion==='コタ';
  const repo=()=>globalThis.OUTBASE_REPOSITORIES_V160;
  async function start(requestId){
    if(!globalThis.OUTBASE_IDS.isUlid(requestId))throw Error('walk_request_required');
    let result,failure;
    try{await globalThis.OUTBASE_DB_V160.transaction(['activities','calendar_entries'],'readwrite',tx=>{
      const request=tx.objectStore('activities').getAll();
      request.onsuccess=()=>{try{
        const rows=request.result,existing=rows.find(a=>!a.deleted_at&&isWalk(a)&&['active','paused'].includes(a.state));
        if(existing){result=existing;return;}
        if(rows.some(a=>a.id===requestId))throw Error('walk_request_used');
        const now=globalThis.OUTBASE_IDS.nowIso(),activity=repo().activities.normalize({id:requestId,type:'walk',subtype:'kota_walk',title:'コタ散歩',state:'active',start_at:now,end_at:null,visibility:'private',source:'kota-walk-v1',metadata:{kota_walk_v1:{companion:'コタ'},execution_session_v1:{elapsed_ms:0,started_at_ms:Date.parse(now),began_at:now,ended_at:null,updated_at:now}}});
        const calendar=repo().calendarEntries.normalize({id:requestId,activity_id:activity.id,start_at:now,end_at:null,all_day:false,timezone:'Asia/Tokyo',source:'kota-walk-v1'});
        globalThis.OUTBASE_VALIDATION.assertEntity('activities',activity);globalThis.OUTBASE_VALIDATION.assertEntity('calendar_entries',calendar);
        tx.objectStore('activities').put(activity);tx.objectStore('calendar_entries').put(calendar);result=activity;
      }catch(error){failure=error;tx.abort();}};
    });}catch(error){throw failure||error;}
    return result;
  }
  async function addEvent({activityId,displayActivityId,kind,requestId}){
    if(activityId!==displayActivityId||!activityId||!Object.hasOwn(EVENTS,kind)||!globalThis.OUTBASE_IDS.isUlid(requestId))throw Error('walk_event_invalid');
    const activity=await repo().activities.get(activityId);if(!activity||activity.deleted_at||!isWalk(activity))throw Error('walk_missing');
    let result,failure;
    try{await globalThis.OUTBASE_DB_V160.transaction(['activities','records'],'readwrite',tx=>{
      const a=tx.objectStore('activities').get(activityId),r=tx.objectStore('records').get(requestId);let loaded=0;
      const ready=()=>{if(++loaded!==2)return;try{
        if(!a.result||a.result.deleted_at||!isWalk(a.result))throw Error('walk_missing');
        if(r.result){if(r.result.activity_id!==activityId||r.result.payload?.walk_event!==kind||r.result.deleted_at)throw Error('walk_request_conflict');result=r.result;return;}
        if(a.result.state!=='active')throw Error('walk_not_active');
        result=repo().records.normalize({id:requestId,activity_id:activityId,type:'measurement',visibility:'private',source:'kota-walk-v1',payload:{title:EVENTS[kind],walk_event:kind,companion:'コタ'}});
        globalThis.OUTBASE_VALIDATION.assertEntity('records',result);tx.objectStore('records').put(result);
      }catch(error){failure=error;tx.abort();}};a.onsuccess=r.onsuccess=ready;
    });}catch(error){throw failure||error;}
    return result;
  }
  async function undo({activityId,displayActivityId,recordId}){
    if(!activityId||activityId!==displayActivityId||!recordId)throw Error('walk_event_invalid');
    if(!await repo().activities.get(activityId))throw Error('walk_missing');let failure;
    try{await globalThis.OUTBASE_DB_V160.transaction(['activities','records'],'readwrite',tx=>{
      const a=tx.objectStore('activities').get(activityId),r=tx.objectStore('records').get(recordId);let loaded=0;
      const ready=()=>{if(++loaded!==2)return;try{
        if(!a.result||a.result.deleted_at||!isWalk(a.result)||!['active','paused'].includes(a.result.state))throw Error('walk_not_active');
        if(!r.result||r.result.activity_id!==activityId||r.result.source!=='kota-walk-v1'||!Object.hasOwn(EVENTS,r.result.payload?.walk_event))throw Error('walk_event_invalid');
        if(!r.result.deleted_at)tx.objectStore('records').put({...r.result,deleted_at:globalThis.OUTBASE_IDS.nowIso(),updated_at:globalThis.OUTBASE_IDS.nowIso()});
      }catch(error){failure=error;tx.abort();}};a.onsuccess=r.onsuccess=ready;
    });}catch(error){throw failure||error;}
  }
  function summary(records=[]){const counts=Object.fromEntries(Object.keys(EVENTS).map(k=>[k,0]));for(const r of records)if(!r.deleted_at&&Object.hasOwn(counts,r.payload?.walk_event))counts[r.payload.walk_event]++;return counts;}
  globalThis.OUTBASE_KOTA_WALK=Object.freeze({EVENTS,isWalk,start,addEvent,undo,summary});
})();
