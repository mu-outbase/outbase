/* =========================================================
   OUTBASE homeUI.js
   UI v189: OUTBASEらしいホーム再設計
   - ホームを機能一覧/テスト画面から、今日の判断画面へ戻す
   - app.js / homeDashboard.js / campProject.js 本体は触らない
========================================================= */
(function(){
  "use strict";

  const STYLE_ID = "outbaseHomeUIV189Style";
  const HOME_LOCK_ID = "outbaseHomeUIV189";
  const REMOVE_HOME_PANEL_IDS = [
    "phaseBHomeDashboard",
    "phaseDCampProjectPanel",
    "assetM0HomePanel"
  ];

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
        --ob-green:#1f6f3a;
        --ob-green-dark:#14512d;
        --ob-green-soft:#eaf4ec;
        --ob-cream:#fbfaf5;
        --ob-card:#ffffff;
        --ob-text:#26332b;
        --ob-muted:#6b776f;
        --ob-line:#e6ebe6;
        --ob-warn:#fff7ed;
      }
      #homePage{
        background:linear-gradient(180deg,#f5f8f3 0%,#fbfaf5 100%);
        padding-bottom:76px;
      }
      #${HOME_LOCK_ID}{
        display:flex;
        flex-direction:column;
        gap:14px;
      }
      .ob-home-card{
        background:var(--ob-card);
        border-radius:24px;
        padding:18px;
        box-shadow:0 10px 26px rgba(20,81,45,.08);
        border:1px solid rgba(31,111,58,.07);
      }
      .ob-hero{
        overflow:hidden;
        padding:0;
      }
      .ob-hero-visual{
        min-height:150px;
        background:
          radial-gradient(circle at 78% 16%,rgba(255,255,255,.82) 0 10%,transparent 11%),
          linear-gradient(140deg,rgba(31,111,58,.95),rgba(55,119,73,.76)),
          linear-gradient(120deg,#dbe9d7,#f7f3e8);
        position:relative;
        display:flex;
        align-items:flex-end;
        padding:18px;
        color:#fff;
      }
      .ob-hero-visual:before{
        content:"";
        position:absolute;
        left:-14px;
        right:-14px;
        bottom:-22px;
        height:82px;
        background:
          radial-gradient(ellipse at 24% 100%,#f4f7ee 0 45%,transparent 46%),
          radial-gradient(ellipse at 55% 100%,#e5efe4 0 48%,transparent 49%),
          radial-gradient(ellipse at 84% 100%,#d7e6d5 0 45%,transparent 46%);
      }
      .ob-hero-copy{
        position:relative;
        z-index:1;
      }
      .ob-kicker{
        font-size:13px;
        letter-spacing:.08em;
        opacity:.88;
        margin-bottom:4px;
      }
      .ob-hero-title{
        font-size:24px;
        font-weight:800;
        line-height:1.2;
      }
      .ob-hero-dog{
        position:absolute;
        right:20px;
        bottom:22px;
        z-index:2;
        font-size:54px;
        filter:drop-shadow(0 6px 12px rgba(0,0,0,.18));
      }
      .ob-hero-body{
        padding:18px;
      }
      .ob-chappy{
        background:var(--ob-green-soft);
        border-radius:18px;
        padding:12px 14px;
        color:var(--ob-green-dark);
        font-size:15px;
        line-height:1.6;
        margin-bottom:14px;
      }
      .ob-main-action{
        width:100%;
        border:0;
        border-radius:20px;
        min-height:66px;
        background:linear-gradient(180deg,var(--ob-green),var(--ob-green-dark));
        color:#fff;
        font-size:20px;
        font-weight:800;
        letter-spacing:.02em;
        box-shadow:0 8px 18px rgba(31,111,58,.22);
      }
      .ob-action-grid{
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:10px;
        margin-top:12px;
      }
      .ob-sub-action{
        min-height:82px;
        border:1px solid var(--ob-line);
        border-radius:18px;
        background:#fff;
        color:var(--ob-green-dark);
        font-weight:800;
        font-size:14px;
        padding:10px 6px;
      }
      .ob-sub-icon{
        display:block;
        font-size:24px;
        margin-bottom:4px;
      }
      .ob-mini-grid{
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:10px;
      }
      .ob-mini-box{
        border:1px solid var(--ob-line);
        border-radius:18px;
        padding:13px;
        background:#fff;
      }
      .ob-mini-label{
        font-size:12px;
        color:var(--ob-muted);
        margin-bottom:4px;
      }
      .ob-mini-value{
        color:var(--ob-text);
        font-size:20px;
        font-weight:800;
      }
      .ob-section-head{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        margin-bottom:10px;
      }
      .ob-section-title{
        font-size:20px;
        font-weight:800;
        color:var(--ob-text);
      }
      .ob-link-btn{
        border:0;
        background:transparent;
        color:var(--ob-green);
        font-weight:800;
        font-size:13px;
        padding:6px;
      }
      .ob-latest-card{
        display:flex;
        gap:12px;
        align-items:flex-start;
        border-radius:18px;
        background:#f8faf7;
        padding:12px;
        color:var(--ob-text);
      }
      .ob-latest-thumb{
        flex:0 0 64px;
        width:64px;
        height:64px;
        border-radius:16px;
        background:linear-gradient(135deg,#dbe9d7,#f5eedf);
        display:grid;
        place-items:center;
        font-size:32px;
      }
      .ob-latest-title{
        font-weight:800;
        margin-bottom:4px;
      }
      .ob-latest-meta{
        color:var(--ob-muted);
        font-size:13px;
        line-height:1.5;
      }
      .ob-more{
        border-top:1px solid var(--ob-line);
        margin-top:12px;
        padding-top:10px;
      }
      .ob-more summary{
        cursor:pointer;
        font-weight:800;
        color:var(--ob-green-dark);
      }
      .ob-more-grid{
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:8px;
        margin-top:10px;
      }
      .ob-small-action{
        min-height:46px;
        border-radius:12px;
        border:1px solid var(--ob-line);
        background:#fff;
        color:var(--ob-text);
        font-weight:700;
      }
      .ob-bottom-nav{
        position:fixed;
        left:50%;
        transform:translateX(-50%);
        bottom:10px;
        width:min(680px,calc(100vw - 24px));
        background:rgba(255,255,255,.94);
        backdrop-filter:blur(10px);
        border:1px solid rgba(31,111,58,.1);
        box-shadow:0 10px 24px rgba(20,81,45,.12);
        border-radius:22px;
        display:grid;
        grid-template-columns:repeat(4,1fr);
        gap:2px;
        padding:8px;
        z-index:20;
      }
      .ob-nav-btn{
        border:0;
        background:transparent;
        color:var(--ob-muted);
        font-size:12px;
        font-weight:700;
        padding:4px 0;
      }
      .ob-nav-btn.is-active{color:var(--ob-green-dark);}
      .ob-nav-icon{display:block;font-size:20px;margin-bottom:2px;}
      .ob-muted-note{
        color:var(--ob-muted);
        font-size:12px;
        text-align:center;
        padding:4px 0 0;
      }
      @media(max-width:520px){
        #homePage{padding-left:14px;padding-right:14px;}
        .ob-home-card{padding:16px;border-radius:22px;}
        .ob-hero-visual{min-height:138px;}
        .ob-hero-title{font-size:22px;}
        .ob-hero-dog{font-size:48px;}
        .ob-action-grid{grid-template-columns:repeat(3,minmax(0,1fr));}
        .ob-sub-action{min-height:76px;font-size:13px;}
      }
    `;
    document.head.appendChild(style);
  }

  async function safeGetRecords(){
    try{
      if(typeof getRecords === "function") return await getRecords();
    }catch(error){
      console.warn("v189 records取得スキップ",error);
    }
    return [];
  }

  async function safeGetStore(storeName){
    try{
      if(typeof getOutbaseStoreAll === "function") return await getOutbaseStoreAll(storeName);
    }catch(error){
      console.warn("v189 " + storeName + "取得スキップ",error);
    }
    return [];
  }

  function readCampProjects(){
    try{
      const raw = localStorage.getItem("outbase_camp_projects_v1");
      return raw ? JSON.parse(raw) : [];
    }catch(error){
      console.warn("v189 キャンプPJ取得スキップ",error);
      return [];
    }
  }

  function pickCurrentCampProject(){
    const projects = readCampProjects();
    const currentId = localStorage.getItem("outbase_current_camp_project_id") || "";
    return projects.find(item=>item.id === currentId) || projects[0] || null;
  }

  function getLatestRecord(records){
    return (records || []).slice().sort((a,b)=>{
      return new Date(b.date || b.createdAt || b.created_at || 0) -
        new Date(a.date || a.createdAt || a.created_at || 0);
    })[0] || null;
  }

  function getWalkDistance(record){
    return record?.walk?.distanceKm || record?.summary?.distanceKm || "";
  }

  function getWalkTime(record){
    return record?.walk?.time || "";
  }

  function buildChappyText(data){
    if(data.activeCount > 0){
      return "未終了の記録があるよ。まず復旧して、今日の記録を守ろう。";
    }
    if(data.latestWalk){
      return "今日はまず散歩からでよさそう。コタの様子を軽く残しておこう。";
    }
    if(data.inboxCount > 0){
      return "素材が少し溜まってるよ。あとで素材一覧でまとめて見返せるよ。";
    }
    return "今日は最初の記録をひとつ残すところから始めよう。";
  }

  function buildLatestHtml(record){
    if(!record){
      return `
        <div class="ob-latest-card">
          <div class="ob-latest-thumb">🐾</div>
          <div>
            <div class="ob-latest-title">まだ最近の記録はありません</div>
            <div class="ob-latest-meta">散歩を1回記録すると、ここに直近のまとめが出ます。</div>
          </div>
        </div>
      `;
    }

    const title = typeof getRecordTitle === "function" ? getRecordTitle(record) : (record.title || "記録");
    const date = record.date || record.createdAt || "";
    const meta = [date, getWalkTime(record), getWalkDistance(record)].filter(Boolean).join(" / ");
    return `
      <div class="ob-latest-card" onclick="${record.id ? `showDetail && showDetail('${safe(record.id)}')` : ""}">
        <div class="ob-latest-thumb">🐕</div>
        <div>
          <div class="ob-latest-title">${safe(title)}</div>
          <div class="ob-latest-meta">${safe(meta || "見返せる記録があります")}</div>
        </div>
      </div>
    `;
  }

  function buildMoreMenu(){
    return `
      <details class="ob-more">
        <summary>管理メニュー</summary>
        <div class="ob-more-grid">
          <button class="ob-small-action" onclick="showGearPage && showGearPage()">ギア管理</button>
          <button class="ob-small-action" onclick="showCampgroundPage && showCampgroundPage()">キャンプ場管理</button>
          <button class="ob-small-action" onclick="showCampRecordPage && showCampRecordPage()">キャンプ実績</button>
          <button class="ob-small-action" onclick="showWalkHistoryPage && showWalkHistoryPage()">散歩履歴</button>
        </div>
      </details>
    `;
  }

  function campPrepAction(){
    try{
      if(typeof createCampProjectFromKnowledge === "function"){
        createCampProjectFromKnowledge();
        setTimeout(renderHome,200);
        return;
      }
      if(typeof startCamp === "function") startCamp();
    }catch(error){
      console.warn("キャンプ準備導線失敗",error);
      if(typeof startCamp === "function") startCamp();
    }
  }

  window.openOutbaseCampPrep = campPrepAction;

  function buildHomeHtml(data){
    const project = data.currentCampProject;
    const nextCamp = project?.campgroundName || project?.title || "未設定";
    const chappy = buildChappyText(data);

    return `
      <div id="${HOME_LOCK_ID}">
        <section class="ob-home-card ob-hero">
          <div class="ob-hero-visual">
            <div class="ob-hero-copy">
              <div class="ob-kicker">今日のOUTBASE</div>
              <div class="ob-hero-title">愛犬との一日を、<br>気持ちよく残す。</div>
            </div>
            <div class="ob-hero-dog">🐕</div>
          </div>
          <div class="ob-hero-body">
            <div class="ob-chappy">🌿 チャッピー：${safe(chappy)}</div>
            <button class="ob-main-action" onclick="startWalk && startWalk()">🚶 コタ散歩をはじめる</button>
            <div class="ob-action-grid">
              <button class="ob-sub-action" onclick="openOutbaseCampPrep()"><span class="ob-sub-icon">⛺</span>キャンプ準備</button>
              <button class="ob-sub-action" onclick="showAssetInboxPage && showAssetInboxPage()"><span class="ob-sub-icon">📁</span>素材一覧</button>
              <button class="ob-sub-action" onclick="showWalkHistoryPage && showWalkHistoryPage()"><span class="ob-sub-icon">🕘</span>履歴</button>
            </div>
          </div>
        </section>

        <section class="ob-home-card">
          <div class="ob-mini-grid">
            <div class="ob-mini-box">
              <div class="ob-mini-label">未整理</div>
              <div class="ob-mini-value">${data.inboxCount}件</div>
            </div>
            <div class="ob-mini-box">
              <div class="ob-mini-label">次回キャンプ</div>
              <div class="ob-mini-value">${safe(nextCamp)}</div>
            </div>
          </div>
        </section>

        <section class="ob-home-card">
          <div class="ob-section-head">
            <div class="ob-section-title">直近のまとめ</div>
            <button class="ob-link-btn" onclick="showWalkHistoryPage && showWalkHistoryPage()">すべて見る</button>
          </div>
          ${buildLatestHtml(data.latestRecord)}
          ${buildMoreMenu()}
        </section>

        <div class="ob-muted-note">保存基盤：IndexedDB / DB v6</div>

        <nav class="ob-bottom-nav">
          <button class="ob-nav-btn is-active" onclick="renderHomeUIV189 && renderHomeUIV189()"><span class="ob-nav-icon">🏠</span>ホーム</button>
          <button class="ob-nav-btn" onclick="startWalk && startWalk()"><span class="ob-nav-icon">📝</span>記録</button>
          <button class="ob-nav-btn" onclick="openOutbaseCampPrep()"><span class="ob-nav-icon">⛺</span>準備</button>
          <button class="ob-nav-btn" onclick="showAssetInboxPage && showAssetInboxPage()"><span class="ob-nav-icon">📁</span>素材</button>
        </nav>
      </div>
    `;
  }

  function removeLegacyHomePanels(){
    REMOVE_HOME_PANEL_IDS.forEach(id=>{
      const el = document.getElementById(id);
      if(el) el.remove();
    });
  }

  async function collectHomeData(){
    const records = await safeGetRecords();
    const inboxItems = await safeGetStore("inbox_items");
    const activeSessions = await safeGetStore("activeSessions");
    const latestRecord = getLatestRecord(records);
    const latestWalk = records.find(record=>record?.recordType === "walk") || null;

    return {
      recordCount:records.length,
      inboxCount:inboxItems.filter(item=>item.status !== "linked" && item.status !== "deleted" && item.status !== "done").length,
      activeCount:activeSessions.filter(item=>item.eventStatus === "active" || item.status === "active").length,
      latestRecord,
      latestWalk,
      currentCampProject:pickCurrentCampProject()
    };
  }

  async function renderHome(){
    addStyle();
    const homePage = document.getElementById("homePage");
    if(!homePage) return;

    const data = await collectHomeData();
    homePage.innerHTML = buildHomeHtml(data);
    removeLegacyHomePanels();
  }

  function patchHomeEntrances(){
    if(typeof window.showPage === "function" && !window.showPage.__homeUIV189Patched){
      const originalShowPage = window.showPage;
      window.showPage = function(pageId){
        const result = originalShowPage.apply(this,arguments);
        if(pageId === "homePage"){
          setTimeout(renderHome,60);
          setTimeout(removeLegacyHomePanels,400);
        }
        return result;
      };
      window.showPage.__homeUIV189Patched = true;
    }

    if(typeof window.backToHome === "function" && !window.backToHome.__homeUIV189Patched){
      const originalBackToHome = window.backToHome;
      window.backToHome = function(){
        const result = originalBackToHome.apply(this,arguments);
        setTimeout(renderHome,60);
        return result;
      };
      window.backToHome.__homeUIV189Patched = true;
    }

    if(typeof window.renderAssetM0Panels === "function" && !window.renderAssetM0Panels.__homeUIV189Patched){
      const originalRenderAssets = window.renderAssetM0Panels;
      window.renderAssetM0Panels = async function(){
        const result = await originalRenderAssets.apply(this,arguments);
        removeLegacyHomePanels();
        return result;
      };
      window.renderAssetM0Panels.__homeUIV189Patched = true;
    }
  }

  function setupObserver(){
    const homePage = document.getElementById("homePage");
    if(!homePage || homePage.__homeUIV189Observed) return;

    const observer = new MutationObserver(()=>{
      removeLegacyHomePanels();
    });
    observer.observe(homePage,{childList:true,subtree:false});
    homePage.__homeUIV189Observed = true;
  }

  function setup(){
    patchHomeEntrances();
    setupObserver();
    renderHome();
    setTimeout(renderHome,700);
    setTimeout(renderHome,1200);
    setTimeout(removeLegacyHomePanels,2200);
  }

  window.renderHomeUIV189 = renderHome;
  window.removeLegacyHomePanelsV189 = removeLegacyHomePanels;

  if(document.readyState === "loading"){
    window.addEventListener("DOMContentLoaded",setup);
  }else{
    setup();
  }

  window.addEventListener("load",()=>{
    setTimeout(setup,300);
    setTimeout(removeLegacyHomePanels,1400);
  });
})();
