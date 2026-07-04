import { app, card, escapeHtml, listItems, toast } from '../../ui/components.js?v=core06-05-all-pages-visual-unify-20260704';
import { getState, patchState } from '../../core/store.js?v=core06-05-all-pages-visual-unify-20260704';

let timer = null;
let speechRecognition = null;
let geoWatchId = null;
let geoWatchKey = null;
let resolvingPlace = false;
let lastMapRenderAt = 0;

const MODE_META = {
  homeWalk: { label: '自宅散歩', short: '自宅', sub: '日常の散歩ログ', emoji: '🐾', map: true },
  campWalk: { label: 'キャンプ場散歩', short: '場内散歩', sub: '場内確認・レビュー素材', emoji: '🧭', map: true },
  camp: { label: 'キャンプ滞在', short: 'キャンプ', sub: '親記録', emoji: '🏕', parent: true },
  setup: { label: '設営', short: '設営', sub: '開始・完了・段取り', emoji: '⛺' },
  cook: { label: '料理', short: '料理', sub: '写真・量・次回メモ', emoji: '🍳' },
  teardown: { label: '撤収', short: '撤収', sub: '収納・濡れ物・忘れ物', emoji: '📦' },
  memo: { label: 'メモ', short: 'メモ', sub: '気づきだけ残す', emoji: '✎' },
  life: { label: 'メモ', short: 'メモ', sub: '気づきだけ残す', emoji: '✎' }
};

function normalizeMode(type, asCampChild = false) {
  if (type === 'walk') return asCampChild ? 'campWalk' : 'homeWalk';
  if (type === 'life') return 'memo';
  return type || 'memo';
}
function modeMeta(type) { return MODE_META[normalizeMode(type)] || MODE_META.memo; }
function modeLabel(type) { return modeMeta(type).label; }
function modeShort(type) { return modeMeta(type).short; }
function nowISO() { return new Date().toISOString(); }
function recordsOf(session) { return Array.isArray(session?.records) ? session.records : []; }
function gpsPointsOf(session) { return Array.isArray(session?.gpsPoints) ? session.gpsPoints : []; }
function childSegmentsOf(session) { return Array.isArray(session?.childSegments) ? session.childSegments : []; }
function currentMode(session) { return normalizeMode(session?.activeChild?.type || session?.type || 'memo', Boolean(session?.activeChild)); }
function isWalkMode(type) { return ['homeWalk', 'campWalk', 'walk'].includes(normalizeMode(type, type === 'campWalk')); }
function activeSession() {
  const session = getState().walkSession;
  return session?.status === 'active' ? session : null;
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

function formatTime(value, withYear = false) {
  if (!value) return '';
  try {
    const options = withYear
      ? { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(value).toLocaleString('ja-JP', options);
  } catch { return value; }
}

function distanceKm(points = []) {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i += 1) total += haversine(points[i - 1], points[i]);
  return total;
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

function pointMode(point, session) {
  const asChild = Boolean(point.childId || session?.type === 'camp');
  return normalizeMode(point.mode || session?.type, asChild);
}

function walkPointsOf(session, mode = null) {
  const points = gpsPointsOf(session);
  if (!mode) return points.filter((p) => isWalkMode(pointMode(p, session)));
  const normalized = normalizeMode(mode, session?.type === 'camp');
  return points.filter((p) => pointMode(p, session) === normalized);
}

function modePointsOf(session, mode = currentMode(session)) {
  const normalized = normalizeMode(mode, session?.type === 'camp');
  if (!isWalkMode(normalized)) return [];
  return walkPointsOf(session, normalized);
}

function makeRecord(type, title, detail = '', extra = {}) {
  const session = activeSession();
  const mode = currentMode(session);
  return {
    record_id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    mode,
    childId: session?.activeChild?.child_id || '',
    title,
    detail,
    createdAt: nowISO(),
    ...extra
  };
}

function updateActiveSession(updater) {
  const state = getState();
  const session = state.walkSession;
  if (!session || session.status !== 'active') return;
  patchState({ walkSession: updater(session) });
}

function addRecord(record, message = '記録しました') {
  updateActiveSession((session) => ({ ...session, records: [record, ...recordsOf(session)] }));
  toast(message);
  renderWalk();
}

function buildReviewItems(session) {
  const text = recordsOf(session).map((record) => `${record.title} ${record.detail}`).join(' ');
  const items = [];
  if (/忘れ|不足|足りない|足りな/.test(text)) items.push('不足・忘れ物を次回準備に戻す');
  if (/雨|濡|撤収/.test(text)) items.push('雨撤収と濡れ物対策を次回確認');
  if (/暑|熱|冷却|WAVE|扇風機/.test(text)) items.push('暑さ対策と電源残量を次回確認');
  if (/料理|多すぎ|余り|食材|量/.test(text)) items.push('料理量・食材量を次回調整');
  if (/コタ|犬|ドッグ|散歩|足/.test(text)) items.push('コタの散歩導線と足元環境を次回確認');
  if (/設営|撤収|タイマー|時間|段取り/.test(text)) items.push('設営・撤収時間を次回段取りへ反映');
  return [...new Set(items)];
}

export function renderWalk() {
  const state = getState();
  const session = activeSession();
  const history = state.recordHistory || [];
  const selected = state.selectedRecordSessionId ? history.find((item) => item.session_id === state.selectedRecordSessionId) || null : null;

  if (selected) {
    app().innerHTML = `${renderDetail(selected)}${renderHistory(history, selected.session_id, true)}`;
  } else {
    app().innerHTML = `${session ? renderActiveSession(session) : renderStartPanel()}${renderHistory(history)}`;
  }
  bindWalk();
  startTimer();
  syncGpsWatch(session);
}

function renderStartPanel() {
  const project = getState().nextProject;
  const campName = project?.reservation?.campground || project?.campground || '';
  return card(`<section class="record-home-shell">
    <div class="record-home-status">
      <strong>記録</strong><span>散歩・キャンプ・メモを混ぜずに残す</span>
    </div>
    <div class="record-launch-grid">
      ${launchButton('homeWalk', '自宅散歩', '近所ルート・時間・距離', '自宅散歩')}
      ${launchButton('camp', 'キャンプ滞在', '親記録を開始', campName ? `${campName} 記録` : 'キャンプ記録')}
      ${launchButton('campWalk', 'キャンプ場散歩', '場内確認をすぐ開始', campName ? `${campName} 場内散歩` : 'キャンプ場散歩')}
      ${launchButton('memo', 'メモ', '気づきだけ残す', '今日のメモ')}
    </div>
    <details class="quiet-details record-title-edit"><summary>タイトルを変える</summary><input id="sessionTitle" class="field" value="" placeholder="例：朝の自宅散歩 / 赤城山1日目" /></details>
  </section>`, 'record-field-card record-start-field');
}

function launchButton(type, label, sub, title) {
  const meta = modeMeta(type);
  return `<button class="record-launch startSession" data-type="${escapeHtml(type)}" data-title="${escapeHtml(title)}">
    <span>${meta.emoji}</span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(sub)}</small>
  </button>`;
}

function renderActiveSession(session) {
  const mode = currentMode(session);
  const modePoints = modePointsOf(session, mode);
  const allRecords = recordsOf(session);
  const parentTitle = session.parentTitle || session.title || modeLabel(session.type);
  const activeTitle = session.activeChild?.title || modeLabel(mode);
  return card(`<section class="record-active-shell">
    <div class="record-live-summary">
      <div class="live-mark"><span></span>LIVE</div>
      <div class="live-title">
        <strong>${session.type === 'camp' ? escapeHtml(parentTitle) : escapeHtml(activeTitle)}</strong>
        <small>${session.type === 'camp' ? `今：${escapeHtml(activeTitle)}` : escapeHtml(session.locationLabel || modeMeta(mode).sub)}</small>
      </div>
      <button class="mini-ghost" id="finishSessionTop">保存終了</button>
    </div>
    ${renderRecordingStack(session)}
    ${renderMetricStrip(session, mode, modePoints)}
    ${renderModeSwitch(session)}
    ${renderModeSurface(session, mode, modePoints)}
    ${renderModeControls(session)}
    <input id="photoInput" type="file" accept="image/*" hidden />
    <input id="videoInput" type="file" accept="video/*" hidden />
    <details class="quiet-details"><summary>今回の記録 ${allRecords.length}件</summary>${renderRecordList(allRecords)}</details>
  </section>`, 'record-field-card record-active-card');
}

function renderRecordingStack(session) {
  const mode = currentMode(session);
  const parentTitle = session.parentTitle || session.title || modeLabel(session.type);
  const activeTitle = session.activeChild?.title || modeLabel(mode);
  if (session.type === 'camp') {
    return `<section class="record-stack-card field-stack">
      <div><span>親</span><strong>${escapeHtml(parentTitle)}</strong><small>キャンプ継続中</small></div>
      <div><span>今</span><strong>${escapeHtml(activeTitle)}</strong><small>${session.activeChild ? `${escapeHtml(modeMeta(mode).sub)}` : '滞在全体'}</small></div>
    </section>`;
  }
  return `<section class="record-stack-card field-stack single">
    <div><span>今</span><strong>${escapeHtml(modeLabel(mode))}</strong><small>${escapeHtml(session.locationLabel || modeMeta(mode).sub)}</small></div>
  </section>`;
}

function renderMetricStrip(session, mode, points) {
  const activeStart = session.activeChild?.startedAt || session.startedAt;
  const recordCount = recordsOf(session).filter((record) => !session.activeChild || record.childId === session.activeChild.child_id || record.mode === mode).length;
  const distance = isWalkMode(mode) ? `${distanceKm(points).toFixed(2)}km` : `${recordCount}件`;
  const third = isWalkMode(mode) ? `GPS ${points.length}` : modeMeta(mode).sub;
  return `<section class="record-metrics">
    <div><span>時間</span><strong id="walkTimer">${elapsedText(activeStart)}</strong></div>
    <div><span>${isWalkMode(mode) ? '距離' : '記録'}</span><strong>${escapeHtml(distance)}</strong></div>
    <div><span>状態</span><strong>${escapeHtml(session.paused ? '一時停止' : third)}</strong></div>
  </section>`;
}

function renderModeSwitch(session) {
  const mode = currentMode(session);
  const buttons = session.type === 'camp'
    ? ['camp', 'campWalk', 'setup', 'cook', 'teardown', 'memo']
    : ['homeWalk', 'camp', 'memo'];
  return `<nav class="record-mode-switch" aria-label="記録モード切替">
    ${buttons.map((type) => {
      const active = mode === type || (!session.activeChild && session.type === type);
      const actionClass = session.type === 'camp' ? 'switchCampMode' : 'switchStandaloneMode';
      return `<button class="${actionClass} ${active ? 'active' : ''}" data-type="${escapeHtml(type)}"><span>${modeMeta(type).emoji}</span>${escapeHtml(modeShort(type))}</button>`;
    }).join('')}
  </nav>`;
}

function renderModeSurface(session, mode, points) {
  if (isWalkMode(mode)) return `${renderStableWalkMap(session, mode, points)}${renderWalkActions(mode)}`;
  if (mode === 'camp') return renderCampActions(session);
  if (mode === 'setup') return renderSetupActions();
  if (mode === 'cook') return renderCookActions();
  if (mode === 'teardown') return renderTeardownActions();
  return renderMemoActions();
}

function renderStableWalkMap(session, mode, points) {
  const latest = points[points.length - 1];
  const label = mode === 'homeWalk' ? '自宅散歩ルート' : '場内散歩ルート';
  const zoomText = mode === 'homeWalk' ? '近所が見える距離感' : 'キャンプ場内が見える距離感';
  const mapsLink = latest ? `https://www.google.com/maps/search/?api=1&query=${latest.lat},${latest.lng}` : '';
  return `<section class="stable-map-card ${points.length ? 'ready' : 'empty'}">
    <div class="stable-map-head"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(zoomText)}</span></div>
    <div class="stable-map-canvas">
      ${renderRouteSvg(points)}
      <div class="map-overlay-info">
        <span>${latest ? `${latest.lat.toFixed(5)}, ${latest.lng.toFixed(5)}` : 'GPS待機中'}</span>
        <strong>${distanceKm(points).toFixed(2)}km</strong>
      </div>
    </div>
    <div class="stable-map-actions">
      <button id="addGps" class="btn primary slim">現在地</button>
      ${mapsLink ? `<a class="btn slim" href="${mapsLink}" target="_blank" rel="noopener">地図で開く</a>` : '<button class="btn slim" disabled>地図で開く</button>'}
      <button id="pauseWalk" class="btn slim">${session.paused ? '再開' : '一時停止'}</button>
    </div>
  </section>`;
}

function renderRouteSvg(points) {
  if (!points.length) {
    return `<div class="empty-map-message"><strong>現在地を取得中</strong><span>散歩開始後、近距離ルートをここに固定表示します。</span></div>`;
  }
  const latest = points.slice(-80);
  const lats = latest.map((p) => p.lat);
  const lngs = latest.map((p) => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const w = Math.max(maxLng - minLng, 0.00018);
  const h = Math.max(maxLat - minLat, 0.00018);
  const coords = latest.map((p) => {
    const x = 10 + ((p.lng - minLng) / w) * 80;
    const y = 90 - ((p.lat - minLat) / h) * 80;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const last = latest[latest.length - 1];
  const lastX = 10 + ((last.lng - minLng) / w) * 80;
  const lastY = 90 - ((last.lat - minLat) / h) * 80;
  const first = latest[0];
  const firstX = 10 + ((first.lng - minLng) / w) * 80;
  const firstY = 90 - ((first.lat - minLat) / h) * 80;
  return `<svg class="route-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="散歩ルート">
    <defs><pattern id="fieldGrid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(62,49,35,.09)" stroke-width=".6"/></pattern></defs>
    <rect width="100" height="100" fill="url(#fieldGrid)" />
    ${latest.length > 1 ? `<polyline points="${coords}" fill="none" stroke="rgba(64,86,56,.85)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />` : ''}
    <circle cx="${firstX.toFixed(1)}" cy="${firstY.toFixed(1)}" r="2.4" fill="rgba(120,96,68,.85)" />
    <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="4.2" fill="rgba(36,75,50,.95)" />
  </svg>`;
}

function renderWalkActions(mode) {
  if (mode === 'campWalk') {
    return `<section class="record-action-panel"><div class="action-title"><strong>よく使う</strong><span>場内確認用</span></div>
      <div class="action-grid five">
        ${actionButton('photoBtn', '写真', '残す')}
        ${actionButton('memoFocus', 'メモ', '入力')}
        ${actionButton('facilityMemo', '設備', 'トイレ等')}
        ${actionButton('viewMemo', '景色', '場所')}
        ${actionButton('riskMemo', '注意', '危険箇所')}
      </div>${renderMemoInput('サイト周辺、設備、景色、危険箇所など')}
    </section>`;
  }
  return `<section class="record-action-panel"><div class="action-title"><strong>よく使う</strong><span>自宅散歩用</span></div>
    <div class="action-grid four">
      ${actionButton('photoBtn', '写真', '残す')}
      ${actionButton('memoFocus', 'メモ', '入力')}
      ${actionButton('routeMemo', 'ルート', '気づき')}
      ${actionButton('conditionMemo', '様子', '体調')}
    </div>${renderMemoInput('散歩ルート、コタの様子、気になったこと')}
  </section>`;
}

function renderCampActions(session) {
  return `<section class="record-action-panel camp-panel"><div class="action-title"><strong>キャンプ中に残す</strong><span>親記録の中にまとめる</span></div>
    <div class="action-grid five">
      ${childAction('campWalk')}${childAction('setup')}${childAction('cook')}${childAction('teardown')}${childAction('memo')}
    </div>${renderMemoInput('キャンプ全体の気づき、天気、サイト感など')}
  </section>`;
}
function childAction(type) { return `<button class="startChildMode action-btn" data-type="${escapeHtml(type)}"><strong>${escapeHtml(modeShort(type))}</strong><span>${escapeHtml(modeMeta(type).sub)}</span></button>`; }
function renderSetupActions() {
  return `<section class="record-action-panel"><div class="action-title"><strong>設営</strong><span>時間と段取り</span></div><div class="action-grid four">
    ${actionButton('setupStart', '開始', '設営')}${actionButton('setupEnd', '完了', '設営')}${actionButton('photoBtn', '写真', '配置')}${actionButton('setupIssue', '注意', '次回')}
    </div>${renderMemoInput('設営で詰まったこと、配置、次回直すこと')}</section>`;
}
function renderCookActions() {
  return `<section class="record-action-panel"><div class="action-title"><strong>料理</strong><span>写真・量・次回</span></div><div class="action-grid four">
    ${actionButton('photoBtn', '写真', '料理')}${actionButton('mealAmount', '量', '多/少')}${actionButton('tasteMemo', '味', '感想')}${actionButton('nextMealMemo', '次回', '改善')}
    </div>${renderMemoInput('料理の量、味、余り、次回の変更点')}</section>`;
}
function renderTeardownActions() {
  return `<section class="record-action-panel"><div class="action-title"><strong>撤収</strong><span>収納・濡れ物・忘れ物</span></div><div class="action-grid four">
    ${actionButton('teardownStart', '開始', '撤収')}${actionButton('teardownEnd', '完了', '撤収')}${actionButton('wetItem', '濡れ物', '乾燥')}${actionButton('packingMemo', '収納', '順番')}
    </div>${renderMemoInput('撤収で時間がかかったこと、濡れ物、収納順')}</section>`;
}
function renderMemoActions() {
  return `<section class="record-action-panel"><div class="action-title"><strong>メモ</strong><span>軽く残す</span></div><div class="action-grid three">
    ${actionButton('photoBtn', '写真', '残す')}${actionButton('voiceMemo', '音声', '話す')}${actionButton('memoFocus', 'メモ', '入力')}
    </div>${renderMemoInput('気づいたことをそのまま残す')}</section>`;
}
function actionButton(id, label, sub) { return `<button id="${escapeHtml(id)}" class="action-btn" type="button"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(sub)}</span></button>`; }
function renderMemoInput(placeholder) {
  return `<div class="memo-capture"><textarea id="recordMemo" class="field textarea" rows="3" placeholder="${escapeHtml(placeholder)}"></textarea><button id="addMemo" class="btn primary">メモを残す</button></div>`;
}

function renderModeControls(session) {
  if (session.type === 'camp' && session.activeChild) {
    return `<section class="record-controls"><button id="finishChild" class="btn primary">${escapeHtml(modeShort(session.activeChild.type))}を保存して戻る</button><button id="discardChild" class="btn danger subtle-danger">子記録を破棄</button><button id="finishWalk" class="btn">キャンプを保存終了</button><button id="discardWalk" class="btn danger subtle-danger">キャンプを破棄</button></section>`;
  }
  return `<section class="record-controls"><button id="finishWalk" class="btn primary">保存して終了</button><button id="discardWalk" class="btn danger subtle-danger">破棄</button></section>`;
}

function renderHistory(history, selectedId = null, compactAfterDetail = false) {
  const filter = getState().recordHistoryFilter || 'all';
  const filtered = filterHistory(history, filter);
  return card(`<section class="record-history-shell ${compactAfterDetail ? 'compact' : ''}">
    <div class="history-head"><strong>${compactAfterDetail ? '他の履歴' : '履歴'}</strong><span>${history.length}件</span></div>
    <div class="history-filter">
      ${historyFilterButton('today', '今日', filter)}${historyFilterButton('walk', '散歩', filter)}${historyFilterButton('camp', 'キャンプ', filter)}${historyFilterButton('all', 'すべて', filter)}
    </div>
    ${filtered.length ? `<div class="history-list field-history-list">${filtered.slice(0, compactAfterDetail ? 4 : 12).map((item) => renderHistoryCard(item, selectedId)).join('')}</div>` : '<p class="empty-line">まだ履歴はありません。</p>'}
  </section>`, 'record-field-card history-field-card');
}
function historyFilterButton(type, label, active) { return `<button class="historyFilter ${active === type ? 'active' : ''}" data-filter="${escapeHtml(type)}">${escapeHtml(label)}</button>`; }
function filterHistory(history, filter) {
  const today = new Date().toDateString();
  if (filter === 'today') return history.filter((item) => item.startedAt && new Date(item.startedAt).toDateString() === today);
  if (filter === 'walk') return history.filter((item) => walkPointsOf(item).length || ['homeWalk', 'campWalk', 'walk'].includes(normalizeMode(item.type)) || childSegmentsOf(item).some((c) => isWalkMode(c.type)));
  if (filter === 'camp') return history.filter((item) => item.type === 'camp' || childSegmentsOf(item).length);
  return history;
}
function renderHistoryCard(item, selectedId) {
  const label = historyTitle(item);
  const points = walkPointsOf(item);
  const childCount = childSegmentsOf(item).length;
  const selected = selectedId === item.session_id;
  return `<article class="history-row ${selected ? 'selected' : ''}">
    <div class="history-row-main"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(formatTime(item.startedAt))}</span></div>
    <div class="history-row-meta"><span>${escapeHtml(elapsedText(item.startedAt, item.endedAt))}</span><span>${distanceKm(points).toFixed(2)}km</span><span>${recordsOf(item).length}件</span>${childCount ? `<span>子${childCount}</span>` : ''}</div>
    <button class="btn small detailSession" data-id="${escapeHtml(item.session_id)}">詳細</button>
  </article>`;
}
function historyTitle(item) {
  if (item.type === 'camp') return item.parentTitle || item.title || 'キャンプ滞在';
  return item.title || modeLabel(item.type);
}

function renderDetail(session) {
  const points = walkPointsOf(session);
  const reviews = buildReviewItems(session);
  const photos = recordsOf(session).filter((record) => record.preview);
  return card(`<section id="recordDetail" class="record-detail-screen">
    <button id="backToHistory" class="back-link">← 履歴へ戻る</button>
    <div class="detail-title-block"><span>履歴詳細</span><h2>${escapeHtml(historyTitle(session))}</h2><p>${escapeHtml(formatTime(session.startedAt, true))}</p></div>
    <div class="detail-metrics"><div><span>時間</span><strong>${escapeHtml(elapsedText(session.startedAt, session.endedAt))}</strong></div><div><span>距離</span><strong>${distanceKm(points).toFixed(2)}km</strong></div><div><span>記録</span><strong>${recordsOf(session).length}件</strong></div></div>
    ${childSegmentsOf(session).length ? renderChildTimeline(session) : ''}
    ${points.length ? renderStableWalkMap(session, session.type === 'camp' ? 'campWalk' : 'homeWalk', points) : ''}
    ${photos.length ? `<section class="detail-section"><h3>写真</h3><div class="photo-strip">${photos.slice(0, 8).map((record) => `<img src="${record.preview}" alt="${escapeHtml(record.title)}" />`).join('')}</div></section>` : ''}
    <section class="detail-section"><h3>記録一覧</h3>${renderRecordList(recordsOf(session), true)}</section>
    ${points.length ? `<section class="detail-section"><h3>GPSログ</h3>${renderGpsLog(points)}</section>` : ''}
    <section class="detail-section"><h3>次回へ戻す</h3>${listItems(reviews, 'まだなし')}</section>
    <section class="detail-danger"><button id="deleteHistory" class="btn danger subtle-danger" data-id="${escapeHtml(session.session_id)}">この履歴を削除</button></section>
  </section>`, 'record-field-card detail-field-card');
}
function renderChildTimeline(session) {
  return `<section class="child-timeline"><h3>キャンプ内の記録</h3>${childSegmentsOf(session).map((child) => `<div><span>${escapeHtml(modeShort(child.type))}</span><strong>${escapeHtml(elapsedText(child.startedAt, child.endedAt))}</strong><small>${escapeHtml(formatTime(child.startedAt))}</small></div>`).join('')}</section>`;
}
function renderRecordList(records, full = false) {
  if (!records.length) return '<p class="empty-line">まだ記録はありません。</p>';
  const list = full ? records : records.slice(0, 16);
  return `<ul class="record-log-list">${list.map((record) => `<li><span>${escapeHtml(modeShort(record.mode))}</span><div><strong>${escapeHtml(record.title)}</strong><small>${escapeHtml(formatTime(record.createdAt))}${record.detail ? ` / ${escapeHtml(record.detail)}` : ''}</small>${record.preview ? `<img src="${record.preview}" alt="写真メモ" class="memo-image" />` : ''}</div></li>`).join('')}</ul>`;
}
function renderGpsLog(points) {
  return `<div class="gps-log-list">${points.slice(-8).reverse().map((point) => `<div><strong>${escapeHtml(formatTime(point.createdAt))}</strong><span>${point.lat.toFixed(5)}, ${point.lng.toFixed(5)} / ±${Math.round(point.accuracy || 0)}m</span></div>`).join('')}</div>`;
}

function bindWalk() {
  document.querySelectorAll('.startSession').forEach((button) => button.addEventListener('click', () => startSession(button.dataset.type, button.dataset.title)));
  document.querySelectorAll('.startChildMode').forEach((button) => button.addEventListener('click', () => startChildMode(button.dataset.type)));
  document.querySelectorAll('.switchCampMode').forEach((button) => button.addEventListener('click', () => switchCampMode(button.dataset.type)));
  document.querySelectorAll('.switchStandaloneMode').forEach((button) => button.addEventListener('click', () => switchStandaloneMode(button.dataset.type)));
  document.querySelectorAll('.historyFilter').forEach((button) => button.addEventListener('click', () => { patchState({ recordHistoryFilter: button.dataset.filter }); renderWalk(); }));
  document.querySelectorAll('.detailSession').forEach((button) => button.addEventListener('click', () => { patchState({ selectedRecordSessionId: button.dataset.id }); renderWalk(); window.scrollTo({ top: 0, behavior: 'smooth' }); }));
  document.getElementById('backToHistory')?.addEventListener('click', () => { patchState({ selectedRecordSessionId: null }); renderWalk(); });
  document.getElementById('deleteHistory')?.addEventListener('click', (event) => deleteHistorySession(event.currentTarget.dataset.id));
  document.getElementById('finishWalk')?.addEventListener('click', finishSession);
  document.getElementById('finishSessionTop')?.addEventListener('click', finishSession);
  document.getElementById('discardWalk')?.addEventListener('click', discardSession);
  document.getElementById('finishChild')?.addEventListener('click', finishChildMode);
  document.getElementById('discardChild')?.addEventListener('click', discardChildMode);
  document.getElementById('addMemo')?.addEventListener('click', addTextMemo);
  document.getElementById('memoFocus')?.addEventListener('click', () => document.getElementById('recordMemo')?.focus());
  document.getElementById('addGps')?.addEventListener('click', () => captureGpsPoint(true));
  document.getElementById('pauseWalk')?.addEventListener('click', togglePauseWalk);
  document.getElementById('photoBtn')?.addEventListener('click', () => document.getElementById('photoInput')?.click());
  document.getElementById('videoBtn')?.addEventListener('click', () => document.getElementById('videoInput')?.click());
  document.getElementById('photoInput')?.addEventListener('change', (event) => handleFileMemo(event, 'photo'));
  document.getElementById('videoInput')?.addEventListener('change', (event) => handleFileMemo(event, 'video'));
  document.getElementById('voiceMemo')?.addEventListener('click', startVoiceMemo);
  bindQuickRecord('facilityMemo', '設備メモ', 'トイレ・炊事場・売店・ゴミ捨て場など');
  bindQuickRecord('viewMemo', '景色メモ', '景色が良い場所・写真候補');
  bindQuickRecord('riskMemo', '注意メモ', '危険箇所・足元・音・混雑');
  bindQuickRecord('routeMemo', 'ルートメモ', '歩きやすさ・道幅・信号・暗さ');
  bindQuickRecord('conditionMemo', '様子メモ', 'コタの歩き方・疲れ・暑さ寒さ');
  bindQuickRecord('setupStart', '設営開始', '設営時間を計測');
  bindQuickRecord('setupEnd', '設営完了', '設営完了と次回段取り');
  bindQuickRecord('setupIssue', '設営注意', '詰まったこと・改善点');
  bindQuickRecord('mealAmount', '料理量メモ', '多い/少ない/ちょうどいい');
  bindQuickRecord('tasteMemo', '味メモ', '味付け・火加減・次回調整');
  bindQuickRecord('nextMealMemo', '次回料理メモ', '次回また作る/変更する');
  bindQuickRecord('teardownStart', '撤収開始', '撤収時間を計測');
  bindQuickRecord('teardownEnd', '撤収完了', '撤収完了と反省');
  bindQuickRecord('wetItem', '濡れ物メモ', '乾燥・収納確認');
  bindQuickRecord('packingMemo', '収納メモ', '積載・収納順・忘れ物');
}
function bindQuickRecord(id, title, detail) { document.getElementById(id)?.addEventListener('click', () => addRecord(makeRecord('quick', title, detail))); }

function startSession(type = 'homeWalk', defaultTitle = '') {
  const customTitle = document.getElementById('sessionTitle')?.value?.trim();
  const mode = normalizeMode(type, false);
  const project = getState().nextProject;
  const campName = project?.reservation?.campground || project?.campground || '';
  const title = customTitle || defaultTitle || (mode === 'camp' ? (campName ? `${campName} 記録` : 'キャンプ記録') : modeLabel(mode));
  if (mode === 'campWalk') return startCampWithChild('campWalk', title);
  const session = {
    session_id: `session_${Date.now()}`,
    type: mode,
    title,
    parentTitle: mode === 'camp' ? title : '',
    status: 'active',
    startedAt: nowISO(),
    records: [],
    gpsPoints: [],
    childSegments: [],
    locationLabel: mode === 'homeWalk' ? '現在地確認中' : ''
  };
  patchState({ walkSession: session, selectedRecordSessionId: null });
  toast(`${modeLabel(mode)}を開始`);
  renderWalk();
  if (isWalkMode(mode)) window.setTimeout(() => captureGpsPoint(false), 500);
}

function startCampWithChild(childType = 'campWalk', title = '') {
  const project = getState().nextProject;
  const campName = project?.reservation?.campground || project?.campground || '';
  const parentTitle = campName ? `${campName} 記録` : 'キャンプ記録';
  const child = { child_id: `child_${Date.now()}`, type: childType, title: modeLabel(childType), startedAt: nowISO() };
  const session = {
    session_id: `session_${Date.now()}`,
    type: 'camp',
    title: parentTitle,
    parentTitle,
    status: 'active',
    startedAt: nowISO(),
    activeChild: child,
    records: [],
    gpsPoints: [],
    childSegments: [],
    locationLabel: '現在地確認中'
  };
  patchState({ walkSession: session, selectedRecordSessionId: null });
  toast(`${modeLabel(childType)}を開始`);
  renderWalk();
  if (isWalkMode(childType)) window.setTimeout(() => captureGpsPoint(false), 500);
}

function switchCampMode(type) {
  const session = activeSession();
  if (!session || session.type !== 'camp') return;
  if (type === 'camp') {
    if (session.activeChild && !window.confirm(`${modeLabel(session.activeChild.type)}を保存して、キャンプ滞在に戻りますか？`)) return;
    patchState({ walkSession: closeChild(session, true) });
    renderWalk();
    return;
  }
  startChildMode(type);
}

function switchStandaloneMode(type) {
  const session = activeSession();
  if (!session || session.type === 'camp') return;
  const target = normalizeMode(type, false);
  const current = currentMode(session);
  if (target === current) return;
  if (!window.confirm(`${modeLabel(current)}を保存して、${modeLabel(target)}へ移動しますか？`)) return;
  saveCurrentSessionToHistory(session, false);
  if (target === 'camp') startSession('camp');
  else startSession(target);
}

function startChildMode(type) {
  const session = activeSession();
  if (!session || session.status !== 'active' || session.type !== 'camp') return;
  const mode = normalizeMode(type, true);
  if (session.activeChild?.type === mode) return;
  if (session.activeChild && !window.confirm(`${modeLabel(session.activeChild.type)}を保存して、${modeLabel(mode)}を開始しますか？`)) return;
  const closed = closeChild(session, true);
  const activeChild = { child_id: `child_${Date.now()}`, type: mode, title: modeLabel(mode), startedAt: nowISO() };
  patchState({ walkSession: { ...closed, activeChild, records: [makeRecord('mode', `${modeLabel(mode)}開始`, 'キャンプ内の子記録'), ...recordsOf(closed)] } });
  toast(`${modeLabel(mode)}を開始`);
  renderWalk();
  if (isWalkMode(mode)) window.setTimeout(() => captureGpsPoint(false), 500);
}

function closeChild(session, save = true) {
  const child = session.activeChild;
  if (!child) return session;
  const ended = { ...child, endedAt: nowISO() };
  return { ...session, activeChild: null, childSegments: save ? [ended, ...childSegmentsOf(session)] : childSegmentsOf(session) };
}

function finishChildMode() {
  const session = activeSession();
  if (!session?.activeChild) return;
  const childType = session.activeChild.type;
  const next = closeChild(session, true);
  patchState({ walkSession: { ...next, records: [makeRecord('mode', `${modeLabel(childType)}終了`, '子記録を保存'), ...recordsOf(next)] } });
  toast(`${modeLabel(childType)}を保存`);
  renderWalk();
}

function discardChildMode() {
  const session = activeSession();
  if (!session?.activeChild) return;
  if (!window.confirm(`${modeLabel(session.activeChild.type)}を破棄しますか？\nこの操作は元に戻せません。`)) return;
  patchState({ walkSession: { ...session, activeChild: null } });
  toast('子記録を破棄しました');
  renderWalk();
}

function addTextMemo() {
  const textarea = document.getElementById('recordMemo');
  const detail = textarea?.value?.trim();
  if (!detail) return toast('メモを入れてください');
  const mode = currentMode(activeSession());
  addRecord(makeRecord('memo', `${modeShort(mode)}メモ`, detail));
  if (textarea) textarea.value = '';
}

function addGpsPointToSession(point, manual = false) {
  updateActiveSession((session) => {
    const points = gpsPointsOf(session);
    const previous = points[points.length - 1];
    if (!manual && previous && haversine(previous, point) < 0.007) return session;
    const mode = currentMode(session);
    const taggedPoint = { ...point, mode, childId: session.activeChild?.child_id || '' };
    const records = manual ? [makeRecord('gps', '現在地', `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`, { point: taggedPoint }), ...recordsOf(session)] : recordsOf(session);
    return { ...session, gpsPoints: [...points, taggedPoint].slice(-600), records };
  });
  maybeResolvePlace(point);
}

function captureGpsPoint(manual = true) {
  if (!navigator.geolocation) {
    addRecord(makeRecord('gps', 'GPS取得不可', '位置情報が使えません'));
    return;
  }
  navigator.geolocation.getCurrentPosition((position) => {
    const point = { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy, createdAt: nowISO() };
    addGpsPointToSession(point, manual);
    toast(manual ? '現在地を残しました' : '現在地を確認しました');
    renderWalk();
  }, () => addRecord(makeRecord('gps', 'GPS取得失敗', '位置情報の許可を確認')), { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 });
}

function syncGpsWatch(session) {
  const mode = currentMode(session);
  const shouldWatch = session?.status === 'active' && isWalkMode(mode) && !session.paused;
  if (!shouldWatch) { stopGpsWatch(); return; }
  if (!navigator.geolocation) return;
  const key = `${session.session_id}:${session.activeChild?.child_id || 'root'}:${mode}`;
  if (geoWatchKey === key) return;
  stopGpsWatch();
  geoWatchKey = key;
  geoWatchId = navigator.geolocation.watchPosition((position) => {
    const point = { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy, createdAt: nowISO() };
    addGpsPointToSession(point, false);
    const now = Date.now();
    if (now - lastMapRenderAt > 5000) { lastMapRenderAt = now; renderWalk(); }
  }, () => undefined, { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 });
}

function stopGpsWatch() {
  if (geoWatchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(geoWatchId);
  geoWatchId = null;
  geoWatchKey = null;
}

function togglePauseWalk() {
  const session = activeSession();
  if (!session) return;
  patchState({ walkSession: { ...session, paused: !session.paused } });
  toast(session.paused ? '散歩を再開' : '一時停止');
  renderWalk();
}

async function maybeResolvePlace(point) {
  const session = activeSession();
  if (!session || resolvingPlace || session.locationLabel?.match(/市|区|町|村|付近|現在地/)) return;
  resolvingPlace = true;
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${point.lat}&lon=${point.lng}&zoom=16&accept-language=ja`, { headers: { 'Accept': 'application/json' } });
    const data = await res.json();
    const a = data.address || {};
    const label = [a.city || a.town || a.village || a.county || a.suburb, a.neighbourhood || a.road].filter(Boolean).slice(0, 2).join(' ') || '現在地付近';
    updateActiveSession((current) => ({ ...current, locationLabel: `${label}付近` }));
  } catch {
    updateActiveSession((current) => ({ ...current, locationLabel: '現在地付近' }));
  } finally { resolvingPlace = false; }
}

function handleFileMemo(event, type) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => addRecord(makeRecord(type, type === 'photo' ? '写真' : '動画', file.name, { preview: type === 'photo' ? reader.result : '', fileName: file.name }), type === 'photo' ? '写真を残しました' : '動画を残しました');
  reader.readAsDataURL(file);
}

function startVoiceMemo() {
  const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Speech) { addRecord(makeRecord('voice', '音声メモ', '音声認識未対応')); return; }
  speechRecognition = new Speech();
  speechRecognition.lang = 'ja-JP';
  speechRecognition.interimResults = false;
  speechRecognition.onresult = (event) => addRecord(makeRecord('voice', '音声', event.results?.[0]?.[0]?.transcript || ''));
  speechRecognition.onerror = () => addRecord(makeRecord('voice', '音声失敗', 'もう一度試す'));
  speechRecognition.start();
  toast('話してください');
}

function saveCurrentSessionToHistory(session, select = true) {
  const state = getState();
  const closed = closeChild(session, true);
  const ended = { ...closed, status: 'done', endedAt: nowISO() };
  const reviewItems = buildReviewItems(ended);
  patchState({ walkSession: null, recordHistory: [ended, ...(state.recordHistory || [])].slice(0, 80), selectedRecordSessionId: select ? ended.session_id : null, reviewQueue: [...new Set([...(state.reviewQueue || []), ...reviewItems])] });
  return ended;
}

function finishSession() {
  const session = activeSession();
  if (!session) return;
  stopGpsWatch();
  const ended = saveCurrentSessionToHistory(session, true);
  toast('保存しました');
  renderWalk();
  window.setTimeout(() => document.getElementById('recordDetail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  return ended;
}

function discardSession() {
  const session = activeSession();
  const name = session?.title || 'この記録';
  if (!window.confirm(`${name} を破棄しますか？\nこの操作は元に戻せません。`)) return;
  stopGpsWatch();
  patchState({ walkSession: null });
  toast('破棄しました');
  renderWalk();
}

function deleteHistorySession(sessionId) {
  const state = getState();
  const target = (state.recordHistory || []).find((item) => item.session_id === sessionId);
  if (!target) return;
  if (!window.confirm(`${historyTitle(target)} を削除しますか？\nこの操作は元に戻せません。`)) return;
  patchState({ recordHistory: (state.recordHistory || []).filter((item) => item.session_id !== sessionId), selectedRecordSessionId: null });
  toast('履歴を削除しました');
  renderWalk();
}

function startTimer() {
  if (timer) window.clearInterval(timer);
  timer = window.setInterval(() => {
    const session = activeSession();
    const el = document.getElementById('walkTimer');
    if (session && el) el.textContent = elapsedText(session.activeChild?.startedAt || session.startedAt);
  }, 1000);
}
