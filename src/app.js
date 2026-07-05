(() => {
  const STORAGE_KEY = 'outbase_restart_5_state';
  const LEGACY_STORAGE_KEYS = ['outbase_restart_4_state', 'outbase_restart_3_state', 'outbase_restart_2_state', 'outbase_restart_1_state'];
  const app = document.getElementById('app');

  const prepBase = [
    { id: 'shop', key: '買い物', note: '料理から必要なものを確認します', status: '未完了' },
    { id: 'cook', key: '料理', note: '日程・人数・量を見ながら決めます', status: '仮決定' },
    { id: 'gear', key: 'ギア', note: '持つもの、使った結果、乾燥まで残します', status: '確認中' },
    { id: 'kota', key: 'コタ', note: 'フード・水・暑さ寒さ対策を確認します', status: '未確認' },
    { id: 'weather', key: '天気', note: '雨・風・気温を当日運転席に反映します', status: '要確認' },
    { id: 'route', key: 'ルート', note: '出発・経由地・買い出し・帰路を確認します', status: '確認済み' }
  ];

  const shoppingBase = [
    { id: 'shrimp', name: 'ブラックタイガーまたは代替のエビ', group: '食材', qty: '200〜300g', owner: '当日購入', detail: '売っていなければ冷凍エビ候補。', state: '未購入' },
    { id: 'cheese', name: 'ピザ用チーズ', group: '食材', qty: '1袋', owner: '事前購入', detail: 'ブラータは食べ過ぎ注意。', state: '未購入' },
    { id: 'garlic', name: 'にんにく', group: '調味料', qty: '1個', owner: '家確認', detail: 'チューブでも代替可。', state: '未購入' },
    { id: 'oil', name: 'オリーブオイル / バター / レモン', group: '調味料', qty: '家確認', owner: '家確認', detail: '家にあるものは買わない。', state: '未購入' },
    { id: 'baguette', name: 'バゲット', group: '今回は買わないもの', qty: 'なし', owner: '買わない', detail: '夜の量が多い時は無しでよい。', state: '今回は買わない' }
  ];

  const mealsBase = [
    { id: 'day1lunch', slot: '1日目 昼', menu: '移動中または軽め', caution: '設営前に重くしない' },
    { id: 'day1dinner', slot: '1日目 夜', menu: 'ピザ / ガーリックシュリンプ', caution: '量が多すぎないか確認' },
    { id: 'day2breakfast', slot: '2日目 朝', menu: 'ホットサンド', caution: '撤収時間に合わせて軽く' },
    { id: 'day2lunch', slot: '2日目 昼', menu: 'なし / 帰路で調整', caution: '食べ過ぎ防止' }
  ];

  const dayStepsBase = [
    { id: 'before', title: '出発前', note: '忘れ物・コタ用品・天気を確認', state: '次' },
    { id: 'driveOut', title: '往路', note: '運転中は操作しない。停車中に記録。', state: '待ち' },
    { id: 'shopStop', title: '買い出し / 給油', note: '買い物リストとルートに紐づけ', state: '待ち' },
    { id: 'arrival', title: '到着 / 受付', note: 'チェックイン・サイト番号を残す', state: '待ち' },
    { id: 'siteCheck', title: 'サイト確認', note: '地面・風・トイレ距離・コタ向きを記録', state: '待ち' },
    { id: 'setup', title: '設営', note: '手順・写真・声メモを残す', state: '待ち' },
    { id: 'meal', title: '料理', note: '味・量・余り・失敗を当日中に残す', state: '待ち' },
    { id: 'kotaWalk', title: 'コタ散歩', note: 'タイミングと様子を残す', state: '待ち' },
    { id: 'campWalk', title: 'キャンプ場散歩', note: '場内地図・場所カードへ', state: '待ち' },
    { id: 'cleanup', title: '撤収', note: '濡れ物・乾燥・忘れ物を確認', state: '待ち' },
    { id: 'driveHome', title: '帰路', note: '寄り道・帰宅時間・片付けへ', state: '待ち' }
  ];


  const gearBase = [
    { id: 'shelter', group: '幕・寝室', name: 'リビングシェル / アメニティドーム', qty: '各1', note: '寝室とリビングを分ける。雨なら乾燥まで残す。', done: false },
    { id: 'tarp', group: '幕・寝室', name: 'ヘキサエヴォまたはタープ', qty: '必要時', note: '雨風と同行者の動線で判断。', done: false },
    { id: 'sleep', group: '寝具', name: 'コット / グランドフトン / 枕', qty: '夫婦分', note: '寝室側へまとめる。', done: false },
    { id: 'light', group: '灯り', name: 'ほおずき / たねほおずき / ランタン', qty: '必要分', note: '寝室・食事・導線で分ける。', done: false },
    { id: 'igt', group: 'キッチン', name: 'IGT / バーナー / スキレット', qty: '料理に合わせる', note: '料理計画と連動して増減。', done: false },
    { id: 'power', group: '電源・空調', name: 'EcoFlow / WAVE / Glacier', qty: '必要時', note: '暑さ・冷蔵・雨撤収で判断。', done: false }
  ];

  const kotaBase = [
    { id: 'food', group: '基本', name: 'コタのごはん', qty: '日数分＋予備', note: '小分け。食いつきも記録。', done: false },
    { id: 'water', group: '基本', name: '水 / フードボウル', qty: '必要分', note: '移動中とサイト用を分ける。', done: false },
    { id: 'lead', group: '移動', name: 'リード / ハーネス / 首輪', qty: '各1', note: '予備リードも確認。', done: false },
    { id: 'cart', group: '移動', name: 'AirBuggy Dome3', qty: '1台', note: '場内移動と暑さ対策。', done: false },
    { id: 'heatCold', group: '快適', name: '暑さ寒さ対策', qty: '天気次第', note: '気温・風・標高で判断。', done: false },
    { id: 'cleanup', group: '片付け', name: 'うんち袋 / タオル / 消臭', qty: '多め', note: '雨ならタオルを増やす。', done: false }
  ];

  const weatherCheckBase = [
    { id: 'rain', name: '雨量', note: '設営・撤収・乾燥サービスに影響', done: false },
    { id: 'wind', name: '風速', note: 'タープ・焚火・幕の向きに影響', done: false },
    { id: 'temp', name: '気温', note: 'コタ、寝具、空調、服装に影響', done: false },
    { id: 'ground', name: '地面', note: '水はけ、泥、ペグ、撤収に影響', done: false }
  ];

  const routeCheckBase = [
    { id: 'leave', name: '出発時間', note: '柏からの出発と渋滞を確認', done: false },
    { id: 'conv', name: 'コンビニ / 買い出し', note: '通り道で寄る場所を決める', done: false },
    { id: 'gas', name: '給油 / 充電', note: '往復と寄り道に備える', done: false },
    { id: 'return', name: '帰路', note: '撤収後に無理なく帰れる道を確認', done: false }
  ];

  const defaultState = {
    version: 'restart-5',
    screen: 'home',
    activeTab: '予定',
    activeProjectId: 'camp-akagi',
    calendarMonth: '2026-06',
    selectedDate: '2026-06-26',
    toast: '',
    walk: null,
    projects: [
      {
        id: 'camp-akagi',
        type: 'camp',
        title: 'スノーピーク赤城山キャンプフィールド',
        label: '次のキャンプ',
        status: '次の予定',
        startDate: '2026-06-26',
        endDate: '2026-06-27',
        place: 'スノーピーク赤城山キャンプフィールド',
        party: '夫婦＋コタ',
        checkin: '13:00',
        checkout: '11:00',
        weather: '雨と風を確認',
        route: '柏から出発予定',
        memo: '準備・当日・記録・思い出をこの予定にまとめます。',
        prep: clone(prepBase),
        shopping: clone(shoppingBase),
        meals: clone(mealsBase),
        daySteps: clone(dayStepsBase),
        activeDayStepId: 'before',
        gear: clone(gearBase),
        kota: clone(kotaBase),
        weatherChecks: clone(weatherCheckBase),
        routeChecks: clone(routeCheckBase)
      },
      {
        id: 'walk-home-kota',
        type: 'walk',
        title: 'コタと自宅散歩',
        label: 'コタと散歩',
        status: 'いつでも',
        startDate: '',
        endDate: '',
        place: '自宅周辺',
        party: 'コタ',
        memo: '自宅散歩はキャンプ場散歩と分けて残します。'
      },
      {
        id: 'campwalk-akagi',
        type: 'campWalk',
        title: '赤城山キャンプ場散歩',
        label: 'キャンプ場散歩',
        status: '滞在中に使う',
        startDate: '2026-06-26',
        endDate: '2026-06-27',
        place: 'スノーピーク赤城山キャンプフィールド',
        party: '夫婦＋コタ',
        parentProjectId: 'camp-akagi',
        memo: 'サイト周辺、トイレ、炊事場、景色、危険箇所をキャンプの子記録にします。'
      },
      {
        id: 'search-next-camp',
        type: 'search',
        title: '次に行きたいキャンプ場探し',
        label: 'キャンプ場を探す',
        status: '候補集め',
        startDate: '',
        endDate: '',
        place: '候補未決定',
        party: '夫婦＋コタ',
        memo: '犬可、温水、景色、距離、季節で候補を残し、予定に育てます。'
      },
      {
        id: 'outing-free',
        type: 'outing',
        title: '外出メモ',
        label: '外出',
        status: '必要な時だけ',
        startDate: '',
        endDate: '',
        place: '行き先未定',
        party: '夫婦＋コタ',
        memo: 'キャンプ以外の外出も、記録と改善に戻せるようにします。'
      }
    ],
    inbox: [],
    memories: [],
    improvements: [],
    calendarItems: [
      { id: 'cal-camp-akagi-start', projectId: 'camp-akagi', date: '2026-06-26', label: 'キャンプ出発', kind: 'camp' },
      { id: 'cal-camp-akagi-end', projectId: 'camp-akagi', date: '2026-06-27', label: '撤収・帰宅', kind: 'camp' }
    ]
  };

  let state = loadState();
  let saveTimer = null;

  function clone(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function cloneDefaultState() {
    return clone(defaultState);
  }

  function loadState() {
    try {
      let raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const legacyKey = LEGACY_STORAGE_KEYS.find((key) => localStorage.getItem(key));
        raw = legacyKey ? localStorage.getItem(legacyKey) : null;
      }
      if (!raw) return cloneDefaultState();
      const merged = mergeState(cloneDefaultState(), JSON.parse(raw));
      merged.version = 'restart-5';
      return merged;
    } catch (error) {
      return cloneDefaultState();
    }
  }

  function mergeState(base, patch) {
    if (!patch || typeof patch !== 'object') return base;
    Object.keys(patch).forEach((key) => {
      if (Array.isArray(patch[key])) {
        base[key] = patch[key];
      } else if (patch[key] && typeof patch[key] === 'object' && base[key] && typeof base[key] === 'object') {
        base[key] = { ...base[key], ...patch[key] };
      } else {
        base[key] = patch[key];
      }
    });
    normalizeState(base);
    return base;
  }

  function normalizeState(target) {
    target.projects = Array.isArray(target.projects) && target.projects.length ? target.projects : clone(defaultState.projects);
    target.inbox = Array.isArray(target.inbox) ? target.inbox : [];
    target.memories = Array.isArray(target.memories) ? target.memories : [];
    target.improvements = Array.isArray(target.improvements) ? target.improvements : [];
    target.calendarItems = Array.isArray(target.calendarItems) ? target.calendarItems : [];
    const fallbackMonth = target.projects.find((project) => project.startDate)?.startDate?.slice(0, 7) || new Date().toISOString().slice(0, 7);
    target.calendarMonth = /^\d{4}-\d{2}$/.test(target.calendarMonth || '') ? target.calendarMonth : fallbackMonth;
    target.selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(target.selectedDate || '') ? target.selectedDate : `${target.calendarMonth}-01`;
    target.inbox.forEach((record) => { if (!record.date) record.date = todayISO(); });
    target.memories.forEach((record) => { if (!record.date) record.date = todayISO(); });
    target.improvements.forEach((item) => { if (!item.date) item.date = todayISO(); });
    if (!projectById(target.activeProjectId, target)) target.activeProjectId = target.projects[0].id;
    target.projects.forEach((project) => {
      if (project.type === 'camp') {
        project.prep = Array.isArray(project.prep) ? project.prep : clone(prepBase);
        project.shopping = Array.isArray(project.shopping) ? project.shopping : clone(shoppingBase);
        project.meals = Array.isArray(project.meals) ? project.meals : clone(mealsBase);
        project.daySteps = Array.isArray(project.daySteps) ? project.daySteps : clone(dayStepsBase);
        project.daySteps = mergeDaySteps(project.daySteps);
        if (!project.activeDayStepId || !project.daySteps.some((step) => step.id === project.activeDayStepId)) {
          const nextStep = project.daySteps.find((step) => step.state === '進行中' || step.state === '次') || project.daySteps[0];
          project.activeDayStepId = nextStep?.id || 'before';
        }
        project.gear = Array.isArray(project.gear) ? project.gear : clone(gearBase);
        project.kota = Array.isArray(project.kota) ? project.kota : clone(kotaBase);
        project.weatherChecks = Array.isArray(project.weatherChecks) ? project.weatherChecks : clone(weatherCheckBase);
        project.routeChecks = Array.isArray(project.routeChecks) ? project.routeChecks : clone(routeCheckBase);
      }
    });
  }

  function mergeDaySteps(steps) {
    const current = Array.isArray(steps) ? steps : [];
    return dayStepsBase.map((baseStep, index) => {
      const existing = current.find((step) => step.id === baseStep.id) || {};
      const stateValue = existing.state || baseStep.state || (index === 0 ? '次' : '待ち');
      return {
        ...baseStep,
        ...existing,
        state: ['待ち', '次', '進行中', '完了', '戻し'].includes(stateValue) ? stateValue : (index === 0 ? '次' : '待ち'),
        startedAt: existing.startedAt || '',
        finishedAt: existing.finishedAt || ''
      };
    });
  }

  function dayStepById(project, stepId) {
    return project?.daySteps?.find((step) => step.id === stepId) || null;
  }

  function activeDayStep(project) {
    if (!project?.daySteps?.length) return null;
    return dayStepById(project, project.activeDayStepId) || project.daySteps.find((step) => step.state === '進行中' || step.state === '次') || project.daySteps[0];
  }

  function dayStepCounts(project) {
    const steps = project?.daySteps || [];
    return {
      done: steps.filter((step) => step.state === '完了').length,
      doing: steps.filter((step) => step.state === '進行中').length,
      total: steps.length
    };
  }

  function stepRecords(projectId, stepId) {
    const all = [...state.inbox, ...state.memories];
    return all.filter((record) => record.projectId === projectId && record.stepId === stepId);
  }

  function stepStatusClass(step) {
    if (step.state === '完了') return 'done';
    if (step.state === '進行中') return 'doing';
    if (step.state === '次') return 'next';
    if (step.state === '戻し') return 'reopened';
    return 'waiting';
  }

  function stepStatusText(step) {
    if (step.state === '完了') return '完了';
    if (step.state === '進行中') return '進行中';
    if (step.state === '次') return '次';
    if (step.state === '戻し') return '戻し中';
    return '待ち';
  }

  function projectById(id, source = state) {
    return source.projects.find((project) => project.id === id) || null;
  }

  function activeProject() {
    return projectById(state.activeProjectId) || state.projects[0];
  }

  function campProject() {
    return state.projects.find((project) => project.type === 'camp') || activeProject();
  }

  function parentCampFor(project) {
    if (project?.parentProjectId) return projectById(project.parentProjectId) || campProject();
    return campProject();
  }

  function projectLabel(project) {
    if (!project) return '未確認箱';
    return project.label || project.title;
  }

  function projectDate(project) {
    if (!project?.startDate) return '日付はあとで決める';
    if (project.endDate && project.endDate !== project.startDate) return `${project.startDate}〜${project.endDate}`;
    return project.startDate;
  }


  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function monthStartDate(month) {
    const [year, monthIndex] = month.split('-').map(Number);
    return new Date(year, monthIndex - 1, 1);
  }

  function addMonths(month, delta) {
    const date = monthStartDate(month);
    date.setMonth(date.getMonth() + delta);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  function monthTitle(month) {
    const [year, monthNumber] = month.split('-');
    return `${year}年${Number(monthNumber)}月`;
  }

  function daysForCalendar(month) {
    const first = monthStartDate(month);
    const year = first.getFullYear();
    const monthIndex = first.getMonth();
    const firstWeekday = first.getDay();
    const lastDate = new Date(year, monthIndex + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstWeekday; i += 1) days.push(null);
    for (let day = 1; day <= lastDate; day += 1) {
      days.push(`${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    }
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }

  function calendarEntriesForDate(date) {
    const entries = [];
    state.calendarItems.filter((item) => item.date === date).forEach((item) => {
      const project = projectById(item.projectId);
      entries.push({ id: item.id, kind: item.kind || project?.type || 'plan', label: item.label, projectId: item.projectId, source: '予定' });
    });
    state.inbox.filter((record) => record.date === date).forEach((record) => {
      entries.push({ id: record.id, kind: 'inbox', label: `${record.type}：未確認`, projectId: record.projectId, source: '未確認' });
    });
    state.memories.filter((record) => record.date === date).forEach((record) => {
      entries.push({ id: record.id, kind: 'memory', label: `${record.type}：思い出`, projectId: record.projectId, source: '思い出' });
    });
    state.improvements.filter((item) => item.date === date).forEach((item) => {
      entries.push({ id: item.id, kind: 'improvement', label: item.done ? '反映済み改善' : '次回改善', projectId: item.projectId, source: '改善' });
    });
    return entries;
  }

  function calendarEntriesInMonth(month) {
    return daysForCalendar(month).filter(Boolean).flatMap((date) => calendarEntriesForDate(date).map((entry) => ({ ...entry, date })));
  }

  function upcomingEntries(limit = 3) {
    const entries = [
      ...state.calendarItems.map((item) => ({ ...item, source: '予定' })),
      ...state.inbox.map((record) => ({ id: record.id, date: record.date || todayISO(), label: `${record.type}を整理`, projectId: record.projectId, kind: 'inbox', source: '未確認' })),
      ...state.improvements.map((item) => ({ id: item.id, date: item.date || todayISO(), label: item.done ? '反映済み改善' : '次回改善', projectId: item.projectId, kind: 'improvement', source: '改善' }))
    ];
    return entries
      .filter((item) => item.date)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, limit);
  }

  function calendarTargetScreen(entry) {
    if (entry.kind === 'inbox') return 'inbox';
    if (entry.kind === 'memory') return 'memories';
    if (entry.kind === 'improvement') return 'improvements';
    const project = projectById(entry.projectId);
    if (project?.type === 'walk') return 'homeWalk';
    if (project?.type === 'campWalk') return 'campWalk';
    if (project?.type === 'search') return 'search';
    return 'plan';
  }

  function prepPercent(project) {
    if (!project?.prep?.length) return 0;
    const doneWords = ['確認済み', '買った', '完了'];
    const done = project.prep.filter((item) => doneWords.includes(item.status)).length;
    return Math.round((done / project.prep.length) * 100);
  }


  function checkedCount(list) {
    return Array.isArray(list) ? list.filter((item) => item.done).length : 0;
  }

  function checklistText(list) {
    const total = Array.isArray(list) ? list.length : 0;
    return `${checkedCount(list)}/${total}`;
  }

  function updatePrepStatus(project, prepId, list, partial = '確認中') {
    const item = project?.prep?.find((entry) => entry.id === prepId);
    if (!item || !Array.isArray(list)) return;
    item.status = list.length && list.every((entry) => entry.done) ? '確認済み' : partial;
  }

  function updateShoppingPrep(project) {
    if (!project?.shopping) return;
    const item = project.prep?.find((entry) => entry.id === 'shop');
    if (!item) return;
    const needBuy = project.shopping.filter((entry) => entry.group !== '今回は買わないもの');
    item.status = needBuy.length && needBuy.every((entry) => entry.state === '買った') ? '確認済み' : '未完了';
  }

  function groupNames(list) {
    return [...new Set((list || []).map((item) => item.group || 'その他'))];
  }

  function countByProject(list, projectId) {
    return list.filter((item) => item.projectId === projectId).length;
  }

  function saveState() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, toast: '' }));
    }, 10);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function setScreen(screen, tab = null) {
    state.screen = screen;
    if (tab) state.activeTab = tab;
    saveState();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setActiveProject(projectId, screen = null, tab = null) {
    if (projectById(projectId)) state.activeProjectId = projectId;
    if (screen) state.screen = screen;
    if (tab) state.activeTab = tab;
    saveState();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showToast(message) {
    state.toast = message;
    render();
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      state.toast = '';
      render();
    }, 1800);
  }

  function layout(content, options = {}) {
    const subtitle = options.subtitle || '予定から思い出まで、一本でつなぐ';
    return `
      <header class="topbar">
        <div class="brand">
          <div class="logo">OB</div>
          <div>
            <div class="brand-title">OUTBASE</div>
            <div class="brand-sub">${escapeHtml(subtitle)}</div>
          </div>
        </div>
        <span class="pill">${state.inbox.length}件 あとで整理</span>
      </header>
      ${content}
      ${bottomNav()}
      ${state.toast ? `<div class="toast">${escapeHtml(state.toast)}</div>` : ''}
    `;
  }

  function homeLayout(content) {
    return `${content}${bottomNav()}${state.toast ? `<div class="toast">${escapeHtml(state.toast)}</div>` : ''}`;
  }

  function bottomNav() {
    const navs = [
      { tab: '予定', icon: '🏕️', screen: 'home' },
      { tab: '探す', icon: '🔎', screen: 'search' },
      { tab: '準備', icon: '🎒', screen: 'prep' },
      { tab: '＋', icon: '＋', screen: 'capture' },
      { tab: '思い出', icon: '📚', screen: 'memories' }
    ];
    return `<nav class="bottom-nav" aria-label="OUTBASE下ナビ">
      ${navs.map((nav) => `
        <button class="nav-btn ${state.activeTab === nav.tab ? 'active' : ''}" data-action="go" data-screen="${nav.screen}" data-tab="${nav.tab}">
          <span class="icon">${nav.icon}</span>
          <span>${nav.tab}</span>
        </button>
      `).join('')}
    </nav>`;
  }

  function card(title, eyebrow, body, actions = '', extra = '') {
    return `
      <section class="card">
        <div class="card-inner">
          <div class="card-header">
            <div>
              <div class="eyebrow">${escapeHtml(eyebrow)}</div>
              <h2 class="card-title">${escapeHtml(title)}</h2>
            </div>
            ${extra}
          </div>
          ${body}
          ${actions ? `<div class="actions">${actions}</div>` : ''}
        </div>
      </section>
    `;
  }

  function btn(label, action, props = {}, type = 'primary') {
    const attrs = Object.entries(props).map(([k, v]) => {
      const dataName = k.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
      return `data-${dataName}="${escapeHtml(v)}"`;
    }).join(' ');
    return `<button class="btn ${type}" data-action="${action}" ${attrs}>${escapeHtml(label)}</button>`;
  }

  function projectSwitch() {
    return `<div class="project-switch" aria-label="進行中の流れ">
      ${state.projects.map((project) => `
        <button class="switch-btn ${project.id === state.activeProjectId ? 'active' : ''}" data-action="switchProject" data-project-id="${escapeHtml(project.id)}">
          ${escapeHtml(projectLabel(project))}
        </button>
      `).join('')}
    </div>`;
  }

  function renderHome() {
    const camp = campProject();
    const percent = prepPercent(camp);
    const content = `
      <section class="hero home-hero">
        <div class="home-badge">OUTBASE</div>
        <h1>今日は何する？</h1>
        <p>次のキャンプ、コタとの散歩、今残したい記録をここから始めます。</p>
        <span class="pill home-pill">${state.inbox.length}件 あとで整理</span>
      </section>
      <main class="stack">
        ${card('進行中の流れ', '同時に動かせる', `
          ${projectSwitch()}
          <p class="note">キャンプ、散歩、探している候補、外出を裏側で分けて保存します。画面は増やしすぎず、入口はこのまま保ちます。</p>
        `)}

        ${card('予定カレンダー', '日付で見る', `
          <div class="mini-calendar-list">
            ${upcomingEntries(3).map((entry) => `<button class="mini-calendar-item" data-action="openCalendarDate" data-date="${escapeHtml(entry.date)}"><span>${escapeHtml(entry.date.slice(5))}</span><strong>${escapeHtml(entry.label)}</strong><small>${escapeHtml(projectLabel(projectById(entry.projectId)))} / ${escapeHtml(entry.source || '予定')}</small></button>`).join('') || '<div class="empty">予定・未確認・改善が日付に出ます。</div>'}
          </div>
        `, `${btn('カレンダーを見る', 'go', { screen: 'calendar', tab: '予定' }, 'primary')}`)}

        ${card('次のキャンプ', '予定', `
          <p class="card-text"><strong>${escapeHtml(camp.place)}</strong><br>${escapeHtml(projectDate(camp))} / <span class="tag light">${escapeHtml(camp.party)}</span></p>
          <div class="metric-row">
            <div class="metric"><small>準備</small><strong>${percent}%</strong></div>
            <div class="metric"><small>天気</small><strong>${escapeHtml(camp.weather)}</strong></div>
            <div class="metric"><small>ルート</small><strong>${escapeHtml(camp.route)}</strong></div>
            <div class="metric"><small>記録</small><strong>${countByProject(state.memories, camp.id)}件</strong></div>
          </div>
          <div class="progress"><span style="width:${percent}%"></span></div>
        `, `${btn('準備する', 'openProject', { projectId: camp.id, screen: 'prep', tab: '準備' })}${btn('当日運転席', 'openProject', { projectId: camp.id, screen: 'cockpit', tab: '予定' }, 'ghost')}${btn('予定詳細', 'openProject', { projectId: camp.id, screen: 'plan', tab: '予定' }, 'ghost')}`)}

        ${card('コタと散歩', '散歩', `
          <p class="card-text">自宅散歩とキャンプ場散歩を分けて残します。キャンプ場散歩はキャンプの子記録としてつなげます。</p>
        `, `${btn('自宅散歩を始める', 'openProject', { projectId: 'walk-home-kota', screen: 'homeWalk', tab: '予定' })}${btn('キャンプ場散歩', 'openProject', { projectId: 'campwalk-akagi', screen: 'campWalk', tab: '予定' }, 'ghost')}`)}

        ${card('キャンプ場を探す', '探す', `
          <p class="card-text">犬可・温水・景色・距離・コタ向きで候補を残します。候補は次の予定に育てます。</p>
        `, `${btn('候補を見る', 'openProject', { projectId: 'search-next-camp', screen: 'search', tab: '探す' })}${btn('今すぐ記録', 'go', { screen: 'capture', tab: '＋' }, 'ghost')}`)}

        ${card('未整理を片付ける', 'あとで整理', `
          <p class="card-text">写真 ${state.inbox.filter((r) => r.type === '写真').length}件 / 声メモ ${state.inbox.filter((r) => r.type === '声').length}件 / 保存先候補 ${state.inbox.length}件</p>
        `, `${btn('未確認箱へ', 'go', { screen: 'inbox', tab: '思い出' }, state.inbox.length ? 'warn' : 'ghost')}`)}
      </main>
    `;
    app.innerHTML = homeLayout(content);
  }

  function renderCalendar() {
    const month = state.calendarMonth;
    const selectedDate = state.selectedDate;
    const monthEntries = calendarEntriesInMonth(month);
    const selectedEntries = calendarEntriesForDate(selectedDate);
    const weekLabels = ['日', '月', '火', '水', '木', '金', '土'];
    const body = `
      <section class="hero">
        <h1>予定カレンダー</h1>
        <p>キャンプ予定、散歩、未確認、思い出、次回改善を日付で見ます。日付を押すと、その日の流れに入れます。</p>
      </section>
      <main class="stack">
        ${card(monthTitle(month), '予定 / 記録 / 改善', `
          <div class="calendar-toolbar">
            ${btn('前の月', 'changeCalendarMonth', { delta: -1 }, 'ghost')}
            <div class="calendar-summary"><strong>${monthEntries.length}件</strong><span>この月に紐づくもの</span></div>
            ${btn('次の月', 'changeCalendarMonth', { delta: 1 }, 'ghost')}
          </div>
          <div class="calendar-weekdays">
            ${weekLabels.map((label) => `<span>${label}</span>`).join('')}
          </div>
          <div class="calendar-grid">
            ${daysForCalendar(month).map((date) => {
              if (!date) return '<div class="calendar-day empty-day" aria-hidden="true"></div>';
              const entries = calendarEntriesForDate(date);
              const isSelected = date === selectedDate;
              const isToday = date === todayISO();
              return `<button class="calendar-day ${entries.length ? 'has-items' : ''} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}" data-action="selectCalendarDate" data-date="${escapeHtml(date)}">
                <span class="day-number">${Number(date.slice(-2))}</span>
                <span class="day-dots">
                  ${entries.slice(0, 3).map((entry) => `<i class="dot-${escapeHtml(entry.kind)}"></i>`).join('')}
                </span>
                ${entries.length > 3 ? `<small>+${entries.length - 3}</small>` : ''}
              </button>`;
            }).join('')}
          </div>
        `)}
        ${card(selectedDate, 'この日に入っているもの', `
          ${selectedEntries.length ? `<div class="list">${selectedEntries.map((entry) => {
            const project = projectById(entry.projectId);
            return `<button class="item" data-action="openCalendarEntry" data-project-id="${escapeHtml(entry.projectId || '')}" data-screen="${escapeHtml(calendarTargetScreen(entry))}">
              <div class="item-main"><div class="item-title">${escapeHtml(entry.label)}</div><div class="item-sub">${escapeHtml(projectLabel(project))} / ${escapeHtml(entry.source)}</div></div>
              <span class="tag light">開く</span>
            </button>`;
          }).join('')}</div>` : '<div class="empty">この日にはまだ予定・記録・改善がありません。</div>'}
        `, `${btn('この日に記録する', 'calendarCapture', { date: selectedDate }, 'primary')}${btn('未確認を片付ける', 'go', { screen: 'inbox', tab: '思い出' }, state.inbox.length ? 'warn' : 'ghost')}`)}
      </main>`;
    app.innerHTML = layout(body);
  }

  function renderPlan() {
    const project = activeProject().type === 'camp' ? activeProject() : campProject();
    const percent = prepPercent(project);
    const body = `
      <section class="hero">
        <h1>次のキャンプ</h1>
        <p>${escapeHtml(project.memo)}</p>
      </section>
      <main class="stack">
        ${card(project.place, '予定詳細', `
          <div class="metric-row">
            <div class="metric"><small>日程</small><strong>${escapeHtml(projectDate(project))}</strong></div>
            <div class="metric"><small>同行</small><strong>${escapeHtml(project.party)}</strong></div>
            <div class="metric"><small>チェックイン</small><strong>${escapeHtml(project.checkin)}</strong></div>
            <div class="metric"><small>チェックアウト</small><strong>${escapeHtml(project.checkout)}</strong></div>
            <div class="metric"><small>天気</small><strong>${escapeHtml(project.weather)}</strong></div>
            <div class="metric"><small>ルート</small><strong>${escapeHtml(project.route)}</strong></div>
          </div>
          <div class="progress"><span style="width:${percent}%"></span></div>
        `, `${btn('準備する', 'openProject', { projectId: project.id, screen: 'prep', tab: '準備' })}${btn('当日運転席', 'openProject', { projectId: project.id, screen: 'cockpit', tab: '予定' }, 'ghost')}${btn('思い出を見る', 'openProject', { projectId: project.id, screen: 'memories', tab: '思い出' }, 'ghost')}`)}
        ${card('予定を整える', '編集できる', `
          <div class="grid-2">
            ${btn('キャンプ場名', 'editCampField', { field: 'place', label: 'キャンプ場名' }, 'ghost')}
            ${btn('日程', 'editDates', {}, 'ghost')}
            ${btn('同行', 'editCampField', { field: 'party', label: '同行' }, 'ghost')}
            ${btn('チェックイン', 'editCampField', { field: 'checkin', label: 'チェックイン' }, 'ghost')}
            ${btn('チェックアウト', 'editCampField', { field: 'checkout', label: 'チェックアウト' }, 'ghost')}
            ${btn('天気メモ', 'editCampField', { field: 'weather', label: '天気メモ' }, 'ghost')}
            ${btn('ルートメモ', 'editCampField', { field: 'route', label: 'ルートメモ' }, 'ghost')}
            ${btn('予定メモ', 'editCampField', { field: 'memo', label: '予定メモ' }, 'ghost')}
          </div>
        `)}
        ${card('準備状況', 'この予定に紐づく', `
          <div class="list">
            ${project.prep.map((item) => `
              <button class="item" data-action="togglePrep" data-id="${escapeHtml(item.id)}">
                <div class="item-main"><div class="item-title">${escapeHtml(item.key)}</div><div class="item-sub">${escapeHtml(item.note)}</div></div>
                <span class="tag ${item.status === '確認済み' ? '' : 'light'}">${escapeHtml(item.status)}</span>
              </button>
            `).join('')}
          </div>
        `)}
      </main>`;
    app.innerHTML = layout(body);
  }

  function renderSearch() {
    const project = activeProject().type === 'search' ? activeProject() : projectById('search-next-camp') || activeProject();
    const conditions = ['犬可', 'ドッグフリー', '温水', '景色', '距離', '料金', '季節', '天気', 'コタ向き'];
    const body = `
      <section class="hero">
        <h1>キャンプ場を探す</h1>
        <p>候補は、予定・準備・ルート・思い出へつなげます。</p>
      </section>
      <main class="stack">
        ${card(project.title, '候補の流れ', `
          <p class="card-text">${escapeHtml(project.memo)}</p>
          <div class="metric-row">
            <div class="metric"><small>保存先</small><strong>${escapeHtml(projectLabel(project))}</strong></div>
            <div class="metric"><small>候補メモ</small><strong>${countByProject(state.inbox, project.id) + countByProject(state.memories, project.id)}件</strong></div>
          </div>
        `)}
        ${card('探す条件', '候補づくり', `
          <div class="grid-2">
            ${conditions.map((text) => `<button class="btn ghost" data-action="addRecord" data-type="メモ" data-project-id="${escapeHtml(project.id)}" data-target="候補条件" data-text="${escapeHtml(text)}を候補条件に残す">${escapeHtml(text)}</button>`).join('')}
          </div>
        `)}
        ${card('候補カード', '次につなぐ', `
          <p class="card-text">行きたい理由だけでなく、行かない理由も残します。予定にする時は、準備・ルート・天気までつなげます。</p>
        `, `${btn('候補に残す', 'addRecord', { type: 'メモ', projectId: project.id, target: '候補', text: '候補キャンプ場メモ' })}${btn('予定に育てる', 'promoteSearch', { projectId: project.id }, 'ghost')}${btn('行かない理由を残す', 'addRecord', { type: 'メモ', projectId: project.id, target: '候補', text: '行かない理由メモ' }, 'ghost')}`)}
      </main>`;
    app.innerHTML = layout(body);
  }

  function renderPrep() {
    const project = activeProject().type === 'camp' ? activeProject() : campProject();
    const percent = prepPercent(project);
    const body = `
      <section class="hero">
        <h1>準備</h1>
        <p>${escapeHtml(project.place)} の準備を、買い物・料理・ギア・コタ・天気・ルートでつなげます。</p>
      </section>
      <main class="stack">
        ${card('準備率', '出発前の状態', `
          <div class="metric-row">
            <div class="metric"><small>全体</small><strong>${percent}%</strong></div>
            <div class="metric"><small>ギア</small><strong>${escapeHtml(checklistText(project.gear))}</strong></div>
            <div class="metric"><small>コタ</small><strong>${escapeHtml(checklistText(project.kota))}</strong></div>
            <div class="metric"><small>天気/ルート</small><strong>${checkedCount(project.weatherChecks) + checkedCount(project.routeChecks)}/${project.weatherChecks.length + project.routeChecks.length}</strong></div>
          </div>
          <div class="progress"><span style="width:${percent}%"></span></div>
        `, `${btn('当日運転席へ', 'openProject', { projectId: project.id, screen: 'cockpit', tab: '予定' }, 'primary')}${btn('予定詳細', 'openProject', { projectId: project.id, screen: 'plan', tab: '予定' }, 'ghost')}`)}
        ${card('今日やること', '準備する', `
          <div class="list">
            ${project.prep.map((item) => `
              <button class="item" data-action="openPrepItem" data-key="${escapeHtml(item.key)}">
                <div class="item-main"><div class="item-title">${escapeHtml(item.key)}を確認</div><div class="item-sub">${escapeHtml(item.note)}</div></div>
                <span class="tag ${item.status === '確認済み' ? '' : 'light'}">${escapeHtml(item.status)}</span>
              </button>
            `).join('')}
          </div>
        `)}
        ${card('準備を残す', '未確認箱へ', `
          <p class="card-text">迷ったもの、足りなかったもの、次回減らすものは、準備中でも未確認箱に残します。</p>
        `, `${btn('忘れ物メモ', 'addRecord', { type: 'メモ', projectId: project.id, target: '準備', text: '忘れ物候補' }, 'ghost')}${btn('次回減らすもの', 'addImprovement', { projectId: project.id, text: '次回は持ち物を減らす', target: 'ギア' }, 'ghost')}`)}
      </main>`;
    app.innerHTML = layout(body);
  }

  function renderShopping() {
    const project = activeProject().type === 'camp' ? activeProject() : campProject();
    const groups = ['食材', '調味料', '消耗品', '今回は買わないもの'];
    const body = `
      <section class="hero">
        <h1>買い物</h1>
        <p>料理計画から反映されています。数量・担当・代替品まで確認します。</p>
      </section>
      <main class="stack">
        ${card('買い物の状態', 'LINEに貼れる', `
          <div class="metric-row">
            <div class="metric"><small>未購入</small><strong>${project.shopping.filter((item) => item.group !== '今回は買わないもの' && item.state !== '買った').length}件</strong></div>
            <div class="metric"><small>買った</small><strong>${project.shopping.filter((item) => item.state === '買った').length}件</strong></div>
            <div class="metric"><small>買わない</small><strong>${project.shopping.filter((item) => item.group === '今回は買わないもの').length}件</strong></div>
          </div>
        `, `${btn('LINE用にコピー', 'copyShopping', {}, 'primary')}${btn('未購入だけコピー', 'copyShoppingOpen', {}, 'ghost')}`)}
        ${groups.map((group) => card(group, '買い忘れ防止', `
          <div class="list">
            ${project.shopping.filter((item) => item.group === group).map((item) => `
              <div class="item">
                <div class="item-main"><div class="item-title">${escapeHtml(item.name)}</div><div class="item-sub">${escapeHtml(item.qty)} / ${escapeHtml(item.owner)} / ${escapeHtml(item.detail)}</div></div>
                <div class="actions compact-actions">
                  <button class="tag light" data-action="editShoppingItem" data-id="${escapeHtml(item.id)}">編集</button>
                  <button class="tag ${item.state === '未購入' ? 'light' : ''}" data-action="toggleShopping" data-id="${escapeHtml(item.id)}">${escapeHtml(item.state)}</button>
                </div>
              </div>
            `).join('') || '<div class="empty">ここに追加した買い物が入ります。</div>'}
          </div>
        `)).join('')}
        ${card('追加する', '料理と準備から増やす', `
          <p class="card-text">売っていなかったもの、追加したい調味料、買わない判断をここで残します。</p>
        `, `${btn('食材を追加', 'addShoppingItem', { group: '食材' }, 'primary')}${btn('調味料を追加', 'addShoppingItem', { group: '調味料' }, 'ghost')}${btn('買わないものを追加', 'addShoppingItem', { group: '今回は買わないもの' }, 'ghost')}${btn('料理に戻る', 'go', { screen: 'cooking', tab: '準備' }, 'ghost')}`)}
      </main>`;
    app.innerHTML = layout(body);
  }

  function renderCooking() {
    const project = activeProject().type === 'camp' ? activeProject() : campProject();
    const body = `
      <section class="hero">
        <h1>料理計画</h1>
        <p>日程・人数・量・設営時間を見ながら、買い物と当日料理へ反映します。</p>
      </section>
      <main class="stack">
        ${card('量の確認', '食べすぎ防止', `
          <div class="metric-row">
            <div class="metric"><small>人数</small><strong>${escapeHtml(project.party)}</strong></div>
            <div class="metric"><small>注意</small><strong>貝なし / 魚卵なし</strong></div>
            <div class="metric"><small>夜</small><strong>量を増やしすぎない</strong></div>
          </div>
          <p class="card-text">多すぎた料理、買わなかった食材、次回減らすものは改善へ戻します。</p>
        `)}
        ${card('食べる流れ', '買い物へ反映', `
          <div class="list">
            ${project.meals.map((meal) => `
              <div class="item">
                <div class="item-main"><div class="item-title">${escapeHtml(meal.slot)}：${escapeHtml(meal.menu)}</div><div class="item-sub">${escapeHtml(meal.caution)}</div></div>
                <div class="actions compact-actions">
                  <button class="tag light" data-action="editMeal" data-id="${escapeHtml(meal.id)}">編集</button>
                  <button class="tag light" data-action="addMealToShopping" data-id="${escapeHtml(meal.id)}">買い物へ</button>
                </div>
              </div>
            `).join('')}
          </div>
        `, `${btn('買い物を見る', 'go', { screen: 'shopping', tab: '準備' })}${btn('当日料理に送る', 'go', { screen: 'cockpit', tab: '予定' }, 'ghost')}`)}
        ${card('当日後に聞くこと', '次回改善へ', `
          <div class="list">
            ${['量はどうだった？', '味はどうだった？', '余った？', '次回も作る？', '次回は減らす？', '買わなくてよかったものは？'].map((text) => `<button class="item" data-action="addImprovement" data-text="${escapeHtml(text)}" data-project-id="${escapeHtml(project.id)}" data-target="料理"><div class="item-main"><div class="item-title">${escapeHtml(text)}</div><div class="item-sub">思い出から次回改善へ送ります</div></div><span class="tag light">追加</span></button>`).join('')}
          </div>
        `)}
      </main>`;
    app.innerHTML = layout(body);
  }

  function renderGear() {
    const project = activeProject().type === 'camp' ? activeProject() : campProject();
    const body = `
      <section class="hero">
        <h1>ギア準備</h1>
        <p>持つもの、使った結果、乾燥までこの予定に残します。</p>
      </section>
      <main class="stack">
        ${card('ギア確認', '準備率に反映', `
          <div class="metric-row">
            <div class="metric"><small>確認済み</small><strong>${escapeHtml(checklistText(project.gear))}</strong></div>
            <div class="metric"><small>乾燥</small><strong>撤収後に確認</strong></div>
          </div>
        `, `${btn('ギアを追加', 'addGearItem', {}, 'primary')}${btn('準備へ戻る', 'go', { screen: 'prep', tab: '準備' }, 'ghost')}`)}
        ${groupNames(project.gear).map((group) => card(group, '持ち物', `
          <div class="list">
            ${project.gear.filter((item) => item.group === group).map((item) => `
              <div class="item">
                <div class="item-main"><div class="item-title">${escapeHtml(item.name)}</div><div class="item-sub">${escapeHtml(item.qty)} / ${escapeHtml(item.note)}</div></div>
                <div class="actions compact-actions">
                  <button class="tag ${item.done ? '' : 'light'}" data-action="toggleGear" data-id="${escapeHtml(item.id)}">${item.done ? '確認済み' : '確認'}</button>
                  <button class="tag light" data-action="addRecord" data-type="メモ" data-project-id="${escapeHtml(project.id)}" data-target="ギア" data-text="${escapeHtml(item.name)}の使用結果">使用結果</button>
                </div>
              </div>
            `).join('')}
          </div>
        `)).join('')}
      </main>`;
    app.innerHTML = layout(body);
  }

  function renderKota() {
    const project = activeProject().type === 'camp' ? activeProject() : campProject();
    const body = `
      <section class="hero">
        <h1>コタ用品</h1>
        <p>ごはん・水・移動・暑さ寒さ対策を、キャンプ予定に紐づけます。</p>
      </section>
      <main class="stack">
        ${card('コタの準備', '忘れ物防止', `
          <div class="metric-row">
            <div class="metric"><small>確認済み</small><strong>${escapeHtml(checklistText(project.kota))}</strong></div>
            <div class="metric"><small>当日</small><strong>様子を残す</strong></div>
          </div>
        `, `${btn('コタ用品を追加', 'addKotaItem', {}, 'primary')}${btn('コタの様子を残す', 'addRecord', { type: 'メモ', projectId: project.id, target: 'コタ', text: 'コタの様子' }, 'ghost')}${btn('準備へ戻る', 'go', { screen: 'prep', tab: '準備' }, 'ghost')}`)}
        ${groupNames(project.kota).map((group) => card(group, 'コタ用品', `
          <div class="list">
            ${project.kota.filter((item) => item.group === group).map((item) => `
              <div class="item">
                <div class="item-main"><div class="item-title">${escapeHtml(item.name)}</div><div class="item-sub">${escapeHtml(item.qty)} / ${escapeHtml(item.note)}</div></div>
                <button class="tag ${item.done ? '' : 'light'}" data-action="toggleKota" data-id="${escapeHtml(item.id)}">${item.done ? '確認済み' : '確認'}</button>
              </div>
            `).join('')}
          </div>
        `)).join('')}
      </main>`;
    app.innerHTML = layout(body);
  }

  function renderWeatherRoute() {
    const project = activeProject().type === 'camp' ? activeProject() : campProject();
    const body = `
      <section class="hero">
        <h1>天気とルート</h1>
        <p>雨・風・気温・出発・買い出しを、当日運転席へつなげます。</p>
      </section>
      <main class="stack">
        ${card('天気確認', '設営と撤収に反映', `
          <div class="list">
            ${project.weatherChecks.map((item) => `
              <div class="item">
                <div class="item-main"><div class="item-title">${escapeHtml(item.name)}</div><div class="item-sub">${escapeHtml(item.note)}</div></div>
                <button class="tag ${item.done ? '' : 'light'}" data-action="toggleWeather" data-id="${escapeHtml(item.id)}">${item.done ? '確認済み' : '確認'}</button>
              </div>
            `).join('')}
          </div>
        `, `${btn('雨対策メモ', 'addRecord', { type: 'メモ', projectId: project.id, target: '天気', text: '雨対策メモ' }, 'ghost')}${btn('風対策メモ', 'addRecord', { type: 'メモ', projectId: project.id, target: '天気', text: '風対策メモ' }, 'ghost')}`)}
        ${card('ルート確認', '出発から帰宅まで', `
          <div class="list">
            ${project.routeChecks.map((item) => `
              <div class="item">
                <div class="item-main"><div class="item-title">${escapeHtml(item.name)}</div><div class="item-sub">${escapeHtml(item.note)}</div></div>
                <button class="tag ${item.done ? '' : 'light'}" data-action="toggleRoute" data-id="${escapeHtml(item.id)}">${item.done ? '確認済み' : '確認'}</button>
              </div>
            `).join('')}
          </div>
        `, `${btn('買い出しメモ', 'addRecord', { type: 'メモ', projectId: project.id, target: 'ルート', text: '買い出し場所メモ' }, 'ghost')}${btn('当日運転席へ', 'go', { screen: 'cockpit', tab: '予定' }, 'primary')}${btn('準備へ戻る', 'go', { screen: 'prep', tab: '準備' }, 'ghost')}`)}
      </main>`;
    app.innerHTML = layout(body);
  }

  function renderCockpit() {
    const project = activeProject().type === 'camp' ? activeProject() : campProject();
    const current = activeDayStep(project);
    const counts = dayStepCounts(project);
    const currentRecords = current ? stepRecords(project.id, current.id) : [];
    const body = `
      <section class="hero cockpit-hero">
        <h1>当日運転席</h1>
        <p>停車中に見る画面です。次にやること、工程ごとの写真・声メモ・メモ、間違えた時の戻しをここにまとめます。</p>
      </section>
      <main class="stack">
        ${card('今やること', current?.title || '当日の流れ', `
          <p class="card-text"><strong>${escapeHtml(project.place)}</strong><br>${escapeHtml(projectDate(project))} / ${escapeHtml(project.party)}</p>
          <div class="metric-row">
            <div class="metric"><small>進行</small><strong>${counts.done}/${counts.total}</strong></div>
            <div class="metric"><small>状態</small><strong>${current ? escapeHtml(stepStatusText(current)) : '待ち'}</strong></div>
            <div class="metric"><small>この工程の記録</small><strong>${currentRecords.length}件</strong></div>
            <div class="metric"><small>操作</small><strong>停車中のみ</strong></div>
          </div>
          <div class="progress"><span style="width:${counts.total ? Math.round((counts.done / counts.total) * 100) : 0}%"></span></div>
          <p class="note">${escapeHtml(current?.note || '工程を選んで記録します。')}</p>
        `, current ? `
          ${btn('この工程を開始', 'startDayStep', { stepId: current.id, projectId: project.id }, current.state === '進行中' ? 'ghost' : 'primary')}
          ${btn('写真', 'addRecord', { type: '写真', projectId: project.id, stepId: current.id, target: current.title, text: `${current.title}の写真` }, 'ghost')}
          ${btn('声メモ', 'addRecord', { type: '声', projectId: project.id, stepId: current.id, target: current.title, text: `${current.title}の声メモ` }, 'ghost')}
          ${btn('メモを書く', 'writeStepMemo', { stepId: current.id, projectId: project.id }, 'ghost')}
          ${btn('この工程を完了', 'finishDayStep', { stepId: current.id, projectId: project.id }, 'primary')}
          ${btn('完了を戻す', 'reopenDayStep', { stepId: current.id, projectId: project.id }, 'warn')}
        ` : '')}

        ${card('当日の流れ', '工程ごとに残す', `
          <div class="cockpit-steps">
            ${project.daySteps.map((step, index) => {
              const records = stepRecords(project.id, step.id);
              return `
                <section class="cockpit-step ${stepStatusClass(step)} ${current?.id === step.id ? 'active-step' : ''}">
                  <button class="step-head" data-action="selectDayStep" data-project-id="${escapeHtml(project.id)}" data-step-id="${escapeHtml(step.id)}">
                    <span class="step-no">${index + 1}</span>
                    <span class="step-copy"><strong>${escapeHtml(step.title)}</strong><small>${escapeHtml(step.note)}</small></span>
                    <span class="tag ${step.state === '完了' ? '' : 'light'}">${escapeHtml(stepStatusText(step))}</span>
                  </button>
                  <div class="step-tools">
                    <button class="btn ghost" data-action="startDayStep" data-project-id="${escapeHtml(project.id)}" data-step-id="${escapeHtml(step.id)}">開始</button>
                    <button class="btn ghost" data-action="addRecord" data-type="写真" data-project-id="${escapeHtml(project.id)}" data-step-id="${escapeHtml(step.id)}" data-target="${escapeHtml(step.title)}" data-text="${escapeHtml(`${step.title}の写真`)}">写真</button>
                    <button class="btn ghost" data-action="addRecord" data-type="声" data-project-id="${escapeHtml(project.id)}" data-step-id="${escapeHtml(step.id)}" data-target="${escapeHtml(step.title)}" data-text="${escapeHtml(`${step.title}の声メモ`)}">声メモ</button>
                    <button class="btn ghost" data-action="writeStepMemo" data-project-id="${escapeHtml(project.id)}" data-step-id="${escapeHtml(step.id)}">メモ</button>
                    <button class="btn primary" data-action="finishDayStep" data-project-id="${escapeHtml(project.id)}" data-step-id="${escapeHtml(step.id)}">完了</button>
                    <button class="btn warn" data-action="reopenDayStep" data-project-id="${escapeHtml(project.id)}" data-step-id="${escapeHtml(step.id)}">戻す</button>
                  </div>
                  <div class="step-records">${records.length ? `${records.length}件 未確認箱/思い出に保存` : 'まだ記録なし'}</div>
                </section>
              `;
            }).join('')}
          </div>
        `)}

        ${card('当日から戻す先', '整理につなげる', `
          <div class="grid-2">
            <button class="btn ghost" data-action="go" data-screen="inbox" data-tab="思い出">未確認箱を見る</button>
            <button class="btn ghost" data-action="go" data-screen="memories" data-tab="思い出">思い出を見る</button>
            <button class="btn ghost" data-action="go" data-screen="improvements" data-tab="思い出">次回改善を見る</button>
            <button class="btn ghost" data-action="go" data-screen="prep" data-tab="準備">準備へ戻る</button>
          </div>
          <p class="note">当日の記録は勝手に確定しません。工程ごとに未確認箱へ入り、ムーが保存先を決めます。</p>
        `)}
      </main>`;
    app.innerHTML = layout(body, { subtitle: '当日を工程ごとに残す' });
  }

  function renderWalk(kind) {
    const project = kind === 'camp' ? projectById('campwalk-akagi') || activeProject() : projectById('walk-home-kota') || activeProject();
    const title = kind === 'camp' ? 'キャンプ場散歩' : '自宅散歩';
    const parent = kind === 'camp' ? parentCampFor(project) : null;
    const subtitle = kind === 'camp' ? `${parent.place} の子記録に残します` : 'コタとの散歩を記録します';
    const places = kind === 'camp' ? ['サイト周辺', 'トイレ', '炊事場', '売店', '景色', 'ドッグラン', '危険箇所', 'コタ向き'] : ['いつもの道', 'コタの様子', '場所メモ', '次回散歩メモ'];
    const body = `
      <section class="hero">
        <h1>${title}</h1>
        <p>${escapeHtml(subtitle)}</p>
      </section>
      <main class="stack">
        ${card('地図', kind === 'camp' ? 'キャンプ滞在に紐づく' : '自宅散歩履歴へ', `
          <div class="map-box" aria-label="地図の表示領域"></div>
          <div class="metric-row">
            <div class="metric"><small>距離</small><strong>${state.walk?.kind === kind ? state.walk.distance : '0.0'}km</strong></div>
            <div class="metric"><small>時間</small><strong>${state.walk?.kind === kind ? state.walk.time : '00:00'}</strong></div>
            <div class="metric"><small>コタ</small><strong>通常</strong></div>
          </div>
        `, `${btn('散歩開始', 'startWalk', { kind, projectId: project.id }, 'primary')}${btn('写真', 'addRecord', { type: '写真', projectId: project.id, target: title, text: `${title}の写真` }, 'ghost')}${btn('声メモ', 'addRecord', { type: '声', projectId: project.id, target: title, text: `${title}の声メモ` }, 'ghost')}${btn('終了', 'endWalk', { kind, projectId: project.id }, 'warn')}`)}
        ${card(kind === 'camp' ? '場内メモ' : '残すこと', '場所カード', `
          <div class="grid-2">
            ${places.map((place) => `<button class="btn ghost" data-action="addRecord" data-type="メモ" data-project-id="${escapeHtml(project.id)}" data-target="${escapeHtml(title)}" data-text="${escapeHtml(place)}">${escapeHtml(place)}</button>`).join('')}
          </div>
        `)}
      </main>`;
    app.innerHTML = layout(body);
  }

  function renderCapture() {
    const project = activeProject();
    const body = `
      <section class="hero">
        <h1>今これを残す</h1>
        <p>写真・動画・声・メモ・GPSを残します。保存先は候補だけ出し、確定はムーが決めます。</p>
      </section>
      <main class="stack">
        ${card('記録する', 'その場で残す', `
          <p class="note">今の保存先候補：${escapeHtml(projectLabel(project))}</p>
          <div class="grid-2">
            ${['写真', '動画', '声', 'メモ', 'GPS', 'あとで整理'].map((type) => `<button class="btn ${type === 'あとで整理' ? 'warn' : 'primary'}" data-action="addRecord" data-type="${type}" data-project-id="${escapeHtml(project.id)}" data-target="${escapeHtml(projectLabel(project))}" data-text="${type}を残しました">${type}</button>`).join('')}
          </div>
          <div class="field">
            <label for="quickMemo">手入力メモ</label>
            <textarea id="quickMemo" placeholder="例：風が強い、設営に時間がかかった、コタが歩きやすそう"></textarea>
          </div>
        `, `${btn('メモを未確認箱へ', 'saveQuickMemo', { projectId: project.id }, 'primary')}`)}
        ${card('保存先候補', 'AIとGPSは候補だけ', `
          <div class="list">
            ${state.projects.map((candidate) => `<button class="item" data-action="switchProject" data-project-id="${escapeHtml(candidate.id)}"><div class="item-main"><div class="item-title">${escapeHtml(projectLabel(candidate))}</div><div class="item-sub">${escapeHtml(candidate.title)} に残す候補として使います</div></div><span class="tag ${candidate.id === project.id ? '' : 'light'}">候補</span></button>`).join('')}
          </div>
        `)}
      </main>`;
    app.innerHTML = layout(body);
  }

  function renderMemories() {
    const project = activeProject();
    const projectMemories = state.memories.filter((record) => record.projectId === project.id);
    const body = `
      <section class="hero">
        <h1>思い出</h1>
        <p>アルバムで終わらせず、次回改善に戻します。</p>
      </section>
      <main class="stack">
        ${card('見る流れを選ぶ', '予定別に整理', `${projectSwitch()}`)}
        ${card(project.title, '時系列', `
          ${projectMemories.length ? `<div class="list">${projectMemories.map((record) => memoryItem(record)).join('')}</div>` : '<div class="empty">まだ思い出に確定した記録はありません。未確認箱から移すとここに並びます。</div>'}
        `, `${btn('未確認を片付ける', 'go', { screen: 'inbox', tab: '思い出' }, state.inbox.length ? 'warn' : 'ghost')}${btn('次回改善へ', 'go', { screen: 'improvements', tab: '思い出' }, 'ghost')}`)}
        ${card('振り返り', '次に活かす', `
          <div class="grid-2">
            ${['良かったこと', '失敗したこと', '忘れ物', '料理の量', 'ギア使用結果', 'コタの様子', '天気と撤収', '場所カード'].map((text) => `<button class="btn ghost" data-action="addImprovement" data-project-id="${escapeHtml(project.id)}" data-text="${escapeHtml(text)}を振り返る">${escapeHtml(text)}</button>`).join('')}
          </div>
        `)}
      </main>`;
    app.innerHTML = layout(body);
  }

  function memoryItem(record) {
    return `
      <div class="item">
        <div class="item-main">
          <div class="item-title">${escapeHtml(record.type)} / ${escapeHtml(record.target)}</div>
          <div class="item-sub">${escapeHtml(record.text)} · ${escapeHtml(record.time)}</div>
        </div>
        <button class="tag light" data-action="improveFromMemory" data-id="${escapeHtml(record.id)}">改善へ</button>
      </div>
    `;
  }

  function renderImprovements() {
    const project = activeProject();
    const list = state.improvements.filter((item) => item.projectId === project.id);
    const body = `
      <section class="hero">
        <h1>次回改善</h1>
        <p>この記録を、次の準備に戻します。</p>
      </section>
      <main class="stack">
        ${card('反映する流れを選ぶ', '予定別に戻す', `${projectSwitch()}`)}
        ${card('改善候補', '準備へ反映', `
          ${list.length ? `<div class="list">${list.map((item) => `
            <div class="item">
              <div class="item-main"><div class="item-title">${escapeHtml(item.text)}</div><div class="item-sub">反映先：${escapeHtml(item.target || '次の準備')}</div></div>
              <button class="tag ${item.done ? '' : 'light'}" data-action="reflectImprovement" data-id="${escapeHtml(item.id)}">${item.done ? '反映済み' : '反映'}</button>
            </div>
          `).join('')}</div>` : '<div class="empty">思い出から次回改善に送るとここに並びます。</div>'}
        `)}
        ${card('反映先', '戻す場所', `
          <div class="grid-2">
            ${['買い物', '料理', 'ギア', 'コタ', '天気', 'ルート', '探す', '次の予定'].map((text) => `<button class="btn ghost" data-action="addImprovement" data-project-id="${escapeHtml(project.id)}" data-text="${escapeHtml(text)}に反映する改善" data-target="${escapeHtml(text)}">${escapeHtml(text)}</button>`).join('')}
          </div>
        `)}
      </main>`;
    app.innerHTML = layout(body);
  }

  function renderInbox() {
    const body = `
      <section class="hero">
        <h1>未確認箱</h1>
        <p>保存先がまだ確定していない記録です。勝手に削除せず、移動・修正・復旧できます。</p>
      </section>
      <main class="stack">
        ${card('あとで整理', '復旧できる', `
          ${state.inbox.length ? `<div class="list">${state.inbox.map((record) => inboxItem(record)).join('')}</div>` : '<div class="empty">未確認の記録はありません。＋から残したものがここに入ります。</div>'}
        `)}
      </main>`;
    app.innerHTML = layout(body);
  }

  function inboxItem(record) {
    const project = projectById(record.projectId);
    return `
      <div class="item ${record.status === '削除候補' ? 'item-warn' : ''}">
        <div class="item-main">
          <div class="item-title">${escapeHtml(record.type)} / 候補：${escapeHtml(projectLabel(project))}</div>
          <div class="item-sub">${escapeHtml(record.target)} · ${escapeHtml(record.text)} · ${escapeHtml(record.time)}${record.status === '削除候補' ? ' · 削除候補。まだ戻せます' : ''}</div>
        </div>
        <div class="actions">
          ${record.status === '削除候補'
            ? `<button class="btn primary" data-action="restoreRecord" data-id="${escapeHtml(record.id)}">元に戻す</button>`
            : `<button class="btn primary" data-action="confirmRecord" data-id="${escapeHtml(record.id)}">確定</button>
               <button class="btn ghost" data-action="chooseRecordTarget" data-id="${escapeHtml(record.id)}">保存先を選ぶ</button>
               <button class="btn ghost" data-action="deleteCandidate" data-id="${escapeHtml(record.id)}">削除候補</button>`}
        </div>
      </div>
    `;
  }

  function addRecord(type, projectId, target, text, stepId = '') {
    const project = projectById(projectId) || activeProject();
    const record = {
      id: makeId('rec'),
      projectId: project.id,
      stepId,
      type,
      target,
      text,
      time: new Date().toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      date: state.captureDate || todayISO(),
      createdAt: new Date().toISOString(),
      status: '未確認'
    };
    state.inbox.unshift(record);
    state.captureDate = '';
    saveState();
    showToast('未確認箱に残しました');
  }

  function makeId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function copyShopping(openOnly = false) {
    const project = activeProject().type === 'camp' ? activeProject() : campProject();
    const targetItems = openOnly ? project.shopping.filter((item) => item.state === '未購入') : project.shopping;
    const lines = [openOnly ? '未購入リスト' : '買い物リスト', '', '■食材'];
    targetItems.filter((item) => item.group === '食材').forEach((item) => lines.push(`・${item.name}（${item.qty} / ${item.owner}${item.detail ? ` / ${item.detail}` : ''}）`));
    lines.push('', '■調味料');
    targetItems.filter((item) => item.group === '調味料').forEach((item) => lines.push(`・${item.name}（${item.qty} / ${item.owner}${item.detail ? ` / ${item.detail}` : ''}）`));
    lines.push('', '■消耗品');
    targetItems.filter((item) => item.group === '消耗品').forEach((item) => lines.push(`・${item.name}（${item.qty} / ${item.owner}${item.detail ? ` / ${item.detail}` : ''}）`));
    if (!openOnly) {
      lines.push('', '■今回は買わない');
      targetItems.filter((item) => item.group === '今回は買わないもの').forEach((item) => lines.push(`・${item.name}`));
    }
    const text = lines.join('\n');
    navigator.clipboard?.writeText(text).then(() => showToast('LINE用にコピーしました')).catch(() => showToast('コピー文を作りました'));
  }

  function currentQuickMemo() {
    const input = document.getElementById('quickMemo');
    return input?.value?.trim() || 'あとで整理するメモ';
  }

  function promptText(label, currentValue) {
    const answer = window.prompt(`${label}を入力`, currentValue || '');
    if (answer === null) return null;
    return answer.trim();
  }

  function render() {
    switch (state.screen) {
      case 'calendar': renderCalendar(); break;
      case 'plan': renderPlan(); break;
      case 'search': renderSearch(); break;
      case 'prep': renderPrep(); break;
      case 'shopping': renderShopping(); break;
      case 'cooking': renderCooking(); break;
      case 'gear': renderGear(); break;
      case 'kota': renderKota(); break;
      case 'weatherRoute': renderWeatherRoute(); break;
      case 'cockpit': renderCockpit(); break;
      case 'homeWalk': renderWalk('home'); break;
      case 'campWalk': renderWalk('camp'); break;
      case 'capture': renderCapture(); break;
      case 'memories': renderMemories(); break;
      case 'improvements': renderImprovements(); break;
      case 'inbox': renderInbox(); break;
      default: renderHome(); break;
    }
  }

  app.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;

    if (action === 'go') {
      setScreen(button.dataset.screen, button.dataset.tab || null);
      return;
    }

    if (action === 'openCalendarDate') {
      state.selectedDate = button.dataset.date;
      state.calendarMonth = button.dataset.date.slice(0, 7);
      setScreen('calendar', '予定');
      return;
    }

    if (action === 'changeCalendarMonth') {
      state.calendarMonth = addMonths(state.calendarMonth, Number(button.dataset.delta || 0));
      state.selectedDate = `${state.calendarMonth}-01`;
      saveState();
      renderCalendar();
      return;
    }

    if (action === 'selectCalendarDate') {
      state.selectedDate = button.dataset.date;
      saveState();
      renderCalendar();
      return;
    }

    if (action === 'openCalendarEntry') {
      if (button.dataset.projectId && projectById(button.dataset.projectId)) state.activeProjectId = button.dataset.projectId;
      setScreen(button.dataset.screen || 'plan', button.dataset.screen === 'memories' || button.dataset.screen === 'improvements' || button.dataset.screen === 'inbox' ? '思い出' : '予定');
      return;
    }

    if (action === 'calendarCapture') {
      state.screen = 'capture';
      state.activeTab = '＋';
      state.captureDate = button.dataset.date;
      saveState();
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (action === 'switchProject') {
      setActiveProject(button.dataset.projectId);
      return;
    }

    if (action === 'openProject') {
      setActiveProject(button.dataset.projectId, button.dataset.screen, button.dataset.tab || null);
      return;
    }

    if (action === 'selectDayStep') {
      const project = projectById(button.dataset.projectId) || campProject();
      project.activeDayStepId = button.dataset.stepId;
      const step = dayStepById(project, button.dataset.stepId);
      if (step && step.state === '待ち') step.state = '次';
      saveState();
      renderCockpit();
      return;
    }

    if (action === 'startDayStep') {
      const project = projectById(button.dataset.projectId) || campProject();
      const step = dayStepById(project, button.dataset.stepId);
      if (!step) return;
      project.daySteps.forEach((entry) => {
        if (entry.id !== step.id && entry.state === '進行中') entry.state = '次';
      });
      project.activeDayStepId = step.id;
      step.state = '進行中';
      step.startedAt = step.startedAt || new Date().toISOString();
      addRecord('メモ', project.id, step.title, `${step.title}を開始`, step.id);
      renderCockpit();
      return;
    }

    if (action === 'finishDayStep') {
      const project = projectById(button.dataset.projectId) || campProject();
      const step = dayStepById(project, button.dataset.stepId);
      if (!step) return;
      step.state = '完了';
      step.finishedAt = new Date().toISOString();
      const index = project.daySteps.findIndex((entry) => entry.id === step.id);
      const next = project.daySteps.slice(index + 1).find((entry) => entry.state !== '完了');
      if (next) {
        next.state = '次';
        project.activeDayStepId = next.id;
      } else {
        project.activeDayStepId = step.id;
      }
      addRecord('メモ', project.id, step.title, `${step.title}を完了`, step.id);
      renderCockpit();
      return;
    }

    if (action === 'reopenDayStep') {
      const project = projectById(button.dataset.projectId) || campProject();
      const step = dayStepById(project, button.dataset.stepId);
      if (!step) return;
      step.state = '戻し';
      step.finishedAt = '';
      project.activeDayStepId = step.id;
      addRecord('メモ', project.id, step.title, `${step.title}を戻す`, step.id);
      renderCockpit();
      return;
    }

    if (action === 'writeStepMemo') {
      const project = projectById(button.dataset.projectId) || campProject();
      const step = dayStepById(project, button.dataset.stepId);
      if (!step) return;
      const memo = promptText(`${step.title}のメモ`, '');
      if (memo === null || !memo) return;
      addRecord('メモ', project.id, step.title, memo, step.id);
      renderCockpit();
      return;
    }

    if (action === 'openPrepItem') {
      const key = button.dataset.key;
      if (key === '買い物') setScreen('shopping', '準備');
      else if (key === '料理') setScreen('cooking', '準備');
      else if (key === 'ギア') setScreen('gear', '準備');
      else if (key === 'コタ') setScreen('kota', '準備');
      else if (key === 'ルート' || key === '天気') setScreen('weatherRoute', '準備');
      else showToast(`${key}を確認しました`);
      return;
    }

    if (action === 'togglePrep') {
      const project = activeProject().type === 'camp' ? activeProject() : campProject();
      const item = project.prep.find((entry) => entry.id === button.dataset.id);
      if (item) item.status = item.status === '確認済み' ? '未完了' : '確認済み';
      saveState();
      render();
      showToast('準備を更新しました');
      return;
    }

    if (action === 'editCampField') {
      const project = activeProject().type === 'camp' ? activeProject() : campProject();
      const field = button.dataset.field;
      const value = promptText(button.dataset.label || field, project[field]);
      if (value !== null) project[field] = value;
      if (field === 'place') project.title = value || project.title;
      saveState();
      renderPlan();
      showToast('予定を更新しました');
      return;
    }

    if (action === 'editDates') {
      const project = activeProject().type === 'camp' ? activeProject() : campProject();
      const start = promptText('開始日', project.startDate);
      if (start === null) return;
      const end = promptText('終了日', project.endDate || start);
      if (end === null) return;
      project.startDate = start;
      project.endDate = end;
      state.calendarItems = state.calendarItems.filter((item) => item.projectId !== project.id);
      state.calendarItems.push({ id: makeId('cal'), projectId: project.id, date: start, label: 'キャンプ出発', kind: 'camp' });
      state.calendarItems.push({ id: makeId('cal'), projectId: project.id, date: end, label: '撤収・帰宅', kind: 'camp' });
      saveState();
      renderPlan();
      showToast('日程を更新しました');
      return;
    }

    if (action === 'toggleShopping') {
      const project = activeProject().type === 'camp' ? activeProject() : campProject();
      const item = project.shopping.find((entry) => entry.id === button.dataset.id);
      if (item) item.state = item.state === '買った' ? '未購入' : '買った';
      updateShoppingPrep(project);
      saveState();
      renderShopping();
      showToast('買い物を更新しました');
      return;
    }

    if (action === 'editShoppingItem') {
      const project = activeProject().type === 'camp' ? activeProject() : campProject();
      const item = project.shopping.find((entry) => entry.id === button.dataset.id);
      if (!item) return;
      const name = promptText('品名', item.name);
      if (name === null) return;
      const qty = promptText('数量', item.qty);
      if (qty === null) return;
      const owner = promptText('担当・買う場所', item.owner);
      if (owner === null) return;
      const detail = promptText('代替やメモ', item.detail);
      if (detail === null) return;
      item.name = name;
      item.qty = qty;
      item.owner = owner;
      item.detail = detail;
      updateShoppingPrep(project);
      saveState();
      renderShopping();
      showToast('買い物を更新しました');
      return;
    }

    if (action === 'addShoppingItem') {
      const project = activeProject().type === 'camp' ? activeProject() : campProject();
      const group = button.dataset.group || '食材';
      const name = promptText(`${group}を追加`, '');
      if (name === null || !name) return;
      const qty = promptText('数量', group === '今回は買わないもの' ? 'なし' : '1つ');
      if (qty === null) return;
      const owner = promptText('担当・買う場所', group === '今回は買わないもの' ? '買わない' : '当日購入');
      if (owner === null) return;
      const detail = promptText('代替やメモ', '');
      if (detail === null) return;
      project.shopping.push({ id: makeId('shop'), name, group, qty, owner, detail, state: group === '今回は買わないもの' ? '今回は買わない' : '未購入' });
      updateShoppingPrep(project);
      saveState();
      renderShopping();
      showToast('買い物に追加しました');
      return;
    }

    if (action === 'copyShopping') {
      copyShopping(false);
      return;
    }

    if (action === 'copyShoppingOpen') {
      copyShopping(true);
      return;
    }

    if (action === 'editMeal') {
      const project = activeProject().type === 'camp' ? activeProject() : campProject();
      const meal = project.meals.find((entry) => entry.id === button.dataset.id);
      if (!meal) return;
      const menu = promptText(`${meal.slot}のメニュー`, meal.menu);
      if (menu === null) return;
      const caution = promptText('量や注意点', meal.caution);
      if (caution === null) return;
      meal.menu = menu;
      meal.caution = caution;
      saveState();
      renderCooking();
      showToast('料理計画を更新しました');
      return;
    }

    if (action === 'addMealToShopping') {
      const project = activeProject().type === 'camp' ? activeProject() : campProject();
      const meal = project.meals.find((entry) => entry.id === button.dataset.id);
      if (!meal) return;
      const name = promptText(`${meal.menu}で買うもの`, meal.menu);
      if (name === null || !name) return;
      const qty = promptText('数量', '必要量');
      if (qty === null) return;
      project.shopping.push({ id: makeId('shop'), name, group: '食材', qty, owner: '料理から追加', detail: `${meal.slot}：${meal.menu}`, state: '未購入' });
      updateShoppingPrep(project);
      saveState();
      renderCooking();
      showToast('買い物に反映しました');
      return;
    }

    if (action === 'toggleGear') {
      const project = activeProject().type === 'camp' ? activeProject() : campProject();
      const item = project.gear.find((entry) => entry.id === button.dataset.id);
      if (item) item.done = !item.done;
      updatePrepStatus(project, 'gear', project.gear, '確認中');
      saveState();
      renderGear();
      showToast('ギア準備を更新しました');
      return;
    }

    if (action === 'addGearItem') {
      const project = activeProject().type === 'camp' ? activeProject() : campProject();
      const name = promptText('追加するギア', '');
      if (name === null || !name) return;
      const group = promptText('分類', '追加ギア');
      if (group === null) return;
      const qty = promptText('数量', '1');
      if (qty === null) return;
      const note = promptText('メモ', '');
      if (note === null) return;
      project.gear.push({ id: makeId('gear'), group: group || '追加ギア', name, qty, note, done: false });
      updatePrepStatus(project, 'gear', project.gear, '確認中');
      saveState();
      renderGear();
      showToast('ギアを追加しました');
      return;
    }

    if (action === 'toggleKota') {
      const project = activeProject().type === 'camp' ? activeProject() : campProject();
      const item = project.kota.find((entry) => entry.id === button.dataset.id);
      if (item) item.done = !item.done;
      updatePrepStatus(project, 'kota', project.kota, '未確認');
      saveState();
      renderKota();
      showToast('コタ用品を更新しました');
      return;
    }

    if (action === 'addKotaItem') {
      const project = activeProject().type === 'camp' ? activeProject() : campProject();
      const name = promptText('追加するコタ用品', '');
      if (name === null || !name) return;
      const group = promptText('分類', '追加用品');
      if (group === null) return;
      const qty = promptText('数量', '1');
      if (qty === null) return;
      const note = promptText('メモ', '');
      if (note === null) return;
      project.kota.push({ id: makeId('kota'), group: group || '追加用品', name, qty, note, done: false });
      updatePrepStatus(project, 'kota', project.kota, '未確認');
      saveState();
      renderKota();
      showToast('コタ用品を追加しました');
      return;
    }

    if (action === 'toggleWeather') {
      const project = activeProject().type === 'camp' ? activeProject() : campProject();
      const item = project.weatherChecks.find((entry) => entry.id === button.dataset.id);
      if (item) item.done = !item.done;
      updatePrepStatus(project, 'weather', project.weatherChecks, '要確認');
      saveState();
      renderWeatherRoute();
      showToast('天気確認を更新しました');
      return;
    }

    if (action === 'toggleRoute') {
      const project = activeProject().type === 'camp' ? activeProject() : campProject();
      const item = project.routeChecks.find((entry) => entry.id === button.dataset.id);
      if (item) item.done = !item.done;
      updatePrepStatus(project, 'route', project.routeChecks, '確認中');
      saveState();
      renderWeatherRoute();
      showToast('ルート確認を更新しました');
      return;
    }

    if (action === 'addRecord') {
      addRecord(button.dataset.type || 'メモ', button.dataset.projectId || state.activeProjectId, button.dataset.target || '未確認箱', button.dataset.text || '記録', button.dataset.stepId || '');
      return;
    }

    if (action === 'saveQuickMemo') {
      addRecord('メモ', button.dataset.projectId || state.activeProjectId, projectLabel(projectById(button.dataset.projectId) || activeProject()), currentQuickMemo());
      return;
    }

    if (action === 'startWalk') {
      setActiveProject(button.dataset.projectId);
      state.walk = { kind: button.dataset.kind, projectId: button.dataset.projectId, distance: '0.0', time: '00:00', startedAt: Date.now() };
      saveState();
      showToast('散歩を開始しました');
      return;
    }

    if (action === 'endWalk') {
      const target = button.dataset.kind === 'camp' ? 'キャンプ場散歩' : '自宅散歩';
      addRecord('メモ', button.dataset.projectId || state.activeProjectId, target, `${target}を終了`);
      state.walk = null;
      saveState();
      return;
    }

    if (action === 'confirmRecord') {
      const recordIndex = state.inbox.findIndex((record) => record.id === button.dataset.id);
      const [record] = state.inbox.splice(recordIndex, 1);
      if (record) {
        record.status = '確定';
        state.memories.unshift(record);
        saveState();
        renderInbox();
        showToast('思い出に移しました');
      }
      return;
    }

    if (action === 'chooseRecordTarget') {
      const record = state.inbox.find((entry) => entry.id === button.dataset.id);
      if (!record) return;
      const labels = state.projects.map((project, index) => `${index + 1}. ${projectLabel(project)}`).join('\n');
      const answer = window.prompt(`保存先を番号で選ぶ\n${labels}`, '1');
      if (answer === null) return;
      const index = Number(answer) - 1;
      const project = state.projects[index];
      if (!project) {
        showToast('保存先は変わりませんでした');
        return;
      }
      record.projectId = project.id;
      record.target = projectLabel(project);
      saveState();
      renderInbox();
      showToast('保存先候補を変更しました');
      return;
    }

    if (action === 'deleteCandidate') {
      const record = state.inbox.find((entry) => entry.id === button.dataset.id);
      if (record) {
        record.status = '削除候補';
        saveState();
        renderInbox();
        showToast('削除候補にしました。まだ戻せます');
      }
      return;
    }

    if (action === 'restoreRecord') {
      const record = state.inbox.find((entry) => entry.id === button.dataset.id);
      if (record) {
        record.status = '未確認';
        saveState();
        renderInbox();
        showToast('未確認箱に戻しました');
      }
      return;
    }

    if (action === 'addImprovement') {
      state.improvements.unshift({ id: makeId('imp'), projectId: button.dataset.projectId || state.activeProjectId, text: button.dataset.text || '次回改善', target: button.dataset.target || '次の準備', date: todayISO(), done: false });
      saveState();
      showToast('次回改善に追加しました');
      return;
    }

    if (action === 'improveFromMemory') {
      const record = state.memories.find((entry) => entry.id === button.dataset.id);
      if (record) {
        state.improvements.unshift({ id: makeId('imp'), projectId: record.projectId, text: `${record.target}：${record.text}`, target: '次の準備', date: todayISO(), done: false });
        saveState();
        showToast('次回改善に送りました');
      }
      return;
    }

    if (action === 'reflectImprovement') {
      const item = state.improvements.find((entry) => entry.id === button.dataset.id);
      if (item) item.done = !item.done;
      saveState();
      renderImprovements();
      showToast(item?.done ? '次の準備へ反映しました' : '反映を戻しました');
      return;
    }

    if (action === 'promoteSearch') {
      const source = projectById(button.dataset.projectId) || activeProject();
      const title = promptText('予定名', source.title.replace('探し', '候補'));
      if (title === null) return;
      const newProject = {
        id: makeId('camp'),
        type: 'camp',
        title,
        label: '次のキャンプ候補',
        status: '候補',
        startDate: '',
        endDate: '',
        place: title,
        party: '夫婦＋コタ',
        checkin: '13:00',
        checkout: '11:00',
        weather: '天気を確認',
        route: 'ルートを確認',
        memo: '探すから予定に育てた候補です。',
        prep: clone(prepBase),
        shopping: clone(shoppingBase),
        meals: clone(mealsBase),
        daySteps: clone(dayStepsBase),
        activeDayStepId: 'before',
        gear: clone(gearBase),
        kota: clone(kotaBase),
        weatherChecks: clone(weatherCheckBase),
        routeChecks: clone(routeCheckBase)
      };
      state.projects.unshift(newProject);
      state.activeProjectId = newProject.id;
      state.screen = 'plan';
      state.activeTab = '予定';
      saveState();
      render();
      showToast('予定候補を作りました');
    }
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').catch(() => undefined);
    });
  }

  render();
})();
