import { app, card, escapeHtml, toast } from '../../ui/components.js?v=core08-e2-plus-action-hub-20260705';
import { getState, patchState } from '../../core/store.js?v=core08-e2-plus-action-hub-20260705';

const RECORD_LIMIT = 160;
let speechRecognition = null;
let timer = null;
let geoWatchId = null;
let geoWatchKey = '';

const ACTIVITY_META = {
  walk: { label: '散歩', short: '散歩', sub: 'GPS・時間・距離', gps: true, icon: '🐾' },
  drive: { label: 'ドライブ', short: '運転', sub: 'Google Maps・停車候補', gps: true, icon: '🚗' },
  setup: { label: '設営', short: '設営', sub: '開始・完了・注意点', gps: false, icon: '⛺' },
  cook: { label: '料理', short: '料理', sub: '写真・量・次回改善', gps: false, icon: '🍳' },
  teardown: { label: '撤収', short: '撤収', sub: '濡れ物・収納・忘れ物', gps: false, icon: '📦' },
  campWalk: { label: '場内探索', short: '探索', sub: '場内散歩・設備・注意', gps: true, icon: '🧭' }
};

function nowISO() { return new Date().toISOString(); }
function quickId(prefix = 'quick') { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }
function meta(type) { return ACTIVITY_META[type] || { label: '記録', short: '記録', sub: 'あとで整理', gps: false, icon: '✎' }; }
function formatTime(value) {
  if (!value) return '';
  try { return new Date(value).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return value; }
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
function distanceKm(points = []) {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i += 1) total += haversine(points[i - 1], points[i]);
  return total;
}
function activeProjectName(state = getState()) {
  const p = state.nextProject || {};
  return p?.reservation?.campground || p?.campground || p?.title || '今日の記録';
}
function projectDestination(state = getState()) {
  const p = state.nextProject || {};
  return p?.reservation?.campground || p?.campground || p?.title || 'キャンプ場';
}
function inferContext(extra = {}) {
  const state = getState();
  const project = state.nextProject || {};
  return {
    projectId: project.id || project.project_id || '',
    projectName: activeProjectName(state),
    capturedAt: nowISO(),
    route: state.currentRoute || '',
    status: '未確認',
    source: 'plus-action-hub',
    ...extra
  };
}
function suggestTags(record, context = {}) {
  const text = `${record.title || ''} ${record.detail || ''} ${context.projectName || ''} ${context.activity || ''}`;
  const tags = ['未確認'];
  if (/散歩|場内|探索|設備|レビュー|ルート/.test(text)) tags.push('散歩/探索');
  if (/ドライブ|運転|出発|到着|停車|渋滞|Google|ルート|SA|PA|道の駅/.test(text)) tags.push('ドライブ');
  if (/給油|ガソリン/.test(text)) tags.push('給油');
  if (/買|スーパー|コンビニ|食材/.test(text)) tags.push('買い出し');
  if (/設営|テント|タープ|配置|レイアウト/.test(text)) tags.push('設営');
  if (/料理|ごはん|朝食|昼食|夕食|食材|量|味|焼|ピザ|シュリンプ/.test(text)) tags.push('料理');
  if (/撤収|片付|収納|濡|乾燥|忘れ/.test(text)) tags.push('撤収');
  if (/コタ|犬|ドッグ|足|暑|寒|水/.test(text)) tags.push('コタ');
  if (/天気|雨|風|気温|暑|寒/.test(text)) tags.push('天気');
  if (/次回|失敗|改善|多すぎ|少な|足り|忘れ/.test(text)) tags.push('次回改善');
  return [...new Set(tags)];
}
function makeRecord(type, title, detail = '', extra = {}) {
  return {
    record_id: quickId('rec'), type, title, detail,
    mode: extra.activityType || activeSession()?.type || 'auto',
    createdAt: nowISO(), status: '未確認', source: 'plus-action-hub', ...extra
  };
}
function makeHistoryItem(record, extra = {}) {
  const context = inferContext(extra.context || {});
  return {
    session_id: quickId('quick'), type: 'quick', title: record.title || '記録',
    status: 'done', startedAt: record.createdAt || nowISO(), endedAt: record.createdAt || nowISO(),
    records: [record], gpsPoints: extra.point ? [extra.point] : [], childSegments: [],
    unresolved: true, context, autoTags: suggestTags(record, context), reviewCandidate: true
  };
}
function activeSession() {
  const session = getState().walkSession;
  return session?.status === 'active' ? session : null;
}
function recordsOf(session) { return Array.isArray(session?.records) ? session.records : []; }
function gpsPointsOf(session) { return Array.isArray(session?.gpsPoints) ? session.gpsPoints : []; }
function addQuickRecord(record, message = '残しました', extra = {}) {
  const state = getState();
  const item = makeHistoryItem(record, extra);
  patchState({
    recordHistory: [item, ...(state.recordHistory || [])].slice(0, RECORD_LIMIT),
    selectedRecordSessionId: null,
    reviewQueue: [...new Set([...(state.reviewQueue || []), ...item.autoTags.filter((tag) => tag !== '未確認')])]
  });
  toast(message);
  renderWalk();
  captureContextForItem(item.session_id);
}
function addRecordToActive(record, message = '残しました') {
  const state = getState();
  const session = state.walkSession;
  if (!session || session.status !== 'active') return addQuickRecord(record, message);
  const context = inferContext({ activity: meta(session.type).label, activityType: session.type });
  const enriched = { ...record, mode: session.type, activityType: session.type };
  const autoTags = [...new Set([...(session.autoTags || []), ...suggestTags(enriched, context)])];
  patchState({ walkSession: { ...session, records: [enriched, ...recordsOf(session)], autoTags } });
  toast(message);
  renderWalk();
}
function updateHistoryItem(sessionId, updater) {
  const state = getState();
  patchState({ recordHistory: (state.recordHistory || []).map((item) => item.session_id === sessionId ? updater(item) : item) });
}
function captureContextForItem(sessionId) {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition((position) => {
    const point = { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy, createdAt: nowISO(), source: 'auto-context' };
    updateHistoryItem(sessionId, (item) => ({
      ...item,
      gpsPoints: [point, ...(item.gpsPoints || [])].slice(0, 10),
      context: { ...(item.context || {}), hasLocation: true, locationCapturedAt: point.createdAt }
    }));
  }, () => undefined, { enableHighAccuracy: true, timeout: 7000, maximumAge: 120000 });
}

export function renderWalk() {
  const state = getState();
  const session = activeSession();
  app().innerHTML = `${session ? renderActiveActivity(session) : renderPlusHub(state)}${renderTestReset(state)}${renderRecent(state)}`;
  bindWalk();
  startTimer();
  syncGpsWatch(session);
}

function renderPlusHub(state) {
  const projectName = activeProjectName(state);
  return card(`<section class="e2-plus-shell">
    <div class="e2-hero">
      <span>＋</span>
      <h2>残す / 始める</h2>
      <p>一瞬の記録は上。時間のある行動は下。分類はあとでOUTBASEが候補化する。</p>
    </div>
    <div class="e2-context-pill"><strong>紐付け候補</strong><span>${escapeHtml(projectName)}</span></div>
    <section class="e2-section">
      <div class="e2-section-head"><strong>今すぐ残す</strong><small>写真・声・メモ・あとで</small></div>
      <div class="e2-quick-grid">
        ${quickButton('quickPhoto', '写真', '撮る / 選ぶ')}
        ${quickButton('quickVoice', '声', '話して残す')}
        ${quickButton('quickMemo', 'メモ', '短く残す')}
        ${quickButton('quickLater', 'あとで', '空で置く')}
      </div>
    </section>
    <section class="e2-section">
      <div class="e2-section-head"><strong>活動を始める</strong><small>開始と終了が必要なもの</small></div>
      <div class="e2-activity-grid">
        ${activityButton('walk')}${activityButton('drive')}${activityButton('setup')}${activityButton('cook')}${activityButton('teardown')}${activityButton('campWalk')}
      </div>
    </section>
    <div class="e2-memo-box" id="memoBox" hidden>
      <textarea id="quickMemoText" class="field textarea" rows="4" placeholder="例：エビ多すぎた / タープ位置は右寄せ / コタ暑そう"></textarea>
      <div class="e2-memo-actions"><button id="saveQuickMemo" class="btn primary" type="button">残す</button><button id="cancelQuickMemo" class="btn" type="button">閉じる</button></div>
    </div>
    <input id="quickFileInput" type="file" accept="image/*,video/*" hidden />
  </section>`, 'e2-plus-card');
}
function quickButton(id, label, sub) { return `<button id="${id}" type="button"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(sub)}</span></button>`; }
function activityButton(type) {
  const m = meta(type);
  return `<button class="startActivity" data-type="${escapeHtml(type)}" type="button"><em>${m.icon}</em><strong>${escapeHtml(m.label)}</strong><span>${escapeHtml(m.sub)}</span></button>`;
}

function renderActiveActivity(session) {
  const m = meta(session.type);
  const points = gpsPointsOf(session);
  const count = recordsOf(session).length;
  const distance = m.gps ? `${distanceKm(points).toFixed(2)}km` : `${count}件`;
  return card(`<section class="e2-active-shell">
    <div class="e2-active-hero">
      <div><span>記録中</span><h2>${m.icon} ${escapeHtml(m.label)}</h2><p>${escapeHtml(session.context?.projectName || activeProjectName())}</p></div>
      <button id="finishActivityTop" class="btn primary" type="button">終了</button>
    </div>
    <div class="e2-metrics"><div><span>時間</span><strong id="walkTimer">${elapsedText(session.startedAt)}</strong></div><div><span>${m.gps ? '距離' : '記録'}</span><strong>${escapeHtml(distance)}</strong></div><div><span>未確認</span><strong>${count}件</strong></div></div>
    <section class="e2-section active-actions"><div class="e2-section-head"><strong>この活動で残す</strong><small>整理はあとで</small></div><div class="e2-quick-grid">
      ${quickButton('quickPhoto', '写真', '撮る')}${quickButton('quickVoice', '声', '話す')}${quickButton('quickMemo', 'メモ', '入力')}${quickButton('quickLater', 'あとで', '保留')}
    </div></section>
    <section class="e2-section"><div class="e2-section-head"><strong>よくある出来事</strong><small>ワンタップで候補化</small></div><div class="e2-event-grid">
      ${eventButton('fuel', '給油')}${eventButton('shop', '買い出し')}${eventButton('kota', 'コタ')}${eventButton('weather', '天気')}${eventButton('issue', '注意')}${m.gps ? eventButton('gps', '現在地') : eventButton('done', '完了メモ')}
    </div></section>
    ${session.type === 'drive' ? renderDriveTools() : ''}
    <details class="e2-switch"><summary>活動を切替</summary><div class="e2-activity-grid small">${Object.keys(ACTIVITY_META).map(activityButton).join('')}</div></details>
    <details class="e2-log"><summary>この活動の記録 ${count}件</summary>${renderActiveRecords(session)}</details>
    <div class="e2-end-row"><button id="finishActivity" class="btn primary" type="button">保存して終了</button><button id="cancelActivity" class="btn danger subtle-danger" type="button">テスト中止</button></div>
    <input id="quickFileInput" type="file" accept="image/*,video/*" hidden />
    <div class="e2-memo-box" id="memoBox" hidden><textarea id="quickMemoText" class="field textarea" rows="4" placeholder="この活動のメモ"></textarea><div class="e2-memo-actions"><button id="saveQuickMemo" class="btn primary" type="button">残す</button><button id="cancelQuickMemo" class="btn" type="button">閉じる</button></div></div>
  </section>`, 'e2-active-card');
}
function eventButton(type, label) { return `<button class="eventCandidate" data-type="${escapeHtml(type)}" type="button"><strong>${escapeHtml(label)}</strong><span>候補</span></button>`; }
function renderDriveTools() {
  return `<section class="e2-drive-tools"><div><strong>Google Maps</strong><span>ドライブ中はOUTBASEを操作しない。戻ったら候補を補完。</span></div><button id="openGoogleMaps" type="button">Mapsで開く</button></section>`;
}
function renderActiveRecords(session) {
  const records = recordsOf(session).slice(0, 10);
  if (!records.length) return '<p class="empty-line">まだありません。</p>';
  return `<div class="e2-recent-list">${records.map((record) => `<article class="e2-recent-item"><div><strong>${escapeHtml(record.title || '記録')}</strong><small>${escapeHtml(formatTime(record.createdAt))}</small></div><p>${escapeHtml(record.detail || 'あとで確認')}</p></article>`).join('')}</div>`;
}

function renderTestReset(state) {
  const count = (state.recordHistory || []).filter(isTestRecord).length + (state.walkSession?.source === 'plus-action-hub' ? 1 : 0);
  return card(`<section class="e2-test-reset">
    <div><strong>テスト中</strong><span>＋で作った未確認・活動テストだけリセット。</span></div>
    <button id="resetQuickTest" class="mini-ghost" type="button">テスト記録リセット</button>
    <small>${count}件が対象。予定・準備・ギア・本番記録は残す。</small>
  </section>`, 'e2-reset-card');
}
function isTestRecord(item) { return item?.context?.source === 'plus-action-hub' || item?.unresolved || item?.source === 'plus-action-hub'; }
function renderRecent(state) {
  const history = state.recordHistory || [];
  const unresolved = history.filter((item) => item.unresolved || item.context?.status === '未確認');
  const latest = history.slice(0, 6);
  return card(`<section class="e2-recent-shell">
    <div class="e2-recent-head"><strong>未確認箱</strong><span>${unresolved.length}件</span></div>
    <p class="e2-recent-note">写真・声・メモ・散歩・ドライブ・設営・料理・撤収・場内探索は、全部ここに候補で残る。</p>
    ${latest.length ? `<div class="e2-recent-list">${latest.map(renderRecentItem).join('')}</div>` : '<p class="empty-line">まだ記録はありません。</p>'}
  </section>`, 'e2-recent-card');
}
function renderRecentItem(item) {
  const record = item.records?.[0] || {};
  const tags = (item.autoTags || ['未確認']).slice(0, 4).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
  return `<article class="e2-recent-item"><div><strong>${escapeHtml(item.title || record.title || '記録')}</strong><small>${escapeHtml(formatTime(record.createdAt || item.startedAt))}</small></div><p>${escapeHtml(record.detail || item.context?.projectName || 'あとで確認')}</p><div class="e2-tags">${tags}</div></article>`;
}

function bindWalk() {
  document.getElementById('quickPhoto')?.addEventListener('click', () => document.getElementById('quickFileInput')?.click());
  document.getElementById('quickFileInput')?.addEventListener('change', handleQuickFile);
  document.getElementById('quickVoice')?.addEventListener('click', startVoiceMemo);
  document.getElementById('quickMemo')?.addEventListener('click', () => openMemoBox(''));
  document.getElementById('quickLater')?.addEventListener('click', () => addRecordSmart(makeRecord('later', 'あとで確認', '内容未入力。あとで思い出で整理'), 'あとで確認に入れました'));
  document.getElementById('saveQuickMemo')?.addEventListener('click', saveMemoFromBox);
  document.getElementById('cancelQuickMemo')?.addEventListener('click', closeMemoBox);
  document.querySelectorAll('.startActivity').forEach((button) => button.addEventListener('click', () => startActivity(button.dataset.type)));
  document.querySelectorAll('.eventCandidate').forEach((button) => button.addEventListener('click', () => addEventCandidate(button.dataset.type)));
  document.getElementById('finishActivity')?.addEventListener('click', finishActivity);
  document.getElementById('finishActivityTop')?.addEventListener('click', finishActivity);
  document.getElementById('cancelActivity')?.addEventListener('click', cancelActivity);
  document.getElementById('resetQuickTest')?.addEventListener('click', resetQuickTestRecords);
  document.getElementById('openGoogleMaps')?.addEventListener('click', openGoogleMaps);
}
function addRecordSmart(record, message) { activeSession() ? addRecordToActive(record, message) : addQuickRecord(record, message); }
function openMemoBox(text = '') {
  const box = document.getElementById('memoBox');
  const textarea = document.getElementById('quickMemoText');
  if (!box || !textarea) return;
  box.hidden = false; textarea.value = text; textarea.focus();
}
function closeMemoBox() { const box = document.getElementById('memoBox'); if (box) box.hidden = true; }
function saveMemoFromBox() {
  const textarea = document.getElementById('quickMemoText');
  const detail = textarea?.value?.trim();
  if (!detail) return toast('メモを入れてください');
  addRecordSmart(makeRecord('memo', 'メモ', detail), 'メモを残しました');
  closeMemoBox();
}
function handleQuickFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const type = file.type?.startsWith('video/') ? 'video' : 'photo';
  const title = type === 'video' ? '動画' : '写真';
  const reader = new FileReader();
  reader.onload = () => addRecordSmart(makeRecord(type, title, file.name, { preview: type === 'photo' ? reader.result : '', fileName: file.name, mimeType: file.type || '' }), `${title}を残しました`);
  reader.readAsDataURL(file); event.target.value = '';
}
function startVoiceMemo() {
  const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Speech) { openMemoBox('音声認識未対応：'); return toast('音声認識に対応していません'); }
  try {
    speechRecognition?.abort?.(); speechRecognition = new Speech();
    speechRecognition.lang = 'ja-JP'; speechRecognition.interimResults = false;
    speechRecognition.onresult = (event) => {
      const text = event.results?.[0]?.[0]?.transcript || '';
      addRecordSmart(makeRecord('voice', '声メモ', text || '音声メモ'), '声を残しました');
    };
    speechRecognition.onerror = () => toast('声を拾えませんでした。メモで残せます');
    speechRecognition.start(); toast('話してください');
  } catch { toast('音声を開始できませんでした'); }
}

function startActivity(type) {
  const m = meta(type);
  const current = activeSession();
  if (current) {
    if (current.type === type) return;
    if (!window.confirm(`${meta(current.type).label}を保存して、${m.label}に切り替えますか？`)) return;
    finishActivity(false);
  }
  const context = inferContext({ activity: m.label, activityType: type });
  const session = {
    session_id: quickId('act'), type, title: m.label, status: 'active', startedAt: nowISO(),
    records: [makeRecord('activity', `${m.label}開始`, m.sub, { activityType: type })],
    gpsPoints: [], childSegments: [], unresolved: true, source: 'plus-action-hub', context, autoTags: ['未確認', m.label]
  };
  patchState({ walkSession: session, selectedRecordSessionId: null });
  toast(`${m.label}を開始`);
  renderWalk();
  if (type === 'drive') openGoogleMaps();
  if (m.gps) window.setTimeout(() => captureGpsPoint(false), 500);
}
function finishActivity(shouldRender = true) {
  const state = getState();
  const session = state.walkSession;
  if (!session || session.status !== 'active') return;
  stopGpsWatch();
  const endedAt = nowISO();
  const endRecord = makeRecord('activity', `${meta(session.type).label}終了`, '保存して未確認箱へ', { activityType: session.type });
  const ended = {
    ...session, status: 'done', endedAt, records: [endRecord, ...recordsOf(session)], unresolved: true,
    autoTags: [...new Set([...(session.autoTags || []), ...suggestTags(endRecord, session.context)])], reviewCandidate: true
  };
  patchState({
    walkSession: null,
    recordHistory: [ended, ...(state.recordHistory || [])].slice(0, RECORD_LIMIT),
    selectedRecordSessionId: null,
    reviewQueue: [...new Set([...(state.reviewQueue || []), ...ended.autoTags.filter((tag) => tag !== '未確認')])]
  });
  toast(`${meta(session.type).label}を保存しました`);
  if (shouldRender) renderWalk();
}
function cancelActivity() {
  const session = activeSession();
  if (!session) return;
  if (!window.confirm(`${meta(session.type).label}をテスト中止しますか？\n予定・準備・ギアは消しません。`)) return;
  stopGpsWatch();
  patchState({ walkSession: null, quickResetBackup: { action: 'cancel-activity', session, createdAt: nowISO(), expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() } });
  toast('活動テストを中止しました'); renderWalk();
}
function addEventCandidate(type) {
  if (type === 'gps') return captureGpsPoint(true);
  const labels = { fuel: '給油したかも', shop: '買い出ししたかも', kota: 'コタ関連', weather: '天気変化', issue: '注意点', done: '完了メモ' };
  addRecordSmart(makeRecord(type, labels[type] || '出来事', 'ワンタップ候補。あとで思い出で確認'), '候補を残しました');
}
function openGoogleMaps() {
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(projectDestination())}`;
  addRecordToActive(makeRecord('maps', 'Google Mapsを開く', projectDestination(), { activityType: 'drive' }), 'Google Mapsを開きます');
  window.open(url, '_blank', 'noopener');
}
function captureGpsPoint(manual = true) {
  if (!navigator.geolocation) { addRecordSmart(makeRecord('gps', 'GPS取得不可', '位置情報が使えません'), 'GPSが使えません'); return; }
  navigator.geolocation.getCurrentPosition((position) => {
    const point = { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy, createdAt: nowISO(), source: manual ? 'manual' : 'auto' };
    const session = activeSession();
    if (session) {
      const points = [...gpsPointsOf(session), point].slice(-700);
      const record = manual ? makeRecord('gps', '現在地', `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`, { point, activityType: session.type }) : null;
      patchState({ walkSession: { ...session, gpsPoints: points, records: record ? [record, ...recordsOf(session)] : recordsOf(session) } });
      toast(manual ? '現在地を残しました' : '現在地を確認しました'); renderWalk();
    } else {
      addQuickRecord(makeRecord('gps', '現在地', `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`, { point }), '現在地を残しました', { point });
    }
  }, () => addRecordSmart(makeRecord('gps', 'GPS取得失敗', '位置情報の許可を確認'), 'GPS取得に失敗'), { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 });
}
function syncGpsWatch(session) {
  const m = meta(session?.type);
  const shouldWatch = session?.status === 'active' && m.gps;
  if (!shouldWatch) { stopGpsWatch(); return; }
  if (!navigator.geolocation) return;
  const key = `${session.session_id}:${session.type}`;
  if (geoWatchKey === key) return;
  stopGpsWatch(); geoWatchKey = key;
  geoWatchId = navigator.geolocation.watchPosition((position) => {
    const point = { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy, createdAt: nowISO(), source: 'watch' };
    const latest = gpsPointsOf(activeSession()).slice(-1)[0];
    if (latest && haversine(latest, point) < 0.01) return;
    const current = activeSession();
    if (!current) return;
    patchState({ walkSession: { ...current, gpsPoints: [...gpsPointsOf(current), point].slice(-700) } });
  }, () => undefined, { enableHighAccuracy: true, maximumAge: 15000, timeout: 25000 });
}
function stopGpsWatch() {
  if (geoWatchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(geoWatchId);
  geoWatchId = null; geoWatchKey = '';
}
function resetQuickTestRecords() {
  const state = getState();
  const history = state.recordHistory || [];
  const targets = history.filter(isTestRecord);
  const active = state.walkSession?.source === 'plus-action-hub' ? state.walkSession : null;
  const total = targets.length + (active ? 1 : 0);
  if (!total) return toast('リセット対象はありません');
  if (!window.confirm(`＋のテスト記録 ${total}件をリセットしますか？\n予定・準備・ギア・本番記録は残します。`)) return;
  stopGpsWatch();
  const backup = { action: 'quick-reset', items: targets, active, createdAt: nowISO(), expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() };
  patchState({ recordHistory: history.filter((item) => !isTestRecord(item)), walkSession: active ? null : state.walkSession, quickResetBackup: backup, selectedRecordSessionId: null });
  toast('＋のテスト記録をリセットしました'); renderWalk();
}
function startTimer() {
  if (timer) window.clearInterval(timer);
  timer = window.setInterval(() => {
    const session = activeSession();
    const el = document.getElementById('walkTimer');
    if (session && el) el.textContent = elapsedText(session.startedAt);
  }, 1000);
}
