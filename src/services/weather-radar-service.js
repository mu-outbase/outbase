(() => {
  'use strict';

  const METADATA_ENDPOINT='https://api.rainviewer.com/public/weather-maps.json';
  const CACHE_KEY='outbase_weather_radar_cache_v1';
  const REFRESH_MS=5*60*1000;
  const HORIZONS=Object.freeze([1,3,6,12,24]);
  const DEFAULT_HORIZON=6;
  const RADAR_ZOOM=7;
  const TILE_SIZE=256;

  function storageGet(key,fallback=''){try{return localStorage.getItem(key)||fallback;}catch(_error){return fallback;}}
  function storageSet(key,value){try{localStorage.setItem(key,value);return true;}catch(_error){return false;}}
  function readCache(){try{const value=JSON.parse(storageGet(CACHE_KEY,''));return value&&typeof value==='object'?value:null;}catch(_error){return null;}}
  function writeCache(value){storageSet(CACHE_KEY,JSON.stringify(value));return value;}
  function validNumber(value){const n=Number(value);return Number.isFinite(n)?n:null;}
  function clamp(value,min,max){return Math.min(max,Math.max(min,value));}
  function pad(value){return String(value).padStart(2,'0');}
  function clock(value){const d=new Date(value);if(Number.isNaN(d.getTime()))return '—';return `${pad(d.getHours())}:${pad(d.getMinutes())}`;}
  function hourLabel(value){const d=new Date(value);if(Number.isNaN(d.getTime()))return '—';return `${d.getHours()}時`;}
  function fetchJson(url,{timeout=10000}={}){
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeout);
    return fetch(url,{cache:'no-store',signal:controller.signal,headers:{Accept:'application/json'}}).then(async response=>{
      if(!response.ok)throw new Error(`radar_http_${response.status}`);
      return response.json();
    }).finally(()=>clearTimeout(timer));
  }
  function normalizeMetadata(data){
    const frames=Array.isArray(data?.radar?.past)?data.radar.past.filter(row=>row&&row.path&&Number.isFinite(Number(row.time))):[];
    const latest=frames.at(-1)||null;if(!latest)throw new Error('radar_frame_missing');
    return Object.freeze({
      version:String(data?.version||'2.0'),host:String(data?.host||'https://tilecache.rainviewer.com'),generated:Number(data?.generated)||Date.now()/1000,
      frame:Object.freeze({time:Number(latest.time),path:String(latest.path)}),storedAt:Date.now()
    });
  }
  async function refresh({force=false}={}){
    const cached=readCache();
    if(!force&&cached?.frame?.path&&Date.now()-Number(cached.storedAt||0)<REFRESH_MS)return Object.freeze({...cached,source:'cache'});
    try{return writeCache(normalizeMetadata(await fetchJson(METADATA_ENDPOINT)));}
    catch(error){if(cached?.frame?.path&&Date.now()-Number(cached.storedAt||0)<60*60*1000)return Object.freeze({...cached,source:'stale-cache',error:String(error?.message||error)});throw error;}
  }
  function metadata(){return readCache();}
  function tilePoint(latitude,longitude,zoom=RADAR_ZOOM){
    const lat=clamp(validNumber(latitude)??0,-85.05112878,85.05112878);const lon=validNumber(longitude)??0;const n=2**zoom;
    const x=((lon+180)/360)*n;const rad=lat*Math.PI/180;const y=(1-Math.log(Math.tan(rad)+1/Math.cos(rad))/Math.PI)/2*n;
    return {x,y,n};
  }
  function mapTiles({latitude,longitude,meta=metadata()}={}){
    const lat=validNumber(latitude),lon=validNumber(longitude);if(lat===null||lon===null||!meta?.frame?.path)return null;
    const point=tilePoint(lat,lon,RADAR_ZOOM);const centerX=Math.floor(point.x),centerY=Math.floor(point.y);const fracX=point.x-centerX,fracY=point.y-centerY;const tiles=[];
    for(let dy=-1;dy<=1;dy+=1){for(let dx=-1;dx<=1;dx+=1){
      const rawX=centerX+dx;const x=((rawX%point.n)+point.n)%point.n;const y=clamp(centerY+dy,0,point.n-1);
      tiles.push(Object.freeze({
        dx:dx+1,dy:dy+1,
        baseUrl:`https://tile.openstreetmap.org/${RADAR_ZOOM}/${x}/${y}.png`,
        radarUrl:`${meta.host}${meta.frame.path}/${TILE_SIZE}/${RADAR_ZOOM}/${x}/${y}/2/1_1.png`
      }));
    }}
    return Object.freeze({tiles:Object.freeze(tiles),centerX:(1+fracX)*TILE_SIZE,centerY:(1+fracY)*TILE_SIZE,zoom:RADAR_ZOOM,frameTime:meta.frame.time*1000,generatedAt:meta.generated*1000});
  }
  function confidenceRank(value){const rank={'A':5,'A−':4,'B＋':3,'B':2,'C＋':1,'C':0,'—':-1};return rank[String(value||'—')]??-1;}
  function worstConfidence(rows){if(!rows.length)return '—';return rows.reduce((worst,row)=>confidenceRank(row.confidence)<confidenceRank(worst)?String(row.confidence||'—'):worst,String(rows[0].confidence||'—'));}
  function horizonRows(detail,{horizon=DEFAULT_HORIZON,startAt=null,now=new Date()}={}){
    const hours=HORIZONS.includes(Number(horizon))?Number(horizon):DEFAULT_HORIZON;const source=Array.isArray(detail?.hourly)?detail.hourly:[];
    let start=new Date(startAt||now).getTime();if(!Number.isFinite(start))start=Date.now();
    const end=start+hours*3600000;let rows=source.filter(row=>{const time=new Date(row.at).getTime();return Number.isFinite(time)&&time>=start-30*60000&&time<=end+15*60000;});
    if(!rows.length&&source.length){const first=new Date(source[0].at).getTime();rows=source.filter(row=>{const time=new Date(row.at).getTime();return time>=first&&time<=first+hours*3600000;});}
    return Object.freeze(rows.map(row=>Object.freeze(row)));
  }
  function rainSummary(rows){
    if(!rows.length)return Object.freeze({start:'予報待ち',peak:'予報待ち',stop:'予報待ち',maxProbability:null,totalRainfall:null,confidence:'—',message:'時間別予報を取得すると表示します。'});
    const wet=row=>(Number(row.rainProbability)||0)>=40||(Number(row.rainfall)||0)>=0.2;
    const wetRows=rows.filter(wet);const start=wetRows[0]||null;
    const peak=rows.reduce((best,row)=>{const score=(Number(row.rainfall)||0)*20+(Number(row.rainProbability)||0);const bestScore=(Number(best?.rainfall)||0)*20+(Number(best?.rainProbability)||0);return score>bestScore?row:best;},rows[0]);
    let stop=null;if(start){const startIndex=rows.indexOf(start);stop=rows.slice(startIndex+1).find(row=>(Number(row.rainProbability)||0)<20&&(Number(row.rainfall)||0)<0.1)||null;}
    const maxProbability=Math.max(...rows.map(row=>Number(row.rainProbability)||0));const totalRainfall=Math.round(rows.reduce((sum,row)=>sum+(Number(row.rainfall)||0),0)*10)/10;
    const message=!start?'目立つ雨は少なめ。':maxProbability>=70?'雨の強まる時間に注意。':'弱い雨の可能性。時間を確認。';
    return Object.freeze({start:start?`${hourLabel(start.at)}頃`:'目立つ雨なし',peak:peak?`${hourLabel(peak.at)} ${Math.round(Number(peak.rainProbability)||0)}%`:'—',stop:start?(stop?`${hourLabel(stop.at)}頃`:'表示範囲では続く可能性'):'—',maxProbability,totalRainfall,confidence:worstConfidence(rows),message});
  }
  function jmaUrl(latitude,longitude){
    const lat=validNumber(latitude),lon=validNumber(longitude);if(lat===null||lon===null)return 'https://www.jma.go.jp/bosai/nowc/';
    return `https://www.jma.go.jp/bosai/nowc/#zoom:10/lat:${lat.toFixed(6)}/lon:${lon.toFixed(6)}/colordepth:normal/elements:hrpns&slmcs&slmcs_fcst`;
  }
  function view(detail,{horizon=DEFAULT_HORIZON,startAt=null,mode='today',now=new Date()}={}){
    const selected=HORIZONS.includes(Number(horizon))?Number(horizon):DEFAULT_HORIZON;const rows=horizonRows(detail,{horizon:selected,startAt,now});const summary=rainSummary(rows);
    const targetMs=new Date(startAt||now).getTime();const radarApplicable=mode==='today'||!Number.isFinite(targetMs)||Math.abs(targetMs-Date.now())<=24*3600000;
    const meta=metadata();const map=radarApplicable?mapTiles({latitude:detail?.latitude,longitude:detail?.longitude,meta}):null;
    return Object.freeze({
      status:map?'ready':meta?.frame?.path?'forecast-only':'loading',horizon:selected,horizons:HORIZONS,rows,summary,map,radarApplicable,
      place:String(detail?.place||'対象地点'),latitude:validNumber(detail?.latitude),longitude:validNumber(detail?.longitude),
      jmaUrl:jmaUrl(detail?.latitude,detail?.longitude),refreshMs:REFRESH_MS,
      radarSource:'RainViewer',forecastSource:'Open-Meteo',
      note:radarApplicable?'地図は現在の雨雲。1〜24時間は地点の降水予報です。':'予定日が近づくと現在の雨雲地図も表示します。'
    });
  }

  globalThis.OUTBASE_WEATHER_RADAR_V1=Object.freeze({refresh,metadata,view,mapTiles,horizonRows,rainSummary,jmaUrl,HORIZONS,DEFAULT_HORIZON,REFRESH_MS,CACHE_KEY});
})();
