(() => {
  'use strict';
  let session=null,lifecycle=0;
  const notices=new Map(),busy=new Set();
  const repo=()=>globalThis.OUTBASE_REPOSITORIES_V160;
  function point(position){
    const p={latitude:position?.coords?.latitude,longitude:position?.coords?.longitude,accuracy:position?.coords?.accuracy,captured_at:position?.timestamp};
    if(!Object.values(p).every(Number.isFinite)||Math.abs(p.latitude)>90||Math.abs(p.longitude)>180||p.accuracy<0||p.accuracy>100||Date.now()-p.captured_at>60000||p.captured_at>Date.now()+5000)throw Error('location_invalid');
    return p;
  }
  function distance(a,b){
    const rad=n=>n*Math.PI/180,dlat=rad(b.latitude-a.latitude),dlon=rad(b.longitude-a.longitude);
    const h=Math.sin(dlat/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(dlon/2)**2;
    return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
  }
  function accepted(a,b){
    if(!a)return true;
    const dt=(b.captured_at-a.captured_at)/1000,d=distance(a,b);
    return dt>0&&d>=Math.max(5,(a.accuracy+b.accuracy)/2)&&d/dt<=70;
  }
  function valid(p){return p&&['latitude','longitude','accuracy','captured_at'].every(k=>Number.isFinite(p[k]))&&Math.abs(p.latitude)<=90&&Math.abs(p.longitude)<=180&&p.accuracy>=0&&p.accuracy<=100;}
  function summary(records=[]){
    const points=records.filter(r=>!r.deleted_at&&r.type==='gps_point').map(r=>r.payload).filter(p=>valid(p)&&p.tracking_session_id).sort((a,b)=>a.captured_at-b.captured_at);
    let meters=0;const last=new Map(),tracks=new Map();
    for(const p of points){const a=last.get(p.tracking_session_id);if(accepted(a,p)){if(a)meters+=distance(a,p);last.set(p.tracking_session_id,p);if(!tracks.has(p.tracking_session_id))tracks.set(p.tracking_session_id,[]);tracks.get(p.tracking_session_id).push(p);}}
    return {meters,tracks:[...tracks.values()],pins:records.filter(r=>!r.deleted_at&&r.type==='pin'&&valid(r.payload)&&['place','parking'].includes(r.payload?.pin_kind)).sort((a,b)=>b.payload.captured_at-a.payload.captured_at)};
  }
  async function save(activityId,p,kind,segment,guard=()=>true){
    if(!guard())throw Error('location_cancelled');
    const activity=await repo().activities.get(activityId);
    if(!activity||activity.deleted_at)throw Error('location_activity_missing');
    if(!guard())throw Error('location_cancelled');
    const row=repo().records.normalize({id:globalThis.OUTBASE_IDS.ulid(),activity_id:activityId,household_id:activity.household_id,type:kind==='track'?'gps_point':'pin',occurred_at:new Date(p.captured_at).toISOString(),visibility:'private',source:'execution-location-v1',payload:{...p,...(kind==='track'?{tracking_session_id:segment}:{pin_kind:kind})}});
    globalThis.OUTBASE_VALIDATION.assertEntity('records',row);
    let failure;
    try{await globalThis.OUTBASE_DB_V160.transaction(['activities','records'],'readwrite',tx=>{
      const request=tx.objectStore('activities').get(activityId);
      request.onsuccess=()=>{try{
        if(!guard())throw Error('location_cancelled');
        if(!request.result||request.result.deleted_at)throw Error('location_activity_missing');
        if(kind==='track'&&request.result.state!=='active')throw Error('location_not_active');
        tx.objectStore('records').put(row);
      }catch(error){failure=error;tx.abort();}};
    });}catch(error){throw failure||error;}
    return row;
  }
  function emit(id){globalThis.dispatchEvent(new CustomEvent('outbase:location-change',{detail:{activityId:id}}));}
  function stop(message='GPS記録を停止しました。'){
    const old=session;if(!old)return;
    session=null;old.closed=true;
    if(old.watch!==undefined)navigator.geolocation?.clearWatch(old.watch);
    notices.set(old.id,message);emit(old.id);
  }
  function message(error){return error?.code===1?'位置情報の利用が許可されていません。':error?.message==='location_invalid'?'位置情報の精度や時刻を確認できません。屋外で再度お試しください。':'位置情報を取得・保存できませんでした。端末の空き容量や権限を確認してください。';}
  async function start(id){
    if(session)return;
    const s={id,closed:false,segment:globalThis.OUTBASE_IDS.ulid(),queue:Promise.resolve(),last:null};session=s;
    try{
      const activity=await repo().activities.get(id);
      if(session!==s)return;
      if(!activity||activity.deleted_at||activity.state!=='active')throw Error('location_not_active');
      if(!navigator.geolocation)throw Error('location_unavailable');
      const watch=navigator.geolocation.watchPosition(position=>{
        if(session!==s)return;
        s.queue=s.queue.then(async()=>{
          if(session!==s)return;
          let p;try{p=point(position);}catch(error){notices.set(id,message(error));emit(id);return;}
          if(!accepted(s.last,p))return;
          await save(id,p,'track',s.segment,()=>session===s);
          if(session===s){s.last=p;notices.set(id,'GPS記録中（画面を開いている間のみ）');}emit(id);
        }).catch(error=>{if(session===s)stop(message(error));});
      },error=>{if(session===s)stop(message(error));},{enableHighAccuracy:true,maximumAge:0,timeout:15000});
      s.watch=watch;
      if(session!==s)navigator.geolocation.clearWatch(watch);
      else{notices.set(id,'GPS記録中（画面を開いている間のみ）');emit(id);}
    }catch(error){if(session===s)stop(error.message==='location_not_active'?'活動を開始してからGPS記録を開始してください。':message(error));}
  }
  async function pin(id,kind){
    if(busy.has(id))return;
    if(!['place','parking'].includes(kind))throw Error('location_kind_invalid');
    busy.add(id);notices.set(id,'現在地を取得しています。');emit(id);
    const generation=lifecycle;
    const current=()=>{const r=globalThis.OUTBASE_ROUTER?.current?.();return lifecycle===generation&&r?.name==='record'&&r.activityId===id&&!document.hidden;};
    try{
      if(!navigator.geolocation)throw Error('location_unavailable');
      const position=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,maximumAge:0,timeout:15000}));
      await save(id,point(position),kind,null,current);
      notices.set(id,kind==='parking'?'駐車位置を端末に保存しました。':'場所ピンを端末に保存しました。');
    }catch(error){notices.set(id,error.message==='location_cancelled'?'画面を離れたため場所の保存を中止しました。':message(error));}
    finally{busy.delete(id);emit(id);}
  }
  globalThis.addEventListener('pagehide',()=>{lifecycle++;stop('画面を離れたためGPS記録を停止しました。');});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){lifecycle++;stop('画面が非表示になったためGPS記録を停止しました。');}});
  globalThis.addEventListener('outbase:navigation',()=>{lifecycle++;const r=globalThis.OUTBASE_ROUTER?.current?.();if(session&&(r?.name!=='record'||r.activityId!==session.id))stop('画面を離れたためGPS記録を停止しました。');});
  globalThis.OUTBASE_LOCATION_RECORDER=Object.freeze({start,stop,pin,summary,distance,point,accepted,snapshot:id=>({tracking:session?.id===id,busy:busy.has(id),notice:notices.get(id)||''})});
})();
