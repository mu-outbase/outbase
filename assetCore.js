/* =========================================================
   OUTBASE assetCore.js
   M0 v178: 記録入力基盤 Core
   - 写真 / 動画 / 音声 / メモ / スクショ / ファイルを asset に統一
   - app.js本体は触らない
========================================================= */
(function(){
  "use strict";

  const M0 = window.OUTBASE_ASSET_M0 || {};
  const VERSION = "m0v178";

  function safeText(value){
    if(typeof escapeHtml === "function") return escapeHtml(value);
    return String(value ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function createIdSafe(prefix){
    if(typeof createId === "function") return createId();
    return (prefix || "asset") + "_" + Date.now() + "_" + Math.floor(Math.random()*100000);
  }

  function nowIso(){
    return new Date().toISOString();
  }

  function nowText(){
    return new Date().toLocaleString();
  }

  function asArray(value){
    return Array.isArray(value) ? value : [];
  }

  function getActiveContext(){
    let state = null;
    try{
      if(typeof getAppState === "function") state = getAppState();
    }catch(error){
      state = null;
    }

    const eventType = state?.eventType || "";
    const eventId = state?.eventId || "";

    if(eventType && eventId){
      return {
        targetType:eventType,
        targetId:eventId,
        status:state?.eventStatus || "active",
        sourcePage:state?.page || ""
      };
    }

    return {
      targetType:"inbox",
      targetId:"",
      status:"unlinked",
      sourcePage:state?.page || "home"
    };
  }

  function classifyMime(mime,name){
    const type = String(mime || "").toLowerCase();
    const fileName = String(name || "").toLowerCase();

    if(type.startsWith("image/")) return "photo";
    if(type.startsWith("video/")) return "video";
    if(type.startsWith("audio/")) return "audio";
    if(type.includes("pdf") || fileName.endsWith(".pdf")) return "pdf";
    if(fileName.endsWith(".xlsx") || fileName.endsWith(".xls") || type.includes("spreadsheet")) return "spreadsheet";
    if(type.startsWith("text/") || fileName.endsWith(".txt") || fileName.endsWith(".md")) return "text_file";
    return "file";
  }

  function makeAssetBase(input){
    const context = input?.context || getActiveContext();
    const kind = input?.kind || classifyMime(input?.mimeType,input?.name);
    const linked = Boolean(context.targetType && context.targetType !== "inbox" && context.targetId);

    return {
      id:input?.id || createIdSafe("asset"),
      version:VERSION,
      kind:kind,
      title:input?.title || input?.name || labelForKind(kind),
      name:input?.name || "",
      mimeType:input?.mimeType || "",
      sizeBytes:input?.sizeBytes || 0,
      dataUrl:input?.dataUrl || "",
      text:input?.text || "",
      transcript:input?.transcript || "",
      memo:input?.memo || "",
      officialUrl:input?.officialUrl || "",
      googlePhotosUrl:input?.googlePhotosUrl || "",
      privacy:input?.privacy || "private",
      source:"outbase_m0",
      sourcePage:context.sourcePage || "",
      targetType:context.targetType || "inbox",
      targetId:context.targetId || "",
      linked:linked,
      inboxStatus:linked ? "linked" : "unlinked",
      reviewUse:input?.reviewUse !== false,
      chappyUse:input?.chappyUse !== false,
      createdAt:input?.createdAt || nowIso(),
      createdText:input?.createdText || nowText(),
      updatedAt:nowIso(),
      tags:asArray(input?.tags)
    };
  }

  function makeInboxItem(asset){
    return {
      id:createIdSafe("inbox"),
      version:VERSION,
      assetId:asset.id,
      kind:asset.kind,
      title:asset.title || labelForKind(asset.kind),
      previewText:asset.text || asset.memo || asset.name || asset.kind,
      status:asset.linked ? "linked" : "unlinked",
      suggestedTargetType:asset.targetType || "inbox",
      suggestedTargetId:asset.targetId || "",
      createdAt:asset.createdAt,
      updatedAt:nowIso(),
      source:"asset_m0"
    };
  }

  function labelForKind(kind){
    const labels = {
      photo:"写真",
      video:"動画",
      audio:"音声メモ",
      memo:"手入力メモ",
      screenshot:"スクショ",
      pdf:"PDF",
      spreadsheet:"Excel",
      text_file:"テキスト",
      file:"ファイル"
    };
    return labels[kind] || "素材";
  }

  function buildAssetSummary(assets){
    const list = asArray(assets);
    const count = kind => list.filter(a=>a.kind === kind).length;
    return {
      total:list.length,
      photo:count("photo"),
      video:count("video"),
      audio:count("audio"),
      memo:count("memo"),
      file:list.filter(a=>!["photo","video","audio","memo"].includes(a.kind)).length,
      unlinked:list.filter(a=>a.inboxStatus === "unlinked" || !a.linked).length
    };
  }

  function getAssetTargetLabel(asset){
    if(!asset) return "未整理";
    if(asset.targetType === "walk") return "散歩";
    if(asset.targetType === "camp") return "キャンプ";
    if(asset.targetType === "camp_project") return "キャンプPJ";
    if(asset.targetType === "campground") return "キャンプ場";
    if(asset.targetType === "gear") return "ギア";
    if(asset.targetType === "meal") return "料理";
    return "未整理";
  }

  M0.core = {
    version:VERSION,
    safeText,
    createIdSafe,
    nowIso,
    nowText,
    asArray,
    getActiveContext,
    classifyMime,
    makeAssetBase,
    makeInboxItem,
    labelForKind,
    buildAssetSummary,
    getAssetTargetLabel
  };

  window.OUTBASE_ASSET_M0 = M0;
})();
