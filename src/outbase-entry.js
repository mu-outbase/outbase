(() => {
  'use strict';

  const ENTRY_ID='outbaseInstantEntry';
  const PARKING_KEY='outbase_quick_parking_events_v1';
  const FACT_KEY='outbase_quick_facts_v1';

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

  function currentTab(){
    const params=new URLSearchParams(location.search);
    return params.get('tab')||location.hash.replace('#','')||'plan';
  }

  function visibleOnCurrentTab(){
    return ['plan','record','search'].includes(currentTab());
  }

  function entryHtml(){
    const parking=read(PARKING_KEY,[]);
    const latest=parking[0];
    return `<section id="${ENTRY_ID}" class="instantEntry">
      <div class="instantEntryHead">
        <div><small>START ANYWHERE</small><h2>今すぐ使う</h2><p>予定やプランを作らず、そのまま始められます。</p></div>
      </div>
      <div class="instantEntryGrid">
        <button data-instant="walk"><span>🐾</span><b>散歩開始</b><small>すぐGPS記録へ</small></button>
        <button data-instant="parking"><span>🅿️</span><b>駐車を保存</b><small>現在地を1タップ保存</small></button>
        <button data-instant="photo"><span>📷</span><b>写真・スクショ</b><small>読み込んで後から理解</small></button>
        <button data-instant="voice"><span>🎙️</span><b>音声メモ</b><small>話して記録へ</small></button>
        <button data-instant="record"><span>＋</span><b>今すぐ記録</b><small>活動未選択で開始</small></button>
      </div>
      ${latest?`<button class="instantParkingLatest" data-instant="parking-map">
        <span>最後の駐車</span><b>${new Date(latest.time).toLocaleString('ja-JP')}</b><small>${Number(latest.lat).toFixed(5)}, ${Number(latest.lng).toFixed(5)}</small>
      </button>`:''}
    </section>`;
  }

  function mount(){
    const old=document.getElementById(ENTRY_ID);
    if(!visibleOnCurrentTab()){old?.remove();return;}
    const app=document.getElementById('app');
    if(!app)return;
    if(old){
      old.outerHTML=entryHtml();
      return;
    }
    const holder=document.createElement('div');
    holder.innerHTML=entryHtml();
    app.prepend(holder.firstElementChild);
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
      localStorage.setItem('outbase_record_session_state','active');
      localStorage.setItem('outbase_record_active_started_at',String(Date.now()));
      localStorage.setItem('outbase_record_session_started_at',String(Date.now()));
      if(!localStorage.getItem('outbase_record_session_id')){
        localStorage.setItem('outbase_record_session_id',`session-${Date.now()}`);
      }
    }
    location.href='?tab=record';
  }

  function saveFact(fact){
    const facts=read(FACT_KEY,[]);
    facts.unshift(fact);
    write(FACT_KEY,facts.slice(0,500));
  }

  function saveParking(){
    const button=document.querySelector('[data-instant="parking"]');
    if(button){button.disabled=true;button.querySelector('small').textContent='現在地を取得中…';}
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

  function voiceMemo(){
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
      if(text){
        const fact={id:`voice-${Date.now()}`,type:'voice-text',time:nowIso(),text,source:'quick-entry',planId:null,status:'fact'};
        saveFact(fact);
        localStorage.setItem('outbase_quick_voice_draft',text);
        localStorage.setItem('outbase_record_target','音声メモ');
        showToast('音声メモを保存しました');
      }
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
    const button=event.target.closest?.('[data-instant]');
    if(!button)return;
    const action=button.dataset.instant;
    if(action==='walk')goRecord('通常散歩',true);
    else if(action==='parking')saveParking();
    else if(action==='parking-map')openParkingMap();
    else if(action==='photo')openFileImport();
    else if(action==='voice')voiceMemo();
    else if(action==='record')goRecord('',false);
  });

  window.addEventListener('DOMContentLoaded',queueMount);
  window.addEventListener('hashchange',queueMount);
  window.addEventListener('popstate',queueMount);
  new MutationObserver(queueMount).observe(document.documentElement,{childList:true,subtree:true});
})();
