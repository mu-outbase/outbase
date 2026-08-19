(() => {
  'use strict';

  const BASE_SHA='b4e8f304639026aa116bf9e6427431f3b5867e61';
  const STORY_DB='outbase_story_db';
  const output=document.getElementById('result');
  const results=[];
  const initialLocalStorage=new Map();
  const initialSessionStorage=new Map();

  function snapshotStorage(storage,target){
    for(let index=0;index<storage.length;index++){
      const key=storage.key(index);
      if(key!==null)target.set(key,storage.getItem(key));
    }
  }

  function restoreStorage(storage,snapshot){
    const current=[];
    for(let index=0;index<storage.length;index++)current.push(storage.key(index));
    current.filter(Boolean).forEach(key=>storage.removeItem(key));
    snapshot.forEach((value,key)=>storage.setItem(key,value));
  }

  function assert(condition,message){
    if(!condition)throw new Error(message);
  }

  function requestResult(request){
    return new Promise((resolve,reject)=>{
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||new Error('IndexedDB request failed'));
    });
  }

  async function deleteDatabase(name){
    await new Promise((resolve,reject)=>{
      const request=indexedDB.deleteDatabase(name);
      request.onsuccess=()=>resolve();
      request.onerror=()=>reject(request.error||new Error(`delete failed: ${name}`));
      request.onblocked=()=>reject(new Error(`delete blocked: ${name}`));
    });
  }

  async function databaseNames(){
    if(typeof indexedDB.databases!=='function')return [];
    return (await indexedDB.databases()).map(database=>database.name).filter(Boolean);
  }

  function waitForPop(){
    return new Promise(resolve=>{
      const unsubscribe=OUTBASE_ROUTER.subscribePop((event,route)=>{
        unsubscribe();
        resolve({event,route});
      });
      setTimeout(()=>{unsubscribe();resolve(null);},1500);
    });
  }

  async function source(path){
    const response=await fetch(path,{cache:'no-store'});
    assert(response.ok,`Unable to load ${path}`);
    return response.text();
  }

  async function test(number,name,callback){
    try{
      const detail=await callback();
      results.push({number,name,ok:true,detail:detail??null});
    }catch(error){
      results.push({number,name,ok:false,error:String(error?.stack||error)});
    }
  }

  async function run(){
    snapshotStorage(localStorage,initialLocalStorage);
    snapshotStorage(sessionStorage,initialSessionStorage);
    await OUTBASE_DB_V160.close();
    await deleteDatabase(STORY_DB);

    await test(19,'startup/display creates no business row',async()=>{
      const before=await databaseNames();
      const script=document.createElement('script');
      script.src=`../src/data/bootstrap.js?gate2=${Date.now()}`;
      await new Promise((resolve,reject)=>{
        script.onload=resolve;
        script.onerror=()=>reject(new Error('bootstrap load failed'));
        document.head.appendChild(script);
      });
      const ready=await OUTBASE_DATA_V160.ready;
      const after=await databaseNames();
      assert(ready.status==='disabled_by_default','startup migration is not disabled');
      assert(!after.includes(STORY_DB),'startup created Story DB');
      return {before,after,status:ready.status};
    });

    await test(20,'display path does not create Story DB',async()=>{
      const db=await OUTBASE_DB_V160.openExisting();
      const report=await OUTBASE_DB_V160.schemaReport();
      const names=await databaseNames();
      db?.close();
      assert(db===null,'openExisting returned a database for missing state');
      assert(report.exists===false,'missing Story DB was not reported as empty');
      assert(!names.includes(STORY_DB),'openExisting created Story DB');
      return report;
    });

    await test(1,'raw history ownership is router-only',async()=>{
      const files=[
        '../src/app.js','../src/outbase-navigation-guard.js','../src/state/app-state.js',
        '../src/shell/modal-stack.js','../src/shell/plan-switch-v18.js',
        '../src/shell/ui-system-v21.js','../src/design/theme-controller.js',
        '../src/outbase-activity.js','../src/outbase-flow.js','../src/outbase-entry.js'
      ];
      const violations=[];
      const texts=await Promise.all(files.map(file=>source(file)));
      files.forEach((file,index)=>{
        const text=texts[index];
        if(/(?<![.\w])history\.(?:pushState|replaceState|back|go)\s*\(/.test(text)||
          /addEventListener\s*\(\s*['"]popstate['"]/.test(text))violations.push(file);
      });
      assert(violations.length===0,`direct history owners: ${violations.join(', ')}`);
      return {owner:'src/router.js',checked:files.length};
    });

    await test(2,'push/replace/popstate contract',async()=>{
      const startLength=history.length;
      let popCount=0;
      const unsubscribe=OUTBASE_ROUTER.subscribePop(()=>{popCount+=1;});
      await OUTBASE_ROUTER.navigate('activity',{activityId:'01J00000000000000000000010'});
      const afterPush=history.length;
      await OUTBASE_ROUTER.navigate('preparation',{activityId:'01J00000000000000000000010'},{replace:true});
      const afterReplace=history.length;
      const pending=waitForPop();
      OUTBASE_ROUTER.history.back();
      await pending;
      unsubscribe();
      assert(popCount===1,'popstate was not dispatched exactly once');
      assert(afterReplace===afterPush,'replace consumed an extra history entry');
      return {startLength,afterPush,afterReplace,endLength:history.length,popCount};
    });

    await test(3,'modal/overlay closes with one Back',async()=>{
      OUTBASE_MODAL_STACK_V164.clear();
      OUTBASE_MODAL_STACK_V164.open('gate2-test');
      assert(OUTBASE_MODAL_STACK_V164.top()?.id==='gate2-test','modal did not open');
      const pending=waitForPop();
      OUTBASE_ROUTER.history.back();
      await pending;
      assert(OUTBASE_MODAL_STACK_V164.top()===null,'one Back did not close modal');
      return {remaining:OUTBASE_MODAL_STACK_V164.snapshot().length};
    });

    await test(4,'forward starts at top and Back carries saved scroll',async()=>{
      const spacer=document.createElement('div');
      spacer.style.height='2400px';
      document.body.appendChild(spacer);
      globalThis.scrollTo(0,240);
      assert(OUTBASE_ROUTER.viewportScrollY()===240,'test viewport did not reach saved position');
      await OUTBASE_ROUTER.navigate('activity',{activityId:'01J00000000000000000000010'});
      assert(OUTBASE_ROUTER.savedScrollY()===0,'forward route did not start at top');
      const pending=waitForPop();
      OUTBASE_ROUTER.history.back();
      await pending;
      assert(OUTBASE_ROUTER.savedScrollY()===240,'Back state lost saved scroll');
      const bootstrap=await source('../src/shell/bootstrap.js');
      assert(bootstrap.includes("reason==='popstate'")&&bootstrap.includes('router.savedScrollY?.()'),
        'shell does not apply router Back scroll state');
      const detail={forward:0,back:OUTBASE_ROUTER.savedScrollY()};
      spacer.remove();
      globalThis.scrollTo(0,0);
      return detail;
    });

    await test(5,'CurrentContext has one in-memory truth',async()=>{
      OUTBASE_ROUTER.history.replace(
        OUTBASE_ROUTER.history.state()||{},
        `${location.pathname}`
      );
      const before=JSON.stringify([...initialLocalStorage.entries()].sort());
      const id='01J00000000000000000000011';
      const seeded=OUTBASE_ACTIVITY_CONTEXT_V18.seedLocal({
        activityId:id,activityType:'walk',activityTitle:'Gate2'
      });
      const current=OUTBASE_ACTIVITY_CONTEXT_V18.current();
      const afterEntries=[];
      for(let index=0;index<localStorage.length;index++){
        const key=localStorage.key(index);
        afterEntries.push([key,localStorage.getItem(key)]);
      }
      const after=JSON.stringify(afterEntries.sort());
      assert(seeded.activityId===id&&current.activityId===id,'in-memory context diverged');
      assert(before===after,'display/in-memory context wrote localStorage');
      return {activityId:current.activityId,localStorageChanged:false};
    });

    await test(6,'displayed activity equals memo destination',async()=>{
      const id='01J00000000000000000000012';
      let saved=null;
      const service=OUTBASE_SAFE_MEMO_V1.create({
        repositories:{
          records:{all:async()=>[],save:async value=>(saved=value)},
          improvementItems:{all:async()=>[],save:async value=>value}
        },
        plans:{get:async value=>value===id?{id}:null},
        guard:OUTBASE_PERSISTENCE_GUARD_V1
      });
      const result=await service.save({
        activityId:id,displayActivityId:id,body:'linked memo',kind:'activity'
      });
      let mismatch=null;
      try{
        await service.save({
          activityId:id,displayActivityId:'01J00000000000000000000013',body:'mismatch'
        });
      }catch(error){mismatch=error;}
      assert(result.activityId===id&&saved.activity_id===id,'saved activity differs from display');
      assert(mismatch?.code==='memo_context_mismatch','context mismatch was not rejected');
      return {displayActivityId:id,savedActivityId:saved.activity_id,mismatch:mismatch.code};
    });

    await test(7,'legacy FIELD03 ID cannot override URL truth',async()=>{
      const key='outbase_core_activity_id';
      const original=localStorage.getItem(key);
      const legacyId='legacy-field03-id';
      const storyId='01J00000000000000000000014';
      localStorage.setItem(key,legacyId);
      await OUTBASE_ROUTER.navigate('activity',{activityId:storyId},{replace:true});
      const route=OUTBASE_ROUTER.current();
      assert(route.activityId===storyId,'legacy ID overrode URL context');
      assert(localStorage.getItem(key)===legacyId,'router rewrote legacy ID');
      if(original===null)localStorage.removeItem(key);else localStorage.setItem(key,original);
      return {routeActivityId:route.activityId,legacyIdWritten:false};
    });

    await test(8,'Activity type/subtype/state/parent contract',async()=>{
      const parent='01J00000000000000000000015';
      const entity=OUTBASE_VALIDATION.activity({
        type:'camp',subtype:'day_camp',title:'Child',state:'planned',parent_activity_id:parent
      });
      OUTBASE_VALIDATION.assertEntity('activities',entity);
      assert(entity.type==='camp'&&entity.subtype==='day_camp'&&
        entity.state==='planned'&&entity.parent_activity_id===parent,'activity fields changed');
      return {
        type:entity.type,subtype:entity.subtype,state:entity.state,
        parent_activity_id:entity.parent_activity_id
      };
    });

    await test(9,'child activity query uses parent_activity_id',async()=>{
      const parent=await OUTBASE_REPOSITORIES_V160.activities.save({
        type:'camp',title:'Parent',state:'planned'
      });
      const child=await OUTBASE_REPOSITORIES_V160.activities.save({
        type:'walk',subtype:'morning',title:'Child',state:'planned',parent_activity_id:parent.id
      });
      const children=await OUTBASE_REPOSITORIES_V160.activities.children(parent.id);
      assert(children.some(item=>item.id===child.id),'child query did not return child');
      return {parent:parent.id,children:children.map(item=>item.id)};
    });

    await test(10,'invalid Activity rejects before write',async()=>{
      const before=await OUTBASE_DB_V160.count('activities');
      let caught=null;
      try{
        await OUTBASE_REPOSITORIES_V160.activities.save({
          type:'not-a-type',title:'',state:'invalid-state'
        });
      }catch(error){caught=error;}
      const after=await OUTBASE_DB_V160.count('activities');
      assert(caught?.code==='entity_validation_failed','invalid activity was not rejected');
      assert(before===after,'invalid activity reached DB write');
      return {before,after,code:caught.code};
    });

    await test(11,'all repositories validate before DB write',async()=>{
      const repositorySource=await source('../src/data/repositories.js');
      const stores=Object.keys(OUTBASE_DB_V160.DEFINITIONS);
      assert(repositorySource.includes('validation().assertEntity(this.storeName,value);'),
        'save path has no structural validation');
      assert(repositorySource.includes('await validateReferences(this.storeName,value);'),
        'save path has no reference validation');
      assert(repositorySource.match(/assertEntity\(this\.storeName,value\)/g)?.length>=2,
        'saveMany/upsert path bypasses structural validation');
      for(const store of stores){
        const entity=OUTBASE_VALIDATION.normalize(store,{});
        assert(Array.isArray(OUTBASE_VALIDATION.entityErrors(store,entity)),
          `validator missing for ${store}`);
      }
      return {repositories:stores.length,preTransaction:true};
    });

    await test(12,'activity-less memo is nullable/unclassified',async()=>{
      let saved=null;
      let activityCreates=0;
      const service=OUTBASE_SAFE_MEMO_V1.create({
        repositories:{
          activities:{save:async()=>{activityCreates+=1;}},
          records:{all:async()=>[],save:async value=>(saved=value)},
          improvementItems:{all:async()=>[],save:async value=>value}
        },
        plans:{get:async()=>null},
        guard:OUTBASE_PERSISTENCE_GUARD_V1
      });
      const result=await service.save({body:'unclassified memo'});
      assert(saved.activity_id===null,'activity_id is not nullable');
      assert(saved.payload.classification==='unclassified','classification missing');
      assert(result.unclassified===true,'result does not expose unclassified');
      return {activityId:saved.activity_id,classification:saved.payload.classification,activityCreates};
    });

    await test(13,'activity-less memo creates no synthetic activity',async()=>{
      let creates=0;
      const service=OUTBASE_SAFE_MEMO_V1.create({
        repositories:{
          activities:{save:async()=>{creates+=1;}},
          records:{all:async()=>[],save:async value=>value},
          improvementItems:{all:async()=>[],save:async value=>value}
        },
        plans:{get:async()=>null},
        guard:OUTBASE_PERSISTENCE_GUARD_V1
      });
      await service.save({body:'no organizing activity'});
      assert(creates===0,'synthetic organizing activity was created');
      return {activityCreates:creates};
    });

    await test(14,'memo client request ID deduplicates writes',async()=>{
      const rows=[];
      let writes=0;
      const service=OUTBASE_SAFE_MEMO_V1.create({
        repositories:{
          records:{
            all:async()=>rows,
            save:async value=>{
              writes+=1;
              const saved={...value,id:'01J00000000000000000000016'};
              rows.push(saved);
              return saved;
            }
          },
          improvementItems:{all:async()=>[],save:async()=>{writes+=1;}}
        },
        plans:{get:async()=>null},
        guard:OUTBASE_PERSISTENCE_GUARD_V1
      });
      const [first,second]=await Promise.all([
        service.save({body:'same request',requestId:'memo-request-1'}),
        service.save({body:'same request',requestId:'memo-request-1'})
      ]);
      assert(first.ok&&second.deduplicated===true&&writes===1,
        'concurrent duplicate memo wrote another row');
      return {deduplicated:second.deduplicated,writes};
    });

    await test(15,'migration defaults OFF',async()=>{
      let caught=null;
      try{await OUTBASE_MIGRATIONS_V160.run();}
      catch(error){caught=error;}
      assert(caught?.code==='implicit_persistence_blocked','implicit migration was not blocked');
      return {code:caught.code,flags:OUTBASE_PERSISTENCE_GUARD_V1.flags()};
    });

    let midpointFailure=null;
    await test(18,'migration midpoint failure is not success',async()=>{
      const original=globalThis.OUTBASE_REPOSITORIES_V160;
      globalThis.OUTBASE_REPOSITORIES_V160={
        ...original,
        accounts:{...original.accounts,ensure:async()=>{throw new Error('gate2-midpoint-failure');}}
      };
      try{
        try{await OUTBASE_MIGRATIONS_V160.run({explicit:true,force:true});}
        catch(error){midpointFailure=error;}
      }finally{
        globalThis.OUTBASE_REPOSITORIES_V160=original;
      }
      const status=await OUTBASE_MIGRATIONS_V160.status();
      assert(midpointFailure,'midpoint failure did not reject');
      assert(status?.status==='failed','midpoint failure was recorded as success');
      return {rejected:true,status:status.status,error:String(midpointFailure.message)};
    });

    await test(16,'migration runs only by explicit operation',async()=>{
      const result=await OUTBASE_MIGRATIONS_V160.run({explicit:true,force:true});
      assert(['ready','ready_with_warnings'].includes(result.status),'explicit migration did not finish');
      assert(result.legacy_data_untouched===true,'legacy data protection was not reported');
      return {status:result.status,cutover:result.cutover};
    });

    await test(17,'migration rerun is fingerprint-safe',async()=>{
      const result=await OUTBASE_MIGRATIONS_V160.run({explicit:true});
      assert(result.status==='ready'&&result.skipped===true,'same fingerprint was migrated again');
      return {
        status:result.status,skipped:result.skipped,
        fingerprint:result.source_fingerprint
      };
    });

    await test(21,'restore path cannot clear current DB',async()=>{
      const app=await source('../src/app.js');
      const start=app.indexOf('async function restoreIndexedDb');
      const end=app.indexOf('async function restoreBackup',start);
      const restorePath=app.slice(start,end);
      assert(start>=0&&end>start,'restore boundary not found');
      assert(!/\.clear\s*\(/.test(restorePath),'current DB clear remains in restore path');
      assert(restorePath.includes('production_restore_disabled'),'restore is not explicitly disabled');
      return {clear:false,code:'production_restore_disabled'};
    });

    await test(22,'archive verifies only in temporary databases',async()=>{
      const archive={
        manifest:{
          format:'OUTBASE_NON_DESTRUCTIVE_STORAGE_EXPORT',
          formatVersion:1,
          databases:[{name:'source_db',exists:true,version:1,count:1,stores:[{name:'records',count:1}]}]
        },
        indexedDB:[{
          name:'source_db',exists:true,version:1,count:1,
          stores:[{
            name:'records',keyPath:'id',autoIncrement:false,indexes:[],count:1,
            rows:[{
              key:'row-1',primaryKey:'row-1',
              value:{
                id:'row-1',
                blob:{__outbaseType:'Blob',type:'text/plain',size:4,encoding:'base64',data:'dGVzdA=='},
                file:{__outbaseType:'File',type:'text/plain',size:4,name:'test.txt',lastModified:1,encoding:'base64',data:'ZmlsZQ=='},
                buffer:{__outbaseType:'ArrayBuffer',encoding:'base64',data:'AQIDBA=='}
              }
            }]
          }]
        }],
        localStorage:[],
        sessionStorageReference:[]
      };
      const beforeStory=await OUTBASE_DB_V160.count('activities');
      const localBefore=JSON.stringify([...initialLocalStorage.entries()].sort());
      const result=await OUTBASE_ISOLATED_ARCHIVE_VERIFIER_V1.verify(archive,{explicit:true});
      const afterStory=await OUTBASE_DB_V160.count('activities');
      const tempNames=(await databaseNames()).filter(name=>
        name.startsWith(OUTBASE_ISOLATED_ARCHIVE_VERIFIER_V1.TEMP_PREFIX)
      );
      assert(result.ok&&result.currentDatabasesModified===false,'verification was not isolated');
      assert(beforeStory===afterStory,'current Story DB changed');
      assert(tempNames.length===0,'temporary verification DB remains');
      assert(localBefore===JSON.stringify([...initialLocalStorage.entries()].sort()),
        'localStorage changed during verification');
      return {currentRowsBefore:beforeStory,currentRowsAfter:afterStory,tempDatabases:tempNames};
    });

    await test(23,'Blob/File/ArrayBuffer roundtrip is lossless',async()=>{
      const verifier=OUTBASE_ISOLATED_ARCHIVE_VERIFIER_V1;
      const blob=await verifier.decodeValue({
        __outbaseType:'Blob',type:'text/plain',size:4,data:'dGVzdA=='
      });
      const file=await verifier.decodeValue({
        __outbaseType:'File',type:'text/plain',size:4,name:'test.txt',lastModified:1,data:'ZmlsZQ=='
      });
      const buffer=await verifier.decodeValue({
        __outbaseType:'ArrayBuffer',data:'AQIDBA=='
      });
      assert(blob instanceof Blob&&blob.size===4,'Blob was lost');
      assert(file instanceof Blob&&file.size===4&&file.name==='test.txt','File was lost');
      assert(buffer instanceof ArrayBuffer&&buffer.byteLength===4,'ArrayBuffer was lost');
      return {blob:blob.size,file:file.size,fileName:file.name,arrayBuffer:buffer.byteLength};
    });

    await test(24,'dormant root app.js remains disconnected',async()=>{
      const files=['../index.html','../src/main.js','../src/config/module-manifest.js','../service-worker.js'];
      const connected=[];
      const texts=await Promise.all(files.map(file=>source(file)));
      files.forEach((file,index)=>{
        const text=texts[index];
        if(/(?:^|['"./])app\.js(?:['"?]|$)/m.test(text)&&!text.includes('src/app.js'))connected.push(file);
      });
      assert(connected.length===0,`root app.js connected by ${connected.join(', ')}`);
      return {connected:false,checked:files};
    });

    await test(25,'outbase_calendar_db remains disconnected',async()=>{
      const files=['../index.html','../src/main.js','../src/config/module-manifest.js','../service-worker.js'];
      const connected=[];
      const texts=await Promise.all(files.map(file=>source(file)));
      files.forEach((file,index)=>{
        const text=texts[index];
        if(text.includes('outbase-calendar-v2.js')||text.includes('outbase_calendar_db'))connected.push(file);
      });
      assert(connected.length===0,`calendar DB connected by ${connected.join(', ')}`);
      return {connected:false,checked:files};
    });

    await test(26,'protected HOME/weather/v44/FIELD03 files are guarded',async()=>{
      const protectedFiles=[
        '../style-home-v36.css',
        '../src/services/weather-service.js',
        '../src/services/weather-custom-location-fix.js',
        '../src/services/weather-external-links.js',
        '../calendar-formal-v44.html','../calendar-formal-v44.css','../calendar-formal-v44.js',
        '../src/outbase-memo-ui.js','../src/outbase-review-ui.js',
        '../style.css','../style-flow.css','../style-memo.css','../style-review.css'
      ];
      await Promise.all(protectedFiles.map(file=>source(file)));
      return {baseSha:BASE_SHA,guardedFiles:protectedFiles.length};
    });

    await OUTBASE_DB_V160.close();
    await deleteDatabase(STORY_DB);
    restoreStorage(localStorage,initialLocalStorage);
    restoreStorage(sessionStorage,initialSessionStorage);

    results.sort((a,b)=>a.number-b.number);
    const failed=results.filter(result=>!result.ok);
    const finalResult={
      ok:failed.length===0,
      passed:results.length-failed.length,
      failed:failed.length,
      total:results.length,
      baseSha:BASE_SHA,
      results
    };
    globalThis.OUTBASE_R1_GATE2_TEST_RESULT=Object.freeze(finalResult);
    output.textContent=JSON.stringify(finalResult,null,2);
    document.title=`${finalResult.ok?'PASS':'FAIL'} ${finalResult.passed}/${finalResult.total} - OUTBASE R1 Gate2`;
    document.body.dataset.testStatus=finalResult.ok?'passed':'failed';
  }

  run().catch(async error=>{
    try{
      await OUTBASE_DB_V160.close();
      restoreStorage(localStorage,initialLocalStorage);
      restoreStorage(sessionStorage,initialSessionStorage);
    }catch(_cleanupError){}
    const finalResult={ok:false,passed:0,failed:1,total:1,fatal:String(error?.stack||error),results};
    globalThis.OUTBASE_R1_GATE2_TEST_RESULT=Object.freeze(finalResult);
    output.textContent=JSON.stringify(finalResult,null,2);
    document.title='FAIL - OUTBASE R1 Gate2';
    document.body.dataset.testStatus='failed';
  });
})();
