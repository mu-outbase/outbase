let currentCampSession = null;
let campPhotos = [];
let campNotes = [];
let campGear = [];
let campMeals = [];

function startCamp(){
  showPage("campPage");

  currentCampSession = {
    id:createId(),
    type:"camp",
    startTime:new Date().toLocaleString(),
    endTime:"",
    status:"open"
  };

  campPhotos = [];
  campNotes = [];
  campGear = [];
  campMeals = [];

  setCampValue("campSiteNameInput","");
  setCampValue("campAreaInput","");
  setCampValue("campStayInput","");
  setCampValue("campMemberInput","");
  setCampValue("campPetInput","");
  setCampValue("campWeatherInput","");
  setCampValue("campGearInput","");
  setCampValue("campMealInput","");
  setCampValue("campNoteInput","");

  updateCampInfo();
}

function setCampValue(id,value){
  const el = document.getElementById(id);

  if(el){
    el.value = value;
  }
}

function getCampValue(id){
  const el = document.getElementById(id);

  if(!el){
    return "";
  }

  return el.value.trim();
}

function updateCampInfo(){
  const info = document.getElementById("campInfo");

  if(!info){
    return;
  }

  if(!currentCampSession){
    info.innerHTML = "キャンプ未開始";
    return;
  }

  info.innerHTML =
    "キャンプ開始：" + currentCampSession.startTime;
}

function addCampPhoto(){
  const input = document.getElementById("campPhotoInput");

  if(!input || !input.files){
    return;
  }

  const files = input.files;

  for(let i=0;i<files.length;i++){
    const file = files[i];
    const reader = new FileReader();

    reader.onload = e=>{
      const photo = {
        name:file.name,
        type:file.type,
        data:e.target.result,
        time:new Date().toLocaleString()
      };

      campPhotos.push(photo);
      renderCampPhotos();
    };

    reader.readAsDataURL(file);
  }

  input.value = "";
}

function renderCampPhotos(){
  const info = document.getElementById("campPhotoInfo");
  const list = document.getElementById("campPhotoPreview");

  if(info){
    info.innerHTML = "写真 " + campPhotos.length + "枚";
  }

  if(!list){
    return;
  }

  let html = "";

  campPhotos.forEach((p,index)=>{
    if(p.data){
      html += `
        <img
          src="${p.data}"
          class="photo-thumb"
          alt="キャンプ写真${index + 1}"
          onclick="openPhoto('${p.data}')">
      `;
    }
  });

  list.innerHTML = html;
}

function addCampGear(){
  const value = getCampValue("campGearInput");

  if(value === ""){
    alert("ギアを入力してください");
    return;
  }

  campGear.push({
    name:value,
    time:new Date().toLocaleString()
  });

  setCampValue("campGearInput","");
  renderCampGear();
}

function renderCampGear(){
  const list = document.getElementById("campGearList");

  if(!list){
    return;
  }

  if(campGear.length === 0){
    list.innerHTML = "ギアなし";
    return;
  }

  let html = "";

  campGear.forEach((g,index)=>{
    html += `
      <div class="note-item">
        ${escapeHtml(index + 1)}. ${escapeHtml(g.name)}
        <div class="note-time">${escapeHtml(g.time)}</div>
      </div>
    `;
  });

  list.innerHTML = html;
}

function addCampMeal(){
  const value = getCampValue("campMealInput");

  if(value === ""){
    alert("料理を入力してください");
    return;
  }

  campMeals.push({
    name:value,
    time:new Date().toLocaleString()
  });

  setCampValue("campMealInput","");
  renderCampMeals();
}

function renderCampMeals(){
  const list = document.getElementById("campMealList");

  if(!list){
    return;
  }

  if(campMeals.length === 0){
    list.innerHTML = "料理なし";
    return;
  }

  let html = "";

  campMeals.forEach((m,index)=>{
    html += `
      <div class="note-item">
        ${escapeHtml(index + 1)}. ${escapeHtml(m.name)}
        <div class="note-time">${escapeHtml(m.time)}</div>
      </div>
    `;
  });

  list.innerHTML = html;
}

function addCampNote(){
  const value = getCampValue("campNoteInput");

  if(value === ""){
    alert("メモを入力してください");
    return;
  }

  campNotes.push({
    text:value,
    time:new Date().toLocaleString()
  });

  setCampValue("campNoteInput","");
  renderCampNotes();
}

function renderCampNotes(){
  const list = document.getElementById("campNoteList");
  const info = document.getElementById("campNoteInfo");

  if(info){
    info.innerHTML = "メモ " + campNotes.length + "件";
  }

  if(!list){
    return;
  }

  if(campNotes.length === 0){
    list.innerHTML = "メモなし";
    return;
  }

  let html = "";

  campNotes.forEach((n,index)=>{
    html += `
      <div class="note-item">
        ${escapeHtml(index + 1)}. ${escapeHtml(n.text)}
        <div class="note-time">${escapeHtml(n.time)}</div>
      </div>
    `;
  });

  list.innerHTML = html;
}

function makeCampSummary(){
  return {
    photoCount:campPhotos.length,
    noteCount:campNotes.length,
    gearCount:campGear.length,
    mealCount:campMeals.length
  };
}

function buildCampRecord(){
  const siteName = getCampValue("campSiteNameInput") || "キャンプ記録";
  const area = getCampValue("campAreaInput");
  const stay = getCampValue("campStayInput");
  const member = getCampValue("campMemberInput");
  const pet = getCampValue("campPetInput");
  const weather = getCampValue("campWeatherInput");

  currentCampSession.endTime = new Date().toLocaleString();
  currentCampSession.status = "closed";

  return {
    id:createId(),
    title:siteName,
    tags:["キャンプ",area,pet].filter(v=>v !== ""),
    recordType:"camp",
    session:currentCampSession,
    date:new Date().toLocaleString(),
    camp:{
      siteName:siteName,
      area:area,
      stay:stay,
      member:member,
      pet:pet,
      weather:weather,
      gear:campGear,
      meals:campMeals
    },
    walk:{
      time:"00:00:00",
      distanceKm:"0.00km",
      avgSpeed:"0.00km/h"
    },
    gps:{
      start:"未取得",
      end:"未取得",
      history:[]
    },
    photos:campPhotos,
    audio:[],
    notes:campNotes,
    summary:{
      photoCount:campPhotos.length,
      audioCount:0,
      noteCount:campNotes.length,
      gearCount:campGear.length,
      mealCount:campMeals.length,
      gpsPointCount:0,
      validGpsPointCount:0
    }
  };
}

async function finishCamp(){
  if(!currentCampSession){
    alert("キャンプが開始されていません");
    return;
  }

  const record = buildCampRecord();

  try{
    await saveRecord(record);

    alert(
      "キャンプ終了\n" +
      "キャンプ場：" + record.camp.siteName + "\n" +
      "エリア：" + (record.camp.area || "未入力") + "\n" +
      "宿泊：" + (record.camp.stay || "未入力") + "\n" +
      "写真：" + record.summary.photoCount + "枚\n" +
      "ギア：" + record.summary.gearCount + "件\n" +
      "料理：" + record.summary.mealCount + "件\n" +
      "メモ：" + record.summary.noteCount + "件"
    );

    currentCampSession = null;
    location.reload();

  }catch(error){
    console.error(error);
    alert("キャンプ保存に失敗しました");
  }
}

function cancelCamp(){
  if(!confirm("キャンプ記録を破棄して戻りますか？")){
    return;
  }

  currentCampSession = null;
  campPhotos = [];
  campNotes = [];
  campGear = [];
  campMeals = [];

  showPage("homePage");
}

window.startCamp = startCamp;
window.addCampPhoto = addCampPhoto;
window.addCampGear = addCampGear;
window.addCampMeal = addCampMeal;
window.addCampNote = addCampNote;
window.finishCamp = finishCamp;
window.cancelCamp = cancelCamp;
