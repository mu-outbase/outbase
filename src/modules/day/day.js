import { app, escapeHtml, toast } from '../../ui/components.js?v=core06-05-all-pages-visual-unify-20260704';
import { getState, patchState } from '../../core/store.js?v=core06-05-all-pages-visual-unify-20260704';
import { go } from '../../core/router.js?v=core06-05-all-pages-visual-unify-20260704';

function projectName(project) { return project?.reservation?.campground || project?.title || '今日のキャンプ'; }
function context(state, project) { return { ...(state.prepContext || {}), ...(project?.prepContext || {}) }; }
function step(label, sub, action, route = null, icon = '') { return `<button class="premium-step" data-action="${escapeHtml(action)}" ${route ? `data-route-target="${route}"` : ''}><span>${escapeHtml(icon)}</span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(sub)}</small></button>`; }

export function renderDay() {
  const state = getState();
  const project = state.nextProject;
  const c = context(state, project);
  app().innerHTML = `<section class="premium-page day-premium">
    <div class="premium-hero"><span>DAY</span><h2>${escapeHtml(projectName(project))}</h2><p>${escapeHtml(c.routeMemo || '出発、到着、設営、料理、撤収を迷わず見る。')}</p></div>
    <section class="premium-card">
      <div class="premium-card-head"><span>流れ</span><strong>当日の動き</strong></div>
      <div class="premium-flow">
        ${step('出発', c.routeMemo || '出発時間・経由地', '出発を確認', null, '🚙')}
        ${step('到着', project?.reservation?.checkIn ? `IN ${project.reservation.checkIn}` : 'チェックイン', '到着を記録', 'walk', '📍')}
        ${step('設営', c.setupMemo || 'タイマーで残す', '設営タイマー開始', 'walk', '⛺')}
        ${step('夜ごはん', c.menuMemo || '料理メモ', '料理を記録', 'walk', '🍳')}
        ${step('撤収', project?.reservation?.checkOut ? `OUT ${project.reservation.checkOut}` : '撤収タイマー', '撤収タイマー開始', 'walk', '📦')}
      </div>
    </section>
    <section class="premium-card soft-card">
      <div class="premium-card-head"><span>メモ</span><strong>当日だけの気づき</strong></div>
      <textarea id="dayMemo" class="field textarea compact" placeholder="例：途中コンビニ、設営30分、雨なら濡れ物先">${escapeHtml(state.dayMemo || '')}</textarea>
      <button id="saveDayMemo" class="premium-primary">保存</button>
    </section>
  </section>`;
  document.getElementById('saveDayMemo')?.addEventListener('click', () => { patchState({ dayMemo: document.getElementById('dayMemo')?.value || '' }); toast('当日メモを保存'); });
  document.querySelectorAll('.premium-step').forEach((button) => button.addEventListener('click', () => { toast(button.dataset.action || '記録'); if (button.dataset.routeTarget) go(button.dataset.routeTarget); }));
}
