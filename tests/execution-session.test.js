import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/domain/activity/execution-session.js',import.meta.url),'utf8');
function fixture(state='planned'){
 let now=100000,fail=false,writes=0;
 let row={id:'a',state,title:'活動',start_at:'2026-11-15T09:00:00Z',end_at:'2026-11-15T10:00:00Z',metadata:{location:'公園'}};
 const repo={get:async()=>structuredClone(row),save:async value=>{if(fail)throw Error('QuotaExceededError');writes++;row=structuredClone(value);return structuredClone(row);}};
 class Clock extends Date {static now(){return now;}}
 const context=vm.createContext({Date:Clock,OUTBASE_REPOSITORIES_V160:{activities:repo}});vm.runInContext(source,context);
 return {api:context.OUTBASE_EXECUTION_SESSION,get row(){return row;},get writes(){return writes;},tick:ms=>{now+=ms;},fail:()=>{fail=true;},edit:patch=>{row={...row,...patch};}};
}
test('start/pause/resume/end persist elapsed time and preserve schedule and metadata',async()=>{
 const f=fixture(),before=structuredClone(f.row);
 await f.api.transition('a','start');assert.equal(f.row.state,'active');f.tick(5000);
 await f.api.transition('a','pause');assert.equal(f.row.state,'paused');assert.equal(f.api.fromActivity(f.row).elapsedMs,5000);
 f.tick(9000);await f.api.transition('a','resume');f.tick(3000);await f.api.transition('a','end');
 assert.equal(f.row.state,'organizing');assert.equal(f.api.fromActivity(f.row).mode,'ended');assert.equal(f.api.fromActivity(f.row).elapsedMs,8000);
 assert.equal(f.row.start_at,before.start_at);assert.equal(f.row.end_at,before.end_at);assert.equal(f.row.metadata.location,'公園');
});
test('reading state does not write; paused and ended states restore from saved data',async()=>{
 const f=fixture();assert.equal(f.api.fromActivity(f.row).mode,'idle');assert.equal(f.writes,0);
 await f.api.transition('a','start');f.tick(2000);await f.api.transition('a','pause');
 assert.equal(f.api.fromActivity(structuredClone(f.row)).elapsedMs,2000);assert.equal(f.api.fromActivity(f.row).mode,'paused');
});
test('failed save leaves both state and elapsed data unchanged',async()=>{
 const f=fixture();await f.api.transition('a','start');f.tick(7000);const before=structuredClone(f.row);f.fail();
 await assert.rejects(f.api.transition('a','pause'));assert.deepEqual(f.row,before);
});
test('double start is serialized and does not reset elapsed time',async()=>{
 const f=fixture();const results=await Promise.allSettled([f.api.transition('a','start'),f.api.transition('a','start')]);
 assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal(f.writes,1);
});
test('stale UI, deleted activities and unsupported transitions reject without writes',async()=>{
 const f=fixture();await assert.rejects(f.api.transition('a','pause'));assert.equal(f.writes,0);
 await f.api.transition('a','start');await assert.rejects(f.api.transition('a','pause',{expectedMode:'idle'}));assert.equal(f.writes,1);
 f.edit({deleted_at:'2026-11-14'});await assert.rejects(f.api.transition('a','end'));assert.equal(f.writes,1);
});
test('completed or archived activities cannot be restarted',async()=>{
 for(const state of ['organizing','completed','archived']){const f=fixture(state);await assert.rejects(f.api.transition('a','start'));assert.equal(f.writes,0);}
});
