(() => {
  'use strict';

  const MIGRATION_ID='v160_phase1_legacy_shadow';
  const SCHEMA_VERSION=1;
  const FIXED={
    household:'01J00000000000000000000000',
    account:'01J00000000000000000000001',
    ownerMember:'01J00000000000000000000002'
  };

  const ids=()=>globalThis.OUTBASE_IDS;
  const repo=()=>globalThis.OUTBASE_REPOSITORIES_V160;
  const legacy=()=>globalThis.OUTBASE_LEGACY_ADAPTER_V160;

  const iso=value=>{
    const date=new Date(value||Date.now());
    return Number.isNaN(date.getTime())?new Date().toISOString():date.toISOString();
  };

  function safeTitle(value,fallback='活動'){
    const title=String(value||'').trim();
    if(!title)return fallback;
    if(title.length>120)return title.slice(0,120);
    if(/(持ち物候補|予定候補|買う物|改善候補|保存先：|追加してください)/.test(title))return fallback;
    return title;
  }

  function activityType(value){
    const text=String(value||'').toLowerCase();
    if(text.includes('camp')||text.includes('キャンプ'))return 'camp';
    if(text.includes('drive')||text.includes('ドライブ'))return 'drive';
    if(text.includes('walk')||text.includes('散歩'))return 'walk';
    if(text.includes('shop')||text.includes('買'))return 'shopping';
    if(text.includes('event')||text.includes('イベント'))return 'event';
    return 'other';
  }

  function activityState(value,dates={}){
    const state=String(value||'').toLowerCase();
    if(['active','paused','preparing','planned','candidate','organizing','completed','archived'].includes(state))return state;
    if(state==='inactive')return 'organizing';
    const end=dates.end_at?new Date(dates.end_at).getTime():0;
    const start=dates.start_at?new Date(dates.start_at).getTime():0;
    const now=Date.now();
    if(end&&end<now)return 'completed';
    if(start&&start<=now)return 'preparing';
    return 'planned';
  }

  function recordType(kind){
    const value=String(kind||'').toLowerCase();
    if(value==='photo')return 'photo';
    if(value==='video')return 'video';
    if(value==='speech'||value==='audio'||value==='transcript')return 'audio_transcript';
    if(value==='pin'||value==='parking')return 'pin';
    if(value==='location'||value==='gps')return 'location';
    if(value==='memo'||value==='note'||value==='text')return 'note';
    return 'legacy';
  }

  async function ensureIdentity(snapshot){
    const household=await repo().households.ensure(FIXED.household,{
      name:'わが家',owner_account_id:FIXED.account,schema_version:SCHEMA_VERSION,source:'v160-migration'
    });
    const account=await repo().accounts.ensure(FIXED.account,{
      household_id:household.id,auth_provider:'local',display_name:'むー',schema_version:SCHEMA_VERSION,source:'v160-migration'
    });
    const ownerMember=await repo().members.ensure(FIXED.ownerMember,{
      household_id:household.id,account_id:account.id,name:'むー',role:'owner',schema_version:SCHEMA_VERSION,source:'v160-migration'
    });

    const petMap=new Map();
    for(const pet of legacy().pets()){
      const legacyKey=String(pet.id||pet.name);
      const row=await repo().pets.upsertByLegacyRef(`pet:${legacyKey}`,{
        household_id:household.id,name:pet.name||'ペット',species:pet.species||'',breed:pet.breed||'',sex:pet.sex||'',
        profile:pet,schema_version:SCHEMA_VERSION,source:'legacy-shadow'
      });
      petMap.set(legacyKey,{type:'pet',id:row.id,name:row.name});
      if(pet.name)petMap.set(String(pet.name),{type:'pet',id:row.id,name:row.name});
    }

    const companionMap=new Map();
    for(const companion of legacy().companions()){
      const key=String(companion.id||companion.name||'');
      const name=String(companion.name||'').trim();
      if(!key)continue;
      if(companion.solo||name==='ひとり'){
        companionMap.set(key,{type:'member',id:ownerMember.id,name:ownerMember.name});
        continue;
      }
      const pet=petMap.get(key)||petMap.get(name);
      if(pet){companionMap.set(key,pet);continue;}
      const member=await repo().members.upsertByLegacyRef(`companion:${key}`,{
        household_id:household.id,account_id:null,name:name||'同行者',role:'participant',schema_version:SCHEMA_VERSION,source:'legacy-companion'
      });
      companionMap.set(key,{type:'member',id:member.id,name:member.name});
      if(name)companionMap.set(name,{type:'member',id:member.id,name:member.name});
    }

    await repo().visibilityRules.upsertByLegacyRef('default:private',{
      household_id:household.id,entity_type:'default',entity_id:null,visibility:'private',rule:{share_with_household:false,public_candidate:false},
      schema_version:SCHEMA_VERSION,source:'v160-default'
    });
    await repo().appMeta.save({
      id:'legacy_snapshot',migration_id:MIGRATION_ID,fingerprint:snapshot.fingerprint,captured_at:snapshot.captured_at,
      counts:snapshot.counts,legacy_db:snapshot.legacy_db,schema_version:SCHEMA_VERSION
    });
    return {household,account,member:ownerMember,petMap,companionMap};
  }

  async function ensureParticipant(context,activityId,participant,role='participant',legacyRef=''){
    if(!participant?.id)return null;
    return repo().activityParticipants.upsertByLegacyRef(legacyRef||`participant:${activityId}:${participant.type}:${participant.id}`,{
      household_id:context.household.id,activity_id:activityId,participant_type:participant.type,participant_id:participant.id,
      role,schema_version:SCHEMA_VERSION,source:'legacy-shadow',created_by:context.member.id,updated_by:context.member.id
    });
  }

  async function ensureActivityOwnership(context,activityId,plan=null){
    await ensureParticipant(context,activityId,{type:'member',id:context.member.id},'creator',`participant:${activityId}:creator:${context.member.id}`);
    const companionIds=Array.isArray(plan?.companionIds)?plan.companionIds:[];
    const companionNames=Array.isArray(plan?.companionNames)?plan.companionNames:[];
    const refs=[...companionIds,...companionNames];
    const seen=new Set();
    for(const ref of refs){
      const participant=context.companionMap.get(String(ref));
      if(!participant)continue;
      const unique=`${participant.type}:${participant.id}`;
      if(seen.has(unique))continue;
      seen.add(unique);
      await ensureParticipant(context,activityId,participant,'participant',`participant:${activityId}:${unique}`);
    }
    await repo().visibilityRules.upsertByLegacyRef(`activity:${activityId}:private`,{
      household_id:context.household.id,entity_type:'activity',entity_id:activityId,visibility:'private',
      rule:{share_with_household:false,public_candidate:false},schema_version:SCHEMA_VERSION,source:'legacy-shadow'
    });
  }

  async function migratePlans(context){
    const mapping=new Map();
    for(const plan of legacy().plans()){
      const legacyId=String(plan.id||plan.planId||ids().ulid());
      const startAt=plan.startAt||plan.start_at||plan.date||plan.startDate||plan.start||null;
      const endAt=plan.endAt||plan.end_at||plan.endDate||plan.end||startAt||null;
      const type=activityType(plan.type||plan.activityType||plan.category||plan.title||plan.name);
      const row=await repo().activities.upsertByLegacyRef(`plan:${legacyId}`,{
        household_id:context.household.id,type,
        title:safeTitle(plan.title||plan.name||plan.placeName,type==='camp'?'キャンプ':'予定'),
        state:activityState(plan.state||plan.status,{start_at:startAt,end_at:endAt}),
        start_at:startAt?iso(startAt):null,end_at:endAt?iso(endAt):null,timezone:'Asia/Tokyo',visibility:'private',
        source:'legacy-plan',metadata:{legacy_plan:plan},schema_version:SCHEMA_VERSION,
        created_by:context.member.id,updated_by:context.member.id
      });
      mapping.set(legacyId,row.id);
      await ensureActivityOwnership(context,row.id,plan);
      if(startAt){
        await repo().calendarEntries.upsertByLegacyRef(`calendar:plan:${legacyId}`,{
          household_id:context.household.id,activity_id:row.id,start_at:iso(startAt),end_at:endAt?iso(endAt):iso(startAt),
          all_day:plan.allDay!==false&&!String(startAt).includes('T'),timezone:'Asia/Tokyo',
          recurrence:plan.repeat||null,reminders:plan.reminders||[],source:'legacy-plan',schema_version:SCHEMA_VERSION,
          created_by:context.member.id,updated_by:context.member.id
        });
      }
    }
    return mapping;
  }

  async function migrateCoreActivities(context,planMap){
    const activityMap=new Map();
    const sessionMap=new Map();
    for(const item of legacy().coreActivities()){
      const legacyId=String(item.activityId||item.id||ids().ulid());
      const linkedActivityIds=(item.planIds||[]).map(id=>planMap.get(String(id))).filter(Boolean);
      const linked=linkedActivityIds[0]?await repo().activities.get(linkedActivityIds[0]):null;
      const type=activityType(item.activityType||item.title||linked?.type);
      let row;
      if(linked){
        row=await repo().activities.save({
          ...linked,
          type:linked.type||type,
          title:linked.title||safeTitle(item.title,type==='walk'?'散歩':'活動'),
          state:activityState(item.state,{start_at:item.startedAt}),
          start_at:linked.start_at||(item.startedAt?iso(item.startedAt):null),
          end_at:item.becameInactiveAt?iso(item.becameInactiveAt):linked.end_at,
          legacy_refs:[...(linked.legacy_refs||[]),`core_activity:${legacyId}`],
          metadata:{...(linked.metadata||{}),legacy_core_activity:item},
          source:'legacy-plan-core-unified',updated_by:context.member.id
        });
      }else{
        row=await repo().activities.upsertByLegacyRef(`core_activity:${legacyId}`,{
          household_id:context.household.id,type,title:safeTitle(item.title,type==='walk'?'散歩':'活動'),
          state:activityState(item.state,{start_at:item.startedAt}),start_at:item.startedAt?iso(item.startedAt):null,
          end_at:item.becameInactiveAt?iso(item.becameInactiveAt):null,visibility:'private',source:'legacy-core',
          metadata:{legacy_core_activity:item},schema_version:SCHEMA_VERSION,
          created_by:context.member.id,updated_by:context.member.id
        });
        await ensureActivityOwnership(context,row.id,null);
      }
      activityMap.set(legacyId,row.id);
      if(item.legacySessionId)sessionMap.set(String(item.legacySessionId),row.id);
      if(item.currentPhase){
        await repo().activityTransitions.upsertByLegacyRef(`transition:core:${legacyId}:${item.currentPhase}`,{
          household_id:context.household.id,activity_id:row.id,from_state:null,to_state:row.state,at:row.updated_at,
          actor_id:context.member.id,label:item.currentPhase,source:'legacy-core',schema_version:SCHEMA_VERSION
        });
      }
    }
    return {activityMap,sessionMap};
  }

  function sessionKey(sessionId,target,createdAt){
    if(sessionId)return String(sessionId);
    const day=iso(createdAt||Date.now()).slice(0,10);
    return `unassigned:${String(target||'record')}:${day}`;
  }

  async function ensureSessionActivity(context,sessionMap,sessionId,target,createdAt){
    const key=sessionKey(sessionId,target,createdAt);
    if(sessionMap.has(key))return sessionMap.get(key);
    const type=activityType(target);
    const row=await repo().activities.upsertByLegacyRef(`session:${key}`,{
      household_id:context.household.id,type,title:safeTitle(target,type==='walk'?'散歩':'記録'),state:'organizing',
      start_at:createdAt?iso(createdAt):null,visibility:'private',source:'legacy-record-session',
      schema_version:SCHEMA_VERSION,created_by:context.member.id,updated_by:context.member.id
    });
    await ensureActivityOwnership(context,row.id,null);
    sessionMap.set(key,row.id);
    return row.id;
  }

  async function migrateRecords(context,sessionMap){
    const rows=await legacy().records();
    const migrated=[];
    const legacyIds=new Set();
    for(const item of rows){
      const legacyId=String(item.id);
      legacyIds.add(legacyId);
      const activityId=await ensureSessionActivity(context,sessionMap,item.sessionId,item.target,item.createdAt);
      const payload={...item};
      delete payload.hasBlob;delete payload.blobType;delete payload.blobSize;
      const row=await repo().records.upsertByLegacyRef(`record:${legacyId}`,{
        household_id:context.household.id,activity_id:activityId,type:recordType(item.kind),occurred_at:iso(item.createdAt||Date.now()),
        actor_id:context.member.id,visibility:'private',payload,source:'legacy-field03',schema_version:SCHEMA_VERSION,
        created_by:context.member.id,updated_by:context.member.id
      });
      migrated.push(row);
      if(['photo','video'].includes(row.type)||item.hasBlob){
        await repo().media.upsertByLegacyRef(`media:record:${legacyId}`,{
          household_id:context.household.id,record_id:row.id,activity_id:activityId,media_type:row.type==='video'?'video':'photo',
          local_ref:{database:'outbase_db',store:'fieldRecords',key:legacyId},mime_type:item.type||item.blobType||'',
          size:Number(item.size||item.blobSize||0),source:'legacy-field03-reference',schema_version:SCHEMA_VERSION,
          created_by:context.member.id,updated_by:context.member.id
        });
      }
    }

    for(const pin of legacy().savedPins()){
      const legacyId=String(pin.id||ids().ulid());
      if(legacyIds.has(legacyId))continue;
      const activityId=await ensureSessionActivity(context,sessionMap,pin.sessionId,pin.target||'記録',pin.time||pin.createdAt);
      await repo().records.upsertByLegacyRef(`pin:${legacyId}`,{
        household_id:context.household.id,activity_id:activityId,type:'pin',occurred_at:iso(pin.time||pin.createdAt||Date.now()),
        actor_id:context.member.id,visibility:'private',payload:pin,source:'legacy-pin',schema_version:SCHEMA_VERSION,
        created_by:context.member.id,updated_by:context.member.id
      });
    }
    return migrated;
  }

  async function migrateGps(context,sessionMap){
    const points=legacy().trackPoints();
    if(!points.length)return null;
    const runtime=legacy().currentRuntime();
    const activityId=await ensureSessionActivity(context,sessionMap,runtime.session_id,runtime.record_target,runtime.session_started_at||points[0]?.time);
    const started=points[0]?.time||points[0]?.createdAt||runtime.session_started_at||Date.now();
    const ended=points[points.length-1]?.time||points[points.length-1]?.createdAt||started;
    return repo().gpsChunks.upsertByLegacyRef(`gps:${runtime.session_id||sessionKey(null,runtime.record_target,started)}:0`,{
      household_id:context.household.id,activity_id:activityId,chunk_no:0,started_at:iso(started),ended_at:iso(ended),
      points:points.map((point,index)=>({...point,seq:index,break_before:Boolean(point.breakBefore)})),
      point_count:points.length,source:'legacy-current-track',schema_version:SCHEMA_VERSION,
      created_by:context.member.id,updated_by:context.member.id
    });
  }

  async function migrateAssets(context){
    const rows=[];
    for(const item of legacy().gear()){
      rows.push(await repo().assets.upsertByLegacyRef(`gear:${item.id||item.name}`,{
        household_id:context.household.id,asset_type:'gear',name:item.name||'名称未設定ギア',status:item.condition||item.status||'active',
        payload:item,source:'legacy-gear',schema_version:SCHEMA_VERSION,created_by:context.member.id,updated_by:context.member.id
      }));
    }
    return rows;
  }

  async function verify(snapshot){
    const [records,activities,participants,media]=await Promise.all([
      repo().records.all(),repo().activities.all(),repo().activityParticipants.all(),repo().media.all()
    ]);
    const migratedLegacyRecords=records.filter(row=>String(row.legacy_ref||'').startsWith('record:'));
    const activityIds=new Set(activities.map(row=>row.id));
    const memberIds=new Set((await repo().members.all()).map(row=>row.id));
    const petIds=new Set((await repo().pets.all()).map(row=>row.id));
    const recordIds=new Set(records.map(row=>row.id));
    const brokenRecordRefs=migratedLegacyRecords.filter(row=>row.activity_id&&!activityIds.has(row.activity_id));
    const brokenParticipants=participants.filter(row=>{
      if(!activityIds.has(row.activity_id))return true;
      return row.participant_type==='pet'?!petIds.has(row.participant_id):!memberIds.has(row.participant_id);
    });
    const brokenMedia=media.filter(row=>row.record_id&&!recordIds.has(row.record_id));
    const result={
      legacy_record_count:snapshot.counts.records,
      migrated_record_count:migratedLegacyRecords.length,
      record_count_match:snapshot.counts.records===migratedLegacyRecords.length,
      broken_activity_references:brokenRecordRefs.length,
      broken_participant_references:brokenParticipants.length,
      broken_media_references:brokenMedia.length
    };
    result.passed=result.record_count_match&&result.broken_activity_references===0&&
      result.broken_participant_references===0&&result.broken_media_references===0;
    return result;
  }

  async function run({force=false}={}){
    const runtime=legacy().currentRuntime();
    if(['active','paused'].includes(runtime.session_state)){
      return {migration_id:MIGRATION_ID,status:'deferred_active_session',cutover:false,legacy_data_untouched:true};
    }

    const snapshot=await legacy().snapshot();
    const currentStatus=await repo().appMeta.get('migration_status');
    if(!force&&currentStatus?.status==='ready'&&currentStatus.source_fingerprint===snapshot.fingerprint){
      return {...currentStatus,skipped:true,cutover:false,legacy_data_untouched:true};
    }

    const startedAt=ids().nowIso();
    const snapshotRow=await repo().migrationSnapshots.save({
      id:ids().ulid(),migration_id:MIGRATION_ID,status:'running',created_at:startedAt,updated_at:startedAt,
      source_fingerprint:snapshot.fingerprint,legacy_counts:snapshot.counts,legacy_db:snapshot.legacy_db,
      legacy_local_storage:snapshot.local_storage,schema_version:SCHEMA_VERSION
    });
    try{
      const context=await ensureIdentity(snapshot);
      const planMap=await migratePlans(context);
      const {activityMap,sessionMap}=await migrateCoreActivities(context,planMap);
      const records=await migrateRecords(context,sessionMap);
      const gpsChunk=await migrateGps(context,sessionMap);
      const assets=await migrateAssets(context);
      const verification=await verify(snapshot);
      const completedAt=ids().nowIso();
      const status=verification.passed?'ready':'verification_failed';
      await repo().migrationSnapshots.save({...snapshotRow,status,completed_at:completedAt,verification,updated_at:completedAt});
      await repo().appMeta.save({
        id:'migration_status',migration_id:MIGRATION_ID,status,mode:'legacy-shadow',source_fingerprint:snapshot.fingerprint,
        verification,completed_at:completedAt,updated_at:completedAt,schema_version:SCHEMA_VERSION
      });
      const currentActivityId=runtime.current_activity_id?activityMap.get(String(runtime.current_activity_id)):null;
      const currentPlanActivityId=runtime.current_plan_id?planMap.get(String(runtime.current_plan_id)):null;
      await repo().setCurrentActivity(currentActivityId||currentPlanActivityId||null,{mode:'legacy-shadow',legacy_runtime:runtime});
      return {
        migration_id:MIGRATION_ID,status,verification,cutover:false,legacy_data_untouched:true,
        counts:{records:records.length,assets:assets.length,plans:planMap.size,gps_chunks:gpsChunk?1:0}
      };
    }catch(error){
      const failedAt=ids().nowIso();
      await repo().migrationSnapshots.save({...snapshotRow,status:'failed',failed_at:failedAt,error:String(error?.message||error),updated_at:failedAt});
      await repo().appMeta.save({
        id:'migration_status',migration_id:MIGRATION_ID,status:'failed',mode:'legacy',error:String(error?.message||error),
        updated_at:failedAt,schema_version:SCHEMA_VERSION
      });
      throw error;
    }
  }

  async function status(){return repo().appMeta.get('migration_status');}
  async function rollback(){
    const now=ids().nowIso();
    await repo().appMeta.save({
      id:'migration_status',migration_id:MIGRATION_ID,status:'rolled_back',mode:'legacy',updated_at:now,schema_version:SCHEMA_VERSION
    });
    await repo().setCurrentActivity(null,{mode:'legacy'});
    return {status:'rolled_back',mode:'legacy',cutover:false,legacy_data_untouched:true};
  }

  globalThis.OUTBASE_MIGRATIONS_V160=Object.freeze({MIGRATION_ID,run,status,rollback,verify});
})();
