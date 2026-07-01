/* =========================================================
   OUTBASE homeUI.js
   UI v193: ホーム安定版
   - v192 UI情報設計に合わせ、ホームを「今日なにをするか決める場所」に固定
   - app.js / homeDashboard.js / campProject.js 本体は触らない
   - 旧DOM参照は outbaseDomGuard.js に任せる
========================================================= */
(function(){
  "use strict";

  const STYLE_ID = "outbaseHomeUIV193Style";
  const HOME_ROOT_ID = "outbaseHomeUIV193";
  const LEGACY_PANEL_IDS = [
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
        --ob-green-dark:#12462a;
        --ob-soft:#edf6ee;
        --ob-bg:#f7faf5;
        --ob-card:#ffffff;
        --ob-text:#233229;
        --ob-muted:#6f7a72;
        --ob-line:#e4ebe4;
        --ob-amber:#f59e0b;
      }
      #homePage{
        background:linear-gradient(180deg,#eff6ef 0%,#fbfaf5 100%);
        padding:16px 14px 92px;
      }
      #${HOME_ROOT_ID}{display:flex;flex-direction:column;gap:12px;max-width:680px;margin:0 auto;}
      .ob-card{background:var(--ob-card);border-radius:24px;border:1px solid rgba(31,111,58,.07);box-shadow:0 10px 26px rgba(20,81,45,.08);overflow:hidden;}
      .ob-hero-visual{min-height:132px;position:relative;padding:18px;color:#fff;display:flex;align-items:flex-end;background:radial-gradient(circle at 80% 18%,rgba(255,255,255,.78) 0 10%,transparent 11%),linear-gradient(140deg,#14512d,#2f7b49 62%,#6b9b6f);}
      .ob-hero-visual:before{content:"";position:absolute;left:-14px;right:-14px;bottom:-26px;height:86px;background:radial-gradient(ellipse at 25% 100%,#fbfaf5 0 45%,transparent 46%),radial-gradient(ellipse at 58% 100%,#eaf4ec 0 48%,transparent 49%),radial-gradient(ellipse at 88% 100%,#dcebd9 0 45%,transparent 46%);}
      .ob-hero-copy{position:relative;z-index:1;padding-right:72px;}
      .ob-kicker{font-size:12px;letter-spacing:.08em;opacity:.88;margin-bottom:5px;}
      .ob-hero-title{font-size:22px;font-weight:900;line-height:1.25;letter-spacing:.01em;}
      .ob-dog{position:absolute;right:20px;bottom:22px;z-index:2;font-size:46px;filter:drop-shadow(0 7px 12px rgba(0,0,0,.16));}
      .ob-hero-body{padding:16px;}
      .ob-chappy{background:var(--ob-soft);border-radius:18px;padding:12px 14px;color:var(--ob-green-dark);font-size:14px;line-height:1.55;margin-bottom:13px;}
      .ob-main{width:100%;border:0;border-radius:20px;min-height:62px;background:linear-gradient(180deg,var(--ob-green),var(--ob-green-dark));color:#fff;font-size:19px;font-weight:900;box-shadow:0 8px 18px rgba(31,111,58,.22);}
      .ob-sub-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px;}
      .ob-sub{min-height:72px;border:1px solid var(--ob-line);border-radius:18px;background:#fff;color:var(--ob-green-dark);font-size:13px;font-weight:900;padding:8px 4px;}
      .ob-sub span{display:block;font-size:22px;margin-bottom:3px;}
      .ob-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:14px;}
      .ob-box{border:1px solid var(--ob-line);border-radius:18px;background:#fff;padding:12px 13px;}
      .ob-label{font-size:12px;color:var(--ob-muted);margin-bottom:4px;}
      .ob-value{font-size:20px;font-weight:900;color:var(--ob-text);line-height:1.25;word-break:break-word;}
      .ob-latest{padding:14px;}
      .ob-head{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:10px;}
      .ob-title{font-size:19px;font-weight:900;color:var(--ob-text);}
      .ob-text-btn{border:0;background:transparent;color:var(--ob-green);font-weight:900;font-size:13px;padding:5px;}
      .ob-latest-card{display:flex;gap:12px;border-radius:18px;background:#f8faf7;padding:12px;color:var(--ob-text);align-items:center;}
      .ob-thumb{width:58px;height:58px;border-radius:16px;background:linear-gradient(135deg,#dcebd9,#f7eedf);display:grid;place-items:center;font-size:30px;flex:0 0 58px;}
      .ob-latest-title{font-weight:900;margin-bottom:3px;}
      .ob-meta{font-size:13px;color:var(--ob-muted);line-height:1.5;}
      .ob-drawer{border-top:1px solid var(--ob-line);margin-top:11px;padding-top:9px;}
      .ob-drawer summary{cursor:pointer;font-weight:900;color:var(--ob-green-dark);font-size:14px;}
      .ob-drawer-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:9px;}
      .ob-small{min-height:44px;border-radius:13px;border:1px solid var(--ob-line);background:#fff;color:var(--ob-text);font-weight:800;}
      .ob-bottom-nav{position:fixed;left:50%;transform:translateX(-50%);bottom:10px;width:min(680px,calc(100vw - 24px));display:grid;grid-template-columns:repeat(4,1fr);gap:2px;background:rgba(255,255,255,.95);backdrop-filter:blur(10px);border:1px solid rgba(31,111,58,.1);box-shadow:0 10px 24px rgba(20,81,45,.12);border-radius:22px;padding:8px;z-index:20;}
      .ob-nav{border:0;background:transparent;color:var(--ob-muted);font-size:12px;font-weight:800;padding:4px 0;}
      .ob-nav.is-active{color:var(--ob-green-dark);}
      .ob-nav span{display:block;font-size:20px;margin-bottom:2px;}
      @media(max-width:520px){#homePage{padding-left:14px;padding-right:14px}.ob-card{border-radius:22px}.ob-hero-visual{min-height:128px}.ob-hero-title{font-size:21px}.ob-dog{font-size:44px}.ob-sub{min-height:68px}}
    `;
    document.head.appendChild(style);
  }

  async function safeGetRecords(){
    try{
      if(typeof getRecords === "function") return await getRecords();
    }catch(error){
      console.warn("v193 records取得スキップ",error);
    }
    return [];
  }

  async function safeGetStore(storeName){
    try{
      if(typeof getOutbaseStoreAll === "function") return await getOutbaseStoreAll(storeName);
    }catch(error){
      console.warn("v193 " + storeName + " 取得スキップ",error);
    }
    return [];
  }

  function readProjects(){
    try{
      const raw = localStorage.getItem("outbase_camp_projects_v1");
      return raw ? JSON.parse(raw) : [];
    }catch(error){
      console.warn("v193 キャンプPJ取得スキップ",error);
      return [];
    }
  }

  function currentProject(){
    const projects = readProjects();
    const currentId = localStorage.getItem("outbase_current_camp_project_id") || "";
    return projects.find(item=>item.id === currentId) || projects[0] || null;
  }

  function newest(records){
    return (records || []).slice().sort((a,b)=>{
      return new Date(b.date || b.createdAt || b.created_at || 0) -
        new Date(a.date || a.createdAt || a.created_at || 0);
    })[0] || null;
  }

  function newestWalk(records){
    return (records || []).find(record=>record?.recordType === "walk") || null;
  }

  function recordTitle(record){
    if(!record) return "";
    return typeof getRecordTitle === "function" ? getRecordTitle(record) : (record.title || "記録");
  }

  function chappyText(data){
    if(data.activeCount > 0) return "未終了の記録があるよ。まず今日の記録を守ろう。";
    if(data.latestWalk) return "今日はまず散歩からでよさそう。コタの様子を軽く残しておこう。";
    if(data.inboxCount > 0) return "素材が少し溜まってるよ。あとで素材一覧で見返せるよ。";
    return "今日は最初の記録をひとつ残すところから始めよう。";
  }

  function latestCard(record){
    if(!record){
      return `
        <div class="ob-latest-card">
          <div class="ob-thumb">🐾</div>
          <div>
            <div class="ob-latest-title">最近の記録はまだありません</div>
            <div class="ob-meta">散歩を1回記録すると、ここに直近のまとめが出ます。</div>
          </div>
        </div>`;
    }

    const meta = [record.date || record.createdAt || "", record.walk?.time || "", record.walk?.distanceKm || ""].filter(Boolean).join(" / ");
    const open = record.id ? `showDetail && showDetail('${safe(record.id)}')` : "";
    return `
      <div class="ob-latest-card" onclick="${open}">
        <div class="ob-thumb">🐕</div>
        <div>
          <div class="ob-latest-title">${safe(recordTitle(record))}</div>
          <div class="ob-meta">${safe(meta || "見返せる記録があります")}</div>
        </div>
      </div>`;
  }

  function openCampPrep(){
    try{
      if(typeof createCampProjectFromKnowledge === "function"){
        createCampProjectFromKnowledge();
        setTimeout(renderHome,220);
        return;
      }
      if(typeof startCamp === "function") startCamp();
    }catch(error){
      console.warn("キャンプ準備導線失敗",error);
      if(typeof startCamp === "function") startCamp();
    }
  }

  function moreMenu(){
    return `
      <details class="ob-drawer">
        <summary>管理メニュー</summary>
        <div class="ob-drawer-grid">
          <button class="ob-small" onclick="showGearPage && showGearPage()">ギア管理</button>
          <button class="ob-small" onclick="showCampgroundPage && showCampgroundPage()">キャンプ場管理</button>
          <button class="ob-small" onclick="showCampRecordPage && showCampRecordPage()">キャンプ実績</button>
          <button class="ob-small" onclick="showWalkHistoryPage && showWalkHistoryPage()">散歩履歴</button>
        </div>
      </details>`;
  }

  function buildHome(data){
    const project = data.project;
    const nextCamp = project?.campgroundName || project?.title || "未設定";

    return `
      <div id="${HOME_ROOT_ID}">
        <section class="ob-card">
          <div class="ob-hero-visual">
            <div class="ob-hero-copy">
              <div class="ob-kicker">今日のOUTBASE</div>
              <div class="ob-hero-title">愛犬との一日を、<br>気持ちよく残す。</div>
            </div>
            <div class="ob-dog">🐕</div>
          </div>
          <div class="ob-hero-body">
            <div class="ob-chappy">🌿 チャッピー：${safe(chappyText(data))}</div>
            <button class="ob-main" onclick="startWalk && startWalk()">🚶 コタ散歩をはじめる</button>
            <div class="ob-sub-grid">
              <button class="ob-sub" onclick="openOutbaseCampPrep()"><span>⛺</span>キャンプ準備</button>
              <button class="ob-sub" onclick="showAssetInboxPage && showAssetInboxPage()"><span>📁</span>素材一覧</button>
              <button class="ob-sub" onclick="showWalkHistoryPage && showWalkHistoryPage()"><span>🕘</span>履歴</button>
            </div>
          </div>
        </section>

        <section class="ob-card ob-summary">
          <div class="ob-box">
            <div class="ob-label">未整理</div>
            <div class="ob-value">${data.inboxCount}件</div>
          </div>
          <div class="ob-box">
            <div class="ob-label">次回キャンプ</div>
            <div class="ob-value">${safe(nextCamp)}</div>
          </div>
        </section>

        <section class="ob-card ob-latest">
          <div class="ob-head">
            <div class="ob-title">直近のまとめ</div>
            <button class="ob-text-btn" onclick="showWalkHistoryPage && showWalkHistoryPage()">すべて見る</button>
          </div>
          ${latestCard(data.latestRecord)}
          ${moreMenu()}
        </section>

        <nav class="ob-bottom-nav">
          <button class="ob-nav is-active" onclick="renderHomeUIV193 && renderHomeUIV193()"><span>🏠</span>ホーム</button>
          <button class="ob-nav" onclick="startWalk && startWalk()"><span>📝</span>記録</button>
          <button class="ob-nav" onclick="openOutbaseCampPrep()"><span>⛺</span>準備</button>
          <button class="ob-nav" onclick="showAssetInboxPage && showAssetInboxPage()"><span>📁</span>素材</button>
        </nav>
      </div>`;
  }

  function removeLegacyPanels(){
    LEGACY_PANEL_IDS.forEach(id=>{
      const el = document.getElementById(id);
      if(el) el.remove();
    });
  }

  async function collectData(){
    const records = await safeGetRecords();
    const inbox = await safeGetStore("inbox_items");
    const active = await safeGetStore("activeSessions");

    return {
      records,
      latestRecord:newest(records),
      latestWalk:newestWalk(records),
      inboxCount:inbox.filter(item=>item.status !== "linked" && item.status !== "deleted" && item.status !== "done").length,
      activeCount:active.filter(item=>item.eventStatus === "active" || item.status === "active").length,
      project:currentProject()
    };
  }

  async function renderHome(){
    addStyle();
    if(typeof ensureOutbaseLegacyDomV191 === "function") ensureOutbaseLegacyDomV191();

    const page = document.getElementById("homePage");
    if(!page) return;

    const data = await collectData();
    page.innerHTML = buildHome(data);
    removeLegacyPanels();

    if(typeof ensureOutbaseLegacyDomV191 === "function") ensureOutbaseLegacyDomV191();
  }

  function patchEntrances(){
    if(typeof window.showPage === "function" && !window.showPage.__homeUIV193Patched){
      const original = window.showPage;
      window.showPage = function(pageId){
        const result = original.apply(this,arguments);
        if(pageId === "homePage"){
          setTimeout(renderHome,60);
          setTimeout(removeLegacyPanels,420);
        }
        return result;
      };
      window.showPage.__homeUIV193Patched = true;
    }

    if(typeof window.backToHome === "function" && !window.backToHome.__homeUIV193Patched){
      const original = window.backToHome;
      window.backToHome = function(){
        const result = original.apply(this,arguments);
        setTimeout(renderHome,60);
        return result;
      };
      window.backToHome.__homeUIV193Patched = true;
    }

    if(typeof window.renderAssetM0Panels === "function" && !window.renderAssetM0Panels.__homeUIV193Patched){
      const original = window.renderAssetM0Panels;
      window.renderAssetM0Panels = async function(){
        const result = await original.apply(this,arguments);
        removeLegacyPanels();
        return result;
      };
      window.renderAssetM0Panels.__homeUIV193Patched = true;
    }
  }

  function setupObserver(){
    const page = document.getElementById("homePage");
    if(!page || page.__homeUIV193Observed) return;

    const observer = new MutationObserver(()=>removeLegacyPanels());
    observer.observe(page,{childList:true,subtree:false});
    page.__homeUIV193Observed = true;
  }

  function setup(){
    patchEntrances();
    setupObserver();
    renderHome();
    setTimeout(renderHome,700);
    setTimeout(removeLegacyPanels,1600);
  }

  window.openOutbaseCampPrep = openCampPrep;
  window.renderHomeUIV193 = renderHome;
  window.removeLegacyHomePanelsV193 = removeLegacyPanels;

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded",setup);
  }else{
    setup();
  }

  window.addEventListener("load",()=>{
    setTimeout(setup,280);
    setTimeout(removeLegacyPanels,1400);
  });
})();
