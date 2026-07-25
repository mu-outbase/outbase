(() => {
  'use strict';

  const output=document.getElementById('result');
  const results=[];
  const testDatabases=[
    'outbase_r1_gate1_test_new',
    'outbase_r1_gate1_test_v10',
    'outbase_r1_gate1_test_v11'
  ];

  function assert(condition,message){
    if(!condition)throw new Error(message);
  }

  function requestResult(request){
    return new Promise((resolve,reject)=>{
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
  }

  function transactionComplete(tx){
    return new Promise((resolve,reject)=>{
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error);
      tx.onabort=()=>reject(tx.error);
    });
  }

  async function deleteDatabase(name){
    await new Promise((resolve,reject)=>{
      const request=indexedDB.deleteDatabase(name);
      request.onsuccess=()=>resolve();
      request.onerror=()=>reject(request.error);
      request.onblocked=()=>reject(new Error(`delete blocked: ${name}`));
    });
  }

  async function createFixture(name,version,storeName,keyPath,row){
    const request=indexedDB.open(name,version);
    request.onupgradeneeded=()=>{
      request.result.createObjectStore(storeName,{keyPath});
    };
    const db=await requestResult(request);
    const tx=db.transaction(storeName,'readwrite');
    tx.objectStore(storeName).put(row);
    await transactionComplete(tx);
    db.close();
  }

  async function row(db,storeName,key){
    const tx=db.transaction(storeName,'readonly');
    return requestResult(tx.objectStore(storeName).get(key));
  }

  async function test(name,callback){
    try{
      await callback();
      results.push({name,ok:true});
    }catch(error){
      results.push({name,ok:false,error:String(error?.stack||error)});
    }
  }

  async function parseScripts(paths){
    for(const path of paths){
      const response=await fetch(path,{cache:'no-store'});
      assert(response.ok,`missing script: ${path}`);
      const source=await response.text();
      new Function(source);
    }
  }

  async function run(){
    for(const name of testDatabases)await deleteDatabase(name);

    await test('changed JavaScript parses',()=>parseScripts([
      '../src/storage/persistence-guard.js',
      '../src/storage/outbase-db-accessor.js',
      '../src/storage/non-destructive-export.js',
      '../src/data/safe-memo.js',
      '../src/data/bootstrap.js',
      '../src/data/migrations.js',
      '../src/domain/preparation/preparation-domain.js',
      '../src/context/activity-context-v18.js',
      '../src/shell/preparation-route-v17.js',
      '../src/shell/activity-route-v16.js',
      '../src/shell/execution-route-v19.js',
      '../src/shell/route-unification-v22.js',
      '../src/legacy/return-bridge-v18.js',
      '../src/outbase-import.js',
      '../src/app.js'
    ]));

    await test('new outbase_db gets both owned stores',async()=>{
      const accessor=OUTBASE_DB_ACCESSOR_V1.createForTest(testDatabases[0]);
      const db=await accessor.open({source:'new-case'});
      assert(db.version===12,'new database version must be 12');
      assert(db.objectStoreNames.contains('fieldRecords'),'fieldRecords missing');
      assert(db.objectStoreNames.contains('coreImportBlobs'),'coreImportBlobs missing');
      db.close();
    });

    await test('v10 fieldRecords survives additive upgrade',async()=>{
      const blob=new Blob(['legacy-photo'],{type:'image/jpeg'});
      await createFixture(testDatabases[1],10,'fieldRecords','id',{id:'field-v10',blob});
      const accessor=OUTBASE_DB_ACCESSOR_V1.createForTest(testDatabases[1]);
      const db=await accessor.open({source:'v10-case'});
      const saved=await row(db,'fieldRecords','field-v10');
      assert(db.version===12,'v10 database was not upgraded to owner version');
      assert(db.objectStoreNames.contains('coreImportBlobs'),'import store was not added');
      assert(saved?.id==='field-v10','fieldRecords row changed');
      assert(saved.blob instanceof Blob&&saved.blob.size===blob.size,'fieldRecords Blob changed');
      db.close();
    });

    await test('v11 import store survives additive upgrade',async()=>{
      const blob=new Blob(['legacy-import'],{type:'application/octet-stream'});
      await createFixture(testDatabases[2],11,'coreImportBlobs','blobId',{blobId:'import-v11',blob});
      const accessor=OUTBASE_DB_ACCESSOR_V1.createForTest(testDatabases[2]);
      const db=await accessor.open({source:'v11-case'});
      const saved=await row(db,'coreImportBlobs','import-v11');
      assert(db.version===12,'v11 database was not upgraded to owner version');
      assert(db.objectStoreNames.contains('fieldRecords'),'FIELD03 store was not added');
      assert(saved?.blobId==='import-v11','import row changed');
      assert(saved.blob instanceof Blob&&saved.blob.size===blob.size,'import Blob changed');
      db.close();
    });

    await test('old-version request is rejected by contract',async()=>{
      const accessor=OUTBASE_DB_ACCESSOR_V1.createForTest('outbase_r1_gate1_old_version_guard');
      let caught=null;
      try{await accessor.open({requestedVersion:10,source:'old-version-test'});}
      catch(error){caught=error;}
      assert(caught?.code==='outbase_db_version_regression','old version was not rejected');
    });

    await test('startup bootstrap does not invoke shadow migration',async()=>{
      let migrationCalls=0;
      globalThis.OUTBASE_DB_V160={open:async()=>({}),schemaReport:async()=>({})};
      globalThis.OUTBASE_MIGRATIONS_V160={
        run:async()=>{migrationCalls+=1;return {status:'unexpected'};},
        status:async()=>null,
        rollback:async()=>null
      };
      globalThis.OUTBASE_LEGACY_ADAPTER_V160={snapshot:async()=>({})};
      globalThis.OUTBASE_REPOSITORIES_V160={};
      const script=document.createElement('script');
      script.src='../src/data/bootstrap.js?test='+Date.now();
      await new Promise((resolve,reject)=>{
        script.onload=resolve;
        script.onerror=()=>reject(new Error('bootstrap load failed'));
        document.head.appendChild(script);
      });
      const detail=await OUTBASE_DATA_V160.ready;
      assert(migrationCalls===0,'shadow migration ran during startup');
      assert(detail.status==='disabled_by_default','disabled status was not returned');
    });

    await test('view paths contain no baseline auto-save call',async()=>{
      const preparation=await (await fetch('../src/shell/preparation-route-v17.js',{cache:'no-store'})).text();
      const unification=await (await fetch('../src/shell/route-unification-v22.js',{cache:'no-store'})).text();
      assert(!preparation.includes('setTimeout(()=>persistBaseline'),'preparation view still schedules baseline persistence');
      assert(!unification.includes('ensureBaseline?.(id)'),'route view still schedules baseline persistence');
    });

    await test('activity-less memo stays unclassified without activity creation',async()=>{
      let activityCreates=0;
      let savedRecord=null;
      const service=OUTBASE_SAFE_MEMO_V1.create({
        repositories:{
          activities:{save:async()=>{activityCreates+=1;}},
          records:{save:async value=>{savedRecord=value;return value;}},
          improvementItems:{save:async value=>value}
        },
        plans:{get:async()=>null},
        guard:OUTBASE_PERSISTENCE_GUARD_V1
      });
      const result=await service.save({body:'activity-less note'});
      assert(activityCreates===0,'synthetic activity was created');
      assert(result.unclassified===true,'memo was not marked unclassified');
      assert(savedRecord.activity_id===null,'activity_id must remain null');
      assert(savedRecord.payload.classification==='unclassified','classification missing');
    });

    await test('non-destructive export preserves counts, localStorage and Blobs',async()=>{
      const key='outbase_r1_gate1_export_test';
      localStorage.setItem(key,'unchanged');
      const before=localStorage.getItem(key);
      const result=await OUTBASE_STORAGE_EXPORT_V1.createArchive({
        includeCacheStorage:false,
        verifyUnchanged:true,
        databaseNames:testDatabases
      });
      assert(result.ok&&result.manifest.consistencyCheck.passed,'consistency check failed');
      assert(localStorage.getItem(key)===before,'localStorage changed');
      assert(result.json.includes(btoa('legacy-photo')),'Blob payload was not exported');
      assert(result.json.includes(btoa('legacy-import')),'import Blob payload was not exported');
      const v10=result.manifest.databases.find(item=>item.name===testDatabases[1]);
      const v11=result.manifest.databases.find(item=>item.name===testDatabases[2]);
      assert(v10?.stores.some(store=>store.name==='fieldRecords'&&store.count===1),'fieldRecords count mismatch');
      assert(v11?.stores.some(store=>store.name==='coreImportBlobs'&&store.count===1),'import count mismatch');
      localStorage.removeItem(key);
    });

    await test('HOME calendar and FIELD03 entry assets remain wired',async()=>{
      const index=await (await fetch('../index.html',{cache:'no-store'})).text();
      const manifest=await (await fetch('../src/config/module-manifest.js',{cache:'no-store'})).text();
      assert(index.includes("view','home")||index.includes("set('view','home')"),'HOME launch redirect missing');
      assert(manifest.includes('shell-renderer-direct-fix.js'),'v44 calendar shell integration missing');
      assert(manifest.includes("'src/app.js'"),'FIELD03 runtime missing');
      assert(manifest.includes("'src/outbase-import.js'"),'legacy import runtime missing');
    });

    for(const name of testDatabases)await deleteDatabase(name);
    const failed=results.filter(result=>!result.ok);
    output.textContent=JSON.stringify({ok:failed.length===0,total:results.length,failed:failed.length,results},null,2);
    document.title=failed.length?'FAIL: OUTBASE R1 storage safety':'PASS: OUTBASE R1 storage safety';
    globalThis.OUTBASE_R1_STORAGE_TEST_RESULT={ok:failed.length===0,results};
  }

  run().catch(error=>{
    output.textContent=String(error?.stack||error);
    document.title='FAIL: OUTBASE R1 storage safety';
    globalThis.OUTBASE_R1_STORAGE_TEST_RESULT={ok:false,fatal:String(error?.stack||error),results};
  });
})();
