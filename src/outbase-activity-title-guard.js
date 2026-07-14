(() => {
  'use strict';

  const REPAIR_KEY='outbase_activity_title_repairs_v2';
  const TYPES=[
    ['camp','キャンプ','キャンプ'],
    ['walk','散歩','通常散歩'],
    ['drive','ドライブ散歩','ドライブ'],
    ['shopping','ショッピング','ショッピング'],
    ['event','イベント','イベント'],
    ['other','その他','記録']
  ];

  let timer=0;
  let repairing=false;

  const core=()=>globalThis.OUTBASE_CORE||null;
  const read=(key,fallback)=>{try{const value=JSON.parse(localStorage.getItem(key)||'null');return value??fallback;}catch(_e){return fallback;}};
  const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));

  function plans(){
    const rows=[
      read('outbase_plans_v1',[]),
      read('outbase_plan_library_v1',[]),
      read('outbase_plan_list_v1',[])
    ];
    const map=new Map();
    rows.forEach(list=>{
      if(!Array.isArray(list))return;
      list.forEach((plan,index)=>{
        if(!plan)return;
        const id=String(plan.id||plan.planId||`plan_${index}`);
        if(!map.has(id))map.set(id,{...plan,id});
      });
    });
    return [...map.values()];
  }

  function planTitle(plan){
    return plan?.title||plan?.name||plan?.placeName||'';
  }

  function planById(id){
    return id?plans().find(plan=>String(plan.id)===String(id))||null:null;
  }

  function typeInfo(row={}){
    const text=`${row.activityType||''} ${row.title||''}`.toLowerCase();
    if(text.includes('キャンプ')||text.includes('camp'))return TYPES[0];
    if(text.includes('ドライブ')||text.includes('drive'))return TYPES[2];
    if(text.includes('散歩')||text.includes('walk'))return TYPES[1];
    if(text.includes('買')||text.includes('shop'))return TYPES[3];
    if(text.includes('イベント')||text.includes('event'))return TYPES[4];
    return TYPES[5];
  }

  function suspicious(value){
    const title=String(value||'').trim();
    if(!title)return true;
    if(title.length>34)return true;
    return /(持ち物候補|予定候補|買う物|改善候補|追加する|保存先|メモ|してください|予備の|あとで|未確認箱)/.test(title);
  }

  function safeTitle(row={}){
    const linkedPlan=planById(row.planIds?.[0]);
    const linkedTitle=planTitle(linkedPlan);
    if(linkedTitle)return linkedTitle;
    const raw=String(row.title||'').trim();
    if(!suspicious(raw))return raw;
    const [,label]=typeInfo(row);
    const date=row.startedAt?new Date(row.startedAt).toLocaleDateString('ja-JP',{month:'numeric',day:'numeric'}):'';
    return `${label}${date?` ${date}`:''}`;
  }

  function currentActivity(){
    const api=core();
    const rows=api?.snapshot?.().activities||[];
    const id=localStorage.getItem('outbase_core_activity_id')||
      localStorage.getItem('outbase_primary_activity_id_v2')||
      read('outbase_core_v1_meta',{}).primaryActivityId||'';
    return rows.find(row=>row.activityId===id)||rows.find(row=>['active','paused'].includes(row.state))||null;
  }

  function repairRows(){
    if(repairing)return;
    const api=core();
    if(!api?.snapshot||!api?.upsertActivity)return;
    repairing=true;
    try{
      const rows=api.snapshot().activities||[];
      const repairs=read(REPAIR_KEY,{});
      rows.filter(row=>['active','paused'].includes(row.state)).forEach(row=>{
        const title=safeTitle(row);
        if(!title||title===row.title)return;
        repairs[row.activityId]={from:row.title||'',to:title,at:new Date().toISOString()};
        api.upsertActivity({
          activityId:row.activityId,
          activityType:row.activityType||typeInfo(row)[0],
          title,
          state:row.state,
          currentPhase:row.currentPhase||'記録中',
          startedAt:row.startedAt||null,
          becameInactiveAt:row.becameInactiveAt||null,
          planIds:Array.isArray(row.planIds)?row.planIds:[],
          parentActivityId:row.parentActivityId??null,
          source:row.source||'title-guard',
          legacySessionId:row.legacySessionId??null
        });
      });
      write(REPAIR_KEY,repairs);
    }finally{
      repairing=false;
    }
  }

  function syncCurrentContext(){
    const row=currentActivity();
    if(!row)return;
    const title=safeTitle(row);
    const label=document.querySelector('#outbaseActivityBar .activityText b');
    if(label&&label.textContent!==title)label.textContent=title;

    const planId=row.planIds?.[0]||'';
    if(planId)localStorage.setItem('outbase_active_plan_id',planId);
    else localStorage.removeItem('outbase_active_plan_id');
  }

  function run(){
    clearTimeout(timer);
    timer=setTimeout(()=>{
      repairRows();
      syncCurrentContext();
    },30);
  }

  const observer=new MutationObserver(run);
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','hidden']});
  window.addEventListener('DOMContentLoaded',run);
  window.addEventListener('pageshow',run);
  window.addEventListener('hashchange',run);
  window.addEventListener('popstate',run);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')run();});
  globalThis.addEventListener('outbase:core-ready',run);
  globalThis.addEventListener('outbase:activity-refresh',run);
  setInterval(run,5000);
})();
