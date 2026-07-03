import { app, card, listItems, escapeHtml, kv } from '../../ui/components.js?v=core05-2-intuitive-ux-20260703';
import { getState, patchState } from '../../core/store.js?v=core05-2-intuitive-ux-20260703';
import { go } from '../../core/router.js?v=core05-2-intuitive-ux-20260703';

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
  if (/不足|忘れ|足りない|足りな|タオル/.test(text)) return '不足・忘れ物';
  if (/料理|多すぎ|余り|食材/.test(text)) return '料理量';
  if (/設営|撤収|タイマー|時間/.test(text)) return '設営・撤収';
  if (/コタ|犬|ドッグ|足拭き|うんち/.test(text)) return 'コタ';
  return '改善';
}

function expandReviewItem(raw = '') {
  const text = normalizeText(raw);
  const prep = { shopping: [], packing: [], kota: [], reflection: [] };
  if (/不足|忘れ|足りない|足りな/.test(text)) {
    prep.packing.push('不足・忘れ物チェックを出発前に確認');
    prep.reflection.push('記録反映：不足・忘れ物を次回準備へ戻す');
  }
  if (/タオル/.test(text)) {
    prep.packing.push('予備タオルを人用・コタ用で追加');
    prep.reflection.push('記録反映：タオル不足を次回回避');
  }
  if (/雨|濡|撤収/.test(text)) {
    prep.packing.push('濡れ物バッグ / 予備タオル / 雨撤収セット');
    prep.reflection.push('記録反映：雨撤収時は濡れ物と収納順を先に決める');
  }
  if (/暑|熱|冷却|WAVE|扇風機/.test(text)) {
    prep.packing.push('暑さ対策 / 扇風機 / 冷感グッズ / 電源残量確認');
    prep.kota.push('コタ冷却ベスト / 日陰 / 水分補給を優先');
    prep.reflection.push('記録反映：暑さ対策と電源残量を次回確認');
  }
  if (/料理|多すぎ|余り|食材/.test(text)) {
    prep.shopping.push('食材量を人数×泊数基準に絞る');
    prep.reflection.push('記録反映：料理量・食材量を次回調整');
  }
  if (/設営|撤収|タイマー|時間/.test(text)) {
    prep.packing.push('設営・撤収タイマーで時間を残す');
    prep.reflection.push('記録反映：設営・撤収時間を次回段取りへ戻す');
  }
  if (/コタ|犬|ドッグ|足拭き|うんち/.test(text)) {
    prep.kota.push('コタ用品 / 水 / うんち袋 / 足拭きを玄関側にまとめる');
    prep.reflection.push('記録反映：コタ用品と散歩導線を次回確認');
  }
  if (!prep.shopping.length && !prep.packing.length && !prep.kota.length && !prep.reflection.length) prep.reflection.push(`記録反映：${text || raw}`);
  return prep;
}

function combinedAddition(items = []) {
  return items.reduce((acc, item) => mergePrep(acc, expandReviewItem(item)), { shopping: [], packing: [], kota: [], reflection: [] });
}

function queueList(queue = []) {
  return `<ul class="outbase-list">${queue.map((item, index) => `<li><strong>${escapeHtml(categoryLabel(item))}</strong><br><span class="muted">${escapeHtml(item)}</span><button class="btn small applyReviewItem" data-index="${index}">これだけ戻す</button></li>`).join('')}</ul>`;
}

function renderBridge(project, queue, applied) {
  if (!project) {
    return card(`<h2>次のキャンプを先に作る</h2><p class="muted">改善候補は保持できます。準備で次のキャンプカードを作ると反映できます。</p><button class="btn primary" id="goPrepFromReview">準備へ</button>`);
  }
  return card(`<p class="eyebrow">次に戻す</p>
    <h2>${escapeHtml(project.reservation?.campground || project.title || '次のキャンプ')}</h2>
    <p class="muted">改善キュー ${queue.length}件 / 反映済み ${applied.length}件</p>
    <button class="btn primary" id="applyAllReviews" ${queue.length ? '' : 'disabled'}>改善をまとめて準備へ戻す</button>
    <button class="btn" id="goPrepFromReview">準備で見る</button>
    <p class="muted">元の記録は履歴に残したまま、買い物・持ち物・コタ用品・反省に足します。</p>`);
}

function renderQueue(queue = []) {
  return card(`<h2>改善候補</h2>
    ${queue.length ? `<p class="muted">全部考えず、必要ならまとめて戻すだけ。</p>${queueList(queue)}` : '<p class="muted">今は戻す改善はありません。</p>'}`);
}

function renderCurrentPrep(project) {
  if (!project) return '';
  const prep = project.prep || {};
  return card(`<details class="quiet-details"><summary>現在の次回準備を見る</summary>
    <div class="prep-focus">
      <section><h3>買い物</h3>${listItems(prep.shopping)}</section>
      <section><h3>持ち物</h3>${listItems(prep.packing)}</section>
      <section><h3>コタ用品</h3>${listItems(prep.kota)}</section>
      <section><h3>反省・注意</h3>${listItems(prep.reflection)}</section>
    </div>
  </details>`);
}

function renderAppliedLog(log = []) {
  return card(`<details class="quiet-details"><summary>反映済みログ</summary>${log.length ? `<ul class="outbase-list">${log.slice(0, 12).map((item) => `<li><strong>${escapeHtml(formatTime(item.appliedAt))}</strong><br><span class="muted">${escapeHtml(item.text || '')}</span></li>`).join('')}</ul>` : '<p class="muted">まだ準備へ反映した改善はありません。</p>'}</details>`);
}

export function renderReview() {
  const state = getState();
  const project = state.nextProject;
  const history = state.recordHistory || [];
  const queue = state.reviewQueue || [];
  const applied = state.appliedReviewQueue || [];
  app().innerHTML = [
    card(`<div class="title">次回へ戻す。</div><p class="muted light">記録で出た暑さ、雨撤収、忘れ物、料理量、コタ用品を次の準備に戻します。</p>`, 'hero'),
    renderBridge(project, queue, applied),
    renderQueue(queue),
    renderCurrentPrep(project),
    renderAppliedLog(applied),
    card(`<h2>最近の記録</h2>${history.length ? `<ul class="outbase-list">${history.slice(0, 3).map((item) => `<li><strong>${escapeHtml(sessionTypeLabel(item.type))}</strong> ${escapeHtml(item.title || '')}<br><span class="muted">${escapeHtml(formatTime(item.startedAt))} / 記録 ${(item.records || []).length}件</span></li>`).join('')}</ul>` : '<p class="muted">記録を終了するとここにも表示されます。</p>'}`)
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
  window.setTimeout(() => document.getElementById('goPrepFromReview')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
}
