(() => {
  'use strict';

  const base=globalThis.OUTBASE_WEATHER_SERVICE_V1;
  if(!base||base.customLocationFixVersion==='r24')return;

  const CACHE_KEY=base.CACHE_KEY||'outbase_weather_live_cache_v1';
  const HOME=base.HOME_LOCATION||Object.freeze({key:'home',label:'千葉県 柏市',latitude:35.8676,longitude:139.9758});

  const PINPOINT_SPOTS=Object.freeze([
    Object.freeze({
      id:'fumotoppara',
      label:'ふもとっぱら',
      latitude:35.3994381,
      longitude:138.5650706,
      aliases:Object.freeze([
        'ふもとっぱら','フモトッパラ','ふもとっぱらキャンプ場','ふもとっぱらオートキャンプ場',
        '静岡県富士宮市麓156','〒418-0109 静岡県富士宮市麓156'
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
    return text.replace(/[　\s]+/g,'').replace(/[・･]/g,'');
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
  function copyTarget(fromKey,toKey,label){
    const state=readState();const source=state.targets[fromKey];if(!source)return false;
    state.targets[toKey]={...source,key:toKey,label:String(label||source.label||''),storedAt:Date.now()};
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
  function withTarget(result,key){
    const targets=[...new Set([...(Array.isArray(result?.targets)?result.targets:[]),key])];
    return Object.freeze({...result,targets:Object.freeze(targets),customLocationFix:'r24'});
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
    if(spot){
      const planId=`pinpoint-${spot.id}`;
      const plan={
        id:planId,
        place:requestedPlace,
        latitude:spot.latitude,
        longitude:spot.longitude,
        startAt:custom?.start?`${custom.start}T00:00:00`:Date.now(),
        endAt:custom?.end?`${custom.end}T23:59:59`:custom?.start?`${custom.start}T23:59:59`:Date.now()
      };
      const result=await base.refresh({...options,custom:null,plan,plans:[],scope:'home'});
      const fromKey=`plan:${planId}`;const toKey=customKey(requestedPlace);
      if(!copyTarget(fromKey,toKey,requestedPlace))throw new Error('weather_pinpoint_cache_failed');
      return withTarget(result,toKey);
    }

    try{return await base.refresh(options);}catch(firstError){
      const candidate=municipalityCandidate(requestedPlace);
      if(!candidate||normalizeText(candidate)===normalizeText(requestedPlace))throw firstError;
      const result=await base.refresh({...options,custom:{...custom,place:candidate}});
      const fromKey=customKey(candidate);const toKey=customKey(requestedPlace);
      if(!copyTarget(fromKey,toKey,requestedPlace))throw firstError;
      return withTarget(result,toKey);
    }
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
      const spot=pinpointSpot(requestedPlace);const state=readState();const key=customKey(requestedPlace);
      if(spot&&!state.targets[key])copyTarget(`plan:pinpoint-${spot.id}`,key,requestedPlace);
    }
    return base.getDetail(plan,options);
  }

  globalThis.OUTBASE_WEATHER_SERVICE_V1=Object.freeze({...base,refresh,getDetail,pinpointSpot,PINPOINT_SPOTS,customLocationFixVersion:'r24'});
})();
