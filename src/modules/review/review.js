import { app, card, listItems, escapeHtml } from '../../ui/components.js';
import { getState } from '../../core/store.js';

function formatTime(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return value;
  }
}

function sessionTypeLabel(type) {
  return { walk: 'コタ散歩', camp: 'キャンプ当日', life: '日常メモ' }[type] || '記録';
}

export function renderReview() {
  const state = getState();
  const project = state.nextProject;
  const history = state.recordHistory || [];
  app().innerHTML = [
    card(`<div class="title">改善 / 次回へ戻す</div><p class="muted">Core03では、散歩・キャンプ当日・日常メモから次回改善候補を作る。</p>`, 'hero'),
    card(`<h2>現在の次回改善</h2>${project?.prep?.reflection ? listItems(project.prep.reflection) : '<p class="muted">次のキャンプカード作成後に反省・注意候補を表示します。</p>'}`),
    card(`<h2>記録から来た改善キュー</h2>${listItems(state.reviewQueue || [], 'まだ記録由来の改善候補はありません')}`),
    card(`<h2>最近の記録</h2>${history.length ? `<ul class="outbase-list">${history.slice(0, 8).map((item) => `<li><strong>${escapeHtml(sessionTypeLabel(item.type))}</strong> ${escapeHtml(item.title || '')}<br><span class="muted">${escapeHtml(formatTime(item.startedAt))} / 記録 ${(item.records || []).length}件</span></li>`).join('')}</ul>` : '<p class="muted">記録を終了するとここにも表示されます。</p>'}`),
    card(`<h2>次に戻すもの</h2><p class="muted">忘れ物、撤収時間、天気判断、料理の余り、犬連れ注意、ギア未使用を次回準備へ返す。</p>`)
  ].join('');
}
