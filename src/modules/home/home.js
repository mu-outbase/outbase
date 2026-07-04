import { app, escapeHtml, toast } from '../../ui/components.js?v=core06-09-premium-interaction-ux-20260704';
import { getState, patchState } from '../../core/store.js?v=core06-09-premium-interaction-ux-20260704';
import { go } from '../../core/router.js?v=core06-09-premium-interaction-ux-20260704';

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
  camp: { label: 'キャンプ', short: 'Camp', route: 'prep' },
  normal: { label: '予定', short: '予定', route: 'home' },
  birthday: { label: '誕生日', short: '誕', route: 'home' },
  car: { label: '車検・車', short: '車', route: 'home' },
  work: { label: '仕事', short: '仕事', route: 'home' },
  todo: { label: 'ToDo', short: 'ToDo', route: 'home' },
  pet: { label: 'ペット', short: 'ペット', route: 'home' },
  family: { label: '家族', short: '家族', route: 'home' },
  payment: { label: '支払い', short: '支払', route: 'home' },
  event: { label: 'イベント', short: '催し', route: 'home' },
  other: { label: 'その他', short: '他', route: 'home' }
};

const RECURRENCE_META = {
  none: '繰り返しなし',
  weekly: '毎週',
  monthly: '毎月',
  custom_months: '数ヶ月おき',
  yearly: '毎年',
  custom_years: '数年おき'
};

const REMINDER_META = {
  none: 'なし',
  same_day: '当日',
  day_before: '前日',
  three_days_before: '3日前',
  week_before: '1週間前',
  two_weeks_before: '2週間前',
  month_before: '1ヶ月前'
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
function normalizeRecurrence(value) { return RECURRENCE_META[value] ? value : 'none'; }
function isSameDay(a, b) { return a && b && a.toDateString() === b.toDateString(); }
function clampEnd(start, end) { return end && end >= start ? end : start; }
function inRange(iso, start, end) { return iso >= start && iso <= (end || start); }
function dayDiff(start, end) { const s = parseISO(start); const e = parseISO(end); return s && e ? Math.max(0, Math.round((e - s) / 86400000)) : 0; }
function addMonthsClamp(date, months) {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), last));
  return target;
}
function shortHoliday(value) { return String(value).replace('の日', '').replace('記念', '').slice(0, 4); }
function projectName(project) { return project?.reservation?.campground || project?.title || '次のキャンプ'; }

function parseProjectRange(project) {
  const text = project?.reservation?.dateText || project?.title || '';
  const re = /(20\d{2})[/.\-]\s*(\d{1,2})[/.\-]\s*(\d{1,2})(?:\s*[\-〜~～]\s*(?:(20\d{2})[/.\-])?(?:(\d{1,2})[/.\-])?(\d{1,2}))?/;
  const m = String(text).match(re);
  if (!m) return null;
  const sy = Number(m[1]);
  const sm = Number(m[2]);
  const sd = Number(m[3]);
  const ey = Number(m[4] || sy);
  const em = Number(m[5] || sm);
  const ed = Number(m[6] || sd);
  const start = `${sy}-${pad(sm)}-${pad(sd)}`;
  return { start, end: clampEnd(start, `${ey}-${pad(em)}-${pad(ed)}`) };
}

function derivedProjectEvent(project) {
  const range = parseProjectRange(project);
  if (!project || !range) return null;
  return {
    id: 'nextProject',
    baseId: 'nextProject',
    title: projectName(project),
    type: 'camp',
    start: range.start,
    end: range.end,
    startTime: '',
    endTime: '',
    reminder: 'day_before',
    recurrence: 'none',
    recurrenceIntervalMonths: 2,
    recurrenceIntervalYears: 2,
    route: 'prep',
    locked: false,
    done: Boolean(project?.done),
    source: 'nextProject',
    memo: '次のキャンプ予定'
  };
}

function normalizeEvent(event) {
  if (!event || !event.start) return null;
  const start = String(event.start).slice(0, 10);
  const end = clampEnd(start, String(event.end || start).slice(0, 10));
  const recurrence = normalizeRecurrence(event.recurrence || (event.yearly ? 'yearly' : 'none'));
  const id = event.id || event.baseId || `event_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    baseId: event.baseId || id,
    title: String(event.title || '予定').trim() || '予定',
    type: normalizeType(event.type),
    start,
    end,
    startTime: String(event.startTime || ''),
    endTime: String(event.endTime || ''),
    reminder: event.reminder && REMINDER_META[event.reminder] ? event.reminder : 'none',
    recurrence,
    recurrenceIntervalMonths: Math.max(2, Math.min(24, Number(event.recurrenceIntervalMonths || 2))),
    recurrenceIntervalYears: Math.max(2, Math.min(20, Number(event.recurrenceIntervalYears || 2))),
    yearly: recurrence === 'yearly' || Boolean(event.yearly),
    locked: Boolean(event.locked),
    done: Boolean(event.done),
    memo: String(event.memo || ''),
    route: event.route || TYPE_META[normalizeType(event.type)]?.route || 'home',
    exceptionDates: Array.isArray(event.exceptionDates) ? event.exceptionDates : [],
    createdAt: event.createdAt || new Date().toISOString(),
    updatedAt: event.updatedAt || event.createdAt || null
  };
}

function occurrenceKey(event) { return `${event.originalId || event.baseId || event.id}@${event.start}`; }

function expandRecurringEvent(event, cursorDate, windowPaddingDays = 45) {
  const normalized = normalizeEvent(event);
  if (!normalized) return [];
  if (normalized.recurrence === 'none') return [normalized];

  const baseStart = parseISO(normalized.start);
  if (!baseStart) return [normalized];
  const duration = dayDiff(normalized.start, normalized.end);
  const windowStart = addDays(firstOfMonth(cursorDate), -windowPaddingDays);
  const windowEnd = addDays(new Date(cursorDate.getFullYear(), cursorDate.getMonth() + 2, 1), windowPaddingDays);
  const results = [];

  function pushOccurrence(startDate) {
    const occurrenceStart = toISO(startDate);
    if (normalized.exceptionDates.includes(occurrenceStart)) return;
    const occurrenceEnd = toISO(addDays(startDate, duration));
    if (occurrenceEnd < toISO(windowStart) || occurrenceStart > toISO(windowEnd)) return;
    results.push({ ...normalized, id: `${normalized.baseId}_${occurrenceStart}`, originalId: normalized.baseId, occurrenceDate: occurrenceStart, start: occurrenceStart, end: occurrenceEnd, occurrence: true });
  }

  if (normalized.recurrence === 'weekly') {
    let d = new Date(baseStart);
    while (d < windowStart) d = addDays(d, 7);
    for (let i = 0; i < 80 && d <= windowEnd; i += 1) { pushOccurrence(d); d = addDays(d, 7); }
    return results.length ? results : [normalized];
  }

  if (normalized.recurrence === 'monthly' || normalized.recurrence === 'custom_months') {
    const step = normalized.recurrence === 'custom_months' ? normalized.recurrenceIntervalMonths : 1;
    for (let i = -48; i <= 72; i += step) pushOccurrence(addMonthsClamp(baseStart, i));
    return results.length ? results : [normalized];
  }

  const intervalYears = normalized.recurrence === 'custom_years' ? normalized.recurrenceIntervalYears : 1;
  for (let y = cursorDate.getFullYear() - 2; y <= cursorDate.getFullYear() + 3; y += 1) {
    if ((y - baseStart.getFullYear()) % intervalYears !== 0) continue;
    const d = new Date(y, baseStart.getMonth(), Math.min(baseStart.getDate(), new Date(y, baseStart.getMonth() + 1, 0).getDate()));
    pushOccurrence(d);
  }
  return results.length ? results : [normalized];
}

function baseEvents(state) {
  const userEvents = Array.isArray(state.calendarEvents) ? state.calendarEvents.map(normalizeEvent).filter(Boolean) : [];
  const projectEvent = derivedProjectEvent(state.nextProject);
  return projectEvent ? [projectEvent, ...userEvents.filter((event) => event.id !== 'nextProject')] : userEvents;
}
function getEvents(state, cursorDate) { return baseEvents(state).flatMap((event) => expandRecurringEvent(event, cursorDate)); }
function upcomingEvents(events) {
  const today = toISO(new Date());
  return events.filter((event) => event.end >= today).sort((a, b) => `${a.start}${a.startTime || ''}`.localeCompare(`${b.start}${b.startTime || ''}`)).slice(0, 8);
}
function eventForDate(events, iso) { return events.filter((event) => inRange(iso, event.start, event.end)).sort((a, b) => `${a.start}${a.startTime || ''}`.localeCompare(`${b.start}${b.startTime || ''}`)); }

function eventLine(event, iso) {
  const meta = TYPE_META[event.type] || TYPE_META.normal;
  const rangeClass = event.start === event.end ? 'single' : iso === event.start ? 'range-start' : iso === event.end ? 'range-end' : 'range-mid';
  const showText = rangeClass === 'range-start' || rangeClass === 'single';
  const label = showText ? `${event.startTime ? `${event.startTime} ` : ''}${event.title || meta.short}` : ' ';
  return `<span class="jorte-event type-${escapeHtml(event.type)} ${rangeClass} ${event.done ? 'done' : ''}" data-detail-date="${escapeHtml(iso)}" data-event-key="${escapeHtml(occurrenceKey(event))}">${escapeHtml(label)}</span>`;
}

function renderCalendar(state, events, cursorDate, selectedDate) {
  const today = new Date();
  const first = firstOfMonth(cursorDate);
  const start = addDays(first, -first.getDay());
  const cells = [];
  for (let i = 0; i < 42; i += 1) {
    const d = addDays(start, i);
    const iso = toISO(d);
    const dayEvents = eventForDate(events, iso);
    const holiday = HOLIDAYS[iso];
    const classNames = [
      'jorte-day',
      d.getMonth() !== cursorDate.getMonth() ? 'other' : '',
      d.getDay() === 0 ? 'sun' : '',
      d.getDay() === 6 ? 'sat' : '',
      isSameDay(d, today) ? 'today' : '',
      iso === selectedDate ? 'selected' : '',
      holiday ? 'holiday' : '',
      dayEvents.length ? 'has-event' : ''
    ].filter(Boolean).join(' ');
    cells.push(`<button type="button" class="${classNames}" data-date="${escapeHtml(iso)}" aria-label="${escapeHtml(iso)}">
      <b>${d.getDate()}</b>
      ${holiday ? `<em>${escapeHtml(shortHoliday(holiday))}</em>` : ''}
      <div class="jorte-events">${dayEvents.slice(0, 3).map((event) => eventLine(event, iso)).join('')}${dayEvents.length > 3 ? `<small>+${dayEvents.length - 3}</small>` : ''}</div>
    </button>`);
  }
  return `<section class="jorte-calendar-shell cardless">
    <div class="jorte-monthbar calendar-entry-bar">
      <button id="prevMonth" aria-label="前月">‹</button>
      <h2><span>${escapeHtml(monthTitle(cursorDate))}</span><button id="goTodayMonth" class="today-chip" type="button">今日</button></h2>
      <button id="nextMonth" aria-label="翌月">›</button>
    </div>
    <div class="jorte-week"><span class="sun">日</span><span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span class="sat">土</span></div>
    <div class="jorte-grid">${cells.join('')}</div>
  </section>`;
}

function daysUntilISO(iso) {
  const date = parseISO(iso);
  if (!date) return null;
  const today = new Date();
  const a = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.round((date.getTime() - a) / 86400000);
}
function eventRoute(event) { if (!event) return 'home'; return event.type === 'camp' ? (daysUntilISO(event.start) <= 0 ? 'day' : 'prep') : 'home'; }
function recurrenceLabel(event) {
  if (!event.recurrence || event.recurrence === 'none') return '';
  if (event.recurrence === 'custom_months') return `${event.recurrenceIntervalMonths || 2}ヶ月ごと`;
  if (event.recurrence === 'custom_years') return `${event.recurrenceIntervalYears || 2}年ごと`;
  return RECURRENCE_META[event.recurrence] || '';
}
function timeLabel(event) { return !event.startTime && !event.endTime ? '' : `${event.startTime || ''}${event.endTime ? `-${event.endTime}` : ''}`; }
function reminderLabel(value) { return REMINDER_META[value] || 'なし'; }

function uniqueCampPlans(state) {
  const start = new Date();
  const cursorList = [];
  for (let i = 0; i < 18; i += 1) cursorList.push(new Date(start.getFullYear(), start.getMonth() + i, 1));
  const all = cursorList.flatMap((cursor) => getEvents(state, cursor))
    .filter((event) => event.type === 'camp' && event.end >= toISO(new Date()))
    .sort((a, b) => a.start.localeCompare(b.start));
  const unique = [];
  const seen = new Set();
  all.forEach((event) => { const key = occurrenceKey(event); if (!seen.has(key)) { seen.add(key); unique.push(event); } });
  return unique;
}

function nextPanel(state, event) {
  const campPlans = uniqueCampPlans(state);
  if (!campPlans.length) return '';
  const campList = campPlans.map((plan) => {
    const planRange = plan.start === plan.end ? prettyDate(plan.start) : `${prettyDate(plan.start)}-${prettyDate(plan.end)}`;
    const planCount = daysUntilISO(plan.start);
    const planCountText = planCount === null ? '' : planCount <= 0 ? '今日' : `あと${planCount}日`;
    const planTime = plan.startTime ? ` / ${plan.startTime}${plan.endTime ? `-${plan.endTime}` : ''}` : '';
    return `<button class="next-camp-item unified-camp-item" data-camp-key="${escapeHtml(occurrenceKey(plan))}" type="button"><strong>${escapeHtml(plan.title)}</strong><span>${escapeHtml(planRange)} / キャンプ${escapeHtml(planTime)}${planCountText ? ` / ${escapeHtml(planCountText)}` : ''}</span></button>`;
  }).join('');
  return `<section class="jorte-next-strip cardless next-home-panel next-camp-plans-panel unified-camp-plans-panel">
    <div class="next-panel-head"><p>NEXT</p><span>キャンプ予定 ${campPlans.length}件</span></div>
    <div class="next-camp-box all-camp-plans unified"><div class="next-camp-items">${campList}</div></div>
  </section>`;
}

function activeRecordingPanel(state) {
  const session = state.walkSession;
  if (!session || session.status !== 'active') return '';
  const started = session.startedAt ? new Date(session.startedAt) : null;
  const startedText = started && !Number.isNaN(started.getTime()) ? started.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '';
  const count = Array.isArray(session.records) ? session.records.length : 0;
  const title = session.title || '記録中';
  const typeLabel = { walk: 'コタ散歩', camp: 'キャンプ記録', life: 'メモ' }[session.type] || '記録';
  return `<section class="active-recording-panel cardless">
    <div><p>REC</p><h2>${escapeHtml(title)}</h2><small>${escapeHtml(typeLabel)}${startedText ? ` / ${escapeHtml(startedText)}開始` : ''} / ${count}件</small></div>
    <button id="goActiveRecord" type="button">記録に戻る</button>
  </section>`;
}

function renderTypeOptions(selected) {
  return Object.entries(TYPE_META).map(([key, meta]) => `<option value="${key}" ${selected === key ? 'selected' : ''}>${escapeHtml(meta.label)}</option>`).join('');
}
function renderReminderOptions(selected) {
  return Object.entries(REMINDER_META).map(([key, label]) => `<option value="${key}" ${selected === key ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('');
}
function renderRecurrenceOptions(selected) {
  return Object.entries(RECURRENCE_META).map(([key, label]) => `<option value="${key}" ${selected === key ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('');
}

function selectedDatePanel(state, selectedDate, events) {
  const items = eventForDate(events, selectedDate);
  const open = state.calendarAddOpen ? ' open' : '';
  return `<section class="jorte-detail cardless selected-day-sheet" id="selectedDateDetail">
    <div class="memo-bar"><span>ToDo&amp;メモ</span><strong>${escapeHtml(prettyDate(selectedDate))}</strong></div>
    <div class="day-detail compact-day-detail">
      <div class="selected-day-topline">
        <p>${items.length ? `${items.length}件の予定` : '予定なし'}</p>
        <button id="openDayAdd" class="day-add-button" type="button">＋予定追加</button>
      </div>
      ${items.length ? items.map(renderSelectedEvent).join('') : '<p class="empty-line">日付をタップすると、ここだけ切り替わります。</p>'}
      <details class="jorte-add" id="jorteAddBox"${open}>
        <summary>この日に予定を追加する</summary>
        <div class="calendar-form">
          <input id="eventTitle" class="field" value="" placeholder="予定名 例：キャンプ / コタ病院 / 支払い" />
          <div class="form-grid">
            <select id="eventType" class="field">${renderTypeOptions('normal')}</select>
            <select id="eventReminder" class="field">${renderReminderOptions('none')}</select>
          </div>
          <div class="form-grid">
            <label><span>開始日</span><input id="eventStart" class="field" type="date" value="${escapeHtml(selectedDate)}" /></label>
            <label><span>終了日</span><input id="eventEnd" class="field" type="date" value="${escapeHtml(selectedDate)}" /></label>
          </div>
          <div class="form-grid">
            <label><span>開始時間 任意</span><input id="eventStartTime" class="field" type="time" /></label>
            <label><span>終了時間 任意</span><input id="eventEndTime" class="field" type="time" /></label>
          </div>
          <div class="form-grid recurrence-grid">
            <label><span>繰り返し</span><select id="eventRecurrence" class="field">${renderRecurrenceOptions('none')}</select></label>
            <label><span>数ヶ月/数年おき</span><input id="eventRecurrenceInterval" class="field" type="number" min="2" max="24" value="2" /></label>
          </div>
          <textarea id="eventMemo" class="field textarea compact" placeholder="メモ 例：10:00 / プレゼント準備 / 振込期限"></textarea>
          <button id="saveEvent" class="btn primary">登録する</button>
        </div>
      </details>
    </div>
  </section>`;
}

function findEventByKey(events, key) { return events.find((event) => occurrenceKey(event) === key || event.id === key || event.baseId === key || event.originalId === key); }
function findBaseEvent(state, event) {
  const id = event?.originalId || event?.baseId || event?.id;
  return (state.calendarEvents || []).find((item) => item.id === id || item.baseId === id) || null;
}

function eventDetailPanel(state, events) {
  const key = state.selectedEventDetailKey || state.selectedEventDetailId;
  if (!key) return '';
  const event = findEventByKey(events, key);
  if (!event) return '';
  const meta = TYPE_META[event.type] || TYPE_META.normal;
  const range = event.start === event.end ? prettyDate(event.start) : `${prettyDate(event.start)}-${prettyDate(event.end)}`;
  const time = timeLabel(event);
  const recurrence = recurrenceLabel(event);
  const reminder = reminderLabel(event.reminder);
  return `<section class="event-detail-panel cardless" id="eventDetailPanel">
    <div class="event-detail-head type-${escapeHtml(event.type)}">
      <div><p>登録内容</p><h2>${escapeHtml(event.title)}</h2></div>
      <button id="closeEventDetail" aria-label="詳細を閉じる">×</button>
    </div>
    <div class="event-detail-body">
      <dl>
        <div><dt>種類</dt><dd>${escapeHtml(meta.label)}</dd></div>
        <div><dt>日付</dt><dd>${escapeHtml(range)}</dd></div>
        <div><dt>時間</dt><dd>${time ? escapeHtml(time) : '指定なし'}</dd></div>
        <div><dt>通知</dt><dd>${escapeHtml(reminder)}</dd></div>
        <div><dt>繰り返し</dt><dd>${recurrence ? escapeHtml(recurrence) : 'なし'}</dd></div>
        <div><dt>状態</dt><dd>${event.done ? '完了' : '未完了'}</dd></div>
      </dl>
      ${event.memo ? `<div class="event-detail-memo"><strong>メモ</strong><p>${escapeHtml(event.memo)}</p></div>` : '<p class="empty-line">メモは登録されていません。</p>'}
      ${event.locked ? '' : renderEditBox(event)}
      <div class="event-detail-actions">
        <button class="btn" data-toggle-done="${escapeHtml(event.originalId || event.baseId || event.id)}">${event.done ? '未完了に戻す' : '完了にする'}</button>
        ${event.locked ? '' : renderDeleteButtons(event)}
      </div>
    </div>
  </section>`;
}

function renderDeleteButtons(event) {
  const key = occurrenceKey(event);
  if (event.occurrence && event.recurrence !== 'none') {
    return `<div class="split-actions"><button class="btn danger subtle-danger" data-delete-one="${escapeHtml(key)}">この回だけ削除</button><button class="btn danger" data-delete-series="${escapeHtml(event.originalId || event.baseId || event.id)}">全予定削除</button></div>`;
  }
  return `<button class="btn danger" data-delete-series="${escapeHtml(event.originalId || event.baseId || event.id)}">削除</button>`;
}

function renderEditBox(event) {
  const scopeOptions = event.occurrence && event.recurrence !== 'none'
    ? `<label><span>修正範囲</span><select id="editScope" class="field"><option value="single">この回だけ修正</option><option value="series">全予定を修正</option></select></label>`
    : `<input id="editScope" type="hidden" value="series" />`;
  return `<details class="event-edit-box" open>
    <summary>修正する</summary>
    <div class="calendar-form edit-form">
      ${scopeOptions}
      <input id="editTitle" class="field" value="${escapeHtml(event.title)}" placeholder="予定名" />
      <div class="form-grid"><select id="editType" class="field">${renderTypeOptions(event.type)}</select><select id="editReminder" class="field">${renderReminderOptions(event.reminder)}</select></div>
      <div class="form-grid"><label><span>開始日</span><input id="editStart" class="field" type="date" value="${escapeHtml(event.start)}" /></label><label><span>終了日</span><input id="editEnd" class="field" type="date" value="${escapeHtml(event.end)}" /></label></div>
      <div class="form-grid"><label><span>開始時間 任意</span><input id="editStartTime" class="field" type="time" value="${escapeHtml(event.startTime)}" /></label><label><span>終了時間 任意</span><input id="editEndTime" class="field" type="time" value="${escapeHtml(event.endTime)}" /></label></div>
      <div class="form-grid recurrence-grid"><label><span>繰り返し</span><select id="editRecurrence" class="field">${renderRecurrenceOptions(event.recurrence)}</select></label><label><span>数ヶ月/数年おき</span><input id="editRecurrenceInterval" class="field" type="number" min="2" max="24" value="${escapeHtml(event.recurrence === 'custom_years' ? event.recurrenceIntervalYears : event.recurrenceIntervalMonths)}" /></label></div>
      <textarea id="editMemo" class="field textarea compact" placeholder="メモ">${escapeHtml(event.memo)}</textarea>
      <button id="saveEventEdit" class="btn primary" data-edit-key="${escapeHtml(occurrenceKey(event))}">修正を保存</button>
    </div>
  </details>`;
}

function renderSelectedEvent(event) {
  const meta = TYPE_META[event.type] || TYPE_META.normal;
  const range = event.start === event.end ? prettyDate(event.start) : `${prettyDate(event.start)}-${prettyDate(event.end)}`;
  const time = timeLabel(event);
  const recurrence = recurrenceLabel(event);
  const key = occurrenceKey(event);
  return `<div class="jorte-detail-event type-${escapeHtml(event.type)} ${event.done ? 'done' : ''}">
    <button class="done-toggle" data-toggle-done="${escapeHtml(event.originalId || event.baseId || event.id)}" aria-label="完了切替">${event.done ? '済' : '□'}</button>
    <div class="event-label-button">
      <strong>${escapeHtml(event.title)}</strong>
      <small>${escapeHtml(range)}${time ? ` / ${escapeHtml(time)}` : ''} / ${escapeHtml(meta.label)}${event.reminder !== 'none' ? ` / 通知:${reminderLabel(event.reminder)}` : ''}${recurrence ? ` / ${escapeHtml(recurrence)}` : ''}</small>
      ${event.memo ? `<p>${escapeHtml(event.memo)}</p>` : ''}
    </div>
    ${event.locked ? '' : `<button class="edit-event" data-show-event-detail="${escapeHtml(key)}">修正</button>`}
  </div>`;
}

function readEventForm(prefix, fallback = {}) {
  const title = document.getElementById(`${prefix}Title`)?.value?.trim() || '';
  const type = document.getElementById(`${prefix}Type`)?.value || fallback.type || 'normal';
  const start = document.getElementById(`${prefix}Start`)?.value || fallback.start || '';
  const rawEnd = document.getElementById(`${prefix}End`)?.value || start;
  const recurrenceRaw = document.getElementById(`${prefix}Recurrence`)?.value || fallback.recurrence || 'none';
  const interval = Math.max(2, Math.min(24, Number(document.getElementById(`${prefix}RecurrenceInterval`)?.value || 2)));
  const recurrence = normalizeRecurrence(type === 'birthday' && recurrenceRaw === 'none' ? 'yearly' : recurrenceRaw);
  return {
    title: title || TYPE_META[type]?.label || '予定',
    type: normalizeType(type),
    start,
    end: clampEnd(start, rawEnd),
    startTime: document.getElementById(`${prefix}StartTime`)?.value || '',
    endTime: document.getElementById(`${prefix}EndTime`)?.value || '',
    reminder: document.getElementById(`${prefix}Reminder`)?.value || 'none',
    recurrence,
    recurrenceIntervalMonths: interval,
    recurrenceIntervalYears: Math.max(2, Math.min(20, interval)),
    yearly: recurrence === 'yearly',
    memo: document.getElementById(`${prefix}Memo`)?.value?.trim() || ''
  };
}

function navigateMonth(cursorDate, diff) {
  const next = new Date(cursorDate.getFullYear(), cursorDate.getMonth() + diff, 1);
  patchState({ calendarCursor: monthKey(next), calendarAddOpen: false });
  renderHome();
}

function saveEventFromForm() {
  const form = readEventForm('event');
  if (!form.start) return toast('日付が未選択です');
  const event = { id: `event_${Date.now()}`, baseId: '', ...form, createdAt: new Date().toISOString(), exceptionDates: [] };
  event.baseId = event.id;
  const state = getState();
  patchState({ calendarEvents: [...(state.calendarEvents || []), event], selectedDate: form.start, calendarCursor: monthKey(parseISO(form.start) || new Date()), calendarAddOpen: false, selectedEventDetailKey: occurrenceKey(event) });
  toast('予定を追加しました');
  if (form.reminder !== 'none') requestNotificationPermission();
  renderHome();
}

function projectDateText(start, end) {
  const s = String(start || '').replaceAll('-', '/');
  const e = String(end || start || '').replaceAll('-', '/');
  return s === e ? s : `${s}〜${e}`;
}

function updateNextProjectFromForm(form) {
  const state = getState();
  const current = state.nextProject || {};
  const reservation = {
    ...(current.reservation || {}),
    campground: form.title || current.reservation?.campground || current.title || 'キャンプ予定',
    dateText: projectDateText(form.start, form.end),
    checkIn: form.startTime || current.reservation?.checkIn || '',
    checkOut: form.endTime || current.reservation?.checkOut || ''
  };
  patchState({
    nextProject: {
      ...current,
      title: reservation.campground,
      reservation,
      done: Boolean(form.done),
      updatedAt: new Date().toISOString()
    },
    selectedDate: form.start,
    calendarCursor: monthKey(parseISO(form.start) || new Date()),
    selectedEventDetailKey: `nextProject@${form.start}`,
    selectedEventDetailId: ''
  });
}

function updateSeries(baseId, form) {
  if (baseId === 'nextProject') return updateNextProjectFromForm(form);
  const state = getState();
  patchState({
    calendarEvents: (state.calendarEvents || []).map((event) => {
      if (event.id !== baseId && event.baseId !== baseId) return event;
      return { ...event, ...form, id: event.id || baseId, baseId: event.baseId || event.id || baseId, updatedAt: new Date().toISOString() };
    }),
    selectedDate: form.start,
    calendarCursor: monthKey(parseISO(form.start) || new Date()),
    selectedEventDetailKey: ''
  });
}

function updateSingleOccurrence(event, form) {
  const state = getState();
  const base = findBaseEvent(state, event);
  if (!base) return updateSeries(event.baseId || event.id, form);
  const occurrenceDate = event.occurrenceDate || event.start;
  const oneOff = { ...form, id: `event_${Date.now()}`, baseId: `event_${Date.now()}_single`, recurrence: 'none', yearly: false, createdAt: new Date().toISOString(), exceptionDates: [] };
  oneOff.baseId = oneOff.id;
  patchState({
    calendarEvents: [
      ...(state.calendarEvents || []).map((item) => item.id === base.id || item.baseId === base.baseId ? { ...item, exceptionDates: [...new Set([...(item.exceptionDates || []), occurrenceDate])] } : item),
      oneOff
    ],
    selectedDate: form.start,
    calendarCursor: monthKey(parseISO(form.start) || new Date()),
    selectedEventDetailKey: occurrenceKey(oneOff)
  });
}

function saveEventEdit(eventKey) {
  const state = getState();
  const cursor = parseISO(state.calendarCursor) || new Date();
  const events = getEvents(state, cursor);
  const event = findEventByKey(events, eventKey);
  if (!event || event.locked) return;
  const form = readEventForm('edit', event);
  if (!form.start) return toast('日付が未選択です');
  const scope = document.getElementById('editScope')?.value || 'series';
  if (scope === 'single' && event.occurrence && event.recurrence !== 'none') {
    updateSingleOccurrence(event, { ...event, ...form, locked: false, done: event.done });
    toast('この回だけ修正しました');
  } else {
    updateSeries(event.originalId || event.baseId || event.id, { ...form, locked: false, done: event.done, exceptionDates: event.exceptionDates || [] });
    toast('全予定を修正しました');
  }
  if (form.reminder !== 'none') requestNotificationPermission();
  renderHome();
}

function deleteSeries(eventId) {
  const state = getState();
  if (eventId === 'nextProject') {
    const title = state.nextProject?.reservation?.campground || state.nextProject?.title || 'このキャンプ予定';
    if (!window.confirm(`${title} を削除しますか？`)) return;
    patchState({ nextProject: null, selectedEventDetailKey: '', selectedEventDetailId: '' });
    toast('キャンプ予定を削除しました');
    renderHome();
    return;
  }
  const target = (state.calendarEvents || []).find((event) => event.id === eventId || event.baseId === eventId);
  const title = target?.title || 'この予定';
  if (!window.confirm(`${title} を削除しますか？`)) return;
  patchState({ calendarEvents: (state.calendarEvents || []).filter((event) => event.id !== eventId && event.baseId !== eventId), selectedEventDetailKey: '', selectedEventDetailId: '' });
  toast('予定を削除しました');
  renderHome();
}

function deleteOneOccurrence(eventKey) {
  const state = getState();
  const cursor = parseISO(state.calendarCursor) || new Date();
  const event = findEventByKey(getEvents(state, cursor), eventKey);
  if (!event) return;
  if (!window.confirm(`${event.title} のこの回だけ削除しますか？`)) return;
  const baseId = event.originalId || event.baseId || event.id;
  const occurrenceDate = event.occurrenceDate || event.start;
  patchState({
    calendarEvents: (state.calendarEvents || []).map((item) => item.id === baseId || item.baseId === baseId ? { ...item, exceptionDates: [...new Set([...(item.exceptionDates || []), occurrenceDate])] } : item),
    selectedEventDetailKey: '',
    selectedEventDetailId: ''
  });
  toast('この回だけ削除しました');
  renderHome();
}

function toggleDone(eventId) {
  const state = getState();
  if (eventId === 'nextProject' && state.nextProject) {
    patchState({ nextProject: { ...state.nextProject, done: !state.nextProject.done } });
    renderHome();
    return;
  }
  patchState({ calendarEvents: (state.calendarEvents || []).map((event) => event.id === eventId || event.baseId === eventId ? { ...event, done: !event.done } : event) });
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
  const offsets = { month_before: -30, two_weeks_before: -14, week_before: -7, three_days_before: -3, day_before: -1, same_day: 0 };
  return toISO(addDays(start, offsets[event.reminder] ?? 0));
}

function checkDueReminders(force = false) {
  const state = getState();
  const events = getEvents(state, new Date());
  const today = toISO(new Date());
  const notified = state.calendarReminderNotified || {};
  const due = events.filter((event) => reminderDueDate(event) === today);
  due.forEach((event) => {
    const key = `${occurrenceKey(event)}_${event.reminder}_${today}`;
    if (!force && notified[key]) return;
    notified[key] = true;
    toast(`予定通知：${event.title}`);
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('OUTBASE 予定通知', { body: `${prettyDate(event.start)} ${event.startTime ? `${event.startTime} ` : ''}${event.title}` });
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

function focusSelectedDetail(openAdd = false) {
  const details = document.getElementById('jorteAddBox');
  if (details && openAdd) details.open = true;
  document.getElementById('selectedDateDetail')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function campPlansPanel(state) {
  const start = new Date();
  const cursorList = [];
  for (let i = 0; i < 18; i += 1) cursorList.push(new Date(start.getFullYear(), start.getMonth() + i, 1));
  const all = cursorList.flatMap((cursor) => getEvents(state, cursor))
    .filter((event) => event.type === 'camp' && event.end >= toISO(new Date()))
    .sort((a, b) => a.start.localeCompare(b.start));
  const unique = [];
  const seen = new Set();
  all.forEach((event) => { const key = occurrenceKey(event); if (!seen.has(key)) { seen.add(key); unique.push(event); } });
  return `<section class="camp-plan-list cardless" id="campPlanList">
    <div class="camp-plan-head"><p>HOME</p><h2>キャンプ予定</h2><span>${unique.length}</span></div>
    ${unique.length ? `<div class="camp-plan-items">${unique.map((event) => `<button class="camp-plan-item" data-camp-key="${escapeHtml(occurrenceKey(event))}"><strong>${escapeHtml(event.title)}</strong><span>${escapeHtml(event.start === event.end ? prettyDate(event.start) : `${prettyDate(event.start)}-${prettyDate(event.end)}`)}</span></button>`).join('')}</div>` : '<p class="empty-line">キャンプ予定はまだありません。</p>'}
  </section>`;
}

export function renderHome() {
  const state = getState();
  const projectEvent = derivedProjectEvent(state.nextProject);
  const defaultCursor = parseISO(state.calendarCursor) || parseISO(state.selectedDate) || parseISO(projectEvent?.start) || new Date();
  const cursorDate = firstOfMonth(defaultCursor);
  const events = getEvents({ ...state, calendarCursor: monthKey(cursorDate) }, cursorDate);
  const campPlans = uniqueCampPlans({ ...state, calendarCursor: monthKey(cursorDate) });
  const upcoming = campPlans[0] || upcomingEvents(events)[0] || projectEvent;
  const selectedDate = state.selectedDate || toISO(new Date());

  app().innerHTML = [
    renderCalendar(state, events, cursorDate, selectedDate),
    activeRecordingPanel(state),
    selectedDatePanel(state, selectedDate, events),
    eventDetailPanel(state, events),
    nextPanel({ ...state, calendarCursor: monthKey(cursorDate) }, upcoming)
  ].join('');

  checkDueReminders(false);

  document.getElementById('prevMonth')?.addEventListener('click', () => navigateMonth(cursorDate, -1));
  document.getElementById('nextMonth')?.addEventListener('click', () => navigateMonth(cursorDate, 1));
  document.getElementById('goTodayMonth')?.addEventListener('click', () => { patchState({ calendarCursor: monthKey(new Date()), selectedDate: toISO(new Date()), calendarAddOpen: false }); renderHome(); });
  document.getElementById('openDayAdd')?.addEventListener('click', () => { patchState({ calendarAddOpen: true }); renderHome(); window.setTimeout(() => focusSelectedDetail(true), 50); });
  document.getElementById('saveEvent')?.addEventListener('click', saveEventFromForm);
  document.getElementById('saveEventEdit')?.addEventListener('click', (event) => saveEventEdit(event.currentTarget.dataset.editKey));
  document.getElementById('goNextTask')?.addEventListener('click', () => go(eventRoute(upcoming)));
  document.getElementById('goActiveRecord')?.addEventListener('click', () => go('walk'));
  document.getElementById('scrollSelectedDetail')?.addEventListener('click', () => focusSelectedDetail(false));
  function selectCalendarCell(iso) {
    if (!iso) return;
    const sameDate = getState().selectedDate === iso;
    patchState({ selectedDate: iso, calendarCursor: monthKey(parseISO(iso) || cursorDate), calendarAddOpen: sameDate, selectedEventDetailKey: '', selectedEventDetailId: '' });
    renderHome();
    if (sameDate) window.setTimeout(() => focusSelectedDetail(true), 50);
  }
  document.querySelector('.jorte-grid')?.addEventListener('click', (event) => {
    const cell = event.target.closest?.('.jorte-day[data-date]');
    if (!cell) return;
    selectCalendarCell(cell.dataset.date);
  });
  document.querySelectorAll('[data-date]').forEach((button) => {
    button.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectCalendarCell(button.dataset.date);
      }
    });
  });
  document.querySelectorAll('[data-detail-date]').forEach((el) => el.addEventListener('click', (event) => {
    event.stopPropagation();
    const iso = el.dataset.detailDate;
    patchState({ selectedDate: iso, calendarCursor: monthKey(parseISO(iso) || cursorDate), calendarAddOpen: false, selectedEventDetailKey: '', selectedEventDetailId: '' });
    renderHome();
  }));
  document.querySelectorAll('[data-show-event-detail]').forEach((button) => button.addEventListener('click', () => {
    patchState({ selectedEventDetailKey: button.dataset.showEventDetail, selectedEventDetailId: '', calendarAddOpen: false });
    renderHome();
    window.setTimeout(() => document.getElementById('eventDetailPanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }));
  document.querySelectorAll('[data-camp-key]').forEach((button) => button.addEventListener('click', () => {
    patchState({ selectedEventDetailKey: button.dataset.campKey, selectedEventDetailId: '', calendarAddOpen: false });
    renderHome();
    window.setTimeout(() => document.getElementById('eventDetailPanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }));
  document.getElementById('closeEventDetail')?.addEventListener('click', () => { patchState({ selectedEventDetailKey: '', selectedEventDetailId: '' }); renderHome(); });
  document.querySelectorAll('[data-delete-series]').forEach((button) => button.addEventListener('click', () => deleteSeries(button.dataset.deleteSeries)));
  document.querySelectorAll('[data-delete-one]').forEach((button) => button.addEventListener('click', () => deleteOneOccurrence(button.dataset.deleteOne)));
  document.querySelectorAll('[data-toggle-done]').forEach((button) => button.addEventListener('click', () => toggleDone(button.dataset.toggleDone)));
  bindSwipe(document.querySelector('.jorte-calendar-shell'), cursorDate);
}
