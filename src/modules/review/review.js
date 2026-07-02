import { app, card } from '../../ui/components.js';
import { getState } from '../../core/store.js';

export function renderReview() {
  const state = getState();
  app().innerHTML = [
    card(`<div class="title">レビュー / 次回改善</div><p class="muted">OUTBASEの価値は記録で終わらず、次回が楽になること。</p>`, 'hero'),
    card(`<h2>次回改善キュー</h2><p class="muted">忘れ物、撤収時間、天気判断、料理の余り、犬連れ注意、ギア未使用を次回準備へ返す。</p><p>現在 ${state.reviewQueue?.length || 0} 件</p>`)
  ].join('');
}
