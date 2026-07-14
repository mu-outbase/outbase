const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

async function loaderTest(){
  const appended=[];
  const scripts=[];
  const document={
    baseURI:'https://example.test/outbase/',scripts,
    createElement(tag){assert.equal(tag,'script');return {dataset:{},async:true,src:'',onload:null,onerror:null};},
    head:{appendChild(script){scripts.push(script);appended.push(new URL(script.src).pathname.replace('/outbase/',''));setImmediate(()=>script.onload?.());}}
  };
  const context={console,URL,document,setTimeout,clearTimeout};
  context.globalThis=context;
  vm.createContext(context);
  vm.runInContext(read('src/runtime/script-loader.js'),context,{filename:'script-loader.js'});
  const sources=['a.js?v=1','b.js?v=1','c.js?v=1'];
  const first=await context.OUTBASE_SCRIPT_LOADER.loadSeries(sources);
  const second=await context.OUTBASE_SCRIPT_LOADER.loadSeries(sources);
  assert.deepEqual(appended,['a.js','b.js','c.js']);
  assert.equal(first.length,3);assert.equal(second.length,3);assert.equal(scripts.every(x=>x.async===false),true);
}

async function mainTest(){
  const calls=[];const events=[];
  const lifecycle={emit:(state,detail={})=>events.push({state,detail}),fail:error=>events.push({state:'failed',detail:{error:String(error)}})};
  const context={
    console,document:{getElementById(){return null;}},
    CustomEvent:class CustomEvent{constructor(type,init={}){this.type=type;this.detail=init.detail;}},dispatchEvent(){},
    OUTBASE_VERSION:{app:'v164-phase4'},OUTBASE_LIFECYCLE:lifecycle,
    OUTBASE_MODULE_MANIFEST:{legacy:['legacy-1','legacy-2'],data:['data-1'],domain:['domain-1','domain-2'],shell:['shell-1']},
    OUTBASE_SCRIPT_LOADER:{async loadSeries(list){calls.push([...list]);return list;}},
    OUTBASE_APP_STATE:{async snapshot(){return {ok:true};}},OUTBASE_ROUTER:{current(){return {name:'home'};}},
    OUTBASE_DATA_V160:{ready:Promise.resolve({status:'ready',cutover:false})},
    OUTBASE_PHASE2B_V162:{ready:Promise.resolve({status:'ready',cutover:false})},
    OUTBASE_SHELL_V164:{ready:Promise.resolve({status:'not_requested',cutover:false})}
  };
  context.globalThis=context;
  vm.createContext(context);
  vm.runInContext(read('src/main.js'),context,{filename:'main.js'});
  const result=await context.OUTBASE_APP.ready;
  assert.deepEqual(calls,[['legacy-1','legacy-2'],['data-1'],['domain-1','domain-2'],['shell-1']]);
  assert.equal(result.ok,true);
  assert.deepEqual(events.map(x=>x.state),[
    'starting','loading-legacy','legacy-ready','loading-data','data-modules-ready','data-ready',
    'loading-domain','domain-ready','loading-shell','shell-ready','ready'
  ]);
  assert.equal(events.find(x=>x.state==='data-ready').detail.cutover,false);
  assert.equal(events.find(x=>x.state==='domain-ready').detail.cutover,false);
}

(async()=>{
  await loaderTest();await mainTest();
  console.log(JSON.stringify({status:'pass',loader:'sequential-and-idempotent',main:'legacy-before-data-before-domain-before-shell'},null,2));
})().catch(error=>{console.error(error);process.exit(1);});
