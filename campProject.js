/* =========================================================
   OUTBASE campProject.js
   Phase D v164: キャンプPJ・キャンプ場ナレッジ導線
   - camp.js本体は触らない
   - campgrounds / camp records から次回候補を自動作成
   - 手入力台帳ではなく候補化・準備導線を追加
========================================================= */

(function(){
  "use strict";

  const PROJECT_KEY = "outbase_camp_projects_v1";
  const CURRENT_KEY = "outbase_current_camp_project_id";
  const HOME_PANEL_ID = "phaseDCampProjectPanel";
  const CAMP_PANEL_ID = "phaseDCampLiveProjectPanel";

  function safeText(value){
    if(typeof escapeHtml === "function"){
      return escapeHtml(value);
    }

    return String(value ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function createIdSafe(){
    if(typeof createId === "function"){
      return createId();
    }

    return "cp_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
  }

  function nowText(){
    return new Date().toLocaleString();
  }

  function readProjects(){
    try{
      const raw = localStorage.getItem(PROJECT_KEY);
      return raw ? JSON.parse(raw) : [];
    }catch(error){
      console.error("キャンプPJ読込失敗",error);
      return [];
    }
  }

  function writeProjects(projects){
    try{
      localStorage.setItem(PROJECT_KEY,JSON.stringify(projects || []));
    }catch(error){
      console.error("キャンプPJ保存失敗",error);
    }
  }

  function getCurrentProjectId(){
    return localStorage.getItem(CURRENT_KEY) || "";
  }

  function setCurrentProjectId(id){
    if(id){
      localStorage.setItem(CURRENT_KEY,id);
    }
  }

  function getCurrentProject(){
    const id = getCurrentProjectId();
    const projects = readProjects();

    return projects.find(project=>project.id === id) || projects[0] || null;
  }

  function saveProject(project){
    const projects = readProjects();
    const index = projects.findIndex(item=>item.id === project.id);

    if(index >= 0){
      projects[index] = project;
    }else{
      projects.unshift(project);
    }

    writeProjects(projects);
    setCurrentProjectId(project.id);
    return project;
  }

  async function safeGetRecords(){
    try{
      if(typeof getRecords === "function"){
        return await getRecords();
      }
    }catch(error){
      console.error("キャンプ記録取得失敗",error);
    }

    return [];
  }

  async function safeGetCampgrounds(){
    try{
      if(typeof getAllCampgrounds === "function"){
        return await getAllCampgrounds();
      }
    }catch(error){
      console.warn("キャンプ場DB取得スキップ",error);
    }

    return [];
  }

  function isCampRecord(record){
    return record && record.recordType === "camp";
  }

  function sortByNewest(list){
    return (list || []).slice().sort((a,b)=>{
      return new Date(b.date || b.updatedAt || 0) - new Date(a.date || a.updatedAt || 0);
    });
  }

  function getCampgroundNameFromRecord(record){
    const camp = record?.camp || {};
    return camp.campgroundName || camp.siteName || record?.title || "";
  }

  function getCampgroundName(campground){
    return campground?.name || "キャンプ場未設定";
  }

  function getTopCampground(campgrounds,records){
    const sortedCampgrounds = (campgrounds || []).slice().sort((a,b)=>{
      return (b.stats?.visitCount || 0) - (a.stats?.visitCount || 0);
    });

    if(sortedCampgrounds.length > 0){
      return sortedCampgrounds[0];
    }

    const campRecords = sortByNewest((records || []).filter(isCampRecord));
    if(campRecords.length > 0){
      return {
        name:getCampgroundNameFromRecord(campRecords[0]),
        stats:{visitCount:1}
      };
    }

    return null;
  }

  function makeChecklist(campgroundName){
    return [
      {label:"予約内容確認",status:"todo"},
      {label:"天気・風・気温確認",status:"todo"},
      {label:"犬可・ルール確認",status:"todo"},
      {label:"買い物リスト確認",status:"todo"},
      {label:"ギア候補確認",status:"todo"},
      {label:"ルート・寄り道候補確認",status:"todo"},
      {label:"設営・撤収の前回改善確認",status:"todo"},
      {label:(campgroundName || "キャンプ場") + "の過去メモ確認",status:"todo"}
    ];
  }

  async function createProjectFromKnowledge(){
    const records = await safeGetRecords();
    const campgrounds = await safeGetCampgrounds();
    const topCampground = getTopCampground(campgrounds,records);
    const latestCamp = sortByNewest(records.filter(isCampRecord))[0] || null;

    const campgroundName =
      getCampgroundName(topCampground) ||
      getCampgroundNameFromRecord(latestCamp) ||
      "次回キャンプ候補";

    const project = {
      id:createIdSafe(),
      title:"次回キャンプ準備",
      campgroundName:campgroundName,
      status:"candidate",
      source:"campground_knowledge",
      sourceRecordId:latestCamp?.id || "",
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString(),
      memos:[],
      checklist:makeChecklist(campgroundName)
    };

    saveProject(project);
    await renderCampProjectHome();
    renderCampProjectLive();
    alert("キャンプPJ候補を作成しました\n" + campgroundName);
  }

  function addMemoToProject(kind,label){
    const project = getCurrentProject();

    if(!project){
      alert("先にキャンプPJ候補を作成してください");
      return;
    }

    const memo = prompt(label + "を入力", "");

    if(memo === null || memo.trim() === ""){
      return;
    }

    project.memos = Array.isArray(project.memos) ? project.memos : [];
    project.memos.unshift({
      id:createIdSafe(),
      kind:kind,
      label:label,
      text:memo.trim(),
      time:nowText()
    });

    project.updatedAt = new Date().toISOString();
    saveProject(project);
    renderCampProjectLive();
    renderCampProjectHome();
  }

  function getChecklistHtml(project){
    if(!project || !Array.isArray(project.checklist) || project.checklist.length === 0){
      return "チェック候補なし";
    }

    return project.checklist.map(item=>{
      return `<div class="record-row">□ ${safeText(item.label)}</div>`;
    }).join("");
  }

  function getMemoHtml(project){
    if(!project || !Array.isArray(project.memos) || project.memos.length === 0){
      return "メモなし";
    }

    return project.memos.slice(0,5).map(memo=>{
      return `
        <div class="note-item">
          ${safeText(memo.label)}：${safeText(memo.text)}
          <div class="note-time">${safeText(memo.time || "")}</div>
        </div>
      `;
    }).join("");
  }

  function buildKnowledgeHtml(campgrounds,records){
    const campRecords = (records || []).filter(isCampRecord);
    const dogCount = campgrounds.filter(cg=>cg.conditions?.dogFriendly).length;
    const hotWaterCount = campgrounds.filter(cg=>cg.conditions?.hotWater).length;
    const top = getTopCampground(campgrounds,records);

    return `
      <div class="stats-grid">
        <div class="stat-box">キャンプ実績<br>${campRecords.length}件</div>
        <div class="stat-box">登録キャンプ場<br>${campgrounds.length}件</div>
        <div class="stat-box">犬可<br>${dogCount}件</div>
        <div class="stat-box">温水<br>${hotWaterCount}件</div>
      </div>
      <div class="detail-section">
        <div class="detail-title">候補化元</div>
        <div class="detail-value">${safeText(top ? getCampgroundName(top) : "候補なし")}</div>
      </div>
    `;
  }

  function buildProjectHtml(project){
    if(!project){
      return `
        <div class="detail-section">
          <div class="detail-title">現在のキャンプPJ</div>
          <div class="detail-value">候補未作成</div>
        </div>
      `;
    }

    return `
      <div class="detail-section">
        <div class="detail-title">現在のキャンプPJ</div>
        <div class="detail-value">
          ${safeText(project.title || "次回キャンプ準備")}<br>
          キャンプ場：${safeText(project.campgroundName || "未設定")}<br>
          状態：${safeText(project.status || "candidate")}
        </div>
      </div>
      <div class="detail-section">
        <div class="detail-title">準備候補</div>
        <div class="detail-value">${getChecklistHtml(project)}</div>
      </div>
    `;
  }

  async function renderCampProjectHome(){
    const homePage = document.getElementById("homePage");
    if(!homePage){
      return;
    }

    const oldPanel = document.getElementById(HOME_PANEL_ID);
    if(oldPanel){
      oldPanel.remove();
    }

    const records = await safeGetRecords();
    const campgrounds = await safeGetCampgrounds();
    const project = getCurrentProject();

    const panel = document.createElement("div");
    panel.className = "card";
    panel.id = HOME_PANEL_ID;
    panel.innerHTML = `
      <h1>キャンププロジェクト</h1>
      <div class="detail-value">予約・準備・キャンプ場ナレッジの入口</div>
      ${buildKnowledgeHtml(campgrounds,records)}
      ${buildProjectHtml(project)}
      <div class="action-area" id="campProjectHomeActions"></div>
    `;

    const target = document.getElementById("phaseBHomeDashboard") ||
      homePage.querySelector(".card");

    if(target && target.nextSibling){
      homePage.insertBefore(panel,target.nextSibling);
    }else{
      homePage.appendChild(panel);
    }

    renderHomeButtons();
  }

  function renderHomeButtons(){
    const area = document.getElementById("campProjectHomeActions");
    if(!area){
      return;
    }

    area.innerHTML = "";

    area.appendChild(makeButton("候補を自動作成",createProjectFromKnowledge));
    area.appendChild(makeButton("キャンプ開始",()=>typeof startCamp === "function" && startCamp()));
    area.appendChild(makeButton("キャンプ場管理",()=>typeof showCampgroundPage === "function" && showCampgroundPage()));
    area.appendChild(makeButton("キャンプ実績",()=>typeof showCampRecordPage === "function" && showCampRecordPage()));
  }

  function makeButton(label,handler){
    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML = label;
    button.onclick = handler;
    return button;
  }

  function getLiveCampName(){
    const input = document.getElementById("campSiteNameInput");
    return input ? input.value.trim() : "";
  }

  function renderCampProjectLive(){
    const campPage = document.getElementById("campPage");
    if(!campPage){
      return;
    }

    const oldPanel = document.getElementById(CAMP_PANEL_ID);
    if(oldPanel){
      oldPanel.remove();
    }

    const project = getCurrentProject();
    const campName = getLiveCampName() || project?.campgroundName || "キャンプ場未設定";

    const panel = document.createElement("div");
    panel.className = "card";
    panel.id = CAMP_PANEL_ID;
    panel.innerHTML = `
      <h2>キャンプPJ連携</h2>
      <div class="detail-value">
        現在候補：${safeText(project?.title || "未作成")}<br>
        キャンプ場：${safeText(campName)}
      </div>
      <div class="detail-section">
        <div class="detail-title">準備・予約メモ</div>
        <div class="detail-value">${getMemoHtml(project)}</div>
      </div>
      <div class="action-area" id="campProjectLiveActions"></div>
    `;

    const firstCard = campPage.querySelector(".card");
    if(firstCard && firstCard.nextSibling){
      campPage.insertBefore(panel,firstCard.nextSibling);
    }else{
      campPage.appendChild(panel);
    }

    renderLiveButtons();
  }

  function renderLiveButtons(){
    const area = document.getElementById("campProjectLiveActions");
    if(!area){
      return;
    }

    area.innerHTML = "";

    area.appendChild(makeButton("予約メモ",()=>addMemoToProject("reservation","予約メモ")));
    area.appendChild(makeButton("準備メモ",()=>addMemoToProject("preparation","準備メモ")));
    area.appendChild(makeButton("ルート寄り道",()=>addMemoToProject("route","ルート・寄り道メモ")));
    area.appendChild(makeButton("天気メモ",()=>addMemoToProject("weather","天気メモ")));
  }

  function patchCampStart(){
    if(typeof window.continueCampStart === "function" && !window.continueCampStart.__phaseDProjectPatched){
      const originalContinueCampStart = window.continueCampStart;

      window.continueCampStart = function(){
        const result = originalContinueCampStart.apply(this,arguments);
        setTimeout(renderCampProjectLive,300);
        return result;
      };

      window.continueCampStart.__phaseDProjectPatched = true;
    }
  }

  function setupCampProject(){
    patchCampStart();
    renderCampProjectHome();
    renderCampProjectLive();
  }

  window.createCampProjectFromKnowledge = createProjectFromKnowledge;
  window.renderCampProjectHome = renderCampProjectHome;
  window.renderCampProjectLive = renderCampProjectLive;

  window.addEventListener("load",()=>{
    setTimeout(setupCampProject,900);
  });
})();
