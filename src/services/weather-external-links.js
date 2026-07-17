(() => {
  'use strict';

  const STORAGE_KEY='outbase_weather_external_links_v1';
  const PROVIDERS=Object.freeze([
    Object.freeze({id:'weathernews',label:'ウェザーニュース',shortLabel:'Weathernews',mode:'auto'}),
    Object.freeze({id:'tenki',label:'tenki.jp',shortLabel:'tenki.jp',mode:'saved'}),
    Object.freeze({id:'yahoo',label:'Yahoo!天気',shortLabel:'Yahoo!天気',mode:'saved'}),
    Object.freeze({id:'sototenki',label:'アウトドア天気.jp',shortLabel:'アウトドア天気.jp',mode:'saved'})
  ]);
  const PROVIDER_MAP=new Map(PROVIDERS.map(item=>[item.id,item]));
  const PRESETS=Object.freeze([
    Object.freeze({patterns:Object.freeze(['西湖キャンプビレッジ・ノーム','西湖キャンプビレッジノーム','西湖キャンプビレッジgnome']),links:Object.freeze({tenki:'https://tenki.jp/leisure/camp/3/22/1150664/1hour.html',sototenki:'https://www.sototenki.jp/tenki/7483/1hour?genre=1'})}),
    Object.freeze({patterns:Object.freeze(['ふもとっぱら']),links:Object.freeze({tenki:'https://tenki.jp/leisure/camp/5/25/953115/1hour.html',sototenki:'https://www.sototenki.jp/tenki/6783/1hour?genre=1'})}),
    Object.freeze({patterns:Object.freeze(['柏の葉公園']),links:Object.freeze({sototenki:'https://www.sototenki.jp/tenki/9957/1hour?genre=40'})})
  ]);

  function normalizePlace(value){return String(value||'').trim().toLowerCase().replace(/[\s　・･]/g,'').replace(/[（）()]/g,'');}
  function hash(value){let result=2166136261;for(const ch of String(value||'')){result^=ch.charCodeAt(0);result=Math.imul(result,16777619);}return (result>>>0).toString(36);}
  function locationKey({place='',latitude=null,longitude=null}={}){
    const normalized=normalizePlace(place);if(normalized)return `place:${hash(normalized)}`;
    const lat=Number(latitude),lon=Number(longitude);if(Number.isFinite(lat)&&Number.isFinite(lon))return `geo:${lat.toFixed(4)},${lon.toFixed(4)}`;
    return 'location:unknown';
  }
  function readState(){
    try{const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');return value&&typeof value==='object'&&value.locations&&typeof value.locations==='object'?value:{locations:{}};}catch(_error){return {locations:{}};}
  }
  function writeState(value){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(value));return true;}catch(_error){return false;}}
  function provider(id){return PROVIDER_MAP.get(String(id||''))||null;}
  function allowedHost(id,hostname){
    const host=String(hostname||'').toLowerCase();
    if(id==='weathernews')return host==='weathernews.jp'||host.endsWith('.weathernews.jp');
    if(id==='tenki')return host==='tenki.jp'||host.endsWith('.tenki.jp');
    if(id==='yahoo')return host==='weather.yahoo.co.jp';
    if(id==='sototenki')return host==='sototenki.jp'||host.endsWith('.sototenki.jp');
    return false;
  }
  function canonicalize(id,value){
    let url;try{url=new URL(String(value||'').trim());}catch(_error){throw new Error('invalid_weather_link');}
    if(url.protocol!=='https:'||!allowedHost(id,url.hostname))throw new Error('invalid_weather_link_provider');
    if(id==='tenki'&&/\/leisure\/camp\/\d+\/\d+\/\d+\/?$/.test(url.pathname))url.pathname=url.pathname.replace(/\/?$/,'/1hour.html');
    if(id==='sototenki'){
      url.pathname=url.pathname.replace(/\/detail\/?$/,'/1hour');
      if(/^\/tenki\/\d+\/?$/.test(url.pathname))url.pathname=url.pathname.replace(/\/?$/,'/1hour');
    }
    return url.toString();
  }
  function savedLinks(key){const state=readState();return state.locations?.[key]?.links||{};}
  function saveLink({place='',latitude=null,longitude=null,providerId,url}={}){
    const item=provider(providerId);if(!item||item.id==='weathernews')throw new Error('weather_link_not_editable');
    const key=locationKey({place,latitude,longitude});const canonical=canonicalize(item.id,url);const state=readState();const previous=state.locations[key]&&typeof state.locations[key]==='object'?state.locations[key]:{};
    state.locations[key]={...previous,place:String(place||previous.place||''),latitude:Number.isFinite(Number(latitude))?Number(latitude):previous.latitude??null,longitude:Number.isFinite(Number(longitude))?Number(longitude):previous.longitude??null,updatedAt:Date.now(),links:{...(previous.links||{}),[item.id]:canonical}};
    if(!writeState(state))throw new Error('weather_link_save_failed');return canonical;
  }
  function removeLink({place='',latitude=null,longitude=null,providerId}={}){
    const key=locationKey({place,latitude,longitude});const state=readState();if(!state.locations[key]?.links?.[providerId])return true;delete state.locations[key].links[providerId];state.locations[key].updatedAt=Date.now();return writeState(state);
  }
  function presetLinks(place){
    const normalized=normalizePlace(place);for(const preset of PRESETS){if(preset.patterns.some(pattern=>normalized.includes(normalizePlace(pattern))))return preset.links;}return {};
  }
  function weathernewsUrl(latitude,longitude){const lat=Number(latitude),lon=Number(longitude);if(!Number.isFinite(lat)||!Number.isFinite(lon))return '';return `https://weathernews.jp/onebox/${lat.toFixed(5)}/${lon.toFixed(5)}/`;}
  function searchUrl(providerId,place='',type=''){
    const query=encodeURIComponent(String(place||'').trim());
    if(providerId==='weathernews')return query?`https://weathernews.jp/onebox/search.html?q=${query}`:'https://weathernews.jp/onebox/search.html';
    if(providerId==='tenki')return String(type||'').toLowerCase()==='camp'?'https://tenki.jp/leisure/camp/':'https://tenki.jp/';
    if(providerId==='yahoo')return `https://weather.yahoo.co.jp/weather/search/?p=${query}`;
    if(providerId==='sototenki')return 'https://www.sototenki.jp/';
    return '';
  }
  function getLinks({place='',latitude=null,longitude=null,type='',providerIds=[]}={}){
    const key=locationKey({place,latitude,longitude});const stored=savedLinks(key);const presets=presetLinks(place);const requested=(Array.isArray(providerIds)?providerIds:[]).filter(id=>PROVIDER_MAP.has(id));const ids=requested.length?[...new Set(requested)]:PROVIDERS.map(item=>item.id);
    return Object.freeze(ids.map(id=>{
      const item=provider(id);let directUrl='';let source='setup';
      if(id==='weathernews'){directUrl=weathernewsUrl(latitude,longitude);source=directUrl?'auto':'setup';}
      else if(stored[id]){directUrl=stored[id];source='saved';}
      else if(presets[id]){directUrl=presets[id];source='preset';}
      return Object.freeze({...item,key,place:String(place||''),latitude:Number.isFinite(Number(latitude))?Number(latitude):null,longitude:Number.isFinite(Number(longitude))?Number(longitude):null,directUrl,searchUrl:searchUrl(id,place,type),source,ready:Boolean(directUrl),statusLabel:directUrl?(source==='auto'?'位置から直接':source==='preset'?'スポットを自動設定':'登録済み'):'初回設定'});
    }));
  }
  function open(url){const value=String(url||'').trim();if(!/^https:\/\//i.test(value))return false;const opened=globalThis.open?.(value,'_blank','noopener,noreferrer');return Boolean(opened)||true;}
  function info(){return Object.freeze({storageKey:STORAGE_KEY,providers:PROVIDERS,presetCount:PRESETS.length});}

  globalThis.OUTBASE_WEATHER_EXTERNAL_LINKS_V1=Object.freeze({STORAGE_KEY,PROVIDERS,locationKey,getLinks,saveLink,removeLink,searchUrl,canonicalize,open,info});
})();
