/* =========================================================
   OUTBASE walkUI.js
   Phase C-2 v170: コタ散歩 実用UI
   - 大きいボタン・状態・最近の記録
   - 既存 walkQuickPanel は非表示化して重複を防ぐ
========================================================= */
(function(){
  "use strict";

  const C2 = window.OUTBASE_WALK_C2 || {};
  const core = C2.core || {};
  const eventsApi = C2.events || {};
  const PANEL_ID = "walkC2Panel";
  const STYLE_ID = "walkC2Style";

  function safe(value){
    return core.safeText ? core.safeText(value) : String(value ?? "");
  }

  function addStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .walk-c2-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:10px;}
      .walk-c2-btn{font-size:18px;padding:16px 8px;border-radius:14px;min-height:58px;}
      .walk-c2-btn-main{font-size:22px;font-weight:700;}
      .walk-c2-chip{display:inline-block;margin:4px 4px 0 0;padding:6px 9px;border-radius:999px;background:#f1f5f9;font-size:13px;}
      .walk-c2-list{display:flex;flex-direction:column;gap:8px;}
      .walk-c2-note{padding:9px;border-radius:10px;background:#f8fafc;}
    `;
    document.head.appendChild(style);
  }

  function hideOldPanel(){
    const old = document.getElementById("walkQuickPanel");
    if(old) old.style.display = "none";
  }

  function getEvents(){
    return eventsApi.getCurrentEvents ? eventsApi.getCurrentEvents() : [];
  }

  function getStatusHtml(list){
    const summary = core.summarizeEvents ? core.summarizeEvents(list) : {};
    const condition = core.buildConditionSummary ? core.buildConditionSummary(list) : "通常";
    return `
      <div class="detail-value">
        コタ散歩 / ${safe(condition)}<br>
        記録 ${summary.total || 0}件 ・ 💩 ${summary.poop || 0} ・ 💧 ${summary.pee || 0} ・ ⚠️ ${summary.danger || 0}
      </div>
      <div>
        <span class="walk-c2-chip">休憩 ${summary.rest || 0}</span>
        <span class="walk-c2-chip">抱っこ ${summary.carry || 0}</span>
        <span class="walk-c2-chip">犬友達 ${summary.friendDog || 0}</span>
        <span class="walk-c2-chip">スポット ${summary.spot || 0}</span>
      </div>
    `;
  }

  function getRecentHtml(list){
    if(!list.length) return "まだ記録なし";
    return `<div class="walk-c2-list">` + list.slice().reverse().slice(0,6).map(event=>{
      const emoji = core.getEventEmoji ? core.getEventEmoji(event.type) : "•";
      return `<div class="walk-c2-note">${emoji} ${safe(event.note || event.label)}<br><span class="note-time">${safe(event.time || "")}</span></div>`;
    }).join("") + `</div>`;
  }

  function button(label,type,note,main){
    const className = main ? "walk-c2-btn walk-c2-btn-main" : "walk-c2-btn";
    return `<button type="button" class="${className}" data-c2-type="${safe(type)}" data-c2-note="${safe(note || "")}">${safe(label)}</button>`;
  }

  function buildHtml(list){
    return `
      <h2>コタ散歩モード</h2>
      ${getStatusHtml(list)}
      <div class="detail-section">
        <div class="detail-title">今すぐ記録</div>
        <div class="walk-c2-grid">
          ${button("💩 うんち","poop","",true)}
          ${button("💧 おしっこ","pee","",true)}
          ${button("☕ 休憩","rest","",false)}
          ${button("抱っこ","carry","",false)}
          ${button("⚠️ 危険","danger","",false)}
          ${button("🥤 水分","water","水分補給",false)}
          ${button("☀️ 暑い","heat","暑さ注意",false)}
          ${button("💤 疲れ気味","mood_tired","疲れ気味",false)}
          ${button("🐾 足取り良い","mood_good","足取り良い",false)}
          ${button("🐶 犬友達","friend_dog","",false)}
          ${button("📍 スポット","spot","",false)}
        </div>
      </div>
      <div class="detail-section">
        <div class="detail-title">最近の記録</div>
        <div class="detail-value">${getRecentHtml(list)}</div>
      </div>
    `;
  }

  function bindButtons(panel){
    panel.querySelectorAll("[data-c2-type]").forEach(btn=>{
      btn.onclick = async ()=>{
        const type = btn.getAttribute("data-c2-type");
        const note = btn.getAttribute("data-c2-note") || undefined;
        if(eventsApi.add) await eventsApi.add(type,btn.textContent.trim(),note || undefined);
        renderPanel();
      };
    });
  }

  function renderPanel(){
    addStyle();
    hideOldPanel();
    const walkPage = document.getElementById("walkPage");
    if(!walkPage) return;
    let panel = document.getElementById(PANEL_ID);
    if(!panel){
      panel = document.createElement("div");
      panel.className = "card";
      panel.id = PANEL_ID;
      const first = walkPage.querySelector(".card");
      if(first && first.nextSibling) walkPage.insertBefore(panel,first.nextSibling);
      else walkPage.appendChild(panel);
    }
    const list = getEvents();
    panel.innerHTML = buildHtml(list);
    bindButtons(panel);
  }

  C2.ui = {renderPanel,hideOldPanel};
  window.OUTBASE_WALK_C2 = C2;
  window.renderWalkC2Panel = renderPanel;
})();
