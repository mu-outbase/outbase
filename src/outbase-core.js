(() => {
  'use strict';

  const VERSION='1.0.0';
  const PREFIX='outbase_core_v1';
  const KEYS={
    meta:`${PREFIX}_meta`,
    events:`${PREFIX}_events`,
    facts:`${PREFIX}_facts`,
    activities:`${PREFIX}_activities`,
    lifecycles:`${PREFIX}_lifecycles`,
    memos:`${PREFIX}_memos`,
    recoveries:`${PREFIX}_recoveries`,
    relations:`${PREFIX}_relations`,
    migrations:`${PREFIX}_migrations`
  };

  function clone(value){
    return value===undefined?undefined:JSON.parse(JSON.stringify(value));
  }

  function read(key,fallback){
    try{
      const parsed=JSON.parse(localStorage.getItem(key)||'null');
      return parsed??clone(fallback);
    }catch(_error){
      return clone(fallback);
    }
  }

  function write(key,value){
    localStorage.setItem(key,JSON.stringify(value));
    return value;
  }

  function uid(prefix='id'){
    const random=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
    return `${prefix}_${random}`;
  }

  function now(){
    return new Date().toISOString();
  }

  function normalizeTime(value){
    if(!value)return now();
    const date=new Date(value);
    return Number.isNaN(date.getTime())?now():date.toISOString();
  }

  function ensureMeta(){
    const meta=read(KEYS.meta,{});
    const next={
      schemaVersion:1,
      coreVersion:VERSION,
      createdAt:meta.createdAt||now(),
      updatedAt:now(),
      deviceId:meta.deviceId||uid('device')
    };
    return write(KEYS.meta,next);
  }

  function list(key){
    return read(key,[]);
  }

  function upsert(key,item,idField){
    const items=list(key);
    const index=items.findIndex(existing=>existing[idField]===item[idField]);
    if(index>=0)items[index]={...items[index],...item,updatedAt:now()};
    else items.unshift({...item,createdAt:item.createdAt||now(),updatedAt:now()});
    write(key,items);
    return clone(index>=0?items[index]:items[0]);
  }

  function appendEvent(input={}){
    const meta=ensureMeta();
    const event={
      eventId:input.eventId||uid('evt'),
      eventType:input.eventType||'unknown',
      observedAt:normalizeTime(input.observedAt||input.time),
      recordedAt:normalizeTime(input.recordedAt||now()),
      source:input.source||'outbase',
      deviceId:input.deviceId||meta.deviceId,
      sessionId:input.sessionId??null,
      planId:input.planId??null,
      activityId:input.activityId??null,
      location:input.location??null,
      payloadRef:input.payloadRef??null,
      payload:clone(input.payload??null),
      status:'fact',
      legacyRef:input.legacyRef??null
    };
    upsert(KEYS.events,event,'eventId');
    return clone(event);
  }

  function addFact(input={}){
    const fact={
      factId:input.factId||uid('fact'),
      factType:input.factType||input.type||'unknown',
      observedAt:normalizeTime(input.observedAt||input.time),
      source:input.source||'outbase',
      eventId:input.eventId??null,
      sessionId:input.sessionId??null,
      planId:input.planId??null,
      activityId:input.activityId??null,
      location:clone(input.location??null),
      value:clone(input.value??input.payload??null),
      immutable:true,
      legacyRef:input.legacyRef??null
    };
    upsert(KEYS.facts,fact,'factId');
    return clone(fact);
  }

  function upsertActivity(input={}){
    const activity={
      activityId:input.activityId||uid('activity'),
      activityType:input.activityType||input.target||'unspecified',
      title:input.title||input.target||'記録',
      state:input.state||'inactive',
      currentPhase:input.currentPhase||'記録中',
      startedAt:input.startedAt?normalizeTime(input.startedAt):null,
      becameInactiveAt:input.becameInactiveAt?normalizeTime(input.becameInactiveAt):null,
      planIds:Array.isArray(input.planIds)?input.planIds:[],
      parentActivityId:input.parentActivityId??null,
      source:input.source||'outbase',
      legacySessionId:input.legacySessionId??null
    };
    return upsert(KEYS.activities,activity,'activityId');
  }

  function setLifecycle(activityId,phase,source='user',extra={}){
    if(!activityId)throw new Error('activityId is required');
    const item={
      lifecycleId:extra.lifecycleId||uid('life'),
      activityId,
      phase,
      source,
      observedAt:normalizeTime(extra.observedAt||now()),
      reason:extra.reason??null,
      evidence:clone(extra.evidence??[])
    };
    upsert(KEYS.lifecycles,item,'lifecycleId');
    const activities=list(KEYS.activities);
    const index=activities.findIndex(activity=>activity.activityId===activityId);
    if(index>=0){
      activities[index].currentPhase=phase;
      activities[index].updatedAt=now();
      write(KEYS.activities,activities);
    }
    return clone(item);
  }

  function addMemo(input={}){
    const memo={
      memoId:input.memoId||uid('memo'),
      kind:input.kind||'memo',
      text:String(input.text||'').trim(),
      observedAt:normalizeTime(input.observedAt||input.time),
      source:input.source||'text',
      completed:Boolean(input.completed),
      pinned:Boolean(input.pinned),
      planIds:Array.isArray(input.planIds)?input.planIds:[],
      activityIds:Array.isArray(input.activityIds)?input.activityIds:[],
      status:input.status||'saved',
      legacyRef:input.legacyRef??null
    };
    if(!memo.text)throw new Error('memo text is required');
    upsert(KEYS.memos,memo,'memoId');
    return clone(memo);
  }

  function saveRecovery(input={}){
    const recovery={
      recoveryId:input.recoveryId||uid('recovery'),
      activityId:input.activityId??null,
      sessionId:input.sessionId??null,
      savedAt:normalizeTime(input.savedAt||now()),
      state:clone(input.state??input)
    };
    upsert(KEYS.recoveries,recovery,'recoveryId');
    return clone(recovery);
  }

  function addRelation(input={}){
    const relation={
      relationId:input.relationId||uid('rel'),
      fromId:input.fromId,
      toId:input.toId,
      relationType:input.relationType||'related_to',
      source:input.source||'user',
      confidence:input.confidence??null,
      createdAt:normalizeTime(input.createdAt||now()),
      supersedes:input.supersedes??null
    };
    if(!relation.fromId||!relation.toId)throw new Error('fromId and toId are required');
    upsert(KEYS.relations,relation,'relationId');
    return clone(relation);
  }

  function findActivityByLegacySession(sessionId){
    return list(KEYS.activities).find(item=>item.legacySessionId===sessionId)||null;
  }

  function migrateLegacy(){
    const migrations=read(KEYS.migrations,{});
    if(migrations.legacyPhase1?.completed)return clone(migrations.legacyPhase1);

    const counts={events:0,facts:0,activities:0,lifecycles:0,memos:0,recoveries:0};

    const legacyFacts=read('outbase_quick_facts_v1',[]);
    legacyFacts.forEach(item=>{
      const event=appendEvent({
        eventId:`legacy_evt_${item.id||uid('legacy')}`,
        eventType:item.type||'legacy_fact',
        observedAt:item.time,
        source:item.source||'legacy',
        sessionId:item.sessionId??null,
        planId:item.planId??null,
        location:item.lat!=null&&item.lng!=null?{lat:item.lat,lng:item.lng,accuracy:item.accuracy??null}:null,
        payload:item,
        legacyRef:item.id||null
      });
      counts.events++;
      addFact({
        factId:`legacy_fact_${item.id||event.eventId}`,
        factType:item.type||'legacy_fact',
        observedAt:item.time,
        source:item.source||'legacy',
        eventId:event.eventId,
        sessionId:item.sessionId??null,
        planId:item.planId??null,
        location:event.location,
        value:item,
        legacyRef:item.id||null
      });
      counts.facts++;
    });

    const legacyMemos=read('outbase_quick_memos_v1',[]);
    legacyMemos.forEach(item=>{
      addMemo({
        memoId:`legacy_memo_${item.id||uid('legacy')}`,
        kind:item.kind||'memo',
        text:item.text||'',
        observedAt:item.time,
        source:item.source||'legacy',
        completed:item.completed,
        pinned:item.pinned,
        status:item.status||'saved',
        planIds:item.planId?[item.planId]:[],
        legacyRef:item.id||null
      });
      counts.memos++;
    });

    const legacyEvents=read('outbase_activity_events_v1',[]);
    const sessionIds=[...new Set(legacyEvents.map(item=>item.sessionId).filter(Boolean))];
    sessionIds.forEach(sessionId=>{
      const first=[...legacyEvents]
        .filter(item=>item.sessionId===sessionId)
        .sort((a,b)=>new Date(a.time)-new Date(b.time))[0];
      const existing=findActivityByLegacySession(sessionId);
      if(!existing){
        upsertActivity({
          activityId:`legacy_activity_${sessionId}`,
          activityType:first?.target||'unspecified',
          title:first?.target||'記録',
          state:'inactive',
          currentPhase:'整理',
          startedAt:first?.time||null,
          source:'legacy',
          legacySessionId:sessionId
        });
        counts.activities++;
      }
    });

    legacyEvents.forEach(item=>{
      appendEvent({
        eventId:`legacy_activity_event_${item.id||uid('legacy')}`,
        eventType:item.type||'activity_event',
        observedAt:item.time,
        source:'legacy-activity',
        sessionId:item.sessionId||null,
        activityId:item.sessionId?`legacy_activity_${item.sessionId}`:null,
        payload:item,
        legacyRef:item.id||null
      });
      counts.events++;
      if(item.phase&&item.sessionId){
        setLifecycle(`legacy_activity_${item.sessionId}`,item.phase,item.source||'legacy',{
          observedAt:item.time,
          reason:item.type,
          evidence:[item.id||null].filter(Boolean)
        });
        counts.lifecycles++;
      }
    });

    const legacyLifecycle=read('outbase_activity_lifecycle_v1',{});
    Object.entries(legacyLifecycle).forEach(([sessionId,item])=>{
      const activityId=`legacy_activity_${sessionId}`;
      if(!findActivityByLegacySession(sessionId)){
        upsertActivity({
          activityId,
          activityType:'unspecified',
          title:'記録',
          state:'inactive',
          currentPhase:item.phase||'整理',
          source:'legacy',
          legacySessionId:sessionId
        });
        counts.activities++;
      }
      setLifecycle(activityId,item.phase||'整理',item.source||'legacy',{
        observedAt:item.updatedAt?new Date(item.updatedAt).toISOString():now(),
        reason:'legacy-lifecycle'
      });
      counts.lifecycles++;
    });

    const legacyRecovery=read('outbase_activity_recovery_v1',null)||
      read('outbase_record_recoverable_session',null);
    if(legacyRecovery){
      saveRecovery({
        recoveryId:'legacy_recovery_current',
        activityId:legacyRecovery.sessionId?`legacy_activity_${legacyRecovery.sessionId}`:null,
        sessionId:legacyRecovery.sessionId??null,
        savedAt:legacyRecovery.savedAt||now(),
        state:legacyRecovery
      });
      counts.recoveries++;
    }

    const result={completed:true,completedAt:now(),counts};
    migrations.legacyPhase1=result;
    write(KEYS.migrations,migrations);
    return clone(result);
  }

  function snapshot(){
    return {
      meta:read(KEYS.meta,{}),
      events:list(KEYS.events),
      facts:list(KEYS.facts),
      activities:list(KEYS.activities),
      lifecycles:list(KEYS.lifecycles),
      memos:list(KEYS.memos),
      recoveries:list(KEYS.recoveries),
      relations:list(KEYS.relations),
      migrations:read(KEYS.migrations,{})
    };
  }

  function stats(){
    const data=snapshot();
    return {
      events:data.events.length,
      facts:data.facts.length,
      activities:data.activities.length,
      lifecycles:data.lifecycles.length,
      memos:data.memos.length,
      recoveries:data.recoveries.length,
      relations:data.relations.length
    };
  }

  function exportJson(){
    return JSON.stringify({
      exportedAt:now(),
      coreVersion:VERSION,
      data:snapshot()
    },null,2);
  }

  ensureMeta();
  const migration=migrateLegacy();

  globalThis.OUTBASE_CORE=Object.freeze({
    VERSION,
    KEYS:clone(KEYS),
    appendEvent,
    addFact,
    upsertActivity,
    setLifecycle,
    addMemo,
    saveRecovery,
    addRelation,
    snapshot,
    stats,
    exportJson,
    migrateLegacy
  });

  globalThis.dispatchEvent(new CustomEvent('outbase:core-ready',{
    detail:{version:VERSION,migration,stats:stats()}
  }));
})();
