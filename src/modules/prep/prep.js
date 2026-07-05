import { app, escapeHtml, toast } from '../../ui/components.js?v=core08-a1-nav-tapfix-20260705';
import { getState, patchState } from '../../core/store.js?v=core08-a1-nav-tapfix-20260705';
import { renderImportPanel } from '../import/import.js?v=core08-a1-nav-tapfix-20260705';
import {
  buildDepartureLineList,
  buildMealLineList,
  buildPrepModel,
  buildPracticalPrep,
  buildShoppingLineList,
  mealModeLabels,
  normalizePrepContext
} from './prepEngine.js?v=core08-a1-nav-tapfix-20260705';

const WORKSPACE_META = {
  input: { label: '天気・判断', short: '天気', sub: '無料期限・1時間天気・行く判断' },
  meal: { label: '料理・買物', short: '料理', sub: '献立・買物・もう1品' },
  route: { label: 'ルート・出発', short: 'ルート', sub: '出発時間・経由地・コタ休憩' },
  gear: { label: 'ギア', short: 'ギア', sub: '今回持つもの・ギア台帳' },
  kota: { label: 'コタ用品', short: 'コタ', sub: '暑さ・雨・水・休憩' }
};

function projectName(project) { return project?.reservation?.campground || project?.title || '次のキャンプ'; }
function summarizeDate(project) {
  const r = project?.reservation || {};
  return [r.dateText, r.companions, r.checkIn && `IN ${r.checkIn}`].filter(Boolean).join(' / ') || '日程未確定';
}
function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
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
  (state.calendarEvents || []).filter((event) => event?.type === 'camp').forEach((event) => {
    const project = calendarEventToProject(event);
    list.push({
      key: event.id,
      title: event.title || 'キャンプ予定',
      sub: [event.start, event.end && event.end !== event.start ? event.end : ''].filter(Boolean).join('〜') || '日程未確定',
      project,
      startValue: planStartValue(project, event.start)
    });
  });
  return list.sort((a, b) => a.startValue - b.startValue).slice(0, 8);
}
function planStartValue(project, fallback = '') {
  const text = `${fallback} ${project?.reservation?.dateText || ''} ${project?.start || ''}`;
  const now = new Date();
  const year = now.getFullYear();
  const today = startOfToday();
  const candidates = [];
  const ymd = text.match(/(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})/);
  if (ymd) candidates.push(new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])).getTime());
  const md = text.match(/(\d{1,2})[/-](\d{1,2})|(?:\b|^)(\d{1,2})月(\d{1,2})日/);
  if (md) {
    const m = Number(md[1] || md[3]);
    const d = Number(md[2] || md[4]);
    const thisYear = new Date(year, m - 1, d).getTime();
    const nextYear = new Date(year + 1, m - 1, d).getTime();
    candidates.push(thisYear >= today ? thisYear : nextYear);
  }
  const valid = candidates.filter((value) => Number.isFinite(value));
  if (!valid.length) return Number.MAX_SAFE_INTEGER;
  const nearest = Math.min(...valid);
  return nearest >= today ? nearest : nearest + 10_000_000_000_000;
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
  const selector = plans.length > 1 ? `<section class="core073-plan-row" aria-label="準備する予定">${plans.map((plan) => `<button class="projectSwitch ${selectedKey === plan.key ? 'active' : ''}" data-project-key="${escapeHtml(plan.key)}"><strong>${escapeHtml(plan.title)}</strong><span>${escapeHtml(plan.sub)}</span></button>`).join('')}</section>` : '';
  return `<section class="core073-hero">
    <div><span>準備中</span><h2>${escapeHtml(projectName(project))}</h2><p>${escapeHtml(summarizeDate(project))}</p></div>
    <button class="prepWorkspaceOpen hero-input-btn" data-feature="input">天気</button>
  </section>${selector}`;
}

function renderCommandCenter(model) {
  const w = model.weatherDecision || {};
  const riskItems = (w.riskItems || []).slice(0, 3);
  const topActions = (model.topActions || []).slice(0, 3);
  while (topActions.length < 3) topActions.push(['無料キャンセル期限を入れる', '1時間天気を見る', '経由スーパーを決める'][topActions.length]);
  return `<section class="core073-command-card">
    <div class="command-title-row">
      <div><span>詳細天気・判断</span><h3>${escapeHtml(w.recommendation || '詳細天気を見て、無料期限前に判断')}</h3></div>
      <div class="risk-badge"><span>リスク</span><strong>${escapeHtml(w.riskScore || '—')}</strong></div>
    </div>
    <div class="command-meta-grid">
      <p><span>雨</span><strong>${escapeHtml(riskItems[0] || '未確認')}</strong></p>
      <p><span>風</span><strong>${escapeHtml(riskItems[1] || '未確認')}</strong></p>
      <p><span>期限</span><strong>${escapeHtml(w.cancelFreeUntil || '未登録')}</strong></p>
    </div>
    <div class="decision-pill-row"><button class="cancelDecisionBtn ${w.status === '行く' ? 'active' : ''}" data-status="行く">行く</button><button class="cancelDecisionBtn ${w.status === '保留' ? 'active' : ''}" data-status="保留">保留</button><button class="cancelDecisionBtn ${w.status === 'キャンセル検討' ? 'active' : ''}" data-status="キャンセル検討">検討</button></div>
    <ol class="command-next-list">${topActions.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ol>
    <div class="command-actions single"><button class="primary-compact prepWorkspaceOpen" data-feature="input">天気・期限を入れる</button></div>
  </section>`;
}

function renderStatusGrid(model, activeFeature) {
  const tiles = [
    ['meal', '料理', mealStatus(model), model.weatherDecision?.mealAdvice?.[0] || '天気に合わせて決める'],
    ['route', 'ルート', routeStatus(model), model.weatherDecision?.routeAdvice?.[0] || '出発と経由地を決める'],
    ['gear', 'ギア', gearStatus(model), model.weatherDecision?.gearAdvice?.[0] || '今回持つものを決める'],
    ['kota', 'コタ', kotaStatus(model), model.weatherDecision?.kotaAdvice?.[0] || '暑さ・雨・休憩を確認']
  ];
  return `<section class="core073-status-card"><div class="section-title-row"><strong>作業メニュー</strong><small>押すと専用画面</small></div><div class="core073-status-grid">${tiles.map(([key, label, status, advice]) => `<button class="prepWorkspaceOpen status-tile ${activeFeature === key ? 'active' : ''}" data-feature="${key}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(status)}</strong><small>${escapeHtml(advice)}</small></button>`).join('')}</div></section>`;
}
function mealStatus(model) {
  const morning = model.meals.find((meal) => meal.label === '2日目 朝');
  return morning?.menu ? '○ 決定' : '△ 朝未定';
}
function routeStatus(model) { return model.route.departure && model.route.stops?.length ? '○ 設定' : '△ 未設定'; }
function gearStatus(model) { return model.gear.ledger.length ? `△ 台帳${model.gear.ledger.length}` : '△ 台帳未登録'; }
function kotaStatus(model) { return model.context.kotaGoing === 'no' ? '— 同行なし' : '△ 要確認'; }

function renderWorkspace(model, activeFeature) {
  const meta = WORKSPACE_META[activeFeature];
  if (!meta) return '';
  return `<aside class="outbase-workspace core073-workspace" data-workspace-kind="${escapeHtml(activeFeature)}" role="dialog" aria-modal="true" aria-label="${escapeHtml(meta.label)}">
    <div class="outbase-workspace-sheet workspace-sheet">
      <header class="outbase-workspace-header workspace-header">
        <button class="prepWorkspaceOpen outbase-workspace-back workspace-back" data-feature="dashboard">← 準備に戻る</button>
        <div><span>${escapeHtml(meta.sub)}</span><h2>${escapeHtml(meta.label)}</h2></div>
      </header>
      <div class="outbase-workspace-content workspace-content">${workspaceBody(model, activeFeature)}</div>
    </div>
  </aside>`;
}
function workspaceBody(model, key) {
  if (key === 'input') return weatherWorkspace(model);
  if (key === 'meal') return mealWorkspace(model);
  if (key === 'route') return routeWorkspace(model);
  if (key === 'gear') return gearWorkspace(model);
  if (key === 'kota') return kotaWorkspace(model);
  return '';
}
function workspaceSection(title, body, sub = '') {
  return `<section class="workspace-section"><div class="workspace-section-title"><strong>${escapeHtml(title)}</strong>${sub ? `<small>${escapeHtml(sub)}</small>` : ''}</div>${body}</section>`;
}
function miniRows(rows) {
  return `<div class="core073-mini-rows">${rows.map(([label, value]) => `<p><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || '未設定')}</strong></p>`).join('')}</div>`;
}
function miniList(title, items = []) {
  if (!items.length) return `<p class="empty-line">${escapeHtml(title)}：入力待ち</p>`;
  return `<div class="core073-mini-list"><strong>${escapeHtml(title)}</strong>${items.slice(0, 8).map((item) => `<span>${escapeHtml(item)}</span>`).join('')}</div>`;
}
function textareaField(id, label, value, placeholder = '') {
  return `<label class="workspace-field"><span>${escapeHtml(label)}</span><textarea id="${id}" class="field textarea compact" placeholder="${escapeHtml(placeholder)}">${escapeHtml(value || '')}</textarea></label>`;
}
function inputField(id, label, value, placeholder = '', attrs = '') {
  return `<label class="workspace-field"><span>${escapeHtml(label)}</span><input id="${id}" class="field" value="${escapeHtml(value || '')}" placeholder="${escapeHtml(placeholder)}" ${attrs} /></label>`;
}
function selectField(id, label, value, options) {
  return `<label class="workspace-field"><span>${escapeHtml(label)}</span><select id="${id}" class="field">${options.map(([optionValue, labelText]) => `<option value="${escapeHtml(optionValue)}" ${value === optionValue ? 'selected' : ''}>${escapeHtml(labelText)}</option>`).join('')}</select></label>`;
}
function saveButton(label = '保存して準備トップへ戻る') {
  return `<button id="updatePracticalPrep" class="primary-compact workspace-save">${escapeHtml(label)}</button>`;
}

function weatherWorkspace(model) {
  const context = model.context;
  const w = model.weatherDecision || {};
  const summary = miniRows([
    ['判断', w.recommendation || '詳細天気を見て判断'],
    ['期限', w.cancelFreeUntil || '未登録'],
    ['状態', w.statusLabel || context.cancelDecisionStatus || '保留']
  ]);
  const fields = `<div class="workspace-form-grid">
    ${inputField('cancelFreeUntil', '無料キャンセル期限', context.cancelFreeUntil, '6/23 23:59')}
    ${selectField('cancelDecisionStatus', '判断', context.cancelDecisionStatus || '保留', [['保留', '保留'], ['行く', '行く'], ['キャンセル検討', 'キャンセル検討'], ['キャンセル済み', 'キャンセル済み']])}
    ${textareaField('weatherMemo', '詳細天気', context.weatherMemo, '雨 / 風 / 暑さ / 撤収日雨')}
    ${textareaField('weatherHourlyMemo', '1時間天気', context.weatherHourlyMemo, '土曜15-18時雨、日曜朝雨など')}
    <div class="workspace-number-grid">
      ${inputField('highTemp', '最高', context.highTemp, '30', 'inputmode="numeric"')}
      ${inputField('lowTemp', '最低', context.lowTemp, '18', 'inputmode="numeric"')}
      ${inputField('rainRisk', '降水', context.rainRisk, '40%')}
      ${inputField('windMemo', '風', context.windMemo, '強め')}
    </div>
    <div class="workspace-number-grid">
      ${inputField('humidityMemo', '湿度', context.humidityMemo, '高い')}
      ${inputField('thunderMemo', '雷', context.thunderMemo, '注意')}
      ${inputField('siteAltitude', '標高', context.siteAltitude, '1350m')}
      ${inputField('dryServiceMemo', '乾燥', context.dryServiceMemo, '要確認')}
    </div>
  </div>`;
  return [
    workspaceSection('現在の判断', summary),
    workspaceSection('天気と期限を入れる', fields, 'LINE共有ではなく、行く/保留/キャンセル判断のため'),
    hiddenFallbackFields(context),
    saveButton()
  ].join('');
}
function mealWorkspace(model) {
  const context = model.context;
  const night = model.meals.find((meal) => meal.label === '1日目 夜');
  const morning = model.meals.find((meal) => meal.label === '2日目 朝');
  const common = model.commonFoods.map((item) => item.name).slice(0, 4).join(' / ') || '未検出';
  const foodTasks = [
    model.weatherDecision?.mealAdvice?.[0] || '天気に合わせて火数と手間を決める',
    morning?.menu ? `2日目朝：${morning.menu}` : '2日目朝ごはんを決める',
    model.shoppingItems.length ? `買物：${model.shoppingItems.length}件を確認` : '料理を入れて買物を出す',
    common !== '未検出' ? `共通食材：${common}` : '共通食材は未検出'
  ];
  const form = `<div class="workspace-form-grid">
    ${textareaField('menuMemo', '献立', context.menuMemo, '1日目夜：ピザ\n2日目朝：ホットサンド')}
    ${textareaField('fixedDishMemo', '絶対やりたい料理', context.fixedDishMemo, 'ガーリックシュリンプなど')}
    ${textareaField('extraNeedMemo', 'もう1品 / おつまみ', context.extraNeedMemo, '軽い副菜・おつまみ')}
    ${textareaField('availableFoodMemo', '今ある食材', context.availableFoodMemo, '家にある食材・現地で使う食材')}
    ${textareaField('missingFoodMemo', '忘れた/代替', context.missingFoodMemo, '忘れた食材・代替案')}
  </div>`;
  return [
    workspaceSection('料理の判断', miniRows([['天気', model.weatherDecision?.mealAdvice?.[0] || '雨なら簡単飯寄り'], ['1日目夜', night?.menu || night?.fallback || '未定'], ['2日目朝', morning?.menu || morning?.fallback || '未定'], ['共通食材', common]])),
    workspaceSection('決めること', miniList('優先', foodTasks)),
    workspaceSection('献立を入力', form),
    workspaceSection('買物プレビュー', shoppingPreview(model)),
    modeChips(model),
    hiddenWeatherFields(context),
    `<div class="core073-two-actions"><button id="copyShoppingList" class="primary-compact">買物コピー</button><button id="copyMealPlan" class="secondary-compact">料理コピー</button></div>`,
    saveButton()
  ].join('');
}
function routeWorkspace(model) {
  const context = model.context;
  const routeTasks = [
    model.weatherDecision?.routeAdvice?.[0] || '雨前に設営できる出発へ寄せる',
    model.route.departure ? `出発：${model.route.departure}` : '出発時間を決める',
    model.route.stops.length ? `経由：${model.route.stops.join(' / ')}` : 'スーパー/コンビニを決める',
    context.kotaGoing !== 'no' ? 'コタ休憩ポイントを入れる' : '休憩ポイントを確認'
  ];
  const form = `<div class="workspace-form-grid">
    ${textareaField('routeMemo', 'ルートメモ', context.routeMemo, '6:30出発 / スーパー / コンビニ / 道の駅 / コタ休憩')}
    ${inputField('peopleCount', '人数', context.peopleCount, '2', 'inputmode="numeric"')}
    ${selectField('kotaGoing', 'コタ', context.kotaGoing || 'yes', [['yes', 'コタ同行'], ['no', 'コタなし']])}
  </div>`;
  return [
    workspaceSection('ルートの判断', miniRows([['天気', model.weatherDecision?.routeAdvice?.[0] || '雨前設営を意識'], ['出発', model.route.departure || '未設定'], ['経由地', model.route.stops.join(' / ') || '未設定'], ['IN', model.route.checkIn || '未設定']])),
    workspaceSection('決めること', miniList('優先', routeTasks)),
    workspaceSection('ルートを入力', form),
    hiddenWeatherFields(context),
    `<div class="core073-two-actions"><button id="copyDeparturePlan" class="primary-compact">出発コピー</button><button class="secondary-compact prepWorkspaceOpen" data-feature="kota">コタ確認</button></div>`,
    saveButton()
  ].join('');
}
function gearWorkspace(model) {
  const context = model.context;
  const gearTasks = [
    ...(model.weatherDecision?.gearAdvice || []).slice(0, 3),
    model.gear.status || '今回持つものを決める',
    model.gear.ledger.length ? `台帳登録済み：${model.gear.ledger.length}件` : 'ギア台帳に保管場所/用途を登録'
  ].filter(Boolean);
  const form = `<div class="workspace-form-grid">
    ${textareaField('gearMemo', '今回ギア', context.gearMemo, 'リビングシェル / 大スキレット / EcoFlow / WAVE3')}
    ${textareaField('gearLedgerMemo', 'ギア台帳', context.gearLedgerMemo, 'ギア名 / 保管場所 / 用途 / 季節 / 車載')}
  </div>`;
  return [
    workspaceSection('ギアの判断', miniRows([['天気', model.weatherDecision?.gearAdvice?.[0] || '天気から必要ギアを決める'], ['今回', model.gear.status || '未確認'], ['台帳', model.gear.ledger.length ? `${model.gear.ledger.length}件` : '未登録']])),
    workspaceSection('決めること', miniList('優先', gearTasks)),
    workspaceSection('今回の候補', miniList('候補', model.gear.items.slice(0, 8))),
    workspaceSection('ギアを入力', form),
    hiddenWeatherFields(context),
    saveButton()
  ].join('');
}
function kotaWorkspace(model) {
  const context = model.context;
  const kotaTasks = [
    ...(model.weatherDecision?.kotaAdvice || []).slice(0, 3),
    context.kotaGoing === 'no' ? 'コタ同行なし' : '水 / 暑さ / 雨 / 休憩を確認',
    model.route.kotaBreak ? '休憩ポイント入力済み' : 'コタ休憩ポイントを入れる'
  ].filter(Boolean);
  const form = `<div class="workspace-form-grid">
    ${selectField('kotaGoing', 'コタ', context.kotaGoing || 'yes', [['yes', 'コタ同行'], ['no', 'コタなし']])}
    ${textareaField('routeMemo', '休憩・移動メモ', context.routeMemo, 'SA/PA / 道の駅 / コタ休憩 / 車内暑さ')}
    ${textareaField('gearMemo', 'コタ用品メモ', context.gearMemo, '水 / フード / 足拭き / タオル / カート / 冷却')}
  </div>`;
  return [
    workspaceSection('コタの判断', miniRows([['天気', model.weatherDecision?.kotaAdvice?.[0] || '暑さ・雨・休憩を確認'], ['状態', model.kota.status || '要確認'], ['休憩', model.route.kotaBreak ? 'あり' : '未設定']])),
    workspaceSection('決めること', miniList('優先', kotaTasks)),
    workspaceSection('コタ用品', miniList('用品', model.kota.items.slice(0, 8))),
    workspaceSection('コタ条件を入力', form),
    hiddenWeatherFields(context),
    `<div class="core073-two-actions"><button class="primary-compact prepWorkspaceOpen" data-feature="route">ルート確認</button><button class="secondary-compact prepWorkspaceOpen" data-feature="gear">ギア確認</button></div>`,
    saveButton()
  ].join('');
}
function shoppingPreview(model) {
  const items = model.shoppingItems.slice(0, 7);
  if (!items.length) return '<p class="empty-line">料理を入力すると買物が出ます</p>';
  return `<div class="core073-shopping-preview">${items.map((item) => `<p><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.uses.join(' / ') || item.status)}</span></p>`).join('')}</div>`;
}
function modeChips(model) {
  const selected = new Set(model.context.mealModes || []);
  return `<section class="workspace-section"><div class="workspace-section-title"><strong>料理条件</strong><small>複数選択</small></div><div class="mode-chip-wrap compact-mode">${mealModeLabels().map((label) => `<button type="button" class="prepModeChip ${selected.has(label) ? 'active' : ''}" data-mode="${escapeHtml(label)}">${escapeHtml(label)}</button>`).join('')}</div></section>`;
}
function hiddenWeatherFields(context) {
  return `<textarea id="weatherMemo" class="hidden-field">${escapeHtml(context.weatherMemo)}</textarea><textarea id="weatherHourlyMemo" class="hidden-field">${escapeHtml(context.weatherHourlyMemo)}</textarea><textarea id="weatherDecisionMemo" class="hidden-field">${escapeHtml(context.weatherDecisionMemo)}</textarea><input id="highTemp" class="hidden-field" value="${escapeHtml(context.highTemp)}" /><input id="lowTemp" class="hidden-field" value="${escapeHtml(context.lowTemp)}" /><input id="rainRisk" class="hidden-field" value="${escapeHtml(context.rainRisk)}" /><input id="windMemo" class="hidden-field" value="${escapeHtml(context.windMemo)}" /><input id="humidityMemo" class="hidden-field" value="${escapeHtml(context.humidityMemo)}" /><input id="thunderMemo" class="hidden-field" value="${escapeHtml(context.thunderMemo)}" /><input id="siteAltitude" class="hidden-field" value="${escapeHtml(context.siteAltitude)}" /><input id="dryServiceMemo" class="hidden-field" value="${escapeHtml(context.dryServiceMemo)}" /><input id="cancelFreeUntil" class="hidden-field" value="${escapeHtml(context.cancelFreeUntil)}" /><input id="cancelDecisionStatus" class="hidden-field" value="${escapeHtml(context.cancelDecisionStatus)}" />`;
}
function hiddenFallbackFields(context) {
  return `<textarea id="menuMemo" class="hidden-field">${escapeHtml(context.menuMemo)}</textarea><textarea id="routeMemo" class="hidden-field">${escapeHtml(context.routeMemo)}</textarea><textarea id="gearMemo" class="hidden-field">${escapeHtml(context.gearMemo)}</textarea><textarea id="gearLedgerMemo" class="hidden-field">${escapeHtml(context.gearLedgerMemo)}</textarea><textarea id="pastReflection" class="hidden-field">${escapeHtml(context.pastReflection)}</textarea><textarea id="fixedDishMemo" class="hidden-field">${escapeHtml(context.fixedDishMemo)}</textarea><textarea id="extraNeedMemo" class="hidden-field">${escapeHtml(context.extraNeedMemo)}</textarea><textarea id="availableFoodMemo" class="hidden-field">${escapeHtml(context.availableFoodMemo)}</textarea><textarea id="missingFoodMemo" class="hidden-field">${escapeHtml(context.missingFoodMemo)}</textarea><input id="peopleCount" class="hidden-field" value="${escapeHtml(context.peopleCount)}" /><input id="kotaGoing" class="hidden-field" value="${escapeHtml(context.kotaGoing)}" />`;
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
  const activeFeature = WORKSPACE_META[state.prepFeature] ? state.prepFeature : 'dashboard';
  app().innerHTML = `<section class="route-page prep-lean core073-prep-page" data-screen-role="hub">${renderHero(model, plans, selectedKey)}${renderCommandCenter(model)}${renderStatusGrid(model, activeFeature)}${renderWorkspace(model, activeFeature)}</section>`;
  bindPrepActions(project, model);
}

function bindPrepActions(project, model) {
  document.querySelectorAll('.projectSwitch').forEach((button) => button.addEventListener('click', () => { patchState({ selectedPrepProjectId: button.dataset.projectKey, prepFeature: 'dashboard' }); toast('予定を選択'); renderPrep(); }));
  document.querySelectorAll('.prepWorkspaceOpen').forEach((button) => button.addEventListener('click', () => { patchState({ prepFeature: button.dataset.feature || 'dashboard' }); renderPrep(); }));
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
function fieldValue(id, fallback = '') {
  const el = document.getElementById(id);
  if (!el) return fallback || '';
  return el.value;
}
function readPrepContext(reservation, current = {}) {
  const selectedModes = [...document.querySelectorAll('.prepModeChip.active')].map((button) => button.dataset.mode).filter(Boolean);
  return normalizePrepContext({
    ...current,
    weatherMemo: fieldValue('weatherMemo', current.weatherMemo),
    weatherHourlyMemo: fieldValue('weatherHourlyMemo', current.weatherHourlyMemo),
    weatherDecisionMemo: fieldValue('weatherDecisionMemo', current.weatherDecisionMemo),
    highTemp: fieldValue('highTemp', current.highTemp),
    lowTemp: fieldValue('lowTemp', current.lowTemp),
    rainRisk: fieldValue('rainRisk', current.rainRisk),
    windMemo: fieldValue('windMemo', current.windMemo),
    humidityMemo: fieldValue('humidityMemo', current.humidityMemo),
    thunderMemo: fieldValue('thunderMemo', current.thunderMemo),
    siteAltitude: fieldValue('siteAltitude', current.siteAltitude),
    dryServiceMemo: fieldValue('dryServiceMemo', current.dryServiceMemo),
    cancelFreeUntil: fieldValue('cancelFreeUntil', current.cancelFreeUntil),
    cancelDecisionStatus: fieldValue('cancelDecisionStatus', current.cancelDecisionStatus || '保留'),
    peopleCount: fieldValue('peopleCount', current.peopleCount),
    kotaGoing: fieldValue('kotaGoing', current.kotaGoing || 'yes'),
    menuMemo: fieldValue('menuMemo', current.menuMemo),
    routeMemo: fieldValue('routeMemo', current.routeMemo),
    gearMemo: fieldValue('gearMemo', current.gearMemo),
    gearLedgerMemo: fieldValue('gearLedgerMemo', current.gearLedgerMemo),
    pastReflection: fieldValue('pastReflection', current.pastReflection),
    fixedDishMemo: fieldValue('fixedDishMemo', current.fixedDishMemo),
    extraNeedMemo: fieldValue('extraNeedMemo', current.extraNeedMemo),
    availableFoodMemo: fieldValue('availableFoodMemo', current.availableFoodMemo),
    missingFoodMemo: fieldValue('missingFoodMemo', current.missingFoodMemo),
    localChangeMemo: current.localChangeMemo || '',
    mealModes: selectedModes.length ? selectedModes : current.mealModes
  }, reservation);
}
