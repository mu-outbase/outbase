import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const ctx=vm.createContext({Date,Intl,Number,String,JSON,Object,Math,Set,Error,OUTBASE_IDS:{isUlid:v=>typeof v==='string'&&v.length===26}});vm.runInContext(readFileSync(new URL('../src/domain/preparation/meal-consultation.js',import.meta.url),'utf8'),ctx);const api=ctx.OUTBASE_MEAL_CONSULTATION;
const all=['stove','pan','pot','knife','board','plate','hotsand'];const base={people:2,minutes:30,tools:all,stock:'',exclude:'',noFire:false};
test('quantities scale by people and only available tools/time are used',()=>{const rows=api.suggest(base);assert.equal(rows.find(r=>r.id==='pasta').ingredients.find(i=>i.name==='パスタ').quantity,200);const quick=api.suggest({...base,minutes:5,tools:['plate']});assert.deepEqual(Array.from(quick.map(r=>r.id)),['tuna-salad']);assert.equal(api.suggest({...base,tools:[]}).length,0);});
test('no-fire and explicit excluded ingredient filters retain matching candidates only',()=>{const rows=api.suggest({...base,noFire:true,exclude:'トマト、きゅうり'});assert.deepEqual(Array.from(rows.map(r=>r.id)),['tuna-salad']);assert.ok(rows.every(r=>!r.fire));});
test('matching stock ranks candidates without silently marking food as sufficient',()=>{const rows=api.suggest({...base,stock:'トマト、モッツァレラチーズ'});assert.equal(rows[0].id,'caprese');assert.equal(rows[0].stockMatches,2);assert.equal(rows[0].ingredients[0].stockMatch,true);assert.equal(rows[0].ingredients[0].quantity,2);assert.equal(rows[0].ingredients[0].buy,undefined);});
test('registered gear excludes zero quantity and deleted gear',()=>{const tools=api.inferredTools([{name:'鍋',quantity:0},{name:'フライパン',quantity:1},{name:'ホットサンドメーカー',quantity:1,deleted_at:'2026-11-15'},{name:'まな板',payload:{quantity:1}}]);assert.deepEqual(Array.from(tools),['pan','board']);});
test('invalid counts and limits reject',async()=>{for(const input of [{...base,people:0},{...base,people:1.5},{...base,minutes:0},{...base,stock:'x'.repeat(2001)}])assert.throws(()=>api.suggest(input));});

test('wrong context, unsupported slot and invalid date reject before any transaction',async()=>{const args={activityId:'a',displayActivityId:'a',requestId:'01234567890123456789012345',recipeId:'caprese',date:'2026-11-22',slot:'dinner',conditions:base,ingredients:[]};for(const extra of [{displayActivityId:'b'},{slot:'unknown'},{date:'2026-02-30'}])await assert.rejects(api.approve({...args,...extra}),/meal_invalid/);});
