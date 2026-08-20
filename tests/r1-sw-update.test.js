(() => {
  'use strict';

  const output=document.getElementById('result');
  const query=new URLSearchParams(location.search);
  const runId=query.get('runId')||'';
  const token=query.get('token')||'';
  const OLD_CACHE='outbase-field03-v16631-r3-route-cutover-fix-v222';
  const CURRENT_CACHE='outbase-r1-gate2-contract-boundary-v1';
  const OLD_VERSION='v166.31-r3-route-cutover-fix-v22.2';
  const CURRENT_VERSION='outbase-r1-gate2-contract-boundary-v1';
  const SW_URL='/service-worker.js?v=outbase-r3-route-cutover-fix-v222';
  const SENTINEL_KEY=`outbase_r1_sw_update_${runId}`;
  const events=[];
  const checks=[];
  const frameErrors=[];
  let frame=null;
  let registration=null;
  let initialDatabaseNames=[];
  const progressFailures=[];
  const ASYNC_TIMEOUT=15000;
  const CONTROL_TIMEOUT=10000;
  const PROGRESS_TIMEOUT=2000;
  const RUN_PHASE_TIMEOUT=210000;
  const CLEANUP_PHASE_TIMEOUT=45000;
  const RESULT_POST_TIMEOUT=10000;
  const PROGRESS_STAGES=Object.freeze([
    'page_loaded','js_started','identity_valid','fresh_storage_verified','metadata_received',
    'old_sw_register_called','old_sw_registered','old_sw_ready','old_controller','old_cache_verified',
    'old_home_ready','fixture_created','switching_source','update_called','updatefound',
    'controller_changed','current_sw_active','current_cache_verified','storage_verified',
    'cleanup_started','cleanup_completed','result_posting','result_posted','result_post_failed'
  ]);
  let phaseDeadlineAt=Number.POSITIVE_INFINITY;

  const commonIndexes=[
    ['household_id','household_id'],['updated_at','updated_at'],
    ['created_by','created_by'],['deleted_at','deleted_at']
  ];
  const withCommon=(extra=[])=>[...commonIndexes,...extra];
  const DATABASES=[
    {
      name:'outbase_db',version:12,stores:{
        fieldRecords:{keyPath:'id',indexes:[]},
        coreImportBlobs:{keyPath:'blobId',indexes:[]}
      }
    },
    {
      name:'outbase_story_db',version:2,stores:{
        app_meta:{keyPath:'id',indexes:[['updated_at','updated_at']]},
        households:{keyPath:'id',indexes:withCommon()},
        accounts:{keyPath:'id',indexes:withCommon()},
        members:{keyPath:'id',indexes:withCommon([['account_id','account_id'],['legacy_ref','legacy_ref']])},
        pets:{keyPath:'id',indexes:withCommon([['legacy_ref','legacy_ref']])},
        activities:{keyPath:'id',indexes:withCommon([
          ['state','state'],['type','type'],['subtype','subtype'],
          ['parent_activity_id','parent_activity_id'],['start_at','start_at'],
          ['visibility','visibility'],['primary_place_id','primary_place_id'],['legacy_ref','legacy_ref']
        ])},
        activity_participants:{keyPath:'id',indexes:withCommon([
          ['activity_id','activity_id'],['participant_id','participant_id'],
          ['participant_type','participant_type'],['legacy_ref','legacy_ref']
        ])},
        activity_transitions:{keyPath:'id',indexes:withCommon([
          ['activity_id','activity_id'],['at','at'],['to_state','to_state'],
          ['actor_id','actor_id'],['legacy_ref','legacy_ref']
        ])},
        calendar_entries:{keyPath:'id',indexes:withCommon([
          ['activity_id','activity_id'],['start_at','start_at'],['legacy_ref','legacy_ref']
        ])},
        preparation_items:{keyPath:'id',indexes:withCommon([
          ['activity_id','activity_id'],['category','category'],['status','status'],
          ['due_at','due_at'],['legacy_ref','legacy_ref']
        ])},
        records:{keyPath:'id',indexes:withCommon([
          ['activity_id','activity_id'],['type','type'],['occurred_at','occurred_at'],
          ['actor_id','actor_id'],['visibility','visibility'],['place_id','place_id'],['legacy_ref','legacy_ref']
        ])},
        media:{keyPath:'id',indexes:withCommon([
          ['record_id','record_id'],['activity_id','activity_id'],
          ['media_type','media_type'],['legacy_ref','legacy_ref']
        ])},
        gps_chunks:{keyPath:'id',indexes:withCommon([
          ['activity_id','activity_id'],['chunk_no','chunk_no'],
          ['started_at','started_at'],['legacy_ref','legacy_ref']
        ])},
        places:{keyPath:'id',indexes:withCommon([['type','type'],['name','name'],['legacy_ref','legacy_ref']])},
        routes:{keyPath:'id',indexes:withCommon([['activity_id','activity_id'],['legacy_ref','legacy_ref']])},
        route_points:{keyPath:'id',indexes:withCommon([
          ['route_id','route_id'],['seq','seq'],['place_id','place_id'],['legacy_ref','legacy_ref']
        ])},
        assets:{keyPath:'id',indexes:withCommon([
          ['asset_type','asset_type'],['status','status'],['legacy_ref','legacy_ref']
        ])},
        activity_assets:{keyPath:'id',indexes:withCommon([
          ['activity_id','activity_id'],['asset_id','asset_id'],['legacy_ref','legacy_ref']
        ])},
        meals:{keyPath:'id',indexes:withCommon([['activity_id','activity_id'],['legacy_ref','legacy_ref']])},
        meal_items:{keyPath:'id',indexes:withCommon([['meal_id','meal_id'],['legacy_ref','legacy_ref']])},
        shopping_lists:{keyPath:'id',indexes:withCommon([['activity_id','activity_id'],['legacy_ref','legacy_ref']])},
        shopping_items:{keyPath:'id',indexes:withCommon([
          ['activity_id','activity_id'],['shopping_list_id','shopping_list_id'],
          ['status','status'],['legacy_ref','legacy_ref']
        ])},
        reviews:{keyPath:'id',indexes:withCommon([['activity_id','activity_id'],['legacy_ref','legacy_ref']])},
        improvement_items:{keyPath:'id',indexes:withCommon([
          ['activity_id','activity_id'],['status','status'],['legacy_ref','legacy_ref']
        ])},
        visibility_rules:{keyPath:'id',indexes:withCommon([
          ['entity_type','entity_type'],['entity_id','entity_id'],
          ['visibility','visibility'],['legacy_ref','legacy_ref']
        ])},
        sync_operations:{keyPath:'id',indexes:withCommon([
          ['status','status'],['created_at','created_at'],
          ['entity_type','entity_type'],['operation_id','operation_id']
        ])},
        change_history:{keyPath:'id',indexes:withCommon([
          ['entity_id','entity_id'],['at','at'],['actor_id','actor_id']
        ])},
        migration_snapshots:{keyPath:'id',indexes:[
          ['migration_id','migration_id'],['status','status'],['created_at','created_at'],
          ['source_fingerprint','source_fingerprint']
        ]}
      }
    },
    {
      name:'outbase_calendar_db',version:1,stores:{
        calendars:{keyPath:'id',indexes:[['name','name'],['visible','visible']]},
        entries:{keyPath:'id',indexes:[
          ['start_at','start_at'],['calendar_id','calendar_id'],
          ['external_uid','external_uid'],['activity_id','activity_id']
        ]},
        todos:{keyPath:'id',indexes:[['due_at','due_at'],['completed','completed'],['calendar_id','calendar_id']]},
        imports:{keyPath:'id',indexes:[['created_at','created_at'],['source','source']]},
        widget_snapshots:{keyPath:'id',indexes:[['generated_at','generated_at']]}
      }
    }
  ];

  function record(type,detail={}){
    events.push({at:new Date().toISOString(),type,...detail});
  }

  function boundedTimeout(timeout,label){
    const remaining=Number.isFinite(phaseDeadlineAt)?phaseDeadlineAt-Date.now():timeout;
    if(remaining<=0)throw new Error(`${label}_phase_timeout`);
    return Math.max(1,Math.min(timeout,remaining));
  }

  function withTimeout(promise,timeout,label){
    const milliseconds=boundedTimeout(timeout,label);
    let timer=null;
    return Promise.race([
      Promise.resolve(promise),
      new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(`${label}_timeout_after_${milliseconds}ms`)),milliseconds);})
    ]).finally(()=>{if(timer!==null)clearTimeout(timer);});
  }

  async function fetchWithTimeout(resource,options={},timeout=ASYNC_TIMEOUT,label='fetch'){
    const controller=new AbortController();
    try{
      return await withTimeout(fetch(resource,{...options,signal:controller.signal}),timeout,label);
    }catch(error){
      controller.abort();
      throw error;
    }
  }

  async function progress(stage,detail=null){
    const timestamp=new Date().toISOString();
    record('progress',{stage});
    if(!PROGRESS_STAGES.includes(stage)){
      progressFailures.push({stage,timestamp,error:'unknown_progress_stage'});
      return false;
    }
    try{
      await control('progress',{stage,timestamp,detail},{timeout:PROGRESS_TIMEOUT,label:`progress_${stage}`});
      return true;
    }catch(error){
      progressFailures.push({stage,timestamp,error:String(error?.message||error)});
      return false;
    }
  }

  function assert(condition,message,detail=null){
    checks.push({name:message,ok:Boolean(condition),detail});
    if(!condition)throw new Error(message);
  }

  function delay(milliseconds){
    return new Promise(resolve=>setTimeout(resolve,milliseconds));
  }

  async function waitFor(predicate,{timeout=90000,interval=200,label='condition'}={}){
    const started=Date.now();
    const effectiveTimeout=boundedTimeout(timeout,label);
    let lastError=null;
    while(Date.now()-started<effectiveTimeout){
      try{
        const value=await predicate();
        if(value)return value;
      }catch(error){lastError=error;}
      await delay(interval);
    }
    throw new Error(`${label}_timeout${lastError?`: ${lastError.message||lastError}`:''}`);
  }

  async function control(action,payload={},options={}){
    const timeout=options.timeout||CONTROL_TIMEOUT;
    const label=options.label||`control_${action}`;
    const response=await fetchWithTimeout(`/__r1_sw_update__/${action}`,{
      method:'POST',
      cache:'no-store',
      headers:{'content-type':'application/json','x-r1-sw-token':token},
      body:JSON.stringify({token,runId,...payload})
    },timeout,label);
    const text=await withTimeout(response.text(),timeout,`${label}_body`);
    if(!response.ok)throw new Error(`control_${action}_failed_${response.status}: ${text}`);
    return text?JSON.parse(text):{};
  }

  function requestResult(request,label='indexeddb_request'){
    return withTimeout(new Promise((resolve,reject)=>{
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||new Error('IndexedDB request failed'));
      request.onblocked=()=>reject(new Error(`${label}_blocked`));
    }),ASYNC_TIMEOUT,label);
  }

  function transactionDone(transaction,label='indexeddb_transaction'){
    return withTimeout(new Promise((resolve,reject)=>{
      transaction.oncomplete=()=>resolve();
      transaction.onerror=()=>reject(transaction.error||new Error('IndexedDB transaction failed'));
      transaction.onabort=()=>reject(transaction.error||new Error('IndexedDB transaction aborted'));
    }),ASYNC_TIMEOUT,label);
  }

  async function databaseNames(){
    if(typeof indexedDB.databases!=='function')throw new Error('indexedDB.databases is required');
    return (await withTimeout(indexedDB.databases(),ASYNC_TIMEOUT,'indexeddb_databases')).map(item=>item.name).filter(Boolean).sort();
  }

  async function openFixtureDatabase(definition){
    return withTimeout(new Promise((resolve,reject)=>{
      const request=indexedDB.open(definition.name,definition.version);
      request.onupgradeneeded=()=>{
        const database=request.result;
        for(const [storeName,storeDefinition] of Object.entries(definition.stores)){
          const store=database.objectStoreNames.contains(storeName)
            ?request.transaction.objectStore(storeName)
            :database.createObjectStore(storeName,{keyPath:storeDefinition.keyPath});
          for(const [indexName,keyPath,options={}] of storeDefinition.indexes){
            if(!store.indexNames.contains(indexName))store.createIndex(indexName,keyPath,options);
          }
        }
      };
      request.onsuccess=()=>{
        const database=request.result;
        const missing=Object.keys(definition.stores).filter(name=>!database.objectStoreNames.contains(name));
        if(missing.length){database.close();reject(new Error(`${definition.name}_missing_stores: ${missing.join(',')}`));return;}
        resolve(database);
      };
      request.onerror=()=>reject(request.error||new Error(`Unable to open ${definition.name}`));
      request.onblocked=()=>reject(new Error(`${definition.name}_upgrade_blocked`));
    }),ASYNC_TIMEOUT,`indexeddb_open_${definition.name}`);
  }

  function fixtureRows(){
    const iso='2026-08-03T00:00:00.000Z';
    const activityId=`${runId}-activity`;
    const recordId=`${runId}-record`;
    const binary=new Blob([new Uint8Array([0,1,2,3,4,5,250,255])],{type:'application/octet-stream'});
    return {
      outbase_db:{
        fieldRecords:[{
          id:`${runId}-field`,title:'SW update representative record',score:42,
          tags:['old','current','offline'],metadata:{nested:true,count:3},
          occurred_at:iso,captured_date:new Date(iso)
        }],
        coreImportBlobs:[{
          blobId:`${runId}-blob`,name:'representative.bin',size:binary.size,
          type:binary.type,blob:binary,createdAt:iso
        }]
      },
      outbase_story_db:{
        activities:[{
          id:activityId,type:'camp',subtype:'overnight',title:'SW update activity',
          state:'planned',start_at:iso,visibility:'private',created_at:iso,updated_at:iso,
          metadata:{number:17,array:['tent','water'],object:{protected:true},date:new Date(iso)}
        }],
        records:[{
          id:recordId,activity_id:activityId,type:'memo',occurred_at:iso,
          visibility:'private',payload:{body:'survives update',values:[1,2,3]},
          created_at:iso,updated_at:iso
        }],
        media:[{
          id:`${runId}-media`,record_id:recordId,activity_id:activityId,
          media_type:'application/octet-stream',blob:binary,created_at:iso,updated_at:iso
        }],
        preparation_items:[{
          id:`${runId}-prep`,activity_id:activityId,category:'gear',status:'pending',
          title:'Representative gear',quantity:2,due_at:iso,created_at:iso,updated_at:iso
        }]
      },
      outbase_calendar_db:{
        calendars:[{
          id:`${runId}-calendar`,name:'SW update calendar',visible:true,
          color:'#174d31',created_at:iso,updated_at:iso
        }],
        entries:[{
          id:`${runId}-entry`,calendar_id:`${runId}-calendar`,activity_id:activityId,
          title:'SW update entry',start_at:iso,end_at:'2026-08-03T01:00:00.000Z',
          all_day:false,created_at:iso,updated_at:iso
        }]
      }
    };
  }

  async function seedActualDatabases(){
    const rows=fixtureRows();
    for(const definition of DATABASES){
      const database=await openFixtureDatabase(definition);
      try{
        const storeRows=rows[definition.name];
        const storeNames=Object.keys(storeRows);
        const transaction=database.transaction(storeNames,'readwrite');
        for(const storeName of storeNames){
          const store=transaction.objectStore(storeName);
          for(const row of storeRows[storeName])store.put(row);
        }
        await transactionDone(transaction,`indexeddb_seed_${definition.name}`);
      }finally{database.close();}
    }
    return rows;
  }

  async function sha256Bytes(bytes){
    const digest=await withTimeout(crypto.subtle.digest('SHA-256',bytes),ASYNC_TIMEOUT,'sha256');
    return [...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join('');
  }

  async function encodeValue(value,seen=new WeakSet()){
    if(value===null||typeof value==='string'||typeof value==='boolean')return value;
    if(typeof value==='number')return Number.isFinite(value)?value:{type:'Number',value:String(value)};
    if(typeof value==='undefined')return {type:'Undefined'};
    if(typeof value==='bigint')return {type:'BigInt',value:String(value)};
    if(value instanceof Date)return {type:'Date',value:value.toISOString()};
    if(value instanceof Blob){
      const buffer=await withTimeout(value.arrayBuffer(),ASYNC_TIMEOUT,'blob_array_buffer');
      return {type:value instanceof File?'File':'Blob',mime:value.type,size:value.size,
        name:value instanceof File?value.name:null,sha256:await sha256Bytes(buffer)};
    }
    if(value instanceof ArrayBuffer)return {type:'ArrayBuffer',byteLength:value.byteLength,sha256:await sha256Bytes(value)};
    if(ArrayBuffer.isView(value)){
      const bytes=value.buffer.slice(value.byteOffset,value.byteOffset+value.byteLength);
      return {type:value.constructor.name,byteLength:value.byteLength,sha256:await sha256Bytes(bytes)};
    }
    if(typeof value!=='object')throw new Error(`unsupported_fixture_value_${typeof value}`);
    if(seen.has(value))throw new Error('circular_fixture_value');
    seen.add(value);
    try{
      if(Array.isArray(value))return Promise.all(value.map(item=>encodeValue(item,seen)));
      const result={};
      for(const key of Object.keys(value).sort())result[key]=await encodeValue(value[key],seen);
      return result;
    }finally{seen.delete(value);}
  }

  async function snapshotStore(store,transaction){
    const cloneKeyPath=value=>Array.isArray(value)?[...value]:value;
    const storeName=store.name;
    const metadata={
      name:storeName,keyPath:cloneKeyPath(store.keyPath),autoIncrement:store.autoIncrement,
      indexes:[...store.indexNames].sort().map(name=>{
        const index=store.index(name);
        return {name,keyPath:cloneKeyPath(index.keyPath),unique:index.unique,multiEntry:index.multiEntry};
      })
    };
    const raw=[];
    const transactionCompletion=transactionDone(transaction,`indexeddb_snapshot_transaction_${storeName}`);
    const cursorCompletion=withTimeout(new Promise((resolve,reject)=>{
      const request=store.openCursor();
      request.onsuccess=()=>{
        const cursor=request.result;
        if(!cursor){resolve();return;}
        raw.push({key:cursor.key,primaryKey:cursor.primaryKey,value:cursor.value});
        cursor.continue();
      };
      request.onerror=()=>reject(request.error||new Error(`Unable to read ${storeName}`));
    }),ASYNC_TIMEOUT,`indexeddb_cursor_${storeName}`);
    await Promise.all([cursorCompletion,transactionCompletion]);
    const rows=[];
    for(const row of raw){
      rows.push({
        key:await encodeValue(row.key),primaryKey:await encodeValue(row.primaryKey),
        value:await encodeValue(row.value)
      });
    }
    return {
      ...metadata,
      count:rows.length,rows
    };
  }

  async function snapshotDatabase(definition){
    const database=await requestResult(indexedDB.open(definition.name),`indexeddb_snapshot_open_${definition.name}`);
    try{
      const stores=[];
      for(const name of [...database.objectStoreNames].sort()){
        const transaction=database.transaction(name,'readonly');
        stores.push(await snapshotStore(transaction.objectStore(name),transaction));
      }
      return {name:database.name,version:database.version,stores};
    }finally{database.close();}
  }

  async function snapshotActualDatabases(){
    const snapshots=[];
    for(const definition of DATABASES)snapshots.push(await snapshotDatabase(definition));
    return snapshots;
  }

  async function hashResponse(response){
    if(!response.ok)throw new Error(`service_worker_fetch_${response.status}`);
    return sha256Bytes(await withTimeout(response.arrayBuffer(),ASYNC_TIMEOUT,'service_worker_response_body'));
  }

  async function cacheHas(cacheName,path){
    const cache=await withTimeout(caches.open(cacheName),ASYNC_TIMEOUT,`cache_open_${cacheName}`);
    return Boolean(await withTimeout(cache.match(new URL(path,location.origin).href),ASYNC_TIMEOUT,`cache_match_${cacheName}`));
  }

  function attachFrameErrorCapture(targetFrame){
    try{
      targetFrame.contentWindow.addEventListener('error',event=>{
        frameErrors.push({type:'error',message:event.message||String(event.error||'unknown')});
      });
      targetFrame.contentWindow.addEventListener('unhandledrejection',event=>{
        frameErrors.push({type:'unhandledrejection',message:String(event.reason||'unknown')});
      });
    }catch(error){frameErrors.push({type:'capture',message:String(error)});}
  }

  async function waitForHome(targetFrame,version){
    return waitFor(()=>{
      const windowRef=targetFrame.contentWindow;
      const documentRef=targetFrame.contentDocument;
      const bodyText=documentRef?.body?.innerText||'';
      return windowRef?.OUTBASE_VERSION?.app===version&&bodyText.includes('今後の予定');
    },{timeout:120000,label:`home_${version}`});
  }

  async function deleteDatabase(name){
    await withTimeout(new Promise((resolve,reject)=>{
      const request=indexedDB.deleteDatabase(name);
      request.onsuccess=()=>resolve();
      request.onerror=()=>reject(request.error||new Error(`delete_${name}_failed`));
      request.onblocked=()=>reject(new Error(`delete_${name}_blocked`));
    }),ASYNC_TIMEOUT,`indexeddb_delete_${name}`);
  }

  async function browserCleanup(){
    const failures=[];
    try{frame?.remove();frame=null;}catch(error){failures.push(`frame: ${error}`);}
    try{
      const registrations=await withTimeout(navigator.serviceWorker.getRegistrations(),ASYNC_TIMEOUT,'cleanup_get_registrations');
      for(const item of registrations){
        if(item.scope.startsWith(`${location.origin}/`)&&!await withTimeout(item.unregister(),ASYNC_TIMEOUT,'cleanup_unregister'))failures.push(`unregister: ${item.scope}`);
      }
    }catch(error){failures.push(`registrations: ${error}`);}
    try{
      for(const name of await withTimeout(caches.keys(),ASYNC_TIMEOUT,'cleanup_cache_keys')){
        if(!await withTimeout(caches.delete(name),ASYNC_TIMEOUT,`cleanup_cache_${name}`))failures.push(`cache: ${name}`);
      }
    }catch(error){failures.push(`caches: ${error}`);}
    for(const definition of DATABASES){
      try{await deleteDatabase(definition.name);}catch(error){failures.push(`database: ${error}`);}
    }
    try{localStorage.clear();sessionStorage.clear();}catch(error){failures.push(`storage: ${error}`);}
    await delay(200);
    let remaining={registrations:[],caches:[],databases:[]};
    try{
      remaining={
        registrations:(await withTimeout(navigator.serviceWorker.getRegistrations(),ASYNC_TIMEOUT,'cleanup_measure_registrations')).map(item=>item.scope),
        caches:await withTimeout(caches.keys(),ASYNC_TIMEOUT,'cleanup_measure_caches'),databases:await databaseNames()
      };
    }catch(error){failures.push(`cleanup_measurement: ${error}`);}
    const ok=failures.length===0&&remaining.registrations.length===0&&
      remaining.caches.length===0&&remaining.databases.length===0;
    return {ok,failures,remaining};
  }

  async function run(){
    if(!/^[a-zA-Z0-9-]{8,80}$/.test(runId)||!/^[a-f0-9]{64}$/.test(token)){
      throw new Error('invalid_runner_identity');
    }
    await progress('identity_valid');
    const initialRegistrations=await withTimeout(navigator.serviceWorker.getRegistrations(),ASYNC_TIMEOUT,'initial_registrations');
    const initialCaches=await withTimeout(caches.keys(),ASYNC_TIMEOUT,'initial_caches');
    initialDatabaseNames=await databaseNames();
    assert(initialRegistrations.length===0,'fresh profile has no Service Worker',initialRegistrations.length);
    assert(initialCaches.length===0,'fresh profile has no cache',initialCaches);
    assert(initialDatabaseNames.length===0,'fresh profile has no IndexedDB',initialDatabaseNames);
    assert(localStorage.length===0,'fresh profile has no localStorage',localStorage.length);
    assert(sessionStorage.length===0,'fresh profile has no sessionStorage',sessionStorage.length);
    await progress('fresh_storage_verified');

    const serverBefore=await control('metadata');
    await progress('metadata_received',{mode:serverBefore.mode});
    assert(serverBefore.mode==='old','server starts in old mode',serverBefore.mode);
    const oldNetworkHash=await hashResponse(await fetchWithTimeout(`${SW_URL}&probe=${runId}-old`,{cache:'no-store'},ASYNC_TIMEOUT,'old_service_worker_fetch'));
    assert(oldNetworkHash===serverBefore.oldServiceWorkerSha256,'old worker bytes match old source copy',oldNetworkHash);

    await progress('old_sw_register_called');
    registration=await withTimeout(navigator.serviceWorker.register(SW_URL,{scope:'/'}),30000,'old_sw_register');
    await progress('old_sw_registered');
    await withTimeout(navigator.serviceWorker.ready,45000,'old_sw_ready');
    await progress('old_sw_ready');
    await waitFor(()=>navigator.serviceWorker.controller,{timeout:30000,label:'old_controller'});
    await progress('old_controller');
    const oldWorker=registration.active;
    assert(oldWorker?.state==='activated','old Service Worker is active',oldWorker?.state);
    assert(oldWorker.scriptURL.includes('service-worker.js'),'old Service Worker script is registered',oldWorker.scriptURL);
    assert((await withTimeout(caches.keys(),ASYNC_TIMEOUT,'old_cache_keys')).includes(OLD_CACHE),'old cache exists',await withTimeout(caches.keys(),ASYNC_TIMEOUT,'old_cache_keys_detail'));
    assert(await cacheHas(OLD_CACHE,'/index.html'),'old cache contains index.html');
    await progress('old_cache_verified');

    frame=document.createElement('iframe');
    frame.hidden=true;
    frame.name=`r1-sw-update-${runId}`;
    let frameLoads=0;
    frame.addEventListener('load',()=>{frameLoads+=1;record('app-frame-load',{frameLoads});attachFrameErrorCapture(frame);});
    frame.src=`/index.html?shell=1&view=home&r1SwUpdate=${encodeURIComponent(runId)}`;
    document.body.appendChild(frame);
    await waitForHome(frame,OLD_VERSION);
    assert(frameLoads===1,'old HOME starts without a reload loop',frameLoads);
    await progress('old_home_ready',{frameLoads});

    await seedActualDatabases();
    localStorage.setItem(SENTINEL_KEY,JSON.stringify({runId,value:'preserve-me',number:73,array:[1,2,3]}));
    const localBefore=localStorage.getItem(SENTINEL_KEY);
    const databaseNamesBefore=await databaseNames();
    const databaseBefore=await snapshotActualDatabases();
    await progress('fixture_created',{databases:databaseNamesBefore});
    assert(databaseNamesBefore.join('|')===DATABASES.map(item=>item.name).sort().join('|'),
      'fixture uses the real OUTBASE database names',databaseNamesBefore);

    let controllerChanges=0;
    let updateFound=0;
    let updateWorker=null;
    const workerStates=[];
    const controllerPromise=new Promise(resolve=>{
      navigator.serviceWorker.addEventListener('controllerchange',()=>{
        controllerChanges+=1;
        record('controllerchange',{controllerChanges,controller:navigator.serviceWorker.controller?.scriptURL||null});
        void progress('controller_changed',{controllerChanges,controller:navigator.serviceWorker.controller?.scriptURL||null});
        resolve();
      });
    });
    registration.addEventListener('updatefound',()=>{
      updateFound+=1;
      updateWorker=registration.installing;
      record('updatefound',{updateFound,worker:updateWorker?.scriptURL||null});
      void progress('updatefound',{updateFound,worker:updateWorker?.scriptURL||null});
      if(updateWorker){
        workerStates.push(updateWorker.state);
        updateWorker.addEventListener('statechange',()=>{
          workerStates.push(updateWorker.state);
          record('worker-state',{state:updateWorker.state});
        });
      }
    });

    const frameLoadsBeforeUpdate=frameLoads;
    await progress('switching_source');
    const serverAfter=await control('switch-current');
    assert(serverAfter.mode==='current','server switched to current root',serverAfter.mode);
    const currentNetworkHash=await hashResponse(await fetchWithTimeout(`${SW_URL}&probe=${runId}-current`,{cache:'no-store'},ASYNC_TIMEOUT,'current_service_worker_fetch'));
    assert(currentNetworkHash===serverAfter.currentServiceWorkerSha256,
      'served current worker hash matches current source copy',currentNetworkHash);

    await progress('update_called');
    await withTimeout(registration.update(),45000,'registration_update');
    await Promise.race([
      controllerPromise,
      delay(60000).then(()=>{throw new Error('controllerchange_timeout');})
    ]);
    await delay(3000);
    await waitFor(()=>oldWorker.state==='redundant',{timeout:30000,label:'old_worker_redundant'});
    registration=await withTimeout(navigator.serviceWorker.getRegistration('/'),ASYNC_TIMEOUT,'current_get_registration');
    const registrationsAfter=await withTimeout(navigator.serviceWorker.getRegistrations(),ASYNC_TIMEOUT,'current_get_registrations');
    assert(updateFound===1,'updatefound occurs exactly once',updateFound);
    assert(workerStates.includes('installing')&&workerStates.includes('activated'),
      'installing worker state transition reaches activated',workerStates);
    assert(controllerChanges===1,'controllerchange occurs exactly once',controllerChanges);
    assert(oldWorker.state==='redundant','old worker becomes redundant',oldWorker.state);
    assert(registration?.active?.state==='activated','current worker is activated',registration?.active?.state);
    assert(registration?.installing===null,'installing is null after activation');
    assert(registration?.waiting===null,'waiting is null after activation');
    assert(registrationsAfter.length===1,'exactly one registration remains',registrationsAfter.length);
    await progress('current_sw_active',{state:registration?.active?.state,registrations:registrationsAfter.length});

    const cacheNamesAfter=await withTimeout(caches.keys(),ASYNC_TIMEOUT,'current_cache_keys');
    assert(cacheNamesAfter.includes(CURRENT_CACHE),'current cache exists',cacheNamesAfter);
    assert(!cacheNamesAfter.includes(OLD_CACHE),'old cache is removed',cacheNamesAfter);
    for(const asset of ['/index.html','/manifest.json?v=outbase-v1663-visual',
      '/src/storage/outbase-db-accessor.js?v=outbase-r1-gate2-contract-boundary-v1-storage',
      '/src/router.js?v=outbase-r1-gate2-contract-boundary-v1-router']){
      assert(await cacheHas(CURRENT_CACHE,asset),`current cache contains ${asset}`);
    }
    await progress('current_cache_verified',{cacheNames:cacheNamesAfter});

    await waitForHome(frame,CURRENT_VERSION);
    await delay(3000);
    const updateFrameLoads=frameLoads-frameLoadsBeforeUpdate;
    assert(updateFrameLoads===1,'application reloads exactly once during update',updateFrameLoads);
    assert(frameErrors.length===0,'HOME has no major JavaScript error',frameErrors);

    const databaseNamesAfter=await databaseNames();
    const databaseAfter=await snapshotActualDatabases();
    assert(JSON.stringify(databaseNamesAfter)===JSON.stringify(databaseNamesBefore),
      'database name list is preserved',{before:databaseNamesBefore,after:databaseNamesAfter});
    assert(JSON.stringify(databaseAfter)===JSON.stringify(databaseBefore),
      'database schema, keys, values and Blob hashes are preserved');
    assert(localStorage.getItem(SENTINEL_KEY)===localBefore,'localStorage sentinel is preserved');
    await progress('storage_verified',{databases:databaseNamesAfter});

    return {
      ok:true,runId,oldCache:OLD_CACHE,currentCache:CURRENT_CACHE,
      oldServiceWorkerSha256:serverBefore.oldServiceWorkerSha256,
      currentServiceWorkerSha256:serverAfter.currentServiceWorkerSha256,
      currentNetworkHash,controllerChanges,updateFound,workerStates,
      oldWorkerState:oldWorker.state,currentWorkerState:registration.active.state,
      registrations:registrationsAfter.length,cacheNamesAfter,
      frameLoadsBeforeUpdate,frameLoadsAfterUpdate:frameLoads,
      databaseNamesBefore,databaseNamesAfter,databaseBefore,databaseAfter,
      localStorageSentinelPreserved:true,frameErrors,events,checks
    };
  }

  function renderResult(finalResult){
    output.textContent=JSON.stringify(finalResult,null,2);
    document.title=`${finalResult.ok?'PASS':'FAIL'} - OUTBASE R1 Service Worker update test`;
    document.body.dataset.testStatus=finalResult.ok?'passed':'failed';
  }

  async function submitResult(finalResult){
    phaseDeadlineAt=Date.now()+15000;
    await progress('result_posting',{ok:finalResult.ok,fatal:Boolean(finalResult.fatal)});
    try{await control('result',{result:finalResult});}
    catch(error){
      finalResult.ok=false;
      finalResult.resultSubmissionError=String(error?.stack||error);
      await progress('result_post_failed',{error:finalResult.resultSubmissionError});
      renderResult(finalResult);
    }
    globalThis.OUTBASE_R1_SW_UPDATE_RESULT=Object.freeze(finalResult);
  }

  async function main(){
    let testResult=null;
    let testError=null;
    let cleanup={ok:false,failures:['cleanup_not_started'],remaining:null};
    await progress('page_loaded',{readyState:document.readyState});
    await progress('js_started');
    phaseDeadlineAt=Date.now()+RUN_PHASE_TIMEOUT;
    try{
      testResult=await run();
      if(Date.now()>=phaseDeadlineAt)throw new Error('browser_run_phase_timeout');
    }
    catch(error){testError=String(error?.stack||error);record('test-error',{error:testError});}

    phaseDeadlineAt=Date.now()+CLEANUP_PHASE_TIMEOUT;
    await progress('cleanup_started',{testError});
    try{cleanup=await browserCleanup();}
    catch(error){
      cleanup={ok:false,failures:[String(error?.stack||error)],remaining:null};
      record('cleanup-error',{error:cleanup.failures[0]});
    }
    await progress('cleanup_completed',{ok:cleanup.ok,failures:cleanup.failures});
    const finalResult={
      ok:Boolean(testResult?.ok)&&!testError&&cleanup.ok,
      runId,testResult,testError,cleanup,events,checks,
      progressObservation:{failures:progressFailures}
    };
    renderResult(finalResult);
    await submitResult(finalResult);
  }

  main().catch(async error=>{
    const result={
      ok:false,runId,fatal:String(error?.stack||error),events,checks,
      progressObservation:{failures:progressFailures}
    };
    record('fatal-error',{error:result.fatal});
    renderResult(result);
    try{await submitResult(result);}
    catch(submissionError){
      result.resultSubmissionError=String(submissionError?.stack||submissionError);
      renderResult(result);
      globalThis.OUTBASE_R1_SW_UPDATE_RESULT=Object.freeze(result);
    }
  });
})();
