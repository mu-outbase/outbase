(() => {
  'use strict';

  const db=()=>globalThis.OUTBASE_DB_V160;
  const ids=()=>globalThis.OUTBASE_IDS;
  const validation=()=>globalThis.OUTBASE_VALIDATION;

  class Repository{
    constructor(storeName,normalizer=null){this.storeName=storeName;this.normalizer=normalizer;}
    async get(id){return db().get(this.storeName,id);}
    async all(){return db().getAll(this.storeName);}
    async byIndex(indexName,value){return db().getAllByIndex(this.storeName,indexName,value);}
    async page(options={}){return db().page(this.storeName,options);}
    async byLegacyRef(legacyRef){
      if(!legacyRef)return null;
      try{
        const rows=await this.byIndex('legacy_ref',legacyRef);
        return rows[0]||null;
      }catch(error){
        if(error?.name!=='NotFoundError')throw error;
        return (await this.all()).find(row=>row.legacy_ref===legacyRef)||null;
      }
    }
    normalize(input,defaults={}){
      if(this.normalizer)return this.normalizer(input,defaults);
      const now=ids().nowIso();
      return {
        ...input,
        id:input.id||ids().ulid(),
        schema_version:Number(input.schema_version||1),
        created_at:input.created_at||now,
        updated_at:input.updated_at||now,
        deleted_at:input.deleted_at||null
      };
    }
    async save(input,defaults={}){
      const value=this.normalize({...input,updated_at:ids().nowIso()},defaults);
      await db().put(this.storeName,value);
      return value;
    }
    async saveMany(inputs,defaults={}){
      const values=(inputs||[]).map(item=>this.normalize({...item,updated_at:ids().nowIso()},defaults));
      await db().bulkPut(this.storeName,values);
      return values;
    }
    async ensure(id,defaults={}){
      const current=await this.get(id);
      return this.save({...defaults,...current,id,created_at:current?.created_at||defaults.created_at});
    }
    async upsertByLegacyRef(legacyRef,input,defaults={}){
      const current=await this.byLegacyRef(legacyRef);
      const value=this.normalize({
        ...current,
        ...input,
        id:current?.id||input.id,
        legacy_ref:legacyRef,
        created_at:current?.created_at||input.created_at,
        updated_at:ids().nowIso()
      },defaults);
      await db().put(this.storeName,value);
      return value;
    }
    async softDelete(id,actorId=''){
      const current=await this.get(id);
      if(!current)return null;
      return this.save({...current,deleted_at:ids().nowIso(),updated_by:actorId||current.updated_by});
    }
  }

  class ActivityRepository extends Repository{
    constructor(){super('activities',(input,defaults)=>validation().activity(input,defaults));}
    async active(householdId){
      const rows=await this.byIndex('household_id',householdId);
      return rows.filter(row=>!row.deleted_at&&['active','paused'].includes(row.state));
    }
  }

  class RecordRepository extends Repository{
    constructor(){super('records',(input,defaults)=>validation().record(input,defaults));}
    async forActivity(activityId){
      const rows=await this.byIndex('activity_id',activityId);
      return rows.filter(row=>!row.deleted_at).sort((a,b)=>String(a.occurred_at).localeCompare(String(b.occurred_at)));
    }
  }

  const repositories={
    appMeta:new Repository('app_meta'),
    households:new Repository('households'),
    accounts:new Repository('accounts'),
    members:new Repository('members'),
    pets:new Repository('pets'),
    activities:new ActivityRepository(),
    activityParticipants:new Repository('activity_participants'),
    activityTransitions:new Repository('activity_transitions'),
    calendarEntries:new Repository('calendar_entries'),
    preparationItems:new Repository('preparation_items'),
    records:new RecordRepository(),
    media:new Repository('media'),
    gpsChunks:new Repository('gps_chunks'),
    places:new Repository('places'),
    routes:new Repository('routes'),
    routePoints:new Repository('route_points'),
    assets:new Repository('assets'),
    activityAssets:new Repository('activity_assets'),
    meals:new Repository('meals'),
    mealItems:new Repository('meal_items'),
    shoppingLists:new Repository('shopping_lists'),
    shoppingItems:new Repository('shopping_items'),
    reviews:new Repository('reviews'),
    improvementItems:new Repository('improvement_items'),
    visibilityRules:new Repository('visibility_rules'),
    syncOperations:new Repository('sync_operations'),
    changeHistory:new Repository('change_history'),
    migrationSnapshots:new Repository('migration_snapshots')
  };

  async function runtimeContext(){return repositories.appMeta.get('runtime_context');}
  async function setCurrentActivity(activityId,extra={}){
    const current=await runtimeContext();
    return repositories.appMeta.save({
      ...current,
      ...extra,
      id:'runtime_context',
      current_activity_id:activityId||null,
      mode:extra.mode||current?.mode||'legacy-shadow',
      updated_at:ids().nowIso()
    });
  }

  globalThis.OUTBASE_REPOSITORIES_V160=Object.freeze({Repository,...repositories,runtimeContext,setCurrentActivity});
})();
