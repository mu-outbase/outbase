(() => {
  'use strict';

  const MAX_BYTES=20*1024*1024;
  const TYPES=new Set(['image/jpeg','image/png','image/webp','image/gif']);
  const PREFIX='story-photo:';
  const pending=new Map();
  function keyFor(row){
    const ref=row?.local_ref;
    if(!ref?.key)return '';
    return ref.database==='outbase_story_db'&&ref.store==='media'?PREFIX+ref.key:String(ref.key);
  }
  async function readBlob(key){
    if(!String(key).startsWith(PREFIX))return globalThis.OUTBASE_LEGACY_ADAPTER_V160?.getRecordBlob?.(key)||null;
    const row=await globalThis.OUTBASE_DB_V160.get('media',String(key).slice(PREFIX.length));
    return row&&!row.deleted_at&&row.media_type==='photo'&&row.blob instanceof Blob?row.blob:null;
  }
  async function save({activityId,displayActivityId,file,requestId}){
    if(!activityId||activityId!==displayActivityId)throw new Error('photo_context_mismatch');
    if(!(file instanceof Blob)||!TYPES.has(file.type)||!file.size||file.size>MAX_BYTES)throw new Error('photo_file_not_supported');
    if(!globalThis.OUTBASE_IDS.isUlid(requestId))throw new Error('photo_request_id_required');
    if(pending.has(requestId)){
      const prior=pending.get(requestId);
      if(prior.activityId!==activityId||prior.file!==file)throw new Error('photo_request_conflict');
      return prior.work;
    }
    const work=(async()=>{
      const repo=globalThis.OUTBASE_REPOSITORIES_V160;
      const activity=await repo.activities.get(activityId);
      if(!activity||activity.deleted_at)throw new Error('photo_activity_not_found');
      const decoded=await createImageBitmap(file);decoded.close();
      const record=repo.records.normalize({id:requestId,household_id:activity.household_id,activity_id:activityId,type:'photo',visibility:'private',
        occurred_at:new Date().toISOString(),client_request_id:requestId,
        payload:{title:file.name||'写真',filename:file.name||'photo',media_id:requestId},source:'execution-photo-v1'});
      const media=repo.media.normalize({id:requestId,household_id:activity.household_id,record_id:record.id,activity_id:activityId,media_type:'photo',
        blob:file,mime_type:file.type,size:file.size,filename:file.name||'photo',last_modified:Number.isFinite(file.lastModified)?file.lastModified:null,
        local_ref:{database:'outbase_story_db',store:'media',key:requestId},client_request_id:requestId,source:'execution-photo-v1'});
      globalThis.OUTBASE_VALIDATION.assertEntity('records',record);
      globalThis.OUTBASE_VALIDATION.assertEntity('media',media);
      const result={record:null,media:null,deduplicated:false,error:null};
      // Blob, metadata and record commit together. Activity deletion and retry
      // checks happen inside the same transaction as the writes.
      try{
        await globalThis.OUTBASE_DB_V160.transaction(['activities','records','media'],'readwrite',tx=>{
          const fail=error=>{result.error=error;tx.abort();};
          const activityRequest=tx.objectStore('activities').get(activityId);
          activityRequest.onsuccess=()=>{
            if(!activityRequest.result||activityRequest.result.deleted_at){fail(new Error('photo_activity_not_found'));return;}
            const recordRequest=tx.objectStore('records').get(requestId);
            const mediaRequest=tx.objectStore('media').get(requestId);
            let loaded=0;
            const ready=()=>{
              if(++loaded!==2)return;
              try{
                if(recordRequest.result||mediaRequest.result){
                  const prior=recordRequest.result,priorMedia=mediaRequest.result;
                  if(!prior||!priorMedia||prior.deleted_at||priorMedia.deleted_at||prior.type!=='photo'||prior.activity_id!==activityId||priorMedia.media_type!=='photo'||!(priorMedia.blob instanceof Blob)||priorMedia.record_id!==prior.id||priorMedia.activity_id!==activityId)throw new Error('photo_request_conflict');
                  result.record=prior;result.media=priorMedia;result.deduplicated=true;return;
                }
                tx.objectStore('records').put(record);
                tx.objectStore('media').put(media);
                result.record=record;result.media=media;
              }catch(error){fail(error);}
            };
            recordRequest.onsuccess=mediaRequest.onsuccess=ready;
          };
        });
      }catch(error){throw result.error||error;}
      return result;
    })();
    pending.set(requestId,{activityId,file,work});
    try{return await work;}finally{if(pending.get(requestId)?.work===work)pending.delete(requestId);}
  }

  globalThis.OUTBASE_PHOTO_RECORDS=Object.freeze({save,readBlob,keyFor,MAX_BYTES});
})();
