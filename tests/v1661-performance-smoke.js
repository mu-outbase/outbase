'use strict';
const fs=require('fs');const path=require('path');const vm=require('vm');const assert=require('assert');
const root=path.resolve(__dirname,'..');const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const counters={home:0,vault:0,detail:0,calendar:0};
let route={name:'home',activityId:null,month:null,people:''};
const context={
  console,Date,navigator:{onLine:true},
  OUTBASE_ROUTER:{current:()=>Object.freeze({...route}),shellUrl:name=>`/?shell=1&view=${name}`},
  OUTBASE_LEGACY_UI_V165:{session:()=>({state:'idle'})},
  OUTBASE_HOME_SCREEN_MODEL_V164:{async build(){counters.home++;return {current:[],next:[],quick:[],recent:[],family:{}};}},
  OUTBASE_VAULT_SCREEN_MODEL_V162:{async build(){counters.vault++;return {summary:{activityCount:0,recordCount:0,assetCount:0},activities:[],assets:[]};}},
  OUTBASE_ACTIVITY_DETAIL_SCREEN_MODEL_V165:{async build(){counters.detail++;return {status:'ready'};}},
  OUTBASE_CALENDAR_SCREEN_MODEL_V165:{async build(){counters.calendar++;return {label:'test'};}}
};context.globalThis=context;vm.createContext(context);vm.runInContext(read('src/shell/shell-model.js'),context,{filename:'shell-model.js'});
(async()=>{
  await context.OUTBASE_SHELL_MODEL_V166.build();assert.deepEqual(counters,{home:1,vault:0,detail:0,calendar:0});
  route={name:'search',activityId:null,month:null,people:''};await context.OUTBASE_SHELL_MODEL_V166.build();assert.deepEqual(counters,{home:1,vault:0,detail:0,calendar:0});
  route={name:'vault',activityId:null,month:null,people:''};await context.OUTBASE_SHELL_MODEL_V166.build();await context.OUTBASE_SHELL_MODEL_V166.build();assert.deepEqual(counters,{home:1,vault:1,detail:0,calendar:0});
  route={name:'activity',activityId:'act-1',month:null,people:''};await context.OUTBASE_SHELL_MODEL_V166.build();assert.equal(counters.detail,1);
  route={name:'calendar',activityId:null,month:'2026-07',people:'member:1'};await context.OUTBASE_SHELL_MODEL_V166.build();assert.equal(counters.calendar,1);
  const index=read('index.html'),main=read('src/main.js'),renderer=read('src/shell/shell-renderer.js'),bootstrap=read('src/shell/bootstrap.js'),design=read('style-design-system.css');
  assert(index.includes('outbaseShellBoot'));assert(index.includes('html.outbaseShellBoot #app{visibility:hidden!important}'));
  assert(main.includes("mode:fastShell?'shell-fast':'legacy'"));assert(main.includes('await loadShellRuntime()'));
  assert(renderer.includes('function ensureShell'));assert(renderer.includes('main.innerHTML=body(model)'));
  assert.equal((renderer.match(/root\.innerHTML=/g)||[]).length,1);
  assert(bootstrap.includes('requestIdleCallback'));assert(bootstrap.includes("renderer.updateNetwork?.(root,true)"));
  assert(design.includes('OUTBASE v166.1 performance LOCK'));assert(design.includes('content-visibility:auto'));
  console.log(JSON.stringify({status:'pass',oldUiFirstPaintBlocked:true,legacySkippedInShell:true,routeSpecificModels:true,routeCache:true,persistentShell:true,routineViewTransitions:false},null,2));
})().catch(error=>{console.error(error);process.exit(1);});
