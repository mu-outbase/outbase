function searchRecords(){
  const input = document.getElementById("searchInput");
  const keyword = input ? input.value.trim().toLowerCase() : "";

  getRecords().then(records=>{
    records.sort((a,b)=>new Date(b.date)-new Date(a.date));

    const results = keyword === ""
      ? records
      : records.filter(r=>{
          const title = (r.title || "").toLowerCase();

          const tags = Array.isArray(r.tags)
            ? r.tags.join(" ").toLowerCase()
            : "";

          const recordType =
            (r.recordType || r.session?.type || "walk").toLowerCase();

          const recordTypeLabel =
            getRecordTypeLabel(recordType).toLowerCase();

          const date = (r.date || "").toLowerCase();

          const notes = Array.isArray(r.notes)
            ? r.notes.map(n=>n.text || "").join(" ").toLowerCase()
            : "";

          return (
            title.includes(keyword) ||
            tags.includes(keyword) ||
            recordType.includes(keyword) ||
            recordTypeLabel.includes(keyword) ||
            date.includes(keyword) ||
            notes.includes(keyword)
          );
        });

    renderStats(results);
    renderSearchResultList(results);
  }).catch(error=>{
    console.error(error);
    alert("検索に失敗しました");
  });
}

function clearSearch(){
  const input = document.getElementById("searchInput");

  if(input){
    input.value = "";
  }

  loadRecords();
}

function renderSearchResultList(records){
  const list = document.getElementById("recordList");

  if(!list){
    return;
  }

  if(!records || records.length === 0){
    list.innerHTML = "検索結果なし";
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
        <div class="record-row">🚶 散歩時間<br>${r.walk?.time || "00:00:00"}</div>
        <div class="record-row">📏 移動距離<br>${r.walk?.distanceKm || "0.00km"}</div>
        <div class="record-row">⚡ 平均速度<br>${r.walk?.avgSpeed || "0.00km/h"}</div>
        <div class="record-row">📷 写真<br>${r.summary?.photoCount || 0}枚</div>
        <div class="record-row">🎤 音声<br>${r.summary?.audioCount || 0}件</div>
        <div class="record-row">📝 メモ<br>${r.summary?.noteCount || 0}件</div>
        <div class="record-row">📍 GPS<br>${r.summary?.validGpsPointCount || r.summary?.gpsPointCount || 0}件</div>
      </div>
    `;
  });

  list.innerHTML = html;
}
