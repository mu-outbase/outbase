/* =========================================================
   OUTBASE walkUsability.js
   UI v205: 散歩中UI整理
   - 散歩中に不要な管理導線は出さない
   - 散歩中に使う「記録する / 写真 / メモ / 終了」を上部に集約
   - 旧入力フォームは残したまま、画面上は折りたたんで現地操作を優先
   - walk.js / app.js 本体は触らない
========================================================= */
(function(){
  'use strict';

  const STYLE_ID = 'outbaseWalkUsabilityV205Style';
  const ACTION_ID = 'outbaseWalkActionsV205';

  function addStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #walkPage{
        background:linear-gradient(180deg,#f4f8f2 0%,#fbfaf5 100%);
        padding-bottom:104px;
      }
      #walkPage .card{
        border-radius:24px;
        border:1px solid rgba(31,111,58,.08);
        box-shadow:0 10px 24px rgba(20,81,45,.08);
      }
      #walkPage .walk-v205-hero{
        position:relative;
        overflow:hidden;
        padding-top:18px;
      }
      #walkPage .walk-v205-hero h1{
        display:flex;
        align-items:center;
        gap:8px;
        margin-bottom:8px;
      }
      #walkPage .walk-v205-hero h1:before{
        content:'🐕';
        font-size:24px;
      }
      #walkPage .walk-v205-hero .timer{
        font-size:44px;
        font-weight:850;
        letter-spacing:.03em;
        text-align:center;
        margin:12px 0;
      }
      #walkPage #gpsInfo{
        font-size:14px;
        line-height:1.5;
        color:#364237;
        word-break:break-word;
      }
      .walk-v205-actions{
        display:flex;
        flex-direction:column;
        gap:12px;
      }
      .walk-v205-head{
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:12px;
      }
      .walk-v205-title{
        font-size:20px;
        font-weight:850;
        color:#243127;
      }
      .walk-v205-note{
        font-size:12px;
        color:#6b766c;
        line-height:1.45;
      }
      .walk-v205-grid{
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:9px;
      }
      .walk-v205-main{
        width:100%;
        border:0 !important;
        border-radius:18px !important;
        min-height:58px !important;
        background:linear-gradient(180deg,#1f6f3a,#123d25) !important;
        color:white !important;
        font-size:17px !important;
        font-weight:850 !important;
        padding:12px 10px !important;
      }
      .walk-v205-btn{
        width:100%;
        border:1px solid #e5ebe4 !important;
        border-radius:18px !important;
        background:#fff !important;
        color:#123d25 !important;
        min-height:56px !important;
        font-size:14px !important;
        font-weight:850 !important;
        padding:10px 6px !important;
        box-shadow:none !important;
      }
      .walk-v205-end{
        width:100%;
        border:0 !important;
        border-radius:18px !important;
        background:#c62828 !important;
        color:#fff !important;
        min-height:56px !important;
        font-size:16px !important;
        font-weight:850 !important;
        padding:12px 8px !important;
        box-shadow:0 8px 18px rgba(198,40,40,.18) !important;
      }
      .walk-v205-legacy{
        display:none !important;
      }
      .walk-v205-quick-label{
        display:inline-flex;
        align-items:center;
        gap:6px;
        border-radius:999px;
        background:#edf6ee;
        color:#123d25;
        padding:6px 10px;
        font-size:12px;
        font-weight:850;
      }
      @media(max-width:520px){
        #walkPage{padding-left:14px;padding-right:14px;}
        #walkPage .walk-v205-hero .timer{font-size:40px;}
        .walk-v205-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;}
        .walk-v205-btn{font-size:13px;min-height:54px;}
      }
    `;
    document.head.appendChild(style);
  }

  function callIfExists(name){
    if(typeof window[name] === 'function'){
      return window[name]();
    }
    return null;
  }

  function openRecordInput(){
    if(typeof window.showAssetCapturePage === 'function'){
      window.showAssetCapturePage();
      return;
    }
    const details = document.querySelector('#assetM0WalkPanel details');
    if(details){
      details.open = true;
      details.scrollIntoView({behavior:'smooth', block:'center'});
      return;
    }
    alert('記録入力がまだ準備できていません');
  }

  function openCamera(){
    const camera = document.querySelector('#assetM0WalkPanel [data-asset-input="camera"]');
    if(camera){
      camera.click();
      return;
    }
    openRecordInput();
  }

  async function quickMemo(){
    const text = prompt('散歩メモを入力', '');
    if(!text) return;
    try{
      if(typeof window.saveAssetM0Memo === 'function'){
        await window.saveAssetM0Memo(text, {context:{targetType:'walk'}});
        if(typeof window.renderAssetM0Panels === 'function') window.renderAssetM0Panels();
        alert('散歩メモを保存しました');
        return;
      }
      const noteInput = document.getElementById('noteInput');
      if(noteInput){
        noteInput.value = text;
        if(typeof window.addNote === 'function') window.addNote();
        return;
      }
    }catch(error){
      console.error('散歩メモ保存失敗', error);
    }
    alert('メモ保存に失敗しました');
  }

  function finishWalkConfirm(){
    if(typeof window.finishWalk !== 'function'){
      alert('散歩終了機能が見つかりません');
      return;
    }
    if(confirm('散歩を終了して保存しますか？')){
      window.finishWalk();
    }
  }

  function makeActionsCard(){
    const card = document.createElement('div');
    card.id = ACTION_ID;
    card.className = 'card walk-v205-actions';
    card.innerHTML = `
      <div class="walk-v205-head">
        <div>
          <div class="walk-v205-title">散歩中に使う操作</div>
          <div class="walk-v205-note">管理ではなく、記録と終了だけをすぐ押せるようにする</div>
        </div>
        <div class="walk-v205-quick-label">現地用</div>
      </div>
      <button type="button" class="walk-v205-main" data-walk-v205-action="record">＋ 記録する</button>
      <div class="walk-v205-grid">
        <button type="button" class="walk-v205-btn" data-walk-v205-action="camera">📷 写真</button>
        <button type="button" class="walk-v205-btn" data-walk-v205-action="memo">📝 メモ</button>
        <button type="button" class="walk-v205-end" data-walk-v205-action="finish">散歩終了</button>
      </div>
    `;
    card.addEventListener('click', event => {
      const button = event.target.closest('[data-walk-v205-action]');
      if(!button) return;
      const action = button.getAttribute('data-walk-v205-action');
      if(action === 'record') openRecordInput();
      if(action === 'camera') openCamera();
      if(action === 'memo') quickMemo();
      if(action === 'finish') finishWalkConfirm();
    });
    return card;
  }

  function hideLegacyCards(page){
    const cards = Array.from(page.querySelectorAll(':scope > .card'));
    cards.forEach(card => {
      if(card.id === ACTION_ID) return;
      if(card.querySelector('#titleInput') ||
         card.querySelector('#photoInput') ||
         card.querySelector('#audioInfo') ||
         card.querySelector('#noteInput')){
        card.classList.add('walk-v205-legacy');
      }
      const finishButton = Array.from(card.querySelectorAll('button')).find(btn => {
        return String(btn.getAttribute('onclick') || '').includes('finishWalk');
      });
      if(finishButton && !card.querySelector('#timer')){
        card.classList.add('walk-v205-legacy');
      }
    });
  }

  function apply(){
    addStyle();
    const page = document.getElementById('walkPage');
    if(!page) return;

    const cards = Array.from(page.querySelectorAll(':scope > .card'));
    const firstCard = cards[0];
    if(firstCard) firstCard.classList.add('walk-v205-hero');

    let actions = document.getElementById(ACTION_ID);
    if(!actions && firstCard){
      actions = makeActionsCard();
      firstCard.insertAdjacentElement('afterend', actions);
    }

    hideLegacyCards(page);
  }

  function patchStartWalk(){
    if(typeof window.startWalk !== 'function' || window.startWalk.__walkV205Patched) return;
    const original = window.startWalk;
    window.startWalk = function(){
      const result = original.apply(this, arguments);
      setTimeout(apply, 80);
      setTimeout(apply, 500);
      return result;
    };
    window.startWalk.__walkV205Patched = true;
  }

  function setup(){
    apply();
    patchStartWalk();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', setup);
  }else{
    setup();
  }
  window.addEventListener('load', () => {
    setTimeout(setup, 300);
    setTimeout(setup, 1200);
  });
  setInterval(apply, 1500);

  window.applyOutbaseWalkUsabilityV205 = apply;
})();
