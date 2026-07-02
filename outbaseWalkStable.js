/* OUTBASE S-1 Walk Stable: dedicated walk page + map + voice memo + discard */
(function () {
  'use strict';
  let voiceRecorder = null;
  let voiceChunks = [];
  let speechRecognition = null;
  let speechFinalText = '';
  let speechInterimText = '';
  let stableMap = null;
  let stableMarkers = [];
  let stableLine = null;
  let photoInput = null;
  let videoInput = null;

  function api() { return window.OUTBASE_SHELL_STABLE; }
  function $(id) { return document.getElementById(id); }
  function esc(value) { return api().esc(value); }
  function now() { return api().now(); }
  function events() { window.outbaseWalkStableEvents = window.outbaseWalkStableEvents || []; return window.outbaseWalkStableEvents; }
  function videos() { window.outbaseWalkStableVideos = window.outbaseWalkStableVideos || []; return window.outbaseWalkStableVideos; }
  function validLatLng(gps) { try { return typeof gpsToLatLng === 'function' ? gpsToLatLng(gps) : null; } catch (e) { return null; } }
  function distanceBetween(gps1, gps2) { try { return typeof calcDistanceNumber === 'function' ? calcDistanceNumber(gps1, gps2) : 999; } catch (e) { return 999; } }
  function placeLabel(gps) {
    if (!gps || gps === '取得中') return '取得中';
    if (gps === '未取得') return '未取得';
    const homeGps = localStorage.getItem('outbase_home_gps');
    if (homeGps && distanceBetween(homeGps, gps) <= 0.2) return '自宅付近';
    try {
      const labels = JSON.parse(localStorage.getItem('outbase_place_labels_v1') || '[]');
      const hit = labels.find(p => p && p.gps && p.name && distanceBetween(p.gps, gps) <= (Number(p.radiusKm) || 0.25));
      if (hit) return hit.name;
    } catch (e) {}
    return '現在地（取得済み）';
  }
  function resetWalkMemory() {
    window.outbaseWalkStableEvents = [];
    window.outbaseWalkStableVideos = [];
  }
  function prepareInputs() {
    if (!photoInput) {
      photoInput = document.createElement('input');
      photoInput.type = 'file';
      photoInput.accept = 'image/*';
      photoInput.setAttribute('capture','environment');
      photoInput.style.display = 'none';
      photoInput.onchange = addPhoto;
      document.body.appendChild(photoInput);
    }
    if (!videoInput) {
      videoInput = document.createElement('input');
      videoInput.type = 'file';
      videoInput.accept = 'video/*';
      videoInput.setAttribute('capture','environment');
      videoInput.style.display = 'none';
      videoInput.onchange = addVideo;
      document.body.appendChild(videoInput);
    }
  }
  function buildPage() {
    return `<div class="stable-wrap">
      <section class="stable-card stable-hero"><div class="stable-kicker">KOTA WALK</div><div class="stable-title">散歩モード</div><div class="stable-sub">犬友・スポットは一旦隠し、現地で使う操作だけに絞ります。</div></section>
      <section class="stable-card"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div><div class="stable-label">経過時間</div><div id="stableWalkTimer" class="stable-title">00:00:00</div></div><span class="stable-pill">現地用</span></div><div id="stableWalkLocation" class="stable-status">開始地点：取得中</div></section>
      <section class="stable-card"><b>リアルタイム地図</b><div class="stable-note">まずはLeafletで現在地と軌跡を表示します。</div><div id="stableWalkMap" class="stable-map" style="margin-top:10px">GPS取得後に地図を表示します</div></section>
      <section class="stable-card"><b>記録</b><div class="stable-grid2" style="margin-top:10px">
        <button class="stable-btn" data-action="photo"><span>📷</span>写真</button>
        <button class="stable-btn" data-action="video"><span>🎥</span>動画</button>
        <button class="stable-btn stable-primary" data-action="voice"><span>🎤</span>長押し音声メモ</button>
        <button class="stable-btn" data-action="memo"><span>📝</span>メモ</button>
      </div><div id="stableVoiceTranscript" class="stable-transcript" style="margin-top:10px">長押し音声メモ：押している間だけ話す / 離すと保存</div><div id="stableWalkCounts" class="stable-status" style="margin-top:8px"></div></section>
      <section class="stable-card"><b>確認</b><div class="stable-grid2" style="margin-top:10px">
        <button class="stable-btn" data-action="history"><span>📚</span>散歩履歴を見る</button>
        <button class="stable-btn" data-action="home"><span>🏠</span>ホームへ戻る<br><small>散歩は継続</small></button>
      </div></section>
      <section class="stable-card"><b>終了操作</b><div class="stable-grid2" style="margin-top:10px">
        <button class="stable-btn stable-primary" data-action="finish"><span>✅</span>散歩終了</button>
        <button class="stable-btn stable-danger" data-action="discard"><span>🗑️</span>散歩を破棄</button>
      </div><div id="stableWalkStatus" class="stable-status" style="margin-top:8px">散歩中です。</div></section>
    </div>`;
  }
  function bindPage(page) {
    page.onclick = event => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const action = button.dataset.action;
      if (action === 'photo') return photoInput?.click();
      if (action === 'video') return videoInput?.click();
      if (action === 'memo') return addMemo();
      if (action === 'history') return openHistory();
      if (action === 'home') return api().showPage('home');
      if (action === 'finish') return finishWalkStable();
      if (action === 'discard') return discardWalkStable();
    };
    const voice = page.querySelector('[data-action="voice"]');
    if (voice) {
      voice.onpointerdown = event => { event.preventDefault(); startVoiceMemo(); };
      voice.onpointerup = event => { event.preventDefault(); stopVoiceMemo(); };
      voice.onpointercancel = stopVoiceMemo;
      voice.oncontextmenu = event => event.preventDefault();
    }
  }
  function updateTimer() {
    if (!currentSession || !currentSession.startTimestamp) return;
    seconds = Math.floor((Date.now() - currentSession.startTimestamp) / 1000);
    const timer = $('stableWalkTimer');
    if (timer && typeof formatTime === 'function') timer.textContent = formatTime(seconds);
  }
  function updateCounts() {
    const counts = $('stableWalkCounts');
    if (!counts) return;
    counts.textContent = `写真 ${photos?.length || 0} / 動画 ${videos().length} / 音声 ${audioRecords?.length || 0} / メモ ${notes?.length || 0}`;
  }
  function updateLocation() {
    const el = $('stableWalkLocation');
    if (!el) return;
    const latest = [...(gpsHistory || [])].reverse().find(p => validLatLng(p.gps));
    const start = startGps && startGps !== '取得中' ? placeLabel(startGps) : '取得中';
    const current = latest ? placeLabel(latest.gps) : '取得中';
    el.textContent = `開始地点：${start} / 現在地：${current}`;
  }
  function updateMap() {
    const mapEl = $('stableWalkMap');
    if (!mapEl) return;
    if (typeof L === 'undefined') { mapEl.textContent = '地図ライブラリ読込待ちです'; return; }
    const points = (gpsHistory || []).map(p => validLatLng(p.gps)).filter(Boolean);
    if (!points.length) { mapEl.textContent = 'GPS取得後に地図を表示します'; return; }
    if (!stableMap) {
      mapEl.textContent = '';
      stableMap = L.map('stableWalkMap').setView(points[0], 17);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(stableMap);
    }
    stableMarkers.forEach(m => m.remove());
    stableMarkers = [];
    if (stableLine) { stableLine.remove(); stableLine = null; }
    stableMarkers.push(L.marker(points[0]).addTo(stableMap).bindPopup('開始'));
    stableMarkers.push(L.marker(points[points.length - 1]).addTo(stableMap).bindPopup('現在地'));
    if (points.length >= 2) stableLine = L.polyline(points, { weight: 5 }).addTo(stableMap);
    if (points.length >= 2) stableMap.fitBounds(points, { padding: [24,24] });
    else stableMap.setView(points[0], 17);
    setTimeout(() => stableMap.invalidateSize(), 80);
  }
  function showWalk() {
    prepareInputs();
    api().addStyle();
    const page = api().ensurePage(api().walkPageId, 'page hidden stable-page');
    if (!page.dataset.bound) { page.innerHTML = buildPage(); bindPage(page); page.dataset.bound = '1'; }
    api().setRoute('walk');
    api().showRawPage(api().walkPageId);
    document.body.classList.remove('outbase-walk-switching');
    updateTimer(); updateCounts(); updateLocation(); updateMap();
  }
  function startWalkStable() {
    if (api().isWalkActive()) { showWalk(); return; }
    try { if (typeof hasActiveState === 'function' && hasActiveState()) { alert('進行中の記録があります。復旧または終了してから開始してください。'); return; } } catch (e) {}
    document.body.classList.add('outbase-walk-switching');
    resetWalkMemory();
    seconds = 0; photos = []; notes = []; audioRecords = []; audioChunks = []; gpsHistory = []; mediaRecorder = null;
    startGps = '取得中'; endGps = '未取得'; distanceKm = '未取得';
    currentSession = { id:createId(), type:'walk', startTime:now(), startTimestamp:Date.now(), endTime:'', status:EVENT_STATUS.ACTIVE };
    try { if (typeof setAppState === 'function') setAppState({ page:'walk', eventId:currentSession.id, eventType:'walk', eventStatus:EVENT_STATUS.ACTIVE }); } catch (e) {}
    try { if (typeof startAutoSave === 'function') startAutoSave(); } catch (e) {}
    try { if (typeof saveWalkActiveSession === 'function') saveWalkActiveSession('stable-start'); } catch (e) {}
    showWalk();
    if (typeof getGps === 'function') getGps(gps => {
      startGps = gps || '未取得';
      if (typeof addGpsHistory === 'function') addGpsHistory('start', startGps);
      try { if (typeof saveWalkActiveSession === 'function') saveWalkActiveSession('stable-startGps'); } catch (e) {}
      updateLocation(); updateMap();
    });
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => { updateTimer(); }, 1000);
    if (gpsWatcher) clearInterval(gpsWatcher);
    gpsWatcher = setInterval(() => {
      if (typeof getGps !== 'function' || !api().isWalkActive()) return;
      getGps(gps => {
        if (typeof addGpsHistory === 'function') addGpsHistory('point', gps);
        try { if (typeof saveWalkActiveSession === 'function') saveWalkActiveSession('stable-gps'); } catch (e) {}
        updateLocation(); updateMap();
      });
    }, GPS_INTERVAL_MS || 10000);
  }
  function restoreWalkSessionStable(entry) {
    const payload = entry?.payload || {};
    currentSession = payload.currentSession;
    if (!currentSession) { alert('散歩記録を復旧できませんでした'); return; }
    currentSession.status = EVENT_STATUS.ACTIVE;
    if (!currentSession.startTimestamp) currentSession.startTimestamp = Date.now() - ((payload.seconds || 0) * 1000);
    seconds = Math.floor((Date.now() - currentSession.startTimestamp) / 1000);
    photos = Array.isArray(payload.photos) ? payload.photos : [];
    notes = Array.isArray(payload.notes) ? payload.notes : [];
    audioRecords = Array.isArray(payload.audioRecords) ? payload.audioRecords : [];
    gpsHistory = Array.isArray(payload.gpsHistory) ? payload.gpsHistory : [];
    startGps = payload.startGps || '未取得'; endGps = payload.endGps || '未取得'; distanceKm = payload.distanceKm || '未取得';
    audioChunks = []; mediaRecorder = null;
    try { if (typeof setAppState === 'function') setAppState({ page:'walk', eventId:currentSession.id, eventType:'walk', eventStatus:EVENT_STATUS.ACTIVE }); } catch (e) {}
    try { if (typeof startAutoSave === 'function') startAutoSave(); } catch (e) {}
    showWalk();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => { updateTimer(); }, 1000);
    if (gpsWatcher) clearInterval(gpsWatcher);
    gpsWatcher = setInterval(() => {
      if (typeof getGps !== 'function' || !api().isWalkActive()) return;
      getGps(gps => { if (typeof addGpsHistory === 'function') addGpsHistory('point', gps); updateLocation(); updateMap(); });
    }, GPS_INTERVAL_MS || 10000);
  }
  function addPhoto() {
    const file = photoInput?.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      photos.push({ id:createId(), name:file.name, type:file.type, data:e.target.result, time:now(), created_at:new Date().toISOString() });
      try { if (typeof saveWalkActiveSession === 'function') saveWalkActiveSession('stable-photo'); } catch (e) {}
      photoInput.value = ''; updateCounts(); setStatus('写真を保存しました');
    };
    reader.readAsDataURL(file);
  }
  function addVideo() {
    const file = videoInput?.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      videos().push({ id:createId(), name:file.name, type:file.type, data:e.target.result, time:now(), created_at:new Date().toISOString() });
      try { if (typeof saveWalkActiveSession === 'function') saveWalkActiveSession('stable-video'); } catch (e) {}
      videoInput.value = ''; updateCounts(); setStatus('動画を保存しました');
    };
    reader.readAsDataURL(file);
  }
  function addMemo() {
    const text = prompt('散歩メモ', '');
    if (!text || !text.trim()) return;
    notes.push({ id:createId(), text:text.trim(), time:now(), created_at:new Date().toISOString() });
    try { if (typeof saveWalkActiveSession === 'function') saveWalkActiveSession('stable-note'); } catch (e) {}
    updateCounts(); setStatus('メモを保存しました');
  }
  function setStatus(text) { const el = $('stableWalkStatus'); if (el) el.textContent = text; }
  function setTranscript(text) { const el = $('stableVoiceTranscript'); if (el) el.textContent = text; }
  async function startVoiceMemo() {
    if (voiceRecorder) return;
    speechFinalText = ''; speechInterimText = '';
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      try {
        speechRecognition = new SR();
        speechRecognition.lang = 'ja-JP'; speechRecognition.interimResults = true; speechRecognition.continuous = true;
        speechRecognition.onresult = e => {
          speechInterimText = '';
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const t = e.results[i][0].transcript;
            if (e.results[i].isFinal) speechFinalText += t;
            else speechInterimText += t;
          }
          setTranscript('文字起こし中：' + (speechFinalText + speechInterimText || '話してください'));
        };
        speechRecognition.onerror = () => setTranscript('文字起こし失敗時も録音は保存します');
        speechRecognition.start();
      } catch (e) { speechRecognition = null; }
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
      voiceChunks = [];
      voiceRecorder = new MediaRecorder(stream);
      voiceRecorder.ondataavailable = e => { if (e.data && e.data.size) voiceChunks.push(e.data); };
      voiceRecorder.start();
      setStatus('長押し音声メモ中。離すと保存します。');
      if (!SR) setTranscript('この端末はリアルタイム文字起こし非対応です。録音を保存します。');
    } catch (e) { setStatus('音声メモを開始できません'); }
  }
  function stopVoiceMemo() {
    if (speechRecognition) { try { speechRecognition.stop(); } catch (e) {} speechRecognition = null; }
    if (!voiceRecorder) return;
    const recorder = voiceRecorder; voiceRecorder = null;
    recorder.onstop = () => {
      const blob = new Blob(voiceChunks, { type: recorder.mimeType || 'audio/webm' });
      const transcript = (speechFinalText + speechInterimText).trim();
      const reader = new FileReader();
      reader.onload = e => {
        audioRecords.push({ id:createId(), name:'walk_audio_' + Date.now() + '.webm', type:blob.type, data:e.target.result, time:now(), created_at:new Date().toISOString(), transcript });
        if (transcript) notes.push({ id:createId(), text:transcript, time:now(), created_at:new Date().toISOString(), source:'speech' });
        try { if (typeof saveWalkActiveSession === 'function') saveWalkActiveSession('stable-audio'); } catch (e) {}
        updateCounts(); setStatus(transcript ? '音声メモを文字メモ化しました' : '音声メモを保存しました');
        setTranscript(transcript ? '保存した文字メモ：' + transcript : '文字起こしなし。録音を保存しました。');
        recorder.stream.getTracks().forEach(track => track.stop());
      };
      reader.readAsDataURL(blob);
    };
    try { recorder.stop(); } catch (e) {}
  }
  function openHistory() {
    if (typeof showWalkHistoryPage === 'function') showWalkHistoryPage();
    else api().showPage('walkHistoryPage');
  }
  async function finishWalkStable() {
    if (!api().isWalkActive()) { alert('進行中の散歩が見つかりません'); return; }
    if (!confirm('散歩を終了して保存しますか？')) return;
    if (timerInterval) clearInterval(timerInterval);
    try { if (typeof stopAutoSave === 'function') stopAutoSave(); } catch (e) {}
    if (gpsWatcher) clearInterval(gpsWatcher);
    const finalize = async gps => {
      endGps = gps || '未取得';
      if (typeof addGpsHistory === 'function') addGpsHistory('end', endGps);
      distanceKm = typeof calcTrackDistance === 'function' ? calcTrackDistance(gpsHistory) : '0.00km';
      const walkTime = typeof formatTime === 'function' ? formatTime(seconds || 0) : '00:00:00';
      const avgSpeed = typeof calcAverageSpeed === 'function' ? calcAverageSpeed(distanceKm, walkTime) : '0.00km/h';
      currentSession.endTime = now(); currentSession.status = EVENT_STATUS.CLOSED;
      const record = { id:createId(), title:'散歩記録', tags:[], recordType:'walk', session:currentSession, date:now(),
        walk:{ time:walkTime, distanceKm, avgSpeed, startLabel:placeLabel(startGps), endLabel:placeLabel(endGps) }, gps:{ start:startGps, end:endGps, history:gpsHistory },
        photos, audio:audioRecords, notes, videos:videos(), quickEvents:events(),
        friendDogEvents:[], spotEvents:[], behaviorEvents:[],
        summary:{ photoCount:photos.length, videoCount:videos().length, audioCount:audioRecords.length, noteCount:notes.length, gpsPointCount:gpsHistory.length, validGpsPointCount:typeof getValidGpsCount === 'function' ? getValidGpsCount(gpsHistory) : gpsHistory.length, quickEventCount:0, friendDogCount:0, spotCount:0 }
      };
      try { await saveRecord(record); } catch (e) { console.error(e); alert('保存に失敗しました'); return; }
      try { if (currentSession?.id && typeof deleteActiveSession === 'function') await deleteActiveSession(currentSession.id); } catch (e) {}
      try { if (typeof clearAppState === 'function') clearAppState(); } catch (e) {}
      currentSession = null; showResult(record);
    };
    if (typeof getGps === 'function') getGps(finalize); else finalize('未取得');
  }
  async function discardWalkStable() {
    if (!api().isWalkActive()) { api().showPage('home'); return; }
    if (!confirm('この散歩記録を保存せずに破棄しますか？')) return;
    if (!confirm('写真・音声・メモもこの散歩記録から外れます。破棄しますか？')) return;
    if (timerInterval) clearInterval(timerInterval);
    if (gpsWatcher) clearInterval(gpsWatcher);
    try { if (typeof stopAutoSave === 'function') stopAutoSave(); } catch (e) {}
    try { if (currentSession?.id && typeof deleteActiveSession === 'function') await deleteActiveSession(currentSession.id); } catch (e) {}
    try { if (typeof clearAppState === 'function') clearAppState(); } catch (e) {}
    currentSession = null; seconds = 0; photos = []; notes = []; audioRecords = []; gpsHistory = []; startGps = '未取得'; endGps = '未取得'; distanceKm = '未取得'; resetWalkMemory();
    stableMap = null; stableMarkers = []; stableLine = null;
    api().showPage('home');
  }
  function showResult(record) {
    const page = api().ensurePage(api().resultPageId, 'page hidden stable-page');
    page.innerHTML = `<div class="stable-wrap"><section class="stable-card stable-hero"><div class="stable-kicker">WALK RESULT</div><div class="stable-title">コタ散歩を保存しました</div><div class="stable-sub">開始：${esc(record.walk.startLabel)} / 終了：${esc(record.walk.endLabel)}</div></section>
      <section class="stable-card"><div class="stable-grid2"><div class="stable-mini"><div class="stable-label">時間</div><div class="stable-value">${esc(record.walk.time)}</div></div><div class="stable-mini"><div class="stable-label">距離</div><div class="stable-value">${esc(record.walk.distanceKm)}</div></div><div class="stable-mini"><div class="stable-label">GPS</div><div class="stable-value">${record.summary.validGpsPointCount}件</div></div><div class="stable-mini"><div class="stable-label">素材</div><div class="stable-val
