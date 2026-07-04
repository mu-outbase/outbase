import { app, escapeHtml, toast } from '../../ui/components.js?v=core07-1-weather-decision-20260705';
import { getState, patchState } from '../../core/store.js?v=core07-1-weather-decision-20260705';
import { renderImportPanel } from '../import/import.js?v=core07-1-weather-decision-20260705';
import {
  buildDepartureLineList,
  buildMealLineList,
  buildPrepModel,
  buildPracticalPrep,
  buildShoppingLineList,
  buildWeatherDecisionLineList,
  mealModeLabels,
  normalizePrepContext
} from './prepEngine.js?v=core07-1-weather-decision-20260705';

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
  return `<section class="route-summary-card prep-hero-card core07-prep-hero">
    <div><span>準備中</span><h2>${escapeHtml(projectName(project))}</h2><p>${escapeHtml(tags.join(' / ') || '予定を選ぶと準備がつながります')}</p></div>
    <b>${model.weatherDecision.riskScore || '天気'}</b>
  </section>
  ${plans.length > 1 ? `<section class="panel-card tight-card core07-switch-card"><div class="section-title-row"><strong>準備する予定</strong><small>${plans.length}件</small></div><div class="project-switch-row">${plans.map((plan) => `<button class="projectSwitch ${selectedKey === plan.key ? 'active' : ''}" data-project-key="${escapeHtml(plan.key)}"><strong>${escapeHtml(plan.title)}</strong><span>${escapeHtml(plan.sub)}</span></button>`).join('')}</div></section>` : ''}`;
}

function weatherDecisionCard(model) {
  const w = model.weatherDecision;
  return `<section class="panel-card tight-card weather-decision-card prep-glance-card">
    <div class="section-title-row"><strong>詳細天気・判断</strong><small>${escapeHtml(w.statusLabel)}</small></div>
    <div class="weather-score-row"><div><span>天気リスク</span><strong>${w.riskScore}</strong></div><p>${escapeHtml(w.recommendation)}</p></div>
    <div class="prep-alert-list weather-risk-list">${w.riskItems.map((item) => `<span>${escapeHtml(item)}</span>`).join('')}</div>
    <div class="decision-button-row"><button class="cancelDecisionBtn ${w.status === '行く' ? 'active' : ''}" data-status="行く">行く</button><button class="cancelDecisionBtn ${w.status === '保留' ? 'active' : ''}" data-status="保留">保留</button><button class="cancelDecisionBtn ${w.status === 'キャンセル検討' ? 'active' : ''}" data-status="キャンセル検討">キャンセル検討</button></div>
    <div class="copy-grid-three"><button id="copyWeatherDecision" class="primary-compact">天気判断コピー</button><button class="secondary-compact openDetail" data-target="weatherDetail">詳細天気</button><button class="secondary-compact openDetail" data-target="weatherInputDetail">天気入力</button></div>
  </section>`;
}

function topActionCard(model) {
  const actions = model.topActions.length ? model.topActions : ['詳細天気を確認', '料理と買物を確認', '出発とギアを確認'];
  return `<section class="panel-card tight-card prep-next-action-card"><div class="section-title-row"><strong>次にやること</strong><small>上位3つ</small></div><ol class="next-action-list">${actions.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ol></section>`;
}

function mealShoppingSummary(model) {
  const night = model.meals.find((meal) => meal.label === '1日目 夜');
  const morning = model.meals.find((meal) => meal.label === '2日目 朝');
  const common = model.commonFoods.map((item) => item.name).slice(0, 4).join(' / ') || '未検出';
  const weatherAdvice = model.weatherDecision.mealAdvice[0] || '天気次第で火数と量を調整';
  const shoppingOpen = model.shoppingItems.filter((item) => item.status !== '現地あり').length;
  return `<section class="panel-card tight-card prep-glance-card"><div class="section-title-row"><strong>料理・買物</strong><small>${shoppingOpen}件</small></div>
    <div class="prep-summary-lines">
      <p><span>天気判断</span><strong>${escapeHtml(weatherAdvice)}</strong></p>
      <p><span>1日目夜</span><strong>${escapeHtml(night?.menu || night?.fallback || '未定')}</strong></p>
      <p><span>2日目朝</span><strong>${escapeHtml(morning?.menu || morning?.fallback || '未定')}</strong></p>
      <p><span>共通食材</span><strong>${escapeHtml(common)}</strong></p>
    </div>
    <div class="button-pair"><button class="secondary-compact openDetail" data-target="mealDetail">料理を見る</button><button class="secondary-compact openDetail" data-target="shoppingDetail">買物を見る</button></div>
  </section>`;
}

function routeSummary(model) {
  const route = model.route;
  const advice = route.weatherAdvice?.[0] || '天気に合わせて出発・買物場所を決める';
  return `<section class="panel-card tight-card prep-glance-card"><div class="section-title-row"><strong>ルート・出発</strong><small>雨前設営</small></div>
    <div class="prep-summary-lines">
      <p><span>天気判断</span><strong>${escapeHtml(advice)}</strong></p>
      <p><span>出発</span><strong>${escapeHtml(route.departure || '未設定')}</strong></p>
      <p><span>経由地</span><strong>${escapeHtml(route.stops.join(' / ') || 'スーパー/コンビニ未設定')}</strong></p>
      <p><span>IN</span><strong>${escapeHtml(route.checkIn || '未設定')}</strong></p>
    </div>
    <div class="copy-grid-three"><button id="copyDeparturePlan" class="primary-compact">出発コピー</button><button class="secondary-compact openDetail" data-target="routeDetail">ルート詳細</button><button class="secondary-compact openDetail" data-target="weatherInputDetail">経由地入力</button></div>
  </section>`;
}

function gearSummary(model) {
  const advice = model.weatherDecision.gearAdvice[0] || '幕・電源・調理ギアを今回分で判断';
  return `<section class="panel-card tight-card prep-glance-card"><div class="section-title-row"><strong>ギア</strong><small>今回持つ/台帳</small></div>
    <div class="prep-summary-lines">
      <p><span>天気判断</span><strong>${escapeHtml(advice)}</strong></p>
      <p><span>今回</span><strong>${escapeHtml(model.gear.status)}</strong></p>
      <p><span>台帳</span><strong>${escapeHtml(model.gear.ledger.length ? `${model.gear.ledger.length}件登録` : '未登録')}</strong></p>
    </div>
    <div class="copy-grid-three"><button class="secondary-compact openDetail" data-target="gearDetail">今回ギア</button><button class="secondary-compact openDetail" data-target="gearLedgerDetail">ギア台帳</button><button class="secondary-compact openDetail" data-target="weatherInputDetail">入力</button></div>
  </section>`;
}

function kotaSummary(model) {
  const advice = model.weatherDecision.kotaAdvice[0] || '水・暑さ・雨・休憩を確認';
  return `<section class="panel-card tight-card prep-glance-card"><div class="section-title-row"><strong>コタ用品</strong><small>天気連動</small></div>
    <div class="prep-summary-lines">
      <p><span>天気判断</span><strong>${escapeHtml(advice)}</strong></p>
      <p><span>必要</span><strong>${escapeHtml(model.kota.status)}</strong></p>
    </div>
    <div class="button-pair"><button class="secondary-compact openDetail" data-target="kotaDetail">コタ用品</button><button id="copyShoppingList" class="secondary-compact">買物コピー</button></div>
  </section>`;
}

function mealMatrix(model) {
  return `<div class="meal-matrix core07-meal-matrix">${model.meals.map((meal) => `<div><span>${escapeHtml(meal.label)}</span><strong>${escapeHtml(meal.menu || meal.fallback)}</strong></div>`).join('')}</div>`;
}
function modeChips(model) {
  const selected = new Set(model.context.mealModes || []);
  return `<div class="mode-chip-wrap">${mealModeLabels().map((label) => `<button type="button" class="prepModeChip ${selected.has(label) ? 'active' : ''}" data-mode="${escapeHtml(label)}">${escapeHtml(label)}</button>`).join('')}</div>`;
}
function suggestionCards(model) {
  return `<div class="image-card-grid">${model.suggestions.map((item) => `<article class="image-info-card"><div class="image-placeholder">${escapeHtml(item.imageLabel || item.title)}</div><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.reason)}</p>${item.ingredients?.length ? `<small>食材：${escapeHtml(item.ingredients.join(' / '))}</small>` : ''}</div></article>`).join('')}</div>`;
}
function shoppingDetail(model) {
  return `<div class="shopping-detail-list">${model.shoppingItems.map((item) => `<article class="shopping-food-card ${item.common ? 'common' : ''}"><div><strong>${escapeHtml(item.name)}${item.amount ? ` ${escapeHtml(item.amount)}` : ''}</strong><span>${escapeHtml(item.uses.join(' / ') || '用途未設定')}</span>${item.alternatives.length ? `<small>代替：${escapeHtml(item.alternatives.join(' / '))}</small>` : ''}</div><em>${escapeHtml(item.status || '買う')}</em></article>`).join('')}</div>`;
}
function weatherDetail(model) {
  const w = model.weatherDecision;
  return `<div class="weather-detail-grid"><div><strong>判断材料</strong>${simpleList(w.decisionItems, '無料期限と天気を入力')}</div><div><strong>準備への影響</strong>${simpleList(w.crossImpacts, '天気入力で表示')}</div><div><strong>料理への影響</strong>${simpleList(w.mealAdvice, '天気入力で表示')}</div><div><strong>ギアへの影響</strong>${simpleList(w.gearAdvice, '天気入力で表示')}</div><div><strong>コタへの影響</strong>${simpleList(w.kotaAdvice, '天気入力で表示')}</div></div>`;
}
function recoveryDetail(model) {
  const hasAny = model.recovery.missing.length || model.recovery.localChanges.length || model.recovery.available.length;
  return `<div class="recovery-box">${hasAny ? '' : '<p class="empty-line">現地変更・忘れ物があればここに残す</p>'}${model.recovery.missing.length ? `<p><strong>忘れた</strong><span>${escapeHtml(model.recovery.missing.join(' / '))}</span></p>` : ''}${model.recovery.localChanges.length ? `<p><strong>現地変更</strong><span>${escapeHtml(model.recovery.localChanges.join(' / '))}</span></p>` : ''}${model.recovery.available.length ? `<p><strong>今ある食材</strong><span>${escapeHtml(model.recovery.available.join(' / '))}</span></p>` : ''}${model.recovery.alternatives.length ? `<div class="alternative-list">${model.recovery.alternatives.map((item) => `<div><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.choices.join(' / '))}</span></div>`).join('')}</div>` : ''}</div>`;
}
function gearLedger(model) {
  return `<div class="gear-ledger-box"><p class="empty-line">ギア登録はここ。準備タブでは「今回持つか」を決め、台帳には保管場所・季節・用途を残す。</p>${simpleList(model.gear.ledger, '下の条件入力でギア台帳メモを登録')}</div>`;
}
function detailSections(model) {
  return `<section class="panel-card tight-card core07-detail-block"><details id="weatherDetail" class="quiet-details"><summary>詳細天気・キャンセル判断</summary>${weatherDetail(model)}</details></section>
  <section class="panel-card tight-card core07-detail-block"><details id="mealDetail" class="quiet-details"><summary>料理計画・提案</summary>${mealMatrix(model)}<h3>料理提案条件</h3>${modeChips(model)}<h3>画像付き候補</h3>${suggestionCards(model)}</details></section>
  <section class="panel-card tight-card core07-detail-block"><details id="shoppingDetail" class="quiet-details"><summary>買物リスト詳細</summary>${shoppingDetail(model)}</details></section>
  <section class="panel-card tight-card core07-detail-block"><details id="routeDetail" class="quiet-details"><summary>ルート詳細</summary>${simpleList([`出発：${model.route.departure || '未設定'}`, `目的地：${model.route.destination}`, `チェックイン：${model.route.checkIn || '未設定'}`, ...(model.route.stops || []).map((x) => `経由：${x}`), ...(model.route.weatherAdvice || [])], 'ルートメモを入力')}</details></section>
  <section class="panel-card tight-card core07-detail-block"><details id="gearDetail" class="quiet-details"><summary>今回ギア</summary>${simpleList(model.gear.items, 'ギアメモを足すと表示します')}</details><details id="gearLedgerDetail" class="quiet-details"><summary>ギア台帳</summary>${gearLedger(model)}</details><details id="kotaDetail" class="quiet-details"><summary>コタ用品</summary>${simpleList(model.kota.items, 'コタ同行条件を入れると表示します')}</details></section>
  <section class="panel-card tight-card core07-detail-block"><details id="recoveryDetail" class="quiet-details"><summary>現地変更・忘れ物対応</summary>${recoveryDetail(model)}</details></section>
  <section class="panel-card tight-card core07-detail-block"><details class="quiet-details"><summary>全部見る・他タブ連携</summary><div class="flow-link-list"><span>探す → 予定</span><span>予定 → 準備</span><span>準備 → 当日</span><span>実績 → 記録</span><span>思い出 → 次回改善</span></div></details></section>`;
}
function simpleList(items = [], empty = 'なし') {
  if (!items.length) return `<p class="empty-line">${escapeHtml(empty)}</p>`;
  return `<ul class="outbase-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function contextPanel(project, model) {
  const context = model.context;
  const modesValue = (context.mealModes || []).join('\n');
  return `<section class="panel-card tight-card"><details id="weatherInputDetail" class="quiet-details"><summary>条件を足す</summary>
    <div class="line-form two-col">
      <label><span>無料キャンセル期限</span><input id="cancelFreeUntil" class="field" value="${escapeHtml(context.cancelFreeUntil)}" placeholder="6/23 23:59" /></label>
      <label><span>判断状態</span><select id="cancelDecisionStatus" class="field"><option value="保留" ${context.cancelDecisionStatus === '保留' ? 'selected' : ''}>保留</option><option value="行く" ${context.cancelDecisionStatus === '行く' ? 'selected' : ''}>行く</option><option value="キャンセル検討" ${context.cancelDecisionStatus === 'キャンセル検討' ? 'selected' : ''}>キャンセル検討</option><option value="キャンセル済み" ${context.cancelDecisionStatus === 'キャンセル済み' ? 'selected' : ''}>キャンセル済み</option></select></label>
      <label><span>詳細天気</span><textarea id="weatherMemo" class="field textarea compact" placeholder="雨 / 暑い / 風 / 撤収日雨">${escapeHtml(context.weatherMemo)}</textarea></label>
      <label><span>1時間ごとの天気</span><textarea id="weatherHourlyMemo" class="field textarea compact" placeholder="土曜15-18時雨、日曜朝雨など">${escapeHtml(context.weatherHourlyMemo)}</textarea></label>
      <label><span>天気判断メモ</span><textarea id="weatherDecisionMemo" class="field textarea compact" placeholder="無料期限前に判断 / タープ慎重">${escapeHtml(context.weatherDecisionMemo)}</textarea></label>
      <label><span>料理</span><textarea id="menuMemo" class="field textarea compact" placeholder="1日目夜：ピザ\n2日目朝：ホットサンド">${escapeHtml(context.menuMemo)}</textarea></label>
      <label><span>絶対やりたい料理</span><textarea id="fixedDishMemo" class="field textarea compact" placeholder="ガーリックシュリンプは絶対">${escapeHtml(context.fixedDishMemo)}</textarea></label>
      <label><span>追加/付け合わせ</span><textarea id="extraNeedMemo" class="field textarea compact" placeholder="もう1品 / おつまみ / 軽く">${escapeHtml(context.extraNeedMemo)}</textarea></label>
      <label><span>行き方</span><textarea id="routeMemo" class="field textarea compact" placeholder="6:30出発 / スーパー / コタ休憩">${escapeHtml(context.routeMemo)}</textarea></label>
      <label><span>ギア</span><textarea id="gearMemo" class="field textarea compact" placeholder="リビングシェル / 大スキレット / EcoFlow">${escapeHtml(context.gearMemo)}</textarea></label>
      <label><span>ギア台帳</span><textarea id="gearLedgerMemo" class="field textarea compact" placeholder="ギア名 / 保管場所 / 用途 / 季節">${escapeHtml(context.gearLedgerMemo)}</textarea></label>
      <label><span>忘れた/現地変更</span><textarea id="missingFoodMemo" class="field textarea compact" placeholder="レモン忘れた">${escapeHtml(context.missingFoodMemo)}</textarea></label>
      <label><span>現地にある食材</span><textarea id="availableFoodMemo" class="field textarea compact" placeholder="道の駅トマト / 友人の肉">${escapeHtml(context.availableFoodMemo)}</textarea></label>
      <label><span>反省</span><textarea id="pastReflection" class="field textarea compact" placeholder="バケット不要 / 料理多い">${escapeHtml(context.pastReflection)}</textarea></label>
      <label><span>選択中の料理条件</span><textarea id="mealModes" class="field textarea compact" readonly>${escapeHtml(modesValue)}</textarea></label>
    </div>
    <div class="line-form two-col compact-extra"><input id="highTemp" class="field" inputmode="numeric" value="${escapeHtml(context.highTemp)}" placeholder="最高気温" /><input id="lowTemp" class="field" inputmode="numeric" value="${escapeHtml(context.lowTemp)}" placeholder="最低気温" /><input id="rainRisk" class="field" value="${escapeHtml(context.rainRisk)}" placeholder="降水" /><input id="windMemo" class="field" value="${escapeHtml(context.windMemo)}" placeholder="風" /><input id="humidityMemo" class="field" value="${escapeHtml(context.humidityMemo)}" placeholder="湿度" /><input id="thunderMemo" class="field" value="${escapeHtml(context.thunderMemo)}" placeholder="雷" /><input id="siteAltitude" class="field" value="${escapeHtml(context.siteAltitude)}" placeholder="標高/寒暖差" /><input id="dryServiceMemo" class="field" value="${escapeHtml(context.dryServiceMemo)}" placeholder="乾燥サービス" /><input id="peopleCount" class="field" inputmode="numeric" value="${escapeHtml(context.peopleCount)}" placeholder="人数" /><select id="kotaGoing" class="field"><option value="yes" ${context.kotaGoing !== 'no' ? 'selected' : ''}>コタ同行</option><option value="no" ${context.kotaGoing === 'no' ? 'selected' : ''}>コタなし</option></select></div>
    <button id="updatePracticalPrep" class="primary-compact">天気から準備を整える</button>
  </details></section>`;
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
  app().innerHTML = `<section class="route-page prep-lean core07-prep-page">${projectHero(model, plans, selectedKey)}${weatherDecisionCard(model)}${topActionCard(model)}${mealShoppingSummary(model)}${routeSummary(model)}${gearSummary(model)}${kotaSummary(model)}${detailSections(model)}${contextPanel(project, model)}<section class="panel-card tight-card"><details class="quiet-details"><summary>予約を入れ直す</summary>${renderImportPanel()}</details></section></section>`;
  window.OUTBASE_IMPORT?.bind?.();
  bindPrepActions(project, model);
}

function bindPrepActions(project, model) {
  document.querySelectorAll('.projectSwitch').forEach((button) => button.addEventListener('click', () => { patchState({ selectedPrepProjectId: button.dataset.projectKey }); toast('予定を選択'); renderPrep(); }));
  document.querySelectorAll('.openDetail').forEach((button) => button.addEventListener('click', () => { const details = document.getElementById(button.dataset.target); if (details) { details.open = true; details.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }));
  document.querySelectorAll('.cancelDecisionBtn').forEach((button) => button.addEventListener('click', () => { const nextContext = { ...model.context, cancelDecisionStatus: button.dataset.status }; patchState({ prepContext: nextContext }); toast(`判断：${button.dataset.status}`); renderPrep(); }));
  document.querySelectorAll('.prepModeChip').forEach((button) => button.addEventListener('click', () => {
    const state = getState();
    const current = normalizePrepContext(state.prepContext || model.context, project?.reservation || {});
    const set = new Set(current.mealModes || []);
    if (set.has(button.dataset.mode)) set.delete(button.dataset.mode); else set.add(button.dataset.mode);
    patchState({ prepContext: { ...current, mealModes: [...set] } });
    renderPrep();
  }));
  document.getElementById('updatePracticalPrep')?.addEventListener('click', () => {
    const nextContext = readPrepContext(project.reservation || {}, model.context);
    const nextPrep = buildPracticalPrep(project, nextContext);
    patchState({ prepContext: nextContext, nextProject: { ...project, prep: nextPrep, prepContext: nextContext, updatedAt: new Date().toISOString() } });
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
    weatherMemo: document.getElementById('weatherMemo')?.value || '',
    weatherHourlyMemo: document.getElementById('weatherHourlyMemo')?.value || '',
    weatherDecisionMemo: document.getElementById('weatherDecisionMemo')?.value || '',
    highTemp: document.getElementById('highTemp')?.value || '',
    lowTemp: document.getElementById('lowTemp')?.value || '',
    rainRisk: document.getElementById('rainRisk')?.value || '',
    windMemo: document.getElementById('windMemo')?.value || '',
    humidityMemo: document.getElementById('humidityMemo')?.value || '',
    thunderMemo: document.getElementById('thunderMemo')?.value || '',
    siteAltitude: document.getElementById('siteAltitude')?.value || '',
    dryServiceMemo: document.getElementById('dryServiceMemo')?.value || '',
    cancelFreeUntil: document.getElementById('cancelFreeUntil')?.value || '',
    cancelDecisionStatus: document.getElementById('cancelDecisionStatus')?.value || '保留',
    peopleCount: document.getElementById('peopleCount')?.value || '',
    kotaGoing: document.getElementById('kotaGoing')?.value || 'yes',
    menuMemo: document.getElementById('menuMemo')?.value || '',
    routeMemo: document.getElementById('routeMemo')?.value || '',
    setupMemo: current.setupMemo || '',
    gearMemo: document.getElementById('gearMemo')?.value || '',
    gearLedgerMemo: document.getElementById('gearLedgerMemo')?.value || '',
    pastReflection: document.getElementById('pastReflection')?.value || '',
    fixedDishMemo: document.getElementById('fixedDishMemo')?.value || '',
    extraNeedMemo: document.getElementById('extraNeedMemo')?.value || '',
    availableFoodMemo: document.getElementById('availableFoodMemo')?.value || '',
    missingFoodMemo: document.getElementById('missingFoodMemo')?.value || '',
    localChangeMemo: current.localChangeMemo || '',
    mealModes: selectedModes.length ? selectedModes : current.mealModes
  }, reservation);
}
