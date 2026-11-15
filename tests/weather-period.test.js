import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/services/weather-service.js',import.meta.url),'utf8');
function setup({truncate=false}={}){
 const times=[];for(let day=22;day<=25;day++)for(let h=0;h<24;h++)if(!truncate||day<24)times.push(`2026-11-${day}T${String(h).padStart(2,'0')}:00`);
 const dates=truncate?['2026-11-22','2026-11-23']:['2026-11-22','2026-11-23','2026-11-24','2026-11-25'];
 const data={current:{temperature_2m:10,weather_code:1},daily:{time:dates,temperature_2m_max:dates.map(()=>15),temperature_2m_min:dates.map(()=>2)},hourly:{time:times,temperature_2m:times.map(t=>t==='2026-11-24T05:00'?-4:10),weather_code:times.map(()=>1),precipitation_probability:times.map(t=>t==='2026-11-23T16:00'?90:10),wind_gusts_10m:times.map(t=>t==='2026-11-23T16:00'?12:2)}};
 const store=new Map();const c=vm.createContext({Date,Number,Math,Map,Set,JSON,URLSearchParams,AbortController,setTimeout,clearTimeout,navigator:{onLine:true},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},fetch:async()=>({ok:true,json:async()=>data})});vm.runInContext(source,c);
 return c.OUTBASE_WEATHER_SERVICE_V1;
}
const plan={id:'three-day-camp',place:'キャンプ場',latitude:35,longitude:139,startAt:'2026-11-22T09:00',endAt:'2026-11-24T10:00'};
test('three-day camp retains all 50 hourly slots and all three daily summaries inside check-in/out',async()=>{
 const api=setup();await api.refresh({plan});const detail=api.getDetail(plan),summary=api.getPlan(plan);assert.equal(detail.hourly.length,50);assert.equal(detail.hourly[0].at,plan.startAt);assert.equal(detail.hourly.at(-1).at,plan.endAt);assert.equal(detail.partial,false);assert.equal(detail.startAt,plan.startAt);assert.equal(detail.endAt,plan.endAt);
 assert.deepEqual(Array.from(summary.daily,r=>r.hourCount),[15,24,11]);assert.equal(summary.rainPeak,90);assert.equal(summary.low,-4);assert.equal(detail.hourly.find(r=>r.at==='2026-11-23T16:00').windGust,12);assert.equal(detail.hourly.find(r=>r.at==='2026-11-24T05:00').temperature,-4);
});
test('partial periods and dates outside available forecast are explicit',async()=>{
 const api=setup({truncate:true});await api.refresh({plan});const partial=api.getDetail(plan);assert.equal(partial.partial,true);assert.equal(partial.hourly.at(-1).at,'2026-11-23T23:00');const later=api.getDetail({...plan,startAt:'2026-12-01T09:00',endAt:'2026-12-02T10:00'});assert.equal(later.status,'out-of-range');assert.equal(later.hourly.length,0);assert.equal(later.judgements.length,0);
});
