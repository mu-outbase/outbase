/* OUTBASE Phase8-F campRecordManager.js */
const CAMP_RECORD_STORE = "campRecords";
function getCampRecordDb(){
  if(typeof db === "undefined" || !db) throw new Error("IndexedDBが初期化されていません");
  return db;
}
function createCampRecordId(){
  return "cr_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
}
function getCampRecordStore(mode){
  return getCampRecordDb().transaction(CAMP_RECORD_STORE,mode).objectStore(CAMP_RECORD_STORE);
}
function getAllCampRecords(){
  return new Promise((resolve,reject)=>{
    try{
      const req = getCampRecordStore("readonly").getAll();
      req.onsuccess = ()=>resolve(req.result || []);
      req.onerror = ()=>reject(req.error);
    }catch(e){reject(e);}
  });
}
function getCampRecord(id){
  return new Promise((resolve,reject)=>{
    try{
      const req = getCampRecordStore("readonly").get(id);
      req.onsuccess = ()=>resolve(req.result || null);
      req.onerror = ()=>reject(req.error);
    }catch(e){reject(e);}
  });
}
function putCampRecord(record){
  return new Promise((resolve,reject)=>{
    try{
      const req = getCampRecordStore("readwrite").put(record);
      req.onsuccess = ()=>resolve(record);
      req.onerror = ()=>reject(req.error);
    }catch(e){reject(e);}
  });
}
function deleteCampRecordById(id){
  return new Promise((resolve,reject)=>{
    try{
      const req = getCampRecordStore("readwrite").delete(id);
      req.onsuccess = ()=>resolve();
      req.onerror = ()=>reject(req.error);
    }catch(e){reject(e);}
  });
}
function calcCampRecordNights(startDate,endDate){
  if(!startDate || !endDate) return 0;
  const s = new Date(startDate), e = new Date(endDate);
  if(Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0;
  const nights = Math.round((e.getTime() - s.getTime()) / (1000*60*60*24));
  return nights > 0 ? nights : 0;
}
async function rebuildCampgroundStats(campgroundId){
  if(!campgroundId || typeof getCampground !== "function" || typeof putCampground !== "function") return;
  const cg = await getCampground(campgroundId);
  if(!cg) return;
  const records = (await getAllCampRecords()).filter(r=>r.campgroundId === campgroundId)
    .sort((a,b)=>String(a.startDate||"").localeCompare(String(b.startDate||"")));
  const usedSites = Array.from(new Set(records.map(r=>r.siteName||"").filter(Boolean)));
  cg.stats = {
    ...(cg.stats || {}),
    visitCount:records.length,
    totalNights:records.reduce((s,r)=>s + Number(r.nights || 0),0),
    firstVisitDate:records[0]?.startDate || "",
    lastVisitDate:records[records.length-1]?.startDate || "",
    usedSites:usedSites,
    linkedRecordIds:records.map(r=>r.id).filter(Boolean)
  };
  cg.updatedAt = new Date().toISOString();
  await putCampground(cg);
}
async function saveCampRecord(record){
  await putCampRecord(record);
  await rebuildCampgroundStats(record.campgroundId);
  return record;
}
async function deleteCampRecord(recordId){
  const current = await getCampRecord(recordId);
  await deleteCampRecordById(recordId);
  if(current?.campgroundId) await rebuildCampgroundStats(current.campgroundId);
}
window.getAllCampRecords = getAllCampRecords;
window.getCampRecord = getCampRecord;
window.saveCampRecord = saveCampRecord;
window.deleteCampRecord = deleteCampRecord;
window.createCampRecordId = createCampRecordId;
window.calcCampRecordNights = calcCampRecordNights;
