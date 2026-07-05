import { app, escapeHtml, toast } from '../../ui/components.js?v=core08-d2-day-easy-record-20260705';
import { getState, patchState } from '../../core/store.js?v=core08-d2-day-easy-record-20260705';
import { go } from '../../core/router.js?v=core08-d2-day-easy-record-20260705';

const TAGS = [
  { key: 'unclassified', label: '未分類', icon: '•' },
  { key: 'depart', label: '出発', icon: '🚙' },
  { key: 'arrive', label: '到着', icon: '📍' },
  { key: 'setup', label: '設営', icon: '⛺' },
  { key: 'meal', label: '料理', icon: '🍳' },
  { key: 'walk', label: '場内確認', icon: '🧭' },
  { key: 'kota', label: 'コタ', icon: '🐾' },
  { key: 'teardown', label: '撤収', icon: '📦' },
  { key: 'shopping', label: '買い物', icon: '🛒' },
  { key: 'notice', label: '気づき', icon: '💡' },
  { key: 'forgot', label: '忘れ物', icon: '⚠' },
  { key: 'next', label: '次回注意', icon: '↗' }
];

const CAPTURE_MODES = {
  now: { label: '今すぐ', sub: '今この場で残す', prefix: '今のメモ' },
  later: { label: 'あとで登録', sub: '押し忘れた分を戻す', prefix: 'あとから思い出したこと' },
  before: { label: '事前メモ', sub: 'あとで撮る/確認する予定', prefix: '事前に置いておくメモ' },
  rough: { label: '何となく', sub: '分類せず仮置き', prefix: '分類しないメモ' }
};

const RECORD_TYPES = {
  note: 'メモ', photo: '写真', video: '動画', voice: '音声', rough: '何となく', before: '事前メモ', later: 'あとで登録'
};

const TIME_HINTS = ['今', 'さっき', '朝', '午前', '昼ごろ', '午後', '夕方', '夜', '昨日', '不明'];

function nowIso() { return new Date().toISOString(); }
function safeList(value) { return Array.isArray(value) ? value : []; }
function safeObject(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
function makeId(prefix = 'dayrec') { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
function projectName(project) { return project?.reservation?.campground || project?.title || '今日のキャンプ'; }
function projectDate(project) { return project?.reservation?.dateText || project?.dateText || ''; }
function projectKey(state = getState()) {
  const project = state.nextProject || {};
  const reservation = project.reservation || {};
  return project.id || project.baseId || project.projectId || ['nextProject', reservation.campground || project.title || 'camp', reservation.dateText || 'undated'].join('__');
}
function context(state, project) { return { ...(state.prepContext || {}), ...(project?.prepContext || {}) }; }
function dayRecords(state = getState(), key = projectKey(state)) { return safeList(state.dayRecords?.[key]); }
function captureMode(state = getState()) { return CAPTURE_MODES[state.dayCaptureMode] ? state.dayCaptureMode : 'now'; }
function activeTag(state = getState()) { return TAGS.some((item) => item.key === state.activeDayTag) ? state.activeDayTag : 'unclassified'; }
function tagMeta(key) { return TAGS.find((item) => item.key === key) || TAGS[0]; }
function modeMeta(key) { return CAPTURE_MODES[key] || CAPTURE_MODES.now; }
function recordTypeLabel(type) { return RECORD_TYPES[type] || RECORD_TYPES.note; }
function formatTime(value) {
  if (!value) return '';
  try { return new Date(value).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return value; }
}
function elapsedText(value) {
  if (!value) return '未開始';
  const diff = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (diff < 60) return `${diff}分`;
  return `${Math.floor(diff / 60)}時間${diff % 60}分`;
}
function modeCount(records, mode) { return records.filter((record) => record.captureMode === mode).length; }

function summarize(records = []) {
  const text = records.map((record) => `${record.title} ${record.detail} ${record.tagLabel}`).join(' ');
  const items = [];
  if (/忘れ|不足|足りない|足りな|買え/.test(text)) items.push('忘れ物・不足を次回準備へ戻す候補');
  if (/雨|濡|乾燥|撤収/.test(text)) items.push('雨撤収・濡れ物・乾燥サービスの確認候補');
  if (/暑|熱|冷却|WAVE|扇風機|コタ|犬/.test(text)) items.push('暑さ対策とコタ負担の確認候補');
  if (/料理|量|多すぎ|少ない|余り|味|食材/.test(text)) items.push('料理量・食材量の調整候補');
  if (/設営|撤収|時間|段取り/.test(text)) items.push('設営/撤収の段取り改善候補');
  return [...new Set(items)].slice(0, 4);
}

function renderHero(state, project, records) {
  const c = context(state, project);
  const start = state.dayStartedAt || '';
  return `<section class="easy-day-hero day-card">
    <div class="easy-day-title"><span>当日かんたん記録</span><h2>${escapeHtml(projectName(project))}</h2><p>${escapeHtml(projectDate(project) || c.weatherDecisionMemo || c.routeMemo || '押し忘れても大丈夫。あとから、事前に、何となくでも残せます。')}</p></div>
    <div class="easy-day-status"><strong>${records.length}</strong><span>今日の記録</span><small>${escapeHtml(start ? `開始から${elapsedText(start)}` : '未開始')}</small></div>
  </section>`;
}

function renderModeTabs(state, records) {
  const current = captureMode(state);
  return `<section class="easy-mode-card day-card">
    <div class="easy-mode-head"><strong>どう残す？</strong><span>きっちり選ばなくてOK</span></div>
    <div class="easy-mode-tabs">
      ${Object.entries(CAPTURE_MODES).map(([key, item]) => `<button type="button" class="easy-mode-tab ${current === key ? 'active' : ''}" data-capture-mode="${escapeHtml(key)}"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.sub)}</span><em>${modeCount(records, key)}</em></button>`).join('')}
    </div>
  </section>`;
}

function renderBigCapture(state) {
  const mode = modeMeta(captureMode(state));
  return `<section class="easy-capture-card day-card">
    <div class="easy-capture-head"><div><span>${escapeHtml(mode.label)}</span><strong>${escapeHtml(mode.prefix)}</strong></div><small>大きいボタンだけ使えばOK</small></div>
    <div class="easy-big-actions">
      <button id="easyPhoto" type="button"><strong>写真</strong><span>撮ったものを残す</span></button>
      <button id="easyMemoFocus" type="button"><strong>メモ</strong><span>短く書く</span></button>
      <button id="easyVoice" type="button"><strong>音声</strong><span>話して残す</span></button>
      <button id="easyVideo" type="button"><strong>動画</strong><span>動画名を残す</span></button>
    </div>
    ${renderLooseForm(state)}
    <input id="easyPhotoInput" type="file" accept="image/*" hidden />
    <input id="easyVideoInput" type="file" accept="video/*" hidden />
  </section>`;
}

function renderLooseForm(state) {
  const mode = captureMode(state);
  const modeLabel = modeMeta(mode).label;
  return `<div class="easy-loose-form">
    <textarea id="easyMemo" class="field textarea easy-memo" rows="4" placeholder="${escapeHtml(modeLabel)}：例）さっき設営終わった。風が強かった。コタは日陰なら平気。"></textarea>
    <div class="easy-mini-row">
      <label><span>時間ざっくり</span><select id="easyTimeHint" class="field">${TIME_HINTS.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join('')}</select></label>
      <label><span>タグ任意</span><select id="easyTag" class="field">${TAGS.map((item) => `<option value="${escapeHtml(item.key)}" ${activeTag(state) === item.key ? 'selected' : ''}>${escapeHtml(item.icon)} ${escapeHtml(item.label)}</option>`).join('')}</select></label>
    </div>
    <div class="easy-save-row"><button id="easySaveMemo" class="btn primary" type="button">残す</button><button id="easyRoughSave" class="btn" type="button">何となく残す</button></div>
  </div>`;
}

function renderTimeline(records = []) {
  return `<section class="easy-timeline-card day-card">
    <div class="easy-section-head"><div><span>TIMELINE</span><strong>今日の記録</strong></div><small>${records.length}件</small></div>
    ${records.length ? `<div class="easy-timeline-list">${records.slice(0, 30).map(renderRecord).join('')}</div>` : '<p class="empty-line">まだ記録はありません。写真・メモ・音声・動画を大きいボタンから残します。</p>'}
  </section>`;
}

function renderRecord(record) {
  const tag = tagMeta(record.tag || 'unclassified');
  const mode = modeMeta(record.captureMode || 'now');
  const attachments = safeList(record.attachments);
  return `<article class="easy-record-row mode-${escapeHtml(record.captureMode || 'now')}">
    <div class="easy-record-top"><span>${escapeHtml(mode.label)}</span><strong>${escapeHtml(recordTypeLabel(record.type))}</strong><time>${escapeHtml(record.timeHint || formatTime(record.createdAt))}</time></div>
    <h3>${escapeHtml(record.title || recordTypeLabel(record.type))}</h3>
    ${record.detail ? `<p>${escapeHtml(record.detail)}</p>` : ''}
    <div class="easy-record-meta"><span>${escapeHtml(tag.icon)} ${escapeHtml(record.tagLabel || tag.label)}</span><span>${escapeHtml(formatTime(record.createdAt))}</span>${record.planned ? '<span>予定メモ</span>' : ''}</div>
    ${attachments.length ? `<div class="easy-attachments">${attachments.map((file) => `<span>${escapeHtml(file.kind || '')} ${escapeHtml(file.name || 'file')} ${file.size ? `/${Math.round(Number(file.size) / 1024)}KB` : ''}</span>`).join('')}</div>` : ''}
  </article>`;
}

function renderOrganizer(records = []) {
  const items = summarize(records);
  return `<section class="easy-organizer-card day-card">
    <div class="easy-section-head"><div><span>あとで整理</span><strong>AI整理候補</strong></div><small>自動反映なし</small></div>
    ${items.length ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '<p class="empty-line">記録が増えると、次回へ戻す候補だけ出します。</p>'}
    <p class="easy-guard-note">分類・上書き・削除は勝手にしません。候補表示だけです。</p>
  </section>`;
}

function buildRecord({ type = 'note', title = '', detail = '', attachments = [], forceMode = null, forceTag = null, planned = false } = {}) {
  const state = getState();
  const project = state.nextProject || {};
  const key = projectKey(state);
  const mode = forceMode || captureMode(state);
  const selectedTag = forceTag || document.getElementById('easyTag')?.value || activeTag(state);
  const tag = tagMeta(selectedTag);
  const timeHint = document.getElementById('easyTimeHint')?.value || (mode === 'now' ? '今' : '不明');
  return {
    id: makeId('dayrec'),
    projectId: key,
    projectName: projectName(project),
    projectDate: projectDate(project),
    captureMode: mode,
    type,
    title: title || recordTypeLabel(type),
    detail: String(detail || '').trim(),
    tag: tag.key,
    tagLabel: tag.label,
    timeHint,
    planned: planned || mode === 'before',
    attachments,
    source: 'day-easy',
    locked: true,
    createdAt: nowIso()
  };
}

function appendRecord(partial, message = '記録を残しました') {
  const state = getState();
  const key = projectKey(state);
  const records = dayRecords(state, key);
  const record = buildRecord(partial);
  if (!record.detail && !record.attachments.length && ['note', 'voice', 'rough', 'before', 'later'].includes(record.type)) return toast('内容を少しだけ入れてください');
  patchState({ dayRecords: { ...(state.dayRecords || {}), [key]: [record, ...records] }, dayStartedAt: state.dayStartedAt || nowIso(), activeDayTag: record.tag, dayCaptureMode: record.captureMode });
  toast(message);
  renderDay();
}

function saveMemo(forceMode = null) {
  const detail = document.getElementById('easyMemo')?.value || '';
  const mode = forceMode || captureMode();
  const type = mode === 'later' ? 'later' : mode === 'before' ? 'before' : mode === 'rough' ? 'rough' : 'note';
  appendRecord({ type, title: modeMeta(mode).label, detail, forceMode: mode, planned: mode === 'before' });
}

function handleFile(kind, file) {
  if (!file) return;
  const detail = document.getElementById('easyMemo')?.value || '';
  appendRecord({
    type: kind === 'video' ? 'video' : 'photo',
    title: kind === 'video' ? '動画' : '写真',
    detail,
    attachments: [{ kind: kind === 'video' ? '動画' : '写真', name: file.name, size: file.size, type: file.type, capturedAt: nowIso() }]
  }, kind === 'video' ? '動画を残しました' : '写真を残しました');
}

function startVoiceMemo() {
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Rec) return appendRecord({ type: 'voice', title: '音声メモ', detail: document.getElementById('easyMemo')?.value || '' }, '音声メモとして残しました');
  try {
    const recognition = new Rec();
    recognition.lang = 'ja-JP';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const text = event.results?.[0]?.[0]?.transcript || '';
      appendRecord({ type: 'voice', title: '音声メモ', detail: text }, '音声メモを残しました');
    };
    recognition.onerror = () => toast('音声認識に失敗しました。メモに書いて残せます。');
    recognition.start();
    toast('話してください');
  } catch {
    toast('音声認識を開始できませんでした。メモに書いて残せます。');
  }
}

function seedBeforeMemo() {
  patchState({ dayCaptureMode: 'before' });
  renderDay();
  window.setTimeout(() => document.getElementById('easyMemo')?.focus(), 60);
}

export function renderDay() {
  const state = getState();
  const project = state.nextProject;
  const key = projectKey(state);
  const records = dayRecords(state, key);
  app().innerHTML = `<section class="route-page day-easy-page core08d2-day">
    ${renderHero(state, project, records)}
    ${renderModeTabs(state, records)}
    ${renderBigCapture(state)}
    <section class="easy-shortcuts day-card">
      <button id="jumpLater" type="button"><strong>あとで登録</strong><span>押し忘れた分</span></button>
      <button id="jumpBefore" type="button"><strong>事前にメモ</strong><span>あとで撮る/確認</span></button>
      <button id="jumpRough" type="button"><strong>何となく残す</strong><span>分類なし</span></button>
    </section>
    ${renderTimeline(records)}
    ${renderOrganizer(records)}
    <section class="easy-footer-actions"><button id="goPrepFromDay" class="mini-ghost" type="button">準備を見る</button><button id="openRecordTab" class="mini-ghost" type="button">記録タブ</button></section>
  </section>`;

  document.querySelectorAll('[data-capture-mode]').forEach((button) => button.addEventListener('click', () => { patchState({ dayCaptureMode: button.dataset.captureMode || 'now' }); renderDay(); }));
  document.getElementById('easyMemoFocus')?.addEventListener('click', () => document.getElementById('easyMemo')?.focus());
  document.getElementById('easySaveMemo')?.addEventListener('click', () => saveMemo());
  document.getElementById('easyRoughSave')?.addEventListener('click', () => saveMemo('rough'));
  document.getElementById('easyPhoto')?.addEventListener('click', () => document.getElementById('easyPhotoInput')?.click());
  document.getElementById('easyVideo')?.addEventListener('click', () => document.getElementById('easyVideoInput')?.click());
  document.getElementById('easyPhotoInput')?.addEventListener('change', (event) => handleFile('photo', event.target.files?.[0]));
  document.getElementById('easyVideoInput')?.addEventListener('change', (event) => handleFile('video', event.target.files?.[0]));
  document.getElementById('easyVoice')?.addEventListener('click', startVoiceMemo);
  document.getElementById('jumpLater')?.addEventListener('click', () => { patchState({ dayCaptureMode: 'later' }); renderDay(); window.setTimeout(() => document.getElementById('easyMemo')?.focus(), 60); });
  document.getElementById('jumpBefore')?.addEventListener('click', seedBeforeMemo);
  document.getElementById('jumpRough')?.addEventListener('click', () => { patchState({ dayCaptureMode: 'rough', activeDayTag: 'unclassified' }); renderDay(); window.setTimeout(() => document.getElementById('easyMemo')?.focus(), 60); });
  document.getElementById('goPrepFromDay')?.addEventListener('click', () => go('prep'));
  document.getElementById('openRecordTab')?.addEventListener('click', () => go('walk'));
}
