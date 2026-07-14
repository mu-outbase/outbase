(() => {
  'use strict';

  const SHELL_ID='outbaseSharedActivityShell';
  const STRIP_ID='outbaseDirectActivityStrip';
  const RUNTIME_KEY='outbase_activity_runtime_v2';
  const PRIMARY_KEY='outbase_primary_activity_id_v2';
  let timer=0;
  let observerBusy=false;

  const read=(key,fallback)=>{
    try{
      const value=JSON.parse(localStorage.getItem(key)||'null');
      return value??fallback;
    }catch(_error){return fallback;}
  };
  const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const esc=value=>String(value??'')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');

  function core(){return globalThis.OUTBASE_CORE||null;}

  function currentId(){
    return localStorage.getItem('outbase_core_activity_id')||
      localStorage.getItem(PRIMARY_KEY)||
      read('outbase_core_v1_meta',{}).primaryActivityId||
      '';
  }

  function activities(){
    const rows=core()?.snapshot?.().activities||[];
    const primary=currentId();
    return rows
      .filter(row=>['active','paused'].includes(row.state))
      .sort((a,b)=>{
        if(a.activityId===primary)return -1;
        if(b.activityId===primary)return 1;
        return String(b.startedAt||'').localeCompare(String(a.startedAt||''));
      });
  }

  function typeLabel(row={}){
    const text=`${row.activityType||''} ${row.title||''}`.toLowerCase();
    if(text.includes('camp')||text.includes('キャンプ'))return 'キャンプ';
    if(text.includes('drive')||text.includes('ドライブ'))return 'ドライブ';
    if(text.includes('walk')||text.includes('散歩'))return '散歩';
    if(text.includes('shop')||text.includes('買'))return '買物';
    if(text.includes('event')||text.includes('イベント'))return 'イベント';
    if(text.includes('other')||text.includes('その他'))return 'その他';
    return '活動';
  }

  function safeTitle(row={}){
    let raw=String(row.title||'').trim();
    raw=raw.replace(/\s*\d{1,2}[/-]\d{1,2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?/g,'').trim();
    if(/^(通常)?散歩$/.test(raw))return '散歩';
    if(/^その他/.test(raw))return 'その他';
    if(raw && raw.length<=18 && !/(持ち物候補|予定候補|買う物|改善候補|保存先|メモ|追加する)/.test(raw))return raw;
    return typeLabel(row);
  }

  function currentTab(){
    const active=document.querySelector('.page.active');
    if(active?.id?.startsWith('page-'))return active.id.slice(5);
    return new URLSearchParams(location.search).get('tab')||'plan';
  }

  function saveCurrentRuntime(){
    try{globalThis.OUTBASE_SCENARIOS?.saveCurrentRuntime?.();}catch(_error){}
  }

  function restoreActivity(row){
    saveCurrentRuntime();

    const runtime=read(RUNTIME_KEY,{})[row.activityId]||{
      activityId:row.activityId,
      state:row.state||'paused',
      target:typeLabel(row)==='散歩'?'通常散歩':typeLabel(row),
      sessionId:row.legacySessionId||`session_${row.activityId}`,
      startedAt:row.startedAt?new Date(row.startedAt).getTime():Date.now(),
      elapsedMs:0,
      activeStartedAt:Date.now(),
      currentPosition:null,
      trackPoints:[],
      savedPins:[],
      mapZoom:16
    };

    localStorage.setItem(PRIMARY_KEY,row.activityId);
    localStorage.setItem('outbase_core_activity_id',row.activityId);

    const meta=read('outbase_core_v1_meta',{});
    meta.primaryActivityId=row.activityId;
    meta.updatedAt=new Date().toISOString();
    write('outbase_core_v1_meta',meta);

    localStorage.setItem('outbase_record_session_state',row.state==='paused'?'paused':'active');
    localStorage.setItem('outbase_record_target',runtime.target||typeLabel(row));
    localStorage.setItem('outbase_record_session_id',runtime.sessionId||`session_${row.activityId}`);
    localStorage.setItem('outbase_record_session_started_at',String(runtime.startedAt||Date.now()));
    localStorage.setItem('outbase_record_elapsed_ms',String(runtime.elapsedMs||0));
    localStorage.setItem('outbase_record_active_started_at',String(row.state==='paused'?0:(runtime.activeStartedAt||Date.now())));
    localStorage.setItem('outbase_record_current_position',JSON.stringify(runtime.currentPosition||null));
    localStorage.setItem('outbase_record_track_points',JSON.stringify(runtime.trackPoints||[]));
    localStorage.setItem('outbase_record_saved_pins',JSON.stringify(runtime.savedPins||[]));
    localStorage.setItem('outbase_record_map_zoom',String(runtime.mapZoom||16));

    const planId=row.planIds?.[0]||'';
    if(planId){
      localStorage.setItem('outbase_active_plan_id',planId);
      localStorage.setItem('outbase_active_plan_id_v1',planId);
    }else{
      localStorage.removeItem('outbase_active_plan_id');
      localStorage.removeItem('outbase_active_plan_id_v1');
    }

    core()?.setPrimaryActivity?.(row.activityId);
    globalThis.dispatchEvent(new CustomEvent('outbase:activity-refresh',{detail:{activityId:row.activityId}}));

    const tab=currentTab();
    location.replace(`${location.pathname}?tab=${encodeURIComponent(tab)}&activityId=${encodeURIComponent(row.activityId)}`);
  }

  function stripHtml(){
    const rows=activities();
    const primary=currentId();
    const chips=rows.length
      ? rows.map(row=>`<button class="obActivityChip ${row.activityId===primary?'isCurrent':''} ${row.state==='paused'?'isPaused':''}" data-ob-activity="${esc(row.activityId)}">
          <span>${esc(safeTitle(row))}</span>
          <small>${row.activityId===primary?'実行中':row.state==='paused'?'休止中':'実行中'}</small>
        </button>`).join('')
      : `<div class="obStateLabel">進行中の活動はありません</div>`;

    return `<section id="${STRIP_ID}" class="obActivityStrip" aria-label="活動切替">
      <span class="obActivityStripLabel">活動</span>
      <div class="obActivityChipRail">${chips}</div>
      <button class="obAddActivity" data-ob-add-activity aria-label="新しい活動を始める">＋</button>
    </section>`;
  }

  function activePage(){
    return document.querySelector('.page.active');
  }

  function mountSharedShell(){
    const page=activePage();
    if(!page||!page.parentNode)return;

    document.querySelectorAll(`#${STRIP_ID}`).forEach(node=>{
      if(!node.closest(`#${SHELL_ID}`))node.remove();
    });

    let shell=document.getElementById(SHELL_ID);
    if(!shell){
      shell=document.createElement('div');
      shell.id=SHELL_ID;
      shell.className='obSharedActivityShell';
    }

    if(shell.parentNode!==page.parentNode || shell.nextSibling!==page){
      page.parentNode.insertBefore(shell,page);
    }

    shell.innerHTML=stripHtml();
  }

  function hideLegacy(){
    document.getElementById('outbaseActivityBar')?.remove();
    document.getElementById('outbaseScenarioEntry')?.remove();
    document.querySelectorAll('.outbaseGlobalSearchButton,[class*="GlobalSearchButton"],.scenarioMiniButton,.obPageMore').forEach(node=>node.remove());

    document.querySelectorAll('body *').forEach(node=>{
      if(node.children.length>5)return;
      const text=(node.textContent||'').trim();
      if(text.startsWith('保存先：')&&text.length<100)node.classList.add('obDestinationLegacy');
    });
  }

  function markSearchHero(){
    const page=document.getElementById('page-search');
    if(!page)return;
    [...page.children].forEach(child=>{
      const text=(child.textContent||'').replace(/\s+/g,' ').trim();
      if(text.startsWith('探す')&&/候補探し|行く前/.test(text))child.classList.add('obDecorativeHero');
    });
  }

  function markMemoryReview(){
    const page=document.getElementById('page-memory');
    if(!page)return;
    [...page.children].forEach(child=>{
      const text=(child.textContent||'').replace(/\s+/g,' ').trim();
      if(/今回を振り返る|PLAN-SCOPED REVIEW|レビューする/.test(text))child.classList.add('obReviewSection');
    });
  }

  function markRecordDuplicates(){
    const page=document.getElementById('page-record');
    if(!page)return;
    [...page.children].forEach(child=>{
      const text=(child.textContent||'').replace(/\s+/g,' ').trim();
      if(/COMMON LIFECYCLE|活動を始める・切り替える/.test(text))child.classList.add('obRecordDuplicate');
    });
  }

  function markStaticStates(){
    document.querySelectorAll('.page.active [class*="Status"],.page.active [class*="Count"]').forEach(node=>{
      if(node.tagName!=='BUTTON'&&!node.closest('button'))node.classList.add('obStaticState');
    });
  }

  function preparePages(){
    document.body.classList.add('obCompactMode');
    document.querySelectorAll('.page').forEach(page=>page.classList.remove('obExpanded'));
    markSearchHero();
    markMemoryReview();
    markRecordDuplicates();
    markStaticStates();
  }

  function render(){
    if(observerBusy)return;
    observerBusy=true;
    try{
      hideLegacy();
      preparePages();
      mountSharedShell();
    }finally{
      observerBusy=false;
    }
  }

  function schedule(){
    clearTimeout(timer);
    timer=setTimeout(render,50);
  }

  document.addEventListener('click',event=>{
    const activity=event.target.closest?.('[data-ob-activity]');
    if(activity){
      const row=activities().find(item=>item.activityId===activity.dataset.obActivity);
      if(row&&row.activityId!==currentId())restoreActivity(row);
      return;
    }

    if(event.target.closest?.('[data-ob-add-activity]')){
      globalThis.OUTBASE_SCENARIOS?.open?.('now');
    }
  },true);

  const observer=new MutationObserver(schedule);
  observer.observe(document.documentElement,{
    subtree:true,
    childList:true,
    attributes:true,
    attributeFilter:['class','style','hidden','aria-hidden']
  });

  window.addEventListener('DOMContentLoaded',schedule);
  window.addEventListener('pageshow',schedule);
  window.addEventListener('hashchange',schedule);
  window.addEventListener('popstate',schedule);
  globalThis.addEventListener('outbase:core-ready',schedule);
  globalThis.addEventListener('outbase:activity-refresh',schedule);
})();
