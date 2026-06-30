/* =========================================================
   OUTBASE detailQuick.js
   Phase C v161: 散歩クイック記録 詳細表示
   - detail.js本体は触らない
   - 保存済みquickEventsを記録詳細へ追加表示する
========================================================= */

(function(){
  "use strict";

  const SECTION_ID = "phaseCQuickDetailSection";

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

  async function getRecordForDetail(id){
    try{
      if(typeof getRecordById === "function"){
        return await getRecordById(id);
      }

      if(typeof getRecords === "function"){
        const records = await getRecords();
        return records.find(record=>record.id === id) || null;
      }
    }catch(error){
      console.error("クイック記録詳細取得失敗",error);
    }

    return null;
  }

  function getQuickEvents(record){
    if(!record){
      return [];
    }

    if(Array.isArray(record.quickEvents)){
      return record.quickEvents;
    }

    const merged = [];

    if(Array.isArray(record.behaviorEvents)){
      merged.push(...record.behaviorEvents);
    }

    if(Array.isArray(record.friendDogEvents)){
      merged.push(...record.friendDogEvents);
    }

    if(Array.isArray(record.spotEvents)){
      merged.push(...record.spotEvents);
    }

    return merged;
  }

  function getEventEmoji(type){
    const map = {
      poop:"💩",
      pee:"💧",
      rest:"☕",
      carry:"抱",
      danger:"⚠️",
      friend_dog:"🐶",
      spot:"📍"
    };

    return map[type] || "•";
  }

  function getEventLabel(event){
    if(!event){
      return "";
    }

    return event.note || event.label || event.type || "クイック記録";
  }

  function countEvents(events,typeList){
    return events.filter(event=>typeList.includes(event.type)).length;
  }

  function buildSummaryHtml(events){
    const behaviorCount = countEvents(events,["poop","pee","rest","carry","danger"]);
    const friendDogCount = countEvents(events,["friend_dog"]);
    const spotCount = countEvents(events,["spot"]);

    return `
      <div class="stats-grid">
        <div class="stat-box">合計<br>${events.length}件</div>
        <div class="stat-box">行動<br>${behaviorCount}件</div>
        <div class="stat-box">犬友達<br>${friendDogCount}件</div>
        <div class="stat-box">スポット<br>${spotCount}件</div>
      </div>
    `;
  }

  function buildEventListHtml(events){
    if(events.length === 0){
      return "クイック記録なし";
    }

    return events.map(event=>{
      return `
        <div class="note-item">
          ${getEventEmoji(event.type)} ${safeText(getEventLabel(event))}
          <div class="note-time">${safeText(event.time || event.timestamp || "")}</div>
        </div>
      `;
    }).join("");
  }

  function buildSectionHtml(record){
    const events = getQuickEvents(record);

    return `
      <div class="detail-section" id="${SECTION_ID}">
        <div class="detail-title">🐾 散歩クイック記録（${events.length}件）</div>
        <div class="detail-value">
          ${buildSummaryHtml(events)}
          <div class="detail-section">
            <div class="detail-title">記録イベント</div>
            ${buildEventListHtml(events)}
          </div>
        </div>
      </div>
    `;
  }

  function insertSection(record){
    const detailView = document.getElementById("detailViewArea");

    if(!detailView){
      return;
    }

    const oldSection = document.getElementById(SECTION_ID);
    if(oldSection){
      oldSection.remove();
    }

    const temp = document.createElement("div");
    temp.innerHTML = buildSectionHtml(record).trim();
    const section = temp.firstElementChild;
    const developerSection = Array.from(detailView.querySelectorAll(".detail-section"))
      .find(item=>item.textContent.includes("開発情報"));

    if(developerSection){
      detailView.insertBefore(section,developerSection);
    }else{
      const actionArea = detailView.querySelector(".action-area");
      if(actionArea){
        detailView.insertBefore(section,actionArea);
      }else{
        detailView.appendChild(section);
      }
    }
  }

  function patchShowDetail(){
    if(typeof window.showDetail !== "function" || window.showDetail.__phaseCDetailQuickPatched){
      return;
    }

    const originalShowDetail = window.showDetail;

    window.showDetail = async function(id){
      const result = await originalShowDetail.apply(this,arguments);
      const record = await getRecordForDetail(id);
      insertSection(record);
      return result;
    };

    window.showDetail.__phaseCDetailQuickPatched = true;
  }

  window.renderQuickEventsInDetail = async function(id){
    const record = await getRecordForDetail(id);
    insertSection(record);
  };

  window.addEventListener("load",()=>{
    setTimeout(patchShowDetail,700);
  });
})();
