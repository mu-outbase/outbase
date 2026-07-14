const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const now='2026-07-15T00:00:00.000Z';
const activities=[
  {id:'act-camp',household_id:'hh-1',type:'camp',title:'赤城山キャンプ',state:'planned',start_at:'2026-07-20T00:00:00.000Z',end_at:'2026-07-21T00:00:00.000Z',visibility:'household',legacy_ref:'plan:plan-1',metadata:{legacy_plan:{id:'plan-1'}},created_by:'member-1',updated_by:'member-1',created_at:now,updated_at:now},
  {id:'act-walk',household_id:'hh-1',type:'walk',title:'朝の散歩',state:'active',start_at:'2026-07-15T00:00:00.000Z',visibility:'private',legacy_ref:'core_activity:walk-1',created_by:'member-1',updated_by:'member-1',created_at:now,updated_at:now},
  {id:'act-memory',household_id:'hh-1',type:'camp',title:'前回キャンプ',state:'completed',start_at:'2026-06-01T00:00:00.000Z',end_at:'2026-06-02T00:00:00.000Z',visibility:'private',legacy_ref:'plan:old-1',created_by:'member-1',updated_by:'member-1',created_at:now,updated_at:'2026-06-03T00:00:00.000Z'}
];
const calendar=[{id:'cal-1',activity_id:'act-camp',start_at:'2026-07-20T00:00:00.000Z',end_at:'2026-07-21T00:00:00.000Z',all_day:true,timezone:'Asia/Tokyo',reminders:[]}];
const participants=[{id:'p-1',activity_id:'act-camp',participant_id:'member-1',participant_type:'member',role:'creator'}];
const prep=[];
const records=[{id:'rec-1',activity_id:'act-memory',type:'photo',occurred_at:'2026-06-02T01:00:00.000Z',visibility:'private',payload:{name:'photo.jpg'}}];
const media=[{id:'media-1',activity_id:'act-memory',record_id:'rec-1',media_type:'photo'}];
const reviews=[{id:'review-1',activity_id:'act-memory'}];
const improvements=[{id:'imp-1',activity_id:'act-memory',status:'pending'}];
const assets=[{id:'asset-1',asset_type:'gear',name:'ランドロック',status:'active',payload:{brand:'Snow Peak'}}];

const repo=(rows,indexes={})=>({
  async all(){return rows;},async get(id){return rows.find(row=>row.id===id)||null;},
  async byIndex(index,value){const key=indexes[index]||index;return rows.filter(row=>row[key]===value);},
  async byLegacyRef(ref){return rows.find(row=>row.legacy_ref===ref)||null;},
  async upsertByLegacyRef(ref,input){let row=rows.find(item=>item.legacy_ref===ref);if(row)Object.assign(row,input);else{row={id:`new-${rows.length+1}`,legacy_ref:ref,...input,created_at:now,updated_at:now};rows.push(row);}return row;},
  async forActivity(activityId){return rows.filter(row=>row.activity_id===activityId);}
});
const repositories={
  activities:repo(activities),calendarEntries:repo(calendar),activityParticipants:repo(participants),preparationItems:repo(prep),
  records:repo(records),media:repo(media),reviews:repo(reviews),improvementItems:repo(improvements),assets:repo(assets),
  async runtimeContext(){return {current_activity_id:'act-walk'};}
};
const storage=new Map([['outbase_record_session_state','idle'],['outbase_core_activity_id','act-walk']]);
const context={
  console,Date,URLSearchParams,Promise,Object,Map,Set,JSON,Math,
  location:{pathname:'/outbase/',search:'',hash:''},
  localStorage:{getItem:key=>storage.has(key)?storage.get(key):null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)},
  OUTBASE_REPOSITORIES_V160:repositories,
  OUTBASE_ROUTER:{legacyUrl(route,params={}){const tab={calendar:'plan',activity:'prep',home:'plan'}[route]||'plan';const query=new URLSearchParams({tab});if(params.activityId)query.set('activityId',params.activityId);if(params.planId)query.set('planId',params.planId);return `/outbase/?${query}`;}},
  CustomEvent:class CustomEvent{constructor(type,init={}){this.type=type;this.detail=init.detail;}},dispatchEvent(){},
};
context.globalThis=context;
vm.createContext(context);
const files=[
  'src/domain/shared/read-utils.js','src/domain/plans/plan-domain.js','src/domain/preparation/preparation-domain.js','src/domain/vault/vault-domain.js',
  'src/screens/plan/plan-screen-model.js','src/screens/preparation/preparation-screen-model.js','src/screens/vault/vault-screen-model.js','src/domain/bootstrap.js'
];
for(const file of files)vm.runInContext(read(file),context,{filename:file});

(async()=>{
  const plan=context.OUTBASE_PLAN_DOMAIN_V162;
  const current=await plan.current();assert.equal(current.id,'act-walk');
  const upcoming=await plan.upcoming({from:'2026-07-15T00:00:00.000Z',days:30});assert.equal(upcoming.length,1);assert.equal(upcoming[0].legacyPlanId,'plan-1');assert.equal(upcoming[0].participants.length,1);
  assert.equal((await plan.byLegacyPlanId('plan-1')).id,'act-camp');
  assert(context.OUTBASE_PLAN_DOMAIN_V162.legacyUrl(upcoming[0],'preparation').includes('tab=prep'));

  const preview=await context.OUTBASE_PREPARATION_DOMAIN_V162.summary('act-camp');assert.equal(preview.persisted,false);assert.equal(preview.total,6);
  const created=await context.OUTBASE_PREPARATION_DOMAIN_V162.ensureBaseline('act-camp');assert.equal(created.status,'ready');assert.equal(created.created,6);
  const repeated=await context.OUTBASE_PREPARATION_DOMAIN_V162.ensureBaseline('act-camp');assert.equal(repeated.created,0);
  storage.set('outbase_record_session_state','active');
  const deferred=await context.OUTBASE_PREPARATION_DOMAIN_V162.ensureBaseline('act-camp');assert.equal(deferred.status,'deferred_active_session');
  storage.set('outbase_record_session_state','idle');

  const vault=await context.OUTBASE_VAULT_DOMAIN_V162.summary();assert.equal(vault.activityCount,1);assert.equal(vault.recordCount,1);assert.equal(vault.assetCount,1);assert.equal(vault.openImprovementCount,1);
  const model=await context.OUTBASE_VAULT_SCREEN_MODEL_V162.build();assert.equal(model.activities[0].recordCount,1);assert.equal(model.activities[0].mediaCount,1);
  const boot=await context.OUTBASE_PHASE2B_V162.ready;assert.equal(boot.status,'ready');assert.equal(boot.cutover,false);
  console.log(JSON.stringify({status:'pass',plans:upcoming.length,baseline:created.created,vault},null,2));
})().catch(error=>{console.error(error);process.exit(1);});
