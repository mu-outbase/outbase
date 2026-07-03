import { app, card, escapeHtml } from '../../ui/components.js?v=core05-7-calendar-refined-20260703';
import { getState } from '../../core/store.js?v=core05-7-calendar-refined-20260703';
import { go } from '../../core/router.js?v=core05-7-calendar-refined-20260703';

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
  return card(`<div class="calendar-head"><div><p class="eyebrow">CALENDAR</p><h2>${escapeHtml(monthTitle(target))}</h2></div><button class="mini-action" id="addPlanFromCalendar">予定追加</button></div>
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
  if (!project) return { title: '次の予定を入れる', text: '予約スクショ・メールから作成。', button: '予定を入れる', route: 'prep' };
  if (d !== null && d <= 0) return { title: '今日は当日', text: '出発・設営・撤収をここから。', button: '当日を開く', route: 'day' };
  if (queue.length) return { title: '次回へ戻す', text: `${queue.length}件の改善があります。`, button: '思い出を見る', route: 'memory' };
  if (d !== null && d <= 7) return { title: '最終準備', text: '買い物・コタ用品・料理を確認。', button: '準備を開く', route: 'prep' };
  return { title: '次の予定', text: '今日やることだけ整えます。', button: '準備を開く', route: 'prep' };
}

function taskItems(project, d, queueCount) {
  if (!project) return [
    { label: '予約を入れる', route: 'prep' },
    { label: '犬可で探す', route: 'search' },
    { label: '前回を見る', route: 'memory' }
  ];
  if (d !== null && d <= 0) return [
    { label: '出発を確認', route: 'day' },
    { label: '設営タイマー', route: 'day' },
    { label: '今すぐ記録', route: 'walk' }
  ];
  if (queueCount) return [
    { label: '改善を戻す', route: 'memory' },
    { label: '買い物を更新', route: 'prep' },
    { label: 'コタ用品確認', route: 'prep' }
  ];
  return [
    { label: '料理を決める', route: 'prep' },
    { label: '買い物を確認', route: 'prep' },
    { label: 'コタ用品確認', route: 'prep' }
  ];
}

function compactEventCard(project, task, d) {
  const title = project ? projectName(project) : '予定を入れる';
  const dateText = project ? projectDateText(project) || '日程未確定' : '予約スクショ・メールから';
  const date = parseProjectDate(project);
  const monthDay = date ? `${date.getMonth() + 1}/${date.getDate()}` : '--/--';
  const count = d === null ? '未定' : d <= 0 ? '今日' : `あと${d}日`;
  return `<section class="event-card cardless">
    <div class="event-date"><strong>${escapeHtml(monthDay)}</strong><span>camp</span></div>
    <div class="event-main"><p class="eyebrow">NEXT CAMP</p><h2>${escapeHtml(title)}</h2><p>${escapeHtml(dateText)}</p></div>
    <div class="event-side"><strong>${escapeHtml(count)}</strong></div>
    <button class="event-button" id="goNextTask">${escapeHtml(task.button)}</button>
  </section>`;
}

function todayActions(task, project, d, queueCount) {
  const items = taskItems(project, d, queueCount);
  return card(`<div class="today-head"><span>今日</span><div><strong>${escapeHtml(task.title)}</strong><p>${escapeHtml(task.text)}</p></div></div>
    <div class="today-actions">${items.map((item) => `<button data-jump="${escapeHtml(item.route)}">${escapeHtml(item.label)}</button>`).join('')}</div>`, 'today-card');
}

export function renderHome() {
  const state = getState();
  const project = state.nextProject;
  const task = nextTask(state);
  const date = parseProjectDate(project);
  const d = daysUntil(date);
  const queue = state.reviewQueue || [];

  app().innerHTML = [
    renderCalendar(project),
    compactEventCard(project, task, d),
    todayActions(task, project, d, queue.length)
  ].join('');

  document.getElementById('goNextTask')?.addEventListener('click', () => go(task.route));
  document.getElementById('addPlanFromCalendar')?.addEventListener('click', () => go('prep'));
  document.querySelectorAll('[data-jump],[data-route]').forEach((button) => {
    button.addEventListener('click', () => go(button.dataset.jump || button.dataset.route));
  });
}
