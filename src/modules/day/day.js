import { app, escapeHtml, toast } from '../../ui/components.js?v=core08-d5-day-now-navi-20260705';
import { getState, patchState } from '../../core/store.js?v=core08-d5-day-now-navi-20260705';

const FLOW_SECTIONS = [
  { key: 'home', title: '家', sub: '起床・朝食・積み込み・給油・出発' },
  { key: 'route', title: '移動', sub: '寄り道・休憩・買い出し・ルート' },
  { key: 'arrival', title: '到着', sub: '到着・受付・サイト移動' },
  { key: 'setup', title: '設営', sub: 'レイアウト・テント・タープ・外回り' },
  { key: 'stay', title: '滞在', sub: '散歩・探索・夕食・片付け・就寝' },
  { key: 'morning', title: '撤収', sub: '朝食・撤収・昼食・チェックアウト' },
  { key: 'return', title: '帰宅', sub: '帰り道・帰宅・片付け' }
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

const RECORD_TYPES = { note: 'メモ', photo: '写真', video: '動画', voice: '音声' };
const CAPTURE_MODES = { now: '今すぐ', later: 'あとで', before: '事前', rough: '何となく' };

function nowIso() { return new Date().toISOString(); }
function makeId(prefix = 'dayrec') { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
function safeList(value) { return Array.isArray(value) ? value : []; }
function safeObject(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
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
function parseTimeMinutes(text = '') {
  const m = String(text || '').match(/(\d{1,2})[:：](\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}
function findTimeNear(label, text = '') {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`${escaped}[^0-9]{0,16}(\\d{1,2})[:：](\\d{2})`);
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
  if (planMin === null || !actualIso) return '';
  const actual = new Date(actualIso);
  if (Number.isNaN(actual.getTime())) return '';
  const actualMin = actual.getHours() * 60 + actual.getMinutes();
  const diff = actualMin - planMin;
  if (Math.abs(diff) < 3) return 'ほぼ予定通り';
  return diff > 0 ? `+${diff}分` : `-${Math.abs(diff)}分`;
}
function latestGpsFromWalkSession(state) {
  const points = safeList(state.walkSession?.gpsPoints);
  const point = points[points.length - 1];
  return point ? { ...point, source: 'activeRecord' } : null;
}
function latestGpsHint(state) {
  const key = projectKey(state);
  return latestGpsFromWalkSession(state) || dayGpsHints(state, key)[0] || null;
}
function gpsSpeedKmh(gps) {
  if (!gps || gps.speed === null || gps.speed === undefined) return null;
  const speed = Number(gps.speed);
  return Number.isFinite(speed) ? Math.max(0, speed * 3.6) : null;
}
function gpsLabel(gps) {
  if (!gps) return 'GPSなし';
  const speed = gpsSpeedKmh(gps);
  if (speed === null) return 'GPS保存済み';
  if (speed >= 15) return `車移動っぽい ${speed.toFixed(0)}km/h`;
  if (speed > 1.5) return `歩きっぽい ${speed.toFixed(1)}km/h`;
  return '滞在中っぽい';
}
function nextIncompleteStep(flowState) { return FLOW_STEPS.find((step) => !step.optional && !flowState[step.id]?.doneAt) || FLOW_STEPS.find((step) => !flowState[step.id]?.doneAt) || FLOW_STEPS[FLOW_STEPS.length - 1]; }
function nextStepsAfter(step, flowState, count = 3) {
  const index = FLOW_STEPS.findIndex((item) => item.id === step.id);
  return FLOW_STEPS.slice(Math.max(0, index + 1)).filter((item) => !flowState[item.id]?.doneAt).slice(0, count);
}
function suggestStep(state) {
  const flowState = dayFlowState(state);
  if (state.activeDayFlowStep && FLOW_STEPS.some((step) => step.id === state.activeDayFlowStep)) return stepById(state.activeDayFlowStep);
  const gps = latestGpsHint(state);
  const speed = gpsSpeedKmh(gps);
  if (speed !== null && speed >= 15) return flowState.arriveCamp?.doneAt ? stepById('returnRest') : stepById('depart');
  if (speed !== null && speed > 1.5 && speed < 8) return flowState.setupDone?.doneAt ? stepById('walkAfterSetup') : stepById('moveSite');
  const hour = new Date().getHours();
  if (hour < 7) return stepById('wake');
  if (hour < 10 && !flowState.depart?.doneAt) return stepById('depart');
  if (hour < 13 && !flowState.arriveCamp?.doneAt) return stepById('shopping');
  if (flowState.arriveCamp?.doneAt && !flowState.setupDone?.doneAt) return stepById('layout');
  if (hour >= 16 && hour < 21 && !flowState.dinner?.doneAt) return stepById('dinner');
  return nextIncompleteStep(flowState);
}
function progress(flowState) {
  const keySteps = ['wake', 'depart', 'arriveCamp', 'reception', 'setupDone', 'dinner', 'sleep', 'teardownStart', 'checkout', 'arriveHome', 'homeCleanup'];
  const done = keySteps.filter((id) => flowState[id]?.doneAt).length;
  return { done, total: keySteps.length, pct: Math.round((done / keySteps.length) * 100) };
}
function getFlowPatch(state, updater) {
  const key = projectKey(state);
  const all = safeObject(state.dayFlowState);
  const current = safeObject(all[key]);
  return { dayFlowState: { ...all, [key]: updater(current) } };
}
function markStep(stepId, field, at = nowIso()) {
  const state = getState();
  patchState(getFlowPatch(state, (flow) => ({ ...flow, [stepId]: { ...(flow[stepId] || {}), actualStart: field === 'actualStart' ? at : ((flow[stepId] || {}).actualStart || at), [field]: at, updatedAt: nowIso() } }))); 
  toast(field === 'doneAt' ? '完了を保存' : '開始を保存');
  renderDay();
}
function contextSnapshot(state, step) {
  const project = state.nextProject || {};
  const c = context(state, project);
  const gps = latestGpsHint(state);
  const flowState = dayFlowState(state);
  return {
    projectKey: projectKey(state), projectName: projectName(project), projectDate: projectDate(project),
    flowStepId: step.id, flowStepLabel: step.label, section: step.section,
    plannedTime: plannedTime(step, state), actualStart: flowState[step.id]?.actualStart || '', actualDone: flowState[step.id]?.doneAt || '',
    drift: driftText(step, flowState[step.id]?.actualStart || flowState[step.id]?.doneAt, state),
    captureAt: nowIso(), gps, weatherMemo: c.weatherDecisionMemo || c.weatherMemo || '', routeMemo: c.routeMemo || '',
    menuMemo: c.menuMemo || c.fixedDishMemo || '', gearMemo: c.gearMemo || '', kotaMemo: c.kotaMemo || ''
  };
}
function inferCandidates(record, state) {
  const snapshot = record.contextSnapshot || {};
  const step = stepById(record.flowStepId || snapshot.flowStepId);
  const text = `${record.title || ''} ${record.detail || ''} ${snapshot.flowStepLabel || ''} ${snapshot.weatherMemo || ''} ${snapshot.menuMemo || ''} ${snapshot.gearMemo || ''} ${snapshot.kotaMemo || ''}`;
  const out = [];
  const add = (tag, label, reason, source = 'flow') => { if (!out.some((item) => item.tag === tag && item.reason === reason)) out.push({ tag, label, reason, source }); };
  safeList(step.tags).forEach((tag) => add(tag, `${tag}候補`, `${step.label}に近い`, 'flow'));
  if (/コタ|犬|散歩|暑|水|日陰|足|肉球/.test(text)) add('kota', 'コタ候補', 'コタ・暑さ・散歩に関係', 'text');
  if (/料理|朝食|昼食|夕食|飯|食材|味|量|多すぎ|少ない|余り|エビ|肉|ピザ/.test(text)) add('meal', '料理候補', '料理・量・食材に関係', 'text');
  if (/設営|テント|タープ|ペグ|ロープ|張|レイアウト/.test(text)) add('setup', '設営候補', '設営・レイアウトに関係', 'text');
  if (/撤収|片付|収納|濡|乾燥|ゴミ|忘れ物/.test(text)) add('teardown', '撤収候補', '撤収・片付けに関係', 'text');
  if (/買|スーパー|コンビニ|不足|足りない|現地調達/.test(text)) add('shopping', '買い出し候補', '買い出し・不足に関係', 'text');
  if (/次回|改善|後悔|不要|失敗|注意/.test(text)) add('next', '次回注意候補', '次回改善に関係', 'text');
  const speed = gpsSpeedKmh(snapshot.gps || latestGpsHint(state));
  if (speed !== null && speed >= 15) add('route', '移動中候補', 'GPS速度が車移動に近い', 'gps');
  if (speed !== null && speed > 1.5 && speed < 8) add('walk', '散歩/場内移動候補', 'GPS速度が徒歩移動に近い', 'gps');
  return out.slice(0, 5);
}
function appendRecord(type, detail = '', mode = null) {
  const state = getState();
  const key = projectKey(state);
  const step = suggestStep(state);
  const selectedMode = mode || state.dayCaptureMode || 'now';
  const memo = detail || document.getElementById('dayQuickMemo')?.value?.trim() || '';
  if (type === 'note' && !memo) return toast('メモを入力してください');
  const record = {
    id: makeId('dayrec'), record_id: makeId('dayrec'), type,
    title: `${RECORD_TYPES[type] || '記録'}：${step.label}`,
    detail: memo,
    captureMode: selectedMode,
    flowStepId: step.id,
    flowStepLabel: step.label,
    createdAt: nowIso(),
    contextSnapshot: contextSnapshot(state, step)
  };
  record.inferenceCandidates = inferCandidates(record, state);
  patchState({ dayRecords: { ...(state.dayRecords || {}), [key]: [record, ...dayRecords(state, key)] } });
  toast('あとで整理する箱に保存');
  renderDay();
}
function saveGpsHint() {
  if (!navigator.geolocation) return toast('この端末はGPS未対応です');
  navigator.geolocation.getCurrentPosition((pos) => {
    const state = getState();
    const key = projectKey(state);
    const hint = { id: makeId('gps'), lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, speed: pos.coords.speed, capturedAt: nowIso(), source: 'day-navi' };
    patchState({ dayGpsHints: { ...(state.dayGpsHints || {}), [key]: [hint, ...dayGpsHints(state, key)].slice(0, 20) } });
    toast('GPSを保存。今ここ候補を更新');
    renderDay();
  }, () => toast('GPSを取得できませんでした'), { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
}

function renderNowCard(state, project, records, flowState, step) {
  const item = flowState[step.id] || {};
  const section = sectionMeta(step.section);
  const plan = plannedTime(step, state);
  const actual = item.actualStart || item.doneAt;
  const drift = driftText(step, actual, state);
  const next = nextStepsAfter(step, flowState, 3);
  const p = progress(flowState);
  const gps = latestGpsHint(state);
  return `<section class="d5-now-card">
    <div class="d5-project-line"><span>OUTBASE 当日</span><strong>${escapeHtml(projectName(project))}</strong><small>${escapeHtml(projectDate(project) || '予定日未設定')}</small></div>
    <div class="d5-now-main"><p>今ここ候補</p><h2>${escapeHtml(step.label)}</h2><span>${escapeHtml(section.title)} / ${escapeHtml(step.hint)}</span></div>
    <div class="d5-meta-line"><em>予定 ${escapeHtml(plan || '--:--')}</em><em>実績 ${escapeHtml(timeOnly(actual) || '未登録')}</em>${drift ? `<em class="drift">${escapeHtml(drift)}</em>` : ''}<em>${escapeHtml(gpsLabel(gps))}</em><em>記録 ${records.length}件</em></div>
    <div class="d5-next-line"><strong>次に見ること</strong>${next.length ? next.map((n) => `<button data-select-step="${escapeHtml(n.id)}">${escapeHtml(n.label)}</button>`).join('') : '<span>今日はほぼ完了</span>'}</div>
    <div class="d5-now-actions"><button class="primary" data-step-start="${escapeHtml(step.id)}">開始</button><button data-step-done="${escapeHtml(step.id)}">完了</button><button id="gpsSuggest">GPS更新</button></div>
    <div class="d5-progress"><i style="width:${p.pct}%"></i></div>
  </section>`;
}
function renderCaptureBox(state, step) {
  return `<section class="d5-capture-card">
    <div class="d5-section-head"><strong>すぐ残す</strong><span>工程を選ばなくていい。あとで整理。</span></div>
    <div class="d5-big-actions">
      <button data-record-type="photo"><strong>写真</strong><small>撮るだけ</small></button>
      <button id="focusMemo"><strong>メモ</strong><small>一言だけ</small></button>
      <button data-record-type="voice"><strong>音声</strong><small>話すだけ</small></button>
      <button id="laterMode"><strong>あとで</strong><small>押し忘れ</small></button>
    </div>
    <textarea id="dayQuickMemo" class="field textarea" placeholder="例：さっき設営完了 / コタ暑そう / エビ多かった / 撤収で濡れた"></textarea>
    <div class="d5-save-row"><button id="saveNoteRecord" class="primary">箱に入れる</button><button data-record-type="video">動画</button><button id="beforeMode">事前メモ</button></div>
    <input id="photoInput" type="file" accept="image/*" hidden />
    <input id="videoInput" type="file" accept="video/*" hidden />
  </section>`;
}
function renderInbox(records) {
  return `<section class="d5-inbox-card">
    <div class="d5-section-head"><strong>あとで整理する箱</strong><span>${records.length}件</span></div>
    ${records.length ? records.slice(0, 5).map(renderRecord).join('') : '<p class="empty-line">まだ空です。迷ったら全部ここに入れます。</p>'}
  </section>`;
}
function renderRecord(record) {
  const candidates = safeList(record.inferenceCandidates);
  return `<article class="d5-record"><div><strong>${escapeHtml(record.title || '記録')}</strong><time>${escapeHtml(formatTime(record.createdAt))}</time></div>${record.detail ? `<p>${escapeHtml(record.detail)}</p>` : ''}<div class="d5-record-tags"><span>${escapeHtml(CAPTURE_MODES[record.captureMode] || '今すぐ')}</span><span>${escapeHtml(record.flowStepLabel || '')}</span>${candidates.slice(0, 3).map((item) => `<em>${escapeHtml(item.label)}</em>`).join('')}</div></article>`;
}
function renderFlowDrawer(state, flowState, currentStep) {
  return `<details class="d5-flow-drawer"><summary><strong>今日の流れを見る / 今ここを直す</strong><span>普段は閉じたままでOK</span></summary>
    <div class="d5-section-pills">${FLOW_SECTIONS.map((section) => `<button data-jump-section="${escapeHtml(section.key)}">${escapeHtml(section.title)}</button>`).join('')}</div>
    <div class="d5-step-picker">${FLOW_SECTIONS.map((section) => {
      const steps = FLOW_STEPS.filter((step) => step.section === section.key);
      return `<div class="d5-step-group" data-section="${escapeHtml(section.key)}"><h3>${escapeHtml(section.title)}</h3>${steps.map((step) => {
        const item = flowState[step.id] || {};
        const cls = [currentStep.id === step.id ? 'active' : '', item.doneAt ? 'done' : '', step.optional ? 'optional' : ''].filter(Boolean).join(' ');
        return `<button class="${cls}" data-select-step="${escapeHtml(step.id)}"><strong>${escapeHtml(step.label)}</strong><small>${escapeHtml(item.doneAt ? '済' : plannedTime(step, state) || step.hint)}</small></button>`;
      }).join('')}</div>`;
    }).join('')}</div>
  </details>`;
}

export function renderDay() {
  const state = getState();
  const project = state.nextProject || {};
  const key = projectKey(state);
  const records = dayRecords(state, key);
  const flowState = dayFlowState(state, key);
  const step = suggestStep(state);
  app().innerHTML = `<section class="route-page d5-day-navi-page">
    ${renderNowCard(state, project, records, flowState, step)}
    ${renderCaptureBox(state, step)}
    ${renderInbox(records)}
    ${renderFlowDrawer(state, flowState, step)}
  </section>`;
  document.querySelectorAll('[data-select-step]').forEach((button) => button.addEventListener('click', () => { patchState({ activeDayFlowStep: button.dataset.selectStep }); renderDay(); }));
  document.querySelectorAll('[data-step-start]').forEach((button) => button.addEventListener('click', () => markStep(button.dataset.stepStart, 'actualStart')));
  document.querySelectorAll('[data-step-done]').forEach((button) => button.addEventListener('click', () => markStep(button.dataset.stepDone, 'doneAt')));
  document.getElementById('gpsSuggest')?.addEventListener('click', saveGpsHint);
  document.getElementById('focusMemo')?.addEventListener('click', () => document.getElementById('dayQuickMemo')?.focus());
  document.getElementById('laterMode')?.addEventListener('click', () => { patchState({ dayCaptureMode: 'later' }); renderDay(); window.setTimeout(() => document.getElementById('dayQuickMemo')?.focus(), 30); });
  document.getElementById('beforeMode')?.addEventListener('click', () => { patchState({ dayCaptureMode: 'before' }); renderDay(); window.setTimeout(() => document.getElementById('dayQuickMemo')?.focus(), 30); });
  document.getElementById('saveNoteRecord')?.addEventListener('click', () => appendRecord('note', '', getState().dayCaptureMode || 'now'));
  document.querySelectorAll('[data-record-type]').forEach((button) => button.addEventListener('click', () => {
    const type = button.dataset.recordType;
    if (type === 'photo') return document.getElementById('photoInput')?.click();
    if (type === 'video') return document.getElementById('videoInput')?.click();
    appendRecord(type, type === 'voice' ? '音声メモを追加' : '', getState().dayCaptureMode || 'now');
  }));
  document.getElementById('photoInput')?.addEventListener('change', (event) => appendRecord('photo', event.target.files?.[0]?.name || '写真を追加'));
  document.getElementById('videoInput')?.addEventListener('change', (event) => appendRecord('video', event.target.files?.[0]?.name || '動画を追加'));
}
