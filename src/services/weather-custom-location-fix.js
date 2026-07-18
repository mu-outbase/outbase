(() => {
  'use strict';

  const base=globalThis.OUTBASE_WEATHER_SERVICE_V1;
  if(!base||base.customLocationFixVersion==='r23')return;

  const CACHE_KEY=base.CACHE_KEY||'outbase_weather_live_cache_v1';
  const HOME=base.HOME_LOCATION||Object.freeze({key:'home',label:'千葉県 柏市',latitude:35.8676,longitude:139.9758});

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
  function isHomeAlias(place){return HOME_ALIASES.has(normalizeText(place));}
  function isCurrentAlias(place){return CURRENT_ALIASES.has(normalizeText(place));}
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
    return Object.freeze({...result,targets:Object.freeze(targets),customLocationFix:'r23'});
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
    }
    return base.getDetail(plan,options);
  }

  globalThis.OUTBASE_WEATHER_SERVICE_V1=Object.freeze({...base,refresh,getDetail,customLocationFixVersion:'r23'});
})();
