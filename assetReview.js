/* =========================================================
   OUTBASE assetReview.js
   M0 v178: 素材レビュー材料
   - ホーム/レビュー/チャッピー用の素材要約を生成
========================================================= */
(function(){
  "use strict";

  const M0 = window.OUTBASE_ASSET_M0 || {};
  const core = M0.core || {};
  const store = M0.store || {};

  async function buildInboxSummary(){
    const inbox = store.getInboxItems ? await store.getInboxItems() : [];
    const assets = store.getAllAssets ? await store.getAllAssets() : [];
    const summary = core.buildAssetSummary ? core.buildAssetSummary(assets) : {total:assets.length};
    return {
      assetSummary:summary,
      inboxCount:inbox.length,
      message:inbox.length > 0
        ? "未整理素材が" + inbox.length + "件あります"
        : "未整理素材なし"
    };
  }

  async function getReviewText(){
    const summary = await buildInboxSummary();
    return summary.message + " / 写真" + (summary.assetSummary.photo || 0) + "・音声" + (summary.assetSummary.audio || 0);
  }

  M0.review = {buildInboxSummary,getReviewText};
  window.OUTBASE_ASSET_M0 = M0;
})();
