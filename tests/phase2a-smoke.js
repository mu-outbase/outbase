const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const expectedLegacy=[
  'src/app.js','src/outbase-core.js','src/outbase-chappy.js','src/outbase-chappy-ui.js','src/outbase-import.js',
  'src/outbase-memo-ui.js','src/outbase-review-ui.js','src/outbase-flow.js','src/outbase-entry.js','src/outbase-activity.js',
  'src/outbase-navigation-guard.js','src/outbase-scenarios.js','src/outbase-activity-title-guard.js','src/outbase-compact-ui.js'
];
const expectedData=['src/data/ids.js','src/data/validation.js','src/data/database.js','src/data/repositories.js','src/data/legacy-adapter.js','src/data/migrations.js','src/data/bootstrap.js'];
const expectedShell=['src/shell/legacy-adapter.js','src/shell/modal-stack.js','src/shell/shell-model.js','src/shell/shell-renderer.js','src/shell/bootstrap.js'];
const expectedDomain=[
  'src/domain/shared/read-utils.js','src/domain/plans/plan-domain.js','src/domain/preparation/preparation-domain.js','src/domain/vault/vault-domain.js',
  'src/screens/plan/plan-screen-model.js','src/screens/preparation/preparation-screen-model.js','src/screens/vault/vault-screen-model.js','src/domain/bootstrap.js',
  'src/domain/home/home-domain.js','src/screens/home/home-screen-model.js',
  'src/domain/filters/family-filter-domain.js','src/domain/calendar/calendar-domain.js','src/screens/calendar/calendar-screen-model.js',
  'src/domain/activity/activity-detail-domain.js','src/screens/activity/activity-detail-screen-model.js'
];

const events=[];const store=new Map();
const context={
  console,URL,URLSearchParams,Date,setTimeout,clearTimeout,navigator:{onLine:true},
  location:{search:'?tab=record&activityId=act-1',hash:'',pathname:'/outbase/'},
  localStorage:{getItem:key=>store.has(key)?store.get(key):null,setItem:(key,value)=>store.set(key,String(value)),removeItem:key=>store.delete(key)},
  document:{visibilityState:'visible',baseURI:'https://example.test/outbase/',addEventListener(){},scripts:[],head:{appendChild(){}},createElement(){return{}},getElementById(){return null}},
  addEventListener(){},dispatchEvent(event){events.push(event.type);},
  CustomEvent:class CustomEvent{constructor(type,init={}){this.type=type;this.detail=init.detail;}}
};
context.globalThis=context;
vm.createContext(context);
for(const file of ['src/config/version.js','src/config/module-manifest.js','src/runtime/lifecycle.js','src/state/app-state.js','src/router.js'])vm.runInContext(read(file),context,{filename:file});

assert.equal(context.OUTBASE_VERSION.app,'v165-integrated');
assert.deepEqual(Array.from(context.OUTBASE_MODULE_MANIFEST.legacy).map(x=>x.split('?')[0]),expectedLegacy);
assert.deepEqual(Array.from(context.OUTBASE_MODULE_MANIFEST.data).map(x=>x.split('?')[0]),expectedData);
assert.deepEqual(Array.from(context.OUTBASE_MODULE_MANIFEST.domain).map(x=>x.split('?')[0]),expectedDomain);
assert.deepEqual(Array.from(context.OUTBASE_MODULE_MANIFEST.shell).map(x=>x.split('?')[0]),expectedShell);
assert.equal(context.OUTBASE_ROUTER.current().name,'record');assert.equal(context.OUTBASE_ROUTER.current().activityId,'act-1');
assert.equal(context.OUTBASE_ROUTER.legacyUrl('vault'),'/outbase/?tab=memory');assert.equal(context.OUTBASE_APP_STATE.legacySnapshot().recordState,'idle');

const index=read('index.html');
assert(!index.includes('<script src="src/app.js'));
assert(index.includes('src/main.js?v=outbase-v165-integrated'));
assert(index.includes('style-shell.css?v=outbase-v165-integrated'));
const sw=read('service-worker.js');
for(const file of [...expectedLegacy,...expectedData,...expectedDomain,...expectedShell,'src/main.js','src/router.js'])assert(sw.includes(`./${file}`),`${file} must be cached`);
for(const file of ['src/config/version.js','src/config/module-manifest.js','src/runtime/script-loader.js','src/runtime/lifecycle.js','src/state/app-state.js','src/router.js','src/main.js',...expectedDomain,...expectedShell]){
  assert(!read(file).includes('MutationObserver'),`${file} must not introduce MutationObserver`);
}
console.log(JSON.stringify({status:'pass',legacy_order:expectedLegacy.length,data_order:expectedData.length,domain_order:expectedDomain.length,shell_order:expectedShell.length,route:context.OUTBASE_ROUTER.current()},null,2));
