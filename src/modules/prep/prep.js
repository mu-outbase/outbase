import { app, card, kv, listItems, escapeHtml } from '../../ui/components.js';
import { getState } from '../../core/store.js';
import { renderImportPanel } from '../import/import.js';
import { buildLineList } from './prepEngine.js';

export function renderPrep() {
  const state = getState();
  const project = state.nextProject;
  app().innerHTML = [
    card(`<div class="title">次のキャンプ準備エンジン</div><p class="muted">予約スクショ・予約メール・PDF本文・カレンダー予定から候補を作り、買い物・持ち物・コタ用品・前回反省・リン送信用リストまでつなぐ。</p>`, 'hero'),
    renderImportPanel(),
    renderProjectCard(project),
    renderPrepLists(project)
  ].join('');
  window.OUTBASE_IMPORT?.bind?.();
  bindPrepActions(project);
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
    <p class="muted">承認済み候補。ここから準備・散歩・レビューへ接続します。</p>`);
}

function renderPrepLists(project) {
  if (!project) {
    return card(`<h2>準備候補</h2><p class="muted">次のキャンプカード作成後に候補を表示します。</p>`);
  }
  const prep = project.prep || {};
  return card(`<h2>準備候補</h2>
    <div class="prep-columns">
      <div><h3>買い物</h3>${listItems(prep.shopping)}</div>
      <div><h3>持ち物</h3>${listItems(prep.packing)}</div>
      <div><h3>コタ用品</h3>${listItems(prep.kota)}</div>
      <div><h3>反省・注意</h3>${listItems(prep.reflection)}</div>
    </div>
    <button id="copyLineList" class="btn primary">リンに送るリストをコピー</button>
    <textarea id="lineListText" class="field textarea readonly" readonly>${escapeHtml(buildLineList(project))}</textarea>`);
}

function bindPrepActions(project) {
  document.getElementById('copyLineList')?.addEventListener('click', async () => {
    const text = buildLineList(project);
    const area = document.getElementById('lineListText');
    try {
      await navigator.clipboard.writeText(text);
      if (area) area.value = `${text}

コピー済み`; 
    } catch (error) {
      if (area) {
        area.focus();
        area.select();
      }
    }
  });
}
