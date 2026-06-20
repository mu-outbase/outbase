/* =========================================================
   OUTBASE autoSave.js
   Phase3: 自動保存
========================================================= */

const AUTOSAVE_INTERVAL_MS = 60000;

let outbaseAutoSaveTimer = null;

function getActiveRecordingType(){
  if(typeof currentSession !== "undefined" &&
     currentSession &&
     currentSession.status === EVENT_STATUS.ACTIVE){
    return "walk";
  }

  if(typeof currentCampSession !== "undefined" &&
     currentCampSession &&
     currentCampSession.status === EVENT_STATUS.ACTIVE){
    return "camp";
  }

  return "";
}

async function runAutoSave(reason){
  const type = getActiveRecordingType();

  try{
    if(type === "walk" &&
       typeof saveWalkActiveSession === "function"){
      await saveWalkActiveSession(reason || "auto");
    }

    if(type === "camp" &&
       typeof saveCampActiveSession === "function"){
      await saveCampActiveSession(reason || "auto");
    }
  }catch(error){
    console.error("自動保存失敗",error);
  }
}

function startAutoSave(){
  stopAutoSave();

  outbaseAutoSaveTimer = setInterval(()=>{
    runAutoSave("interval");
  },AUTOSAVE_INTERVAL_MS);
}

function stopAutoSave(){
  if(outbaseAutoSaveTimer){
    clearInterval(outbaseAutoSaveTimer);
    outbaseAutoSaveTimer = null;
  }
}

document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState === "hidden"){
    runAutoSave("visibilitychange");
  }
});

window.addEventListener("beforeunload",()=>{
  runAutoSave("beforeunload");
});

window.runAutoSave = runAutoSave;
window.startAutoSave = startAutoSave;
window.stopAutoSave = stopAutoSave;
