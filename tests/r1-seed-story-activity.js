(() => {
  'use strict';

  const ACTIVITY_ID='r1-verification-activity';

  function transactionComplete(tx){
    return new Promise((resolve,reject)=>{
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error||new Error('Fixture transaction failed'));
      tx.onabort=()=>reject(tx.error||new Error('Fixture transaction aborted'));
    });
  }

  async function run(){
    const listing=typeof indexedDB.databases==='function'?await indexedDB.databases():[];
    if(!listing.some(item=>item.name==='outbase_story_db')){
      throw new Error('outbase_story_db must be initialized by the app before explicit fixture setup');
    }
    const db=await new Promise((resolve,reject)=>{
      const request=indexedDB.open('outbase_story_db');
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||new Error('Unable to open outbase_story_db'));
    });
    try{
      if(!db.objectStoreNames.contains('activities'))throw new Error('activities store is missing');
      const now=new Date().toISOString();
      const tx=db.transaction('activities','readwrite');
      tx.objectStore('activities').put({
        id:ACTIVITY_ID,
        household_id:null,
        title:'R1検証用活動',
        type:'camp',
        state:'planning',
        start_at:now,
        end_at:now,
        timezone:'Asia/Tokyo',
        visibility:'private',
        primary_place_id:null,
        metadata:{source:'explicit-r1-gate1-verification-fixture'},
        source:'explicit-r1-gate1-verification-fixture',
        created_at:now,
        updated_at:now,
        created_by:null,
        deleted_at:null,
        legacy_ref:null
      });
      await transactionComplete(tx);
    }finally{
      db.close();
    }
    const result={ok:true,explicitFixture:true,activityId:ACTIVITY_ID};
    document.getElementById('result').textContent=JSON.stringify(result,null,2);
    document.title='READY: OUTBASE R1 explicit activity fixture';
  }

  run().catch(error=>{
    document.getElementById('result').textContent=JSON.stringify({
      ok:false,
      error:String(error?.stack||error)
    },null,2);
    document.title='FAIL: OUTBASE R1 explicit activity fixture';
  });
})();
