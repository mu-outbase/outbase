import { app, card, escapeHtml, toast } from '../../ui/components.js?v=core05-8-calendar-interactive-20260703';
import { getState, patchState } from '../../core/store.js?v=core05-8-calendar-interactive-20260703';
import { go } from '../../core/router.js?v=core05-8-calendar-interactive-20260703';

const HOLIDAYS = {
  '2026-01-01': '元日', '2026-01-12': '成人の日', '2026-02-11': '建国記念の日', '2026-02-23': '天皇誕生日',
  '2026-03-20': '春分の日', '2026-04-29': '昭和の日', '2026-05-03': '憲法記念日', '2026-05-04': 'みどりの日',
  '2026-05-05': 'こどもの日', '2026-05-06': '振替休日', '2026-07-20': '海の日', '2026-08-11': '山の日',
  '2026-09-21': '敬老の日', '2026-09-22': '国民の休日', '2026-09-23': '秋分の日', '2026-10-12': 'スポーツの日',
  '2026-11-03': '文化の日', '2026-11-23': '勤労感謝の日',
  '2027-01-01': '元日', '2027-01-11': '成人の日', '2027-02-11': '建国記念の日', '2027-02-23': '天皇誕生日',
  '2027-03-21': '春分の日', '2027-03-22': '振替休日', '2027-04-29': '昭和の日', '2027-05-03': '憲法記念日',
  '2027-05-04': 'みどりの日', '2027-05-05': 'こどもの日', '2027-07-19': '海の日', '2027-08-11': '山の日',
  '2027-09-20': '敬老の日', '2027-09-23': '秋分の日', '2027-10-11': 'スポーツの日', '2027-11-03': '文化の日',
  '2027-11-23': '勤労感謝の日'
};

const TYPE_META = {
  camp: { label: 'キャンプ', short: 'camp', route: 'prep' },
  normal: { label: '予定', short: '予定', route: 'home' },
  birthday: { label: '誕生日', short: '誕', route: 'home' },
  car: { label: '車検・車', short: '車', route: 'home' },
  work: { label: '仕事', short: '仕事', route: 'home' },
  other: { label: 'その他', short: '他', route: 'home' }
};

function pad(num) { return String(num).padStart(2, '0'); }
function toISO(date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; }
function parseISO(value) {
  const m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}
function addDays(date, days) { const d = new Date(date); d.setDate(d.getDate() + days); return d; }
function firstOfMonth(date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
function monthKey(date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-01`; }
function monthTitle(date) { return `${date.getFullYear()}年 ${date.getMonth() + 1}月`; }
function prettyDate(iso) { const d = parseISO(iso); return d ? `${d.getMonth() + 1}/${d.getDate()}` : '--/--'; }
function normalizeType(type) { return TYPE_META[type] ? type : 'normal'; }
function isWeekend(date) { return date.getDay() === 0 || date.getDay() === 6; }
function isSameDay(a, b) { return a && b && a.toDateString() === b.toDateString(); }
function inRange(iso, start, end) { return iso >= start && iso <= (end || start); }
function clampEnd(start, end) { return end && end >= start ? end : start; }

function projectName(project) {
  return project?.reservation?.campground || project?.title || '次のキャンプ';
}

function projectDateText(project) {
  const r = project?.reservation || {};
  return [r.dateText, r.checkIn && `IN ${r.checkIn}`].filter(Boolean).join(' / ');
}

function parseProjectRange(project) {
  const text = project?.reservation?.dateText || project?.title || '';
  const re = /(20\d{2})[\/.\-]\s*(\d{1,2})[\/.\-]\s*(\d{1,2})(?:\s*[\-〜~～]\s*(?:(20\d{2})[\/.\-])?(?:(\d{1,2})[\/.\-])?(\d{1,2}))?/;
  const m = String(text).match(re);
  if (!m) return null;
  const sy = Number(m[1]);
  const sm = Number(m[2]);
  const sd = Number(m[3]);
  const ey = Number(m[4] || sy);
  const em = Number(m[5] || sm);
  const ed = Number(m[6] || sd);
  const start = `${sy}-${pad(sm)}-${pad(sd)}`;
  const end = `${ey}-${pad(em)}-${pad(ed)}`;
  return { start, end: clampEnd(start, end) };
}

function daysUntilISO(iso) {
  const date = parseISO(iso);
  if (!date) return null;
  const today = new Date();
  const a = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const b = date.getTime();
  return Math.round((b - a) / 86400000);
}

function derivedProjectEvent(project) {
  const range = parseProjectRange(project);
  if (!project || !range) return null;
  return {
    id: 'nextProject',
    title: projectName(project),
    type: 'camp',
    start: range.start,
    end: range.end,
    reminder: 'day_before',
    route: 'prep',
    locked: true,
    source: 'nextProject'
  };
}

function normalizeEvent(event) {
  if (!event || !event.start) return null;
  const start = String(event.start).slice(0, 10);
  const end = clampEnd(start, String(event.end || start).slice(0, 10));
  return {
    id: event.id || `event_${Date.now()}`,
    title: String(event.title || '予定').trim() || '予定',
    type: normalizeType(event.type),
    start,
    end,
    reminder: event.reminder || 'none',
    yearly: Boolean(event.yearly),
    locked: Boolean(event.locked),
    route: event.route || TYPE_META[normalizeType(event.type)]?.route || 'home'
  };
}

function repeatedYearlyEvent(event, year) {
  if (!event.yearly) return event;
  const [, month, day] = String(event.start).split('-');
  const start = `${year}-${month}-${day}`;
  const end = start;
  return { ...event, start, end };
}

function getEvents(state) {
  const userEvents = Array.isArray(state.calendarEvents) ? state.calendarEvents.map(normalizeEvent).filter(Boolean) : [];
  const projectEvent = derivedProjectEvent(state.nextProject);
  const all = projectEvent ? [projectEvent, ...userEvents.filter((event) => event.id !== 'nextProject')] : userEvents;
  const cursor = parseISO(state.calendarCursor) || parseISO(projectEvent?.start) || new Date();
  const years = [cursor.getFullYear() - 1, cursor.getFullYear(), cursor.getFullYear() + 1];
  return all.flatMap((event) => event.yearly ? years.map((year) => repeatedYearlyEvent(event, year)) : [event]);
}

function upcomingEvents(events) {
  const today = toISO(new Date());
  return events
    .filter((event) => event.end >= today)
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 5);
}

function eventForDate(events, iso) {
  return events.filter((event) => inRange(iso, event.start, event.end)).sort((a, b) => a.start.localeCompare(b.start));
}

function renderCalendar(state, events, cursorDate, selectedDate) {
  const today = new Date();
  const first = firstOfMonth(cursorDate);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  const cells = [];
  for (let i = 0; i < 42; i += 1) {
    const d = addDays(start, i);
    const iso = toISO(d);
    const dayEvents = eventForDate(events, iso);
    const primary = dayEvents[0];
    const holiday = HOLIDAYS[iso];
    const isOther = d.getMonth() !== cursorDate.getMonth();
    const classNames = [
      'cal-day',
      isOther ? 'other' : '',
      isSameDay(d, today) ? 'today' : '',
      iso === selectedDate ? 'selected' : '',
      d.getDay() === 0 ? 'sun' : '',
      d.getDay() === 6 ? 'sat' : '',
      holiday ? 'holiday' : '',
      primary ? `event-${primary.type}` : '',
      primary ? 'has-event' : '',
      primary && iso === primary.start ? 'range-start' : '',
      primary && iso === primary.end ? 'range-end' : '',
      primary && primary.start !== primary.end ? 'range-mid' : ''
    ].filter(Boolean).join(' ');
    cells.push(`<button class="${classNames}" data-date="${escapeHtml(iso)}" aria-label="${escapeHtml(iso)}">
      <span class="date-num">${d.getDate()}</span>
      ${holiday ? `<em>${escapeHtml(shortHoliday(holiday))}</em>` : ''}
      ${primary ? `<strong>${escapeHtml(TYPE_META[primary.type]?.short || '予定')}</strong>` : ''}
      ${dayEvents.length > 1 ? `<i>+${dayEvents.length - 1}</i>` : ''}
    </button>`);
  }
  return card(`<div class="calendar-head">
      <button class="month-btn" id="prevMonth" aria-label="前月">‹</button>
      <div><p class="eyebrow">CALENDAR</p><h2>${escapeHtml(monthTitle(cursorDate))}</h2></div>
      <button class="month-btn" id="nextMonth" aria-label="翌月">›</button>
    </div>
    <div class="calendar-tools"><button class="mini-action" id="goTodayMonth">今日</button><button class="mini-action" id="requestNotify">通知ON</button></div>
    <div class="week-row"><span class="sun">日</span><span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span class="sat">土</span></div>
    <div class="calendar-grid">${cells.join('')}</div>
    <p class="swipe-hint">左右スワイプで月を移動。日付タップで予定追加。</p>`, 'calendar-card interactive');
}

function shortHoliday(value) {
  return String(value).replace('の日', '').replace('記念', '').slice(0, 3);
}

function eventButtonText(event) {
  if (!event) return '予定を入れる';
  if (event.type === 'camp') {
    const d = daysUntilISO(event.start);
    if (d !== null && d <= 0) return '当日を開く';
    return '準備を開く';
  }
  return '予定を見る';
}

function eventRoute(event) {
  if (!event) return 'prep';
  if (event.type === 'camp') {
    const d = daysUntilISO(event.start);
    return d !== null && d <= 0 ? 'day' : 'prep';
  }
  return 'home';
}

function compactEventCard(event) {
  if (!event) {
    return `<section class="event-card cardless empty-event"><div class="event-main"><p class="eyebrow">NEXT</p><h2>予定を入れる</h2><p>カレンダーの日付をタップして追加</p></div><button class="event-button" id="goNextTask">予定追加</button></section>`;
  }
  const count = daysUntilISO(event.start);
  const countText = count === null ? '未定' : count <= 0 ? '今日' : `あと${count}日`;
  const type = TYPE_META[event.type] || TYPE_META.normal;
  const dateText = event.start === event.end ? prettyDate(event.start) : `${prettyDate(event.start)}-${prettyDate(event.end)}`;
  return `<section class="event-card cardless type-${escapeHtml(event.type)}">
    <div class="event-date"><strong>${escapeHtml(prettyDate(event.start))}</strong><span>${escapeHtml(type.short)}</span></div>
    <div class="event-main"><p class="eyebrow">NEXT</p><h2>${escapeHtml(event.title)}</h2><p>${escapeHtml(dateText)} / ${escapeHtml(type.label)}</p></div>
    <div class="event-side"><strong>${escapeHtml(countText)}</strong></div>
    <button class="event-button" id="goNextTask">${escapeHtml(eventButtonText(event))}</button>
  </section>`;
}

function todayActions(upcoming, state) {
  const project = state.nextProject;
  const queue = state.reviewQueue || [];
  const items = [];
  if (upcoming?.type === 'camp') {
    items.push({ label: '料理を決める', route: 'prep' }, { label: '買い物を確認', route: 'prep' }, { label: 'コタ用品確認', route: 'prep' });
  } else if (upcoming) {
    items.push({ label: '予定を確認', route: 'home' }, { label: '通知をON', action: 'notify' }, { label: '関連メモを残す', route: 'walk' });
  } else {
    items.push({ label: '予定を入れる', route: 'home' }, { label: 'キャンプ場を探す', route: 'search' }, { label: '前回を見る', route: 'memory' });
  }
  if (queue.length) items.unshift({ label: `改善 ${queue.length}件`, route: 'memory' });
  const title = upcoming ? '次の予定' : '予定なし';
  const text = upcoming ? '今日やることだけ整えます。' : '日付をタップして予定を登録。';
  return card(`<div class="today-head"><span>今日</span><div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(text)}</p></div></div>
    <div class="today-actions">${items.slice(0, 3).map((item) => `<button ${item.route ? `data-jump="${escapeHtml(item.route)}"` : ''} ${item.action ? `data-action="${escapeHtml(item.action)}"` : ''}>${escapeHtml(item.label)}</button>`).join('')}</div>`, 'today-card');
}

function selectedDatePanel(state, selectedDate, events) {
  const items = eventForDate(events, selectedDate);
  const title = `${prettyDate(selectedDate)} の予定`;
  return card(`<div class="selected-head"><div><p class="eyebrow">SELECTED</p><h2>${escapeHtml(title)}</h2></div><button class="mini-action" id="closeSelected">閉じる</button></div>
    <div class="selected-events">
      ${items.length ? items.map(renderSelectedEvent).join('') : '<p class="empty-line">まだ予定はありません。下から追加できます。</p>'}
    </div>
    <div class="calendar-form">
      <input id="eventTitle" class="field" value="" placeholder="予定名 例：リン誕生日 / 車検 / 美容室" />
      <div class="form-grid">
        <select id="eventType" class="field">
          <option value="normal">普通の予定</option>
          <option value="camp">キャンプ</option>
          <option value="birthday">誕生日</option>
          <option value="car">車検・車</option>
          <option value="work">仕事</option>
          <option value="other">その他</option>
        </select>
        <select id="eventReminder" class="field">
          <option value="none">通知なし</option>
          <option value="same_day">当日通知</option>
          <option value="day_before">前日通知</option>
          <option value="week_before">1週間前通知</option>
        </select>
      </div>
      <div class="form-grid">
        <label><span>開始</span><input id="eventStart" class="field" type="date" value="${escapeHtml(selectedDate)}" /></label>
        <label><span>終了</span><input id="eventEnd" class="field" type="date" value="${escapeHtml(selectedDate)}" /></label>
      </div>
      <label class="check-row"><input id="eventYearly" type="checkbox" /> 毎年くり返す（誕生日など）</label>
      <button id="saveEvent" class="btn primary">この日に追加</button>
    </div>`, 'selected-card');
}

function renderSelectedEvent(event) {
  const type = TYPE_META[event.type] || TYPE_META.normal;
  const range = event.start === event.end ? prettyDate(event.start) : `${prettyDate(event.start)}-${prettyDate(event.end)}`;
  return `<div class="selected-event type-${escapeHtml(event.type)}">
    <span>${escapeHtml(type.label)}</span>
    <strong>${escapeHtml(event.title)}</strong>
    <small>${escapeHtml(range)}${event.reminder && event.reminder !== 'none' ? ` / 通知:${reminderLabel(event.reminder)}` : ''}${event.yearly ? ' / 毎年' : ''}</small>
    ${event.locked ? '' : `<button data-delete-event="${escapeHtml(event.id)}">削除</button>`}
  </div>`;
}

function reminderLabel(value) {
  return { same_day: '当日', day_before: '前日', week_before: '1週間前', none: 'なし' }[value] || 'なし';
}

function navigateMonth(cursorDate, diff) {
  const next = new Date(cursorDate.getFullYear(), cursorDate.getMonth() + diff, 1);
  patchState({ calendarCursor: monthKey(next) });
  renderHome();
}

function saveEventFromForm() {
  const title = document.getElementById('eventTitle')?.value?.trim();
  const type = document.getElementById('eventType')?.value || 'normal';
  const start = document.getElementById('eventStart')?.value;
  const rawEnd = document.getElementById('eventEnd')?.value || start;
  const reminder = document.getElementById('eventReminder')?.value || 'none';
  const yearly = document.getElementById('eventYearly')?.checked || type === 'birthday';
  if (!start) return toast('日付が未選択です');
  const end = clampEnd(start, rawEnd);
  const event = {
    id: `event_${Date.now()}`,
    title: title || TYPE_META[type]?.label || '予定',
    type: normalizeType(type),
    start,
    end,
    reminder,
    yearly,
    createdAt: new Date().toISOString()
  };
  const state = getState();
  patchState({ calendarEvents: [...(state.calendarEvents || []), event], selectedDate: start, calendarCursor: monthKey(parseISO(start) || new Date()) });
  toast('予定を追加しました');
  renderHome();
}

function deleteEvent(eventId) {
  const state = getState();
  patchState({ calendarEvents: (state.calendarEvents || []).filter((event) => event.id !== eventId) });
  toast('予定を削除しました');
  renderHome();
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) return toast('この端末は通知に未対応です');
  const result = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  patchState({ notificationPermission: result });
  toast(result === 'granted' ? '通知をONにしました' : '通知はOFFです');
  if (result === 'granted') checkDueReminders(true);
}

function reminderDueDate(event) {
  const start = parseISO(event.start);
  if (!start || !event.reminder || event.reminder === 'none') return null;
  if (event.reminder === 'week_before') return toISO(addDays(start, -7));
  if (event.reminder === 'day_before') return toISO(addDays(start, -1));
  return event.start;
}

function checkDueReminders(force = false) {
  const state = getState();
  const events = getEvents(state);
  const today = toISO(new Date());
  const notified = state.calendarReminderNotified || {};
  const due = events.filter((event) => reminderDueDate(event) === today);
  due.forEach((event) => {
    const key = `${event.id}_${event.start}_${today}`;
    if (!force && notified[key]) return;
    notified[key] = true;
    toast(`予定通知：${event.title}`);
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('OUTBASE 予定通知', { body: `${prettyDate(event.start)} ${event.title}` });
    }
  });
  if (due.length) patchState({ calendarReminderNotified: notified });
}

function bindSwipe(calendarEl, cursorDate) {
  if (!calendarEl) return;
  let startX = 0;
  calendarEl.addEventListener('touchstart', (e) => { startX = e.touches?.[0]?.clientX || 0; }, { passive: true });
  calendarEl.addEventListener('touchend', (e) => {
    const endX = e.changedTouches?.[0]?.clientX || 0;
    const diff = endX - startX;
    if (Math.abs(diff) < 48) return;
    navigateMonth(cursorDate, diff < 0 ? 1 : -1);
  }, { passive: true });
}

export function renderHome() {
  const state = getState();
  const projectEvent = derivedProjectEvent(state.nextProject);
  const defaultCursor = parseISO(state.calendarCursor) || parseISO(state.selectedDate) || parseISO(projectEvent?.start) || new Date();
  const cursorDate = firstOfMonth(defaultCursor);
  const events = getEvents({ ...state, calendarCursor: monthKey(cursorDate) });
  const upcoming = upcomingEvents(events)[0] || projectEvent;
  const selectedDate = state.selectedDate || (upcoming?.start || toISO(new Date()));

  app().innerHTML = [
    renderCalendar(state, events, cursorDate, selectedDate),
    compactEventCard(upcoming),
    selectedDatePanel(state, selectedDate, events),
    todayActions(upcoming, state)
  ].join('');

  checkDueReminders(false);

  document.getElementById('prevMonth')?.addEventListener('click', () => navigateMonth(cursorDate, -1));
  document.getElementById('nextMonth')?.addEventListener('click', () => navigateMonth(cursorDate, 1));
  document.getElementById('goTodayMonth')?.addEventListener('click', () => { patchState({ calendarCursor: monthKey(new Date()), selectedDate: toISO(new Date()) }); renderHome(); });
  document.getElementById('requestNotify')?.addEventListener('click', requestNotificationPermission);
  document.getElementById('saveEvent')?.addEventListener('click', saveEventFromForm);
  document.getElementById('closeSelected')?.addEventListener('click', () => { patchState({ selectedDate: '' }); renderHome(); });
  document.getElementById('goNextTask')?.addEventListener('click', () => go(eventRoute(upcoming)));
  document.querySelectorAll('[data-date]').forEach((button) => {
    button.addEventListener('click', () => {
      const iso = button.dataset.date;
      patchState({ selectedDate: iso, calendarCursor: monthKey(parseISO(iso) || cursorDate) });
      renderHome();
    });
  });
  document.querySelectorAll('[data-delete-event]').forEach((button) => button.addEventListener('click', () => deleteEvent(button.dataset.deleteEvent)));
  document.querySelectorAll('[data-jump]').forEach((button) => button.addEventListener('click', () => go(button.dataset.jump)));
  document.querySelectorAll('[data-action="notify"]').forEach((button) => button.addEventListener('click', requestNotificationPermission));
  bindSwipe(document.querySelector('.calendar-card'), cursorDate);
}
