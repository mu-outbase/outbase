(() => {
  'use strict';
  const CATEGORIES=Object.freeze({site:'区画サイト',kitchen:'炊事場',toilet:'トイレ',other:'その他'});
  const repo=()=>globalThis.OUTBASE_REPOSITORIES_V160;
  const isSession=r=>!r.deleted_at&&r.source==='camp-exploration-session-v1';
  const isObservation=r=>!r.deleted_at&&r.source==='camp-exploration-v1'&&!!r.payload?.camp_exploration_v1;
  const requireCamp=a=>{if(!a||a.deleted_at||a.type!=='camp')throw Error('exploration_camp_missing');return a;};
  const place=a=>String(a.metadata?.location||a.metadata?.placeName||a.metadata?.legacy_plan?.location||a.title||'').trim();
  async function load(activityId){
    const activity=requireCamp(await repo().activities.get(activityId));
    const rows=await repo().records.forActivity(activityId);
    const sessions=rows.filter(isSession).sort((a,b)=>String(b.occurred_at).localeCompare(String(a.occurred_at)));
    return {status:'ready',activity,place:place(activity),session:sessions.find(r=>r.payload?.state==='active')||null,sessions,observations:rows.filter(isObservation).sort((a,b)=>String(b.occurred_at).localeCompare(String(a.occurred_at)))};
  }
  async function transact(activityId,run,stores=['activities','records']){
    let result,failure;
    try{await globalThis.OUTBASE_DB_V160.transaction(stores,'readwrite',tx=>{
      const req=tx.objectStore('activities').get(activityId);req.onsuccess=()=>{try{const activity=requireCamp(req.result);run(tx,activity,v=>{result=v;},e=>{failure=e;tx.abort();});}catch(error){failure=error;tx.abort();}};
    });}catch(error){throw failure||error;}
    return result;
  }
  function put(tx,store,row){globalThis.OUTBASE_VALIDATION.assertEntity(store,row);tx.objectStore(store).put(row);}
  async function start(activityId,requestId){
    if(!globalThis.OUTBASE_IDS.isUlid(requestId))throw Error('exploration_request_invalid');
    return transact(activityId,(tx,a,done,fail)=>{
      const req=tx.objectStore('records').index('activity_id').getAll(activityId);req.onsuccess=()=>{try{
        const active=req.result.find(r=>isSession(r)&&r.payload?.state==='active');if(active){done(active);return;}
        const previous=tx.objectStore('records').get(requestId);previous.onsuccess=()=>{try{
          if(previous.result)throw Error('exploration_request_used');
          const row=repo().records.normalize({id:requestId,activity_id:activityId,household_id:a.household_id,type:'note',visibility:'private',source:'camp-exploration-session-v1',payload:{title:'場内探索',state:'active',camp_name:place(a),started_at:globalThis.OUTBASE_IDS.nowIso(),ended_at:null}});put(tx,'records',row);done(row);
        }catch(error){fail(error);}};
      }catch(error){fail(error);}};
    });
  }
  async function finish(activityId,sessionId){
    return transact(activityId,(tx,a,done,fail)=>{
      const req=tx.objectStore('records').get(sessionId);req.onsuccess=()=>{try{
        const r=req.result;if(!r||!isSession(r)||r.activity_id!==activityId)throw Error('exploration_session_missing');
        if(r.payload.state==='ended'){done(r);return;}
        const row=repo().records.normalize({...r,updated_at:globalThis.OUTBASE_IDS.nowIso(),payload:{...r.payload,state:'ended',ended_at:globalThis.OUTBASE_IDS.nowIso()}});put(tx,'records',row);done(row);
      }catch(error){fail(error);}};
    });
  }
  function validatePoint(p){
    if(!p)return null;
    if(!['latitude','longitude','accuracy','captured_at'].every(k=>Number.isFinite(p[k]))||Math.abs(p.latitude)>90||Math.abs(p.longitude)>180||p.accuracy<0||p.accuracy>100||Date.now()-p.captured_at>60000||p.captured_at>Date.now()+5000)throw Error('exploration_location_invalid');
    return {latitude:p.latitude,longitude:p.longitude,accuracy:p.accuracy,captured_at:p.captured_at};
  }
  async function save({activityId,displayActivityId,sessionId,requestId,category,siteNumber='',features='',position=null,file=null,guard=()=>true}){
    siteNumber=String(siteNumber).trim();features=String(features).trim();
    if(activityId!==displayActivityId||!globalThis.OUTBASE_IDS.isUlid(requestId)||!Object.hasOwn(CATEGORIES,category)||siteNumber.length>80||features.length>3000||(category==='site'&&!siteNumber))throw Error('exploration_invalid');
    const location=validatePoint(position);
    if(file){if(!(file instanceof Blob)||!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)||!file.size||file.size>20*1024*1024)throw Error('exploration_photo_invalid');try{const image=await createImageBitmap(file);image.close();}catch{throw Error('exploration_photo_invalid');}}
    const signature=JSON.stringify({sessionId,category,siteNumber,features,position:location,filename:file?.name||'',size:file?.size||0});
    return transact(activityId,(tx,a,done,fail)=>{
      const requests=[tx.objectStore('records').get(sessionId),tx.objectStore('records').get(requestId)];let loaded=0;
      for(const req of requests)req.onsuccess=()=>{if(++loaded!==2)return;try{
        if(!guard())throw Error('exploration_cancelled');
        const [session,prior]=requests.map(r=>r.result);
        if(!session||!isSession(session)||session.activity_id!==activityId)throw Error('exploration_session_missing');
        if(prior){if(!isObservation(prior)||prior.activity_id!==activityId||prior.payload.camp_exploration_v1.signature!==signature)throw Error('exploration_request_conflict');done(prior);return;}
        if(session.payload.state!=='active')throw Error('exploration_not_active');
        const row=repo().records.normalize({id:requestId,activity_id:activityId,household_id:a.household_id,type:'pin',visibility:'private',source:'camp-exploration-v1',payload:{title:category==='site'?`サイト ${siteNumber}`:CATEGORIES[category],note:features,pin_kind:'place',...location,camp_exploration_v1:{category,site_number:siteNumber,features,session_id:sessionId,camp_name:place(a),signature},...(file?{media_id:requestId}:{} )}});
        put(tx,'records',row);
        if(file){const media=repo().media.normalize({id:requestId,activity_id:activityId,household_id:a.household_id,record_id:requestId,media_type:'photo',blob:file,mime_type:file.type,size:file.size,filename:file.name||'場内探索の写真',local_ref:{database:'outbase_story_db',store:'media',key:requestId},source:'camp-exploration-v1'});put(tx,'media',media);}
        done(row);
      }catch(error){fail(error);}};
    },['activities','records','media']);
  }
  function calendarSource(eventId){
    const rows=JSON.parse(localStorage.getItem('outbase_calendar_complete_v3_events')||'[]');const row=Array.isArray(rows)?rows.find(r=>r.id===eventId&&!r.deleted_at):null;
    if(!row||row.calendarId!=='camp')throw Error('exploration_calendar_missing');return row;
  }
  async function loadCalendar(eventId){
    const found=(await repo().activities.all()).find(a=>!a.deleted_at&&a.source==='camp-exploration-context-v1'&&a.metadata?.calendar_event_id===eventId);
    if(found)return {...await load(found.id),nativeEventId:eventId,nativeMonth:found.metadata?.calendar_month||''};
    const event=calendarSource(eventId);return {status:'ready',activity:{id:'calendar-camp:'+eventId,title:event.title,type:'camp'},place:event.place||event.title,session:null,sessions:[],observations:[],nativeEventId:eventId,nativeMonth:String(event.start||'').slice(0,7)};
  }
  async function startCalendar(eventId,requestId){
    if(!globalThis.OUTBASE_IDS.isUlid(requestId))throw Error('exploration_request_invalid');const event=calendarSource(eventId);let result,failure;
    try{await globalThis.OUTBASE_DB_V160.transaction(['activities','records'],'readwrite',tx=>{
      const req=tx.objectStore('activities').getAll();req.onsuccess=()=>{try{
        const fresh=calendarSource(eventId);if(JSON.stringify(fresh)!==JSON.stringify(event))throw Error('exploration_calendar_changed');
        let activity=req.result.find(a=>!a.deleted_at&&a.source==='camp-exploration-context-v1'&&a.metadata?.calendar_event_id===eventId);
        if(!activity){activity=repo().activities.normalize({type:'camp',title:event.title,state:'planned',start_at:event.start,end_at:event.end,visibility:'private',source:'camp-exploration-context-v1',metadata:{location:event.place||event.title,calendar_event_id:eventId,calendar_month:String(event.start||'').slice(0,7)}});put(tx,'activities',activity);}
        const rows=tx.objectStore('records').index('activity_id').getAll(activity.id);rows.onsuccess=()=>{try{
          const active=rows.result.find(r=>isSession(r)&&r.payload?.state==='active');if(active){result=active;return;}
          const prior=tx.objectStore('records').get(requestId);prior.onsuccess=()=>{try{if(prior.result)throw Error('exploration_request_used');const row=repo().records.normalize({id:requestId,activity_id:activity.id,type:'note',visibility:'private',source:'camp-exploration-session-v1',payload:{title:'場内探索',state:'active',camp_name:place(activity),started_at:globalThis.OUTBASE_IDS.nowIso(),ended_at:null}});put(tx,'records',row);result=row;}catch(error){failure=error;tx.abort();}};
        }catch(error){failure=error;tx.abort();}};
      }catch(error){failure=error;tx.abort();}};
    });}catch(error){throw failure||error;}return result;
  }
  globalThis.OUTBASE_CAMP_EXPLORATION=Object.freeze({CATEGORIES,load,loadCalendar,startCalendar,start,finish,save,validatePoint});
})();
