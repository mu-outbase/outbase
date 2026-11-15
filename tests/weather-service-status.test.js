import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/services/weather-service.js',import.meta.url),'utf8');
function setup(){
 const data=new Map(),requests=[];let fail=false;
 const date=new Date().toISOString().slice(0,10);
 const forecast={current:{temperature_2m:21.8,weather_code:1},daily:{time:[date],temperature_2m_max:[24],temperature_2m_min:[15]},hourly:{time:[]}};
 const c=vm.createContext({Date,Map,Set,Number,Math,URLSearchParams,AbortController,setTimeout,clearTimeout,navigator:{onLine:true},localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},fetch:async url=>{requests.push(url);if(fail)throw Error('network');return {ok:true,json:async()=>url.includes('/search')?{results:[]}:forecast};}});vm.runInContext(source,c);
 return {api:c.OUTBASE_WEATHER_SERVICE_V1,context:c,data,requests,date,deny(){fail=true;}};
}
test('missing place and missing cache are explicit, including details',async()=>{
 const f=setup(),plan={id:'no-place',place:'',latitude:null,longitude:null};
 assert.equal(f.api.getToday().status,'unavailable');assert.equal(f.api.getPlan(plan).status,'place-required');assert.equal(f.api.getDetail(plan).status,'place-required');
 const result=await f.api.refresh({plan});assert.equal(result.partial,true);assert.equal(f.api.getToday().status,'ready');assert.equal(f.api.getPlan(plan).status,'place-required');assert.ok(!f.requests.some(url=>url.includes('latitude=0')));
});
test('unknown place terminates as place-not-found while home can succeed',async()=>{
 const f=setup(),plan={id:'unknown',place:'見つからない場所',startAt:f.date,endAt:f.date};
 const result=await f.api.refresh({plan});assert.equal(result.partial,true);assert.equal(f.api.getPlan(plan).status,'place-not-found');assert.equal(f.api.getDetail(plan).status,'place-not-found');
});
test('failed refresh preserves real cached timestamp and data with stale notice',async()=>{
 const f=setup();await f.api.refresh();const before=f.api.getToday(),stored=f.data.get(f.api.CACHE_KEY);f.deny();await assert.rejects(f.api.refresh());const after=f.api.getToday();
 assert.equal(after.temperature,21.8);assert.equal(after.fetchedAt,before.fetchedAt);assert.equal(after.stale,true);assert.equal(f.api.getTodayDetail().stale,true);assert.equal(f.data.get(f.api.CACHE_KEY),stored);
});
test('network failure without cache exits pending and contains no invented numbers',async()=>{
 const f=setup();f.deny();await assert.rejects(f.api.refresh());const today=f.api.getToday();assert.equal(today.status,'unavailable');assert.equal(today.temperature,null);assert.equal(today.fetchedAt,null);assert.equal(f.api.getTodayDetail().status,'unavailable');
});

test('plan campground lookup can use the existing POI resolver while keeping the plan ID',async()=>{
 const f=setup();let called='';f.context.OUTBASE_WEATHER_SERVICE_V1={...f.api,poiGeocode:async place=>{called=place;return {latitude:35.4,longitude:138.6,label:place,source:'openstreetmap-photon'};}};
 const plan={id:'camp-poi',place:'キャンプ場テスト',startAt:f.date,endAt:f.date};await f.api.refresh({plan});assert.equal(called,plan.place);assert.equal(f.api.getPlan(plan).status,'ready');assert.ok(f.requests.some(url=>url.includes('latitude=35.4')&&url.includes('longitude=138.6')));assert.match(f.api.getDetail(plan).geocodeAttribution,/Photon/);
});

test('changing selected coordinates cannot reuse a forecast for a different place',async()=>{
 const f=setup(),plan={id:'selected',place:'キャンプ場',latitude:35,longitude:139,startAt:f.date,endAt:f.date};await f.api.refresh({plan});const changed={...plan,latitude:36,longitude:138};assert.equal(f.api.getPlan(changed).status,'unavailable');assert.equal(f.api.getDetail(changed).status,'unavailable');
});
