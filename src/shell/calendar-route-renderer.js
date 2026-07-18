(() => {
  'use strict';
  const router=globalThis.OUTBASE_ROUTER;
  const base=globalThis.OUTBASE_SHELL_RENDERER_V166||globalThis.OUTBASE_SHELL_RENDERER_V165;
  if(!router||!base)throw new Error('OUTBASE calendar route dependencies are missing');
  async function mount(root,options={}){
    const result=await base.mount(root,options);
    if(router.current().name!=='calendar')return result;
    const calendar=globalThis.OUTBASE_CALENDAR_V2;
    if(calendar?.ready)await calendar.ready;
    if(!calendar?.mountRoute?.(root))throw new Error('OUTBASE calendar route mount failed');
    return result;
  }
  const renderer=Object.freeze({...base,mount});
  globalThis.OUTBASE_SHELL_RENDERER_V166=renderer;
  globalThis.OUTBASE_SHELL_RENDERER_V165=renderer;
})();
