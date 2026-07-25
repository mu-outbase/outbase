(() => {
  'use strict';

  const FORMAT='OUTBASE_NON_DESTRUCTIVE_STORAGE_EXPORT';
  const FORMAT_VERSION=1;
  const DATABASES=Object.freeze(['outbase_db','outbase_story_db','outbase_calendar_db']);

  class StorageExportError extends Error{
    constructor(message,failures=[]){
      super(message);
      this.name='StorageExportError';
      this.code='storage_export_failed';
      this.failures=Object.freeze(failures.map(item=>Object.freeze({...item})));
    }
  }

  function bytesToBase64(bytes){
    const chunkSize=0x8000;
    let binary='';
    for(let offset=0;offset<bytes.length;offset+=chunkSize){
      binary+=String.fromCharCode(...bytes.subarray(offset,Math.min(offset+chunkSize,bytes.length)));
    }
    return btoa(binary);
  }

  async function encodeValue(value,path='$',seen=new WeakSet()){
    if(value===null||typeof value==='string'||typeof value==='boolean')return value;
    if(typeof value==='undefined')return {__outbaseType:'Undefined'};
    if(typeof value==='bigint')return {__outbaseType:'BigInt',value:String(value)};
    if(typeof value==='number'){
      if(Number.isNaN(value))return {__outbaseType:'Number',value:'NaN'};
      if(value===Infinity)return {__outbaseType:'Number',value:'Infinity'};
      if(value===-Infinity)return {__outbaseType:'Number',value:'-Infinity'};
      return value;
    }
    if(typeof value==='function'||typeof value==='symbol'){
      throw new TypeError(`Unsupported value at ${path}: ${typeof value}`);
    }
    if(value instanceof Blob){
      const isFile=typeof File!=='undefined'&&value instanceof File;
      const bytes=new Uint8Array(await value.arrayBuffer());
      return {
        __outbaseType:isFile?'File':'Blob',
        type:value.type||'',
        size:value.size,
        ...(isFile?{name:value.name,lastModified:value.lastModified}:{}),
        encoding:'base64',
        data:bytesToBase64(bytes)
      };
    }
    if(value instanceof Date)return {__outbaseType:'Date',value:value.toISOString()};
    if(value instanceof RegExp)return {__outbaseType:'RegExp',source:value.source,flags:value.flags};
    if(value instanceof ArrayBuffer){
      return {__outbaseType:'ArrayBuffer',encoding:'base64',data:bytesToBase64(new Uint8Array(value))};
    }
    if(ArrayBuffer.isView(value)){
      const bytes=new Uint8Array(value.buffer,value.byteOffset,value.byteLength);
      return {
        __outbaseType:'TypedArray',
        constructor:value.constructor?.name||'Uint8Array',
        encoding:'base64',
        data:bytesToBase64(bytes)
      };
    }
    if(seen.has(value))throw new TypeError(`Circular value at ${path}`);
    seen.add(value);
    try{
      if(Array.isArray(value)){
        return await Promise.all(value.map((item,index)=>encodeValue(item,`${path}[${index}]`,seen)));
      }
      if(value instanceof Map){
        const entries=[];
        let index=0;
        for(const [key,item] of value.entries()){
          entries.push([
            await encodeValue(key,`${path}.mapKey[${index}]`,seen),
            await encodeValue(item,`${path}.mapValue[${index}]`,seen)
          ]);
          index+=1;
        }
        return {__outbaseType:'Map',entries};
      }
      if(value instanceof Set){
        const values=[];
        let index=0;
        for(const item of value.values()){
          values.push(await encodeValue(item,`${path}.set[${index}]`,seen));
          index+=1;
        }
        return {__outbaseType:'Set',values};
      }
      const output={};
      for(const key of Object.keys(value)){
        output[key]=await encodeValue(value[key],`${path}.${key}`,seen);
      }
      const constructor=value.constructor?.name;
      return constructor&&constructor!=='Object'
        ? {__outbaseType:'StructuredObject',constructor,properties:output}
        : output;
    }finally{
      seen.delete(value);
    }
  }

  async function databaseListing(){
    if(typeof indexedDB.databases!=='function')return null;
    try{return await indexedDB.databases();}catch(_error){return null;}
  }

  async function databaseExists(name){
    const listing=await databaseListing();
    return listing?listing.some(item=>item.name===name):null;
  }

  async function openExistingDatabase(name){
    const exists=await databaseExists(name);
    if(exists===false)return null;
    if(name==='outbase_db'&&globalThis.OUTBASE_DB_ACCESSOR_V1?.openExisting){
      return globalThis.OUTBASE_DB_ACCESSOR_V1.openExisting({
        requiredStores:[],
        source:'non-destructive-export'
      });
    }
    return new Promise((resolve,reject)=>{
      let created=false;
      const request=indexedDB.open(name);
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
        resolve(db);
      };
      request.onerror=()=>{
        if(created){resolve(null);return;}
        reject(request.error||new Error(`Failed to open ${name}`));
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

  function readStore(store){
    return new Promise((resolve,reject)=>{
      const rows=[];
      const request=store.openCursor();
      request.onsuccess=()=>{
        const cursor=request.result;
        if(!cursor){resolve(rows);return;}
        rows.push({key:cursor.key,primaryKey:cursor.primaryKey,value:cursor.value});
        cursor.continue();
      };
      request.onerror=()=>reject(request.error||new Error(`Failed to read ${store.name}`));
    });
  }

  function describeStore(store){
    const indexes=[];
    for(const name of Array.from(store.indexNames)){
      const index=store.index(name);
      indexes.push({
        name:index.name,
        keyPath:index.keyPath,
        unique:index.unique,
        multiEntry:index.multiEntry
      });
    }
    return {
      name:store.name,
      keyPath:store.keyPath,
      autoIncrement:store.autoIncrement,
      indexes
    };
  }

  async function snapshotDatabase(name,{encodeRows=true}={}){
    const db=await openExistingDatabase(name);
    if(!db)return {name,exists:false,version:null,stores:[],count:0};
    try{
      const storeNames=Array.from(db.objectStoreNames);
      if(!storeNames.length)return {name,exists:true,version:db.version,stores:[],count:0};
      const tx=db.transaction(storeNames,'readonly');
      const done=transactionComplete(tx);
      const pending=storeNames.map(async storeName=>{
        const store=tx.objectStore(storeName);
        const structure=describeStore(store);
        const rows=await readStore(store);
        return {...structure,count:rows.length,rawRows:rows};
      });
      const rawStores=await Promise.all(pending);
      await done;
      const stores=await Promise.all(rawStores.map(async store=>{
        const rows=encodeRows
          ? await Promise.all(store.rawRows.map(async (row,index)=>({
            key:await encodeValue(row.key,`${name}.${store.name}[${index}].key`),
            primaryKey:await encodeValue(row.primaryKey,`${name}.${store.name}[${index}].primaryKey`),
            value:await encodeValue(row.value,`${name}.${store.name}[${index}].value`)
          })))
          : [];
        const {rawRows,...structure}=store;
        return {...structure,rows};
      }));
      return {
        name,
        exists:true,
        version:db.version,
        stores,
        count:stores.reduce((sum,store)=>sum+store.count,0)
      };
    }finally{
      db.close();
    }
  }

  function webStorageSnapshot(storage){
    const entries=[];
    for(let index=0;index<storage.length;index++){
      const key=storage.key(index);
      if(key!==null)entries.push({key,value:storage.getItem(key)});
    }
    return entries.sort((a,b)=>a.key.localeCompare(b.key));
  }

  async function cacheStorageSnapshot(){
    if(!('caches' in globalThis))return {available:false,caches:[]};
    const names=await caches.keys();
    const output=[];
    for(const name of names){
      const cache=await caches.open(name);
      const requests=await cache.keys();
      const entries=[];
      for(const request of requests){
        const response=await cache.match(request);
        if(!response){
          entries.push({request:{url:request.url,method:request.method},missingResponse:true});
          continue;
        }
        let body=null;
        let bodyError=null;
        try{
          const bytes=new Uint8Array(await response.clone().arrayBuffer());
          body={encoding:'base64',size:bytes.length,data:bytesToBase64(bytes)};
        }catch(error){
          bodyError=String(error?.message||error);
        }
        entries.push({
          request:{
            url:request.url,
            method:request.method,
            headers:Object.fromEntries(request.headers.entries())
          },
          response:{
            status:response.status,
            statusText:response.statusText,
            type:response.type,
            url:response.url,
            headers:Object.fromEntries(response.headers.entries()),
            body,
            bodyError
          }
        });
      }
      output.push({name,count:entries.length,entries});
    }
    return {available:true,caches:output};
  }

  function countManifest(databases){
    return databases.map(database=>({
      name:database.name,
      exists:database.exists,
      version:database.version,
      count:database.count,
      stores:database.stores.map(store=>({name:store.name,count:store.count}))
    }));
  }

  function stableStorage(entries){
    return JSON.stringify(entries.map(item=>[item.key,item.value]));
  }

  function stableCounts(databases){
    return JSON.stringify(countManifest(databases));
  }

  async function createArchive({
    includeCacheStorage=true,
    verifyUnchanged=true,
    databaseNames=DATABASES
  }={}){
    if(!('indexedDB' in globalThis))throw new StorageExportError('IndexedDB is unavailable.',[
      {target:'IndexedDB',error:'IndexedDB is unavailable'}
    ]);
    const failures=[];
    const exportedAt=new Date().toISOString();
    const localBefore=webStorageSnapshot(localStorage);
    const sessionReference=webStorageSnapshot(sessionStorage);
    const databases=[];
    const targets=[...databaseNames];
    for(const name of targets){
      try{
        databases.push(await snapshotDatabase(name,{encodeRows:true}));
      }catch(error){
        failures.push({target:`IndexedDB/${name}`,error:String(error?.message||error)});
      }
    }
    let cacheStorage={available:false,caches:[]};
    if(includeCacheStorage){
      try{cacheStorage=await cacheStorageSnapshot();}
      catch(error){failures.push({target:'CacheStorage',error:String(error?.message||error)});}
    }
    if(failures.length)throw new StorageExportError('One or more storage targets could not be exported.',failures);

    const manifest={
      format:FORMAT,
      formatVersion:FORMAT_VERSION,
      exportedAt,
      application:{
        build:globalThis.OUTBASE_VERSION?.app||null,
        cacheBuild:globalThis.OUTBASE_VERSION?.cache||null,
        storageGate:'r1-common-foundation-gate1'
      },
      databases:countManifest(databases),
      localStorageCount:localBefore.length,
      sessionStorageCount:sessionReference.length,
      cacheStorage:cacheStorage.caches.map(cache=>({name:cache.name,count:cache.count})),
      blobEncoding:'base64',
      restoreIncluded:false
    };
    const archive={
      manifest,
      indexedDB:databases,
      localStorage:localBefore,
      sessionStorageReference:sessionReference,
      cacheStorage
    };

    if(verifyUnchanged){
      const localAfter=webStorageSnapshot(localStorage);
      const countAfter=[];
      for(const name of targets)countAfter.push(await snapshotDatabase(name,{encodeRows:false}));
      const changes=[];
      if(stableStorage(localBefore)!==stableStorage(localAfter))changes.push('localStorage changed during export');
      if(stableCounts(databases)!==stableCounts(countAfter))changes.push('IndexedDB database/store counts changed during export');
      if(changes.length){
        throw new StorageExportError('Storage changed before export completed; archive was not finalized.',
          changes.map(error=>({target:'consistency-check',error})));
      }
      manifest.consistencyCheck={passed:true,checkedAt:new Date().toISOString()};
    }

    let json;
    try{json=JSON.stringify(archive);}
    catch(error){
      throw new StorageExportError('The export archive could not be serialized.',[
        {target:'archive-json',error:String(error?.message||error)}
      ]);
    }
    return {
      ok:true,
      archive,
      json,
      blob:new Blob([json],{type:'application/json'}),
      manifest
    };
  }

  async function download(options={}){
    const result=await createArchive(options);
    const stamp=result.manifest.exportedAt.replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
    const url=URL.createObjectURL(result.blob);
    try{
      const anchor=document.createElement('a');
      anchor.href=url;
      anchor.download=`OUTBASE_STORAGE_EXPORT_${stamp}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    }finally{
      setTimeout(()=>URL.revokeObjectURL(url),1500);
    }
    return result;
  }

  globalThis.OUTBASE_STORAGE_EXPORT_V1=Object.freeze({
    FORMAT,
    FORMAT_VERSION,
    DATABASES,
    StorageExportError,
    encodeValue,
    snapshotDatabase,
    createArchive,
    download
  });
})();
