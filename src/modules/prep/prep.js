import { app, card, kv, listItems, escapeHtml } from '../../ui/components.js?v=core05-2-intuitive-ux-20260703';
import { getState, patchState } from '../../core/store.js?v=core05-2-intuitive-ux-20260703';
import { renderImportPanel } from '../import/import.js?v=core05-2-intuitive-ux-20260703';
import { buildLineList, buildPracticalPrep, normalizePrepContext } from './prepEngine.js?v=core05-2-intuitive-ux-20260703';

function firstItems(items = [], count = 6) {
  return (items || []).slice(0, count);
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
      card(`<div class="title">次のキャンプを作る。</div><p class="muted light">予約スクショ、予約メール、PDF、カレンダー文から始めます。</p>`, 'hero'),
      renderImportPanel()
    ].join('');
    window.OUTBASE_IMPORT?.bind?.();
    return;
  }

  app().innerHTML = [
    card(`<div class="title">準備する。</div><p class="muted light">買い物、持ち物、コタ用品、料理、行き方をここでまとめます。</p>`, 'hero'),
    renderProjectCard(project),
    renderMainPrep(project, context),
    renderContextPanel(project, context),
    renderImportAgain()
  ].join('');
  window.OUTBASE_IMPORT?.bind?.();
  bindPrepActions(project, context);
}

function renderProjectCard(project) {
  const reservation = project.reservation || {};
  return card(`<p class="eyebrow">次のキャンプ</p>
    <h2>${escapeHtml(reservation.campground || project.title || '次のキャンプ')}</h2>
    <p class="muted">${escapeHtml([reservation.dateText, reservation.checkIn && `IN ${reservation.checkIn}`, reservation.checkOut && `OUT ${reservation.checkOut}`].filter(Boolean).join(' / '))}</p>
    <div class="one-line-status"><strong>準備候補 ${countPrep(project)}件</strong><span>必要な時だけ整える</span></div>`);
}

function renderMainPrep(project, context) {
  const prep = project.prep || {};
  return card(`<h2>今日見る準備</h2>
    <p class="muted">まずはこのままリンに送れる形にします。細かい条件は下で足せます。</p>
    <div class="prep-focus">
      <section><h3>買い物</h3>${listItems(firstItems(prep.shopping), 'まだ候補なし')}</section>
      <section><h3>持ち物</h3>${listItems(firstItems(prep.packing), 'まだ候補なし')}</section>
      <section><h3>コタ用品</h3>${listItems(firstItems(prep.kota), 'まだ候補なし')}</section>
      <section><h3>反省・注意</h3>${listItems(firstItems(prep.reflection), 'まだ候補なし')}</section>
    </div>
    <button id="copyLineList" class="btn primary">リンに送るリストをコピー</button>
    <details class="quiet-details"><summary>コピー内容を見る</summary><textarea id="lineListText" class="field textarea readonly" readonly>${escapeHtml(buildLineList(project, context))}</textarea></details>`);
}

function renderContextPanel(project, context) {
  return card(`<details class="quiet-details">
    <summary>料理・行き方・天気を足す</summary>
    <p class="muted">ここは予定作成ではなく、準備を具体化するためのメモ。分かる所だけでOK。</p>
    <div class="context-grid compact-grid">
      <div><label class="label" for="weatherMemo">天気</label><textarea id="weatherMemo" class="field textarea compact" placeholder="例：雨予報、最高30℃、風強め">${escapeHtml(context.weatherMemo)}</textarea></div>
      <div><label class="label" for="menuMemo">料理</label><textarea id="menuMemo" class="field textarea compact" placeholder="例：ピザ、ガーリックシュリンプ、朝ホットドッグ">${escapeHtml(context.menuMemo)}</textarea></div>
      <div><label class="label" for="routeMemo">行き方・ドライブルート</label><textarea id="routeMemo" class="field textarea compact" placeholder="例：6:30出発、途中コンビニ、休憩多め">${escapeHtml(context.routeMemo)}</textarea></div>
      <div><label class="label" for="setupMemo">設営・撤収</label><textarea id="setupMemo" class="field textarea compact" placeholder="例：設営時間を測る、雨撤収なら濡れ物先">${escapeHtml(context.setupMemo)}</textarea></div>
    </div>
    <div class="context-grid compact-grid">
      <div><label class="label" for="highTemp">最高気温</label><input id="highTemp" class="field" inputmode="numeric" value="${escapeHtml(context.highTemp)}" placeholder="30" /></div>
      <div><label class="label" for="lowTemp">最低気温</label><input id="lowTemp" class="field" inputmode="numeric" value="${escapeHtml(context.lowTemp)}" placeholder="18" /></div>
      <div><label class="label" for="rainRisk">降水</label><input id="rainRisk" class="field" value="${escapeHtml(context.rainRisk)}" placeholder="40% / 雨" /></div>
      <div><label class="label" for="windMemo">風</label><input id="windMemo" class="field" value="${escapeHtml(context.windMemo)}" placeholder="風強め" /></div>
      <div><label class="label" for="peopleCount">人数</label><input id="peopleCount" class="field" inputmode="numeric" value="${escapeHtml(context.peopleCount)}" /></div>
      <div><label class="label" for="kotaGoing">コタ</label><select id="kotaGoing" class="field"><option value="yes" ${context.kotaGoing !== 'no' ? 'selected' : ''}>同行</option><option value="no" ${context.kotaGoing === 'no' ? 'selected' : ''}>同行なし</option></select></div>
    </div>
    <label class="label" for="gearMemo">ギア</label><textarea id="gearMemo" class="field textarea compact" placeholder="例：リビングシェル、ヘキサ、EcoFlow、WAVE3、ドッグカート">${escapeHtml(context.gearMemo)}</textarea>
    <label class="label" for="pastReflection">前回反省</label><textarea id="pastReflection" class="field textarea compact" placeholder="例：雨撤収が大変、タオル不足、料理多すぎた">${escapeHtml(context.pastReflection)}</textarea>
    <button id="updatePracticalPrep" class="btn primary">準備を整える</button>
  </details>`);
}

function renderImportAgain() {
  return card(`<details class="quiet-details"><summary>予約を取り込み直す</summary>${renderImportPanel()}</details>`, 'quiet-card');
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
      if (area) {
        area.focus();
        area.select();
      }
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
