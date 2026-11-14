(() => {
  'use strict';
  const drafts=new Map();
  const sessions=new Map();
  const MAX_MS=5*60*1000,MAX_BYTES=20*1024*1024;
  let active=null;
  function snapshot(id){return drafts.get(id)||{status:'idle',notice:'',file:null};}
  function notify(id){globalThis.dispatchEvent(new CustomEvent('outbase:audio-change',{detail:{activityId:id}}));}
  function release(session){
    clearTimeout(session.timer);session.stream?.getTracks().forEach(track=>track.stop());
    if(active===session)active=null;
  }
  function stop(id){
    const session=active;if(!session||session.id!==id)return;
    if(!session.recorder){session.cancelled=true;release(session);sessions.delete(id);drafts.set(id,{status:'idle',notice:'録音を開始しませんでした。',file:null});notify(id);return;}
    if(session.recorder.state!=='inactive'){
      drafts.set(id,{...snapshot(id),status:'stopping'});
      try{session.recorder.stop();}catch(_error){session.failure='録音を停止できませんでした。もう一度お試しください。';sessions.delete(id);drafts.set(id,{status:'error',notice:session.failure,file:null});}
    }
    release(session);notify(id);
  }
  function cancel(id){
    const session=sessions.get(id);
    if(session){session.discard=true;if(active===session)stop(id);else sessions.delete(id);}
    drafts.delete(id);notify(id);
  }
  async function start(id){
    if(!id||active||['requesting','recording','stopping'].includes(snapshot(id).status))return;
    const session={id,chunks:[],size:0,cancelled:false,discard:false};active=session;sessions.set(id,session);
    drafts.set(id,{status:'requesting',notice:'マイクの許可を待っています。',file:null});notify(id);
    try{
      if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'||typeof MediaRecorder.isTypeSupported!=='function')throw new Error('unsupported_recorder');
      const mime=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(type=>MediaRecorder.isTypeSupported(type));
      if(!mime)throw new Error('unsupported_recorder');
      session.stream=await navigator.mediaDevices.getUserMedia({audio:true});
      if(session.cancelled||active!==session){release(session);return;}
      const recorder=new MediaRecorder(session.stream,{mimeType:mime});session.recorder=recorder;
      recorder.ondataavailable=event=>{
        if(sessions.get(id)!==session||session.discard)return;
        if(!event.data?.size)return;session.chunks.push(event.data);session.size+=event.data.size;
        if(session.size>MAX_BYTES){session.failure='録音が20MBを超えたため停止しました。短く録り直してください。';stop(id);}
      };
      recorder.onerror=()=>{if(sessions.get(id)!==session)return;session.failure='録音できませんでした。もう一度お試しください。';stop(id);};
      recorder.onstop=()=>{
        release(session);
        if(sessions.get(id)!==session)return;sessions.delete(id);
        if(session.discard){drafts.delete(id);notify(id);return;}
        const blob=new Blob(session.chunks,{type:recorder.mimeType||mime});
        if(session.failure||!blob.size){drafts.set(id,{status:'error',notice:session.failure||'音声を取得できませんでした。もう一度お試しください。',file:null});}
        else{
          const extension=blob.type.startsWith('audio/mp4')?'m4a':blob.type.startsWith('audio/ogg')?'ogg':'webm';
          const file=new File([blob],`voice-${new Date().toISOString().replace(/[:.]/g,'-')}.${extension}`,{type:blob.type});
          drafts.set(id,{status:'ready',notice:'録音はまだ保存されていません。再生して確認し、保存してください。',file,requestId:globalThis.OUTBASE_IDS.ulid()});
        }
        notify(id);
      };
      recorder.start(1000);drafts.set(id,{status:'recording',notice:'録音中です。',file:null,startedAt:Date.now()});
      session.timer=setTimeout(()=>{if(active===session)stop(id);},MAX_MS);notify(id);
    }catch(error){
      release(session);if(session.cancelled||session.discard||sessions.get(id)!==session)return;sessions.delete(id);
      drafts.set(id,{status:'error',notice:error?.name==='NotAllowedError'?'マイクが許可されていません。ブラウザの設定で許可してからお試しください。':error?.message==='unsupported_recorder'?'このブラウザでは録音できません。対応するChromeなどで開いてください。':'録音を開始できませんでした。マイクの接続・使用状況を確認してください。',file:null});notify(id);
    }
  }
  function leave(){if(active)stop(active.id);}
  addEventListener('pagehide',leave);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')leave();});
  addEventListener('outbase:navigation',()=>{const route=globalThis.OUTBASE_ROUTER?.current?.();if(active&&(route?.name!=='record'||route.activityId!==active.id))leave();});
  globalThis.OUTBASE_AUDIO_RECORDER=Object.freeze({snapshot,start,stop,cancel,MAX_MS,MAX_BYTES});
})();
