/* =========================================================
   OUTBASE
   walk.js
   Phase4-B-5C
   散歩モード分離版
========================================================= */

function startWalk(){
  if(hasActiveState()){
    alert("進行中の記録があります。復旧または終了してから開始してください。");
    return;
  }

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
    startTimestamp:Date.now(),
    endTime:"",
    status:EVENT_STATUS.ACTIVE
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

  setAppState({
    page:"walk",
    eventId:currentSession.id,
    eventType:"walk",
    eventStatus:EVENT_STATUS.ACTIVE
  });

  startAutoSave();
  saveWalkActiveSession("start");

  getGps(gps=>{
    startGps = gps;
    addGpsHistory("start",gps);
    document.getElementById("gpsInfo").innerHTML = "開始GPS：" + gps;
    saveWalkActiveSession("startGps");
  });

  timerInterval = setInterval(()=>{
    updateWalkTimer();
  },1000);

  gpsWatcher = setInterval(()=>{
    getGps(gps=>{
      addGpsHistory("point",gps);
      saveWalkActiveSession("gps");
    });
  },GPS_INTERVAL_MS);
}

function updateWalkTimer(){
  if(!currentSession || !currentSession.startTimestamp){
    return;
  }

  seconds = Math.floor((Date.now() - currentSession.startTimestamp) / 1000);

  const timer = document.getElementById("timer");
  if(timer){
    timer.innerHTML = formatTime(seconds);
  }
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

function buildWalkActiveSession(reason){
  if(!currentSession || currentSession.status !== EVENT_STATUS.ACTIVE){
    return null;
  }

  return {
    id:currentSession.id,
    eventType:"walk",
    eventStatus:EVENT_STATUS.ACTIVE,
    payload:{
      reason:reason || "",
      currentSession:currentSession,
      seconds:seconds,
      photos:photos,
      notes:notes,
      audioRecords:audioRecords,
      gpsHistory:gpsHistory,
      startGps:startGps,
      endGps:endGps,
      distanceKm:distanceKm,
      title:getInputValue("titleInput"),
      tags:getInputValue("tagInput")
    }
  };
}

async function saveWalkActiveSession(reason){
  const entry = buildWalkActiveSession(reason);

  if(!entry){
    return;
  }

  await saveActiveSession(entry);
}

function restoreWalkSession(entry){
  const payload = entry.payload || {};

  currentSession = payload.currentSession;

  if(!currentSession){
    alert("散歩記録を復旧できませんでした");
    return;
  }

  currentSession.status = EVENT_STATUS.ACTIVE;

  if(!currentSession.startTimestamp){
    const fallbackSeconds = payload.seconds || 0;
    currentSession.startTimestamp = Date.now() - (fallbackSeconds * 1000);
  }

  seconds = Math.floor((Date.now() - currentSession.startTimestamp) / 1000);
  photos = Array.isArray(payload.photos) ? payload.photos : [];
  notes = Array.isArray(payload.notes) ? payload.notes : [];
  audioRecords = Array.isArray(payload.audioRecords) ? payload.audioRecords : [];
  gpsHistory = Array.isArray(payload.gpsHistory) ? payload.gpsHistory : [];
  startGps = payload.startGps || "未取得";
  endGps = payload.endGps || "未取得";
  distanceKm = payload.distanceKm || "未取得";
  audioChunks = [];
  mediaRecorder = null;

  showPage("walkPage");

  const titleInput = document.getElementById("titleInput");
  const tagInput = document.getElementById("tagInput");

  if(titleInput) titleInput.value = payload.title || "";
  if(tagInput) tagInput.value = payload.tags || "";

  document.getElementById("timer").innerHTML = formatTime(seconds);
  document.getElementById("gpsInfo").innerHTML =
    "復旧済み / GPS " + getValidGpsCount(gpsHistory) + "件";

  renderWalkMedia();

  timerInterval = setInterval(()=>{
    updateWalkTimer();
  },1000);

  gpsWatcher = setInterval(()=>{
    getGps(gps=>{
      addGpsHistory("point",gps);
      saveWalkActiveSession("gps");
    });
  },GPS_INTERVAL_MS);

  setAppState({
    page:"walk",
    eventId:currentSession.id,
    eventType:"walk",
    eventStatus:EVENT_STATUS.ACTIVE
  });

  startAutoSave();
  saveWalkActiveSession("restore");
}

function finishWalk(){
  updateWalkTimer();

  clearInterval(timerInterval);
  stopAutoSave();

  if(gpsWatcher){
    clearInterval(gpsWatcher);
  }

  document.getElementById("gpsInfo").innerHTML = "終了GPS取得中...";

  getGps(async gps=>{
    endGps = gps;
    addGpsHistory("end",endGps);
    distanceKm = calcTrackDistance(gpsHistory);

    updateWalkTimer();
    const walkTime = formatTime(seconds);
    const avgSpeed = calcAverageSpeed(distanceKm,walkTime);
    const inputTitle = getInputValue("titleInput");
    const inputTags = parseTags(getInputValue("tagInput"));

    currentSession.endTime = new Date().toLocaleString();
    currentSession.status = EVENT_STATUS.CLOSED;

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
      await deleteActiveSession(currentSession.id);
      clearAppState();

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

window.startWalk = startWalk;
window.updateWalkTimer = updateWalkTimer;
window.formatTime = formatTime;
window.timeToSeconds = timeToSeconds;
window.saveWalkActiveSession = saveWalkActiveSession;
window.restoreWalkSession = restoreWalkSession;
window.finishWalk = finishWalk;
