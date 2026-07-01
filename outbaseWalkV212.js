/* OUTBASE Walk v212: dedicated walk UI + safe result transition */
(function () {
  'use strict';
  let voiceRecorder = null;
  let voiceChunks = [];

  function api() { return window.OUTBASE_LIFE_V212; }
  function $(id) { return api().$(id); }
  function events() { window.outbaseWalkEventsV212 = window.outbaseWalkEventsV212 || []; return window.outbaseWalkEventsV212; }
  function videos() { window.outbaseWalkVideosV212 = window.outbaseWalkVideosV212 || []; return window.outbaseWalkVideosV212; }
  function now() { return api().now(); }

  function prepareInputs() {
    const photo = $('photoInput');
    if (photo) { photo.setAttribute('accept','image/*'); photo.setAttribute('capture','environment'); }
    if (!$(api().videoInputId)) {
      const input = document.createElement('input');
      input.type = 'file';
      input.id = api().videoInputId;
      input.accept = 'video/*';
      input.setAttribute('capture','environment');
      input.style.display = 'none';
      input.onchange = addVideo;
      document.body.appendChild(input);
    }
  }
  function hideLegacyWalkCards() {
    const walk = $('walkPage');
    if (!walk) return;
    walk.querySelectorAll(':scope > .card').forEach((card, index) => {
      if (index === 0 || card.id === api().walkPanelId) return;
      card.classList.add('walk212-hide');
    });
    walk.querySelectorAll('.life212-nav').forEach(nav => nav.remove());
  }
  function applyWalkMode() {
    if (!api()) return;
    api().addStyle();
    prepareInputs();
    api().setRoute('walk');
    api().showOnly('walkPage');
    const walk = $('walkPage');
    if (!walk) return;
    hideLegacyWalkCards();
    const first = walk.querySelector(':scope > .card');
    if (first) {
      const h1 = first.querySelector('h1');
      if (h1) h1.innerHTML = '🐕 散歩中';
    }
    let panel = $(api().walkPanelId);
    if (!panel) {
      panel = document.createElement('div');
      panel.id = api().walkPanelId;
      panel.className = 'card walk212-card';
      panel.innerHTML = buildPanel();
      bindPanel(panel);
    }
    if (first && first.nextSibling !== panel) first.insertAdjacentElement('afterend', panel);
    updateWalkStatus();
    api().enforceOnly('walkPage');
    api().markReady();
    window.scrollTo(0,0);
  }
  function buildPanel() {
    return `<div class="walk212-head"><div><b style="font-size:22px">散歩で使うものだけ</b><div class="walk212-status">取込・更新・文字追加・下ナビは出しません。</div></div><span class="walk212-badge">現地用</span></div>
      <div class="walk212-grid"><button class="walk212-btn" data-action="photo"><span>📷</span>写真</button><button class="walk212-btn" data-action="video"><span>🎥</span>動画</button><button class="walk212-btn walk212-primary" data-action="voice"><span>🎤</span>長押し音声</button><button class="walk212-btn" data-action="memo"><span>📝</span>メモ</button><button class="walk212-btn" data-action="friend"><span>🐶</span>犬友</button><button class="walk212-btn" data-action="spot"><span>📍</span>スポット</button></div>
      <button class="walk212-btn walk212-end" data-action="finish"><span>■</span>散歩終了</button>
      <details class="walk212-detail"><summary>詳しい記録を開く</summary><div class="walk212-grid" style="margin-top:10px"><button class="walk212-btn" data-action="poop">💩 うんち</button><button class="walk212-btn" data-action="pee">💧 おしっこ</button><button class="walk212-btn" data-action="rest">休憩</button><button class="walk212-btn" data-action="carry">抱っこ</button><button class="walk212-btn" data-action="danger">危険</button><button class="walk212-btn" data-action="water">水分</button></div></details>
      <button class="walk212-home" data-action="home">ホームへ戻る（散歩は継続）</button><div id="walk212Status" class="walk212-status">音声は長押し、離すと保存。</div><div id="walk212Recent" class="walk212-status"></div>`;
  }
  function bindPanel(panel) {
    panel.addEventListener('click', event => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const action = button.dataset.action;
      if (action === 'photo') return $('photoInput')?.click();
      if (action === 'video') return $(api().videoInputId)?.click();
      if (action === 'memo') return addMemo();
      if (action === 'friend') return addQuick('friend_dog','犬友');
      if (action === 'spot') return addQuick('spot','スポット');
      if (['poop','pee','rest','carry','danger','water'].includes(action)) return addQuick(action, button.textContent.trim());
      if (action === 'finish') return finishWalkSafely();
      if (action === 'home') return api().showLife('home');
    });
    const voice = panel.querySelector('[data-action="voice"]');
    if (voice) {
      voice.onpointerdown = event => { event.preventDefault(); startVoice(); };
      voice.onpointerup = event => { event.preventDefault(); stopVoice(); };
      voice.onpointercancel = stopVoice;
      voice.oncontextmenu = event => event.preventDefault();
    }
  }
  function addQuick(type, label) {
    const memo = ['friend_dog','spot'].includes(type) ? prompt(label + 'メモ（空でも保存）','') : '';
    events().push({ id:createId(), type, label, memo:memo || '', time:now(), created_at:new Date().toISOString() });
    if (typeof saveWalkActiveSession === 'function') saveWalkActiveSession('event');
    setStatus(label + 'を記録しました');
    updateWalkStatus();
  }
  function addMemo() {
    const text = prompt('散歩メモ','');
    if (!text || !text.trim()) return;
    notes.push({ id:createId(), text:text.trim(), time:now(), created_at:new Date().toISOString() });
    if (typeof saveWalkActiveSession === 'function') saveWalkActiveSession('note');
    setStatus('メモを保存しました');
    updateWalkStatus();
  }
  function addVideo() {
    const input = $(api().videoInputId);
    const file = input?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      videos().push({ id:createId(), name:file.name, type:file.type, data:e.target.result, time:now(), created_at:new Date().toISOString() });
      if (typeof saveWalkActiveSession === 'function') saveWalkActiveSession('video');
      setStatus('動画を保存しました');
      updateWalkStatus();
      input.value = '';
    };
    reader.readAsDataURL(file);
  }
  function setStatus(text) { const el = $('walk212Status'); if (el) el.textContent = text; }
  function updateWalkStatus() {
    const recent = $('walk212Recent');
    if (!recent) return;
    let msg = `写真 ${photos?.length || 0} / 動画 ${videos().length} / 音声 ${audioRecords?.length || 0} / メモ ${notes?.length || 0}`;
    if (events().length) msg += ` / 犬友・スポット等 ${events().length}件`;
    recent.textContent = msg;
  }
  async function startVoice() {
    if (voiceRecorder) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
      voiceChunks = [];
      voiceRecorder = new MediaRecorder(stream);
      voiceRecorder.ondataavailable = e => { if (e.data && e.data.size) voiceChunks.push(e.data); };
      voiceRecorder.start();
      setStatus('録音中。離すと保存します。');
    } catch (e) {
      console.error(e);
      setStatus('音声メモを開始できません');
    }
  }
  function stopVoice() {
    if (!voiceRecorder) return;
    const recorder = voiceRecorder;
    voiceRecorder = null;
    recorder.onstop = () => {
      const blob = new Blob(voiceChunks, { type: recorder.mimeType || 'audio/webm' });
      const reader = new FileReader();
      reader.onload = e => {
        audioRecords.push({ id:createId(), name:'walk_audio_' + Date.now() + '.webm', type:blob.type, data:e.target.result, time:now(), created_at:new Date().toISOString(), transcript:'' });
        if (typeof saveWalkActiveSession === 'function') saveWalkActiveSession('audio');
        setStatus('音声メモを保存しました');
        updateWalkStatus();
        recorder.stream.getTracks().forEach(track => track.stop());
      };
      reader.readAsDataURL(blob);
    };
    recorder.stop();
  }
  async function finishWalkSafely() {
    try {
      if (!api().isWalkActive()) { alert('進行中の散歩が見つかりません'); return; }
      if (!confirm('散歩を終了して保存しますか？')) return;
      if (typeof updateWalkTimer === 'function') updateWalkTimer();
      if (typeof timerInterval !== 'undefined' && timerInterval) clearInterval(timerInterval);
      if (typeof stopAutoSave === 'function') stopAutoSave();
      if (typeof gpsWatcher !== 'undefined' && gpsWatcher) clearInterval(gpsWatcher);
      const finalize = async gps => {
        endGps = gps || '未取得';
        if (typeof addGpsHistory === 'function') addGpsHistory('end', endGps);
        distanceKm = typeof calcTrackDistance === 'function' ? calcTrackDistance(gpsHistory) : '0.00km';
        if (typeof updateWalkTimer === 'function') updateWalkTimer();
        const walkTime = typeof formatTime === 'function' ? formatTime(seconds || 0) : '00:00:00';
        const avgSpeed = typeof calcAverageSpeed === 'function' ? calcAverageSpeed(distanceKm, walkTime) : '0.00km/h';
        currentSession.endTime = now();
        currentSession.status = EVENT_STATUS.CLOSED;
        const ev = events();
        const record = {
          id:createId(), title:'散歩記録', tags:[], recordType:'walk', session:currentSession, date:now(),
          walk:{ time:walkTime, distanceKm, avgSpeed }, gps:{ start:startGps, end:endGps, history:gpsHistory },
          photos, audio:audioRecords, notes, videos:videos(), quickEvents:ev,
          friendDogEvents:ev.filter(x => x.type === 'friend_dog'), spotEvents:ev.filter(x => x.type === 'spot'),
          behaviorEvents:ev.filter(x => !['friend_dog','spot'].includes(x.type)),
          summary:{ photoCount:photos.length, videoCount:videos().length, audioCount:audioRecords.length, noteCount:notes.length, gpsPointCount:gpsHistory.length, validGpsPointCount:typeof getValidGpsCount === 'function' ? getValidGpsCount(gpsHistory) : gpsHistory.length, quickEventCount:ev.length, friendDogCount:ev.filter(x => x.type === 'friend_dog').length, spotCount:ev.filter(x => x.type === 'spot').length }
        };
        await saveRecord(record);
        if (currentSession?.id && typeof deleteActiveSession === 'function') await deleteActiveSession(currentSession.id);
        if (typeof clearAppState === 'function') clearAppState();
        currentSession = null;
        window.outbaseWalkEventsV212 = [];
        window.outbaseWalkVideosV212 = [];
        showResult(record);
      };
      if (typeof getGps === 'function') getGps(finalize);
      else finalize('未取得');
    } catch (e) {
      console.error(e);
      alert('散歩終了に失敗しました');
    }
  }
  function showResult(record) {
    api().addStyle();
    api().setRoute('result');
    const p = api().ensure(api().resultPageId);
    p.className = 'page';
    p.innerHTML = `<section class="life212-card life212-hero"><div class="life212-kicker">WALK RESULT</div><div class="life212-title">コタ散歩を保存しました</div><div class="life212-sub">結果はここ、散歩履歴、詳細から確認できます。</div></section>
      <section class="life212-card result212-grid"><div class="result212-mini"><div class="result212-label">時間</div><div class="result212-value">${api().esc(record.walk.time)}</div></div><div class="result212-mini"><div class="result212-label">距離</div><div class="result212-value">${api().esc(record.walk.distanceKm)}</div></div><div class="result212-mini"><div class="result212-label">GPS</div><div class="result212-value">${record.summary.validGpsPointCount}件</div></div><div class="result212-mini"><div class="result212-label">写真/動画/音声/メモ</div><div class="result212-value">${record.summary.photoCount}/${record.summary.videoCount}/${record.summary.audioCount}/${record.summary.noteCount}</div></div></section>
      <section class="life212-card result212-actions"><button class="result212-btn result212-primary" onclick="showDetail&&showDetail('${api().esc(record.id)}')">詳細を見る</button><button class="result212-btn" onclick="showWalkHistoryPage&&showWalkHistoryPage()">散歩履歴を開く</button><button class="result212-btn" onclick="showOutbaseLifePageV212('home')">ホームへ戻る</button></section>`;
    api().showOnly(api().resultPageId);
    api().markReady();
    window.scrollTo(0,0);
  }
  function patch() {
    if (typeof startWalk === 'function' && !startWalk.__v212) {
      const original = startWalk;
      window.startWalk = function () {
        window.outbaseWalkEventsV212 = [];
        window.outbaseWalkVideosV212 = [];
        const result = original.apply(this, arguments);
        setTimeout(applyWalkMode, 80);
        setTimeout(applyWalkMode, 400);
        return result;
      };
      window.startWalk.__v212 = true;
    }
    if (typeof restoreWalkSession === 'function' && !restoreWalkSession.__v212) {
      const original = restoreWalkSession;
      window.restoreWalkSession = function () {
        const result = original.apply(this, arguments);
        setTimeout(applyWalkMode, 80);
        setTimeout(applyWalkMode, 400);
        return result;
      };
      window.restoreWalkSession.__v212 = true;
    }
    if (typeof finishWalk === 'function' && !finishWalk.__v212) {
      window.finishWalk = finishWalkSafely;
      window.finishWalk.__v212 = true;
    }
    if (typeof showPage === 'function' && !showPage.__v212) {
      const original = showPage;
      window.showPage = function (id) {
        if (id === 'homePage') { api().showLife('home'); return; }
        const result = original.apply(this, arguments);
        api().setRoute(id);
        if (id === 'walkPage') setTimeout(applyWalkMode, 80);
        else setTimeout(() => api().enforceOnly(id), 30);
        return result;
      };
      window.showPage.__v212 = true;
    }
    if (typeof backToHome === 'function' && !backToHome.__v212) {
      window.backToHome = function () { api().showLife('home'); };
      window.backToHome.__v212 = true;
    }
    if (typeof restorePendingSession === 'function' && !restorePendingSession.__v212) {
      const original = restorePendingSession;
      window.restorePendingSession = async function () {
        const result = await original.apply(this, arguments);
        setTimeout(() => { if (api().isWalkActive()) applyWalkMode(); }, 120);
        return result;
      };
      window.restorePendingSession.__v212 = true;
    }
    if (typeof discardPendingSession === 'function' && !discardPendingSession.__v212) {
      const original = discardPendingSession;
      window.discardPendingSession = async function () {
        const result = await original.apply(this, arguments);
        api().showLife('home');
        return result;
      };
      window.discardPendingSession.__v212 = true;
    }
  }
  function monitor() {
    const walk = $('walkPage');
    const visibleWalk = walk && !walk.classList.contains('hidden');
    if (api().getRoute() === 'walk' || (api().isWalkActive() && visibleWalk)) { applyWalkMode(); return; }
    if (api().getRoute() === 'home' && $('homePage') && !$('homePage').classList.contains('hidden')) api().enforceOnly('homePage');
    if (api().getRoute() === 'result') api().enforceOnly(api().resultPageId);
  }
  function setup() {
    if (!api()) return;
    api().addStyle();
    patch();
    if (api().isWalkActive() || ($('walkPage') && !$('walkPage').classList.contains('hidden'))) applyWalkMode();
  }
  window.returnToActiveWalkV212 = applyWalkMode;
  window.returnToActiveWalkV211 = applyWalkMode;
  window.showOutbaseWalkResultV212 = showResult;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();
  window.addEventListener('load', () => setTimeout(setup, 250));
  setInterval(() => { patch(); monitor(); }, 1200);
})();
