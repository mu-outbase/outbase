(() => {
  'use strict';

  const guard=globalThis.OUTBASE_PERSISTENCE_GUARD_V1;
  if(!guard)throw new Error('OUTBASE persistence guard is not ready');

  const DB_NAME='outbase_db';
  const DB_VERSION=12;
  const DEFINITIONS=Object.freeze({
    fieldRecords:Object.freeze({keyPath:'id',indexes:Object.freeze([])}),
    coreImportBlobs:Object.freeze({keyPath:'blobId',indexes:Object.freeze([])})
  });

  class OutbaseDbError extends Error{
    constructor(code,message,detail={},cause=null){
      super(message);
      this.name='OutbaseDbError';
      this.code=code;
      this.detail=Object.freeze({...detail});
      if(cause)this.cause=cause;
    }
  }

  function schemaFor(dbName=DB_NAME){
    return dbName===DB_NAME?DEFINITIONS:DEFINITIONS;
  }

  function addMissingSchema(request,definitions){
    const db=request.result;
    for(const [storeName,definition] of Object.entries(definitions)){
      const store=db.objectStoreNames.contains(storeName)
        ? request.transaction.objectStore(storeName)
        : db.createObjectStore(storeName,{keyPath:definition.keyPath});
      for(const index of definition.indexes||[]){
        const [name,keyPath,options={}] = index;
        if(!store.indexNames.contains(name))store.createIndex(name,keyPath,options);
      }
    }
  }

  function verifyStores(db,requiredStores){
    const missing=(requiredStores||[]).filter(name=>!db.objectStoreNames.contains(name));
    if(missing.length){
      throw new OutbaseDbError(
        'outbase_db_schema_missing',
        `outbase_db is missing required stores: ${missing.join(', ')}`,
        {database:db.name,version:db.version,missingStores:missing}
      );
    }
  }

  function openRequest(dbName,version,{definitions,requiredStores,source}){
    return new Promise((resolve,reject)=>{
      let upgradeError=null;
      const request=indexedDB.open(dbName,version);
      request.onupgradeneeded=()=>{
        try{
          addMissingSchema(request,definitions);
        }catch(error){
          upgradeError=error;
          try{request.transaction.abort();}catch(_abortError){}
        }
      };
      request.onsuccess=()=>{
        const db=request.result;
        try{
          verifyStores(db,requiredStores);
          db.onversionchange=()=>db.close();
          resolve(db);
        }catch(error){
          db.close();
          reject(error);
        }
      };
      request.onerror=()=>{
        reject(new OutbaseDbError(
          upgradeError?'outbase_db_upgrade_failed':'outbase_db_open_failed',
          upgradeError
            ? `Failed to upgrade ${dbName}: ${upgradeError.message||upgradeError}`
            : `Failed to open ${dbName}: ${request.error?.message||request.error||'unknown error'}`,
          {database:dbName,requestedVersion:version,source},
          upgradeError||request.error
        ));
      };
      request.onblocked=()=>{
        reject(new OutbaseDbError(
          'outbase_db_upgrade_blocked',
          `${dbName} upgrade is blocked by another open tab.`,
          {database:dbName,requestedVersion:version,source}
        ));
      };
    });
  }

  async function open({
    dbName=DB_NAME,
    requestedVersion=DB_VERSION,
    requiredStores=Object.keys(DEFINITIONS),
    source='unknown'
  }={}){
    if(!('indexedDB' in globalThis)){
      throw new OutbaseDbError('indexeddb_unavailable','IndexedDB is unavailable.',{database:dbName,source});
    }
    guard.assertSupportedOutbaseDbVersion(requestedVersion,DB_VERSION,{source});
    try{
      return await openRequest(dbName,requestedVersion,{
        definitions:schemaFor(dbName),requiredStores,source
      });
    }catch(error){
      if(error?.cause?.name!=='VersionError'&&error?.cause?.name!=='InvalidStateError')throw error;
      const existing=await openExisting({dbName,requiredStores,source:`${source}:future-version-fallback`});
      if(existing)return existing;
      throw error;
    }
  }

  async function databaseListing(){
    if(typeof indexedDB.databases!=='function')return null;
    try{return await indexedDB.databases();}catch(_error){return null;}
  }

  async function openExisting({
    dbName=DB_NAME,
    requiredStores=[],
    source='unknown'
  }={}){
    if(!('indexedDB' in globalThis)){
      throw new OutbaseDbError('indexeddb_unavailable','IndexedDB is unavailable.',{database:dbName,source});
    }
    const listing=await databaseListing();
    if(listing&&!listing.some(item=>item.name===dbName))return null;
    return new Promise((resolve,reject)=>{
      let created=false;
      const request=indexedDB.open(dbName);
      request.onupgradeneeded=()=>{
        created=true;
        try{request.transaction.abort();}catch(_abortError){}
      };
      request.onsuccess=()=>{
        const db=request.result;
        if(created){
          db.close();
          resolve(null);
          return;
        }
        try{
          verifyStores(db,requiredStores);
          db.onversionchange=()=>db.close();
          resolve(db);
        }catch(error){
          db.close();
          reject(error);
        }
      };
      request.onerror=()=>{
        if(created){
          resolve(null);
          return;
        }
        reject(new OutbaseDbError(
          'outbase_db_open_existing_failed',
          `Failed to open existing ${dbName}: ${request.error?.message||request.error||'unknown error'}`,
          {database:dbName,source},
          request.error
        ));
      };
    });
  }

  function transactionComplete(tx){
    return new Promise((resolve,reject)=>{
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error||new Error('IndexedDB transaction failed'));
      tx.onabort=()=>reject(tx.error||new Error('IndexedDB transaction aborted'));
    });
  }

  async function put(storeName,value,{source='unknown'}={}){
    const db=await open({requiredStores:[storeName],source});
    try{
      const tx=db.transaction(storeName,'readwrite');
      const request=tx.objectStore(storeName).put(value);
      const result=new Promise((resolve,reject)=>{
        request.onsuccess=()=>resolve(request.result);
        request.onerror=()=>reject(request.error||new Error(`Failed to write ${storeName}`));
      });
      await Promise.all([result,transactionComplete(tx)]);
      return {ok:true,key:await result,database:db.name,version:db.version,store:storeName};
    }catch(error){
      throw new OutbaseDbError(
        'outbase_db_write_failed',
        `Failed to write ${db.name}/${storeName}: ${error?.message||error}`,
        {database:db.name,version:db.version,store:storeName,source},
        error
      );
    }finally{
      db.close();
    }
  }

  async function remove(storeName,key,{source='unknown'}={}){
    const db=await open({requiredStores:[storeName],source});
    try{
      const tx=db.transaction(storeName,'readwrite');
      tx.objectStore(storeName).delete(key);
      await transactionComplete(tx);
      return {ok:true,key,database:db.name,version:db.version,store:storeName};
    }catch(error){
      throw new OutbaseDbError(
        'outbase_db_delete_failed',
        `Failed to delete from ${db.name}/${storeName}: ${error?.message||error}`,
        {database:db.name,version:db.version,store:storeName,source},
        error
      );
    }finally{
      db.close();
    }
  }

  async function removeMany(storeName,keys,{source='unknown'}={}){
    const values=[...(keys||[])];
    if(!values.length)return {ok:true,keys:[],database:DB_NAME,version:DB_VERSION,store:storeName};
    const db=await open({requiredStores:[storeName],source});
    try{
      const tx=db.transaction(storeName,'readwrite');
      const store=tx.objectStore(storeName);
      for(const key of values)store.delete(key);
      await transactionComplete(tx);
      return {ok:true,keys:values,database:db.name,version:db.version,store:storeName};
    }catch(error){
      throw new OutbaseDbError(
        'outbase_db_delete_many_failed',
        `Failed to delete rows from ${db.name}/${storeName}: ${error?.message||error}`,
        {database:db.name,version:db.version,store:storeName,source,count:values.length},
        error
      );
    }finally{
      db.close();
    }
  }

  function createForTest(dbName){
    if(!dbName||dbName===DB_NAME)throw new Error('Test accessor requires an isolated database name.');
    return Object.freeze({
      open:options=>open({...options,dbName,source:options?.source||'isolated-test'}),
      openExisting:options=>openExisting({...options,dbName,source:options?.source||'isolated-test'}),
      DB_NAME:dbName,
      DB_VERSION,
      DEFINITIONS
    });
  }

  globalThis.OUTBASE_DB_ACCESSOR_V1=Object.freeze({
    DB_NAME,
    DB_VERSION,
    DEFINITIONS,
    OutbaseDbError,
    open,
    openExisting,
    put,
    remove,
    removeMany,
    createForTest
  });
})();
