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

  const WEATHER_SOURCES=Object.freeze([
    Object.freeze({id:'jma',label:'気象庁'}),
    Object.freeze({id:'weathernews',label:'ウェザーニュース'}),
    Object.freeze({id:'tenki',label:'tenki.jp'}),
    Object.freeze({id:'yahoo',label:'Yahoo!天気'}),
    Object.freeze({id:'sototenki',label:'そとてんき'})
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
  function storageSet(key,value){try{localStorage.setItem(key,value);}catch(_error){}}
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
  function smartLine(value){
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
  function weatherPreview(now){
    const scope=weatherScope();return Object.freeze({
      status:'sample',sample:true,scope,locationLabel:scope==='current'?'千葉県 柏市・現在地':'千葉県 柏市',
      whenLabel:`今日 ${new Intl.DateTimeFormat('ja-JP',{month:'numeric',day:'numeric',weekday:'short'}).format(now)} 9:00現在`,
      condition:'くもり時々晴れ',temperature:23.4,high:25,low:16,rain:20,wind:2,
      sourceType:'sample',sampleLabel:'表示サンプル'
    });
  }
  function selectedPlan(next=[]){const stored=storageGet(WEATHER_PLAN_KEY);return next.find(item=>item.id===stored)||next[0]||null;}
  function durationLabel(item){
    if(!item?.startAt)return '日付未設定';const start=new Date(item.startAt);const end=item.endAt?new Date(item.endAt):start;
    if(Number.isNaN(start.getTime())||Number.isNaN(end.getTime()))return '日付未設定';
    const days=Math.max(1,Math.round((new Date(end.getFullYear(),end.getMonth(),end.getDate())-new Date(start.getFullYear(),start.getMonth(),start.getDate()))/86400000)+1);
    return days<=1?'日帰り':`${days-1}泊${days}日`;
  }
  function alertTime(item,dayOffset,hourLabel){const d=new Date(item?.startAt||Date.now());d.setDate(d.getDate()+dayOffset);return `${d.getMonth()+1}/${d.getDate()} ${hourLabel}`;}
  function weatherIntel(item){
    const alerts=Object.freeze([
      Object.freeze({time:alertTime(item,0,'18:00'),title:'夕食はタープ下が安心',detail:'降水確率40％。料理と荷物をすぐ移せる配置にする。',level:'注意'}),
      Object.freeze({time:alertTime(item,0,'夜'),title:'焚火は現地の風を再確認',detail:'最大瞬間風速4.7m/s予想。中止できる準備をしておく。',level:'確認'}),
      Object.freeze({time:alertTime(item,2,'9:00'),title:'乾燥撤収は早めに始める',detail:'昼前から雨の可能性が上がるため、朝の乾燥時間を使う。',level:'早め'})
    ]);
    return Object.freeze({
      status:'sample',sample:true,activityId:item?.id||null,place:item?.place||'西湖キャンプビレッジ・ノーム',durationLabel:durationLabel(item),
      condition:'くもり時々晴れ',high:24,low:16,rainPeak:40,windAverage:2.6,windMax:4.7,confidence:'A−',
      message:'初日夕方の雨と、最終日の乾燥時間に注意。',updatedLabel:'9:00',confidenceLabel:'A−',alerts,
      sampleLabel:'表示サンプル',primarySource:weatherSettings().primaryLabel
    });
  }
  function weatherDetail(item,{place='',start='',end=''}={}){
    const baseStart=new Date(start||item?.startAt||Date.now());
    const stamp=(day,hour)=>{const d=new Date(baseStart);d.setHours(hour,0,0,0);d.setDate(d.getDate()+day);return d.toISOString();};
    const rows=Object.freeze([
      Object.freeze({at:stamp(0,13),condition:'くもり',temperature:24,feelsLike:24,rainProbability:20,rainfall:0,windDirection:'南西',windAverage:2.3,windGust:4.0,confidence:'A'}),
      Object.freeze({at:stamp(0,15),condition:'晴れ間あり',temperature:24,feelsLike:25,rainProbability:20,rainfall:0,windDirection:'南西',windAverage:2.8,windGust:4.3,confidence:'A−'}),
      Object.freeze({at:stamp(0,18),condition:'弱い雨',temperature:21,feelsLike:21,rainProbability:40,rainfall:0.5,windDirection:'南南西',windAverage:3.1,windGust:4.7,confidence:'B＋'}),
      Object.freeze({at:stamp(0,21),condition:'くもり',temperature:19,feelsLike:18,rainProbability:30,rainfall:0,windDirection:'西南西',windAverage:2.4,windGust:3.9,confidence:'B'}),
      Object.freeze({at:stamp(1,6),condition:'くもり',temperature:17,feelsLike:16,rainProbability:20,rainfall:0,windDirection:'北北西',windAverage:1.8,windGust:2.8,confidence:'A−'}),
      Object.freeze({at:stamp(1,9),condition:'晴れ時々くもり',temperature:20,feelsLike:20,rainProbability:10,rainfall:0,windDirection:'北西',windAverage:2.0,windGust:3.1,confidence:'A'}),
      Object.freeze({at:stamp(1,12),condition:'晴れ',temperature:24,feelsLike:25,rainProbability:10,rainfall:0,windDirection:'西',windAverage:2.6,windGust:4.1,confidence:'A'}),
      Object.freeze({at:stamp(1,15),condition:'晴れ時々くもり',temperature:23,feelsLike:23,rainProbability:20,rainfall:0,windDirection:'西南西',windAverage:3.0,windGust:4.6,confidence:'A−'}),
      Object.freeze({at:stamp(1,18),condition:'くもり',temperature:20,feelsLike:20,rainProbability:20,rainfall:0,windDirection:'南西',windAverage:2.2,windGust:3.7,confidence:'B＋'}),
      Object.freeze({at:stamp(2,6),condition:'くもり',temperature:17,feelsLike:16,rainProbability:30,rainfall:0,windDirection:'北',windAverage:1.6,windGust:2.5,confidence:'B＋'}),
      Object.freeze({at:stamp(2,9),condition:'弱い雨',temperature:18,feelsLike:18,rainProbability:40,rainfall:0.5,windDirection:'北北東',windAverage:2.1,windGust:3.4,confidence:'B'})
    ]);
    const comparisons=Object.freeze([
      Object.freeze({source:'気象庁',rainProbability:40,windGust:4.5,summary:'夕方に弱い雨'}),
      Object.freeze({source:'ウェザーニュース',rainProbability:30,windGust:4.7,summary:'短時間の雨に注意'}),
      Object.freeze({source:'tenki.jp',rainProbability:40,windGust:4.1,summary:'くもり一時雨'}),
      Object.freeze({source:'Yahoo!天気',rainProbability:20,windGust:4.0,summary:'くもり中心'}),
      Object.freeze({source:'そとてんき',rainProbability:40,windGust:4.6,summary:'設営後の雨に注意'})
    ]);
    const judgements=Object.freeze([
      Object.freeze({label:'設営',value:'15時頃',detail:'風が弱く、雨の前に設営しやすい'}),
      Object.freeze({label:'雨を避ける',value:'19日午前',detail:'降水確率10％で最も安定'}),
      Object.freeze({label:'焚火',value:'18日夜は確認',detail:'最大瞬間風速4.7m/s予想'}),
      Object.freeze({label:'撤収・乾燥',value:'20日8時まで',detail:'雨が強まる前に乾燥を始める'}),
      Object.freeze({label:'ペット',value:'19日昼は暑さ注意',detail:'日陰・水分・地面温度を確認'})
    ]);
    const settings=weatherSettings();
    return Object.freeze({
      sample:true,place:place||item?.place||'西湖キャンプビレッジ・ノーム',start:start||item?.startAt||'',end:end||item?.endAt||item?.startAt||'',
      condition:'くもり時々晴れ',high:24,low:16,rainPeak:40,windAverage:2.6,windGust:4.7,confidence:'A−',hourly:rows,comparisons,judgements,
      primarySource:settings.primaryLabel,compareSources:settings.compare.map(id=>settings.sources.find(source=>source.id===id)?.label).filter(Boolean),updatedLabel:'7/17 9:00'
    });
  }
  function weatherSettings(){
    const primary=storageGet(WEATHER_SOURCE_PRIMARY_KEY,'jma');let compare=[];
    try{compare=JSON.parse(storageGet(WEATHER_SOURCE_COMPARE_KEY,'["weathernews","tenki"]'));}catch(_error){compare=['weathernews','tenki'];}
    const allowed=new Set(WEATHER_SOURCES.map(item=>item.id));compare=(Array.isArray(compare)?compare:[]).filter(id=>allowed.has(id)&&id!==primary);
    const locationMode=['plan','home','current'].includes(storageGet(WEATHER_LOCATION_MODE_KEY,'plan'))?storageGet(WEATHER_LOCATION_MODE_KEY,'plan'):'plan';
    const primaryLabel=WEATHER_SOURCES.find(item=>item.id===primary)?.label||WEATHER_SOURCES[0].label;
    return Object.freeze({primary,primaryLabel,compare:Object.freeze(compare),locationMode,sources:WEATHER_SOURCES});
  }

  async function build({now=new Date()}={}){
    const value=await globalThis.OUTBASE_HOME_DOMAIN_V164.build({now,nowLimit:3,nextLimit:5,recentLimit:5});
    const next=displayPlans(value.next||[],now);const selected=selectedPlan(next);
    return Object.freeze({
      ...value,next,quick:quickRows(),quickCatalog:QUICK_CATALOG,
      selectedPlanId:selected?.id||null,selectedPlan:selected,
      todayLabel:todayLabel(now),todaySummary:smartLine({...value,next}),weather:weatherPreview(now),weatherIntel:weatherIntel(selected),
      weatherSettings:weatherSettings(),demoPreview:true,version:'v166.3-home-v36-r9'
    });
  }

  globalThis.OUTBASE_HOME_SCREEN_MODEL_V164=Object.freeze({
    build,QUICK:QUICK_CATALOG,QUICK_CATALOG,DEFAULT_QUICK_IDS,QUICK_STORE_KEY,WEATHER_SCOPE_KEY,WEATHER_PLAN_KEY,
    WEATHER_SOURCE_PRIMARY_KEY,WEATHER_SOURCE_COMPARE_KEY,WEATHER_LOCATION_MODE_KEY,WEATHER_SOURCES,
    quickIds,quickRows,catalog,smartLine,weatherPreview,weatherIntel,weatherDetail,weatherSettings,samplePlans,displayPlans,SMART_LINES
  });
})();
