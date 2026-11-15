import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const ctx=vm.createContext({Date,String,Number,JSON,Error});vm.runInContext(readFileSync(new URL('../src/domain/import/reservation-import.js',import.meta.url),'utf8'),ctx);const api=ctx.OUTBASE_RESERVATION_IMPORT;
test('reservation stay dates exclude booking date and retain source for review',()=>{const c=api.extract('予約日: 2026/10/01\n施設名: 朝霧ジャンボリーオートキャンプ場\nチェックイン: 2026年11月22日 09:00\nチェックアウト: 2026年11月24日 10:00');assert.equal(c.startDate,'2026-11-22');assert.equal(c.endDate,'2026-11-24');assert.equal(c.startTime,'09:00');assert.equal(c.endTime,'10:00');assert.equal(c.place,'朝霧ジャンボリーオートキャンプ場');assert.ok(c.source.includes('予約日'));});
test('yearless and invalid dates remain unconfirmed rather than guessed',()=>{for(const text of ['施設名: キャンプ場\n宿泊日: 11/22〜11/24','施設名: キャンプ場\n宿泊日: 2026/02/30〜03/02','予約日: 2026/10/01'])assert.equal(api.extract(text).startDate,'');assert.throws(()=>api.extract(''));assert.throws(()=>api.extract('あ'.repeat(20001)));});
test('explicit year with abbreviated range and end time preserve overnight stay',()=>{const c=api.extract('施設名: 湖畔キャンプ場\n宿泊日: 2026年11月22日〜11月24日\nチェックイン: 9:00\nチェックアウト: 10:00');assert.equal(c.startDate,'2026-11-22');assert.equal(c.endDate,'2026-11-24');assert.equal(c.startTime,'09:00');});
test('pet preparation is explicit, categorized and optional',()=>{assert.deepEqual(Array.from(api.suggestions().map(r=>r.category)),['ticket','gear','shopping','note']);assert.equal(api.suggestions({pet:true}).at(-1).category,'pet');});

test('same-line check-in and checkout retain their own times',()=>{const c=api.extract('施設名: 湖畔キャンプ場\n宿泊日: 2026/11/22〜11/24\nチェックイン 15:00 チェックアウト 10:00');assert.equal(c.startTime,'15:00');assert.equal(c.endTime,'10:00');});
