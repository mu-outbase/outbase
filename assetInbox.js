/* =========================================================
   OUTBASE assetInbox.js
   M0 v184: 素材一覧 / 未整理インボックス画面
   - ホームで撮影・取込・録音・メモ保存した素材を一覧表示
   - 写真/動画プレビュー、音声再生、メモ本文、大きく見る
========================================================= */
(function(){
  "use strict";

  const STYLE_ID = "assetInboxM0Style";
  const VIEWER_ID = "assetInboxM0Viewer";
  let currentFilter = "all";
  let latestAssets = [];

  function M0(){ return window.OUTBASE_ASSET_M0 || {}; }
  function core(){ return M0().core || {}; }
  function store(){ return M0().store || {}; }

  function safe(value){
    if(typeof escapeHtml === "function") return escapeHtml(value);
    return String(value ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function label(kind){
    return core().labelForKind ? core().labelForKind(kind) : (kind || "素材");
  }

  function targetLabel(asset){
    return core().getAssetTargetLabel ? core().getAssetTargetLabel(asset) : (asset?.targetType || "未整理");
  }

  function addStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .asset-filter-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:10px 0;}
      .asset-filter-row button{font-size:14px;min-height:44px;border-radius:12px;}
      .asset-inbox-list{display:flex;flex-direction:column;gap:12px;}
      .asset-inbox-item{background:#f8fafc;border-radius:14px;padding:12px;line-height:1.5;}
      .asset-inbox-title{font-weight:700;margin-bottom:8px;word-break:break-word;}
      .asset-inbox-meta{font-size:12px;color:#64748b;word-break:break-word;margin-top:4px;}
      .asset-inbox-thumb{width:100%;max-height:320px;object-fit:contain;background:#eef2f7;border-radius:12px;}
      .asset-inbox-video{width:100%;max-height:320px;background:#111827;border-radius:12px;}
      .asset-inbox-audio{width:100%;margin-top:6px;}
      .asset-inbox-memo{white-space:pre-wrap;background:white;border-radius:10px;padding:10px;}
      .asset-inbox-open{margin-top:8px;padding:10px;border-radius:10px;background:#475569;color:white;min-height:42px;}
      #${VIEWER_ID}{position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:9999;padding:16px;overflow:auto;}
      #${VIEWER_ID}.hidden{display:none;}
      .asset-inbox-viewer-card{background:white;border-radius:18px;padding:16px;max-width:780px;margin:24px auto;}
      .asset-inbox-close{background:#b91c1c;color:white;border-radius:12px;padding:9px 12px;min-height:42px;}
    `;
    document.head.appendChild(style);
  }

  function getTitle(asset){
    return asset.title || asset.name || asset.memo || asset.text || label(asset.kind);
  }

  function getTime(asset){
    return asset.createdText || asset.createdAt || "";
  }

  function previewHtml(asset,full){
    const kind = asset?.kind || "file";
    const data = asset?.dataUrl || "";

    if(kind === "photo" && data){
      return `<img class="asset-inbox-thumb" src="${data}" alt="${safe(getTitle(asset))}" onclick="openAssetInboxViewer('${safe(asset.id)}')">`;
    }
    if(kind === "video" && data){
      return `<video class="asset-inbox-video" controls src="${data}"></video>`;
    }
    if(kind === "audio" && data){
      return `<audio class="asset-inbox-audio" controls src="${data}"></audio>`;
    }
    if(kind === "memo"){
      return `<div class="asset-inbox-memo">${safe(asset.text || asset.memo || "")}</div>`;
    }
    if(data && full){
      return `<a href="${data}" download="${safe(asset.name || getTitle(asset))}">ファイルを開く/保存</a>`;
    }
    return "";
  }

  function filterAssets(list){
    if(currentFilter === "all") return list;
    if(currentFilter === "unlinked") return list.filter(a=>!a.linked || a.inboxStatus === "unlinked");
    return list.filter(a=>a.kind === currentFilter);
  }

  function summaryHtml(all,filtered){
    const count = kind => all.filter(a=>a.kind === kind).length;
    const unlinked = all.filter(a=>!a.linked || a.inboxStatus === "unlinked").length;
    return `
      <div class="stats-grid">
        <div class="stat-box">素材合計<br>${all.length}件</div>
        <div class="stat-box">未整理<br>${unlinked}件</div>
        <div class="stat-box">写真<br>${count("photo")}件</div>
        <div class="stat-box">音声<br>${count("audio")}件</div>
        <div class="stat-box">メモ<br>${count("memo")}件</div>
        <div class="stat-box">表示中<br>${filtered.length}件</div>
      </div>
    `;
  }

  function itemHtml(asset){
    return `
      <div class="asset-inbox-item">
        <div class="asset-inbox-title">${safe(label(asset.kind))}：${safe(getTitle(asset))}</div>
        ${previewHtml(asset,false)}
        <div class="asset-inbox-meta">日時：${safe(getTime(asset))}</div>
        <div class="asset-inbox-meta">保存先：${safe(targetLabel(asset))} / ${asset.linked ? "紐付け済み" : "未整理"}</div>
        <div class="asset-inbox-meta">ファイル名：${safe(asset.name || "")}</div>
        <button type="button" class="asset-inbox-open" onclick="openAssetInboxViewer('${safe(asset.id)}')">大きく見る / 再生する</button>
      </div>
    `;
  }

  async function getAssets(){
    if(!store().getAllAssets){
      alert("素材保存基盤が読み込まれていません");
      return [];
    }
    const list = await store().getAllAssets();
    return list.sort((a,b)=>String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  }

  async function renderPage(){
    addStyle();
    const summary = document.getElementById("assetInboxSummary");
    const listArea = document.getElementById("assetInboxList");
    if(!summary || !listArea) return;

    latestAssets = await getAssets();
    const filtered = filterAssets(latestAssets);
    summary.innerHTML = summaryHtml(latestAssets,filtered);
    if(!filtered.length){
      listArea.innerHTML = "素材なし";
      return;
    }
    listArea.innerHTML = `<div class="asset-inbox-list">${filtered.map(itemHtml).join("")}</div>`;
  }

  function showPageLocal(){
    document.querySelectorAll(".page").forEach(page=>page.classList.add("hidden"));
    const page = document.getElementById("assetInboxPage");
    if(page) page.classList.remove("hidden");
    renderPage();
  }

  function setFilter(filter){
    currentFilter = filter || "all";
    renderPage();
  }

  function ensureViewer(){
    let viewer = document.getElementById(VIEWER_ID);
    if(viewer) return viewer;
    viewer = document.createElement("div");
    viewer.id = VIEWER_ID;
    viewer.className = "hidden";
    viewer.onclick = event=>{ if(event.target === viewer) closeViewer(); };
    document.body.appendChild(viewer);
    return viewer;
  }

  async function openViewer(id){
    addStyle();
    let asset = latestAssets.find(a=>a.id === id);
    if(!asset){
      latestAssets = await getAssets();
      asset = latestAssets.find(a=>a.id === id);
    }
    if(!asset){
      alert("素材が見つかりません");
      return;
    }
    const viewer = ensureViewer();
    viewer.className = "";
    viewer.innerHTML = `
      <div class="asset-inbox-viewer-card">
        <button type="button" class="asset-inbox-close" onclick="closeAssetInboxViewer()">閉じる</button>
        <h2>${safe(label(asset.kind))}：${safe(getTitle(asset))}</h2>
        ${previewHtml(asset,true)}
        <div class="asset-inbox-meta">日時：${safe(getTime(asset))}</div>
        <div class="asset-inbox-meta">保存先：${safe(targetLabel(asset))} / ${asset.linked ? "紐付け済み" : "未整理"}</div>
        <div class="asset-inbox-meta">ファイル名：${safe(asset.name || "")}</div>
      </div>
    `;
  }

  function closeViewer(){
    const viewer = document.getElementById(VIEWER_ID);
    if(viewer){
      viewer.className = "hidden";
      viewer.innerHTML = "";
    }
  }

  window.showAssetInboxPage = showPageLocal;
  window.renderAssetInboxPage = renderPage;
  window.setAssetInboxFilter = setFilter;
  window.openAssetInboxViewer = openViewer;
  window.closeAssetInboxViewer = closeViewer;
})();
