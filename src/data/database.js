(() => {
  'use strict';

  /*
   * FIELD03 protection:
   * The legacy app opens `outbase_db` explicitly at version 10. Upgrading that
   * database first would make the legacy open fail with VersionError. v160
   * therefore starts in a separate shadow database and never mutates legacy.
   */
  const DB_NAME='outbase_story_db';
  const DB_VERSION=1;

  const commonIndexes=[
    ['household_id','household_id'],
    ['updated_at','updated_at'],
    ['created_by','created_by'],
    ['deleted_at','deleted_at']
  ];
  const withCommon=(extra=[])=>({indexes:[...commonIndexes,...extra]});

  const DEFINITIONS={
    app_meta:{indexes:[['updated_at','updated_at']]},
    households:withCommon(),
    accounts:withCommon(),
    members:withCommon([['account_id','account_id'],['legacy_ref','legacy_ref']]),
    pets:withCommon([['legacy_ref','legacy_ref']]),
    activities:withCommon([
      ['state','state'],['type','type'],['start_at','start_at'],['visibility','visibility'],
      ['primary_place_id','primary_place_id'],['legacy_ref','legacy_ref']
    ]),
    activity_participants:withCommon([
      ['activity_id','activity_id'],['participant_id','participant_id'],['participant_type','participant_type'],['legacy_ref','legacy_ref']
    ]),
    activity_transitions:withCommon([
      ['activity_id','activity_id'],['at','at'],['to_state','to_state'],['actor_id','actor_id'],['legacy_ref','legacy_ref']
    ]),
    calendar_entries:withCommon([
      ['activity_id','activity_id'],['start_at','start_at'],['legacy_ref','legacy_ref']
    ]),
    preparation_items:withCommon([
      ['activity_id','activity_id'],['category','category'],['status','status'],['due_at','due_at'],['legacy_ref','legacy_ref']
    ]),
    records:withCommon([
      ['activity_id','activity_id'],['type','type'],['occurred_at','occurred_at'],['actor_id','actor_id'],
      ['visibility','visibility'],['place_id','place_id'],['legacy_ref','legacy_ref']
    ]),
    media:withCommon([
      ['record_id','record_id'],['activity_id','activity_id'],['media_type','media_type'],['legacy_ref','legacy_ref']
    ]),
    gps_chunks:withCommon([
      ['activity_id','activity_id'],['chunk_no','chunk_no'],['started_at','started_at'],['legacy_ref','legacy_ref']
    ]),
    places:withCommon([['type','type'],['name','name'],['legacy_ref','legacy_ref']]),
    routes:withCommon([['activity_id','activity_id'],['legacy_ref','legacy_ref']]),
    route_points:withCommon([['route_id','route_id'],['seq','seq'],['place_id','place_id'],['legacy_ref','legacy_ref']]),
    assets:withCommon([['asset_type','asset_type'],['status','status'],['legacy_ref','legacy_ref']]),
    activity_assets:withCommon([['activity_id','activity_id'],['asset_id','asset_id'],['legacy_ref','legacy_ref']]),
    meals:withCommon([['activity_id','activity_id'],['legacy_ref','legacy_ref']]),
    meal_items:withCommon([['meal_id','meal_id'],['legacy_ref','legacy_ref']]),
    shopping_lists:withCommon([['activity_id','activity_id'],['legacy_ref','legacy_ref']]),
    shopping_items:withCommon([['activity_id','activity_id'],['shopping_list_id','shopping_list_id'],['status','status'],['legacy_ref','legacy_ref']]),
    reviews:withCommon([['activity_id','activity_id'],['legacy_ref','legacy_ref']]),
    improvement_items:withCommon([['activity_id','activity_id'],['status','status'],['legacy_ref','legacy_ref']]),
    visibility_rules:withCommon([['entity_type','entity_type'],['entity_id','entity_id'],['visibility','visibility'],['legacy_ref','legacy_ref']]),
    sync_operations:withCommon([['status','status'],['created_at','created_at'],['entity_type','entity_type'],['operation_id','operation_id']]),
    change_history:withCommon([['entity_id','entity_id'],['at','at'],['actor_id','actor_id']]),
    migration_snapshots:{indexes:[['migration_id','migration_id'],['status','status'],['created_at','created_at'],['source_fingerprint','source_fingerprint']]}
  };

  let dbPromise=null;

  function requestResult(request){
    return new Promise((resolve,reject)=>{
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||new Error('IndexedDB request failed'));
    });
  }

  function open(){
    if(dbPromise)return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      if(!('indexedDB' in globalThis)){
        reject(new Error('IndexedDB is unavailable'));
        return;
      }
      const request=indexedDB.open(DB_NAME,DB_VERSION);
      request.onupgradeneeded=()=>{
        const db=request.result;
        for(const [storeName,definition] of Object.entries(DEFINITIONS)){
          const store=db.objectStoreNames.contains(storeName)
            ? request.transaction.objectStore(storeName)
            : db.createObjectStore(storeName,{keyPath:'id'});
          for(const [indexName,keyPath,options={}] of definition.indexes||[]){
            if(!store.indexNames.contains(indexName))store.createIndex(indexName,keyPath,options);
          }
        }
      };
      request.onsuccess=()=>{
        const db=request.result;
        db.onversionchange=()=>{db.close();dbPromise=null;};
        resolve(db);
      };
      request.onerror=()=>{dbPromise=null;reject(request.error||new Error('Unable to open OUTBASE story database'));};
      request.onblocked=()=>console.warn('[OUTBASE v160] Story database upgrade is blocked by another tab.');
    });
    return dbPromise;
  }

  async function transaction(storeNames,mode,worker){
    const db=await open();
    const names=Array.isArray(storeNames)?storeNames:[storeNames];
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(names,mode);
      let result;
      try{result=worker(tx,names.length===1?tx.objectStore(names[0]):null);}catch(error){tx.abort();reject(error);return;}
      tx.oncomplete=()=>resolve(result);
      tx.onerror=()=>reject(tx.error||new Error('IndexedDB transaction failed'));
      tx.onabort=()=>reject(tx.error||new Error('IndexedDB transaction aborted'));
    });
  }

  async function get(storeName,id){
    const db=await open();
    return requestResult(db.transaction(storeName,'readonly').objectStore(storeName).get(id));
  }

  async function getAll(storeName){
    const db=await open();
    return requestResult(db.transaction(storeName,'readonly').objectStore(storeName).getAll());
  }

  async function count(storeName){
    const db=await open();
    return requestResult(db.transaction(storeName,'readonly').objectStore(storeName).count());
  }

  async function getAllByIndex(storeName,indexName,value){
    const db=await open();
    const index=db.transaction(storeName,'readonly').objectStore(storeName).index(indexName);
    return requestResult(index.getAll(value));
  }

  async function put(storeName,value){
    const db=await open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(storeName,'readwrite');
      let key;
      const request=tx.objectStore(storeName).put(value);
      request.onsuccess=()=>{key=request.result;};
      request.onerror=()=>reject(request.error||new Error(`Unable to write ${storeName}`));
      tx.oncomplete=()=>resolve(key);
      tx.onerror=()=>reject(tx.error||new Error(`Unable to commit ${storeName}`));
      tx.onabort=()=>reject(tx.error||new Error(`Write aborted for ${storeName}`));
    });
  }

  async function bulkPut(storeName,values){
    if(!Array.isArray(values)||values.length===0)return 0;
    const db=await open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(storeName,'readwrite');
      const store=tx.objectStore(storeName);
      for(const value of values)store.put(value);
      tx.oncomplete=()=>resolve(values.length);
      tx.onerror=()=>reject(tx.error||new Error(`Unable to write ${storeName}`));
      tx.onabort=()=>reject(tx.error||new Error(`Write aborted for ${storeName}`));
    });
  }

  async function page(storeName,{indexName=null,query=null,direction='next',limit=50}={}){
    const safeLimit=Math.max(1,Math.min(500,Number(limit)||50));
    const db=await open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(storeName,'readonly');
      const source=indexName?tx.objectStore(storeName).index(indexName):tx.objectStore(storeName);
      const rows=[];
      const request=source.openCursor(query,direction);
      request.onsuccess=()=>{
        const cursor=request.result;
        if(!cursor||rows.length>=safeLimit){resolve(rows);return;}
        rows.push(cursor.value);
        cursor.continue();
      };
      request.onerror=()=>reject(request.error||new Error(`Unable to page ${storeName}`));
    });
  }

  async function schemaReport(){
    const db=await open();
    const stores={};
    for(const storeName of Array.from(db.objectStoreNames))stores[storeName]=await count(storeName);
    return {name:db.name,version:db.version,stores};
  }

  globalThis.OUTBASE_DB_V160=Object.freeze({
    DB_NAME,DB_VERSION,DEFINITIONS,open,transaction,get,getAll,count,getAllByIndex,put,bulkPut,page,schemaReport
  });
})();
