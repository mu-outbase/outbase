/* =========================================================
   OUTBASE walkQuick.js
   Phase C v159: 散歩エンジン拡張
   - walk.js本体は触らない
   - 現地3秒操作を追加
   - 💩 / 💧 / 休憩 / 抱っこ / 危険 / 犬友達 / スポット
========================================================= */

(function(){
  "use strict";

  const PANEL_ID = "walkQuickPanel";
  const LIST_ID = "walkQuickEventList";
  const PREFIX = "outbase_walk_quick_events_";

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

    return "ob_" + Date.now() + "_" + Math.floor(Math.random()*100000);
  }

  function getWalkState(){
    if(typeof getAppState !== "function"){
      return null;
    }

    const state = getAppState();

    if(!state || state.eventType !== "walk" || !state.eventId){
      return null;
    }

    return state;
  }

  function getCurrentWalkId(){
    const state = getWalkState();
    return state ? state.eventId : "";
  }

  function getStorageKey(walkId){
    return PREFIX + walkId;
  }

  function readEvents(walkId){
    if(!walkId){
      return [];
    }

    try{
      const raw = localStorage.getItem(getStorageKey(walkId));
      return raw ? JSON.parse(raw) : [];
    }catch(error){
      console.error("散歩クイックイベント読込失敗",error);
      return [];
    }
  }

  function writeEvents(walkId,events){
    if(!walkId){
      return;
    }

    try{
      localStorage.setItem(getStorageKey(walkId),JSON.stringify(events || []));
    }catch(error){
      console.error("散歩クイックイベント保存失敗",error);
    }
  }

  function clearEvents(walkId){
    if(!walkId){
      return;
    }

    try{
      localStorage.removeItem(getStorageKey(walkId));
    }catch(error){
      console.error("散歩クイックイベント削除失敗",error);
    }
  }

  function getPromptText(type,label){
    if(type === "danger"){
      return prompt("危険メモを入力\n例：拾い食い注意、吠え、車通り多い","") || "";
    }

    if(type === "friend_dog"){
      return prompt("犬友達メモを入力\n例：柴犬のハルくん、公園で会った","") || "";
    }

    if(type === "spot"){
      return prompt("スポットメモを入力\n例：水飲み場、日陰、写真スポット","") || "";
    }

    return label;
  }

  function buildEvent(type,label){
    const now = new Date();
    const note = getPromptText(type,label);

    return {
      id:createIdSafe(),
      type:type,
      label:label,
      note:note,
      time:now.toLocaleString(),
      timestamp:now.toISOString()
    };
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

  async function syncEventsToActiveSession(walkId,events){
    if(!walkId || typeof getActiveSession !== "function" || typeof saveActiveSession !== "function"){
      return;
    }

    try{
      const session = await getActiveSession(walkId);

      if(!session){
        return;
      }

      const payload = {
        ...(session.payload || {}),
        quickEvents:events,
        behaviorEvents:events.filter(e=>["poop","pee","rest","carry","danger"].includes(e.type)),
        friendDogEvents:events.filter(e=>e.type === "friend_dog"),
        spotEvents:events.filter(e=>e.type === "spot"),
        quickEventCount:events.length
      };

      await saveActiveSession({
        ...session,
        payload:payload,
        eventType:session.eventType || "walk",
        eventStatus:session.eventStatus || (window.EVENT_STATUS ? EVENT_STATUS.ACTIVE : "継続中")
      });
    }catch(error){
      console.error("散歩クイックイベント同期失敗",error);
    }
  }

  async function addWalkQuickEvent(type,label){
    const walkId = getCurrentWalkId();

    if(!walkId){
      alert("散歩開始後に使えます");
      return;
    }

    const event = buildEvent(type,label);
    const events = readEvents(walkId);
    events.push(event);
    writeEvents(walkId,events);
    renderEventList();
    await syncEventsToActiveSession(walkId,events);
  }

  function createButton(label,type){
    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML = label;
    button.onclick = ()=>addWalkQuickEvent(type,label);
    return button;
  }

  function createPanel(){
    const walkPage = document.getElementById("walkPage");

    if(!walkPage || document.getElementById(PANEL_ID)){
      return;
    }

    const card = document.createElement("div");
    card.className = "card";
    card.id = PANEL_ID;
    card.innerHTML = `
      <h2>散歩クイック記録</h2>
      <div class="detail-value">現地で3秒以内に残す記録</div>
      <div id="walkQuickButtonArea" class="action-area"></div>
      <div class="detail-section">
        <div class="detail-title">記録イベント</div>
        <div id="${LIST_ID}" class="detail-value">記録なし</div>
      </div>
    `;

    const firstCard = walkPage.querySelector(".card");

    if(firstCard && firstCard.nextSibling){
      walkPage.insertBefore(card,firstCard.nextSibling);
    }else{
      walkPage.appendChild(card);
    }

    const area = document.getElementById("walkQuickButtonArea");

    [
      ["💩", "poop"],
      ["💧", "pee"],
      ["休憩", "rest"],
      ["抱っこ", "carry"],
      ["危険", "danger"],
      ["犬友達", "friend_dog"],
      ["スポット", "spot"]
    ].forEach(item=>{
      area.appendChild(createButton(item[0],item[1]));
    });
  }

  function renderEventList(){
    const list = document.getElementById(LIST_ID);

    if(!list){
      return;
    }

    const walkId = getCurrentWalkId();
    const events = readEvents(walkId);

    if(events.length === 0){
      list.innerHTML = "記録なし";
      return;
    }

    list.innerHTML = events
      .slice()
      .reverse()
      .map(event=>{
        return `<div class="record-row">${getEventEmoji(event.type)} ${safeText(event.note || event.label)}<br><span class="note-time">${safeText(event.time)}</span></div>`;
      })
      .join("");
  }

  function renderWalkQuickPanel(){
    createPanel();
    renderEventList();
  }

  function patchStartRestore(){
    if(typeof window.startWalk === "function" && !window.startWalk.__phaseCQuickPatched){
      const originalStartWalk = window.startWalk;

      window.startWalk = function(){
        const result = originalStartWalk.apply(this,arguments);
        setTimeout(()=>{
          const walkId = getCurrentWalkId();
          if(walkId){
            writeEvents(walkId,[]);
          }
          renderWalkQuickPanel();
        },300);
        return result;
      };

      window.startWalk.__phaseCQuickPatched = true;
    }

    if(typeof window.restoreWalkSession === "function" && !window.restoreWalkSession.__phaseCQuickPatched){
      const originalRestoreWalkSession = window.restoreWalkSession;

      window.restoreWalkSession = function(entry){
        const result = originalRestoreWalkSession.apply(this,arguments);
        const events = entry?.payload?.quickEvents || [];
        const walkId = getCurrentWalkId() || entry?.id || entry?.session_id;

        if(walkId && events.length > 0){
          writeEvents(walkId,events);
        }

        setTimeout(renderWalkQuickPanel,300);
        return result;
      };

      window.restoreWalkSession.__phaseCQuickPatched = true;
    }
  }

  function patchSaveRecord(){
    if(typeof window.saveRecord !== "function" || window.saveRecord.__phaseCQuickPatched){
      return;
    }

    const originalSaveRecord = window.saveRecord;

    window.saveRecord = async function(record){
      if(record && record.recordType === "walk"){
        const walkId = record.session?.id || getCurrentWalkId();
        const events = readEvents(walkId);

        record.quickEvents = events;
        record.behaviorEvents = events.filter(e=>["poop","pee","rest","carry","danger"].includes(e.type));
        record.friendDogEvents = events.filter(e=>e.type === "friend_dog");
        record.spotEvents = events.filter(e=>e.type === "spot");
        record.summary = {
          ...(record.summary || {}),
          quickEventCount:events.length,
          behaviorEventCount:record.behaviorEvents.length,
          friendDogEventCount:record.friendDogEvents.length,
          spotEventCount:record.spotEvents.length
        };

        const result = await originalSaveRecord.call(this,record);
        clearEvents(walkId);
        return result;
      }

      return originalSaveRecord.call(this,record);
    };

    window.saveRecord.__phaseCQuickPatched = true;
  }

  function setupWalkQuick(){
    patchStartRestore();
    patchSaveRecord();
    renderWalkQuickPanel();
  }

  window.addWalkQuickEvent = addWalkQuickEvent;
  window.renderWalkQuickPanel = renderWalkQuickPanel;
  window.addEventListener("load",()=>{
    setTimeout(setupWalkQuick,700);
  });
})();
