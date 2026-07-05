import { app, escapeHtml, toast } from '../../ui/components.js?v=core08-d7-connect-mode-20260705';
import { getState, patchState } from '../../core/store.js?v=core08-d7-connect-mode-20260705';

const BUILD_LABEL = 'Core08-D7';

const STATUS_STEPS = [
  { id: 'wake', phase: 'home', mode: '出発前', label: '起床', sub: '事前に決めた起床時間', required: true, tags: ['home'] },
  { id: 'homeBreakfast', phase: 'home', mode: '出発前', label: '朝食', sub: '家/途中どちらでも後から整理', tags: ['meal'] },
  { id: 'loadCar', phase: 'home', mode: '出発前', label: '積み込み', sub: '当日積む物・冷蔵品・コタ用品', required: true, tags: ['gear', 'kota'] },
  { id: 'fuel', phase: 'home', mode: '出発前', label: '給油', sub: '事前/当日の給油', tags: ['drive'] },
  { id: 'depart', phase: 'driveOut', mode: '往路ドライブ', label: '出発', sub: '予定出発との差を見る', required: true, tags: ['drive'] },
  { id: 'driveOut', phase: 'driveOut', mode: '往路ドライブ', label: '往路ドライブ', sub: 'Google Mapsを使う・走行/渋滞/停車を候補化', required: true, tags: ['drive', 'route'] },
  { id: 'restOut', phase: 'driveOut', mode: '往路ドライブ', label: '休憩/コタ休憩', sub: 'SA/PA・トイレ・水分・コタ状態', tags: ['drive', 'kota'] },
  { id: 'shopping', phase: 'driveOut', mode: '往路ドライブ', label: '買い出し', sub: 'スーパー・コンビニ・現地調達', tags: ['shopping', 'meal'] },
  { id: 'arriveCamp', phase: 'arrival', mode: '到着受付', label: 'キャンプ場到着', sub: '入口/駐車場/受付前', required: true, tags: ['drive'] },
  { id: 'reception', phase: 'arrival', mode: '到着受付', label: '受付', sub: 'チェックイン・説明・支払い', required: true, tags: ['site'] },
  { id: 'moveSite', phase: 'arrival', mode: 'サイト移動', label: 'サイト移動', sub: 'サイト番号・車位置', tags: ['site'] },
  { id: 'layout', phase: 'setup', mode: '設営', label: 'レイアウト考察', sub: '風・日陰・入口・コタ動線', required: true, tags: ['setup', 'kota', 'weather'] },
  { id: 'tent', phase: 'setup', mode: '設営', label: 'テント/タープ', sub: 'テント・タープ・ペグ・張り方', required: true, tags: ['setup', 'gear'] },
  { id: 'insideSetup', phase: 'setup', mode: '設営', label: 'テント内/タープ下/外', sub: '寝床・リビング・外回り・導線', tags: ['setup', 'gear', 'kota'] },
  { id: 'siteBreak', phase: 'stay', mode: 'サイト滞在', label: '休憩/散歩/トイレ', sub: '設営中の休憩・コタ散歩・トイレ', tags: ['walk', 'kota'] },
  { id: 'explore', phase: 'stay', mode: '散歩探索', label: 'キャンプ場探索', sub: '場内・景色・炊事場・トイレ・レビュー素材', tags: ['walk', 'site'] },
  { id: 'dinner', phase: 'meal', mode: '料理', label: '夕食', sub: '予定料理・実際量・味・片付け', required: true, tags: ['meal'] },
  { id: 'nightCleanup', phase: 'meal', mode: '料理', label: '夜の片付け', sub: '食器・ゴミ・翌朝準備', tags: ['meal', 'gear'] },
  { id: 'sleep', phase: 'night', mode: '就寝', label: '就寝', sub: '寒さ・暑さ・寝具・コタ', required: true, tags: ['weather', 'gear', 'kota'] },
  { id: 'morningWake', phase: 'morning', mode: '翌朝', label: '翌朝起床', sub: '気温・結露・コタ状態', required: true, tags: ['weather', 'kota'] },
  { id: 'breakfast', phase: 'morning', mode: '翌朝', label: '朝食', sub: '量・片付けやすさ', tags: ['meal'] },
  { id: 'teardown', phase: 'teardown', mode: '撤収', label: '撤収', sub: '設営の逆・濡れ物・乾燥・積み込み', required: true, tags: ['teardown', 'gear', 'weather'] },
  { id: 'morningWalk', phase: 'teardown', mode: '撤収', label: '撤収日の散歩', sub: '時間があればコタ散歩', tags: ['walk', 'kota'] },
  { id: 'lateLunch', phase: 'teardown', mode: '撤収', label: '昼食', sub: 'レイトチェックアウト時', tags: ['meal'] },
  { id: 'checkout', phase: 'teardown', mode: '撤収', label: 'チェックアウト', sub: '受付・ゴミ・最終確認', required: true, tags: ['drive', 'teardown'] },
  { id: 'driveHome', phase: 'driveHome', mode: '帰路ドライブ', label: '帰路ドライブ', sub: 'Google Mapsを使う・観光・休憩・渋滞', required: true, tags: ['drive', 'route'] },
  { id: 'returnStop', phase: 'driveHome', mode: '帰路ドライブ', label: '帰りの寄り道/休憩', sub: '観光・温泉・SA/PA・コタ休憩', tags: ['drive', 'kota'] },
  { id: 'arriveHome', phase: 'homeBack', mode: '帰宅後', label: '帰宅', sub: '到着時間・疲労感', required: true, tags: ['drive'] },
  { id: 'homeCleanup', phase: 'homeBack', mode: '帰宅後', label: '帰宅後片付け', sub: '干す・洗う・充電・補充・次回注意', required: true, tags: ['gear', 'next'] }
];

const PHASES = {
  home: { label: '出発前', sub: '起床・朝食・積み込み・給油' },
  driveOut: { label: '往路ドライブ', sub: 'Google Maps・休憩・買い出し・コタ休憩' },
  arrival: { label: '到着受付', sub: 'キャンプ場到着・受付・サイト移動' },
  setup: { label: '設営', sub: 'レイアウト・テント・タープ・外回り' },
  stay: { label: 'サイト滞在', sub: '休憩・散歩・探索・トイレ' },
  meal: { label: '料理', sub: '朝昼晩・量・味・食材・片付け' },
  night: { label: '就寝', sub: '寒さ/暑さ・寝具・コタ' },
  morning: { label: '翌朝', sub: '朝食・結露・朝の状態' },
  teardown: { label: '撤収', sub: '撤収・昼食・チェックアウト' },
  driveHome: { label: '帰路ドライブ', sub: 'Google Maps・観光・休憩・帰宅' },
  homeBack: { label: '帰宅後', sub: '荷下ろし・干す・充電・次回注意' }
};

const CONNECTIONS = {
  prep: { label: '準備', hint: '持ち物・当日積み込み・忘れ物' },
  route: { label: 'ルート', hint: '出発/到着/寄り道/休憩' },
  meal: { label: '料理', hint: '量・味・食材・片付け' },
  gear: { label: 'ギア', hint: '使った/不要/濡れた/忘れた' },
  kota: { label: 'コタ', hint: '暑さ・散歩・休憩・水' },
  weather: { label: '天気', hint: '雨・風・寒暖・乾燥' },
  memory: { label: '思い出', hint: '写真・レビュー素材' },
  next: { label: '次回', hint: '改善・注意・買う/持つ' }
};

const RECORD_TYPES = { note: 'メモ', photo: '写真', video: '動画', voice: '音声', later: 'あとで' };
const RECORD_STATUSES = { confirmed: '確定', inferred: '推定', unconfirmed: '未確認', wrong: '間違い', corrected: '修正済み', dismissed: '却下', later: 'あとで確認' };

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
function correctionsOf(state = getState(), key = projectKey(state)) { return safeList(state.dayCorrections?.[key]); }
function connectQueueOf(state = getState(), key = projectKey(state)) { return safeList(state.dayConnectQueue?.[key]); }
function modeLogOf(state = getState(), key = projectKey(state)) { return safeList(state.dayModeLog?.[key]); }
function stepById(id) { return STATUS_STEPS.find((step) => step.id === id) || STATUS_STEPS[0]; }
function phaseOf(key) { return PHASES[key] || PHASES.home; }
function stepDone(flow, id) { return Boolean(flow[id]?.doneAt || flow[id]?.status === 'confirmed'); }
function formatTime(value) { if (!value) return ''; try { return new Date(value).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }); } catch { return String(value); } }
function formatDayTime(value) { if (!value) return ''; try { return new Date(value).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return String(value); } }
function parseTimeMinutes(text = '') { const m = String(text || '').match(/(\d{1,2})[:：](\d{2})/); return m ? Number(m[1]) * 60 + Number(m[2]) : null; }
function findTimeNear(label, text = '') { const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); const re = new RegExp(`${escaped}[^0-9]{0,20}(\\d{1,2})[:：](\\d{2})`); const m = String(text || '').match(re); return m ? `${String(m[1]).padStart(2, '0')}:${m[2]}` : ''; }
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
function driftText(step, actualIso, state) { const plan = plannedTime(step, state); const planMin = parseTimeMinutes(plan); if (planMin === null || !actualIso) return ''; const actual = new Date(actualIso); if (Number.isNaN(actual.getTime())) return ''; const actualMin = actual.getHours() * 60 + actual.getMinutes(); const diff = actualMin - planMin; if (Math.abs(diff) < 3) return '予定通り'; return diff > 0 ? `+${diff}分` : `-${Math.abs(diff)}分`; }
function latestGpsFromWalkSession(state) { const points = safeList(state.walkSession?.gpsPoints); const point = points[points.length - 1]; return point ? { ...point, source: 'activeRecord' } : null; }
function latestGps(state) { return latestGpsFromWalkSession(state) || gpsHintsOf(state)[0] || null; }
function gpsSpeedKmh(gps) { if (!gps || gps.speed === null || gps.speed === undefined) return null; const speed = Number(gps.speed); return Number.isFinite(speed) ? Math.max(0, speed * 3.6) : null; }
function gpsStateLabel(gps) { if (!gps) return 'GPS未取得'; const speed = gpsSpeedKmh(gps); if (speed === null) return '位置保存済み'; if (speed >= 15) return `車移動 ${speed.toFixed(0)}km/h`; if (speed > 1.5) return `徒歩移動 ${speed.toFixed(1)}km/h`; return '滞在/停車中'; }
function nextIncomplete(flow, includeOptional = false) { return STATUS_STEPS.find((step) => (includeOptional || step.required) && !stepDone(flow, step.id)) || STATUS_STEPS.find((step) => !stepDone(flow, step.id)) || STATUS_STEPS[STATUS_STEPS.length - 1]; }
function remainingSteps(flow, count = 4) { const required = STATUS_STEPS.filter((step) => step.required && !stepDone(flow, step.id)); const optional = STATUS_STEPS.filter((step) => !step.required && !stepDone(flow, step.id)); return [...required, ...optional].slice(0, count); }
function doneSteps(flow, count = 4) { return STATUS_STEPS.filter((step) => stepDone(flow, step.id)).slice(-count).reverse(); }
function getFlowPatch(state, updater) { const key = projectKey(state); const all = safeObject(state.dayFlowState); const current = safeObject(all[key]); return { dayFlowState: { ...all, [key]: updater(current) } }; }
function setStep(stepId, patch) { const state = getState(); patchState(getFlowPatch(state, (flow) => ({ ...flow, [stepId]: { ...(flow[stepId] || {}), ...patch, updatedAt: nowIso() } }))); renderDay(); }
function isOutboundDrive(flow, gps) { const speed = gpsSpeedKmh(gps); if (speed !== null && speed >= 15 && !stepDone(flow, 'arriveCamp')) return true; return stepDone(flow, 'depart') && !stepDone(flow, 'arriveCamp'); }
function isInboundDrive(flow, gps) { const speed = gpsSpeedKmh(gps); if (speed !== null && speed >= 15 && stepDone(flow, 'checkout') && !stepDone(flow, 'arriveHome')) return true; return stepDone(flow, 'checkout') && !stepDone(flow, 'arriveHome'); }
function inferStatus(state) {
  const flow = flowOf(state);
  const gps = latestGps(state);
  const speed = gpsSpeedKmh(gps);
  const hour = new Date().getHours();
  const override = state.activeDayStatusStep;
  if (override && STATUS_STEPS.some((step) => step.id === override)) { const step = stepById(override); return { step, phase: phaseOf(step.phase), confidence: '手動モード', drive: step.phase === 'driveOut' || step.phase === 'driveHome' }; }
  if (isInboundDrive(flow, gps)) return { step: stepById('driveHome'), phase: phaseOf('driveHome'), confidence: speed !== null && speed >= 15 ? 'GPS速度' : 'チェックアウト後', drive: true };
  if (isOutboundDrive(flow, gps)) return { step: stepById('driveOut'), phase: phaseOf('driveOut'), confidence: speed !== null && speed >= 15 ? 'GPS速度' : '出発後', drive: true };
  if (!stepDone(flow, 'depart')) return { step: stepById(hour >= 5 && hour <= 11 && !stepDone(flow, 'loadCar') ? 'loadCar' : 'depart'), phase: phaseOf('home'), confidence: '出発前', drive: false };
  if (!stepDone(flow, 'arriveCamp')) return { step: stepById('driveOut'), phase: phaseOf('driveOut'), confidence: '出発後', drive: true };
  if (!stepDone(flow, 'reception')) return { step: stepById('reception'), phase: phaseOf('arrival'), confidence: '到着後', drive: false };
  if (!stepDone(flow, 'tent')) return { step: stepById('tent'), phase: phaseOf('setup'), confidence: '受付後', drive: false };
  if (!stepDone(flow, 'dinner') && hour >= 15) return { step: stepById('dinner'), phase: phaseOf('meal'), confidence: '夕方', drive: false };
  if (!stepDone(flow, 'sleep') && hour >= 20) return { step: stepById('sleep'), phase: phaseOf('night'), confidence: '夜', drive: false };
  if (stepDone(flow, 'sleep') && !stepDone(flow, 'checkout')) return { step: stepById('teardown'), phase: phaseOf('teardown'), confidence: '翌朝/撤収前', drive: false };
  if (stepDone(flow, 'arriveHome')) return { step: stepById('homeCleanup'), phase: phaseOf('homeBack'), confidence: '帰宅後', drive: false };
  const next = nextIncomplete(flow);
  return { step: next, phase: phaseOf(next.phase), confidence: '未完了順', drive: next.phase === 'driveOut' || next.phase === 'driveHome' };
}
function progress(flow) { const required = STATUS_STEPS.filter((step) => step.required); const done = required.filter((step) => stepDone(flow, step.id)).length; return { done, total: required.length, pct: Math.round((done / required.length) * 100) }; }
function buildGoogleMapsUrl(state, direction = 'out') { const project = state.nextProject || {}; const c = context(state, project); const destination = direction === 'home' ? '自宅' : (project.reservation?.campground || project.title || c.campgroundSearchMemo || 'キャンプ場'); const base = 'https://www.google.com/maps/dir/?api=1&travelmode=driving'; return `${base}&destination=${encodeURIComponent(destination)}`; }
function openGoogleMaps(direction = 'out') { const state = getState(); const key = projectKey(state); const url = buildGoogleMapsUrl(state, direction); const event = { id: makeId('maps'), type: 'google_maps_opened', label: direction === 'home' ? 'Google Maps 帰路起動' : 'Google Maps 往路起動', status: 'inferred', candidateStepId: direction === 'home' ? 'driveHome' : 'driveOut', candidateStepLabel: direction === 'home' ? '帰路ドライブ' : '往路ドライブ', reason: 'ドライブモードでGoogle Mapsを使用', createdAt: nowIso(), url };
  patchState({ dayAutoEvents: { ...(state.dayAutoEvents || {}), [key]: [event, ...autoEventsOf(state, key)].slice(0, 90) } });
  window.open(url, '_blank', 'noopener');
  toast('Google Mapsを開きます');
}
function autoEventTypeFromGps(status, gps) { const speed = gpsSpeedKmh(gps); if (speed !== null && speed >= 15) return status.step.phase === 'driveHome' ? 'return_drive' : 'outbound_drive'; if (speed !== null && speed > 1.5) return 'walk_or_explore'; if (status.drive) return 'drive_stop'; return 'stay_or_stop'; }
function autoEventLabel(type) { return { outbound_drive: '往路走行候補', return_drive: '帰路走行候補', drive_stop: '停車イベント候補', walk_or_explore: '散歩/場内移動候補', stay_or_stop: '滞在/作業候補' }[type] || '状態候補'; }
function addAutoEventFromGps(gps) { const state = getState(); const key = projectKey(state); const status = inferStatus(state); const type = autoEventTypeFromGps(status, gps); const event = { id: makeId('dayauto'), type, label: autoEventLabel(type), status: 'inferred', candidateStepId: status.step.id, candidateStepLabel: status.step.label, reason: `${gpsStateLabel(gps)} / ${status.confidence}`, createdAt: nowIso(), gps }; patchState({ dayAutoEvents: { ...(state.dayAutoEvents || {}), [key]: [event, ...autoEventsOf(state, key)].slice(0, 90) } }); }
function saveGpsHint() { if (!navigator.geolocation) return toast('この端末はGPS未対応です'); navigator.geolocation.getCurrentPosition((pos) => { const state = getState(); const key = projectKey(state); const hint = { id: makeId('gps'), lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, speed: pos.coords.speed, capturedAt: nowIso(), source: 'day-connect' }; patchState({ dayGpsHints: { ...(state.dayGpsHints || {}), [key]: [hint, ...gpsHintsOf(state, key)].slice(0, 30) } }); addAutoEventFromGps(hint); toast('GPSから候補を更新'); renderDay(); }, () => toast('GPSを取得できませんでした'), { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }); }
function connectionCandidatesFromText(text = '', step = STATUS_STEPS[0]) { const out = new Set(safeList(step.tags)); if (/買|出発|到着|寄り道|休憩|給油|ガソリン|渋滞|Google|マップ|MAP|SA|PA|道の駅/.test(text)) out.add('route'); if (/料理|朝食|昼食|夕食|食材|味|量|多すぎ|少ない|余り|エビ|肉|ピザ|片付け/.test(text)) out.add('meal'); if (/ギア|テント|タープ|ペグ|イス|机|濡|乾燥|忘れ|不要|積み込み|充電/.test(text)) out.add('gear'); if (/コタ|犬|散歩|暑|寒|水|日陰|足|車内|休憩/.test(text)) out.add('kota'); if (/雨|風|寒|暑|気温|湿度|天気|乾燥|結露/.test(text)) out.add('weather'); if (/写真|景色|レビュー|思い出|探索|場内/.test(text)) out.add('memory'); if (/次回|改善|後悔|失敗|注意|足りない|戻す|買う/.test(text)) out.add('next'); if (/準備|持つ|持っていく|家にある/.test(text)) out.add('prep'); return [...out].filter((tag) => CONNECTIONS[tag]).slice(0, 6); }
function contextSnapshot(state, status) { const project = state.nextProject || {}; const c = context(state, project); const flow = flowOf(state); const step = status.step; return { build: BUILD_LABEL, projectKey: projectKey(state), projectName: projectName(project), projectDate: projectDate(project), statusStepId: step.id, statusStepLabel: step.label, mode: step.mode, phase: step.phase, phaseLabel: status.phase.label, plannedTime: plannedTime(step, state), actualStart: flow[step.id]?.actualStart || '', actualDone: flow[step.id]?.doneAt || '', drift: driftText(step, flow[step.id]?.actualStart || flow[step.id]?.doneAt, state), gps: latestGps(state), gpsLabel: gpsStateLabel(latestGps(state)), confidence: status.confidence, weatherMemo: c.weatherDecisionMemo || c.weatherMemo || '', routeMemo: c.routeMemo || '', menuMemo: c.menuMemo || c.fixedDishMemo || '', gearMemo: c.gearMemo || '', kotaMemo: c.kotaMemo || '', captureAt: nowIso() }; }
function inferRecordCandidates(record, state) { const text = `${record.detail || ''} ${record.title || ''} ${record.contextSnapshot?.statusStepLabel || ''} ${record.contextSnapshot?.weatherMemo || ''} ${record.contextSnapshot?.menuMemo || ''} ${record.contextSnapshot?.gearMemo || ''} ${record.contextSnapshot?.kotaMemo || ''}`; return connectionCandidatesFromText(text, stepById(record.statusStepId)).map((tag) => ({ tag, label: CONNECTIONS[tag].label, reason: CONNECTIONS[tag].hint, source: tag === 'drive' || tag === 'route' ? 'gps/route/text' : 'mode/text' })); }
function addConnectQueueItems(state, record, tags) { const key = projectKey(state); const current = connectQueueOf(state, key); const items = tags.map((tag) => ({ id: makeId('connect'), recordId: record.id, tag, label: CONNECTIONS[tag]?.label || tag, status: 'candidate', createdAt: nowIso(), reason: CONNECTIONS[tag]?.hint || '連携候補' })); return { dayConnectQueue: { ...(state.dayConnectQueue || {}), [key]: [...items, ...current].slice(0, 100) } }; }
function appendRecord(type, detail = '', mode = 'now') { const state = getState(); const key = projectKey(state); const status = inferStatus(state); const memo = detail || document.getElementById('dayStatusMemo')?.value?.trim() || ''; if (type === 'note' && !memo) return toast('メモを入力してください'); const record = { id: makeId('dayrec'), record_id: makeId('dayrec'), type, captureMode: mode, title: `${RECORD_TYPES[type] || '記録'}：${status.step.mode}`, detail: memo, statusStepId: status.step.id, statusStepLabel: status.step.label, modeLabel: status.step.mode, recordStatus: mode === 'later' ? 'later' : 'unconfirmed', createdAt: nowIso(), contextSnapshot: contextSnapshot(state, status) }; record.inferenceCandidates = inferRecordCandidates(record, state); const tags = safeList(record.inferenceCandidates).map((item) => item.tag); const patch = { dayRecords: { ...(state.dayRecords || {}), [key]: [record, ...recordsOf(state, key)] }, ...addConnectQueueItems(state, record, tags) }; patchState(patch); toast(mode === 'later' ? 'あとで整理に保存' : '未確認記録として保存'); renderDay(); }
function logCorrection(state, item) { const key = projectKey(state); return { dayCorrections: { ...(state.dayCorrections || {}), [key]: [item, ...correctionsOf(state, key)].slice(0, 80) } }; }
function updateRecord(recordId, updater, message = '更新しました') { const state = getState(); const key = projectKey(state); const records = recordsOf(state, key); const target = records.find((record) => record.id === recordId || record.record_id === recordId); const next = records.map((record) => (record.id === recordId || record.record_id === recordId) ? updater(record) : record); const correction = { id: makeId('fix'), kind: 'record', recordId, before: target, at: nowIso(), message }; patchState({ dayRecords: { ...(state.dayRecords || {}), [key]: next }, ...logCorrection(state, correction) }); toast(message); renderDay(); }
function markRecordWrong(recordId) { updateRecord(recordId, (record) => ({ ...record, previousRecordStatus: record.recordStatus || 'unconfirmed', recordStatus: 'wrong', wrongAt: nowIso() }), '間違いとして保留'); }
function confirmRecord(recordId) { updateRecord(recordId, (record) => ({ ...record, previousRecordStatus: record.recordStatus || 'unconfirmed', recordStatus: 'confirmed', confirmedAt: nowIso() }), '記録を確定'); }
function deferRecord(recordId) { updateRecord(recordId, (record) => ({ ...record, previousRecordStatus: record.recordStatus || 'unconfirmed', recordStatus: 'later', deferAt: nowIso() }), 'あとで確認へ移動'); }
function moveRecord(recordId, stepId) { const step = stepById(stepId); updateRecord(recordId, (record) => ({ ...record, previousStepId: record.statusStepId, statusStepId: step.id, statusStepLabel: step.label, modeLabel: step.mode, previousRecordStatus: record.recordStatus || 'unconfirmed', recordStatus: 'corrected', correctedAt: nowIso() }), `${step.mode}へ移動`); }
function undoLastCorrection() { const state = getState(); const key = projectKey(state); const corrections = correctionsOf(state, key); const last = corrections[0]; if (!last?.before?.id) return toast('戻せる修正がありません'); const records = recordsOf(state, key); const restored = records.map((record) => (record.id === last.before.id || record.record_id === last.before.record_id) ? last.before : record); patchState({ dayRecords: { ...(state.dayRecords || {}), [key]: restored }, dayCorrections: { ...(state.dayCorrections || {}), [key]: corrections.slice(1) } }); toast('直前の修正を戻しました'); renderDay(); }
function confirmCurrentStatus() { const state = getState(); const status = inferStatus(state); const at = nowIso(); setStep(status.step.id, { actualStart: flowOf(state)[status.step.id]?.actualStart || at, doneAt: at, status: 'confirmed', source: 'user-confirm' }); toast(`${status.step.label}を確定`); }
function switchMode(stepId) { const state = getState(); const key = projectKey(state); const step = stepById(stepId); const log = { id: makeId('mode'), stepId: step.id, label: step.label, mode: step.mode, at: nowIso(), source: 'user-switch' }; patchState({ activeDayStatusStep: step.id, dayModeLog: { ...(state.dayModeLog || {}), [key]: [log, ...modeLogOf(state, key)].slice(0, 80) } }); toast(`${step.mode}に切替`); renderDay(); }
function markDifferent() { const state = getState(); const flow = flowOf(state); const current = inferStatus(state).step; const start = STATUS_STEPS.findIndex((step) => step.id === current.id); const next = STATUS_STEPS.slice(start + 1).find((step) => !stepDone(flow, step.id)) || nextIncomplete(flow, true); switchMode(next.id); }
function confirmAutoEvent(eventId) { const state = getState(); const key = projectKey(state); const events = autoEventsOf(state, key).map((event) => event.id === eventId ? { ...event, status: 'confirmed', confirmedAt: nowIso() } : event); const target = events.find((event) => event.id === eventId); const patch = { dayAutoEvents: { ...(state.dayAutoEvents || {}), [key]: events } }; if (target?.candidateStepId) { const flow = flowOf(state, key); patch.dayFlowState = { ...(state.dayFlowState || {}), [key]: { ...flow, [target.candidateStepId]: { ...(flow[target.candidateStepId] || {}), actualStart: (flow[target.candidateStepId] || {}).actualStart || target.createdAt, doneAt: (flow[target.candidateStepId] || {}).doneAt || target.createdAt, status: 'confirmed', source: 'auto-event-confirm', updatedAt: nowIso() } } }; } patchState(patch); toast('候補を確定'); renderDay(); }
function dismissAutoEvent(eventId) { const state = getState(); const key = projectKey(state); patchState({ dayAutoEvents: { ...(state.dayAutoEvents || {}), [key]: autoEventsOf(state, key).map((event) => event.id === eventId ? { ...event, status: 'dismissed', dismissedAt: nowIso() } : event) } }); toast('候補を却下'); renderDay(); }
function renderHero(state, project, status, flow, records, events) { const step = status.step; const gps = latestGps(state); const plan = plannedTime(step, state); const actual = flow[step.id]?.actualStart || flow[step.id]?.doneAt; const drift = driftText(step, actual, state); const prog = progress(flow); const heroClass = status.drive ? 'd7-hero drive' : 'd7-hero'; const mainLabel = status.drive ? (step.phase === 'driveHome' ? '帰路ドライブ中' : '往路ドライブ中') : `${step.mode}モード`; return `<section class="${heroClass}">
    <div class="d7-hero-top"><span>OUTBASE 当日コネクト</span><button id="gpsSuggest" type="button">GPS更新</button></div>
    <div class="d7-camp-name">${escapeHtml(projectName(project))}${projectDate(project) ? ` / ${escapeHtml(projectDate(project))}` : ''}</div>
    <div class="d7-now">今の状態</div>
    <h2>${escapeHtml(mainLabel)}</h2>
    <p>${escapeHtml(step.sub)}</p>
    <div class="d7-metrics"><span>${escapeHtml(status.confidence)}</span><span>${escapeHtml(gpsStateLabel(gps))}</span>${plan ? `<span>予定 ${escapeHtml(plan)}</span>` : ''}${drift ? `<strong>${escapeHtml(drift)}</strong>` : ''}<span>${prog.done}/${prog.total}完了</span></div>
    <div class="d7-state-actions"><button id="confirmStatus" class="primary">この状態で確定</button><button id="differentStatus">違う</button><button id="undoCorrection">戻す</button></div>
    ${status.drive ? `<div class="d7-drive-actions"><button id="openGoogleMaps" class="maps">Google Mapsで開く</button><button data-record-type="voice">声で残す</button><button data-record-type="later">あとで</button></div>` : ''}
    <div class="d7-safe-note">間違い前提。違う/移動/戻すで修正できる。分類は候補まで。</div>
  </section>`; }
function chipList(items, emptyText, cls = '') { return items.length ? items.map((item) => `<span class="${cls}">${escapeHtml(item.label)}</span>`).join('') : `<em>${escapeHtml(emptyText)}</em>`; }
function renderSnapshot(state, flow) { const done = doneSteps(flow, 4); const remain = remainingSteps(flow, 4); const events = autoEventsOf(state).filter((event) => !['confirmed', 'dismissed'].includes(event.status)).slice(0, 3); const wrong = recordsOf(state).filter((record) => ['wrong', 'later', 'unconfirmed'].includes(record.recordStatus)).slice(0, 3); return `<section class="d7-snapshot">
    <article><strong>終わったこと</strong><div>${chipList(done, 'まだ確定なし', 'done')}</div></article>
    <article><strong>残っていること</strong><div>${chipList(remain, '主な残件なし', 'remain')}</div></article>
    <article><strong>未確認/間違い</strong><div>${wrong.length ? wrong.map((record) => `<button class="d7-auto-mini" data-confirm-record="${escapeHtml(record.id)}">${escapeHtml(RECORD_STATUSES[record.recordStatus] || '未確認')}</button>`).join('') : '<em>未確認なし</em>'}</div></article>
    <article><strong>自動で拾った候補</strong><div>${events.length ? events.map((event) => `<button class="d7-auto-mini" data-confirm-event="${escapeHtml(event.id)}">${escapeHtml(event.label)}</button>`).join('') : '<em>GPS/Mapsで候補化</em>'}</div></article>
  </section>`; }
function renderCapture(status) { const drive = status.drive; return `<section class="d7-capture ${drive ? 'drive' : ''}">
    <div class="d7-action-grid">
      ${drive ? '' : '<button data-record-type="photo" class="photo"><strong>写真</strong><small>撮るだけ</small></button>'}
      <button id="focusMemo"><strong>メモ</strong><small>一言だけ</small></button>
      <button data-record-type="voice"><strong>音声</strong><small>話すだけ</small></button>
      <button data-record-type="later"><strong>あとで</strong><small>未分類で保存</small></button>
    </div>
    <div class="d7-memo-row"><textarea id="dayStatusMemo" class="field textarea" placeholder="例：給油じゃなくてコンビニ休憩 / 設営写真 / コタ暑そう / エビ多かった"></textarea><button id="saveStatusMemo">残す</button></div>
    <input id="photoInput" type="file" accept="image/*" hidden />
  </section>`; }
function renderRecords(records) { return `<section class="d7-inbox"><div class="d7-inbox-head"><strong>今日残したもの</strong><span>${records.length}件</span></div>${records.length ? records.slice(0, 4).map(renderRecord).join('') : '<p class="empty-line">写真・声・メモを残すだけ。間違ってもあとで直せます。</p>'}</section>`; }
function renderRecord(record) { const candidates = safeList(record.inferenceCandidates).slice(0, 3); return `<article class="d7-record ${escapeHtml(record.recordStatus || 'unconfirmed')}"><div><strong>${escapeHtml(record.title || '記録')}</strong><time>${escapeHtml(formatTime(record.createdAt))}</time></div>${record.detail ? `<p>${escapeHtml(record.detail)}</p>` : ''}<div class="d7-record-tags"><span>${escapeHtml(RECORD_STATUSES[record.recordStatus] || '未確認')}</span><span>${escapeHtml(record.modeLabel || record.statusStepLabel || '未整理')}</span>${candidates.map((item) => `<span>${escapeHtml(item.label)}</span>`).join('')}</div><div class="d7-record-actions"><button data-confirm-record="${escapeHtml(record.id)}">確定</button><button data-wrong-record="${escapeHtml(record.id)}">違う</button><button data-defer-record="${escapeHtml(record.id)}">あとで</button></div></article>`; }
function renderConnections(state) { const queue = connectQueueOf(state).filter((item) => item.status !== 'accepted').slice(0, 6); return `<section class="d7-connect"><div class="d7-connect-head"><strong>連携候補</strong><span>準備・料理・ギア・コタ・次回へ</span></div>${queue.length ? queue.map((item) => `<button data-connect-id="${escapeHtml(item.id)}"><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.reason || '')}</small></button>`).join('') : '<p class="empty-line">記録すると連携候補がここに出ます。</p>'}</section>`; }
function renderAutoEvents(state) { const events = autoEventsOf(state).filter((event) => !['confirmed', 'dismissed'].includes(event.status)).slice(0, 5); return `<section class="d7-events"><div class="d7-connect-head"><strong>自動候補</strong><span>確定しない限り反映しない</span></div>${events.length ? events.map((event) => `<article><div><strong>${escapeHtml(event.label)}</strong><small>${escapeHtml(formatDayTime(event.createdAt))}</small></div><p>${escapeHtml(event.reason || '')}</p><button data-confirm-event="${escapeHtml(event.id)}">確定</button><button data-dismiss-event="${escapeHtml(event.id)}">違う</button></article>`).join('') : '<p class="empty-line">Google Maps起動、GPS更新、停車などを候補として残します。</p>'}</section>`; }
function renderModeDrawer(state, flow, status) { return `<details class="d7-flow"><summary><strong>モードを切り替える</strong><span>設営・料理・散歩・撤収など</span></summary><div class="d7-mode-grid">${Object.entries(PHASES).map(([phaseKey, phase]) => `<section><h3>${escapeHtml(phase.label)}</h3>${STATUS_STEPS.filter((step) => step.phase === phaseKey).map((step) => { const cls = [status.step.id === step.id ? 'active' : '', stepDone(flow, step.id) ? 'done' : '', step.required ? 'required' : ''].filter(Boolean).join(' '); return `<button class="${cls}" data-select-status="${escapeHtml(step.id)}"><strong>${escapeHtml(step.label)}</strong><small>${escapeHtml(stepDone(flow, step.id) ? '確定済み' : plannedTime(step, state) || step.sub)}</small></button>`; }).join('')}</section>`).join('')}</div></details>`; }
export function renderDay() { const state = getState(); const project = state.nextProject || {}; const key = projectKey(state); const flow = flowOf(state, key); const records = recordsOf(state, key); const events = autoEventsOf(state, key); const status = inferStatus(state); app().innerHTML = `<section class="route-page d7-day-page">
    ${renderHero(state, project, status, flow, records, events)}
    ${renderSnapshot(state, flow)}
    ${renderCapture(status)}
    ${renderRecords(records)}
    ${renderConnections(state)}
    ${renderAutoEvents(state)}
    ${renderModeDrawer(state, flow, status)}
  </section>`;
  document.getElementById('gpsSuggest')?.addEventListener('click', saveGpsHint);
  document.getElementById('confirmStatus')?.addEventListener('click', confirmCurrentStatus);
  document.getElementById('differentStatus')?.addEventListener('click', markDifferent);
  document.getElementById('undoCorrection')?.addEventListener('click', undoLastCorrection);
  document.getElementById('openGoogleMaps')?.addEventListener('click', () => openGoogleMaps(status.step.phase === 'driveHome' ? 'home' : 'out'));
  document.getElementById('focusMemo')?.addEventListener('click', () => document.getElementById('dayStatusMemo')?.focus());
  document.getElementById('saveStatusMemo')?.addEventListener('click', () => appendRecord('note'));
  document.querySelectorAll('[data-select-status]').forEach((button) => button.addEventListener('click', () => switchMode(button.dataset.selectStatus)));
  document.querySelectorAll('[data-confirm-event]').forEach((button) => button.addEventListener('click', () => confirmAutoEvent(button.dataset.confirmEvent)));
  document.querySelectorAll('[data-dismiss-event]').forEach((button) => button.addEventListener('click', () => dismissAutoEvent(button.dataset.dismissEvent)));
  document.querySelectorAll('[data-confirm-record]').forEach((button) => button.addEventListener('click', () => confirmRecord(button.dataset.confirmRecord)));
  document.querySelectorAll('[data-wrong-record]').forEach((button) => button.addEventListener('click', () => markRecordWrong(button.dataset.wrongRecord)));
  document.querySelectorAll('[data-defer-record]').forEach((button) => button.addEventListener('click', () => deferRecord(button.dataset.deferRecord)));
  document.querySelectorAll('[data-record-type]').forEach((button) => button.addEventListener('click', () => { const type = button.dataset.recordType; if (type === 'photo') return document.getElementById('photoInput')?.click(); if (type === 'later') return appendRecord('later', document.getElementById('dayStatusMemo')?.value?.trim() || 'あとで整理', 'later'); return appendRecord(type, type === 'voice' ? '音声メモを追加' : '', 'now'); }));
  document.getElementById('photoInput')?.addEventListener('change', (event) => appendRecord('photo', event.target.files?.[0]?.name || '写真を追加'));
}
