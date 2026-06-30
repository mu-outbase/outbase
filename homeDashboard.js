/* =========================================================
   OUTBASE homeDashboard.js
   Phase B v155: ホーム・インボックス導線
   - app.jsは700行超過防止のため触らない
   - ホーム画面へカードを動的追加する
========================================================= */

(function(){
  "use strict";

  const DASHBOARD_ID = "phaseBHomeDashboard";

  function safeHtml(value){
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

  function getArrayCount(value){
    return Array.isArray(value) ? value.length : 0;
  }

  async function safeGetRecords(){
    try{
      if(typeof getRecords === "function"){
        return await getRecords();
      }
    }catch(error){
      console.error("records取得失敗",error);
    }

    return [];
  }

  async function safeGetActiveSessions(){
    try{
      if(typeof getActiveSessions === "function"){
        return await getActiveSessions();
      }
    }catch(error){
      console.error("activeSessions取得失敗",error);
    }

    return [];
  }

  async function safeGetStore(storeName){
    try{
      if(typeof getOutbaseStoreAll === "function"){
        return await getOutbaseStoreAll(storeName);
      }
    }catch(error){
      console.warn(storeName + "取得スキップ",error);
    }

    return [];
  }

  function isOpenSession(session){
    if(typeof isActiveSession === "function"){
      return isActiveSession(session);
    }

    return session &&
      (session.eventStatus === "active" ||
       session.status === "active" ||
       session.payload?.currentSession?.status === "active" ||
       session.payload?.currentCampSession?.status === "active");
  }

  function getLatestRecord(records){
    if(!Array.isArray(records) || records.length === 0){
      return null;
    }

    return records
      .slice()
      .sort((a,b)=>new Date(b.date || b.created_at || 0) - new Date(a.date || a.created_at || 0))[0];
  }

  function getLatestRecordText(record){
    if(!record){
      return "最近の記録はまだありません";
    }

    const title = typeof getRecordTitle === "function"
      ? getRecordTitle(record)
      : (record.title || "散歩記録");
    const date = record.date || record.created_at || "日時不明";

    return safeHtml(title) + "<br>" + safeHtml(date);
  }

  function buildChappyText(data){
    if(data.activeCount > 0){
      return "未終了の記録があるよ。まず復旧するか、終了して保存しよう。";
    }

    if(data.inboxCount > 0){
      return "未整理の記録が残ってるよ。あとでまとめて整理できるようにしておくね。";
    }

    if(data.reviewCount > 0){
      return "レビュー候補があるよ。次回の改善メモに育てられるよ。";
    }

    if(data.recordCount === 0){
      return "まずは散歩を1回記録して、OUTBASEの土台を育てよう。";
    }

    return "今日は記録を増やすより、最近の記録を見返すだけでも次につながるよ。";
  }

  function buildTaskRows(data){
    const rows = [];

    if(data.activeCount > 0){
      rows.push("未終了記録：" + data.activeCount + "件");
    }

    if(data.inboxCount > 0){
      rows.push("未整理インボックス：" + data.inboxCount + "件");
    }

    if(data.reviewCount > 0){
      rows.push("レビュー候補：" + data.reviewCount + "件");
    }

    if(rows.length === 0){
      rows.push("今すぐ対応が必要なものはありません");
    }

    rows.push("次に使うなら：散歩開始 / 散歩履歴 / キャンプ実績確認");

    return rows;
  }

  function createActionButton(label,onClick){
    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML = label;
    button.onclick = onClick;
    return button;
  }

  function renderActionButtons(container){
    const area = document.createElement("div");
    area.className = "action-area";

    area.appendChild(createActionButton("散歩開始",()=>{
      if(typeof startWalk === "function") startWalk();
    }));

    area.appendChild(createActionButton("散歩履歴",()=>{
      if(typeof showWalkHistoryPage === "function") showWalkHistoryPage();
    }));

    area.appendChild(createActionButton("キャンプ実績",()=>{
      if(typeof showCampRecordPage === "function") showCampRecordPage();
    }));

    area.appendChild(createActionButton("ギア管理",()=>{
      if(typeof showGearPage === "function") showGearPage();
    }));

    container.appendChild(area);
  }

  function buildDashboardHtml(data){
    const taskRows = buildTaskRows(data)
      .map(text=>"<div class='record-row'>" + safeHtml(text) + "</div>")
      .join("");

    return `
      <div class="card" id="${DASHBOARD_ID}">
        <h1>今日やること</h1>
        <div class="stats-grid">
          <div class="stat-box">未終了<br>${data.activeCount}件</div>
          <div class="stat-box">未整理<br>${data.inboxCount}件</div>
          <div class="stat-box">レビュー<br>${data.reviewCount}件</div>
          <div class="stat-box">記録<br>${data.recordCount}回</div>
        </div>
        <div class="detail-section">
          <div class="detail-title">優先タスク</div>
          ${taskRows}
        </div>
        <div class="detail-section">
          <div class="detail-title">未整理インボックス</div>
          <div class="detail-value">${data.inboxCount}件</div>
        </div>
        <div class="detail-section">
          <div class="detail-title">チャッピーの一言</div>
          <div class="detail-value">${safeHtml(buildChappyText(data))}</div>
        </div>
        <div class="detail-section">
          <div class="detail-title">最新記録</div>
          <div class="detail-value">${getLatestRecordText(data.latestRecord)}</div>
        </div>
      </div>
    `;
  }

  function insertDashboard(html){
    const homePage = document.getElementById("homePage");

    if(!homePage){
      return null;
    }

    const oldDashboard = document.getElementById(DASHBOARD_ID);

    if(oldDashboard){
      oldDashboard.remove();
    }

    const temp = document.createElement("div");
    temp.innerHTML = html.trim();
    const dashboard = temp.firstElementChild;

    const firstCard = homePage.querySelector(".card");

    if(firstCard && firstCard.nextSibling){
      homePage.insertBefore(dashboard,firstCard.nextSibling);
    }else{
      homePage.appendChild(dashboard);
    }

    return dashboard;
  }

  async function renderPhaseBHomeDashboard(){
    const records = await safeGetRecords();
    const activeSessions = await safeGetActiveSessions();
    const inboxItems = await safeGetStore("inbox_items");
    const reviewItems = await safeGetStore("review_items");

    const data = {
      recordCount:getArrayCount(records),
      activeCount:activeSessions.filter(isOpenSession).length,
      inboxCount:inboxItems.filter(item=>item.status !== "done" && item.status !== "deleted").length,
      reviewCount:reviewItems.filter(item=>item.status !== "done" && item.status !== "deleted").length,
      latestRecord:getLatestRecord(records)
    };

    const dashboard = insertDashboard(buildDashboardHtml(data));

    if(dashboard){
      renderActionButtons(dashboard);
    }
  }

  function setupPhaseBHomeDashboard(){
    setTimeout(()=>{
      renderPhaseBHomeDashboard();
    },500);
  }

  window.renderPhaseBHomeDashboard = renderPhaseBHomeDashboard;
  window.addEventListener("load",setupPhaseBHomeDashboard);
})();
