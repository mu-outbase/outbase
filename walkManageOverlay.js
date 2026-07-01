/* =========================================================
   OUTBASE walkManageOverlay.js
   UI v203: 散歩中 管理ボタン位置修正
   - 固定バー表示をやめる
   - walkPage の最上段カード右上に小さい管理ボタンを差し込む
   - グローバル button CSS の width:100% 影響を !important で遮断
========================================================= */
(function(){
  'use strict';

  const STYLE_ID = 'outbaseWalkManageV203Style';
  const BUTTON_ID = 'outbaseWalkManageButtonV203';
  const SHEET_ID = 'outbaseWalkManageSheetV203';

  function addStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #walkPage .card.walk-manage-host-v203{
        position:relative !important;
        padding-top:58px !important;
      }
      #${BUTTON_ID}{
        position:absolute !important;
        right:14px !important;
        top:14px !important;
        left:auto !important;
        bottom:auto !important;
        z-index:5 !important;
        display:inline-flex !important;
        align-items:center !important;
        justify-content:center !important;
        width:auto !important;
        max-width:88px !important;
        min-width:64px !important;
        height:34px !important;
        min-height:34px !important;
        margin:0 !important;
        padding:6px 12px !important;
        border:1px solid rgba(31,111,58,.18) !important;
        border-radius:999px !important;
        background:rgba(255,255,255,.96) !important;
        color:#123d25 !important;
        font-size:13px !important;
        line-height:1 !important;
        font-weight:850 !important;
        box-shadow:0 6px 14px rgba(20,81,45,.14) !important;
        text-align:center !important;
        white-space:nowrap !important;
        box-sizing:border-box !important;
      }
      .walk-manage-sheet-v203{
        position:fixed;
        inset:0;
        z-index:9999;
        display:flex;
        align-items:flex-end;
        justify-content:center;
        padding:16px;
        background:rgba(15,23,42,.56);
      }
      .walk-manage-card-v203{
        width:min(680px,100%);
        background:#fff;
        border-radius:24px;
        padding:16px;
        box-shadow:0 20px 40px rgba(0,0,0,.2);
      }
      .walk-manage-head-v203{
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:12px;
        margin-bottom:12px;
        font-weight:850;
        color:#243127;
      }
      .walk-manage-close-v203{
        border:0 !important;
        border-radius:14px !important;
        background:#b91c1c !important;
        color:#fff !important;
        padding:9px 12px !important;
        min-height:40px !important;
        font-weight:850 !important;
        width:auto !important;
      }
      .walk-manage-list-v203{
        display:flex;
        flex-direction:column;
        gap:10px;
      }
      .walk-manage-list-v203 button{
        width:100% !important;
        border:1px solid #e5ebe4 !important;
        border-radius:16px !important;
        background:#fff !important;
        color:#123d25 !important;
        padding:12px 10px !important;
        min-height:48px !important;
        font-size:14px !important;
        font-weight:850 !important;
      }
    `;
    document.head.appendChild(style);
  }

  function walkPage(){
    return document.getElementById('walkPage');
  }

  function isWalkVisible(){
    const page = walkPage();
    return Boolean(page && !page.classList.contains('hidden'));
  }

  function getWalkHostCard(){
    const page = walkPage();
    if(!page) return null;
    return page.querySelector('.card');
  }

  function removeButton(){
    const old = document.getElementById(BUTTON_ID);
    if(old) old.remove();
    const host = document.querySelector('.walk-manage-host-v203');
    if(host) host.classList.remove('walk-manage-host-v203');
  }

  function ensureButtonInWalkCard(){
    addStyle();
    const host = getWalkHostCard();
    if(!host) return null;
    host.classList.add('walk-manage-host-v203');

    let btn = document.getElementById(BUTTON_ID);
    if(!btn){
      btn = document.createElement('button');
      btn.id = BUTTON_ID;
      btn.type = 'button';
      btn.textContent = '管理';
      btn.onclick = openManage;
    }
    if(btn.parentElement !== host) host.appendChild(btn);
    return btn;
  }

  function sync(){
    if(isWalkVisible()) ensureButtonInWalkCard();
    else removeButton();
  }

  function closeManage(){
    const old = document.getElementById(SHEET_ID);
    if(old) old.remove();
    setTimeout(sync,50);
  }

  function openManage(){
    const old = document.getElementById(SHEET_ID);
    if(old) old.remove();
    const sheet = document.createElement('div');
    sheet.id = SHEET_ID;
    sheet.className = 'walk-manage-sheet-v203';
    sheet.onclick = event => { if(event.target === sheet) closeManage(); };
    sheet.innerHTML = `
      <div class="walk-manage-card-v203">
        <div class="walk-manage-head-v203">
          <div>管理メニュー</div>
          <button class="walk-manage-close-v203" onclick="closeOutbaseWalkManageV203()">閉じる</button>
        </div>
        <div class="walk-manage-list-v203">
          <button onclick="showGearPage && showGearPage()">ギア管理</button>
          <button onclick="showCampgroundPage && showCampgroundPage()">キャンプ場管理</button>
          <button onclick="showCampRecordPage && showCampRecordPage()">キャンプ実績</button>
          <button onclick="showWalkHistoryPage && showWalkHistoryPage()">散歩履歴</button>
        </div>
      </div>`;
    document.body.appendChild(sheet);
  }

  function patchEntrances(){
    if(typeof window.startWalk === 'function' && !window.startWalk.__walkManageV203Patched){
      const original = window.startWalk;
      window.startWalk = function(){
        const result = original.apply(this, arguments);
        setTimeout(sync,50);
        setTimeout(sync,300);
        setTimeout(sync,900);
        return result;
      };
      window.startWalk.__walkManageV203Patched = true;
    }
    if(typeof window.showPage === 'function' && !window.showPage.__walkManageV203Patched){
      const originalShowPage = window.showPage;
      window.showPage = function(){
        const result = originalShowPage.apply(this, arguments);
        setTimeout(sync,50);
        setTimeout(sync,250);
        return result;
      };
      window.showPage.__walkManageV203Patched = true;
    }
    if(typeof window.backToHome === 'function' && !window.backToHome.__walkManageV203Patched){
      const originalBack = window.backToHome;
      window.backToHome = function(){
        const result = originalBack.apply(this, arguments);
        setTimeout(sync,50);
        return result;
      };
      window.backToHome.__walkManageV203Patched = true;
    }
  }

  function setup(){
    addStyle();
    patchEntrances();
    sync();
    if(!document.body.__walkManageV203Observed){
      const observer = new MutationObserver(()=>setTimeout(sync,30));
      observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
      document.body.__walkManageV203Observed = true;
    }
    setInterval(sync,1000);
  }

  window.syncOutbaseWalkManageV203 = sync;
  window.closeOutbaseWalkManageV203 = closeManage;
  window.showOutbaseWalkManageV203 = openManage;

  if(document.readyState === 'loading') window.addEventListener('DOMContentLoaded',setup);
  else setup();
  window.addEventListener('load',()=>{ setTimeout(setup,300); setTimeout(sync,1200); });
})();
