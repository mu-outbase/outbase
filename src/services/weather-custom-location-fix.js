(() => {
  'use strict';

  const base=globalThis.OUTBASE_WEATHER_SERVICE_V1;
  if(!base||base.customLocationFixVersion==='r28')return;

  const CACHE_KEY=base.CACHE_KEY||'outbase_weather_live_cache_v1';
  const POI_CACHE_KEY='outbase_weather_poi_geocode_cache_v1';
  const POI_CACHE_TTL_MS=180*24*60*60*1000;
  const POI_CACHE_LIMIT=60;
  const POI_MIN_INTERVAL_MS=1100;
  const PHOTON_ENDPOINT='https://photon.komoot.io/api';
  const HOME=base.HOME_LOCATION||Object.freeze({key:'home',label:'千葉県 柏市',latitude:35.8676,longitude:139.9758});
  let lastPoiRequestAt=0;

  const PINPOINT_SPOTS=Object.freeze([
    Object.freeze({
      id:'fumotoppara',
      label:'ふもとっぱら',
      latitude:35.3994381,
      longitude:138.5650706,
      source:'outbase-pinpoint-catalog',
      aliases:Object.freeze([
        'ふもとっぱら','フモトッパラ','ふもとっぱらキャンプ場','ふもとっぱらオートキャンプ場',
        '静岡県富士宮市麓156','〒418-0109 静岡県富士宮市麓156'
      ])
    }),
    Object.freeze({
      id:'hottarakashi',
      label:'ほったらかしキャンプ場',
      latitude:35.70848,
      longitude:138.64852,
      source:'outbase-pinpoint-catalog',
      aliases:Object.freeze([
        'ほったらかし','ホッタラカシ','ほったらかしキャンプ場','ホッタラカシキャンプ場',
        'ほったらかしオートキャンプ場','山梨県山梨市矢坪1669-25','〒405-0036 山梨県山梨市矢坪1669-25'
      ])
    })
  ]);

  function storageGet(key,fallback=''){try{return localStorage.getItem(key)||fallback;}catch(_error){return fallback;}}
  function storageSet(key,value){try{localStorage.setItem(key,value);return true;}catch(_error){return false;}}
  function readState(){try{const value=JSON.parse(storageGet(CACHE_KEY,'')||'{}');if(!value||typeof value!=='object')return {version:1,targets:{}};if(!value.targets||typeof value.targets!=='object')value.targets={};return value;}catch(_error){return {version:1,targets:{}};}}
  function hash(text){let h=2166136261;for(const ch of String(text||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
  function customKey(place){return `custom:${hash(place)}`;}
  function normalizeText(value){
    let text=String(value||'').trim();
    try{text=text.normalize('NFKC');}catch(_error){}
    return text.replace(/[　\s]+/g,'').replace(/[・･,，、。\.\-−ー]/g,'').toLowerCase();
  }
  function normalizedDisplay(value){
    let text=String(value||'').trim();
    try{text=text.normalize('NFKC');}catch(_error){}
    return text.replace(/[　\s]+/g,' ').trim();
  }
  const HOME_ALIASES=new Set([
    HOME.label,'千葉県 柏市','千葉県柏市','柏市','柏','自宅'
  ].map(normalizeText));
  const CURRENT_ALIASES=new Set([
    '現在地','現在位置','今いる場所'
  ].map(normalizeText));
  const PINPOINT_BY_ALIAS=new Map();
  for(const spot of PINPOINT_SPOTS){for(const alias of spot.aliases||[]){PINPOINT_BY_ALIAS.set(normalizeText(alias),spot);}}
  function isHomeAlias(place){return HOME_ALIASES.has(normalizeText(place));}
  function isCurrentAlias(place){return CURRENT_ALIASES.has(normalizeText(place));}
  function pinpointSpot(place){return PINPOINT_BY_ALIAS.get(normalizeText(place))||null;}
  function municipalityCandidate(place){
    let text=String(place||'').trim();
    try{text=text.normalize('NFKC');}catch(_error){}
    text=text.replace(/〒?\d{3}-?\d{4}/g,'').replace(/[、,]/g,' ').replace(/\s+/g,' ').trim();
    const compact=text.replace(/\s+/g,'');
    const matched=compact.match(/^(?:北海道|東京都|大阪府|京都府|.{2,3}県)?(.+?(?:市|区|町|村))/);
    return matched?.[1]||'';
  }
  function isAdministrativePlace(place){
    const compact=normalizedDisplay(place).replace(/\s+/g,'');
    if(/\d/.test(compact))return false;
    return /(?:都|道|府|県)?[^都道府県市区町村]{1,12}(?:市|区|町|村)$/.test(compact);
  }
  function baseCatalogHas(place){return Boolean(base?.PLACE_COORDINATES&&base.PLACE_COORDINATES[String(place||'').trim()]);}
  function copyTarget(fromKey,toKey,label,extra={}){
    const state=readState();const source=state.targets[fromKey];if(!source)return false;
    state.targets[toKey]={...source,...extra,key:toKey,label:String(label||source.label||''),storedAt:Date.now()};
    return storageSet(CACHE_KEY,JSON.stringify(state));
  }
  function currentSourceKey(result=null){
    const reported=Array.isArray(result?.targets)?result.targets:[];
    const direct=reported.find(key=>key==='current'||key==='current-fallback');
    if(direct)return direct;
    const state=readState();
    if(state.targets.current)return 'current';
    if(state.targets['current-fallback'])return 'current-fallback';
    return '';
  }
  function withTarget(result,key,extra={}){
    const targets=[...new Set([...(Array.isArray(result?.targets)?result.targets:[]),key])];
    return Object.freeze({...result,...extra,targets:Object.freeze(targets),customLocationFix:'r28'});
  }

  function readPoiCache(){
    try{const value=JSON.parse(storageGet(POI_CACHE_KEY,'{}')||'{}');return value&&typeof value==='object'?value:{};}catch(_error){return {};}
  }
  function writePoiCache(place,value){
    const cache=readPoiCache();const key=normalizeText(place);if(!key)return false;
    cache[key]={...value,storedAt:Date.now()};
    const rows=Object.entries(cache).sort((a,b)=>(b[1]?.storedAt||0)-(a[1]?.storedAt||0)).slice(0,POI_CACHE_LIMIT);
    return storageSet(POI_CACHE_KEY,JSON.stringify(Object.fromEntries(rows)));
  }
  function cachedPoi(place){
    const value=readPoiCache()[normalizeText(place)];
    if(!value)return null;
    if(Date.now()-(Number(value.storedAt)||0)>POI_CACHE_TTL_MS)return null;
    const latitude=Number(value.latitude),longitude=Number(value.longitude);
    return Number.isFinite(latitude)&&Number.isFinite(longitude)?{...value,latitude,longitude}:null;
  }
  function sleep(ms){return new Promise(resolve=>setTimeout(resolve,Math.max(0,ms)));}
  async function waitPoiSlot(){
    const remaining=POI_MIN_INTERVAL_MS-(Date.now()-lastPoiRequestAt);
    if(remaining>0)await sleep(remaining);
    lastPoiRequestAt=Date.now();
  }
  async function fetchPoiJson(url,{timeout=12000}={}){
    await waitPoiSlot();
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeout);
    try{
      const response=await fetch(url,{cache:'no-store',signal:controller.signal,headers:{Accept:'application/json','Accept-Language':'ja'},referrerPolicy:'strict-origin-when-cross-origin'});
      if(!response.ok)throw new Error(`weather_poi_http_${response.status}`);
      const value=await response.json();return Array.isArray(value?.features)?value.features:[];
    }finally{clearTimeout(timer);}
  }
  function facilityHint(place){
    const text=normalizedDisplay(place);
    if(/キャンプ|camp/i.test(text))return 'camp';
    if(/公園|パーク|park/i.test(text))return 'park';
    if(/温泉|onsen|spa/i.test(text))return 'spa';
    return '';
  }
  function poiQueries(place){
    const original=normalizedDisplay(place);const rows=[];const add=value=>{const text=String(value||'').trim();if(text&&!rows.includes(text))rows.push(text);};
    add(`${original}, 日本`);
    if(!isAdministrativePlace(original)&&!/[0-9０-９]/.test(original)&&!/(キャンプ|公園|パーク|温泉|ロッジ|ビレッジ|フィールド|牧場|海岸|湖|山|神社|道の駅)/.test(original)){
      add(`${original} キャンプ場, 日本`);
      add(`${original} 公園, 日本`);
    }
    return rows.slice(0,3);
  }
  function poiProperties(row){return row?.properties&&typeof row.properties==='object'?row.properties:{};}
  function poiName(row){return normalizedDisplay(poiProperties(row).name||'');}
  function poiCoordinates(row){
    const coordinates=Array.isArray(row?.geometry?.coordinates)?row.geometry.coordinates:[];
    const longitude=Number(coordinates[0]),latitude=Number(coordinates[1]);
    return {latitude,longitude};
  }
  function poiDisplayName(row){
    const props=poiProperties(row);
    return [props.name,props.street,props.locality,props.district,props.city,props.county,props.state,props.country].filter(Boolean).filter((value,index,array)=>array.indexOf(value)===index).join(', ');
  }
  function poiScore(row,place,query){
    const props=poiProperties(row);const source=normalizeText(place),name=normalizeText(poiName(row)),display=normalizeText(poiDisplayName(row));
    const osmKey=String(props.osm_key||'').toLowerCase();const osmValue=String(props.osm_value||'').toLowerCase();const layer=String(props.type||'').toLowerCase();const hint=facilityHint(query||place);
    let score=0;
    if(name===source)score+=240;
    else if(name.startsWith(source)||source.startsWith(name))score+=180;
    else if(name.includes(source)||source.includes(name))score+=145;
    if(display.includes(source))score+=100;
    if(String(props.countrycode||'').toLowerCase()==='jp')score+=20;
    if(hint==='camp'&&(osmValue==='camp_site'||osmValue==='caravan_site'||/camp/.test(osmValue)||osmKey==='tourism'))score+=90;
    if(hint==='park'&&(osmValue==='park'||osmKey==='leisure'))score+=70;
    if(hint==='spa'&&(/spa|hot_spring|bath/.test(osmValue)||osmKey==='amenity'))score+=60;
    if(['city','county','state','country'].includes(layer)&&!isAdministrativePlace(place))score-=45;
    const coordinates=poiCoordinates(row);if(!Number.isFinite(coordinates.latitude)||!Number.isFinite(coordinates.longitude))return -999;
    return score;
  }
  async function poiGeocode(place){
    const original=normalizedDisplay(place);if(!original)throw new Error('weather_place_missing');
    const fixed=pinpointSpot(original);if(fixed)return {...fixed,query:original};
    const cached=cachedPoi(original);if(cached)return cached;
    let best=null;
    for(const query of poiQueries(original)){
      const params=new URLSearchParams({q:query,limit:'8',lang:'ja',countrycode:'JP'});
      const rows=await fetchPoiJson(`${PHOTON_ENDPOINT}?${params}`);
      for(const row of rows){const score=poiScore(row,original,query);if(!best||score>best.score)best={row,score,query};}
      if(best&&best.score>=220)break;
    }
    if(!best||best.score<100)throw new Error('weather_pinpoint_place_not_found');
    const coordinates=poiCoordinates(best.row);const label=poiName(best.row)||original;
    const value={label,latitude:coordinates.latitude,longitude:coordinates.longitude,timezone:'Asia/Tokyo',source:'openstreetmap-photon',query:best.query,displayName:poiDisplayName(best.row)||label,score:Math.round(best.score)};
    writePoiCache(original,value);return value;
  }
  async function refreshCoordinatePoint(options,custom,requestedPlace,point,{prefix='poi',id=''}={}){
    const pointId=id||hash(normalizeText(requestedPlace));const planId=`${prefix}-${pointId}`;
    const plan={
      id:planId,place:point.label||requestedPlace,latitude:Number(point.latitude),longitude:Number(point.longitude),
      startAt:custom?.start?`${custom.start}T00:00:00`:Date.now(),
      endAt:custom?.end?`${custom.end}T23:59:59`:custom?.start?`${custom.start}T23:59:59`:Date.now()
    };
    if(!Number.isFinite(plan.latitude)||!Number.isFinite(plan.longitude))throw new Error('weather_pinpoint_coordinate_invalid');
    const result=await base.refresh({...options,custom:null,plan,plans:[],scope:'home'});
    const fromKey=`plan:${planId}`;const toKey=customKey(requestedPlace);
    if(!copyTarget(fromKey,toKey,point.label||requestedPlace,{geocodeSource:point.source||prefix,resolvedLabel:point.label||requestedPlace}))throw new Error('weather_pinpoint_cache_failed');
    return withTarget(result,toKey,{resolvedPlace:Object.freeze({label:point.label||requestedPlace,latitude:plan.latitude,longitude:plan.longitude,source:point.source||prefix})});
  }
  async function refresh(options={}){
    const custom=options?.custom&&typeof options.custom==='object'?options.custom:null;
    const requestedPlace=String(custom?.place||'').trim();
    if(!requestedPlace)return base.refresh(options);

    if(isCurrentAlias(requestedPlace)){
      const result=await base.refresh({...options,custom:null,plan:null,plans:[],scope:'current'});
      const sourceKey=currentSourceKey(result);const key=customKey(requestedPlace);
      if(!sourceKey||!copyTarget(sourceKey,key,requestedPlace))throw new Error('weather_current_alias_cache_failed');
      return withTarget(result,key);
    }

    if(isHomeAlias(requestedPlace)){
      const result=await base.refresh({...options,custom:null,plan:null,plans:[],scope:'home'});
      const key=customKey(requestedPlace);
      if(!copyTarget(HOME.key||'home',key,requestedPlace))throw new Error('weather_home_alias_cache_failed');
      return withTarget(result,key);
    }

    const spot=pinpointSpot(requestedPlace);
    if(spot)return refreshCoordinatePoint(options,custom,requestedPlace,spot,{prefix:'pinpoint',id:spot.id});

    const baseFirst=isAdministrativePlace(requestedPlace)||baseCatalogHas(requestedPlace);
    let baseError=null,poiError=null;
    if(baseFirst){
      try{return await base.refresh(options);}catch(error){baseError=error;}
      try{return await refreshCoordinatePoint(options,custom,requestedPlace,await poiGeocode(requestedPlace));}catch(error){poiError=error;}
    }else{
      try{return await refreshCoordinatePoint(options,custom,requestedPlace,await poiGeocode(requestedPlace));}catch(error){poiError=error;}
      if(baseCatalogHas(requestedPlace)){try{return await base.refresh(options);}catch(error){baseError=error;}}
    }

    const candidate=municipalityCandidate(requestedPlace);
    if(candidate&&isAdministrativePlace(candidate)&&normalizeText(candidate)!==normalizeText(requestedPlace)){
      try{
        const result=await base.refresh({...options,custom:{...custom,place:candidate}});const fromKey=customKey(candidate);const toKey=customKey(requestedPlace);
        if(copyTarget(fromKey,toKey,requestedPlace,{geocodeSource:'municipality-fallback'}))return withTarget(result,toKey,{partialLocation:true});
      }catch(error){baseError=baseError||error;}
    }
    throw poiError||baseError||new Error('weather_pinpoint_place_not_found');
  }
  function getDetail(plan,options={}){
    const requestedPlace=String(options?.place||'').trim();
    if(requestedPlace&&isCurrentAlias(requestedPlace)){
      const state=readState();const key=customKey(requestedPlace);const sourceKey=state.targets.current?'current':state.targets['current-fallback']?'current-fallback':'';
      if(!state.targets[key]&&sourceKey)copyTarget(sourceKey,key,requestedPlace);
    }else if(requestedPlace&&isHomeAlias(requestedPlace)){
      const state=readState();const key=customKey(requestedPlace);
      if(!state.targets[key]&&state.targets[HOME.key||'home'])copyTarget(HOME.key||'home',key,requestedPlace);
    }else if(requestedPlace){
      const state=readState();const key=customKey(requestedPlace);const spot=pinpointSpot(requestedPlace);const cached=cachedPoi(requestedPlace);
      if(!state.targets[key]&&spot)copyTarget(`plan:pinpoint-${spot.id}`,key,spot.label,{geocodeSource:spot.source||'outbase-pinpoint-catalog'});
      if(!state.targets[key]&&cached)copyTarget(`plan:poi-${hash(normalizeText(requestedPlace))}`,key,cached.label||requestedPlace,{geocodeSource:cached.source||'openstreetmap-photon'});
    }
    const detail=base.getDetail(plan,options);
    if(!detail||!requestedPlace)return detail;
    const target=readState().targets[customKey(requestedPlace)];
    if(target?.geocodeSource==='openstreetmap-photon')return Object.freeze({...detail,geocodeSource:'Photon / OpenStreetMap',geocodeAttribution:'地点検索：Photon / © OpenStreetMap contributors'});
    return detail;
  }

  globalThis.OUTBASE_WEATHER_SERVICE_V1=Object.freeze({...base,refresh,getDetail,poiGeocode,pinpointSpot,PINPOINT_SPOTS,POI_CACHE_KEY,customLocationFixVersion:'r28'});
})();
