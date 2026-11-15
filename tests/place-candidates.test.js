import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/services/weather-custom-location-fix.js',import.meta.url),'utf8');
test('supported query language returns all homonyms with addresses and prioritizes camp without saving a choice',async()=>{
 const store=new Map(),requests=[];
 const feature=(name,city,lat,kind)=>({geometry:{coordinates:[138,lat]},properties:{name,state:'静岡県',city,countrycode:'JP',osm_key:kind==='camp_site'?'tourism':'leisure',osm_value:kind}});
 const features=[feature('朝霧ジャンボリーゴルフ倶楽部','富士宮市',35.3,'golf_course'),feature('朝霧ジャンボリーオートキャンプ場','富士宮市',35.4,'camp_site'),feature('朝霧ジャンボリーキャンプ場','別の市',35.5,'camp_site'),{geometry:{coordinates:[null,null]},properties:{name:'朝霧ジャンボ',countrycode:'JP'}}];
 const c=vm.createContext({Date,Map,Set,Number,Math,JSON,URLSearchParams,AbortController,setTimeout,clearTimeout,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},OUTBASE_WEATHER_SERVICE_V1:{},fetch:async url=>{requests.push(url);const u=new URL(url);assert.equal(u.searchParams.get('lang'),'default');return {ok:true,json:async()=>({features})};}});vm.runInContext(source,c);
 const rows=await c.OUTBASE_WEATHER_SERVICE_V1.placeCandidates('朝霧ジャンボ',{kind:'camp'});assert.equal(rows.length,3);assert.match(rows[0].label,/キャンプ場/);assert.ok(rows.some(r=>r.label.includes('ゴルフ')));assert.ok(rows.some(r=>r.address.includes('別の市')));assert.equal(store.size,0);assert.equal(requests.length,1);
});
