(() => {
  'use strict';

  const output=document.getElementById('result');
  const ACTIVITY_ID='01J00000000000000000000R12';

  function requestResult(request){
    return new Promise((resolve,reject)=>{
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||new Error('IndexedDB request failed'));
    });
  }

  async function deleteStoryDatabase(){
    await OUTBASE_DB_V160.close();
    await new Promise((resolve,reject)=>{
      const request=indexedDB.deleteDatabase(OUTBASE_DB_V160.DB_NAME);
      request.onsuccess=()=>resolve();
      request.onerror=()=>reject(request.error||new Error('Fixture cleanup failed'));
      request.onblocked=()=>reject(new Error('Fixture cleanup was blocked'));
    });
  }

  async function counts(){
    const db=await OUTBASE_DB_V160.openExisting();
    if(!db)return {exists:false,version:null,stores:{},total:0};
    try{
      const stores={};
      for(const name of Array.from(db.objectStoreNames)){
        stores[name]=await requestResult(
          db.transaction(name,'readonly').objectStore(name).count()
        );
      }
      return {
        exists:true,
        version:db.version,
        stores,
        total:Object.values(stores).reduce((sum,count)=>sum+count,0)
      };
    }finally{db.close();}
  }

  async function run(){
    const action=new URLSearchParams(location.search).get('action')||'inspect';
    let result;
    if(action==='seed'){
      await deleteStoryDatabase();
      const start=new Date(Date.now()+86400000).toISOString();
      const end=new Date(Date.now()+90000000).toISOString();
      await OUTBASE_REPOSITORIES_V160.activities.save({
        id:ACTIVITY_ID,
        type:'camp',
        subtype:'overnight',
        title:'R1 Gate2 隔離確認プラン',
        state:'planned',
        start_at:start,
        end_at:end,
        visibility:'private',
        source:'r1-gate2-isolated-browser-fixture'
      });
      await OUTBASE_REPOSITORIES_V160.calendarEntries.save({
        activity_id:ACTIVITY_ID,
        start_at:start,
        end_at:end,
        all_day:false,
        timezone:'Asia/Tokyo',
        source:'r1-gate2-isolated-browser-fixture'
      });
      result={ok:true,action,activityId:ACTIVITY_ID,counts:await counts()};
    }else if(action==='cleanup'){
      await deleteStoryDatabase();
      result={ok:true,action,activityId:ACTIVITY_ID,counts:await counts()};
    }else{
      result={ok:true,action,activityId:ACTIVITY_ID,counts:await counts()};
    }
    globalThis.OUTBASE_R1_GATE2_FIXTURE_RESULT=Object.freeze(result);
    output.textContent=JSON.stringify(result,null,2);
    document.title=`READY ${action} - OUTBASE R1 Gate2 fixture`;
    document.body.dataset.fixtureStatus='ready';
  }

  run().catch(error=>{
    const result={ok:false,error:String(error?.stack||error)};
    globalThis.OUTBASE_R1_GATE2_FIXTURE_RESULT=Object.freeze(result);
    output.textContent=JSON.stringify(result,null,2);
    document.title='FAIL - OUTBASE R1 Gate2 fixture';
    document.body.dataset.fixtureStatus='failed';
  });
})();
