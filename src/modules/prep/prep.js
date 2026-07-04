import { app, escapeHtml, toast } from '../../ui/components.js?v=core07-2-prep-dashboard-20260705';
import { getState, patchState } from '../../core/store.js?v=core07-2-prep-dashboard-20260705';
import { renderImportPanel } from '../import/import.js?v=core07-2-prep-dashboard-20260705';
import {
  buildDepartureLineList,
  buildMealLineList,
  buildPrepModel,
  buildPracticalPrep,
  buildShoppingLineList,
  buildWeatherDecisionLineList,
  mealModeLabels,
  normalizePrepContext
} from './prepEngine.js?v=core07-2-prep-dashboard-20260705';

const PANEL_META = {
  meal: { label: '料理', sub: '献立・買物', target: '料理・買物を検討' },
  route: { label: 'ルート', sub: '出発・経由地', target: '出発と買物場所を決める' },
  gear: { label: 'ギア', sub: '今回持つ/台帳', target: '今回持つか決める' },
  kota: { label: 'コタ', sub: '暑さ・雨・休憩', target: 'コタ用品を確認' },
  input: { label: '条件', sub: '天気・期限・台帳', target: '条件を足す' }
};

function projectName(project) { return project?.reservation?.campground || project?.title || '次のキャンプ'; }
function summarizeDate(project) {
  const r = project?.reservation || {};
  return [r.dateText, r.checkIn && `IN ${r.checkIn}`, r.checkOut && `OUT ${r.checkOut}`].filter(Boolean).join(' / ') || '日程未確定';
}
function campPlans(state) {
  const list = [];
  if (state.nextProject) list.push({ key: state.nextProject.id || 'nextProject', title: projectName(state.nextProject), sub: summarizeDate(state.nextProject), project: state.nextProject, primary: true });
  (state.calendarEvents || []).filter((e) => e?.type === 'camp').slice(0, 6).forEach((event) => {
    const dateText = [event.start, event.end && event.end !== event.start ? event.end : ''].filter(Boolean).join('〜') || '日程未確定';
    list.push({ key: event.id, title: event.title || 'キャンプ予定', sub: dateText, project: calendarEventToProject(event) });
  });
  return list;
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

function projectHero(model, plans, selectedKey) {
  const project = model.project;
  const r = project?.reservation || {};
  const tags = [r.dateText, r.companions, model.context.kotaGoing !== 'no' ? 'コタ同行' : 'コタなし'].filter(Boolean).slice(0, 3);
  return `<section class="route-summary-card prep-hero-card core07-prep-hero core072-hero">
    <div><span>準備中</span><h2>${escapeHtml(projectName(project))}</h2><p>${escapeHtml(tags.join(' / ') || '予定を選ぶと準備がつながります')}</p></div>
    <b>${model.weatherDecision.riskScore || '天気'}</b>
  </section>
  ${plans.length > 1 ? `<section class="panel-card tight-card core07-switch-card core072-switch"><div class="section-title-row"><strong>準備する予定</strong><small>${plans.length}件</small></div><div class="project-switch-row">${plans.map((plan) => `<button class="projectSwitch ${selectedKey === plan.key ? 'active' : ''}" data-project-key="${escapeHtml(plan.key)}"><strong>${escapeHtml(plan.title)}</strong><span>${escapeHtml(plan.sub)}</span></button>`).join('')}</div></section>` : ''}`;
}

function dashboard(model) {
  const w = model.weatherDecision;
  const riskItems = (w.riskItems || []).slice(0, 3);
  const deadline = w.cancelFreeUntil || '無料期限 未登録';
  const cancelStatus = w.statusLabel || '保留 / 無料期限未設定';
  const topActions = model.topActions.length ? model.topActions.slice(0, 3) : ['無料キャンセル期限を登録', '1時間ごとの雨・風・気温を確認', '経由スーパーを決める'];
  return `<section class="panel-card core072-dashboard">
    <div class="dashboard-main-row">
      <div class="weather-risk-tile"><span>天気リスク</span><strong>${escapeHtml(w.riskScore)}</strong></div>
      <div class="decision-summary"><div class="section-title-row"><strong>天気ありきで判断</strong><small>${escapeHtml(cancelStatus)}</small></div><p>${escapeHtml(w.recommendation || '詳細天気を入れて、無料期限前に行くか判断')}</p></div>
    </div>
    <div class="deadline-strip"><span>無料キャンセル</span><strong>${escapeHtml(deadline)}</strong><button class="prepPanelTab" data-feature="input">期限・天気を入れる</button></div>
    <div class="dashboard-risk-chips">${riskItems.map((item) => `<span>${escapeHtml(item)}</span>`).join('') || '<span>1時間天気を確認</span><span>雨・風・気温を入力</span><span>撤収日も確認</span>'}</div>
    <div class="decision-button-row"><button class="cancelDecisionBtn ${w.status === '行く' ? 'active' : ''}" data-status="行く">行く</button><button class="cancelDecisionBtn ${w.status === '保留' ? 'active' : ''}" data-status="保留">保留</button><button class="cancelDecisionBtn ${w.status === 'キャンセル検討' ? 'active' : ''}" data-status="キャンセル検討">キャンセル検討</button></div>
    <ol class="top-three-list">${topActions.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ol>
    <div class="dashboard-action-row"><button id="copyWeatherDecision" class="primary-compact">天気判断コピー</button><button class="secondary-compact prepPanelTab" data-feature="weather">詳細天気</button><button class="secondary-compact prepPanelTab" data-feature="input">条件入力</button></div>
  </section>`;
}

function moduleBoard(model, activeFeature) {
  const panels = [
    panelButton('meal', activeFeature, '料理', mealStatus(model), model.weatherDecision.mealAdvice[0] || '天気に合わせて火数と量を調整'),
    panelButton('route', activeFeature, 'ルート', routeStatus(model), model.weatherDecision.routeAdvice[0] || '雨前に設営できる出発へ寄せる'),
    panelButton('gear', activeFeature, 'ギア', gearStatus(model), model.weatherDecision.gearAdvice[0] || '今回持つものだけ決める'),
    panelButton('kota', activeFeature, 'コタ', kotaStatus(model), model.weatherDecision.kotaAdvice[0] || '暑さ・雨・休憩を確認')
  ];
  return `<section class="panel-card core072-board"><div class="section-title-row"><strong>準備状況</strong><small>押した項目だけ下に表示</small></div><div class="prep-module-grid">${panels.join('')}</div></section>`;
}
function panelButton(key, activeFeature, title, status, advice) {
  return `<button class="prepModuleBtn prepPanelTab ${activeFeature === key ? 'active' : ''}" data-feature="${key}"><span>${escapeHtml(title)}</span><strong>${escapeHtml(status)}</strong><small>${escapeHtml(advice)}</small></button>`;
}
function mealStatus(model) {
  const open = model.meals.filter((meal) => !meal.menu && /2日目 朝|1日目 夜/.test(meal.label)).length;
  return open ? '△ 未定あり' : '○ 献立あり';
}
function routeStatus(model) {
  return model.route.departure && model.route.stops?.length ? '○ 設定あり' : '△ 未設定';
}
function gearStatus(model) {
  return model.gear.ledger.length ? `△ 台帳${model.gear.ledger.length}件` : '△ 台帳未登録';
}
function kotaStatus(model) {
  return model.context.kotaGoing === 'no' ? '— 同行なし' : '△ 要確認';
}

function selectedPanel(model, activeFeature) {
  const key = PANEL_META[activeFeature] ? activeFeature : 'dashboard';
  if (key === 'dashboard') return '';
  const meta = PANEL_META[key];
  return `<section class="panel-card core072-selected"><div class="section-title-row"><strong>${escapeHtml(meta.label)}</strong><small>${escapeHtml(meta.target)}</small></div>${panelBody(model, key)}</section>`;
}
function panelBody(model, key) {
  if (key === 'weather') return weatherPanel(model);
  if (key === 'meal') return mealPanel(model);
  if (key === 'route') return routePanel(model);
  if (key === 'gear') return gearPanel(model);
  if (key === 'kota') return kotaPanel(model);
  if (key === 'input') return inputPanel(model);
  return '';
}

function weatherPanel(model) {
  const w = model.weatherDecision;
  return `<div class="single-panel-stack"><div class="prep-summary-lines compact-lines"><p><span>無料期限</span><strong>${escapeHtml(w.cancelFreeUntil || '未登録')}</strong></p><p><span>判断</span><strong>${escapeHtml(w.recommendation)}</strong></p><p><span>準備影響</span><strong>${escapeHtml((w.crossImpacts || []).slice(0, 3).join(' / ') || '入力待ち')}</strong></p></div>${miniList('天気リスク', w.riskItems)}<div class="button-pair"><button class="secondary-compact prepPanelTab" data-feature="input">天気を入力</button><button id="copyWeatherDecision" class="primary-compact">天気判断コピー</button></div></div>`;
}
function mealPanel(model) {
  const night = model.meals.find((meal) => meal.label === '1日目 夜');
  const morning = model.meals.find((meal) => meal.label === '2日目 朝');
  const common = model.commonFoods.map((item) => item.name).slice(0, 4).join(' / ') || '未検出';
  return `<div class="single-panel-stack"><div class="prep-summary-lines compact-lines"><p><span>天気判断</span><strong>${escapeHtml(model.weatherDecision.mealAdvice[0] || '天気に合わせて量と火数を調整')}</strong></p><p><span>1日目夜</span><strong>${escapeHtml(night?.menu || night?.fallback || '未定')}</strong></p><p><span>2日目朝</span><strong>${escapeHtml(morning?.menu || morning?.fallback || '未定')}</strong></p><p><span>共通食材</span><strong>${escapeHtml(common)}</strong></p></div><div class="button-pair"><button id="copyMealPlan" class="secondary-compact">料理コピー</button><button id="copyShoppingList" class="primary-compact">買物コピー</button></div>${modeChips(model)}${shoppingPreview(model)}</div>`;
}
function routePanel(model) {
  return `<div class="single-panel-stack"><div class="prep-summary-lines compact-lines"><p><span>天気判断</span><strong>${escapeHtml(model.weatherDecision.routeAdvice[0] || '雨前に設営できる出発へ寄せる')}</strong></p><p><span>出発</span><strong>${escapeHtml(model.route.departure || '未設定')}</strong></p><p><span>経由地</span><strong>${escapeHtml(model.route.stops.join(' / ') || 'スーパー/コンビニ未設定')}</strong></p><p><span>IN</span><strong>${escapeHtml(model.route.checkIn || '未設定')}</strong></p></div><div class="button-pair"><button id="copyDeparturePlan" class="primary-compact">出発コピー</button><button class="secondary-compact prepPanelTab" data-feature="input">経由地入力</button></div></div>`;
}
function gearPanel(model) {
  return `<div class="single-panel-stack"><div class="prep-summary-lines compact-lines"><p><span>天気判断</span><strong>${escapeHtml(model.weatherDecision.gearAdvice[0] || '雨・風・暑さで持つものを決める')}</strong></p><p><span>今回</span><strong>${escapeHtml(model.gear.status)}</strong></p><p><span>台帳</span><strong>${escapeHtml(model.gear.ledger.length ? `${model.gear.ledger.length}件登録` : '未登録')}</strong></p></div>${miniList('今回持つ候補', model.gear.items.slice(0, 8))}<div class="button-pair"><button class="secondary-compact prepPanelTab" data-feature="input">ギア入力</button><button class="primary-compact prepPanelTab" data-feature="input">台帳登録</button></div></div>`;
}
function kotaPanel(model) {
  return `<div class="single-panel-stack"><div class="prep-summary-lines compact-lines"><p><span>天気判断</span><strong>${escapeHtml(model.weatherDecision.kotaAdvice[0] || '水・暑さ・雨・休憩を確認')}</strong></p><p><span>必要</span><strong>${escapeHtml(model.kota.status)}</strong></p></div>${miniList('コタ用品', model.kota.items)}</div>`;
}
function shoppingPreview(model) {
  const items = model.shoppingItems.slice(0, 6);
  if (!items.length) return '<p class="empty-line">料理を入力すると買物が出ます</p>';
  return `<div class="shopping-mini-list">${items.map((item) => `<div><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.uses.join(' / ') || item.status)}</span></div>`).join('')}</div>`;
}
function miniList(title, items = []) {
  if (!items.length) return `<p class="empty-line">${escapeHtml(title)}：入力待ち</p>`;
  return `<div class="mini-list"><strong>${escapeHtml(title)}</strong>${items.slice(0, 7).map((item) => `<span>${escapeHtml(item)}</span>`).join('')}</div>`;
}
function modeChips(model) {
  const selected = new Set(model.context.mealModes || []);
  return `<div class="mode-chip-wrap compact-mode">${mealModeLabels().map((label) => `<button type="button" class="prepModeChip ${selected.has(label) ? 'active' : ''}" data-mode="${escapeHtml(label)}">${escapeHtml(label)}</button>`).join('')}</div>`;
}

function inputPanel(model) {
  const context = model.context;
  const modesValue = (context.mealModes || []).join('\n');
  return `<div class="line-form two-col core072-input-grid">
      <label><span>無料キャンセル期限</span><input id="cancelFreeUntil" class="field" value="${escapeHtml(context.cancelFreeUntil)}" placeholder="6/23 23:59" /></label>
      <label><span>判断状態</span><select id="cancelDecisionStatus" class="field"><option value="保留" ${context.cancelDecisionStatus === '保留' ? 'selected' : ''}>保留</option><option value="行く" ${context.cancelDecisionStatus === '行く' ? 'selected' : ''}>行く</option><option value="キャンセル検討" ${context.cancelDecisionStatus === 'キャンセル検討' ? 'selected' : ''}>キャンセル検討</option><option value="キャンセル済み" ${context.cancelDecisionStatus === 'キャンセル済み' ? 'selected' : ''}>キャンセル済み</option></select></label>
      <label><span>詳細天気</span><textarea id="weatherMemo" class="field textarea compact" placeholder="雨 / 暑い / 風 / 撤収日雨">${escapeHtml(context.weatherMemo)}</textarea></label>
      <label><span>1時間ごとの天気</span><textarea id="weatherHourlyMemo" class="field textarea compact" placeholder="土曜15-18時雨、日曜朝雨など">${escapeHtml(context.weatherHourlyMemo)}</textarea></label>
      <label><span>料理</span><textarea id="menuMemo" class="field textarea compact" placeholder="1日目夜：ピザ\n2日目朝：ホットサンド">${escapeHtml(context.menuMemo)}</textarea></label>
      <label><span>ルート</span><textarea id="routeMemo" class="field textarea compact" placeholder="6:30出発 / スーパー / コタ休憩">${escapeHtml(context.routeMemo)}</textarea></label>
      <label><span>今回ギア</span><textarea id="gearMemo" class="field textarea compact" placeholder="リビングシェル / 大スキレット / EcoFlow">${escapeHtml(context.gearMemo)}</textarea></label>
      <label><span>ギア台帳</span><textarea id="gearLedgerMemo" class="field textarea compact" placeholder="ギア名 / 保管場所 / 用途 / 季節">${escapeHtml(context.gearLedgerMemo)}</textarea></label>
      <label><span>追加/付け合わせ</span><textarea id="extraNeedMemo" class="field textarea compact" placeholder="もう1品 / おつまみ / 軽く">${escapeHtml(context.extraNeedMemo)}</textarea></label>
      <label><span>忘れた/現地変更</span><textarea id="missingFoodMemo" class="field textarea compact" placeholder="レモン忘れた">${escapeHtml(context.missingFoodMemo)}</textarea></label>
      <input id="highTemp" class="field" inputmode="numeric" value="${escapeHtml(context.highTemp)}" placeholder="最高気温" />
      <input id="lowTemp" class="field" inputmode="numeric" value="${escapeHtml(context.lowTemp)}" placeholder="最低気温" />
      <input id="rainRisk" class="field" value="${escapeHtml(context.rainRisk)}" placeholder="降水" />
      <input id="windMemo" class="field" value="${escapeHtml(context.windMemo)}" placeholder="風" />
      <input id="humidityMemo" class="field" value="${escapeHtml(context.humidityMemo)}" placeholder="湿度" />
      <input id="thunderMemo" class="field" value="${escapeHtml(context.thunderMemo)}" placeholder="雷" />
      <input id="siteAltitude" class="field" value="${escapeHtml(context.siteAltitude)}" placeholder="標高/寒暖差" />
      <input id="dryServiceMemo" class="field" value="${escapeHtml(context.dryServiceMemo)}" placeholder="乾燥サービス" />
      <input id="peopleCount" class="field" inputmode="numeric" value="${escapeHtml(context.peopleCount)}" placeholder="人数" />
      <select id="kotaGoing" class="field"><option value="yes" ${context.kotaGoing !== 'no' ? 'selected' : ''}>コタ同行</option><option value="no" ${context.kotaGoing === 'no' ? 'selected' : ''}>コタなし</option></select>
      <textarea id="weatherDecisionMemo" class="field textarea compact hidden-field">${escapeHtml(context.weatherDecisionMemo)}</textarea>
      <textarea id="fixedDishMemo" class="field textarea compact hidden-field">${escapeHtml(context.fixedDishMemo)}</textarea>
      <textarea id="availableFoodMemo" class="field textarea compact hidden-field">${escapeHtml(context.availableFoodMemo)}</textarea>
      <textarea id="pastReflection" class="field textarea compact hidden-field">${escapeHtml(context.pastReflection)}</textarea>
      <textarea id="mealModes" class="field textarea compact hidden-field" readonly>${escapeHtml(modesValue)}</textarea>
    <button id="updatePracticalPrep" class="primary-compact core072-save">天気から準備を整える</button></div>`;
}

export function renderPrep() {
  const state = getState();
  const { plans, selectedKey, project } = resolveProject(state);
  if (!project) {
    app().innerHTML = `<section class="route-page"><section class="route-summary-card"><div><span>準備</span><h2>予定を入れる</h2><p>予約を入れると、詳細天気・料理・ルート・ギア・コタがつながります。</p></div></section>${renderImportPanel()}</section>`;
    window.OUTBASE_IMPORT?.bind?.();
    return;
  }
  const context = normalizePrepContext(state.prepContext || project?.prepContext || {}, project?.reservation || {});
  const model = buildPrepModel(project, context);
  const activeFeature = PANEL_META[state.prepFeature] ? state.prepFeature : 'dashboard';
  app().innerHTML = `<section class="route-page prep-lean core07-prep-page core072-prep-page">${projectHero(model, plans, selectedKey)}${dashboard(model)}${moduleBoard(model, activeFeature)}${selectedPanel(model, activeFeature)}<section class="panel-card tight-card core072-utility"><button class="prepPanelTab secondary-compact" data-feature="input">条件を足す</button><button class="secondary-compact" id="openImportPanel">予約を入れ直す</button></section><section id="prepImportPanel" class="panel-card tight-card core072-import hidden-panel">${renderImportPanel()}</section></section>`;
  window.OUTBASE_IMPORT?.bind?.();
  bindPrepActions(project, model);
}

function bindPrepActions(project, model) {
  document.querySelectorAll('.projectSwitch').forEach((button) => button.addEventListener('click', () => { patchState({ selectedPrepProjectId: button.dataset.projectKey, prepFeature: 'dashboard' }); toast('予定を選択'); renderPrep(); }));
  document.querySelectorAll('.prepPanelTab').forEach((button) => button.addEventListener('click', () => { patchState({ prepFeature: button.dataset.feature || 'dashboard' }); renderPrep(); }));
  document.getElementById('openImportPanel')?.addEventListener('click', () => document.getElementById('prepImportPanel')?.classList.toggle('hidden-panel'));
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
    toast('天気から準備を整えました');
    renderPrep();
  });
  bindCopy('copyWeatherDecision', () => buildWeatherDecisionLineList(buildPrepModel(getState().nextProject || project, normalizePrepContext(getState().prepContext || model.context, project?.reservation || {}))), '天気判断をコピー');
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
    setupMemo: current.setupMemo || '',
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
