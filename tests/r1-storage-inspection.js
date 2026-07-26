(() => {
  'use strict';

  const DATABASES=['outbase_story_db','outbase_db','outbase_calendar_db'];

  function requestResult(request){
    return new Promise((resolve,reject)=>{
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||new Error('IndexedDB request failed'));
    });
  }

  async function databaseSnapshot(name,listing){
    const info=listing.find(item=>item.name===name);
    if(!info)return {name,exists:false,version:null,totalRows:0,stores:[]};
    const db=await requestResult(indexedDB.open(name));
    try{
      const stores=[];
      for(const storeName of Array.from(db.objectStoreNames)){
        const tx=db.transaction(storeName,'readonly');
        const store=tx.objectStore(storeName);
        const count=await requestResult(store.count());
        const samples=['activities','records','preparation_items'].includes(storeName)
          ?await requestResult(store.getAll())
          :undefined;
        stores.push({name:storeName,count,...(samples===undefined?{}:{samples})});
      }
      return {
        name,
        exists:true,
        version:db.version,
        totalRows:stores.reduce((sum,store)=>sum+store.count,0),
        stores
      };
    }finally{
      db.close();
    }
  }

  function storageEntries(storage){
    const entries={};
    for(let index=0;index<storage.length;index++){
      const key=storage.key(index);
      if(key!==null)entries[key]=storage.getItem(key);
    }
    return Object.fromEntries(Object.entries(entries).sort(([a],[b])=>a.localeCompare(b)));
  }

  async function run(){
    const listing=typeof indexedDB.databases==='function'?await indexedDB.databases():[];
    const databases=[];
    for(const name of DATABASES)databases.push(await databaseSnapshot(name,listing));
    const localStorageEntries=storageEntries(localStorage);
    const result={
      ok:true,
      measuredAt:new Date().toISOString(),
      databases,
      localStorageCount:Object.keys(localStorageEntries).length,
      localStorage:localStorageEntries
    };
    document.getElementById('result').textContent=JSON.stringify(result,null,2);
    document.title='READY: OUTBASE R1 storage inspection';
    globalThis.OUTBASE_R1_STORAGE_INSPECTION=result;
  }

  run().catch(error=>{
    const result={ok:false,error:String(error?.stack||error)};
    document.getElementById('result').textContent=JSON.stringify(result,null,2);
    document.title='FAIL: OUTBASE R1 storage inspection';
  });
})();
