import { app, escapeHtml, toast } from '../../ui/components.js?v=core08-d4-day-flow-actual-20260705';
import { getState, patchState } from '../../core/store.js?v=core08-d4-day-flow-actual-20260705';

const FLOW_SECTIONS = [
  { key: 'home', title: '家', sub: '起床・朝食・積み込み・給油・出発' },
  { key: 'route', title: '移動', sub: 'ルート・寄り道・休憩・買い出し' },
  { key: 'arrival', title: '到着', sub: 'キャンプ場到着・受付・サイト移動' },
  { key: 'setup', title: '設営', sub: 'レイアウト・テント・タープ・外回り' },
  { key: 'stay', title: '滞在', sub: '休憩・散歩・探索・夕食・就寝' },
  { key: 'morning', title: '翌朝〜撤収', sub: '朝食・撤収・散歩・昼食・チェックアウト' },
  { key: 'return', title: '帰路〜帰宅', sub: '観光・休憩・帰宅・片付け' }
];

const FLOW_STEPS = [
  { id: 'wake', section: 'home', label: '起床', hint: '事前に決めた起床時間', tags: ['home'] },
  { id: 'homeBreakfast', section: 'home', label: '家で朝食', hint: '家で食べる場合', optional: true, tags: ['meal'] },
  { id: 'loadCar', section: 'home', label: '当日積み込み', hint: '冷蔵品・水・電源・コタ用品', tags: ['gear', 'kota'] },
  { id: 'fuelBefore', section: 'home', label: 'ガソリン', hint: '事前/当日の給油判断', optional: true, tags: ['route'] },
  { id: 'depart', section: 'home', label: '出発', hint: '事前に決めた出発時間', tags: ['route'] },
  { id: 'routeBreakfast', section: 'route', label: '途中で朝食', hint: '途中で食べる場合', optional: true, tags: ['meal', 'route'] },
  { id: 'detour', section: 'route', label: '寄り道', hint: '事前に決めた寄り道', optional: true, tags: ['route'] },
  { id: 'restStop', section: 'route', label: '休憩', hint: '人とコタの休憩', optional: true, tags: ['route', 'kota'] },
  { id: 'shopping', section: 'route', label: '買い出し', hint: 'スーパー・コンビニ・現地調達', optional: true, tags: ['shopping', 'meal'] },
  { id: 'arriveCamp', section: 'arrival', label: 'キャンプ場到着', hint: '駐車場/入口到着', tags: ['route'] },
  { id: 'reception', section: 'arrival', label: '受付', hint: 'チェックイン・説明', tags: ['route'] },
  { id: 'moveSite', section: 'arrival', label: 'サイト移動', hint: 'サイト番号・車位置', tags: ['site'] },
  { id: 'layout', section: 'setup', label: 'レイアウト考察', hint: '風・日陰・入口・コタ動線', tags: ['setup', 'kota', 'weather'] },
  { id: 'tent', section: 'setup', label: 'テント設営', hint: 'テント本体・ペグ・張り綱', tags: ['setup', 'gear'] },
  { id: 'tarp', section: 'setup', label: 'タープ設営', hint: 'タープ下・雨/日差し対策', optional: true, tags: ['setup', 'gear', 'weather'] },
  { id: 'innerTent', section: 'setup', label: 'テント内', hint: '寝床・照明・電源・コタ場所', tags: ['setup', 'gear', 'kota'] },
  { id: 'underTarp', section: 'setup', label: 'タープ下', hint: 'IGT・椅子・料理導線', tags: ['setup', 'meal', 'gear'] },
  { id: 'outsideArea', section: 'setup', label: '外回り', hint: 'ストーブ/焚火/荷物/濡れ物置き', tags: ['setup', 'gear'] },
  { id: 'breakDuringSetup', section: 'setup', label: '設営中の休憩', hint: '暑さ・水分・コタ負担', optional: true, tags: ['kota', 'weather'] },
  { id: 'setupDone', section: 'setup', label: '設営完了', hint: '完成写真・反省点', tags: ['setup', 'photo'] },
  { id: 'walkAfterSetup', section: 'stay', label: '散歩', hint: 'コタ散歩・場内散歩', optional: true, tags: ['walk', 'kota'] },
  { id: 'sightseeing', section: 'stay', label: '観光', hint: '外出・周辺スポット', optional: true, tags: ['route'] },
  { id: 'exploreCamp', section: 'stay', label: 'キャンプ場探索', hint: 'トイレ・炊事場・売店・景色', optional: true, tags: ['walk', 'site'] },
  { id: 'dinner', section: 'stay', label: '夕食', hint: '予定料理・実際の量・味', tags: ['meal'] },
  { id: 'nightCleanup', section: 'stay', label: '片付け', hint: '食器・ゴミ・翌朝準備', tags: ['meal', 'gear'] },
  { id: 'sleep', section: 'stay', label: '寝る', hint: '寒さ・暑さ・騒音・寝具', tags: ['weather', 'gear', 'kota'] },
  { id: 'morningWake', section: 'morning', label: '起きる', hint: '朝の気温・結露・コタ状態', tags: ['weather', 'kota'] },
  { id: 'breakfast', section: 'morning', label: '朝食', hint: '朝食量・片付けやすさ', tags: ['meal'] },
  { id: 'teardownStart', section: 'morning', label: '撤収開始', hint: '濡れ物・乾燥・順番', tags: ['teardown', 'weather'] },
  { id: 'teardownTent', section: 'morning', label: 'テント撤去', hint: '寝具・テント内・幕乾燥', tags: ['teardown', 'gear'] },
  { id: 'teardownTarp', section: 'morning', label: 'タープ撤去', hint: 'タープ下・外回り', optional: true, tags: ['teardown', 'gear'] },
  { id: 'packCar', section: 'morning', label: '積み込み', hint: '車載順・濡れ物・忘れ物', tags: ['teardown', 'gear'] },
  { id: 'morningWalk', section: 'morning', label: '撤収日の散歩', hint: '時間があればコタ散歩', optional: true, tags: ['walk', 'kota'] },
  { id: 'lateLunch', section: 'morning', label: '昼食', hint: 'レイトチェックアウト時', optional: true, tags: ['meal'] },
  { id: 'checkout', section: 'morning', label: 'チェックアウト', hint: '受付・ゴミ・最終確認', tags: ['route', 'teardown'] },
  { id: 'returnSightseeing', section: 'return', label: '帰りの観光', hint: '寄り道・温泉・買い物', optional: true, tags: ['route'] },
  { id: 'returnRest', section: 'return', label: '帰りの休憩', hint: 'SA/PA・コタ休憩', optional: true, tags: ['route', 'kota'] },
  { id: 'arriveHome', section: 'return', label: '帰宅', hint: '到着時間・疲労感', tags: ['route'] },
  { id: 'homeCleanup', section: 'return', label: '帰宅後片付け', hint: '干す・洗う・充電・補充', tags: ['gear', 'next'] }
];

const CAPTURE_MODES = {
  now: { label: '今すぐ', sub: '今この工程に残す' },
  later: { label: 'あとで登録', sub: '押し忘れを戻す' },
  before: { label: '事前メモ', sub: 'あとで拾う予定' },
  rough: { label: '何となく', sub: '未確定で仮置き' }
};

const RECORD_TYPES = { note: 'メモ', photo: '写真', video: '動画', voice: '音声' };

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
function dayFlowState(state = getState(), key = projectKey(state)) { return safeObject(state.dayFlowState?.[key]); }
function dayGpsHints(state = getState(), key = projectKey(state)) { return safeList(state.dayGpsHints?.[key]); }
function captureMode(state = getState()) { return CAPTURE_MODES[state.dayCaptureMode] ? state.dayCaptureMode : 'now'; }
function stepById(id) { return FLOW_STEPS.find((step) => step.id === id) || FLOW_STEPS[0]; }
function sectionMeta(key) { return FLOW_SECTIONS.find((section) => section.key === key) || FLOW_SECTIONS[0]; }
function formatTime(value) {
  if (!value) return '';
  try { return new Date(value).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return String(value); }
}
function timeOnly(value) {
  if (!value) return '';
  try { return new Date(value).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }); }
  catch { return String(value); }
}
function toLocalDatetimeValue(value = nowIso()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function fromLocalDatetimeValue(value) { return value ? new Date(value).toISOString() : nowIso(); }
function elapsedText(value) {
  if (!value) return '未開始';
  const diff = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (diff < 60) return `${diff}分経過`;
  return `${Math.floor(diff / 60)}時間${diff % 60}分`;
}
function parseTimeMinutes(text = '') {
  const m = String(text || '').match(/(\d{1,2})[:：](\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}
function findTimeNear(label, text = '') {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`${escaped}[^0-9]{0,12}(\\d{1,2})[:：](\\d{2})`);
  const m = String(text || '').match(re);
  return m ? `${String(m[1]).padStart(2, '0')}:${m[2]}` : '';
}
function plannedTime(step, state) {
  const project = state.nextProject || {};
  const reservation = project.reservation || {};
  const c = context(state, project);
  const routeText = `${c.routeMemo || ''}\n${reservation.memo || ''}\n${project.memo || ''}`;
  if (step.id === 'depart') return findTimeNear('出発', routeText) || c.departureTime || '';
  if (step.id === 'wake') return findTimeNear('起床', routeText) || '';
  if (step.id === 'shopping') return findTimeNear('買', routeText) || findTimeNear('スーパー', routeText) || '';
  if (step.id === 'arriveCamp') return findTimeNear('到着', routeText) || '';
  if (step.id === 'reception') return reservation.checkIn || findTimeNear('チェックイン', routeText) || '';
  if (step.id === 'checkout') return reservation.checkOut || findTimeNear('チェックアウト', routeText) || '';
  if (step.id === 'dinner') return findTimeNear('夕食', c.menuMemo || '') || findTimeNear('夜', c.menuMemo || '') || '';
  if (step.id === 'breakfast') return findTimeNear('朝食', c.menuMemo || '') || '';
  return '';
}
function driftText(step, actualIso, state) {
  const plan = plannedTime(step, state);
  const planMin = parseTimeMinutes(plan);
  if (!planMin || !actualIso) return '';
  const actual = new Date(actualIso);
  if (Number.isNaN(actual.getTime())) return '';
  const actualMin = actual.getHours() * 60 + actual.getMinutes();
  const diff = actualMin - planMin;
  if (Math.abs(diff) < 3) return 'ほぼ予定通り';
  return diff > 0 ? `${diff}分遅れ` : `${Math.abs(diff)}分早い`;
}
function latestGpsFromWalkSession(state) {
  const points = safeList(state.walkSession?.gpsPoints);
  const point = points[points.length - 1];
  if (!point) return null;
  return { ...point, source: 'activeRecord', capturedAt: point.at || point.createdAt || nowIso() };
}
function latestGpsHint(state = getState()) {
  const key = projectKey(state);
  const manual = dayGpsHints(state, key)[0] || null;
  const walk = latestGpsFromWalkSession(state);
  if (manual && walk) return new Date(manual.capturedAt || manual.createdAt || 0) >= new Date(walk.capturedAt || 0) ? manual : walk;
  return manual || walk || null;
}
function gpsSpeedKmh(gps) {
  if (gps?.speedKmh !== undefined) return Number(gps.speedKmh) || 0;
  if (gps?.speed !== undefined && gps.speed !== null) return Math.max(0, Number(gps.speed) * 3.6);
  return null;
}
function gpsLabel(gps) {
  if (!gps) return 'GPS未取得';
  const speed = gpsSpeedKmh(gps);
  const speedText = speed === null ? '' : ` / 約${speed.toFixed(1)}km/h`;
  const accuracyText = gps.accuracy ? ` / 精度${Math.round(gps.accuracy)}m` : '';
  return `${gps.lat?.toFixed ? gps.lat.toFixed(5) : gps.lat}, ${gps.lng?.toFixed ? gps.lng.toFixed(5) : gps.lng}${speedText}${accuracyText}`;
}
function nextIncompleteStep(flowState) {
  return FLOW_STEPS.find((step) => !flowState[step.id]?.doneAt && !flowState[step.id]?.skipped) || FLOW_STEPS[0];
}
function stepProgress(flowState) {
  const done = FLOW_STEPS.filter((step) => flowState[step.id]?.doneAt).length;
  return { done, total: FLOW_STEPS.length, percent: Math.round((done / FLOW_STEPS.length) * 100) };
}
function suggestStep(state) {
  const flowState = dayFlowState(state);
  const selected = state.activeDayFlowStep;
  if (selected && FLOW_STEPS.some((step) => step.id === selected)) return selected;
  const gps = latestGpsHint(state);
  const speed = gpsSpeedKmh(gps);
  if (speed !== null && speed >= 15) return flowState.arriveCamp?.doneAt ? 'returnRest' : 'depart';
  if (speed !== null && speed > 1.5 && speed < 8) return flowState.setupDone?.doneAt ? 'walkAfterSetup' : 'moveSite';
  const hour = new Date().getHours();
  if (hour < 7) return 'wake';
  if (hour < 10 && !flowState.depart?.doneAt) return 'depart';
  if (hour < 13 && !flowState.arriveCamp?.doneAt) return 'shopping';
  if (!flowState.setupDone?.doneAt && flowState.arriveCamp?.doneAt) return 'layout';
  if (hour >= 16 && hour < 21 && !flowState.dinner?.doneAt) return 'dinner';
  return nextIncompleteStep(flowState).id;
}
function selectedStep(state = getState()) { return stepById(suggestStep(state)); }
function contextSnapshot(state, step) {
  const project = state.nextProject || {};
  const c = context(state, project);
  const gps = latestGpsHint(state);
  const flowState = dayFlowState(state);
  return {
    projectKey: projectKey(state),
    projectName: projectName(project),
    projectDate: projectDate(project),
    flowStepId: step.id,
    flowStepLabel: step.label,
    section: step.section,
    plannedTime: plannedTime(step, state),
    actualStart: flowState[step.id]?.actualStart || '',
    actualDone: flowState[step.id]?.doneAt || '',
    drift: driftText(step, flowState[step.id]?.actualStart || flowState[step.id]?.doneAt, state),
    captureAt: nowIso(),
    gps,
    weatherMemo: c.weatherDecisionMemo || c.weatherMemo || '',
    routeMemo: c.routeMemo || '',
    menuMemo: c.menuMemo || c.fixedDishMemo || '',
    gearMemo: c.gearMemo || '',
    kotaMemo: c.kotaMemo || ''
  };
}
function inferCandidates(record, state) {
  const snapshot = record.contextSnapshot || {};
  const text = `${record.title || ''} ${record.detail || ''} ${snapshot.flowStepLabel || ''} ${snapshot.weatherMemo || ''} ${snapshot.menuMemo || ''} ${snapshot.gearMemo || ''} ${snapshot.kotaMemo || ''}`;
  const out = [];
  const add = (tag, label, reason, source = 'flow') => { if (!out.some((item) => item.tag === tag && item.reason === reason)) out.push({ tag, label, reason, source }); };
  const step = stepById(record.flowStepId || snapshot.flowStepId);
  safeList(step.tags).forEach((tag) => add(tag, `${tag}連携候補`, `${step.label}工程に紐づく`, 'flow'));
  if (/コタ|犬|散歩|暑|水|日陰|足|肉球/.test(text)) add('kota', 'コタ連携候補', 'コタ・暑さ・散歩に関係する言葉', 'text');
  if (/料理|朝食|昼食|夕食|飯|食材|味|量|多すぎ|少ない|余り|エビ|肉|ピザ/.test(text)) add('meal', '料理連携候補', '料理・量・食材に関係する言葉', 'text');
  if (/設営|テント|タープ|ペグ|ロープ|張|レイアウト/.test(text)) add('setup', '設営連携候補', '設営・レイアウトに関係する言葉', 'text');
  if (/撤収|片付|収納|濡|乾燥|ゴミ|忘れ物/.test(text)) add('teardown', '撤収連携候補', '撤収・片付け・濡れ物に関係する言葉', 'text');
  if (/買|スーパー|コンビニ|不足|足りない|現地調達/.test(text)) add('shopping', '買い出し連携候補', '買い出し・不足に関係する言葉', 'text');
  if (/次回|改善|後悔|不要|失敗|注意/.test(text)) add('next', '次回注意候補', '次回改善に関係する言葉', 'text');
  const speed = gpsSpeedKmh(snapshot.gps || latestGpsHint(state));
  if (speed !== null && speed >= 15) add('route', '移動中候補', 'GPS速度が車移動に近い', 'gps');
  if (speed !== null && speed > 1.5 && speed < 8) add('walk', '散歩/場内移動候補', 'GPS速度が徒歩移動に近い', 'gps');
  if (record.captureMode === 'later') add('later', '押し忘れ補完候補', 'あとで登録として保存', 'mode');
  if (record.captureMode === 'before') add('before', '事前メモ候補', '事前に当日へ置いたメモ', 'mode');
  return out.slice(0, 6);
}
function summarize(records = []) {
  const items = [];
  const text = records.map((record) => `${record.title || ''} ${record.detail || ''}`).join(' ');
  if (/遅れ|ズレ|遅く|早く/.test(text) || records.some((record) => record.contextSnapshot?.drift)) items.push('予定時間と実際時間のズレを次回計画へ戻す候補');
  if (/忘れ|不足|足りない|買え/.test(text)) items.push('忘れ物・不足を準備リストへ戻す候補');
  if (/雨|濡|乾燥|撤収/.test(text)) items.push('雨撤収・乾燥・積み込み順の改善候補');
  if (/暑|熱|コタ|犬|水|日陰/.test(text)) items.push('コタの暑さ/休憩/水分計画の改善候補');
  if (/料理|食材|量|多すぎ|少ない|余り/.test(text)) items.push('料理量・買い物量の調整候補');
  return [...new Set(items)].slice(0, 5);
}

function renderHero(state, project, records, flowState, step) {
  const progress = stepProgress(flowState);
  const gps = latestGpsHint(state);
  const stepState = flowState[step.id] || {};
  const plan = plannedTime(step, state);
  const drift = driftText(step, stepState.actualStart || stepState.doneAt, state);
  return `<section class="d4-hero">
    <div class="d4-hero-top"><span>当日フロー</span><strong>${escapeHtml(projectName(project))}</strong><small>${escapeHtml(projectDate(project) || '予定日未設定')}</small></div>
    <div class="d4-now-box">
      <p>今ここ候補</p><h2>${escapeHtml(step.label)}</h2><span>${escapeHtml(step.hint)}</span>
      <div class="d4-now-meta"><em>予定 ${escapeHtml(plan || '未設定')}</em><em>実績 ${escapeHtml(timeOnly(stepState.actualStart || stepState.doneAt) || '未登録')}</em>${drift ? `<em class="drift">${escapeHtml(drift)}</em>` : ''}</div>
    </div>
    <div class="d4-hero-stats"><span>進行 ${progress.done}/${progress.total}</span><span>記録 ${records.length}件</span><span>${escapeHtml(gpsLabel(gps))}</span></div>
  </section>`;
}
function renderSelectedStep(state, step, flowState) {
  const stepState = flowState[step.id] || {};
  return `<section class="d4-selected-step">
    <div><span>${escapeHtml(sectionMeta(step.section).title)}</span><h3>${escapeHtml(step.label)}</h3><p>${escapeHtml(step.hint)}</p></div>
    <div class="d4-step-actions">
      <button class="d4-action" data-step-start="${escapeHtml(step.id)}">今やった</button>
      <button class="d4-action primary" data-step-done="${escapeHtml(step.id)}">完了</button>
      <button class="d4-action" data-mode-set="later">あとで</button>
    </div>
    <details class="d4-actual-box"><summary>予定/実績時間を調整する</summary>
      <label><span>実際時間</span><input id="actualTimeInput" class="field" type="datetime-local" value="${escapeHtml(toLocalDatetimeValue(stepState.actualStart || stepState.doneAt || nowIso()))}" /></label>
      <div class="d4-save-line"><button id="saveActualStart" class="btn">実績に入れる</button><button id="saveActualDone" class="btn primary">完了時間に入れる</button></div>
      <p>予定時間とズレてもOK。あとから戻して入れる前提。</p>
    </details>
  </section>`;
}
function renderModeTabs(mode) {
  return `<div class="d4-mode-tabs">${Object.entries(CAPTURE_MODES).map(([key, meta]) => `<button class="d4-mode-tab ${key === mode ? 'active' : ''}" data-mode-set="${escapeHtml(key)}"><strong>${escapeHtml(meta.label)}</strong><small>${escapeHtml(meta.sub)}</small></button>`).join('')}</div>`;
}
function renderCapture(state, step) {
  const mode = captureMode(state);
  return `<section class="d4-capture">
    <div class="d4-section-head"><strong>この工程に残す</strong><span>${escapeHtml(CAPTURE_MODES[mode].label)} / ${escapeHtml(step.label)}</span></div>
    <div class="d4-big-buttons">
      <button class="d4-capture-btn" data-record-type="photo"><strong>写真</strong><small>撮った/選んだ写真</small></button>
      <button class="d4-capture-btn" data-record-type="note"><strong>メモ</strong><small>一言だけ</small></button>
      <button class="d4-capture-btn" data-record-type="voice"><strong>音声</strong><small>話して残す</small></button>
      <button class="d4-capture-btn" data-record-type="video"><strong>動画</strong><small>動画メモ</small></button>
    </div>
    ${renderModeTabs(mode)}
    <textarea id="dayRecordMemo" class="field textarea" placeholder="例：さっき設営完了。ペグ足りなかった / コタ暑そう / エビ多かった"></textarea>
    <div class="d4-save-line"><input id="photoInput" type="file" accept="image/*" hidden /><input id="videoInput" type="file" accept="video/*" hidden /><button id="saveNoteRecord" class="btn primary">メモを保存</button><button id="gpsSuggest" class="btn">GPSで今ここ候補</button></div>
  </section>`;
}
function renderFlow(state, flowState, selectedId) {
  return `<section class="d4-flow"><div class="d4-section-head"><strong>キャンプ当日の流れ</strong><span>予定と実際のズレを見る</span></div>
    ${FLOW_SECTIONS.map((section) => {
      const steps = FLOW_STEPS.filter((step) => step.section === section.key);
      return `<details class="d4-flow-section" ${steps.some((step) => step.id === selectedId) ? 'open' : ''}>
        <summary><strong>${escapeHtml(section.title)}</strong><span>${escapeHtml(section.sub)}</span></summary>
        <div class="d4-step-list">${steps.map((step) => renderFlowStep(state, step, flowState, selectedId)).join('')}</div>
      </details>`;
    }).join('')}
  </section>`;
}
function renderFlowStep(state, step, flowState, selectedId) {
  const item = flowState[step.id] || {};
  const plan = plannedTime(step, state);
  const actual = item.actualStart || item.doneAt;
  const drift = driftText(step, actual, state);
  const cls = [selectedId === step.id ? 'active' : '', item.doneAt ? 'done' : '', step.optional ? 'optional' : ''].filter(Boolean).join(' ');
  return `<button class="d4-flow-step ${cls}" data-select-step="${escapeHtml(step.id)}">
    <span>${item.doneAt ? '済' : step.optional ? '任意' : '・'}</span>
    <strong>${escapeHtml(step.label)}</strong>
    <small>予定 ${escapeHtml(plan || '--:--')} / 実際 ${escapeHtml(timeOnly(actual) || '--:--')}${drift ? ` / ${escapeHtml(drift)}` : ''}</small>
  </button>`;
}
function renderTimeline(records, flowState) {
  const summary = summarize(records);
  return `<section class="d4-timeline"><div class="d4-section-head"><strong>今日の記録</strong><span>${records.length}件</span></div>
    ${summary.length ? `<div class="d4-feedback">${summary.map((item) => `<span>${escapeHtml(item)}</span>`).join('')}</div>` : ''}
    ${records.length ? records.slice(0, 18).map((record) => renderRecord(record, flowState)).join('') : '<p class="empty-line">まだ記録はありません。押し忘れても「あとで登録」で戻せます。</p>'}
  </section>`;
}
function renderRecord(record, flowState) {
  const step = stepById(record.flowStepId || record.contextSnapshot?.flowStepId);
  const candidates = safeList(record.inferenceCandidates);
  return `<article class="d4-record">
    <div class="d4-record-top"><strong>${escapeHtml(record.title || RECORD_TYPES[record.type] || '記録')}</strong><time>${escapeHtml(formatTime(record.createdAt))}</time></div>
    <p>${escapeHtml(record.detail || '')}</p>
    <div class="d4-record-meta"><span>${escapeHtml(step.label)}</span><span>${escapeHtml(CAPTURE_MODES[record.captureMode]?.label || '今すぐ')}</span>${record.contextSnapshot?.drift ? `<span>${escapeHtml(record.contextSnapshot.drift)}</span>` : ''}</div>
    ${candidates.length ? `<div class="d4-candidates">${candidates.map((item) => `<em>${escapeHtml(item.label)}</em>`).join('')}</div>` : ''}
  </article>`;
}

function getFlowPatch(state, updater) {
  const key = projectKey(state);
  const all = safeObject(state.dayFlowState);
  const current = safeObject(all[key]);
  return { dayFlowState: { ...all, [key]: updater(current) } };
}
function selectStep(stepId) {
  patchState({ activeDayFlowStep: stepId });
  renderDay();
}
function setMode(mode) {
  patchState({ dayCaptureMode: CAPTURE_MODES[mode] ? mode : 'now' });
  renderDay();
}
function markStep(stepId, field, at = nowIso()) {
  const state = getState();
  patchState(getFlowPatch(state, (flow) => ({ ...flow, [stepId]: { ...(flow[stepId] || {}), actualStart: field === 'actualStart' ? at : ((flow[stepId] || {}).actualStart || at), [field]: at, updatedAt: nowIso() } }))); 
  toast(field === 'doneAt' ? '完了時間を保存' : '実績時間を保存');
  renderDay();
}
function appendRecord(type, detail = '') {
  const state = getState();
  const key = projectKey(state);
  const step = selectedStep(state);
  const mode = captureMode(state);
  const snapshot = contextSnapshot(state, step);
  const title = `${RECORD_TYPES[type] || '記録'}：${step.label}`;
  const record = {
    id: makeId('dayrec'),
    record_id: makeId('dayrec'),
    type,
    title,
    detail: detail || document.getElementById('dayRecordMemo')?.value?.trim() || '',
    captureMode: mode,
    flowStepId: step.id,
    flowStepLabel: step.label,
    createdAt: nowIso(),
    contextSnapshot: snapshot
  };
  record.inferenceCandidates = inferCandidates(record, state);
  const current = dayRecords(state, key);
  patchState({ dayRecords: { ...(state.dayRecords || {}), [key]: [record, ...current] } });
  toast('当日記録を保存');
  renderDay();
}
function saveGpsHint() {
  if (!navigator.geolocation) return toast('この端末はGPS未対応です');
  navigator.geolocation.getCurrentPosition((pos) => {
    const state = getState();
    const key = projectKey(state);
    const hint = {
      id: makeId('gps'),
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      speed: pos.coords.speed,
      capturedAt: nowIso(),
      source: 'day-flow'
    };
    patchState({ dayGpsHints: { ...(state.dayGpsHints || {}), [key]: [hint, ...dayGpsHints(state, key)].slice(0, 20) } });
    toast('GPSを保存。候補を更新');
    renderDay();
  }, () => toast('GPSを取得できませんでした'), { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
}

export function renderDay() {
  const state = getState();
  const project = state.nextProject || {};
  const key = projectKey(state);
  const records = dayRecords(state, key);
  const flowState = dayFlowState(state, key);
  const step = selectedStep(state);
  app().innerHTML = `<section class="route-page d4-day-flow-page">
    ${renderHero(state, project, records, flowState, step)}
    ${renderSelectedStep(state, step, flowState)}
    ${renderCapture(state, step)}
    ${renderFlow(state, flowState, step.id)}
    ${renderTimeline(records, flowState)}
  </section>`;
  document.querySelectorAll('[data-select-step]').forEach((button) => button.addEventListener('click', () => selectStep(button.dataset.selectStep)));
  document.querySelectorAll('[data-mode-set]').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.modeSet)));
  document.querySelectorAll('[data-step-start]').forEach((button) => button.addEventListener('click', () => markStep(button.dataset.stepStart, 'actualStart')));
  document.querySelectorAll('[data-step-done]').forEach((button) => button.addEventListener('click', () => markStep(button.dataset.stepDone, 'doneAt')));
  document.getElementById('saveActualStart')?.addEventListener('click', () => markStep(step.id, 'actualStart', fromLocalDatetimeValue(document.getElementById('actualTimeInput')?.value)));
  document.getElementById('saveActualDone')?.addEventListener('click', () => markStep(step.id, 'doneAt', fromLocalDatetimeValue(document.getElementById('actualTimeInput')?.value)));
  document.getElementById('saveNoteRecord')?.addEventListener('click', () => appendRecord('note'));
  document.getElementById('gpsSuggest')?.addEventListener('click', saveGpsHint);
  document.querySelectorAll('[data-record-type]').forEach((button) => button.addEventListener('click', () => {
    const type = button.dataset.recordType;
    if (type === 'photo') return document.getElementById('photoInput')?.click();
    if (type === 'video') return document.getElementById('videoInput')?.click();
    appendRecord(type);
  }));
  document.getElementById('photoInput')?.addEventListener('change', (event) => appendRecord('photo', event.target.files?.[0]?.name || '写真を追加'));
  document.getElementById('videoInput')?.addEventListener('change', (event) => appendRecord('video', event.target.files?.[0]?.name || '動画を追加'));
}
