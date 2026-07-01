/* =========================================================
   OUTBASE walkUsability.js
   UI v206: 散歩実用UI再設計
   - 散歩中は 写真 / 長押し音声 / 犬友 / スポット / 終了 に絞る
   - うんち/おしっこ等は詳細記録へ隠す
   - 取込/更新/文字を追加は散歩中から見せない
   - 復旧時は散歩なら必ず walkPage へ戻す
   - walk.js / app.js / style.css 本体は触らない
========================================================= */
(function(){
  'use strict';

  const STYLE_ID = 'outbaseWalkUsabilityV206Style';
  const ACTION_ID = 'outbaseWalkPracticalV206';
  const RECOVERY_STYLE_ID = 'outbaseRecoveryV206Style';
  let voiceDown = false;
  let voiceStartedAt = 0;
  let patchDone = false;

  function addStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #walkPage{background:linear-gradient(180deg,#f4f8f2 0%,#fbfaf5 100%);padding-bottom:104px;}
      #walkPage>.card{border-radius:24px;border:1px solid rgba(31,111,58,.08);box-shadow:0 10px 24px rgba(20,81,45,.08);}
      #walkPage .walk-v206-hero{position:relative;overflow:hidden;padding-top:18px;}
      #walkPage .walk-v206-hero h1{display:flex;align-items:center;gap:8px;margin-bottom:8px;}
      #walkPage .walk-v206-hero h1:before{content:'🐕';font-size:24px;}
      #walkPage .walk-v206-hero .timer{font-size:44px;font-weight:850;letter-spacing:.03em;text-align:center;margin:12px 0;}
      #walkPage #gpsInfo{font-size:14px;line-height:1.5;color:#364237;word-break:break-word;}
      .walk-v206-card{display:flex;flex-direction:column;gap:12px;}
      .walk-v206-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;}
      .walk-v206-title{font-size:20px;font-weight:850;color:#243127;line-height:1.25;}
      .walk-v206-note{font-size:12px;color:#6b766c;line-height:1.45;margin-top:3px;}
      .walk-v206-pill{display:inline-flex;align-items:center;gap:6px;border-radius:999px;background:#edf6ee;color:#123d25;padding:6px 10px;font-size:12px;font-weight:850;white-space:nowrap;}
      .walk-v206-main-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;}
      .walk-v206-btn{width:100%;border:1px solid #e5ebe4!important;border-radius:18px!important;background:#fff!important;color:#123d25!important;min-height:64px!important;font-size:15px!important;font-weight:850!important;padding:10px 6px!important;box-shadow:none!important;}
      .walk-v206-btn span{display:block;font-size:24px;margin-bottom:4px;}
      .walk-v206-voice{background:linear-gradient(180deg,#1f6f3a,#123d25)!important;color:#fff!important;border:0!important;touch-action:none;user-select:none;-webkit-user-select:none;}
      .walk-v206-voice.is-recording{background:linear-gradient(180deg,#c62828,#8f1d1d)!important;box-shadow:0 10px 22px rgba(198,40,40,.22)!important;}
      .walk-v206-end{background:#c62828!important;color:#fff!important;border:0!important;box-shadow:0 8px 18px rgba(198,40,40,.18)!important;}
      .walk-v206-detail{border:1px solid #e5ebe4;border-radius:18px;background:#fff;padding:10px 12px;}
      .walk-v206-detail summary{font-weight:850;color:#123d25;cursor:pointer;list-style:none;}
      .walk-v206-detail summary::-webkit-details-marker{display:none;}
      .walk-v206-detail-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px;}
      .walk-v206-mini{border:1px solid #e5ebe4!important;border-radius:14px!important;background:#fff!important;color:#123d25!important;min-height:48px!important;font-size:13px!important;font-weight:850!important;padding:8px 4px!important;box-shadow:none!important;}
      .walk-v206-status{font-size:12px;color:#6b766c;line-height:1.5;min-height:18px;}
      .walk-v206-hide{display:none!important;}
      .walk-v206-recent{border-top:1px solid #e5ebe4;margin-top:4px;padding-top:10px;}
      .walk-v206-recent-title{font-size:13px;font-weight:850;color:#243127;margin-bottom:6px;}
      .walk-v206-recent-list{font-size:12px;color:#6b766c;line-height:1.55;}
      @media(max-width:520px){
        #walkPage{padding-left:14px;padding-right:14px;}
        #walkPage .walk-v206-hero .timer{font-size:40px;}
        .walk-v206-main-grid{gap:8px;}
        .walk-v206-btn{font-size:14px!important;min-height:62px!important;}
        .walk-v206-detail-grid{grid-template-columns:repeat(2,minmax(0,1fr));}
      }
    `;
    document.head.appendChild(style);
  }

  function addRecoveryStyle(){
    if(document.getElementById(RECOVERY_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = RECOVERY_STYLE_ID;
    style.textContent = `
      #recoveryModal .recovery-card{border-radius:24px!important;padding:20px!important;}
      #recoveryModal .recovery-card h1{font-size:24px!important;line-height:1.3!important;margin-bottom:14px!important;}
      #recoveryModal #recoveryInfo{line-height:1.7!important;}
      #recoveryModal button{border-radius:16px!important;min-height:52px!important;font-weight:850!important;}
    `;
    document.head.appendChild(style);
  }

  function getWalkPage(){ return document.getElementById('walkPage'); }

  function getCurrentEvents(){
    try{
      const api = window.OUTBASE_WALK_C2 && window.OUTBASE_WALK_C2.events;
      if(api && typeof api.getCurrentEvents === 'function') return api.getCurrentEvents() || [];
    }catch(error){ console.warn('v206 event read skip', error); }
    return [];
  }

  async function addWalkEvent(type,label,note){
    if(typeof window.addWalkC2Event === 'function'){
      await window.addWalkC2Event(type,label,note);
      refresh();
      return;
    }
    alert('散歩イベント記録がまだ準備できていません');
  }

  function latestEventsHtml(){
    const list = getCurrentEvents().slice().reverse().slice(0,3);
    if(!list.length) return '<div class="walk-v206-recent-list">まだ記録なし</div>';
    const html = list.map(event=>{
      const text = String(event.note || event.label || '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
      const time = String(event.time || '').split(' ')[1] || '';
      return `・${text}${time ? ' <span style="color:#9aa39a">' + time + '</span>' : ''}`;
    }).join('<br>');
    return `<div class="walk-v206-recent-list">${html}</div>`;
  }

  function openCamera(){
    const camera = document.querySelector('#assetM0WalkPanel [data-asset-input="camera"]') ||
      document.querySelector('#walkPage input[type="file"][accept*="image"]');
    if(camera){ camera.click(); return; }
    alert('写真入力がまだ準備できていません');
  }

  function quickMemo(){
    const text = prompt('散歩メモを入力', '');
    if(!text) return;
    saveTextMemo(text);
  }

  async function saveTextMemo(text){
    try{
      if(typeof window.saveAssetM0Memo === 'function'){
        await window.saveAssetM0Memo(text,{context:{targetType:'walk'}});
        if(typeof window.renderAssetM0Panels === 'function') window.renderAssetM0Panels();
        setStatus('メモを保存しました');
        return;
      }
      const noteInput = document.getElementById('noteInput');
      if(noteInput && typeof window.addNote === 'function'){
        noteInput.value = text;
        window.addNote();
        setStatus('メモを保存しました');
        return;
      }
    }catch(error){ console.error('v206 memo save failed', error); }
    alert('メモ保存に失敗しました');
  }

  function setStatus(text){
    const el = document.getElementById('walkV206Status');
    if(el) el.textContent = text || '';
  }

  async function startVoice(){
    if(voiceDown) return;
    voiceDown = true;
    voiceStartedAt = Date.now();
    const btn = document.querySelector('[data-walk-v206-action="voice"]');
    if(btn) btn.classList.add('is-recording');
    setStatus('録音中。離すと保存します。');
    try{
      if(typeof window.startAssetM0Audio === 'function'){
        await window.startAssetM0Audio();
        return;
      }
      if(typeof window.startRecording === 'function'){
        window.startRecording();
        return;
      }
      setStatus('音声メモがまだ準備できていません');
    }catch(error){
      console.error('v206 voice start failed', error);
      setStatus('音声メモを開始できませんでした');
    }
  }

  async function stopVoice(){
    if(!voiceDown) return;
    voiceDown = false;
    const btn = document.querySelector('[data-walk-v206-action="voice"]');
    if(btn) btn.classList.remove('is-recording');
    const elapsed = Date.now() - voiceStartedAt;
    if(elapsed < 350){
      setStatus('音声メモは長押しで使います');
      return;
    }
    setStatus('音声メモを保存中...');
    try{
      if(typeof window.stopAssetM0Audio === 'function'){
        await window.stopAssetM0Audio();
        setStatus('音声メモを保存しました');
        return;
      }
      if(typeof window.stopRecording === 'function'){
        window.stopRecording();
        setStatus('音声メモを保存しました');
        return;
      }
    }catch(error){ console.error('v206 voice stop failed', error); }
    setStatus('音声メモ保存に失敗しました');
  }

  function finishWalkConfirm(){
    if(typeof window.finishWalk !== 'function'){
      alert('散歩終了機能が見つかりません');
      return;
    }
    if(confirm('散歩を終了して保存しますか？')) window.finishWalk();
  }

  function makeCard(){
    const card = document.createElement('div');
    card.id = ACTION_ID;
    card.className = 'card walk-v206-card';
    card.innerHTML = `
      <div class="walk-v206-head">
        <div>
          <div class="walk-v206-title">散歩で使うものだけ</div>
          <div class="walk-v206-note">うんち/おしっこは普段出さず、必要な時だけ詳細から記録。</div>
        </div>
        <div class="walk-v206-pill">現地用</div>
      </div>
      <div class="walk-v206-main-grid">
        <button type="button" class="walk-v206-btn" data-walk-v206-action="camera"><span>📷</span>写真</button>
        <button type="button" class="walk-v206-btn walk-v206-voice" data-walk-v206-action="voice"><span>🎤</span>長押し音声</button>
        <button type="button" class="walk-v206-btn" data-walk-v206-action="friend"><span>🐶</span>犬友</button>
        <button type="button" class="walk-v206-btn" data-walk-v206-action="spot"><span>📍</span>スポット</button>
      </div>
      <button type="button" class="walk-v206-btn walk-v206-end" data-walk-v206-action="finish"><span>■</span>散歩終了</button>
      <details class="walk-v206-detail">
        <summary>詳しい記録を開く</summary>
        <div class="walk-v206-detail-grid">
          <button type="button" class="walk-v206-mini" data-walk-v206-action="poop">💩 うんち</button>
          <button type="button" class="walk-v206-mini" data-walk-v206-action="pee">💧 おしっこ</button>
          <button type="button" class="walk-v206-mini" data-walk-v206-action="rest">休憩</button>
          <button type="button" class="walk-v206-mini" data-walk-v206-action="carry">抱っこ</button>
          <button type="button" class="walk-v206-mini" data-walk-v206-action="danger">⚠️ 危険</button>
          <button type="button" class="walk-v206-mini" data-walk-v206-action="memo">メモ</button>
        </div>
      </details>
      <div id="walkV206Status" class="walk-v206-status">音声は長押し、離すと保存。</div>
      <div class="walk-v206-recent"><div class="walk-v206-recent-title">最近の記録</div><div id="walkV206Recent">${latestEventsHtml()}</div></div>
    `;
    bindCard(card);
    return card;
  }

  function bindCard(card){
    card.addEventListener('click', async event=>{
      const button = event.target.closest('[data-walk-v206-action]');
      if(!button) return;
      const action = button.getAttribute('data-walk-v206-action');
      if(action === 'voice') return;
      if(action === 'camera') openCamera();
      if(action === 'friend') await addWalkEvent('friend_dog','🐶 犬友達');
      if(action === 'spot') await addWalkEvent('spot','📍 スポット');
      if(action === 'finish') finishWalkConfirm();
      if(action === 'poop') await addWalkEvent('poop','💩 うんち','うんち');
      if(action === 'pee') await addWalkEvent('pee','💧 おしっこ','おしっこ');
      if(action === 'rest') await addWalkEvent('rest','休憩','休憩');
      if(action === 'carry') await addWalkEvent('carry','抱っこ','抱っこ');
      if(action === 'danger') await addWalkEvent('danger','⚠️ 危険');
      if(action === 'memo') quickMemo();
    });
    const voice = card.querySelector('[data-walk-v206-action="voice"]');
    if(voice){
      voice.addEventListener('pointerdown', event=>{ event.preventDefault(); startVoice(); });
      voice.addEventListener('pointerup', event=>{ event.preventDefault(); stopVoice(); });
      voice.addEventListener('pointercancel', stopVoice);
      voice.addEventListener('pointerleave', ()=>{ if(voiceDown) stopVoice(); });
      voice.addEventListener('contextmenu', event=>event.preventDefault());
    }
  }

  function hideCardByMatchers(page, matchers){
    Array.from(page.querySelectorAll(':scope > .card')).forEach(card=>{
      if(card.id === ACTION_ID) return;
      if(matchers.some(fn=>fn(card))) card.classList.add('walk-v206-hide');
    });
  }

  function hideOldUi(page){
    const bySelector = selector => card => Boolean(card.querySelector(selector));
    hideCardByMatchers(page,[
      card => card.id === 'assetM0WalkPanel',
      card => card.id === 'walkC2Panel',
      card => card.id === 'walkQuickPanel',
      bySelector('#titleInput'),
      bySelector('#photoInput'),
      bySelector('#audioInfo'),
      bySelector('#noteInput'),
      card => Array.from(card.querySelectorAll('button')).some(btn=>String(btn.getAttribute('onclick') || '').includes('finishWalk')) && !card.querySelector('#timer')
    ]);
  }

  function refreshRecent(){
    const recent = document.getElementById('walkV206Recent');
    if(recent) recent.innerHTML = latestEventsHtml();
  }

  function apply(){
    addStyle();
    addRecoveryStyle();
    const page = getWalkPage();
    if(!page) return;
    const firstCard = page.querySelector(':scope > .card');
    if(firstCard) firstCard.classList.add('walk-v206-hero');

    let card = document.getElementById(ACTION_ID);
    if(!card) card = makeCard();
    if(firstCard && firstCard.nextSibling !== card){
      firstCard.insertAdjacentElement('afterend', card);
    }
    hideOldUi(page);
    refreshRecent();
    polishRecoveryModal();
  }

  function patchStartWalk(){
    if(typeof window.startWalk !== 'function' || window.startWalk.__walkV206Patched) return;
    const original = window.startWalk;
    window.startWalk = function(){
      const result = original.apply(this, arguments);
      setTimeout(apply,80);
      setTimeout(apply,350);
      setTimeout(apply,900);
      return result;
    };
    window.startWalk.__walkV206Patched = true;
  }

  function patchRecovery(){
    if(typeof window.restorePendingSession === 'function' && !window.restorePendingSession.__walkV206Patched){
      const originalRestore = window.restorePendingSession;
      window.restorePendingSession = async function(){
        const result = await originalRestore.apply(this, arguments);
        setTimeout(()=>{
          try{
            if(window.currentSession && (window.currentSession.type === 'walk' || window.currentSession.eventType === 'walk')){
              if(typeof window.showPage === 'function') window.showPage('walkPage');
              apply();
            }
          }catch(error){ console.warn('v206 restore force skip', error); }
        },220);
        setTimeout(apply,600);
        return result;
      };
      window.restorePendingSession.__walkV206Patched = true;
    }
  }

  function polishRecoveryModal(){
    const modal = document.getElementById('recoveryModal');
    if(!modal || modal.classList.contains('hidden')) return;
    const h1 = modal.querySelector('h1');
    if(h1) h1.textContent = '未終了の散歩があります';
    const restore = modal.querySelector('button[onclick="restorePendingSession()"]');
    if(restore) restore.textContent = '散歩に戻る';
    const finish = document.getElementById('finishRecoveryButton');
    if(finish) finish.textContent = '終了して保存';
  }

  function setup(){
    addStyle();
    addRecoveryStyle();
    patchStartWalk();
    patchRecovery();
    apply();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();
  window.addEventListener('load',()=>{ setTimeout(setup,300); setTimeout(apply,1000); });
  setInterval(()=>{ patchStartWalk(); patchRecovery(); apply(); },1300);

  window.applyOutbaseWalkUsabilityV206 = apply;
})();
