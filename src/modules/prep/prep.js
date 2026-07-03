import { app, card, kv, listItems, escapeHtml } from '../../ui/components.js?v=core05-3-visual-ux-20260703';
import { getState, patchState } from '../../core/store.js?v=core05-3-visual-ux-20260703';
import { renderImportPanel } from '../import/import.js?v=core05-3-visual-ux-20260703';
import { buildLineList, buildPracticalPrep, normalizePrepContext } from './prepEngine.js?v=core05-3-visual-ux-20260703';

function firstItems(items = [], count = 4) {
  return (items || []).slice(0, count);
}

function count(items = []) {
  return (items || []).length;
}

function countPrep(project) {
  return project?.prep ? Object.values(project.prep).reduce((sum, items) => sum + (items?.length || 0), 0) : 0;
}

export function renderPrep() {
  const state = getState();
  const project = state.nextProject;
  const context = normalizePrepContext(state.prepContext || project?.prepContext || {}, project?.reservation || {});

  if (!project) {
    app().innerHTML = [
      `<section class="page-title"><p class="overline">PREP</p><h2>予定を入れる</h2></section>`,
      renderImportPanel()
    ].join('');
    window.OUTBASE_IMPORT?.bind?.();
    return;
  }

  app().innerHTML = [
    renderProjectHero(project),
    renderMainPrep(project, context),
    renderContextPanel(project, context),
    renderImportAgain()
  ].join('');
  window.OUTBASE_IMPORT?.bind?.();
  bindPrepActions(project, context);
}

function renderProjectHero(project) {
  const reservation = project.reservation || {};
  const meta = [reservation.dateText, reservation.checkIn && `IN ${reservation.checkIn}`, reservation.checkOut && `OUT ${reservation.checkOut}`].filter(Boolean).join(' / ');
  return `<section class="camp-mini cardless"><p class="overline">PREP</p><h2>${escapeHtml(reservation.campground || project.title || '次のキャンプ')}</h2><p>${escapeHtml(meta || '日程未確定')}</p><div class="pill-line"><span>${countPrep(project)} items</span><span>LINE ready</span></div></section>`;
}

function miniList(title, items, empty) {
  return `<section class="prep-tile"><div class="tile-head"><h3>${escapeHtml(title)}</h3><span>${count(items)}</span></div>${listItems(firstItems(items), empty)}</section>`;
}

function renderMainPrep(project, context) {
  const prep = project.prep || {};
  return card(`<div class="compact-row top-align"><div><p class="eyebrow">TODAY</p><h2>持っていくもの</h2></div><button id="copyLineList" class="btn primary small-wide">LINEコピー</button></div>
    <div class="prep-focus visual">
      ${miniList('買う', prep.shopping, 'なし')}
      ${miniList('持つ', prep.packing, 'なし')}
      ${miniList('コタ', prep.kota, 'なし')}
      ${miniList('注意', prep.reflection, 'なし')}
    </div>
    <details class="quiet-details"><summary>リスト全文</summary><textarea id="lineListText" class="field textarea readonly" readonly>${escapeHtml(buildLineList(project, context))}</textarea></details>`, 'focus-card');
}

function renderContextPanel(project, context) {
  return card(`<details class="quiet-details visual-drawer">
    <summary>条件を足す</summary>
    <div class="visual-input-grid">
      <label><span>天気</span><textarea id="weatherMemo" class="field textarea compact" placeholder="雨 / 暑い / 風">${escapeHtml(context.weatherMemo)}</textarea></label>
      <label><span>料理</span><textarea id="menuMemo" class="field textarea compact" placeholder="ピザ / エビ / 朝食">${escapeHtml(context.menuMemo)}</textarea></label>
      <label><span>行き方</span><textarea id="routeMemo" class="field textarea compact" placeholder="6:30出発 / コンビニ">${escapeHtml(context.routeMemo)}</textarea></label>
      <label><span>設営撤収</span><textarea id="setupMemo" class="field textarea compact" placeholder="時間を測る / 雨撤収">${escapeHtml(context.setupMemo)}</textarea></label>
      <label><span>ギア</span><textarea id="gearMemo" class="field textarea compact" placeholder="ヘキサ / EcoFlow / WAVE3">${escapeHtml(context.gearMemo)}</textarea></label>
      <label><span>反省</span><textarea id="pastReflection" class="field textarea compact" placeholder="タオル不足 / 料理多い">${escapeHtml(context.pastReflection)}</textarea></label>
    </div>
    <details class="quiet-details nested"><summary>細かい条件</summary>
      <div class="context-grid compact-grid">
        <input id="highTemp" class="field" inputmode="numeric" value="${escapeHtml(context.highTemp)}" placeholder="最高気温" />
        <input id="lowTemp" class="field" inputmode="numeric" value="${escapeHtml(context.lowTemp)}" placeholder="最低気温" />
        <input id="rainRisk" class="field" value="${escapeHtml(context.rainRisk)}" placeholder="降水" />
        <input id="windMemo" class="field" value="${escapeHtml(context.windMemo)}" placeholder="風" />
        <input id="peopleCount" class="field" inputmode="numeric" value="${escapeHtml(context.peopleCount)}" placeholder="人数" />
        <select id="kotaGoing" class="field"><option value="yes" ${context.kotaGoing !== 'no' ? 'selected' : ''}>コタ同行</option><option value="no" ${context.kotaGoing === 'no' ? 'selected' : ''}>コタなし</option></select>
      </div>
    </details>
    <button id="updatePracticalPrep" class="btn primary">整える</button>
  </details>`, 'quiet-card');
}

function renderImportAgain() {
  return card(`<details class="quiet-details"><summary>予約を入れ直す</summary>${renderImportPanel()}</details>`, 'quiet-card');
}

function bindPrepActions(project, context) {
  document.getElementById('updatePracticalPrep')?.addEventListener('click', () => {
    const nextContext = readPrepContext(project.reservation || {});
    const nextPrep = buildPracticalPrep(project, nextContext);
    const nextProject = { ...project, prep: nextPrep, prepContext: nextContext, updatedAt: new Date().toISOString() };
    patchState({ prepContext: nextContext, nextProject });
    renderPrep();
    setTimeout(() => document.getElementById('copyLineList')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
  });

  document.getElementById('copyLineList')?.addEventListener('click', async () => {
    const latest = getState();
    const latestProject = latest.nextProject || project;
    const latestContext = normalizePrepContext(latest.prepContext || context, latestProject?.reservation || {});
    const text = buildLineList(latestProject, latestContext);
    const area = document.getElementById('lineListText');
    try {
      await navigator.clipboard.writeText(text);
      if (area) area.value = `${text}\n\nコピー済み`;
    } catch {
      if (area) { area.focus(); area.select(); }
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
