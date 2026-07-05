import { app, escapeHtml, toast } from '../../ui/components.js?v=core08-d-day-record-20260705';
import { getState, patchState } from '../../core/store.js?v=core08-d-day-record-20260705';
import { go } from '../../core/router.js?v=core08-d-day-record-20260705';

const PHASES = [
  { key: 'depart', label: '出発', icon: '🚙', hint: '出発時間・渋滞・寄り道' },
  { key: 'arrive', label: '到着', icon: '📍', hint: '受付・サイト確認・第一印象' },
  { key: 'setup', label: '設営', icon: '⛺', hint: '設営開始/完了・配置・困りごと' },
  { key: 'meal', label: '料理', icon: '🍳', hint: '写真・量・味・次回調整' },
  { key: 'walk', label: '場内確認', icon: '🧭', hint: 'トイレ・炊事場・景色・危険箇所' },
  { key: 'kota', label: 'コタ', icon: '🐾', hint: '暑さ寒さ・水・休憩・足元' },
  { key: 'teardown', label: '撤収', icon: '📦', hint: '濡れ物・収納・忘れ物・乾燥' }
];

const RECORD_TYPES = {
  note: 'メモ',
  photo: '写真',
  video: '動画',
  voice: '音声メモ',
  issue: '次回注意',
  weather: '天気変化',
  kota: 'コタ',
  timing: '時間'
};

function nowIso() { return new Date().toISOString(); }
function formatTime(value) {
  if (!value) return '';
  try { return new Date(value).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return value; }
}
function projectName(project) { return project?.reservation?.campground || project?.title || '今日のキャンプ'; }
function projectDate(project) { return project?.reservation?.dateText || project?.dateText || ''; }
function projectKey(state = getState()) {
  const project = state.nextProject || {};
  const id = project.id || project.baseId || project.projectId || '';
  const reservation = project.reservation || {};
  return id || ['nextProject', reservation.campground || project.title || 'camp', reservation.dateText || 'undated'].join('__');
}
function context(state, project) { return { ...(state.prepContext || {}), ...(project?.prepContext || {}) }; }
function safeList(value) { return Array.isArray(value) ? value : []; }
function dayRecords(state = getState(), key = projectKey(state)) { return safeList(state.dayRecords?.[key]); }
function phaseMap(state = getState(), key = projectKey(state)) { return state.dayPhaseState?.[key] || {}; }
function currentPhase(state = getState()) { return state.activeDayPhase || 'arrive'; }
function phaseMeta(key) { return PHASES.find((item) => item.key === key) || PHASES[1]; }
function recordTypeLabel(type) { return RECORD_TYPES[type] || RECORD_TYPES.note; }
function makeId(prefix = 'dayrec') { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
function elapsedText(startedAt, endedAt = null) {
  if (!startedAt) return '未開始';
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const diff = Math.max(0, Math.floor((end - new Date(startedAt).getTime()) / 1000));
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  return h ? `${h}時間${m}分` : `${m}分`;
}

function summarizeToday(records = []) {
  const text = records.map((record) => `${record.title} ${record.detail}`).join(' ');
  const items = [];
  if (/忘れ|不足|足りない|足りな|買え/.test(text)) items.push('忘れ物・不足を準備へ戻す');
  if (/雨|濡|乾燥|撤収/.test(text)) items.push('雨撤収と乾燥サービスを次回確認');
  if (/暑|熱|冷却|WAVE|扇風機|コタ/.test(text)) items.push('暑さ対策とコタ負担を次回確認');
  if (/料理|量|多すぎ|少ない|余り|味/.test(text)) items.push('料理量・食材量を次回調整');
  if (/設営|撤収|時間|段取り/.test(text)) items.push('設営/撤収時間を次回段取りへ反映');
  return [...new Set(items)].slice(0, 4);
}

function renderProgress(state, key) {
  const map = phaseMap(state, key);
  return `<section class="day-live-progress day-card">
    <div class="day-section-head"><div><span>FLOW</span><strong>今日の進行</strong></div><small>押して現在工程を切替</small></div>
    <div class="day-phase-strip">
      ${PHASES.map((phase) => {
        const item = map[phase.key] || {};
        const active = currentPhase(state) === phase.key;
        return `<button type="button" class="day-phase-pill ${active ? 'active' : ''} ${item.done ? 'done' : ''}" data-phase="${escapeHtml(phase.key)}">
          <span>${escapeHtml(phase.icon)}</span><strong>${escapeHtml(phase.label)}</strong><small>${item.done ? '済' : item.startedAt ? '進行中' : '未'}</small>
        </button>`;
      }).join('')}
    </div>
  </section>`;
}

function renderPhaseControl(state, key) {
  const phase = phaseMeta(currentPhase(state));
  const item = phaseMap(state, key)[phase.key] || {};
  return `<section class="day-current-card day-card">
    <div class="day-current-main"><span>${escapeHtml(phase.icon)} ${escapeHtml(phase.label)}</span><h2>${escapeHtml(phase.hint)}</h2><p>${escapeHtml(item.startedAt ? `${formatTime(item.startedAt)} 開始 / ${elapsedText(item.startedAt, item.endedAt)}` : 'この工程で残した記録だけが、今日のタイムラインへ追記されます。')}</p></div>
    <div class="day-current-actions">
      <button id="startPhase" class="mini-ghost" type="button">開始</button>
      <button id="finishPhase" class="mini-ghost" type="button">完了</button>
      <button id="openWalkRecord" class="mini-ghost" type="button">記録タブ</button>
    </div>
  </section>`;
}

function renderCapture() {
  const phase = phaseMeta(currentPhase());
  return `<section class="day-capture-card day-card">
    <div class="day-section-head"><div><span>CAPTURE</span><strong>現地記録</strong></div><small>削除なし・追記保存</small></div>
    <div class="day-quick-grid">
      <button id="photoDayRecord" type="button"><strong>写真</strong><span>ファイル名保存</span></button>
      <button id="videoDayRecord" type="button"><strong>動画</strong><span>ファイル名保存</span></button>
      <button id="voiceDayRecord" type="button"><strong>音声</strong><span>文字起こし</span></button>
      <button class="quickRecord" data-type="weather" data-title="天気変化" type="button"><strong>天気</strong><span>変化メモ</span></button>
      <button class="quickRecord" data-type="kota" data-title="コタ様子" type="button"><strong>コタ</strong><span>負担・水・足</span></button>
      <button class="quickRecord" data-type="issue" data-title="次回注意" type="button"><strong>注意</strong><span>忘れ物/改善</span></button>
    </div>
    <textarea id="dayRecordMemo" class="field textarea day-record-input" rows="4" placeholder="${escapeHtml(phase.label)}メモ：例）設営35分。風が強くてタープ低め。コタは日陰なら問題なし。"></textarea>
    <div class="day-save-row">
      <select id="dayRecordType" class="field">
        <option value="note">メモ</option><option value="timing">時間</option><option value="weather">天気変化</option><option value="kota">コタ</option><option value="issue">次回注意</option>
      </select>
      <button id="saveDayRecord" class="btn primary" type="button">この工程に追記</button>
    </div>
    <input id="dayPhotoInput" type="file" accept="image/*" hidden />
    <input id="dayVideoInput" type="file" accept="video/*" hidden />
  </section>`;
}

function renderTimeline(records = []) {
  return `<section class="day-timeline-card day-card">
    <div class="day-section-head"><div><span>TIMELINE</span><strong>今日の記録</strong></div><small>${records.length}件</small></div>
    ${records.length ? `<div class="day-timeline-list">${records.slice(0, 20).map(renderRecord).join('')}</div>` : '<p class="empty-line">まだ当日記録はありません。写真・動画・音声・メモをここに追記します。</p>'}
  </section>`;
}

function renderRecord(record) {
  const phase = phaseMeta(record.phase);
  const attachments = safeList(record.attachments);
  return `<article class="day-record-row type-${escapeHtml(record.type || 'note')}">
    <div class="day-record-head"><span>${escapeHtml(phase.icon)} ${escapeHtml(phase.label)}</span><strong>${escapeHtml(recordTypeLabel(record.type))}</strong><time>${escapeHtml(formatTime(record.createdAt))}</time></div>
    <h3>${escapeHtml(record.title || recordTypeLabel(record.type))}</h3>
    ${record.detail ? `<p>${escapeHtml(record.detail)}</p>` : ''}
    ${attachments.length ? `<div class="day-attachments">${attachments.map((file) => `<span>${escapeHtml(file.kind || '')} ${escapeHtml(file.name || 'file')} ${file.size ? `/${Math.round(Number(file.size) / 1024)}KB` : ''}</span>`).join('')}</div>` : ''}
  </article>`;
}

function renderReflection(records = []) {
  const items = summarizeToday(records);
  return `<section class="day-reflect-card day-card">
    <div class="day-section-head"><div><span>NEXT</span><strong>次回へ戻す候補</strong></div><small>自動反映しない</small></div>
    ${items.length ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul><p class="guard-note">AI候補は表示だけ。準備・ギア・料理へ勝手に上書きしません。</p>` : '<p class="empty-line">記録が増えると、次回に戻す候補だけ表示します。</p>'}
  </section>`;
}

function buildRecord({ type = 'note', title = '', detail = '', attachments = [] } = {}) {
  const state = getState();
  const project = state.nextProject || {};
  const key = projectKey(state);
  const phase = currentPhase(state);
  return {
    id: makeId('dayrec'),
    projectId: key,
    projectName: projectName(project),
    projectDate: projectDate(project),
    phase,
    type,
    title: title || recordTypeLabel(type),
    detail: String(detail || '').trim(),
    attachments,
    source: 'day',
    locked: true,
    createdAt: nowIso()
  };
}

function appendDayRecord(partial, message = '当日記録を追記しました') {
  const state = getState();
  const key = projectKey(state);
  const previous = dayRecords(state, key);
  const record = buildRecord(partial);
  if (!record.detail && !record.attachments.length && ['note', 'voice', 'issue', 'weather', 'kota', 'timing'].includes(record.type)) {
    return toast('メモ内容を入力してください');
  }
  patchState({ dayRecords: { ...(state.dayRecords || {}), [key]: [record, ...previous] } });
  toast(message);
  renderDay();
}

function updatePhase(phaseKey, changes) {
  const state = getState();
  const key = projectKey(state);
  const map = phaseMap(state, key);
  patchState({ dayPhaseState: { ...(state.dayPhaseState || {}), [key]: { ...map, [phaseKey]: { ...(map[phaseKey] || {}), ...changes } } } });
}

function saveManualRecord() {
  const detail = document.getElementById('dayRecordMemo')?.value || '';
  const type = document.getElementById('dayRecordType')?.value || 'note';
  appendDayRecord({ type, title: phaseMeta(currentPhase()).label, detail });
}

function handleFile(kind, file) {
  if (!file) return;
  appendDayRecord({
    type: kind === 'video' ? 'video' : 'photo',
    title: kind === 'video' ? '動画' : '写真',
    detail: document.getElementById('dayRecordMemo')?.value || '',
    attachments: [{ kind: kind === 'video' ? '動画' : '写真', name: file.name, size: file.size, type: file.type, capturedAt: nowIso() }]
  }, kind === 'video' ? '動画記録を追記しました' : '写真記録を追記しました');
}

function startVoiceMemo() {
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Rec) {
    const detail = document.getElementById('dayRecordMemo')?.value || '';
    return appendDayRecord({ type: 'voice', title: '音声メモ', detail }, '音声メモとして追記しました');
  }
  try {
    const recognition = new Rec();
    recognition.lang = 'ja-JP';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const text = event.results?.[0]?.[0]?.transcript || '';
      appendDayRecord({ type: 'voice', title: '音声メモ', detail: text }, '音声メモを追記しました');
    };
    recognition.onerror = () => toast('音声認識に失敗しました');
    recognition.start();
    toast('話してください');
  } catch {
    toast('音声認識を開始できませんでした');
  }
}

export function renderDay() {
  const state = getState();
  const project = state.nextProject;
  const c = context(state, project);
  const r = project?.reservation || {};
  const key = projectKey(state);
  const records = dayRecords(state, key);
  const phase = phaseMeta(currentPhase(state));
  app().innerHTML = `<section class="route-page day-operator core08d-day">
    <section class="day-hero-card day-card">
      <div><span>当日記録</span><h2>${escapeHtml(projectName(project))}</h2><p>${escapeHtml(projectDate(project) || c.routeMemo || '写真・動画・音声・メモを、今日の流れに沿って追記します。')}</p></div>
      <button id="goPrepFromDay" class="mini-ghost" type="button">準備を見る</button>
    </section>
    <section class="day-status-grid">
      <div><span>工程</span><strong>${escapeHtml(phase.label)}</strong></div>
      <div><span>記録</span><strong>${records.length}件</strong></div>
      <div><span>IN/OUT</span><strong>${escapeHtml([r.checkIn, r.checkOut].filter(Boolean).join(' / ') || '未設定')}</strong></div>
    </section>
    ${renderProgress(state, key)}
    ${renderPhaseControl(state, key)}
    ${renderCapture()}
    ${renderTimeline(records)}
    ${renderReflection(records)}
    <section class="panel-card tight-card legacy-day-memo"><div class="section-title-row"><strong>当日メモ</strong><small>簡易メモ</small></div><textarea id="dayMemo" class="field textarea compact" placeholder="例：途中コンビニ、設営30分、雨なら濡れ物先">${escapeHtml(state.dayMemo || '')}</textarea><button id="saveDayMemo" class="primary-compact" type="button">保存</button></section>
  </section>`;

  document.getElementById('goPrepFromDay')?.addEventListener('click', () => go('prep'));
  document.getElementById('openWalkRecord')?.addEventListener('click', () => go('walk'));
  document.getElementById('saveDayMemo')?.addEventListener('click', () => { patchState({ dayMemo: document.getElementById('dayMemo')?.value || '' }); toast('当日メモを保存'); });
  document.getElementById('saveDayRecord')?.addEventListener('click', saveManualRecord);
  document.getElementById('photoDayRecord')?.addEventListener('click', () => document.getElementById('dayPhotoInput')?.click());
  document.getElementById('videoDayRecord')?.addEventListener('click', () => document.getElementById('dayVideoInput')?.click());
  document.getElementById('dayPhotoInput')?.addEventListener('change', (event) => handleFile('photo', event.target.files?.[0]));
  document.getElementById('dayVideoInput')?.addEventListener('change', (event) => handleFile('video', event.target.files?.[0]));
  document.getElementById('voiceDayRecord')?.addEventListener('click', startVoiceMemo);
  document.querySelectorAll('[data-phase]').forEach((button) => button.addEventListener('click', () => { patchState({ activeDayPhase: button.dataset.phase || 'arrive' }); renderDay(); }));
  document.getElementById('startPhase')?.addEventListener('click', () => { updatePhase(currentPhase(), { startedAt: nowIso(), done: false }); appendDayRecord({ type: 'timing', title: `${phaseMeta(currentPhase()).label}開始`, detail: '開始' }, '工程開始を記録しました'); });
  document.getElementById('finishPhase')?.addEventListener('click', () => { updatePhase(currentPhase(), { endedAt: nowIso(), done: true }); appendDayRecord({ type: 'timing', title: `${phaseMeta(currentPhase()).label}完了`, detail: '完了' }, '工程完了を記録しました'); });
  document.querySelectorAll('.quickRecord').forEach((button) => button.addEventListener('click', () => {
    const memo = document.getElementById('dayRecordMemo');
    const title = button.dataset.title || recordTypeLabel(button.dataset.type);
    appendDayRecord({ type: button.dataset.type || 'note', title, detail: memo?.value || title });
  }));
}
