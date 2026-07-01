/* =========================================================
   OUTBASE lifeOSUI.js
   UI v198: 人生管理OS 骨格反映
   - v196/v197 方針を本体UIへ反映する軽量レイヤー
   - homeUI.js / app.js / assetUI.js 本体は触らない
   - 提案 / 常設ショートカット / 通知 / 予定 / PJ / 素材を分離
========================================================= */
(function(){
  "use strict";

  const VERSION = "v198";
  const ROOT_ID = "outbaseLifeOSV198";
  const STYLE_ID = "outbaseLifeOSV198Style";
  const MANAGE_ID = "outbaseLifeManageSheet";
  const PAGE_IDS = {
    home:"homePage",
    record:"outbaseRecordPage",
    calendar:"outbaseCalendarPage",
    project:"outbaseProjectPage",
    assets:"outbaseAssetsPage"
  };

  let renderingHome = false;

  function safe(value){
    if(typeof escapeHtml === "function") return escapeHtml(value);
    return String(value ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function addStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      :root{
        --life-green:#1f6f3a;
        --life-green-dark:#154b2d;
        --life-soft:#edf6ee;
        --life-cream:#fbfaf5;
        --life-card:#ffffff;
        --life-line:#e5ebe4;
        --life-text:#243127;
        --life-muted:#6d766d;
        --life-warn:#fff7ed;
        --life-danger:#fef2f2;
      }
      #homePage,.life-os-page{
        background:linear-gradient(180deg,#f4f8f2 0%,#fbfaf5 100%);
        padding-bottom:82px;
      }
      #${ROOT_ID},.life-os-page-inner{display:flex;flex-direction:column;gap:14px;}
      .life-card{
        background:var(--life-card);
        border:1px solid rgba(31,111,58,.08);
        border-radius:24px;
        padding:16px;
        box-shadow:0 10px 24px rgba(20,81,45,.08);
        color:var(--life-text);
      }
      .life-hero{
        background:
          radial-gradient(circle at 88% 0%,rgba(255,255,255,.7) 0 16%,transparent 17%),
          linear-gradient(135deg,#1f6f3a,#4f8f5b);
        color:#fff;
        overflow:hidden;
        position:relative;
        min-height:142px;
        display:flex;
        flex-direction:column;
        justify-content:space-between;
      }
      .life-hero-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;}
      .life-kicker{font-size:12px;letter-spacing:.08em;opacity:.9;margin-bottom:4px;}
      .life-title{font-size:24px;font-weight:850;line-height:1.25;}
      .life-hero-sub{font-size:13px;line-height:1.5;opacity:.92;margin-top:8px;max-width:78%;}
      .life-top-btn{
        border:1px solid rgba(255,255,255,.35);
        background:rgba(255,255,255,.18);
        color:#fff;
        border-radius:999px;
        padding:8px 10px;
        min-height:36px;
        font-size:12px;
        font-weight:800;
        white-space:nowrap;
      }
      .life-priority{
        background:var(--life-soft);
        border-left:5px solid var(--life-green);
        border-radius:18px;
        padding:13px;
        line-height:1.55;
      }
      .life-priority strong{display:block;color:var(--life-green-dark);font-size:15px;margin-bottom:4px;}
      .life-grid-4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;}
      .life-grid-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}
      .life-grid-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;}
      .life-shortcut,.life-nav-card{
        border:1px solid var(--life-line);
        border-radius:18px;
        background:#fff;
        color:var(--life-green-dark);
        padding:12px 6px;
        min-height:74px;
        font-size:13px;
        font-weight:850;
        text-align:center;
      }
      .life-shortcut span,.life-nav-card span{display:block;font-size:24px;margin-bottom:5px;}
      .life-section-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px;}
      .life-section-title{font-size:18px;font-weight:850;}
      .life-mini{
        border:1px solid var(--life-line);
        background:#fff;
        border-radius:18px;
        padding:12px;
        min-height:84px;
      }
      .life-mini-label{font-size:12px;color:var(--life-muted);margin-bottom:6px;}
      .life-mini-value{font-size:18px;font-weight:850;line-height:1.35;}
      .life-mini-note{font-size:12px;color:var(--life-muted);line-height:1.45;margin-top:6px;}
      .life-list{display:flex;flex-direction:column;gap:10px;}
      .life-row{
        display:flex;
        gap:10px;
        align-items:flex-start;
        border:1px solid var(--life-line);
        border-radius:18px;
        padding:12px;
        background:#fff;
      }
      .life-row-icon{font-size:25px;width:32px;flex:0 0 32px;text-align:center;}
      .life-row-title{font-weight:850;margin-bottom:3px;}
      .life-row-meta{font-size:13px;color:var(--life-muted);line-height:1.5;}
      .life-chip-row{display:flex;gap:8px;overflow-x:auto;padding-bottom:2px;}
      .life-chip{
        border:1px solid var(--life-line);
        background:#fff;
        border-radius:999px;
        padding:8px 12px;
        white-space:nowrap;
        color:var(--life-green-dark);
        font-weight:800;
        font-size:13px;
      }
      .life-bottom-nav{
        position:fixed;
        left:50%;
        transform:translateX(-50%);
        bottom:10px;
        width:min(680px,calc(100vw - 20px));
        display:grid;
        grid-template-columns:repeat(5,1fr);
        gap:2px;
        background:rgba(255,255,255,.95);
        border:1px solid rgba(31,111,58,.1);
        border-radius:22px;
        box-shadow:0 10px 22px rgba(20,81,45,.12);
        backdrop-filter:blur(10px);
        padding:8px;
        z-index:50;
      }
      .life-nav-btn{
        border:0;
        background:transparent;
        color:var(--life-muted);
        font-size:11px;
        font-weight:800;
        min-height:48px;
        padding:3px 0;
      }
      .life-nav-btn.is-active{color:var(--life-green-dark);}
      .life-nav-btn span{display:block;font-size:20px;margin-bottom:2px;}
      .life-primary{
        width:100%;
        border:0;
        border-radius:18px;
        background:linear-gradient(180deg,var(--life-green),var(--life-green-dark));
        color:#fff;
        padding:14px 12px;
        font-size:17px;
        font-weight:850;
        min-height:56px;
      }
      .life-secondary{
        width:100%;
        border:1px solid var(--life-line);
        border-radius:16px;
        background:#fff;
        color:var(--life-green-dark);
        padding:12px 10px;
        font-size:14px;
        font-weight:800;
        min-height:48px;
      }
      .life-sheet{
        position:fixed;
        inset:0;
        background:rgba(15,23,42,.56);
        z-index:9999;
        display:flex;
        align-items:flex-end;
        justify-content:center;
        padding:16px;
      }
      .life-sheet-card{
        width:min(680px,100%);
        background:#fff;
        border-radius:24px;
        padding:16px;
        box-shadow:0 20px 40px rgba(0,0,0,.2);
      }
      .life-sheet-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px;}
      .life-close{background:#b91c1c;color:#fff;border:0;border-radius:14px;padding:9px 12px;font-weight:800;}
      .life-hidden-file{display:none;}
      @media(max-width:520px){
        #homePage,.life-os-page{padding-left:14px;padding-right:14px;}
        .life-card{border-radius:22px;padding:15px;}
        .life-title{font-size:22px;}
        .life-grid-4{grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;}
        .life-shortcut{font-size:12px;min-height:70px;padding:10px 3px;}
        .life-shortcut span{font-size:22px;}
      }
    `;
    document.head.appendChild(style);
  }

  async function safeGetRecords(){
    try{
      if(typeof getRecords === "function") return await getRecords();
    }catch(error){ console.warn("v198 records skip",error); }
    return [];
  }

  async function safeGetStore(storeName){
    try{
      if(typeof getOutbaseStoreAll === "function") return await getOutbaseStoreAll(storeName);
    }catch(error){ console.warn("v198 store skip",storeName,error); }
    return [];
  }

  function readProjects(){
    try{
      const raw = localStorage.getItem("outbase_camp_projects_v1");
      return raw ? JSON.parse(raw) : [];
    }catch(error){
      return [];
    }
  }

  function currentProject(){
    const projects = readProjects();
    const id = localStorage.getItem("outbase_current_camp_project_id") || "";
    return projects.find(item=>item.id === id) || projects[0] || null;
  }

  function sortLatest(records){
    return (records || []).slice().sort((a,b)=>{
      return new Date(b.date || b.createdAt || b.created_at || 0) -
        new Date(a.date || a.createdAt || a.created_at || 0);
    });
  }

  function titleForRecord(record){
    if(!record) return "まだ記録なし";
    if(typeof getRecordTitle === "function") return getRecordTitle(record);
    return record.title || record.recordType || "記録";
  }

  async function collectData(){
    const records = await safeGetRecords();
    const inbox = await safeGetStore("inbox_items");
    const active = await safeGetStore("activeSessions");
    const project = currentProject();
    const latest = sortLatest(records)[0] || null;
    const activeCount = active.filter(item=>item.eventStatus === "active" || item.status === "active").length;
    const inboxCount = inbox.filter(item=>item.status !== "linked" && item.status !== "deleted" && item.status !== "done").length;
    return {records,inboxCount,activeCount,project,latest};
  }

  function priorityText(data){
    if(data.activeCount > 0){
      return {kind:"復旧",title:"未終了の記録があります",body:"先に復旧して、今日の記録を守ります。"};
    }
    if(data.project){
      return {kind:"予定",title:"次回キャンプを確認できます",body:"天気・買い物・ギア・当日メモをキャンプPJ側にまとめます。"};
    }
    if(data.inboxCount > 0){
      return {kind:"整理",title:"未整理素材があります",body:"急がなくて大丈夫。必要な時に素材画面で見返せます。"};
    }
    return {kind:"通常",title:"よく使うものはすぐ押せます",body:"コタ散歩は毎日提案しない。必要な時だけ注意として出します。"};
  }

  function buildNav(active){
    const items = [
      ["home","🏠","ホーム"],
      ["record","📝","記録"],
      ["calendar","📅","予定"],
      ["project","🗂️","PJ"],
      ["assets","📁","素材"]
    ];
    return `<nav class="life-bottom-nav">` + items.map(item=>{
      return `<button class="life-nav-btn ${active === item[0] ? "is-active" : ""}" onclick="showOutbaseLifePage('${item[0]}')"><span>${item[1]}</span>${item[2]}</button>`;
    }).join("") + `</nav>`;
  }

  function buildHome(data){
    const p = priorityText(data);
    const projectName = data.project?.campgroundName || data.project?.title || "未設定";
    const latestTitle = titleForRecord(data.latest);
    const latestMeta = data.latest ? (data.latest.date || data.latest.createdAt || "記録あり") : "散歩や素材を残すとここに表示";
    return `
      <div id="${ROOT_ID}">
        <section class="life-card life-hero">
          <div class="life-hero-top">
            <div>
              <div class="life-kicker">OUTBASE LIFE OS</div>
              <div class="life-title">今日を整理して、<br>大事なことだけ知らせる。</div>
              <div class="life-hero-sub">家族・ペット・予定・記録・素材・思い出をつなぐ入口。</div>
            </div>
            <button class="life-top-btn" onclick="showOutbaseManageMenu()">管理</button>
          </div>
        </section>

        <section class="life-card">
          <div class="life-priority">
            <strong>🌿 チャッピー：${safe(p.title)}</strong>
            ${safe(p.body)}
          </div>
        </section>

        <section class="life-card">
          <div class="life-section-head">
            <div class="life-section-title">すぐ使う</div>
            <div class="life-mini-note">毎日使うものは提案ではなく常設</div>
          </div>
          <div class="life-grid-4">
            <button class="life-shortcut" onclick="startWalk && startWalk()"><span>🐕</span>コタ散歩</button>
            <button class="life-shortcut" onclick="showOutbaseLifePage('record')"><span>📝</span>記録</button>
            <button class="life-shortcut" onclick="showOutbaseLifePage('calendar')"><span>📅</span>予定</button>
            <button class="life-shortcut" onclick="showOutbaseLifePage('assets')"><span>📁</span>素材</button>
          </div>
        </section>

        <section class="life-card">
          <div class="life-section-head">
            <div class="life-section-title">提案・注意</div>
            <div class="life-mini-note">忘れそう/危険/期限だけ強く出す</div>
          </div>
          <div class="life-grid-3">
            <div class="life-mini">
              <div class="life-mini-label">未整理</div>
              <div class="life-mini-value">${data.inboxCount}件</div>
              <div class="life-mini-note">多い時だけ整理提案</div>
            </div>
            <div class="life-mini">
              <div class="life-mini-label">次回キャンプ</div>
              <div class="life-mini-value">${safe(projectName)}</div>
              <div class="life-mini-note">準備はPJへ集約</div>
            </div>
            <div class="life-mini">
              <div class="life-mini-label">直近</div>
              <div class="life-mini-value">${safe(latestTitle)}</div>
              <div class="life-mini-note">${safe(latestMeta)}</div>
            </div>
          </div>
        </section>

        ${buildNav("home")}
      </div>
    `;
  }

  function ensurePage(id,title){
    let page = document.getElementById(id);
    if(page) return page;
    page = document.createElement("div");
    page.id = id;
    page.className = "page hidden life-os-page";
    page.innerHTML = `<div class="life-os-page-inner"><section class="life-card"><h1>${safe(title)}</h1></section></div>`;
    const firstScript = document.body.querySelector("script");
    document.body.insertBefore(page,firstScript || null);
    return page;
  }

  function hideAllPages(){
    document.querySelectorAll(".page").forEach(page=>page.classList.add("hidden"));
  }

  function toTop(){
    try{ window.scrollTo({top:0,behavior:"smooth"}); }
    catch(error){ window.scrollTo(0,0); }
  }

  async function renderHome(){
    if(renderingHome) return;
    renderingHome = true;
    addStyle();
    try{
      const home = document.getElementById("homePage");
      if(!home) return;
      const data = await collectData();
      home.innerHTML = buildHome(data);
      home.classList.remove("hidden");
    }finally{
      renderingHome = false;
    }
  }

  async function showLifePage(key){
    addStyle();
    hideAllPages();

    if(key === "home"){
      await renderHome();
      toTop();
      return;
    }

    const pageId = PAGE_IDS[key];
    const page = document.getElementById(pageId);
    if(page) page.classList.remove("hidden");

    if(key === "record") await renderRecordPage();
    if(key === "calendar") await renderCalendarPage();
    if(key === "project") await renderProjectPage();
    if(key === "assets") await renderAssetsPage();
    toTop();
  }

  function actionButton(label,onclick,primary){
    return `<button class="${primary ? "life-primary" : "life-secondary"}" onclick="${onclick}">${label}</button>`;
  }

  async function renderRecordPage(){
    const page = ensurePage(PAGE_IDS.record,"記録");
    page.innerHTML = `
      <div class="life-os-page-inner">
        <section class="life-card life-hero">
          <div class="life-kicker">RECORD</div>
          <div class="life-title">写真・音声・メモを<br>迷わず残す。</div>
          <div class="life-hero-sub">記録入力はここに集約。ホームには増やさない。</div>
        </section>
        <section class="life-card">
          <div class="life-grid-2">
            ${actionButton("＋ 記録入力を開く","showAssetCapturePage && showAssetCapturePage()",true)}
            ${actionButton("コタ散歩を開始","startWalk && startWalk()",false)}
          </div>
        </section>
        <section class="life-card">
          <div class="life-list">
            <div class="life-row"><div class="life-row-icon">📷</div><div><div class="life-row-title">撮影・取込</div><div class="life-row-meta">写真/動画/ファイルは記録入力から保存。</div></div></div>
            <div class="life-row"><div class="life-row-icon">🎤</div><div><div class="life-row-title">音声メモ</div><div class="life-row-meta">録音・文字起こし・手動追記を同じ場所に集約。</div></div></div>
            <div class="life-row"><div class="life-row-icon">📝</div><div><div class="life-row-title">手入力メモ</div><div class="life-row-meta">散歩・キャンプ・予定に後から紐付けできる前提。</div></div></div>
          </div>
        </section>
        ${buildNav("record")}
      </div>
    `;
  }

  async function renderCalendarPage(){
    const page = ensurePage(PAGE_IDS.calendar,"予定");
    page.innerHTML = `
      <div class="life-os-page-inner">
        <section class="life-card life-hero">
          <div class="life-kicker">CALENDAR</div>
          <div class="life-title">予定から、準備と注意に<br>つなげる。</div>
          <div class="life-hero-sub">Googleカレンダー連携前提。今は骨格確認。</div>
        </section>
        <section class="life-card">
          <div class="life-chip-row">
            <div class="life-chip">今日</div><div class="life-chip">今週</div><div class="life-chip">今月</div><div class="life-chip">年1回</div><div class="life-chip">数年</div>
          </div>
        </section>
        <section class="life-card">
          <div class="life-list">
            <div class="life-row"><div class="life-row-icon">🐕</div><div><div class="life-row-title">毎日：コタ散歩</div><div class="life-row-meta">提案しすぎない。ショートカット常設だけ。</div></div></div>
            <div class="life-row"><div class="life-row-icon">⛺</div><div><div class="life-row-title">近日：次回キャンプ</div><div class="life-row-meta">天気/買い物/ギア/ルートをPJに接続。</div></div></div>
            <div class="life-row"><div class="life-row-icon">🎂</div><div><div class="life-row-title">年1回：記念日・誕生日</div><div class="life-row-meta">早めに控えめ表示。期限が近い時だけ強く。</div></div></div>
            <div class="life-row"><div class="life-row-icon">🚗</div><div><div class="life-row-title">数年：車検・保険・家</div><div class="life-row-meta">忘れると困るものは注意喚起対象。</div></div></div>
          </div>
        </section>
        ${buildNav("calendar")}
      </div>
    `;
  }

  async function renderProjectPage(){
    const data = await collectData();
    const page = ensurePage(PAGE_IDS.project,"プロジェクト");
    const projectName = data.project?.campgroundName || data.project?.title || "次回キャンプ未設定";
    page.innerHTML = `
      <div class="life-os-page-inner">
        <section class="life-card life-hero">
          <div class="life-kicker">PROJECT</div>
          <div class="life-title">予定を、準備・記録・レビューへ。</div>
          <div class="life-hero-sub">キャンプから始めて、旅行/通院/車/家にも広げる。</div>
        </section>
        <section class="life-card">
          <div class="life-mini-label">現在の主プロジェクト</div>
          <div class="life-mini-value">${safe(projectName)}</div>
          <div class="life-mini-note">キャンプ準備は「キャンプPJ」として扱う。</div>
          <div style="height:10px"></div>
          ${actionButton("キャンプPJを開く/作る","openOutbaseCampPrep && openOutbaseCampPrep()",true)}
        </section>
        <section class="life-card">
          <div class="life-grid-2">
            <div class="life-mini"><div class="life-mini-label">準備</div><div class="life-mini-value">天気 / ギア / 買い物</div></div>
            <div class="life-mini"><div class="life-mini-label">当日</div><div class="life-mini-value">写真 / 音声 / メモ</div></div>
            <div class="life-mini"><div class="life-mini-label">レビュー</div><div class="life-mini-value">次回改善</div></div>
            <div class="life-mini"><div class="life-mini-label">将来</div><div class="life-mini-value">家・車・通院</div></div>
          </div>
        </section>
        ${buildNav("project")}
      </div>
    `;
  }

  async function renderAssetsPage(){
    const data = await collectData();
    const page = ensurePage(PAGE_IDS.assets,"素材");
    page.innerHTML = `
      <div class="life-os-page-inner">
        <section class="life-card life-hero">
          <div class="life-kicker">ASSETS</div
