/* =========================================================
   OUTBASE
   campgroundUI.js
   Phase7-K
   キャンプ場管理画面MVP
   既存 campgrounds 活用
========================================================= */

function safeText(value){
  return escapeHtml(value ?? "");
}

function ratingStars(value){
  const n = Math.max(0,Math.min(5,Number(value || 0)));
  if(!n) return "未評価";
  return "★".repeat(n) + "☆".repeat(5 - n);
}

function boolLabel(value){
  return value ? "○" : "－";
}

function getCampgroundStats(cg){
  return cg?.stats || {};
}

function getCampgroundRatings(cg){
  return cg?.ratings || {};
}

function getCampgroundConditions(cg){
  return cg?.conditions || {};
}

function getCampgroundNotes(cg){
  return cg?.notes || {};
}

function showCampgroundPage(){
  ["homePage","walkPage","campPage","detailPage","gearPage","campgroundPage"].forEach(id=>{
    const page = document.getElementById(id);
    if(page) page.classList.add("hidden");
  });

  const page = document.getElementById("campgroundPage");
  if(page) page.classList.remove("hidden");

  hideCampgroundManageForm();
  hideCampgroundManageDetail();
  renderCampgroundManageList();
}

function backFromCampgroundPage(){
  const page = document.getElementById("campgroundPage");
  if(page) page.classList.add("hidden");

  if(typeof backToHome === "function"){
    backToHome();
  }
}

function getCampgroundManageInputValue(id){
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function getCampgroundManageChecked(id){
  const el = document.getElementById(id);
  return !!(el && el.checked);
}

function setCampgroundManageChecked(id,value){
  const el = document.getElementById(id);
  if(el) el.checked = !!value;
}

function clearCampgroundManageForm(){
  document.getElementById("campgroundManageIdInput").value = "";
  document.getElementById("campgroundManageNameInput").value = "";

  [
    "campgroundRatingRevisitInput",
    "campgroundRatingDogInput",
    "campgroundRatingViewInput",
    "campgroundRatingFacilityInput",
    "campgroundRatingToiletInput",
    "campgroundRatingQuietInput",
    "campgroundRatingSiteSizeInput",
    "campgroundRatingAccessInput"
  ].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.value = "";
  });

  [
    "campgroundConditionDogFriendlyInput",
    "campgroundConditionDogFreeSiteInput",
    "campgroundConditionHotWaterInput",
    "campgroundConditionPowerInput",
    "campgroundConditionShowerInput",
    "campgroundConditionBathInput",
    "campgroundConditionShopInput",
    "campgroundConditionLakeInput",
    "campgroundConditionForestInput",
    "campgroundConditionHighlandInput"
  ].forEach(id=>setCampgroundManageChecked(id,false));

  document.getElementById("campgroundNoteGoodInput").value = "";
  document.getElementById("campgroundNoteBadInput").value = "";
  document.getElementById("campgroundNoteNextInput").value = "";
}

function showCampgroundManageForm(id){
  clearCampgroundManageForm();

  const form = document.getElementById("campgroundManageFormCard");
  const title = document.getElementById("campgroundManageFormTitle");

  if(form) form.classList.remove("hidden");
  if(title) title.innerHTML = id ? "キャンプ場編集" : "キャンプ場追加";

  if(id){
    loadCampgroundManageForm(id);
  }
}

function hideCampgroundManageForm(){
  const form = document.getElementById("campgroundManageFormCard");
  if(form) form.classList.add("hidden");
}

function hideCampgroundManageDetail(){
  const detail = document.getElementById("campgroundManageDetailCard");
  if(detail) detail.classList.add("hidden");
}

async function loadCampgroundManageForm(id){
  const cg = await getCampground(id);

  if(!cg){
    alert("キャンプ場が見つかりません");
    return;
  }

  const ratings = getCampgroundRatings(cg);
  const conditions = getCampgroundConditions(cg);
  const notes = getCampgroundNotes(cg);

  document.getElementById("campgroundManageIdInput").value = cg.id || "";
  document.getElementById("campgroundManageNameInput").value = cg.name || "";

  document.getElementById("campgroundRatingRevisitInput").value = ratings.revisit || "";
  document.getElementById("campgroundRatingDogInput").value = ratings.dog || "";
  document.getElementById("campgroundRatingViewInput").value = ratings.view || "";
  document.getElementById("campgroundRatingFacilityInput").value = ratings.facility || "";
  document.getElementById("campgroundRatingToiletInput").value = ratings.toilet || "";
  document.getElementById("campgroundRatingQuietInput").value = ratings.quiet || "";
  document.getElementById("campgroundRatingSiteSizeInput").value = ratings.siteSize || "";
  document.getElementById("campgroundRatingAccessInput").value = ratings.access || "";

  setCampgroundManageChecked("campgroundConditionDogFriendlyInput",conditions.dogFriendly);
  setCampgroundManageChecked("campgroundConditionDogFreeSiteInput",conditions.dogFreeSite);
  setCampgroundManageChecked("campgroundConditionHotWaterInput",conditions.hotWater);
  setCampgroundManageChecked("campgroundConditionPowerInput",conditions.power);
  setCampgroundManageChecked("campgroundConditionShowerInput",conditions.shower);
  setCampgroundManageChecked("campgroundConditionBathInput",conditions.bath);
  setCampgroundManageChecked("campgroundConditionShopInput",conditions.shop);
  setCampgroundManageChecked("campgroundConditionLakeInput",conditions.lake);
  setCampgroundManageChecked("campgroundConditionForestInput",conditions.forest);
  setCampgroundManageChecked("campgroundConditionHighlandInput",conditions.highland);

  document.getElementById("campgroundNoteGoodInput").value = notes.good || "";
  document.getElementById("campgroundNoteBadInput").value = notes.bad || "";
  document.getElementById("campgroundNoteNextInput").value = notes.next || "";
}

function clampRating(value){
  const n = Number(value || 0);
  if(Number.isNaN(n)) return 0;
  return Math.max(0,Math.min(5,n));
}

function buildCampgroundFromForm(current){
  const now = new Date().toISOString();

  const base = current || createDefaultCampground(
    getCampgroundManageInputValue("campgroundManageNameInput")
  );

  return {
    ...base,
    name:getCampgroundManageInputValue("campgroundManageNameInput"),
    updatedAt:now,
    ratings:{
      ...(base.ratings || {}),
      revisit:clampRating(getCampgroundManageInputValue("campgroundRatingRevisitInput")),
      dog:clampRating(getCampgroundManageInputValue("campgroundRatingDogInput")),
      view:clampRating(getCampgroundManageInputValue("campgroundRatingViewInput")),
      facility:clampRating(getCampgroundManageInputValue("campgroundRatingFacilityInput")),
      toilet:clampRating(getCampgroundManageInputValue("campgroundRatingToiletInput")),
      quiet:clampRating(getCampgroundManageInputValue("campgroundRatingQuietInput")),
      siteSize:clampRating(getCampgroundManageInputValue("campgroundRatingSiteSizeInput")),
      access:clampRating(getCampgroundManageInputValue("campgroundRatingAccessInput"))
    },
    conditions:{
      ...(base.conditions || {}),
      dogFriendly:getCampgroundManageChecked("campgroundConditionDogFriendlyInput"),
      dogFreeSite:getCampgroundManageChecked("campgroundConditionDogFreeSiteInput"),
      hotWater:getCampgroundManageChecked("campgroundConditionHotWaterInput"),
      power:getCampgroundManageChecked("campgroundConditionPowerInput"),
      shower:getCampgroundManageChecked("campgroundConditionShowerInput"),
      bath:getCampgroundManageChecked("campgroundConditionBathInput"),
      shop:getCampgroundManageChecked("campgroundConditionShopInput"),
      lake:getCampgroundManageChecked("campgroundConditionLakeInput"),
      forest:getCampgroundManageChecked("campgroundConditionForestInput"),
      highland:getCampgroundManageChecked("campgroundConditionHighlandInput")
    },
    notes:{
      ...(base.notes || {}),
      good:getCampgroundManageInputValue("campgroundNoteGoodInput"),
      bad:getCampgroundManageInputValue("campgroundNoteBadInput"),
      next:getCampgroundManageInputValue("campgroundNoteNextInput")
    }
  };
}

async function saveCampgroundManageForm(){
  const id = getCampgroundManageInputValue("campgroundManageIdInput");
  const name = getCampgroundManageInputValue("campgroundManageNameInput");

  if(!name){
    alert("キャンプ場名を入力してください");
    return;
  }

  try{
    const current = id ? await getCampground(id) : null;
    const next = buildCampgroundFromForm(current);

    await putCampground(next);

    hideCampgroundManageForm();
    await renderCampgroundManageList();
    await showCampgroundManageDetail(next.id);

  }catch(error){
    console.error(error);
    alert("キャンプ場保存に失敗しました");
  }
}

function filterAndSortCampgrounds(list){
  const keyword = getCampgroundManageInputValue("campgroundManageSearchInput").toLowerCase();
  const sort = getCampgroundManageInputValue("campgroundManageSortSelect") || "name";

  let result = list || [];

  if(keyword){
    result = result.filter(cg=>{
      const ratings = getCampgroundRatings(cg);
      const conditions = getCampgroundConditions(cg);
      const notes = getCampgroundNotes(cg);

      return [
        cg.name,
        notes.good,
        notes.bad,
        notes.next,
        conditions.dogFriendly ? "犬可" : "",
        conditions.hotWater ? "温水" : "",
        ratings.dog ? "犬評価" : ""
      ].join(" ").toLowerCase().includes(keyword);
    });
  }

  result.sort((a,b)=>{
    if(sort === "visitCount"){
      return (b.stats?.visitCount || 0) - (a.stats?.visitCount || 0);
    }

    if(sort === "lastVisitDate"){
      return String(b.stats?.lastVisitDate || "").localeCompare(String(a.stats?.lastVisitDate || ""));
    }

    if(sort === "updatedAt"){
      return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
    }

    return String(a.name || "").localeCompare(String(b.name || ""),"ja");
  });

  return result;
}

async function renderCampgroundManageList(){
  const container = document.getElementById("campgroundManageList");
  if(!container) return;

  try{
    const campgrounds = filterAndSortCampgrounds(await getAllCampgrounds());

    if(campgrounds.length === 0){
      container.innerHTML = "キャンプ場なし";
      return;
    }

    let html = "";

    campgrounds.forEach(cg=>{
      const stats = getCampgroundStats(cg);
      const ratings = getCampgroundRatings(cg);
      const notes = getCampgroundNotes(cg);

      html += `
        <div class="record" onclick="showCampgroundManageDetail('${safeText(cg.id)}')">
          <div class="record-title">🏕 ${safeText(cg.name || "名称未設定")}</div>
          <div class="record-row">訪問回数<br>${safeText(stats.visitCount || 0)}回</div>
          <div class="record-row">最終訪問<br>${safeText(stats.lastVisitDate || "未記録")}</div>
          <div class="record-row">犬評価<br>${safeText(ratingStars(ratings.dog))}</div>
          <div class="record-row">次回改善<br>${safeText(notes.next ? "あり" : "なし")}</div>
        </div>
      `;
    });

    container.innerHTML = html;

  }catch(error){
    console.error(error);
    container.innerHTML = "キャンプ場読み込みエラー";
  }
}

async function showCampgroundManageDetail(id){
  const card = document.getElementById("campgroundManageDetailCard");
  const content = document.getElementById("campgroundManageDetailContent");
  if(!card || !content) return;

  try{
    const cg = await getCampground(id);

    if(!cg){
      alert("キャンプ場が見つかりません");
      return;
    }

    const stats = getCampgroundStats(cg);
    const ratings = getCampgroundRatings(cg);
    const conditions = getCampgroundConditions(cg);
    const notes = getCampgroundNotes(cg);

    card.classList.remove("hidden");

    content.innerHTML = `
      <div class="detail-section">
        <div class="detail-title">名称</div>
        <div class="detail-value">${safeText(cg.name || "")}</div>
      </div>

      <div class="detail-section">
        <div class="detail-title">評価</div>
        <div class="detail-value">
          再訪：${safeText(ratingStars(ratings.revisit))}<br>
          犬：${safeText(ratingStars(ratings.dog))}<br>
          景色：${safeText(ratingStars(ratings.view))}<br>
          設備：${safeText(ratingStars(ratings.facility))}<br>
          トイレ：${safeText(ratingStars(ratings.toilet))}<br>
          静かさ：${safeText(ratingStars(ratings.quiet))}<br>
          サイト広さ：${safeText(ratingStars(ratings.siteSize))}<br>
          アクセス：${safeText(ratingStars(ratings.access))}
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-title">利用実績</div>
        <div class="detail-value">
          訪問回数：${safeText(stats.visitCount || 0)}回<br>
          総宿泊数：${safeText(stats.totalNights || 0)}泊<br>
          初回訪問：${safeText(stats.firstVisitDate || "未記録")}<br>
          最終訪問：${safeText(stats.lastVisitDate || "未記録")}<br>
          利用サイト：${safeText((stats.usedSites || []).join("、") || "未記録")}
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-title">条件</div>
        <div class="detail-value">
          犬可：${safeText(boolLabel(conditions.dogFriendly))}<br>
          ドッグフリー：${safeText(boolLabel(conditions.dogFreeSite))}<br>
          温水：${safeText(boolLabel(conditions.hotWater))}<br>
          電源：${safeText(boolLabel(conditions.power))}<br>
          シャワー：${safeText(boolLabel(conditions.shower))}<br>
          風呂：${safeText(boolLabel(conditions.bath))}<br>
          売店：${safeText(boolLabel(conditions.shop))}<br>
          湖：${safeText(boolLabel(conditions.lake))}<br>
          森林：${safeText(boolLabel(conditions.forest))}<br>
          高原：${safeText(boolLabel(conditions.highland))}
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-title">改善ノート</div>
        <div class="detail-value">
          良かった：${safeText(notes.good || "なし")}<br><br>
          悪かった：${safeText(notes.bad || "なし")}<br><br>
          次回改善：${safeText(notes.next || "なし")}
        </div>
      </div>

      <button onclick="showCampgroundManageForm('${safeText(cg.id)}')">
        編集
      </button>

      <button class="deleteButton" onclick="deleteCampgroundManage('${safeText(cg.id)}')">
        削除
      </button>
    `;

  }catch(error){
    console.error(error);
    alert("キャンプ場詳細表示に失敗しました");
  }
}

function deleteCampgroundById(id){
  return new Promise((resolve,reject)=>{
    try{
      const tx = getCampgroundDb().transaction(CAMPGROUND_STORE,"readwrite");
      tx.objectStore(CAMPGROUND_STORE).delete(id);
      tx.oncomplete = ()=>resolve();
      tx.onerror = ()=>reject(tx.error);
    }catch(error){
      reject(error);
    }
  });
}

async function deleteCampgroundManage(id){
  if(!confirm("このキャンプ場を削除しますか？")){
    return;
  }

  try{
    await deleteCampgroundById(id);
    hideCampgroundManageDetail();
    await renderCampgroundManageList();
  }catch(error){
    console.error(error);
    alert("キャンプ場削除に失敗しました");
  }
}

window.showCampgroundPage = showCampgroundPage;
window.backFromCampgroundPage = backFromCampgroundPage;
window.renderCampgroundManageList = renderCampgroundManageList;
window.showCampgroundManageDetail = showCampgroundManageDetail;
window.showCampgroundManageForm = showCampgroundManageForm;
window.hideCampgroundManageForm = hideCampgroundManageForm;
window.saveCampgroundManageForm = saveCampgroundManageForm;
window.deleteCampgroundManage = deleteCampgroundManage;
