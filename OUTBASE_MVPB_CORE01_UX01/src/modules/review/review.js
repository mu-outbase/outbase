import { app, card, listItems } from '../../ui/components.js';
import { getState } from '../../core/store.js';

export function renderReview() {
  const state = getState();
  const project = state.nextProject;
  app().innerHTML = [
    card(`<div class="title">レビュー / 次回改善</div><p class="muted">OUTBASEの価値は記録で終わらず、次回が楽になること。</p>`, 'hero'),
    card(`<h2>現在の次回改善</h2>${project?.prep?.reflection ? listItems(project.prep.reflection) : '<p class="muted">次のキャンプカード作成後に反省・注意候補を表示します。</p>'}`),
    card(`<h2>次回改善キュー</h2><p class="muted">忘れ物、撤収時間、天気判断、料理の余り、犬連れ注意、ギア未使用を次回準備へ返す。</p><p>現在 ${state.reviewQueue?.length || 0} 件</p>`)
  ].join('');
}
