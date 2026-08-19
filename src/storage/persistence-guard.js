(() => {
  'use strict';

  const FLAG_SOURCE='OUTBASE_R1_STORAGE_FLAGS';
  const DEFAULT_FLAGS=Object.freeze({
    shadowMigration:false,
    baselinePersistence:false,
    legacyIdWrite:false,
    navigationContract:false,
    contextPersistence:false,
    storySchemaInit:false,
    domainContracts:false,
    legacyCleanup:false,
    legacyCoreMigration:false,
    isolatedArchiveValidation:false,
    productionRestore:false
  });

  class PersistenceGuardError extends Error{
    constructor(code,message,detail={}){
      super(message);
      this.name='PersistenceGuardError';
      this.code=code;
      this.detail=Object.freeze({...detail});
    }
  }

  function flags(){
    const supplied=globalThis[FLAG_SOURCE];
    return Object.freeze({
      ...DEFAULT_FLAGS,
      ...(supplied&&typeof supplied==='object'?supplied:{})
    });
  }

  function enabled(name){
    return flags()[name]===true;
  }

  function requireExplicit(name,{explicit=false,source='unknown'}={}){
    if(explicit===true||enabled(name))return true;
    throw new PersistenceGuardError(
      'implicit_persistence_blocked',
      `Persistent operation "${name}" requires an explicit action or enabled flag.`,
      {operation:name,source,flags:flags()}
    );
  }

  function assertSupportedOutbaseDbVersion(requestedVersion,currentVersion,{source='unknown'}={}){
    const requested=Number(requestedVersion);
    const current=Number(currentVersion);
    if(Number.isFinite(requested)&&requested<current){
      throw new PersistenceGuardError(
        'outbase_db_version_regression',
        `Refusing to open outbase_db at old version ${requested}; current owner version is ${current}.`,
        {requestedVersion:requested,currentVersion:current,source}
      );
    }
    return true;
  }

  function assertActivitylessMemo({activityId=null,activityCreated=false,source='unknown'}={}){
    if(!activityId&&activityCreated){
      throw new PersistenceGuardError(
        'synthetic_activity_forbidden',
        'An activity-less memo must not create a synthetic activity.',
        {source}
      );
    }
    return true;
  }

  function assertViewIsReadOnly({writeAttempted=false,source='unknown',operation='unknown'}={}){
    if(writeAttempted){
      throw new PersistenceGuardError(
        'view_triggered_write',
        `A view-only path attempted persistent operation "${operation}".`,
        {source,operation}
      );
    }
    return true;
  }

  globalThis.OUTBASE_PERSISTENCE_GUARD_V1=Object.freeze({
    FLAG_SOURCE,
    DEFAULT_FLAGS,
    PersistenceGuardError,
    flags,
    enabled,
    requireExplicit,
    assertSupportedOutbaseDbVersion,
    assertActivitylessMemo,
    assertViewIsReadOnly
  });
})();
