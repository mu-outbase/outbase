let currentDetailRecordId = null;

async function getRecordById(id){
  const records = await getRecords();
  return records.find(r=>r.id === id) || null;
}

async function showDetail(id){
  const r = await getRecordById(id);

  if(!r){
    alert("記録が見つかりません");
    return;
  }

  currentDetailRecordId = id;

  const detailTitle = getRecordTitle(r);
  const detailTags = Array.isArray(r.tags) ? r.tags : [];
  const detailType = getRecordType(r);
  const isCamp = detailType === "camp";

  const campInfoHtml = isCamp ? makeCampInfoHtml(r) : "";
  const campGearHtml = isCamp ? makeCampGearHtml(r) : "";
  const campMealHtml = isCamp ? makeCampMealHtml(r) : "";
  const walkHtml = isCamp ? "" : makeWalkHtml(r);
  const gpsHtml = isCamp ? "" : makeGpsHtml(r);
  const gpsHistoryHtml = isCamp ? "" : makeGpsHistorySectionHtml(r);
  const mapHtml = isCamp ? "" : makeMapSectionHtml();

  document.getElementById("detailContent").innerHTML = `
    <div id="detailViewArea">

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
        <div class="detail-value">${escapeHtml(r.date || "")}</div>
      </div>

      ${campInfoHtml}

      ${mapHtml}

      ${walkHtml}

      ${gpsHtml}

      ${gpsHistoryHtml}

      ${campGearHtml}

      ${campMealHtml}

      <div class="detail-section">
        <div class="detail-title">📷 写真</div>
        <div class="detail-value photo-list">${makePhotosHtml(r)}</div>
      </div>

      <div class="detail-section">
        <div class="detail-title">🎤 音声</div>
        <div class="detail-value">${makeAudioHtml(r)}</div>
      </div>

      <div class="detail-section">
        <div class="detail-title">📝 メモ</div>
        <div class="detail-value">${makeNotesHtml(r)}</div>
      </div>

      <div class="detail-section">
        <div class="detail-title">🆔 Session</div>
        <div class="session-id">${escapeHtml(r.session?.id || "")}</div>
      </div>

      <div class="action-area">
        <button class="editButton" onclick="openEditModal('${escapeHtml(r.id)}')">
          この記録を編集
        </button>

        <button class="deleteButton" onclick="confirmDelete('${escapeHtml(r.id)}')">
          この記録を削除
        </button>
      </div>

    </div>
  `;

  showPage("detailPage");

  if(!isCamp){
    renderMap(r);
  }
}

function makeMapSectionHtml(){
  return `
    <div class="detail-section">
      <div class="detail-title">🗺️ 地図</div>
      <div id="map"></div>
    </div>
  `;
}

function makeWalkHtml(r){
  return `
    <div class="detail-section">
      <div class="detail-title">🚶 散歩</div>
      <div class="detail-value">
        時間：${escapeHtml(r.walk?.time || "00:00:00")}<br>
        距離：${escapeHtml(r.walk?.distanceKm || "0.00km")}<br>
        平均速度：${escapeHtml(r.walk?.avgSpeed || "0.00km/h")}
      </div>
    </div>
  `;
}

function makeGpsHtml(r){
  return `
    <div class="detail-section">
      <div class="detail-title">📍 GPS</div>
      <div class="detail-value">
        開始：${escapeHtml(r.gps?.start || "未取得")}<br>
        終了：${escapeHtml(r.gps?.end || "未取得")}<br>
        取得ポイント：${r.summary?.gpsPointCount || 0}件<br>
        有効ポイント：${r.summary?.validGpsPointCount || getValidGpsCount(r.gps?.history || [])}件
      </div>
    </div>
  `;
}

function makeGpsHistorySectionHtml(r){
  return `
    <div class="detail-section">
      <div class="detail-title">📍 GPS履歴</div>
      <div class="detail-value">${makeGpsHistoryHtml(r)}</div>
    </div>
  `;
}

function makeCampInfoHtml(r){
  const camp = r.camp || {};

  return `
    <div class="detail-section">
      <div class="detail-title">⛺ キャンプ情報</div>
      <div class="detail-value">
        キャンプ場：${escapeHtml(camp.siteName || r.title || "未入力")}<br>
        エリア・サイト：${escapeHtml(camp.area || "未入力")}<br>
        宿泊数：${escapeHtml(camp.stay || "未入力")}<br>
        参加者：${escapeHtml(camp.member || "未入力")}<br>
        ペット：${escapeHtml(camp.pet || "未入力")}<br>
        天候：${escapeHtml(camp.weather || "未入力")}
      </div>
    </div>
  `;
}

function makeCampGearHtml(r){
  const camp = r.camp || {};
  const gear = Array.isArray(camp.gear) ? camp.gear : [];

  if(gear.length === 0){
    return `
      <div class="detail-section">
        <div class="detail-title">🛠 使用ギア</div>
        <div class="detail-value">ギアなし</div>
      </div>
    `;
  }

  let html = "";

  gear.forEach((g,index)=>{
    html += `
      <div class="note-item">
        ${index + 1}. ${escapeHtml(g.name || "")}
        <div class="note-time">${escapeHtml(g.time || "")}</div>
      </div>
    `;
  });

  return `
    <div class="detail-section">
      <div class="detail-title">🛠 使用ギア</div>
      <div class="detail-value">${html}</div>
    </div>
  `;
}

function makeCampMealHtml(r){
  const camp = r.camp || {};
  const meals = Array.isArray(camp.meals) ? camp.meals : [];

  if(meals.length === 0){
    return `
      <div class="detail-section">
        <div class="detail-title">🍳 料理</div>
        <div class="detail-value">料理なし</div>
      </div>
    `;
  }

  let html = "";

  meals.forEach((m,index)=>{
    html += `
      <div class="note-item">
        ${index + 1}. ${escapeHtml(m.name || "")}
        <div class="note-time">${escapeHtml(m.time || "")}</div>
      </div>
    `;
  });

  return `
    <div class="detail-section">
      <div class="detail-title">🍳 料理</div>
      <div class="detail-value">${html}</div>
    </div>
  `;
}

function makePhotosHtml(r){
  if(!r.photos || r.photos.length === 0){
    return "写真なし";
  }

  let html = "";

  r.photos.forEach((p,index)=>{
    if(p.data){
      html += `
        <img
          src="${p.data}"
          class="photo-thumb"
          alt="写真${index + 1}"
          onclick="openPhoto('${p.data}')">
      `;
    }
  });

  return html || "写真データなし";
}

function makeAudioHtml(r){
  if(!r.audio || r.audio.length === 0){
    return "音声なし";
  }

  let html = "";

  r.audio.forEach(a=>{
    if(a.data){
      html += `<audio controls src="${a.data}"></audio>`;
    }
  });

  return html || "音声データなし";
}

function makeNotesHtml(r){
  if(!r.notes || r.notes.length === 0){
    return "メモなし";
  }

  let html = "";

  r.notes.forEach(n=>{
    html += `
      <div class="note-item">
        ${escapeHtml(n.text || "")}
        <div class="note-time">${escapeHtml(n.time || "")}</div>
      </div>
    `;
  });

  return html;
}

function makeGpsHistoryHtml(r){
  const history = r.gps && Array.isArray(r.gps.history)
    ? r.gps.history
    : [];

  if(history.length === 0){
    return "GPS履歴なし";
  }

  let html = `
    <div class="gps-summary">
      GPS履歴 ${history.length}件
    </div>

    <button class="gps-toggle" onclick="toggleGpsHistory()">
      ▼ GPS履歴を表示
    </button>

    <div id="gpsHistoryList" class="gps-history-list hidden">
  `;

  let middleCount = 1;

  history.forEach((p,index)=>{
    const label = formatGpsType(p.type,middleCount);

    if(p.type === "point"){
      middleCount++;
    }

    const valid = gpsToLatLng(p.gps) ? "有効" : "無効";

    html += `
      <div class="note-item">
        ${index + 1}. ${escapeHtml(label)} / ${escapeHtml(p.gps)} / ${valid}
        <div class="note-time">${escapeHtml(p.time || "")}</div>
      </div>
    `;
  });

  html += `</div>`;

  return html;
}

function toggleGpsHistory(){
  const list = document.getElementById("gpsHistoryList");
  const button = document.querySelector(".gps-toggle");

  if(!list){
    return;
  }

  list.classList.toggle("hidden");

  if(button){
    button.innerHTML = list.classList.contains("hidden")
      ? "▼ GPS履歴を表示"
      : "▲ GPS履歴を閉じる";
  }
}

async function confirmDelete(id){
  if(!confirm("この記録を削除しますか？")){
    return;
  }

  await deleteRecord(id);
  alert("削除しました");

  showPage("homePage");
  await loadRecords();
}

function openPhoto(data){
  const modalPhoto = document.getElementById("modalPhoto");
  const photoModal = document.getElementById("photoModal");

  if(modalPhoto){
    modalPhoto.src = data;
  }

  if(photoModal){
    photoModal.classList.remove("hidden");
  }
}

function closePhoto(){
  const modalPhoto = document.getElementById("modalPhoto");
  const photoModal = document.getElementById("photoModal");

  if(photoModal){
    photoModal.classList.add("hidden");
  }

  if(modalPhoto){
    modalPhoto.src = "";
  }
}

window.showDetail = showDetail;
window.toggleGpsHistory = toggleGpsHistory;
window.confirmDelete = confirmDelete;
window.openPhoto = openPhoto;
window.closePhoto = closePhoto;
