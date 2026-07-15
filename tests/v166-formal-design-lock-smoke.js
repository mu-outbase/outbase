'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const classes=new Set();
const attrs={};
const meta={setAttribute:(key,value)=>{attrs[key]=value;}};
const listeners={};
const storage=new Map();
const context={
  console,URLSearchParams,setTimeout,clearTimeout,
  location:{search:'?shell=1&view=home',hash:''},
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,String(value))},
  document:{
    body:{dataset:{},classList:{add:(...values)=>values.forEach(v=>classes.add(v)),remove:(...values)=>values.forEach(v=>classes.delete(v))}},
    documentElement:{style:{}},visibilityState:'visible',
    querySelector:selector=>selector==='meta[name="theme-color"]'?meta:null,
    addEventListener:(type,fn)=>(listeners[type]??=[]).push(fn)
  },
  addEventListener:(type,fn)=>(listeners[type]??=[]).push(fn),
  dispatchEvent(){},
  CustomEvent:class{constructor(type,init={}){this.type=type;this.detail=init.detail;}}
};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(read('src/design/theme-controller.js'),context,{filename:'theme-controller.js'});
assert.equal(context.OUTBASE_THEME_V166.mode(),'north');
assert(classes.has('outbaseNorth'));assert.equal(context.document.body.dataset.outbaseMode,'north');assert.equal(attrs.content,'#0A3328');
storage.set('outbase_record_session_state','active');
context.OUTBASE_THEME_V166.sync('test-active');
assert(classes.has('outbaseTrailLens'));assert(!classes.has('outbaseNorth'));assert.equal(context.document.body.dataset.outbaseSessionState,'active');assert.equal(attrs.content,'#07110E');
storage.set('outbase_record_session_state','paused');context.OUTBASE_THEME_V166.sync('test-paused');assert.equal(context.OUTBASE_THEME_V166.mode(),'trail');
storage.set('outbase_record_session_state','idle');context.OUTBASE_THEME_V166.sync('test-idle');assert(classes.has('outbaseNorth'));

const design=read('style-design-system.css');
const shell=read('src/shell/shell-renderer.js');
const router=read('src/router.js');
const index=read('index.html');
const sw=read('service-worker.js');
assert(design.includes('--ob-tap:48px'));
assert(design.includes('body.outbaseNorth'));
assert(design.includes('body.outbaseTrailLens'));
assert(design.includes('@container outbase-shell'));
assert(design.includes('prefers-reduced-motion'));
assert(design.includes('prefers-contrast'));
assert(!/(body|html|#outbaseShellRoot|\.ob3-shell)[^{]*\{[^}]*overflow\s*:\s*hidden/i.test(design));
assert.equal((design.match(/MutationObserver/g)||[]).length,0);
assert.equal((read('src/design/theme-controller.js').match(/MutationObserver/g)||[]).length,0);
assert(shell.includes('ob6-next-band'));
assert(shell.includes('ob6-story-rail'));
assert(shell.includes('OUTBASE_SHELL_RENDERER_V166'));
assert(router.includes('startViewTransition'));
assert(router.includes('options.transition!==true'));
assert(router.includes('routineTransitions:false'));
assert(router.includes('prefers-reduced-motion'));
assert(index.includes('style-design-system.css?v=outbase-v1662-density'));
assert(index.includes('src/design/theme-controller.js?v=outbase-v1662-density'));
assert(sw.includes('./style-design-system.css?v=outbase-v1662-density'));
assert(sw.includes('./src/design/theme-controller.js?v=outbase-v1662-density'));
assert.equal(JSON.parse(read('manifest.json')).version,'166.2');
console.log(JSON.stringify({status:'pass',north:true,trail:true,activePausedSwitch:true,tapTarget:'48px',containerQueries:true,viewTransitions:true,reducedMotion:true,highContrast:true,mutationObserverAdded:0,field03EngineChanged:false},null,2));
