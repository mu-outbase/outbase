(() => {
  'use strict';

  const LEGACY_DB_NAME='outbase_db';
  const PREFIX='outbase_';
  const ALLOWED_KEYS=new Set([
    'outbase_record_saved_records',
    'outbase_plans_v1','outbase_plan_library_v1','outbase_plan_list_v1',
    'outbase_core_v1_activities','outbase_core_v1_meta',
    'outbase_pet_library_v1','outbase_gear_library_v1','outbase_plan_companions_v2',
    'outbase_record_track_points','outbase_record_saved_pins',
    'outbase_record_recoverable_session','outbase_activity_recovery_v1',
    'outbase_core_activity_id','outbase_primary_activity_id_v2',
    'outbase_active_plan_id','outbase_record_session_id','outbase_record_session_state',
    'outbase_record_target','outbase_record_session_started_at'
  ]);
  const ALLOWED_STORES=new Set(['fieldRecords']);

  function assertAllowedKey(key){
    if(!ALLOWED_KEYS.has(key)){
      const error=new Error(`Legacy key is not allowlisted: ${key}`);
      error.name='LegacyAdapterError';
      error.code='legacy_key_not_allowlisted';
      error.detail={key};
      throw error;
    }
    return key;
  }

  function assertAllowedStore(storeName){
    if(!ALLOWED_STORES.has(storeName)){
      const error=new Error(`Legacy store is not allowlisted: ${storeName}`);
      error.name='LegacyAdapterError';
      error.code='legacy_store_not_allowlisted';
      error.detail={storeName};
      throw error;
    }
    return storeName;
  }

  const readJson=(key,fallback)=>{
    assertAllowedKey(key);
    try{
      const value=JSON.parse(localStorage.getItem(key)||'null');
      return value??fallback;
    }catch(_error){return fallback;}
  };

  function localStorageSnapshot(){
    const values={};
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(key&&ALLOWED_KEYS.has(key))values[key]=localStorage.getItem(key);
    }
    return values;
  }

  function openLegacyDb(){
    if(!('indexedDB' in globalThis))return Promise.resolve(null);
    const accessor=globalThis.OUTBASE_DB_ACCESSOR_V1;
    if(!accessor)return Promise.reject(new Error('OUTBASE outbase_db accessor is unavailable.'));
    return accessor.openExisting({
      requiredStores:[],
      source:'legacy-read-only-adapter'
    });
  }

  async function readLegacyStore(storeName){
    assertAllowedStore(storeName);
    const db=await openLegacyDb();
    if(!db||!db.objectStoreNames.contains(storeName)){db?.close();return [];}
    const rows=await new Promise((resolve,reject)=>{
      const tx=db.transaction(storeName,'readonly');
      const request=tx.objectStore(storeName).getAll();
      request.onsuccess=()=>resolve(request.result||[]);
      request.onerror=()=>reject(request.error||new Error(`Unable to read legacy store ${storeName}`));
    });
    db.close();
    return rows;
  }

  async function legacyDbReport(){
    const db=await openLegacyDb();
    if(!db)return {name:LEGACY_DB_NAME,version:null,stores:{}};
    const stores={};
    for(const storeName of Array.from(db.objectStoreNames).filter(name=>ALLOWED_STORES.has(name))){
      stores[storeName]=await new Promise((resolve,reject)=>{
        const tx=db.transaction(storeName,'readonly');
        const request=tx.objectStore(storeName).count();
        request.onsuccess=()=>resolve(request.result||0);
        request.onerror=()=>reject(request.error);
      });
    }
    const report={name:db.name,version:db.version,stores};
    db.close();
    return report;
  }

  function mergeById(lists){
    const map=new Map();
    for(const list of lists){
      for(const item of Array.isArray(list)?list:[]){
        const id=String(item?.id||item?.recordId||'').trim();
        if(!id)continue;
        const isBlob=typeof Blob!=='undefined'&&item?.blob instanceof Blob;
        const blob=isBlob?item.blob:null;
        const clean={...item};
        delete clean.blob;
        const prior=map.get(id)||{};
        map.set(id,{
          ...prior,...clean,id,
          hasBlob:Boolean(blob)||Boolean(prior.hasBlob),
          blobType:blob?.type||prior.blobType||'',
          blobSize:blob?.size||prior.blobSize||0
        });
      }
    }
    return [...map.values()];
  }

  async function records(){
    const local=readJson('outbase_record_saved_records',[]);
    const indexed=await readLegacyStore('fieldRecords');
    return mergeById([local,indexed]);
  }

  function plans(){
    return mergeById([
      readJson('outbase_plans_v1',[]),
      readJson('outbase_plan_library_v1',[]),
      readJson('outbase_plan_list_v1',[])
    ]);
  }

  function coreActivities(){return readJson('outbase_core_v1_activities',[]);}
  function pets(){return readJson('outbase_pet_library_v1',[]);}
  function gear(){return readJson('outbase_gear_library_v1',[]);}
  function companions(){return readJson('outbase_plan_companions_v2',[]);}
  function trackPoints(){return readJson('outbase_record_track_points',[]);}
  function savedPins(){return readJson('outbase_record_saved_pins',[]);}
  function recoverableSession(){return readJson('outbase_record_recoverable_session',null)||readJson('outbase_activity_recovery_v1',null);}

  function currentRuntime(){
    return {
      current_activity_id:localStorage.getItem('outbase_core_activity_id')||localStorage.getItem('outbase_primary_activity_id_v2')||readJson('outbase_core_v1_meta',{}).primaryActivityId||null,
      current_plan_id:localStorage.getItem('outbase_active_plan_id')||null,
      session_id:localStorage.getItem('outbase_record_session_id')||null,
      session_state:localStorage.getItem('outbase_record_session_state')||'idle',
      record_target:localStorage.getItem('outbase_record_target')||null,
      session_started_at:Number(localStorage.getItem('outbase_record_session_started_at')||0)||null
    };
  }

  async function sha256(value){
    const text=typeof value==='string'?value:JSON.stringify(value);
    if(!globalThis.crypto?.subtle)return `fallback-${text.length}`;
    const bytes=new TextEncoder().encode(text);
    const digest=await crypto.subtle.digest('SHA-256',bytes);
    return [...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join('');
  }

  function stableRecordSignature(row){
    return {
      id:row.id,kind:row.kind||'',createdAt:row.createdAt||0,sessionId:row.sessionId||'',target:row.target||'',
      type:row.type||row.blobType||'',size:Number(row.size||row.blobSize||0),hasBlob:Boolean(row.hasBlob),
      text:row.text||'',location:row.location||null,linkedPinId:row.linkedPinId||null
    };
  }

  async function snapshot(){
    const [recordRows,dbReport]=await Promise.all([records(),legacyDbReport()]);
    const planRows=plans();
    const activityRows=coreActivities();
    const storage=localStorageSnapshot();
    const identity={
      localStorage:Object.entries(storage).sort(([a],[b])=>a.localeCompare(b)),
      records:recordRows.map(stableRecordSignature).sort((a,b)=>String(a.id).localeCompare(String(b.id))),
      plans:planRows,
      activities:activityRows,
      legacyDb:dbReport
    };
    return {
      captured_at:new Date().toISOString(),
      local_storage:storage,
      local_storage_key_count:Object.keys(storage).length,
      legacy_db:dbReport,
      counts:{
        records:recordRows.length,plans:planRows.length,activities:activityRows.length,
        pets:pets().length,gear:gear().length,track_points:trackPoints().length,pins:savedPins().length
      },
      fingerprint:await sha256(identity)
    };
  }

  async function getRecordBlob(recordId){
    const db=await openLegacyDb();
    if(!db||!db.objectStoreNames.contains('fieldRecords')){db?.close();return null;}
    const row=await new Promise((resolve,reject)=>{
      const tx=db.transaction('fieldRecords','readonly');
      const request=tx.objectStore('fieldRecords').get(recordId);
      request.onsuccess=()=>resolve(request.result||null);
      request.onerror=()=>reject(request.error);
    });
    db.close();
    return typeof Blob!=='undefined'&&row?.blob instanceof Blob?row.blob:null;
  }

  globalThis.OUTBASE_LEGACY_ADAPTER_V160=Object.freeze({
    LEGACY_DB_NAME,PREFIX,
    ALLOWED_KEYS:Object.freeze([...ALLOWED_KEYS]),ALLOWED_STORES:Object.freeze([...ALLOWED_STORES]),
    assertAllowedKey,assertAllowedStore,readJson,localStorageSnapshot,openLegacyDb,readLegacyStore,legacyDbReport,
    records,plans,coreActivities,pets,gear,companions,trackPoints,savedPins,recoverableSession,
    currentRuntime,snapshot,getRecordBlob
  });
})();
