(() => {
  'use strict';

  const phases=[];
  let state='created';
  let error=null;

  function emit(next,detail={}){
    state=next;
    const item=Object.freeze({state:next,at:new Date().toISOString(),...detail});
    phases.push(item);
    globalThis.dispatchEvent(new CustomEvent(`outbase:boot-${next}`,{detail:item}));
    globalThis.dispatchEvent(new CustomEvent('outbase:boot-state',{detail:item}));
    return item;
  }

  function fail(reason,detail={}){
    error=reason instanceof Error?reason:new Error(String(reason||'Unknown startup error'));
    return emit('failed',{...detail,error:error.message});
  }

  function snapshot(){
    return Object.freeze({state,error:error?.message||null,phases:[...phases]});
  }

  globalThis.OUTBASE_LIFECYCLE=Object.freeze({emit,fail,snapshot});
})();
