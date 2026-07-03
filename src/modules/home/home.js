import { app, card, escapeHtml } from '../../ui/components.js?v=core05-5-time-phase-ux-20260703';
import { getState } from '../../core/store.js?v=core05-5-time-phase-ux-20260703';
import { go } from '../../core/router.js?v=core05-5-time-phase-ux-20260703';

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
  if (active) return { label: '今の記録に戻る', route: 'walk', activePhase: 'walk' };
  if (!project) return { label: '予定を入れる', route: 'prep', activePhase: 'home' };
  if (queue.length) return { label: '次回へ戻す', route: 'review', activePhase: 'review' };
  return { label: '準備を開く', route: 'prep', activePhase: 'prep' };
}

function statusTile(label, value) {
  return `<div class="status-tile"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function phaseButton(route, big, small, activeRoute) {
  return `<button class="phase-card ${activeRoute === route ? 'active' : ''}" data-jump="${escapeHtml(route)}"><strong>${escapeHtml(big)}</strong><span>${escapeHtml(small)}</span></button>`;
}

export function renderHome() {
  const state = getState();
  const project = state.nextProject;
  const action = nextAction(state);
  const recent = (state.recordHistory || [])[0];
  const queue = state.reviewQueue || [];
  const active = state.walkSession?.status === 'active' ? state.walkSession : null;

  app().innerHTML = [
    `<section class="home-hero cardless">
      <div class="hero-content">
        <span class="phase-badge">次 / NEXT</span>
        <h2>${escapeHtml(project ? projectName(project) : '予定を入れる')}</h2>
        <p class="hero-date">${escapeHtml(project ? projectDate(project) || '日程未確定' : '予約スクショ・メールから')}</p>
        <button class="primary-cta" id="goNextAction">${escapeHtml(action.label)}</button>
      </div>
    </section>`,
    `<section class="phase-map">
      ${phaseButton('home', '次', '予定を見る', action.activePhase)}
      ${phaseButton('prep', '前', '準備する', action.activePhase)}
      ${phaseButton('walk', '今', '現地で残す', action.activePhase)}
      ${phaseButton('review', '後', '次回へ戻す', action.activePhase)}
    </section>`,
    `<section class="status-strip">
      ${statusTile('準備', project ? `${countPrep(project)}件` : '未作成')}
      ${statusTile('記録', active ? '記録中' : recent ? formatDateTime(recent.startedAt) : 'なし')}
      ${statusTile('次回', queue.length ? `${queue.length}件` : 'なし')}
    </section>`,
    recent ? card(`<div class="mini-row"><span class="chip">LAST</span><strong>${escapeHtml(sessionTypeLabel(recent.type))}</strong><span class="muted">${escapeHtml(formatDateTime(recent.startedAt))}</span></div>`, 'soft') : ''
  ].filter(Boolean).join('');

  document.getElementById('goNextAction')?.addEventListener('click', () => go(action.route));
  document.querySelectorAll('[data-jump]').forEach((button) => button.addEventListener('click', () => go(button.dataset.jump)));
}
