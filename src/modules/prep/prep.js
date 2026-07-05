import { app, escapeHtml, toast } from '../../ui/components.js?v=core07-2-1-prep-usability-20260705';
import { getState, patchState } from '../../core/store.js?v=core07-2-1-prep-usability-20260705';
import { renderImportPanel } from '../import/import.js?v=core07-2-1-prep-usability-20260705';
import {
  buildDepartureLineList,
  buildMealLineList,
  buildPrepModel,
  buildPracticalPrep,
  buildShoppingLineList,
  mealModeLabels,
  normalizePrepContext
} from './prepEngine.js?v=core07-2-1-prep-usability-20260705';

const PANEL_META = {
  meal: { label: '料理', short: '料理', sub: '献立・買物' },
  route: { label: 'ルート', short: 'ルート', sub: '出発・経由地' },
  gear: { label: 'ギア', short: 'ギア', sub: '今回持つ/台帳' },
  kota: { label: 'コタ用品', short: 'コタ', sub: '暑さ・雨・休憩' },
  input: { label: '条件入力', short: '入力', sub: '天気・期限・台帳' }
};

function projectName(project) { return project?.reservation?.campground || project?.title || '次のキャンプ'; }
function summarizeDate(project) {
  const r = project?.reservation || {};
  return [r.dateText, r.companions, r.checkIn && `IN ${r.checkIn}`].filter(Boolean).join(' / ') || '日程未確定';
}
function campPlans(state) {
  const list = [];
  if (state.nextProject) {
    list.push({
      key: state.nextProject.id || 'nextProject',
      title: projectName(state.nextProject),
      sub: summarizeDate(state.nextProject),
      project: state.nextProject,
      startValue: planStartValue(state.nextProject)
    });
  }
  (state.calendarEvents || []).filter((e) => e?.type === 'camp').forEach((event) => {
    const dateText = [event.start, event.end && event.end !== event.start ? event.end : ''].filter(Boolean).join('〜') || '日程未確定';
    const project = calendarEventToProject(event);
    list.push({ key: event.id, title: event.title || 'キャンプ予定', sub: dateText, project, startValue: planStartValue(project, event.start) });
  });
  return list.sort((a, b) => a.startValue - b.startValue).slice(0, 8);
}
function planStartValue(project, fallback = '') {
  const text = `${fallback} ${project?.reservation?.dateText || ''} ${project?.start || ''}`;
  const now = new Date();
  const year = now.getFullYear();
  const candidates = [];
  const ymd = text.match(/(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})/);
  if (ymd) candidates.push(new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])).getTime());
  const md = text.match(/(\d{1,2})[/-](\d{1,2})|(?:\b|^)(\d{1,2})月(\d{1,2})日/);
  if (md) {
    const m = Number(md[1] || md[3]);
    const d = Number(md[2] || md[4]);
    const thisYear = new Date(year, m - 1, d).getTime();
    const nextYear = new Date(year + 1, m - 1, d).getTime();
    candidates.push(thisYear >= startOfToday() ? thisYear : nextYear);
  }
  const valid = candidates.filter((value) => Number.isFinite(value));
  if (!valid.length) return Number.MAX_SAFE_INTEGER;
  return Math.min(...valid);
}
function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}
function calendarEventToProject(event) {
  return {
    id: event.id,
    title: event.title || 'キャンプ予定',
    status: 'planning',
    reservation: {
      campground: event.title || 'キャンプ予定',
      dateText: [event.start, event.end && event.end !== event.start ? event.end : ''].filter(Boolean).join('〜') || '未確定',
      checkIn: event.checkIn || '',
      checkOut: event.checkOut || '',
      companions: event.companions || '',
      cancelFreeUntil: event.cancelFreeUntil || '',
      sourceText: `${event.title || ''} ${event.memo || ''}`
    },
    prep: event.prep || {}
  };
}
function resolveProject(state) {
  const plans = campPlans(state);
  const fallbackKey = state.nextProject?.id || 'nextProject';
  const selectedKey = state.selectedPrepProjectId || fallbackKey;
  const hit = plans.find((plan) => plan.key === selectedKey) || plans[0];
  return { plans, selectedKey: hit?.key || selectedKey, project: hit?.project || state.nextProject };
}

function renderHero(model, plans, selectedKey) {
  const project = model.project;
  return `<section class="core073-hero">
    <div><span>準備中</span><h2>${escapeHtml(projectName(project))}</h2><p>${escapeHtml(summarizeDate(project))}</p></div>
    <button class="prepPanelTab hero-input-btn" data-feature="input">入力</button>
  </section>
  ${plans.length > 1 ? `<section class="core073-plan-row" aria-label="準備する予定">${plans.map((plan) => `<button class="projectSwitch ${selectedKey === plan.key ? 'active' : ''}" data-project-key="${escapeHtml(plan.key)}"><strong>${escapeHtml(plan.title)}</strong><span>${escapeHtml(plan.sub)}</span></button>`).join('')}</section>` : ''}`;
}

function renderCommandCenter(model) {
  const w = model.weatherDecision || {};
  const riskItems = (w.riskItems || []).slice(0, 3);
  const topActions = (model.topActions || []).slice(0, 3);
  while (topActions.length < 3) topActions.push(['無料キャンセル期限を入れる', '1時間天気を見る', '経由スーパーを決める'][topActions.length]);
  return `<section class="core073-command-card">
    <div class="command-title-row">
      <div><span>天気判断</span><h3>${escapeHtml(w.recommendation || '詳細天気を見て、無料期限前に判断')}</h3></div>
      <div class="risk-badge"><span>リスク</span><strong>${escapeHtml(w.riskScore || '—')}</strong></div>
    </div>
    <div class="command-meta-grid">
      <p><span>雨</span><strong>${escapeHtml(riskItems[0] || '未確認')}</strong></p>
      <p><span>風</span><strong>${escapeHtml(riskItems[1] || '未確認')}</strong></p>
      <p><span>期限</span><strong>${escapeHtml(w.cancelFreeUntil || '未登録')}</strong></p>
    </div>
    <div class="decision-pill-row"><button class="cancelDecisionBtn ${w.status === '行く' ? 'active' : ''}" data-status="行く">行く</button><button class="cancelDecisionBtn ${w.status === '保留' ? 'active' : ''}" data-status="保留">保留</button><button class="cancelDecisionBtn ${w.status === 'キャンセル検討' ? 'active' : ''}" data-status="キャンセル検討">検討</button></div>
    <ol class="command-next-list">${topActions.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ol>
    <div class="command-actions single"><button class="primary-compact prepPanelTab" data-feature="input">天気・期限を入れる</button></div>
  </section>`;
}

function renderStatusGrid(model, activeFeature) {
  const tiles = [
    ['meal', '料理', mealStatus(model), model.weatherDecision?.mealAdvice?.[0] || '天気に合わせて決める'],
    ['route', 'ルート', routeStatus(model), model.weatherDecision?.routeAdvice?.[0] || '出発と経由地を決める'],
    ['gear', 'ギア', gearStatus(model), model.weatherDecision?.gearAdvice?.[0] || '今回持つものを決める'],
    ['kota', 'コタ', kotaStatus(model), model.weatherDecision?.kotaAdvice?.[0] || '暑さ・雨・休憩を確認']
  ];
  return `<section class="core073-status-card"><div class="section-title-row"><strong>確認する</strong><small>押した1項目だけ開く</small></div><div class="core073-status-grid">${tiles.map(([key, label, status, advice]) => `<button class="prepPanelTab status-tile ${activeFeature === key ? 'active' : ''}" data-feature="${key}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(status)}</strong><small>${escapeHtml(advice)}</small></button>`).join('')}</div></section>`;
}
function mealStatus(model) {
  const morning = model.meals.find((meal) => meal.label === '2日目 朝');
  return morning?.menu ? '○ 決定' : '△ 朝未定';
}
function routeStatus(model) { return model.route.departure && model.route.stops?.length ? '○ 設定' : '△ 未設定'; }
function gearStatus(model) { return model.gear.ledger.length ? `△ 台帳${model.gear.ledger.length}` : '△ 台帳未登録'; }
function kotaStatus(model) { return model.context.kotaGoing === 'no' ? '— 同行なし' : '△ 要確認'; }

function selectedPanel(model, activeFeature) {
  if (!PANEL_META[activeFeature]) return '';
  const meta = PANEL_META[activeFeature];
  return `<section class="core073-selected-panel"><div class="section-title-row"><strong>${escapeHtml(meta.label)}</strong><button class="prepPanelTab close-panel" data-feature="dashboard">閉じる</button></div>${panelBody(model, activeFeature)}</section>`;
}
function panelBody(model, key) {
  if (key === 'meal') return mealPanel(model);
  if (key === 'route') return routePanel(model);
  if (key === 'gear') return gearPanel(model);
  if (key === 'kota') return kotaPanel(model);
  if (key === 'input') return inputPanel(model);
  return '';
}
function miniRows(rows) {
  return `<div class="core073-mini-rows">${rows.map(([label, value]) => `<p><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || '未設定')}</strong></p>`).join('')}</div>`;
}
function mealPanel(model) {
  const night = model.meals.find((meal) => meal.label === '1日目 夜');
  const morning = model.meals.find((meal) => meal.label === '2日目 朝');
  const common = model.commonFoods.map((item) => item.name).slice(0, 4).join(' / ') || '未検出';
  const foodTasks = [
    model.weatherDecision?.mealAdvice?.[0] || '天気に合わせて火数と手間を決める',
    morning?.menu ? `2日目朝：${morning.menu}` : '2日目朝ごはんを決める',
    model.shoppingItems.length ? `買物：${model.shoppingItems.length}件を確認` : '料理を入れて買物を出す',
    common !== '未検出' ? `共通食材：${common}` : '共通食材は未検出'
  ];
  return `<div class="core073-panel-body">${miniRows([
    ['天気判断', model.weatherDecision?.mealAdvice?.[0] || '雨なら簡単飯寄り'],
    ['1日目夜', night?.menu || night?.fallback || '未定'],
    ['2日目朝', morning?.menu || morning?.fallback || '未定'],
    ['共通食材', common]
  ])}${miniList('料理で確認すること', foodTasks)}<div class="core073-two-actions"><button id="copyShoppingList" class="primary-compact">買物コピー</button><button id="copyMealPlan" class="secondary-compact">料理コピー</button></div>${shoppingPreview(model)}${modeChips(model)}</div>`;
}
function routePanel(model) {
  const routeTasks = [
    model.weatherDecision?.routeAdvice?.[0] || '雨前に設営できる出発へ寄せる',
    model.route.departure ? `出発：${model.route.departure}` : '出発時間を決める',
    model.route.stops.length ? `経由：${model.route.stops.join(' / ')}` : 'スーパー/コンビニを決める',
    model.context.kotaGoing !== 'no' ? 'コタ休憩ポイントを入れる' : '休憩ポイントを確認'
  ];
  return `<div class="core073-panel-body">${miniRows([
    ['天気判断', model.weatherDecision?.routeAdvice?.[0] || '雨前に設営できる出発へ寄せる'],
    ['出発', model.route.departure || '未設定'],
    ['経由地', model.route.stops.join(' / ') || 'スーパー/コンビニ未設定'],
    ['IN', model.route.checkIn || '未設定']
  ])}${miniList('ルートで確認すること', routeTasks)}<div class="core073-two-actions"><button id="copyDeparturePlan" class="primary-compact">出発コピー</button><button class="secondary-compact prepPanelTab" data-feature="input">ルート入力</button></div></div>`;
}
function gearPanel(model) {
  const gearTasks = [
    ...(model.weatherDecision?.gearAdvice || []).slice(0, 3),
    model.gear.status || '今回持つものを決める',
    model.gear.ledger.length ? `台帳登録済み：${model.gear.ledger.length}件` : 'ギア台帳に保管場所/用途を登録'
  ].filter(Boolean);
  return `<div class="core073-panel-body">${miniRows([
    ['天気判断', model.weatherDecision?.gearAdvice?.[0] || '天気から必要ギアを決める'],
    ['今回', model.gear.status || '未確認'],
    ['台帳', model.gear.ledger.length ? `${model.gear.ledger.length}件` : '未登録']
  ])}${miniList('ギアで確認すること', gearTasks)}${miniList('今回の候補', model.gear.items.slice(0, 6))}<div class="core073-two-actions"><button class="primary-compact prepPanelTab" data-feature="input">今回ギア入力</button><button class="secondary-compact prepPanelTab" data-feature="input">台帳登録</button></div></div>`;
}
function kotaPanel(model) {
  const kotaTasks = [
    ...(model.weatherDecision?.kotaAdvice || []).slice(0, 3),
    model.context.kotaGoing === 'no' ? 'コタ同行なし' : '水 / 暑さ / 雨 / 休憩を確認',
    model.route.kotaBreak ? '休憩ポイント入力済み' : 'コタ休憩ポイントを入れる'
  ].filter(Boolean);
  return `<div class="core073-panel-body">${miniRows([
    ['天気判断', model.weatherDecision?.kotaAdvice?.[0] || '暑さ・雨・休憩を確認'],
    ['状態', model.kota.status || '要確認']
  ])}${miniList('コタで確認すること', kotaTasks)}${miniList('コタ用品', model.kota.items.slice(0, 7))}<div class="core073-two-actions"><button class="primary-compact prepPanelTab" data-feature="input">コタ条件入力</button><button class="secondary-compact prepPanelTab" data-feature="route">ルート確認</button></div></div>`;
}
function miniList(title, items = []) {
  if (!items.length) return `<p class="empty-line">${escapeHtml(title)}：入力待ち</p>`;
  return `<div class="core073-mini-list"><strong>${escapeHtml(title)}</strong>${items.slice(0, 7).map((item) => `<span>${escapeHtml(item)}</span>`).join('')}</div>`;
}
function shoppingPreview(model) {
  const items = model.shoppingItems.slice(0, 5);
  if (!items.length) return '<p class="empty-line">料理を入力すると買物が出ます</p>';
  return `<div class="core073-shopping-preview">${items.map((item) => `<p><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.uses.join(' / ') || item.status)}</span></p>`).join('')}</div>`;
}
function modeChips(model) {
  const selected = new Set(model.context.mealModes || []);
  return `<div class="mode-chip-wrap compact-mode">${mealModeLabels().slice(0, 8).map((label) => `<button type="button" class="prepModeChip ${selected.has(label) ? 'active' : ''}" data-mode="${escapeHtml(label)}">${escapeHtml(label)}</button>`).join('')}</div>`;
}

function inputPanel(model) {
  const context = model.context;
  return `<div class="core073-input-panel">
    <label><span>無料キャンセル期限</span><input id="cancelFreeUntil" class="field" value="${escapeHtml(context.cancelFreeUntil)}" placeholder="6/23 23:59" /></label>
    <label><span>判断</span><select id="cancelDecisionStatus" class="field"><option value="保留" ${context.cancelDecisionStatus === '保留' ? 'selected' : ''}>保留</option><option value="行く" ${context.cancelDecisionStatus === '行く' ? 'selected' : ''}>行く</option><option value="キャンセル検討" ${context.cancelDecisionStatus === 'キャンセル検討' ? 'selected' : ''}>キャンセル検討</option><option value="キャンセル済み" ${context.cancelDecisionStatus === 'キャンセル済み' ? 'selected' : ''}>キャンセル済み</option></select></label>
    <label><span>詳細天気</span><textarea id="weatherMemo" class="field textarea compact" placeholder="雨 / 風 / 暑さ / 撤収日雨">${escapeHtml(context.weatherMemo)}</textarea></label>
    <label><span>1時間天気</span><textarea id="weatherHourlyMemo" class="field textarea compact" placeholder="土曜15-18時雨、日曜朝雨など">${escapeHtml(context.weatherHourlyMemo)}</textarea></label>
    <label><span>料理</span><textarea id="menuMemo" class="field textarea compact" placeholder="1日目夜：ピザ\n2日目朝：ホットサンド">${escapeHtml(context.menuMemo)}</textarea></label>
    <label><span>ルート</span><textarea id="routeMemo" class="field textarea compact" placeholder="6:30出発 / スーパー / コタ休憩">${escapeHtml(context.routeMemo)}</textarea></label>
    <label><span>今回ギア</span><textarea id="gearMemo" class="field textarea compact" placeholder="リビングシェル / 大スキレット / EcoFlow">${escapeHtml(context.gearMemo)}</textarea></label>
    <label><span>ギア台帳</span><textarea id="gearLedgerMemo" class="field textarea compact" placeholder="ギア名 / 保管場所 / 用途 / 季節">${escapeHtml(context.gearLedgerMemo)}</textarea></label>
    <div class="core073-number-grid"><input id="highTemp" class="field" inputmode="numeric" value="${escapeHtml(context.highTemp)}" placeholder="最高" /><input id="lowTemp" class="field" inputmode="numeric" value="${escapeHtml(context.lowTemp)}" placeholder="最低" /><input id="rainRisk" class="field" value="${escapeHtml(context.rainRisk)}" placeholder="降水" /><input id="windMemo" class="field" value="${escapeHtml(context.windMemo)}" placeholder="風" /></div>
    <div class="core073-number-grid"><input id="humidityMemo" class="field" value="${escapeHtml(context.humidityMemo)}" placeholder="湿度" /><input id="thunderMemo" class="field" value="${escapeHtml(context.thunderMemo)}" placeholder="雷" /><input id="siteAltitude" class="field" value="${escapeHtml(context.siteAltitude)}" placeholder="標高" /><input id="dryServiceMemo" class="field" value="${escapeHtml(context.dryServiceMemo)}" placeholder="乾燥" /></div>
    <div class="core073-number-grid"><input id="peopleCount" class="field" inputmode="numeric" value="${escapeHtml(context.peopleCount)}" placeholder="人数" /><select id="kotaGoing" class="field"><option value="yes" ${context.kotaGoing !== 'no' ? 'selected' : ''}>コタ同行</option><option value="no" ${context.kotaGoing === 'no' ? 'selected' : ''}>コタなし</option></select></div>
    <textarea id="weatherDecisionMemo" class="hidden-field">${escapeHtml(context.weatherDecisionMemo)}</textarea><textarea id="fixedDishMemo" class="hidden-field">${escapeHtml(context.fixedDishMemo)}</textarea><textarea id="extraNeedMemo" class="hidden-field">${escapeHtml(context.extraNeedMemo)}</textarea><textarea id="availableFoodMemo" class="hidden-field">${escapeHtml(context.availableFoodMemo)}</textarea><textarea id="missingFoodMemo" class="hidden-field">${escapeHtml(context.missingFoodMemo)}</textarea><textarea id="pastReflection" class="hidden-field">${escapeHtml(context.pastReflection)}</textarea>
    <button id="updatePracticalPrep" class="primary-compact core073-save">保存して判断を更新</button>
  </div>`;
}

export function renderPrep() {
  const state = getState();
  const { plans, selectedKey, project } = resolveProject(state);
  if (!project) {
    app().innerHTML = `<section class="route-page core073-prep-page"><section class="core073-command-card"><div class="command-title-row"><div><span>準備</span><h3>予定を入れる</h3></div></div><p class="empty-line">予約を入れると、詳細天気・料理・ルート・ギア・コタがつながります。</p></section>${renderImportPanel()}</section>`;
    window.OUTBASE_IMPORT?.bind?.();
    return;
  }
  const context = normalizePrepContext(state.prepContext || project?.prepContext || {}, project?.reservation || {});
  const model = buildPrepModel(project, context);
  const activeFeature = PANEL_META[state.prepFeature] ? state.prepFeature : 'dashboard';
  app().innerHTML = `<section class="route-page prep-lean core073-prep-page">${renderHero(model, plans, selectedKey)}${renderCommandCenter(model)}${renderStatusGrid(model, activeFeature)}${selectedPanel(model, activeFeature)}</section>`;
  bindPrepActions(project, model);
}

function bindPrepActions(project, model) {
  document.querySelectorAll('.projectSwitch').forEach((button) => button.addEventListener('click', () => { patchState({ selectedPrepProjectId: button.dataset.projectKey, prepFeature: 'dashboard' }); toast('予定を選択'); renderPrep(); }));
  document.querySelectorAll('.prepPanelTab').forEach((button) => button.addEventListener('click', () => { patchState({ prepFeature: button.dataset.feature || 'dashboard' }); renderPrep(); }));
  document.querySelectorAll('.cancelDecisionBtn').forEach((button) => button.addEventListener('click', () => { const nextContext = { ...model.context, cancelDecisionStatus: button.dataset.status }; patchState({ prepContext: nextContext }); toast(`判断：${button.dataset.status}`); renderPrep(); }));
  document.querySelectorAll('.prepModeChip').forEach((button) => button.addEventListener('click', () => {
    const state = getState();
    const current = normalizePrepContext(state.prepContext || model.context, project?.reservation || {});
    const set = new Set(current.mealModes || []);
    if (set.has(button.dataset.mode)) set.delete(button.dataset.mode); else set.add(button.dataset.mode);
    patchState({ prepContext: { ...current, mealModes: [...set] }, prepFeature: 'meal' });
    renderPrep();
  }));
  document.getElementById('updatePracticalPrep')?.addEventListener('click', () => {
    const nextContext = readPrepContext(project.reservation || {}, model.context);
    const nextPrep = buildPracticalPrep(project, nextContext);
    patchState({ prepContext: nextContext, nextProject: { ...project, prep: nextPrep, prepContext: nextContext, updatedAt: new Date().toISOString() }, prepFeature: 'dashboard' });
    toast('更新しました');
    renderPrep();
  });
  bindCopy('copyShoppingList', () => buildShoppingLineList(buildPrepModel(getState().nextProject || project, normalizePrepContext(getState().prepContext || model.context, project?.reservation || {}))), '買物リストをコピー');
  bindCopy('copyMealPlan', () => buildMealLineList(buildPrepModel(getState().nextProject || project, normalizePrepContext(getState().prepContext || model.context, project?.reservation || {}))), '料理計画をコピー');
  bindCopy('copyDeparturePlan', () => buildDepartureLineList(buildPrepModel(getState().nextProject || project, normalizePrepContext(getState().prepContext || model.context, project?.reservation || {}))), '出発予定をコピー');
}

function bindCopy(id, buildText, message) {
  document.getElementById(id)?.addEventListener('click', async () => {
    const text = buildText();
    try { await navigator.clipboard.writeText(text); toast(message); }
    catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.className = 'copy-fallback-area';
      document.body.appendChild(area);
      area.focus();
      area.select();
      toast('本文を選択しました');
      window.setTimeout(() => area.remove(), 2500);
    }
  });
}

function readPrepContext(reservation, current = {}) {
  const selectedModes = [...document.querySelectorAll('.prepModeChip.active')].map((button) => button.dataset.mode).filter(Boolean);
  return normalizePrepContext({
    ...current,
    weatherMemo: document.getElementById('weatherMemo')?.value || current.weatherMemo || '',
    weatherHourlyMemo: document.getElementById('weatherHourlyMemo')?.value || current.weatherHourlyMemo || '',
    weatherDecisionMemo: document.getElementById('weatherDecisionMemo')?.value || current.weatherDecisionMemo || '',
    highTemp: document.getElementById('highTemp')?.value || current.highTemp || '',
    lowTemp: document.getElementById('lowTemp')?.value || current.lowTemp || '',
    rainRisk: document.getElementById('rainRisk')?.value || current.rainRisk || '',
    windMemo: document.getElementById('windMemo')?.value || current.windMemo || '',
    humidityMemo: document.getElementById('humidityMemo')?.value || current.humidityMemo || '',
    thunderMemo: document.getElementById('thunderMemo')?.value || current.thunderMemo || '',
    siteAltitude: document.getElementById('siteAltitude')?.value || current.siteAltitude || '',
    dryServiceMemo: document.getElementById('dryServiceMemo')?.value || current.dryServiceMemo || '',
    cancelFreeUntil: document.getElementById('cancelFreeUntil')?.value || current.cancelFreeUntil || '',
    cancelDecisionStatus: document.getElementById('cancelDecisionStatus')?.value || current.cancelDecisionStatus || '保留',
    peopleCount: document.getElementById('peopleCount')?.value || current.peopleCount || '',
    kotaGoing: document.getElementById('kotaGoing')?.value || current.kotaGoing || 'yes',
    menuMemo: document.getElementById('menuMemo')?.value || current.menuMemo || '',
    routeMemo: document.getElementById('routeMemo')?.value || current.routeMemo || '',
    gearMemo: document.getElementById('gearMemo')?.value || current.gearMemo || '',
    gearLedgerMemo: document.getElementById('gearLedgerMemo')?.value || current.gearLedgerMemo || '',
    pastReflection: document.getElementById('pastReflection')?.value || current.pastReflection || '',
    fixedDishMemo: document.getElementById('fixedDishMemo')?.value || current.fixedDishMemo || '',
    extraNeedMemo: document.getElementById('extraNeedMemo')?.value || current.extraNeedMemo || '',
    availableFoodMemo: document.getElementById('availableFoodMemo')?.value || current.availableFoodMemo || '',
    missingFoodMemo: document.getElementById('missingFoodMemo')?.value || current.missingFoodMemo || '',
    localChangeMemo: current.localChangeMemo || '',
    mealModes: selectedModes.length ? selectedModes : current.mealModes
  }, reservation);
}
