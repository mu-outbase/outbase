const fs=require('fs');const path=require('path');const vm=require('vm');const assert=require('assert');
const root=path.resolve(__dirname,'..');const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
function eventTarget(target){const rows={};target.addEventListener=(type,fn)=>(rows[type]??=[]).push(fn);target.dispatchEvent=event=>{(rows[event.type]||[]).forEach(fn=>fn(event));return true;};return rows;}
(async()=>{
  const storage=new Map();let href='https://example.test/outbase/?shell=1&view=home';const events=[];
  const location={pathname:'/outbase/',get search(){return new URL(href).search;},hash:'',href,assign(url){this.assigned=url;}};
  const history={state:null,pushState(state,_title,url){this.state=state;href=new URL(url,'https://example.test').href;location.href=href;},replaceState(state,_title,url){this.state=state;href=new URL(url,'https://example.test').href;location.href=href;},back(){events.push('back');}};
  const context={console,URL,URLSearchParams,Date,Promise,Object,Map,Set,JSON,Math,location,history,navigator:{onLine:true},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},CustomEvent:class{constructor(type,init={}){this.type=type;this.detail=init.detail;}},document:{visibilityState:'visible'},setTimeout,clearTimeout};
  context.globalThis=context;eventTarget(context);vm.createContext(context);
  vm.runInContext(read('src/router.js'),context);assert.equal(context.OUTBASE_ROUTER.current().name,'home');context.OUTBASE_ROUTER.navigate('search');assert.equal(context.OUTBASE_ROUTER.current().name,'search');assert.equal(new URL(href).searchParams.get('shell'),'1');
  vm.runInContext(read('src/shell/legacy-adapter.js'),context);assert.equal(context.OUTBASE_LEGACY_UI_V164.shellSafe(),true);storage.set('outbase_record_session_state','active');assert.equal(context.OUTBASE_LEGACY_UI_V164.shellSafe(),false);storage.set('outbase_record_session_state','idle');
  vm.runInContext(read('src/shell/modal-stack.js'),context);context.OUTBASE_MODAL_STACK_V164.open('central');assert.equal(context.OUTBASE_MODAL_STACK_V164.top().id,'central');context.OUTBASE_MODAL_STACK_V164.close();assert(events.includes('back'));
  context.OUTBASE_HOME_SCREEN_MODEL_V164={async build(){return {current:[],next:[{id:'a',title:'次のキャンプ'}],recent:[],family:{names:[],memberCount:0,petCount:0,household:{name:'わが家'}},quick:[],calendarUrl:'?tab=plan'};}};
  context.OUTBASE_VAULT_SCREEN_MODEL_V162={async build(){return {summary:{activityCount:2,recordCount:5,assetCount:8},activities:[],assets:[]};}};
  vm.runInContext(read('src/shell/shell-model.js'),context);const model=await context.OUTBASE_SHELL_MODEL_V164.build();assert.equal(model.route.name,'search');assert.equal(model.next.length,1);assert.equal(model.vaultSummary.recordCount,5);
  const css=read('style-shell.css');assert(!/(body|#outbaseShellRoot|\.ob3-shell)[^{]*\{[^}]*overflow\s*:\s*hidden/i.test(css));assert.equal((css.match(/MutationObserver/g)||[]).length,0);
  console.log(JSON.stringify({status:'pass',history:'pushState',modalBack:true,activeSessionGuard:true,overflowHiddenAdded:0,mutationObserverAdded:0},null,2));
})().catch(error=>{console.error(error);process.exit(1);});
