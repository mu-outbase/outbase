/* =========================================================
   OUTBASE walkCore.js
   Phase C-2 v170: 散歩実用化 Core
   - データ構造・共通判定・レビュー材料
   - walk.js / walkQuick.js 本体は触らない
========================================================= */
(function(){
  "use strict";

  const C2 = window.OUTBASE_WALK_C2 || {};
  const DEFAULT_DOG = "コタ";

  const EVENT_LABELS = {
    poop:"うんち",
    pee:"おしっこ",
    rest:"休憩",
    carry:"抱っこ",
    danger:"危険",
    friend_dog:"犬友達",
    spot:"スポット",
    heat:"暑さ注意",
    water:"水分補給",
    mood_good:"足取り良い",
    mood_tired:"疲れ気味"
  };

  const EVENT_EMOJIS = {
    poop:"💩",
    pee:"💧",
    rest:"☕",
    carry:"抱",
    danger:"⚠️",
    friend_dog:"🐶",
    spot:"📍",
    heat:"☀️",
    water:"🥤",
    mood_good:"🐾",
    mood_tired:"💤"
  };

  function safeText(value){
    if(typeof escapeHtml === "function") return escapeHtml(value);
    return String(value ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function createIdSafe(prefix){
    if(typeof createId === "function") return createId();
    return (prefix || "ob") + "_" + Date.now() + "_" + Math.floor(Math.random()*100000);
  }

  function nowText(){
    return new Date().toLocaleString();
  }

  function nowIso(){
    return new Date().toISOString();
  }

  function getWalkState(){
    if(typeof getAppState !== "function") return null;
    const state = getAppState();
    if(!state || state.eventType !== "walk" || !state.eventId) return null;
    return state;
  }

  function getActiveWalkId(){
    const state = getWalkState();
    return state ? state.eventId : "";
  }

  function asArray(value){
    return Array.isArray(value) ? value : [];
  }

  function normalizeEvent(event){
    const type = event?.type || "note";
    return {
      id:event?.id || createIdSafe("we"),
      type:type,
      label:event?.label || EVENT_LABELS[type] || type,
      note:event?.note || event?.label || "",
      time:event?.time || nowText(),
      timestamp:event?.timestamp || nowIso(),
      source:event?.source || "walk",
      dog:event?.dog || DEFAULT_DOG
    };
  }

  function normalizeEvents(events){
    return asArray(events).map(normalizeEvent);
  }

  function getEventsFromRecord(record){
    return normalizeEvents(record?.quickEvents || record?.walk?.events || []);
  }

  function countByType(events,type){
    return normalizeEvents(events).filter(event=>event.type === type).length;
  }

  function countAny(events,types){
    const set = new Set(types || []);
    return normalizeEvents(events).filter(event=>set.has(event.type)).length;
  }

  function getEventLabel(type){
    return EVENT_LABELS[type] || type || "記録";
  }

  function getEventEmoji(type){
    return EVENT_EMOJIS[type] || "•";
  }

  function summarizeEvents(events){
    const list = normalizeEvents(events);
    return {
      total:list.length,
      poop:countByType(list,"poop"),
      pee:countByType(list,"pee"),
      rest:countByType(list,"rest"),
      carry:countByType(list,"carry"),
      danger:countByType(list,"danger"),
      friendDog:countByType(list,"friend_dog"),
      spot:countByType(list,"spot"),
      heat:countByType(list,"heat"),
      water:countByType(list,"water"),
      moodGood:countByType(list,"mood_good"),
      moodTired:countByType(list,"mood_tired")
    };
  }

  function buildConditionSummary(events){
    const summary = summarizeEvents(events);
    const parts = [];
    if(summary.heat > 0) parts.push("暑さ注意");
    if(summary.water > 0) parts.push("水分補給あり");
    if(summary.rest > 0) parts.push("休憩あり");
    if(summary.carry > 0) parts.push("抱っこあり");
    if(summary.danger > 0) parts.push("危険メモあり");
    if(summary.moodTired > 0) parts.push("疲れ気味");
    if(summary.moodGood > 0) parts.push("足取り良い");
    return parts.length ? parts.join(" / ") : "通常";
  }

  function buildNextHints(events){
    const summary = summarizeEvents(events);
    const hints = [];
    if(summary.danger > 0) hints.push("次回は危険メモの場所を避ける/リード短め");
    if(summary.heat > 0) hints.push("暑い日は時間帯を早める・日陰ルート優先");
    if(summary.water > 0) hints.push("水分休憩ポイントを次回も確保");
    if(summary.carry > 0) hints.push("抱っこが出た区間は距離か路面を見直す");
    if(summary.rest >= 2) hints.push("休憩が多い日は短めコース候補にする");
    if(summary.friendDog > 0) hints.push("犬友達に会った場所・時間帯を候補化");
    if(summary.spot > 0) hints.push("良かったスポットを次回ルート候補へ");
    if(hints.length === 0) hints.push("大きな注意なし。次回も同じ条件で試せる");
    return hints;
  }

  function buildWalkReview(record,events){
    const list = normalizeEvents(events || getEventsFromRecord(record));
    const summary = summarizeEvents(list);
    const condition = buildConditionSummary(list);
    const nextHints = buildNextHints(list);
    return {
      version:"phaseC2v170",
      dog:DEFAULT_DOG,
      eventSummary:summary,
      condition:condition,
      nextHints:nextHints,
      createdAt:nowIso(),
      title:record?.title || "散歩記録",
      time:record?.walk?.time || "00:00:00",
      distanceKm:record?.walk?.distanceKm || "0.00km"
    };
  }

  function getPrimaryReviewText(review){
    if(!review) return "散歩レビューなし";
    const hints = asArray(review.nextHints).slice(0,2).join(" / ");
    return `${review.dog || DEFAULT_DOG}：${review.condition || "通常"}${hints ? " / " + hints : ""}`;
  }

  C2.core = {
    defaultDog:DEFAULT_DOG,
    safeText,
    createIdSafe,
    nowText,
    nowIso,
    getWalkState,
    getActiveWalkId,
    asArray,
    normalizeEvent,
    normalizeEvents,
    getEventsFromRecord,
    countByType,
    countAny,
    getEventLabel,
    getEventEmoji,
    summarizeEvents,
    buildConditionSummary,
    buildNextHints,
    buildWalkReview,
    getPrimaryReviewText
  };

  window.OUTBASE_WALK_C2 = C2;
})();
