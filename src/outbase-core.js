(() => {
  'use strict';

  const VERSION='1.4.0';
  const PREFIX='outbase_core_v1';
  const KEYS={
    meta:`${PREFIX}_meta`,
    events:`${PREFIX}_events`,
    facts:`${PREFIX}_facts`,
    activities:`${PREFIX}_activities`,
    lifecycles:`${PREFIX}_lifecycles`,
    memos:`${PREFIX}_memos`,
    intents:`${PREFIX}_intents`,
    parkings:`${PREFIX}_parkings`,
    imports:`${PREFIX}_imports`,
    media:`${PREFIX}_media`,
    transcripts:`${PREFIX}_transcripts`,
    metadata:`${PREFIX}_metadata`,
    candidates:`${PREFIX}_candidates`,
    aiRequests:`${PREFIX}_ai_requests`,
    aiResponses:`${PREFIX}_ai_responses`,
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
      planIds:Array.isArray(input.planIds)
        ? [...new Set(input.planIds.filter(Boolean))]
        : (input.planId?[input.planId]:[]),
      activityId:input.activityId??null,
      location:input.location??null,
      payloadRef:input.payloadRef??null,
      payload:clone(input.payload??null),
      status:'fact',
      legacyRef:input.legacyRef??null
    };
    upsert(KEYS.events,event,'eventId');
    applyContextRelations(event.eventId,'event',event);
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
      planIds:Array.isArray(input.planIds)
        ? [...new Set(input.planIds.filter(Boolean))]
        : (input.planId?[input.planId]:[]),
      activityId:input.activityId??null,
      location:clone(input.location??null),
      value:clone(input.value??input.payload??null),
      immutable:true,
      legacyRef:input.legacyRef??null
    };
    upsert(KEYS.facts,fact,'factId');
    applyContextRelations(fact.factId,'fact',fact);
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
      planIds:Array.isArray(input.planIds)?[...new Set(input.planIds.filter(Boolean))]:[],
      parentActivityId:input.parentActivityId??null,
      source:input.source||'outbase',
      legacySessionId:input.legacySessionId??null
    };
    const saved=upsert(KEYS.activities,activity,'activityId');
    linkEntityToPlans(activity.activityId,'activity',activity.planIds,'rule');
    if(['active','paused'].includes(activity.state)&&!primaryActivity()){
      setPrimaryActivity(activity.activityId);
    }
    return saved;
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
      planIds:Array.isArray(input.planIds)?[...new Set(input.planIds.filter(Boolean))]:[],
      activityIds:Array.isArray(input.activityIds)?input.activityIds:[],
      status:input.status||'saved',
      legacyRef:input.legacyRef??null
    };
    if(!memo.text)throw new Error('memo text is required');
    upsert(KEYS.memos,memo,'memoId');
    applyContextRelations(memo.memoId,'memo',{planIds:memo.planIds});
    return clone(memo);
  }

  function setIntent(input={}){
    const intent={
      intentId:input.intentId||uid('intent'),
      intentType:input.intentType||input.type||'unknown',
      state:input.state||'active',
      observedAt:normalizeTime(input.observedAt||input.time||now()),
      source:input.source||'outbase',
      activityId:input.activityId??null,
      sessionId:input.sessionId??null,
      planId:input.planId??null,
      payload:clone(input.payload??null),
      legacyRef:input.legacyRef??null
    };
    return upsert(KEYS.intents,intent,'intentId');
  }

  function clearIntent(intentId,extra={}){
    if(!intentId)return null;
    const intents=list(KEYS.intents);
    const index=intents.findIndex(item=>item.intentId===intentId);
    if(index<0)return null;
    intents[index]={
      ...intents[index],
      state:'completed',
      completedAt:normalizeTime(extra.completedAt||now()),
      result:clone(extra.result??null),
      updatedAt:now()
    };
    write(KEYS.intents,intents);
    return clone(intents[index]);
  }

  function saveParking(input={}){
    const parking={
      parkingId:input.parkingId||uid('parking'),
      state:input.state||'active',
      savedAt:normalizeTime(input.savedAt||input.observedAt||input.time||now()),
      clearedAt:input.clearedAt?normalizeTime(input.clearedAt):null,
      source:input.source||'outbase',
      activityId:input.activityId??null,
      sessionId:input.sessionId??null,
      planId:input.planId??null,
      location:clone(input.location??null),
      label:input.label||'駐車位置',
      note:input.note||'',
      evidence:clone(input.evidence??null),
      legacyRef:input.legacyRef??null
    };
    const saved=upsert(KEYS.parkings,parking,'parkingId');
    applyContextRelations(parking.parkingId,'parking',{planId:parking.planId,location:parking.location});
    return saved;
  }

  function clearParking(parkingId,extra={}){
    if(!parkingId)return null;
    const parkings=list(KEYS.parkings);
    const index=parkings.findIndex(item=>item.parkingId===parkingId);
    if(index<0)return null;
    parkings[index]={
      ...parkings[index],
      state:'cleared',
      clearedAt:normalizeTime(extra.clearedAt||now()),
      clearReason:extra.reason||'user',
      updatedAt:now()
    };
    write(KEYS.parkings,parkings);
    return clone(parkings[index]);
  }

  function createImportJob(input={}){
    const job={
      importId:input.importId||uid('import'),
      state:input.state||'queued',
      sourceType:input.sourceType||'file',
      fileName:input.fileName||'',
      mimeType:input.mimeType||'application/octet-stream',
      size:Number(input.size||0),
      hash:input.hash||null,
      createdAt:normalizeTime(input.createdAt||now()),
      startedAt:input.startedAt?normalizeTime(input.startedAt):null,
      completedAt:input.completedAt?normalizeTime(input.completedAt):null,
      failedAt:input.failedAt?normalizeTime(input.failedAt):null,
      error:input.error||null,
      retryable:input.retryable!==false,
      retryCount:Number(input.retryCount||0),
      planIds:Array.isArray(input.planIds)?[...new Set(input.planIds.filter(Boolean))]:[],
      activityIds:Array.isArray(input.activityIds)?[...new Set(input.activityIds.filter(Boolean))]:[],
      legacyRef:input.legacyRef??null
    };
    return upsert(KEYS.imports,job,'importId');
  }

  function updateImportJob(importId,patch={}){
    const rows=list(KEYS.imports);
    const index=rows.findIndex(item=>item.importId===importId);
    if(index<0)throw new Error('import job not found');
    rows[index]={...rows[index],...clone(patch),updatedAt:now()};
    ['startedAt','completedAt','failedAt'].forEach(key=>{
      if(rows[index][key])rows[index][key]=normalizeTime(rows[index][key]);
    });
    write(KEYS.imports,rows);
    return clone(rows[index]);
  }

  function saveMedia(input={}){
    const media={
      mediaId:input.mediaId||uid('media'),
      importId:input.importId??null,
      kind:input.kind||'file',
      fileName:input.fileName||'',
      mimeType:input.mimeType||'application/octet-stream',
      size:Number(input.size||0),
      hash:input.hash||null,
      originalRef:input.originalRef??null,
      previewRef:input.previewRef??null,
      capturedAt:input.capturedAt?normalizeTime(input.capturedAt):null,
      storedAt:normalizeTime(input.storedAt||now()),
      location:clone(input.location??null),
      immutable:true
    };
    return upsert(KEYS.media,media,'mediaId');
  }

  function saveTranscript(input={}){
    const transcript={
      transcriptId:input.transcriptId||uid('transcript'),
      importId:input.importId??null,
      mediaId:input.mediaId??null,
      text:String(input.text||''),
      language:input.language||'ja',
      source:input.source||'speech-recognition',
      state:input.state||'raw',
      confidence:input.confidence??null,
      createdAt:normalizeTime(input.createdAt||now()),
      correctedText:input.correctedText??null,
      correctedAt:input.correctedAt?normalizeTime(input.correctedAt):null
    };
    return upsert(KEYS.transcripts,transcript,'transcriptId');
  }

  function saveMetadata(input={}){
    const row={
      metadataId:input.metadataId||uid('metadata'),
      importId:input.importId??null,
      mediaId:input.mediaId??null,
      key:input.key||'unknown',
      value:clone(input.value??null),
      source:input.source||'local',
      confidence:input.confidence??null,
      observedAt:normalizeTime(input.observedAt||now()),
      immutable:Boolean(input.immutable)
    };
    return upsert(KEYS.metadata,row,'metadataId');
  }

  function saveCandidate(input={}){
    const candidate={
      candidateId:input.candidateId||uid('candidate'),
      importId:input.importId??null,
      candidateType:input.candidateType||'unknown',
      payload:clone(input.payload??null),
      source:input.source||'extractor',
      confidence:input.confidence??null,
      state:input.state||'pending',
      createdAt:normalizeTime(input.createdAt||now()),
      decidedAt:input.decidedAt?normalizeTime(input.decidedAt):null,
      decision:input.decision??null
    };
    return upsert(KEYS.candidates,candidate,'candidateId');
  }

  function decideCandidate(candidateId,decision,extra={}){
    const rows=list(KEYS.candidates);
    const index=rows.findIndex(item=>item.candidateId===candidateId);
    if(index<0)throw new Error('candidate not found');
    rows[index]={
      ...rows[index],
      state:decision==='accept'?'accepted':decision==='reject'?'rejected':'pending',
      decision,
      decidedAt:now(),
      decidedBy:extra.decidedBy||'user',
      updatedAt:now()
    };
    write(KEYS.candidates,rows);
    return clone(rows[index]);
  }

  function saveAiRequest(input={}){
    const request={
      requestId:input.requestId||uid('ai_request'),
      purpose:input.purpose||'general',
      prompt:input.prompt||'',
      context:clone(input.context??null),
      schemaVersion:input.schemaVersion||'outbase-chappy-v1',
      state:input.state||'prepared',
      createdAt:normalizeTime(input.createdAt||now()),
      sentAt:input.sentAt?normalizeTime(input.sentAt):null,
      source:input.source||'outbase'
    };
    if(!request.prompt)throw new Error('prompt is required');
    return upsert(KEYS.aiRequests,request,'requestId');
  }

  function saveAiResponse(input={}){
    const response={
      responseId:input.responseId||uid('ai_response'),
      requestId:input.requestId??null,
      state:input.state||'imported',
      schemaVersion:input.schemaVersion||'outbase-chappy-v1',
      rawText:input.rawText||'',
      normalized:clone(input.normalized??null),
      warnings:Array.isArray(input.warnings)?input.warnings:[],
      importedAt:normalizeTime(input.importedAt||now()),
      source:input.source||'chatgpt'
    };
    return upsert(KEYS.aiResponses,response,'responseId');
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
    if(!input.fromId||!input.toId)throw new Error('fromId and toId are required');
    const relations=list(KEYS.relations);
    const same=relations.find(item=>
      item.fromId===input.fromId&&
      item.toId===input.toId&&
      item.relationType===(input.relationType||'related_to')&&
      item.state!=='superseded'
    );
    if(same&&!input.forceNew)return clone(same);

    const relation={
      relationId:input.relationId||uid('rel'),
      fromId:input.fromId,
      fromType:input.fromType??null,
      toId:input.toId,
      toType:input.toType??null,
      relationType:input.relationType||'related_to',
      source:input.source||'user',
      confidence:input.confidence??null,
      state:'active',
      createdAt:normalizeTime(input.createdAt||now()),
      supersedes:input.supersedes??null,
      evidence:clone(input.evidence??[])
    };
    if(relation.supersedes){
      const oldIndex=relations.findIndex(item=>item.relationId===relation.supersedes);
      if(oldIndex>=0){
        relations[oldIndex]={...relations[oldIndex],state:'superseded',supersededAt:now(),updatedAt:now()};
        write(KEYS.relations,relations);
      }
    }
    upsert(KEYS.relations,relation,'relationId');
    return clone(relation);
  }

  function relationsFor(entityId,options={}){
    if(!entityId)return [];
    const direction=options.direction||'both';
    return list(KEYS.relations).filter(item=>{
      if(options.includeSuperseded!==true&&item.state==='superseded')return false;
      if(direction==='from')return item.fromId===entityId;
      if(direction==='to')return item.toId===entityId;
      return item.fromId===entityId||item.toId===entityId;
    });
  }

  function normalizePlanIds(input={}){
    const ids=[
      ...(Array.isArray(input.planIds)?input.planIds:[]),
      input.planId
    ].filter(Boolean);
    return [...new Set(ids)];
  }

  function linkEntityToPlans(entityId,entityType,planIds,source='rule'){
    return [...new Set((planIds||[]).filter(Boolean))].map(planId=>addRelation({
      fromId:entityId,
      fromType:entityType,
      toId:planId,
      toType:'plan',
      relationType:'belongs_to_plan',
      source,
      confidence:source==='user'?1:0.95
    }));
  }

  function linkEntityToActivities(entityId,entityType,activityIds,source='rule'){
    return [...new Set((activityIds||[]).filter(Boolean))].map(activityId=>addRelation({
      fromId:entityId,
      fromType:entityType,
      toId:activityId,
      toType:'activity',
      relationType:'belongs_to_activity',
      source,
      confidence:source==='user'?1:0.98
    }));
  }

  function activeActivities(){
    return list(KEYS.activities).filter(item=>['active','paused'].includes(item.state));
  }

  function primaryActivity(){
    const meta=ensureMeta();
    const active=activeActivities();
    return active.find(item=>item.activityId===meta.primaryActivityId)||active[0]||null;
  }

  function setPrimaryActivity(activityId){
    const meta=ensureMeta();
    const exists=list(KEYS.activities).some(item=>item.activityId===activityId);
    if(activityId&&!exists)throw new Error('activity not found');
    meta.primaryActivityId=activityId||null;
    meta.updatedAt=now();
    write(KEYS.meta,meta);
    return activityId?clone(list(KEYS.activities).find(item=>item.activityId===activityId)):null;
  }

  function linkPlan(entityType,entityId,planId,source='user'){
    if(!entityType||!entityId||!planId)throw new Error('entityType, entityId and planId are required');
    const keyByType={
      activity:[KEYS.activities,'activityId','planIds'],
      memo:[KEYS.memos,'memoId','planIds'],
      parking:[KEYS.parkings,'parkingId','planIds'],
      event:[KEYS.events,'eventId','planIds'],
      fact:[KEYS.facts,'factId','planIds']
    };
    const config=keyByType[entityType];
    if(config){
      const [key,idField,plansField]=config;
      const rows=list(key);
      const index=rows.findIndex(item=>item[idField]===entityId);
      if(index>=0){
        rows[index][plansField]=[...new Set([...(rows[index][plansField]||[]),planId])];
        if(!rows[index].planId)rows[index].planId=planId;
        rows[index].updatedAt=now();
        write(key,rows);
      }
    }
    return addRelation({
      fromId:entityId,fromType:entityType,
      toId:planId,toType:'plan',
      relationType:'belongs_to_plan',
      source,confidence:source==='user'?1:0.95
    });
  }

  function unlinkPlan(entityType,entityId,planId,source='user'){
    const keyByType={
      activity:[KEYS.activities,'activityId','planIds'],
      memo:[KEYS.memos,'memoId','planIds'],
      parking:[KEYS.parkings,'parkingId','planIds'],
      event:[KEYS.events,'eventId','planIds'],
      fact:[KEYS.facts,'factId','planIds']
    };
    const config=keyByType[entityType];
    if(config){
      const [key,idField,plansField]=config;
      const rows=list(key);
      const index=rows.findIndex(item=>item[idField]===entityId);
      if(index>=0){
        rows[index][plansField]=(rows[index][plansField]||[]).filter(id=>id!==planId);
        if(rows[index].planId===planId)rows[index].planId=rows[index][plansField][0]||null;
        rows[index].updatedAt=now();
        write(key,rows);
      }
    }
    const activeRelation=relationsFor(entityId,{direction:'from'}).find(item=>
      item.toId===planId&&item.relationType==='belongs_to_plan'
    );
    if(activeRelation){
      addRelation({
        fromId:entityId,fromType:entityType,
        toId:planId,toType:'plan',
        relationType:'plan_link_removed',
        source,confidence:1,
        supersedes:activeRelation.relationId,
        forceNew:true
      });
    }
    return true;
  }

  function contextSnapshot(input={}){
    const events=list(KEYS.events);
    const facts=list(KEYS.facts);
    const intents=list(KEYS.intents);
    const parkings=list(KEYS.parkings);
    const activities=activeActivities();
    const primary=primaryActivity();
    const explicitPlanIds=normalizePlanIds(input);
    const activityPlanIds=activities.flatMap(item=>item.planIds||[]);
    const storedPlanId=localStorage.getItem('outbase_active_plan_id')||null;
    const planIds=[...new Set([
      ...explicitPlanIds,
      ...activityPlanIds,
      storedPlanId
    ].filter(Boolean))];
    const latestIntent=intents
      .filter(item=>item.state==='active')
      .sort((a,b)=>new Date(b.observedAt)-new Date(a.observedAt))[0]||null;
    const latestParking=parkings
      .filter(item=>item.state==='active')
      .sort((a,b)=>new Date(b.savedAt)-new Date(a.savedAt))[0]||null;
    const recentSince=Date.now()-30*60*1000;
    return {
      generatedAt:now(),
      activityIds:activities.map(item=>item.activityId),
      primaryActivityId:primary?.activityId||null,
      planIds,
      currentIntent:clone(latestIntent),
      activeParking:clone(latestParking),
      recentEventIds:events.filter(item=>new Date(item.observedAt).getTime()>=recentSince).slice(0,50).map(item=>item.eventId),
      recentFactIds:facts.filter(item=>new Date(item.observedAt).getTime()>=recentSince).slice(0,50).map(item=>item.factId),
      location:clone(input.location??latestParking?.location??null),
      source:'local-rule'
    };
  }

  function applyContextRelations(entityId,entityType,input={}){
    if(!entityId)return [];
    const context=contextSnapshot(input);
    const linked=[];
    linked.push(...linkEntityToPlans(entityId,entityType,context.planIds,'rule'));
    linked.push(...linkEntityToActivities(entityId,entityType,context.activityIds,'rule'));
    if(context.activeParking&&entityType!=='parking'){
      linked.push(addRelation({
        fromId:entityId,fromType:entityType,
        toId:context.activeParking.parkingId,toType:'parking',
        relationType:'near_active_parking',
        source:'rule',confidence:0.8
      }));
    }
    return linked;
  }

  function findActivityByLegacySession(sessionId){
    return list(KEYS.activities).find(item=>item.legacySessionId===sessionId)||null;
  }

  function migrateLegacy(){
    const migrations=read(KEYS.migrations,{});
    if(migrations.legacyPhase1?.completed)return clone(migrations.legacyPhase1);

    const counts={events:0,facts:0,activities:0,lifecycles:0,memos:0,intents:0,parkings:0,recoveries:0};

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

    const legacyPins=read('outbase_record_saved_pins',[]);
    legacyPins
      .filter(item=>item&&item.category==='parking')
      .forEach(item=>{
        saveParking({
          parkingId:`legacy_parking_${item.id||uid('legacy')}`,
          state:item.clearedAt?'cleared':'active',
          savedAt:item.time||now(),
          clearedAt:item.clearedAt||null,
          source:'legacy',
          sessionId:item.sessionId??null,
          location:item.lat!=null&&item.lng!=null
            ?{lat:item.lat,lng:item.lng,accuracy:item.accuracy??null}
            :null,
          label:item.label||'駐車位置',
          note:item.note||'',
          evidence:item.parking||null,
          legacyRef:item.id||null
        });
        counts.parkings=(counts.parkings||0)+1;
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
      intents:list(KEYS.intents),
      parkings:list(KEYS.parkings),
      imports:list(KEYS.imports),
      media:list(KEYS.media),
      transcripts:list(KEYS.transcripts),
      metadata:list(KEYS.metadata),
      candidates:list(KEYS.candidates),
      aiRequests:list(KEYS.aiRequests),
      aiResponses:list(KEYS.aiResponses),
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
      intents:data.intents.length,
      parkings:data.parkings.length,
      imports:data.imports.length,
      media:data.media.length,
      transcripts:data.transcripts.length,
      metadata:data.metadata.length,
      candidates:data.candidates.length,
      aiRequests:data.aiRequests.length,
      aiResponses:data.aiResponses.length,
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
    setIntent,
    clearIntent,
    saveParking,
    clearParking,
    createImportJob,
    updateImportJob,
    saveMedia,
    saveTranscript,
    saveMetadata,
    saveCandidate,
    decideCandidate,
    saveAiRequest,
    saveAiResponse,
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
