/* =========================================================
   OUTBASE
   campgroundSelector.js
   Phase4-A-53D
========================================================= */

async function showCampgroundSelector(){
  const modal = document.getElementById("campgroundModal");
  if(!modal) return;

  modal.classList.remove("hidden");
  await renderCampgroundSelectorList();
}

function closeCampgroundSelector(){
  const modal = document.getElementById("campgroundModal");
  if(modal) modal.classList.add("hidden");

  if(typeof backToHome === "function"){
    backToHome();
  }
}

async function renderCampgroundSelectorList(){
  const keyword =
    (document.getElementById("campgroundSearchInput")?.value || "").trim();

  const recentContainer = document.getElementById("recentCampgrounds");
  const listContainer = document.getElementById("campgroundList");

  const allCampgrounds = keyword
    ? await searchCampgrounds(keyword)
    : await getAllCampgrounds();

  const recentCampgrounds = [...allCampgrounds]
    .sort((a,b)=>String(b.updatedAt||"").localeCompare(String(a.updatedAt||"")))
    .slice(0,5);

  renderCampgroundItems(recentContainer, recentCampgrounds);
  renderCampgroundItems(listContainer, allCampgrounds);
}

function renderCampgroundItems(container,list){
  if(!container) return;

  if(!list || list.length===0){
    container.innerHTML = "キャンプ場なし";
    return;
  }

  container.innerHTML = list.map(cg => `
    <div class="campground-item"
         onclick="selectCampground('${cg.id}')">
      ${cg.name || "名称未設定"}
    </div>
  `).join("");
}

async function selectCampground(campgroundId){

  const allCampgrounds = await getAllCampgrounds();
  const campground = allCampgrounds.find(c=>c.id===campgroundId);

  if(!campground){
    alert("キャンプ場が見つかりません");
    return;
  }

  if(typeof setSelectedCampground === "function"){
    setSelectedCampground(campground);
  }

  document.getElementById("campgroundModal")?.classList.add("hidden");

  if(typeof continueCampStart === "function"){
    continueCampStart();
  }
}

async function createCampgroundFromSelector(){
  const input = document.getElementById("newCampgroundNameInput");
  const name = (input?.value || "").trim();

  if(!name){
    alert("キャンプ場名を入力してください");
    return;
  }

  const campground = await createCampground(name);

  if(input) input.value = "";

  if(typeof setSelectedCampground === "function"){
    setSelectedCampground(campground);
  }

  document.getElementById("campgroundModal")?.classList.add("hidden");

  if(typeof continueCampStart === "function"){
    continueCampStart();
  }
}

window.showCampgroundSelector = showCampgroundSelector;
window.closeCampgroundSelector = closeCampgroundSelector;
window.renderCampgroundSelectorList = renderCampgroundSelectorList;
window.selectCampground = selectCampground;
window.createCampgroundFromSelector = createCampgroundFromSelector;
