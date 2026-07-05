(() => {
  const STORAGE_KEY = 'outbase_restart_2_state';
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

  const defaultState = {
    version: 'restart-2',
    screen: 'home',
    activeTab: '予定',
    activeProjectId: 'camp-akagi',
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
        daySteps: clone(dayStepsBase)
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
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return cloneDefaultState();
      return mergeState(cloneDefaultState(), JSON.parse(raw));
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
    if (!projectById(target.activeProjectId, target)) target.activeProjectId = target.projects[0].id;
    target.projects.forEach((project) => {
      if (project.type === 'camp') {
        project.prep = Array.isArray(project.prep) ? project.prep : clone(prepBase);
        project.shopping = Array.isArray(project.shopping) ? project.shopping : clone(shoppingBase);
        project.meals = Array.isArray(project.meals) ? project.meals : clone(mealsBase);
        project.daySteps = Array.isArray(project.daySteps) ? project.daySteps : clone(dayStepsBase);
      }
    });
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

  function prepPercent(project) {
    if (!project?.prep?.length) return 0;
    const doneWords = ['確認済み', '買った', '完了'];
    const done = project.prep.filter((item) => doneWords.includes(item.status)).length;
    return Math.round((done / project.prep.length) * 100);
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
    const body = `
      <section class="hero">
        <h1>準備</h1>
        <p>${escapeHtml(project.place)} の準備を、買い物・料理・ギア・コタ・天気・ルートでつなげます。</p>
      </section>
      <main class="stack">
        ${card('今日やること', '準備する', `
          <div class="list">
            ${project.prep.slice(0, 3).map((item) => `
              <button class="item" data-action="togglePrep" data-id="${escapeHtml(item.id)}">
                <div class="item-main"><div class="item-title">${escapeHtml(item.key)}を確認</div><div class="item-sub">${escapeHtml(item.note)}</div></div>
                <span class="tag ${item.status === '確認済み' ? '' : 'light'}">${escapeHtml(item.status)}</span>
              </button>
            `).join('')}
          </div>
        `)}
        ${card('準備メニュー', '予定に紐づく', `
          <div class="list">
            ${project.prep.map((item) => `
              <button class="item" data-action="openPrepItem" data-key="${escapeHtml(item.key)}">
                <div class="item-main"><div class="item-title">${escapeHtml(item.key)}</div><div class="item-sub">${escapeHtml(item.note)}</div></div>
                <span class="tag ${item.status === '確認済み' ? '' : 'light'}">${escapeHtml(item.status)}</span>
              </button>
            `).join('')}
          </div>
        `, `${btn('当日運転席へ', 'openProject', { projectId: project.id, screen: 'cockpit', tab: '予定' }, 'primary')}`)}
      </main>`;
    app.innerHTML = layout(body);
  }

  function renderShopping() {
    const project = activeProject().type === 'camp' ? activeProject() : campProject();
    const groups = ['食材', '調味料', '今回は買わないもの'];
    const body = `
      <section class="hero">
        <h1>買い物</h1>
        <p>料理計画から反映されています。売っていない時の代替と、買わないものも残します。</p>
      </section>
      <main class="stack">
        ${groups.map((group) => card(group, '買い忘れ防止', `
          <div class="list">
            ${project.shopping.filter((item) => item.group === group).map((item) => `
              <div class="item">
                <div class="item-main"><div class="item-title">${escapeHtml(item.name)}</div><div class="item-sub">${escapeHtml(item.qty)} / ${escapeHtml(item.owner)} / ${escapeHtml(item.detail)}</div></div>
                <button class="tag ${item.state === '未購入' ? 'light' : ''}" data-action="toggleShopping" data-id="${escapeHtml(item.id)}">${escapeHtml(item.state)}</button>
              </div>
            `).join('') || '<div class="empty">ここに追加した買い物が入ります。</div>'}
          </div>
        `)).join('')}
        ${card('LINE用コピー', 'そのまま貼れる', `<p class="card-text">食材・調味料・買わないものを分け、数量と担当も入れてコピーします。</p>`, `${btn('LINE用にコピー', 'copyShopping', {}, 'primary')}${btn('未購入だけコピー', 'copyShoppingOpen', {}, 'ghost')}${btn('料理に戻る', 'go', { screen: 'cooking', tab: '準備' }, 'ghost')}`)}
      </main>`;
    app.innerHTML = layout(body);
  }

  function renderCooking() {
    const project = activeProject().type === 'camp' ? activeProject() : campProject();
    const body = `
      <section class="hero">
        <h1>料理計画</h1>
        <p>日程・人数・量・設営時間を見ながら、買い物と調理ギアへ反映します。</p>
      </section>
      <main class="stack">
        ${card('食べる流れ', '量を見ながら決める', `
          <div class="list">
            ${project.meals.map((meal) => `
              <button class="item" data-action="editMeal" data-id="${escapeHtml(meal.id)}">
                <div class="item-main"><div class="item-title">${escapeHtml(meal.slot)}：${escapeHtml(meal.menu)}</div><div class="item-sub">${escapeHtml(meal.caution)}</div></div>
                <span class="tag light">編集</span>
              </button>
            `).join('')}
          </div>
        `, `${btn('買い物に反映', 'go', { screen: 'shopping', tab: '準備' })}${btn('当日料理に送る', 'go', { screen: 'cockpit', tab: '予定' }, 'ghost')}`)}
        ${card('当日後に聞くこと', '次回改善へ', `
          <div class="list">
            ${['量はどうだった？', '味はどうだった？', '余った？', '次回も作る？', '次回は減らす？'].map((text) => `<button class="item" data-action="addImprovement" data-text="${escapeHtml(text)}" data-project-id="${escapeHtml(project.id)}"><div class="item-main"><div class="item-title">${escapeHtml(text)}</div><div class="item-sub">思い出から次回改善へ送ります</div></div><span class="tag light">追加</span></button>`).join('')}
          </div>
        `)}
      </main>`;
    app.innerHTML = layout(body);
  }

  function renderCockpit() {
    const project = activeProject().type === 'camp' ? activeProject() : campProject();
    const body = `
      <section class="hero">
        <h1>当日運転席</h1>
        <p>次にやることを見ながら、写真・声メモ・メモを残します。運転中は操作しないでください。</p>
      </section>
      <main class="stack">
        ${card(project.place, '当日の流れ', `
          <div class="timeline">
            ${project.daySteps.map((step, index) => `
              <div class="step">
                <div class="dot ${index === 0 ? 'pending' : ''}">${index + 1}</div>
                <div>
                  <div class="item-title">${escapeHtml(step.title)}</div>
                  <div class="item-sub">${escapeHtml(step.note)}</div>
                  <div class="actions">
                    ${btn('開始', 'addRecord', { type: 'メモ', projectId: project.id, stepId: step.id, target: step.title, text: `${step.title}を開始` }, 'ghost')}
                    ${btn('写真', 'addRecord', { type: '写真', projectId: project.id, stepId: step.id, target: step.title, text: `${step.title}の写真` }, 'ghost')}
                    ${btn('声メモ', 'addRecord', { type: '声', projectId: project.id, stepId: step.id, target: step.title, text: `${step.title}の声メモ` }, 'ghost')}
                    ${btn('メモ', 'addRecord', { type: 'メモ', projectId: project.id, stepId: step.id, target: step.title, text: `${step.title}のメモ` }, 'ghost')}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        `)}
      </main>`;
    app.innerHTML = layout(body);
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
      status: '未確認'
    };
    state.inbox.unshift(record);
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
    targetItems.filter((item) => item.group === '食材').forEach((item) => lines.push(`・${item.name}（${item.qty} / ${item.owner}）`));
    lines.push('', '■調味料');
    targetItems.filter((item) => item.group === '調味料').forEach((item) => lines.push(`・${item.name}（${item.qty} / ${item.owner}）`));
    lines.push('', '■今回は買わない');
    targetItems.filter((item) => item.group === '今回は買わないもの').forEach((item) => lines.push(`・${item.name}`));
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
      case 'plan': renderPlan(); break;
      case 'search': renderSearch(); break;
      case 'prep': renderPrep(); break;
      case 'shopping': renderShopping(); break;
      case 'cooking': renderCooking(); break;
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

    if (action === 'switchProject') {
      setActiveProject(button.dataset.projectId);
      return;
    }

    if (action === 'openProject') {
      setActiveProject(button.dataset.projectId, button.dataset.screen, button.dataset.tab || null);
      return;
    }

    if (action === 'openPrepItem') {
      const key = button.dataset.key;
      if (key === '買い物') setScreen('shopping', '準備');
      else if (key === '料理') setScreen('cooking', '準備');
      else if (key === 'ルート' || key === '天気') setScreen('cockpit', '予定');
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
      saveState();
      renderShopping();
      showToast('買い物を更新しました');
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
      state.improvements.unshift({ id: makeId('imp'), projectId: button.dataset.projectId || state.activeProjectId, text: button.dataset.text || '次回改善', target: button.dataset.target || '次の準備', done: false });
      saveState();
      showToast('次回改善に追加しました');
      return;
    }

    if (action === 'improveFromMemory') {
      const record = state.memories.find((entry) => entry.id === button.dataset.id);
      if (record) {
        state.improvements.unshift({ id: makeId('imp'), projectId: record.projectId, text: `${record.target}：${record.text}`, target: '次の準備', done: false });
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
        daySteps: clone(dayStepsBase)
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
