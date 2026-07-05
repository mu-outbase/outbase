const BUILD_ID = 'core0610-calendar-product-recovery-20260705';
const STORAGE_KEY = 'outbase_core0610_product_state';
const LEGACY_KEYS = ['outbase_core08_f1_state', 'outbase_core08_e3_state', 'OUTBASE_STATE', 'outbase_state'];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const app = $('#app');
const title = $('#appTitle');
const statusPill = $('#statusPill');
const todayISO = () => toISO(new Date());
const pad = (n) => String(n).padStart(2, '0');
function toISO(date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; }
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
function parseDate(value) {
  if (!value) return null;
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}
function fmtDate(value) {
  const d = parseDate(value);
  if (!d) return '日程未定';
  return `${d.getMonth() + 1}/${d.getDate()}(${['日','月','火','水','木','金','土'][d.getDay()]})`;
}
function esc(value = '') { return String(value ?? '').replace(/[&<>'"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[m])); }
function uid(prefix) { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }
function daysUntil(value) {
  const d = parseDate(value);
  if (!d) return null;
  const today = parseDate(todayISO());
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}
function rangeDates(start, end) {
  const a = parseDate(start); const b = parseDate(end || start);
  if (!a || !b) return [];
  const out = [];
  for (let d = new Date(a); d <= b; d = addDays(d, 1)) out.push(toISO(d));
  return out;
}
function humanTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getMonth()+1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const MODE_LIBRARY = {
  walkHome: {
    label: '自宅散歩', stage: '記録', first: '地図・距離・時間・コタの様子を中心に残す',
    buttons: ['写真', '声', 'メモ', 'GPS', 'コタ', '終了'], auto: ['開始時刻', 'GPS', '距離', '天気候補'], next: ['暑さ寒さ対策', '足元注意', '散歩コース改善']
  },
  drive: {
    label: 'ドライブ', stage: '往路/帰路', first: '運転中は操作させず、Google Maps・給油・買い出し・休憩だけを候補化',
    buttons: ['Google Maps', '給油', '買い出し', '休憩', 'コタ休憩', '到着'], auto: ['移動開始候補', 'GPS', '停車候補', '到着時刻'], next: ['出発時間', '経由地', '買い出し場所', '渋滞回避']
  },
  setup: {
    label: '設営', stage: '当日', first: 'レイアウト→テント→タープ→寝室→リビング→外回りの順に段取りを見せる',
    buttons: ['開始', 'レイアウト', 'テント', 'タープ', '寝室', '完了'], auto: ['開始時刻', '完了時刻', '写真', '風メモ'], next: ['設営順', '足りない道具', '風対策', 'レイアウト改善']
  },
  cook: {
    label: '料理', stage: '滞在', first: '予定メニューを見ながら、写真・量・味・余り・失敗を残す',
    buttons: ['写真', '量', '味', '余り', '失敗', '次回'], auto: ['料理時間', '写真', '人数', '余り候補'], next: ['量調整', '買い物量', '調味料', '次回メニュー']
  },
  teardown: {
    label: '撤収', stage: '帰宅前', first: '濡れ物・乾燥・収納・忘れ物・積載・ゴミを順番に確認',
    buttons: ['開始', '濡れ物', '乾燥', '収納', '忘れ物', '完了'], auto: ['撤収開始', '完了時刻', '天気', '乾燥候補'], next: ['乾燥サービス', '収納順', '忘れ物防止', '帰宅後片付け']
  },
  campWalk: {
    label: 'キャンプ場散歩', stage: '滞在', first: 'キャンプ滞在の子記録。場内ルート、設備、景色、犬連れ目線を地図中心で残す',
    buttons: ['写真', 'GPS', '設備', '景色', '注意', '終了'], auto: ['GPS', '距離', '場内地点', '写真時刻'], next: ['サイト選び', '水場/トイレ評価', 'ドッグラン', 'レビュー素材']
  },
  fieldExplore: {
    label: '場内探索', stage: '滞在', first: 'サイト周辺・施設・景色・騒音・地面・傾斜を確認して次回サイト選びへ戻す',
    buttons: ['設備', '水場', 'トイレ', '売店', '地面', '犬目線'], auto: ['GPS', '写真', '注意点'], next: ['次回サイト指定', '犬連れ注意', 'レビュー']
  }
};

const DAY_STEPS = [
  { id: 'before', label: '出発前', sub: '積み込み・コタ・天気・買い物確認', mode: '準備' },
  { id: 'driveOut', label: '往路', sub: 'Google Maps、給油、買い出し、休憩', mode: 'ドライブ', activity: 'drive' },
  { id: 'arrival', label: '到着受付', sub: '到着・受付・サイト移動・注意事項', mode: '受付' },
  { id: 'layout', label: 'レイアウト', sub: '風・傾斜・導線・コタの居場所', mode: '設営前' },
  { id: 'setup', label: '設営', sub: 'テント、タープ、寝室、リビング、外回り', mode: '設営', activity: 'setup' },
  { id: 'stay', label: '滞在', sub: '散歩、場内探索、休憩、写真', mode: '滞在' },
  { id: 'cook', label: '料理', sub: '予定メニュー、量、味、余り、次回', mode: '料理', activity: 'cook' },
  { id: 'sleep', label: '就寝/翌朝', sub: '寝室、灯り、寒暖、朝食、朝散歩', mode: '夜朝' },
  { id: 'teardown', label: '撤収', sub: '濡れ物、乾燥、収納、忘れ物、積載', mode: '撤収', activity: 'teardown' },
  { id: 'driveHome', label: '帰路', sub: '観光、休憩、渋滞、帰宅予定差分', mode: 'ドライブ', activity: 'drive' },
  { id: 'afterHome', label: '帰宅後', sub: '荷下ろし、乾燥、洗い物、充電、補充', mode: '片付け' }
];

const PREP_GROUPS = [
  { key: 'shopping', label: '買い物', items: ['肉・主菜', '野菜', 'チーズ/乳製品', '調味料', '飲み物', '買わない物確認'] },
  { key: 'meal', label: '料理', items: ['1日目夜', '翌朝', '量が多すぎないか', '友人分', 'コタ不可食材', '次回調整メモ'] },
  { key: 'gear', label: 'ギア', items: ['テント/タープ', '寝具', '照明', '電源/EcoFlow', '雨対策', '乾燥対象'] },
  { key: 'kota', label: 'コタ', items: ['水', 'フード', '散歩用品', '暑さ寒さ', '寝床', '足拭き'] },
  { key: 'route', label: 'ルート', items: ['出発時刻', '給油', '買い出し', '休憩', 'Google Maps', '帰り候補'] },
  { key: 'weather', label: '天気', items: ['雨', '風', '気温', '乾燥判断', '服装/冷暖房', '撤収判断'] }
];

const SEARCH_CANDIDATES = [
  { id: 'dogfree', title: 'ドッグフリーサイト優先', tags: ['犬可', '区画', '安心'], memo: 'コタが落ち着けるか、柵・地面・隣接距離を確認。' },
  { id: 'hotwater', title: '冬は温水・乾燥重視', tags: ['温水', '乾燥', '撤収'], memo: '雨撤収や冬キャンプの負担を下げる候補。' },
  { id: 'view', title: '景色が良い候補', tags: ['景色', '写真', '思い出'], memo: '写真・レビュー素材として残しやすい場所。' },
  { id: 'distance', title: '自宅から4時間以内', tags: ['距離', '下り', '休憩'], memo: '柏からの移動負担、給油・休憩をセットで考える。' }
];

function defaultState() {
  const now = new Date();
  const cursor = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
  return {
    version: BUILD_ID,
    route: 'plans',
    calendarCursor: cursor,
    selectedDate: todayISO(),
    activeDayStep: 'before',
    selectedPlanId: '',
    activeActivity: null,
    protectedMessage: '予定・記録・写真・メモ・GPS・コタ情報は勝手に上書き/削除しない',
    plans: [
      { id: 'past_akagi_20260626', title: 'スノーピーク赤城山CF', start: '2026-06-26', end: '2026-06-27', status: '記録候補', checkin: '13:00', checkout: '11:00', members: '夫婦＋コタ＋友人夫婦', note: 'Lake Lodge YAMANAKAキャンセル後の予定。梅雨・乾燥サービス重視。' }
    ],
    prepDone: {},
    records: [],
    unresolved: [],
    improvements: [],
    candidates: [],
    audit: []
  };
}

function migrateLegacy() {
  const base = defaultState();
  try {
    for (const key of LEGACY_KEYS) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const old = JSON.parse(raw);
      if (Array.isArray(old?.plans)) return { ...base, ...old, route: 'plans', version: BUILD_ID };
      const plans = [];
      if (old?.nextProject) {
        const project = old.nextProject;
        const res = project.reservation || {};
        plans.push({
          id: project.id || 'migrated_next_project',
          title: res.campground || project.title || '次のキャンプ',
          start: String(res.dateText || project.start || '').match(/20\d{2}[-/]\d{1,2}[-/]\d{1,2}/)?.[0]?.replace(/\//g, '-') || todayISO(),
          end: String(res.dateText || project.end || project.start || '').match(/20\d{2}[-/]\d{1,2}[-/]\d{1,2}/)?.[0]?.replace(/\//g, '-') || todayISO(),
          status: '移行予定', checkin: res.checkin || '', checkout: res.checkout || '', members: res.members || '', note: res.memo || project.memo || ''
        });
      }
      if (Array.isArray(old?.calendarEvents)) {
        old.calendarEvents.filter((e) => e?.type === 'camp' || /キャンプ|camp/i.test(e?.title || '')).forEach((e) => plans.push({
          id: e.id || uid('legacy'), title: e.title || 'キャンプ予定', start: String(e.start || todayISO()).slice(0, 10), end: String(e.end || e.start || todayISO()).slice(0, 10), status: '移行予定', checkin: '', checkout: '', members: '', note: e.memo || ''
        }));
      }
      if (plans.length || Array.isArray(old?.recordHistory)) {
        return { ...base, plans: dedupePlans([...plans, ...base.plans]), records: Array.isArray(old?.recordHistory) ? old.recordHistory.map((r) => ({ id: r.session_id || uid('old'), type: r.type || '記録', title: r.title || '旧記録', detail: `${r.parentTitle || ''} ${r.locationLabel || ''}`.trim(), at: r.startedAt || new Date().toISOString(), status: '移行' })) : base.records, route: 'plans', version: BUILD_ID };
      }
    }
  } catch (error) { console.warn('legacy migration failed', error); }
  return base;
}
function dedupePlans(plans) {
  const seen = new Set();
  return plans.filter((p) => {
    const key = `${p.title}_${p.start}_${p.end}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}

let state = loadState();
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved?.version) return { ...defaultState(), ...saved, route: saved.route || 'plans' };
  } catch (error) { console.warn(error); }
  const migrated = migrateLegacy();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
  return migrated;
}
function saveState() {
  state.version = BUILD_ID;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function patch(patch) { state = { ...state, ...patch }; saveState(); render(); }
function audit(message) { state.audit = [{ id: uid('audit'), at: new Date().toISOString(), message }, ...(state.audit || [])].slice(0, 40); saveState(); }

function plansSorted() {
  return [...(state.plans || [])].sort((a, b) => (parseDate(a.start)?.getTime() || 0) - (parseDate(b.start)?.getTime() || 0));
}
function futurePlans() { const t = parseDate(todayISO()).getTime(); return plansSorted().filter((p) => (parseDate(p.end || p.start)?.getTime() || 0) >= t); }
function nextPlan() { return futurePlans()[0] || null; }
function selectedPlan() { return state.plans.find((p) => p.id === state.selectedPlanId) || nextPlan() || state.plans[0] || null; }
function prepKey(group, item) { return `${selectedPlan()?.id || 'no_plan'}__${group}__${item}`; }
function prepProgress() {
  const total = PREP_GROUPS.flatMap((g) => g.items.map((i) => prepKey(g.key, i))).length;
  const done = PREP_GROUPS.reduce((sum, g) => sum + g.items.filter((i) => state.prepDone[prepKey(g.key, i)]).length, 0);
  return { done, total, pct: total ? Math.round(done / total * 100) : 0 };
}
function recordsForPlan(planId = selectedPlan()?.id) { return (state.records || []).filter((r) => !planId || r.planId === planId || !r.planId); }
function addRecord(type, detail = '', extra = {}) {
  const plan = selectedPlan();
  const activeStep = DAY_STEPS.find((s) => s.id === state.activeDayStep) || DAY_STEPS[0];
  const activity = state.activeActivity ? MODE_LIBRARY[state.activeActivity] : null;
  const record = {
    id: uid('rec'), at: new Date().toISOString(), type,
    title: activity?.label || activeStep.label || type,
    detail: detail || `${type}を残しました`, planId: plan?.id || '', stepId: activeStep.id,
    status: '未確認', ...extra
  };
  state.records = [record, ...(state.records || [])].slice(0, 200);
  state.unresolved = [record, ...(state.unresolved || [])].slice(0, 80);
  audit(`${type}を未確認箱へ保存`);
  saveState();
  render();
}
function finishActivity() {
  if (!state.activeActivity) return;
  const mode = MODE_LIBRARY[state.activeActivity];
  addRecord('完了', `${mode.label}を終了。思い出整理と次回改善へ送る`, { status: '確定' });
  state.improvements = [...new Set([...(state.improvements || []), ...mode.next])].slice(0, 80);
  state.activeActivity = null;
  saveState(); render();
}

function routeTo(route) { state.route = route; saveState(); render(); }
function setTitle(text) { title.textContent = text; }
function setActiveNav() { $$('.bottom-nav [data-route]').forEach((btn) => btn.classList.toggle('active', btn.dataset.route === state.route || (state.route === 'today' && btn.dataset.route === 'plans'))); }
function card(inner, cls = '') { return `<section class="card ${cls}">${inner}</section>`; }
function sectionHead(title, sub = '', right = '') { return `<div class="section-head"><div><h3>${esc(title)}</h3>${sub ? `<span>${esc(sub)}</span>` : ''}</div>${right}</div>`; }
function metric(label, value) { return `<div class="metric"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`; }

function renderPlans() {
  setTitle('予定');
  const next = nextPlan();
  const prog = prepProgress();
  const count = next ? daysUntil(next.start) : null;
  const countText = next ? (count === 0 ? '今日' : count > 0 ? `あと${count}日` : '思い出整理へ') : '未設定';
  app.innerHTML = `<div class="stack">
    ${card(`<div class="eyebrow">CALENDAR FIRST</div><h2>${esc(next?.title || '次のキャンプを予定に入れる')}</h2><p>${esc(next ? `${fmtDate(next.start)}〜${fmtDate(next.end)} / ${next.members || '同行者未設定'}` : '最初にカレンダー。そこから準備・当日・記録・思い出へつなげる。')}</p><div class="hero-grid">${metric('次の予定', countText)}${metric('準備', `${prog.pct}%`)}${metric('未確認', `${state.unresolved.length}件`)}</div><div class="actions"><button class="btn" data-action="openPrep">準備へ</button><button class="ghost" data-action="openToday">当日運転席</button><button class="ghost" data-action="addPlanOpen">予定を追加</button></div>`, 'hero')}
    <div class="layout-2"><div>${renderCalendar()}</div><div class="stack">${renderSelectedDate()}${renderPlanList()}${renderTodayOverview()}</div></div>
  </div>`;
}
function renderCalendar() {
  const cursor = parseDate(state.calendarCursor) || new Date();
  const year = cursor.getFullYear(); const month = cursor.getMonth();
  const start = new Date(year, month, 1);
  const gridStart = addDays(start, -start.getDay());
  const cells = [];
  const eventMap = new Map();
  (state.plans || []).forEach((p) => rangeDates(p.start, p.end).forEach((d) => eventMap.set(d, [...(eventMap.get(d) || []), p])));
  (state.records || []).forEach((r) => { const d = String(r.at || '').slice(0, 10); eventMap.set(d, [...(eventMap.get(d) || []), { record: true }]); });
  for (let i = 0; i < 42; i++) {
    const d = addDays(gridStart, i); const iso = toISO(d); const events = eventMap.get(iso) || [];
    const cls = ['calendar-day']; if (d.getMonth() !== month) cls.push('out'); if (iso === todayISO()) cls.push('today'); if (iso === state.selectedDate) cls.push('selected');
    cells.push(`<button class="${cls.join(' ')}" data-date="${iso}"><b>${d.getDate()}</b>${events.slice(0,3).map((e) => `<i class="dot ${e.record ? 'memory' : e.status === '未確定' ? 'todo' : ''}"></i>`).join('')}</button>`);
  }
  return card(`<div class="month-head"><button data-month="prev">‹</button><strong>${year}年${month + 1}月</strong><button data-month="next">›</button></div><div class="week-grid">${['日','月','火','水','木','金','土'].map((d) => `<b>${d}</b>`).join('')}</div><div class="calendar-grid">${cells.join('')}</div>`, 'month-card');
}
function renderSelectedDate() {
  const date = state.selectedDate || todayISO();
  const plans = (state.plans || []).filter((p) => rangeDates(p.start, p.end).includes(date));
  const records = (state.records || []).filter((r) => String(r.at || '').slice(0, 10) === date);
  return card(`${sectionHead(`${fmtDate(date)}の予定`, `${plans.length}件 / 記録${records.length}件`)}${plans.length ? plans.map((p) => `<button class="plan-row" data-select-plan="${esc(p.id)}"><div><strong>${esc(p.title)}</strong><span>${esc(p.status || '')} / ${esc(p.note || '準備へつなげる')}</span></div><b>開く</b></button>`).join('') : '<div class="empty">この日のキャンプ予定は未登録</div>'}<div class="form-grid"><button class="ghost" data-action="addPlanOpen">この日に予定を入れる</button></div>`);
}
function renderPlanList() {
  const list = plansSorted().slice(-2).reverse().concat(futurePlans().slice(0, 4)).filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i).slice(0, 5);
  return card(`${sectionHead('キャンプ予定', '予定は勝手に統合・上書きしない')}${list.map((p) => `<button class="plan-row" data-select-plan="${esc(p.id)}"><div><strong>${esc(p.title)}</strong><span>${esc(fmtDate(p.start))}〜${esc(fmtDate(p.end))} / ${esc(p.status || '予定')}</span></div><b>›</b></button>`).join('') || '<div class="empty">予定がありません</div>'}`);
}
function renderTodayOverview() {
  const plan = selectedPlan();
  return card(`${sectionHead('今日の運転席', '予定から当日の行動へ')}${DAY_STEPS.slice(0, 5).map((s) => `<button class="step-row ${state.activeDayStep === s.id ? 'done' : ''}" data-step="${esc(s.id)}"><div><strong>${esc(s.label)}</strong><small>${esc(s.sub)}</small></div><span>${esc(s.mode)}</span></button>`).join('')}<div class="actions"><button class="btn" data-action="openToday">運転席を開く</button><button class="ghost" data-route="plus">今すぐ残す</button></div>${plan ? `<p>対象：${esc(plan.title)}</p>` : '<p>予定未設定でも、今日の散歩・メモは残せる。</p>'}`);
}

function renderAddPlan() {
  setTitle('予定を追加');
  const date = state.selectedDate || todayISO();
  app.innerHTML = `<div class="stack">${card(`${sectionHead('キャンプ予定を追加', 'カレンダーに登録して準備へつなげる')}<div class="form-grid"><input id="planTitle" type="text" placeholder="キャンプ場名" value=""><input id="planStart" type="date" value="${date}"><input id="planEnd" type="date" value="${date}"><input id="planMembers" type="text" placeholder="同行者 / コタ / 友人"><input id="planNote" type="text" placeholder="予約メモ・サイト・注意点"><div class="actions"><button class="btn" data-action="savePlan">保存して準備へ</button><button class="ghost" data-route="plans">戻る</button></div></div>`)} </div>`;
}
function savePlanFromForm() {
  const title = $('#planTitle')?.value.trim();
  if (!title) return addRecord('予定メモ', 'キャンプ場名未入力の予定追加を中断', { status: 'あとで' });
  const p = { id: uid('plan'), title, start: $('#planStart').value || todayISO(), end: $('#planEnd').value || $('#planStart').value || todayISO(), status: '予定', checkin: '', checkout: '', members: $('#planMembers').value.trim(), note: $('#planNote').value.trim() };
  state.plans = dedupePlans([p, ...(state.plans || [])]);
  state.selectedPlanId = p.id;
  audit(`予定追加：${title}`);
  saveState(); routeTo('prep');
}

function renderSearch() {
  setTitle('探す');
  app.innerHTML = `<div class="stack">${card(`<div class="eyebrow">FIND</div><h2>犬連れ前提で候補を探す</h2><p>犬可を最低条件に、ドッグフリー・温水・景色・距離・季節条件を比較して予定化する。</p><div class="chips"><span class="chip">犬可必須</span><span class="chip">冬は温水</span><span class="chip">4時間以内</span><span class="chip">景色</span></div>`, 'hero')}${SEARCH_CANDIDATES.map((c) => card(`${sectionHead(c.title, c.memo)}<div class="chips">${c.tags.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</div><div class="actions"><button class="ghost" data-candidate="${c.id}">候補に残す</button><button class="btn" data-action="addPlanOpen">予定化</button></div>`)).join('')}</div>`;
}

function renderPrep() {
  setTitle('準備');
  const plan = selectedPlan(); const prog = prepProgress();
  app.innerHTML = `<div class="stack">${card(`<div class="eyebrow">PREP WORKSPACE</div><h2>${esc(plan?.title || '準備する予定を選ぶ')}</h2><p>${esc(plan ? `${fmtDate(plan.start)}〜${fmtDate(plan.end)} / ${plan.members || '夫婦＋コタを前提に準備'}` : '予定がなくても買い物・ギア・料理の型は準備できる。')}</p><div class="progress-bar"><i style="width:${prog.pct}%"></i></div><div class="hero-grid">${metric('準備', `${prog.done}/${prog.total}`)}${metric('買い物', `${groupDone('shopping')}件`)}${metric('コタ', `${groupDone('kota')}件`)}</div><div class="actions"><button class="btn" data-action="openToday">当日運転席へ</button><button class="ghost" data-route="plans">カレンダー</button></div>`, 'hero')}${PREP_GROUPS.map(renderPrepGroup).join('')}</div>`;
}
function groupDone(key) { const g = PREP_GROUPS.find((x) => x.key === key); return g ? g.items.filter((i) => state.prepDone[prepKey(g.key, i)]).length : 0; }
function renderPrepGroup(group) {
  return card(`${sectionHead(group.label, groupHint(group.key))}${group.items.map((item) => { const key = prepKey(group.key, item); const done = state.prepDone[key]; return `<button class="prep-task ${done ? 'done' : ''}" data-prep="${esc(key)}"><i class="check">${done ? '✓' : ''}</i><div><strong>${esc(item)}</strong><small>${esc(prepDetail(group.key, item))}</small></div><span>${done ? '完了' : '確認'}</span></button>`; }).join('')}`);
}
function groupHint(key) { return { shopping: '買う/買わない/代替まで残す', meal: '泊数・人数・量を調整', gear: '持つ/使う/乾かす', kota: 'コタの安全と快適さ', route: '移動負担と寄り道', weather: '風・雨・気温で判断' }[key] || ''; }
function prepDetail(key, item) { return `${item}を当日・思い出・次回改善へ接続`; }

function renderToday() {
  setTitle('当日運転席');
  const plan = selectedPlan(); const step = DAY_STEPS.find((s) => s.id === state.activeDayStep) || DAY_STEPS[0];
  app.innerHTML = `<div class="stack">${card(`<div class="eyebrow">DAY COCKPIT</div><h2>${esc(step.label)}</h2><p>${esc(step.sub)}</p><div class="hero-grid">${metric('対象', plan?.title || '未設定')}${metric('状態', step.mode)}${metric('未確認', `${state.unresolved.length}件`)}</div><div class="actions"><button class="btn" data-step-done="${esc(step.id)}">終わった</button>${step.activity ? `<button class="ghost" data-start-activity="${esc(step.activity)}">${esc(MODE_LIBRARY[step.activity].label)}を開始</button>` : ''}<button class="ghost" data-route="plus">記録する</button></div>`, 'hero')}
    ${card(`<div class="stage-strip">${DAY_STEPS.map((s) => `<button class="${state.activeDayStep === s.id ? 'active' : ''}" data-step="${esc(s.id)}">${esc(s.label)}</button>`).join('')}</div><h3>${esc(step.mode)}の中身</h3><p>${esc(step.sub)}</p><div class="grid2"><button class="quick-button" data-record="写真"><strong>写真</strong><span>今の状態に紐付け</span></button><button class="quick-button" data-record="声"><strong>声</strong><span>あとで文字化候補</span></button><button class="quick-button" data-record="メモ"><strong>メモ</strong><span>未確認箱へ保存</span></button><button class="quick-button" data-record="GPS"><strong>GPS</strong><span>場所候補を保存</span></button></div>`)}</div>`;
}

function renderPlus() {
  setTitle('＋');
  if (state.activeActivity) return renderActiveActivity();
  app.innerHTML = `<div class="stack">${card(`<div class="eyebrow">QUICK RECORD</div><h2>今のことを残す</h2><p>分類を強制しない。今の予定・当日ステップ・時刻に紐付け、未確認箱で後から整理する。</p>`, 'hero')}${card(`${sectionHead('今すぐ残す', '写真・動画・声・メモ・GPS・あとで')}<div class="grid3"><button class="quick-button" data-record="写真"><strong>写真</strong><span>撮る/選ぶ</span></button><button class="quick-button" data-record="動画"><strong>動画</strong><span>短く残す</span></button><button class="quick-button" data-record="声"><strong>声</strong><span>話して残す</span></button><button class="quick-button" data-record="メモ"><strong>メモ</strong><span>自由入力</span></button><button class="quick-button" data-record="GPS"><strong>GPS</strong><span>現在地</span></button><button class="quick-button" data-record="あとで"><strong>あとで</strong><span>空メモ</span></button></div>`)}${card(`${sectionHead('活動を始める', '開始と終了があるものだけここから')}<div class="grid2">${Object.entries(MODE_LIBRARY).map(([key, m]) => `<button class="mode-button" data-start-activity="${esc(key)}"><strong>${esc(m.label)}</strong><span>${esc(m.first)}</span></button>`).join('')}</div>`)}</div>`;
}
function renderActiveActivity() {
  const mode = MODE_LIBRARY[state.activeActivity];
  app.innerHTML = `<div class="stack">${card(`<div class="eyebrow">RECORDING</div><h2>${esc(mode.label)}中</h2><p>${esc(mode.first)}</p><div class="hero-grid">${metric('状態', '記録中')}${metric('自動', mode.auto.length + '項目')}${metric('未確認', `${state.unresolved.length}件`)}</div><div class="actions"><button class="btn" data-action="finishActivity">終了して保存</button><button class="ghost" data-route="plans">カレンダーへ</button></div>`, 'hero recording-live')}${card(`${sectionHead('押すもの', 'この活動でよく使う操作')}<div class="grid3">${mode.buttons.map((b) => `<button class="quick-button" data-record="${esc(b)}"><strong>${esc(b)}</strong><span>${esc(mode.label)}に紐付け</span></button>`).join('')}</div>`)}${card(`${sectionHead('裏で拾うもの', '勝手に確定せず候補として保存')}<div class="chips">${mode.auto.map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</div><p>次回改善：${esc(mode.next.join(' / '))}</p>`)}</div>`;
}

function renderMemory() {
  setTitle('思い出');
  const records = recordsForPlan();
  app.innerHTML = `<div class="stack">${card(`<div class="eyebrow">MEMORY</div><h2>思い出整理</h2><p>写真・動画・声・メモ・GPSを時系列にまとめ、未確認箱から次回改善へ戻す。</p><div class="hero-grid">${metric('記録', `${records.length}件`)}${metric('未確認', `${state.unresolved.length}件`)}${metric('改善', `${state.improvements.length}件`)}</div>`, 'hero')}${card(`${sectionHead('未確認箱', '確定するまで予定や準備へ反映しない')}${state.unresolved.length ? state.unresolved.slice(0, 12).map((r) => `<article class="memory-item"><strong>${esc(r.title)} / ${esc(r.type)}</strong><span>${esc(humanTime(r.at))} ${esc(r.detail)}</span><div class="actions"><button class="ghost" data-confirm="${esc(r.id)}">確定</button><button class="ghost" data-defer="${esc(r.id)}">あとで</button><button class="danger-btn" data-wrong="${esc(r.id)}">違う</button></div></article>`).join('') : '<div class="empty">未確認はありません</div>'}`)}${card(`${sectionHead('時系列', 'キャンプ1回の流れとして見る')}<div class="timeline">${records.slice(0, 20).map((r) => `<article class="memory-item"><strong>${esc(r.title)} / ${esc(r.type)}</strong><span>${esc(humanTime(r.at))} ${esc(r.detail)} / ${esc(r.status || '')}</span></article>`).join('') || '<div class="empty">まだ記録はありません</div>'}</div>`)}${card(`${sectionHead('次回改善', '準備へ戻す候補')}<div class="chips">${(state.improvements.length ? state.improvements : ['忘れ物', '料理量', '設営順', 'コタ', '天気対策']).map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</div><div class="actions"><button class="ghost" data-route="prep">準備へ戻す</button><button class="ghost" data-action="googlePhotos">Google Photos整理候補</button></div>`)}</div>`;
}

function handleClick(event) {
  const target = event.target.closest('button'); if (!target) return;
  if (target.dataset.route) return routeTo(target.dataset.route);
  if (target.dataset.date) { state.selectedDate = target.dataset.date; saveState(); return render(); }
  if (target.dataset.month) { const d = parseDate(state.calendarCursor) || new Date(); d.setMonth(d.getMonth() + (target.dataset.month === 'next' ? 1 : -1)); state.calendarCursor = `${d.getFullYear()}-${pad(d.getMonth()+1)}-01`; saveState(); return render(); }
  if (target.dataset.selectPlan) { state.selectedPlanId = target.dataset.selectPlan; audit('予定を選択'); saveState(); return render(); }
  if (target.dataset.prep) { state.prepDone[target.dataset.prep] = !state.prepDone[target.dataset.prep]; audit('準備項目を更新'); saveState(); return render(); }
  if (target.dataset.step) { state.activeDayStep = target.dataset.step; saveState(); return renderToday(); }
  if (target.dataset.stepDone) { const step = DAY_STEPS.find((s) => s.id === target.dataset.stepDone); state.improvements = [...new Set([...(state.improvements || []), `${step.label}の実績確認`])]; addRecord('完了', `${step.label}を完了`); return; }
  if (target.dataset.record) { return quickRecord(target.dataset.record); }
  if (target.dataset.startActivity) { state.activeActivity = target.dataset.startActivity; addRecord('開始', `${MODE_LIBRARY[state.activeActivity].label}を開始`, { status: '確定' }); return; }
  if (target.dataset.confirm) { confirmUnresolved(target.dataset.confirm, '確定'); return; }
  if (target.dataset.defer) { confirmUnresolved(target.dataset.defer, 'あとで'); return; }
  if (target.dataset.wrong) { confirmUnresolved(target.dataset.wrong, '違う'); return; }
  if (target.dataset.candidate) { state.candidates = [target.dataset.candidate, ...(state.candidates || [])].slice(0,20); audit('候補を保存'); saveState(); return render(); }
  const action = target.dataset.action;
  if (action === 'openPrep') return routeTo('prep');
  if (action === 'openToday') { state.route = 'today'; saveState(); return render(); }
  if (action === 'addPlanOpen') { state.route = 'addPlan'; saveState(); return render(); }
  if (action === 'savePlan') return savePlanFromForm();
  if (action === 'finishActivity') return finishActivity();
  if (action === 'googlePhotos') { addRecord('整理候補', 'Google Photos共有アルバムへ移す候補を作成', { status: 'あとで' }); return; }
}
function quickRecord(type) {
  if (type === 'メモ') {
    const detail = prompt('メモを入力');
    if (!detail) return;
    addRecord('メモ', detail);
    return;
  }
  if (type === '声') {
    addRecord('声', '音声メモ候補。対応ブラウザでは文字起こしへ接続予定');
    return;
  }
  if (type === 'GPS') {
    if (!navigator.geolocation) return addRecord('GPS', '位置情報が使えない');
    navigator.geolocation.getCurrentPosition((pos) => addRecord('GPS', `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`, { point: { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy } }), () => addRecord('GPS', '取得失敗。許可を確認'));
    return;
  }
  addRecord(type, `${type}を今の状態に紐付け`);
}
function confirmUnresolved(id, status) {
  state.unresolved = (state.unresolved || []).map((r) => r.id === id ? { ...r, status } : r).filter((r) => status === 'あとで' || r.status !== '確定');
  state.records = (state.records || []).map((r) => r.id === id ? { ...r, status } : r);
  if (status === '確定') state.improvements = [...new Set([...(state.improvements || []), '確定記録から次回改善確認'])].slice(0, 80);
  audit(`未確認を${status}へ更新`);
  saveState(); render();
}

function render() {
  document.body.dataset.build = BUILD_ID;
  const labels = { plans: '予定', search: '探す', prep: '準備', plus: '＋', memory: '思い出', today: '当日運転席', addPlan: '予定追加' };
  setTitle(labels[state.route] || '予定');
  statusPill.textContent = '保護ON';
  setActiveNav();
  if (state.route === 'search') renderSearch();
  else if (state.route === 'prep') renderPrep();
  else if (state.route === 'plus') renderPlus();
  else if (state.route === 'memory') renderMemory();
  else if (state.route === 'today') renderToday();
  else if (state.route === 'addPlan') renderAddPlan();
  else renderPlans();
}

document.addEventListener('click', handleClick);
statusPill.addEventListener('click', () => alert(state.protectedMessage));
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(() => undefined);
render();
