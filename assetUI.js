/* =========================================================
   OUTBASE assetUI.js
   M0 v178: 記録入力基盤 UI
   - ホーム / 散歩 / キャンプに共通入力パネルを追加
========================================================= */
(function(){
  "use strict";

  const M0 = window.OUTBASE_ASSET_M0 || {};
  const core = M0.core || {};
  const store = M0.store || {};
  const capture = M0.capture || {};
  const STYLE_ID = "assetM0Style";

  function safe(value){
    return core.safeText ? core.safeText(value) : String(value ?? "");
  }

  function addStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .asset-m0-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:10px;}
      .asset-m0-btn{font-size:16px;padding:14px 8px;border-radius:14px;min-height:54px;}
      .asset-m0-small{font-size:12px;color:#64748b;line-height:1.5;}
      .asset-m0-list{display:flex;flex-direction:column;gap:8px;}
      .asset-m0-item{padding:9px;border-radius:10px;background:#f8fafc;}
      .asset-m0-hidden{display:none;}
    `;
    document.head.appendChild(style);
  }

  function contextLabel(context){
    if(context.targetType === "walk") return "散歩に紐付け";
    if(context.targetType === "camp") return "キャンプに紐付け";
    return "未整理インボックス";
  }

  async function getPanelSummary(context){
    if(!store.getAssetsForContext || !store.getInboxItems) return {assets:[],inbox:[]};
    const assets = context.targetId
      ? await store.getAssetsForContext(context.targetType,context.targetId)
      : [];
    const inbox = await store.getInboxItems();
    return {assets,inbox};
  }

  function buildRecentHtml(assets,inbox,context){
    const list = context.targetId ? assets : inbox;
    if(!list.length) return "素材なし";

    return `<div class="asset-m0-list">` + list.slice().reverse().slice(0,5).map(item=>{
      const kind = item.kind || "file";
      const title = item.title || item.name || item.previewText || kind;
      const time = item.createdText || item.createdAt || "";
      return `<div class="asset-m0-item">${safe(core.labelForKind ? core.labelForKind(kind) : kind)}：${safe(title)}<br><span class="note-time">${safe(time)}</span></div>`;
    }).join("") + `</div>`;
  }

  function buildPanelHtml(context,assets,inbox){
    const summary = core.buildAssetSummary ? core.buildAssetSummary(assets) : {total:assets.length};
    return `
      <h2>記録入力</h2>
      <div class="detail-value">
        ${safe(contextLabel(context))}<br>
        素材 ${summary.total || 0}件 / 未整理 ${inbox.length || 0}件
      </div>
      <div class="asset-m0-grid">
        <button type="button" class="asset-m0-btn" data-asset-action="camera">📷 撮影</button>
        <button type="button" class="asset-m0-btn" data-asset-action="files">🖼️ 取込</button>
        <button type="button" class="asset-m0-btn" data-asset-action="memo">📝 メモ</button>
        <button type="button" class="asset-m0-btn" data-asset-action="audio-start">🎤 録音開始</button>
        <button type="button" class="asset-m0-btn" data-asset-action="audio-stop">■ 録音保存</button>
        <button type="button" class="asset-m0-btn" data-asset-action="refresh">更新</button>
      </div>
      <input class="asset-m0-hidden" type="file" accept="image/*" capture="environment" data-asset-input="camera">
      <input class="asset-m0-hidden" type="file" multiple accept="image/*,video/*,audio/*,.pdf,.xlsx,.xls,.txt,.md" data-asset-input="files">
      <div class="asset-m0-small">写真・動画・音声・PDF・Excel・スクショをassetとして保存。紐付かない素材は未整理インボックスへ。</div>
      <div class="detail-section">
        <div class="detail-title">最近の素材</div>
        <div class="detail-value">${buildRecentHtml(assets,inbox,context)}</div>
      </div>
    `;
  }

  function targetPages(){
    return [
      {pageId:"homePage",panelId:"assetM0HomePanel"},
      {pageId:"walkPage",panelId:"assetM0WalkPanel"},
      {pageId:"campPage",panelId:"assetM0CampPanel"}
    ];
  }

  function insertPanel(page,panel){
    const existing = document.getElementById(panel.id);
    if(existing) existing.remove();

    const first = page.querySelector(".card");
    if(first && first.nextSibling) page.insertBefore(panel,first.nextSibling);
    else page.appendChild(panel);
  }

  async function renderPanel(pageId,panelId){
    const page = document.getElementById(pageId);
    if(!page) return;

    const context = core.getActiveContext ? core.getActiveContext() : {targetType:"inbox"};
    const data = await getPanelSummary(context);
    const panel = document.createElement("div");
    panel.className = "card";
    panel.id = panelId;
    panel.innerHTML = buildPanelHtml(context,data.assets,data.inbox);
    insertPanel(page,panel);
    bindPanel(panel,context);
  }

  function bindPanel(panel,context){
    const camera = panel.querySelector('[data-asset-input="camera"]');
    const files = panel.querySelector('[data-asset-input="files"]');

    panel.querySelectorAll("[data-asset-action]").forEach(button=>{
      button.onclick = async ()=>{
        const action = button.getAttribute("data-asset-action");
        if(action === "camera") camera.click();
        if(action === "files") files.click();
        if(action === "memo"){
          const text = prompt("メモを入力","");
          if(text !== null && capture.saveTextMemo) await capture.saveTextMemo(text,{context});
        }
        if(action === "audio-start" && capture.startAudio) await capture.startAudio();
        if(action === "audio-stop" && capture.stopAudio) await capture.stopAudio();
        if(action === "refresh") renderAll();
      };
    });

    camera.onchange = async e=>{
      if(capture.importFiles) await capture.importFiles(e.target.files,{context,kind:"photo"});
      camera.value = "";
    };

    files.onchange = async e=>{
      if(capture.importFiles) await capture.importFiles(e.target.files,{context});
      files.value = "";
    };
  }

  async function renderAll(){
    addStyle();
    for(const target of targetPages()){
      await renderPanel(target.pageId,target.panelId);
    }
  }

  M0.ui = {renderAll,renderPanel};
  window.OUTBASE_ASSET_M0 = M0;
  window.renderAssetM0Panels = renderAll;
})();
