/* =========================================================
   OUTBASE sessionManager.js
   Phase A v149: activeSessions 強化
   - 復元3択のための recoveryStatus
   - device_id / revision / updated_at
   - 既存 payload 互換維持
========================================================= */

const ACTIVE_SESSION_STORE = "activeSessions";
const OUTBASE_DEVICE_ID_KEY = "outbase_device_id";

const RECOVERY_STATUS = {
  NONE:"none",
  NEEDS_DECISION:"needs_decision",
  RESTORED:"restored",
  FINISHED:"finished",
  DISCARDED:"discarded"
};

function getDb(){
  if(typeof db === "undefined" || !db){
    throw new Error("IndexedDBが初期化されていません");
  }

  return db;
}

function getOutbaseDeviceId(){
  try{
    let id = localStorage.getItem(OUTBASE_DEVICE_ID_KEY);

    if(!id){
      id = "device_" + Date.now() + "_" + Math.floor(Math.random()*100000);
      localStorage.setItem(OUTBASE_DEVICE_ID_KEY,id);
    }

    return id;
  }catch(error){
    console.error("device_id取得失敗",error);
    return "device_unknown";
  }
}

function putStore(storeName,value){
  return new Promise((resolve,reject)=>{
    try{
      const tx = getDb().transaction(storeName,"readwrite");
      tx.objectStore(storeName).put(value);
      tx.oncomplete = ()=>resolve(value);
      tx.onerror = ()=>reject(tx.error);
    }catch(error){
      reject(error);
    }
  });
}

function getStore(storeName,id){
  return new Promise((resolve,reject)=>{
    try{
      const tx = getDb().transaction(storeName,"readonly");
      const req = tx.objectStore(storeName).get(id);
      req.onsuccess = ()=>resolve(req.result || null);
      req.onerror = ()=>reject(req.error);
    }catch(error){
      reject(error);
    }
  });
}

function getAllStore(storeName){
  return new Promise((resolve,reject)=>{
    try{
      const tx = getDb().transaction(storeName,"readonly");
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = ()=>resolve(req.result || []);
      req.onerror = ()=>reject(req.error);
    }catch(error){
      reject(error);
    }
  });
}

function deleteStore(storeName,id){
  return new Promise((resolve,reject)=>{
    try{
      const tx = getDb().transaction(storeName,"readwrite");
      tx.objectStore(storeName).delete(id);
      tx.oncomplete = resolve;
      tx.onerror = ()=>reject(tx.error);
    }catch(error){
      reject(error);
    }
  });
}

function getSessionEventType(entry){
  if(!entry) return "";

  return entry.eventType ||
    entry.experience_type ||
    entry.type ||
    entry.payload?.currentSession?.type ||
    entry.payload?.currentCampSession?.type ||
    "";
}

function getSessionStatus(entry){
  if(!entry) return "";

  return entry.eventStatus ||
    entry.status ||
    entry.payload?.currentSession?.status ||
    entry.payload?.currentCampSession?.status ||
    EVENT_STATUS.ACTIVE;
}

function createActiveSessionEntry(data,existing){
  const now = new Date().toISOString();
  const entry = data || {};
  const previous = existing || {};
  const id = entry.id || previous.id || createId();
  const payload = entry.payload || previous.payload || {};
  const eventType = getSessionEventType(entry) || getSessionEventType(previous);
  const eventStatus = entry.eventStatus || previous.eventStatus || EVENT_STATUS.ACTIVE;
  const revision = (previous.revision || previous.rev || 0) + 1;
  const deviceId = entry.device_id || entry.deviceId || previous.device_id || previous.deviceId || getOutbaseDeviceId();

  return {
    id:id,
    experience_id:entry.experience_id || previous.experience_id || payload.experience_id || "",
    session_id:entry.session_id || previous.session_id || payload.session_id || id,
    eventType:eventType,
    experience_type:eventType,
    eventStatus:eventStatus,
    recoveryStatus:entry.recoveryStatus || previous.recoveryStatus || RECOVERY_STATUS.NONE,
    recovery_status:entry.recovery_status || previous.recovery_status || entry.recoveryStatus || previous.recoveryStatus || RECOVERY_STATUS.NONE,
    updatedAt:now,
    updated_at:now,
    deviceId:deviceId,
    device_id:deviceId,
    revision:revision,
    review_queue:Array.isArray(entry.review_queue)
      ? entry.review_queue
      : (Array.isArray(previous.review_queue) ? previous.review_queue : []),
    payload:payload
  };
}

async function saveActiveSession(data){
  const id = data?.id || data?.session_id || data?.payload?.currentSession?.id || data?.payload?.currentCampSession?.id;
  const existing = id ? await getActiveSession(id) : null;
  const entry = createActiveSessionEntry(data,existing);
  return putStore(ACTIVE_SESSION_STORE,entry);
}

async function getActiveSession(id){
  if(!id){
    return null;
  }

  return getStore(ACTIVE_SESSION_STORE,id);
}

async function getActiveSessions(){
  return getAllStore(ACTIVE_SESSION_STORE);
}

async function deleteActiveSession(id){
  if(!id){
    return;
  }

  return deleteStore(ACTIVE_SESSION_STORE,id);
}

async function deleteAllActiveSessions(){
  const sessions = await getActiveSessions();

  for(const session of sessions){
    await deleteActiveSession(session.id);
  }
}

function isActiveSession(session){
  return session && getSessionStatus(session) === EVENT_STATUS.ACTIVE;
}

async function markActiveSessionRecoveryStatus(id,status){
  const entry = await getActiveSession(id);

  if(!entry){
    return null;
  }

  entry.recoveryStatus = status;
  entry.recovery_status = status;
  entry.updatedAt = new Date().toISOString();
  entry.updated_at = entry.updatedAt;
  entry.revision = (entry.revision || 0) + 1;

  return putStore(ACTIVE_SESSION_STORE,entry);
}

window.ACTIVE_SESSION_STORE = ACTIVE_SESSION_STORE;
window.RECOVERY_STATUS = RECOVERY_STATUS;
window.getOutbaseDeviceId = getOutbaseDeviceId;
window.putStore = putStore;
window.getStore = getStore;
window.getAllStore = getAllStore;
window.deleteStore = deleteStore;
window.saveActiveSession = saveActiveSession;
window.getActiveSession = getActiveSession;
window.getActiveSessions = getActiveSessions;
window.deleteActiveSession = deleteActiveSession;
window.deleteAllActiveSessions = deleteAllActiveSessions;
window.isActiveSession = isActiveSession;
window.markActiveSessionRecoveryStatus = markActiveSessionRecoveryStatus;
