import { app, card, escapeHtml } from '../../ui/components.js?v=core05-4-ergo-design-20260703';
import { getState } from '../../core/store.js?v=core05-4-ergo-design-20260703';
import { go } from '../../core/router.js?v=core05-4-ergo-design-20260703';

function formatDateTime(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return value;
  }
}

function sessionTypeLabel(type) {
  return { walk: 'コタ散歩', camp: 'キャンプ', life: 'メモ' }[type] || '記録';
}

function countPrep(project) {
  return project?.prep ? Object.values(project.prep).reduce((sum, items) => sum + (items?.length || 0), 0) : 0;
}

function projectName(project) {
  return project?.reservation?.campground || project?.title || '次のキャンプ';
}

function projectDate(project) {
  const r = project?.reservation || {};
  return [r.dateText, r.checkIn && `IN ${r.checkIn}`].filter(Boolean).join(' / ');
}

function nextAction(state) {
  const project = state.nextProject;
  const active = state.walkSession?.status === 'active' ? state.walkSession : null;
  const queue = state.reviewQueue || [];
  if (active) return { label: '記録に戻る', route: 'walk' };
  if (!project) return { label: '予定を入れる', route: 'prep' };
  if (queue.length) return { label: '改善を戻す', route: 'review' };
  return { label: '準備を開く', route: 'prep' };
}

function statusTile(label, value) {
  return `<div class="status-tile"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

export function renderHome() {
  const state = getState();
  const project = state.nextProject;
  const action = nextAction(state);
  const recent = (state.recordHistory || [])[0];
  const queue = state.reviewQueue || [];
  const active = state.walkSession?.status === 'active' ? state.walkSession : null;

  app().innerHTML = [
    `<section class="hero-card cardless">
      <div class="hero-art"></div>
      <div class="hero-content">
        <p class="overline">NEXT CAMP</p>
        <h2 class="hero-title">${escapeHtml(project ? projectName(project) : '予定を入れる')}</h2>
        <p class="hero-date">${escapeHtml(project ? projectDate(project) || '日程未確定' : '予約スクショ・メールから')}</p>
        <button class="primary-cta pulse" id="goNextAction">${escapeHtml(action.label)}</button>
      </div>
    </section>`,
    `<section class="status-strip">
      ${statusTile('準備', project ? `${countPrep(project)}件` : '未作成')}
      ${statusTile('記録', active ? '記録中' : recent ? formatDateTime(recent.startedAt) : 'なし')}
      ${statusTile('改善', queue.length ? `${queue.length}件` : 'なし')}
    </section>`,
    `<section class="action-dock">
      <button data-jump="prep"><span>準備</span><strong>買う・持つ</strong></button>
      <button data-jump="walk"><span>記録</span><strong>今残す</strong></button>
      <button data-jump="review"><span>改善</span><strong>次へ戻す</strong></button>
    </section>`,
    recent ? card(`<div class="mini-row"><span class="chip">LAST</span><strong>${escapeHtml(sessionTypeLabel(recent.type))}</strong><span class="muted">${escapeHtml(formatDateTime(recent.startedAt))}</span></div>`, 'soft') : ''
  ].filter(Boolean).join('');

  document.getElementById('goNextAction')?.addEventListener('click', () => go(action.route));
  document.querySelectorAll('[data-jump]').forEach((button) => button.addEventListener('click', () => go(button.dataset.jump)));
}
