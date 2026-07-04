import { app, card, escapeHtml, listItems, toast } from '../../ui/components.js?v=core06-02-record-mode-map-confirm-20260704';
import { getState, patchState } from '../../core/store.js?v=core06-02-record-mode-map-confirm-20260704';

let timer = null;
let speechRecognition = null;
let geoWatchId = null;
let geoWatchSessionId = null;
let resolvingPlace = false;

const MODE_META = {
  camp: { label: 'キャンプ', sub: '滞在全体', emoji: '🏕', parent: true },
  walk: { label: 'コタ散歩', sub: 'GPS・地図・水・うんち', emoji: '🐾' },
  setup: { label: '設営', sub: '開始・完了・時間', emoji: '⛺' },
  cook: { label: '料理', sub: '写真・量・反省', emoji: '🍳' },
  teardown: { label: '撤収', sub: '開始・完了・濡れ物', emoji: '📦' },
  life: { label: 'メモ', sub: '気づきだけ残す', emoji: '✎' }
};

function modeLabel(type) { return MODE_META[type]?.label || '記録'; }
function modeSub(type) { return MODE_META[type]?.sub || '記録'; }
function nowISO() { return new Date().toISOString(); }
function recordsOf(session) { return Array.isArray(session?.records) ? session.records : []; }
function gpsPointsOf(session) { return Array.isArray(session?.gpsPoints) ? session.gpsPoints : []; }
function childSegmentsOf(session) { return Array.isArray(session?.childSegments) ? session.childSegments : []; }
function currentMode(session) { return session?.activeChild?.type || session?.type || 'life'; }
function hasActiveWalk(session) { return session?.status === 'active' && (session.type === 'walk' || session.activeChild?.type === 'walk'); }

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
  try { return new Date(value).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return value; }
}

function activeSession() {
  const session = getState().walkSession;
  return session?.status === 'active' ? session : null;
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
  const session = activeSession();
  const mode = currentMode(session);
  return { record_id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, type, mode, title, detail, createdAt: nowISO(), ...extra };
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
  if (/コタ|犬|ドッグ|足拭き|うんち|散歩/.test(text)) items.push('記録から反省：コタ用品と散歩導線を次回確認');
  if (/設営|撤収|タイマー|時間/.test(text)) items.push('記録から反省：設営・撤収時間を次回段取りへ戻す');
  return [...new Set(items)];
}

export function renderWalk() {
  const state = getState();
  const session = activeSession();
  const history = state.recordHistory || [];
  const selected = state.selectedRecordSessionId ? history.find((item) => item.session_id === state.selectedRecordSessionId) || null : null;

  app().innerHTML = [
    session ? renderActiveSession(session) : renderStartPanel(),
    renderHistory(history, selected?.session_id),
    selected ? renderDetail(selected) : ''
  ].filter(Boolean).join('');
  bindWalk();
  startTimer();
  syncGpsWatch(session);
}

function renderStartPanel() {
  const project = getState().nextProject;
  const campTitle = project?.reservation?.campground ? `${project.reservation.campground} 記録` : 'キャンプ記録';
  return [
    `<section class="record-hero"><p>何を記録する？</p><h2>今の出来事を残す</h2><span>モードごとに必要な項目だけ出します</span></section>`,
    card(`<div class="record-mode-grid">
      ${modeButton('walk', 'コタ散歩', 'GPS・地図・水・うんち', 'コタ散歩')}
      ${modeButton('camp', 'キャンプ', '滞在全体の親記録', escapeHtml(campTitle))}
      ${modeButton('life', 'メモ', '日常・気づき', '今日のメモ')}
    </div>
    <details class="quiet-details record-title-edit"><summary>タイトルを変える</summary><input id="sessionTitle" class="field" value="" placeholder="例：朝のコタ散歩 / 赤城山1日目" /></details>`, 'record-start-card')
  ].join('');
}

function modeButton(type, label, sub, title) {
  return `<button class="record-mode startSession" data-type="${escapeHtml(type)}" data-title="${escapeHtml(title)}">
    <span>${MODE_META[type]?.emoji || '●'}</span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(sub)}</small>
  </button>`;
}

function renderActiveSession(session) {
  const mode = currentMode(session);
  const points = gpsPointsOf(session);
  const records = recordsOf(session);
  const parentTitle = session.parentTitle || session.title || modeLabel(session.type);
  const activeTitle = session.activeChild?.title || modeLabel(mode);
  return card(`<div class="record-live-head">
      <p>記録中</p>
      <h2>${session.type === 'camp' ? `${escapeHtml(parentTitle)} ＞ ${escapeHtml(activeTitle)}` : escapeHtml(activeTitle)}</h2>
      <span>${escapeHtml(session.locationLabel || (mode === 'walk' ? 'GPS確認中' : modeSub(mode)))}</span>
    </div>
    <div class="timer-large record-timer" id="walkTimer">${elapsedText(session.activeChild?.startedAt || session.startedAt)}</div>
    <div class="record-status refined"><span>${records.length}件</span><span>${distanceKm(points).toFixed(2)}km</span><span>GPS ${points.length}</span></div>
    ${session.type === 'camp' ? renderCampContext(session) : ''}
    ${mode === 'walk' ? renderLiveMap(points, session.locationLabel) : ''}
    ${renderModeMemo(mode)}
    ${renderQuickActions(mode)}
    ${renderModeControls(session)}
    <input id="photoInput" type="file" accept="image/*" hidden />
    <input id="videoInput" type="file" accept="video/*" hidden />
    <details class="quiet-details"><summary>今回の記録</summary>${renderRecordList(records)}</details>`, 'live-card record-live-card');
}

function renderCampContext(session) {
  const child = session.activeChild;
  if (child) {
    return `<section class="record-parent-strip"><strong>親：キャンプ記録中</strong><span>今：${escapeHtml(modeLabel(child.type))}</span></section>`;
  }
  return `<section class="record-child-launch"><p>キャンプ中に残すこと</p><div class="record-chip-grid">
    ${childButton('walk')}${childButton('setup')}${childButton('cook')}${childButton('teardown')}${childButton('life')}
  </div></section>`;
}

function childButton(type) {
  return `<button class="startChildMode" data-type="${escapeHtml(type)}"><span>${MODE_META[type]?.emoji || '●'}</span>${escapeHtml(modeLabel(type))}</button>`;
}

function renderLiveMap(points, locationLabel = '') {
  const latest = points[points.length - 1];
  const mapFrame = latest ? `<iframe title="コタ散歩リアルタイム地図" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.openstreetmap.org/export/embed.html?bbox=${latest.lng - 0.004}%2C${latest.lat - 0.003}%2C${latest.lng + 0.004}%2C${latest.lat + 0.003}&layer=mapnik&marker=${latest.lat}%2C${latest.lng}"></iframe>` : '';
  return `<section class="live-map-card">
    <div class="live-map-head"><strong>コタ散歩マップ</strong><span>${escapeHtml(locationLabel || 'GPS取得後に表示')}</span></div>
    <div class="live-map-body ${latest ? 'ready' : 'empty'}">${mapFrame || '<p>GPSを取得すると現在地と散歩の軌跡を表示します。</p>'}${renderRouteSketch(points)}</div>
    <div class="live-map-actions"><button id="addGps" class="btn">現在地を更新</button>${latest ? `<a class="map-link" href="https://www.google.com/maps/search/?api=1&query=${latest.lat},${latest.lng}" target="_blank" rel="noopener">Googleマップ</a>` : ''}</div>
  </section>`;
}

function renderRouteSketch(points) {
  if (points.length < 2) return '';
  const latest = points.slice(-40);
  const lats = latest.map((p) => p.lat);
  const lngs = latest.map((p) => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const w = Math.max(maxLng - minLng, 0.00001);
  const h = Math.max(maxLat - minLat, 0.00001);
  let lastX = 50;
  let lastY = 50;
  const path = latest.map((p, index) => {
    const x = 10 + ((p.lng - minLng) / w) * 80;
    const y = 90 - ((p.lat - minLat) / h) * 80;
    lastX = x;
    lastY = y;
    return `${index ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  return `<svg class="route-sketch" viewBox="0 0 100 100" aria-label="散歩軌跡"><path d="${path}"/><circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="3"/></svg>`;
}

function renderModeMemo(mode) {
  const placeholder = {
    walk: '散歩中の気づき。道、暑さ、水、うんち、コタの様子など',
    camp: 'キャンプ全体のメモ。天気、設営、気づきなど',
    setup: '設営の手順、時間、困ったこと',
    cook: '料理の量、味、次回変えたいこと',
    teardown: '撤収順、濡れ物、乾燥、忘れ物',
    life: '今の気づき'
  }[mode] || '今の気づき';
  return `<textarea id="recordMemo" class="field textarea record-memo" rows="3" placeholder="${escapeHtml(placeholder)}"></textarea>
    <button id="addMemo" class="btn primary record-main-action">残す</button>`;
}

function renderQuickActions(mode) {
  if (mode === 'walk') {
    return `<div class="quick-grid mode-grid walk-actions">
      <button id="photoBtn" class="btn">写真</button>
      <button id="quickPoop" class="btn">💩</button>
      <button id="quickWater" class="btn">水</button>
      <button id="quickBreak" class="btn">休憩</button>
    </div>`;
  }
  if (mode === 'setup') {
    return `<div class="quick-grid mode-grid"><button id="setupStart" class="btn">設営開始</button><button id="setupEnd" class="btn">設営完了</button><button id="photoBtn" class="btn">写真</button><button id="voiceMemo" class="btn">音声</button></div>`;
  }
  if (mode === 'cook') {
    return `<div class="quick-grid mode-grid"><button id="cookPhoto" class="btn">料理写真</button><button id="mealAmount" class="btn">量メモ</button><button id="photoBtn" class="btn">写真</button><button id="voiceMemo" class="btn">音声</button></div>`;
  }
  if (mode === 'teardown') {
    return `<div class="quick-grid mode-grid"><button id="teardownStart" class="btn">撤収開始</button><button id="teardownEnd" class="btn">撤収完了</button><button id="wetItem" class="btn">濡れ物</button><button id="photoBtn" class="btn">写真</button></div>`;
  }
  if (mode === 'camp') {
    return `<div class="quick-grid mode-grid"><button id="photoBtn" class="btn">写真</button><button id="voiceMemo" class="btn">音声</button><button id="weatherMemo" class="btn">天気</button><button id="addGps" class="btn">場所</button></div>`;
  }
  return `<div class="quick-grid mode-grid"><button id="photoBtn" class="btn">写真</button><button id="voiceMemo" class="btn">音声</button></div>`;
}

function renderModeControls(session) {
  const child = session.activeChild;
  if (child) {
    return `<div class="record-end-grid"><button id="finishChild" class="btn primary">${escapeHtml(modeLabel(child.type))}を終了</button><button id="discardChild" class="btn danger subtle-danger">この子記録を破棄</button></div>`;
  }
  return `<div class="record-end-grid"><button id="finishWalk" class="btn primary">終了して保存</button><button id="discardWalk" class="btn danger subtle-danger">破棄</button></div>`;
}

function renderRecordList(records) {
  if (!records.length) return '<p class="empty-line">まだ記録はありません。</p>';
  return `<ul class="outbase-list record-list">${records.slice(0, 20).map((record) => `<li><strong>${escapeHtml(record.title)}</strong><br><span class="muted">${escapeHtml(modeLabel(record.mode))} / ${escapeHtml(formatTime(record.createdAt))}${record.detail ? ` / ${escapeHtml(record.detail)}` : ''}</span>${record.preview ? `<br><img src="${record.preview}" alt="写真メモ" class="memo-image" />` : ''}</li>`).join('')}</ul>`;
}

function renderHistory(history, selectedId = null) {
  return card(`<h2>履歴</h2>
    ${history.length ? `<div class="history-list">${history.slice(0, 5).map((item) => {
      const selected = item.session_id === selectedId;
      const childText = childSegmentsOf(item).length ? ` / 子記録${childSegmentsOf(item).length}件` : '';
      return `<article class="history-card ${selected ? 'selected' : ''}"><strong>${escapeHtml(modeLabel(item.type))}：${escapeHtml(item.title || '記録')}</strong><span>${escapeHtml(formatTime(item.startedAt))} / ${recordsOf(item).length}件 / ${distanceKm(gpsPointsOf(item)).toFixed(2)}km${childText}</span><button class="btn small detailSession" data-id="${escapeHtml(item.session_id)}">見る</button></article>`;
    }).join('')}</div>` : '<p class="empty-line">終了するとここに残ります。</p>'}`, 'soft record-history-card');
}

function renderDetail(session) {
  const reviewItems = buildReviewItems(session);
  return card(`<div id="recordDetail" style="scroll-margin-top:92px"></div>
    <p class="eyebrow">詳細</p><h2>${escapeHtml(session.title || modeLabel(session.type))}</h2>
    <div class="kv"><span>時間</span><strong>${escapeHtml(elapsedText(session.startedAt, session.endedAt))}</strong></div>
    <div class="kv"><span>距離</span><strong>${distanceKm(gpsPointsOf(session)).toFixed(2)}km</strong></div>
    ${childSegmentsOf(session).length ? `<h3>子記録</h3>${listItems(childSegmentsOf(session).map((child) => `${modeLabel(child.type)} ${elapsedText(child.startedAt, child.endedAt)}`))}` : ''}
    <details class="quiet-details"><summary>記録一覧</summary>${renderRecordList(recordsOf(session))}</details>
    <h3>次回へ戻す</h3>${listItems(reviewItems, 'まだなし')}`, 'focus');
}

function bindWalk() {
  document.querySelectorAll('.startSession').forEach((button) => button.addEventListener('click', () => startSession(button.dataset.type, button.dataset.title)));
  document.querySelectorAll('.startChildMode').forEach((button) => button.addEventListener('click', () => startChildMode(button.dataset.type)));
  document.getElementById('finishWalk')?.addEventListener('click', finishSession);
  document.getElementById('discardWalk')?.addEventListener('click', discardSession);
  document.getElementById('finishChild')?.addEventListener('click', finishChildMode);
  document.getElementById('discardChild')?.addEventListener('click', discardChildMode);
  document.getElementById('addMemo')?.addEventListener('click', addTextMemo);
  document.getElementById('addGps')?.addEventListener('click', () => captureGpsPoint(true));
  document.getElementById('quickPoop')?.addEventListener('click', () => addRecord(makeRecord('quick', '💩 コタうんち', 'クイック記録')));
  document.getElementById('quickWater')?.addEventListener('click', () => addRecord(makeRecord('quick', '水分補給', 'コタ/人の水分補給')));
  document.getElementById('quickBreak')?.addEventListener('click', () => addRecord(makeRecord('quick', '休憩', 'コタ散歩の休憩')));
  document.getElementById('setupStart')?.addEventListener('click', () => addRecord(makeRecord('timer', '設営開始', '設営タイマー')));
  document.getElementById('setupEnd')?.addEventListener('click', () => addRecord(makeRecord('timer', '設営完了', '次回の段取り確認')));
  document.getElementById('teardownStart')?.addEventListener('click', () => addRecord(makeRecord('timer', '撤収開始', '撤収タイマー')));
  document.getElementById('teardownEnd')?.addEventListener('click', () => addRecord(makeRecord('timer', '撤収完了', '収納順の反省')));
  document.getElementById('wetItem')?.addEventListener('click', () => addRecord(makeRecord('memo', '濡れ物', '乾燥・収納確認')));
  document.getElementById('weatherMemo')?.addEventListener('click', () => addRecord(makeRecord('memo', '天気メモ', '体感・風・雨')));
  document.getElementById('mealAmount')?.addEventListener('click', () => addRecord(makeRecord('memo', '料理量メモ', '多い/少ない/ちょうどいい')));
  document.getElementById('cookPhoto')?.addEventListener('click', () => document.getElementById('photoInput')?.click());
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
  const project = getState().nextProject;
  const title = customTitle || (type === 'camp' ? (project?.reservation?.campground ? `${project.reservation.campground} 記録` : 'キャンプ記録') : defaultTitle) || modeLabel(type);
  const session = {
    session_id: `session_${Date.now()}`,
    type,
    title,
    parentTitle: type === 'camp' ? title : '',
    status: 'active',
    startedAt: nowISO(),
    records: [],
    gpsPoints: [],
    childSegments: [],
    locationLabel: type === 'walk' ? 'GPS確認中' : ''
  };
  patchState({ walkSession: session, selectedRecordSessionId: null });
  toast(`${modeLabel(type)}を開始`);
  renderWalk();
  if (type === 'walk') window.setTimeout(() => captureGpsPoint(false), 500);
}

function startChildMode(type) {
  const state = getState();
  const session = state.walkSession;
  if (!session || session.status !== 'active' || session.type !== 'camp') return;
  if (session.activeChild && !window.confirm(`${modeLabel(session.activeChild.type)}を終了して、${modeLabel(type)}を開始しますか？`)) return;
  const next = closeChild(session, false);
  const activeChild = { child_id: `child_${Date.now()}`, type, title: modeLabel(type), startedAt: nowISO() };
  patchState({ walkSession: { ...next, activeChild, records: [makeRecord('mode', `${modeLabel(type)}開始`, 'キャンプ内の子記録'), ...recordsOf(next)] } });
  toast(`${modeLabel(type)}を開始`);
  renderWalk();
  if (type === 'walk') window.setTimeout(() => captureGpsPoint(false), 500);
}

function closeChild(session, save = true) {
  const child = session.activeChild;
  if (!child) return session;
  const ended = { ...child, endedAt: nowISO() };
  return { ...session, activeChild: null, childSegments: save ? [ended, ...childSegmentsOf(session)] : childSegmentsOf(session) };
}

function finishChildMode() {
  const session = activeSession();
  if (!session?.activeChild) return;
  const childType = session.activeChild.type;
  const next = closeChild(session, true);
  patchState({ walkSession: { ...next, records: [makeRecord('mode', `${modeLabel(childType)}終了`, '子記録を保存'), ...recordsOf(next)] } });
  toast(`${modeLabel(childType)}を終了`);
  renderWalk();
}

function discardChildMode() {
  const session = activeSession();
  if (!session?.activeChild) return;
  if (!window.confirm(`${modeLabel(session.activeChild.type)}の子記録を破棄しますか？`)) return;
  patchState({ walkSession: { ...session, activeChild: null } });
  toast('子記録を破棄しました');
  renderWalk();
}

function addTextMemo() {
  const textarea = document.getElementById('recordMemo');
  const detail = textarea?.value?.trim();
  if (!detail) return toast('メモを入れてください');
  const mode = currentMode(activeSession());
  addRecord(makeRecord('memo', `${modeLabel(mode)}メモ`, detail));
}

function addGpsPointToSession(point, manual = false) {
  updateActiveSession((session) => {
    const points = gpsPointsOf(session);
    const previous = points[points.length - 1];
    if (!manual && previous && haversine(previous, point) < 0.01) return session;
    const records = manual ? [makeRecord('gps', 'GPS', `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`, { point }), ...recordsOf(session)] : recordsOf(session);
    return { ...session, gpsPoints: [...points, point].slice(-500), records };
  });
  maybeResolvePlace(point);
}

function captureGpsPoint(manual = true) {
  if (!navigator.geolocation) {
    addRecord(makeRecord('gps', 'GPS取得不可', '位置情報が使えません'));
    return;
  }
  navigator.geolocation.getCurrentPosition((position) => {
    const point = { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy, createdAt: nowISO() };
    addGpsPointToSession(point, manual);
    toast(manual ? 'GPSを残しました' : '現在地を確認しました');
    renderWalk();
  }, () => addRecord(makeRecord('gps', 'GPS取得失敗', '位置情報の許可を確認')), { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
}

function syncGpsWatch(session) {
  if (!hasActiveWalk(session)) {
    stopGpsWatch();
    return;
  }
  if (!navigator.geolocation || geoWatchSessionId === session.session_id) return;
  stopGpsWatch();
  geoWatchSessionId = session.session_id;
  geoWatchId = navigator.geolocation.watchPosition((position) => {
    const point = { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy, createdAt: nowISO() };
    addGpsPointToSession(point, false);
    const current = activeSession();
    if (current?.session_id === geoWatchSessionId) renderWalk();
  }, () => undefined, { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 });
}

function stopGpsWatch() {
  if (geoWatchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(geoWatchId);
  geoWatchId = null;
  geoWatchSessionId = null;
}

async function maybeResolvePlace(point) {
  const session = activeSession();
  if (!session || resolvingPlace || session.locationLabel?.match(/市|区|町|村|付近|現在地/)) return;
  resolvingPlace = true;
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${point.lat}&lon=${point.lng}&zoom=16&accept-language=ja`, { headers: { 'Accept': 'application/json' } });
    const data = await res.json();
    const a = data.address || {};
    const label = [a.city || a.town || a.village || a.county || a.suburb, a.neighbourhood || a.road].filter(Boolean).slice(0, 2).join(' ') || '現在地付近';
    updateActiveSession((current) => ({ ...current, locationLabel: `${label}付近` }));
  } catch {
    updateActiveSession((current) => ({ ...current, locationLabel: '現在地付近' }));
  } finally {
    resolvingPlace = false;
  }
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
  const closed = closeChild(session, true);
  const ended = { ...closed, status: 'done', endedAt: nowISO() };
  const reviewItems = buildReviewItems(ended);
  stopGpsWatch();
  patchState({ walkSession: null, recordHistory: [ended, ...(state.recordHistory || [])].slice(0, 50), selectedRecordSessionId: ended.session_id, reviewQueue: [...new Set([...(state.reviewQueue || []), ...reviewItems])] });
  toast('保存しました');
  renderWalk();
  scrollToRecordDetail();
}

function discardSession() {
  const session = activeSession();
  const name = session?.title || 'この記録';
  if (!window.confirm(`${name} を破棄しますか？\nこの操作は元に戻せません。`)) return;
  stopGpsWatch();
  patchState({ walkSession: null });
  toast('破棄しました');
  renderWalk();
}

function startTimer() {
  if (timer) window.clearInterval(timer);
  timer = window.setInterval(() => {
    const session = activeSession();
    const el = document.getElementById('walkTimer');
    if (session && el) el.textContent = elapsedText(session.activeChild?.startedAt || session.startedAt);
  }, 1000);
}

function scrollToRecordDetail() {
  window.setTimeout(() => document.getElementById('recordDetail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
}
