/* =========================================================
   OUTBASE recovery.js
   Phase3: 復旧処理
========================================================= */

let pendingRecoverySession = null;

function showRecoveryModal(entry){
  pendingRecoverySession = entry;

  const modal = document.getElementById("recoveryModal");
  const typeEl = document.getElementById("recoveryType");
  const infoEl = document.getElementById("recoveryInfo");

  if(!modal || !typeEl || !infoEl){
    if(confirm("未終了の記録があります。復旧しますか？")){
      restorePendingSession();
    }else{
      discardPendingSession();
    }
    return;
  }

  const typeLabel = entry.eventType === "camp"
    ? "キャンプ"
    : "散歩";

  const payload = entry.payload || {};
  const startTime =
    payload.currentSession?.startTime ||
    payload.currentCampSession?.startTime ||
    "不明";

  typeEl.innerHTML = typeLabel;
  infoEl.innerHTML =
    "開始：" + escapeHtml(startTime) + "<br>" +
    "最終保存：" + escapeHtml(entry.updatedAt || "");

  modal.classList.remove("hidden");
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
      .sort((a,b)=>String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));

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

async function discardPendingSession(){
  const entry = pendingRecoverySession;
  hideRecoveryModal();

  if(entry && entry.id){
    await deleteActiveSession(entry.id);
  }

  pendingRecoverySession = null;
  clearAppState();
  showPage("homePage");
}

window.checkActiveSessionRecovery = checkActiveSessionRecovery;
window.restorePendingSession = restorePendingSession;
window.discardPendingSession = discardPendingSession;
