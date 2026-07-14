(() => {
  'use strict';

  async function start(options={}){
    try{
      await globalThis.OUTBASE_DB_V160.open();
      const result=await globalThis.OUTBASE_MIGRATIONS_V160.run(options);
      const report=await globalThis.OUTBASE_DB_V160.schemaReport();
      const detail={...result,database:report,cutover:false,legacy_data_untouched:true};
      globalThis.dispatchEvent(new CustomEvent('outbase:data-v160-ready',{detail}));
      if(detail.status==='deferred_active_session'){
        console.info('[OUTBASE v160] Phase 1 migration deferred to protect the active FIELD03 session.',detail);
      }else{
        console.info('[OUTBASE v160] Phase 1 shadow data foundation ready.',detail);
      }
      return detail;
    }catch(error){
      const detail={status:'failed',error:String(error?.message||error),cutover:false,legacy_data_untouched:true};
      globalThis.dispatchEvent(new CustomEvent('outbase:data-v160-error',{detail}));
      console.error('[OUTBASE v160] Phase 1 shadow migration failed.',error);
      return detail;
    }
  }

  const ready=new Promise(resolve=>{
    const run=()=>start().then(resolve);
    if('requestIdleCallback' in globalThis)requestIdleCallback(run,{timeout:2500});
    else setTimeout(run,0);
  });

  async function exportReport(){
    const [migration,database,legacySnapshot]=await Promise.all([
      globalThis.OUTBASE_MIGRATIONS_V160.status(),
      globalThis.OUTBASE_DB_V160.schemaReport(),
      globalThis.OUTBASE_LEGACY_ADAPTER_V160.snapshot()
    ]);
    return {generated_at:new Date().toISOString(),migration,database,legacy:legacySnapshot,cutover:false};
  }

  globalThis.OUTBASE_DATA_V160=Object.freeze({
    ready,
    runMigration:options=>start(options),
    exportReport,
    rollback:()=>globalThis.OUTBASE_MIGRATIONS_V160.rollback(),
    repositories:globalThis.OUTBASE_REPOSITORIES_V160,
    legacy:globalThis.OUTBASE_LEGACY_ADAPTER_V160
  });
})();
