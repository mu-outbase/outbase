(() => {
  'use strict';

  const QUICK_STORE_KEY='outbase_home_quick_v36';
  const WEATHER_SCOPE_KEY='outbase_home_weather_scope_v36';
  const WEATHER_PLAN_KEY='outbase_home_weather_plan_v36';
  const HOME_LINE_LAST_KEY='outbase_home_line_last_v36';
  const HOME_LINE_SESSION_KEY='outbase_home_line_session_v36';

  const QUICK_CATALOG=Object.freeze([
    Object.freeze({id:'prep',label:'準備リスト',hint:'次の予定を確認',action:'prep',icon:'prep',tone:'amber'}),
    Object.freeze({id:'walk',label:'コタ散歩',hint:'散歩を記録',action:'walk-kota',icon:'paw',tone:'green'}),
    Object.freeze({id:'memo',label:'メモ',hint:'気づきを残す',action:'memo',icon:'memo',tone:'blue'}),
    Object.freeze({id:'cook',label:'日常料理',hint:'献立・レシピ',action:'daily-cooking',icon:'cook',tone:'taupe'}),
    Object.freeze({id:'improve',label:'改善メモ',hint:'次回へ残す',action:'improvement-memo',icon:'improve',tone:'amber'}),
    Object.freeze({id:'plan',label:'予定を追加',hint:'次の活動を登録',action:'plan-add',icon:'calendar',tone:'green'}),
    Object.freeze({id:'calendar',label:'カレンダー',hint:'予定をまとめて確認',action:'calendar',icon:'grid',tone:'blue'}),
    Object.freeze({id:'search',label:'探す',hint:'場所や記録を検索',action:'search',icon:'search',tone:'green'}),
    Object.freeze({id:'vault',label:'保管庫',hint:'思い出を確認',action:'vault',icon:'vault',tone:'taupe'})
  ]);
  const DEFAULT_QUICK_IDS=Object.freeze(['prep','walk','memo','cook','improve']);
  const byId=new Map(QUICK_CATALOG.map(item=>[item.id,item]));

  const SMART_LINES=Object.freeze([
    '今日は、外に出る理由がひとつ増えそうです。',
    '暑さが落ち着く時間を選んで、無理なく。',
    '夕方の風だけ、少し気にしておこう。',
    '朝のうちに少し整えると、あとは気楽です。',
    '次の外時間まで、もう少し。',
    '今日の空に合う過ごし方を、ひとつ。',
    'いい時間は、少しの準備から始まります。',
    '外の空気が気持ちいい時間を、逃さずに。'
  ]);

  const WEATHER_JUDGEMENT_CHECKS=Object.freeze([
    Object.freeze({id:'rain',label:'雨',detail:'降水20％・雨雲少なめ',result:'低',level:'good',icon:'rain'}),
    Object.freeze({id:'wind',label:'風',detail:'最大4.2m/s',result:'やや注意',level:'watch',icon:'wind'}),
    Object.freeze({id:'temperature',label:'最低気温',detail:'薄手の上着が安心',result:'18℃',level:'info',icon:'temperature'}),
    Object.freeze({id:'setup',label:'設営',detail:'風が弱まる時間',result:'15時頃',level:'good',icon:'setup'}),
    Object.freeze({id:'pack',label:'撤収',detail:'乾燥しやすい',result:'午前中',level:'good',icon:'pack'}),
    Object.freeze({id:'pet',label:'ペット',detail:'日陰と水分を確保',result:'暑さ注意',level:'watch',icon:'paw'})
  ]);

  function storageGet(key,fallback=''){
    try{return localStorage.getItem(key)||fallback;}catch(_error){return fallback;}
  }
  function storageSet(key,value){try{localStorage.setItem(key,value);}catch(_error){}}
  function sessionGet(key){try{return sessionStorage.getItem(key)||'';}catch(_error){return '';}}
  function sessionSet(key,value){try{sessionStorage.setItem(key,value);}catch(_error){}}
  function quickIds(){
    let stored=[];
    try{stored=JSON.parse(storageGet(QUICK_STORE_KEY,'[]'));}catch(_error){stored=[];}
    const valid=[];
    for(const id of Array.isArray(stored)?stored:[]){if(byId.has(id)&&!valid.includes(id))valid.push(id);}
    for(const id of DEFAULT_QUICK_IDS){if(valid.length>=5)break;if(!valid.includes(id))valid.push(id);}
    return valid.slice(0,5);
  }
  function quickRows(){return Object.freeze(quickIds().map(id=>byId.get(id)));}
  function catalog(){return QUICK_CATALOG;}
  function todayLabel(now){return new Intl.DateTimeFormat('ja-JP',{month:'long',day:'numeric',weekday:'short'}).format(now);}
  function smartLine(value){
    const sessionValue=sessionGet(HOME_LINE_SESSION_KEY);if(sessionValue)return sessionValue;
    const next=value?.next?.[0]||null;const current=value?.current?.[0]||null;
    const context=[];
    if(current)context.push(`今日は「${current.title}」を残しておこう。`);
    if(next?.daysUntil===0)context.push(`今日は「${next.title}」の日。焦らず、気持ちよく。`);
    if(next?.daysUntil===1)context.push(`明日の外時間へ、今日できる準備を少しだけ。`);
    if(next?.preparation?.pending>0)context.push(`あと${next.preparation.pending}つ整えば、出発がもっと軽くなります。`);
    const candidates=[...context,...SMART_LINES];
    const last=storageGet(HOME_LINE_LAST_KEY);
    const choices=candidates.filter(line=>line!==last);
    const selected=(choices.length?choices:candidates)[Math.floor(Math.random()*Math.max(1,(choices.length||candidates.length)))]||SMART_LINES[0];
    storageSet(HOME_LINE_LAST_KEY,selected);sessionSet(HOME_LINE_SESSION_KEY,selected);return selected;
  }
  function weatherScope(){return storageGet(WEATHER_SCOPE_KEY)==='current'?'current':'home';}
  function weatherPreview(now){
    const scope=weatherScope();
    return Object.freeze({
      status:'sample',sample:true,scope,
      locationLabel:scope==='current'?'柏市周辺':'柏市',
      whenLabel:`今日 ${new Intl.DateTimeFormat('ja-JP',{month:'numeric',day:'numeric',weekday:'short'}).format(now)} 14:30`,
      condition:'晴れ時々くもり',temperature:28,high:31,low:24,rain:20,wind:3.2,
      sourceType:'sample',sampleLabel:'表示サンプル'
    });
  }
  function selectedPlan(next=[]){
    const stored=storageGet(WEATHER_PLAN_KEY);
    return next.find(item=>item.id===stored)||next[0]||null;
  }
  function durationLabel(item){
    if(!item?.startAt)return '日付未設定';
    const start=new Date(item.startAt);const end=item.endAt?new Date(item.endAt):start;
    if(Number.isNaN(start.getTime())||Number.isNaN(end.getTime()))return '日付未設定';
    const days=Math.max(1,Math.round((new Date(end.getFullYear(),end.getMonth(),end.getDate())-new Date(start.getFullYear(),start.getMonth(),start.getDate()))/86400000)+1);
    return days<=1?'日帰り':`${days-1}泊${days}日`;
  }
  function weatherIntel(item){
    return Object.freeze({
      status:'sample',sample:true,activityId:item?.id||null,
      place:item?.place||'赤城山周辺',durationLabel:durationLabel(item),
      condition:'晴れベース、夜は涼しめ',high:28,low:18,rainPeak:20,windMax:4.2,confidence:'中',
      message:'設営は15時前後、撤収は午前中が安心。日中はコタの暑さ対策を。',
      updatedLabel:'14:30',confidenceLabel:'中',checks:WEATHER_JUDGEMENT_CHECKS,alerts:Object.freeze([]),sampleLabel:'表示サンプル'
    });
  }

  async function build({now=new Date()}={}){
    const value=await globalThis.OUTBASE_HOME_DOMAIN_V164.build({now,nowLimit:3,nextLimit:5,recentLimit:5});
    const selected=selectedPlan(value.next||[]);const weather=weatherPreview(now);
    return Object.freeze({
      ...value,
      quick:quickRows(),quickCatalog:QUICK_CATALOG,
      selectedPlanId:selected?.id||null,selectedPlan:selected,
      todayLabel:todayLabel(now),todaySummary:smartLine(value),
      weather,weatherIntel:weatherIntel(selected),
      demoPreview:true,version:'v166.3-home-v36-r7'
    });
  }

  globalThis.OUTBASE_HOME_SCREEN_MODEL_V164=Object.freeze({
    build,QUICK:QUICK_CATALOG,QUICK_CATALOG,DEFAULT_QUICK_IDS,QUICK_STORE_KEY,WEATHER_SCOPE_KEY,WEATHER_PLAN_KEY,
    quickIds,quickRows,catalog,smartLine,weatherPreview,weatherIntel,WEATHER_JUDGEMENT_CHECKS,SMART_LINES
  });
})();
