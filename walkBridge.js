/* =========================================================
   OUTBASE walkBridge.js
   Phase C-2 v170: 散歩実用化 Bridge
   - Core / Events / UI / Review / History を接続
   - 既存本体は触らず、起動後に安全にパッチ
========================================================= */
(function(){
  "use strict";

  function getC2(){
    return window.OUTBASE_WALK_C2 || {};
  }

  function renderAll(){
    const C2 = getC2();
    if(C2.ui && C2.ui.renderPanel) C2.ui.renderPanel();
    if(C2.history && C2.history.renderHomeReview) C2.history.renderHomeReview();
    if(typeof window.renderWalkQuickPanel === "function"){
      const old = document.getElementById("walkQuickPanel");
      if(old) old.style.display = "none";
    }
  }

  function patchStartWalk(){
    if(typeof window.startWalk !== "function" || window.startWalk.__phaseC2BridgePatched) return;
    const original = window.startWalk;
    window.startWalk = function(){
      const result = original.apply(this,arguments);
      setTimeout(renderAll,500);
      setTimeout(renderAll,1000);
      return result;
    };
    window.startWalk.__phaseC2BridgePatched = true;
  }

  function patchRestoreWalk(){
    if(typeof window.restoreWalkSession !== "function" || window.restoreWalkSession.__phaseC2BridgePatched) return;
    const original = window.restoreWalkSession;
    window.restoreWalkSession = function(entry){
      const result = original.apply(this,arguments);
      setTimeout(renderAll,500);
      setTimeout(renderAll,1000);
      return result;
    };
    window.restoreWalkSession.__phaseC2BridgePatched = true;
  }

  function setup(){
    const C2 = getC2();
    if(C2.review && C2.review.patchSaveRecord) C2.review.patchSaveRecord();
    if(C2.history && C2.history.patchHistory) C2.history.patchHistory();
    patchStartWalk();
    patchRestoreWalk();
    renderAll();
  }

  window.setupWalkC2 = setup;
  window.addEventListener("load",()=>{
    setTimeout(setup,1200);
  });
})();
