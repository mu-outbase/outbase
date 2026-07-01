/* =========================================================
   OUTBASE assetUI.js
   M0 v184: 記録入力基盤 UI 修正版
   - 保存した写真/取込/音声/メモをその場で見られる
   - ホームは素材合計、散歩/キャンプ中は紐付け素材を表示
   - 音声メモはaudio再生コントロールを表示
========================================================= */
(function(){
  "use strict";

  const M0 = window.OUTBASE_ASSET_M0 || {};
  const core = M0.core || {};
  const store = M0.store || {};
  const capture = M0.capture || {};
  const STYLE_ID = "assetM0Style";
  const VIEWER_ID = "assetM0Viewer";

  let latestAssetsCache = [];

  function safe(value){
    return core.safeText ? core.safeText(value) : String(value ?? "");
  }

  function label(kind){
    return core.labelForKind ? core.labelForKind(kind) : (kind || "素材");
  }

  function addStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .asset-m0-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:10px;}
      .asset-m0-btn{font-size:16px;padding:14px 8px;border-radius:14px;min-height:54px;}
      .asset-m0-small{font-size:12px;color:#64748b;line-height:1.5;margin-top:8px;}
      .asset-m0-list{display:flex;flex-direction:column;gap:10px;}
      .asset-m0-item{padding:10px;border-radius:12px;background:#f8fafc;line-height:1.5;}
      .asset-m0-title{font-weight:700;margin-bottom:6px;word-break:break-word;}
      .asset-m0-preview{margin:8px 0;}
      .asset-m0-thumb{width:100%;max-height:260px;object-fit:contain;border-radius:12px;background:#eef2f7;}
      .asset-m0-video{width:100%;max-height:260px;border-radius:12px;background:#111827;}
      .asset-m0-audio{width:100%;margin-top:6px;}
      .asset-m0-memo{white-space:pre-wrap;background:white;border-radius:10px;padding:9px;}
      .asset-m0-meta{font-size:12px;color:#64748b;margin-top:4px;word-break:break-word;}
      .asset-m0-view-btn{margin-top:8px;padding:9px 10px;border-radius:10px;font-size:14px;min-height:40px;background:#475569;color:#fff;}
      .asset-m0-inbox-btn{width:100%;margin-top:10px;background:#1f6f3a;color:#fff;}
      .asset-m0-hidden{display:none;}
      #${VIEWER_ID}{position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:9999;padding:16px;overflow:auto;}
      #${VIEWER_ID}.asset-m0-hidden{display:none;}
      .asset-m0-viewer-card{background:#fff;border-radius:18px;padding:16px;max-width:760px;margin:28px auto;}
      .asset-m0-viewer-head{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px;}
      .asset-m0-close{background:#b91c1c;color:#fff;border-radius:12px;padding:8px 12px;min-height:40px;}
    `;
    document.head.appendChild(style);
  }

  function contextLabel(context){
    if(context.targetType === "walk" && context.targetId) return "散歩に紐付け";
    if(context.targetType === "camp" && context.targetId) return "キャンプに紐付け";
    return "未整理インボックス";
  }

  async function getPanelSummary(context){
    if(!store.getAllAssets || !store.getInboxItems){
      return {assets:[],inbox:[],allAssets:[]};
    }

    const allAssets = await store.getAllAssets();
    const inbox = await store.getInboxItems();
    let assets = [];

    if(context.targetId && store.getAssetsForContext){
      assets = await store.getAssetsForContext(context.targetType,context.targetId);
    }else{
      assets = allAssets;
    }

    latestAssetsCache = allAssets;
    return {assets,inbox,allAssets};
  }

  function assetTitle(asset){
    return asset.title || asset.name || asset.memo || asset.text || label(asset.kind);
  }

  function assetTime(asset){
    return asset.createdText || asset.createdAt || "";
  }

  function makePreviewHtml(asset,compact){
    if(!asset) return "";
    const kind = asset.kind || "file";
    const data = asset.dataUrl || "";

    if(kind === "photo" && data){
      return `<div class="asset-m0-preview"><img class="asset-m0-thumb" src="${data}" alt="${safe(assetTitle(asset))}" onclick="openAssetM0Viewer('${safe(asset.id)}')"></div>`;
    }

    if(kind === "video" && data){
      return `<div class="asset-m0-preview"><video class="asset-m0-video" controls src="${data}"></video></div>`;
    }

    if(kind === "audio" && data){
      return `<div class="asset-m0-preview"><audio class="asset-m0-audio" controls src="${data}"></audio></div>`;
    }

    if(kind === "memo"){
      return `<div class="asset-m0-preview asset-m0-memo">${safe(asset.text || asset.memo || "")}</div>`;
    }

    if(!compact && data){
      return `<div class="asset-m0-preview"><a href="${data}" download="${safe(asset.name || assetTitle(asset))}">ファイルを開く/保存</a></div>`;
    }

    return "";
  }

  function buildAssetItemHtml(asset,compact){
    const kind = asset.kind || "file";
    const target = core.getAssetTargetLabel ? core.getAssetTargetLabel(asset) : (asset.targetType || "未整理");
    return `
      <div class="asset-m0-item">
        <div class="asset-m0-title">${safe(label(kind))}：${safe(assetTitle(asset))}</div>
        ${makePreviewHtml(asset,compact)}
        <div class="asset-m0-meta">${safe(assetTime(asset))}</div>
        <div class="asset-m0-meta">保存先：${safe(target)} / ${asset.linked ? "紐付け済み" : "未整理"}</div>
        <button type="button" class="asset-m0-view-btn" onclick="openAssetM0Viewer('${safe(asset.id)}')">大きく見る</button>
      </div>
    `;
  }

  function buildRecentHtml(assets){
    const list = Array.isArray(assets) ? assets : [];
    if(!list.length) return "素材なし";

    return `<div class="asset-m0-list">` +
      list.slice().sort((a,b)=>String(b.createdAt || "").localeCompare(String(a.createdAt || ""))).slice(0,6).map(asset=>{
        return buildAssetItemHtml(asset,true);
      }).join("") +
      `</div>`;
  }

  function buildPanelHtml(context,assets,inbox,allAssets){
    const summary = core.buildAssetSummary ? core.buildAssetSummary(assets) : {total:assets.length};
    const totalLabel = context.targetId ? "紐付け素材" : "素材合計";
    const totalCount = context.targetId ? (summary.total || 0) : (allAssets.length || 0);

    return `
      <h2>記録入力</h2>
      <div class="detail-value">
        ${safe(contextLabel(context))}<br>
        ${totalLabel} ${totalCount}件 / 未整理 ${inbox.length || 0}件
      </div>
      <div class="asset-m0-grid">
        <button type="button" class="asset-m0-btn" data-asset-action="camera">📷 撮影</button>
        <button type="button" class="asset-m0-btn" data-asset-action="files">🖼️ 取込</button>
        <button type="button" class="asset-m0-btn" data-asset-action="memo">📝 メモ</button>
        <button type="button" class="asset-m0-btn" data-asset-action="audio-start">🎤 録音開始</button>
        <button type="button" class="asset-m0-btn" data-asset-action="audio-stop">■ 録音保存</button>
        <button type="button" class="asset-m0-btn" data-asset-action="refresh">更新</button>
      </div>
      <button type="button" class="asset-m0-btn asset-m0-inbox-btn" onclick="showAssetInboxPage && showAssetInboxPage()">素材一覧・未整理インボックスを見る</button>
      <input class="asset-m0-hidden" type="file" accept="image/*" capture="environment" data-asset-input="camera">
      <input class="asset-m0-hidden" type="file" multiple accept="image/*,video/*,audio/*,.pdf,.xlsx,.xls,.txt,.md" data-asset-input="files">
      <div class="asset-m0-small">撮影・取込・音声メモ・手入力メモは、下の「最近の素材」に表示。音声はその場で再生できます。</div>
      <div class="detail-section">
        <div class="detail-title">最近の素材</div>
        <div class="detail-value">${buildRecentHtml(assets)}</div>
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
    panel.innerHTML = buildPanelHtml(context,data.assets,data.inbox,data.allAssets);
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

  function ensureViewer(){
    let viewer = document.getElementById(VIEWER_ID);
    if(viewer) return viewer;

    viewer = document.createElement("div");
    viewer.id = VIEWER_ID;
    viewer.className = "asset-m0-hidden";
    document.body.appendChild(viewer);
    viewer.onclick = event=>{
      if(event.target === viewer) closeAssetM0Viewer();
    };
    return viewer;
  }

  async function findAsset(id){
    const cached = latestAssetsCache.find(item=>item.id === id);
    if(cached) return cached;
    if(store.getAllAssets){
      latestAssetsCache = await store.getAllAssets();
      return latestAssetsCache.find(item=>item.id === id) || null;
    }
    return null;
  }

  async function openViewer(id){
    addStyle();
    const asset = await findAsset(id);
    if(!asset){
      alert("素材が見つかりません");
      return;
    }

    const viewer = ensureViewer();
    viewer.className = "";
    viewer.innerHTML = `
      <div class="asset-m0-viewer-card">
        <div class="asset-m0-viewer-head">
          <div>
            <strong>${safe(label(asset.kind))}：${safe(assetTitle(asset))}</strong>
            <div class="asset-m0-meta">${safe(assetTime(asset))}</div>
          </div>
          <button type="button" class="asset-m0-close" onclick="closeAssetM0Viewer()">閉じる</button>
        </div>
        ${makePreviewHtml(asset,false)}
        <div class="asset-m0-meta">ファイル名：${safe(asset.name || "")}</div>
        <div class="asset-m0-meta">保存先：${safe(core.getAssetTargetLabel ? core.getAssetTargetLabel(asset) : asset.targetType)}</div>
      </div>
    `;
  }

  function closeViewer(){
    const viewer = document.getElementById(VIEWER_ID);
    if(viewer){
      viewer.className = "asset-m0-hidden";
      viewer.innerHTML = "";
    }
  }

  async function renderAll(){
    addStyle();
    for(const target of targetPages()){
      await renderPanel(target.pageId,target.panelId);
    }
  }

  M0.ui = {renderAll,renderPanel,openViewer,closeViewer};
  window.OUTBASE_ASSET_M0 = M0;
  window.renderAssetM0Panels = renderAll;
  window.openAssetM0Viewer = openViewer;
  window.closeAssetM0Viewer = closeViewer;
})();
