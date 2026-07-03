import { app, card, escapeHtml, listItems } from '../../ui/components.js';
import { getState, patchState } from '../../core/store.js';

let timer = null;
let gpsWatchId = null;
let speechRecognition = null;

function sessionTypeLabel(type) {
  return { walk: 'コタ散歩', camp: 'キャンプ当日', life: '日常メモ' }[type] || '記録';
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
  for (let i = 1; i < points.length; i += 1) {
    total += haversine(points[i - 1], points[i]);
  }
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
  return {
    record_id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    title,
    detail,
    createdAt: new Date().toISOString(),
    ...extra
  };
}

function updateActiveSession(updater) {
  const state = getState();
  const session = state.walkSession;
  if (!session || session.status !== 'active') return;
  patchState({ walkSession: updater(session) });
}

function addRecord(record) {
  updateActiveSession((session) => ({ ...session, records: [record, ...recordsOf(session)] }));
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
  return [...new Set(items)];
}

export function renderWalk() {
  const state = getState();
  const session = activeSession();
  const history = state.recordHistory || [];
  const selected = history.find((item) => item.session_id === state.selectedRecordSessionId) || history[0] || null;
  app().innerHTML = [
    card(`<div class="title">キャンプ・散歩・日常記録 Core03</div><p class="muted">3秒で残す入口。写真・動画・音声メモ・GPS・タイマーを、あとで次回改善に戻す。</p>`, 'hero'),
    session ? renderActiveSession(session) : renderStartPanel(),
    renderHistory(history),
    selected ? renderDetail(selected) : ''
  ].filter(Boolean).join('');
  bindWalk();
  startTimer();
}

function renderStartPanel() {
  return card(`
    <h2>記録を開始</h2>
    <p class="muted">今日は何を残すか選んで開始。キャンプだけでなく、コタ散歩や日常の気づきも対象。</p>
    <label>記録タイプ</label>
    <select id="sessionType">
      <option value="walk">コタ散歩</option>
      <option value="camp">キャンプ当日</option>
      <option value="life">日常メモ</option>
    </select>
    <label>タイトル</label>
    <input id="sessionTitle" value="${defaultSessionTitle()}" placeholder="例：赤城山1日目 / コタ夕方散歩" />
    <button id="startWalk" class="btn primary">記録開始</button>
  `);
}

function defaultSessionTitle() {
  const project = getState().nextProject;
  if (project?.reservation?.campground) return `${project.reservation.campground} 記録`;
  return '今日の記録';
}

function renderActiveSession(session) {
  const points = gpsPointsOf(session);
  const records = recordsOf(session);
  return card(`
    <h2>${escapeHtml(sessionTypeLabel(session.type))}</h2>
    <p><strong>${escapeHtml(session.title || '記録中')}</strong></p>
    <div class="kv"><span>経過</span><strong id="walkTimer">${elapsedText(session.startedAt)}</strong></div>
    <div class="kv"><span>記録</span><strong>${records.length}件</strong></div>
    <div class="kv"><span>GPS</span><strong>${points.length}点 / ${distanceKm(points).toFixed(2)}km</strong></div>
    <div class="grid"><button id="addGps" class="btn">GPS取得</button><button id="quickPoop" class="btn">💩</button><button id="quickWater" class="btn">💧</button><button id="quickNotice" class="btn">気づき</button></div>
    <label>メモ</label>
    <textarea id="recordMemo" rows="4" placeholder="例：コタが暑そう。風が強い。撤収時にタオル不足。"></textarea>
    <div class="grid"><button id="addMemo" class="btn primary">メモ保存</button><button id="voiceMemo" class="btn">長押し音声メモ</button></div>
    <input id="photoInput" type="file" accept="image/*" hidden />
    <input id="videoInput" type="file" accept="video/*" hidden />
    <div class="grid"><button id="photoBtn" class="btn">写真メモ</button><button id="videoBtn" class="btn">動画メモ</button></div>
    <div class="grid"><button id="finishWalk" class="btn primary">終了して保存</button><button id="discardWalk" class="btn danger">破棄</button></div>
    <h3>今回の記録</h3>
    ${renderRecordList(records)}
  `);
}

function renderRecordList(records) {
  if (!records.length) return '<p class="muted">まだ記録なし。写真・音声・メモ・GPSを残せます。</p>';
  return `<ul class="outbase-list">${records.slice(0, 12).map((record) => `<li><strong>${escapeHtml(record.title)}</strong><br><span class="muted">${escapeHtml(formatTime(record.createdAt))}${record.detail ? ` / ${escapeHtml(record.detail)}` : ''}</span>${record.preview ? `<br><img src="${record.preview}" alt="写真メモ" style="max-width:100%;border-radius:14px;margin-top:8px" />` : ''}</li>`).join('')}</ul>`;
}

function renderHistory(history) {
  return card(`
    <h2>履歴カード</h2>
    ${history.length ? `<div class="timeline">${history.slice(0, 8).map((item) => `<div><strong>${escapeHtml(sessionTypeLabel(item.type))}：${escapeHtml(item.title || '記録')}</strong><span>${escapeHtml(formatTime(item.startedAt))} / ${recordsOf(item).length}件 / ${distanceKm(gpsPointsOf(item)).toFixed(2)}km</span><button class="btn small detailSession" data-id="${escapeHtml(item.session_id)}">詳細を見る</button></div>`).join('')}</div>` : '<p class="muted">記録を終了すると履歴カードになります。</p>'}
  `);
}

function renderDetail(session) {
  const reviewItems = buildReviewItems(session);
  return card(`
    <h2>詳細画面</h2>
    <p><strong>${escapeHtml(session.title || sessionTypeLabel(session.type))}</strong></p>
    <div class="kv"><span>種別</span><strong>${escapeHtml(sessionTypeLabel(session.type))}</strong></div>
    <div class="kv"><span>時間</span><strong>${escapeHtml(elapsedText(session.startedAt, session.endedAt))}</strong></div>
    <div class="kv"><span>距離</span><strong>${distanceKm(gpsPointsOf(session)).toFixed(2)}km</strong></div>
    <h3>記録一覧</h3>
    ${renderRecordList(recordsOf(session))}
    <h3>次回改善候補</h3>
    ${listItems(reviewItems, '改善候補はまだありません')}
  `);
}

function bindWalk() {
  document.getElementById('startWalk')?.addEventListener('click', startSession);
  document.getElementById('finishWalk')?.addEventListener('click', finishSession);
  document.getElementById('discardWalk')?.addEventListener('click', discardSession);
  document.getElementById('addMemo')?.addEventListener('click', addTextMemo);
  document.getElementById('addGps')?.addEventListener('click', captureGpsPoint);
  document.getElementById('quickPoop')?.addEventListener('click', () => addRecord(makeRecord('quick', '💩 コタうんち', '散歩/キャンプ中のクイック記録')));
  document.getElementById('quickWater')?.addEventListener('click', () => addRecord(makeRecord('quick', '💧 水分補給', 'コタ/人の水分補給メモ')));
  document.getElementById('quickNotice')?.addEventListener('click', () => addRecord(makeRecord('notice', '気づき', 'あとで詳細メモにする')));
  document.getElementById('photoBtn')?.addEventListener('click', () => document.getElementById('photoInput')?.click());
  document.getElementById('videoBtn')?.addEventListener('click', () => document.getElementById('videoInput')?.click());
  document.getElementById('photoInput')?.addEventListener('change', (event) => handleFileMemo(event, 'photo'));
  document.getElementById('videoInput')?.addEventListener('change', (event) => handleFileMemo(event, 'video'));
  document.getElementById('voiceMemo')?.addEventListener('click', startVoiceMemo);
  document.querySelectorAll('.detailSession').forEach((button) => {
    button.addEventListener('click', () => {
      patchState({ selectedRecordSessionId: button.dataset.id });
      renderWalk();
    });
  });
}

function startSession() {
  stopGpsWatch();
  const type = document.getElementById('sessionType')?.value || 'walk';
  const title = document.getElementById('sessionTitle')?.value?.trim() || defaultSessionTitle();
  const session = {
    session_id: `session_${Date.now()}`,
    type,
    title,
    startedAt: new Date().toISOString(),
    status: 'active',
    records: [],
    gpsPoints: []
  };
  patchState({ walkSession: session, selectedRecordSessionId: null });
  startGpsWatch();
  renderWalk();
}

function finishSession() {
  const state = getState();
  const session = state.walkSession;
  if (!session || session.status !== 'active') return;
  stopGpsWatch();
  const finished = { ...session, endedAt: new Date().toISOString(), status: 'finished' };
  const reviewItems = buildReviewItems(finished);
  patchState({
    walkSession: null,
    recordHistory: [finished, ...(state.recordHistory || [])].slice(0, 30),
    selectedRecordSessionId: finished.session_id,
    reviewQueue: [...reviewItems, ...(state.reviewQueue || [])].slice(0, 50)
  });
  renderWalk();
}

function discardSession() {
  stopGpsWatch();
  patchState({ walkSession: null });
  renderWalk();
}

function addTextMemo() {
  const text = document.getElementById('recordMemo')?.value?.trim();
  if (!text) return;
  addRecord(makeRecord('memo', 'メモ', text));
}

function handleFileMemo(event, kind) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (kind === 'photo' && file.size <= 2_500_000) {
    const reader = new FileReader();
    reader.onload = () => addRecord(makeRecord('photo', '写真メモ', file.name, { fileName: file.name, preview: reader.result }));
    reader.readAsDataURL(file);
    return;
  }
  addRecord(makeRecord(kind, kind === 'photo' ? '写真メモ' : '動画メモ', `${file.name}（本保存は次ゲートで接続）`, { fileName: file.name }));
}

function captureGpsPoint() {
  if (!navigator.geolocation) {
    addRecord(makeRecord('gps', 'GPS取得不可', 'このブラウザでは位置情報が使えません'));
    return;
  }
  navigator.geolocation.getCurrentPosition((pos) => {
    const point = gpsPointFromPosition(pos);
    updateActiveSession((session) => ({ ...session, gpsPoints: [...gpsPointsOf(session), point] }));
    addRecord(makeRecord('gps', 'GPS地点', `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`));
  }, () => {
    addRecord(makeRecord('gps', 'GPS取得失敗', '位置情報の許可または電波状態を確認'));
  }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
}

function gpsPointFromPosition(pos) {
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
    createdAt: new Date().toISOString()
  };
}

function startGpsWatch() {
  if (!navigator.geolocation) return;
  stopGpsWatch();
  gpsWatchId = navigator.geolocation.watchPosition((pos) => {
    const point = gpsPointFromPosition(pos);
    updateActiveSession((session) => {
      const points = gpsPointsOf(session);
      const last = points[points.length - 1];
      if (last && haversine(last, point) < 0.005) return session;
      return { ...session, gpsPoints: [...points, point].slice(-500) };
    });
  }, () => {}, { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 });
}

function stopGpsWatch() {
  if (gpsWatchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(gpsWatchId);
  }
  gpsWatchId = null;
}

function startVoiceMemo() {
  const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Speech) {
    const text = window.prompt('音声入力が使えないため、メモを入力してください。');
    if (text) addRecord(makeRecord('voice', '音声メモ代替', text));
    return;
  }
  try {
    if (speechRecognition) speechRecognition.stop();
    speechRecognition = new Speech();
    speechRecognition.lang = 'ja-JP';
    speechRecognition.interimResults = false;
    speechRecognition.maxAlternatives = 1;
    speechRecognition.onresult = (event) => {
      const text = event.results?.[0]?.[0]?.transcript || '';
      if (text) addRecord(makeRecord('voice', '音声メモ', text));
    };
    speechRecognition.onerror = () => addRecord(makeRecord('voice', '音声メモ失敗', '音声認識を開始できませんでした'));
    speechRecognition.start();
  } catch {
    addRecord(makeRecord('voice', '音声メモ失敗', '音声認識を開始できませんでした'));
  }
}

function startTimer() {
  clearInterval(timer);
  timer = setInterval(() => {
    const el = document.getElementById('walkTimer');
    const session = activeSession();
    if (el && session) el.textContent = elapsedText(session.startedAt);
  }, 1000);
}
