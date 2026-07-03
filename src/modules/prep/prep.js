import { app, card, listItems, escapeHtml, toast } from '../../ui/components.js?v=core05-5-time-phase-ux-20260703';
import { getState, patchState } from '../../core/store.js?v=core05-5-time-phase-ux-20260703';
import { renderImportPanel } from '../import/import.js?v=core05-5-time-phase-ux-20260703';
import { buildLineList, buildPracticalPrep, normalizePrepContext } from './prepEngine.js?v=core05-5-time-phase-ux-20260703';

const FOCUS_META = {
  shopping: { label: '買う', sub: '買い物' },
  packing: { label: '持つ', sub: 'ギア' },
  meal: { label: '食べる', sub: '料理' },
  kota: { label: 'コタ', sub: '犬用品' }
};

function firstItems(items = [], count = 6) { return (items || []).slice(0, count); }
function countPrep(project) { return project?.prep ? Object.values(project.prep).reduce((sum, items) => sum + (items?.length || 0), 0) : 0; }

function mealItems(project, context) {
  const menu = String(context.menuMemo || '').trim();
  const shopping = project?.prep?.shopping || [];
  const matched = shopping.filter((item) => /ピザ|シュリンプ|エビ|海老|アヒージョ|ホットドッグ|朝食|料理|食材|ローストビーフ|パン/.test(item));
  if (menu) return [`献立：${menu}`, ...matched];
  return matched.length ? matched : ['料理メモを足すと、買い物に反映されます'];
}

function focusItems(project, context, focus) {
  const prep = project?.prep || {};
  if (focus === 'meal') return mealItems(project, context);
  return prep[focus] || [];
}

export function renderPrep() {
  const state = getState();
  const project = state.nextProject;
  const context = normalizePrepContext(state.prepContext || project?.prepContext || {}, project?.reservation || {});
  const focus = state.prepFocus || 'shopping';

  if (!project) {
    app().innerHTML = [`<section class="page-title"><p class="overline">前 / BEFORE</p><h2>予定を入れる</h2></section>`, renderImportPanel()].join('');
    window.OUTBASE_IMPORT?.bind?.();
    return;
  }

  app().innerHTML = [renderProjectHero(project), renderFocusPrep(project, context, focus), renderContextPanel(project, context), renderImportAgain()].join('');
  window.OUTBASE_IMPORT?.bind?.();
  bindPrepActions(project, context);
}

function renderProjectHero(project) {
  const r = project.reservation || {};
  const meta = [r.dateText, r.checkIn && `IN ${r.checkIn}`, r.checkOut && `OUT ${r.checkOut}`].filter(Boolean).join(' / ');
  return `<section class="mini-hero cardless"><div class="hero-content"><span class="phase-badge">前 / BEFORE</span><h2>${escapeHtml(r.campground || project.title || '次のキャンプ')}</h2><p class="hero-date">${escapeHtml(meta || '日程未確定')}</p><div class="pill-line"><span>${countPrep(project)} items</span><span>LINE ready</span></div></div></section>`;
}

function renderTabs(project, context, focus) {
  return `<div class="big-tabs">${Object.entries(FOCUS_META).map(([key, meta]) => {
    const count = focusItems(project, context, key).length;
    return `<button class="prepFocus ${focus === key ? 'active' : ''}" data-focus="${key}">${escapeHtml(meta.label)}<span>${count}件</span></button>`;
  }).join('')}</div>`;
}

function renderFocusPrep(project, context, focus) {
  const meta = FOCUS_META[focus] || FOCUS_META.shopping;
  const items = focusItems(project, context, focus);
  return card(`${renderTabs(project, context, focus)}
    <section class="focus-list"><div class="list-head"><strong>${escapeHtml(meta.label)}</strong><span>${items.length}</span></div>${listItems(firstItems(items), 'なし')}</section>
    <div class="thumb-row"><button id="copyLineList" class="btn primary">LINEコピー</button><button class="btn ghost" id="showFullList">全文</button></div>
    <details class="quiet-details" id="fullListDetails"><summary>リスト全文</summary><textarea id="lineListText" class="field textarea readonly" readonly>${escapeHtml(buildLineList(project, context))}</textarea></details>`, 'focus');
}

function renderContextPanel(project, context) {
  return card(`<details class="quiet-details"><summary>条件を足す</summary>
    <div class="quick-input-grid">
      <label><span>天気</span><textarea id="weatherMemo" class="field textarea compact" placeholder="雨 / 暑い / 風">${escapeHtml(context.weatherMemo)}</textarea></label>
      <label><span>料理</span><textarea id="menuMemo" class="field textarea compact" placeholder="ピザ / エビ / 朝食">${escapeHtml(context.menuMemo)}</textarea></label>
      <label><span>行き方</span><textarea id="routeMemo" class="field textarea compact" placeholder="6:30 / コンビニ">${escapeHtml(context.routeMemo)}</textarea></label>
      <label><span>設営撤収</span><textarea id="setupMemo" class="field textarea compact" placeholder="時間を測る / 雨撤収">${escapeHtml(context.setupMemo)}</textarea></label>
      <label><span>ギア</span><textarea id="gearMemo" class="field textarea compact" placeholder="ヘキサ / EcoFlow">${escapeHtml(context.gearMemo)}</textarea></label>
      <label><span>反省</span><textarea id="pastReflection" class="field textarea compact" placeholder="タオル不足 / 料理多い">${escapeHtml(context.pastReflection)}</textarea></label>
    </div>
    <details class="quiet-details"><summary>細かい条件</summary>
      <div class="quick-input-grid">
        <input id="highTemp" class="field" inputmode="numeric" value="${escapeHtml(context.highTemp)}" placeholder="最高気温" />
        <input id="lowTemp" class="field" inputmode="numeric" value="${escapeHtml(context.lowTemp)}" placeholder="最低気温" />
        <input id="rainRisk" class="field" value="${escapeHtml(context.rainRisk)}" placeholder="降水" />
        <input id="windMemo" class="field" value="${escapeHtml(context.windMemo)}" placeholder="風" />
        <input id="peopleCount" class="field" inputmode="numeric" value="${escapeHtml(context.peopleCount)}" placeholder="人数" />
        <select id="kotaGoing" class="field"><option value="yes" ${context.kotaGoing !== 'no' ? 'selected' : ''}>コタ同行</option><option value="no" ${context.kotaGoing === 'no' ? 'selected' : ''}>コタなし</option></select>
      </div>
    </details>
    <button id="updatePracticalPrep" class="btn primary">整える</button>
  </details>`, 'soft');
}

function renderImportAgain() { return card(`<details class="quiet-details"><summary>予約を入れ直す</summary>${renderImportPanel()}</details>`, 'soft'); }

function bindPrepActions(project, context) {
  document.querySelectorAll('.prepFocus').forEach((button) => {
    button.addEventListener('click', () => { patchState({ prepFocus: button.dataset.focus }); renderPrep(); });
  });
  document.getElementById('showFullList')?.addEventListener('click', () => {
    const details = document.getElementById('fullListDetails');
    if (details) details.open = true;
    document.getElementById('lineListText')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  document.getElementById('updatePracticalPrep')?.addEventListener('click', () => {
    const nextContext = readPrepContext(project.reservation || {});
    const nextPrep = buildPracticalPrep(project, nextContext);
    const nextProject = { ...project, prep: nextPrep, prepContext: nextContext, updatedAt: new Date().toISOString() };
    patchState({ prepContext: nextContext, nextProject });
    toast('準備を整えました');
    renderPrep();
  });
  document.getElementById('copyLineList')?.addEventListener('click', async () => {
    const latest = getState();
    const latestProject = latest.nextProject || project;
    const latestContext = normalizePrepContext(latest.prepContext || context, latestProject?.reservation || {});
    const text = buildLineList(latestProject, latestContext);
    const area = document.getElementById('lineListText');
    try {
      await navigator.clipboard.writeText(text);
      if (area) area.value = `${text}

コピー済み`;
      toast('LINEリストをコピー');
    } catch {
      if (area) { area.focus(); area.select(); }
      toast('本文を選択しました');
    }
  });
}

function readPrepContext(reservation) {
  return normalizePrepContext({
    weatherMemo: document.getElementById('weatherMemo')?.value || '',
    highTemp: document.getElementById('highTemp')?.value || '',
    lowTemp: document.getElementById('lowTemp')?.value || '',
    rainRisk: document.getElementById('rainRisk')?.value || '',
    windMemo: document.getElementById('windMemo')?.value || '',
    peopleCount: document.getElementById('peopleCount')?.value || '',
    kotaGoing: document.getElementById('kotaGoing')?.value || 'yes',
    menuMemo: document.getElementById('menuMemo')?.value || '',
    routeMemo: document.getElementById('routeMemo')?.value || '',
    setupMemo: document.getElementById('setupMemo')?.value || '',
    gearMemo: document.getElementById('gearMemo')?.value || '',
    pastReflection: document.getElementById('pastReflection')?.value || ''
  }, reservation);
}
