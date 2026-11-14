import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const key='outbase_calendar_complete_v3_events';
const source=readFileSync(new URL('../src/screens/home/home-real-data-only-v18.js',import.meta.url),'utf8');
const shellSource=readFileSync(new URL('../src/shell/shell-model.js',import.meta.url),'utf8');
const now=new Date('2026-11-14T12:00:00');
const event=(extra={})=>({id:'test',title:'確認予定',start:'2026-11-15T09:00',end:'2026-11-15T10:00',calendarId:'camp',...extra});
function fixture(rows=[],existing=[]){
  const data=new Map([[key,JSON.stringify(rows)]]);
  const writes=[];
  const context=vm.createContext({Date,navigator:{onLine:true},localStorage:{getItem:k=>data.get(k)??null,setItem:(...args)=>writes.push(args)},
    OUTBASE_HOME_SCREEN_MODEL_V164:{build:async()=>({next:existing}),WEATHER_PLAN_KEY:'selected'},
    OUTBASE_ROUTER:{current:()=>({name:'home'}),shellUrl:name=>`?view=${name}`},OUTBASE_LEGACY_UI_V165:{session:()=>({})}});
  vm.runInContext(source,context);
  return {data,writes,context,build:()=>context.OUTBASE_HOME_SCREEN_MODEL_V164.build({now})};
}

test('reads v44 rows without changing localStorage or creating activities',async()=>{
  const f=fixture([event()]);const before=[...f.data];const model=await f.build();
  assert.equal(model.next[0].title,'確認予定');assert.equal(model.next[0].typeLabel,'キャンプ');
  assert.equal(model.next[0].calendarEventId,'test');assert.equal(model.next[0].calendarMonth,'2026-11');
  assert.deepEqual([...f.data],before);assert.deepEqual(f.writes,[]);
});
test('excludes ended, malformed and deleted rows; keeps ongoing and all-day events',async()=>{
  const f=fixture([null,{},event({id:'past',start:'2026-11-13',end:'2026-11-13'}),
    event({id:'bad',start:'invalid'}),event({id:'reverse',end:'2026-11-14'}),event({id:'deleted',deleted_at:'2026-11-14'}),
    event({id:'ongoing',start:'2026-11-13',end:'2026-11-15'}),
    event({id:'all-day',start:'2026-11-14',end:'2026-11-14',allDay:true})]);
  assert.deepEqual(Array.from((await f.build()).next,x=>x.calendarEventId),['ongoing','all-day']);
});
test('merges existing plans, sorts and limits HOME to five real rows',async()=>{
  const existing=[{id:'story',title:'既存活動',startAt:'2026-11-14T15:00'},{id:'demo',sample:true}];
  const f=fixture(Array.from({length:7},(_,i)=>event({id:String(i),start:`2026-11-${15+i}T09:00`,end:`2026-11-${15+i}T10:00`})),existing);
  const rows=(await f.build()).next;assert.equal(rows.length,5);assert.equal(rows[0].id,'story');
  assert.equal(rows.some(x=>x.sample),false);
});
test('handles missing or corrupted storage without fabricated plans',async()=>{
  const f=fixture();for(const raw of ['not JSON','{}','null','[]']){f.data.set(key,raw);assert.equal((await f.build()).next.length,0);}
});
test('updates selected weather plan after editing and deleting a calendar event',async()=>{
  const f=fixture([event()]);const first=await f.build();f.data.set('selected',first.next[0].id);
  f.data.set(key,JSON.stringify([event({title:'編集済み'})]));assert.equal((await f.build()).selectedPlan.title,'編集済み');
  f.data.set(key,'[]');assert.equal((await f.build()).selectedPlan,null);
});
test('expands recurring events and respects repeat end date',async()=>{
  const f=fixture([event({start:'2026-11-12T09:00',end:'2026-11-12T10:00',repeat:{freq:'daily',interval:1,until:'2026-11-16'}})]);
  const rows=(await f.build()).next;assert.equal(rows.length,2);
  assert.equal(new Date(rows[0].startAt).getDate(),15);assert.equal(new Date(rows[1].startAt).getDate(),16);
});
test('monthly recurrence clamps dates consistently with v44',async()=>{
  const f=fixture([event({start:'2026-10-31T09:00',end:'2026-10-31T10:00',repeat:{freq:'monthly',until:'2026-11-30'}})]);
  const rows=(await f.build()).next;assert.equal(rows.length,1);assert.equal(new Date(rows[0].startAt).getDate(),30);
});
test('HOME cache detects calendar create/edit/delete within its TTL',async()=>{
  const f=fixture();vm.runInContext(shellSource,f.context);
  const build=()=>f.context.OUTBASE_SHELL_MODEL_V166.build();
  assert.equal((await build()).next.length,0);
  // Use a fixed current time for HOME so cache behavior is independent of the test date.
  const api=f.context.OUTBASE_HOME_SCREEN_MODEL_V164;
  f.context.OUTBASE_HOME_SCREEN_MODEL_V164={...api,build:()=>api.build({now})};
  f.data.set(key,JSON.stringify([event()]));assert.equal((await build()).next[0].title,'確認予定');
  f.data.set(key,JSON.stringify([event({title:'編集後'})]));assert.equal((await build()).next[0].title,'編集後');
  f.data.set(key,'[]');assert.equal((await build()).next.length,0);
});
