import { app, card, listItems, escapeHtml, toast } from '../../ui/components.js?v=core05-7-calendar-refined-20260703';
import { getState, patchState } from '../../core/store.js?v=core05-7-calendar-refined-20260703';
import { go } from '../../core/router.js?v=core05-7-calendar-refined-20260703';

function formatTime(value) {
  if (!value) return '';
  try { return new Date(value).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return value; }
}

function unique(items = []) {
  return [...new Set((items || []).filter(Boolean).map((item) => String(item).trim()).filter(Boolean))];
}

function mergePrep(base = {}, addition = {}) {
  return {
    shopping: unique([...(base.shopping || []), ...(addition.shopping || [])]),
    packing: unique([...(base.packing || []), ...(addition.packing || [])]),
    kota: unique([...(base.kota || []), ...(addition.kota || [])]),
    reflection: unique([...(base.reflection || []), ...(addition.reflection || [])])
  };
}

function expandReviewItem(text = '') {
  const prep = { shopping: [], packing: [], kota: [], reflection: [] };
  if (/料理|多すぎ|余り|食材/.test(text)) prep.shopping.push('食材量を人数×泊数基準に絞る');
  if (/雨|濡|撤収/.test(text)) prep.packing.push('濡れ物バッグ / 予備タオル / 雨撤収セット');
  if (/暑|熱|冷却|WAVE|扇風機/.test(text)) prep.packing.push('暑さ対策 / 扇風機 / 冷感グッズ / 電源残量確認');
  if (/コタ|犬|ドッグ|足拭き|うんち/.test(text)) prep.kota.push('コタ用品 / 水 / うんち袋 / 足拭きを玄関側にまとめる');
  prep.reflection.push(`記録反映：${text.replace(/^記録から反省：?/, '').trim()}`);
  return prep;
}

function combinedAddition(items = []) {
  return items.reduce((acc, item) => mergePrep(acc, expandReviewItem(item)), { shopping: [], packing: [], kota: [], reflection: [] });
}

export function renderMemory() {
  const state = getState();
  const project = state.nextProject;
  const queue = state.reviewQueue || [];
  const history = state.recordHistory || [];
  const applied = state.appliedReviewQueue || [];
  app().innerHTML = [
    `<section class="page-hero memory"><p class="eyebrow">思い出</p><h2>残して、次へ戻す。</h2><p>写真・メモ・反省を、次の準備に変える場所。</p></section>`,
    card(`<div class="memory-summary"><div><span>${queue.length}</span><strong>未反映</strong></div><div><span>${history.length}</span><strong>記録</strong></div><div><span>${applied.length}</span><strong>反映済み</strong></div></div><button id="applyAllReviews" class="primary-cta compact" ${queue.length && project ? '' : 'disabled'}>まとめて準備へ戻す</button>`, 'focus'),
    card(`<h2>次回へ戻すこと</h2>${queue.length ? listItems(queue) : '<p class="empty-line">まだありません</p>'}`, 'soft'),
    card(`<h2>最近の記録</h2>${history.length ? `<div class="history-list">${history.slice(0, 6).map((item) => `<div class="history-card"><strong>${escapeHtml(item.title || '記録')}</strong><span>${escapeHtml(formatTime(item.startedAt))} / ${(item.records || []).length}件</span></div>`).join('')}</div>` : '<p class="empty-line">記録するとここに残ります</p>'}`, 'soft')
  ].join('');

  document.getElementById('applyAllReviews')?.addEventListener('click', () => applyReviews());
}

function applyReviews() {
  const state = getState();
  const project = state.nextProject;
  const queue = state.reviewQueue || [];
  if (!project || !queue.length) return;
  const addition = combinedAddition(queue);
  const nextPrep = mergePrep(project.prep || {}, addition);
  const existingReflection = state.prepContext?.pastReflection || '';
  const reviewText = queue.map((item) => `・${item}`).join('\n');
  const nextContext = {
    ...(state.prepContext || {}),
    pastReflection: unique([existingReflection, reviewText].filter(Boolean).join('\n').split('\n')).join('\n')
  };
  const appliedLog = [
    ...queue.map((text) => ({ text, appliedAt: new Date().toISOString() })),
    ...(state.appliedReviewQueue || [])
  ].slice(0, 50);
  patchState({ nextProject: { ...project, prep: nextPrep, prepContext: nextContext, updatedAt: new Date().toISOString() }, prepContext: nextContext, reviewQueue: [], appliedReviewQueue: appliedLog });
  toast('次回準備へ戻しました');
  go('prep');
}
