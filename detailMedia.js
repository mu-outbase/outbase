function getPhotoCount(r){
  return r.summary?.photoCount || (Array.isArray(r.photos) ? r.photos.length : 0);
}

function getAudioCount(r){
  return r.summary?.audioCount || (Array.isArray(r.audio) ? r.audio.length : 0);
}

function getNoteCount(r){
  return r.summary?.noteCount || (Array.isArray(r.notes) ? r.notes.length : 0);
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

window.openPhoto = openPhoto;
window.closePhoto = closePhoto;
