(() => {
  'use strict';

  const MAX_BYTES=20*1024*1024;
  const TYPES=new Set(['image/jpeg','image/png','image/webp','image/gif']);
  const PREFIX='story-photo:';
  const VIDEO_PREFIX='story-video:';
  const VIDEO_MAX_BYTES=50*1024*1024;
  const VIDEO_TYPES=new Set(['video/mp4','video/webm']);
  const AUDIO_PREFIX='story-audio:';
  const AUDIO_TYPES=new Set(['audio/webm','audio/mp4','audio/ogg']);
  const pending=new Map();
  function keyFor(row){
    const ref=row?.local_ref;
    if(!ref?.key)return '';
    return ref.database==='outbase_story_db'&&ref.store==='media'?(row.media_type==='audio'?AUDIO_PREFIX:row.media_type==='video'?VIDEO_PREFIX:PREFIX)+ref.key:String(ref.key);
  }
  async function readBlob(key){
    const kind=String(key).startsWith(PREFIX)?'photo':String(key).startsWith(VIDEO_PREFIX)?'video':String(key).startsWith(AUDIO_PREFIX)?'audio':null;
    if(!kind)return globalThis.OUTBASE_LEGACY_ADAPTER_V160?.getRecordBlob?.(key)||null;
    const row=await globalThis.OUTBASE_DB_V160.get('media',String(key).slice(kind==='photo'?PREFIX.length:kind==='video'?VIDEO_PREFIX.length:AUDIO_PREFIX.length));
    return row&&!row.deleted_at&&row.media_type===kind&&row.blob instanceof Blob?row.blob:null;
  }
  async function validateVideo(file,kind='video'){
    const video=document.createElement(kind==='audio'?'audio':'video');video.preload='auto';video.muted=true;
    const url=URL.createObjectURL(file);let timer;
    try{
      await new Promise((resolve,reject)=>{
        timer=setTimeout(()=>reject(new Error(`${kind}_decode_timeout`)),15000);
        video.onloadeddata=()=>(kind==='audio'?video.duration>0:video.videoWidth&&video.videoHeight)?resolve():reject(new Error(`${kind}_decode_failed`));
        video.onerror=()=>reject(new Error(`${kind}_decode_failed`));
        video.src=url;video.load();
      });
    }finally{clearTimeout(timer);video.pause();video.removeAttribute('src');video.load();URL.revokeObjectURL(url);}
  }
  async function saveMedia({activityId,displayActivityId,file,requestId},kind){
    const types=kind==='audio'?AUDIO_TYPES:kind==='video'?VIDEO_TYPES:TYPES,maxBytes=kind==='video'?VIDEO_MAX_BYTES:MAX_BYTES;
    if(!activityId||activityId!==displayActivityId)throw new Error(`${kind}_context_mismatch`);
    if(!(file instanceof Blob)||!types.has(kind==='audio'?file.type.split(';')[0].trim():file.type)||!file.size||file.size>maxBytes)throw new Error(`${kind}_file_not_supported`);
    if(!globalThis.OUTBASE_IDS.isUlid(requestId))throw new Error(`${kind}_request_id_required`);
    if(pending.has(requestId)){
      const prior=pending.get(requestId);
      if(prior.activityId!==activityId||prior.file!==file||prior.kind!==kind)throw new Error(`${kind}_request_conflict`);
      return prior.work;
    }
    const work=(async()=>{
      const repo=globalThis.OUTBASE_REPOSITORIES_V160;
      const activity=await repo.activities.get(activityId);
      if(!activity||activity.deleted_at)throw new Error(`${kind}_activity_not_found`);
      if(kind==='video'||kind==='audio')await validateVideo(file,kind);
      else{const decoded=await createImageBitmap(file);decoded.close();}
      const record=repo.records.normalize({id:requestId,household_id:activity.household_id,activity_id:activityId,type:kind,visibility:'private',
        occurred_at:new Date().toISOString(),client_request_id:requestId,
        payload:{title:file.name||(kind==='audio'?'音声':kind==='video'?'動画':'写真'),filename:file.name||kind,media_id:requestId},source:`execution-${kind}-v1`});
      const media=repo.media.normalize({id:requestId,household_id:activity.household_id,record_id:record.id,activity_id:activityId,media_type:kind,
        blob:file,mime_type:file.type,size:file.size,filename:file.name||kind,last_modified:Number.isFinite(file.lastModified)?file.lastModified:null,
        local_ref:{database:'outbase_story_db',store:'media',key:requestId},client_request_id:requestId,source:`execution-${kind}-v1`});
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
            if(!activityRequest.result||activityRequest.result.deleted_at){fail(new Error(`${kind}_activity_not_found`));return;}
            const recordRequest=tx.objectStore('records').get(requestId);
            const mediaRequest=tx.objectStore('media').get(requestId);
            let loaded=0;
            const ready=()=>{
              if(++loaded!==2)return;
              try{
                if(recordRequest.result||mediaRequest.result){
                  const prior=recordRequest.result,priorMedia=mediaRequest.result;
                  if(!prior||!priorMedia||prior.deleted_at||priorMedia.deleted_at||prior.type!==kind||prior.activity_id!==activityId||priorMedia.media_type!==kind||!(priorMedia.blob instanceof Blob)||priorMedia.record_id!==prior.id||priorMedia.activity_id!==activityId)throw new Error(`${kind}_request_conflict`);
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
    pending.set(requestId,{activityId,file,kind,work});
    try{return await work;}finally{if(pending.get(requestId)?.work===work)pending.delete(requestId);}
  }

  globalThis.OUTBASE_PHOTO_RECORDS=Object.freeze({save:input=>saveMedia(input,'photo'),readBlob,keyFor,MAX_BYTES});
  globalThis.OUTBASE_VIDEO_RECORDS=Object.freeze({save:input=>saveMedia(input,'video'),readBlob,keyFor,MAX_BYTES:VIDEO_MAX_BYTES});
  globalThis.OUTBASE_AUDIO_RECORDS=Object.freeze({save:input=>saveMedia(input,'audio'),readBlob,keyFor,MAX_BYTES});
})();
