import { app, card, listItems, escapeHtml, toast } from '../../ui/components.js?v=core05-6-calendar-nav-20260703';
import { getState, patchState } from '../../core/store.js?v=core05-6-calendar-nav-20260703';
import { go } from '../../core/router.js?v=core05-6-calendar-nav-20260703';

function formatTime(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return value;
  }
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

function normalizeText(value = '') {
  return String(value).replace(/^記録から反省：?/, '').trim();
}

function categoryLabel(text = '') {
  if (/雨|濡|撤収/.test(text)) return '雨';
  if (/暑|熱|冷却|WAVE|扇風機/.test(text)) return '暑さ';
  if (/不足|忘れ|足りない|足りな|タオル/.test(text)) return '不足';
  if (/料理|多すぎ|余り|食材/.test(text)) return '料理';
  if (/設営|撤収|タイマー|時間/.test(text)) return '段取り';
  if (/コタ|犬|ドッグ|足拭き|うんち/.test(text)) return 'コタ';
  return '改善';
}

function expandReviewItem(raw = '') {
  const text = normalizeText(raw);
  const prep = { shopping: [], packing: [], kota: [], reflection: [] };
  if (/不足|忘れ|足りない|足りな/.test(text)) prep.packing.push('不足・忘れ物チェックを出発前に確認');
  if (/タオル/.test(text)) prep.packing.push('予備タオルを人用・コタ用で追加');
  if (/雨|濡|撤収/.test(text)) prep.packing.push('濡れ物バッグ / 予備タオル / 雨撤収セット');
  if (/暑|熱|冷却|WAVE|扇風機/.test(text)) {
    prep.packing.push('暑さ対策 / 扇風機 / 電源残量確認');
    prep.kota.push('コタ冷却ベスト / 日陰 / 水分補給');
  }
  if (/料理|多すぎ|余り|食材/.test(text)) prep.shopping.push('食材量を人数×泊数で調整');
  if (/設営|撤収|タイマー|時間/.test(text)) prep.reflection.push('設営・撤収時間を次回段取りへ反映');
  if (/コタ|犬|ドッグ|足拭き|うんち/.test(text)) prep.kota.push('コタ用品 / 水 / うんち袋 / 足拭きを玄関側にまとめる');
  prep.reflection.push(`記録反映：${text || raw}`);
  return prep;
}

function combinedAddition(items = []) {
  return items.reduce((acc, item) => mergePrep(acc, expandReviewItem(item)), { shopping: [], packing: [], kota: [], reflection: [] });
}

function reviewItem(item, index) {
  return `<article class="review-item"><span>${escapeHtml(categoryLabel(item))}</span><strong>${escapeHtml(normalizeText(item))}</strong><button class="btn small applyReviewItem" data-index="${index}">戻す</button></article>`;
}

export function renderReview() {
  const state = getState();
  const project = state.nextProject;
  const queue = state.reviewQueue || [];
  const applied = state.appliedReviewQueue || [];

  app().innerHTML = [
    `<section class="page-title"><p class="overline">REVIEW</p><h2>次へ戻す</h2></section>`,
    card(`<div class="review-hero"><div class="review-number"><span>${queue.length}</span><strong>未反映</strong></div><p>${queue.length ? '記録から出た改善を、次回準備へ戻します。' : '今は戻すものはありません。'}</p></div>${queue.length ? '<button id="applyAllReviews" class="btn primary">まとめて準備へ戻す</button>' : '<button id="goPrepFromReview" class="btn primary">準備を見る</button>'}`, 'focus'),
    card(queue.length ? `<div class="review-list">${queue.slice(0, 6).map(reviewItem).join('')}</div>` : '<p class="empty-line">記録を終了すると、ここに改善が出ます。</p>', 'soft'),
    project ? card(`<details class="quiet-details"><summary>現在の準備</summary><h3>買う</h3>${listItems(project.prep?.shopping)}<h3>持つ</h3>${listItems(project.prep?.packing)}<h3>コタ</h3>${listItems(project.prep?.kota)}<h3>注意</h3>${listItems(project.prep?.reflection)}</details>`, 'soft') : '',
    applied.length ? card(`<details class="quiet-details"><summary>反映済み</summary><ul class="outbase-list">${applied.slice(0, 8).map((item) => `<li><strong>${escapeHtml(formatTime(item.appliedAt))}</strong><br>${escapeHtml(item.text || '')}</li>`).join('')}</ul></details>`, 'soft') : ''
  ].filter(Boolean).join('');
  bindReviewActions();
}

function bindReviewActions() {
  document.getElementById('goPrepFromReview')?.addEventListener('click', () => go('prep'));
  document.getElementById('applyAllReviews')?.addEventListener('click', () => applyReviewItems());
  document.querySelectorAll('.applyReviewItem').forEach((button) => button.addEventListener('click', () => applyReviewItems(Number(button.dataset.index))));
}

function applyReviewItems(index = null) {
  const state = getState();
  const project = state.nextProject;
  const queue = state.reviewQueue || [];
  if (!project || !queue.length) return;
  const selected = index === null ? queue : queue.filter((_, i) => i === index);
  const addition = combinedAddition(selected);
  const nextPrep = mergePrep(project.prep || {}, addition);
  const existingReflection = state.prepContext?.pastReflection || '';
  const reviewText = selected.map((item) => `・${item}`).join('\n');
  const nextContext = { ...(state.prepContext || {}), pastReflection: unique([existingReflection, reviewText].filter(Boolean).join('\n').split('\n')).join('\n') };
  const nextProject = { ...project, prep: nextPrep, prepContext: nextContext, updatedAt: new Date().toISOString(), reviewAppliedAt: new Date().toISOString() };
  const remaining = index === null ? [] : queue.filter((_, i) => i !== index);
  const appliedLog = [...selected.map((text) => ({ text, appliedAt: new Date().toISOString() })), ...(state.appliedReviewQueue || [])].slice(0, 50);
  patchState({ nextProject, prepContext: nextContext, reviewQueue: remaining, appliedReviewQueue: appliedLog });
  toast('準備へ戻しました');
  renderReview();
}
