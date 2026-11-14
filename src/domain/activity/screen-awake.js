(() => {
  'use strict';
  let intent='',sentinel=null,pending=false,generation=0;
  const notices=new Map();
  const current=id=>{const route=globalThis.OUTBASE_ROUTER?.current?.();return route?.name==='record'&&route.activityId===id;};
  function emit(id){if(id)globalThis.dispatchEvent(new CustomEvent('outbase:screen-awake-change',{detail:{activityId:id}}));}
  function release(lock){try{Promise.resolve(lock?.release()).catch(()=>{});}catch(_error){}}
  function disable(message='画面の点灯維持を解除しました。'){
    const id=intent;generation++;intent='';pending=false;const old=sentinel;sentinel=null;release(old);
    if(id){notices.set(id,message);emit(id);}
  }
  async function acquire(id){
    const token=++generation;pending=true;notices.set(id,'画面の点灯維持を設定しています。');emit(id);
    let acquired=null;
    try{
      const row=await globalThis.OUTBASE_REPOSITORIES_V160.activities.get(id);
      if(token!==generation||intent!==id)return;
      if(!row||row.deleted_at||row.state!=='active'||!current(id)){disable();return;}
      if(document.hidden){pending=false;notices.set(id,'画面を開くと点灯維持を再設定します。');emit(id);return;}
      if(!navigator.wakeLock?.request){disable('この端末では画面の点灯維持を利用できません。');return;}
      const lock=await navigator.wakeLock.request('screen');acquired=lock;
      const fresh=await globalThis.OUTBASE_REPOSITORIES_V160.activities.get(id);
      if(token!==generation||intent!==id||document.hidden||!current(id)||!fresh||fresh.deleted_at||fresh.state!=='active'){release(lock);if(token===generation&&intent===id)disable();return;}
      if(lock.released)throw Error('screen_lock_released');
      sentinel=lock;pending=false;notices.set(id,'画面の点灯を維持しています。');
      lock.addEventListener('release',()=>{
        if(sentinel!==lock)return;sentinel=null;
        if(document.hidden){notices.set(id,'画面を開くと点灯維持を再設定します。');}
        else{intent='';notices.set(id,'端末により点灯維持が解除されました。必要ならもう一度ONにしてください。');}
        emit(id);
      });emit(id);
    }catch(_error){release(acquired);if(token===generation&&intent===id)disable('画面の点灯維持が許可されませんでした。省電力設定などを確認してください。');}
  }
  async function toggle(id){
    if(intent===id){disable();return;}
    if(intent)disable();intent=id;await acquire(id);
  }
  document.addEventListener('visibilitychange',()=>{
    if(!intent)return;
    if(document.hidden){generation++;pending=false;const old=sentinel;sentinel=null;release(old);notices.set(intent,'画面を開くと点灯維持を再設定します。GPSは実行画面で再開してください。');emit(intent);}
    else if(!sentinel&&!pending)acquire(intent);
  });
  globalThis.addEventListener('pagehide',()=>disable());
  globalThis.addEventListener('outbase:navigation',()=>{if(intent&&!current(intent))disable();});
  globalThis.OUTBASE_SCREEN_AWAKE=Object.freeze({toggle,disable,snapshot:id=>({enabled:intent===id,held:intent===id&&Boolean(sentinel&&!sentinel.released),pending:intent===id&&pending,notice:notices.get(id)||''})});
})();
