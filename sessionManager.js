/* =========================================================
   OUTBASE sessionManager.js
   Phase3: activeSessions 管理
========================================================= */

const ACTIVE_SESSION_STORE = "activeSessions";

function getDb(){
  if(typeof db === "undefined" || !db){
    throw new Error("IndexedDBが初期化されていません");
  }

  return db;
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

function createActiveSessionEntry(data){
  const now = new Date().toISOString();
  const entry = data || {};

  return {
    id:entry.id || createId(),
    eventType:entry.eventType || "",
    eventStatus:entry.eventStatus || EVENT_STATUS.ACTIVE,
    updatedAt:now,
    payload:entry.payload || {}
  };
}

async function saveActiveSession(data){
  const entry = createActiveSessionEntry(data);
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
  return session &&
    session.eventStatus === EVENT_STATUS.ACTIVE;
}

window.saveActiveSession = saveActiveSession;
window.getActiveSession = getActiveSession;
window.getActiveSessions = getActiveSessions;
window.deleteActiveSession = deleteActiveSession;
window.deleteAllActiveSessions = deleteAllActiveSessions;
window.isActiveSession = isActiveSession;
