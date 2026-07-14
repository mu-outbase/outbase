(() => {
  'use strict';

  const SHEET_ID='outbaseScenarioSheet';
  const RUNTIME_KEY='outbase_activity_runtime_v2';
  const PRIMARY_KEY='outbase_primary_activity_id_v2';
  const FLOW_RETURN_KEY='outbase_flow_return_v2';
  const TYPES=[
    {id:'camp',label:'キャンプ',target:'キャンプ',icon:'⛺',phase:'実行中'},
    {id:'walk',label:'散歩',target:'通常散歩',icon:'🐾',phase:'実行中'},
    {id:'drive',label:'ドライブ散歩',target:'ドライブ',icon:'🚗',phase:'移動'},
    {id:'shopping',label:'ショッピング',target:'ショッピング',icon:'🛒',phase:'実行中'},
    {id:'event',label:'イベント',target:'イベント',icon:'🎪',phase:'実行中'},
    {id:'other',label:'その他',target:'記録',icon:'＋',phase:'記録中'}
  ];
  const PHASES=['準備','移動','設営','滞在','散歩','買い物','撤収','帰宅','休止','整理','改善','次回へ引継ぎ'];

  let currentView='home';
  let blockTimer=0;
  let mountTimer=0;

  const core=()=>globalThis.OUTBASE_CORE||null;
  const read=(key,fallback)=>{try{const value=JSON.parse(localStorage.getItem(key)||'null');return value??fallback;}catch(_e){return fallback;}};
  const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const esc=value=>String(value??'')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
  const uid=prefix=>`${prefix}_${globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2,9)}`}`;
  const snapshot=()=>{try{return core()?.snapshot?.()||{};}catch(_e){return {};}};

  function plans(){
    const sources=[
      read('outbase_plans_v1',[]),
      read('outbase_plan_library_v1',[]),
      read('outbase_plan_list_v1',[])
    ];
    const map=new Map();
    sources.forEach(rows=>{
      if(!Array.isArray(rows))return;
      rows.forEach((plan,index)=>{
        if(!plan)return;
        const id=String(plan.id||plan.planId||`plan_${index}`);
        if(!map.has(id))map.set(id,{...plan,id});
      });
    });
    return [...map.values()];
  }

  function planTitle(plan){
    return plan?.title||plan?.name||plan?.placeName||'名称未設定の予定';
  }

  function planDate(plan){
    return plan?.startDate||plan?.date||plan?.start||plan?.from||'';
  }

  function activityRows(){
    const rows=snapshot().activities;
    return Array.isArray(rows)?rows:[];
  }

  function activeRows(){
    return activityRows().filter(row=>['active','paused'].includes(row.state));
  }

  function currentActivityId(){
    return localStorage.getItem('outbase_core_activity_id')||
      localStorage.getItem(PRIMARY_KEY)||
      activeRows()[0]?.activityId||
      '';
  }

  function currentTab(){
    const active=document.querySelector('.page.active');
    if(active?.id?.startsWith('page-'))return active.id.slice(5);
    const params=new URLSearchParams(location.search);
    return params.get('tab')||location.hash.replace('#','')||'plan';
  }

  function returnUrlForCurrentView(){
    const tab=currentTab();
    return `${location.pathname}?tab=${encodeURIComponent(tab)}`;
  }

  function typeById(id){
    return TYPES.find(type=>type.id===id)||TYPES[TYPES.length-1];
  }

  function inferType(plan){
    const text=`${plan?.type||''} ${plan?.typeId||''} ${planTitle(plan)}`.toLowerCase();
    if(text.includes('キャンプ')||text.includes('camp'))return typeById('camp');
    if(text.includes('ドライブ')||text.includes('drive'))return typeById('drive');
    if(text.includes('散歩')||text.includes('walk'))return typeById('walk');
    if(text.includes('買')||text.includes('shop'))return typeById('shopping');
    if(text.includes('イベント')||text.includes('event'))return typeById('event');
    return typeById('other');
  }


  function planById(id){
    if(!id)return null;
    return plans().find(plan=>String(plan.id)===String(id))||null;
  }

  function typeForActivity(row={}){
    const raw=String(row.activityType||'').toLowerCase();
    const direct=TYPES.find(type=>type.id===raw);
    if(direct)return direct;
    const text=`${raw} ${row.title||''}`.toLowerCase();
    if(text.includes('キャンプ')||text.includes('camp'))return typeById('camp');
    if(text.includes('ドライブ')||text.includes('drive'))return typeById('drive');
    if(text.includes('散歩')||text.includes('walk'))return typeById('walk');
    if(text.includes('買')||text.includes('shop'))return typeById('shopping');
    if(text.includes('イベント')||text.includes('event'))return typeById('event');
    return typeById('other');
  }

  function suspiciousActivityTitle(value){
    const title=String(value||'').trim();
    if(!title)return true;
    if(title.length>34)return true;
    return /(持ち物候補|予定候補|買う物|改善候補|追加する|保存先|メモ|してください|予備の|あとで|未確認箱)/.test(title);
  }

  function activityDisplayTitle(row={}){
    const linkedPlan=planById(row.planIds?.[0]);
    if(linkedPlan)return planTitle(linkedPlan);
    const raw=String(row.title||'').trim();
    if(!suspiciousActivityTitle(raw))return raw;
    const type=typeForActivity(row);
    const date=row.startedAt?new Date(row.startedAt).toLocaleDateString('ja-JP',{month:'numeric',day:'numeric'}):'';
    return `${type.label}${date?` ${date}`:''}`;
  }

  function saveActivityRow(row,patch={}){
    if(!row?.activityId)return null;
    return core()?.upsertActivity?.({
      activityId:row.activityId,
      activityType:row.activityType||typeForActivity(row).id,
      title:patch.title||activityDisplayTitle(row),
      state:patch.state||row.state||'paused',
      currentPhase:patch.currentPhase||row.currentPhase||'記録中',
      startedAt:row.startedAt||null,
      becameInactiveAt:patch.becameInactiveAt??row.becameInactiveAt??null,
      planIds:Array.isArray(row.planIds)?row.planIds:[],
      parentActivityId:row.parentActivityId??null,
      source:row.source||'scenario-switch',
      legacySessionId:row.legacySessionId??null
    });
  }

  function pausePrimaryActivity(exceptActivityId=''){
    const primaryId=currentActivityId();
    if(!primaryId||primaryId===exceptActivityId)return;
    const row=activeRows().find(item=>item.activityId===primaryId);
    saveCurrentRuntime();
    if(!row)return;
    const all=read(RUNTIME_KEY,{});
    const runtime=all[primaryId]||{};
    const activeStartedAt=Number(runtime.activeStartedAt||localStorage.getItem('outbase_record_active_started_at')||0);
    const elapsedMs=Number(runtime.elapsedMs||localStorage.getItem('outbase_record_elapsed_ms')||0);
    runtime.elapsedMs=elapsedMs+(activeStartedAt?Math.max(0,Date.now()-activeStartedAt):0);
    runtime.activeStartedAt=0;
    runtime.state='paused';
    runtime.savedAt=Date.now();
    all[primaryId]=runtime;
    write(RUNTIME_KEY,all);
    saveActivityRow(row,{state:'paused',currentPhase:'休止'});
  }

  function activateActivity(row){
    if(!row)return;
    const all=read(RUNTIME_KEY,{});
    const type=typeForActivity(row);
    const runtime=all[row.activityId]||{
      activityId:row.activityId,
      target:type.target,
      sessionId:row.legacySessionId||`session_${row.activityId}`,
      startedAt:row.startedAt?new Date(row.startedAt).getTime():Date.now(),
      elapsedMs:0,
      currentPosition:null,
      trackPoints:[],
      savedPins:[],
      mapZoom:16
    };
    runtime.state='active';
    runtime.target=runtime.target||type.target;
    runtime.sessionId=runtime.sessionId||row.legacySessionId||`session_${row.activityId}`;
    runtime.startedAt=runtime.startedAt||Date.now();
    runtime.activeStartedAt=Date.now();
    runtime.savedAt=Date.now();
    all[row.activityId]=runtime;
    write(RUNTIME_KEY,all);
    const nextPhase=row.currentPhase==='休止'?typeForActivity(row).phase:(row.currentPhase||typeForActivity(row).phase);
    const updated={...row,state:'active',currentPhase:nextPhase,title:activityDisplayTitle(row)};
    saveActivityRow(updated,{state:'active',currentPhase:nextPhase,title:activityDisplayTitle(row)});
    restoreRuntime(updated);
  }

  function planOptions(selected=''){
    const rows=plans();
    return `<option value="">プランなし</option>${rows.map(plan=>
      `<option value="${esc(plan.id)}" ${String(plan.id)===String(selected)?'selected':''}>${esc(planTitle(plan))}</option>`
    ).join('')}`;
  }

  function localDateTimeValue(date=new Date()){
    const local=new Date(date.getTime()-date.getTimezoneOffset()*60000);
    return local.toISOString().slice(0,16);
  }

  function saveCurrentRuntime(){
    const activityId=localStorage.getItem('outbase_core_activity_id')||'';
    if(!activityId)return;
    const all=read(RUNTIME_KEY,{});
    all[activityId]={
      activityId,
      state:localStorage.getItem('outbase_record_session_state')||'idle',
      target:localStorage.getItem('outbase_record_target')||'記録',
      sessionId:localStorage.getItem('outbase_record_session_id')||'',
      startedAt:Number(localStorage.getItem('outbase_record_session_started_at')||0),
      elapsedMs:Number(localStorage.getItem('outbase_record_elapsed_ms')||0),
      activeStartedAt:Number(localStorage.getItem('outbase_record_active_started_at')||0),
      currentPosition:read('outbase_record_current_position',null),
      trackPoints:read('outbase_record_track_points',[]),
      savedPins:read('outbase_record_saved_pins',[]),
      mapZoom:Number(localStorage.getItem('outbase_record_map_zoom')||16),
      savedAt:Date.now()
    };
    write(RUNTIME_KEY,all);
  }

  function setPrimaryActivity(activityId){
    if(activityId){
      localStorage.setItem(PRIMARY_KEY,activityId);
      localStorage.setItem('outbase_core_activity_id',activityId);
    }else{
      localStorage.removeItem(PRIMARY_KEY);
      localStorage.removeItem('outbase_core_activity_id');
    }
    const meta=read('outbase_core_v1_meta',{});
    meta.primaryActivityId=activityId||null;
    meta.updatedAt=new Date().toISOString();
    write('outbase_core_v1_meta',meta);
  }

  function restoreRuntime(activity){
    const all=read(RUNTIME_KEY,{});
    const fallbackType=typeForActivity(activity);
    const runtime=all[activity.activityId]||{
      activityId:activity.activityId,
      state:activity.state||'paused',
      target:fallbackType.target,
      sessionId:activity.legacySessionId||`session_${activity.activityId}`,
      startedAt:activity.startedAt?new Date(activity.startedAt).getTime():Date.now(),
      elapsedMs:0,
      activeStartedAt:activity.state==='active'?Date.now():0,
      currentPosition:null,
      trackPoints:[],
      savedPins:[],
      mapZoom:16
    };

    setPrimaryActivity(activity.activityId);
    localStorage.setItem('outbase_record_session_state',runtime.state==='paused'?'paused':'active');
    localStorage.setItem('outbase_record_target',runtime.target||activity.title||'記録');
    localStorage.setItem('outbase_record_session_id',runtime.sessionId);
    localStorage.setItem('outbase_record_session_started_at',String(runtime.startedAt||Date.now()));
    localStorage.setItem('outbase_record_elapsed_ms',String(runtime.elapsedMs||0));
    localStorage.setItem('outbase_record_active_started_at',String(runtime.state==='paused'?0:(runtime.activeStartedAt||Date.now())));
    localStorage.setItem('outbase_record_current_position',JSON.stringify(runtime.currentPosition||null));
    localStorage.setItem('outbase_record_track_points',JSON.stringify(runtime.trackPoints||[]));
    localStorage.setItem('outbase_record_saved_pins',JSON.stringify(runtime.savedPins||[]));
    localStorage.setItem('outbase_record_map_zoom',String(runtime.mapZoom||16));

    const planId=activity.planIds?.[0]||'';
    if(planId)localStorage.setItem('outbase_active_plan_id',planId);
    else localStorage.removeItem('outbase_active_plan_id');
    globalThis.dispatchEvent(new CustomEvent('outbase:activity-refresh',{detail:{activityId:activity.activityId,planId:planId||null}}));
  }

  function startActiveActivity({typeId,title='',planId='',startedAt=Date.now(),phase='',origin='now'}){
    pausePrimaryActivity();

    const type=typeById(typeId);
    const startMs=new Date(startedAt).getTime();
    const safeStart=Number.isFinite(startMs)?startMs:Date.now();
    const sessionId=uid('session');
    const activityId=uid('activity');
    const activityTitle=String(title||type.label).trim()||type.label;
    const currentPhase=phase||type.phase;

    const runtime={
      activityId,
      state:'active',
      target:type.target,
      sessionId,
      startedAt:safeStart,
      elapsedMs:Math.max(0,Date.now()-safeStart),
      activeStartedAt:Date.now(),
      currentPosition:null,
      trackPoints:[],
      savedPins:[],
      mapZoom:16,
      origin,
      savedAt:Date.now()
    };
    const all=read(RUNTIME_KEY,{});
    all[activityId]=runtime;
    write(RUNTIME_KEY,all);

    const api=core();
    api?.upsertActivity?.({
      activityId,
      activityType:type.id,
      title:activityTitle,
      state:'active',
      currentPhase,
      startedAt:new Date(safeStart).toISOString(),
      planIds:planId?[planId]:[],
      source:`scenario-${origin}`,
      legacySessionId:sessionId
    });
    api?.setLifecycle?.(activityId,currentPhase,'user',{
      observedAt:new Date().toISOString(),
      reason:`scenario-${origin}`
    });
    api?.appendEvent?.({
      eventId:uid('scenario_start'),
      eventType:origin==='planned'?'planned_activity_started':origin==='midway'?'midway_activity_started':'unplanned_activity_started',
      observedAt:new Date().toISOString(),
      recordedAt:new Date().toISOString(),
      source:'scenario-foundation',
      sessionId,
      activityId,
      planId:planId||null,
      payload:{typeId,title:activityTitle,origin,currentPhase,startedAt:new Date(safeStart).toISOString()}
    });

    if(planId)localStorage.setItem('outbase_active_plan_id',planId);
    restoreRuntime({
      activityId,
      state:'active',
      title:type.target,
      activityType:type.id,
      startedAt:new Date(safeStart).toISOString(),
      legacySessionId:sessionId,
      planIds:planId?[planId]:[]
    });

    closeSheet();
    location.href='?tab=record';
  }


  function saveHistoricalActivity(form){
    const data=Object.fromEntries(new FormData(form));
    const type=typeById(data.typeId);
    const start=new Date(data.startedAt);
    const end=new Date(data.endedAt||data.startedAt);
    const startIso=Number.isNaN(start.getTime())?new Date().toISOString():start.toISOString();
    const endIso=Number.isNaN(end.getTime())?startIso:end.toISOString();
    const activityId=uid('activity_past');
    const title=String(data.title||type.label).trim()||type.label;
    const planId=String(data.planId||'');

    const api=core();
    api?.upsertActivity?.({
      activityId,
      activityType:type.id,
      title,
      state:'inactive',
      currentPhase:'整理',
      startedAt:startIso,
      becameInactiveAt:endIso,
      planIds:planId?[planId]:[],
      source:'scenario-past',
      legacySessionId:null
    });
    api?.setLifecycle?.(activityId,'整理','user',{
      observedAt:endIso,
      reason:'historical-registration'
    });
    const eventId=uid('scenario_past');
    api?.appendEvent?.({
      eventId,
      eventType:'historical_activity_created',
      observedAt:endIso,
      recordedAt:new Date().toISOString(),
      source:'scenario-foundation',
      activityId,
      planId:planId||null,
      payload:{title,typeId:type.id,startedAt:startIso,endedAt:endIso,historical:true}
    });
    api?.addFact?.({
      factId:uid('historical_fact'),
      factType:'historical_activity_summary',
      observedAt:endIso,
      source:'scenario-foundation',
      eventId,
      activityId,
      planId:planId||null,
      value:{title,type:type.label,startedAt:startIso,endedAt:endIso}
    });
    api?.addMemo?.({
      memoId:uid('historical_memo'),
      kind:'historical-summary',
      text:`${title}（過去登録）`,
      observedAt:endIso,
      source:'scenario-foundation',
      planIds:planId?[planId]:[],
      activityIds:[activityId],
      status:'saved'
    });

    showToast('過去の活動を登録しました');
    closeSheet();
    window.setTimeout(()=>{location.href='?tab=memory';},350);
  }

  function switchActivity(activityId){
    const row=activeRows().find(item=>item.activityId===activityId);
    if(!row||row.activityId===currentActivityId())return;
    pausePrimaryActivity(activityId);
    activateActivity(row);
    closeSheet();
    location.href=`?tab=record&activityId=${encodeURIComponent(activityId)}`;
  }

  function plannedMarkup(){
    const rows=plans();
    if(!rows.length)return `<div class="scenarioEmpty">開始できる予定がありません。予定なし開始か、途中から開始を使えます。</div>`;
    return `<div class="scenarioList">${rows.map(plan=>{
      const type=inferType(plan);
      return `<article class="scenarioRow">
        <div>
          <small>${esc(planDate(plan)||'日付未設定')} / ${esc(type.label)}</small>
          <b>${esc(planTitle(plan))}</b>
          <p>この予定を主役プランとして活動を開始します。</p>
        </div>
        <button data-scenario-start-plan="${esc(plan.id)}">開始</button>
      </article>`;
    }).join('')}</div>`;
  }

  function nowMarkup(){
    return `<div class="scenarioIntro"><b>予定を作らず、そのまま開始</b><p>記録は独立Activityとして保存し、後からプランへ紐付けられます。</p></div>
      <div class="scenarioActionGrid">${TYPES.map(type=>`<button data-scenario-start-now="${type.id}">
        <span>${type.icon}</span><b>${esc(type.label)}</b><small>${esc(type.target)}として開始</small>
      </button>`).join('')}</div>`;
  }

  function midwayMarkup(){
    const start=new Date(Date.now()-60*60*1000);
    return `<div class="scenarioIntro"><b>すでに始まっている活動を途中から記録</b><p>実際の開始時刻と現在の段階を指定し、経過時間を引き継いで開始します。</p></div>
      <form class="scenarioForm" data-scenario-midway-form>
        <div class="scenarioFormGrid">
          <label>活動種別<select name="typeId">${TYPES.map(type=>`<option value="${type.id}">${esc(type.label)}</option>`).join('')}</select></label>
          <label>現在の段階<select name="phase">${PHASES.map(phase=>`<option>${esc(phase)}</option>`).join('')}</select></label>
          <label>活動名<input name="title" placeholder="例：赤城山キャンプ"></label>
          <label>実際の開始時刻<input type="datetime-local" name="startedAt" value="${localDateTimeValue(start)}" required></label>
          <label>紐付けるプラン<select name="planId">${planOptions()}</select></label>
        </div>
        <button>途中から記録を始める</button>
      </form>`;
  }

  function pastMarkup(){
    const start=new Date();
    start.setDate(start.getDate()-1);
    start.setHours(10,0,0,0);
    const end=new Date(start);
    end.setHours(16,0,0,0);
    return `<div class="scenarioIntro"><b>過去の活動を後から登録</b><p>現在進行中Sessionにはせず、過去日時のActivityとして思い出へ保存します。</p></div>
      <form class="scenarioForm" data-scenario-past-form>
        <div class="scenarioFormGrid">
          <label>活動種別<select name="typeId">${TYPES.map(type=>`<option value="${type.id}">${esc(type.label)}</option>`).join('')}</select></label>
          <label>活動名<input name="title" placeholder="例：月館オートキャンプ" required></label>
          <label>開始日時<input type="datetime-local" name="startedAt" value="${localDateTimeValue(start)}" required></label>
          <label>終了日時<input type="datetime-local" name="endedAt" value="${localDateTimeValue(end)}" required></label>
          <label>紐付けるプラン<select name="planId">${planOptions()}</select></label>
        </div>
        <button>過去の活動として保存</button>
      </form>`;
  }

  function switchMarkup(){
    const rows=activeRows();
    const primary=currentActivityId();
    const list=rows.length?`<div class="scenarioList">${rows.map(row=>{
      const linkedPlan=planById(row.planIds?.[0]);
      const type=typeForActivity(row);
      return `<article class="scenarioRow ${row.activityId===primary?'primary':''}">
        <div>
          <small>${row.activityId===primary?'現在の主役 / ':''}${esc(row.state==='paused'?'休止中':'実行中')} / ${esc(row.currentPhase||'')}</small>
          <b>${esc(activityDisplayTitle(row))}</b>
          <p>${esc(type.label)}${linkedPlan?`・主役プラン ${esc(planTitle(linkedPlan))}`:'・プランなし'}${row.startedAt?`・${new Date(row.startedAt).toLocaleString('ja-JP')}`:''}</p>
        </div>
        <button data-scenario-switch="${esc(row.activityId)}">${row.activityId===primary?'表示中':'この活動へ切替'}</button>
      </article>`;
    }).join('')}</div>`:`<div class="scenarioEmpty">実行中・休止中のActivityはありません。</div>`;
    return `<div class="scenarioIntro"><b>複数同時進行</b><p>端末で操作する主役Activityは1件。ほかのActivityは休止状態で保持し、いつでも復元できます。</p></div>
      ${list}
      <section class="scenarioSwitchStart">
        <div><small>START ANOTHER ACTIVITY</small><b>${rows.length===1?'切替先を作る':'別の活動を並行して始める'}</b><p>この画面から新しいActivityを追加できます。</p></div>
        <div class="scenarioSwitchStartActions">
          <button data-scenario-view="planned">予定から開始</button>
          <button data-scenario-view="now">予定なしで開始</button>
          <button data-scenario-view="midway">途中から開始</button>
        </div>
      </section>`;
  }

  function bodyMarkup(){
    if(currentView==='planned')return plannedMarkup();
    if(currentView==='now')return nowMarkup();
    if(currentView==='midway')return midwayMarkup();
    if(currentView==='past')return pastMarkup();
    if(currentView==='switch')return switchMarkup();
    return `<div class="scenarioIntro"><b>入口を限定しない共通基盤</b><p>予定から、予定なし、途中、過去、複数同時進行のどこからでも始められます。</p></div>
      <div class="scenarioActionGrid">
        <button data-scenario-view="planned"><span>📅</span><b>予定から開始</b><small>プランを主役にして開始</small></button>
        <button data-scenario-view="now"><span>＋</span><b>予定なしで開始</b><small>散歩・ドライブ・その他</small></button>
        <button data-scenario-view="midway"><span>▶</span><b>途中から開始</b><small>開始時刻と段階を指定</small></button>
        <button data-scenario-view="past"><span>🕘</span><b>過去を登録</b><small>思い出から後入力</small></button>
        <button data-scenario-view="switch"><span>⇄</span><b>活動を切替</b><small>複数Activityを維持</small></button>
      </div>`;
  }

  function renderSheet(){
    const root=document.getElementById(SHEET_ID);
    if(!root)return;
    const tabs=[
      ['home','入口'],['planned','予定'],['now','今すぐ'],['midway','途中'],['past','過去'],['switch','切替']
    ];
    root.innerHTML=`<section class="scenarioSheet" role="dialog" aria-modal="true" aria-label="活動の開始と切替">
      <header class="scenarioSheetHead">
        <div><small>LIFECYCLE FOUNDATION</small><h2>活動を始める・切り替える</h2><p>キャンプ以外、途中、過去、複数同時進行に共通対応</p></div>
        <button data-scenario-close aria-label="閉じる">×</button>
      </header>
      <nav class="scenarioTabs">${tabs.map(([id,label])=>`<button class="${currentView===id?'active':''}" data-scenario-view="${id}">${label}</button>`).join('')}</nav>
      <div class="scenarioBody">${bodyMarkup()}</div>
    </section>`;
  }

  function openSheet(view='home'){
    currentView=view;
    document.getElementById(SHEET_ID)?.remove();
    const root=document.createElement('div');
    root.id=SHEET_ID;
    root.className='scenarioBackdrop';
    document.body.appendChild(root);
    renderSheet();
    updateBlockingLayer();
  }

  function closeSheet(){
    document.getElementById(SHEET_ID)?.remove();
    updateBlockingLayer();
  }

  function showToast(message){
    document.getElementById('outbaseScenarioToast')?.remove();
    const toast=document.createElement('div');
    toast.id='outbaseScenarioToast';
    toast.className='scenarioToast';
    toast.textContent=message;
    document.body.appendChild(toast);
    setTimeout(()=>toast.remove(),2000);
  }


  function entryCardMarkup(){
    const active=activeRows();
    const historical=activityRows().filter(row=>row.source==='scenario-past').length;
    return `<section id="outbaseScenarioEntry" class="scenarioEntryCard">
      <div class="scenarioEntryHead">
        <div><small>COMMON LIFECYCLE</small><h2>活動を始める・切り替える</h2><p>予定、今すぐ、途中、過去、複数同時進行を同じ基盤で扱います。</p></div>
        <button data-scenario-open="home">開く</button>
      </div>
      <div class="scenarioEntryMeta"><span>実行・休止中 ${active.length}件</span><span>過去登録 ${historical}件</span></div>
      <div class="scenarioEntryActions">
        <button data-scenario-open="past">過去を登録</button>
        <button class="secondary" data-scenario-open="switch">活動を切替</button>
      </div>
    </section>`;
  }

  function injectEntryPoints(){
    const record=document.getElementById('page-record');
    if(record&&!document.getElementById('outbaseScenarioEntry')){
      const holder=document.createElement('div');
      holder.innerHTML=entryCardMarkup();
      record.prepend(holder.firstElementChild);
    }

    const memory=document.getElementById('page-memory');
    if(memory&&!memory.querySelector('[data-scenario-memory-entry]')){
      const button=document.createElement('button');
      button.type='button';
      button.className='scenarioMiniButton';
      button.dataset.scenarioOpen='past';
      button.dataset.scenarioMemoryEntry='1';
      button.innerHTML='<span>🕘</span><div><b>過去の活動を登録</b><small>写真やメモを後から紐付け</small></div>';
      memory.prepend(button);
    }

    const more=document.querySelector('#outbaseInstantEntry [data-instant-panel]');
    if(more&&!more.querySelector('[data-scenario-open]')){
      const past=document.createElement('button');
      past.type='button';
      past.dataset.scenarioOpen='past';
      past.innerHTML='<span>🕘</span><b>過去の活動を登録</b>';
      const change=document.createElement('button');
      change.type='button';
      change.dataset.scenarioOpen='switch';
      change.innerHTML='<span>⇄</span><b>活動を切り替える</b>';
      more.append(past,change);
    }
  }

  function visible(element){
    if(!element||!element.isConnected)return false;
    const style=getComputedStyle(element);
    return style.display!=='none'&&style.visibility!=='hidden'&&element.getClientRects().length>0;
  }

  function updateBlockingLayer(){
    clearTimeout(blockTimer);
    blockTimer=setTimeout(()=>{
      const selectors=[
        '.recordSheetBackdrop','.flowBackdrop','.memoryDetailBackdrop','.outbaseSearchBackdrop',
        '.prepMemoBackdrop','.prepMemoEditorBackdrop','.activityPhaseSheet','.scenarioBackdrop',
        '[role="dialog"]','[aria-modal="true"]','[class*="Backdrop"]','[class*="backdrop"]'
      ];
      const blocking=[...document.querySelectorAll(selectors.join(','))].some(element=>{
        if(!visible(element))return false;
        const rect=element.getBoundingClientRect();
        const style=getComputedStyle(element);
        return style.position==='fixed'||
          rect.width>=innerWidth*.7||
          rect.height>=innerHeight*.3;
      });
      document.body.classList.toggle('outbaseBlockingLayer',blocking);
    },20);
  }

  function queueMount(){
    clearTimeout(mountTimer);
    mountTimer=setTimeout(()=>{
      injectEntryPoints();
      updateBlockingLayer();
    },30);
  }

  function rememberFlowOrigin(){
    sessionStorage.setItem(FLOW_RETURN_KEY,returnUrlForCurrentView());
  }

  function restoreFlowOrigin(){
    const target=sessionStorage.getItem(FLOW_RETURN_KEY);
    sessionStorage.removeItem(FLOW_RETURN_KEY);
    if(!target)return;
    setTimeout(()=>{
      if(document.getElementById('outbaseFlowRoot'))return;
      const current=`${location.pathname}${location.search}`;
      if(current!==target)location.href=target;
    },20);
  }

  document.addEventListener('click',event=>{
    const flowLaunch=event.target.closest?.('[data-flow-launch]');
    if(flowLaunch)rememberFlowOrigin();

    const flowClose=event.target.closest?.('[data-flow-close],[data-flow-open="close"]');
    if(flowClose)restoreFlowOrigin();

    const open=event.target.closest?.('[data-scenario-open]');
    if(open){
      event.preventDefault();
      openSheet(open.dataset.scenarioOpen||'home');
      return;
    }

    if(event.target===document.getElementById(SHEET_ID)||event.target.closest?.('[data-scenario-close]')){
      closeSheet();
      return;
    }

    const view=event.target.closest?.('[data-scenario-view]');
    if(view){
      currentView=view.dataset.scenarioView||'home';
      renderSheet();
      return;
    }

    const planStart=event.target.closest?.('[data-scenario-start-plan]');
    if(planStart){
      const plan=plans().find(item=>String(item.id)===String(planStart.dataset.scenarioStartPlan));
      if(!plan)return;
      const type=inferType(plan);
      startActiveActivity({
        typeId:type.id,
        title:planTitle(plan),
        planId:plan.id,
        startedAt:Date.now(),
        phase:type.phase,
        origin:'planned'
      });
      return;
    }

    const now=event.target.closest?.('[data-scenario-start-now]');
    if(now){
      const type=typeById(now.dataset.scenarioStartNow);
      startActiveActivity({typeId:type.id,title:type.label,origin:'now'});
      return;
    }

    const change=event.target.closest?.('[data-scenario-switch]');
    if(change&&change.textContent.trim()!=='表示中'){
      switchActivity(change.dataset.scenarioSwitch);
    }
  },true);

  document.addEventListener('submit',event=>{
    const midway=event.target.closest?.('[data-scenario-midway-form]');
    if(midway){
      event.preventDefault();
      const data=Object.fromEntries(new FormData(midway));
      startActiveActivity({
        typeId:data.typeId,
        title:data.title,
        planId:data.planId,
        startedAt:data.startedAt,
        phase:data.phase,
        origin:'midway'
      });
      return;
    }

    const past=event.target.closest?.('[data-scenario-past-form]');
    if(past){
      event.preventDefault();
      saveHistoricalActivity(past);
    }
  },true);

  const observer=new MutationObserver(queueMount);
  observer.observe(document.documentElement,{
    subtree:true,
    childList:true,
    attributes:true,
    attributeFilter:['class','style','hidden','aria-hidden','open']
  });

  window.addEventListener('DOMContentLoaded',queueMount);
  window.addEventListener('pageshow',queueMount);
  window.addEventListener('hashchange',queueMount);
  window.addEventListener('popstate',queueMount);
  window.addEventListener('beforeunload',saveCurrentRuntime);
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='hidden')saveCurrentRuntime();
    else queueMount();
  });
  globalThis.addEventListener('outbase:core-ready',queueMount);
  globalThis.addEventListener('outbase:activity-refresh',queueMount);
  globalThis.OUTBASE_SCENARIOS={
    open:openSheet,
    saveCurrentRuntime,
    activeActivities:activeRows
  };
})();
