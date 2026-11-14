import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../src/calendar-v2/story-calendar-reader.js',import.meta.url),'utf8');
function reader(db={openExisting:async()=>null}){
 const context=vm.createContext({Date,OUTBASE_DB_V160:db});vm.runInContext(source,context);return context.OUTBASE_STORY_CALENDAR_READER;
}
const activity={id:'a1',title:'活動予定',type:'camp',metadata:{location:'検証用公園'}};
const entry={id:'e1',activity_id:'a1',start_at:'2026-11-15T09:00:00',end_at:'2026-11-15T10:00:00',all_day:false};
test('projects current activity and calendar entry without mutating either source',()=>{
 const inputs=JSON.stringify([activity,entry]);const rows=reader().project([activity],[entry]);
 assert.equal(rows.length,1);assert.equal(rows[0].title,'活動予定');assert.equal(rows[0].storyActivityId,'a1');
 assert.equal(rows[0].calendarId,'camp');assert.equal(rows[0].place,'検証用公園');assert.equal(rows[0].start,'2026-11-15T09:00');
 assert.equal(JSON.stringify([activity,entry]),inputs);
});
test('omits deleted, orphaned and malformed calendar entries',()=>{
 const entries=[entry,{...entry,id:'deleted',deleted_at:'2026-11-14'},null,{...entry,id:'orphan',activity_id:'absent'},
 {...entry,id:'invalid',start_at:'invalid'},{...entry,id:'reverse',end_at:'2026-11-13T09:00'}, {...entry,id:''}];
 assert.equal(reader().project([activity],entries).length,1);
 assert.equal(reader().project([{...activity,deleted_at:'2026-11-14'}],[entry]).length,0);
});
test('keeps unsupported activity types visible under the existing activity filter',()=>{
 const row=reader().project([{...activity,type:'drive'}],[{...entry,all_day:true}])[0];
 assert.equal(row.calendarId,'activity');assert.equal(row.allDay,true);
});
test('reflects title changes and supports multiple entries without ID collisions',()=>{
 const rows=reader().project([{...activity,title:'編集済み'}],[entry,{...entry,id:'e2'}]);
 assert.equal(rows[0].title,'編集済み');assert.notEqual(rows[0].id,rows[1].id);
});
test('does not create a database when none exists',async()=>{
 let reads=0;const api=reader({openExisting:async()=>{reads++;return null;},open:()=>assert.fail('must not create DB')});
 assert.equal((await api.load()).length,0);assert.equal(reads,1);
});
test('reads both stores in one readonly transaction and closes the connection',async()=>{
 let closed=false;
 const db={objectStoreNames:{contains:()=>true},close:()=>{closed=true;},transaction(names,mode){
  assert.deepEqual(Array.from(names),['activities','calendar_entries']);assert.equal(mode,'readonly');
  const tx={objectStore:name=>({getAll:()=>({result:name==='activities'?[activity]:[entry]})})};
  queueMicrotask(()=>tx.oncomplete());return tx;
 }};
 assert.equal((await reader({openExisting:async()=>db}).load()).length,1);assert.equal(closed,true);
});
test('closes existing DBs with incomplete schema without upgrading them',async()=>{
 let closed=false;const api=reader({openExisting:async()=>({objectStoreNames:{contains:()=>false},close:()=>{closed=true;}})});
 assert.equal((await api.load()).length,0);assert.equal(closed,true);
});
