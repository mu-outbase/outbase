(() => {
  'use strict';

  const BAR_ID='outbaseActivityBar';
  const EVENT_KEY='outbase_activity_events_v1';
  const RECOVERY_KEY='outbase_activity_recovery_v1';
  const STALE_HOURS=18;

  function read(key,fallback){
    try{
      const value=JSON.parse(localStorage.getItem(key)||'null');
      return value??fallback;
    }catch(_error){return fallback;}
  }

  function write(key,value){
    localStorage.setItem(key,JSON.stringify(value));
  }

  function state(){
    const status=localStorage.getItem('outbase_record_session_state')||'idle';
    const target=localStorage.getItem('outbase_record_target')||'記録';
    const sessionId=localStorage.getItem('outbase_record_session_id')||'';
    const startedAt=Number(
      localStorage.getItem('outbase_record_session_started_at')||
      localStorage.getItem('outbase_record_active_started_at')||0
    );
    const elapsedBase=Number(localStorage.getItem('outbase_record_elapsed_ms')||0);
    const activeStartedAt=Number(localStorage.getItem('outbase_record_active_started_at')||0);
    const elapsed=status==='active'&&activeStartedAt
      ? elapsedBase+(Date.now()-activeStartedAt)
      : elapsedBase;
    return {status,target,sessionId,startedAt,elapsed};
  }

  function formatDuration(ms){
    const total=Math.max(0,Math.floor(ms/1000));
    const h=Math.floor(total/3600);
    const m=Math.floor((total%3600)/60);
    return h?`${h}時間${String(m).padStart(2,'0')}分`:`${m}分`;
  }

  function isStale(info){
    return info.startedAt && Date.now()-info.startedAt > STALE_HOURS*60*60*1000;
  }

  function barHtml(info){
    const stale=isStale(info);
    return `<aside id="${BAR_ID}" class="activityBar ${info.status==='paused'?'paused':''} ${stale?'stale':''}">
      <button class="activityMain" data-activity-action="open">
        <span class="activityPulse"></span>
        <span class="activityText">
          <small>${stale?'終了忘れの可能性':'ACTIVITY CONTINUES'}</small>
          <b>${escapeHtml(info.target||'記録')}</b>
          <em>${formatDuration(info.elapsed)}・他の画面を使っても継続中</em>
        </span>
      </button>
      <div class="activityActions">
        <button data-activity-action="${info.status==='paused'?'resume':'pause'}">${info.status==='paused'?'再開':'一時停止'}</button>
        <button data-activity-action="finish">終了</button>
      </div>
    </aside>`;
  }

  function escapeHtml(value){
    return String(value??'')
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'",'&#039;');
  }

  function mount(){
    const info=state();
    const old=document.getElementById(BAR_ID);
    if(!['active','paused'].includes(info.status)){
      old?.remove();
      document.body.classList.remove('hasActivityBar');
      return;
    }
    if(old){
      old.outerHTML=barHtml(info);
    }else{
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

  function ensureRecoverable(){
    const info=state();
    if(!['active','paused'].includes(info.status))return;
    const snapshot={
      savedAt:Date.now(),
      status:info.status,
      target:info.target,
      sessionId:info.sessionId,
      startedAt:info.startedAt,
      elapsedMs:info.elapsed,
      currentPosition:read('outbase_record_current_position',null),
      trackPoints:read('outbase_record_track_points',[]),
      savedPins:read('outbase_record_saved_pins',[])
    };
    write(RECOVERY_KEY,snapshot);
    localStorage.setItem('outbase_record_recoverable_session',JSON.stringify(snapshot));
  }

  function pause(){
    const info=state();
    if(info.status!=='active')return;
    const activeStartedAt=Number(localStorage.getItem('outbase_record_active_started_at')||0);
    const base=Number(localStorage.getItem('outbase_record_elapsed_ms')||0);
    if(activeStartedAt){
      localStorage.setItem('outbase_record_elapsed_ms',String(base+Date.now()-activeStartedAt));
    }
    localStorage.setItem('outbase_record_active_started_at','0');
    localStorage.setItem('outbase_record_session_state','paused');
    appendEvent('pause');
    ensureRecoverable();
    mount();
  }

  function resume(){
    const info=state();
    if(info.status!=='paused')return;
    localStorage.setItem('outbase_record_session_state','active');
    localStorage.setItem('outbase_record_active_started_at',String(Date.now()));
    appendEvent('resume');
    ensureRecoverable();
    mount();
  }

  function finish(){
    const info=state();
    ensureRecoverable();
    appendEvent('finish',{
      durationMs:info.elapsed,
      inferred:false,
      staleAtFinish:isStale(info)
    });
    localStorage.setItem('outbase_record_elapsed_ms',String(info.elapsed));
    localStorage.setItem('outbase_record_session_state','idle');
    localStorage.setItem('outbase_record_active_started_at','0');
    localStorage.setItem('outbase_record_resume_break_pending','0');
    localStorage.removeItem('outbase_record_session_id');
    localStorage.removeItem('outbase_record_session_started_at');
    mount();
    toast('活動を終了しました。記録は保存されています。');
  }

  function repairSession(){
    const info=state();
    if(!['active','paused'].includes(info.status))return;
    let changed=false;
    if(!info.sessionId){
      localStorage.setItem('outbase_record_session_id',`session-recovered-${Date.now()}`);
      changed=true;
    }
    if(!info.startedAt){
      const fallback=Date.now()-Math.max(info.elapsed,60*1000);
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
    setTimeout(()=>el.remove(),2000);
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-activity-action]');
    if(!button)return;
    const action=button.dataset.activityAction;
    if(action==='open')location.href='?tab=record';
    else if(action==='pause')pause();
    else if(action==='resume')resume();
    else if(action==='finish')finish();
  });

  window.addEventListener('DOMContentLoaded',()=>{
    repairSession();
    mount();
    setInterval(()=>{
      ensureRecoverable();
      mount();
    },15000);
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
