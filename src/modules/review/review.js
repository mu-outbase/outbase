import { app, card, listItems, escapeHtml, kv } from '../../ui/components.js';
import { getState, patchState } from '../../core/store.js';
import { go } from '../../core/router.js';

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
  if (/コタ|犬|ドッグ|足拭き|うんち/.test(text)) {
    prep.kota.push('コタ用品 / 水 / うんち袋 / 足拭きを玄関側にまとめる');
    prep.reflection.push('記録反映：コタ用品と散歩導線を次回確認');
  }

  if (!prep.shopping.length && !prep.packing.length && !prep.kota.length && !prep.reflection.length) {
    prep.reflection.push(`記録反映：${text || raw}`);
  }

  return prep;
}

function combinedAddition(items = []) {
  return items.reduce((acc, item) => mergePrep(acc, expandReviewItem(item)), { shopping: [], packing: [], kota: [], reflection: [] });
}

function queueCard(item, index) {
  const addition = expandReviewItem(item);
  return `<div class="candidate-card" style="margin:10px 0">
    <div class="section-heading"><strong>${escapeHtml(categoryLabel(item))}</strong><span>未反映</span></div>
    <p><strong>${escapeHtml(item)}</strong></p>
    <details open><summary>次回準備へ戻す内容</summary>
      <div class="prep-columns">
        <div><h4>買い物</h4>${listItems(addition.shopping, '追加なし')}</div>
        <div><h4>持ち物</h4>${listItems(addition.packing, '追加なし')}</div>
        <div><h4>コタ用品</h4>${listItems(addition.kota, '追加なし')}</div>
        <div><h4>反省・注意</h4>${listItems(addition.reflection, '追加なし')}</div>
      </div>
    </details>
    <button class="btn primary applyReviewItem" data-index="${index}">この改善を準備へ反映</button>
  </div>`;
}

function renderProjectBridge(project, queue) {
  if (!project) {
    return card(`<h2>次のキャンプ未作成</h2><p class="muted">改善候補は保持できます。次のキャンプカード作成後に、準備へ戻します。</p><button class="btn primary" id="goPrepFromReview">準備エンジンへ</button>`);
  }
  const prep = project.prep || {};
  return card(`<h2>次回準備への戻し先</h2>
    <p><strong>${escapeHtml(project.title || '次のキャンプ')}</strong></p>
    ${kv('改善キュー', `${queue.length}件`)}
    ${kv('現在の反省・注意', `${(prep.reflection || []).length}件`)}
    <div class="grid"><button class="btn primary" id="applyAllReviews" ${queue.length ? '' : 'disabled'}>改善候補をまとめて準備へ反映</button><button class="btn" id="goPrepFromReview">準備で確認</button></div>
    <p class="muted">反映すると、買い物・持ち物・コタ用品・反省に追加されます。元の記録は履歴に残します。</p>`);
}

function renderAppliedLog(log = []) {
  return card(`<h2>反映済みログ</h2>${log.length ? `<ul class="outbase-list">${log.slice(0, 12).map((item) => `<li><strong>${escapeHtml(formatTime(item.appliedAt))}</strong><br><span class="muted">${escapeHtml(item.text || '')}</span></li>`).join('')}</ul>` : '<p class="muted">まだ準備へ反映した改善はありません。</p>'}`);
}

export function renderReview() {
  const state = getState();
  const project = state.nextProject;
  const history = state.recordHistory || [];
  const queue = state.reviewQueue || [];
  const applied = state.appliedReviewQueue || [];
  app().innerHTML = [
    card(`<div class="title">改善タブ Core04</div><p class="muted">記録で出た暑さ・タオル不足・雨撤収・コタ用品の改善候補を、次の買い物・持ち物・反省へ戻す。</p>`, 'hero'),
    renderProjectBridge(project, queue),
    card(`<h2>記録から来た改善キュー</h2>${queue.length ? queue.map(queueCard).join('') : '<p class="muted">まだ未反映の改善候補はありません。記録を終了するとここに入ります。</p>'}`),
    project ? card(`<h2>現在の次回準備</h2><div class="prep-columns"><div><h3>買い物</h3>${listItems(project.prep?.shopping)}</div><div><h3>持ち物</h3>${listItems(project.prep?.packing)}</div><div><h3>コタ用品</h3>${listItems(project.prep?.kota)}</div><div><h3>反省・注意</h3>${listItems(project.prep?.reflection)}</div></div>`) : '',
    renderAppliedLog(applied),
    card(`<h2>最近の記録</h2>${history.length ? `<ul class="outbase-list">${history.slice(0, 8).map((item) => `<li><strong>${escapeHtml(sessionTypeLabel(item.type))}</strong> ${escapeHtml(item.title || '')}<br><span class="muted">${escapeHtml(formatTime(item.startedAt))} / 記録 ${(item.records || []).length}件</span></li>`).join('')}</ul>` : '<p class="muted">記録を終了するとここにも表示されます。</p>'}`)
  ].filter(Boolean).join('');
  bindReviewActions();
}

function bindReviewActions() {
  document.getElementById('goPrepFromReview')?.addEventListener('click', () => go('prep'));
  document.getElementById('applyAllReviews')?.addEventListener('click', () => applyReviewItems());
  document.querySelectorAll('.applyReviewItem').forEach((button) => {
    button.addEventListener('click', () => applyReviewItems(Number(button.dataset.index)));
  });
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
  const nextContext = {
    ...(state.prepContext || {}),
    pastReflection: unique([existingReflection, reviewText].filter(Boolean).join('\n').split('\n')).join('\n')
  };
  const nextProject = { ...project, prep: nextPrep, prepContext: nextContext, updatedAt: new Date().toISOString(), reviewAppliedAt: new Date().toISOString() };
  const remaining = index === null ? [] : queue.filter((_, i) => i !== index);
  const appliedLog = [
    ...selected.map((text) => ({ text, appliedAt: new Date().toISOString() })),
    ...(state.appliedReviewQueue || [])
  ].slice(0, 50);

  patchState({ nextProject, prepContext: nextContext, reviewQueue: remaining, appliedReviewQueue: appliedLog });
  renderReview();
  window.setTimeout(() => document.getElementById('goPrepFromReview')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
}
