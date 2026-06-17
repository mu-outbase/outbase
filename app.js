const DB_NAME = "outbase_db";
const DB_VERSION = 1;

let db;
let seconds = 0;
let timerInterval = null;
let gpsWatcher = null;
let currentSession = null;
let photos = [];
let notes = [];
let audioRecords = [];
let gpsHistory = [];
let mediaRecorder = null;
let audioChunks = [];
let startGps = "未取得";
let endGps = "未取得";
let distanceKm = "未取得";
let mapInstance = null;

const GPS_INTERVAL_MS = 10000;
const GPS_JUMP_LIMIT_KM = 1;

function createId(){
  return "ob_" + Date.now() + "_" + Math.floor(Math.random()*100000);
}

function escapeHtml(value){
  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function getInputValue(id){
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function parseTags(value){
  if(!value) return [];

  return value
    .split(/[，、,\s#]+/)
    .map(v=>v.trim())
    .filter(v=>v !== "")
    .filter((v,i,a)=>a.indexOf(v) === i);
}

function formatTags(tags){
  if(!Array.isArray(tags) || tags.length === 0){
    return "タグなし";
  }

  return tags.map(tag=>"#" + escapeHtml(tag)).join(" ");
}

function getRecordTitle(record){
  return record && record.title ? record.title : "散歩記録";
}

function getRecordType(record){
  if(record && record.recordType) return record.recordType;
  if(record && record.session && record.session.type) return record.session.type;
  return "walk";
}

function getRecordTypeLabel(type){
  if(type === "walk") return "散歩";
  if(type === "camp") return "キャンプ";
  if(type === "gear") return "ギア";
  if(type === "cooking") return "料理";
  if(type === "memo") return "メモ";
  return "記録";
}

function openDatabase(){
  return new Promise((resolve,reject)=>{
    const request = indexedDB.open(DB_NAME,DB_VERSION);

    request.onupgradeneeded = e => {
      db = e.target.result;
      if(!db.objectStoreNames.contains("records")){
        db.createObjectStore("records",{keyPath:"id"});
      }
    };

    request.onsuccess = e => {
      db = e.target.result;
      document.getElementById("storageInfo").innerHTML = "保存基盤：IndexedDB";
      resolve(db);
    };

    request.onerror = () => {
      document.getElementById("storageInfo").innerHTML = "保存基盤：エラー";
      reject();
    };
  });
}

function saveRecord(record){
  return new Promise((resolve,reject)=>{
    const tx = db.transaction("records","readwrite");
    tx.objectStore("records").put(record);
    tx.oncomplete = resolve;
    tx.onerror = reject;
  });
}

function deleteRecord(id){
  return new Promise((resolve,reject)=>{
    const tx = db.transaction("records","readwrite");
    tx.objectStore("records").delete(id);
    tx.oncomplete = resolve;
    tx.onerror = reject;
  });
}

function getRecords(){
  return new Promise((resolve,reject)=>{
    const tx = db.transaction("records","readonly");
    const req = tx.objectStore("records").getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = reject;
  });
}

function showPage(pageId){
  ["homePage","walkPage","detailPage"].forEach(id=>{
    document.getElementById(id).classList.add("hidden");
  });
  document.getElementById(pageId).classList.remove("hidden");
}

function startWalk(){
  showPage("walkPage");

  seconds = 0;
  photos = [];
  notes = [];
  audioRecords = [];
  audioChunks = [];
  gpsHistory = [];
  mediaRecorder = null;
  startGps = "取得中";
  endGps = "未取得";
  distanceKm = "未取得";

  currentSession = {
    id:createId(),
    type:"walk",
    startTime:new Date().toLocaleString(),
    endTime:"",
    status:"open"
  };

  const titleInput = document.getElementById("titleInput");
  const tagInput = document.getElementById("tagInput");
  if(titleInput) titleInput.value = "";
  if(tagInput) tagInput.value = "";

  document.getElementById("timer").innerHTML = "00:00:00";
  document.getElementById("photoInfo").innerHTML = "写真 0枚";
  document.getElementById("photoPreview").innerHTML = "";
  document.getElementById("audioInfo").innerHTML = "音声 0件";
  document.getElementById("audioList").innerHTML = "";
  document.getElementById("noteInfo").innerHTML = "メモ 0件";
  document.getElementById("noteList").innerHTML = "";
  document.getElementById("gpsInfo").innerHTML = "開始GPS取得中...";

  getGps(gps=>{
    startGps = gps;

    addGpsHistory("start",gps);

    document.getElementById("gpsInfo").innerHTML = "開始GPS：" + gps;
  });

  timerInterval = setInterval(()=>{
    seconds++;
    document.getElementById("timer").innerHTML = formatTime(seconds);
  },1000);

  gpsWatcher = setInterval(()=>{
    getGps(gps=>{
      addGpsHistory("point",gps);
    });
  },GPS_INTERVAL_MS);
}

function formatTime(sec){
  const h = Math.floor(sec/3600);
  const m = Math.floor((sec%3600)/60);
  const s = sec%60;

  return String(h).padStart(2,"0") + ":" +
         String(m).padStart(2,"0") + ":" +
         String(s).padStart(2,"0");
}

function timeToSeconds(t){
  if(!t) return 0;
  const p = t.split(":").map(Number);
  return (p[0]||0)*3600 + (p[1]||0)*60 + (p[2]||0);
}

function addPhoto(){
  const files = document.getElementById("photoInput").files;

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

      photos.push(photo);

      const img = document.createElement("img");
      img.className = "photo-thumb";
      img.src = photo.data;
      img.onclick = ()=>openPhoto(photo.data);

      document.getElementById("photoPreview").appendChild(img);
      document.getElementById("photoInfo").innerHTML = "写真 " + photos.length + "枚";
    };

    reader.readAsDataURL(file);
  }
}

function addNote(){
  const input = document.getElementById("noteInput");
  const text = input.value.trim();

  if(text === ""){
    alert("メモを入力してください");
    return;
  }

  const note = {
    text:text,
    time:new Date().toLocaleString()
  };

  notes.push(note);

  const div = document.createElement("div");
  div.className = "note-item";
  div.innerHTML = text + '<div class="note-time">' + note.time + '</div>';

  document.getElementById("noteList").appendChild(div);
  document.getElementById("noteInfo").innerHTML = "メモ " + notes.length + "件";
  input.value = "";
}

async function startRecording(){
  try{
    const stream = await navigator.mediaDevices.getUserMedia({audio:true});
    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = e=>{
      if(e.data && e.data.size > 0){
        audioChunks.push(e.data);
      }
    };

    mediaRecorder.onstop = ()=>{
      const audioBlob = new Blob(audioChunks,{type:"audio/webm"});
      const reader = new FileReader();

      reader.onload = e=>{
        const audioData = {
          name:"audio_" + Date.now() + ".webm",
          type:"audio/webm",
          data:e.target.result,
          time:new Date().toLocaleString()
        };

        audioRecords.push(audioData);

        const audio = document.createElement("audio");
        audio.controls = true;
        audio.src = audioData.data;

        document.getElementById("audioList").appendChild(audio);
        document.getElementById("audioInfo").innerHTML = "音声 " + audioRecords.length + "件";
      };

      reader.readAsDataURL(audioBlob);
      stream.getTracks().forEach(track=>track.stop());
    };

    mediaRecorder.start();
    alert("録音開始");

  }catch(error){
    console.error(error);
    alert("録音できません");
  }
}

function stopRecording(){
  if(!mediaRecorder){
    alert("録音されていません");
    return;
  }

  if(mediaRecorder.state === "recording"){
    mediaRecorder.stop();
    alert("録音停止");
  }
}

function finishWalk(){
  clearInterval(timerInterval);

  if(gpsWatcher){
    clearInterval(gpsWatcher);
  }

  document.getElementById("gpsInfo").innerHTML = "終了GPS取得中...";

  getGps(async gps=>{
    endGps = gps;

    addGpsHistory("end",endGps);

    distanceKm = calcTrackDistance(gpsHistory);

    const walkTime = document.getElementById("timer").innerHTML;
    const avgSpeed = calcAverageSpeed(distanceKm,walkTime);
    const inputTitle = getInputValue("titleInput");
    const inputTags = parseTags(getInputValue("tagInput"));

    currentSession.endTime = new Date().toLocaleString();
    currentSession.status = "closed";

    const record = {
      id:createId(),
      title:inputTitle || "散歩記録",
      tags:inputTags,
      recordType:"walk",
      session:currentSession,
      date:new Date().toLocaleString(),
      walk:{
        time:walkTime,
        distanceKm:distanceKm,
        avgSpeed:avgSpeed
      },
      gps:{
        start:startGps,
        end:endGps,
        history:gpsHistory
      },
      photos:photos,
      audio:audioRecords,
      notes:notes,
      summary:{
        photoCount:photos.length,
        audioCount:audioRecords.length,
        noteCount:notes.length,
        gpsPointCount:gpsHistory.length,
        validGpsPointCount:getValidGpsCount(gpsHistory)
      }
    };

    try{
      await saveRecord(record);

      alert(
        "散歩終了\nタイトル：" + record.title +
        "\nタグ：" + (record.tags.length ? record.tags.join(",") : "なし") +
        "\n記録種別：" + getRecordTypeLabel(record.recordType) +
        "\n記録時間：" + record.walk.time +
        "\n写真：" + photos.length + "枚" +
        "\n音声：" + audioRecords.length + "件" +
        "\nメモ：" + notes.length + "件" +
        "\nGPS：" + record.summary.validGpsPointCount + "件" +
        "\n移動距離：" + distanceKm +
        "\n平均速度：" + avgSpeed
      );

      location.reload();

    }catch(error){
      console.error(error);
      alert("保存に失敗しました");
    }
  });
}

async function loadRecords(){
  const records = await getRecords();

  records.sort((a,b)=>new Date(b.date)-new Date(a.date));

  renderStats(records);

  if(records.length === 0){
    document.getElementById("recordList").innerHTML = "記録なし";
    return;
  }

  let html = "";

  records.forEach(r=>{
    const title = getRecordTitle(r);
    const tags = Array.isArray(r.tags) ? r.tags : [];
    const recordType = getRecordType(r);

    html += `
      <div class="record" onclick="showDetail('${r.id}')">
        <div class="record-title">📌 ${escapeHtml(title)}</div>
        <div class="record-row">📂 記録種別<br>${escapeHtml(getRecordTypeLabel(recordType))}</div>
        <div class="record-tags">${formatTags(tags)}</div>
        <div class="record-row">📅 日時<br>${escapeHtml(r.date)}</div>
        <div class="record-row">🚶 散歩時間<br>${r.walk.time}</div>
        <div class="record-row">📏 移動距離<br>${r.walk.distanceKm}</div>
        <div class="record-row">⚡ 平均速度<br>${r.walk.avgSpeed || "0.00km/h"}</div>
        <div class="record-row">📷 写真<br>${r.summary.photoCount}枚</div>
        <div class="record-row">🎤 音声<br>${r.summary.audioCount}件</div>
        <div class="record-row">📝 メモ<br>${r.summary.noteCount}件</div>
        <div class="record-row">📍 GPS<br>${r.summary.validGpsPointCount || r.summary.gpsPointCount || 0}件</div>
      </div>
    `;
  });

  document.getElementById("recordList").innerHTML = html;
}

function renderStats(records){
  let totalSec = 0;
  let totalKm = 0;
  let totalPhotos = 0;
  let totalAudio = 0;
  let totalNotes = 0;

  records.forEach(r=>{
    totalSec += timeToSeconds(r.walk?.time || "00:00:00");

    const km = parseFloat((r.walk?.distanceKm || "0").replace("km",""));
    if(!Number.isNaN(km)) totalKm += km;

    totalPhotos += r.summary?.photoCount || 0;
    totalAudio += r.summary?.audioCount || 0;
    totalNotes += r.summary?.noteCount || 0;
  });

  document.getElementById("stats").innerHTML = `
    <div class="stats-grid">
      <div class="stat-box">記録<br>${records.length}回</div>
      <div class="stat-box">総時間<br>${formatTime(totalSec)}</div>
      <div class="stat-box">総距離<br>${totalKm.toFixed(2)}km</div>
      <div class="stat-box">写真<br>${totalPhotos}枚</div>
      <div class="stat-box">音声<br>${totalAudio}件</div>
      <div class="stat-box">メモ<br>${totalNotes}件</div>
    </div>
  `;
}

async function showDetail(id){
  const records = await getRecords();
  const r = records.find(x=>x.id===id);

  if(!r){
    alert("記録が見つかりません");
    return;
  }

  const photosHtml = makePhotosHtml(r);
  const audioHtml = makeAudioHtml(r);
  const notesHtml = makeNotesHtml(r);
  const gpsHistoryHtml = makeGpsHistoryHtml(r);

  const detailTitle = getRecordTitle(r);
  const detailTags = Array.isArray(r.tags) ? r.tags : [];
  const detailType = getRecordType(r);

  document.getElementById("detailContent").innerHTML = `
    <div class="detail-section">
      <div class="detail-title">📌 タイトル</div>
      <div class="detail-value">${escapeHtml(detailTitle)}</div>
    </div>

    <div class="detail-section">
      <div class="detail-title">🏷️ タグ</div>
      <div class="detail-value">${formatTags(detailTags)}</div>
    </div>

    <div class="detail-section">
      <div class="detail-title">📂 記録種別</div>
      <div class="detail-value">${escapeHtml(getRecordTypeLabel(detailType))}</div>
    </div>

    <div class="detail-section">
      <div class="detail-title">📅 日時</div>
      <div class="detail-value">${r.date}</div>
    </div>

    <div class="detail-section">
      <div class="detail-title">🗺️ 地図</div>
      <div id="map"></div>
    </div>

    <div class="detail-section">
      <div class="detail-title">🚶 散歩</div>
      <div class="detail-value">
        時間：${r.walk.time}<br>
        距離：${r.walk.distanceKm}<br>
        平均速度：${r.walk.avgSpeed || "0.00km/h"}
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-title">📍 GPS</div>
      <div class="detail-value">
        開始：${r.gps.start}<br>
        終了：${r.gps.end}<br>
        取得ポイント：${r.summary.gpsPointCount || 0}件<br>
        有効ポイント：${r.summary.validGpsPointCount || getValidGpsCount(r.gps.history)}件
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-title">📍 GPS履歴</div>
      <div class="detail-value">${gpsHistoryHtml}</div>
    </div>

    <div class="detail-section">
      <div class="detail-title">📷 写真</div>
      <div class="detail-value photo-list">${photosHtml}</div>
    </div>

    <div class="detail-section">
      <div class="detail-title">🎤 音声</div>
      <div class="detail-value">${audioHtml}</div>
    </div>

    <div class="detail-section">
      <div class="detail-title">📝 メモ</div>
      <div class="detail-value">${notesHtml}</div>
    </div>

    <div class="detail-section">
      <div class="detail-title">🆔 Session</div>
      <div class="session-id">${r.session.id}</div>
    </div>

    <button class="deleteButton" onclick="confirmDelete('${r.id}')">
      この記録を削除
    </button>
  `;

  showPage("detailPage");
  renderMap(r);
}

function makePhotosHtml(r){
  if(!r.photos || r.photos.length === 0) return "写真なし";

  let html = "";

  r.photos.forEach(p=>{
    if(p.data){
      html += `<img src="${p.data}" class="photo-thumb" onclick="openPhoto('${p.data}')">`;
    }
  });

  return html || "写真データなし";
}

function makeAudioHtml(r){
  if(!r.audio || r.audio.length === 0) return "音声なし";

  let html = "";

  r.audio.forEach(a=>{
    if(a.data){
      html += `<audio controls src="${a.data}"></audio>`;
    }
  });

  return html || "音声データなし";
}

function makeNotesHtml(r){
  if(!r.notes || r.notes.length === 0) return "メモなし";

  let html = "";

  r.notes.forEach(n=>{
    html += `
      <div class="note-item">
        ${n.text}
        <div class="note-time">${n.time}</div>
      </div>
    `;
  });

  return html;
}

function makeGpsHistoryHtml(r){
  if(!r.gps || !r.gps.history || r.gps.history.length === 0){
    return "GPS履歴なし";
  }

  let html = "";
  let middleCount = 1;

  r.gps.history.forEach((p,index)=>{
    const label = formatGpsType(p.type,middleCount);

    if(p.type === "point"){
      middleCount++;
    }

    const valid = gpsToLatLng(p.gps) ? "有効" : "無効";

    html += `
      <div class="note-item">
        ${index + 1}. ${label} / ${p.gps} / ${valid}
        <div class="note-time">${p.time}</div>
      </div>
    `;
  });

  return html;
}

async function confirmDelete(id){
  if(!confirm("この記録を削除しますか？")){
    return;
  }

  await deleteRecord(id);
  alert("削除しました");
  location.reload();
}

function openPhoto(data){
  document.getElementById("modalPhoto").src = data;
  document.getElementById("photoModal").classList.remove("hidden");
}

function closePhoto(){
  document.getElementById("photoModal").classList.add("hidden");
  document.getElementById("modalPhoto").src = "";
}

function backToHome(){
  showPage("homePage");
  loadRecords();
}

window.onload = async function(){
  try{
    await openDatabase();
    await loadRecords();
  }catch(error){
    console.error(error);
    alert("起動に失敗しました");
  }
};

window.onerror = function(msg,url,line){
  alert("ERROR\n" + msg + "\nLINE:" + line);
};

window.searchRecords = searchRecords;
window.clearSearch = clearSearch;
window.showDetail = showDetail;
window.renderStats = renderStats;
window.getRecords = getRecords;
