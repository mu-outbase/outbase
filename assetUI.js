/* =========================================================
   OUTBASE assetUI.js
   M0 v186: ホーム整理 + 文字起こし表示
   - ホームは「＋記録する」折りたたみ中心に整理
   - 最近の素材は最大3件だけ表示
   - 音声メモはaudio再生 + 文字起こしを表示
   - 散歩/キャンプ中は従来通り入力しやすいパネル
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
      .asset-m0-main-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 0;}
      .asset-m0-main-btn{font-size:17px;padding:14px 10px;border-radius:14px;min-height:54px;background:#28743a;color:#fff;text-align:center;font-weight:700;}
      .asset-m0-secondary-btn{font-size:16px;padding:14px 10px;border-radius:14px;min-height:54px;background:#475569;color:#fff;}
      .asset-m0-summary{font-size:15px;line-height:1.6;margin:8px 0;color:#334155;}
      .asset-m0-small{font-size:12px;color:#64748b;line-height:1.5;margin-top:8px;}
      .asset-m0-actions{margin-top:8px;}
      .asset-m0-actions summary{list-style:none;cursor:pointer;}
      .asset-m0-actions summary::-webkit-details-marker{display:none;}
      .asset-m0-list{display:flex;flex-direction:column;gap:10px;}
      .asset-m0-item{padding:10px;border-radius:12px;background:#f8fafc;line-height:1.5;}
      .asset-m0-title{font-weight:700;margin-bottom:6px;word-break:break-word;}
      .asset-m0-preview{margin:8px 0;}
      .asset-m0-thumb{width:100%;max-height:220px;object-fit:contain;border-radius:12px;background:#eef2f7;}
      .asset-m0-video{width:100%;max-height:240px;border-radius:12px;background:#111827;}
      .asset-m0-audio{width:100%;margin-top:6px;}
      .asset-m0-memo{white-space:pre-wrap;background:white;border-radius:10px;padding:9px;}
      .asset-m0-transcript{white-space:pre-wrap;background:#fff7ed;border-left:4px solid #f97316;border-radius:10px;padding:9px;margin-top:8px;}
      .asset-m0-live{white-space:pre-wrap;background:#ecfdf5;border-left:4px solid #22c55e;border-radius:10px;padding:9px;margin-top:8px;color:#14532d;}
      .asset-m0-meta{font-size:12px;color:#64748b;margin-top:4px;word-break:break-word;}
      .asset-m0-view-btn{margin-top:8px;padding:9px 10px;border-radius:10px;font-size:14px;min-height:40px;background:#475569;color:#fff;}
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

  function isHomeContext(context){
    return !context.targetId || context.targetType === "inbox";
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

  function transcriptHtml(asset){
    const text = String(asset?.transcript || asset?.text || "").trim();
    if(!text || asset.kind !== "audio") return "";
    return `<div class="asset-m0-transcript"><strong>文字起こし</strong><br>${safe(text)}</div>`;
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
      return `<div class="asset-m0-preview"><audio class="asset-m0-audio" controls src="${data}"></audio>${transcriptHtml(asset)}</div>`;
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

  function sortRecent(list){
    return (Array.isArray(list) ? list : [])
      .slice()
      .sort((a,b)=>String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  }

  function buildRecentHtml(assets,limit){
    const list = sortRecent(assets).slice(0,limit || 6);
    if(!list.length) return "素材なし";

    return `<div class="asset-m0-list">` +
      list.map(asset=>buildAssetItemHtml(asset,true)).join("") +
      `</div>`;
  }

  function buildActionButtonsHtml(){
    return `
      <div class="asset-m0-grid">
        <button type="button" class="asset-m0-btn" data-asset-action="camera">📷 撮影</button>
        <button type="button" class="asset-m0-btn" data-asset-action="files">🖼️ 取込</button>
        <button type="button" class="asset-m0-btn" data-asset-action="memo">📝 メモ</button>
        <button type="button" class="asset-m0-btn" data-asset-action="audio-start">🎤 録音開始</button>
        <button type="button" class="asset-m0-btn" data-asset-action="audio-stop">■ 録音保存</button>
        <button type="button" class="asset-m0-btn" data-asset-action="refresh">更新</button>
      </div>
      <div class="asset-m0-live asset-m0-live-transcript">音声メモ録音中はここに文字起こしを表示</div>
    `;
  }

  function buildHomePanelHtml(context,assets,inbox,allAssets){
    return `
      <h2>記録入力</h2>
      <div class="asset-m0-summary">
        素材合計 ${allAssets.length || 0}件 / 未整理 ${inbox.length || 0}件<br>
        ホームは最低限表示。保存済み素材は素材一覧で確認します。
      </div>
      <div class="asset-m0-main-row">
        <button type="button" class="asset-m0-secondary-btn" onclick="showAssetInboxPage && showAssetInboxPage()">素材一覧</button>
        <button type="button" class="asset-m0-secondary-btn" data-asset-action="refresh">更新</button>
      </div>
      <details class="asset-m0-actions">
        <summary class="asset-m0-main-btn">＋ 記録する</summary>
        ${buildActionButtonsHtml()}
      </details>
      <input class="asset-m0-hidden" type="file" accept="image/*" capture="environment" data-asset-input="camera">
      <input class="asset-m0-hidden" type="file" multiple accept="image/*,video/*,audio/*,.pdf,.xlsx,.xls,.txt,.md" data-asset-input="files">
      <div class="detail-section">
        <div class="detail-title">最近の素材（最大3件）</div>
        <div class="detail-value">${buildRecentHtml(allAssets,3)}</div>
      </div>
    `;
  }

  function buildActivePanelHtml(context,assets,inbox,allAssets){
    const summary = core.buildAssetSummary ? core.buildAssetSummary(assets) : {total:assets.length};
    return `
      <h2>記録入力</h2>
      <div class="detail-value">
        ${safe(contextLabel(context))}<br>
        紐付け素材 ${summary.total || 0}件 / 未整理 ${inbox.length || 0}件
      </div>
      ${buildActionButtonsHtml()}
      <input class="asset-m0-hidden" type="file" accept="image/*" capture="environment" data-asset-input="camera">
      <input class="asset-m0-hidden" type="file" multiple accept="image/*,video/*,audio/*,.pdf,.xlsx,.xls,.txt,.md" data-asset-input="files">
      <div class="asset-m0-small">撮影・取込・音声メモ・手入力メモは、この散歩/キャンプに紐付けて保存します。音声は文字起こしも保存します。</div>
      <div class="detail-section">
        <div class="detail-title">この記録の素材</div>
        <div class="detail-value">${buildRecentHtml(assets,6)}</div>
      </div>
    `;
  }

  function buildPanelHtml(context,assets,inbox,allAssets){
    if(isHomeContext(context)) return buildHomePanelHtml(context,assets,inbox,allAssets);
    return buildActivePanelHtml(context,assets,inbox,allAssets);
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

  async function afterAssetAction(){
    await renderAll();
    if(typeof window.renderAssetInboxPage === "function") window.renderAssetInboxPage();
  }

  function bindPanel(panel,context){
    const camera = panel.querySelector('[data-asset-input="camera"]');
    const files = panel.querySelector('[data-asset-input="files"]');

    panel.querySelectorAll("[data-asset-action]").forEach(button=>{
      button.onclick = async ()=>{
        const action = button.getAttribute("data-asset-action");
        if(action === "camera" && camera) camera.click();
        if(action === "files" && files) files.click();
        if(action === "memo"){
          const text = prompt("メモを入力","");
          if(text !== null && capture.saveTextMemo){
            await capture.saveTextMemo(text,{context});
            await afterAssetAction();
          }
        }
        if(action === "audio-start" && capture.startAudio) await capture.startAudio();
        if(action === "audio-stop" && capture.stopAudio){
          await capture.stopAudio();
          await afterAssetAction();
        }
        if(action === "refresh") afterAssetAction();
      };
    });

    if(camera){
      camera.onchange = async e=>{
        if(capture.importFiles) await capture.importFiles(e.target.files,{context,kind:"photo"});
        camera.value = "";
        await afterAssetAction();
      };
    }

    if(files){
      files.onchange = async e=>{
        if(capture.importFiles) await capture.importFiles(e.target.files,{context});
        files.value = "";
        await afterAssetAction();
      };
    }
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

  function updateTranscript(info){
    const data = info || {};
    const text = data.text || data.interimText || data.finalText || "";
    const status = data.active ? "録音中・文字起こし中" : "音声メモ録音中はここに文字起こしを表示";
    const error = data.error ? "\n" + data.error : "";
    document.querySelectorAll(".asset-m0-live-transcript").forEach(el=>{
      el.textContent = text ? (status + "\n" + text + error) : (status + error);
    });
  }

  async function renderAll(){
    addStyle();
    for(const target of targetPages()){
      await renderPanel(target.pageId,target.panelId);
    }
    if(capture.getTranscriptInfo) updateTranscript(capture.getTranscriptInfo());
  }

  M0.ui = {renderAll,renderPanel,updateTranscript};
  window.OUTBASE_ASSET_M0 = M0;
  window.renderAssetM0Panels = renderAll;
  window.openAssetM0Viewer = openViewer;
  window.closeAssetM0Viewer = closeViewer;
  window.updateAssetM0Transcript = updateTranscript;
})();
