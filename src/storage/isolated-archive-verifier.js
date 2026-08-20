(() => {
  'use strict';

  const FORMAT='OUTBASE_NON_DESTRUCTIVE_STORAGE_EXPORT';
  const FORMAT_VERSION=1;
  const TEMP_PREFIX='outbase_r1_archive_verify_';

  class ArchiveVerificationError extends Error{
    constructor(code,message,detail={}){
      super(message);
      this.name='ArchiveVerificationError';
      this.code=code;
      this.detail=Object.freeze({...detail});
    }
  }

  function base64ToBytes(value,path){
    try{
      const binary=atob(String(value||''));
      return Uint8Array.from(binary,char=>char.charCodeAt(0));
    }catch(error){
      throw new ArchiveVerificationError(
        'archive_base64_invalid',
        `Invalid base64 value at ${path}.`,
        {path,error:String(error?.message||error)}
      );
    }
  }

  async function decodeValue(value,path='$'){
    if(value===null||typeof value!=='object')return value;
    if(Array.isArray(value))return Promise.all(
      value.map((item,index)=>decodeValue(item,`${path}[${index}]`))
    );
    const type=value.__outbaseType;
    if(type==='Undefined')return undefined;
    if(type==='BigInt')return BigInt(value.value);
    if(type==='Number'){
      if(value.value==='NaN')return NaN;
      if(value.value==='Infinity')return Infinity;
      if(value.value==='-Infinity')return -Infinity;
    }
    if(type==='Blob'||type==='File'){
      const bytes=base64ToBytes(value.data,`${path}.data`);
      if(Number(value.size)!==bytes.byteLength)throw new ArchiveVerificationError(
        'archive_binary_size_mismatch',
        `Binary size mismatch at ${path}.`,
        {path,expected:Number(value.size),actual:bytes.byteLength,type}
      );
      if(type==='File'&&typeof File!=='undefined'){
        return new File([bytes],String(value.name||''),{
          type:String(value.type||''),
          lastModified:Number(value.lastModified||0)
        });
      }
      const blob=new Blob([bytes],{type:String(value.type||'')});
      if(type==='File')Object.defineProperties(blob,{
        name:{value:String(value.name||''),enumerable:true},
        lastModified:{value:Number(value.lastModified||0),enumerable:true}
      });
      return blob;
    }
    if(type==='ArrayBuffer')return base64ToBytes(value.data,`${path}.data`).buffer;
    if(type==='TypedArray'){
      const bytes=base64ToBytes(value.data,`${path}.data`);
      const constructors={
        Int8Array,Uint8Array,Uint8ClampedArray,Int16Array,Uint16Array,
        Int32Array,Uint32Array,Float32Array,Float64Array,
        ...(typeof BigInt64Array!=='undefined'?{BigInt64Array}:{}),
        ...(typeof BigUint64Array!=='undefined'?{BigUint64Array}:{})
      };
      const Constructor=constructors[value.constructor];
      if(!Constructor)throw new ArchiveVerificationError(
        'archive_typed_array_unsupported',
        `Unsupported typed array at ${path}.`,
        {path,constructor:value.constructor}
      );
      const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
      return new Constructor(buffer);
    }
    if(type==='Date')return new Date(value.value);
    if(type==='RegExp')return new RegExp(value.source,value.flags);
    if(type==='Map')return new Map(await Promise.all(
      (value.entries||[]).map(async(entry,index)=>[
        await decodeValue(entry[0],`${path}.mapKey[${index}]`),
        await decodeValue(entry[1],`${path}.mapValue[${index}]`)
      ])
    ));
    if(type==='Set')return new Set(await Promise.all(
      (value.values||[]).map((item,index)=>decodeValue(item,`${path}.set[${index}]`))
    ));
    const source=type==='StructuredObject'?value.properties:value;
    const output={};
    for(const [key,item] of Object.entries(source||{})){
      if(key==='__outbaseType')continue;
      output[key]=await decodeValue(item,`${path}.${key}`);
    }
    return output;
  }

  function requestResult(request){
    return new Promise((resolve,reject)=>{
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||new Error('IndexedDB request failed'));
    });
  }

  function bytesToBase64(bytes){
    const chunkSize=0x8000;
    let binary='';
    for(let offset=0;offset<bytes.length;offset+=chunkSize){
      binary+=String.fromCharCode(...bytes.subarray(offset,Math.min(offset+chunkSize,bytes.length)));
    }
    return btoa(binary);
  }

  async function canonicalValue(value,seen=new WeakSet()){
    if(value===null||typeof value==='string'||typeof value==='boolean')return value;
    if(typeof value==='undefined')return {type:'Undefined'};
    if(typeof value==='bigint')return {type:'BigInt',value:String(value)};
    if(typeof value==='number'){
      return Number.isFinite(value)?value:{type:'Number',value:String(value)};
    }
    if(value instanceof Blob){
      const isFile=typeof File!=='undefined'&&value instanceof File;
      return {
        type:isFile?'File':'Blob',
        mediaType:value.type||'',
        size:value.size,
        ...(isFile?{name:value.name,lastModified:value.lastModified}:{}),
        data:bytesToBase64(new Uint8Array(await value.arrayBuffer()))
      };
    }
    if(value instanceof Date)return {type:'Date',value:value.toISOString()};
    if(value instanceof RegExp)return {type:'RegExp',source:value.source,flags:value.flags};
    if(value instanceof ArrayBuffer){
      return {type:'ArrayBuffer',data:bytesToBase64(new Uint8Array(value))};
    }
    if(ArrayBuffer.isView(value)){
      return {
        type:value.constructor?.name||'TypedArray',
        data:bytesToBase64(new Uint8Array(value.buffer,value.byteOffset,value.byteLength))
      };
    }
    if(seen.has(value))throw new ArchiveVerificationError(
      'archive_roundtrip_cycle',
      'A circular value cannot be compared after isolated restore.'
    );
    seen.add(value);
    try{
      if(Array.isArray(value)){
        return Promise.all(value.map(item=>canonicalValue(item,seen)));
      }
      if(value instanceof Map){
        const entries=[];
        for(const [key,item] of value.entries()){
          entries.push([await canonicalValue(key,seen),await canonicalValue(item,seen)]);
        }
        return {type:'Map',entries};
      }
      if(value instanceof Set){
        const values=[];
        for(const item of value.values())values.push(await canonicalValue(item,seen));
        return {type:'Set',values};
      }
      const output={};
      for(const key of Object.keys(value).sort()){
        output[key]=await canonicalValue(value[key],seen);
      }
      return output;
    }finally{
      seen.delete(value);
    }
  }

  async function assertRoundTrip(store,row,databaseName,storeName,index){
    const restored=await requestResult(store.get(row.key));
    if(restored===undefined)throw new ArchiveVerificationError(
      'archive_row_missing',
      `Restored row is missing for ${databaseName}/${storeName}.`,
      {database:databaseName,store:storeName,index,key:row.key}
    );
    const expected=JSON.stringify(await canonicalValue(row.value));
    const actual=JSON.stringify(await canonicalValue(restored));
    if(expected!==actual)throw new ArchiveVerificationError(
      'archive_row_mismatch',
      `Restored row differs for ${databaseName}/${storeName}.`,
      {database:databaseName,store:storeName,index,key:row.key}
    );
  }

  function transactionComplete(tx){
    return new Promise((resolve,reject)=>{
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error||new Error('IndexedDB transaction failed'));
      tx.onabort=()=>reject(tx.error||new Error('IndexedDB transaction aborted'));
    });
  }

  function deleteDatabase(name){
    return new Promise((resolve,reject)=>{
      const request=indexedDB.deleteDatabase(name);
      request.onsuccess=()=>resolve();
      request.onerror=()=>reject(request.error||new Error(`Unable to delete ${name}`));
      request.onblocked=()=>reject(new Error(`Delete blocked for ${name}`));
    });
  }

  async function verifyDatabase(database,verificationId){
    if(database.exists===false)return Object.freeze({
      source:database.name,exists:false,stores:0,rows:0,passed:true
    });
    const tempName=`${TEMP_PREFIX}${verificationId}_${String(database.name).replace(/[^a-z0-9_-]/gi,'_')}`;
    let db=null;
    try{
      const request=indexedDB.open(tempName,1);
      request.onupgradeneeded=()=>{
        const target=request.result;
        for(const definition of database.stores||[]){
          const store=target.createObjectStore(definition.name,{
            keyPath:definition.keyPath??null,
            autoIncrement:Boolean(definition.autoIncrement)
          });
          for(const index of definition.indexes||[]){
            store.createIndex(index.name,index.keyPath,{
              unique:Boolean(index.unique),
              multiEntry:Boolean(index.multiEntry)
            });
          }
        }
      };
      db=await requestResult(request);
      for(const definition of database.stores||[]){
        const rows=definition.rows||[];
        const decoded=[];
        for(let index=0;index<rows.length;index++){
          decoded.push({
            key:await decodeValue(rows[index].key,`${database.name}.${definition.name}[${index}].key`),
            value:await decodeValue(rows[index].value,`${database.name}.${definition.name}[${index}].value`)
          });
        }
        if(decoded.length){
          const tx=db.transaction(definition.name,'readwrite');
          const store=tx.objectStore(definition.name);
          for(const row of decoded){
            if(store.keyPath===null)store.put(row.value,row.key);
            else store.put(row.value);
          }
          await transactionComplete(tx);
        }
        const count=await requestResult(
          db.transaction(definition.name,'readonly').objectStore(definition.name).count()
        );
        if(count!==Number(definition.count))throw new ArchiveVerificationError(
          'archive_store_count_mismatch',
          `Store count mismatch for ${database.name}/${definition.name}.`,
          {database:database.name,store:definition.name,expected:Number(definition.count),actual:count}
        );
        for(let index=0;index<decoded.length;index++){
          const readStore=db.transaction(definition.name,'readonly').objectStore(definition.name);
          await assertRoundTrip(readStore,decoded[index],database.name,definition.name,index);
        }
      }
      return Object.freeze({
        source:database.name,
        exists:true,
        stores:(database.stores||[]).length,
        rows:(database.stores||[]).reduce((sum,store)=>sum+Number(store.count||0),0),
        passed:true
      });
    }finally{
      db?.close();
      try{await deleteDatabase(tempName);}catch(error){
        if(!db)throw error;
        console.warn('[OUTBASE archive verifier] Temporary database cleanup failed.',error);
      }
    }
  }

  function storageSnapshot(storage){
    const entries=[];
    for(let index=0;index<storage.length;index++){
      const key=storage.key(index);
      if(key!==null)entries.push([key,storage.getItem(key)]);
    }
    return JSON.stringify(entries.sort(([a],[b])=>a.localeCompare(b)));
  }

  async function verify(input,{explicit=false}={}){
    globalThis.OUTBASE_PERSISTENCE_GUARD_V1?.requireExplicit?.('isolatedArchiveValidation',{
      explicit,
      source:'isolated-archive-verifier'
    });
    if(!('indexedDB' in globalThis))throw new ArchiveVerificationError(
      'indexeddb_unavailable','IndexedDB is unavailable.'
    );
    let archive;
    try{archive=typeof input==='string'?JSON.parse(input):input;}
    catch(error){throw new ArchiveVerificationError(
      'archive_json_invalid','Archive JSON is invalid.',{error:String(error?.message||error)}
    );}
    if(archive?.manifest?.format!==FORMAT||
      Number(archive?.manifest?.formatVersion)!==FORMAT_VERSION){
      throw new ArchiveVerificationError(
        'archive_format_invalid','Archive format or version is unsupported.',
        {format:archive?.manifest?.format,formatVersion:archive?.manifest?.formatVersion}
      );
    }
    const localBefore=storageSnapshot(localStorage);
    const verificationId=globalThis.crypto?.randomUUID?.()||
      `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const databases=[];
    try{
      for(const database of archive.indexedDB||[]){
        databases.push(await verifyDatabase(database,verificationId));
      }
      const manifestByName=new Map(
        (archive.manifest.databases||[]).map(database=>[database.name,database])
      );
      for(const database of archive.indexedDB||[]){
        const manifest=manifestByName.get(database.name);
        if(!manifest)throw new ArchiveVerificationError(
          'archive_manifest_database_missing',
          `Manifest entry missing for ${database.name}.`,
          {database:database.name}
        );
        if(Number(manifest.count)!==Number(database.count))throw new ArchiveVerificationError(
          'archive_manifest_count_mismatch',
          `Manifest count mismatch for ${database.name}.`,
          {database:database.name,manifest:manifest.count,archive:database.count}
        );
        const manifestStores=new Map(
          (manifest.stores||[]).map(store=>[store.name,Number(store.count)])
        );
        for(const store of database.stores||[]){
          if(!manifestStores.has(store.name))throw new ArchiveVerificationError(
            'archive_manifest_store_missing',
            `Manifest store entry missing for ${database.name}/${store.name}.`,
            {database:database.name,store:store.name}
          );
          if(manifestStores.get(store.name)!==Number(store.count))throw new ArchiveVerificationError(
            'archive_manifest_store_count_mismatch',
            `Manifest store count mismatch for ${database.name}/${store.name}.`,
            {
              database:database.name,
              store:store.name,
              manifest:manifestStores.get(store.name),
              archive:Number(store.count)
            }
          );
        }
      }
      if(localBefore!==storageSnapshot(localStorage))throw new ArchiveVerificationError(
        'archive_verification_changed_local_storage',
        'localStorage changed during isolated verification.'
      );
      return Object.freeze({
        ok:true,
        verificationId,
        productionRestoreEnabled:false,
        currentDatabasesModified:false,
        localStorageModified:false,
        databases:Object.freeze(databases),
        verifiedAt:new Date().toISOString()
      });
    }catch(error){
      if(error instanceof ArchiveVerificationError)throw error;
      throw new ArchiveVerificationError(
        'archive_verification_failed',
        'Archive verification failed.',
        {error:String(error?.message||error)}
      );
    }
  }

  globalThis.OUTBASE_ISOLATED_ARCHIVE_VERIFIER_V1=Object.freeze({
    FORMAT,
    FORMAT_VERSION,
    TEMP_PREFIX,
    ArchiveVerificationError,
    decodeValue,
    canonicalValue,
    verify,
    productionRestoreEnabled:false
  });
})();
