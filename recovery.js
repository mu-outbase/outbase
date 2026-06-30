/* =========================================================
   OUTBASE recovery.js
   Phase A v149: 復元3択
   - 復旧する
   - 終了して保存
   - 破棄する
========================================================= */

let pendingRecoverySession = null;

function getRecoveryTypeLabel(entry){
  const type = entry?.eventType || entry?.experience_type || "";

  if(type === "camp") return "キャンプ";
  if(type === "walk") return "散歩";
  return "記録";
}

function getRecoveryStartTime(entry){
  const payload = entry?.payload || {};

  return payload.currentSession?.startTime ||
    payload.currentCampSession?.startTime ||
    payload.startTime ||
    "不明";
}

function ensureFinishRecoveryButton(){
  const modal = document.getElementById("recoveryModal");

  if(!modal){
    return;
  }

  if(document.getElementById("finishRecoveryButton")){
    return;
  }

  const restoreButton = modal.querySelector('button[onclick="restorePendingSession()"]');

  if(!restoreButton){
    return;
  }

  const button = document.createElement("button");
  button.id = "finishRecoveryButton";
  button.type = "button";
  button.innerHTML = "終了して保存";
  button.onclick = finishPendingSession;

  restoreButton.insertAdjacentElement("afterend",button);
}

function showRecoveryModal(entry){
  pendingRecoverySession = entry;

  const modal = document.getElementById("recoveryModal");
  const typeEl = document.getElementById("recoveryType");
  const infoEl = document.getElementById("recoveryInfo");

  if(!modal || !typeEl || !infoEl){
    if(confirm("未終了の記録があります。復旧しますか？\n\nOK：復旧する\nキャンセル：破棄する")){
      restorePendingSession();
    }else{
      discardPendingSession();
    }
    return;
  }

  ensureFinishRecoveryButton();

  const payload = entry.payload || {};
  const photoCount = Array.isArray(payload.photos) ? payload.photos.length : 0;
  const noteCount = Array.isArray(payload.notes) ? payload.notes.length : 0;
  const audioCount = Array.isArray(payload.audioRecords) ? payload.audioRecords.length : 0;
  const gpsCount = Array.isArray(payload.gpsHistory) ? payload.gpsHistory.length : 0;

  typeEl.innerHTML = getRecoveryTypeLabel(entry);
  infoEl.innerHTML =
    "開始：" + escapeHtml(getRecoveryStartTime(entry)) + "<br>" +
    "最終保存：" + escapeHtml(entry.updatedAt || entry.updated_at || "") + "<br>" +
    "写真：" + photoCount + "枚 / " +
    "音声：" + audioCount + "件 / " +
    "メモ：" + noteCount + "件 / " +
    "GPS：" + gpsCount + "件<br>" +
    "選択：復旧する・終了して保存・破棄する";

  modal.classList.remove("hidden");

  if(entry.id && typeof markActiveSessionRecoveryStatus === "function"){
    markActiveSessionRecoveryStatus(entry.id,RECOVERY_STATUS.NEEDS_DECISION);
  }
}

function hideRecoveryModal(){
  const modal = document.getElementById("recoveryModal");

  if(modal){
    modal.classList.add("hidden");
  }
}

async function checkActiveSessionRecovery(){
  try{
    const sessions = await getActiveSessions();
    const active = sessions
      .filter(isActiveSession)
      .sort((a,b)=>String(b.updatedAt || b.updated_at || "").localeCompare(String(a.updatedAt || a.updated_at || "")));

    if(active.length > 0){
      showRecoveryModal(active[0]);
    }
  }catch(error){
    console.error("復旧確認失敗",error);
  }
}

async function restorePendingSession(){
  const entry = pendingRecoverySession;
  hideRecoveryModal();

  if(!entry){
    return;
  }

  if(entry.id && typeof markActiveSessionRecoveryStatus === "function"){
    await markActiveSessionRecoveryStatus(entry.id,RECOVERY_STATUS.RESTORED);
  }

  if(entry.eventType === "walk" &&
     typeof restoreWalkSession === "function"){
    restoreWalkSession(entry);
    pendingRecoverySession = null;
    return;
  }

  if(entry.eventType === "camp" &&
     typeof restoreCampSession === "function"){
    restoreCampSession(entry);
    pendingRecoverySession = null;
    return;
  }

  alert("復旧できない記録です");
  pendingRecoverySession = null;
}

async function finishPendingSession(){
  const entry = pendingRecoverySession;
  hideRecoveryModal();

  if(!entry){
    return;
  }

  if(entry.id && typeof markActiveSessionRecoveryStatus === "function"){
    await markActiveSessionRecoveryStatus(entry.id,RECOVERY_STATUS.FINISHED);
  }

  if(entry.eventType === "walk" &&
     typeof restoreWalkSession === "function" &&
     typeof finishWalk === "function"){
    restoreWalkSession(entry);
    pendingRecoverySession = null;
    setTimeout(()=>{
      finishWalk();
    },300);
    return;
  }

  if(entry.eventType === "camp" &&
     typeof restoreCampSession === "function" &&
     typeof finishCamp === "function"){
    restoreCampSession(entry);
    pendingRecoverySession = null;
    setTimeout(()=>{
      finishCamp();
    },300);
    return;
  }

  alert("終了保存できない記録です。復旧してから終了してください。");
  pendingRecoverySession = null;
}

async function discardPendingSession(){
  const entry = pendingRecoverySession;
  hideRecoveryModal();

  if(entry && entry.id){
    if(typeof markActiveSessionRecoveryStatus === "function"){
      await markActiveSessionRecoveryStatus(entry.id,RECOVERY_STATUS.DISCARDED);
    }
    await deleteActiveSession(entry.id);
  }

  pendingRecoverySession = null;
  clearAppState();
  showPage("homePage");
}

window.checkActiveSessionRecovery = checkActiveSessionRecovery;
window.restorePendingSession = restorePendingSession;
window.finishPendingSession = finishPendingSession;
window.discardPendingSession = discardPendingSession;
