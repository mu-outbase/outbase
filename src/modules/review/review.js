import { app, card, listItems, escapeHtml } from '../../ui/components.js?v=core05-3-visual-ux-20260703';
import { getState, patchState } from '../../core/store.js?v=core05-3-visual-ux-20260703';
import { go } from '../../core/router.js?v=core05-3-visual-ux-20260703';

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
  if (/雨|濡|撤収/.test(text)) return '雨撤収';
  if (/暑|熱|冷却|WAVE|扇風機/.test(text)) return '暑さ';
  if (/不足|忘れ|足りない|足りな|タオル/.test(text)) return '忘れ物';
  if (/料理|多すぎ|余り|食材/.test(text)) return '料理';
  if (/設営|撤収|タイマー|時間/.test(text)) return '設営撤収';
  if (/コタ|犬|ドッグ|足拭き|うんち/.test(text)) return 'コタ';
  return '改善';
}

function expandReviewItem(raw = '') {
  const text = normalizeText(raw);
  const prep = { shopping: [], packing: [], kota: [], reflection: [] };
  if (/不足|忘れ|足りない|足りな/.test(text)) {
    prep.packing.push('忘れ物チェックを出発前に確認');
    prep.reflection.push('記録反映：不足・忘れ物を次回準備へ戻す');
  }
  if (/タオル/.test(text)) {
    prep.packing.push('予備タオルを人用・コタ用で追加');
    prep.reflection.push('記録反映：タオル不足を次回回避');
  }
  if (/雨|濡|撤収/.test(text)) {
    prep.packing.push('濡れ物バッグ / 予備タオル / 雨撤収セット');
    prep.reflection.push('記録反映：雨撤収時は収納順を先に決める');
  }
  if (/暑|熱|冷却|WAVE|扇風機/.test(text)) {
    prep.packing.push('暑さ対策 / 扇風機 / 電源残量確認');
    prep.kota.push('コタ冷却ベスト / 日陰 / 水分補給');
    prep.reflection.push('記録反映：暑さ対策を次回確認');
  }
  if (/料理|多すぎ|余り|食材/.test(text)) {
    prep.shopping.push('食材量を人数×泊数基準で絞る');
    prep.reflection.push('記録反映：料理量を次回調整');
  }
  if (/設営|撤収|タイマー|時間/.test(text)) {
    prep.reflection.push('記録反映：設営・撤収時間を次回段取りへ戻す');
  }
  if (/コタ|犬|ドッグ|足拭き|うんち/.test(text)) {
    prep.kota.push('コタ用品 / 水 / うんち袋 / 足拭きを玄関側へ');
    prep.reflection.push('記録反映：コタ導線を次回確認');
  }
  if (!prep.shopping.length && !prep.packing.length && !prep.kota.length && !prep.reflection.length) prep.reflection.push(`記録反映：${text || raw}`);
  return prep;
}

function combinedAddition(items = []) {
  return items.reduce((acc, item) => mergePrep(acc, expandReviewItem(item)), { shopping: [], packing: [], kota: [], reflection: [] });
}

function queueCard(item, index) {
  return `<article class="review-chip-card"><span>${escapeHtml(categoryLabel(item))}</span><strong>${escapeHtml(item)}</strong><button class="btn ghost applyReviewItem" data-index="${index}">戻す</button></article>`;
}

function renderAppliedLog(log = []) {
  return `<details class="quiet-details"><summary>反映済み</summary>${log.length ? `<ul class="outbase-list">${log.slice(0, 12).map((item) => `<li><strong>${escapeHtml(formatTime(item.appliedAt))}</strong><br><span class="muted">${escapeHtml(item.text || '')}</span></li>`).join('')}</ul>` : '<p class="muted">なし</p>'}</details>`;
}

export function renderReview() {
  const state = getState();
  const project = state.nextProject;
  const history = state.recordHistory || [];
  const queue = state.reviewQueue || [];
  const applied = state.appliedReviewQueue || [];

  app().innerHTML = [
    `<section class="page-title"><p class="overline">REVIEW</p><h2>次へ戻す</h2></section>`,
    card(`<div class="review-hero"><div><span>${queue.length}</span><strong>未反映</strong></div><p>${escapeHtml(project ? (project.reservation?.campground || project.title || '次のキャンプ') : '次のキャンプ未作成')}</p></div><button class="btn primary" id="applyAllReviews" ${project && queue.length ? '' : 'disabled'}>まとめて準備へ戻す</button>${project ? '<button class="btn ghost" id="goPrepFromReview">準備で見る</button>' : '<button class="btn ghost" id="goPrepFromReview">準備を作る</button>'}`, 'focus-card'),
    queue.length ? card(`<div class="review-grid">${queue.map(queueCard).join('')}</div>`, 'quiet-card') : card(`<p class="empty-big">改善はありません。</p><button class="btn primary" id="goRecordFromReview">記録する</button>`, 'quiet-card'),
    card(`${renderAppliedLog(applied)}<details class="quiet-details"><summary>最近の記録</summary>${history.length ? `<ul class="outbase-list">${history.slice(0, 6).map((item) => `<li><strong>${escapeHtml(sessionTypeLabel(item.type))}</strong> ${escapeHtml(item.title || '')}<br><span class="muted">${escapeHtml(formatTime(item.startedAt))} / ${(item.records || []).length}件</span></li>`).join('')}</ul>` : '<p class="muted">なし</p>'}</details>`, 'quiet-card')
  ].filter(Boolean).join('');
  bindReviewActions();
}

function bindReviewActions() {
  document.getElementById('goPrepFromReview')?.addEventListener('click', () => go('prep'));
  document.getElementById('goRecordFromReview')?.addEventListener('click', () => go('walk'));
  document.getElementById('applyAllReviews')?.addEventListener('click', () => applyReviewItems());
  document.querySelectorAll('.applyReviewItem').forEach((button) => button.addEventListener('click', () => applyReviewItems(Number(button.dataset.index))));
}

function applyReviewItems(index = null) {
  const state = getState();
  const project = state.nextProject;
  const queue = state.reviewQueue || [];
  if (!project || !queue.length) return;
  const selected = index === null ? queue : queue.filter((_, i) => i === index);
  if (!selected.length) return;
  const addition = combinedAddition(selected);
  const nextPrep = mergePrep(project.prep || {}, addition);
  const existingReflection = state.prepContext?.pastReflection || '';
  const reviewText = selected.map((item) => `・${item}`).join('\n');
  const nextContext = { ...(state.prepContext || {}), pastReflection: unique([existingReflection, reviewText].filter(Boolean).join('\n').split('\n')).join('\n') };
  const nextProject = { ...project, prep: nextPrep, prepContext: nextContext, updatedAt: new Date().toISOString(), reviewAppliedAt: new Date().toISOString() };
  const remaining = index === null ? [] : queue.filter((_, i) => i !== index);
  const appliedLog = [...selected.map((text) => ({ text, appliedAt: new Date().toISOString() })), ...(state.appliedReviewQueue || [])].slice(0, 50);
  patchState({ nextProject, prepContext: nextContext, reviewQueue: remaining, appliedReviewQueue: appliedLog });
  renderReview();
}
