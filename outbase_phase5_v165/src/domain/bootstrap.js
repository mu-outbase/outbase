(() => {
  'use strict';

  function assertReady(){
    const required=[
      'OUTBASE_DOMAIN_UTILS_V162','OUTBASE_PLAN_DOMAIN_V162','OUTBASE_PREPARATION_DOMAIN_V162','OUTBASE_VAULT_DOMAIN_V162',
      'OUTBASE_PLAN_SCREEN_MODEL_V162','OUTBASE_PREPARATION_SCREEN_MODEL_V162','OUTBASE_VAULT_SCREEN_MODEL_V162'
    ];
    const missing=required.filter(key=>!globalThis[key]);
    if(missing.length)throw new Error(`Phase 2B modules are missing: ${missing.join(', ')}`);
    return required;
  }

  async function snapshot(){
    const [plan,vault]=await Promise.all([
      globalThis.OUTBASE_PLAN_SCREEN_MODEL_V162.build(),
      globalThis.OUTBASE_VAULT_DOMAIN_V162.summary()
    ]);
    return Object.freeze({version:'v162-phase2b',plan:{now:plan.now.length,next:plan.next.length},vault,cutover:false,domReplacement:false});
  }

  const ready=Promise.resolve().then(()=>{
    const modules=assertReady();
    const detail={status:'ready',version:'v162-phase2b',modules,cutover:false,legacy_ui_untouched:true};
    globalThis.dispatchEvent?.(new CustomEvent('outbase:phase2b-ready',{detail}));
    return detail;
  }).catch(error=>{
    const detail={status:'failed',version:'v162-phase2b',error:String(error?.message||error),cutover:false,legacy_ui_untouched:true};
    globalThis.dispatchEvent?.(new CustomEvent('outbase:phase2b-error',{detail}));
    console.error('[OUTBASE v162] Phase 2B domain extraction failed.',error);
    return detail;
  });

  globalThis.OUTBASE_PHASE2B_V162=Object.freeze({ready,snapshot,version:'v162-phase2b'});
})();
