/* =========================================================
   OUTBASE walkManageOverlay.js
   UI v202: 散歩中 管理ボタン確実表示
   - walkPage表示中だけ固定の管理ボタンを出す
   - lifeOS本体やwalk.jsに依存しすぎない独立レイヤー
========================================================= */
(function(){
  'use strict';

  const STYLE_ID = 'outbaseWalkManageV202Style';
  const BUTTON_ID = 'outbaseWalkManageButtonV202';
  const SHEET_ID = 'outbaseWalkManageSheetV202';

  function addStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${BUTTON_ID}{
        position:fixed;
        right:16px;
        top:112px;
        z-index:1200;
        display:none;
        align-items:center;
        justify-content:center;
        gap:4px;
        min-width:74px;
        min-height:38px;
        padding:8px 14px;
        border:1px solid rgba(31,111,58,.18);
        border-radius:999px;
        background:rgba(255,255,255,.97);
        color:#123d25;
        font-size:13px;
        font-weight:850;
        box-shadow:0 8px 18px rgba(20,81,45,.16);
        backdrop-filter:blur(8px);
      }
      #${BUTTON_ID}.is-visible{display:flex;}
      .walk-manage-sheet-v202{
        position:fixed;
        inset:0;
        z-index:9999;
        display:flex;
        align-items:flex-end;
        justify-content:center;
        padding:16px;
        background:rgba(15,23,42,.56);
      }
      .walk-manage-card-v202{
        width:min(680px,100%);
        background:#fff;
        border-radius:24px;
        padding:16px;
        box-shadow:0 20px 40px rgba(0,0,0,.2);
      }
      .walk-manage-head-v202{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px;font-weight:850;color:#243127;}
      .walk-manage-close-v202{border:0;border-radius:14px;background:#b91c1c;color:#fff;padding:9px 12px;font-weight:850;}
      .walk-manage-list-v202{display:flex;flex-direction:column;gap:10px;}
      .walk-manage-list-v202 button{width:100%;border:1px solid #e5ebe4;border-radius:16px;background:#fff;color:#123d25;padding:12px 10px;min-height:48px;font-size:14px;font-weight:850;}
      @media(max-width:520px){#${BUTTON_ID}{right:14px;top:106px;min-height:36px;padding:7px 12px;}}
    `;
    document.head.appendChild(style);
  }

  function ensureButton(){
    addStyle();
    let btn = document.getElementById(BUTTON_ID);
    if(btn) return btn;
    btn = document.createElement('button');
    btn.id = BUTTON_ID;
    btn.type = 'button';
    btn.textContent = '管理';
    btn.onclick = openManage;
    document.body.appendChild(btn);
    return btn;
  }

  function isWalkVisible(){
    const page = document.getElementById('walkPage');
    return Boolean(page && !page.classList.contains('hidden'));
  }

  function sync(){
    const btn = ensureButton();
    btn.classList.toggle('is-visible', isWalkVisible());
  }

  function closeManage(){
    const old = document.getElementById(SHEET_ID);
    if(old) old.remove();
    setTimeout(sync,50);
  }

  function fallbackManage(){
    const old = document.getElementById(SHEET_ID);
    if(old) old.remove();
    const sheet = document.createElement('div');
    sheet.id = SHEET_ID;
    sheet.className = 'walk-manage-sheet-v202';
    sheet.onclick = event => { if(event.target === sheet) closeManage(); };
    sheet.innerHTML = `
      <div class="walk-manage-card-v202">
        <div class="walk-manage-head-v202">
          <div>管理メニュー</div>
          <button class="walk-manage-close-v202" onclick="closeOutbaseWalkManageV202()">閉じる</button>
        </div>
        <div class="walk-manage-list-v202">
          <button onclick="showGearPage && showGearPage()">ギア管理</button>
          <button onclick="showCampgroundPage && showCampgroundPage()">キャンプ場管理</button>
          <button onclick="showCampRecordPage && showCampRecordPage()">キャンプ実績</button>
          <button onclick="showWalkHistoryPage && showWalkHistoryPage()">散歩履歴</button>
        </div>
      </div>`;
    document.body.appendChild(sheet);
  }

  function openManage(){
    if(typeof window.showOutbaseManageMenuV202 === 'function'){
      window.showOutbaseManageMenuV202();
      setTimeout(sync,50);
      return;
    }
    if(typeof window.showOutbaseManageMenu === 'function'){
      window.showOutbaseManageMenu();
      setTimeout(sync,50);
      return;
    }
    fallbackManage();
  }

  function patchEntrances(){
    if(typeof window.startWalk === 'function' && !window.startWalk.__walkManageV202Patched){
      const original = window.startWalk;
      window.startWalk = function(){
        const result = original.apply(this, arguments);
        setTimeout(sync,50);
        setTimeout(sync,300);
        setTimeout(sync,900);
        return result;
      };
      window.startWalk.__walkManageV202Patched = true;
    }
    if(typeof window.showPage === 'function' && !window.showPage.__walkManageV202Patched){
      const originalShowPage = window.showPage;
      window.showPage = function(){
        const result = originalShowPage.apply(this, arguments);
        setTimeout(sync,50);
        setTimeout(sync,250);
        return result;
      };
      window.showPage.__walkManageV202Patched = true;
    }
  }

  function setup(){
    ensureButton();
    patchEntrances();
    sync();
    if(!document.body.__walkManageV202Observed){
      const observer = new MutationObserver(sync);
      observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
      document.body.__walkManageV202Observed = true;
    }
    setInterval(sync,800);
  }

  window.syncOutbaseWalkManageV202 = sync;
  window.closeOutbaseWalkManageV202 = closeManage;
  window.showOutbaseWalkManageV202 = openManage;

  if(document.readyState === 'loading') window.addEventListener('DOMContentLoaded',setup);
  else setup();
  window.addEventListener('load',()=>{ setTimeout(setup,300); setTimeout(sync,1200); });
})();
