let currentDetailRecordId = null;

async function getRecordById(id){
  const records = await getRecords();let currentDetailRecordId = null;

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

  const headerHtml = isCamp
    ? makeCampHeaderHtml(r)
    : makeStandardHeaderHtml(r,detailTitle,detailTags,detailType);

  const campInfoHtml = isCamp ? makeCampInfoHtml(r) : "";
  const campSummaryHtml = isCamp ? makeCampSummaryHtml(r) : "";
  const campTimeHtml = isCamp ? makeCampTimeHtml(r) : "";
  const campGearHtml = isCamp ? makeCampGearHtml(r) : "";
  const campMealHtml = isCamp ? makeCampMealHtml(r) : "";
  const campReviewHtml = isCamp ? makeCampReviewHtml(r) : "";

  const walkHtml = isCamp ? "" : makeWalkHtml(r);
  const gpsHtml = isCamp ? "" : makeGpsHtml(r);
  const gpsHistoryHtml = isCamp ? "" : makeGpsHistorySectionHtml(r);
  const mapHtml = isCamp ? "" : makeMapSectionHtml();

  document.getElementById("detailContent").innerHTML = `
    <div id="detailViewArea">

      ${headerHtml}

      ${campSummaryHtml}

      ${campInfoHtml}

      ${campTimeHtml}

      ${mapHtml}

      ${walkHtml}

      ${gpsHtml}

      ${gpsHistoryHtml}

      <div class="detail-section">
        <div class="detail-title">📷 写真（${getPhotoCount(r)}枚）</div>
        <div class="detail-value photo-list">${makePhotosHtml(r)}</div>
      </div>

      ${campGearHtml}

      ${campMealHtml}

      <div class="detail-section">
        <div class="detail-title">🎤 音声（${getAudioCount(r)}件）</div>
        <div class="detail-value">${makeAudioHtml(r)}</div>
      </div>

      <div class="detail-section">
        <div class="detail-title">📝 メモ（${getNoteCount(r)}件）</div>
        <div class="detail-value">${makeNotesHtml(r)}</div>
      </div>

      ${campReviewHtml}

      ${makeDeveloperInfoHtml(r)}

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

function makeStandardHeaderHtml(r,detailTitle,detailTags,detailType){
  return `
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
  `;
}

function makeCampHeaderHtml(r){
  const camp = r.camp || {};
  const title = camp.siteName || r.title || "キャンプ記録";
  const area = camp.area || "";
  const tags = makeCampTagList(r);

  return `
    <div class="detail-section">
      <div class="detail-title">⛺ キャンプ記録</div>
      <div class="detail-value">
        <strong>${escapeHtml(title)}</strong><br>
        ${area ? escapeHtml(area) + "<br>" : ""}
        <div class="record-tags">${formatTags(tags)}</div>
      </div>
    </div>
  `;
}

function makeCampTagList(r){
  const camp = r.camp || {};
  const tags = [];

  tags.push("キャンプ");

  if(camp.siteName){
    tags.push(camp.siteName);
  }

  if(camp.area){
    tags.push(camp.area);
  }

  if(camp.pet){
    tags.push(camp.pet);
  }

  if(Array.isArray(r.tags)){
    r.tags.forEach(t=>{
      if(t && !tags.includes(t)){
        tags.push(t);
      }
    });
  }

  return tags;
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

function makeCampSummaryHtml(r){
  return `
    <div class="detail-section">
      <div class="detail-title">📊 キャンプ統計</div>
      <div class="detail-value">
        📷 写真：${getPhotoCount(r)}枚<br>
        🛠 ギア：${getGearCount(r)}件<br>
        🍳 料理：${getMealCount(r)}件<br>
        📝 メモ：${getNoteCount(r)}件
      </div>
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

function makeCampTimeHtml(r){
  const start = r.session?.startTime || "";
  const end = r.session?.endTime || "";

  return `
    <div class="detail-section">
      <div class="detail-title">🕒 キャンプ時間</div>
      <div class="detail-value">
        開始：${escapeHtml(start || "未取得")}<br>
        終了：${escapeHtml(end || "未取得")}<br>
        滞在時間：${escapeHtml(calcStayTime(start,end))}
      </div>
    </div>
  `;
}

function calcStayTime(start,end){
  if(!start || !end){
    return "未計算";
  }

  const startDate = new Date(start);
  const endDate = new Date(end);

  if(Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())){
    return "未計算";
  }

  const diffMs = endDate.getTime() - startDate.getTime();

  if(diffMs < 0){
    return "未計算";
  }

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if(days > 0){
    return days + "日 " + hours + "時間 " + minutes + "分";
  }

  if(hours > 0){
    return hours + "時間 " + minutes + "分";
  }

  return minutes + "分";
}

function makeCampGearHtml(r){
  const camp = r.camp || {};
  const gear = Array.isArray(camp.gear) ? camp.gear : [];

  if(gear.length === 0){
    return `
      <div class="detail-section">
        <div class="detail-title">🛠 使用ギア（0件）</div>
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
      <div class="detail-title">🛠 使用ギア（${gear.length}件）</div>
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
        <div class="detail-title">🍳 料理（0件）</div>
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
      <div class="detail-title">🍳 料理（${meals.length}件）</div>
      <div class="detail-value">${html}</div>
    </div>
  `;
}

function makeCampReviewHtml(r){
  const reviewHtml = typeof generateCampReview === "function"
    ? generateCampReview(r)
    : "レビュー生成機能を読み込めませんでした";

  return `
    <div class="detail-section">
      <div class="detail-title">⭐ キャンプレビュー</div>
      <div class="detail-value">
        ${reviewHtml}
      </div>
    </div>
  `;
}

function makeDeveloperInfoHtml(r){
  return `
    <div class="detail-section">
      <div class="detail-title">🧩 開発情報</div>
      <div class="detail-value">
        <details>
          <summary>表示</summary>
          <div class="session-id">
            RecordID：${escapeHtml(r.id || "")}<br>
            Session：${escapeHtml(r.session?.id || "")}<br>
            Type：${escapeHtml(getRecordType(r))}<br>
            Version：Phase9
          </div>
        </details>
      </div>
    </div>
  `;
}

function getPhotoCount(r){
  return r.summary?.photoCount || (Array.isArray(r.photos) ? r.photos.length : 0);
}

function getAudioCount(r){
  return r.summary?.audioCount || (Array.isArray(r.audio) ? r.audio.length : 0);
}

function getNoteCount(r){
  return r.summary?.noteCount || (Array.isArray(r.notes) ? r.notes.length : 0);
}

function getGearCount(r){
  const camp = r.camp || {};
  return r.summary?.gearCount || (Array.isArray(camp.gear) ? camp.gear.length : 0);
}

function getMealCount(r){
  const camp = r.camp || {};
  return r.summary?.mealCount || (Array.isArray(camp.meals) ? camp.meals.length : 0);
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

  const headerHtml = isCamp
    ? makeCampHeaderHtml(r)
    : makeStandardHeaderHtml(r,detailTitle,detailTags,detailType);

  const campInfoHtml = isCamp ? makeCampInfoHtml(r) : "";
  const campSummaryHtml = isCamp ? makeCampSummaryHtml(r) : "";
  const campTimeHtml = isCamp ? makeCampTimeHtml(r) : "";
  const campGearHtml = isCamp ? makeCampGearHtml(r) : "";
  const campMealHtml = isCamp ? makeCampMealHtml(r) : "";
  const campReviewHtml = isCamp ? makeCampReviewHtml(r) : "";

  const walkHtml = isCamp ? "" : makeWalkHtml(r);
  const gpsHtml = isCamp ? "" : makeGpsHtml(r);
  const gpsHistoryHtml = isCamp ? "" : makeGpsHistorySectionHtml(r);
  const mapHtml = isCamp ? "" : makeMapSectionHtml();

  document.getElementById("detailContent").innerHTML = `
    <div id="detailViewArea">

      ${headerHtml}

      ${campSummaryHtml}

      ${campInfoHtml}

      ${campTimeHtml}

      ${mapHtml}

      ${walkHtml}

      ${gpsHtml}

      ${gpsHistoryHtml}

      <div class="detail-section">
        <div class="detail-title">📷 写真（${getPhotoCount(r)}枚）</div>
        <div class="detail-value photo-list">${makePhotosHtml(r)}</div>
      </div>

      ${campGearHtml}

      ${campMealHtml}

      <div class="detail-section">
        <div class="detail-title">🎤 音声（${getAudioCount(r)}件）</div>
        <div class="detail-value">${makeAudioHtml(r)}</div>
      </div>

      <div class="detail-section">
        <div class="detail-title">📝 メモ（${getNoteCount(r)}件）</div>
        <div class="detail-value">${makeNotesHtml(r)}</div>
      </div>

      ${campReviewHtml}

      ${makeDeveloperInfoHtml(r)}

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

function makeStandardHeaderHtml(r,detailTitle,detailTags,detailType){
  return `
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
  `;
}

function makeCampHeaderHtml(r){
  const camp = r.camp || {};
  const title = camp.siteName || r.title || "キャンプ記録";
  const area = camp.area || "";
  const tags = makeCampTagList(r);

  return `
    <div class="detail-section">
      <div class="detail-title">⛺ キャンプ記録</div>
      <div class="detail-value">
        <strong>${escapeHtml(title)}</strong><br>
        ${area ? escapeHtml(area) + "<br>" : ""}
        <div class="record-tags">${formatTags(tags)}</div>
      </div>
    </div>
  `;
}

function makeCampTagList(r){
  const camp = r.camp || {};
  const tags = [];

  tags.push("キャンプ");

  if(camp.siteName){
    tags.push(camp.siteName);
  }

  if(camp.area){
    tags.push(camp.area);
  }

  if(camp.pet){
    tags.push(camp.pet);
  }

  if(Array.isArray(r.tags)){
    r.tags.forEach(t=>{
      if(t && !tags.includes(t)){
        tags.push(t);
      }
    });
  }

  return tags;
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

function makeCampSummaryHtml(r){
  return `
    <div class="detail-section">
      <div class="detail-title">📊 キャンプ統計</div>
      <div class="detail-value">
        📷 写真：${getPhotoCount(r)}枚<br>
        🛠 ギア：${getGearCount(r)}件<br>
        🍳 料理：${getMealCount(r)}件<br>
        📝 メモ：${getNoteCount(r)}件
      </div>
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

function makeCampTimeHtml(r){
  const start = r.session?.startTime || "";
  const end = r.session?.endTime || "";

  return `
    <div class="detail-section">
      <div class="detail-title">🕒 キャンプ時間</div>
      <div class="detail-value">
        開始：${escapeHtml(start || "未取得")}<br>
        終了：${escapeHtml(end || "未取得")}<br>
        滞在時間：${escapeHtml(calcStayTime(start,end))}
      </div>
    </div>
  `;
}

function calcStayTime(start,end){
  if(!start || !end){
    return "未計算";
  }

  const startDate = new Date(start);
  const endDate = new Date(end);

  if(Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())){
    return "未計算";
  }

  const diffMs = endDate.getTime() - startDate.getTime();

  if(diffMs < 0){
    return "未計算";
  }

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if(days > 0){
    return days + "日 " + hours + "時間 " + minutes + "分";
  }

  if(hours > 0){
    return hours + "時間 " + minutes + "分";
  }

  return minutes + "分";
}

function makeCampGearHtml(r){
  const camp = r.camp || {};
  const gear = Array.isArray(camp.gear) ? camp.gear : [];

  if(gear.length === 0){
    return `
      <div class="detail-section">
        <div class="detail-title">🛠 使用ギア（0件）</div>
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
      <div class="detail-title">🛠 使用ギア（${gear.length}件）</div>
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
        <div class="detail-title">🍳 料理（0件）</div>
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
      <div class="detail-title">🍳 料理（${meals.length}件）</div>
      <div class="detail-value">${html}</div>
    </div>
  `;
}

function makeCampReviewHtml(r){
  return `
    <div class="detail-section">
      <div class="detail-title">⭐ キャンプレビュー</div>
      <div class="detail-value">
        レビュー未生成<br>
        <span class="note-time">今後、写真・ギア・料理・メモから自動生成予定</span>
      </div>
    </div>
  `;
}

function makeDeveloperInfoHtml(r){
  return `
    <div class="detail-section">
      <div class="detail-title">🧩 開発情報</div>
      <div class="detail-value">
        <details>
          <summary>表示</summary>
          <div class="session-id">
            RecordID：${escapeHtml(r.id || "")}<br>
            Session：${escapeHtml(r.session?.id || "")}<br>
            Type：${escapeHtml(getRecordType(r))}<br>
            Version：Phase9
          </div>
        </details>
      </div>
    </div>
  `;
}

function getPhotoCount(r){
  return r.summary?.photoCount || (Array.isArray(r.photos) ? r.photos.length : 0);
}

function getAudioCount(r){
  return r.summary?.audioCount || (Array.isArray(r.audio) ? r.audio.length : 0);
}

function getNoteCount(r){
  return r.summary?.noteCount || (Array.isArray(r.notes) ? r.notes.length : 0);
}

function getGearCount(r){
  const camp = r.camp || {};
  return r.summary?.gearCount || (Array.isArray(camp.gear) ? camp.gear.length : 0);
}

function getMealCount(r){
  const camp = r.camp || {};
  return r.summary?.mealCount || (Array.isArray(camp.meals) ? camp.meals.length : 0);
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
