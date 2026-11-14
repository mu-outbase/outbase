import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/domain/activity/location-recorder.js',import.meta.url),'utf8');
function setup(){
 const listeners={},cleared=[];let success,failure;
 const geo={watchPosition(ok,fail){success=ok;failure=fail;return 0;},clearWatch(id){cleared.push(id);}};
 const context=vm.createContext({Date,Map,Set,Promise,Number,Math,Error,CustomEvent:class{},navigator:{geolocation:geo},document:{addEventListener(){},hidden:false},addEventListener:(name,fn)=>listeners[name]=fn,dispatchEvent(){},OUTBASE_IDS:{ulid:()=> 'segment'},OUTBASE_REPOSITORIES_V160:{activities:{get:async()=>({state:'active'})}}});vm.runInContext(source,context);
 return {api:context.OUTBASE_LOCATION_RECORDER,context,cleared,listeners,get success(){return success;},get failure(){return failure;}};
}
const p=(latitude,time,segment='one')=>({latitude,longitude:139,accuracy:3,captured_at:time,tracking_session_id:segment});
test('haversine distance, jitter and impossible speed are filtered',()=>{
 const {api}=setup();assert.ok(Math.abs(api.distance(p(35,0),p(35.001,2000))-111.195)<0.1);
 assert.equal(api.accepted(p(35,0),p(35.00001,1000)),false);
 assert.equal(api.accepted(p(35,0),p(36,1000)),false);
 assert.equal(api.accepted(p(35,1000),p(35.001,0)),false);
});
test('distance never bridges stopped sessions; all points count beyond display limits',()=>{
 const {api}=setup();let rows=[];for(let i=0;i<80;i++)rows.push({type:'gps_point',payload:p(35+i*.001,i*3000)});
 rows.push({type:'gps_point',payload:p(40,300000,'two')});assert.equal(api.summary(rows).tracks.length,2);assert.equal(api.summary(rows).tracks[0].length,80);assert.equal(api.summary(rows).tracks[1].length,1);assert.ok(api.summary(rows).meters>8700&&api.summary(rows).meters<8900);
});
test('stale, inaccurate and out of range locations reject',()=>{
 const {api}=setup();for(const coords of [{latitude:91,longitude:139,accuracy:3},{latitude:35,longitude:139,accuracy:101}])assert.throws(()=>api.point({coords,timestamp:Date.now()}));
 assert.throws(()=>api.point({coords:{latitude:35,longitude:139,accuracy:3},timestamp:0}));
});
test('stopping clears watch ID zero; late fixes after stop are ignored',async()=>{
 const f=setup();await f.api.start('a');const callback=f.success;f.api.stop();callback({});await Promise.resolve();assert.deepEqual(f.cleared,[0]);assert.equal(f.api.snapshot('a').tracking,false);
});
test('navigation during activity lookup cancels before asking for GPS',async()=>{
 const f=setup();let finish;f.context.OUTBASE_REPOSITORIES_V160.activities.get=()=>new Promise(resolve=>finish=resolve);
 const work=f.api.start('a');f.listeners['outbase:navigation']();finish({state:'active'});await work;assert.equal(f.success,undefined);
});
test('synchronous watch failure still releases the returned watch',async()=>{
 const f=setup();f.context.navigator.geolocation.watchPosition=(_ok,fail)=>{fail({code:1});return 0;};await f.api.start('a');assert.deepEqual(f.cleared,[0]);assert.equal(f.api.snapshot('a').tracking,false);
});
