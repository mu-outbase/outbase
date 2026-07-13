(() => {
  'use strict';

  const ENTRY_ID='outbaseInstantEntry';
  const PARKING_KEY='outbase_quick_parking_events_v1';
  const FACT_KEY='outbase_quick_facts_v1';
  const MEMO_KEY='outbase_quick_memos_v1';

  function read(key,fallback){
    try{
      const parsed=JSON.parse(localStorage.getItem(key)||'null');
      return parsed??fallback;
    }catch(_error){return fallback;}
  }

  function write(key,value){
    localStorage.setItem(key,JSON.stringify(value));
  }

  function nowIso(){return new Date().toISOString();}

  function core(){return globalThis.OUTBASE_CORE||null;}
  function currentSessionId(){return localStorage.getItem('outbase_record_session_id')||null;}
  function currentActivityId(){return localStorage.getItem('outbase_core_activity_id')||null;}
  function currentPlanId(){const id=localStorage.getItem('outbase_active_plan_id')||'';return id&&id!=='none'?id:null;}
  function locationFrom(item){
    return item&&item.lat!=null&&item.lng!=null
      ?{lat:item.lat,lng:item.lng,accuracy:item.accuracy??null}
      :null;
  }

  function currentTab(){
    const activePage=document.querySelector('.page.active');
    if(activePage?.id?.startsWith('page-'))return activePage.id.slice(5);
    const params=new URLSearchParams(location.search);
    return params.get('tab')||location.hash.replace('#','')||'plan';
  }

  function visibleOnCurrentTab(){
    return currentTab()==='plan';
  }

  function activeActivity(){
    const state=localStorage.getItem('outbase_record_session_state')||'idle';
    const target=localStorage.getItem('outbase_record_target')||'';
    return {state,target};
  }

  function recentMemos(){
    return read(MEMO_KEY,[]).slice(0,4);
  }

  function entryHtml(){
    const parking=read(PARKING_KEY,[]);
    const latest=parking[0];
    const activity=activeActivity();
    const memos=recentMemos();
    const primary = activity.state==='active'
      ? [
          ['record','＋','記録を追加','継続中の活動へ'],
          ['voice','🎙️','音声メモ','自動文字起こし'],
          ['parking','🅿️','駐車を保存','現在地を保存'],
          ['memo','📝','クイックメモ','思いつきを保存'],
          ['photo','📷','写真・スクショ','読み込んで保存']
        ]
      : [
          ['walk','🐾','散歩開始','すぐGPS記録へ'],
          ['drive','🚗','ドライブ開始','予定なしで開始'],
          ['parking','🅿️','駐車を保存','現在地を保存'],
          ['memo','📝','クイックメモ','思いつきを保存'],
          ['voice','🎙️','音声メモ','自動文字起こし']
        ];

    const activeCompact=activity.state==='active';
    return `<section id="${ENTRY_ID}" class="instantEntry ${activeCompact?'instantEntryActive':''}">
      ${activeCompact
        ?`<div class="instantEntryCompactHead">
            <small>QUICK ADD</small>
            <b>活動へ追加</b>
            <button class="instantMore" data-instant="more">その他</button>
          </div>`
        :`<div class="instantEntryHead">
            <div>
              <small>START ANYWHERE</small>
              <h2>今すぐ使う</h2>
              <p>予定やプランを作らず、そのまま始められます。</p>
            </div>
            <button class="instantMore" data-instant="more">その他</button>
          </div>`}

      <div class="instantEntryGrid ${activeCompact?'instantEntryGridCompact':''}">
        ${primary.map(([action,icon,title,note])=>`
          <button data-instant="${action}">
            <span>${icon}</span><b>${title}</b>${activeCompact?'':`<small>${note}</small>`}
          </button>`).join('')}
      </div>

      <div class="instantMorePanel" data-instant-panel hidden>
        <button data-instant="photo"><span>📷</span><b>写真・スクショ</b></button>
        <button data-instant="record"><span>＋</span><b>今すぐ記録</b></button>
        <button data-instant="buy"><span>🛒</span><b>買う物メモ</b></button>
        <button data-instant="memo-list"><span>📒</span><b>メモ一覧</b></button>
      </div>

      ${latest?`<button class="instantParkingLatest" data-instant="parking-map">
        <span>最後の駐車</span>
        <b>${new Date(latest.time).toLocaleString('ja-JP')}</b>
        <small>${Number(latest.lat).toFixed(5)}, ${Number(latest.lng).toFixed(5)}</small>
      </button>`:''}

      ${memos.length?`<div class="instantMemoPreview">
        <div class="instantMemoPreviewHead"><b>最近のメモ</b><button data-instant="memo-list">すべて</button></div>
        ${memos.map(item=>`<button data-instant="memo-list"><span>${item.kind==='buy'?'🛒':'📝'}</span><b>${escapeHtml(item.text)}</b><small>${new Date(item.time).toLocaleString('ja-JP')}</small></button>`).join('')}
      </div>`:''}
    </section>`;
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
    const old=document.getElementById(ENTRY_ID);
    const app=document.getElementById('app');
    if(!app)return;
    if(old){
      old.outerHTML=entryHtml();
      return;
    }
    const holder=document.createElement('div');
    holder.innerHTML=entryHtml();
    app.before(holder.firstElementChild);
  }

  let queued=false;
  function queueMount(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;mount();});
  }

  function goRecord(target='',autoStart=false){
    if(target)localStorage.setItem('outbase_record_target',target);
    if(autoStart){
      const startedAt=Date.now();
      localStorage.setItem('outbase_record_session_state','active');
      localStorage.setItem('outbase_record_active_started_at',String(startedAt));
      localStorage.setItem('outbase_record_session_started_at',String(startedAt));
      if(!localStorage.getItem('outbase_record_session_id')){
        localStorage.setItem('outbase_record_session_id',`session-${startedAt}`);
      }
      const sessionId=currentSessionId();
      const activityId=currentActivityId()||`activity_${sessionId}`;
      localStorage.setItem('outbase_core_activity_id',activityId);
      const api=core();
      if(api){
        api.upsertActivity({
          activityId,
          activityType:target||'記録',
          title:target||'記録',
          state:'active',
          currentPhase:target==='通常散歩'||target==='ドライブ'?'実行中':'記録中',
          startedAt:new Date(startedAt).toISOString(),
          planIds:currentPlanId()?[currentPlanId()]:[],
          source:'entry-02',
          legacySessionId:sessionId
        });
        api.appendEvent({
          eventId:`entry_start_${sessionId}`,
          eventType:target==='通常散歩'?'walk_started':target==='ドライブ'?'drive_started':'activity_started',
          observedAt:new Date(startedAt).toISOString(),
          source:'entry-02',
          sessionId,
          activityId,
          planId:currentPlanId(),
          payload:{target}
        });
      }
    }
    location.href='?tab=record';
  }

  function saveFact(fact){
    const facts=read(FACT_KEY,[]);
    facts.unshift(fact);
    write(FACT_KEY,facts.slice(0,500));
    const api=core();
    if(api){
      const activityId=currentActivityId();
      const eventId=`entry_evt_${fact.id}`;
      api.appendEvent({
        eventId,
        eventType:fact.type||'quick_fact_created',
        observedAt:fact.time,
        source:fact.source||'entry-02',
        sessionId:currentSessionId(),
        activityId,
        planId:fact.planId??currentPlanId(),
        location:locationFrom(fact),
        payload:fact,
        legacyRef:fact.id
      });
      if(fact.type==='parking_saved'){
        api.saveParking({
          parkingId:`entry_parking_${fact.id}`,
          state:'active',
          savedAt:fact.time,
          source:fact.source||'entry-02',
          activityId,
          sessionId:currentSessionId(),
          planId:fact.planId??currentPlanId(),
          location:locationFrom(fact),
          label:fact.label||'駐車位置',
          note:fact.note||'',
          evidence:fact,
          legacyRef:fact.id
        });
      }
      api.addFact({
        factId:`entry_fact_${fact.id}`,
        factType:fact.type||'quick_fact',
        observedAt:fact.time,
        source:fact.source||'entry-02',
        eventId,
        sessionId:currentSessionId(),
        activityId,
        planId:fact.planId??currentPlanId(),
        location:locationFrom(fact),
        value:fact,
        legacyRef:fact.id
      });
    }
  }

  function saveParking(){
    const button=document.querySelector('[data-instant="parking"]');
    if(button){button.disabled=true;button.querySelector('small')?.replaceChildren('現在地を取得中…');}
    if(!navigator.geolocation){
      alert('この端末では現在地を取得できません。');
      queueMount();
      return;
    }
    navigator.geolocation.getCurrentPosition(position=>{
      const event={
        id:`parking-${Date.now()}`,
        type:'parking',
        time:nowIso(),
        lat:position.coords.latitude,
        lng:position.coords.longitude,
        accuracy:position.coords.accuracy,
        source:'quick-entry',
        planId:null,
        status:'fact'
      };
      const items=read(PARKING_KEY,[]);
      items.unshift(event);
      write(PARKING_KEY,items.slice(0,100));
      localStorage.setItem('outbase_active_parking_id',event.id);
      saveFact(event);
      queueMount();
      showToast('駐車位置を保存しました');
    },error=>{
      alert(`現在地を取得できませんでした。${error.message||''}`);
      queueMount();
    },{enableHighAccuracy:true,timeout:12000,maximumAge:15000});
  }

  function openParkingMap(){
    const latest=read(PARKING_KEY,[])[0];
    if(!latest)return;
    window.open(`https://www.google.com/maps/search/?api=1&query=${latest.lat},${latest.lng}`,'_blank','noopener');
  }

  function openFileImport(){
    const input=document.getElementById('fileInput');
    if(!input){alert('読込み機能を開けませんでした。');return;}
    input.accept='image/*,.pdf,.json,.txt,.csv,.md,.xlsx,.xls';
    input.multiple=true;
    input.click();
  }

  function saveMemo(text,kind='memo',source='text'){
    const trimmed=String(text||'').trim();
    if(!trimmed)return;
    const item={
      id:`memo-${Date.now()}`,
      type:'quick-memo',
      kind,
      text:trimmed,
      time:nowIso(),
      source,
      status:'saved',
      planId:null,
      completed:false,
      pinned:false
    };
    const memos=read(MEMO_KEY,[]);
    memos.unshift(item);
    write(MEMO_KEY,memos.slice(0,1000));
    const api=core();
    if(api){
      api.addMemo({
        memoId:`entry_memo_${item.id}`,
        kind:item.kind,
        text:item.text,
        observedAt:item.time,
        source:item.source||'entry-02',
        completed:item.completed,
        pinned:item.pinned,
        planIds:currentPlanId()?[currentPlanId()]:[],
        activityIds:currentActivityId()?[currentActivityId()]:[],
        status:item.status,
        legacyRef:item.id
      });
    }
    saveFact({...item,status:'fact'});
    queueMount();
    showToast(kind==='buy'?'買う物メモを保存しました':'メモを保存しました');
  }

  function openMemoComposer(kind='memo'){
    document.getElementById('instantMemoSheet')?.remove();
    const sheet=document.createElement('div');
    sheet.id='instantMemoSheet';
    sheet.className='instantMemoSheet';
    sheet.innerHTML=`<div class="instantMemoCard">
      <div class="instantMemoCardHead">
        <div><small>${kind==='buy'?'BUY NOTE':'QUICK MEMO'}</small><h3>${kind==='buy'?'買う物メモ':'クイックメモ'}</h3></div>
        <button data-memo-close>×</button>
      </div>
      <textarea data-memo-input autofocus placeholder="${kind==='buy'?'買いたい物をそのまま書く':'思いついたことをそのまま書く'}"></textarea>
      <div class="instantMemoActions">
        <button data-memo-voice="${kind}">🎙️ 話す</button>
        <button data-memo-save="${kind}">保存</button>
      </div>
    </div>`;
    document.body.appendChild(sheet);
    setTimeout(()=>sheet.querySelector('[data-memo-input]')?.focus(),50);
  }

  function openMemoList(){
    document.getElementById('instantMemoSheet')?.remove();
    const memos=read(MEMO_KEY,[]);
    const sheet=document.createElement('div');
    sheet.id='instantMemoSheet';
    sheet.className='instantMemoSheet';
    sheet.innerHTML=`<div class="instantMemoCard instantMemoListCard">
      <div class="instantMemoCardHead">
        <div><small>MEMOS</small><h3>メモ</h3></div>
        <button data-memo-close>×</button>
      </div>
      <div class="instantMemoList">
        ${memos.length?memos.map((item,index)=>`
          <article class="${item.completed?'done':''}">
            <button data-memo-complete="${index}">${item.completed?'✓':'○'}</button>
            <div><small>${item.kind==='buy'?'買う物':'メモ'} / ${new Date(item.time).toLocaleString('ja-JP')}</small><p>${escapeHtml(item.text)}</p></div>
            <button data-memo-delete="${index}">削除</button>
          </article>`).join(''):'<div class="instantMemoEmpty">メモはまだありません。</div>'}
      </div>
      <button class="instantMemoNew" data-memo-new>新しいメモ</button>
    </div>`;
    document.body.appendChild(sheet);
  }

  function voiceMemo(kind='memo'){
    const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SpeechRecognition){
      goRecord('音声メモ',false);
      return;
    }
    const recognition=new SpeechRecognition();
    recognition.lang='ja-JP';
    recognition.interimResults=false;
    recognition.continuous=false;
    showToast('話してください');
    recognition.onresult=event=>{
      const text=Array.from(event.results).map(result=>result[0]?.transcript||'').join(' ').trim();
      if(text)saveMemo(text,kind,'voice-transcript');
    };
    recognition.onerror=()=>goRecord('音声メモ',false);
    recognition.start();
  }

  function showToast(message){
    document.getElementById('instantEntryToast')?.remove();
    const toast=document.createElement('div');
    toast.id='instantEntryToast';
    toast.className='instantEntryToast';
    toast.textContent=message;
    document.body.appendChild(toast);
    setTimeout(()=>toast.remove(),1800);
  }

  document.addEventListener('click',event=>{
    const actionButton=event.target.closest?.('[data-instant]');
    if(actionButton){
      const action=actionButton.dataset.instant;
      const api=core();
      if(api){
        const intentId=`entry_intent_${action}_${Date.now()}`;
        api.setIntent({
          intentId,
          intentType:action,
          state:'active',
          observedAt:nowIso(),
          source:'entry-02',
          activityId:currentActivityId(),
          sessionId:currentSessionId(),
          planId:currentPlanId(),
          payload:{action}
        });
        setTimeout(()=>api.clearIntent(intentId,{result:{dispatched:true}}),0);
      }
      if(action==='walk')goRecord('通常散歩',true);
      else if(action==='drive')goRecord('ドライブ',true);
      else if(action==='parking')saveParking();
      else if(action==='parking-map')openParkingMap();
      else if(action==='photo')openFileImport();
      else if(action==='voice')voiceMemo('memo');
      else if(action==='record')goRecord('',false);
      else if(action==='memo')openMemoComposer('memo');
      else if(action==='buy')openMemoComposer('buy');
      else if(action==='memo-list')openMemoList();
      else if(action==='more'){
        const panel=document.querySelector('[data-instant-panel]');
        if(panel)panel.hidden=!panel.hidden;
      }
      return;
    }

    if(event.target.closest?.('[data-memo-close]')){
      document.getElementById('instantMemoSheet')?.remove();
      return;
    }

    const save=event.target.closest?.('[data-memo-save]');
    if(save){
      const text=document.querySelector('[data-memo-input]')?.value||'';
      saveMemo(text,save.dataset.memoSave||'memo','text');
      document.getElementById('instantMemoSheet')?.remove();
      return;
    }

    const voice=event.target.closest?.('[data-memo-voice]');
    if(voice){
      voiceMemo(voice.dataset.memoVoice||'memo');
      return;
    }

    if(event.target.closest?.('[data-memo-new]')){
      openMemoComposer('memo');
      return;
    }

    const complete=event.target.closest?.('[data-memo-complete]');
    if(complete){
      const memos=read(MEMO_KEY,[]);
      const index=Number(complete.dataset.memoComplete);
      if(memos[index]){
        memos[index].completed=!memos[index].completed;
        write(MEMO_KEY,memos);
        openMemoList();
        queueMount();
      }
      return;
    }

    const del=event.target.closest?.('[data-memo-delete]');
    if(del){
      const memos=read(MEMO_KEY,[]);
      const index=Number(del.dataset.memoDelete);
      if(memos[index]){
        memos[index].status='delete-candidate';
        memos.splice(index,1);
        write(MEMO_KEY,memos);
        openMemoList();
        queueMount();
      }
    }
  });

  window.addEventListener('DOMContentLoaded',queueMount);
  window.addEventListener('hashchange',queueMount);
  window.addEventListener('popstate',queueMount);
  globalThis.addEventListener('outbase:core-ready',queueMount);
  globalThis.addEventListener('outbase:entry-refresh',queueMount);

})();
