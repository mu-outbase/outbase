import { app, card, escapeHtml, toast } from '../../ui/components.js?v=core08-e1-one-tap-record-20260705';
import { getState, patchState } from '../../core/store.js?v=core08-e1-one-tap-record-20260705';

const RECORD_LIMIT = 120;
let speechRecognition = null;
let pendingType = '';

function nowISO() { return new Date().toISOString(); }
function formatTime(value) {
  if (!value) return '';
  try { return new Date(value).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return value; }
}
function quickId(prefix = 'quick') { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }
function activeProjectName(state = getState()) {
  const p = state.nextProject || {};
  return p?.reservation?.campground || p?.campground || p?.title || '今日の記録';
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
    source: 'plus-one-tap',
    ...extra
  };
}
function makeRecord(type, title, detail = '', extra = {}) {
  return {
    record_id: quickId('rec'),
    type,
    mode: 'auto',
    title,
    detail,
    createdAt: nowISO(),
    status: '未確認',
    source: 'plus-one-tap',
    ...extra
  };
}
function makeHistoryItem(record, extra = {}) {
  const context = inferContext(extra.context || {});
  return {
    session_id: quickId('quick'),
    type: 'quick',
    title: record.title || '記録',
    status: 'done',
    startedAt: record.createdAt || nowISO(),
    endedAt: record.createdAt || nowISO(),
    records: [record],
    gpsPoints: extra.point ? [extra.point] : [],
    childSegments: [],
    unresolved: true,
    context,
    autoTags: suggestTags(record, context),
    reviewCandidate: true
  };
}
function suggestTags(record, context) {
  const text = `${record.title || ''} ${record.detail || ''} ${context.projectName || ''}`;
  const tags = ['未確認'];
  if (/設営|テント|タープ|配置|レイアウト/.test(text)) tags.push('設営');
  if (/料理|ごはん|朝食|昼食|夕食|食材|量|味|焼|ピザ|シュリンプ/.test(text)) tags.push('料理');
  if (/撤収|片付|収納|濡|乾燥|忘れ/.test(text)) tags.push('撤収');
  if (/コタ|犬|散歩|ドッグ|足|暑|寒|水/.test(text)) tags.push('コタ');
  if (/買|スーパー|コンビニ|給油|ガソリン|SA|PA|道の駅/.test(text)) tags.push('移動/立寄り');
  if (/次回|失敗|改善|多すぎ|少な|足り/.test(text)) tags.push('次回改善');
  return [...new Set(tags)];
}
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
  app().innerHTML = `${renderQuickCapture(state)}${renderTestReset(state)}${renderRecent(state)}`;
  bindWalk();
}

function renderQuickCapture(state) {
  const projectName = activeProjectName(state);
  return card(`<section class="e1-capture-shell">
    <div class="e1-hero">
      <span>＋記録</span>
      <h2>残す</h2>
      <p>分類しなくていい。写真・声・メモ・あとでだけ残して、整理は思い出でやる。</p>
    </div>
    <div class="e1-context-pill"><strong>自動で紐付け候補</strong><span>${escapeHtml(projectName)}</span></div>
    <div class="e1-actions" aria-label="記録方法">
      <button id="quickPhoto" type="button"><strong>写真</strong><span>撮る / 選ぶ</span></button>
      <button id="quickVoice" type="button"><strong>声</strong><span>話して残す</span></button>
      <button id="quickMemo" type="button"><strong>メモ</strong><span>短く残す</span></button>
      <button id="quickLater" type="button"><strong>あとで</strong><span>空で置く</span></button>
    </div>
    <div class="e1-memo-box" id="memoBox" hidden>
      <textarea id="quickMemoText" class="field textarea" rows="4" placeholder="例：エビ多すぎた / タープ位置は右寄せが良い / コタ暑そう"></textarea>
      <div class="e1-memo-actions"><button id="saveQuickMemo" class="btn primary" type="button">メモを残す</button><button id="cancelQuickMemo" class="btn" type="button">閉じる</button></div>
    </div>
    <input id="quickFileInput" type="file" accept="image/*,video/*" hidden />
  </section>`, 'e1-capture-card');
}

function renderTestReset(state) {
  const count = (state.recordHistory || []).filter((item) => item?.context?.source === 'plus-one-tap' || item?.unresolved).length;
  return card(`<section class="e1-test-reset">
    <div><strong>テスト中</strong><span>＋で作った未確認・テスト記録だけを戻せます。</span></div>
    <button id="resetQuickTest" class="mini-ghost" type="button">テスト記録リセット</button>
    <small>${count}件が対象</small>
  </section>`, 'e1-reset-card');
}

function renderRecent(state) {
  const history = state.recordHistory || [];
  const unresolved = history.filter((item) => item.unresolved || item.context?.status === '未確認');
  const latest = history.slice(0, 5);
  return card(`<section class="e1-recent-shell">
    <div class="e1-recent-head"><strong>未確認箱</strong><span>${unresolved.length}件</span></div>
    <p class="e1-recent-note">キャンプ中はここを整理しない。帰ったら思い出タブで確認。</p>
    ${latest.length ? `<div class="e1-recent-list">${latest.map(renderRecentItem).join('')}</div>` : '<p class="empty-line">まだ記録はありません。</p>'}
  </section>`, 'e1-recent-card');
}
function renderRecentItem(item) {
  const record = item.records?.[0] || {};
  const tags = (item.autoTags || ['未確認']).slice(0, 3).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
  return `<article class="e1-recent-item"><div><strong>${escapeHtml(record.title || item.title || '記録')}</strong><small>${escapeHtml(formatTime(record.createdAt || item.startedAt))}</small></div><p>${escapeHtml(record.detail || item.context?.projectName || 'あとで確認')}</p><div class="e1-tags">${tags}</div></article>`;
}

function bindWalk() {
  document.getElementById('quickPhoto')?.addEventListener('click', () => {
    pendingType = 'file';
    document.getElementById('quickFileInput')?.click();
  });
  document.getElementById('quickFileInput')?.addEventListener('change', handleQuickFile);
  document.getElementById('quickVoice')?.addEventListener('click', startVoiceMemo);
  document.getElementById('quickMemo')?.addEventListener('click', () => openMemoBox(''));
  document.getElementById('quickLater')?.addEventListener('click', () => addQuickRecord(makeRecord('later', 'あとで確認', '内容未入力。あとで思い出で整理'), 'あとで確認に入れました'));
  document.getElementById('saveQuickMemo')?.addEventListener('click', saveMemoFromBox);
  document.getElementById('cancelQuickMemo')?.addEventListener('click', closeMemoBox);
  document.getElementById('resetQuickTest')?.addEventListener('click', resetQuickTestRecords);
}
function openMemoBox(text = '') {
  const box = document.getElementById('memoBox');
  const textarea = document.getElementById('quickMemoText');
  if (!box || !textarea) return;
  box.hidden = false;
  textarea.value = text;
  textarea.focus();
}
function closeMemoBox() {
  const box = document.getElementById('memoBox');
  if (box) box.hidden = true;
}
function saveMemoFromBox() {
  const textarea = document.getElementById('quickMemoText');
  const detail = textarea?.value?.trim();
  if (!detail) return toast('メモを入れてください');
  addQuickRecord(makeRecord('memo', 'メモ', detail), 'メモを残しました');
  closeMemoBox();
}
function handleQuickFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const type = file.type?.startsWith('video/') ? 'video' : 'photo';
  const title = type === 'video' ? '動画' : '写真';
  const reader = new FileReader();
  reader.onload = () => addQuickRecord(makeRecord(type, title, file.name, { preview: type === 'photo' ? reader.result : '', fileName: file.name, mimeType: file.type || '' }), `${title}を残しました`);
  reader.readAsDataURL(file);
  event.target.value = '';
}
function startVoiceMemo() {
  const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Speech) {
    openMemoBox('音声認識未対応：');
    return toast('音声認識に対応していません');
  }
  try {
    speechRecognition?.abort?.();
    speechRecognition = new Speech();
    speechRecognition.lang = 'ja-JP';
    speechRecognition.interimResults = false;
    speechRecognition.onresult = (event) => {
      const text = event.results?.[0]?.[0]?.transcript || '';
      addQuickRecord(makeRecord('voice', '声メモ', text || '音声メモ'), '声を残しました');
    };
    speechRecognition.onerror = () => toast('声を拾えませんでした。メモで残せます');
    speechRecognition.start();
    toast('話してください');
  } catch {
    toast('音声を開始できませんでした');
  }
}
function resetQuickTestRecords() {
  const state = getState();
  const history = state.recordHistory || [];
  const targets = history.filter((item) => item?.context?.source === 'plus-one-tap' || item?.unresolved);
  if (!targets.length) return toast('リセット対象はありません');
  if (!window.confirm(`＋のテスト記録 ${targets.length}件をリセットしますか？\n予定・準備・ギア・本番記録は残します。`)) return;
  const backup = { action: 'quick-reset', items: targets, createdAt: nowISO(), expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() };
  patchState({ recordHistory: history.filter((item) => !(item?.context?.source === 'plus-one-tap' || item?.unresolved)), quickResetBackup: backup, selectedRecordSessionId: null });
  toast('＋のテスト記録をリセットしました');
  renderWalk();
}
