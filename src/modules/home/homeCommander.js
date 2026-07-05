import { escapeHtml } from '../../ui/components.js?v=core08-b-home-commander-20260705';
import { getState, patchState } from '../../core/store.js?v=core08-b-home-commander-20260705';
import { go } from '../../core/router.js?v=core08-b-home-commander-20260705';

let observerStarted = false;
let rendering = false;

function pad(num) { return String(num).padStart(2, '0'); }
function toISO(date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; }
function parseISO(value) {
  const match = String(value || '').match(/(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}
function parseProjectDate(project = {}) {
  const text = [project?.reservation?.dateText, project?.start, project?.title].filter(Boolean).join(' ');
  return parseISO(text);
}
function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
function daysUntil(date) {
  if (!date) return null;
  return Math.round((date.getTime() - startOfToday().getTime()) / 86400000);
}
function compactDate(date) {
  if (!date) return '日程未設定';
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
function normalizeTitle(value = '') {
  return String(value || '').replace(/キャンプ予定|準備中|予約/g, '').replace(/[\s　・･ー\-_/／～〜~]/g, '').toLowerCase();
}
function projectName(project = {}) {
  return project?.reservation?.campground || project?.title || '次のキャンプ';
}
function exactPlanKey(plan) {
  const iso = plan.date ? toISO(plan.date) : 'date-unknown';
  return `${plan.id || ''}:${normalizeTitle(plan.title)}:${iso}`;
}
function campPlans(state = {}) {
  const today = startOfToday().getTime();
  const plans = [];
  if (state.nextProject) {
    const date = parseProjectDate(state.nextProject);
    plans.push({
      id: state.nextProject.id || 'nextProject',
      source: 'nextProject',
      title: projectName(state.nextProject),
      date,
      route: 'prep',
      protected: true
    });
  }
  (state.calendarEvents || []).forEach((event) => {
    if (event?.type !== 'camp') return;
    const date = parseISO(event.start || event.end || '');
    plans.push({
      id: event.id || event.baseId || `camp_${event.start}_${event.title}`,
      source: 'calendar',
      title: event.title || 'キャンプ予定',
      date,
      route: 'prep',
      protected: Boolean(event.id || event.baseId)
    });
  });
  const unique = [];
  const seen = new Set();
  plans
    .filter((plan) => !plan.date || plan.date.getTime() >= today)
    .sort((a, b) => (a.date?.getTime?.() || Number.MAX_SAFE_INTEGER) - (b.date?.getTime?.() || Number.MAX_SAFE_INTEGER))
    .forEach((plan) => {
      const key = exactPlanKey(plan);
      if (seen.has(key)) return;
      seen.add(key);
      unique.push(plan);
    });
  return unique.slice(0, 6);
}
function todaysEvents(state = {}) {
  const today = toISO(new Date());
  return (state.calendarEvents || []).filter((event) => {
    const start = String(event.start || '').slice(0, 10);
    const end = String(event.end || start).slice(0, 10);
    return start <= today && today <= end;
  });
}
function activeRecordingSummary(state = {}) {
  const session = state.walkSession;
  if (!session || session.status !== 'active') return null;
  const count = Array.isArray(session.records) ? session.records.length : 0;
  const type = { walk: '散歩', camp: 'キャンプ記録', life: 'メモ' }[session.type] || '記録';
  return `${type} / ${count}件`;
}
function nextActionList(state, nextCamp) {
  const active = activeRecordingSummary(state);
  if (active) return [
    { label: '記録に戻る', action: 'walk', sub: active },
    { label: '今日の予定を見る', action: 'today', sub: 'カレンダー確認' },
    { label: '思い出へ送る', action: 'memory', sub: 'あとで振り返る' }
  ];
  if (nextCamp) return [
    { label: '準備を進める', action: 'prep', sub: nextCamp.title },
    { label: '当日画面を確認', action: 'day', sub: '進行・記録の入口' },
    { label: '候補を探す', action: 'search', sub: '次回キャンプ候補' }
  ];
  return [
    { label: '予定を確認', action: 'today', sub: '今日のカレンダー' },
    { label: '候補を探す', action: 'search', sub: 'キャンプ・散歩候補' },
    { label: '記録を始める', action: 'walk', sub: '散歩・キャンプ記録' }
  ];
}
function guardSummary(state = {}) {
  const guard = state.dataGuard || {};
  const conflicts = Array.isArray(guard.conflicts) ? guard.conflicts.length : 0;
  const backups = Array.isArray(guard.backups) ? guard.backups.length : 0;
  return { conflicts, backups, label: conflicts ? `確認${conflicts}` : '保護ON' };
}
function renderCommander(state) {
  const plans = campPlans(state);
  const nextCamp = plans[0];
  const count = daysUntil(nextCamp?.date);
  const countText = count === null ? '日程待ち' : count <= 0 ? '今日' : `あと${count}日`;
  const todayCount = todaysEvents(state).length;
  const active = activeRecordingSummary(state);
  const guard = guardSummary(state);
  const actions = nextActionList(state, nextCamp);
  return `<section id="homeCommander" class="home-command-center" aria-label="ホーム司令塔">
    <div class="home-command-hero">
      <div>
        <p>HOME COMMAND</p>
        <h2>${escapeHtml(nextCamp?.title || '今日のOUTBASE')}</h2>
        <span>${escapeHtml(nextCamp ? `${compactDate(nextCamp.date)} / ${countText}` : '予定・記録・準備の入口')}</span>
      </div>
      <button type="button" class="home-command-main" data-home-action="${nextCamp ? 'prep' : 'today'}">${nextCamp ? '準備へ' : '今日を見る'}</button>
    </div>
    <div class="home-command-stats">
      <button type="button" data-home-action="today"><span>今日</span><strong>${todayCount}件</strong></button>
      <button type="button" data-home-action="prep"><span>キャンプ</span><strong>${plans.length}件</strong></button>
      <button type="button" data-home-action="guard"><span>データ</span><strong>${escapeHtml(guard.label)}</strong></button>
    </div>
    <div class="home-command-actions">
      ${actions.map((item) => `<button type="button" data-home-action="${escapeHtml(item.action)}"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.sub)}</span></button>`).join('')}
    </div>
    ${plans.length ? `<div class="home-command-camps">${plans.slice(0, 3).map((plan) => `<button type="button" data-home-camp="${escapeHtml(plan.id)}"><strong>${escapeHtml(plan.title)}</strong><span>${escapeHtml(compactDate(plan.date))}${plan.protected ? ' / ID保護' : ''}</span></button>`).join('')}</div>` : ''}
    ${active ? `<div class="home-command-live"><strong>記録中</strong><span>${escapeHtml(active)}</span><button type="button" data-home-action="walk">戻る</button></div>` : ''}
    <p class="home-command-note">予定・記録は自動修正せず、変更は履歴とバックアップに残します。</p>
  </section>`;
}
function chooseCamp(campId) {
  const state = getState();
  const plan = campPlans(state).find((item) => item.id === campId);
  if (plan) patchState({ selectedPrepProjectId: plan.id });
  go('prep');
}
function handleAction(action) {
  const today = toISO(new Date());
  if (action === 'prep') return go('prep');
  if (action === 'walk') return go('walk');
  if (action === 'day') return go('day');
  if (action === 'memory') return go('memory');
  if (action === 'search') return go('search');
  if (action === 'today') {
    patchState({ selectedDate: today, calendarCursor: `${today.slice(0, 7)}-01`, calendarAddOpen: false });
    go('home');
    window.setTimeout(() => document.getElementById('selectedDateDetail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    return null;
  }
  if (action === 'guard') {
    window.setTimeout(() => document.getElementById('homeCommander')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 20);
    return null;
  }
  return null;
}
function bindCommander(root) {
  if (!root || root.dataset.homeCommanderBound === 'true') return;
  root.dataset.homeCommanderBound = 'true';
  root.addEventListener('click', (event) => {
    const campButton = event.target.closest('[data-home-camp]');
    if (campButton && root.contains(campButton)) {
      event.preventDefault();
      chooseCamp(campButton.dataset.homeCamp);
      return;
    }
    const actionButton = event.target.closest('[data-home-action]');
    if (!actionButton || !root.contains(actionButton)) return;
    event.preventDefault();
    handleAction(actionButton.dataset.homeAction);
  });
}
export function enhanceHomeCommander() {
  const state = getState();
  const root = document.getElementById('app');
  if (!root) return;
  const existing = document.getElementById('homeCommander');
  if (state.currentRoute !== 'home') {
    existing?.remove();
    return;
  }
  const html = renderCommander(state);
  rendering = true;
  if (existing) existing.outerHTML = html;
  else root.insertAdjacentHTML('afterbegin', html);
  bindCommander(document.getElementById('homeCommander'));
  rendering = false;
  window.OUTBASE_SYNC_BOTTOM_SPACE?.();
}
export function initHomeCommander() {
  if (observerStarted) return;
  observerStarted = true;
  const root = document.getElementById('app');
  if (!root) return;
  const observer = new MutationObserver(() => {
    if (rendering) return;
    window.requestAnimationFrame(enhanceHomeCommander);
  });
  observer.observe(root, { childList: true });
  window.requestAnimationFrame(enhanceHomeCommander);
}
