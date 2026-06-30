/* =========================================================
   OUTBASE walkReview.js
   Phase C-2 v170: 散歩レビュー・次回注意
   - 保存時に walkReviewC2 / nextHints を付与
   - 保存後ホーム表示用に直近レビューを残す
========================================================= */
(function(){
  "use strict";

  const C2 = window.OUTBASE_WALK_C2 || {};
  const core = C2.core || {};
  const eventsApi = C2.events || {};
  const LAST_KEY = "outbase_walk_c2_last_review";

  function getEventsForRecord(record){
    const id = record?.session?.id || (core.getActiveWalkId ? core.getActiveWalkId() : "");
    if(eventsApi.readEvents && id) return eventsApi.readEvents(id);
    return core.getEventsFromRecord ? core.getEventsFromRecord(record) : [];
  }

  function saveLastReview(record,review){
    try{
      localStorage.setItem(LAST_KEY,JSON.stringify({
        recordId:record?.id || "",
        title:record?.title || "散歩記録",
        date:record?.date || new Date().toLocaleString(),
        review:review
      }));
    }catch(error){
      console.error("散歩レビュー一時保存失敗",error);
    }
  }

  function readLastReview(){
    try{
      const raw = localStorage.getItem(LAST_KEY);
      return raw ? JSON.parse(raw) : null;
    }catch(error){
      return null;
    }
  }

  function enrichRecord(record){
    if(!record || record.recordType !== "walk") return record;
    const list = getEventsForRecord(record);
    const review = core.buildWalkReview ? core.buildWalkReview(record,list) : null;
    record.quickEvents = list;
    record.walk = {
      ...(record.walk || {}),
      events:list,
      review:review,
      nextHints:review?.nextHints || []
    };
    record.walkReviewC2 = review;
    record.nextHints = review?.nextHints || [];
    record.summary = {
      ...(record.summary || {}),
      quickEventCount:list.length,
      walkCondition:review?.condition || "通常",
      nextHintCount:record.nextHints.length
    };
    saveLastReview(record,review);
    return record;
  }

  function patchSaveRecord(){
    if(typeof window.saveRecord !== "function" || window.saveRecord.__phaseC2ReviewPatched) return;
    const original = window.saveRecord;
    window.saveRecord = async function(record){
      if(record && record.recordType === "walk") enrichRecord(record);
      return original.call(this,record);
    };
    window.saveRecord.__phaseC2ReviewPatched = true;
  }

  function getLastReviewHtml(){
    const last = readLastReview();
    if(!last || !last.review) return "直近の散歩レビューなし";
    const safe = core.safeText || (v=>String(v ?? ""));
    const hints = (last.review.nextHints || []).slice(0,3)
      .map(h=>`<div class="record-row">・${safe(h)}</div>`).join("");
    return `
      <div class="detail-value">
        ${safe(last.title)}<br>
        ${safe(last.review.dog || "コタ")}：${safe(last.review.condition || "通常")}
      </div>
      <div class="detail-section">
        <div class="detail-title">次回注意</div>
        <div class="detail-value">${hints || "大きな注意なし"}</div>
      </div>
    `;
  }

  C2.review = {patchSaveRecord,enrichRecord,readLastReview,getLastReviewHtml};
  window.OUTBASE_WALK_C2 = C2;
})();
