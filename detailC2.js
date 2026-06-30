/* =========================================================
   OUTBASE detailC2.js
   Phase C-2 v173: 散歩レビュー詳細表示
   - detail.js / detailQuick.js 本体は触らない
   - 保存済み walkReviewC2 / nextHints を記録詳細へ追加表示する
========================================================= */
(function(){
  "use strict";

  const SECTION_ID = "phaseC2WalkDetailSection";

  function getC2(){
    return window.OUTBASE_WALK_C2 || {};
  }

  function safeText(value){
    const core = getC2().core || {};
    if(core.safeText) return core.safeText(value);
    if(typeof escapeHtml === "function") return escapeHtml(value);
    return String(value ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function asArray(value){
    return Array.isArray(value) ? value : [];
  }

  async function getRecordForDetail(id){
    try{
      if(typeof getRecordById === "function") return await getRecordById(id);
      if(typeof getRecords === "function"){
        const records = await getRecords();
        return records.find(record=>record.id === id) || null;
      }
    }catch(error){
      console.error("Phase C-2 詳細レビュー取得失敗",error);
    }
    return null;
  }

  function getEvents(record){
    const core = getC2().core || {};
    if(core.getEventsFromRecord) return core.getEventsFromRecord(record);
    return asArray(record?.quickEvents || record?.walk?.events);
  }

  function getReview(record){
    const core = getC2().core || {};
    if(record?.walkReviewC2) return record.walkReviewC2;
    if(record?.walk?.review) return record.walk.review;
    if(core.buildWalkReview) return core.buildWalkReview(record,getEvents(record));
    return null;
  }

  function getSummary(record,review){
    const core = getC2().core || {};
    if(review?.eventSummary) return review.eventSummary;
    if(core.summarizeEvents) return core.summarizeEvents(getEvents(record));
    return {total:getEvents(record).length};
  }

  function statBox(label,value){
    return `<div class="stat-box">${safeText(label)}<br>${safeText(value)}件</div>`;
  }

  function buildSummaryHtml(summary){
    return `
      <div class="stats-grid">
        ${statBox("合計",summary.total || 0)}
        ${statBox("危険",summary.danger || 0)}
        ${statBox("犬友達",summary.friendDog || 0)}
        ${statBox("スポット",summary.spot || 0)}
      </div>
      <div class="stats-grid">
        ${statBox("暑さ",summary.heat || 0)}
        ${statBox("水分",summary.water || 0)}
        ${statBox("休憩",summary.rest || 0)}
        ${statBox("抱っこ",summary.carry || 0)}
      </div>
    `;
  }

  function buildHintsHtml(hints){
    const list = asArray(hints);
    if(list.length === 0) return "大きな注意なし";
    return list.map(hint=>`<div class="record-row">・${safeText(hint)}</div>`).join("");
  }

  function buildEventMiniHtml(events){
    const core = getC2().core || {};
    const list = asArray(events).slice().reverse().slice(0,6);
    if(list.length === 0) return "イベントなし";
    return list.map(event=>{
      const emoji = core.getEventEmoji ? core.getEventEmoji(event.type) : "•";
      const text = event.note || event.label || event.type || "記録";
      return `<div class="note-item">${emoji} ${safeText(text)}<div class="note-time">${safeText(event.time || event.timestamp || "")}</div></div>`;
    }).join("");
  }

  function buildSectionHtml(record){
    if(!record || record.recordType !== "walk") return "";
    const review = getReview(record);
    const events = getEvents(record);
    const summary = getSummary(record,review);
    const condition = review?.condition || record?.summary?.walkCondition || "通常";
    const dog = review?.dog || "コタ";
    const hints = review?.nextHints || record?.nextHints || record?.walk?.nextHints || [];

    return `
      <div class="detail-section" id="${SECTION_ID}">
        <div class="detail-title">🐾 コタ散歩レビュー</div>
        <div class="detail-value">
          ${safeText(dog)}：${safeText(condition)}<br>
          時間：${safeText(review?.time || record?.walk?.time || "00:00:00")} / 距離：${safeText(review?.distanceKm || record?.walk?.distanceKm || "0.00km")}
        </div>
        ${buildSummaryHtml(summary)}
        <div class="detail-section">
          <div class="detail-title">次回注意</div>
          <div class="detail-value">${buildHintsHtml(hints)}</div>
        </div>
        <div class="detail-section">
          <div class="detail-title">最近の散歩イベント</div>
          <div class="detail-value">${buildEventMiniHtml(events)}</div>
        </div>
      </div>
    `;
  }

  function insertSection(record){
    const detailView = document.getElementById("detailViewArea");
    if(!detailView || !record || record.recordType !== "walk") return;
    const old = document.getElementById(SECTION_ID);
    if(old) old.remove();
    const html = buildSectionHtml(record).trim();
    if(!html) return;
    const temp = document.createElement("div");
    temp.innerHTML = html;
    const section = temp.firstElementChild;
    const quickSection = document.getElementById("phaseCQuickDetailSection");
    const developerSection = Array.from(detailView.querySelectorAll(".detail-section"))
      .find(item=>item.textContent.includes("開発情報"));
    const actionArea = detailView.querySelector(".action-area");
    if(quickSection) detailView.insertBefore(section,quickSection);
    else if(developerSection) detailView.insertBefore(section,developerSection);
    else if(actionArea) detailView.insertBefore(section,actionArea);
    else detailView.appendChild(section);
  }

  function patchShowDetail(){
    if(typeof window.showDetail !== "function" || window.showDetail.__phaseC2DetailPatched) return;
    const original = window.showDetail;
    window.showDetail = async function(id){
      const result = await original.apply(this,arguments);
      const record = await getRecordForDetail(id);
      insertSection(record);
      return result;
    };
    window.showDetail.__phaseC2DetailPatched = true;
  }

  window.renderWalkC2Detail = async function(id){
    const record = await getRecordForDetail(id);
    insertSection(record);
  };

  window.addEventListener("load",()=>{
    setTimeout(patchShowDetail,1700);
  });
})();
