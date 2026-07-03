import { app, card, escapeHtml } from '../../ui/components.js?v=core05-6-calendar-nav-20260703';
import { getState } from '../../core/store.js?v=core05-6-calendar-nav-20260703';
import { go } from '../../core/router.js?v=core05-6-calendar-nav-20260703';

function formatDateTime(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return value; }
}

function projectName(project) {
  return project?.reservation?.campground || project?.title || '次のキャンプ';
}

function projectDateText(project) {
  const r = project?.reservation || {};
  return [r.dateText, r.checkIn && `IN ${r.checkIn}`].filter(Boolean).join(' / ');
}

function countPrep(project) {
  return project?.prep ? Object.values(project.prep).reduce((sum, items) => sum + (items?.length || 0), 0) : 0;
}

function parseProjectDate(project) {
  const text = project?.reservation?.dateText || project?.title || '';
  const m = String(text).match(/(20\d{2})[\/.-]\s*(\d{1,2})[\/.-]\s*(\d{1,2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return null;
}

function daysUntil(date) {
  if (!date) return null;
  const today = new Date();
  const a = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const b = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return Math.round((b - a) / 86400000);
}

function monthTitle(date) {
  return `${date.getFullYear()}年 ${date.getMonth() + 1}月`;
}

function renderCalendar(project) {
  const target = parseProjectDate(project) || new Date();
  const today = new Date();
  const first = new Date(target.getFullYear(), target.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  const eventDate = parseProjectDate(project);
  const cells = [];
  for (let i = 0; i < 35; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const isOther = d.getMonth() !== target.getMonth();
    const isToday = d.toDateString() === today.toDateString();
    const isCamp = eventDate && d.toDateString() === eventDate.toDateString();
    cells.push(`<button class="cal-day ${isOther ? 'other' : ''} ${isToday ? 'today' : ''} ${isCamp ? 'camp' : ''}" ${isCamp ? 'data-route="day"' : ''}>
      <span>${d.getDate()}</span>${isCamp ? '<strong>camp</strong>' : isToday ? '<strong>today</strong>' : ''}
    </button>`);
  }
  return card(`<div class="section-head"><div><p class="eyebrow">CALENDAR</p><h2>${escapeHtml(monthTitle(target))}</h2></div><button class="mini-action" id="goPrepFromCalendar">準備</button></div>
    <div class="week-row"><span>日</span><span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span>土</span></div>
    <div class="calendar-grid">${cells.join('')}</div>`, 'calendar-card');
}

function nextTask(state) {
  const project = state.nextProject;
  const active = state.walkSession?.status === 'active' ? state.walkSession : null;
  const queue = state.reviewQueue || [];
  const date = parseProjectDate(project);
  const d = daysUntil(date);
  if (active) return { title: '記録中', text: '今の記録に戻れます。', button: '記録に戻る', route: 'walk' };
  if (!project) return { title: '予定を作る', text: '予約スクショやメールから始めます。', button: '予定を入れる', route: 'prep' };
  if (d !== null && d <= 0) return { title: '今日は当日', text: '出発・設営・記録をここから。', button: '当日を開く', route: 'day' };
  if (queue.length) return { title: '次回へ戻す', text: `${queue.length}件の改善があります。`, button: '思い出を見る', route: 'memory' };
  if (d !== null && d <= 7) return { title: '最終準備', text: '買い物、コタ用品、料理を確認。', button: '準備を開く', route: 'prep' };
  return { title: '次の予定', text: '準備を少しずつ整えます。', button: '準備を開く', route: 'prep' };
}

function phaseCard(route, label, sub, active = false) {
  return `<button class="phase-card ${active ? 'active' : ''}" data-jump="${escapeHtml(route)}"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(sub)}</span></button>`;
}

export function renderHome() {
  const state = getState();
  const project = state.nextProject;
  const task = nextTask(state);
  const date = parseProjectDate(project);
  const d = daysUntil(date);
  const queue = state.reviewQueue || [];
  const recent = (state.recordHistory || [])[0];

  app().innerHTML = [
    renderCalendar(project),
    `<section class="next-card cardless">
      <div><p class="eyebrow">NEXT</p><h2>${escapeHtml(project ? projectName(project) : '予定を入れる')}</h2><p>${escapeHtml(project ? projectDateText(project) || '日程未確定' : '予約スクショ・メールから')}</p></div>
      <div class="countdown"><strong>${d === null ? '-' : d <= 0 ? '今日' : `${d}日`}</strong><span>${d === null ? '未定' : d <= 0 ? '当日' : 'あと'}</span></div>
      <button class="primary-cta" id="goNextTask">${escapeHtml(task.button)}</button>
    </section>`,
    card(`<div class="todo-line"><span>今日</span><strong>${escapeHtml(task.title)}</strong><em>${escapeHtml(task.text)}</em></div>`, 'today-card'),
    `<section class="phase-map six">
      ${phaseCard('home', '予定', 'カレンダー', task.route === 'home')}
      ${phaseCard('search', '探す', '犬可・温水', task.route === 'search')}
      ${phaseCard('prep', '準備', `${project ? countPrep(project) : 0}件`, task.route === 'prep')}
      ${phaseCard('day', '当日', '出発・設営', task.route === 'day')}
      ${phaseCard('walk', '記録', recent ? formatDateTime(recent.startedAt) : '3秒', task.route === 'walk')}
      ${phaseCard('memory', '思い出', queue.length ? `${queue.length}件` : '振り返り', task.route === 'memory')}
    </section>`
  ].join('');

  document.getElementById('goNextTask')?.addEventListener('click', () => go(task.route));
  document.getElementById('goPrepFromCalendar')?.addEventListener('click', () => go('prep'));
  document.querySelectorAll('[data-jump],[data-route]').forEach((button) => {
    button.addEventListener('click', () => go(button.dataset.jump || button.dataset.route));
  });
}
