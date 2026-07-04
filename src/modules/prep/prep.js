import { app, listItems, escapeHtml, toast } from '../../ui/components.js?v=core06-10-global-ui-reset-20260704';
import { getState, patchState } from '../../core/store.js?v=core06-10-global-ui-reset-20260704';
import { renderImportPanel } from '../import/import.js?v=core06-10-global-ui-reset-20260704';
import { buildLineList, buildPracticalPrep, normalizePrepContext } from './prepEngine.js?v=core06-10-global-ui-reset-20260704';

const FEATURE_META = {
  shoppingDetail: { label: '買物', sub: '食材・調味料・予備' },
  mealPlan: { label: '料理', sub: '1日目/2日目 朝昼晩' },
  gear: { label: 'ギア', sub: '持つ・積む' },
  kota: { label: 'コタ', sub: '同行用品' },
  route: { label: 'ルート', sub: '出発・経由地' }
};
function firstItems(items = [], count = 8) { return (items || []).slice(0, count); }
function countPrep(project) { return project?.prep ? Object.values(project.prep).reduce((sum, items) => sum + (items?.length || 0), 0) : 0; }
function projectName(project) { return project?.reservation?.campground || project?.title || '次のキャンプ'; }
function campPlans(state) {
  const list = [];
  if (state.nextProject) list.push({ key: state.nextProject.id || 'nextProject', title: projectName(state.nextProject), sub: state.nextProject.reservation?.dateText || '日程未確定', primary: true });
  (state.calendarEvents || []).filter((e) => e?.type === 'camp').slice(0, 6).forEach((e) => list.push({ key: e.id, title: e.title, sub: [e.start, e.end && e.end !== e.start ? e.end : ''].filter(Boolean).join('〜') }));
  return list;
}
function projectHero(project, plans, selectedKey) {
  const r = project?.reservation || {};
  const meta = [r.dateText, r.checkIn && `IN ${r.checkIn}`, r.checkOut && `OUT ${r.checkOut}`].filter(Boolean).join(' / ');
  return `<section class="route-summary-card prep-summary-card"><div><span>準備</span><h2>${escapeHtml(projectName(project))}</h2><p>${escapeHtml(meta || '複数予定はここから切替。まずは準備する予定を選ぶ。')}</p></div><b>${countPrep(project)}件</b></section>
    ${plans.length > 1 ? `<section class="panel-card tight-card"><div class="section-title-row"><strong>準備する予定</strong><small>${plans.length}件</small></div><div class="project-switch-row">${plans.map((p) => `<button class="projectSwitch ${selectedKey === p.key ? 'active' : ''}" data-project-key="${escapeHtml(p.key)}"><strong>${escapeHtml(p.title)}</strong><span>${escapeHtml(p.sub)}</span></button>`).join('')}</div></section>` : ''}`;
}
function featureButtons(active) {
  return `<div class="smart-chip-grid prep-feature-grid">${Object.entries(FEATURE_META).map(([key, meta]) => `<button class="prepFeature smart-chip ${active === key ? 'active' : ''}" data-feature="${key}"><strong>${escapeHtml(meta.label)}</strong><span>${escapeHtml(meta.sub)}</span></button>`).join('')}</div>`;
}
function mealRows(context = {}) {
  const menu = String(context.menuMemo || '').trim();
  const value = (label, fallback) => extractMeal(menu, label) || fallback;
  return `<div class="meal-matrix">
    <div><span>1日目 朝</span><strong>${escapeHtml(value('1日目朝', '出発前/車内'))}</strong></div><div><span>1日目 昼</span><strong>${escapeHtml(value('1日目昼', '移動中/軽食'))}</strong></div><div><span>1日目 夜</span><strong>${escapeHtml(value('1日目夜', menu || 'キャンプ飯'))}</strong></div>
    <div><span>2日目 朝</span><strong>${escapeHtml(value('2日目朝', 'キャンプ朝食'))}</strong></div><div><span>2日目 昼</span><strong>${escapeHtml(value('2日目昼', '帰り道/なし'))}</strong></div><div><span>2日目 夜</span><strong>${escapeHtml(value('2日目夜', '帰宅後'))}</strong></div>
  </div>`;
}
function detailShopping(items = []) {
  const fallback = ['肉：種類/部位/量を決める', '魚介：エビ・貝類はアレルギー確認', 'チーズ：ブラータ/ピザ用/カマンベール', '調味料：塩・胡椒・にんにく・油・バター', 'あったら良い：レモン・ハーブ・バケット'];
  return listItems(firstItems(items.length ? items : fallback, 9), '買物メモを足すと表示します');
}
function featurePanel(project, context, active) {
  const prep = project?.prep || {};
  if (active === 'mealPlan') return `<div class="feature-panel"><h3>料理計画</h3>${mealRows(context)}<p>1泊2日でも朝昼晩で考える。料理メモを入れると買物へ戻します。</p></div>`;
  if (active === 'gear') return `<div class="feature-panel"><h3>ギア管理</h3>${listItems(firstItems(prep.packing || [], 8), 'ギアメモを足すと表示します')}<p>ギア台帳・持参・積載はCore07で本格化。</p></div>`;
  if (active === 'kota') return `<div class="feature-panel"><h3>コタ用品</h3>${listItems(firstItems(prep.kota || [], 8), 'コタ同行条件を入れると表示します')}<p>自宅散歩とキャンプ場散歩は別管理。</p></div>`;
  if (active === 'route') return `<div class="feature-panel"><h3>ルート</h3><div class="route-summary"><strong>${escapeHtml(context.routeMemo || '出発時間・経由地を未設定')}</strong><span>当日タブに反映</span></div><p>コンビニ、休憩、チェックイン逆算はCore07/08で本格化。</p></div>`;
  return `<div class="feature-panel"><h3>詳細な買物リスト</h3>${detailShopping(prep.shopping || [])}<p>肉の種類・部位・量、チーズ、魚介、調味料、予備まで扱う前提。</p></div>`;
}
function extractMeal(value = '', key = '') { const line = String(value).split(/\n/).find((row) => row.replace(/\s/g, '').includes(key)); return line ? line.replace(/^.*?[：:]/, '').trim() : ''; }
function contextPanel(project, context) { return `<section class="panel-card tight-card"><details class="quiet-details"><summary>条件を足す</summary><div class="line-form two-col"><label><span>天気</span><textarea id="weatherMemo" class="field textarea compact" placeholder="雨 / 暑い / 風">${escapeHtml(context.weatherMemo)}</textarea></label><label><span>料理</span><textarea id="menuMemo" class="field textarea compact" placeholder="1日目夜：ピザ\n2日目朝：ホットサンド">${escapeHtml(context.menuMemo)}</textarea></label><label><span>行き方</span><textarea id="routeMemo" class="field textarea compact" placeholder="6:30 / コンビニ">${escapeHtml(context.routeMemo)}</textarea></label><label><span>設営撤収</span><textarea id="setupMemo" class="field textarea compact" placeholder="時間を測る / 雨撤収">${escapeHtml(context.setupMemo)}</textarea></label><label><span>ギア</span><textarea id="gearMemo" class="field textarea compact" placeholder="ヘキサ / EcoFlow">${escapeHtml(context.gearMemo)}</textarea></label><label><span>反省</span><textarea id="pastReflection" class="field textarea compact" placeholder="タオル不足 / 料理多い">${escapeHtml(context.pastReflection)}</textarea></label></div><div class="line-form two-col compact-extra"><input id="highTemp" class="field" inputmode="numeric" value="${escapeHtml(context.highTemp)}" placeholder="最高気温" /><input id="lowTemp" class="field" inputmode="numeric" value="${escapeHtml(context.lowTemp)}" placeholder="最低気温" /><input id="rainRisk" class="field" value="${escapeHtml(context.rainRisk)}" placeholder="降水" /><input id="windMemo" class="field" value="${escapeHtml(context.windMemo)}" placeholder="風" /><input id="peopleCount" class="field" inputmode="numeric" value="${escapeHtml(context.peopleCount)}" placeholder="人数" /><select id="kotaGoing" class="field"><option value="yes" ${context.kotaGoing !== 'no' ? 'selected' : ''}>コタ同行</option><option value="no" ${context.kotaGoing === 'no' ? 'selected' : ''}>コタなし</option></select></div><button id="updatePracticalPrep" class="primary-compact">整える</button></details></section>`; }
export function renderPrep() {
  const state = getState();
  const project = state.nextProject;
  const feature = state.prepFeature || 'shoppingDetail';
  if (!project) { app().innerHTML = `<section class="route-page"><section class="route-summary-card"><div><span>準備</span><h2>予定を入れる</h2><p>予約を入れると、買物・料理・ギア・コタ・ルートに分かれます。</p></div></section>${renderImportPanel()}</section>`; window.OUTBASE_IMPORT?.bind?.(); return; }
  const context = normalizePrepContext(state.prepContext || project?.prepContext || {}, project?.reservation || {});
  const plans = campPlans(state);
  const selectedKey = state.selectedPrepProjectId || project.id || 'nextProject';
  app().innerHTML = `<section class="route-page prep-lean">${projectHero(project, plans, selectedKey)}<section class="panel-card tight-card"><div class="section-title-row"><strong>この予定で使う</strong><small>5機能</small></div>${featureButtons(feature)}${featurePanel(project, context, feature)}<div class="button-pair"><button id="copyLineList" class="primary-compact">LINEコピー</button><button class="secondary-compact" id="showFullList">全文</button></div><details class="quiet-details" id="fullListDetails"><summary>リスト全文</summary><textarea id="lineListText" class="field textarea readonly" readonly>${escapeHtml(buildLineList(project, context))}</textarea></details></section>${contextPanel(project, context)}<section class="panel-card tight-card"><details class="quiet-details"><summary>予約を入れ直す</summary>${renderImportPanel()}</details></section></section>`;
  window.OUTBASE_IMPORT?.bind?.(); bindPrepActions(project, context);
}
function bindPrepActions(project, context) {
  document.querySelectorAll('.prepFeature').forEach((button) => button.addEventListener('click', () => { patchState({ prepFeature: button.dataset.feature }); renderPrep(); }));
  document.querySelectorAll('.projectSwitch').forEach((button) => button.addEventListener('click', () => { patchState({ selectedPrepProjectId: button.dataset.projectKey }); toast('予定を選択'); }));
  document.getElementById('showFullList')?.addEventListener('click', () => { const details = document.getElementById('fullListDetails'); if (details) details.open = true; document.getElementById('lineListText')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  document.getElementById('updatePracticalPrep')?.addEventListener('click', () => { const nextContext = readPrepContext(project.reservation || {}); const nextPrep = buildPracticalPrep(project, nextContext); patchState({ prepContext: nextContext, nextProject: { ...project, prep: nextPrep, prepContext: nextContext, updatedAt: new Date().toISOString() } }); toast('準備を整えました'); renderPrep(); });
  document.getElementById('copyLineList')?.addEventListener('click', async () => { const text = buildLineList(getState().nextProject || project, normalizePrepContext(getState().prepContext || context, project?.reservation || {})); const area = document.getElementById('lineListText'); try { await navigator.clipboard.writeText(text); if (area) area.value = `${text}\n\nコピー済み`; toast('LINEリストをコピー'); } catch { if (area) { area.focus(); area.select(); } toast('本文を選択しました'); } });
}
function readPrepContext(reservation) { return normalizePrepContext({ weatherMemo: document.getElementById('weatherMemo')?.value || '', highTemp: document.getElementById('highTemp')?.value || '', lowTemp: document.getElementById('lowTemp')?.value || '', rainRisk: document.getElementById('rainRisk')?.value || '', windMemo: document.getElementById('windMemo')?.value || '', peopleCount: document.getElementById('peopleCount')?.value || '', kotaGoing: document.getElementById('kotaGoing')?.value || 'yes', menuMemo: document.getElementById('menuMemo')?.value || '', routeMemo: document.getElementById('routeMemo')?.value || '', setupMemo: document.getElementById('setupMemo')?.value || '', gearMemo: document.getElementById('gearMemo')?.value || '', pastReflection: document.getElementById('pastReflection')?.value || '' }, reservation); }
