(() => {
  'use strict';

  const BAR_ID='outbaseActivityBar';
  const EVENT_KEY='outbase_activity_events_v1';
  const RECOVERY_KEY='outbase_activity_recovery_v1';
  const LIFECYCLE_KEY='outbase_activity_lifecycle_v1';

  function read(key,fallback){
    try{
      const value=JSON.parse(localStorage.getItem(key)||'null');
      return value??fallback;
    }catch(_error){return fallback;}
  }

  function write(key,value){
    localStorage.setItem(key,JSON.stringify(value));
  }

  function currentInfo(){
    const status=localStorage.getItem('outbase_record_session_state')||'idle';
    const target=localStorage.getItem('outbase_record_target')||'記録';
    const sessionId=localStorage.getItem('outbase_record_session_id')||'';
    const startedAt=Number(localStorage.getItem('outbase_record_session_started_at')||localStorage.getItem('outbase_record_active_started_at')||0);
    const elapsedBase=Number(localStorage.getItem('outbase_record_elapsed_ms')||0);
    const activeStartedAt=Number(localStorage.getItem('outbase_record_active_started_at')||0);
    const elapsed=status==='active'&&activeStartedAt?elapsedBase+(Date.now()-activeStartedAt):elapsedBase;
    const lifecycle=read(LIFECYCLE_KEY,{});
    const sessionLifecycle=sessionId?lifecycle[sessionId]||{}:{};
    const phase=sessionLifecycle.phase||defaultPhase(target,status);
    return {status,target,sessionId,startedAt,elapsed,phase,phaseSource:sessionLifecycle.source||'default'};
  }

  function defaultPhase(target,status){
    if(status==='paused')return '休止';
    if(target==='通常散歩'||target==='ドライブ'||target==='キャンプ')return '実行中';
    return '記録中';
  }

  function formatDuration(ms){
    const total=Math.max(0,Math.floor(ms/1000));
    const days=Math.floor(total/86400);
    const h=Math.floor((total%86400)/3600);
    const m=Math.floor((total%3600)/60);
    if(days)return `${days}日${h}時間`;
    if(h)return `${h}時間${String(m).padStart(2,'0')}分`;
    return `${m}分`;
  }

  function escapeHtml(value){
    return String(value??'')
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'",'&#039;');
  }

  function barHtml(info){
    return `<aside id="${BAR_ID}" class="activityBar ${info.status==='paused'?'paused':''}">
      <button class="activityMain" data-activity-action="open">
        <span class="activityPulse"></span>
        <span class="activityText">
          <small>${escapeHtml(info.phase)} / ACTIVITY CONTINUES</small>
          <b>${escapeHtml(info.target||'記録')}</b>
          <em>${formatDuration(info.elapsed)}・別の画面を使っても継続中</em>
        </span>
      </button>
      <div class="activityActions">
        <button data-activity-action="phase">段階</button>
        <button data-activity-action="${info.status==='paused'?'resume':'pause'}">${info.status==='paused'?'再開':'休止'}</button>
        <button data-activity-action="inactive">今は動いていない</button>
      </div>
    </aside>`;
  }

  function mount(){
    const info=currentInfo();
    const old=document.getElementById(BAR_ID);
    if(!['active','paused'].includes(info.status)){
      old?.remove();
      document.body.classList.remove('hasActivityBar');
      return;
    }
    if(old)old.outerHTML=barHtml(info);
    else{
      const holder=document.createElement('div');
      holder.innerHTML=barHtml(info);
      document.body.appendChild(holder.firstElementChild);
    }
    document.body.classList.add('hasActivityBar');
  }

  function appendEvent(type,extra={}){
    const events=read(EVENT_KEY,[]);
    events.unshift({
      id:`activity-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      type,
      time:new Date().toISOString(),
      sessionId:localStorage.getItem('outbase_record_session_id')||'',
      target:localStorage.getItem('outbase_record_target')||'記録',
      ...extra
    });
    write(EVENT_KEY,events.slice(0,1000));
  }

  function setPhase(phase,source='user'){
    const info=currentInfo();
    if(!info.sessionId)return;
    const lifecycle=read(LIFECYCLE_KEY,{});
    lifecycle[info.sessionId]={
      ...(lifecycle[info.sessionId]||{}),
      phase,
      source,
      updatedAt:Date.now()
    };
    write(LIFECYCLE_KEY,lifecycle);
    appendEvent('phase-change',{phase,source});
    mount();
  }

  function phaseSheet(){
    document.getElementById('activityPhaseSheet')?.remove();
    const info=currentInfo();
    const choices=[
      '準備','移動','設営','滞在','散歩','買い物','撤収',
      '帰宅','休止','整理','改善','次回へ引継ぎ'
    ];
    const sheet=document.createElement('div');
    sheet.id='activityPhaseSheet';
    sheet.className='activityPhaseSheet';
    sheet.innerHTML=`<div class="activityPhaseCard">
      <div class="activityPhaseHead">
        <div><small>LIFECYCLE</small><h3>今の段階</h3><p>時間ではなく、活動の流れで扱います。</p></div>
        <button data-phase-close>×</button>
      </div>
      <div class="activityPhaseGrid">
        ${choices.map(item=>`<button data-phase-select="${item}" class="${item===info.phase?'active':''}">${item}</button>`).join('')}
      </div>
    </div>`;
    document.body.appendChild(sheet);
  }

  function ensureRecoverable(){
    const info=currentInfo();
    if(!['active','paused'].includes(info.status))return;
    const snapshot={
      savedAt:Date.now(),
      status:info.status,
      target:info.target,
      sessionId:info.sessionId,
      startedAt:info.startedAt,
      elapsedMs:info.elapsed,
      phase:info.phase,
      currentPosition:read('outbase_record_current_position',null),
      trackPoints:read('outbase_record_track_points',[]),
      savedPins:read('outbase_record_saved_pins',[])
    };
    write(RECOVERY_KEY,snapshot);
    localStorage.setItem('outbase_record_recoverable_session',JSON.stringify(snapshot));
  }

  function pause(){
    const info=currentInfo();
    if(info.status!=='active')return;
    const activeStartedAt=Number(localStorage.getItem('outbase_record_active_started_at')||0);
    const base=Number(localStorage.getItem('outbase_record_elapsed_ms')||0);
    if(activeStartedAt)localStorage.setItem('outbase_record_elapsed_ms',String(base+Date.now()-activeStartedAt));
    localStorage.setItem('outbase_record_active_started_at','0');
    localStorage.setItem('outbase_record_session_state','paused');
    setPhase('休止');
    appendEvent('pause');
    ensureRecoverable();
    mount();
  }

  function resume(){
    const info=currentInfo();
    if(info.status!=='paused')return;
    localStorage.setItem('outbase_record_session_state','active');
    localStorage.setItem('outbase_record_active_started_at',String(Date.now()));
    if(info.phase==='休止')setPhase(defaultPhase(info.target,'active'));
    appendEvent('resume');
    ensureRecoverable();
    mount();
  }

  function makeInactive(){
    const info=currentInfo();
    ensureRecoverable();
    appendEvent('became-inactive',{
      durationMs:info.elapsed,
      phaseAtChange:info.phase,
      inferred:false
    });
    setPhase('整理');
    localStorage.setItem('outbase_record_elapsed_ms',String(info.elapsed));
    localStorage.setItem('outbase_record_session_state','idle');
    localStorage.setItem('outbase_record_active_started_at','0');
    localStorage.setItem('outbase_record_resume_break_pending','0');
    localStorage.removeItem('outbase_record_session_id');
    localStorage.removeItem('outbase_record_session_started_at');
    mount();
    toast('活動は「終了」ではなく、整理フェーズへ移りました。');
  }

  function repairSession(){
    const info=currentInfo();
    if(!['active','paused'].includes(info.status))return;
    let changed=false;
    if(!info.sessionId){
      localStorage.setItem('outbase_record_session_id',`session-recovered-${Date.now()}`);
      changed=true;
    }
    if(!info.startedAt){
      const fallback=Date.now()-Math.max(info.elapsed,60000);
      localStorage.setItem('outbase_record_session_started_at',String(fallback));
      changed=true;
    }
    if(info.status==='active'&&!Number(localStorage.getItem('outbase_record_active_started_at')||0)){
      localStorage.setItem('outbase_record_active_started_at',String(Date.now()));
      changed=true;
    }
    if(changed)appendEvent('recovered-metadata');
    ensureRecoverable();
  }

  function toast(message){
    document.getElementById('activityToast')?.remove();
    const el=document.createElement('div');
    el.id='activityToast';
    el.className='activityToast';
    el.textContent=message;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),2200);
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-activity-action]');
    if(button){
      const action=button.dataset.activityAction;
      if(action==='open')location.href='?tab=record';
      else if(action==='pause')pause();
      else if(action==='resume')resume();
      else if(action==='phase')phaseSheet();
      else if(action==='inactive')makeInactive();
      return;
    }
    if(event.target.closest?.('[data-phase-close]')){
      document.getElementById('activityPhaseSheet')?.remove();
      return;
    }
    const select=event.target.closest?.('[data-phase-select]');
    if(select){
      setPhase(select.dataset.phaseSelect);
      document.getElementById('activityPhaseSheet')?.remove();
    }
  });

  window.addEventListener('DOMContentLoaded',()=>{
    repairSession();
    mount();
    setInterval(()=>{ensureRecoverable();mount();},15000);
  });
  window.addEventListener('hashchange',mount);
  window.addEventListener('popstate',mount);
  window.addEventListener('beforeunload',ensureRecoverable);
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='hidden')ensureRecoverable();
    else {repairSession();mount();}
  });
  new MutationObserver(mount).observe(document.documentElement,{childList:true,subtree:true});
})();
