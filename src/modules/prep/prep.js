import { app, card, kv, listItems, escapeHtml } from '../../ui/components.js';
import { getState, patchState } from '../../core/store.js';
import { renderImportPanel } from '../import/import.js';
import { buildLineList, buildPracticalPrep, normalizePrepContext } from './prepEngine.js';

export function renderPrep() {
  const state = getState();
  const project = state.nextProject;
  const context = normalizePrepContext(state.prepContext || {}, project?.reservation || {});
  app().innerHTML = [
    card(`<div class="title">次のキャンプ準備エンジン Core02</div><p class="muted">予約情報から作った候補を、天気・泊数・人数・コタ同行・献立・過去反省・ギアメモで実用準備リストに育てる。</p>`, 'hero'),
    renderImportPanel(),
    renderProjectCard(project),
    renderPrepContextPanel(project, context),
    renderPrepLists(project, context)
  ].join('');
  window.OUTBASE_IMPORT?.bind?.();
  bindPrepActions(project, context);
}

function renderProjectCard(project) {
  if (!project) {
    return card(`<h2>次のキャンプカード</h2><p class="muted">まだ未作成。上の取込から候補抽出→承認で作成します。</p>`);
  }
  const reservation = project.reservation || {};
  return card(`<h2>次のキャンプカード</h2>
    <p><strong>${escapeHtml(project.title)}</strong></p>
    ${kv('キャンプ場', reservation.campground)}
    ${kv('日程', reservation.dateText)}
    ${kv('泊数', reservation.nights)}
    ${kv('チェックイン', reservation.checkIn)}
    ${kv('チェックアウト', reservation.checkOut)}
    ${kv('取込元', reservation.sourceType)}
    <p class="muted">承認済み候補。Core02ではここに天気・過去反省・ギアメモを足して準備候補を実用化します。</p>`);
}

function renderPrepContextPanel(project, context) {
  if (!project) {
    return card(`<h2>準備条件</h2><p class="muted">次のキャンプカード作成後に、天気・人数・コタ同行・献立・過去反省を入れて候補を具体化します。</p>`);
  }
  return card(`<h2>準備条件</h2>
    <p class="muted">ここは手入力予定作成ではなく、候補を実用化するための条件メモ。天気アプリや前回反省を貼るだけでOK。</p>
    <label class="label" for="weatherMemo">天気メモ</label>
    <textarea id="weatherMemo" class="field textarea compact" placeholder="例：雨予報、最高30℃、風強め、梅雨明け直後など">${escapeHtml(context.weatherMemo)}</textarea>
    <div class="context-grid">
      <div><label class="label" for="highTemp">最高気温</label><input id="highTemp" class="field" inputmode="numeric" value="${escapeHtml(context.highTemp)}" placeholder="30" /></div>
      <div><label class="label" for="lowTemp">最低気温</label><input id="lowTemp" class="field" inputmode="numeric" value="${escapeHtml(context.lowTemp)}" placeholder="18" /></div>
      <div><label class="label" for="rainRisk">降水メモ</label><input id="rainRisk" class="field" value="${escapeHtml(context.rainRisk)}" placeholder="40% / 雨" /></div>
      <div><label class="label" for="windMemo">風メモ</label><input id="windMemo" class="field" value="${escapeHtml(context.windMemo)}" placeholder="風強め" /></div>
      <div><label class="label" for="peopleCount">人数</label><input id="peopleCount" class="field" inputmode="numeric" value="${escapeHtml(context.peopleCount)}" /></div>
      <div><label class="label" for="kotaGoing">コタ</label><select id="kotaGoing" class="field"><option value="yes" ${context.kotaGoing !== 'no' ? 'selected' : ''}>同行</option><option value="no" ${context.kotaGoing === 'no' ? 'selected' : ''}>同行なし</option></select></div>
    </div>
    <label class="label" for="menuMemo">献立メモ</label>
    <textarea id="menuMemo" class="field textarea compact" placeholder="例：ピザ、ガーリックシュリンプ、朝ホットドッグ">${escapeHtml(context.menuMemo)}</textarea>
    <label class="label" for="pastReflection">前回反省・注意</label>
    <textarea id="pastReflection" class="field textarea compact" placeholder="例：雨撤収が大変、タオル不足、料理多すぎた">${escapeHtml(context.pastReflection)}</textarea>
    <label class="label" for="gearMemo">ギア確認メモ</label>
    <textarea id="gearMemo" class="field textarea compact" placeholder="例：リビングシェル、ヘキサ、EcoFlow、WAVE3、ドッグカート">${escapeHtml(context.gearMemo)}</textarea>
    <button id="updatePracticalPrep" class="btn primary">準備候補を更新</button>`);
}

function renderPrepLists(project, context) {
  if (!project) {
    return card(`<h2>準備候補</h2><p class="muted">次のキャンプカード作成後に候補を表示します。</p>`);
  }
  const prep = project.prep || {};
  return card(`<h2>実用準備候補</h2>
    <div class="prep-columns">
      <div><h3>買い物</h3>${listItems(prep.shopping)}</div>
      <div><h3>持ち物</h3>${listItems(prep.packing)}</div>
      <div><h3>コタ用品</h3>${listItems(prep.kota)}</div>
      <div><h3>反省・注意</h3>${listItems(prep.reflection)}</div>
    </div>
    <button id="copyLineList" class="btn primary">リンに送るリストをコピー</button>
    <textarea id="lineListText" class="field textarea readonly" readonly>${escapeHtml(buildLineList(project, context))}</textarea>`);
}

function bindPrepActions(project, context) {
  document.getElementById('updatePracticalPrep')?.addEventListener('click', () => {
    if (!project) return;
    const nextContext = readPrepContext(project.reservation || {});
    const nextPrep = buildPracticalPrep(project, nextContext);
    const nextProject = { ...project, prep: nextPrep, prepContext: nextContext, updatedAt: new Date().toISOString() };
    patchState({ prepContext: nextContext, nextProject });
    renderPrep();
    setTimeout(() => document.getElementById('lineListText')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
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
    } catch (error) {
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
    pastReflection: document.getElementById('pastReflection')?.value || '',
    gearMemo: document.getElementById('gearMemo')?.value || ''
  }, reservation);
}
