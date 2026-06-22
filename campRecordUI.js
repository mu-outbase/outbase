/* OUTBASE Phase8-F campRecordUI.js */
function crText(v){return escapeHtml(v ?? "");}
function campRecordValue(id){const el=document.getElementById(id);return el?el.value.trim():"";}
function showCampRecordPage(){
  ["homePage","walkPage","campPage","detailPage","gearPage","campgroundPage","campRecordPage"].forEach(id=>{
    const p=document.getElementById(id); if(p)p.classList.add("hidden");
  });
  document.getElementById("campRecordPage")?.classList.remove("hidden");
  hideCampRecordForm(); hideCampRecordDetail(); renderCampRecordList();
}
function backFromCampRecordPage(){
  document.getElementById("campRecordPage")?.classList.add("hidden");
  if(typeof backToHome==="function") backToHome();
}
function clearCampRecordForm(){
  ["campRecordIdInput","campRecordTitleInput","campRecordStartInput","campRecordEndInput","campRecordNightsInput","campRecordSiteInput","campRecordWeatherInput","campRecordMembersInput","campRecordPetsInput","campRecordGoodInput","campRecordBadInput","campRecordNextInput","campRecordMemoInput"].forEach(id=>{
    const el=document.getElementById(id); if(el)el.value="";
  });
}
async function fillCampgroundSelect(selectedId){
  const sel=document.getElementById("campRecordCampgroundInput"); if(!sel)return;
  const list=await getAllCampgrounds();
  if(list.length===0){sel.innerHTML='<option value="">キャンプ場なし</option>';return;}
  sel.innerHTML=list.map(cg=>`<option value="${crText(cg.id)}" ${cg.id===selectedId?"selected":""}>${crText(cg.name||"名称未設定")}</option>`).join("");
}
async function showCampRecordForm(id){
  clearCampRecordForm();
  document.getElementById("campRecordFormCard")?.classList.remove("hidden");
  const t=document.getElementById("campRecordFormTitle"); if(t)t.innerHTML=id?"キャンプ実績編集":"キャンプ実績追加";
  if(!id){await fillCampgroundSelect(""); return;}
  const r=await getCampRecord(id); if(!r){alert("キャンプ実績が見つかりません");return;}
  await fillCampgroundSelect(r.campgroundId);
  document.getElementById("campRecordIdInput").value=r.id||"";
  document.getElementById("campRecordTitleInput").value=r.title||"";
  document.getElementById("campRecordStartInput").value=r.startDate||"";
  document.getElementById("campRecordEndInput").value=r.endDate||"";
  document.getElementById("campRecordNightsInput").value=r.nights||"";
  document.getElementById("campRecordSiteInput").value=r.siteName||"";
  document.getElementById("campRecordWeatherInput").value=r.weather||"";
  document.getElementById("campRecordMembersInput").value=r.members||"";
  document.getElementById("campRecordPetsInput").value=(r.pets||[]).join("、");
  document.getElementById("campRecordGoodInput").value=r.goodPoints||"";
  document.getElementById("campRecordBadInput").value=r.badPoints||"";
  document.getElementById("campRecordNextInput").value=r.nextImprovements||"";
  document.getElementById("campRecordMemoInput").value=r.memo||"";
}
function hideCampRecordForm(){document.getElementById("campRecordFormCard")?.classList.add("hidden");}
function hideCampRecordDetail(){document.getElementById("campRecordDetailCard")?.classList.add("hidden");}
async function buildCampRecordFromForm(){
  const id=campRecordValue("campRecordIdInput")||createCampRecordId();
  const campgroundId=campRecordValue("campRecordCampgroundInput");
  const cg=campgroundId?await getCampground(campgroundId):null;
  const startDate=campRecordValue("campRecordStartInput");
  const endDate=campRecordValue("campRecordEndInput");
  const manual=Number(campRecordValue("campRecordNightsInput")||0);
  const now=new Date().toISOString();
  return {
    id, campgroundId, campgroundName:cg?.name||"",
    title:campRecordValue("campRecordTitleInput"),
    startDate, endDate, nights:manual||calcCampRecordNights(startDate,endDate),
    siteName:campRecordValue("campRecordSiteInput"),
    weather:campRecordValue("campRecordWeatherInput"),
    members:campRecordValue("campRecordMembersInput"),
    pets:campRecordValue("campRecordPetsInput").split(/[、,]/).map(v=>v.trim()).filter(Boolean),
    goodPoints:campRecordValue("campRecordGoodInput"),
    badPoints:campRecordValue("campRecordBadInput"),
    nextImprovements:campRecordValue("campRecordNextInput"),
    memo:campRecordValue("campRecordMemoInput"),
    createdAt:campRecordValue("campRecordIdInput")?"":now,
    updatedAt:now
  };
}
async function saveCampRecordForm(){
  const r=await buildCampRecordFromForm();
  if(!r.campgroundId){alert("キャンプ場を選択してください");return;}
  if(!r.startDate){alert("開始日を入力してください");return;}
  try{
    await saveCampRecord(r);
    hideCampRecordForm(); await renderCampRecordList(); await showCampRecordDetail(r.id);
  }catch(e){console.error(e);alert("キャンプ実績保存に失敗しました");}
}
function filterAndSortCampRecords(records){
  const kw=campRecordValue("campRecordSearchInput").toLowerCase();
  const sort=campRecordValue("campRecordSortSelect")||"new";
  let list=records||[];
  if(kw){
    list=list.filter(r=>[r.campgroundName,r.title,r.siteName,r.weather,r.members,(r.pets||[]).join(" "),r.memo,r.goodPoints,r.badPoints,r.nextImprovements].join(" ").toLowerCase().includes(kw));
  }
  list.sort((a,b)=>{
    if(sort==="old")return String(a.startDate||"").localeCompare(String(b.startDate||""));
    if(sort==="nights")return Number(b.nights||0)-Number(a.nights||0);
    if(sort==="campground")return String(a.campgroundName||"").localeCompare(String(b.campgroundName||""),"ja");
    return String(b.startDate||"").localeCompare(String(a.startDate||""));
  });
  return list;
}
async function renderCampRecordList(){
  const c=document.getElementById("campRecordList"); if(!c)return;
  try{
    const records=filterAndSortCampRecords(await getAllCampRecords());
    if(records.length===0){c.innerHTML="実績なし";return;}
    c.innerHTML=records.map(r=>`<div class="record" onclick="showCampRecordDetail('${crText(r.id)}')"><div class="record-title">🏕 ${crText(r.campgroundName||"キャンプ場未設定")}</div><div class="record-row">${crText(r.startDate||"未設定")} 〜 ${crText(r.endDate||"未設定")}</div><div class="record-row">${crText(r.nights||0)}泊</div><div class="record-row">サイト<br>${crText(r.siteName||"未設定")}</div><div class="record-row">参加<br>${crText(r.members||"未設定")}</div></div>`).join("");
  }catch(e){console.error(e);c.innerHTML="キャンプ実績読み込みエラー";}
}
async function showCampRecordDetail(id){
  const card=document.getElementById("campRecordDetailCard"), content=document.getElementById("campRecordDetailContent");
  if(!card||!content)return;
  try{
    const r=await getCampRecord(id); if(!r){alert("キャンプ実績が見つかりません");return;}
    card.classList.remove("hidden");
    content.innerHTML=`<div class="detail-section"><div class="detail-title">キャンプ場</div><div class="detail-value">${crText(r.campgroundName||"")}</div></div><div class="detail-section"><div class="detail-title">日程</div><div class="detail-value">${crText(r.startDate||"")} 〜 ${crText(r.endDate||"")}<br>${crText(r.nights||0)}泊</div></div><div class="detail-section"><div class="detail-title">サイト・天気</div><div class="detail-value">サイト：${crText(r.siteName||"未設定")}<br>天気：${crText(r.weather||"未設定")}</div></div><div class="detail-section"><div class="detail-title">参加者・ペット</div><div class="detail-value">参加者：${crText(r.members||"未設定")}<br>ペット：${crText((r.pets||[]).join("、")||"未設定")}</div></div><div class="detail-section"><div class="detail-title">改善履歴</div><div class="detail-value">良かった：${crText(r.goodPoints||"なし")}<br><br>悪かった：${crText(r.badPoints||"なし")}<br><br>次回改善：${crText(r.nextImprovements||"なし")}</div></div><div class="detail-section"><div class="detail-title">メモ</div><div class="detail-value">${crText(r.memo||"なし")}</div></div><button onclick="showCampRecordForm('${crText(r.id)}')">編集</button><button class="deleteButton" onclick="deleteCampRecordFromUI('${crText(r.id)}')">削除</button>`;
  }catch(e){console.error(e);alert("キャンプ実績詳細表示に失敗しました");}
}
async function deleteCampRecordFromUI(id){
  if(!confirm("このキャンプ実績を削除しますか？"))return;
  try{await deleteCampRecord(id); hideCampRecordDetail(); await renderCampRecordList();}
  catch(e){console.error(e);alert("キャンプ実績削除に失敗しました");}
}
window.showCampRecordPage=showCampRecordPage;
window.backFromCampRecordPage=backFromCampRecordPage;
window.renderCampRecordList=renderCampRecordList;
window.showCampRecordForm=showCampRecordForm;
window.hideCampRecordForm=hideCampRecordForm;
window.saveCampRecordForm=saveCampRecordForm;
window.showCampRecordDetail=showCampRecordDetail;
window.deleteCampRecordFromUI=deleteCampRecordFromUI;
