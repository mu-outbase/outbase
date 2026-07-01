/* =========================================================
   OUTBASE walkResult.js
   UI v208: 散歩終了後の結果画面
   - finishWalk の location.reload を使わず、保存後に結果画面へ遷移
   - 散歩結果の所在を「結果画面 / 散歩履歴 / 詳細」に整理
   - walk.js 本体は触らない
========================================================= */
(function(){
  'use strict';

  const PAGE_ID = 'outbaseWalkResultPageV208';
  const STYLE_ID = 'outbaseWalkResultV208Style';
  let finishing = false;

  function esc(value){
    return String(value ?? '')
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'",'&#039;');
  }

  function addStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${PAGE_ID}{background:linear-gradient(180deg,#f4f8f2 0%,#fbfaf5 100%);padding:14px 14px 104px;}
      .walk-result-card{background:#fff;border:1px solid rgba(31,111,58,.08);border-radius:24px;padding:18px;box-shadow:0 10px 24px rgba(20,81,45,.08);color:#243127;margin-bottom:14px;}
      .walk-result-hero{background:linear-gradient(135deg,#1f6f3a,#4f8f5b);color:#fff;overflow:hidden;position:relative;}
      .walk-result-hero:after{content:'';position:absolute;right:22px;top:18px;width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,.34);}
      .walk-result-kicker{font-size:12px;letter-spacing:.08em;opacity:.9;margin-bottom:6px;}
      .walk-result-title{font-size:28px;font-weight:900;line-height:1.25;position:relative;z-index:1;}
      .walk-result-sub{font-size:13px;line-height:1.5;opacity:.92;margin-top:8px;position:relative;z-index:1;}
      .walk-result-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}
      .walk-result-mini{border:1px solid #e5ebe4;border-radius:18px;padding:13px;background:#fff;min-height:78px;}
      .walk-result-label{font-size:12px;color:#6b766c;margin-bottom:5px;}
      .walk-result-value{font-size:20px;font-weight:900;line-height:1.3;}
      .walk-result-note{font-size:13px;color:#6b766c;line-height:1.55;}
      .walk-result-actions{display:flex;flex-direction:column;gap:10px;}
      .walk-result-primary,.walk-result-secondary{width:100%;border-radius:18px;min-height:54px;font-size:16px;font-weight:900;padding:12px;border:0;}
      .walk-result-primary{background:linear-gradient(180deg,#1f6f3a,#123d25);color:#fff;}
      .walk-result-secondary{background:#fff;color:#123d25;border:1px solid #e5ebe4;}
      .walk-result-muted{font-size:12px;color:#6b766c;line-height:1.5;margin-top:8px;}
    `;
    document.head.appendChild(style);
  }

  function ensurePage(){
    let page = document.getElementById(PAGE_ID);
    if(page) return page;
    page = document.createElement('div');
    page.id = PAGE_ID;
    page.className = 'page hidden';
    const firstScript = document.body.querySelector('script');
    document.body.insertBefore(page, firstScript || null);
    return page;
  }

  function hideAllPages(){
    document.querySelectorAll('.page').forEach(page => page.classList.add('hidden'));
  }

  function validGpsCount(record){
    return record?.summary?.validGpsPointCount || record?.summary?.gpsPointCount || 0;
  }

  function getQuickEvents(){
    try{
      const api = window.OUTBASE_WALK_C2 && window.OUTBASE_WALK_C2.events;
      if(api && typeof api.getCurrentEvents === 'function') return api.getCurrentEvents() || [];
    }catch(error){ console.warn('v208 quick events skip', error); }
    return [];
  }

  function countType(events,type){ return events.filter(event => event.type === type).length; }

  function buildResultHtml(record){
    const time = record.walk?.time || '00:00:00';
    const distance = record.walk?.distanceKm || '0.00km';
    const avg = record.walk?.avgSpeed || '0.00km/h';
    const events = Array.isArray(record.quickEvents) ? record.quickEvents : [];
    const friendCount = countType(events,'friend_dog');
    const spotCount = countType(events,'spot');
    const photoCount = record.summary?.photoCount || 0;
    const audioCount = record.summary?.audioCount || 0;
    const noteCount = record.summary?.noteCount || 0;
    return `
      <section class="walk-result-card walk-result-hero">
        <div class="walk-result-kicker">WALK RESULT</div>
        <div class="walk-result-title">コタ散歩を保存しました</div>
        <div class="walk-result-sub">散歩結果はこの画面と「散歩履歴」から確認できます。</div>
      </section>
      <section class="walk-result-card">
        <div class="walk-result-grid">
          <div class="walk-result-mini"><div class="walk-result-label">散歩時間</div><div class="walk-result-value">${esc(time)}</div></div>
          <div class="walk-result-mini"><div class="walk-result-label">距離</div><div class="walk-result-value">${esc(distance)}</div></div>
          <div class="walk-result-mini"><div class="walk-result-label">平均速度</div><div class="walk-result-value">${esc(avg)}</div></div>
          <div class="walk-result-mini"><div class="walk-result-label">GPS</div><div class="walk-result-value">${validGpsCount(record)}件</div></div>
          <div class="walk-result-mini"><div class="walk-result-label">写真/音声/メモ</div><div class="walk-result-value">${photoCount}/${audioCount}/${noteCount}</div></div>
          <div class="walk-result-mini"><div class="walk-result-label">犬友/スポット</div><div class="walk-result-value">${friendCount}/${spotCount}</div></div>
        </div>
        <div class="walk-result-muted">保存日時：${esc(record.date || '')}</div>
      </section>
      <section class="walk-result-card walk-result-actions">
        <button class="walk-result-primary" onclick="showDetail && showDetail('${esc(record.id)}')">詳細を見る</button>
        <button class="walk-result-secondary" onclick="showWalkHistoryPage && showWalkHistoryPage()">散歩履歴を開く</button>
        <button class="walk-result-secondary" onclick="showOutbaseLifePageV208 ? showOutbaseLifePageV208('home') : showPage('homePage')">ホームへ戻る</button>
      </section>
    `;
  }

  function showResult(record){
    addStyle();
    const page = ensurePage();
    page.innerHTML = buildResultHtml(record);
    hideAllPages();
    page.classList.remove('hidden');
    try{ window.scrollTo({top:0,behavior:'smooth'}); }catch(error){ window.scrollTo(0,0); }
  }

  async function finishToResult(){
    if(finishing) return;
    finishing = true;
    try{
      if(typeof currentSession === 'undefined' || !currentSession){
        alert('進行中の散歩が見つかりません');
        return;
      }
      if(typeof updateWalkTimer === 'function') updateWalkTimer();
      if(typeof timerInterval !== 'undefined' && timerInterval) clearInterval(timerInterval);
      if(typeof stopAutoSave === 'function') stopAutoSave();
      if(typeof gpsWatcher !== 'undefined' && gpsWatcher) clearInterval(gpsWatcher);

      const gpsInfo = document.getElementById('gpsInfo');
      if(gpsInfo) gpsInfo.innerHTML = '終了GPS取得中...';

      const finalize = async gps => {
        try{
          endGps = gps || '未取得';
          if(typeof addGpsHistory === 'function') addGpsHistory('end', endGps);
          distanceKm = typeof calcTrackDistance === 'function' ? calcTrackDistance(gpsHistory) : (distanceKm || '0.00km');
          if(typeof updateWalkTimer === 'function') updateWalkTimer();
          const walkTime = typeof formatTime === 'function' ? formatTime(seconds || 0) : '00:00:00';
          const avgSpeed = typeof calcAverageSpeed === 'function' ? calcAverageSpeed(distanceKm, walkTime) : '0.00km/h';
          const inputTitle = typeof getInputValue === 'function' ? getInputValue('titleInput') : '';
          const inputTags = typeof parseTags === 'function' ? parseTags(getInputValue('tagInput')) : [];
          currentSession.endTime = new Date().toLocaleString();
          currentSession.status = EVENT_STATUS.CLOSED;
          const quickEvents = getQuickEvents();
          const record = {
            id:createId(),
            title:inputTitle || '散歩記録',
            tags:inputTags,
            recordType:'walk',
            session:currentSession,
            date:new Date().toLocaleString(),
            walk:{time:walkTime,distanceKm:distanceKm,avgSpeed:avgSpeed},
            gps:{start:startGps,end:endGps,history:gpsHistory},
            photos:photos,
            audio:audioRecords,
            notes:notes,
            quickEvents:quickEvents,
            behaviorEvents:quickEvents.filter(e=>['poop','pee','rest','carry','danger','heat','water','mood_good','mood_tired'].includes(e.type)),
            friendDogEvents:quickEvents.filter(e=>e.type === 'friend_dog'),
            spotEvents:quickEvents.filter(e=>e.type === 'spot'),
            summary:{
              photoCount:photos.length,
              audioCount:audioRecords.length,
              noteCount:notes.length,
              gpsPointCount:gpsHistory.length,
              validGpsPointCount:typeof getValidGpsCount === 'function' ? getValidGpsCount(gpsHistory) : gpsHistory.length,
              quickEventCount:quickEvents.length,
              friendDogCount:quickEvents.filter(e=>e.type === 'friend_dog').length,
              spotCount:quickEvents.filter(e=>e.type === 'spot').length
            }
          };
          await saveRecord(record);
          if(currentSession && currentSession.id && typeof deleteActiveSession === 'function') await deleteActiveSession(currentSession.id);
          if(typeof clearAppState === 'function') clearAppState();
          try{ sessionStorage.setItem('outbase_last_walk_result_id', record.id); }catch(error){}
          currentSession = null;
          photos = [];
          notes = [];
          audioRecords = [];
          gpsHistory = [];
          showResult(record);
        }catch(error){
          console.error(error);
          alert('保存に失敗しました');
        }finally{
          finishing = false;
        }
      };

      if(typeof getGps === 'function') getGps(finalize);
      else finalize('未取得');
    }catch(error){
      finishing = false;
      console.error(error);
      alert('散歩終了に失敗しました');
    }
  }

  function patchFinishWalk(){
    if(typeof window.finishWalk !== 'function' || window.finishWalk.__walkResultV208Patched) return;
    window.finishWalkOriginalV208 = window.finishWalk;
    window.finishWalk = finishToResult;
    window.finishWalk.__walkResultV208Patched = true;
  }

  function setup(){
    addStyle();
    ensurePage();
    patchFinishWalk();
  }

  window.finishOutbaseWalkToResultV208 = finishToResult;
  window.showOutbaseWalkResultV208 = showResult;
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();
  window.addEventListener('load',()=>setTimeout(setup,300));
  setInterval(patchFinishWalk, 1500);
})();
