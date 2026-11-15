import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/domain/plans/plan-location.js',import.meta.url),'utf8');
const candidate={label:'同名キャンプ場',address:'長野県 長野市',latitude:36.6,longitude:138.1,source:'openstreetmap-photon'};
function setup(row=null){
 const values=new Map();let current=row,writes=0;
 const ctx=vm.createContext({Date,Number,Error,JSON,String,localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)},OUTBASE_IDS:{nowIso:()=> '2026-11-15T00:00:00Z'},OUTBASE_VALIDATION:{assertEntity(){}},OUTBASE_REPOSITORIES_V160:{activities:{normalize:r=>r}},OUTBASE_DB_V160:{transaction:async(stores,mode,run)=>new Promise((resolve,reject)=>{let req,saved,aborted=false;const tx={objectStore:()=>({get(){return req={result:current}},put(r){saved=r;writes++}}),abort(){aborted=true;reject(Error('abort'))}};run(tx);queueMicrotask(()=>{req.onsuccess();if(!aborted){current=saved||current;resolve();}});})}});vm.runInContext(source,ctx);return {api:ctx.OUTBASE_PLAN_LOCATION,values,get current(){return current},get writes(){return writes}};
}
test('calendar choice preserves every unrelated field and other rows',async()=>{
 const f=setup(),rows=[{id:'a',title:'朝霧',place:'',memo:'残す',repeat:{freq:'weekly'},color:'#f00',participants:['コタ']},{id:'b',title:'別予定'}];f.values.set('outbase_calendar_complete_v3_events',JSON.stringify(rows));
 await f.api.select({id:'calendar-v44:a',calendarEventId:'a',title:'朝霧',place:''},candidate);const after=JSON.parse(f.values.get('outbase_calendar_complete_v3_events'));assert.equal(after.length,2);assert.deepEqual(after[1],rows[1]);const {weatherLocation,place,...rest}=after[0];assert.deepEqual(rest,(({place,...r})=>r)(rows[0]));assert.equal(place,candidate.label);assert.equal(weatherLocation.latitude,36.6);
});
test('story choice reads latest activity in transaction and retains state/timer/notes',async()=>{
 const row={id:'a',title:'朝霧',state:'active',metadata:{note:'残す',execution_session_v1:{elapsed_ms:123},legacy_plan:{location:'',other:'維持'}}};const f=setup(row);
 await f.api.select({id:'a',title:'朝霧',place:''},candidate);assert.equal(f.current.state,'active');assert.deepEqual(f.current.metadata.execution_session_v1,row.metadata.execution_session_v1);assert.equal(f.current.metadata.note,'残す');assert.equal(f.current.metadata.legacy_plan.other,'維持');assert.equal(f.current.metadata.weather_location.longitude,138.1);assert.equal(f.writes,1);
});
test('changed or deleted source and invalid coordinates reject without writes',async()=>{
 const f=setup({id:'a',title:'変更済み',metadata:{location:''}});await assert.rejects(f.api.select({id:'a',title:'朝霧',place:''},candidate),/changed_plan/);assert.equal(f.writes,0);await assert.rejects(f.api.select({id:'a',title:'朝霧'}, {...candidate,latitude:NaN}),/invalid_place/);assert.equal(f.writes,0);
 const g=setup({id:'a',title:'朝霧',deleted_at:'now'});await assert.rejects(g.api.select({id:'a',title:'朝霧',place:''},candidate),/missing_plan/);assert.equal(g.writes,0);
});
