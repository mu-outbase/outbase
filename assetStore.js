/* =========================================================
   OUTBASE assetStore.js
   M0 v178: 記録入力基盤 Store
   - assets / inbox_items / import_queue へ保存
   - IndexedDB中心。localStorageは使わない
========================================================= */
(function(){
  "use strict";

  const M0 = window.OUTBASE_ASSET_M0 || {};
  const core = M0.core || {};

  function hasStoreApi(){
    return typeof saveOutbaseStore === "function" && typeof getOutbaseStoreAll === "function";
  }

  async function saveAsset(assetInput){
    const asset = core.makeAssetBase ? core.makeAssetBase(assetInput) : assetInput;

    if(!hasStoreApi()){
      throw new Error("OUTBASE保存基盤が未起動です");
    }

    const saved = await saveOutbaseStore("assets",asset);

    if(saved.inboxStatus === "unlinked" || !saved.linked){
      const inboxItem = core.makeInboxItem ? core.makeInboxItem(saved) : null;
      if(inboxItem) await saveOutbaseStore("inbox_items",inboxItem);
    }

    return saved;
  }

  async function saveManyAssets(assetInputs){
    const list = Array.isArray(assetInputs) ? assetInputs : [];
    const saved = [];

    for(const item of list){
      saved.push(await saveAsset(item));
    }

    return saved;
  }

  async function getAllAssets(){
    if(!hasStoreApi()) return [];
    try{
      return await getOutbaseStoreAll("assets");
    }catch(error){
      console.error("素材一覧取得失敗",error);
      return [];
    }
  }

  async function getInboxItems(){
    if(!hasStoreApi()) return [];
    try{
      const items = await getOutbaseStoreAll("inbox_items");
      return items.filter(item=>item.status !== "linked");
    }catch(error){
      console.error("未整理インボックス取得失敗",error);
      return [];
    }
  }

  async function getAssetsForContext(targetType,targetId){
    const list = await getAllAssets();
    return list.filter(asset=>{
      if(targetType && asset.targetType !== targetType) return false;
      if(targetId && asset.targetId !== targetId) return false;
      return true;
    });
  }

  async function getCurrentContextAssets(){
    const context = core.getActiveContext ? core.getActiveContext() : {};
    if(!context.targetType || !context.targetId) return [];
    return getAssetsForContext(context.targetType,context.targetId);
  }

  async function enqueueImport(asset){
    if(!hasStoreApi()) return null;
    return saveOutbaseStore("import_queue",{
      assetId:asset.id,
      kind:asset.kind,
      status:"queued",
      targetType:asset.targetType || "inbox",
      targetId:asset.targetId || "",
      createdAt:asset.createdAt || new Date().toISOString()
    });
  }

  async function saveAssetAndQueue(assetInput){
    const asset = await saveAsset(assetInput);
    await enqueueImport(asset);
    return asset;
  }

  M0.store = {
    saveAsset,
    saveManyAssets,
    saveAssetAndQueue,
    getAllAssets,
    getInboxItems,
    getAssetsForContext,
    getCurrentContextAssets,
    enqueueImport
  };

  window.OUTBASE_ASSET_M0 = M0;
})();
