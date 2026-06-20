/* =========================================================
   OUTBASE stateManager.js
   Phase3: appState 管理
========================================================= */

const APP_STATE_KEY = "outbase_app_state";

const EVENT_STATUS = {
  BEFORE:"開始前",
  ACTIVE:"継続中",
  PAUSED:"一時停止",
  CLOSED:"終了"
};

function createDefaultState(){
  return {
    page:"home",
    eventId:"",
    eventType:"",
    eventStatus:EVENT_STATUS.BEFORE,
    updatedAt:new Date().toISOString()
  };
}

function setAppState(state){
  const current = getAppState();
  const next = {
    ...current,
    ...(state || {}),
    updatedAt:new Date().toISOString()
  };

  try{
    localStorage.setItem(APP_STATE_KEY,JSON.stringify(next));
    return next;
  }catch(error){
    console.error("appState保存失敗",error);
    return next;
  }
}

function getAppState(){
  try{
    const raw = localStorage.getItem(APP_STATE_KEY);
    if(!raw){
      return createDefaultState();
    }

    return {
      ...createDefaultState(),
      ...JSON.parse(raw)
    };
  }catch(error){
    console.error("appState取得失敗",error);
    return createDefaultState();
  }
}

function clearAppState(){
  try{
    localStorage.removeItem(APP_STATE_KEY);
    return true;
  }catch(error){
    console.error("appState削除失敗",error);
    return false;
  }
}

function hasActiveState(){
  const state = getAppState();
  return state.eventStatus === EVENT_STATUS.ACTIVE;
}

window.APP_STATE_KEY = APP_STATE_KEY;
window.EVENT_STATUS = EVENT_STATUS;
window.setAppState = setAppState;
window.getAppState = getAppState;
window.clearAppState = clearAppState;
window.hasActiveState = hasActiveState;
