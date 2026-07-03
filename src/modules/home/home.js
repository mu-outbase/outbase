import { app, card, chip, escapeHtml, kv } from '../../ui/components.js';
import { getState, patchState } from '../../core/store.js';
import { go } from '../../core/router.js';
import { mvpFixedRules } from '../../domain/schema.js';

const CHECK_STEPS = [
  { key: 'prep', label: '準備まで迷わず進める', desc: '予約情報→候補→次のキャンプカード→準備候補までつながる。' },
  { key: 'line', label: 'リンに送る準備リストが使える', desc: '買い物・持ち物・コタ用品・反省がLINE貼付け用にまとまる。' },
  { key: 'record', label: '現地で3秒記録したくなる', desc: 'コタ散歩・キャンプ当日・日常メモを軽く残せる。' },
  { key: 'review', label: '記録が次回改善へ戻る', desc: '暑さ・タオル不足・雨撤収・コタ用品が次回準備へ反映される。' },
  { key: 'want', label: '次のキャンプでも開きたい', desc: '機能の数ではなく、また使いたい流れになっているか。' }
];

function sessionTypeLabel(type) {
  return { walk: 'コタ散歩', camp: 'キャンプ当日', life: '日常メモ' }[type] || '記録';
}

function formatDateTime(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return value;
  }
}

function checkState(state) {
  return {
    steps: {
      prep: 'unchecked',
      line: 'unchecked',
      record: 'unchecked',
      review: 'unchecked',
      want: 'unchecked',
      ...(state.mvpBetaCheck?.steps || {})
    },
    memo: state.mvpBetaCheck?.memo || '',
    updatedAt: state.mvpBetaCheck?.updatedAt || null
  };
}

function statusLabel(value) {
  return {
    ok: 'OK',
    concern: '気になる',
    unchecked: '未確認'
  }[value] || '未確認';
}

function score(check) {
  const values = Object.values(check.steps || {});
  const ok = values.filter((value) => value === 'ok').length;
  const concern = values.filter((value) => value === 'concern').length;
  return { ok, concern, total: CHECK_STEPS.length };
}

function scoreMessage(result) {
  if (result.ok >= 5) return 'MVPβ一周は成立。次はPWA実用確認へ進めます。';
  if (result.ok >= 4 && result.concern <= 1) return 'MVPβはほぼ成立。気になる点を1つだけ直してPWA確認へ。';
  if (result.ok >= 3) return '流れは見えています。気になる点を先に絞って直します。';
  return 'まだMVP完成とは言わない。使いたい流れになるまで確認します。';
}

function renderCheckItem(step, check) {
  const current = check.steps[step.key] || 'unchecked';
  return `<div class="check-item ${escapeHtml(current)}">
    <div>
      <strong>${escapeHtml(step.label)}</strong>
      <p class="muted">${escapeHtml(step.desc)}</p>
    </div>
    <select class="field mvpStepSelect" data-step="${escapeHtml(step.key)}">
      <option value="unchecked" ${current === 'unchecked' ? 'selected' : ''}>未確認</option>
      <option value="ok" ${current === 'ok' ? 'selected' : ''}>OK</option>
      <option value="concern" ${current === 'concern' ? 'selected' : ''}>気になる</option>
    </select>
  </div>`;
}

function renderMvpFlowCheck(state) {
  const check = checkState(state);
  const result = score(check);
  return card(`<h2>MVPβ一周確認</h2>
    <p class="muted">Core01〜Core04で作った流れを、機能数ではなく「次も使いたいか」で判定します。ここはMVP完成宣言ではなく、完成前の実用ゲートです。</p>
    <div class="score-card">
      <div class="score-large">${result.ok}/${result.total}</div>
      <div><strong>${escapeHtml(scoreMessage(result))}</strong><p class="muted">気になる：${result.concern}件 / 最終更新：${escapeHtml(check.updatedAt ? formatDateTime(check.updatedAt) : '未保存')}</p></div>
    </div>
    <div class="check-grid">${CHECK_STEPS.map((step) => renderCheckItem(step, check)).join('')}</div>
    <label class="label" for="mvpMemo">気になることメモ</label>
    <textarea id="mvpMemo" class="field textarea compact" placeholder="例：候補が多い、記録開始がまだ押しにくい、LINEリストは使えそう等">${escapeHtml(check.memo)}</textarea>
    <div class="grid"><button class="btn primary" id="saveMvpFlowCheck">一周確認を保存</button><button class="btn" id="resetMvpFlowCheck">未確認に戻す</button></div>`, 'mvp-check-card');
}

export function renderHome() {
  const state = getState();
  const project = state.nextProject;
  const projectTitle = project?.title || '次のキャンプ未作成';
  const prepCount = project?.prep ? Object.values(project.prep).reduce((sum, items) => sum + (items?.length || 0), 0) : 0;
  const queueCount = (state.reviewQueue || []).length;
  const appliedCount = (state.appliedReviewQueue || []).length;
  const active = state.walkSession?.status === 'active' ? state.walkSession : null;
  const recent = (state.recordHistory || []).slice(0, 3);
  const check = checkState(state);
  const result = score(check);

  app().innerHTML = [
    card(`<div class="title">MVPβを、使いたい流れで確認する。</div><p class="muted">Core05は、準備→記録→改善→次回準備の一周を、実機で「また開きたいか」まで確認するゲート。PWA確認はこの後。</p>`, 'hero'),
    active ? card(`<h2>記録中</h2><p><strong>${escapeHtml(sessionTypeLabel(active.type))}</strong></p><p class="muted">${escapeHtml(formatDateTime(active.startedAt))} 開始 / 記録 ${(active.records || []).length}件</p><button class="btn primary" id="goWalkActive">記録画面へ戻る</button>`) : '',
    card(`<h2>次のキャンプ</h2><p><strong>${escapeHtml(projectTitle)}</strong></p><p class="muted">${project ? `準備候補 ${prepCount}件。改善キュー ${queueCount}件 / 反映済み ${appliedCount}件。` : '予約スクショ/PDF/メール/カレンダー等から候補化して作る。'}</p><div class="grid"><button class="btn primary" id="goPrep">準備を開く</button><button class="btn" id="goReview">改善を開く</button></div>`),
    renderMvpFlowCheck(state),
    card(`<h2>最近の記録</h2>${recent.length ? `<ul class="outbase-list">${recent.map((item) => `<li><strong>${escapeHtml(sessionTypeLabel(item.type))}</strong> ${escapeHtml(formatDateTime(item.startedAt))} / 記録 ${(item.records || []).length}件</li>`).join('')}</ul>` : '<p class="muted">まだ記録はありません。散歩・キャンプ当日・日常メモを残すと改善候補になります。</p>'}`),
    card(`<h2>今の到達点</h2>${kv('MVPβ一周確認', `${result.ok}/${result.total} OK`)}<div class="timeline"><div><strong>Core01</strong><span>予約→候補→次キャンプカードまで確認済み</span></div><div><strong>Core02</strong><span>準備候補の実用化を通過</span></div><div><strong>Core03</strong><span>記録・履歴・詳細画面を通過</span></div><div><strong>Core04</strong><span>改善候補を次回準備へ戻すループ成立</span></div><div><strong>Core05</strong><span>MVPβ一周を「使いたいか」で確認中</span></div></div>`),
    card(`<h2>MVP固定ルール</h2>${mvpFixedRules.map(chip).join('')}`)
  ].filter(Boolean).join('');

  bindHomeActions();
}

function bindHomeActions() {
  document.getElementById('goPrep')?.addEventListener('click', () => go('prep'));
  document.getElementById('goReview')?.addEventListener('click', () => go('review'));
  document.getElementById('goWalkActive')?.addEventListener('click', () => go('walk'));
  document.querySelectorAll('.mvpStepSelect').forEach((select) => {
    select.addEventListener('change', () => saveMvpCheck(false));
  });
  document.getElementById('saveMvpFlowCheck')?.addEventListener('click', () => saveMvpCheck(true));
  document.getElementById('resetMvpFlowCheck')?.addEventListener('click', () => {
    patchState({
      mvpBetaCheck: {
        steps: { prep: 'unchecked', line: 'unchecked', record: 'unchecked', review: 'unchecked', want: 'unchecked' },
        memo: '',
        updatedAt: new Date().toISOString()
      }
    });
    renderHome();
  });
}

function saveMvpCheck(scroll = false) {
  const state = getState();
  const current = checkState(state);
  const steps = { ...current.steps };
  document.querySelectorAll('.mvpStepSelect').forEach((select) => {
    steps[select.dataset.step] = select.value;
  });
  const memo = document.getElementById('mvpMemo')?.value || '';
  patchState({ mvpBetaCheck: { steps, memo, updatedAt: new Date().toISOString() } });
  renderHome();
  if (scroll) window.setTimeout(() => document.querySelector('.mvp-check-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
}
