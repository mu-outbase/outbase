/* =========================================================
   OUTBASE walkHistory.js
   Phase C-2 v170: 散歩履歴・ホーム見返し強化
   - 履歴にイベント/次回注意を表示
   - ホームに直近散歩レビューを表示
========================================================= */
(function(){
  "use strict";

  const C2 = window.OUTBASE_WALK_C2 || {};
  const core = C2.core || {};
  const review = C2.review || {};
  const HOME_ID = "walkC2LastReviewHome";

  function safe(value){
    return core.safeText ? core.safeText(value) : String(value ?? "");
  }

  function getEvents(record){
    return core.getEventsFromRecord ? core.getEventsFromRecord(record) : [];
  }

  function getReview(record){
    if(record?.walkReviewC2) return record.walkReviewC2;
    if(record?.walk?.review) return record.walk.review;
    return core.buildWalkReview ? core.buildWalkReview(record,getEvents(record)) : null;
  }

  function filterWalkRecords(records){
    const keyword = (document.getElementById("walkHistorySearchInput")?.value || "").trim().toLowerCase();
    const sort = document.getElementById("walkHistorySortSelect")?.value || "new";
    let list = (records || []).filter(record=>{
      const type = typeof getRecordType === "function" ? getRecordType(record) : record.recordType;
      if(type !== "walk") return false;
      if(!keyword) return true;
      return JSON.stringify(record).toLowerCase().includes(keyword);
    });
    list.sort((a,b)=>{
      if(sort === "old") return new Date(a.date || 0) - new Date(b.date || 0);
      return new Date(b.date || 0) - new Date(a.date || 0);
    });
    return list;
  }

  function cardHtml(record){
    const title = typeof getRecordTitle === "function" ? getRecordTitle(record) : (record.title || "散歩記録");
    const walk = record.walk || {};
    const events = getEvents(record);
    const summary = core.summarizeEvents ? core.summarizeEvents(events) : {};
    const rev = getReview(record);
    const hints = (rev?.nextHints || []).slice(0,2).map(h=>`<div class="record-row">次回：${safe(h)}</div>`).join("");
    return `
      <div class="record" onclick="showDetail('${safe(record.id)}')">
        <div class="record-title">🐾 ${safe(title)}</div>
        <div class="record-row">📅 ${safe(record.date || "")}</div>
        <div class="record-row">🚶 ${safe(walk.time || "00:00:00")} / 📏 ${safe(walk.distanceKm || "0.00km")}</div>
        <div class="record-row">コタ：${safe(rev?.condition || "通常")}</div>
        <div class="record-row">記録 ${summary.total || 0}件 / ⚠️ ${summary.danger || 0} / 🐶 ${summary.friendDog || 0} / 📍 ${summary.spot || 0}</div>
        ${hints}
      </div>
    `;
  }

  async function renderEnhancedHistory(){
    const container = document.getElementById("walkHistoryList");
    if(!container || typeof getRecords !== "function") return;
    try{
      const records = filterWalkRecords(await getRecords());
      container.innerHTML = records.length ? records.map(cardHtml).join("") : "散歩履歴なし";
    }catch(error){
      console.error(error);
      container.innerHTML = "散歩履歴読み込みエラー";
    }
  }

  function patchHistory(){
    window.renderWalkHistoryList = renderEnhancedHistory;
  }

  function renderHomeReview(){
    const home = document.getElementById("homePage");
    if(!home || !review.getLastReviewHtml) return;
    let panel = document.getElementById(HOME_ID);
    if(!panel){
      panel = document.createElement("div");
      panel.className = "card";
      panel.id = HOME_ID;
      const target = document.getElementById("phaseBHomeDashboard") || home.querySelector(".card");
      if(target && target.nextSibling) home.insertBefore(panel,target.nextSibling);
      else home.appendChild(panel);
    }
    panel.innerHTML = `<h2>直近の散歩まとめ</h2>${review.getLastReviewHtml()}`;
  }

  C2.history = {patchHistory,renderEnhancedHistory,renderHomeReview};
  window.OUTBASE_WALK_C2 = C2;
  window.renderWalkC2HomeReview = renderHomeReview;
})();
