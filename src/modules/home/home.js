import { app, card, escapeHtml } from '../../ui/components.js?v=core05-3-visual-ux-20260703';
import { getState } from '../../core/store.js?v=core05-3-visual-ux-20260703';
import { go } from '../../core/router.js?v=core05-3-visual-ux-20260703';

function formatDateTime(value) {
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

function countPrep(project) {
  return project?.prep ? Object.values(project.prep).reduce((sum, items) => sum + (items?.length || 0), 0) : 0;
}

function projectName(project) {
  return project?.reservation?.campground || project?.title || '次のキャンプ';
}

function projectDate(project) {
  const reservation = project?.reservation || {};
  return [reservation.dateText, reservation.checkIn && `IN ${reservation.checkIn}`].filter(Boolean).join(' / ');
}

function nextAction(state) {
  const project = state.nextProject;
  const active = state.walkSession?.status === 'active' ? state.walkSession : null;
  const queue = state.reviewQueue || [];

  if (active) return { label: '記録に戻る', route: 'walk', caption: `${sessionTypeLabel(active.type)} 記録中` };
  if (!project) return { label: '準備を始める', route: 'prep', caption: '予約を入れる' };
  if (queue.length) return { label: '改善を戻す', route: 'review', caption: `${queue.length}件 未反映` };
  return { label: '準備を開く', route: 'prep', caption: `${countPrep(project)}件` };
}

function metric(label, value) {
  return `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function renderHome() {
  const state = getState();
  const project = state.nextProject;
  const action = nextAction(state);
  const recent = (state.recordHistory || [])[0];
  const queue = state.reviewQueue || [];
  const active = state.walkSession?.status === 'active' ? state.walkSession : null;

  app().innerHTML = [
    `<section class="camp-cover cardless">
      <div class="cover-sky"></div>
      <div class="cover-content">
        <p class="overline">NEXT CAMP</p>
        <h2>${escapeHtml(project ? projectName(project) : '予定を入れる')}</h2>
        <p class="cover-date">${escapeHtml(project ? projectDate(project) || '日程未確定' : '予約スクショ・メールから作成')}</p>
        <button class="cta-main" id="goNextAction">${escapeHtml(action.label)}</button>
      </div>
    </section>`,
    `<section class="quick-panel">
      ${metric('準備', project ? `${countPrep(project)}件` : '未作成')}
      ${metric('記録', active ? '記録中' : recent ? formatDateTime(recent.startedAt) : '未記録')}
      ${metric('改善', queue.length ? `${queue.length}件` : 'なし')}
    </section>`,
    `<section class="dock-actions">
      <button data-jump="prep"><span>準備</span><strong>買う・持つ</strong></button>
      <button data-jump="walk"><span>記録</span><strong>今残す</strong></button>
      <button data-jump="review"><span>改善</span><strong>次へ戻す</strong></button>
    </section>`,
    recent ? card(`<div class="compact-row"><div><p class="eyebrow">LAST RECORD</p><h2>${escapeHtml(sessionTypeLabel(recent.type))}</h2><p class="muted">${escapeHtml(formatDateTime(recent.startedAt))} / ${(recent.records || []).length}件</p></div><button class="btn ghost" id="goRecordHistory">見る</button></div>`, 'quiet-card') : ''
  ].filter(Boolean).join('');

  document.getElementById('goNextAction')?.addEventListener('click', () => go(action.route));
  document.getElementById('goRecordHistory')?.addEventListener('click', () => go('walk'));
  document.querySelectorAll('[data-jump]').forEach((button) => button.addEventListener('click', () => go(button.dataset.jump)));
}

export { renderHome };
