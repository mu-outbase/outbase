async function openEditModal(id){
  const record = await getRecordById(id);

  if(!record){
    alert("記録が見つかりません");
    return;
  }

  currentDetailRecordId = id;

  const noteText = Array.isArray(record.notes)
    ? record.notes.map(n=>n.text || "").join("\n")
    : "";

  const html = `
    <div class="edit-box">

      <div class="edit-label">タイトル</div>
      <input
        type="text"
        id="editTitleInput"
        value="${escapeHtml(record.title || "")}">

      <div class="edit-label">タグ</div>
      <input
        type="text"
        id="editTagInput"
        value="${escapeHtml(Array.isArray(record.tags) ? record.tags.join(",") : "")}">

      <div class="edit-label">メモ</div>
      <textarea
        id="editNoteInput"
        class="edit-note">${escapeHtml(noteText)}</textarea>

      <button onclick="saveEditRecord()">
        編集内容を保存
      </button>

      <button class="cancelButton" onclick="closeEditModal()">
        編集をキャンセル
      </button>

    </div>
  `;

  document.getElementById("detailContent").innerHTML = html;
}

async function saveEditRecord(){
  if(!currentDetailRecordId){
    alert("編集対象が見つかりません");
    return;
  }

  const record = await getRecordById(currentDetailRecordId);

  if(!record){
    alert("記録が見つかりません");
    return;
  }

  const title = getInputValue("editTitleInput") || "散歩記録";
  const tags = parseTags(getInputValue("editTagInput"));
  const noteText = getInputValue("editNoteInput");

  record.title = title;
  record.tags = tags;
  record.recordType = getRecordType(record);

  record.notes = noteText
    ? noteText.split("\n")
        .map(v=>v.trim())
        .filter(v=>v !== "")
        .map(v=>({
          text:v,
          time:"編集：" + new Date().toLocaleString()
        }))
    : [];

  if(!record.summary){
    record.summary = {};
  }

  record.summary.noteCount = record.notes.length;
  record.updatedAt = new Date().toLocaleString();

  await saveRecord(record);

  alert("編集内容を保存しました");
  await showDetail(record.id);
}

async function closeEditModal(){
  if(currentDetailRecordId){
    await showDetail(currentDetailRecordId);
  }else{
    backToHome();
  }
}

window.openEditModal = openEditModal;
window.saveEditRecord = saveEditRecord;
window.closeEditModal = closeEditModal;
