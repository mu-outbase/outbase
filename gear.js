/* =========================================================
   OUTBASE
   gear.js
   Phase6-D
   ギア管理MVP + Excel取込MVP
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
  const existingId = getGearInputValue("gearIdInput");
  const id = existingId || createId();
  const now = new Date().toISOString();

  return {
    id:id,
    category:getGearInputValue("gearCategoryInput"),
    maker:getGearInputValue("gearMakerInput"),
    name:getGearInputValue("gearNameInput"),
    purchaseDate:getGearInputValue("gearPurchaseDateInput"),
    price:getGearInputValue("gearPriceInput"),
    memo:getGearInputValue("gearMemoInput"),
    createdAt:existingId ? "" : now,
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

function normalizeGearText(value){
  return String(value ?? "").trim();
}

function getExcelValue(row,names){
  for(const name of names){
    if(row[name] !== undefined && row[name] !== null && String(row[name]).trim() !== ""){
      return String(row[name]).trim();
    }
  }
  return "";
}

function makeImportKey(gear){
  return [
    normalizeGearText(gear.maker).toLowerCase(),
    normalizeGearText(gear.name).toLowerCase()
  ].join("::");
}

function buildMemoFromExcel(row){
  const model = getExcelValue(row,["型番","品番","モデル"]);
  const count = getExcelValue(row,["数量","個数"]);
  const status = getExcelValue(row,["状態","ステータス"]);
  const memo = getExcelValue(row,["メモ","備考"]);

  const lines = [];

  if(model) lines.push("型番：" + model);
  if(count) lines.push("数量：" + count);
  if(status) lines.push("状態：" + status);
  if(memo) lines.push(memo);

  return lines.join("\n");
}

function normalizeImportedGear(row,existingMap){
  const category = getExcelValue(row,["カテゴリ","カテゴリー","分類"]);
  const name = getExcelValue(row,["正式名称","名称","ギア名","商品名"]);
  const maker = getExcelValue(row,["メーカー","ブランド"]);
  const purchaseDate = getExcelValue(row,["購入日"]);
  const price = getExcelValue(row,["購入金額","金額","価格"]);
  const now = new Date().toISOString();

  const gear = {
    id:createId(),
    category:category,
    maker:maker,
    name:name,
    purchaseDate:purchaseDate,
    price:price,
    memo:buildMemoFromExcel(row),
    createdAt:now,
    updatedAt:now
  };

  const key = makeImportKey(gear);

  if(existingMap.has(key)){
    const existing = existingMap.get(key);

    gear.id = existing.id;
    gear.createdAt = existing.createdAt || now;

    if(!gear.category) gear.category = existing.category || "";
    if(!gear.purchaseDate) gear.purchaseDate = existing.purchaseDate || "";
    if(!gear.price) gear.price = existing.price || "";

    if(existing.memo && gear.memo){
      gear.memo = existing.memo + "\n\n--- Excel取込 ---\n" + gear.memo;
    }else if(existing.memo && !gear.memo){
      gear.memo = existing.memo;
    }
  }

  return gear;
}

function rowsFromWorkbook(workbook){
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  return XLSX.utils.sheet_to_json(sheet,{
    defval:"",
    raw:false
  });
}

async function importGearRows(rows){
  const current = await getAllGears();
  const existingMap = new Map();

  current.forEach(g=>{
    existingMap.set(makeImportKey(g),g);
  });

  let imported = 0;
  let skipped = 0;
  let updated = 0;
  let created = 0;

  for(const row of rows){
    const gear = normalizeImportedGear(row,existingMap);

    if(!gear.name || !gear.category){
      skipped++;
      continue;
    }

    const existed = existingMap.has(makeImportKey(gear));

    await putGear(gear);

    existingMap.set(makeImportKey(gear),gear);

    imported++;

    if(existed){
      updated++;
    }else{
      created++;
    }
  }

  return {
    imported:imported,
    skipped:skipped,
    updated:updated,
    created:created
  };
}

async function handleGearExcelImport(event){
  const file = event.target.files && event.target.files[0];

  if(!file){
    return;
  }

  const info = document.getElementById("gearImportInfo");

  try{
    if(typeof XLSX === "undefined"){
      alert("Excel読込ライブラリが読み込まれていません");
      return;
    }

    if(info){
      info.innerHTML = "Excel読込中...";
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer,{type:"array"});
    const rows = rowsFromWorkbook(workbook);

    if(rows.length === 0){
      alert("Excelに取込対象データがありません");
      if(info) info.innerHTML = "取込対象なし";
      return;
    }

    const result = await importGearRows(rows);

    if(info){
      info.innerHTML =
        "取込：" + result.imported + "件 / " +
        "新規：" + result.created + "件 / " +
        "更新：" + result.updated + "件 / " +
        "スキップ：" + result.skipped + "件";
    }

    await renderGearList();

    alert(
      "Excel取込完了\n\n" +
      "取込：" + result.imported + "件\n" +
      "新規：" + result.created + "件\n" +
      "更新：" + result.updated + "件\n" +
      "スキップ：" + result.skipped + "件"
    );

  }catch(error){
    console.error(error);

    if(info){
      info.innerHTML = "Excel取込エラー";
    }

    alert("Excel取込に失敗しました");
  }finally{
    event.target.value = "";
  }
}

window.showGearPage = showGearPage;
window.showGearForm = showGearForm;
window.hideGearForm = hideGearForm;
window.renderGearList = renderGearList;
window.saveGear = saveGear;
window.showGearDetail = showGearDetail;
window.deleteGear = deleteGear;
window.handleGearExcelImport = handleGearExcelImport;
