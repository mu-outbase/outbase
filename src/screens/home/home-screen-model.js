(() => {
  'use strict';

  const QUICK_STORE_KEY='outbase_home_quick_v36';
  const WEATHER_SCOPE_KEY='outbase_home_weather_scope_v36';
  const WEATHER_PLAN_KEY='outbase_home_weather_plan_v36';

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

  function storageGet(key,fallback=''){
    try{return localStorage.getItem(key)||fallback;}catch(_error){return fallback;}
  }
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
  function todaySummary(value){
    const current=value?.current?.[0]||null;
    const next=value?.next?.[0]||null;
    if(current)return `今日は「${current.title}」を記録できます。`;
    if(next?.daysUntil===0)return `今日は「${next.title}」の予定があります。`;
    if(next?.daysUntil===1)return `明日は「${next.title}」。準備を確認しましょう。`;
    return '今日の予定と準備を確認しましょう。';
  }
  function weatherScope(){return storageGet(WEATHER_SCOPE_KEY)==='current'?'current':'home';}
  function weatherPlaceholder(now){
    const scope=weatherScope();
    return Object.freeze({
      status:'unavailable',scope,
      locationLabel:scope==='current'?'現在地（未取得）':'自宅',
      whenLabel:`今日 ${new Intl.DateTimeFormat('ja-JP',{month:'numeric',day:'numeric',weekday:'short'}).format(now)} 現在`,
      condition:'天気情報未接続',temperature:null,high:null,low:null,rain:null,wind:null,
      sourceType:'unavailable'
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
      status:'unavailable',activityId:item?.id||null,place:item?.place||'場所未設定',durationLabel:durationLabel(item),
      condition:'予報データ未接続',high:null,low:null,rainPeak:null,windMax:null,confidence:null,
      message:'実予報は天気接続後に表示します。',alerts:Object.freeze([])
    });
  }

  async function build({now=new Date()}={}){
    const value=await globalThis.OUTBASE_HOME_DOMAIN_V164.build({now,nowLimit:3,nextLimit:5,recentLimit:5});
    const selected=selectedPlan(value.next||[]);
    return Object.freeze({
      ...value,
      quick:quickRows(),quickCatalog:QUICK_CATALOG,
      selectedPlanId:selected?.id||null,selectedPlan:selected,
      todayLabel:todayLabel(now),todaySummary:todaySummary(value),
      weather:weatherPlaceholder(now),weatherIntel:weatherIntel(selected),
      version:'v166.3-home-v36-r2'
    });
  }

  globalThis.OUTBASE_HOME_SCREEN_MODEL_V164=Object.freeze({
    build,QUICK:QUICK_CATALOG,QUICK_CATALOG,DEFAULT_QUICK_IDS,QUICK_STORE_KEY,WEATHER_SCOPE_KEY,WEATHER_PLAN_KEY,
    quickIds,quickRows,catalog,todaySummary,weatherPlaceholder,weatherIntel
  });
})();
