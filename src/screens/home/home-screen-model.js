(() => {
  'use strict';

  const QUICK_STORE_KEY='outbase_home_quick_v36';
  const WEATHER_SCOPE_KEY='outbase_home_weather_scope_v36';
  const WEATHER_PLAN_KEY='outbase_home_weather_plan_v36';
  const HOME_LINE_LAST_KEY='outbase_home_line_last_v36';
  const HOME_LINE_SESSION_KEY='outbase_home_line_session_v36';
  const WEATHER_SOURCE_PRIMARY_KEY='outbase_weather_primary_source_v1';
  const WEATHER_SOURCE_COMPARE_KEY='outbase_weather_compare_sources_v1';
  const WEATHER_LOCATION_MODE_KEY='outbase_weather_location_mode_v1';
  const WEATHER_LAST_UPDATE_KEY='outbase_weather_last_update_v1';
  const WEATHER_NEXT_UPDATE_KEY='outbase_weather_next_update_v1';

  const WEATHER_SOURCES=Object.freeze([
    Object.freeze({id:'weathernews',label:'ウェザーニュース'}),
    Object.freeze({id:'tenki',label:'tenki.jp'}),
    Object.freeze({id:'yahoo',label:'Yahoo!天気'}),
    Object.freeze({id:'sototenki',label:'アウトドア天気.jp'})
  ]);

  const QUICK_CATALOG=Object.freeze([
    Object.freeze({id:'prep',label:'準備リスト',hint:'未完了 3件',action:'prep',icon:'prep',tone:'amber'}),
    Object.freeze({id:'walk',label:'コタ散歩',hint:'散歩を記録',action:'walk-kota',icon:'paw',tone:'green'}),
    Object.freeze({id:'memo',label:'メモ',hint:'気づきを残す',action:'memo',icon:'memo',tone:'blue'}),
    Object.freeze({id:'cook',label:'日常料理',hint:'レシピを記録',action:'daily-cooking',icon:'cook',tone:'taupe'}),
    Object.freeze({id:'improve',label:'改善メモ',hint:'次回へ残す',action:'improvement-memo',icon:'improve',tone:'amber'}),
    Object.freeze({id:'plan',label:'予定を追加',hint:'次の活動を登録',action:'plan-add',icon:'calendar',tone:'green'}),
    Object.freeze({id:'calendar',label:'カレンダー',hint:'予定をまとめて確認',action:'calendar',icon:'grid',tone:'blue'}),
    Object.freeze({id:'search',label:'探す',hint:'場所や記録を検索',action:'search',icon:'search',tone:'green'}),
    Object.freeze({id:'vault',label:'保管庫',hint:'思い出を確認',action:'vault',icon:'vault',tone:'taupe'})
  ]);
  const DEFAULT_QUICK_IDS=Object.freeze(['prep','walk','memo','cook','improve']);
  const byId=new Map(QUICK_CATALOG.map(item=>[item.id,item]));

  const SMART_LINES=Object.freeze([
    '今日は穏やかに楽しめる一日です。',
    '夕方の風だけ、少し気にしておこう。',
    '外の空気が気持ちいい時間を、逃さずに。',
    '朝のうちに整えると、あとは気楽です。',
    '次の外時間まで、もう少し。',
    '雲の動きを見ながら、気持ちよく過ごそう。',
    '日差しが落ち着く頃が、外時間の狙い目です。',
    '今日の空に合う過ごし方を、ひとつ。'
  ]);

  function storageGet(key,fallback=''){try{return localStorage.getItem(key)||fallback;}catch(_error){return fallback;}}
  function liveService(){return globalThis.OUTBASE_WEATHER_SERVICE_V1||null;}
  function storageSet(key,value){try{localStorage.setItem(key,String(value));return true;}catch(_error){return false;}}
  function sessionGet(key){try{return sessionStorage.getItem(key)||'';}catch(_error){return '';}}
  function sessionSet(key,value){try{sessionStorage.setItem(key,value);}catch(_error){}}
  function quickIds(){
    let stored=[];try{stored=JSON.parse(storageGet(QUICK_STORE_KEY,'[]'));}catch(_error){stored=[];}
    const valid=[];for(const id of Array.isArray(stored)?stored:[]){if(byId.has(id)&&!valid.includes(id))valid.push(id);}
    for(const id of DEFAULT_QUICK_IDS){if(valid.length>=5)break;if(!valid.includes(id))valid.push(id);}
    return valid.slice(0,5);
  }
  function quickRows(){return Object.freeze(quickIds().map(id=>byId.get(id)));}
  function catalog(){return QUICK_CATALOG;}
  function todayLabel(now){return new Intl.DateTimeFormat('ja-JP',{month:'long',day:'numeric',weekday:'short'}).format(now);}
  function clockLabel(value){const d=new Date(value);if(Number.isNaN(d.getTime()))return '未更新';return new Intl.DateTimeFormat('ja-JP',{hour:'2-digit',minute:'2-digit'}).format(d);}
  function smartLine(value){
    const weather=value?.weather||null;
    if(weather?.status==='ready'){
      const nearRain=Number(weather.rain)||0;const dailyRain=Number(weather.rainPeakToday)||0;const temperature=Number(weather.temperature);const gust=Number(weather.windGust)||0;
      if(nearRain>=70)return '雨の可能性が高め。外出前に雨雲を確認。';
      if(dailyRain>=70)return '今日は雨の時間あり。外時間は雨雲を見て。';
      if(nearRain>=40||dailyRain>=40)return '空模様が変わりやすい一日。雨具を近くに。';
      if(gust>=8)return '風が強まる時間あり。外の道具は早めに確認。';
      if(Number.isFinite(temperature)&&temperature>=30)return '暑さを避けて、涼しい時間に外へ。';
      if(/雨|雷|雪/.test(String(weather.condition||'')))return '天気の変化に備えて、無理のない外時間を。';
      if(/晴/.test(String(weather.condition||'')))return '外の空気が気持ちいい時間を、逃さずに。';
      return '雲の動きを見ながら、気持ちよく過ごそう。';
    }
    const sessionValue=sessionGet(HOME_LINE_SESSION_KEY);if(sessionValue)return sessionValue;
    const next=value?.next?.[0]||null;const context=[];
    if(next?.daysUntil===0)context.push(`今日は「${next.title}」の日。焦らず、気持ちよく。`);
    if(next?.daysUntil===1)context.push('明日の外時間へ、今日できる準備を少しだけ。');
    if(next?.preparation?.pending>0)context.push(`あと${next.preparation.pending}つ整えば、出発がもっと軽くなります。`);
    const candidates=[...context,...SMART_LINES];const last=storageGet(HOME_LINE_LAST_KEY);
    const choices=candidates.filter(line=>line!==last);const pool=choices.length?choices:candidates;
    const selected=pool[Math.floor(Math.random()*pool.length)]||SMART_LINES[0];
    storageSet(HOME_LINE_LAST_KEY,selected);sessionSet(HOME_LINE_SESSION_KEY,selected);return selected;
  }
  function dateOffset(now,days,hour=13){const d=new Date(now);d.setHours(hour,0,0,0);d.setDate(d.getDate()+days);return d.toISOString();}
  function samplePlan({id,type,typeLabel,title,place,start,end,coverVariant,prep=[0,0]}){
    return Object.freeze({
      id:`ob36-sample-${id}`,type,typeLabel,title,place,startAt:start,endAt:end,coverVariant,sample:true,
      preparation:Object.freeze({completed:prep[0],total:prep[1],pending:Math.max(0,prep[1]-prep[0]),progress:prep[1]?Math.round(prep[0]/prep[1]*100):0}),
      previewMedia:null,relativeDay:'表示サンプル',recordCount:0,mediaCount:0,preparationUrl:'',recordUrl:''
    });
  }
  function samplePlans(now){return Object.freeze([
    samplePlan({id:'lake',type:'camp',typeLabel:'キャンプ',title:'湖畔キャンプ',place:'西湖キャンプビレッジ・ノーム',start:dateOffset(now,1,13),end:dateOffset(now,3,11),coverVariant:'lake',prep:[9,12]}),
    samplePlan({id:'walk',type:'walk',typeLabel:'散歩',title:'コタと公園散歩',place:'柏の葉公園',start:dateOffset(now,8,7),end:dateOffset(now,8,9),coverVariant:'group',prep:[2,3]}),
    samplePlan({id:'drive',type:'drive',typeLabel:'ドライブ',title:'海辺ドライブ',place:'九十九里海岸',start:dateOffset(now,18,9),end:dateOffset(now,18,18),coverVariant:'sea',prep:[3,5]}),
    samplePlan({id:'event',type:'event',typeLabel:'イベント',title:'野外音楽イベント',place:'森のイベント広場',start:dateOffset(now,31,11),end:dateOffset(now,31,20),coverVariant:'festival',prep:[1,4]})
  ]);}
  function displayPlans(realRows,now){
    const rows=[...(Array.isArray(realRows)?realRows:[])];const used=new Set(rows.map(row=>row.id));
    for(const sample of samplePlans(now)){if(rows.length>=4)break;if(!used.has(sample.id)){rows.push(sample);used.add(sample.id);}}
    return Object.freeze(rows.slice(0,5));
  }
  function weatherScope(){return storageGet(WEATHER_SCOPE_KEY)==='current'?'current':'home';}
  function selectedPlan(next=[]){const stored=storageGet(WEATHER_PLAN_KEY);return next.find(item=>item.id===stored)||next[0]||null;}
  function durationLabel(item){
    if(!item?.startAt)return '日付未設定';const start=new Date(item.startAt);const end=item.endAt?new Date(item.endAt):start;
    if(Number.isNaN(start.getTime())||Number.isNaN(end.getTime()))return '日付未設定';
    const days=Math.max(1,Math.round((new Date(end.getFullYear(),end.getMonth(),end.getDate())-new Date(start.getFullYear(),start.getMonth(),start.getDate()))/86400000)+1);
    return days<=1?'日帰り':`${days-1}泊${days}日`;
  }
  function weatherIntervalMs(item,now=new Date()){
    const current=new Date(now);const start=new Date(item?.startAt||'');if(Number.isNaN(start.getTime()))return 3*60*60*1000;
    const hours=(start.getTime()-current.getTime())/3600000;
    const sameDay=start.getFullYear()===current.getFullYear()&&start.getMonth()===current.getMonth()&&start.getDate()===current.getDate();
    if(hours<=0||sameDay)return 30*60*1000;
    if(hours<=72)return 60*60*1000;
    if(hours<=168)return 3*60*60*1000;
    return 6*60*60*1000;
  }
  function markWeatherUpdated(now=new Date(),item=null){
    const at=new Date(now).getTime();const next=at+weatherIntervalMs(item,now);
    storageSet(WEATHER_LAST_UPDATE_KEY,at);storageSet(WEATHER_NEXT_UPDATE_KEY,next);
    return Object.freeze({updatedAt:at,nextUpdateAt:next,updatedLabel:clockLabel(at),nextUpdateLabel:clockLabel(next)});
  }
  function weatherUpdateMeta(item,now=new Date()){
    const nowMs=new Date(now).getTime();let updatedAt=Number(storageGet(WEATHER_LAST_UPDATE_KEY,'0'));let nextUpdateAt=Number(storageGet(WEATHER_NEXT_UPDATE_KEY,'0'));
    if(!Number.isFinite(updatedAt)||updatedAt<=0){updatedAt=nowMs;nextUpdateAt=nowMs+weatherIntervalMs(item,now);}
    if(!Number.isFinite(nextUpdateAt)||nextUpdateAt<=updatedAt)nextUpdateAt=updatedAt+weatherIntervalMs(item,now);
    return Object.freeze({
      updatedAt,nextUpdateAt,updatedLabel:clockLabel(updatedAt),nextUpdateLabel:clockLabel(nextUpdateAt),
      needsRefresh:nowMs>=nextUpdateAt,elapsedMs:Math.max(0,nowMs-updatedAt),automatic:true
    });
  }
  function weatherNeedsRefresh(item,now=new Date(),reason='timer'){
    const meta=weatherUpdateMeta(item,now);if(reason==='resume')return meta.elapsedMs>=30*60*1000;return meta.needsRefresh;
  }
  function weatherPreview(now,item){
    const scope=weatherScope();const live=liveService()?.getToday?.({scope,plan:item,now});
    if(live)return Object.freeze({...live,scope,update:weatherUpdateMeta(item,new Date(live.fetchedAt||now))});
    return Object.freeze({
      status:'loading',sample:false,scope,locationLabel:scope==='current'?'現在地':'千葉県 柏市',condition:'予報を取得しています',
      temperature:null,high:null,low:null,rain:null,wind:null,sourceType:'live',provider:liveService()?.provider||'Open-Meteo',
      update:weatherUpdateMeta(item,now)
    });
  }
  function alertTime(item,dayOffset,hourLabel){const d=new Date(item?.startAt||Date.now());d.setDate(d.getDate()+dayOffset);return `${d.getMonth()+1}/${d.getDate()} ${hourLabel}`;}
  function weatherIntel(item,now=new Date()){
    const live=liveService()?.getPlan?.(item);
    if(live)return Object.freeze({...live,activityId:item?.id||null,durationLabel:durationLabel(item),update:weatherUpdateMeta(item,new Date(live.fetchedAt||now))});
    return Object.freeze({
      status:'loading',sample:false,activityId:item?.id||null,place:item?.place||'場所未設定',durationLabel:durationLabel(item),
      condition:'予報を取得しています',high:null,low:null,rainPeak:null,windMax:null,confidence:'—',confidenceLabel:'—',
      message:'場所と日程を確認して、最新予報を自動取得します。',alerts:Object.freeze([]),provider:liveService()?.provider||'Open-Meteo',update:weatherUpdateMeta(item,now)
    });
  }
  function weatherSettings(){
    const storedPrimary=storageGet(WEATHER_SOURCE_PRIMARY_KEY,'weathernews');let primary=storedPrimary;let compare=[];
    try{compare=JSON.parse(storageGet(WEATHER_SOURCE_COMPARE_KEY,'["tenki","yahoo","sototenki"]'));}catch(_error){compare=['tenki','yahoo','sototenki'];}
    const allowed=new Set(WEATHER_SOURCES.map(item=>item.id));const legacyPrimary=!allowed.has(primary);if(legacyPrimary)primary='weathernews';if(legacyPrimary)compare=['tenki','yahoo','sototenki'];compare=(Array.isArray(compare)?compare:[]).filter(id=>allowed.has(id)&&id!==primary);
    const locationMode=['plan','home','current'].includes(storageGet(WEATHER_LOCATION_MODE_KEY,'plan'))?storageGet(WEATHER_LOCATION_MODE_KEY,'plan'):'plan';
    const primaryLabel=WEATHER_SOURCES.find(item=>item.id===primary)?.label||WEATHER_SOURCES[0].label;
    const compareLabels=compare.map(id=>WEATHER_SOURCES.find(item=>item.id===id)?.label).filter(Boolean);
    return Object.freeze({primary,primaryLabel,compare:Object.freeze(compare),compareLabels:Object.freeze(compareLabels),locationMode,sources:WEATHER_SOURCES});
  }
  function isoAt(base,hours){const d=new Date(base);if(Number.isNaN(d.getTime()))d.setTime(Date.now());d.setHours(d.getHours()+hours,0,0,0);return d.toISOString();}
  function hourlyRows(base){
    const template=[
      ['くもり時々晴れ',24,25,20,0,'南',2.1,3.2,'A'],['くもり',23,24,30,0,'南西',2.8,4.1,'A−'],['弱い雨',21,21,60,0.8,'西南西',3.4,4.7,'B＋'],
      ['くもり',19,18,40,0.2,'西',2.7,4.0,'B＋'],['くもり',18,17,30,0,'西北西',2.2,3.5,'A−'],['晴れ',20,20,10,0,'北西',1.8,2.7,'A'],
      ['晴れ時々くもり',23,24,10,0,'西',2.0,3.0,'A'],['くもり',24,26,20,0,'南西',2.9,4.2,'A−'],['くもり',22,23,30,0,'南西',3.1,4.6,'B＋'],
      ['弱い雨',20,20,70,1.2,'西',3.8,5.3,'B'],['くもり',18,17,40,0.3,'北西',2.8,4.4,'B＋']
    ];
    return Object.freeze(template.map((row,index)=>Object.freeze({at:isoAt(base,index*3),condition:row[0],temperature:row[1],feelsLike:row[2],rainProbability:row[3],rainfall:row[4],windDirection:row[5],windAverage:row[6],windGust:row[7],confidence:row[8]})));
  }
  function weatherDetail(item,{place='',start='',end=''}={}){
    const live=liveService()?.getDetail?.(item,{place,start,end});
    if(live){const update=weatherUpdateMeta(item,new Date(live.fetchedAt||Date.now()));const settings=weatherSettings();return Object.freeze({...live,compareSources:settings.compareLabels,referencePrimary:settings.primaryLabel,externalProviderIds:Object.freeze([settings.primary,...settings.compare]),updatedLabel:update.updatedLabel,nextUpdateLabel:update.nextUpdateLabel,update});}
    const update=weatherUpdateMeta(item,new Date());return Object.freeze({
      status:'loading',sample:false,place:place||item?.place||'場所未設定',condition:'予報を取得しています',high:null,low:null,rainPeak:null,windGust:null,confidence:'—',
      hourly:Object.freeze([]),judgements:Object.freeze([]),comparisons:Object.freeze([]),primarySource:liveService()?.provider||'Open-Meteo',compareSources:Object.freeze([]),
      provider:liveService()?.provider||'Open-Meteo',attribution:liveService()?.attribution||'',updatedLabel:update.updatedLabel,nextUpdateLabel:update.nextUpdateLabel,update
    });
  }

  async function build({now=new Date()}={}){
    const value=await globalThis.OUTBASE_HOME_DOMAIN_V164.build({now,nowLimit:3,nextLimit:5,recentLimit:5});
    const next=displayPlans(value.next||[],now);const selected=selectedPlan(next);const weather=weatherPreview(now,selected);
    return Object.freeze({
      ...value,next,quick:quickRows(),quickCatalog:QUICK_CATALOG,
      selectedPlanId:selected?.id||null,selectedPlan:selected,
      todayLabel:todayLabel(now),todaySummary:smartLine({...value,next,weather}),weather,weatherIntel:weatherIntel(selected,now),
      weatherSettings:weatherSettings(),demoPreview:true,version:'v166.3-home-v36-r14'
    });
  }

  globalThis.OUTBASE_HOME_SCREEN_MODEL_V164=Object.freeze({
    build,QUICK:QUICK_CATALOG,QUICK_CATALOG,DEFAULT_QUICK_IDS,QUICK_STORE_KEY,WEATHER_SCOPE_KEY,WEATHER_PLAN_KEY,
    WEATHER_SOURCE_PRIMARY_KEY,WEATHER_SOURCE_COMPARE_KEY,WEATHER_LOCATION_MODE_KEY,WEATHER_LAST_UPDATE_KEY,WEATHER_NEXT_UPDATE_KEY,WEATHER_SOURCES,
    quickIds,quickRows,catalog,smartLine,weatherPreview,weatherIntel,weatherSettings,weatherDetail,samplePlans,displayPlans,SMART_LINES,
    weatherIntervalMs,weatherUpdateMeta,weatherNeedsRefresh,markWeatherUpdated
  });
})();
