'use strict';
const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
let runtime={session_state:'idle',session_id:null,current_activity_id:null};
const context={
  console,
  localStorage:{getItem:()=>null},
  OUTBASE_LEGACY_ADAPTER_V160:{currentRuntime:()=>runtime},
  OUTBASE_DOMAIN_UTILS_V162:{asDate:value=>value?new Date(value):null},
};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(require('path').join(__dirname,'../src/domain/home/home-domain.js'),'utf8'),context);
const api=context.OUTBASE_HOME_DOMAIN_V164;
const row=(id,session,state='paused',extra={})=>({
  id,type:'other',title:'その他 7/14',state,startAt:'2026-07-14T00:00:00.000Z',updatedAt:extra.updatedAt||'2026-07-15T00:00:00.000Z',
  metadata:{legacy_core_activity:{activityId:id,legacySessionId:session}},...extra
});
assert(api,'home domain unavailable');
assert.strictEqual(api.reconcileCurrent([row('a','s1'),row('b','s1')]).length,0,'idle must hide stale session activities');
const orphan={id:'orphan',type:'other',title:'その他 7/14',state:'paused',startAt:'2026-07-14T00:00:00.000Z',metadata:{legacy_core_activity:{activityId:'orphan'}}};
assert.strictEqual(api.reconcileCurrent([orphan]).length,0,'idle must hide generic orphan paused activity');
runtime={session_state:'paused',session_id:'s1',current_activity_id:'b'};
let rows=api.reconcileCurrent([row('a','s1'),row('b','s1','paused',{updatedAt:'2026-07-15T01:00:00.000Z'}),row('c','s2')]);
assert.strictEqual(rows.length,1,'same live session must be deduplicated');
assert.strictEqual(rows[0].id,'b','current activity must win deduplication');
runtime={session_state:'idle',session_id:null,current_activity_id:null};
rows=api.reconcileCurrent([
  {id:'event',type:'event',title:'イベント',state:'active',startAt:'2026-07-15T01:00:00.000Z',metadata:{legacy_core_activity:{activityId:'event'}}},
  {id:'camp',type:'camp',title:'キャンプ',state:'active',startAt:'2026-07-15T02:00:00.000Z',metadata:{legacy_core_activity:{activityId:'camp'}}}
]);
assert.deepStrictEqual(Array.from(rows,row=>row.id),['event','camp'],'non-session activities must remain visible');
console.log('v165.1 Android evidence hotfix smoke: PASS');
