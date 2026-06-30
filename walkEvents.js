/* =========================================================
   OUTBASE walkEvents.js
   Phase C-2 v170: 散歩イベント Store/入力
   - 既存 walkQuick.js の保存キーを利用
   - localStorageは進行中セッション用、一時保管のみ
========================================================= */
(function(){
  "use strict";

  const C2 = window.OUTBASE_WALK_C2 || {};
  const core = C2.core || {};
  const PREFIX = "outbase_walk_quick_events_";

  function getWalkId(){
    return core.getActiveWalkId ? core.getActiveWalkId() : "";
  }

  function getKey(walkId){
    return PREFIX + walkId;
  }

  function readEvents(walkId){
    if(!walkId) return [];
    try{
      const raw = localStorage.getItem(getKey(walkId));
      const events = raw ? JSON.parse(raw) : [];
      return core.normalizeEvents ? core.normalizeEvents(events) : events;
    }catch(error){
      console.error("Phase C-2 散歩イベント読込失敗",error);
      return [];
    }
  }

  function writeEvents(walkId,events){
    if(!walkId) return;
    try{
      const list = core.normalizeEvents ? core.normalizeEvents(events) : (events || []);
      localStorage.setItem(getKey(walkId),JSON.stringify(list));
    }catch(error){
      console.error("Phase C-2 散歩イベント保存失敗",error);
    }
  }

  async function syncActiveSession(walkId,events){
    if(!walkId || typeof getActiveSession !== "function" || typeof saveActiveSession !== "function") return;
    try{
      const session = await getActiveSession(walkId);
      if(!session) return;
      const list = core.normalizeEvents ? core.normalizeEvents(events) : (events || []);
      const payload = {
        ...(session.payload || {}),
        quickEvents:list,
        behaviorEvents:list.filter(e=>["poop","pee","rest","carry","danger","heat","water","mood_good","mood_tired"].includes(e.type)),
        friendDogEvents:list.filter(e=>e.type === "friend_dog"),
        spotEvents:list.filter(e=>e.type === "spot"),
        walkC2:{
          version:"phaseC2v170",
          dog:core.defaultDog || "コタ",
          eventSummary:core.summarizeEvents ? core.summarizeEvents(list) : {},
          condition:core.buildConditionSummary ? core.buildConditionSummary(list) : ""
        },
        quickEventCount:list.length
      };
      await saveActiveSession({
        ...session,
        payload:payload,
        eventType:session.eventType || "walk",
        eventStatus:session.eventStatus || (window.EVENT_STATUS ? EVENT_STATUS.ACTIVE : "継続中")
      });
    }catch(error){
      console.error("Phase C-2 散歩イベント同期失敗",error);
    }
  }

  function promptFor(type,label){
    if(type === "danger") return prompt("危険メモ\n例：拾い食い注意、車通り多い、吠えやすい犬","") || "";
    if(type === "friend_dog") return prompt("犬友達メモ\n例：柴犬のハルくん、公園で会った","") || "";
    if(type === "spot") return prompt("スポットメモ\n例：日陰、水飲み場、写真スポット","") || "";
    return label || (core.getEventLabel ? core.getEventLabel(type) : type);
  }

  function buildEvent(type,label,note){
    const now = new Date();
    const text = note !== undefined ? note : promptFor(type,label);
    return {
      id:core.createIdSafe ? core.createIdSafe("we") : "we_" + Date.now(),
      type:type,
      label:label || (core.getEventLabel ? core.getEventLabel(type) : type),
      note:String(text || label || ""),
      time:now.toLocaleString(),
      timestamp:now.toISOString(),
      source:"walkC2",
      dog:core.defaultDog || "コタ"
    };
  }

  async function add(type,label,note){
    const walkId = getWalkId();
    if(!walkId){
      alert("散歩開始後に使えます");
      return null;
    }
    const event = buildEvent(type,label,note);
    if(["danger","friend_dog","spot"].includes(type) && !event.note.trim()) return null;
    const events = readEvents(walkId);
    events.push(event);
    writeEvents(walkId,events);
    await syncActiveSession(walkId,events);
    if(typeof window.renderWalkQuickPanel === "function") window.renderWalkQuickPanel();
    if(typeof window.renderWalkC2Panel === "function") window.renderWalkC2Panel();
    return event;
  }

  function getCurrentEvents(){
    return readEvents(getWalkId());
  }

  function clear(walkId){
    const id = walkId || getWalkId();
    if(!id) return;
    localStorage.removeItem(getKey(id));
  }

  C2.events = {
    readEvents,
    writeEvents,
    syncActiveSession,
    add,
    getCurrentEvents,
    clear
  };

  window.OUTBASE_WALK_C2 = C2;
  window.addWalkC2Event = add;
})();
