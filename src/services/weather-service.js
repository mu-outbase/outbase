(() => {
  'use strict';

  const CACHE_KEY='outbase_weather_live_cache_v1';
  const GEOCODE_KEY='outbase_weather_geocode_cache_v1';
  const HOME_LOCATION=Object.freeze({key:'home',label:'千葉県 柏市',latitude:35.8676,longitude:139.9758,source:'home-default'});
  const FORECAST_ENDPOINT='https://api.open-meteo.com/v1/forecast';
  const GEOCODE_ENDPOINT='https://geocoding-api.open-meteo.com/v1/search';
  const PROVIDER='Open-Meteo Best Match';
  const ATTRIBUTION='Weather data by Open-Meteo.com';
  const MAX_CACHE_TARGETS=12;
  const PLACE_ALIASES=Object.freeze({
    '西湖キャンプビレッジ・ノーム':'西湖 山梨県',
    '柏の葉公園':'柏市 千葉県',
    '九十九里海岸':'九十九里町 千葉県',
    '森のイベント広場':'柏市 千葉県'
  });
  const PLACE_COORDINATES=Object.freeze({
    '西湖キャンプビレッジ・ノーム':Object.freeze({label:'西湖キャンプビレッジ・ノーム',latitude:35.50351,longitude:138.683287,timezone:'Asia/Tokyo',source:'place-catalog'}),
    '柏の葉公園':Object.freeze({label:'柏の葉公園',latitude:35.8948784,longitude:139.9414857,timezone:'Asia/Tokyo',source:'place-catalog'}),
    '九十九里海岸':Object.freeze({label:'九十九里海岸（片貝）',latitude:35.530721,longitude:140.44638,timezone:'Asia/Tokyo',source:'place-catalog'}),
    '森のイベント広場':Object.freeze({label:'柏市',latitude:35.8676,longitude:139.9758,timezone:'Asia/Tokyo',source:'place-catalog'})
  });

  function storageGet(key,fallback=''){try{return localStorage.getItem(key)||fallback;}catch(_error){return fallback;}}
  function storageSet(key,value){try{localStorage.setItem(key,value);return true;}catch(_error){return false;}}
  function readJson(key,fallback){try{return JSON.parse(storageGet(key,''))||fallback;}catch(_error){return fallback;}}
  function round(value,digits=1){const n=Number(value);if(!Number.isFinite(n))return null;const p=10**digits;return Math.round(n*p)/p;}
  function validNumber(value){const n=Number(value);return Number.isFinite(n)?n:null;}
  function freezeRows(rows){return Object.freeze(rows.map(row=>Object.freeze(row)));}
  function hash(text){let h=2166136261;for(const ch of String(text||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
  function isoDate(value){const d=new Date(value);if(Number.isNaN(d.getTime()))return '';return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function jpDate(value){const d=new Date(value);if(Number.isNaN(d.getTime()))return '';return `${d.getMonth()+1}/${d.getDate()}`;}
  function timeLabel(value){const d=new Date(value);if(Number.isNaN(d.getTime()))return '';return `${String(d.getHours()).padStart(2,'0')}:00`;}
  function directionLabel(deg){const n=Number(deg);if(!Number.isFinite(n))return '—';const labels=['北','北北東','北東','東北東','東','東南東','南東','南南東','南','南南西','南西','西南西','西','西北西','北西','北北西'];return labels[Math.round(((n%360)+360)%360/22.5)%16];}
  function conditionFromCode(code){
    const n=Number(code);
    if(n===0)return '晴れ';
    if([1,2].includes(n))return '晴れ時々くもり';
    if(n===3)return 'くもり';
    if([45,48].includes(n))return '霧';
    if([51,53,55,56,57].includes(n))return '霧雨';
    if([61,63,65,66,67].includes(n))return n>=65?'強い雨':'雨';
    if([71,73,75,77,85,86].includes(n))return '雪';
    if([80,81,82].includes(n))return n===82?'強いにわか雨':'にわか雨';
    if([95,96,99].includes(n))return '雷雨';
    return '天気変化あり';
  }
  function confidenceFor(at,spread=0){
    const hours=Math.max(0,(new Date(at).getTime()-Date.now())/3600000);
    let grade=hours<=24?'A':hours<=72?'A−':hours<=120?'B＋':hours<=168?'B':hours<=240?'C＋':'C';
    if(spread>=2&&grade==='A')grade='A−';
    if(spread>=4&&/^A/.test(grade))grade='B＋';
    return grade;
  }
  function fetchJson(url,{timeout=12000}={}){
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeout);
    return fetch(url,{cache:'no-store',signal:controller.signal,headers:{Accept:'application/json'}}).then(async response=>{
      if(!response.ok)throw new Error(`weather_http_${response.status}`);
      const data=await response.json();if(data?.error)throw new Error(data.reason||'weather_api_error');return data;
    }).finally(()=>clearTimeout(timer));
  }
  function cacheState(){const value=readJson(CACHE_KEY,{version:1,targets:{}});if(!value.targets||typeof value.targets!=='object')value.targets={};return value;}
  function writeTarget(key,value){const state=cacheState();state.targets[key]={...value,key,storedAt:Date.now()};const entries=Object.entries(state.targets).sort((a,b)=>(b[1].storedAt||0)-(a[1].storedAt||0)).slice(0,MAX_CACHE_TARGETS);state.targets=Object.fromEntries(entries);storageSet(CACHE_KEY,JSON.stringify(state));return state.targets[key];}
  function readTarget(key){return cacheState().targets[key]||null;}
  function geocodeCache(){const value=readJson(GEOCODE_KEY,{});return value&&typeof value==='object'?value:{};}
  function writeGeocode(query,value){const cache=geocodeCache();cache[query]={...value,storedAt:Date.now()};const entries=Object.entries(cache).sort((a,b)=>(b[1].storedAt||0)-(a[1].storedAt||0)).slice(0,40);storageSet(GEOCODE_KEY,JSON.stringify(Object.fromEntries(entries)));}
  function coordinateFromPlan(plan){
    const candidates=[
      [plan?.latitude,plan?.longitude],[plan?.lat,plan?.lng],[plan?.lat,plan?.lon],
      [plan?.location?.latitude,plan?.location?.longitude],[plan?.location?.lat,plan?.location?.lng],
      [plan?.placeLatitude,plan?.placeLongitude],[plan?.gps?.lat,plan?.gps?.lng]
    ];
    for(const [lat,lon] of candidates){const latitude=validNumber(lat),longitude=validNumber(lon);if(latitude!==null&&longitude!==null)return {latitude,longitude};}
    return null;
  }
  function simplifyPlace(place){return String(place||'').replace(/[・]/g,' ').replace(/(オート)?キャンプ(場|フィールド|ビレッジ)?/g,' ').replace(/サイト/g,' ').replace(/\s+/g,' ').trim();}
  async function geocode(place){
    const original=String(place||'').trim();if(!original)throw new Error('weather_place_missing');
    const fixed=PLACE_COORDINATES[original];if(fixed){const value={...fixed,query:original};writeGeocode(original,value);return value;}
    const query=PLACE_ALIASES[original]||original;const cached=geocodeCache()[query];if(cached&&Date.now()-(cached.storedAt||0)<30*86400000)return cached;
    const queries=[query,simplifyPlace(query)].filter((value,index,array)=>value.length>=2&&array.indexOf(value)===index);
    for(const candidate of queries){
      const url=`${GEOCODE_ENDPOINT}?name=${encodeURIComponent(candidate)}&count=8&language=ja&countryCode=JP&format=json`;
      const data=await fetchJson(url);const result=(data.results||[])[0];
      if(result){const value={label:[result.admin1,result.admin2,result.name].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(' '),latitude:result.latitude,longitude:result.longitude,timezone:result.timezone||'Asia/Tokyo',query:candidate};writeGeocode(query,value);return value;}
    }
    throw new Error('weather_place_not_found');
  }
  function currentPosition(){return new Promise((resolve,reject)=>{
    if(!navigator.geolocation){reject(new Error('geolocation_unavailable'));return;}
    navigator.geolocation.getCurrentPosition(position=>resolve({key:'current',label:'現在地',latitude:position.coords.latitude,longitude:position.coords.longitude,source:'geolocation'}),reject,{enableHighAccuracy:false,timeout:8000,maximumAge:15*60*1000});
  });}
  async function resolveTarget({kind='home',plan=null,place=''}={}){
    if(kind==='current'){try{return await currentPosition();}catch(_error){return {...HOME_LOCATION,key:'current-fallback',label:'千葉県 柏市（現在地未取得）'};}}
    if(kind==='home')return HOME_LOCATION;
    const coords=coordinateFromPlan(plan);const label=String(place||plan?.place||'').trim();
    if(coords)return {key:`plan:${plan?.id||hash(label)}`,label:label||'予定の場所',...coords,source:'plan-coordinate'};
    const geo=await geocode(label);return {key:`plan:${plan?.id||hash(label)}`,label:label||geo.label,...geo,source:'geocode'};
  }
  function forecastUrl(location){
    const current='temperature_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m';
    const hourly='temperature_2m,apparent_temperature,precipitation_probability,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m';
    const daily='weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,sunrise,sunset';
    const params=new URLSearchParams({latitude:String(location.latitude),longitude:String(location.longitude),current,hourly,daily,timezone:'Asia/Tokyo',wind_speed_unit:'ms',forecast_days:'16'});
    return `${FORECAST_ENDPOINT}?${params}`;
  }
  function at(array,index,fallback=null){return Array.isArray(array)&&index<array.length&&array[index]!==null&&array[index]!==undefined?array[index]:fallback;}
  function normalize(location,data){
    const hourlyTimes=data.hourly?.time||[];const hourly=hourlyTimes.map((time,index)=>({
      at:time,weatherCode:at(data.hourly.weather_code,index),condition:conditionFromCode(at(data.hourly.weather_code,index)),
      temperature:round(at(data.hourly.temperature_2m,index)),feelsLike:round(at(data.hourly.apparent_temperature,index)),
      rainProbability:round(at(data.hourly.precipitation_probability,index),0)??0,rainfall:round(at(data.hourly.precipitation,index),1)??0,
      windDirection:directionLabel(at(data.hourly.wind_direction_10m,index)),windDirectionDegrees:round(at(data.hourly.wind_direction_10m,index),0),
      windAverage:round(at(data.hourly.wind_speed_10m,index),1)??0,windGust:round(at(data.hourly.wind_gusts_10m,index),1)??round(at(data.hourly.wind_speed_10m,index),1)??0,
      confidence:confidenceFor(time)
    }));
    const dailyTimes=data.daily?.time||[];const daily=dailyTimes.map((date,index)=>({
      date,weatherCode:at(data.daily.weather_code,index),condition:conditionFromCode(at(data.daily.weather_code,index)),
      high:round(at(data.daily.temperature_2m_max,index)),low:round(at(data.daily.temperature_2m_min,index)),rainProbability:round(at(data.daily.precipitation_probability_max,index),0)??0,
      rainfall:round(at(data.daily.precipitation_sum,index),1)??0,windMax:round(at(data.daily.wind_speed_10m_max,index),1)??0,windGust:round(at(data.daily.wind_gusts_10m_max,index),1)??0,
      windDirection:directionLabel(at(data.daily.wind_direction_10m_dominant,index)),sunrise:at(data.daily.sunrise,index),sunset:at(data.daily.sunset,index),confidence:confidenceFor(`${date}T12:00`)
    }));
    const current=data.current||{};return Object.freeze({
      key:location.key,label:location.label,latitude:location.latitude,longitude:location.longitude,elevation:data.elevation??null,timezone:data.timezone||'Asia/Tokyo',
      provider:PROVIDER,attribution:ATTRIBUTION,fetchedAt:Date.now(),
      current:Object.freeze({at:current.time||new Date().toISOString(),weatherCode:current.weather_code,condition:conditionFromCode(current.weather_code),temperature:round(current.temperature_2m),feelsLike:round(current.apparent_temperature),rainfall:round(current.precipitation),windAverage:round(current.wind_speed_10m),windGust:round(current.wind_gusts_10m),windDirection:directionLabel(current.wind_direction_10m)}),
      hourly:freezeRows(hourly),daily:freezeRows(daily)
    });
  }
  async function fetchTarget(location){const data=await fetchJson(forecastUrl(location));return writeTarget(location.key,normalize(location,data));}
  function dayFor(forecast,date){const target=isoDate(date);return forecast?.daily?.find(row=>row.date===target)||null;}
  function hoursFor(forecast,start,end,{paddingBeforeMs=0,paddingAfterMs=0}={}){
    if(!forecast)return [];
    const startMs=new Date(start||Date.now()).getTime();let endMs=new Date(end||start||Date.now()).getTime();
    if(!Number.isFinite(startMs))return [];
    if(!Number.isFinite(endMs)||endMs<startMs)endMs=startMs;
    const lower=startMs-Math.max(0,Number(paddingBeforeMs)||0);const upper=endMs+Math.max(0,Number(paddingAfterMs)||0);
    return (forecast.hourly||[]).filter(row=>{const value=new Date(row.at).getTime();return Number.isFinite(value)&&value>=lower&&value<=upper;});
  }
  function representativeCondition(rows,fallback='天気変化あり'){
    if(!rows.length)return fallback;
    const priority=[/雷/,/強い雨|強いにわか雨/,/雨|にわか雨|霧雨/,/雪/,/霧/,/くもり/,/晴れ時々くもり/,/晴れ/];
    for(const pattern of priority){const found=rows.find(row=>pattern.test(String(row.condition||'')));if(found)return found.condition;}
    const counts=new Map();for(const row of rows){const key=String(row.condition||fallback);counts.set(key,(counts.get(key)||0)+1);}
    return [...counts.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||fallback;
  }
  function summaryConfidence(rows){if(!rows.length)return '—';const rank={'A':5,'A−':4,'B＋':3,'B':2,'C＋':1,'C':0};return rows.reduce((worst,row)=>rank[row.confidence]<rank[worst]?row.confidence:worst,rows[0].confidence||'C');}
  function todayView(forecast,now=new Date()){
    if(!forecast)return null;
    const day=dayFor(forecast,now)||forecast.daily?.[0];const current=forecast.current||{};const nowMs=new Date(now).getTime();
    const nearRows=(forecast.hourly||[]).filter(row=>{const atMs=new Date(row.at).getTime();return Number.isFinite(atMs)&&atMs>=nowMs-30*60000&&atMs<=nowMs+3*3600000;});
    const rainNear=Math.max(0,...nearRows.map(row=>Number(row.rainProbability)||0));const rainPeakToday=Number(day?.rainProbability)||0;
    return Object.freeze({status:'ready',sample:false,locationLabel:forecast.label,latitude:forecast.latitude,longitude:forecast.longitude,locationKey:forecast.key,condition:current.condition||day?.condition||'天気情報',temperature:current.temperature,high:day?.high,low:day?.low,rain:rainNear,rainPeakToday,wind:current.windAverage??day?.windMax??0,windGust:current.windGust??day?.windGust??0,provider:forecast.provider,attribution:forecast.attribution,fetchedAt:forecast.fetchedAt});
  }
  function planView(forecast,plan){
    if(!forecast)return null;
    const start=plan?.startAt||Date.now();const end=plan?.endAt||start;
    const days=(forecast.daily||[]).filter(row=>row.date>=isoDate(start)&&row.date<=isoDate(end));
    const hours=hoursFor(forecast,start,end);
    if(!days.length&&!hours.length)return Object.freeze({status:'out-of-range',sample:false,place:forecast.label,latitude:forecast.latitude,longitude:forecast.longitude,locationKey:forecast.key,condition:'予報期間外',message:'16日より先の予報は、日程が近づくと自動表示します。',alerts:[],provider:forecast.provider,attribution:forecast.attribution,fetchedAt:forecast.fetchedAt});

    const hourTemps=hours.map(row=>row.temperature).filter(Number.isFinite);
    const high=hourTemps.length?Math.max(...hourTemps):Math.max(...days.map(row=>row.high).filter(Number.isFinite));
    const low=hourTemps.length?Math.min(...hourTemps):Math.min(...days.map(row=>row.low).filter(Number.isFinite));
    const rainPeak=hours.length?Math.max(0,...hours.map(row=>row.rainProbability||0)):Math.max(0,...days.map(row=>row.rainProbability||0));
    const windMax=hours.length?Math.max(0,...hours.map(row=>row.windAverage||0)):Math.max(0,...days.map(row=>row.windMax||0));
    const windGustMax=hours.length?Math.max(0,...hours.map(row=>row.windGust||0)):Math.max(0,...days.map(row=>row.windGust||0));
    const rainy=hours.reduce((best,row)=>(row.rainProbability||0)>(best?.rainProbability||-1)?row:best,null);
    const windy=hours.reduce((best,row)=>(row.windGust||0)>(best?.windGust||-1)?row:best,null);
    const hottest=hours.reduce((best,row)=>(row.temperature||-99)>(best?.temperature||-99)?row:best,null);
    const alerts=[];
    if(rainy&&rainy.rainProbability>=30)alerts.push({time:`${jpDate(rainy.at)} ${timeLabel(rainy.at)}`,text:`雨に備えて雨具を準備（降水${rainy.rainProbability}%）`});
    if(windy&&windy.windGust>=6)alerts.push({time:`${jpDate(windy.at)} ${timeLabel(windy.at)}`,text:`風の強まりを確認（瞬間${windy.windGust}m/s）`});
    if(hottest&&hottest.temperature>=28)alerts.push({time:`${jpDate(hottest.at)} ${timeLabel(hottest.at)}`,text:`コタの暑さ対策と水分を準備（${hottest.temperature}°）`});
    if(alerts.length<3){const endLabel=`${jpDate(end)} ${timeLabel(end)}`;alerts.push({time:endLabel,text:rainPeak<30?'予定時間は大きな天気崩れが少ない見込み':'終了前に雨雲を再確認'});}
    const condition=representativeCondition(hours,days[0]?.condition||'天気変化あり');
    const confidence=summaryConfidence(hours.length?hours:days);
    const message=rainPeak>=50?'予定時間内は雨対策を優先。':windGustMax>=8?'予定時間内の強風に注意。':Number.isFinite(high)&&high>=28?'暑さを避けて休憩と水分を。':'予定時間内は大きな崩れが少なめ。';
    return Object.freeze({status:'ready',sample:false,place:forecast.label,latitude:forecast.latitude,longitude:forecast.longitude,locationKey:forecast.key,condition,high:Number.isFinite(high)?high:null,low:Number.isFinite(low)?low:null,rainPeak,windMax,windGustMax,confidence,confidenceLabel:confidence,message,alerts:Object.freeze(alerts.slice(0,3)),provider:forecast.provider,attribution:forecast.attribution,fetchedAt:forecast.fetchedAt});
  }
  function detailView(forecast,plan,{place='',start='',end=''}={}){
    if(!forecast)return null;
    const startValue=start?`${start}T00:00:00`:plan?.startAt||Date.now();
    const endValue=end?`${end}T23:59:59`:plan?.endAt||startValue;
    const hourly=hoursFor(forecast,startValue,endValue);
    const days=(forecast.daily||[]).filter(row=>row.date>=isoDate(startValue)&&row.date<=isoDate(endValue));
    const planSummary=planView(forecast,{...plan,startAt:startValue,endAt:endValue});
    const bestSetup=hourly.filter(row=>row.rainProbability<30&&row.windAverage<4).sort((a,b)=>(a.rainProbability+a.windAverage*5)-(b.rainProbability+b.windAverage*5))[0];
    const hottest=hourly.reduce((best,row)=>(row.temperature||-99)>(best?.temperature||-99)?row:best,null);
    const windGust=planSummary?.windGustMax??0;
    const comparisons=[{source:forecast.provider,summary:planSummary?.condition||'取得済み',rainProbability:planSummary?.rainPeak??0,windGust,status:'live'}];
    return Object.freeze({status:'ready',sample:false,place:place||forecast.label,latitude:forecast.latitude,longitude:forecast.longitude,locationKey:forecast.key,activityType:plan?.type||'',condition:planSummary?.condition||days[0]?.condition||'天気情報',high:planSummary?.high,low:planSummary?.low,rainPeak:planSummary?.rainPeak??0,windAverageMax:planSummary?.windMax??0,windGust,confidence:planSummary?.confidence||'—',hourly:Object.freeze(hourly),judgements:Object.freeze([
      {label:'設営',value:bestSetup?`${jpDate(bestSetup.at)} ${timeLabel(bestSetup.at)}`:'要確認',detail:bestSetup?'雨と風が比較的弱い時間':'適した時間を判定できません'},
      {label:'雨',value:(planSummary?.rainPeak??0)>=50?'雨対策あり':'大きな心配小',detail:`予定時間内の降水ピーク ${planSummary?.rainPeak??0}%`},
      {label:'風',value:windGust>=8?'強風注意':windGust>=6?'やや注意':'概ね安心',detail:`平均最大 ${planSummary?.windMax??0}m/s・瞬間最大 ${windGust}m/s`},
      {label:'終了時',value:(planSummary?.rainPeak??0)>=50?'雨雲確認':'通常どおり',detail:'予定終了前に直近予報を再確認'},
      {label:'ペット',value:hottest&&hottest.temperature>=28?'暑さ注意':'概ね安心',detail:hottest?`予定時間内の最高気温 ${hottest.temperature}°・日陰と水分を確認`:'気温データ未取得'}
    ]),comparisons:Object.freeze(comparisons),primarySource:forecast.provider,compareSources:Object.freeze([]),provider:forecast.provider,attribution:forecast.attribution,fetchedAt:forecast.fetchedAt});
  }
  async function refresh({plan=null,scope='home',custom=null}={}){
    if(!navigator.onLine)throw new Error('weather_offline');const targets=[];const resolutionErrors=[];
    if(custom?.place){const geo=await geocode(custom.place);targets.push({key:`custom:${hash(custom.place)}`,label:custom.place,...geo,source:'custom'});}
    else{
      targets.push(await resolveTarget({kind:scope==='current'?'current':'home'}));
      if(plan?.place||coordinateFromPlan(plan)){try{targets.push(await resolveTarget({kind:'plan',plan}));}catch(error){resolutionErrors.push(error);}}
    }
    const unique=[...new Map(targets.map(item=>[item.key,item])).values()];const settled=await Promise.allSettled(unique.map(fetchTarget));const results=settled.filter(item=>item.status==='fulfilled').map(item=>item.value);const errors=[...resolutionErrors,...settled.filter(item=>item.status==='rejected').map(item=>item.reason)];
    if(!results.length)throw errors[0]||new Error('weather_refresh_failed');
    return Object.freeze({ok:true,partial:errors.length>0,updatedAt:Date.now(),targets:Object.freeze(results.map(item=>item.key)),errors:Object.freeze(errors.map(error=>String(error?.message||error)))});
  }
  function targetKeyForPlan(plan){return `plan:${plan?.id||hash(plan?.place||'')}`;}
  function targetKeyForCustom(place){return `custom:${hash(place)}`;}
  function getToday({scope='home',now=new Date()}={}){const key=scope==='current'?(readTarget('current')?'current':'current-fallback'):'home';return todayView(readTarget(key),now);}
  function getPlan(plan){return planView(readTarget(targetKeyForPlan(plan)),plan);}
  function getDetail(plan,options={}){const forecast=options.place?readTarget(targetKeyForCustom(options.place)):readTarget(targetKeyForPlan(plan));return detailView(forecast,plan,options);}
  function cacheInfo(){const state=cacheState();return Object.freeze({count:Object.keys(state.targets).length,targets:Object.freeze(Object.keys(state.targets))});}

  globalThis.OUTBASE_WEATHER_SERVICE_V1=Object.freeze({refresh,getToday,getPlan,getDetail,geocode,cacheInfo,conditionFromCode,provider:PROVIDER,attribution:ATTRIBUTION,HOME_LOCATION,PLACE_COORDINATES,CACHE_KEY});
})();
