const fs=require('fs');const path=require('path');const vm=require('vm');const assert=require('assert');
const rootDir=path.resolve(__dirname,'..');const read=rel=>fs.readFileSync(path.join(rootDir,rel),'utf8');
function eventTarget(target){const rows={};target.addEventListener=(type,fn)=>(rows[type]??=[]).push(fn);target.dispatchEvent=event=>{(rows[event.type]||[]).forEach(fn=>fn(event));return true;};return rows;}
(async()=>{
  let href='https://example.test/outbase/?shell=1&view=home';
  const storage=new Map();
  const context={console,URL,URLSearchParams,Date,Promise,Object,Map,Set,JSON,Math,setTimeout,clearTimeout,scrollY:640};
  context.globalThis=context;eventTarget(context);
  const location={pathname:'/outbase/',hash:'',get href(){return href;},set href(value){href=new URL(value,href).href;},get search(){return new URL(href).search;},assign(value){href=new URL(value,href).href;}};
  const entries=[{url:href,state:null}];let index=0;
  const history={state:null,scrollRestoration:'auto',pushState(state,_title,url){entries.splice(index+1);entries.push({url:new URL(url,href).href,state});index=entries.length-1;this.state=state;href=entries[index].url;},replaceState(state,_title,url){entries[index]={url:new URL(url||href,href).href,state};this.state=state;href=entries[index].url;},back(){if(index<=0)return;index--;this.state=entries[index].state;href=entries[index].url;context.dispatchEvent({type:'popstate'});}};
  const root={id:'outbaseShellRoot',innerHTML:'',remove(){this.removed=true;}};
  const classNames=new Set();
  const document={scrollingElement:{scrollTop:640},documentElement:{scrollTop:640},visibilityState:'visible',getElementById:id=>id==='outbaseShellRoot'?root:null,createElement:()=>root,addEventListener(){},body:{firstChild:null,insertBefore(){},classList:{add:value=>classNames.add(value),remove:value=>classNames.delete(value)}}};
  Object.assign(context,{location,history,document,navigator:{onLine:true},localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)},CustomEvent:class{constructor(type,init={}){this.type=type;this.detail=init.detail;}},requestAnimationFrame:fn=>fn(),scrollTo(_x,y){this.scrollY=y;document.scrollingElement.scrollTop=y;document.documentElement.scrollTop=y;}});
  context.OUTBASE_LEGACY_UI_V165={shellSafe:()=>true,openPlanAdd(){},openMemo(){},openStart(){},openSearch(){},openVault(){},openLegacyHome(){}};
  let mountCount=0;context.OUTBASE_SHELL_RENDERER_V165={async mount(host){mountCount++;host.innerHTML=`screen-${mountCount}`;},showCentral(){},hideCentral(){}};
  context.OUTBASE_MODAL_STACK_V164={subscribe(){return()=>{};},open(){},close(){}};
  vm.createContext(context);vm.runInContext(read('src/router.js'),context,{filename:'src/router.js'});vm.runInContext(read('src/shell/bootstrap.js'),context,{filename:'src/shell/bootstrap.js'});
  await context.OUTBASE_SHELL_V165.ready;
  assert.equal(context.scrollY,0,'initial shell mount must start at top');
  assert.equal(history.scrollRestoration,'manual');

  context.scrollTo(0,860);
  context.OUTBASE_ROUTER.navigate('activity',{activityId:'act-1'});
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(context.OUTBASE_ROUTER.current().name,'activity');
  assert.equal(context.scrollY,0,'forward route must open at top');
  assert.equal(entries[0].state.outbaseScrollY,860,'previous screen scroll must be stored');

  context.scrollTo(0,420);
  history.back();
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(context.OUTBASE_ROUTER.current().name,'home');
  assert.equal(context.scrollY,860,'Android/browser back must restore the former screen position');

  context.OUTBASE_ROUTER.navigate('calendar',{month:'2026-07'});
  await new Promise(resolve=>setTimeout(resolve,0));
  context.scrollTo(0,310);
  context.OUTBASE_ROUTER.navigate('calendar',{month:'2026-07',people:'pet:kota'},{replace:true,preserveScroll:true});
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(context.scrollY,310,'same-screen filter replacement must preserve position');
  assert.equal(context.OUTBASE_ROUTER.savedScrollY(),310);

  console.log(JSON.stringify({status:'pass',initialTop:true,forwardTop:true,backRestored:860,replacePreserved:310,scrollRestoration:'manual',field03Changed:false},null,2));
})().catch(error=>{console.error(error);process.exit(1);});
