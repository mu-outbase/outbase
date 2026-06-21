/* =========================================================
   OUTBASE
   campgroundManager.js

   Phase4-A-16-2
   キャンプ場DB管理 修正版

   方針
   ・records は正本
   ・campgrounds は派生DB
   ・キャンプ場名とサイト名を分離
   ・同じrecordIdの二重加算防止
========================================================= */

const CAMPGROUND_STORE = "campgrounds";

function createCampgroundId(){
  return "cg_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
}

function normalizeCampgroundName(name){
  return String(name || "")
    .trim()
    .replace(/\s+/g,"")
    .toLowerCase();
}

function createDefaultCampground(name){
  const now = new Date().toISOString();

  return {
    id:createCampgroundId(),
    name:name || "未設定キャンプ場",
    createdAt:now,
    updatedAt:now,

    ratings:{
      revisit:0,
      dog:0,
      view:0,
      facility:0,
      toilet:0,
      quiet:0,
      siteSize:0,
      access:0
    },

    stats:{
      visitCount:0,
      totalNights:0,
      firstVisitDate:"",
      lastVisitDate:"",
      usedSites:[],
      linkedRecordIds:[]
    },

    conditions:{
      dogFriendly:false,
      dogFreeSite:false,
      hotWater:false,
      power:false,
      shower:false,
      bath:false,
      shop:false,
      lake:false,
      forest:false,
      highland:false
    },

    notes:{
      good:"",
      bad:"",
      next:""
    },

    representativePhoto:""
  };
}

function getCampgroundDb(){
  if(typeof db === "undefined" || !db){
    throw new Error("IndexedDBが初期化されていません");
  }

  return db;
}

function putCampground(campground){
  return new Promise((resolve,reject)=>{
    try{
      const tx = getCampgroundDb().transaction(CAMPGROUND_STORE,"readwrite");
      tx.objectStore(CAMPGROUND_STORE).put(campground);
      tx.oncomplete = ()=>resolve(campground);
      tx.onerror = ()=>reject(tx.error);
    }catch(error){
      reject(error);
    }
  });
}

function getCampground(id){
  return new Promise((resolve,reject)=>{
    try{
      const tx = getCampgroundDb().transaction(CAMPGROUND_STORE,"readonly");
      const req = tx.objectStore(CAMPGROUND_STORE).get(id);
      req.onsuccess = ()=>resolve(req.result || null);
      req.onerror = ()=>reject(req.error);
    }catch(error){
      reject(error);
    }
  });
}

function getAllCampgrounds(){
  return new Promise((resolve,reject)=>{
    try{
      const tx = getCampgroundDb().transaction(CAMPGROUND_STORE,"readonly");
      const req = tx.objectStore(CAMPGROUND_STORE).getAll();
      req.onsuccess = ()=>resolve(req.result || []);
      req.onerror = ()=>reject(req.error);
    }catch(error){
      reject(error);
    }
  });
}

async function findCampgroundByName(name){
  const target = normalizeCampgroundName(name);
  const list = await getAllCampgrounds();

  return list.find(cg=>{
    return normalizeCampgroundName(cg.name) === target;
  }) || null;
}

async function createCampground(name){
  const existing = await findCampgroundByName(name);

  if(existing){
    return existing;
  }

  const campground = createDefaultCampground(name);
  return putCampground(campground);
}

async function updateCampground(id, updates){
  const current = await getCampground(id);

  if(!current){
    throw new Error("キャンプ場が見つかりません");
  }

  const next = {
    ...current,
    ...(updates || {}),
    updatedAt:new Date().toISOString()
  };

  return putCampground(next);
}

function uniqueList(values){
  return Array.from(
    new Set(
      (values || [])
        .map(v=>String(v || "").trim())
        .filter(Boolean)
    )
  );
}

function calcNights(checkInDate, checkOutDate){
  if(!checkInDate || !checkOutDate){
    return 0;
  }

  const start = new Date(checkInDate);
  const end = new Date(checkOutDate);

  if(Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())){
    return 0;
  }

  const diff = end.getTime() - start.getTime();
  const nights = Math.round(diff / (1000 * 60 * 60 * 24));

  return nights > 0 ? nights : 0;
}

function extractCampgroundName(record){
  const camp = record?.camp || {};

  return (
    camp.campgroundName ||
    camp.campground?.name ||
    record?.campgroundName ||
    record?.campground?.name ||
    camp.siteName ||
    record?.title ||
    ""
  );
}

function extractSiteName(record){
  const camp = record?.camp || {};

  return (
    camp.siteNameDetail ||
    camp.siteArea ||
    camp.area ||
    record?.siteName ||
    ""
  );
}

function extractCheckInDate(record){
  const camp = record?.camp || {};

  return (
    camp.checkInDate ||
    camp.startDate ||
    record?.checkInDate ||
    record?.session?.startTime ||
    record?.date ||
    ""
  );
}

function extractCheckOutDate(record){
  const camp = record?.camp || {};

  return (
    camp.checkOutDate ||
    camp.endDate ||
    record?.checkOutDate ||
    record?.session?.endTime ||
    record?.date ||
    ""
  );
}

function ensureCampgroundStats(campground){
  return {
    visitCount:campground?.stats?.visitCount || 0,
    totalNights:campground?.stats?.totalNights || 0,
    firstVisitDate:campground?.stats?.firstVisitDate || "",
    lastVisitDate:campground?.stats?.lastVisitDate || "",
    usedSites:Array.isArray(campground?.stats?.usedSites)
      ? campground.stats.usedSites
      : [],
    linkedRecordIds:Array.isArray(campground?.stats?.linkedRecordIds)
      ? campground.stats.linkedRecordIds
      : []
  };
}

async function linkVisitRecord(record){
  if(!record || record.recordType !== "camp"){
    return null;
  }

  if(!record.id){
    return null;
  }

  const campgroundName = extractCampgroundName(record);

  if(!campgroundName){
    return null;
  }

  const campground = await createCampground(campgroundName);
  const stats = ensureCampgroundStats(campground);

  if(stats.linkedRecordIds.includes(record.id)){
    return campground;
  }

  const checkInDate = extractCheckInDate(record);
  const checkOutDate = extractCheckOutDate(record);
  const siteName = extractSiteName(record);
  const nights = calcNights(checkInDate,checkOutDate);

  const firstVisitDate = stats.firstVisitDate
    ? [stats.firstVisitDate,checkInDate].filter(Boolean).sort()[0]
    : checkInDate;

  const lastVisitDate = stats.lastVisitDate
    ? [stats.lastVisitDate,checkOutDate].filter(Boolean).sort().reverse()[0]
    : checkOutDate;

  const updated = {
    ...campground,
    updatedAt:new Date().toISOString(),
    stats:{
      ...stats,
      visitCount:stats.visitCount + 1,
      totalNights:stats.totalNights + nights,
      firstVisitDate:firstVisitDate || "",
      lastVisitDate:lastVisitDate || "",
      usedSites:uniqueList([
        ...stats.usedSites,
        siteName
      ]),
      linkedRecordIds:uniqueList([
        ...stats.linkedRecordIds,
        record.id
      ])
    }
  };

  return putCampground(updated);
}

async function saveCampgroundRatings(id, ratings){
  const campground = await getCampground(id);

  if(!campground){
    throw new Error("キャンプ場が見つかりません");
  }

  campground.ratings = {
    ...(campground.ratings || {}),
    ...(ratings || {})
  };

  campground.updatedAt = new Date().toISOString();

  return putCampground(campground);
}

async function searchCampgrounds(keyword){
  const list = await getAllCampgrounds();
  const key = String(keyword || "").trim().toLowerCase();

  if(!key){
    return list;
  }

  return list.filter(cg=>{
    return String(cg.name || "").toLowerCase().includes(key);
  });
}

window.createCampground = createCampground;
window.updateCampground = updateCampground;
window.getCampground = getCampground;
window.getAllCampgrounds = getAllCampgrounds;
window.findCampgroundByName = findCampgroundByName;
window.linkVisitRecord = linkVisitRecord;
window.saveCampgroundRatings = saveCampgroundRatings;
window.searchCampgrounds = searchCampgrounds;
