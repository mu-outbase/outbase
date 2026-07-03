import { app, card, escapeHtml, toast } from '../../ui/components.js?v=core05-6-calendar-nav-20260703';
import { getState, patchState } from '../../core/store.js?v=core05-6-calendar-nav-20260703';
import { go } from '../../core/router.js?v=core05-6-calendar-nav-20260703';

function projectName(project) {
  return project?.reservation?.campground || project?.title || '今日のキャンプ';
}

function context(state, project) {
  return { ...(state.prepContext || {}), ...(project?.prepContext || {}) };
}

function step(label, sub, action, route = null) {
  return `<button class="day-step" data-action="${escapeHtml(action)}" ${route ? `data-route-target="${route}"` : ''}><strong>${escapeHtml(label)}</strong><span>${escapeHtml(sub)}</span></button>`;
}

export function renderDay() {
  const state = getState();
  const project = state.nextProject;
  const c = context(state, project);
  app().innerHTML = [
    `<section class="page-hero day"><p class="eyebrow">当日</p><h2>${escapeHtml(projectName(project))}</h2><p>${escapeHtml(c.routeMemo || '出発、ルート、設営、撤収をここで見る。')}</p></section>`,
    card(`<div class="day-flow">
      ${step('出発', c.routeMemo || '出発時間・経由地', '出発を確認')}
      ${step('到着', project?.reservation?.checkIn ? `IN ${project.reservation.checkIn}` : 'チェックイン', '到着を記録', 'walk')}
      ${step('設営', c.setupMemo || 'タイマーで残す', '設営タイマー開始', 'walk')}
      ${step('夜ごはん', c.menuMemo || '料理メモ', '料理を記録', 'walk')}
      ${step('撤収', project?.reservation?.checkOut ? `OUT ${project.reservation.checkOut}` : '撤収タイマー', '撤収タイマー開始', 'walk')}
    </div>`, 'focus'),
    card(`<h2>当日メモ</h2><textarea id="dayMemo" class="field textarea compact" placeholder="例：途中コンビニ、設営30分、雨なら濡れ物先">${escapeHtml(state.dayMemo || '')}</textarea><button id="saveDayMemo" class="btn primary">保存</button>`, 'soft')
  ].join('');

  document.getElementById('saveDayMemo')?.addEventListener('click', () => {
    patchState({ dayMemo: document.getElementById('dayMemo')?.value || '' });
    toast('当日メモを保存');
  });
  document.querySelectorAll('.day-step').forEach((button) => button.addEventListener('click', () => {
    toast(button.dataset.action || '記録');
    if (button.dataset.routeTarget) go(button.dataset.routeTarget);
  }));
}
