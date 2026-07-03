import { app, card, escapeHtml, listItems, toast } from '../../ui/components.js?v=core05-10-jorte-refined-20260703';
import { getState, patchState } from '../../core/store.js?v=core05-10-jorte-refined-20260703';

let timer = null;
let speechRecognition = null;

function sessionTypeLabel(type) {
  return { walk: 'コタ散歩', camp: 'キャンプ', life: 'メモ' }[type] || '記録';
}

function elapsedText(startedAt, endedAt = null) {
  if (!startedAt) return '00:00:00';
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const diff = Math.max(0, Math.floor((end - new Date(startedAt).getTime()) / 1000));
  const h = String(Math.floor(diff / 3600)).padStart(2, '0');
  const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
  const s = String(diff % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function formatTime(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return value;
  }
}

function activeSession() {
  const session = getState().walkSession;
  return session?.status === 'active' ? session : null;
}

function recordsOf(session) {
  return Array.isArray(session?.records) ? session.records : [];
}

function gpsPointsOf(session) {
  return Array.isArray(session?.gpsPoints) ? session.gpsPoints : [];
}

function distanceKm(points = []) {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i += 1) total += haversine(points[i - 1], points[i]);
  return total;
}

function haversine(a, b) {
  const toRad = (v) => Number(v) * Math.PI / 180;
  const r = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function makeRecord(type, title, detail = '', extra = {}) {
  return { record_id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, type, title, detail, createdAt: new Date().toISOString(), ...extra };
}

function updateActiveSession(updater) {
  const state = getState();
  const session = state.walkSession;
  if (!session || session.status !== 'active') return;
  patchState({ walkSession: updater(session) });
}

function addRecord(record, message = '記録しました') {
  updateActiveSession((session) => ({ ...session, records: [record, ...recordsOf(session)] }));
  toast(message);
  renderWalk();
}

function buildReviewItems(session) {
  const text = recordsOf(session).map((record) => `${record.title} ${record.detail}`).join(' ');
  const items = [];
  if (/忘れ|不足|足りない|足りな/.test(text)) items.push('記録から反省：不足・忘れ物を次回準備へ戻す');
  if (/雨|濡|撤収/.test(text)) items.push('記録から反省：雨撤収と濡れ物対策を次回確認');
  if (/暑|熱|冷却|WAVE|扇風機/.test(text)) items.push('記録から反省：暑さ対策と電源残量を次回確認');
  if (/料理|多すぎ|余り|食材/.test(text)) items.push('記録から反省：料理量・食材量を次回調整');
  if (/コタ|犬|ドッグ|足拭き|うんち/.test(text)) items.push('記録から反省：コタ用品と散歩導線を次回確認');
  if (/設営|撤収|タイマー|時間/.test(text)) items.push('記録から反省：設営・撤収時間を次回段取りへ戻す');
  return [...new Set(items)];
}

export function renderWalk() {
  const state = getState();
  const session = activeSession();
  const history = state.recordHistory || [];
  const selected = state.selectedRecordSessionId ? history.find((item) => item.session_id === state.selectedRecordSessionId) || null : null;

  app().innerHTML = [
    `<section class="page-title"><p class="overline">RECORD</p><h2>今残す</h2></section>`,
    session ? renderActiveSession(session) : renderStartPanel(),
    renderHistory(history, selected?.session_id),
    selected ? renderDetail(selected) : ''
  ].filter(Boolean).join('');
  bindWalk();
  startTimer();
}

function renderStartPanel() {
  const project = getState().nextProject;
  const title = project?.reservation?.campground ? `${project.reservation.campground} 記録` : '今日の記録';
  return card(`<div class="choice-grid">
      <button class="choice startSession" data-type="walk" data-title="コタ散歩">コタ散歩<span>散歩中</span></button>
      <button class="choice startSession" data-type="camp" data-title="${escapeHtml(title)}">キャンプ<span>設営・料理</span></button>
      <button class="choice startSession" data-type="life" data-title="日常メモ">メモ<span>気づき</span></button>
    </div>
    <details class="quiet-details"><summary>タイトルを変える</summary><input id="sessionTitle" class="field" value="${escapeHtml(title)}" placeholder="赤城山1日目" /></details>`, 'focus');
}

function renderActiveSession(session) {
  const points = gpsPointsOf(session);
  const records = recordsOf(session);
  return card(`<p class="eyebrow">LIVE</p>
    <h2>${escapeHtml(sessionTypeLabel(session.type))}</h2>
    <p class="muted"><strong>${escapeHtml(session.title || '記録中')}</strong></p>
    <div class="timer-large" id="walkTimer">${elapsedText(session.startedAt)}</div>
    <div class="record-status"><span>${records.length}件</span><span>${distanceKm(points).toFixed(2)}km</span><span>GPS ${points.length}</span></div>
    <textarea id="recordMemo" class="field textarea" rows="3" placeholder="今の気づき"></textarea>
    <button id="addMemo" class="btn primary">残す</button>
    <div class="quick-grid">
      <button id="photoBtn" class="btn">写真</button>
      <button id="addGps" class="btn">GPS</button>
      <button id="quickPoop" class="btn">💩</button>
      <button id="quickWater" class="btn">水</button>
    </div>
    <details class="quiet-details"><summary>設営・撤収・音声</summary>
      <div class="quick-grid">
        <button id="setupStart" class="btn">設営開始</button>
        <button id="setupEnd" class="btn">設営完了</button>
        <button id="teardownStart" class="btn">撤収開始</button>
        <button id="teardownEnd" class="btn">撤収完了</button>
        <button id="voiceMemo" class="btn">音声</button>
        <button id="videoBtn" class="btn">動画</button>
      </div>
    </details>
    <input id="photoInput" type="file" accept="image/*" hidden />
    <input id="videoInput" type="file" accept="video/*" hidden />
    <button id="finishWalk" class="btn primary">終了して保存</button>
    <button id="discardWalk" class="btn danger subtle-danger">破棄</button>
    <details class="quiet-details"><summary>今回の記録</summary>${renderRecordList(records)}</details>`, 'live-card');
}

function renderRecordList(records) {
  if (!records.length) return '<p class="empty-line">まだ記録はありません。</p>';
  return `<ul class="outbase-list">${records.slice(0, 12).map((record) => `<li><strong>${escapeHtml(record.title)}</strong><br><span class="muted">${escapeHtml(formatTime(record.createdAt))}${record.detail ? ` / ${escapeHtml(record.detail)}` : ''}</span>${record.preview ? `<br><img src="${record.preview}" alt="写真メモ" class="memo-image" />` : ''}</li>`).join('')}</ul>`;
}

function renderHistory(history, selectedId = null) {
  return card(`<h2>履歴</h2>
    ${history.length ? `<div class="history-list">${history.slice(0, 5).map((item) => {
      const selected = item.session_id === selectedId;
      return `<article class="history-card ${selected ? 'selected' : ''}"><strong>${escapeHtml(sessionTypeLabel(item.type))}：${escapeHtml(item.title || '記録')}</strong><span>${escapeHtml(formatTime(item.startedAt))} / ${recordsOf(item).length}件 / ${distanceKm(gpsPointsOf(item)).toFixed(2)}km</span><button class="btn small detailSession" data-id="${escapeHtml(item.session_id)}">見る</button></article>`;
    }).join('')}</div>` : '<p class="empty-line">終了するとここに残ります。</p>'}`, 'soft');
}

function renderDetail(session) {
  const reviewItems = buildReviewItems(session);
  return card(`<div id="recordDetail" style="scroll-margin-top:92px"></div>
    <p class="eyebrow">DETAIL</p><h2>${escapeHtml(session.title || sessionTypeLabel(session.type))}</h2>
    <div class="kv"><span>時間</span><strong>${escapeHtml(elapsedText(session.startedAt, session.endedAt))}</strong></div>
    <div class="kv"><span>距離</span><strong>${distanceKm(gpsPointsOf(session)).toFixed(2)}km</strong></div>
    <details class="quiet-details"><summary>記録一覧</summary>${renderRecordList(recordsOf(session))}</details>
    <h3>次回へ戻す</h3>${listItems(reviewItems, 'まだなし')}`, 'focus');
}

function bindWalk() {
  document.querySelectorAll('.startSession').forEach((button) => button.addEventListener('click', () => startSession(button.dataset.type, button.dataset.title)));
  document.getElementById('finishWalk')?.addEventListener('click', finishSession);
  document.getElementById('discardWalk')?.addEventListener('click', discardSession);
  document.getElementById('addMemo')?.addEventListener('click', addTextMemo);
  document.getElementById('addGps')?.addEventListener('click', captureGpsPoint);
  document.getElementById('quickPoop')?.addEventListener('click', () => addRecord(makeRecord('quick', '💩 コタうんち', 'クイック記録')));
  document.getElementById('quickWater')?.addEventListener('click', () => addRecord(makeRecord('quick', '水分補給', 'コタ/人の水分補給')));
  document.getElementById('setupStart')?.addEventListener('click', () => addRecord(makeRecord('timer', '設営開始', '設営タイマー')));
  document.getElementById('setupEnd')?.addEventListener('click', () => addRecord(makeRecord('timer', '設営完了', '次回の段取り確認')));
  document.getElementById('teardownStart')?.addEventListener('click', () => addRecord(makeRecord('timer', '撤収開始', '撤収タイマー')));
  document.getElementById('teardownEnd')?.addEventListener('click', () => addRecord(makeRecord('timer', '撤収完了', '収納順の反省')));
  document.getElementById('photoBtn')?.addEventListener('click', () => document.getElementById('photoInput')?.click());
  document.getElementById('videoBtn')?.addEventListener('click', () => document.getElementById('videoInput')?.click());
  document.getElementById('photoInput')?.addEventListener('change', (event) => handleFileMemo(event, 'photo'));
  document.getElementById('videoInput')?.addEventListener('change', (event) => handleFileMemo(event, 'video'));
  document.getElementById('voiceMemo')?.addEventListener('click', startVoiceMemo);
  document.querySelectorAll('.detailSession').forEach((button) => button.addEventListener('click', () => {
    patchState({ selectedRecordSessionId: button.dataset.id });
    renderWalk();
    scrollToRecordDetail();
  }));
}

function startSession(type = 'walk', defaultTitle = '') {
  const customTitle = document.getElementById('sessionTitle')?.value?.trim();
  const title = customTitle || defaultTitle || '今日の記録';
  patchState({ walkSession: { session_id: `session_${Date.now()}`, type, title, status: 'active', startedAt: new Date().toISOString(), records: [], gpsPoints: [] }, selectedRecordSessionId: null });
  toast('記録開始');
  renderWalk();
}

function addTextMemo() {
  const textarea = document.getElementById('recordMemo');
  const detail = textarea?.value?.trim();
  if (!detail) return toast('メモを入れてください');
  addRecord(makeRecord('memo', 'メモ', detail));
}

function captureGpsPoint() {
  if (!navigator.geolocation) {
    addRecord(makeRecord('gps', 'GPS取得不可', '位置情報が使えません'));
    return;
  }
  navigator.geolocation.getCurrentPosition((position) => {
    const point = { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy, createdAt: new Date().toISOString() };
    updateActiveSession((session) => ({ ...session, gpsPoints: [...gpsPointsOf(session), point], records: [makeRecord('gps', 'GPS', `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`, { point }), ...recordsOf(session)] }));
    toast('GPSを残しました');
    renderWalk();
  }, () => addRecord(makeRecord('gps', 'GPS取得失敗', '位置情報の許可を確認')), { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
}

function handleFileMemo(event, type) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => addRecord(makeRecord(type, type === 'photo' ? '写真' : '動画', file.name, { preview: type === 'photo' ? reader.result : '', fileName: file.name }), type === 'photo' ? '写真を残しました' : '動画を残しました');
  reader.readAsDataURL(file);
}

function startVoiceMemo() {
  const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Speech) {
    addRecord(makeRecord('voice', '音声メモ', '音声認識未対応'));
    return;
  }
  speechRecognition = new Speech();
  speechRecognition.lang = 'ja-JP';
  speechRecognition.interimResults = false;
  speechRecognition.onresult = (event) => addRecord(makeRecord('voice', '音声', event.results?.[0]?.[0]?.transcript || ''));
  speechRecognition.onerror = () => addRecord(makeRecord('voice', '音声失敗', 'もう一度試す'));
  speechRecognition.start();
  toast('話してください');
}

function finishSession() {
  const state = getState();
  const session = state.walkSession;
  if (!session || session.status !== 'active') return;
  const ended = { ...session, status: 'done', endedAt: new Date().toISOString() };
  const reviewItems = buildReviewItems(ended);
  patchState({ walkSession: null, recordHistory: [ended, ...(state.recordHistory || [])].slice(0, 50), selectedRecordSessionId: ended.session_id, reviewQueue: [...new Set([...(state.reviewQueue || []), ...reviewItems])] });
  toast('保存しました');
  renderWalk();
  scrollToRecordDetail();
}

function discardSession() {
  patchState({ walkSession: null });
  toast('破棄しました');
  renderWalk();
}

function startTimer() {
  if (timer) window.clearInterval(timer);
  timer = window.setInterval(() => {
    const session = activeSession();
    const el = document.getElementById('walkTimer');
    if (session && el) el.textContent = elapsedText(session.startedAt);
  }, 1000);
}

function scrollToRecordDetail() {
  window.setTimeout(() => document.getElementById('recordDetail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
}
