(() => {
  'use strict';

  const registry=new Map();

  class ExplicitMaintenanceError extends Error{
    constructor(code,message,detail={}){
      super(message);
      this.name='ExplicitMaintenanceError';
      this.code=code;
      this.detail=Object.freeze({...detail});
    }
  }

  function register(name,worker){
    if(!name||typeof worker!=='function')throw new ExplicitMaintenanceError(
      'maintenance_registration_invalid',
      'Maintenance registration requires a name and worker.',
      {name}
    );
    registry.set(String(name),worker);
    return true;
  }

  async function run(name,{explicit=false,payload=null}={}){
    globalThis.OUTBASE_PERSISTENCE_GUARD_V1?.requireExplicit?.('legacyCleanup',{
      explicit,
      source:`explicit-maintenance:${name}`
    });
    const worker=registry.get(String(name));
    if(!worker)throw new ExplicitMaintenanceError(
      'maintenance_operation_unknown',
      `Unknown maintenance operation: ${name}`,
      {name,available:[...registry.keys()]}
    );
    try{
      const result=await worker(payload);
      return Object.freeze({ok:true,name:String(name),result:result??null});
    }catch(error){
      throw new ExplicitMaintenanceError(
        'maintenance_operation_failed',
        `Maintenance operation failed: ${name}`,
        {name,error:String(error?.message||error)}
      );
    }
  }

  globalThis.OUTBASE_EXPLICIT_MAINTENANCE_V1=Object.freeze({
    ExplicitMaintenanceError,
    register,
    run,
    available:()=>Object.freeze([...registry.keys()])
  });
})();
