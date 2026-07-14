(() => {
  'use strict';
  const stack=[];const listeners=new Set();
  function snapshot(){return Object.freeze(stack.map(item=>Object.freeze({...item})));}
  function emit(reason){const value=snapshot();listeners.forEach(listener=>{try{listener(value,reason);}catch(error){console.error('[OUTBASE modal]',error);}});return value;}
  function open(id,payload={}){
    if(!id)throw new Error('modal id is required');
    stack.push({id,payload,openedAt:new Date().toISOString()});
    history.pushState({...(history.state||{}),outbaseModal:id},'',location.href);
    return emit('open');
  }
  function close({historyBack=true}={}){
    if(!stack.length)return snapshot();
    stack.pop();emit('close');if(historyBack)history.back();return snapshot();
  }
  function clear(){if(!stack.length)return snapshot();stack.splice(0);return emit('clear');}
  function top(){return stack[stack.length-1]||null;}
  function subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);}
  addEventListener('popstate',()=>{if(stack.length){stack.pop();emit('back');}});
  globalThis.OUTBASE_MODAL_STACK_V164=Object.freeze({open,close,clear,top,snapshot,subscribe});
})();
