import { app, escapeHtml, toast } from '../../ui/components.js?v=core08-d6-status-monitor-20260705';
import { getState, patchState } from '../../core/store.js?v=core08-d6-status-monitor-20260705';

const BUILD_LABEL = 'Core08-D6';

const STATUS_STEPS = [
  { id: 'wake', phase: 'home', label: '起床', sub: '事前に決めた起床時間', required: true, tags: ['home'] },
  { id: 'homeBreakfast', phase: 'home', label: '朝食', sub: '家/途中どちらでも後から整理', tags: ['meal'] },
  { id: 'loadCar', phase: 'home', label: '積み込み', sub: '当日積む物・冷蔵品・コタ用品', required: true, tags: ['gear', 'kota'] },
  { id: 'fuel', phase: 'home', label: '給油', sub: '事前/当日の給油', tags: ['drive'] },
  { id: 'depart', phase: 'driveOut', label: '出発', sub: '予定出発との差を見る', required: true, tags: ['drive'] },
  { id: 'driveOut', phase: 'driveOut', label: '往路ドライブ', sub: '走行・渋滞・ルート進行', required: true, tags: ['drive'] },
  { id: 'restOut', phase: 'driveOut', label: '休憩/コタ休憩', sub: 'SA/PA・トイレ・水分', tags: ['drive', 'kota'] },
  { id: 'shopping', phase: 'driveOut', label: '買い出し', sub: 'スーパー・コンビニ・現地調達', tags: ['shopping', 'meal'] },
  { id: 'arriveCamp', phase: 'arrival', label: 'キャンプ場到着', sub: '入口/駐車場/受付前', required: true, tags: ['drive'] },
  { id: 'reception', phase: 'arrival', label: '受付', sub: 'チェックイン・説明・支払い', required: true, tags: ['site'] },
  { id: 'moveSite', phase: 'arrival', label: 'サイト移動', sub: 'サイト番号・車位置', tags: ['site'] },
  { id: 'layout', phase: 'site', label: 'レイアウト考察', sub: '風・日陰・入口・コタ動線', required: true, tags: ['setup', 'kota', 'weather'] },
  { id: 'setup', phase: 'site', label: '設営', sub: 'テント・タープ・テント内・外回り', required: true, tags: ['setup', 'gear'] },
  { id: 'siteBreak', phase: 'site', label: '休憩/散歩/探索', sub: '設営中の休憩・場内確認', tags: ['walk', 'kota'] },
  { id: 'dinner', phase: 'site', label: '夕食', sub: '予定料理・実際量・味', required: true, tags: ['meal'] },
  { id: 'nightCleanup', phase: 'site', label: '夜の片付け', sub: '食器・ゴミ・翌朝準備', tags: ['meal', 'gear'] },
  { id: 'sleep', phase: 'night', label: '就寝', sub: '寒さ・暑さ・寝具・コタ', required: true, tags: ['weather', 'gear', 'kota'] },
  { id: 'morningWake', phase: 'morning', label: '翌朝起床', sub: '気温・結露・コタ状態', required: true, tags: ['weather', 'kota'] },
  { id: 'breakfast', phase: 'morning', label: '朝食', sub: '量・片付けやすさ', tags: ['meal'] },
  { id: 'teardown', phase: 'teardown', label: '撤収', sub: '濡れ物・乾燥・積み込み', required: true, tags: ['teardown', 'gear', 'weather'] },
  { id: 'morningWalk', phase: 'teardown', label: '撤収日の散歩', sub: '時間があればコタ散歩', tags: ['walk', 'kota'] },
  { id: 'lateLunch', phase: 'teardown', label: '昼食', sub: 'レイトチェックアウト時', tags: ['meal'] },
  { id: 'checkout', phase: 'teardown', label: 'チェックアウト', sub: '受付・ゴミ・最終確認', required: true, tags: ['drive', 'teardown'] },
  { id: 'driveHome', phase: 'driveHome', label: '帰路ドライブ', sub: '観光・休憩・渋滞・帰宅予測', required: true, tags: ['drive'] },
  { id: 'returnStop', phase: 'driveHome', label: '帰りの寄り道/休憩', sub: '観光・温泉・SA/PA・コタ休憩', tags: ['drive', 'kota'] },
  { id: 'arriveHome', phase: 'homeBack', label: '帰宅', sub: '到着時間・疲労感', required: true, tags: ['drive'] },
  { id: 'homeCleanup', phase: 'homeBack', label: '帰宅後片付け', sub: '干す・洗う・充電・補充', required: true, tags: ['gear', 'next'] }
];

const PHASES = {
  home: { label: '出発前', sub: '起床・朝食・積み込み' },
  driveOut: { label: '往路ドライブ', sub: '走行・休憩・買い出し・給油' },
  arrival: { label: '到着/受付', sub: 'キャンプ場到着・受付・サイト移動' },
  site: { label: 'サイト滞在', sub: '設営・散歩・探索・夕食' },
  night: { label: '夜/就寝', sub: '片付け・就寝・夜の気づき' },
  morning: { label: '翌朝', sub: '起床・朝食・朝の状態' },
  teardown: { label: '撤収', sub: '撤収・チェックアウト' },
  driveHome: { label: '帰路ドライブ', sub: '帰り道・観光・休憩' },
  homeBack: { label: '帰宅後', sub: '帰宅・片付け・次回注意' }
};

const RECORD_TYPES = { note: 'メモ', photo: '写真', video: '動画', voice: '音声', later: 'あとで' };

function nowIso() { return new Date().toISOString(); }
function makeId(prefix = 'day') { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
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
function recordsOf(state = getState(), key = projectKey(state)) { return safeList(state.dayRecords?.[key]); }
function flowOf(state = getState(), key = projectKey(state)) { return safeObject(state.dayFlowState?.[key]); }
function gpsHintsOf(state = getState(), key = projectKey(state)) { return safeList(state.dayGpsHints?.[key]); }
function autoEventsOf(state = getState(), key = projectKey(state)) { return safeList(state.dayAutoEvents?.[key]); }
function stepById(id) { return STATUS_STEPS.find((step) => step.id === id) || STATUS_STEPS[0]; }
function phaseOf(key) { return PHASES[key] || PHASES.home; }
function stepDone(flow, id) { return Boolean(flow[id]?.doneAt || flow[id]?.status === 'confirmed'); }
function stepStarted(flow, id) { return Boolean(flow[id]?.actualStart || stepDone(flow, id)); }
function formatTime(value) {
  if (!value) return '';
  try { return new Date(value).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }); } catch { return String(value); }
}
function formatDayTime(value) {
  if (!value) return '';
  try { return new Date(value).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return String(value); }
}
function parseTimeMinutes(text = '') {
  const m = String(text || '').match(/(\d{1,2})[:：](\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}
function findTimeNear(label, text = '') {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`${escaped}[^0-9]{0,20}(\d{1,2})[:：](\d{2})`);
  const m = String(text || '').match(re);
  return m ? `${String(m[1]).padStart(2, '0')}:${m[2]}` : '';
}
function plannedTime(step, state) {
  const project = state.nextProject || {};
  const reservation = project.reservation || {};
  const c = context(state, project);
  const routeText = `${c.routeMemo || ''}\n${reservation.memo || ''}\n${project.memo || ''}`;
  if (step.id === 'wake') return findTimeNear('起床', routeText) || '';
  if (step.id === 'depart') return findTimeNear('出発', routeText) || c.departureTime || '';
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
  if (Math.abs(diff) < 3) return '予定通り';
  return diff > 0 ? `+${diff}分` : `-${Math.abs(diff)}分`;
}
function latestGpsFromWalkSession(state) {
  const points = safeList(state.walkSession?.gpsPoints);
  const point = points[points.length - 1];
  return point ? { ...point, source: 'activeRecord' } : null;
}
function latestGps(state) { return latestGpsFromWalkSession(state) || gpsHintsOf(state)[0] || null; }
function gpsSpeedKmh(gps) {
  if (!gps || gps.speed === null || gps.speed === undefined) return null;
  const speed = Number(gps.speed);
  return Number.isFinite(speed) ? Math.max(0, speed * 3.6) : null;
}
function gpsStateLabel(gps) {
  if (!gps) return 'GPS未取得';
  const speed = gpsSpeedKmh(gps);
  if (speed === null) return '位置保存済み';
  if (speed >= 15) return `車移動 ${speed.toFixed(0)}km/h`;
  if (speed > 1.5) return `徒歩移動 ${speed.toFixed(1)}km/h`;
  return '滞在/停車中';
}
function nextIncomplete(flow, includeOptional = false) {
  return STATUS_STEPS.find((step) => (includeOptional || step.required) && !stepDone(flow, step.id)) || STATUS_STEPS.find((step) => !stepDone(flow, step.id)) || STATUS_STEPS[STATUS_STEPS.length - 1];
}
function remainingSteps(flow, count = 4) {
  const required = STATUS_STEPS.filter((step) => step.required && !stepDone(flow, step.id));
  const optional = STATUS_STEPS.filter((step) => !step.required && !stepDone(flow, step.id));
  return [...required, ...optional].slice(0, count);
}
function doneSteps(flow, count = 4) {
  return STATUS_STEPS.filter((step) => stepDone(flow, step.id)).slice(-count).reverse();
}
function getFlowPatch(state, updater) {
  const key = projectKey(state);
  const all = safeObject(state.dayFlowState);
  const current = safeObject(all[key]);
  return { dayFlowState: { ...all, [key]: updater(current) } };
}
function setStep(stepId, patch) {
  const state = getState();
  patchState(getFlowPatch(state, (flow) => ({ ...flow, [stepId]: { ...(flow[stepId] || {}), ...patch, updatedAt: nowIso() } })));
  renderDay();
}
function isOutboundDrive(flow, gps) {
  const speed = gpsSpeedKmh(gps);
  if (speed !== null && speed >= 15 && !stepDone(flow, 'arriveCamp')) return true;
  return stepDone(flow, 'depart') && !stepDone(flow, 'arriveCamp');
}
function isInboundDrive(flow, gps) {
  const speed = gpsSpeedKmh(gps);
  if (speed !== null && speed >= 15 && stepDone(flow, 'checkout') && !stepDone(flow, 'arriveHome')) return true;
  return stepDone(flow, 'checkout') && !stepDone(flow, 'arriveHome');
}
function inferStatus(state) {
  const flow = flowOf(state);
  const gps = latestGps(state);
  const speed = gpsSpeedKmh(gps);
  const hour = new Date().getHours();
  const override = state.activeDayStatusStep;
  if (override && STATUS_STEPS.some((step) => step.id === override)) {
    const step = stepById(override);
    return { step, phase: phaseOf(step.phase), confidence: '手動選択', drive: step.phase === 'driveOut' || step.phase === 'driveHome' };
  }
  if (isInboundDrive(flow, gps)) return { step: stepById('driveHome'), phase: phaseOf('driveHome'), confidence: speed !== null && speed >= 15 ? 'GPS速度' : 'チェックアウト後', drive: true };
  if (isOutboundDrive(flow, gps)) return { step: stepById('driveOut'), phase: phaseOf('driveOut'), confidence: speed !== null && speed >= 15 ? 'GPS速度' : '出発後', drive: true };
  if (!stepDone(flow, 'depart')) {
    if (!stepDone(flow, 'loadCar') && hour >= 5 && hour <= 11) return { step: stepById('loadCar'), phase: phaseOf('home'), confidence: '出発前', drive: false };
    return { step: stepById('depart'), phase: phaseOf('home'), confidence: '出発前', drive: false };
  }
  if (!stepDone(flow, 'arriveCamp')) return { step: stepById('driveOut'), phase: phaseOf('driveOut'), confidence: '出発後', drive: true };
  if (!stepDone(flow, 'reception')) return { step: stepById('reception'), phase: phaseOf('arrival'), confidence: '到着後', drive: false };
  if (!stepDone(flow, 'setup')) return { step: stepById('setup'), phase: phaseOf('site'), confidence: '受付後', drive: false };
  if (!stepDone(flow, 'dinner') && hour >= 15) return { step: stepById('dinner'), phase: phaseOf('site'), confidence: '夕方', drive: false };
  if (!stepDone(flow, 'sleep') && hour >= 20) return { step: stepById('sleep'), phase: phaseOf('night'), confidence: '夜', drive: false };
  if (stepDone(flow, 'sleep') && !stepDone(flow, 'checkout')) return { step: stepById('teardown'), phase: phaseOf('teardown'), confidence: '翌朝/撤収前', drive: false };
  if (stepDone(flow, 'arriveHome')) return { step: stepById('homeCleanup'), phase: phaseOf('homeBack'), confidence: '帰宅後', drive: false };
  return { step: nextIncomplete(flow), phase: phaseOf(nextIncomplete(flow).phase), confidence: '未完了順', drive: false };
}
function progress(flow) {
  const required = STATUS_STEPS.filter((step) => step.required);
  const done = required.filter((step) => stepDone(flow, step.id)).length;
  return { done, total: required.length, pct: Math.round((done / required.length) * 100) };
}
function autoEventTypeFromGps(status, gps) {
  const speed = gpsSpeedKmh(gps);
  if (speed !== null && speed >= 15) return status.drive && status.step.phase === 'driveHome' ? 'return_drive' : 'outbound_drive';
  if (speed !== null && speed > 1.5) return 'walk_or_explore';
  if (status.drive) return 'drive_stop';
  return 'stay_or_stop';
}
function autoEventLabel(type, status) {
  return {
    outbound_drive: '往路走行候補',
    return_drive: '帰路走行候補',
    drive_stop: '停車イベント候補',
    walk_or_explore: '散歩/場内移動候補',
    stay_or_stop: '滞在/作業候補'
  }[type] || `${status.step.label}候補`;
}
function addAutoEventFromGps(gps) {
  const state = getState();
  const key = projectKey(state);
  const status = inferStatus(state);
  const type = autoEventTypeFromGps(status, gps);
  const event = {
    id: makeId('dayauto'), type, label: autoEventLabel(type, status), status: 'inferred',
    candidateStepId: status.step.id, candidateStepLabel: status.step.label,
    reason: `${gpsStateLabel(gps)} / ${status.confidence}`,
    createdAt: nowIso(), gps
  };
  patchState({ dayAutoEvents: { ...(state.dayAutoEvents || {}), [key]: [event, ...autoEventsOf(state, key)].slice(0, 80) } });
}
function saveGpsHint() {
  if (!navigator.geolocation) return toast('この端末はGPS未対応です');
  navigator.geolocation.getCurrentPosition((pos) => {
    const state = getState();
    const key = projectKey(state);
    const hint = { id: makeId('gps'), lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, speed: pos.coords.speed, capturedAt: nowIso(), source: 'day-status' };
    patchState({ dayGpsHints: { ...(state.dayGpsHints || {}), [key]: [hint, ...gpsHintsOf(state, key)].slice(0, 20) } });
    addAutoEventFromGps(hint);
    toast('GPSから状態候補を更新');
    renderDay();
  }, () => toast('GPSを取得できませんでした'), { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
}
function contextSnapshot(state, status) {
  const project = state.nextProject || {};
  const c = context(state, project);
  const flow = flowOf(state);
  const step = status.step;
  return {
    build: BUILD_LABEL, projectKey: projectKey(state), projectName: projectName(project), projectDate: projectDate(project),
    statusStepId: step.id, statusStepLabel: step.label, phase: step.phase, phaseLabel: status.phase.label,
    plannedTime: plannedTime(step, state), actualStart: flow[step.id]?.actualStart || '', actualDone: flow[step.id]?.doneAt || '',
    drift: driftText(step, flow[step.id]?.actualStart || flow[step.id]?.doneAt, state),
    gps: latestGps(state), gpsLabel: gpsStateLabel(latestGps(state)), confidence: status.confidence,
    weatherMemo: c.weatherDecisionMemo || c.weatherMemo || '', routeMemo: c.routeMemo || '', menuMemo: c.menuMemo || c.fixedDishMemo || '', gearMemo: c.gearMemo || '', kotaMemo: c.kotaMemo || '', captureAt: nowIso()
  };
}
function inferRecordCandidates(record, state) {
  const text = `${record.detail || ''} ${record.title || ''} ${record.contextSnapshot?.statusStepLabel || ''} ${record.contextSnapshot?.weatherMemo || ''} ${record.contextSnapshot?.menuMemo || ''} ${record.contextSnapshot?.gearMemo || ''} ${record.contextSnapshot?.kotaMemo || ''}`;
  const out = [];
  const add = (tag, label, reason, source = 'text') => { if (!out.some((item) => item.tag === tag && item.reason === reason)) out.push({ tag, label, reason, source }); };
  safeList(stepById(record.statusStepId).tags).forEach((tag) => add(tag, `${tag}候補`, `${record.contextSnapshot?.statusStepLabel || '今ここ'}に近い`, 'status'));
  if (/コタ|犬|散歩|暑|寒|水|日陰|足|車内|休憩/.test(text)) add('kota', 'コタ候補', 'コタ/休憩/暑さ寒さに関係');
  if (/料理|朝食|昼食|夕食|飯|食材|味|量|多すぎ|少ない|余り|エビ|肉|ピザ/.test(text)) add('meal', '料理候補', '料理/量/食材に関係');
  if (/設営|テント|タープ|ペグ|レイアウト|タープ下|テント内|外回り/.test(text)) add('setup', '設営候補', '設営/レイアウトに関係');
  if (/給油|ガソリン|渋滞|休憩|SA|PA|寄り道|観光|買い出し|スーパー|コンビニ/.test(text)) add('drive', 'ドライブ候補', '移動/停車イベントに関係');
  if (/撤収|片付|収納|濡|乾燥|ゴミ|忘れ物|充電|干す/.test(text)) add('teardown', '撤収/片付け候補', '撤収・帰宅後片付けに関係');
  if (/次回|改善|後悔|不要|失敗|注意|足りない/.test(text)) add('next', '次回注意候補', '次回改善に関係');
  const speed = gpsSpeedKmh(record.contextSnapshot?.gps || latestGps(state));
  if (speed !== null && speed >= 15) add('drive', '移動中候補', 'GPS速度が車移動に近い', 'gps');
  if (speed !== null && speed > 1.5 && speed < 8) add('walk', '散歩/場内移動候補', 'GPS速度が徒歩移動に近い', 'gps');
  return out.slice(0, 5);
}
function appendRecord(type, detail = '', mode = 'now') {
  const state = getState();
  const key = projectKey(state);
  const status = inferStatus(state);
  const memo = detail || document.getElementById('dayStatusMemo')?.value?.trim() || '';
  if (type === 'note' && !memo) return toast('メモを入力してください');
  const record = {
    id: makeId('dayrec'), record_id: makeId('dayrec'), type, captureMode: mode,
    title: `${RECORD_TYPES[type] || '記録'}：${status.phase.label}`,
    detail: memo, statusStepId: status.step.id, statusStepLabel: status.step.label,
    createdAt: nowIso(), contextSnapshot: contextSnapshot(state, status)
  };
  record.inferenceCandidates = inferRecordCandidates(record, state);
  patchState({ dayRecords: { ...(state.dayRecords || {}), [key]: [record, ...recordsOf(state, key)] } });
  toast(mode === 'later' ? 'あとで整理に保存' : '記録を保存');
  renderDay();
}
function confirmCurrentStatus() {
  const state = getState();
  const status = inferStatus(state);
  const at = nowIso();
  setStep(status.step.id, { actualStart: flowOf(state)[status.step.id]?.actualStart || at, doneAt: at, status: 'confirmed', source: 'user-confirm' });
  toast(`${status.step.label}を確定`);
}
function markDifferent() {
  const state = getState();
  const flow = flowOf(state);
  const current = inferStatus(state).step;
  const start = STATUS_STEPS.findIndex((step) => step.id === current.id);
  const next = STATUS_STEPS.slice(start + 1).find((step) => !stepDone(flow, step.id)) || nextIncomplete(flow, true);
  patchState({ activeDayStatusStep: next.id });
  toast('今ここ候補を変更');
  renderDay();
}
function confirmAutoEvent(eventId) {
  const state = getState();
  const key = projectKey(state);
  const events = autoEventsOf(state, key).map((event) => event.id === eventId ? { ...event, status: 'confirmed', confirmedAt: nowIso() } : event);
  const target = events.find((event) => event.id === eventId);
  const patch = { dayAutoEvents: { ...(state.dayAutoEvents || {}), [key]: events } };
  if (target?.candidateStepId) {
    const flow = flowOf(state, key);
    patch.dayFlowState = { ...(state.dayFlowState || {}), [key]: { ...flow, [target.candidateStepId]: { ...(flow[target.candidateStepId] || {}), actualStart: (flow[target.candidateStepId] || {}).actualStart || target.createdAt, doneAt: (flow[target.candidateStepId] || {}).doneAt || target.createdAt, status: 'confirmed', source: 'auto-event-confirm', updatedAt: nowIso() } } };
  }
  patchState(patch);
  toast('候補を確定');
  renderDay();
}
function renderHero(state, project, status, flow, records, events) {
  const step = status.step;
  const gps = latestGps(state);
  const plan = plannedTime(step, state);
  const actual = flow[step.id]?.actualStart || flow[step.id]?.doneAt;
  const drift = driftText(step, actual, state);
  const prog = progress(flow);
  const heroClass = status.drive ? 'd6-hero drive' : 'd6-hero';
  const mainLabel = status.drive ? (step.phase === 'driveHome' ? '帰路ドライブ中っぽい' : '往路ドライブ中っぽい') : `${status.phase.label}っぽい`;
  return `<section class="${heroClass}">
    <div class="d6-hero-top"><span>OUTBASE 当日ステータス</span><button id="gpsSuggest" type="button">GPS更新</button></div>
    <div class="d6-camp-name">${escapeHtml(projectName(project))}${projectDate(project) ? ` / ${escapeHtml(projectDate(project))}` : ''}</div>
    <div class="d6-now">今の状態</div>
    <h2>${escapeHtml(mainLabel)}</h2>
    <p>${escapeHtml(step.sub)}。ユーザーは自由に動く。OUTBASEは状態を拾う。</p>
    <div class="d6-metrics"><span>${escapeHtml(status.confidence)}</span><span>${escapeHtml(gpsStateLabel(gps))}</span>${drift ? `<strong>${escapeHtml(drift)}</strong>` : ''}<span>${prog.done}/${prog.total}完了</span></div>
    <div class="d6-state-actions"><button id="confirmStatus" class="primary">この状態で確定</button><button id="differentStatus">違う</button><button data-record-type="later">あとで整理</button></div>
    <div class="d6-safe-note">${status.drive ? '運転中は細かい操作なし。声かあとでだけでOK。' : `未確認候補 ${events.filter((event) => event.status !== 'confirmed').length}件 / 記録 ${records.length}件`}</div>
  </section>`;
}
function chipList(items, emptyText, cls = '') {
  return items.length ? items.map((item) => `<span class="${cls}">${escapeHtml(item.label)}</span>`).join('') : `<em>${escapeHtml(emptyText)}</em>`;
}
function renderSnapshot(state, flow, status) {
  const done = doneSteps(flow, 4);
  const remain = remainingSteps(flow, 4);
  const events = autoEventsOf(state).filter((event) => event.status !== 'confirmed').slice(0, 3);
  return `<section class="d6-snapshot">
    <article><strong>終わったこと</strong><div>${chipList(done, 'まだ確定なし', 'done')}</div></article>
    <article><strong>残っていること</strong><div>${chipList(remain, '主な残件なし', 'remain')}</div></article>
    <article><strong>自動で拾った候補</strong><div>${events.length ? events.map((event) => `<button class="d6-auto-mini" data-confirm-event="${escapeHtml(event.id)}">${escapeHtml(event.label)}</button>`).join('') : '<em>GPS更新で候補化</em>'}</div></article>
  </section>`;
}
function renderCapture(status) {
  if (status.drive) {
    return `<section class="d6-capture drive">
      <button data-record-type="voice" class="voice"><strong>声で残す</strong><small>停車中/助手席向け</small></button>
      <button data-record-type="later"><strong>あとで</strong><small>押し忘れ・未分類</small></button>
      <textarea id="dayStatusMemo" class="field textarea" placeholder="例：コタ休憩した / 給油した / 買い出し寄った"></textarea>
      <button id="saveStatusMemo">保存</button>
    </section>`;
  }
  return `<section class="d6-capture">
    <div class="d6-action-grid">
      <button data-record-type="photo" class="photo"><strong>写真</strong><small>撮るだけ</small></button>
      <button id="focusMemo"><strong>メモ</strong><small>一言だけ</small></button>
      <button data-record-type="voice"><strong>音声</strong><small>話すだけ</small></button>
      <button data-record-type="later"><strong>あとで</strong><small>未分類で保存</small></button>
    </div>
    <div class="d6-memo-row"><textarea id="dayStatusMemo" class="field textarea" placeholder="例：レイアウト迷った / コタ暑そう / エビ多かった"></textarea><button id="saveStatusMemo">保存</button></div>
    <input id="photoInput" type="file" accept="image/*" hidden />
    <input id="videoInput" type="file" accept="video/*" hidden />
  </section>`;
}
function renderRecords(records) {
  return `<section class="d6-inbox"><div class="d6-inbox-head"><strong>今日残したもの</strong><span>${records.length}件</span></div>${records.length ? records.slice(0, 3).map(renderRecord).join('') : '<p class="empty-line">何をしていても、残すだけ。分類はあとでOK。</p>'}</section>`;
}
function renderRecord(record) {
  const first = safeList(record.inferenceCandidates)[0]?.label || record.statusStepLabel || '未整理';
  return `<article class="d6-record"><div><strong>${escapeHtml(record.title || '記録')}</strong><time>${escapeHtml(formatTime(record.createdAt))}</time></div>${record.detail ? `<p>${escapeHtml(record.detail)}</p>` : ''}<span>${escapeHtml(first)}</span></article>`;
}
function renderFlowDrawer(state, flow, status) {
  return `<details class="d6-flow"><summary><strong>状態を確認/直す</strong><span>必要な時だけ開く</span></summary>
    <div class="d6-flow-grid">${Object.entries(PHASES).map(([phaseKey, phase]) => {
      const steps = STATUS_STEPS.filter((step) => step.phase === phaseKey);
      return `<section><h3>${escapeHtml(phase.label)}</h3>${steps.map((step) => {
        const cls = [status.step.id === step.id ? 'active' : '', stepDone(flow, step.id) ? 'done' : '', step.required ? 'required' : ''].filter(Boolean).join(' ');
        return `<button class="${cls}" data-select-status="${escapeHtml(step.id)}"><strong>${escapeHtml(step.label)}</strong><small>${escapeHtml(stepDone(flow, step.id) ? '確定済み' : plannedTime(step, state) || step.sub)}</small></button>`;
      }).join('')}</section>`;
    }).join('')}</div>
  </details>`;
}
export function renderDay() {
  const state = getState();
  const project = state.nextProject || {};
  const key = projectKey(state);
  const flow = flowOf(state, key);
  const records = recordsOf(state, key);
  const events = autoEventsOf(state, key);
  const status = inferStatus(state);
  app().innerHTML = `<section class="route-page d6-day-page">
    ${renderHero(state, project, status, flow, records, events)}
    ${renderSnapshot(state, flow, status)}
    ${renderCapture(status)}
    ${renderRecords(records)}
    ${renderFlowDrawer(state, flow, status)}
  </section>`;
  document.getElementById('gpsSuggest')?.addEventListener('click', saveGpsHint);
  document.getElementById('confirmStatus')?.addEventListener('click', confirmCurrentStatus);
  document.getElementById('differentStatus')?.addEventListener('click', markDifferent);
  document.getElementById('focusMemo')?.addEventListener('click', () => document.getElementById('dayStatusMemo')?.focus());
  document.getElementById('saveStatusMemo')?.addEventListener('click', () => appendRecord('note'));
  document.querySelectorAll('[data-select-status]').forEach((button) => button.addEventListener('click', () => { patchState({ activeDayStatusStep: button.dataset.selectStatus }); renderDay(); }));
  document.querySelectorAll('[data-confirm-event]').forEach((button) => button.addEventListener('click', () => confirmAutoEvent(button.dataset.confirmEvent)));
  document.querySelectorAll('[data-record-type]').forEach((button) => button.addEventListener('click', () => {
    const type = button.dataset.recordType;
    if (type === 'photo') return document.getElementById('photoInput')?.click();
    if (type === 'video') return document.getElementById('videoInput')?.click();
    if (type === 'later') return appendRecord('later', document.getElementById('dayStatusMemo')?.value?.trim() || 'あとで整理', 'later');
    return appendRecord(type, type === 'voice' ? '音声メモを追加' : '', 'now');
  }));
  document.getElementById('photoInput')?.addEventListener('change', (event) => appendRecord('photo', event.target.files?.[0]?.name || '写真を追加'));
}
