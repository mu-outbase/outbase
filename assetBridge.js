/* =========================================================
   OUTBASE assetBridge.js
   M0 v178: 既存画面との接続
   - startWalk / continueCampStart / backToHome 後に入力パネル再描画
========================================================= */
(function(){
  "use strict";

  function renderLater(){
    if(typeof window.renderAssetM0Panels !== "function") return;
    setTimeout(window.renderAssetM0Panels,400);
    setTimeout(window.renderAssetM0Panels,1000);
  }

  function patchFunction(name,flag){
    if(typeof window[name] !== "function" || window[name][flag]) return;
    const original = window[name];
    window[name] = function(){
      const result = original.apply(this,arguments);
      renderLater();
      return result;
    };
    window[name][flag] = true;
  }

  function patchSaveRecord(){
    if(typeof window.saveRecord !== "function" || window.saveRecord.__assetM0Patched) return;
    const original = window.saveRecord;
    window.saveRecord = async function(record){
      if(record && ["walk","camp"].includes(record.recordType)){
        const M0 = window.OUTBASE_ASSET_M0 || {};
        const store = M0.store || {};
        const core = M0.core || {};
        const targetId = record.session?.id || record.id || "";
        const assets = store.getAssetsForContext && targetId
          ? await store.getAssetsForContext(record.recordType,targetId)
          : [];
        const summary = core.buildAssetSummary ? core.buildAssetSummary(assets) : {total:assets.length};
        record.assets = assets;
        record.assetSummary = summary;
        record.summary = {
          ...(record.summary || {}),
          assetCount:summary.total || 0,
          assetPhotoCount:summary.photo || 0,
          assetVideoCount:summary.video || 0,
          assetAudioCount:summary.audio || 0,
          assetMemoCount:summary.memo || 0
        };
      }
      return original.call(this,record);
    };
    window.saveRecord.__assetM0Patched = true;
  }

  function setup(){
    patchFunction("startWalk","__assetM0Patched");
    patchFunction("restoreWalkSession","__assetM0Patched");
    patchFunction("continueCampStart","__assetM0Patched");
    patchFunction("restoreCampSession","__assetM0Patched");
    patchFunction("backToHome","__assetM0Patched");
    patchSaveRecord();
    renderLater();
  }

  window.setupAssetM0 = setup;
  window.addEventListener("load",()=>setTimeout(setup,1500));
})();
