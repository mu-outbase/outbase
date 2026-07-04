import { app, escapeHtml, toast } from '../../ui/components.js?v=core06-10-global-ui-reset-20260704';
import { getState, patchState } from '../../core/store.js?v=core06-10-global-ui-reset-20260704';
import { go } from '../../core/router.js?v=core06-10-global-ui-reset-20260704';

function projectName(project) { return project?.reservation?.campground || project?.title || '今日のキャンプ'; }
function context(state, project) { return { ...(state.prepContext || {}), ...(project?.prepContext || {}) }; }
function isDone(state, key) { return Boolean(state.dayChecks?.[key]); }
function dayStep(key, label, sub, icon, canRecord = false, done = false) {
  return `<article class="day-operate-step ${done ? 'done' : ''}"><button class="dayCheck" data-check="${escapeHtml(key)}"><span>${escapeHtml(icon)}</span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(sub)}</small><em>${done ? '済' : '確認'}</em></button>${canRecord ? `<button class="dayRecord" data-route-target="walk">記録</button>` : ''}</article>`;
}
export function renderDay() {
  const state = getState();
  const project = state.nextProject;
  const c = context(state, project);
  const r = project?.reservation || {};
  app().innerHTML = `<section class="route-page day-operator">
    <section class="route-summary-card"><div><span>当日</span><h2>${escapeHtml(projectName(project))}</h2><p>${escapeHtml(c.routeMemo || '出発から撤収まで、今日見ることだけ。記録へ飛ぶだけのタブではありません。')}</p></div><button class="mini-ghost" data-route="walk">記録</button></section>
    <section class="panel-card tight-card"><div class="section-title-row"><strong>今日の進行</strong><small>押すと確認済み</small></div><div class="day-operate-list">
      ${dayStep('depart', '出発', c.routeMemo || '出発時間・経由地', '🚙', false, isDone(state, 'depart'))}
      ${dayStep('arrive', '到着', r.checkIn ? `IN ${r.checkIn}` : 'チェックイン', '📍', true, isDone(state, 'arrive'))}
      ${dayStep('setup', '設営', c.setupMemo || '設営順・時間', '⛺', true, isDone(state, 'setup'))}
      ${dayStep('meal', '料理', c.menuMemo || '今日のキャンプ飯', '🍳', true, isDone(state, 'meal'))}
      ${dayStep('walk', '場内確認', 'トイレ・炊事場・景色・危険箇所', '🧭', true, isDone(state, 'walk'))}
      ${dayStep('teardown', '撤収', r.checkOut ? `OUT ${r.checkOut}` : '撤収時間', '📦', true, isDone(state, 'teardown'))}
    </div></section>
    <section class="panel-card tight-card"><div class="section-title-row"><strong>当日メモ</strong><small>準備と記録の間</small></div><textarea id="dayMemo" class="field textarea compact" placeholder="例：途中コンビニ、設営30分、雨なら濡れ物先">${escapeHtml(state.dayMemo || '')}</textarea><button id="saveDayMemo" class="primary-compact">保存</button></section>
  </section>`;
  document.getElementById('saveDayMemo')?.addEventListener('click', () => { patchState({ dayMemo: document.getElementById('dayMemo')?.value || '' }); toast('当日メモを保存'); });
  document.querySelectorAll('.dayCheck').forEach((button) => button.addEventListener('click', () => { const key = button.dataset.check; patchState({ dayChecks: { ...(getState().dayChecks || {}), [key]: !getState().dayChecks?.[key] } }); renderDay(); }));
  document.querySelectorAll('.dayRecord').forEach((button) => button.addEventListener('click', () => { toast('記録を開きます'); go(button.dataset.routeTarget || 'walk'); }));
}
