/* =========================================================
   OUTBASE assetBridge.js
   M0 v183: 既存画面との接続 修正版
   - startWalk / camp / home 後に入力パネル再描画
   - saveRecord時にassetを既存写真/音声/メモへ変換して詳細でも見えるようにする
========================================================= */
(function(){
  "use strict";

  function renderLater(){
    if(typeof window.renderAssetM0Panels !== "function") return;
    setTimeout(window.renderAssetM0Panels,250);
    setTimeout(window.renderAssetM0Panels,800);
    setTimeout(window.renderAssetM0Panels,1500);
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

  function uniqueByAssetId(list){
    const seen = new Set();
    return (Array.isArray(list) ? list : []).filter(item=>{
      const key = item.sourceAssetId || item.id || JSON.stringify(item);
      if(seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function assetToPhoto(asset){
    return {
      id:asset.id,
      sourceAssetId:asset.id,
      name:asset.name || asset.title || "photo",
      type:asset.mimeType || "image/*",
      data:asset.dataUrl || "",
      time:asset.createdText || "",
      created_at:asset.createdAt || "",
      title:asset.title || ""
    };
  }

  function assetToAudio(asset){
    return {
      id:asset.id,
      sourceAssetId:asset.id,
      name:asset.name || asset.title || "audio.webm",
      type:asset.mimeType || "audio/webm",
      data:asset.dataUrl || "",
      time:asset.createdText || "",
      created_at:asset.createdAt || "",
      transcript:asset.transcript || "",
      title:asset.title || "音声メモ"
    };
  }

  function assetToNote(asset){
    return {
      id:asset.id,
      sourceAssetId:asset.id,
      text:asset.text || asset.memo || asset.title || asset.name || "",
      time:asset.createdText || "",
      created_at:asset.createdAt || "",
      title:asset.title || "メモ"
    };
  }

  function mergeAssetsIntoLegacyFields(record,assets,summary){
    const assetList = Array.isArray(assets) ? assets : [];
    const assetPhotos = assetList.filter(asset=>asset.kind === "photo" && asset.dataUrl).map(assetToPhoto);
    const assetAudio = assetList.filter(asset=>asset.kind === "audio" && asset.dataUrl).map(assetToAudio);
    const assetNotes = assetList.filter(asset=>asset.kind === "memo" || asset.kind === "text_file").map(assetToNote);

    record.photos = uniqueByAssetId([...(record.photos || []),...assetPhotos]);
    record.audio = uniqueByAssetId([...(record.audio || []),...assetAudio]);
    record.notes = uniqueByAssetId([...(record.notes || []),...assetNotes]);
    record.assets = assetList;
    record.assetSummary = summary || {total:assetList.length};

    record.summary = {
      ...(record.summary || {}),
      photoCount:record.photos.length,
      audioCount:record.audio.length,
      noteCount:record.notes.length,
      assetCount:record.assetSummary.total || assetList.length,
      assetPhotoCount:record.assetSummary.photo || assetPhotos.length,
      assetVideoCount:record.assetSummary.video || 0,
      assetAudioCount:record.assetSummary.audio || assetAudio.length,
      assetMemoCount:record.assetSummary.memo || assetNotes.length
    };

    return record;
  }

  function resolveTargetId(record){
    return record?.session?.id || record?.session_id || record?.id || "";
  }

  function patchSaveRecord(){
    if(typeof window.saveRecord !== "function" || window.saveRecord.__assetM0v183Patched) return;
    const original = window.saveRecord;
    window.saveRecord = async function(record){
      if(record && ["walk","camp"].includes(record.recordType)){
        const M0 = window.OUTBASE_ASSET_M0 || {};
        const store = M0.store || {};
        const core = M0.core || {};
        const targetId = resolveTargetId(record);
        const assets = store.getAssetsForContext && targetId
          ? await store.getAssetsForContext(record.recordType,targetId)
          : [];
        const summary = core.buildAssetSummary ? core.buildAssetSummary(assets) : {total:assets.length};
        mergeAssetsIntoLegacyFields(record,assets,summary);
      }
      return original.call(this,record);
    };
    window.saveRecord.__assetM0v183Patched = true;
  }

  function patchShowDetail(){
    if(typeof window.showDetail !== "function" || window.showDetail.__assetM0v183Patched) return;
    const original = window.showDetail;
    window.showDetail = async function(id){
      const result = await original.apply(this,arguments);
      renderLater();
      return result;
    };
    window.showDetail.__assetM0v183Patched = true;
  }

  function setup(){
    patchFunction("startWalk","__assetM0v183Patched");
    patchFunction("restoreWalkSession","__assetM0v183Patched");
    patchFunction("continueCampStart","__assetM0v183Patched");
    patchFunction("restoreCampSession","__assetM0v183Patched");
    patchFunction("backToHome","__assetM0v183Patched");
    patchSaveRecord();
    patchShowDetail();
    renderLater();
  }

  window.setupAssetM0 = setup;
  window.addEventListener("load",()=>setTimeout(setup,1200));
})();
