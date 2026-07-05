import { app, card, escapeHtml, toast } from '../../ui/components.js?v=core08-e3-mvp-integrated-20260705';
import { getState, patchState } from '../../core/store.js?v=core08-e3-mvp-integrated-20260705';

const BUILD = 'core08-e3-mvp-integrated-20260705';
const RECORD_LIMIT = 240;
let speechRecognition = null;
let timer = null;
let geoWatchId = null;
let geoWatchKey = '';

const ACTIVITY_META = {
  walk: { label: '散歩', short: '散歩', sub: '自宅散歩。時間・距離・GPS・コタの様子', gps: true, icon: '🐾', kind: 'walk' },
  drive: { label: 'ドライブ', short: '運転', sub: 'Google Maps・停車・買い出し・給油候補', gps: true, icon: '🚗', kind: 'drive' },
  setup: { label: '設営', short: '設営', sub: 'テント・タープ・レイアウト・注意点', gps: false, icon: '⛺', kind: 'camp' },
  cook: { label: '料理', short: '料理', sub: '写真・量・味・余り・次回改善', gps: false, icon: '🍳', kind: 'camp' },
  teardown: { label: '撤収', short: '撤収', sub: '濡れ物・収納・忘れ物・乾燥', gps: false, icon: '📦', kind: 'camp' },
  campWalk: { label: '場内探索', short: '探索', sub: 'キャンプ場散歩。設備・景色・注意・犬導線', gps: true, icon: '🧭', kind: 'camp' }
};

const FLOW_STEPS = [
  { id: 'before', label: '出発前', hint: '積み込み・朝食・給油・忘れ物' },
  { id: 'drive_out', label: '往路', hint: 'Google Maps・休憩・買い出し' },
  { id: 'arrival', label: '到着受付', hint: '受付・サイト移動・チェックイン差分' },
  { id: 'setup', label: '設営', hint: 'テント・タープ・レイアウト' },
  { id: 'stay', label: '滞在', hint: '料理・散歩・天気・コタ' },
  { id: 'teardown', label: '撤収', hint: '濡れ物・忘れ物・収納' },
  { id: 'drive_back', label: '帰路', hint: '寄り道・休憩・渋滞' },
  { id: 'home', label: '帰宅後', hint: '片付け・充電・次回改善' }
];

const EVENT_META = {
  maps: ['Google Maps', 'ルートを開いた'], fuel: ['給油', '停車/燃料候補'], shop: ['買い出し', 'スーパー/コンビニ候補'], rest: ['休憩', 'SA/PA/道の駅/トイレ候補'], traffic: ['渋滞', '予定との差分候補'],
  kota: ['コタ', '水・暑さ・足元・散歩候補'], weather: ['天気', '雨・風・気温・体感候補'], gps: ['現在地', 'GPS地点候補'], issue: ['注意', '困った/危ない/忘れ物候補'],
  done: ['完了', '区切り候補'], layout: ['レイアウト', '配置候補'], tent: ['テント', '設営候補'], tarp: ['タープ', '設営候補'], interior: ['寝室', 'テント内候補'], exterior: ['外回り', '外導線候補'],
  amount: ['量', '多い/少ない/余り候補'], taste: ['味', '感想候補'], leftover: ['余り', '食材余り候補'], nextMeal: ['次回料理', '料理改善候補'],
  wet: ['濡れ物', '乾燥/収納候補'], forgotten: ['忘れ物', '次回準備へ戻す候補'], packing: ['収納', '積み方/順番候補'], facility: ['設備', 'トイレ/炊事場/管理棟候補'], view: ['景色', 'サイト/景観候補']
};

function nowISO() { return new Date().toISOString(); }
function quickId(prefix = 'ob') { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }
function meta(type) { return ACTIVITY_META[type] || { label: '記録', short: '記録', sub: 'あとで整理', gps: false, icon: '✎', kind: 'record' }; }
function recordsOf(session) { return Array.isArray(session?.records) ? session.records : []; }
function gpsPointsOf(session) { return Array.isArray(session?.gpsPoints) ? session.gpsPoints : []; }
function activeSession() { const s = getState().walkSession; return s?.status === 'active' ? s : null; }
function formatTime(value) { try { return value ? new Date(value).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''; } catch { return value || ''; } }
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
  const r = 6371, dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng), lat1 = toRad(a.lat), lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
function distanceKm(points = []) { return points.reduce((sum, p, i) => i ? sum + haversine(points[i - 1], p) : 0, 0); }

function projectInfo(state = getState()) {
  const p = state.nextProject || {};
  const r = p.reservation || {};
  const title = r.campground || p.campground || p.title || '次のキャンプ';
  const date = r.dateText || p.dateText || p.startDate || '';
  const site = r.site || p.site || '';
  const id = p.id || p.baseId || p.projectId || `project_${title}_${date}`;
  return { id, title, date, site, label: [title, date, site].filter(Boolean).join(' / ') || title };
}
function prep(state = getState()) { return state.prepContext || {}; }
function nonEmpty(value, fallback = '未入力') { return String(value || '').trim() || fallback; }
function dayKey(state = getState()) { return projectInfo(state).id; }
function ensureObject(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
function listFor(state, name, key = dayKey(state)) { const root = ensureObject(state[name]); return Array.isArray(root[key]) ? root[key] : []; }

function prepLines(state = getState()) {
  const p = prep(state);
  const project = projectInfo(state);
  return [
    { id: 'schedule', label: '予定', value: project.label, tag: '予定' },
    { id: 'route', label: 'ルート', value: nonEmpty(p.routeMemo, 'Google Mapsで確認'), tag: 'ドライブ' },
    { id: 'meal', label: '料理', value: nonEmpty(p.menuMemo || p.fixedDishMemo, '未定'), tag: '料理' },
    { id: 'gear', label: 'ギア', value: nonEmpty(p.gearMemo || p.gearLedgerMemo, '持ち物確認'), tag: 'ギア' },
    { id: 'kota', label: 'コタ', value: p.kotaGoing === 'no' ? '今回は留守番' : nonEmpty(p.kotaMemo, '同行前提・水/暑さ/足元'), tag: 'コタ' },
    { id: 'weather', label: '天気', value: nonEmpty(p.weatherMemo || p.windMemo || p.rainRisk, '雨・風・気温を確認'), tag: '天気' },
    { id: 'shop', label: '買い物', value: nonEmpty(p.extraNeedMemo || p.missingFoodMemo || p.availableFoodMemo, '未確認'), tag: '買い出し' },
    { id: 'setup', label: '設営', value: nonEmpty(p.setupMemo, '現地でレイアウト判断'), tag: '設営' }
  ];
}

function inferContext(extra = {}) {
  const state = getState();
  const project = projectInfo(state);
  return {
    build: BUILD,
    source: 'mvp-integrated-action-layer',
    projectId: project.id,
    projectName: project.title,
    projectLabel: project.label,
    capturedAt: nowISO(),
    status: '未確認',
    confidence: extra.confidence || '候補',
    sourceRefs: ['MASTER_v139', 'MVP監査LOCK', 'E3正本統合'],
    ...extra
  };
}
function suggestTags(record = {}, context = {}) {
  const text = `${record.title || ''} ${record.detail || ''} ${context.activity || ''} ${context.projectLabel || ''}`;
  const tags = ['未確認'];
  if (/散歩|場内|探索|設備|レビュー|ルート|景色/.test(text)) tags.push('散歩/探索');
  if (/ドライブ|運転|出発|到着|停車|渋滞|Google|Maps|SA|PA|道の駅|帰路/.test(text)) tags.push('ドライブ');
  if (/給油|ガソリン/.test(text)) tags.push('給油');
  if (/買|スーパー|コンビニ|食材|調味料|代替/.test(text)) tags.push('買い出し');
  if (/設営|テント|タープ|配置|レイアウト|寝室|外回り/.test(text)) tags.push('設営');
  if (/料理|ごはん|朝食|昼食|夕食|食材|量|味|焼|ピザ|シュリンプ|余り/.test(text)) tags.push('料理');
  if (/撤収|片付|収納|濡|乾燥|忘れ/.test(text)) tags.push('撤収');
  if (/コタ|犬|ドッグ|足|暑|寒|水/.test(text)) tags.push('コタ');
  if (/天気|雨|風|気温|暑|寒|湿度/.test(text)) tags.push('天気');
  if (/次回|失敗|改善|多すぎ|少な|足り|忘れ|不要/.test(text)) tags.push('次回改善');
  return [...new Set(tags)];
}
function makeRecord(type, title, detail = '', extra = {}) {
  const context = inferContext(extra.context || {});
  const record = {
    record_id: quickId('rec'), type, title, detail, mode: extra.activityType || activeSession()?.type || 'quick',
    createdAt: nowISO(), status: '未確認', source: context.source, context, ...extra
  };
  record.autoTags = suggestTags(record, context);
  return record;
}
function makeHistoryItem(record, extra = {}) {
  const context = inferContext(extra.context || record.context || {});
  const tags = [...new Set([...(record.autoTags || []), ...suggestTags(record, context)])];
  return {
    session_id: quickId('item'), type: 'quick', title: record.title || '記録', status: 'done', unresolved: true,
    startedAt: record.createdAt || nowISO(), endedAt: record.createdAt || nowISO(),
    records: [record], gpsPoints: extra.point ? [extra.point] : [], childSegments: [], context, autoTags: tags,
    reviewCandidate: tags.includes('次回改善') || tags.includes('ギア') || tags.includes('料理') || tags.includes('コタ')
  };
}
function appendDayRecord(record, extraPatch = {}) {
  const state = getState();
  const key = dayKey(state);
  const root = ensureObject(state.dayRecords);
  const dayItem = { id: record.record_id || quickId('dayrec'), title: record.title, detail: record.detail, type: record.type, status: 'unconfirmed', createdAt: record.createdAt || nowISO(), tags: record.autoTags || [], context: record.context || inferContext() };
  return { dayRecords: { ...root, [key]: [dayItem, ...(root[key] || [])].slice(0, RECORD_LIMIT) }, ...extraPatch };
}
function appendAutoEvent(event, extraPatch = {}) {
  const state = getState();
  const key = dayKey(state);
  const root = ensureObject(state.dayAutoEvents);
  const item = { id: quickId('auto'), status: 'candidate', at: nowISO(), ...event };
  return { dayAutoEvents: { ...root, [key]: [item, ...(root[key] || [])].slice(0, RECORD_LIMIT) }, ...extraPatch };
}
function pushReviewTags(existing = [], tags = []) { return [...new Set([...existing, ...tags.filter((t) => t !== '未確認')])]; }

export function renderWalk() {
  const state = getState();
  const session = activeSession();
  app().innerHTML = `${session ? renderActiveActivity(session, state) : renderActionHub(state)}${renderRecovery(state)}${renderRecent(state)}${renderTestReset(state)}`;
  bindWalk(); startTimer(); syncGpsWatch(session);
}

function renderActionHub(state) {
  const project = projectInfo(state);
  const unresolved = unresolvedCount(state);
  return card(`<section class="e3-shell">
    <div class="e3-hero">
      <span class="e3-kicker">OUTBASE 正本統合</span>
      <h2>今日を進める / 残す</h2>
      <p>${escapeHtml(project.label)}｜キャンプ中は自由。OUTBASEは裏で候補化して、帰ってから整理する。</p>
    </div>
    ${renderDayCockpit(state)}
    <section class="e3-section e3-capture">
      <div class="e3-section-head"><strong>今すぐ残す</strong><small>分類しない。写真・声・メモ・あとでだけ。</small></div>
      <div class="e3-quick-grid">${quickButton('quickPhoto', '写真', '撮る/選ぶ')}${quickButton('quickVoice', '声', '話す')}${quickButton('quickMemo', 'メモ', '書く')}${quickButton('quickLater', 'あとで', '空で残す')}</div>
    </section>
    <section class="e3-section">
      <div class="e3-section-head"><strong>活動を始める</strong><small>開始・終了が必要なもの。途中で他タブへ移動しても記録中バーで戻れる。</small></div>
      <div class="e3-activity-grid">${activityButton('walk')}${activityButton('drive')}${activityButton('setup')}${activityButton('cook')}${activityButton('teardown')}${activityButton('campWalk')}</div>
    </section>
    <section class="e3-section e3-prep-link">
      <div class="e3-section-head"><strong>準備から引き継ぐ</strong><small>予定・料理・ギア・コタ・天気・ルートを記録へ自動紐付け。</small></div>
      <div class="e3-prep-list">${prepLines(state).map(renderPrepLine).join('')}</div>
    </section>
    <div class="e3-footer-note">未確認 ${unresolved}件。間違い・保留・次回改善は思い出で整理。</div>
    ${renderMemoBox('例：エビ多すぎた / タープは右寄せ / コタ暑そう / 給油した')}
    <input id="quickFileInput" type="file" accept="image/*,video/*" hidden />
  </section>`, 'e3-card e3-action-card');
}
function renderDayCockpit(state) {
  const active = state.walkSession?.status === 'active' ? state.walkSession.type : '';
  return `<section class="e3-cockpit"><div class="e3-section-head"><strong>今日の運転席</strong><small>当日タブは作らず、ここで状態だけ見る。</small></div><div class="e3-flow-grid">${FLOW_STEPS.map((step) => `<button class="flowStep" data-step="${escapeHtml(step.id)}" type="button"><strong>${escapeHtml(step.label)}</strong><span>${escapeHtml(step.hint)}</span>${active && step.id.includes(active) ? '<em>記録中</em>' : ''}</button>`).join('')}</div></section>`;
}
function renderPrepLine(item) { return `<article><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong><em>${escapeHtml(item.tag)}</em></article>`; }
function quickButton(id, label, sub) { return `<button id="${id}" type="button"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(sub)}</span></button>`; }
function activityButton(type) { const m = meta(type); return `<button class="startActivity" data-type="${escapeHtml(type)}" type="button"><em>${m.icon}</em><strong>${escapeHtml(m.label)}</strong><span>${escapeHtml(m.sub)}</span></button>`; }
function renderMemoBox(placeholder) { return `<div class="e3-memo-box" id="memoBox" hidden><textarea id="quickMemoText" class="field textarea" rows="4" placeholder="${escapeHtml(placeholder)}"></textarea><div><button id="saveQuickMemo" class="btn primary" type="button">未確認で残す</button><button id="cancelQuickMemo" class="btn" type="button">閉じる</button></div></div>`; }

function renderActiveActivity(session, state) {
  const m = meta(session.type);
  const points = gpsPointsOf(session);
  const records = recordsOf(session);
  return card(`<section class="e3-active-shell">
    <div class="e3-active-hero"><div><span>記録中</span><h2>${m.icon} ${escapeHtml(m.label)}</h2><p>${escapeHtml(session.context?.projectLabel || projectInfo(state).label)}</p></div><button id="finishActivityTop" class="btn primary" type="button">終了</button></div>
    <div class="e3-metrics"><div><span>時間</span><strong id="walkTimer">${elapsedText(session.startedAt)}</strong></div><div><span>${m.gps ? '距離' : '記録'}</span><strong>${m.gps ? `${distanceKm(points).toFixed(2)}km` : `${records.length}件`}</strong></div><div><span>状態</span><strong>未確認</strong></div></div>
    ${renderActivityContext(session, state)}
    ${session.type === 'drive' ? renderDriveTools(state) : ''}
    ${m.gps ? renderGpsPanel(session) : ''}
    <section class="e3-section"><div class="e3-section-head"><strong>この活動で残す</strong><small>分類は後で。現地では記録だけ。</small></div><div class="e3-quick-grid">${quickButton('quickPhoto', '写真', '撮る')}${quickButton('quickVoice', '声', '話す')}${quickButton('quickMemo', 'メモ', '書く')}${quickButton('quickLater', 'あとで', '保留')}</div></section>
    <section class="e3-section"><div class="e3-section-head"><strong>${escapeHtml(m.label)}で拾うこと</strong><small>ワンタップ候補。間違いは思い出で直す。</small></div><div class="e3-event-grid">${activityEvents(session.type).map(eventButton).join('')}</div></section>
    <details class="e3-switch"><summary>活動を切り替える</summary><div class="e3-activity-grid small">${Object.keys(ACTIVITY_META).map(activityButton).join('')}</div></details>
    <details class="e3-log"><summary>この活動の未確認 ${records.length}件</summary>${renderActiveRecords(records)}</details>
    <div class="e3-end-row"><button id="finishActivity" class="btn primary" type="button">保存して未確認箱へ</button><button id="cancelActivity" class="btn danger subtle-danger" type="button">テスト中止</button></div>
    ${renderMemoBox('この活動のメモ')}
    <input id="quickFileInput" type="file" accept="image/*,video/*" hidden />
  </section>`, 'e3-card e3-active-card');
}
function renderActivityContext(session, state) {
  const lines = prepLines(state).filter((line) => {
    if (session.type === 'drive') return ['予定', 'ルート', '買い出し', 'コタ', '天気'].includes(line.tag);
    if (session.type === 'setup') return ['予定', 'ギア', '設営', '天気', 'コタ'].includes(line.tag);
    if (session.type === 'cook') return ['予定', '料理', '買い出し', '天気'].includes(line.tag);
    if (session.type === 'teardown') return ['予定', 'ギア', '天気', 'コタ'].includes(line.tag);
    if (session.type === 'campWalk' || session.type === 'walk') return ['予定', 'コタ', '天気'].includes(line.tag);
    return true;
  });
  return `<section class="e3-context-strip">${lines.slice(0, 5).map(renderPrepLine).join('')}</section>`;
}
function renderDriveTools(state) {
  const p = projectInfo(state);
  return `<section class="e3-drive-tools"><div><strong>Google Mapsで移動</strong><span>ドライブ中はOUTBASEを操作しない。戻った後、停車・到着・買い出し・給油を候補化。</span></div><button id="openGoogleMaps" type="button">Mapsで開く</button><small>${escapeHtml(p.title)}</small></section>`;
}
function renderGpsPanel(session) {
  const points = gpsPointsOf(session); const latest = points[points.length - 1];
  return `<section class="e3-gps-panel"><div><strong>GPS</strong><span>${latest ? `${latest.lat.toFixed(5)}, ${latest.lng.toFixed(5)}` : '現在地未取得'}</span></div><button id="captureGps" type="button">現在地</button></section>`;
}
function activityEvents(type) {
  if (type === 'drive') return ['maps', 'fuel', 'shop', 'rest', 'traffic', 'kota', 'gps'];
  if (type === 'setup') return ['layout', 'tent', 'tarp', 'interior', 'exterior', 'issue', 'done'];
  if (type === 'cook') return ['amount', 'taste', 'leftover', 'nextMeal', 'photo', 'issue'];
  if (type === 'teardown') return ['wet', 'forgotten', 'packing', 'kota', 'weather', 'done'];
  if (type === 'campWalk') return ['gps', 'facility', 'view', 'kota', 'issue', 'weather'];
  return ['gps', 'kota', 'weather', 'issue', 'done'];
}
function eventButton(type) { const [label, sub] = EVENT_META[type] || [type, '候補']; return `<button class="eventCandidate" data-type="${escapeHtml(type)}" type="button"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(sub)}</span></button>`; }
function renderActiveRecords(records) { if (!records.length) return '<p class="empty-line">まだありません。</p>'; return `<div class="e3-recent-list">${records.slice(0, 15).map((r) => `<article class="e3-recent-item"><div><strong>${escapeHtml(r.title || '記録')}</strong><small>${escapeHtml(formatTime(r.createdAt))}</small></div><p>${escapeHtml(r.detail || 'あとで確認')}</p><div class="e3-tags">${(r.autoTags || ['未確認']).slice(0, 5).map((t) => `<span>${escapeHtml(t)}</span>`).join('')}</div></article>`).join('')}</div>`; }

function renderRecent(state) {
  const history = state.recordHistory || [];
  const unresolved = history.filter((item) => item.unresolved || item.context?.status === '未確認');
  const day = listFor(state, 'dayRecords');
  const latest = [...unresolved, ...day.map((item) => ({ session_id: item.id, title: item.title, startedAt: item.createdAt, records: [{ detail: item.detail, createdAt: item.createdAt }], autoTags: item.tags || ['未確認'] }))].slice(0, 8);
  return card(`<section class="e3-recent-shell"><div class="e3-recent-head"><strong>未確認箱</strong><span>${latest.length}件表示 / 全${unresolvedCount(state)}件</span></div><p>キャンプ中に整理しない。写真・声・メモ・GPS・Google Maps・活動ログを帰ってから思い出で直す。</p>${latest.length ? `<div class="e3-recent-list">${latest.map(renderRecentItem).join('')}</div>` : '<p class="empty-line">まだ未確認はありません。</p>'}</section>`, 'e3-card e3-recent-card');
}
function renderRecentItem(item) { const r = item.records?.[0] || {}; return `<article class="e3-recent-item"><div><strong>${escapeHtml(item.title || r.title || '記録')}</strong><small>${escapeHtml(formatTime(r.createdAt || item.startedAt))}</small></div><p>${escapeHtml(r.detail || item.context?.projectLabel || 'あとで確認')}</p><div class="e3-tags">${(item.autoTags || ['未確認']).slice(0, 6).map((t) => `<span>${escapeHtml(t)}</span>`).join('')}</div></article>`; }
function unresolvedCount(state = getState()) { return (state.recordHistory || []).filter((i) => i.unresolved || i.context?.status === '未確認').length + listFor(state, 'dayRecords').length + listFor(state, 'dayAutoEvents').filter((i) => i.status !== 'confirmed' && i.status !== 'dismissed').length; }
function renderTestReset(state) {
  const count = (state.recordHistory || []).filter(isTestRecord).length + (state.walkSession?.source === 'mvp-integrated-action-layer' ? 1 : 0) + listFor(state, 'dayRecords').length;
  return card(`<section class="e3-test-reset"><div><strong>テスト中</strong><span>＋由来の未確認・活動テストだけリセット。予定・準備・ギア・本番記録は残す。</span></div><div><button id="resetQuickTest" class="mini-ghost" type="button">テスト記録リセット</button><button id="restoreQuickReset" class="mini-ghost" type="button">直前復元</button></div><small>${count}件が対象</small></section>`, 'e3-card e3-reset-card');
}
function isTestRecord(item) { return item?.context?.source === 'mvp-integrated-action-layer' || item?.source === 'mvp-integrated-action-layer' || item?.unresolved; }
function renderRecovery(state) {
  const backup = state.quickResetBackup;
  const activeBackup = backup && (!backup.expiresAt || new Date(backup.expiresAt).getTime() > Date.now());
  if (!activeBackup) return '';
  return card(`<section class="e3-recovery"><strong>直前のテスト状態を復元できます</strong><span>${escapeHtml(formatTime(backup.createdAt))}</span><button id="restoreQuickResetTop" class="btn" type="button">復元</button></section>`, 'e3-card e3-recovery-card');
}

function bindWalk() {
  document.getElementById('quickPhoto')?.addEventListener('click', () => document.getElementById('quickFileInput')?.click());
  document.getElementById('quickFileInput')?.addEventListener('change', handleQuickFile);
  document.getElementById('quickVoice')?.addEventListener('click', startVoiceMemo);
  document.getElementById('quickMemo')?.addEventListener('click', () => openMemoBox(''));
  document.getElementById('quickLater')?.addEventListener('click', () => addRecordSmart(makeRecord('later', 'あとで確認', '内容未入力。思い出で整理'), 'あとで確認に入れました'));
  document.getElementById('saveQuickMemo')?.addEventListener('click', saveMemoFromBox);
  document.getElementById('cancelQuickMemo')?.addEventListener('click', closeMemoBox);
  document.querySelectorAll('.startActivity').forEach((b) => b.addEventListener('click', () => startActivity(b.dataset.type)));
  document.querySelectorAll('.eventCandidate').forEach((b) => b.addEventListener('click', () => addEventCandidate(b.dataset.type)));
  document.querySelectorAll('.flowStep').forEach((b) => b.addEventListener('click', () => addFlowCandidate(b.dataset.step)));
  document.getElementById('finishActivity')?.addEventListener('click', () => finishActivity(true));
  document.getElementById('finishActivityTop')?.addEventListener('click', () => finishActivity(true));
  document.getElementById('cancelActivity')?.addEventListener('click', cancelActivity);
  document.getElementById('resetQuickTest')?.addEventListener('click', resetQuickTestRecords);
  document.getElementById('restoreQuickReset')?.addEventListener('click', restoreQuickReset);
  document.getElementById('restoreQuickResetTop')?.addEventListener('click', restoreQuickReset);
  document.getElementById('openGoogleMaps')?.addEventListener('click', openGoogleMaps);
  document.getElementById('captureGps')?.addEventListener('click', () => captureGpsPoint(true));
}
function openMemoBox(text = '') { const box = document.getElementById('memoBox'); const ta = document.getElementById('quickMemoText'); if (!box || !ta) return; box.hidden = false; ta.value = text; ta.focus(); }
function closeMemoBox() { const box = document.getElementById('memoBox'); if (box) box.hidden = true; }
function saveMemoFromBox() { const ta = document.getElementById('quickMemoText'); const detail = ta?.value?.trim(); if (!detail) return toast('メモを入れてください'); addRecordSmart(makeRecord('memo', 'メモ', detail), 'メモを残しました'); closeMemoBox(); }
function handleQuickFile(event) { const file = event.target.files?.[0]; if (!file) return; const type = file.type?.startsWith('video/') ? 'video' : 'photo'; const title = type === 'video' ? '動画' : '写真'; const reader = new FileReader(); reader.onload = () => addRecordSmart(makeRecord(type, title, file.name, { preview: type === 'photo' ? reader.result : '', fileName: file.name, mimeType: file.type || '' }), `${title}を残しました`); reader.readAsDataURL(file); event.target.value = ''; }
function startVoiceMemo() { const Speech = window.SpeechRecognition || window.webkitSpeechRecognition; if (!Speech) { openMemoBox('音声認識未対応：'); return toast('音声認識に対応していません'); } try { speechRecognition?.abort?.(); speechRecognition = new Speech(); speechRecognition.lang = 'ja-JP'; speechRecognition.interimResults = false; speechRecognition.onresult = (e) => addRecordSmart(makeRecord('voice', '声メモ', e.results?.[0]?.[0]?.transcript || '音声メモ'), '声を残しました'); speechRecognition.onerror = () => toast('声を拾えませんでした。メモで残せます'); speechRecognition.start(); toast('話してください'); } catch { toast('音声を開始できませんでした'); } }
function addRecordSmart(record, message) { activeSession() ? addRecordToActive(record, message) : addQuickRecord(record, message); }
function addQuickRecord(record, message = '残しました', extra = {}) {
  const state = getState(); const item = makeHistoryItem(record, extra); const dayPatch = appendDayRecord(record);
  patchState({ ...dayPatch, recordHistory: [item, ...(state.recordHistory || [])].slice(0, RECORD_LIMIT), selectedRecordSessionId: null, reviewQueue: pushReviewTags(state.reviewQueue || [], item.autoTags) });
  toast(message); renderWalk(); captureContextForItem(item.session_id);
}
function addRecordToActive(record, message = '残しました') {
  const state = getState(); const session = state.walkSession;
  if (!session || session.status !== 'active') return addQuickRecord(record, message);
  const context = inferContext({ activity: meta(session.type).label, activityType: session.type });
  const enriched = { ...record, mode: session.type, activityType: session.type, context, autoTags: [...new Set([...(record.autoTags || []), ...suggestTags(record, context)])] };
  const dayPatch = appendDayRecord(enriched);
  patchState({ ...dayPatch, walkSession: { ...session, records: [enriched, ...recordsOf(session)], autoTags: [...new Set([...(session.autoTags || []), ...enriched.autoTags])] }, reviewQueue: pushReviewTags(state.reviewQueue || [], enriched.autoTags) });
  toast(message); renderWalk();
}
function startActivity(type) {
  const m = meta(type); const current = activeSession();
  if (current && current.type !== type) { finishActivity(false); }
  const context = inferContext({ activity: m.label, activityType: type, activityKind: m.kind });
  const start = makeRecord('activity', `${m.label}開始`, m.sub, { activityType: type, context });
  const session = { session_id: quickId('act'), type, title: m.label, status: 'active', startedAt: nowISO(), records: [start], gpsPoints: [], childSegments: [], unresolved: true, source: context.source, context, autoTags: ['未確認', m.label] };
  const state = getState(); const patches = { walkSession: session, selectedRecordSessionId: null, ...appendAutoEvent({ title: `${m.label}開始`, type, activityType: type, context }) };
  patchState(patches); toast(`${m.label}を開始`); renderWalk(); if (type === 'drive') openGoogleMaps(); if (m.gps) window.setTimeout(() => captureGpsPoint(false), 500);
}
function finishActivity(shouldRender = true) {
  const state = getState(); const session = state.walkSession; if (!session || session.status !== 'active') return;
  stopGpsWatch(); const end = makeRecord('activity', `${meta(session.type).label}終了`, '保存して未確認箱へ', { activityType: session.type, context: session.context });
  const ended = { ...session, status: 'done', endedAt: nowISO(), records: [end, ...recordsOf(session)], unresolved: true, autoTags: [...new Set([...(session.autoTags || []), ...end.autoTags])], reviewCandidate: true };
  const dayPatch = appendAutoEvent({ title: `${meta(session.type).label}終了`, type: session.type, context: session.context });
  patchState({ ...dayPatch, walkSession: null, recordHistory: [ended, ...(state.recordHistory || [])].slice(0, RECORD_LIMIT), selectedRecordSessionId: null, reviewQueue: pushReviewTags(state.reviewQueue || [], ended.autoTags), recoverySession: { action: 'finish-activity', session, savedHistoryId: ended.session_id, expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() } });
  toast(`${meta(session.type).label}を未確認箱へ保存`); if (shouldRender) renderWalk();
}
function cancelActivity() { const session = activeSession(); if (!session) return; stopGpsWatch(); patchState({ walkSession: null, quickResetBackup: { action: 'cancel-activity', active: session, items: [], createdAt: nowISO(), expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() } }); toast('活動テストを中止。復元できます'); renderWalk(); }
function addEventCandidate(type) { if (type === 'gps') return captureGpsPoint(true); if (type === 'maps') return openGoogleMaps(); if (type === 'photo') return document.getElementById('quickFileInput')?.click(); const [label, sub] = EVENT_META[type] || ['出来事', '候補']; addRecordSmart(makeRecord(type, label, sub), '候補を残しました'); }
function addFlowCandidate(stepId) { const step = FLOW_STEPS.find((s) => s.id === stepId); if (!step) return; const patch = appendAutoEvent({ title: `${step.label}の状態確認`, type: 'flow', step: step.id, detail: step.hint, context: inferContext({ flowStep: step.id }) }); patchState(patch); toast(`${step.label}を候補に入れました`); renderWalk(); }
function openGoogleMaps() { const destination = projectInfo().title || 'キャンプ場'; const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`; addRecordToActive(makeRecord('maps', 'Google Mapsを開く', destination, { activityType: 'drive' }), 'Google Mapsを開きます'); window.open(url, '_blank', 'noopener'); }
function captureGpsPoint(manual = true) { if (!navigator.geolocation) { addRecordSmart(makeRecord('gps', 'GPS取得不可', '位置情報が使えません'), 'GPSが使えません'); return; } navigator.geolocation.getCurrentPosition((pos) => { const point = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, createdAt: nowISO(), source: manual ? 'manual' : 'auto' }; const session = activeSession(); if (session) { const latest = gpsPointsOf(session).slice(-1)[0]; if (!manual && latest && haversine(latest, point) < 0.01) return; const record = manual ? makeRecord('gps', '現在地', `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`, { point, activityType: session.type }) : null; const next = { ...session, gpsPoints: [...gpsPointsOf(session), point].slice(-700), records: record ? [record, ...recordsOf(session)] : recordsOf(session) }; patchState({ walkSession: next, ...appendAutoEvent({ title: manual ? '現在地' : 'GPS自動取得', type: 'gps', point, context: session.context }) }); toast(manual ? '現在地を残しました' : '現在地を確認しました'); renderWalk(); } else { addQuickRecord(makeRecord('gps', '現在地', `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`, { point }), '現在地を残しました', { point }); } }, () => addRecordSmart(makeRecord('gps', 'GPS取得失敗', '位置情報の許可を確認'), 'GPS取得に失敗'), { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }); }
function captureContextForItem(sessionId) { if (!navigator.geolocation) return; navigator.geolocation.getCurrentPosition((pos) => { const point = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, createdAt: nowISO(), source: 'auto-context' }; const state = getState(); patchState({ recordHistory: (state.recordHistory || []).map((item) => item.session_id === sessionId ? { ...item, gpsPoints: [point, ...(item.gpsPoints || [])].slice(0, 10), context: { ...(item.context || {}), hasLocation: true, locationCapturedAt: point.createdAt } } : item) }); }, () => undefined, { enableHighAccuracy: true, timeout: 7000, maximumAge: 120000 }); }
function syncGpsWatch(session) { const m = meta(session?.type); if (!session || session.status !== 'active' || !m.gps) { stopGpsWatch(); return; } if (!navigator.geolocation) return; const key = `${session.session_id}:${session.type}`; if (geoWatchKey === key) return; stopGpsWatch(); geoWatchKey = key; geoWatchId = navigator.geolocation.watchPosition((pos) => { const point = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, createdAt: nowISO(), source: 'watch' }; const current = activeSession(); if (!current) return; const latest = gpsPointsOf(current).slice(-1)[0]; if (latest && haversine(latest, point) < 0.01) return; patchState({ walkSession: { ...current, gpsPoints: [...gpsPointsOf(current), point].slice(-700) } }); }, () => undefined, { enableHighAccuracy: true, maximumAge: 15000, timeout: 25000 }); }
function stopGpsWatch() { if (geoWatchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(geoWatchId); geoWatchId = null; geoWatchKey = ''; }
function resetQuickTestRecords() { const state = getState(); const history = state.recordHistory || []; const targets = history.filter(isTestRecord); const active = state.walkSession?.source === 'mvp-integrated-action-layer' ? state.walkSession : null; const key = dayKey(state); const dayTargets = listFor(state, 'dayRecords', key); const total = targets.length + (active ? 1 : 0) + dayTargets.length; if (!total) return toast('リセット対象はありません'); const backup = { action: 'e3-reset', items: targets, active, dayRecords: dayTargets, createdAt: nowISO(), expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() }; const dayRoot = ensureObject(state.dayRecords); patchState({ recordHistory: history.filter((item) => !isTestRecord(item)), walkSession: active ? null : state.walkSession, dayRecords: { ...dayRoot, [key]: [] }, quickResetBackup: backup, selectedRecordSessionId: null }); stopGpsWatch(); toast('テスト記録をリセット。復元できます'); renderWalk(); }
function restoreQuickReset() { const state = getState(); const backup = state.quickResetBackup; if (!backup) return toast('復元できる状態はありません'); const key = dayKey(state); const dayRoot = ensureObject(state.dayRecords); patchState({ recordHistory: [...(backup.items || []), ...(state.recordHistory || [])].slice(0, RECORD_LIMIT), walkSession: backup.active || state.walkSession, dayRecords: { ...dayRoot, [key]: [...(backup.dayRecords || []), ...(dayRoot[key] || [])].slice(0, RECORD_LIMIT) }, quickResetBackup: null }); toast('直前のテスト状態を復元しました'); renderWalk(); }
function startTimer() { if (timer) window.clearInterval(timer); timer = window.setInterval(() => { const session = activeSession(); const el = document.getElementById('walkTimer'); if (session && el) el.textContent = elapsedText(session.startedAt); }, 1000); }
