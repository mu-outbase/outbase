import { app, escapeHtml, toast } from '../../ui/components.js?v=core08-d3-day-link-gps-20260705';
import { getState, patchState } from '../../core/store.js?v=core08-d3-day-link-gps-20260705';
import { go } from '../../core/router.js?v=core08-d3-day-link-gps-20260705';

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
const TEXT_RULES = [
  { tag: 'setup', label: '設営っぽい', reason: '設営・幕・タープ・ペグ・風などの言葉', pattern: /設営|幕|テント|タープ|ペグ|ロープ|風|張|ランタン|シェルター/ },
  { tag: 'meal', label: '料理っぽい', reason: '料理・食材・味・量などの言葉', pattern: /料理|飯|ご飯|夕飯|朝食|昼食|焼|煮|味|食材|量|多すぎ|少ない|余り|エビ|肉|ピザ|シュリンプ/ },
  { tag: 'kota', label: 'コタ関連っぽい', reason: 'コタ・犬・暑さ・足元などの言葉', pattern: /コタ|犬|散歩|暑|熱|水|日陰|足|肉球|カート|ドッグ|ハーネス/ },
  { tag: 'walk', label: '場内確認っぽい', reason: 'トイレ・炊事場・景色・場内などの言葉', pattern: /場内|散歩|トイレ|炊事|景色|サイト|坂|段差|危険|ドッグラン|売店|受付/ },
  { tag: 'teardown', label: '撤収っぽい', reason: '撤収・片付け・濡れ物・ゴミなどの言葉', pattern: /撤収|片付|収納|積|濡|乾燥|ゴミ|忘れ物|チェックアウト|アウト/ },
  { tag: 'shopping', label: '買い出しっぽい', reason: '買う・不足・現地調達などの言葉', pattern: /買|スーパー|コンビニ|不足|足りない|忘れ|現地|調達/ },
  { tag: 'next', label: '次回注意っぽい', reason: '次回・改善・後悔・不要などの言葉', pattern: /次回|改善|後悔|いらない|不要|持ってく|持っていく|忘れ|失敗|注意/ }
];

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
function dayGpsHints(state = getState(), key = projectKey(state)) { return safeList(state.dayGpsHints?.[key]); }
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
function gpsAgeText(gps) {
  if (!gps?.capturedAt && !gps?.createdAt) return '未取得';
  const diff = Math.max(0, Math.floor((Date.now() - new Date(gps.capturedAt || gps.createdAt).getTime()) / 60000));
  if (diff < 1) return 'たった今';
  if (diff < 60) return `${diff}分前`;
  return `${Math.floor(diff / 60)}時間前`;
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
function guessFlow(state, gps = latestGpsHint(state)) {
  const project = state.nextProject || {};
  const c = context(state, project);
  const records = dayRecords(state);
  const text = records.slice(0, 5).map((record) => `${record.title} ${record.detail} ${record.tagLabel}`).join(' ');
  if (/撤収|片付|濡|ゴミ|チェックアウト/.test(text)) return '撤収・積み込み前後の可能性';
  if (/料理|ご飯|食材|味|量/.test(text)) return '料理・食事まわりの可能性';
  if (/設営|幕|タープ|ペグ/.test(text)) return '設営中または設営直後の可能性';
  const speed = gpsSpeedKmh(gps);
  if (speed !== null && speed >= 15) return '車移動中の可能性';
  if (speed !== null && speed > 1.5 && speed < 8) return '場内移動・コタ散歩の可能性';
  if (gps) return 'サイト滞在中・作業中の可能性';
  return c.routeMemo || c.weatherDecisionMemo || '現地状況は未確定';
}
function contextSnapshot(state = getState()) {
  const project = state.nextProject || {};
  const c = context(state, project);
  const gps = latestGpsHint(state);
  return {
    projectKey: projectKey(state),
    projectName: projectName(project),
    projectDate: projectDate(project),
    captureAt: nowIso(),
    gps,
    weatherMemo: c.weatherDecisionMemo || c.weatherMemo || '',
    routeMemo: c.routeMemo || '',
    menuMemo: c.menuMemo || c.fixedDishMemo || '',
    gearMemo: c.gearMemo || '',
    kotaMemo: c.kotaMemo || '',
    inferredFlow: guessFlow(state, gps)
  };
}
function pushCandidate(list, candidate) {
  if (!candidate?.tag) return;
  if (list.some((item) => item.tag === candidate.tag && item.reason === candidate.reason)) return;
  list.push(candidate);
}
function inferCandidates(record = {}, state = getState()) {
  const snapshot = record.contextSnapshot || contextSnapshot(state);
  const text = `${record.title || ''} ${record.detail || ''} ${record.timeHint || ''} ${snapshot.weatherMemo || ''} ${snapshot.routeMemo || ''}`;
  const list = [];
  TEXT_RULES.forEach((rule) => {
    if (rule.pattern.test(text)) pushCandidate(list, { tag: rule.tag, label: rule.label, reason: rule.reason, source: 'text' });
  });
  const gps = snapshot.gps || latestGpsHint(state);
  const speed = gpsSpeedKmh(gps);
  if (gps) {
    if (speed !== null && speed >= 15) pushCandidate(list, { tag: 'depart', label: '移動中っぽい', reason: 'GPS速度が車移動に近い', source: 'gps' });
    else if (speed !== null && speed > 1.5 && speed < 8) {
      pushCandidate(list, { tag: 'walk', label: '場内移動っぽい', reason: 'GPS速度が徒歩移動に近い', source: 'gps' });
      pushCandidate(list, { tag: 'kota', label: 'コタ散歩かも', reason: '徒歩速度＋当日記録', source: 'gps' });
    } else {
      pushCandidate(list, { tag: 'setup', label: 'サイト滞在作業かも', reason: 'GPS移動が少ない', source: 'gps' });
      pushCandidate(list, { tag: 'meal', label: 'サイト滞在中の料理かも', reason: 'GPS移動が少ない', source: 'gps' });
    }
  }
  if (record.captureMode === 'before') pushCandidate(list, { tag: 'next', label: '事前チェック候補', reason: '事前メモとして登録', source: 'mode' });
  if (record.captureMode === 'later') pushCandidate(list, { tag: 'notice', label: '後追い整理候補', reason: 'あとで登録として保存', source: 'mode' });
  return list.slice(0, 5);
}
function summarize(records = []) {
  const items = [];
  records.forEach((record) => {
    const candidates = safeList(record.inferenceCandidates);
    candidates.forEach((candidate) => {
      if (candidate.tag === 'forgot' || candidate.tag === 'shopping') items.push('忘れ物・不足を次回準備へ戻す候補');
      if (candidate.tag === 'teardown') items.push('雨撤収・濡れ物・乾燥サービスの確認候補');
      if (candidate.tag === 'kota') items.push('暑さ対策とコタ負担の確認候補');
      if (candidate.tag === 'meal') items.push('料理量・食材量の調整候補');
      if (candidate.tag === 'setup') items.push('設営/撤収の段取り改善候補');
      if (candidate.tag === 'walk') items.push('場内導線・サイトレビュー素材の確認候補');
    });
  });
  const text = records.map((record) => `${record.title} ${record.detail} ${record.tagLabel}`).join(' ');
  if (/忘れ|不足|足りない|足りな|買え/.test(text)) items.push('忘れ物・不足を次回準備へ戻す候補');
  if (/雨|濡|乾燥|撤収/.test(text)) items.push('雨撤収・濡れ物・乾燥サービスの確認候補');
  if (/暑|熱|冷却|WAVE|扇風機|コタ|犬/.test(text)) items.push('暑さ対策とコタ負担の確認候補');
  return [...new Set(items)].slice(0, 5);
}

function renderHero(state, project, records) {
  const c = context(state, project);
  const gps = latestGpsHint(state);
  const start = state.dayStartedAt || '';
  return `<section class="easy-day-hero d3-day-hero day-card">
    <div class="easy-day-title"><span>当日連携記録</span><h2>${escapeHtml(projectName(project))}</h2><p>${escapeHtml(projectDate(project) || c.weatherDecisionMemo || c.routeMemo || '写真・メモを残すだけ。時刻/GPS/準備内容から候補だけ出します。')}</p></div>
    <div class="easy-day-status"><strong>${records.length}</strong><span>今日の記録</span><small>${escapeHtml(start ? `開始から${elapsedText(start)}` : '未開始')}</small></div>
    <div class="d3-context-strip"><span>今の推定</span><strong>${escapeHtml(guessFlow(state, gps))}</strong><em>${escapeHtml(gps ? `GPS ${gpsAgeText(gps)}` : 'GPS未取得')}</em></div>
  </section>`;
}

function renderContextCard(state, records) {
  const project = state.nextProject || {};
  const c = context(state, project);
  const gps = latestGpsHint(state);
  return `<section class="d3-context-card day-card">
    <div class="easy-section-head"><div><span>CONTEXT</span><strong>OUTBASEが見る材料</strong></div><small>勝手に確定しない</small></div>
    <div class="d3-context-grid">
      <div><span>GPS</span><strong>${escapeHtml(gps ? gpsLabel(gps) : '未取得')}</strong><small>${escapeHtml(gps ? gpsAgeText(gps) : '現在地取得で候補精度UP')}</small></div>
      <div><span>天気</span><strong>${escapeHtml(c.weatherDecisionMemo || c.weatherMemo || '未入力')}</strong><small>暑さ/雨/風/コタ負担に連携</small></div>
      <div><span>準備</span><strong>${escapeHtml(c.menuMemo || c.fixedDishMemo || c.gearMemo || '未入力')}</strong><small>料理/ギア/次回注意に連携</small></div>
      <div><span>記録</span><strong>${records.length}件</strong><small>候補だけ増やす</small></div>
    </div>
    <div class="d3-context-actions"><button id="captureGps" class="btn primary" type="button">現在地を材料に追加</button><button id="goPrepFromContext" class="btn" type="button">準備を見る</button></div>
  </section>`;
}

function renderModeTabs(state, records) {
  const current = captureMode(state);
  return `<section class="easy-mode-card day-card">
    <div class="easy-mode-head"><strong>どう残す？</strong><span>押し忘れ・後追い・事前メモOK</span></div>
    <div class="easy-mode-tabs">
      ${Object.entries(CAPTURE_MODES).map(([key, item]) => `<button type="button" class="easy-mode-tab ${current === key ? 'active' : ''}" data-capture-mode="${escapeHtml(key)}"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.sub)}</span><em>${modeCount(records, key)}</em></button>`).join('')}
    </div>
  </section>`;
}

function renderBigCapture(state) {
  const mode = modeMeta(captureMode(state));
  return `<section class="easy-capture-card day-card">
    <div class="easy-capture-head"><div><span>${escapeHtml(mode.label)}</span><strong>${escapeHtml(mode.prefix)}</strong></div><small>分類はあとで候補表示</small></div>
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
    <textarea id="easyMemo" class="field textarea easy-memo" rows="4" placeholder="${escapeHtml(modeLabel)}：例）さっき設営終わった。コタ暑そう。エビ多かった。売店に行った。"></textarea>
    <div class="easy-mini-row">
      <label><span>時間ざっくり</span><select id="easyTimeHint" class="field">${TIME_HINTS.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join('')}</select></label>
      <label><span>タグ任意</span><select id="easyTag" class="field">${TAGS.map((item) => `<option value="${escapeHtml(item.key)}" ${activeTag(state) === item.key ? 'selected' : ''}>${escapeHtml(item.icon)} ${escapeHtml(item.label)}</option>`).join('')}</select></label>
    </div>
    <p class="d3-form-help">タグを選ばなくても未分類で保存。GPS・時刻・文章から候補だけ出します。</p>
    <div class="easy-save-row"><button id="easySaveMemo" class="btn primary" type="button">残す</button><button id="easyRoughSave" class="btn" type="button">何となく残す</button></div>
  </div>`;
}

function renderTimeline(records = []) {
  return `<section class="easy-timeline-card day-card">
    <div class="easy-section-head"><div><span>TIMELINE</span><strong>今日の記録</strong></div><small>${records.length}件</small></div>
    ${records.length ? `<div class="easy-timeline-list">${records.slice(0, 30).map(renderRecord).join('')}</div>` : '<p class="empty-line">まだ記録はありません。写真・メモ・音声・動画を残すだけでOKです。</p>'}
  </section>`;
}

function renderCandidateChips(candidates = []) {
  if (!candidates.length) return '<div class="d3-candidate-empty">候補なし。未分類のまま保存されています。</div>';
  return `<div class="d3-candidate-list">${candidates.map((candidate) => `<span class="d3-candidate-chip source-${escapeHtml(candidate.source || 'rule')}">${escapeHtml(tagMeta(candidate.tag).icon)} ${escapeHtml(candidate.label)}<small>${escapeHtml(candidate.reason)}</small></span>`).join('')}</div>`;
}
function renderRecord(record) {
  const tag = tagMeta(record.tag || 'unclassified');
  const mode = modeMeta(record.captureMode || 'now');
  const attachments = safeList(record.attachments);
  const candidates = safeList(record.inferenceCandidates).length ? record.inferenceCandidates : inferCandidates(record);
  const gps = record.contextSnapshot?.gps || null;
  return `<article class="easy-record-row d3-record-row mode-${escapeHtml(record.captureMode || 'now')}">
    <div class="easy-record-top"><span>${escapeHtml(mode.label)}</span><strong>${escapeHtml(recordTypeLabel(record.type))}</strong><time>${escapeHtml(record.timeHint || formatTime(record.createdAt))}</time></div>
    <h3>${escapeHtml(record.title || recordTypeLabel(record.type))}</h3>
    ${record.detail ? `<p>${escapeHtml(record.detail)}</p>` : ''}
    <div class="easy-record-meta"><span>${escapeHtml(tag.icon)} ${escapeHtml(record.tagLabel || tag.label)}</span><span>${escapeHtml(formatTime(record.createdAt))}</span>${record.planned ? '<span>予定メモ</span>' : ''}${gps ? `<span>GPS ${escapeHtml(gpsAgeText(gps))}</span>` : ''}</div>
    ${attachments.length ? `<div class="easy-attachments">${attachments.map((file) => `<span>${escapeHtml(file.kind || '')} ${escapeHtml(file.name || 'file')} ${file.size ? `/${Math.round(Number(file.size) / 1024)}KB` : ''}</span>`).join('')}</div>` : ''}
    <div class="d3-record-candidates"><strong>連想候補</strong>${renderCandidateChips(candidates)}</div>
  </article>`;
}

function renderOrganizer(records = []) {
  const items = summarize(records);
  return `<section class="easy-organizer-card d3-organizer-card day-card">
    <div class="easy-section-head"><div><span>あとで整理</span><strong>準備へ戻す候補</strong></div><small>ユーザー確定待ち</small></div>
    ${items.length ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '<p class="empty-line">記録が増えると、料理/ギア/コタ/ルート/次回注意への候補だけ出します。</p>'}
    <p class="easy-guard-note">GPS・時刻・文章で推定しても、分類・上書き・削除は勝手にしません。</p>
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
  const snapshot = contextSnapshot(state);
  const record = {
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
    source: 'day-link-gps',
    locked: true,
    contextSnapshot: snapshot,
    createdAt: nowIso()
  };
  record.inferenceCandidates = inferCandidates(record, state);
  return record;
}

function appendRecord(partial, message = '記録を残しました') {
  const state = getState();
  const key = projectKey(state);
  const records = dayRecords(state, key);
  const record = buildRecord(partial);
  if (!record.detail && !record.attachments.length && ['note', 'voice', 'rough', 'before', 'later'].includes(record.type)) return toast('内容を少しだけ入れてください');
  patchState({
    dayRecords: { ...(state.dayRecords || {}), [key]: [record, ...records] },
    dayStartedAt: state.dayStartedAt || nowIso(),
    activeDayTag: record.tag,
    dayCaptureMode: record.captureMode
  });
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

function captureGps() {
  if (!navigator.geolocation) return toast('この端末はGPS取得に未対応です');
  toast('現在地を取得します');
  navigator.geolocation.getCurrentPosition((pos) => {
    const state = getState();
    const key = projectKey(state);
    const coords = pos.coords || {};
    const gps = {
      id: makeId('gps'),
      lat: coords.latitude,
      lng: coords.longitude,
      accuracy: coords.accuracy,
      speed: coords.speed,
      speedKmh: coords.speed !== null && coords.speed !== undefined ? Number(coords.speed) * 3.6 : null,
      heading: coords.heading,
      altitude: coords.altitude,
      capturedAt: nowIso(),
      source: 'day-manual-gps'
    };
    patchState({ dayGpsHints: { ...(state.dayGpsHints || {}), [key]: [gps, ...dayGpsHints(state, key)].slice(0, 20) } });
    toast('GPSを連想材料に追加しました');
    renderDay();
  }, () => toast('GPSを取得できませんでした'), { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
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
  app().innerHTML = `<section class="route-page day-easy-page core08d3-day">
    ${renderHero(state, project, records)}
    ${renderContextCard(state, records)}
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
  document.getElementById('captureGps')?.addEventListener('click', captureGps);
  document.getElementById('goPrepFromContext')?.addEventListener('click', () => go('prep'));
  document.getElementById('jumpLater')?.addEventListener('click', () => { patchState({ dayCaptureMode: 'later' }); renderDay(); window.setTimeout(() => document.getElementById('easyMemo')?.focus(), 60); });
  document.getElementById('jumpBefore')?.addEventListener('click', seedBeforeMemo);
  document.getElementById('jumpRough')?.addEventListener('click', () => { patchState({ dayCaptureMode: 'rough', activeDayTag: 'unclassified' }); renderDay(); window.setTimeout(() => document.getElementById('easyMemo')?.focus(), 60); });
  document.getElementById('goPrepFromDay')?.addEventListener('click', () => go('prep'));
  document.getElementById('openRecordTab')?.addEventListener('click', () => go('walk'));
}
