import { app, escapeHtml, toast } from '../../ui/components.js?v=core08-d9-nav-autolog-layer-20260705';
import { getState, patchState } from '../../core/store.js?v=core08-d9-nav-autolog-layer-20260705';

const BUILD_LABEL = 'Core08-D8';

const STATUS_STEPS = [
  { id: 'wake', phase: 'home', mode: '出発前', label: '起床', sub: '起床・朝食・積み込み', required: true, tags: ['home'] },
  { id: 'loadCar', phase: 'home', mode: '出発前', label: '積み込み', sub: '当日積む物・コタ用品', required: true, tags: ['gear', 'kota'] },
  { id: 'depart', phase: 'driveOut', mode: '往路ドライブ', label: '出発', sub: 'Google Mapsで移動開始', required: true, tags: ['drive', 'route'] },
  { id: 'restOut', phase: 'driveOut', mode: '往路ドライブ', label: '休憩/買い出し/給油', sub: '停車候補は未確認箱へ', tags: ['drive', 'shopping', 'kota'] },
  { id: 'arriveCamp', phase: 'arrival', mode: '到着受付', label: 'キャンプ場到着', sub: '到着・受付・サイト移動', required: true, tags: ['drive', 'site'] },
  { id: 'layout', phase: 'setup', mode: '設営', label: 'レイアウト考察', sub: '風・日陰・導線', required: true, tags: ['setup', 'weather', 'kota'] },
  { id: 'tent', phase: 'setup', mode: '設営', label: 'テント/タープ/外回り', sub: '設営写真はここ候補', required: true, tags: ['setup', 'gear'] },
  { id: 'explore', phase: 'stay', mode: '散歩探索', label: '散歩/探索/休憩', sub: '場内・景色・トイレ・コタ', tags: ['walk', 'site', 'kota'] },
  { id: 'dinner', phase: 'meal', mode: '料理', label: '夕食/片付け', sub: '料理量・味・食材・片付け', required: true, tags: ['meal'] },
  { id: 'sleep', phase: 'night', mode: '就寝', label: '就寝', sub: '寒暖・寝具・コタ', required: true, tags: ['weather', 'gear', 'kota'] },
  { id: 'morning', phase: 'morning', mode: '翌朝', label: '翌朝/朝食', sub: '朝の状態・朝食', tags: ['meal', 'weather'] },
  { id: 'teardown', phase: 'teardown', mode: '撤収', label: '撤収', sub: '濡れ物・忘れ物・積み込み', required: true, tags: ['teardown', 'gear', 'weather'] },
  { id: 'checkout', phase: 'teardown', mode: '撤収', label: 'チェックアウト', sub: 'ゴミ・受付・最終確認', required: true, tags: ['drive', 'teardown'] },
  { id: 'driveHome', phase: 'driveHome', mode: '帰路ドライブ', label: '帰路ドライブ', sub: 'Google Maps・観光・休憩', required: true, tags: ['drive', 'route'] },
  { id: 'arriveHome', phase: 'homeBack', mode: '帰宅後', label: '帰宅/片付け', sub: '干す・洗う・充電・次回注意', required: true, tags: ['gear', 'next'] }
];

const PHASES = {
  home: { label: '出発前', sub: '起床・積み込み・給油' },
  driveOut: { label: '往路ドライブ', sub: 'Google Maps・休憩・買い出し・コタ休憩' },
  arrival: { label: '到着受付', sub: '到着・受付・サイト移動' },
  setup: { label: '設営', sub: 'レイアウト・テント・タープ' },
  stay: { label: 'サイト滞在', sub: '休憩・散歩・探索' },
  meal: { label: '料理', sub: '食事・量・片付け' },
  night: { label: '就寝', sub: '寝具・気温・コタ' },
  morning: { label: '翌朝', sub: '朝食・結露・朝の状態' },
  teardown: { label: '撤収', sub: '撤収・チェックアウト' },
  driveHome: { label: '帰路ドライブ', sub: 'Google Maps・観光・休憩' },
  homeBack: { label: '帰宅後', sub: '片付け・次回注意' }
};

const RECORD_TYPES = { note: 'メモ', photo: '写真', voice: '音声', later: 'あとで' };
const STATUS_LABELS = { confirmed: '確定', inferred: '推定', unconfirmed: '未確認', wrong: '間違い', corrected: '修正済み', dismissed: '却下', later: 'あとで確認' };

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
function backupsOf(state = getState(), key = projectKey(state)) { return safeList(state.dayTestBackups?.[key]); }
function stepById(id) { return STATUS_STEPS.find((step) => step.id === id) || STATUS_STEPS[0]; }
function stepDone(flow, id) { return Boolean(flow[id]?.doneAt || flow[id]?.status === 'confirmed'); }
function formatTime(value) { if (!value) return ''; try { return new Date(value).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }); } catch { return String(value); } }
function formatDayTime(value) { if (!value) return ''; try { return new Date(value).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return String(value); } }
function latestGpsFromWalkSession(state) { const points = safeList(state.walkSession?.gpsPoints); return points[points.length - 1] || null; }
function latestGps(state) { return latestGpsFromWalkSession(state) || gpsHintsOf(state)[0] || null; }
function gpsSpeedKmh(gps) { const speed = Number(gps?.speed); return Number.isFinite(speed) ? Math.max(0, speed * 3.6) : null; }
function gpsStateLabel(gps) { if (!gps) return 'GPS未取得'; const speed = gpsSpeedKmh(gps); if (speed === null) return '位置あり'; if (speed > 35) return '走行中っぽい'; if (speed > 6) return '移動中っぽい'; return '滞在中っぽい'; }
function activeStep(state) { const flow = flowOf(state); if (state.activeDayStatusStep) return stepById(state.activeDayStatusStep); const gps = latestGps(state); const speed = gpsSpeedKmh(gps); if (speed !== null && speed > 30) {
    const checkoutDone = stepDone(flow, 'checkout');
    return stepById(checkoutDone ? 'driveHome' : 'driveOut');
  }
  return STATUS_STEPS.find((step) => !stepDone(flow, step.id) && step.required) || STATUS_STEPS.find((step) => !stepDone(flow, step.id)) || stepById('homeCleanup');
}
function progress(flow) { const done = STATUS_STEPS.filter((step) => stepDone(flow, step.id)).length; return { done, remaining: Math.max(0, STATUS_STEPS.length - done), total: STATUS_STEPS.length }; }
function unresolvedRecords(state) { return recordsOf(state).filter((record) => ['unconfirmed', 'wrong', 'later'].includes(record.recordStatus || 'unconfirmed')); }
function unresolvedEvents(state) { return autoEventsOf(state).filter((event) => !['confirmed', 'dismissed'].includes(event.status)); }
function unresolvedTotal(state) { return unresolvedRecords(state).length + unresolvedEvents(state).length; }
function doneLabels(flow, limit = 3) { return STATUS_STEPS.filter((step) => stepDone(flow, step.id)).slice(-limit).map((step) => step.label); }
function remainLabels(flow, limit = 3) { return STATUS_STEPS.filter((step) => !stepDone(flow, step.id) && step.required).slice(0, limit).map((step) => step.label); }
function isDriveStep(step) { return ['driveOut', 'driveHome'].includes(step.phase); }

function candidateLabels(step, text = '') {
  const raw = `${step.label} ${step.sub} ${step.tags?.join(' ') || ''} ${text}`;
  const result = [];
  if (/コタ|犬|散歩|暑|水/.test(raw)) result.push('コタ');
  if (/料理|夕食|朝食|食材|エビ|量|味|片付け/.test(raw)) result.push('料理');
  if (/ギア|テント|タープ|設営|撤収|濡|忘れ/.test(raw)) result.push('ギア');
  if (/Google|ドライブ|給油|休憩|買い出し|到着|出発/.test(raw)) result.push('ルート');
  if (/雨|風|暑|寒|結露|乾燥/.test(raw)) result.push('天気');
  result.push('次回');
  return [...new Set(result)].slice(0, 4);
}
function inferenceFor(step, detail = '') { return candidateLabels(step, detail).map((label) => ({ label, status: 'candidate' })); }
function queueFor(record, step) {
  return inferenceFor(step, record.detail || '').slice(0, 3).map((item) => ({
    id: makeId('connect'),
    sourceId: record.id,
    label: `${item.label}に戻せそう`,
    reason: record.detail || record.title || step.label,
    status: 'candidate',
    createdAt: nowIso()
  }));
}

function patchProjectMap(key, mapName, value, state = getState()) { return { ...(state[mapName] || {}), [key]: value }; }
function saveGpsHint() {
  const state = getState();
  const key = projectKey(state);
  const hint = { id: makeId('gps'), createdAt: nowIso(), lat: null, lng: null, speed: null, label: 'GPS更新候補', source: BUILD_LABEL };
  const save = (point) => {
    const gps = { ...hint, ...(point || {}) };
    const event = { id: makeId('auto'), label: gpsSpeedKmh(gps) && gpsSpeedKmh(gps) > 30 ? '走行候補' : '位置更新候補', reason: gpsStateLabel(gps), status: 'unconfirmed', createdAt: nowIso() };
    patchState({
      dayGpsHints: patchProjectMap(key, 'dayGpsHints', [gps, ...gpsHintsOf(state, key)].slice(0, 20), state),
      dayAutoEvents: patchProjectMap(key, 'dayAutoEvents', [event, ...autoEventsOf(state, key)].slice(0, 40), state)
    });
    toast('GPS候補を未確認箱へ保存'); renderDay();
  };
  if (!navigator.geolocation) return save(null);
  navigator.geolocation.getCurrentPosition((pos) => save({ lat: pos.coords.latitude, lng: pos.coords.longitude, speed: pos.coords.speed, accuracy: pos.coords.accuracy }), () => save(null), { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 });
}
function appendRecord(type = 'note', detail = '', status = 'unconfirmed') {
  const state = getState();
  const key = projectKey(state);
  const step = activeStep(state);
  const memoEl = document.getElementById('d8Memo');
  const text = detail || memoEl?.value?.trim() || (type === 'later' ? 'あとで整理' : '');
  const record = {
    id: makeId('dayrec'),
    type,
    title: type === 'later' ? 'あとで整理' : `${RECORD_TYPES[type] || '記録'}：${step.label}`,
    detail: text,
    createdAt: nowIso(),
    recordStatus: status,
    statusStepId: step.id,
    statusStepLabel: step.label,
    modeLabel: step.mode,
    inferenceCandidates: inferenceFor(step, text),
    source: BUILD_LABEL
  };
  patchState({
    dayRecords: patchProjectMap(key, 'dayRecords', [record, ...recordsOf(state, key)].slice(0, 100), state),
    dayConnectQueue: patchProjectMap(key, 'dayConnectQueue', [...queueFor(record, step), ...connectQueueOf(state, key)].slice(0, 80), state)
  });
  if (memoEl) memoEl.value = '';
  toast(type === 'later' ? 'あとで整理に入れました' : '未確認箱へ残しました');
  renderDay();
}
function confirmStatus() {
  const state = getState(); const key = projectKey(state); const step = activeStep(state); const flow = flowOf(state, key);
  patchState({ dayFlowState: patchProjectMap(key, 'dayFlowState', { ...flow, [step.id]: { ...(flow[step.id] || {}), status: 'confirmed', doneAt: nowIso() } }, state) });
  toast('今の状態を確定'); renderDay();
}
function markDifferent() {
  const state = getState(); const key = projectKey(state); const step = activeStep(state);
  const fix = { id: makeId('fix'), at: nowIso(), type: 'mode-wrong', before: step.id, message: `${step.label}ではなかった`, status: 'unconfirmed' };
  patchState({ dayCorrections: patchProjectMap(key, 'dayCorrections', [fix, ...correctionsOf(state, key)].slice(0, 60), state), activeDayStatusStep: '' });
  toast('違う候補として残しました'); renderDay();
}
function switchMode(stepId) {
  const state = getState(); const key = projectKey(state); const step = stepById(stepId);
  const log = { id: makeId('mode'), at: nowIso(), stepId: step.id, label: step.label, mode: step.mode, status: 'manual' };
  patchState({ activeDayStatusStep: step.id, dayModeLog: patchProjectMap(key, 'dayModeLog', [log, ...modeLogOf(state, key)].slice(0, 60), state) });
  toast(`${step.mode}に切り替え`); renderDay();
}
function updateRecord(id, status) {
  const state = getState(); const key = projectKey(state);
  patchState({ dayRecords: patchProjectMap(key, 'dayRecords', recordsOf(state, key).map((record) => record.id === id ? { ...record, recordStatus: status, updatedAt: nowIso() } : record), state) });
  toast(status === 'confirmed' ? '確定しました' : status === 'wrong' ? '間違いとして残しました' : 'あとで確認にしました'); renderDay();
}
function updateEvent(id, status) {
  const state = getState(); const key = projectKey(state);
  patchState({ dayAutoEvents: patchProjectMap(key, 'dayAutoEvents', autoEventsOf(state, key).map((event) => event.id === id ? { ...event, status, updatedAt: nowIso() } : event), state) });
  toast(status === 'confirmed' ? '自動候補を確定' : '候補を却下'); renderDay();
}
function openGoogleMaps() {
  const state = getState(); const key = projectKey(state); const project = state.nextProject || {}; const camp = projectName(project);
  const event = { id: makeId('auto'), label: 'Google Maps起動', reason: `${camp}への移動候補。戻ったらGPS/時刻で補完`, status: 'unconfirmed', createdAt: nowIso() };
  patchState({ dayAutoEvents: patchProjectMap(key, 'dayAutoEvents', [event, ...autoEventsOf(state, key)].slice(0, 40), state) });
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(camp)}`;
  window.open(url, '_blank', 'noopener');
  toast('Google Maps起動を未確認箱へ保存');
}
function resetDayTest() {
  const state = getState(); const key = projectKey(state);
  const ok = window.confirm('当日タブのテストデータだけリセットします。予定・準備・ギア台帳・本番の過去記録は消しません。');
  if (!ok) return;
  const backup = {
    id: makeId('daytest'), at: nowIso(), projectKey: key,
    dayRecords: recordsOf(state, key),
    dayGpsHints: gpsHintsOf(state, key),
    dayAutoEvents: autoEventsOf(state, key),
    dayCorrections: correctionsOf(state, key),
    dayConnectQueue: connectQueueOf(state, key),
    dayModeLog: modeLogOf(state, key),
    dayFlowState: flowOf(state, key),
    activeDayStatusStep: state.activeDayStatusStep || ''
  };
  patchState({
    dayRecords: patchProjectMap(key, 'dayRecords', [], state),
    dayGpsHints: patchProjectMap(key, 'dayGpsHints', [], state),
    dayAutoEvents: patchProjectMap(key, 'dayAutoEvents', [], state),
    dayCorrections: patchProjectMap(key, 'dayCorrections', [], state),
    dayConnectQueue: patchProjectMap(key, 'dayConnectQueue', [], state),
    dayModeLog: patchProjectMap(key, 'dayModeLog', [], state),
    dayFlowState: patchProjectMap(key, 'dayFlowState', {}, state),
    activeDayStatusStep: '',
    dayTestBackups: patchProjectMap(key, 'dayTestBackups', [backup, ...backupsOf(state, key)].slice(0, 3), state)
  }, { allowDayTestReset: true });
  toast('当日テストデータをリセット'); renderDay();
}
function restoreDayTest() {
  const state = getState(); const key = projectKey(state); const backup = backupsOf(state, key)[0];
  if (!backup) return toast('戻せるテストバックアップがありません');
  patchState({
    dayRecords: patchProjectMap(key, 'dayRecords', backup.dayRecords || [], state),
    dayGpsHints: patchProjectMap(key, 'dayGpsHints', backup.dayGpsHints || [], state),
    dayAutoEvents: patchProjectMap(key, 'dayAutoEvents', backup.dayAutoEvents || [], state),
    dayCorrections: patchProjectMap(key, 'dayCorrections', backup.dayCorrections || [], state),
    dayConnectQueue: patchProjectMap(key, 'dayConnectQueue', backup.dayConnectQueue || [], state),
    dayModeLog: patchProjectMap(key, 'dayModeLog', backup.dayModeLog || [], state),
    dayFlowState: patchProjectMap(key, 'dayFlowState', backup.dayFlowState || {}, state),
    activeDayStatusStep: backup.activeDayStatusStep || ''
  }, { allowDayTestReset: true });
  toast('リセット前に戻しました'); renderDay();
}

function renderHero(state, project, step, flow) {
  const prog = progress(flow); const unconfirmed = unresolvedTotal(state); const gps = latestGps(state); const drive = isDriveStep(step);
  const done = doneLabels(flow).join(' / ') || 'まだなし';
  const remain = remainLabels(flow).join(' / ') || '主な残件なし';
  return `<section class="d8-hero ${drive ? 'drive' : ''}">
    <div class="d8-top"><span>OUTBASE 当日シンプルハブ</span><button id="gpsSuggest" type="button">GPS</button></div>
    <div class="d8-camp">${escapeHtml(projectName(project))}${projectDate(project) ? ` / ${escapeHtml(projectDate(project))}` : ''}</div>
    <small>今の状態</small>
    <h2>${escapeHtml(step.mode)}っぽい</h2>
    <p>${escapeHtml(step.sub)}</p>
    <div class="d8-score"><strong>完了 ${prog.done}</strong><strong>残り ${prog.remaining}</strong><strong>未確認 ${unconfirmed}</strong></div>
    <div class="d8-one-line"><span>終わった：${escapeHtml(done)}</span><span>残り：${escapeHtml(remain)}</span></div>
    <div class="d8-actions"><button id="saveQuick" class="primary">残す</button><button id="differentStatus">違う</button><button data-record-type="later">あとで</button></div>
    ${drive ? `<div class="d8-drive"><button id="openGoogleMaps">Google Mapsで移動</button><span>${escapeHtml(gpsStateLabel(gps))}</span></div>` : `<div class="d8-drive muted"><span>${escapeHtml(gpsStateLabel(gps))}</span><button id="confirmStatus">この状態で確定</button></div>`}
  </section>`;
}
function renderCapture() { return `<section class="d8-capture">
    <textarea id="d8Memo" class="field textarea" placeholder="例：コタ暑そう / 設営写真 / エビ多かった / 給油じゃなくて休憩"></textarea>
    <div class="d8-capture-grid"><button data-record-type="photo">写真</button><button data-record-type="voice">音声</button><button id="saveMemo">メモ</button><button data-record-type="later">未分類で保存</button></div>
    <input id="photoInput" type="file" accept="image/*" hidden />
  </section>`; }
function renderUnconfirmed(state) { const records = unresolvedRecords(state).slice(0, 5); const events = unresolvedEvents(state).slice(0, 5); const count = records.length + events.length;
  return `<details class="d8-box" ${count ? '' : ''}><summary><strong>未確認箱</strong><span>${count}件 / 普段は開かなくてOK</span></summary>
    ${records.length ? records.map((record) => `<article><div><strong>${escapeHtml(record.title || '記録')}</strong><time>${escapeHtml(formatTime(record.createdAt))}</time></div><p>${escapeHtml(record.detail || STATUS_LABELS[record.recordStatus] || '未確認')}</p><div><button data-confirm-record="${escapeHtml(record.id)}">確定</button><button data-wrong-record="${escapeHtml(record.id)}">違う</button><button data-defer-record="${escapeHtml(record.id)}">あとで</button></div></article>`).join('') : ''}
    ${events.length ? events.map((event) => `<article><div><strong>${escapeHtml(event.label)}</strong><time>${escapeHtml(formatDayTime(event.createdAt))}</time></div><p>${escapeHtml(event.reason || '自動候補')}</p><div><button data-confirm-event="${escapeHtml(event.id)}">確定</button><button data-dismiss-event="${escapeHtml(event.id)}">違う</button></div></article>`).join('') : ''}
    ${!count ? '<p class="empty-line">未確認はありません。</p>' : ''}
  </details>`;
}
function renderModeDrawer(state, flow, step) { return `<details class="d8-box d8-mode"><summary><strong>今の状態を直す</strong><span>${escapeHtml(step.mode)}が違う時だけ開く</span></summary><div class="d8-mode-grid">${Object.entries(PHASES).map(([phaseKey, phase]) => `<section><h3>${escapeHtml(phase.label)}</h3>${STATUS_STEPS.filter((s) => s.phase === phaseKey).map((s) => `<button class="${s.id === step.id ? 'active' : ''} ${stepDone(flow, s.id) ? 'done' : ''}" data-select-status="${escapeHtml(s.id)}"><strong>${escapeHtml(s.label)}</strong><small>${escapeHtml(stepDone(flow, s.id) ? '完了済み' : s.sub)}</small></button>`).join('')}</section>`).join('')}</div></details>`; }
function renderConnectedSummary(state) { const queue = connectQueueOf(state).filter((item) => item.status !== 'accepted'); const labels = ['準備', '料理', 'ギア', 'コタ', '次回']; return `<section class="d8-summary"><div><strong>連携は裏で保存中</strong><span>${queue.length}件候補 / 確定するまで反映しない</span></div><div>${labels.map((l) => `<span>${escapeHtml(l)}</span>`).join('')}</div></section>`; }
function renderTestPanel(state) { const key = projectKey(state); const backup = backupsOf(state, key)[0]; return `<details class="d8-box d8-test"><summary><strong>テスト中</strong><span>当日だけリセットできる</span></summary><p>予定・準備・料理予定・ギア台帳・本番の過去記録は消しません。</p><button id="resetDayTest" class="danger">当日データだけリセット</button>${backup ? `<button id="restoreDayTest">リセット前に戻す</button><small>保存：${escapeHtml(formatDayTime(backup.at))}</small>` : ''}</details>`; }

export function renderDay() {
  const state = getState(); const project = state.nextProject || {}; const flow = flowOf(state); const step = activeStep(state);
  app().innerHTML = `<section class="route-page d8-day-page">
    ${renderHero(state, project, step, flow)}
    ${renderCapture()}
    ${renderUnconfirmed(state)}
    ${renderConnectedSummary(state)}
    ${renderModeDrawer(state, flow, step)}
    ${renderTestPanel(state)}
  </section>`;
  document.getElementById('gpsSuggest')?.addEventListener('click', saveGpsHint);
  document.getElementById('openGoogleMaps')?.addEventListener('click', openGoogleMaps);
  document.getElementById('confirmStatus')?.addEventListener('click', confirmStatus);
  document.getElementById('differentStatus')?.addEventListener('click', markDifferent);
  document.getElementById('saveQuick')?.addEventListener('click', () => document.getElementById('d8Memo')?.focus());
  document.getElementById('saveMemo')?.addEventListener('click', () => appendRecord('note'));
  document.getElementById('resetDayTest')?.addEventListener('click', resetDayTest);
  document.getElementById('restoreDayTest')?.addEventListener('click', restoreDayTest);
  document.querySelectorAll('[data-select-status]').forEach((button) => button.addEventListener('click', () => switchMode(button.dataset.selectStatus)));
  document.querySelectorAll('[data-confirm-record]').forEach((button) => button.addEventListener('click', () => updateRecord(button.dataset.confirmRecord, 'confirmed')));
  document.querySelectorAll('[data-wrong-record]').forEach((button) => button.addEventListener('click', () => updateRecord(button.dataset.wrongRecord, 'wrong')));
  document.querySelectorAll('[data-defer-record]').forEach((button) => button.addEventListener('click', () => updateRecord(button.dataset.deferRecord, 'later')));
  document.querySelectorAll('[data-confirm-event]').forEach((button) => button.addEventListener('click', () => updateEvent(button.dataset.confirmEvent, 'confirmed')));
  document.querySelectorAll('[data-dismiss-event]').forEach((button) => button.addEventListener('click', () => updateEvent(button.dataset.dismissEvent, 'dismissed')));
  document.querySelectorAll('[data-record-type]').forEach((button) => button.addEventListener('click', () => { const type = button.dataset.recordType; if (type === 'photo') return document.getElementById('photoInput')?.click(); if (type === 'later') return appendRecord('later', document.getElementById('d8Memo')?.value?.trim() || 'あとで整理', 'later'); return appendRecord(type, type === 'voice' ? '音声メモを追加' : ''); }));
  document.getElementById('photoInput')?.addEventListener('change', (event) => appendRecord('photo', event.target.files?.[0]?.name || '写真を追加'));
}
