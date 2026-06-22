/* =========================================================
   OUTBASE
   gear.js
   Phase6-B-MVP
   ギア管理MVP
========================================================= */

const GEAR_STORE = "gear_master";

function getGearStore(mode){
  if(typeof db === "undefined" || !db){
    throw new Error("IndexedDBが初期化されていません");
  }

  const tx = db.transaction(GEAR_STORE,mode);
  return tx.objectStore(GEAR_STORE);
}

function getAllGears(){
  return new Promise((resolve,reject)=>{
    try{
      const req = getGearStore("readonly").getAll();
      req.onsuccess = ()=>resolve(req.result || []);
      req.onerror = ()=>reject(req.error);
    }catch(error){
      reject(error);
    }
  });
}

function putGear(gear){
  return new Promise((resolve,reject)=>{
    try{
      const req = getGearStore("readwrite").put(gear);
      req.onsuccess = ()=>resolve(gear);
      req.onerror = ()=>reject(req.error);
    }catch(error){
      reject(error);
    }
  });
}

function deleteGearById(id){
  return new Promise((resolve,reject)=>{
    try{
      const req = getGearStore("readwrite").delete(id);
      req.onsuccess = ()=>resolve();
      req.onerror = ()=>reject(req.error);
    }catch(error){
      reject(error);
    }
  });
}

function getGearInputValue(id){
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function clearGearForm(){
  document.getElementById("gearIdInput").value = "";
  document.getElementById("gearCategoryInput").value = "";
  document.getElementById("gearMakerInput").value = "";
  document.getElementById("gearNameInput").value = "";
  document.getElementById("gearPurchaseDateInput").value = "";
  document.getElementById("gearPriceInput").value = "";
  document.getElementById("gearMemoInput").value = "";
}

async function showGearPage(){
  showPage("gearPage");
  hideGearForm();
  hideGearDetail();
  await renderGearList();
}

function showGearForm(id){
  clearGearForm();

  const form = document.getElementById("gearFormCard");
  const title = document.getElementById("gearFormTitle");

  if(form){
    form.classList.remove("hidden");
  }

  if(title){
    title.innerHTML = id ? "ギア編集" : "ギア追加";
  }

  if(id){
    loadGearToForm(id);
  }
}

function hideGearForm(){
  const form = document.getElementById("gearFormCard");
  if(form){
    form.classList.add("hidden");
  }
}

function hideGearDetail(){
  const detail = document.getElementById("gearDetailCard");
  if(detail){
    detail.classList.add("hidden");
  }
}

async function loadGearToForm(id){
  const gears = await getAllGears();
  const gear = gears.find(g=>g.id === id);

  if(!gear){
    alert("ギアが見つかりません");
    return;
  }

  document.getElementById("gearIdInput").value = gear.id || "";
  document.getElementById("gearCategoryInput").value = gear.category || "";
  document.getElementById("gearMakerInput").value = gear.maker || "";
  document.getElementById("gearNameInput").value = gear.name || "";
  document.getElementById("gearPurchaseDateInput").value = gear.purchaseDate || "";
  document.getElementById("gearPriceInput").value = gear.price || "";
  document.getElementById("gearMemoInput").value = gear.memo || "";
}

function buildGearFromForm(){
  const id = getGearInputValue("gearIdInput") || createId();
  const now = new Date().toISOString();

  return {
    id:id,
    category:getGearInputValue("gearCategoryInput"),
    maker:getGearInputValue("gearMakerInput"),
    name:getGearInputValue("gearNameInput"),
    purchaseDate:getGearInputValue("gearPurchaseDateInput"),
    price:getGearInputValue("gearPriceInput"),
    memo:getGearInputValue("gearMemoInput"),
    createdAt:getGearInputValue("gearIdInput") ? "" : now,
    updatedAt:now
  };
}

async function saveGear(){
  const gear = buildGearFromForm();

  if(!gear.name){
    alert("名称を入力してください");
    return;
  }

  if(!gear.category){
    alert("カテゴリを入力してください");
    return;
  }

  try{
    await putGear(gear);
    hideGearForm();
    await renderGearList();
    showGearDetail(gear.id);
  }catch(error){
    console.error(error);
    alert("ギア保存に失敗しました");
  }
}

function filterAndSortGears(gears){
  const keyword = getGearInputValue("gearSearchInput").toLowerCase();
  const sort = getGearInputValue("gearSortSelect") || "name";

  let list = gears;

  if(keyword){
    list = list.filter(g=>{
      return (
        (g.name || "").toLowerCase().includes(keyword) ||
        (g.maker || "").toLowerCase().includes(keyword) ||
        (g.category || "").toLowerCase().includes(keyword)
      );
    });
  }

  list.sort((a,b)=>{
    if(sort === "updatedAt"){
      return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
    }

    return String(a[sort] || "").localeCompare(String(b[sort] || ""),"ja");
  });

  return list;
}

async function renderGearList(){
  const list = document.getElementById("gearList");
  if(!list){
    return;
  }

  try{
    const gears = filterAndSortGears(await getAllGears());

    if(gears.length === 0){
      list.innerHTML = "ギアなし";
      return;
    }

    let html = "";

    gears.forEach(g=>{
      html += `
        <div class="record" onclick="showGearDetail('${escapeHtml(g.id)}')">
          <div class="record-title">🧰 ${escapeHtml(g.name || "名称未設定")}</div>
          <div class="record-row">📂 カテゴリ<br>${escapeHtml(g.category || "未設定")}</div>
          <div class="record-row">🏷 メーカー<br>${escapeHtml(g.maker || "未設定")}</div>
          <div class="record-row">📅 購入日<br>${escapeHtml(g.purchaseDate || "未設定")}</div>
          <div class="record-row">💴 購入金額<br>${escapeHtml(g.price || "未設定")}</div>
        </div>
      `;
    });

    list.innerHTML = html;

  }catch(error){
    console.error(error);
    list.innerHTML = "ギア読み込みエラー";
  }
}

async function showGearDetail(id){
  const detailCard = document.getElementById("gearDetailCard");
  const detail = document.getElementById("gearDetailContent");

  if(!detailCard || !detail){
    return;
  }

  try{
    const gears = await getAllGears();
    const g = gears.find(item=>item.id === id);

    if(!g){
      alert("ギアが見つかりません");
      return;
    }

    detailCard.classList.remove("hidden");

    detail.innerHTML = `
      <div class="detail-section">
        <div class="detail-title">名称</div>
        <div class="detail-value">${escapeHtml(g.name || "")}</div>
      </div>

      <div class="detail-section">
        <div class="detail-title">メーカー</div>
        <div class="detail-value">${escapeHtml(g.maker || "")}</div>
      </div>

      <div class="detail-section">
        <div class="detail-title">カテゴリ</div>
        <div class="detail-value">${escapeHtml(g.category || "")}</div>
      </div>

      <div class="detail-section">
        <div class="detail-title">購入日</div>
        <div class="detail-value">${escapeHtml(g.purchaseDate || "未設定")}</div>
      </div>

      <div class="detail-section">
        <div class="detail-title">購入金額</div>
        <div class="detail-value">${escapeHtml(g.price || "未設定")}</div>
      </div>

      <div class="detail-section">
        <div class="detail-title">メモ</div>
        <div class="detail-value">${escapeHtml(g.memo || "なし")}</div>
      </div>

      <button onclick="showGearForm('${escapeHtml(g.id)}')">
        編集
      </button>

      <button class="deleteButton" onclick="deleteGear('${escapeHtml(g.id)}')">
        削除
      </button>
    `;

  }catch(error){
    console.error(error);
    alert("ギア詳細表示に失敗しました");
  }
}

async function deleteGear(id){
  if(!confirm("このギアを削除しますか？")){
    return;
  }

  try{
    await deleteGearById(id);
    hideGearDetail();
    await renderGearList();
  }catch(error){
    console.error(error);
    alert("ギア削除に失敗しました");
  }
}

window.showGearPage = showGearPage;
window.showGearForm = showGearForm;
window.hideGearForm = hideGearForm;
window.renderGearList = renderGearList;
window.saveGear = saveGear;
window.showGearDetail = showGearDetail;
window.deleteGear = deleteGear;
