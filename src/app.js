(() => {
  const STORAGE_KEY = 'outbase_restart_15_state';
  const LEGACY_STORAGE_KEYS = ['outbase_restart_14_state', 'outbase_restart_13_state', 'outbase_restart_12_state', 'outbase_restart_11_state', 'outbase_restart_10_state', 'outbase_restart_9_state', 'outbase_restart_8_state', 'outbase_restart_7_state', 'outbase_restart_6_state', 'outbase_restart_5_state', 'outbase_restart_4_state', 'outbase_restart_3_state', 'outbase_restart_2_state', 'outbase_restart_1_state'];
  const app = document.getElementById('app');
  const MAX_EMBED_BYTES = 1800000;
  let voiceRecorder = null;
  let voiceChunks = [];
  let voiceStartedAt = 0;

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


  const integrationBase = [
    {
      id: 'photos',
      name: 'Google Photos',
      label: '写真の本保存',
      status: '準備中',
      summary: '端末内の写真・動画をOUTBASEの記録と紐づけ、共有アルバムへ逃がす前提を整理します。',
      steps: [
        { id: 'scope', text: '共有アルバム / 端末保存 / OUTBASE控えの役割を分ける', done: false },
        { id: 'link', text: '記録ID・projectId・日付を写真メモに残せる形を維持', done: true },
        { id: 'manual', text: '本接続前は手動アップロードと控えコピーで運用', done: false }
      ],
      note: '実API連携はまだしません。まず保存方針と紐づけ項目を固定します。'
    },
    {
      id: 'weather',
      name: '天気API',
      label: '雨・風・気温',
      status: '準備中',
      summary: 'キャンプ予定・当日運転席・コタ対策へ天気情報を反映する入口を整えます。',
      steps: [
        { id: 'fields', text: '気温 / 降水 / 風速 / 標高 / 警戒メモを受け取る枠を用意', done: true },
        { id: 'provider', text: '参照元候補を整理して本接続の判断を残す', done: false },
        { id: 'reflect', text: '準備の天気・ルート確認へ反映する', done: false }
      ],
      note: '本接続前は手入力メモとして扱います。'
    },
    {
      id: 'calendar',
      name: 'Googleカレンダー',
      label: '予定同期',
      status: '準備中',
      summary: 'OUTBASE内カレンダーを主軸に、将来Googleカレンダーへ出し入れできる構造を保ちます。',
      steps: [
        { id: 'internal', text: 'OUTBASE内の予定カレンダーを主として維持', done: true },
        { id: 'mapping', text: 'projectId / startDate / endDate / place / party の対応を固定', done: true },
        { id: 'sync', text: '外部同期は本番前に手動確認を挟む', done: false }
      ],
      note: '勝手に予定を作成・削除しない方針を維持します。'
    },
    {
      id: 'mail',
      name: '予約メール',
      label: '予約情報取込',
      status: '準備中',
      summary: '予約メールやメモから、キャンプ場名・日程・チェックインを予定にできる準備をします。',
      steps: [
        { id: 'items', text: '取り込み対象項目を決める', done: true },
        { id: 'manual', text: '本接続前はコピー貼り付けで予定作成に反映', done: false },
        { id: 'confirm', text: 'AIや自動処理が勝手に確定しない確認画面を挟む', done: true }
      ],
      note: 'メール実連携はまだせず、まず確認型の設計だけ固定します。'
    },
    {
      id: 'backup',
      name: 'バックアップ',
      label: 'データ保護',
      status: '一部運用中',
      summary: '控えコピー・読み込み・一時控えを外部連携前の安全網として使います。',
      steps: [
        { id: 'copy', text: 'OUTBASE控えコピー', done: true },
        { id: 'import', text: '控え貼り付け読み込み', done: true },
        { id: 'export', text: '将来のクラウド保存方式を選定', done: false }
      ],
      note: '外部連携を入れる前に、必ず手元控えを作れる状態を保ちます。'
    }
  ];

  const defaultState = {
    version: 'restart-15',
    savedAt: '',
    screen: 'home',
    activeTab: '予定',
    activeProjectId: 'camp-akagi',
    calendarMonth: '2026-06',
    selectedDate: '2026-06-26',
    inboxFilter: 'all',
    captureDate: '',
    recordDetailId: '',
    voiceRecording: false,
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
    deletedRecords: [],
    memories: [],
    improvements: [],
    calendarItems: [
      { id: 'cal-camp-akagi-start', projectId: 'camp-akagi', date: '2026-06-26', label: 'キャンプ出発', kind: 'camp' },
      { id: 'cal-camp-akagi-end', projectId: 'camp-akagi', date: '2026-06-27', label: '撤収・帰宅', kind: 'camp' }
    ],
    integrations: clone(integrationBase),
    syncDrafts: [],
    integrationNotes: []
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
      merged.version = 'restart-15';
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
    target.deletedRecords = Array.isArray(target.deletedRecords) ? target.deletedRecords : [];
    target.inboxFilter = ['all', 'active', 'delete'].includes(target.inboxFilter) ? target.inboxFilter : 'all';
    target.captureDate = typeof target.captureDate === 'string' ? target.captureDate : '';
    target.recordDetailId = typeof target.recordDetailId === 'string' ? target.recordDetailId : '';
    target.voiceRecording = false;
    target.memories = Array.isArray(target.memories) ? target.memories : [];
    target.improvements = Array.isArray(target.improvements) ? target.improvements : [];
    target.calendarItems = Array.isArray(target.calendarItems) ? target.calendarItems : [];
    target.integrations = normalizeIntegrations(target.integrations);
    target.syncDrafts = Array.isArray(target.syncDrafts) ? target.syncDrafts : [];
    target.integrationNotes = Array.isArray(target.integrationNotes) ? target.integrationNotes : [];
    const fallbackMonth = target.projects.find((project) => project.startDate)?.startDate?.slice(0, 7) || new Date().toISOString().slice(0, 7);
    target.calendarMonth = /^\d{4}-\d{2}$/.test(target.calendarMonth || '') ? target.calendarMonth : fallbackMonth;
    target.selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(target.selectedDate || '') ? target.selectedDate : `${target.calendarMonth}-01`;
    target.inbox.forEach((record) => { if (!record.date) record.date = todayISO(); });
    target.memories.forEach((record) => { if (!record.date) record.date = todayISO(); });
    target.improvements.forEach((item) => {
      if (!item.date) item.date = todayISO();
      if (!item.target) item.target = '次の準備';
      item.done = Boolean(item.done);
      item.reflectionLog = Array.isArray(item.reflectionLog) ? item.reflectionLog : [];
    });
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
    repairLinkedData(target);
  }


  function normalizeIntegrations(value) {
    const current = Array.isArray(value) ? value : [];
    return integrationBase.map((base) => {
      const saved = current.find((item) => item.id === base.id) || {};
      const steps = base.steps.map((step) => {
        const savedStep = Array.isArray(saved.steps) ? saved.steps.find((entry) => entry.id === step.id) : null;
        return { ...step, done: savedStep ? Boolean(savedStep.done) : Boolean(step.done) };
      });
      return { ...base, ...saved, steps };
    });
  }

  function integrationById(id) {
    return state.integrations.find((item) => item.id === id) || state.integrations[0];
  }

  function integrationProgress(item) {
    if (!item || !Array.isArray(item.steps) || !item.steps.length) return 0;
    return Math.round((item.steps.filter((step) => step.done).length / item.steps.length) * 100);
  }

  function externalReadyCount() {
    return state.integrations.filter((item) => integrationProgress(item) >= 60).length;
  }

  function externalPlanText() {
    const lines = ['OUTBASE 外部連携準備メモ', '', `作成日：${todayISO()}`, ''];
    state.integrations.forEach((item) => {
      lines.push(`■${item.name} / ${item.label}`);
      lines.push(`状態：${item.status} / 準備率：${integrationProgress(item)}%`);
      lines.push(item.summary);
      item.steps.forEach((step) => lines.push(`${step.done ? '✓' : '□'} ${step.text}`));
      if (item.note) lines.push(`メモ：${item.note}`);
      lines.push('');
    });
    if (state.integrationNotes.length) {
      lines.push('■連携メモ');
      state.integrationNotes.forEach((note) => lines.push(`・${note.text}（${note.date || ''}）`));
    }
    return lines.join('\n');
  }

  function repairLinkedData(target) {
    const fallbackProject = target.projects[0];
    const projectIds = new Set(target.projects.map((project) => project.id));
    const ensureProjectId = (item) => {
      if (!item.projectId || !projectIds.has(item.projectId)) item.projectId = fallbackProject.id;
      if (!item.date) item.date = todayISO();
      if (!item.id) item.id = makeId('item');
      return item;
    };
    target.inbox.forEach((record) => {
      ensureProjectId(record);
      record.status = record.status || '未確認';
      record.candidateHistory = Array.isArray(record.candidateHistory) ? record.candidateHistory : [{ projectId: record.projectId, label: projectLabelFromTarget(target, record.projectId), at: record.createdAt || todayISO() }];
      record.protect = record.protect !== false;
    });
    target.memories.forEach((record) => {
      ensureProjectId(record);
      record.status = record.status || '確定';
    });
    target.improvements.forEach((item) => {
      ensureProjectId(item);
      item.target = item.target || '次の準備';
      item.reflectionLog = Array.isArray(item.reflectionLog) ? item.reflectionLog : [];
      item.done = Boolean(item.done);
    });
    target.deletedRecords = target.deletedRecords.map((record) => {
      ensureProjectId(record);
      record.status = '復旧控え';
      record.deletedAt = record.deletedAt || todayISO();
      return record;
    });
    target.calendarItems = target.calendarItems.filter((item) => item && item.date && (!item.projectId || projectIds.has(item.projectId)));
    target.projects.filter((project) => project.type === 'camp').forEach((project) => syncProjectCalendar(target, project));
  }

  function projectLabelFromTarget(target, projectId) {
    const project = target.projects.find((entry) => entry.id === projectId);
    return project?.label || project?.title || '未確認箱';
  }

  function syncProjectCalendar(target, project) {
    if (!project || project.type !== 'camp' || !project.startDate) return;
    target.calendarItems = target.calendarItems.filter((item) => {
      if (item.projectId !== project.id) return true;
      if (item.kind !== 'camp') return true;
      return !['キャンプ出発', '撤収・帰宅'].includes(item.label);
    });
    target.calendarItems.push({ id: `cal-${project.id}-start`, projectId: project.id, date: project.startDate, label: 'キャンプ出発', kind: 'camp' });
    if (project.endDate && project.endDate !== project.startDate) {
      target.calendarItems.push({ id: `cal-${project.id}-end`, projectId: project.id, date: project.endDate, label: '撤収・帰宅', kind: 'camp' });
    }
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

  function routeSummary() {
    return {
      projects: state.projects.length,
      calendar: state.calendarItems.length,
      inbox: state.inbox.filter((record) => record.status !== '削除候補').length,
      deleteCandidates: state.inbox.filter((record) => record.status === '削除候補').length,
      memories: state.memories.length,
      improvements: state.improvements.length,
      backups: state.deletedRecords.length,
      integrations: state.integrations.length,
      externalReady: externalReadyCount()
    };
  }

  function healthNotes() {
    const notes = [];
    const ids = new Set(state.projects.map((project) => project.id));
    const brokenRecords = [...state.inbox, ...state.memories, ...state.improvements, ...state.deletedRecords].filter((item) => item.projectId && !ids.has(item.projectId)).length;
    const campWithoutCalendar = state.projects.filter((project) => project.type === 'camp' && project.startDate && !state.calendarItems.some((item) => item.projectId === project.id && item.date === project.startDate)).length;
    if (brokenRecords) notes.push(`保存先が見つからない記録 ${brokenRecords}件`);
    if (campWithoutCalendar) notes.push(`カレンダー未反映の予定 ${campWithoutCalendar}件`);
    if (!state.inbox.length && !state.memories.length) notes.push('記録はこれから蓄積');
    return notes.length ? notes : ['一本線の紐づけは正常'];
  }

  function finalAuditItems() {
    const summary = routeSummary();
    const hasHome = true;
    const hasFlow = flowItems().length >= 6;
    const hasProjects = summary.projects >= 5 && Boolean(state.activeProjectId);
    const hasCampCalendar = state.calendarItems.some((item) => item.kind === 'camp');
    const hasPrep = Boolean(campProject()?.prep?.length && campProject()?.shopping?.length && campProject()?.meals?.length);
    const hasDaySteps = Boolean(campProject()?.daySteps?.length);
    const hasRecovery = Array.isArray(state.deletedRecords);
    const hasImprovements = Array.isArray(state.improvements);
    return [
      { label: '今日は何する？', detail: '起動直後の入口を維持', ok: hasHome },
      { label: '下ナビ固定', detail: '予定 / 探す / 準備 / ＋ / 思い出', ok: true },
      { label: '一本線', detail: '予定→準備→当日→記録→整理→改善', ok: hasFlow },
      { label: '複数プロジェクト', detail: `${summary.projects}件を裏側で分離`, ok: hasProjects },
      { label: 'カレンダー紐づけ', detail: `${summary.calendar}件`, ok: hasCampCalendar },
      { label: '準備実用化', detail: '買い物・料理・ギア・コタ・天気・ルート', ok: hasPrep },
      { label: '当日運転席', detail: '工程ごとの開始・記録・完了・戻す', ok: hasDaySteps },
      { label: '未確認箱', detail: `${summary.inbox}件を勝手に確定しない`, ok: Array.isArray(state.inbox) },
      { label: '復旧控え', detail: `${summary.backups}件を戻せる`, ok: hasRecovery },
      { label: '控えと読み込み', detail: 'スマホ更新前に控えを作り、貼り付けて戻せる', ok: true },
      { label: '外部連携準備', detail: `${summary.externalReady}/${summary.integrations}件が準備ライン`, ok: summary.integrations >= 5 },
      { label: '次回改善', detail: `${summary.improvements}件を準備へ戻す`, ok: hasImprovements }
    ];
  }

  function finalAuditSummaryText() {
    const summary = routeSummary();
    const lines = [
      'OUTBASE Restart-15 外部連携準備パック確認',
      '',
      `プロジェクト：${summary.projects}件`,
      `日付紐づけ：${summary.calendar}件`,
      `未整理：${summary.inbox}件`,
      `削除候補：${summary.deleteCandidates}件`,
      `思い出：${summary.memories}件`,
      `次回改善：${summary.improvements}件`,
      `復旧控え：${summary.backups}件`,
      `外部連携準備：${summary.externalReady}/${summary.integrations}件`,
      '',
      '確認項目',
      ...finalAuditItems().map((item) => `・${item.ok ? 'OK' : '要確認'} ${item.label}：${item.detail}`),
      '',
      'メモ',
      ...healthNotes().map((text) => `・${text}`)
    ];
    return lines.join('\n');
  }

  function backupText() {
    const safeState = { ...state, toast: '' };
    return JSON.stringify(safeState, null, 2);
  }


  function preImportBackupKey() {
    return 'outbase_restart_14_pre_import_backup';
  }

  function readPreImportBackup() {
    try {
      return localStorage.getItem(preImportBackupKey()) || '';
    } catch (error) {
      return '';
    }
  }

  function restoreFromBackupText(text) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      showToast('控えを読み込めませんでした');
      return false;
    }
    const next = mergeState(cloneDefaultState(), parsed);
    next.version = 'restart-14';
    next.screen = 'dataGuard';
    next.activeTab = '思い出';
    next.toast = '';
    repairLinkedData(next);
    try {
      localStorage.setItem(preImportBackupKey(), backupText());
    } catch (error) {
      // 端末保存に失敗しても読み込みは続けます
    }
    state = next;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, toast: '' }));
    showToast('控えを読み込みました');
    return true;
  }

  function saveState() {
    clearTimeout(saveTimer);
    state.savedAt = new Date().toISOString();
    state.version = 'restart-14';
    repairLinkedData(state);
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


  function flowItems() {
    return [
      { key: '予定', label: '予定', screens: ['home', 'calendar', 'projectManage', 'plan', 'search', 'homeWalk', 'campWalk'] },
      { key: '準備', label: '準備', screens: ['prep', 'shopping', 'cooking', 'gear', 'kota', 'weatherRoute'] },
      { key: '当日', label: '当日', screens: ['cockpit'] },
      { key: '記録', label: '記録', screens: ['capture'] },
      { key: '整理', label: '整理', screens: ['inbox', 'memories', 'dataGuard'] },
      { key: '改善', label: '改善', screens: ['improvements'] }
    ];
  }

  function currentFlowKey() {
    const current = flowItems().find((item) => item.screens.includes(state.screen));
    return current?.key || '予定';
  }

  function flowRail(compact = false) {
    const current = currentFlowKey();
    return `<div class="flow-rail ${compact ? 'compact' : ''}" aria-label="OUTBASEの流れ">
      ${flowItems().map((item) => `<button class="flow-step ${item.key === current ? 'active' : ''}" data-action="flowJump" data-key="${escapeHtml(item.key)}"><span>${escapeHtml(item.label)}</span></button>`).join('')}
    </div>`;
  }

  function screenFromFlow(key) {
    if (key === '予定') return { screen: 'home', tab: '予定' };
    if (key === '準備') return { screen: 'prep', tab: '準備' };
    if (key === '当日') return { screen: 'cockpit', tab: '予定' };
    if (key === '記録') return { screen: 'capture', tab: '＋' };
    if (key === '整理') return { screen: state.inbox.length ? 'inbox' : 'memories', tab: '思い出' };
    return { screen: 'improvements', tab: '思い出' };
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
        <button class="brand brand-button" data-action="go" data-screen="home" data-tab="予定" aria-label="ホームへ戻る">
          <div class="logo">OB</div>
          <div>
            <div class="brand-title">OUTBASE</div>
            <div class="brand-sub">${escapeHtml(subtitle)}</div>
          </div>
        </button>
        <button class="pill header-pill" data-action="go" data-screen="inbox" data-tab="思い出">${state.inbox.length}件 あとで整理</button>
      </header>
      ${flowRail()}
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



  function projectTypeName(type) {
    const names = { camp: 'キャンプ', walk: '自宅散歩', campWalk: 'キャンプ場散歩', search: '探す', outing: '外出' };
    return names[type] || '流れ';
  }

  function projectDefaultScreen(project) {
    if (!project) return 'plan';
    if (project.type === 'walk') return 'homeWalk';
    if (project.type === 'campWalk') return 'campWalk';
    if (project.type === 'search') return 'search';
    if (project.type === 'outing') return 'capture';
    return 'plan';
  }

  function projectDefaultTab(project) {
    if (!project) return '予定';
    if (project.type === 'search') return '探す';
    if (project.type === 'outing') return '＋';
    return '予定';
  }

  function campProjectTemplate(values = {}) {
    const title = values.title || values.place || '新しいキャンプ';
    const startDate = values.startDate || '';
    const endDate = values.endDate || startDate;
    return {
      id: values.id || makeId('camp'),
      type: 'camp',
      title,
      label: values.label || (values.status === '過去キャンプ' ? '過去キャンプ' : '次のキャンプ'),
      status: values.status || '次の予定',
      startDate,
      endDate,
      place: values.place || title,
      party: values.party || '夫婦＋コタ',
      checkin: values.checkin || '13:00',
      checkout: values.checkout || '11:00',
      weather: values.weather || '天気を確認',
      route: values.route || 'ルートを確認',
      memo: values.memo || '実データとして追加したキャンプ予定です。',
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
  }

  function createCampProjectFromPrompts(defaults = {}) {
    const title = promptText('予定名 / キャンプ場名', defaults.title || defaults.place || '新しいキャンプ');
    if (title === null || !title) return null;
    const startDate = promptText('開始日', defaults.startDate || state.selectedDate || todayISO());
    if (startDate === null) return null;
    const endDate = promptText('終了日', defaults.endDate || startDate);
    if (endDate === null) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      showToast('日付は 2026-06-26 の形で入力してください');
      return null;
    }
    const party = promptText('同行', defaults.party || '夫婦＋コタ');
    if (party === null) return null;
    const checkin = promptText('チェックイン', defaults.checkin || '13:00');
    if (checkin === null) return null;
    const checkout = promptText('チェックアウト', defaults.checkout || '11:00');
    if (checkout === null) return null;
    const project = campProjectTemplate({
      title,
      place: title,
      startDate,
      endDate,
      party,
      checkin,
      checkout,
      status: defaults.status || '次の予定',
      label: defaults.label || (defaults.status === '過去キャンプ' ? '過去キャンプ' : '次のキャンプ'),
      memo: defaults.memo || '自分で追加した実データ予定です。'
    });
    return project;
  }

  function editProjectByPrompt(project) {
    if (!project) return false;
    const title = promptText('タイトル', project.title);
    if (title === null) return false;
    const status = promptText('状態', project.status || '次の予定');
    if (status === null) return false;
    const place = promptText('場所', project.place || title);
    if (place === null) return false;
    const party = promptText('同行 / 対象', project.party || '夫婦＋コタ');
    if (party === null) return false;
    const startDate = promptText('開始日 空欄可', project.startDate || '');
    if (startDate === null) return false;
    const endDate = promptText('終了日 空欄可', project.endDate || startDate || '');
    if (endDate === null) return false;
    if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      showToast('開始日は 2026-06-26 の形で入力してください');
      return false;
    }
    if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      showToast('終了日は 2026-06-26 の形で入力してください');
      return false;
    }
    project.title = title || project.title;
    project.label = project.label || projectTypeName(project.type);
    project.status = status || project.status;
    project.place = place || project.place;
    project.party = party || project.party;
    project.startDate = startDate || '';
    project.endDate = endDate || startDate || '';
    if (project.type === 'camp') {
      const checkin = promptText('チェックイン', project.checkin || '13:00');
      if (checkin === null) return false;
      const checkout = promptText('チェックアウト', project.checkout || '11:00');
      if (checkout === null) return false;
      const weather = promptText('天気メモ', project.weather || '天気を確認');
      if (weather === null) return false;
      const route = promptText('ルートメモ', project.route || 'ルートを確認');
      if (route === null) return false;
      const memo = promptText('予定メモ', project.memo || '');
      if (memo === null) return false;
      project.checkin = checkin;
      project.checkout = checkout;
      project.weather = weather;
      project.route = route;
      project.memo = memo;
      syncProjectCalendar(state, project);
    }
    return true;
  }

  function renderHome() {
    const camp = campProject();
    const percent = prepPercent(camp);
    const content = `
      <section class="hero home-hero visual-cover">
        <div class="cover-topline">
          <div class="home-badge">OUTBASE</div>
          <span class="cover-date">${escapeHtml(todayISO())}</span>
        </div>
        <h1>今日は何する？</h1>
        <p>次のキャンプ、コタとの散歩、今残したい記録をここから始めます。</p>
        <div class="cover-metrics">
          <span><strong>${percent}%</strong><small>準備</small></span>
          <span><strong>${state.inbox.length}</strong><small>未整理</small></span>
          <span><strong>${state.improvements.filter((item) => !item.done).length}</strong><small>改善</small></span>
        </div>
        <div class="cover-actions">
          <button class="btn cover-primary" data-action="openProject" data-project-id="${escapeHtml(camp.id)}" data-screen="prep" data-tab="準備">次の準備へ</button>
          <button class="btn cover-ghost" data-action="go" data-screen="capture" data-tab="＋">今これを残す</button>
        </div>
      </section>
      ${flowRail(true)}
      <main class="stack home-board">
        <section class="feature-panel">
          <div class="feature-copy">
            <div class="eyebrow">一本線の現在地</div>
            <h2>予定から、次回の準備まで。</h2>
            <p>カードをただ並べるのではなく、次の行動が自然に見えるホームへ寄せました。</p>
          </div>
          <div class="feature-route">
            <span>予定</span><i></i><span>準備</span><i></i><span>当日</span><i></i><span>記録</span><i></i><span>改善</span>
          </div>
        </section>

        ${card('進行中の流れ', '同時に動かせる', `
          ${projectSwitch()}
          <p class="note">キャンプ、散歩、探している候補、外出を裏側で分けて保存します。画面は増やしすぎず、入口はこのまま保ちます。</p>
        `, '', '<span class="tag light">切替</span>')}

        ${card('実機確認', '抜け漏れを先に見る', `
          ${(() => {
            const summary = routeSummary();
            return `<div class="metric-row">
              <div class="metric"><small>流れ</small><strong>${summary.projects}件</strong></div>
              <div class="metric"><small>日付紐づけ</small><strong>${summary.calendar}件</strong></div>
              <div class="metric"><small>未整理</small><strong>${summary.inbox}件</strong></div>
              <div class="metric"><small>改善</small><strong>${summary.improvements}件</strong></div>
            </div>`;
          })()}
          <div class="health-list">${healthNotes().map((text) => `<span>${escapeHtml(text)}</span>`).join('')}</div>
          <p class="note">反映後に古い画面が出る時は表示だけ更新します。保存データは消しません。</p>
        `, `${btn('表示を更新', 'refreshApp', {}, 'ghost')}${btn('控えをコピー', 'copyBackup', {}, 'ghost')}${btn('未確認箱へ', 'go', { screen: 'inbox', tab: '思い出' }, state.inbox.length ? 'warn' : 'ghost')}`)}

        ${card('本番前総合確認', '最後にまとめて見る', `
          <p class="card-text">入口、下ナビ、一本線、複数プロジェクト、カレンダー、記録整理、復旧、次回改善のつながりをまとめて確認します。</p>
          <div class="audit-mini">
            ${finalAuditItems().slice(0, 4).map((item) => `<span class="${item.ok ? 'ok' : 'warn'}">${escapeHtml(item.label)}</span>`).join('')}
          </div>
        `, `${btn('総合確認へ', 'go', { screen: 'releaseAudit', tab: '予定' }, 'primary')}${btn('紐づけ補正', 'repairNow', {}, 'ghost')}${btn('控えをコピー', 'copyBackup', {}, 'ghost')}`)}

        ${card('データを守る', '控え / 読み込み / 復旧', `
          <p class="card-text">スマホ更新や入れ替えの前に、OUTBASEの控えをコピーできます。控えを貼り付けて読み込む導線もここにまとめます。</p>
          <div class="metric-row">
            <div class="metric"><small>流れ</small><strong>${state.projects.length}件</strong></div>
            <div class="metric"><small>未整理</small><strong>${state.inbox.length}件</strong></div>
            <div class="metric"><small>復旧控え</small><strong>${state.deletedRecords.length}件</strong></div>
            <div class="metric"><small>保存</small><strong>${state.savedAt ? 'あり' : 'これから'}</strong></div>
          </div>
        `, `${btn('控えを開く', 'go', { screen: 'dataGuard', tab: '思い出' }, 'primary')}${btn('控えをコピー', 'copyBackup', {}, 'ghost')}`)}


        ${card('外部連携準備', '本接続の前に整える', `
          <p class="card-text">Google Photos、天気、Googleカレンダー、予約メール、バックアップの接続準備をまとめます。まだ勝手に外部送信しません。</p>
          <div class="metric-row">
            <div class="metric"><small>連携枠</small><strong>${state.integrations.length}件</strong></div>
            <div class="metric"><small>準備ライン</small><strong>${externalReadyCount()}件</strong></div>
            <div class="metric"><small>控え</small><strong>${state.savedAt ? 'あり' : 'これから'}</strong></div>
          </div>
        `, `${btn('連携準備へ', 'go', { screen: 'externalConnect', tab: '探す' }, 'primary')}${btn('連携メモをコピー', 'copyExternalPlan', {}, 'ghost')}`)}

        ${card('予定を管理する', '追加 / 編集 / 切替', `
          <p class="card-text">次のキャンプ、過去キャンプ、散歩、探す流れをここで作ります。カレンダーからも予定にできます。</p>
          <div class="metric-row">
            <div class="metric"><small>流れ</small><strong>${state.projects.length}件</strong></div>
            <div class="metric"><small>キャンプ</small><strong>${state.projects.filter((project) => project.type === 'camp').length}件</strong></div>
            <div class="metric"><small>選択中</small><strong>${escapeHtml(projectLabel(activeProject()))}</strong></div>
          </div>
        `, `${btn('予定管理へ', 'go', { screen: 'projectManage', tab: '予定' }, 'primary')}${btn('新しいキャンプ', 'createCampPlan', {}, 'ghost')}`)}

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



  function renderProjectManage() {
    const active = activeProject();
    const camps = state.projects.filter((project) => project.type === 'camp');
    const body = `
      <section class="hero">
        <h1>予定を管理する</h1>
        <p>次のキャンプ、過去キャンプ、散歩、探す流れを実データで追加・編集・切替します。</p>
      </section>
      <main class="stack">
        ${card('今使う流れ', '切替', `
          <p class="card-text"><strong>${escapeHtml(projectLabel(active))}</strong><br>${escapeHtml(active.title)} / ${escapeHtml(projectDate(active))}</p>
          ${projectSwitch()}
        `, `${btn('開く', 'openProject', { projectId: active.id, screen: projectDefaultScreen(active), tab: projectDefaultTab(active) }, 'primary')}${btn('編集する', 'editProject', { projectId: active.id }, 'ghost')}`)}

        ${card('追加する', '実データ運用', `
          <p class="card-text">カレンダーや予定詳細に出すための元データを作ります。予定だけ増やして、画面は増やしすぎません。</p>
        `, `${btn('新しいキャンプ予定', 'createCampPlan', {}, 'primary')}${btn('選択日から予定作成', 'createCampFromDate', { date: state.selectedDate || todayISO() }, 'ghost')}${btn('過去キャンプを登録', 'createPastCamp', {}, 'ghost')}${btn('散歩 / 探す / 外出を追加', 'createBasicProject', {}, 'ghost')}`)}

        ${card('キャンプ予定', '次回と過去', `
          <div class="list">
            ${camps.map((project) => `
              <div class="item">
                <div class="item-main"><div class="item-title">${escapeHtml(project.title)}</div><div class="item-sub">${escapeHtml(project.status)} / ${escapeHtml(projectDate(project))} / ${escapeHtml(project.party || '')}</div></div>
                <div class="actions compact-actions">
                  <button class="tag light" data-action="openProject" data-project-id="${escapeHtml(project.id)}" data-screen="plan" data-tab="予定">開く</button>
                  <button class="tag light" data-action="editProject" data-project-id="${escapeHtml(project.id)}">編集</button>
                  <button class="tag ${project.id === state.activeProjectId ? '' : 'light'}" data-action="setActiveOnly" data-project-id="${escapeHtml(project.id)}">主役</button>
                </div>
              </div>
            `).join('') || '<div class="empty">キャンプ予定を追加するとここに出ます。</div>'}
          </div>
        `)}

        ${card('その他の流れ', '散歩 / 探す / 外出', `
          <div class="list">
            ${state.projects.filter((project) => project.type !== 'camp').map((project) => `
              <div class="item">
                <div class="item-main"><div class="item-title">${escapeHtml(projectLabel(project))}</div><div class="item-sub">${escapeHtml(projectTypeName(project.type))} / ${escapeHtml(project.title)} / ${escapeHtml(projectDate(project))}</div></div>
                <div class="actions compact-actions">
                  <button class="tag light" data-action="openProject" data-project-id="${escapeHtml(project.id)}" data-screen="${escapeHtml(projectDefaultScreen(project))}" data-tab="${escapeHtml(projectDefaultTab(project))}">開く</button>
                  <button class="tag light" data-action="editProject" data-project-id="${escapeHtml(project.id)}">編集</button>
                  <button class="tag ${project.id === state.activeProjectId ? '' : 'light'}" data-action="setActiveOnly" data-project-id="${escapeHtml(project.id)}">主役</button>
                </div>
              </div>
            `).join('') || '<div class="empty">散歩や探す流れを追加できます。</div>'}
          </div>
        `)}
      </main>`;
    app.innerHTML = layout(body);
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
        `, `${btn('この日に予定を作る', 'createCampFromDate', { date: selectedDate }, 'primary')}${btn('この日に記録する', 'calendarCapture', { date: selectedDate }, 'ghost')}${btn('未確認を片付ける', 'go', { screen: 'inbox', tab: '思い出' }, state.inbox.length ? 'warn' : 'ghost')}`)}
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
        `, `${btn('準備する', 'openProject', { projectId: project.id, screen: 'prep', tab: '準備' })}${btn('当日運転席', 'openProject', { projectId: project.id, screen: 'cockpit', tab: '予定' }, 'ghost')}${btn('思い出を見る', 'openProject', { projectId: project.id, screen: 'memories', tab: '思い出' }, 'ghost')}${btn('予定を管理', 'go', { screen: 'projectManage', tab: '予定' }, 'ghost')}`)}
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
    const captureDate = state.captureDate || todayISO();
    const recent = state.inbox.slice(0, 3);
    const body = `
      <section class="hero capture-hero">
        <h1>今これを残す</h1>
        <p>写真・動画・声・メモ・GPSを未確認箱へ残します。保存先は候補だけ。確定・移動・削除はムーが決めます。</p>
      </section>
      <main class="stack">
        ${card('残す前に確認', '保存先候補と日付', `
          <div class="metric-row">
            <div class="metric"><small>保存先候補</small><strong>${escapeHtml(projectLabel(project))}</strong></div>
            <div class="metric"><small>記録日</small><strong>${escapeHtml(captureDate)}</strong></div>
            <div class="metric"><small>未確認</small><strong>${state.inbox.length}件</strong></div>
            <div class="metric"><small>削除候補</small><strong>${state.inbox.filter((record) => record.status === '削除候補').length}件</strong></div>
          </div>
          <p class="note">写真は端末から選択またはカメラ起動、動画は選択、声は録音、GPSは現在地取得に対応します。保存先は候補のまま、確定はムーが行います。</p>
        `)}
        ${card('記録する', '実データを未確認箱へ', `
          <div class="capture-grid">
            <button class="capture-tile" data-action="pickMedia" data-kind="photo" data-project-id="${escapeHtml(project.id)}"><span>📷</span><strong>写真選択</strong><small>画像を保存</small></button>
            <button class="capture-tile" data-action="pickMedia" data-kind="camera" data-project-id="${escapeHtml(project.id)}"><span>📸</span><strong>カメラ</strong><small>撮って残す</small></button>
            <button class="capture-tile" data-action="pickMedia" data-kind="video" data-project-id="${escapeHtml(project.id)}"><span>🎥</span><strong>動画選択</strong><small>動画メモ</small></button>
            <button class="capture-tile" data-action="${state.voiceRecording ? 'stopVoice' : 'startVoice'}" data-project-id="${escapeHtml(project.id)}"><span>🎙️</span><strong>${state.voiceRecording ? '録音停止' : '声メモ録音'}</strong><small>${state.voiceRecording ? '未確認箱へ保存' : 'その場で録音'}</small></button>
            <button class="capture-tile" data-action="getGPS" data-project-id="${escapeHtml(project.id)}"><span>📍</span><strong>GPS取得</strong><small>現在地を残す</small></button>
            <button class="capture-tile warn-tile" data-action="addRecord" data-type="あとで整理" data-project-id="${escapeHtml(project.id)}" data-target="${escapeHtml(projectLabel(project))}" data-text="あとで整理する記録"><span>📥</span><strong>あとで整理</strong><small>未確認箱へ</small></button>
          </div>
          <input class="visually-hidden" id="photoInput" type="file" accept="image/*" data-media-kind="photo" />
          <input class="visually-hidden" id="cameraInput" type="file" accept="image/*" capture="environment" data-media-kind="camera" />
          <input class="visually-hidden" id="videoInput" type="file" accept="video/*" data-media-kind="video" />
          <div class="field">
            <label for="quickMemo">手入力メモ</label>
            <textarea id="quickMemo" placeholder="例：風が強い、設営に時間がかかった、コタが歩きやすそう"></textarea>
          </div>
        `, `${btn('メモを未確認箱へ', 'saveQuickMemo', { projectId: project.id }, 'primary')}${btn('未確認箱へ', 'go', { screen: 'inbox', tab: '思い出' }, 'ghost')}`)}
        ${card('保存先候補', '選んでから残す', `
          <div class="project-target-list">
            ${state.projects.map((candidate) => `<button class="target-chip ${candidate.id === project.id ? 'active' : ''}" data-action="switchProject" data-project-id="${escapeHtml(candidate.id)}"><strong>${escapeHtml(projectLabel(candidate))}</strong><small>${escapeHtml(candidate.title)}</small></button>`).join('')}
          </div>
        `)}
        ${card('直近の未確認', 'あとで整理', `
          ${recent.length ? `<div class="list">${recent.map((record) => compactRecordItem(record)).join('')}</div>` : '<div class="empty">まだ未確認の記録はありません。</div>'}
        `, `${btn('整理する', 'go', { screen: 'inbox', tab: '思い出' }, state.inbox.length ? 'warn' : 'ghost')}`)}
        ${card('保護ルール', '勝手に決めない', `
          <div class="guard-list">
            <span>勝手に確定しない</span><span>勝手に削除しない</span><span>保存先は候補だけ</span><span>削除候補から戻せる</span>
          </div>
        `)}
      </main>`;
    app.innerHTML = layout(body);
  }

  function typeIcon(type) {
    return { '写真': '📷', '動画': '🎥', '声': '🎙️', 'メモ': '✍️', 'GPS': '📍', 'あとで整理': '📥' }[type] || '📌';
  }

  function compactRecordItem(record) {
    const project = projectById(record.projectId);
    return `<div class="item compact-record ${record.status === '削除候補' ? 'item-warn' : ''}">
      <div class="item-main"><div class="item-title">${escapeHtml(record.type)} / ${escapeHtml(projectLabel(project))}</div><div class="item-sub">${escapeHtml(record.text)} · ${escapeHtml(recordAge(record) || record.time)}</div>${record.media ? `<div class="record-meta"><span>${escapeHtml(mediaSummary(record))}</span></div>` : ''}</div>
      <span class="tag light">${escapeHtml(record.status)}</span>
    </div>`;
  }

  function memoryCategory(record) {
    const source = `${record?.target || ''} ${record?.type || ''} ${record?.text || ''}`;
    if (/料理|食|量|味|余り|ガーリック|ピザ|朝|昼|夜/.test(source)) return '料理';
    if (/ギア|幕|設営|撤収|乾燥|寝具|ライト|電源|タープ/.test(source)) return 'ギア';
    if (/コタ|散歩|犬|フード|水|暑さ|寒さ/.test(source)) return 'コタ';
    if (/雨|風|天気|気温|地面|ルート|道|渋滞|出発|帰路/.test(source)) return '天気・ルート';
    if (/場所|サイト|トイレ|炊事場|売店|景色|ドッグラン|候補/.test(source)) return '場所';
    return '記録';
  }

  function improvementTargetForMemory(record) {
    const category = memoryCategory(record);
    if (category === '場所') return '探す';
    if (category === '天気・ルート') return /ルート|道|渋滞|出発|帰路/.test(`${record?.target || ''} ${record?.text || ''}`) ? 'ルート' : '天気';
    if (category === '記録') return '次の準備';
    return category;
  }

  function memoryGroups(records) {
    const groups = {};
    records.forEach((record) => {
      const category = memoryCategory(record);
      if (!groups[category]) groups[category] = [];
      groups[category].push(record);
    });
    return groups;
  }

  function memorySummary(records) {
    return {
      total: records.length,
      photo: records.filter((record) => record.type === '写真').length,
      voice: records.filter((record) => record.type === '声').length,
      memo: records.filter((record) => record.type === 'メモ').length,
      gps: records.filter((record) => record.type === 'GPS').length
    };
  }

  function improvementCounts(projectId) {
    const list = state.improvements.filter((item) => item.projectId === projectId);
    return {
      total: list.length,
      open: list.filter((item) => !item.done).length,
      done: list.filter((item) => item.done).length
    };
  }

  function improvementTargets() {
    return ['買い物', '料理', 'ギア', 'コタ', '天気', 'ルート', '探す', '次の予定', '次の準備'];
  }

  function formatShortDate(value) {
    if (!value) return '日付なし';
    const parts = String(value).split('-');
    if (parts.length === 3) return `${Number(parts[1])}/${Number(parts[2])}`;
    return value;
  }

  function ensureReflectionLog(item, message) {
    item.reflectionLog = Array.isArray(item.reflectionLog) ? item.reflectionLog : [];
    item.reflectionLog.unshift({ at: new Date().toISOString(), message });
    item.reflectionLog = item.reflectionLog.slice(0, 6);
  }

  function applyImprovementToProject(item) {
    const project = projectById(item.projectId) || campProject();
    const target = item.target || '次の準備';
    const text = item.text || '次回改善';
    const already = (list) => Array.isArray(list) && list.some((entry) => entry.improvementId === item.id);

    if (project.type !== 'camp') {
      item.reflectedTo = projectLabel(project);
      ensureReflectionLog(item, `${projectLabel(project)}に反映済みとして残しました`);
      return;
    }

    if (target.includes('買い物')) {
      if (!already(project.shopping)) {
        project.shopping.push({ id: makeId('shop'), group: '改善から追加', name: text, qty: '次回確認', owner: '準備で確認', detail: '思い出から反映', state: '未購入', improvementId: item.id });
      }
      updateShoppingPrep(project);
      item.reflectedTo = '買い物';
      ensureReflectionLog(item, '買い物に確認項目を追加しました');
      return;
    }

    if (target.includes('料理')) {
      if (!already(project.meals)) project.meals.push({ id: makeId('meal'), slot: '次回メモ', menu: text, caution: '思い出から反映', improvementId: item.id });
      const prep = project.prep?.find((entry) => entry.id === 'cook');
      if (prep) prep.status = '確認中';
      item.reflectedTo = '料理';
      ensureReflectionLog(item, '料理計画に次回メモを追加しました');
      return;
    }

    if (target.includes('ギア')) {
      if (!already(project.gear)) project.gear.push({ id: makeId('gear'), group: '改善から追加', name: text, qty: '次回確認', note: '思い出から反映', done: false, improvementId: item.id });
      updatePrepStatus(project, 'gear', project.gear, '確認中');
      item.reflectedTo = 'ギア';
      ensureReflectionLog(item, 'ギア準備に確認項目を追加しました');
      return;
    }

    if (target.includes('コタ')) {
      if (!already(project.kota)) project.kota.push({ id: makeId('kota'), group: '改善から追加', name: text, qty: '次回確認', note: '思い出から反映', done: false, improvementId: item.id });
      updatePrepStatus(project, 'kota', project.kota, '未確認');
      item.reflectedTo = 'コタ';
      ensureReflectionLog(item, 'コタ用品に確認項目を追加しました');
      return;
    }

    if (target.includes('天気')) {
      if (!already(project.weatherChecks)) project.weatherChecks.push({ id: makeId('weather'), name: text, note: '思い出から反映', done: false, improvementId: item.id });
      updatePrepStatus(project, 'weather', project.weatherChecks, '要確認');
      item.reflectedTo = '天気';
      ensureReflectionLog(item, '天気確認に項目を追加しました');
      return;
    }

    if (target.includes('ルート')) {
      if (!already(project.routeChecks)) project.routeChecks.push({ id: makeId('route'), name: text, note: '思い出から反映', done: false, improvementId: item.id });
      updatePrepStatus(project, 'route', project.routeChecks, '確認中');
      item.reflectedTo = 'ルート';
      ensureReflectionLog(item, 'ルート確認に項目を追加しました');
      return;
    }

    if (target.includes('探す')) {
      item.reflectedTo = '探す';
      ensureReflectionLog(item, '次に探す条件として残しました');
      return;
    }

    item.reflectedTo = target;
    ensureReflectionLog(item, `${target}に戻す改善として残しました`);
  }

  function renderMemories() {
    const project = activeProject();
    const projectMemories = state.memories.filter((record) => record.projectId === project.id);
    const groups = memoryGroups(projectMemories);
    const summary = memorySummary(projectMemories);
    const counts = improvementCounts(project.id);
    const body = `
      <section class="hero memories-hero">
        <h1>思い出</h1>
        <p>写真やメモを眺めるだけで終わらせず、料理・ギア・コタ・天気・場所の振り返りに分け、次回改善へ戻します。</p>
      </section>
      <main class="stack">
        ${card('見る流れを選ぶ', '予定別に整理', `${projectSwitch()}`)}
        ${card(project.title, '思い出の状態', `
          <div class="metric-row">
            <div class="metric"><small>思い出</small><strong>${summary.total}件</strong></div>
            <div class="metric"><small>写真</small><strong>${summary.photo}件</strong></div>
            <div class="metric"><small>声メモ</small><strong>${summary.voice}件</strong></div>
            <div class="metric"><small>改善待ち</small><strong>${counts.open}件</strong></div>
          </div>
        `, `${btn('未確認を片付ける', 'go', { screen: 'inbox', tab: '思い出' }, state.inbox.length ? 'warn' : 'ghost')}${btn('次回改善へ', 'go', { screen: 'improvements', tab: '思い出' }, 'ghost')}`)}
        ${card('カテゴリ別に振り返る', '次回へ送る前の整理', `
          ${projectMemories.length ? `<div class="memory-groups">${Object.entries(groups).map(([category, records]) => `
            <div class="memory-group">
              <div class="memory-group-head"><strong>${escapeHtml(category)}</strong><span>${records.length}件</span></div>
              <div class="list">${records.map((record) => memoryItem(record)).join('')}</div>
            </div>
          `).join('')}</div>` : '<div class="empty">まだ思い出に確定した記録はありません。未確認箱から移すと、ここでカテゴリ別に整理できます。</div>'}
        `)}
        ${card('振り返りテンプレ', 'すぐ改善へ送る', `
          <div class="grid-2">
            ${[
              ['良かったこと', '次の予定'],
              ['失敗したこと', '次の準備'],
              ['忘れ物', 'ギア'],
              ['料理の量', '料理'],
              ['買い物の過不足', '買い物'],
              ['コタの様子', 'コタ'],
              ['雨風と撤収', '天気'],
              ['道と寄り道', 'ルート'],
              ['サイトの良し悪し', '探す'],
              ['次もやること', '次の準備']
            ].map(([text, target]) => `<button class="btn ghost" data-action="addImprovement" data-project-id="${escapeHtml(project.id)}" data-text="${escapeHtml(text)}を振り返る" data-target="${escapeHtml(target)}">${escapeHtml(text)}</button>`).join('')}
          </div>
        `)}
      </main>`;
    app.innerHTML = layout(body);
  }

  function memoryItem(record) {
    return `
      <div class="item memory-item">
        <div class="memory-icon">${escapeHtml(typeIcon(record.type))}</div>
        <div class="item-main">
          <div class="item-title">${escapeHtml(record.type)} / ${escapeHtml(memoryCategory(record))}</div>
          <div class="item-sub">${escapeHtml(record.target)} · ${escapeHtml(record.text)} · ${escapeHtml(formatShortDate(record.date))} · ${escapeHtml(record.time)}</div>
          ${record.media ? mediaPreview(record, 'thumb') : ''}
          <div class="record-meta">
            <span>${escapeHtml(record.source || '記録')}</span>
            ${record.stepId ? `<span>${escapeHtml(dayStepById(projectById(record.projectId), record.stepId)?.title || record.stepId)}</span>` : ''}
            <span>保存済み</span>
          </div>
        </div>
        <button class="tag light" data-action="improveFromMemory" data-id="${escapeHtml(record.id)}">改善へ</button>
      </div>
    `;
  }

  function improvementItem(item, compact = false) {
    const targetButtons = improvementTargets().map((target) => `<button class="target-mini ${item.target === target ? 'active' : ''}" data-action="setImprovementTarget" data-id="${escapeHtml(item.id)}" data-target="${escapeHtml(target)}">${escapeHtml(target)}</button>`).join('');
    return `
      <div class="item improvement-item ${item.done ? 'is-reflected' : ''}">
        <div class="item-main">
          <div class="item-title">${escapeHtml(item.text)}</div>
          <div class="item-sub">反映先：${escapeHtml(item.target || '次の準備')} / ${escapeHtml(formatShortDate(item.date))}${item.reflectedTo ? ` / ${escapeHtml(item.reflectedTo)}へ反映済み` : ''}</div>
          ${compact ? '' : `<div class="target-picker improvement-targets">${targetButtons}</div>`}
          ${item.reflectionLog?.length ? `<div class="reflection-log">${item.reflectionLog.slice(0, 2).map((log) => `<span>${escapeHtml(log.message)}</span>`).join('')}</div>` : ''}
        </div>
        <div class="actions compact-actions">
          <button class="btn ${item.done ? 'ghost' : 'primary'}" data-action="reflectImprovement" data-id="${escapeHtml(item.id)}">${item.done ? '反映済み' : '準備へ反映'}</button>
          ${compact ? '' : `<button class="btn ghost" data-action="editImprovement" data-id="${escapeHtml(item.id)}">修正</button>`}
        </div>
      </div>
    `;
  }

  function renderImprovements() {
    const project = activeProject();
    const list = state.improvements.filter((item) => item.projectId === project.id);
    const open = list.filter((item) => !item.done);
    const done = list.filter((item) => item.done);
    const targetSummary = improvementTargets().map((target) => ({ target, count: list.filter((item) => item.target === target).length })).filter((entry) => entry.count);
    const body = `
      <section class="hero improvements-hero">
        <h1>次回改善</h1>
        <p>思い出から出た改善を、買い物・料理・ギア・コタ・天気・ルート・探す・次の予定へ戻します。</p>
      </section>
      <main class="stack">
        ${card('反映する流れを選ぶ', '予定別に戻す', `${projectSwitch()}`)}
        ${card(project.title, '改善の状態', `
          <div class="metric-row">
            <div class="metric"><small>改善</small><strong>${list.length}件</strong></div>
            <div class="metric"><small>未反映</small><strong>${open.length}件</strong></div>
            <div class="metric"><small>反映済み</small><strong>${done.length}件</strong></div>
            <div class="metric"><small>反映先</small><strong>${targetSummary.length || 0}種類</strong></div>
          </div>
          ${targetSummary.length ? `<div class="target-summary">${targetSummary.map((entry) => `<span>${escapeHtml(entry.target)} ${entry.count}</span>`).join('')}</div>` : '<p class="note">思い出から改善に送ると、ここで反映先を選べます。</p>'}
        `)}
        ${card('未反映の改善', '次の準備へ戻す', `
          ${open.length ? `<div class="list">${open.map((item) => improvementItem(item)).join('')}</div>` : '<div class="empty">未反映の改善はありません。思い出から送るか、下の反映先から追加します。</div>'}
        `)}
        ${card('反映済み', '戻した履歴', `
          ${done.length ? `<div class="list">${done.map((item) => improvementItem(item, true)).join('')}</div>` : '<div class="empty">まだ反映済みの改善はありません。</div>'}
        `, `${btn('準備を見る', 'openProject', { projectId: project.id, screen: 'prep', tab: '準備' }, 'primary')}${btn('思い出を見る', 'go', { screen: 'memories', tab: '思い出' }, 'ghost')}`)}
        ${card('反映先を追加', '戻す場所', `
          <div class="grid-2">
            ${improvementTargets().map((target) => `<button class="btn ghost" data-action="addImprovement" data-project-id="${escapeHtml(project.id)}" data-text="${escapeHtml(target)}に反映する改善" data-target="${escapeHtml(target)}">${escapeHtml(target)}</button>`).join('')}
          </div>
        `)}
      </main>`;
    app.innerHTML = layout(body);
  }

  function renderReleaseAudit() {
    const summary = routeSummary();
    const checks = finalAuditItems();
    const okCount = checks.filter((item) => item.ok).length;
    const body = `
      <section class="hero audit-hero">
        <h1>本番前総合確認</h1>
        <p>一本線、下ナビ、複数プロジェクト、記録整理、復旧、次回改善のつながりをまとめて確認します。</p>
      </section>
      <main class="stack">
        ${card('総合状態', 'Restart-14', `
          <div class="metric-row">
            <div class="metric"><small>確認</small><strong>${okCount}/${checks.length}</strong></div>
            <div class="metric"><small>流れ</small><strong>${summary.projects}件</strong></div>
            <div class="metric"><small>日付</small><strong>${summary.calendar}件</strong></div>
            <div class="metric"><small>未整理</small><strong>${summary.inbox}件</strong></div>
          </div>
          <div class="progress"><span style="width:${Math.round((okCount / checks.length) * 100)}%"></span></div>
          <div class="health-list">${healthNotes().map((text) => `<span>${escapeHtml(text)}</span>`).join('')}</div>
        `, `${btn('表示を更新', 'refreshApp', {}, 'ghost')}${btn('紐づけ補正', 'repairNow', {}, 'ghost')}${btn('控えをコピー', 'copyBackup', {}, 'ghost')}`)}

        ${card('LOCK確認', '崩してはいけないもの', `
          <div class="audit-list">
            ${checks.map((item) => `
              <div class="audit-item ${item.ok ? 'ok' : 'warn'}">
                <span class="audit-status">${item.ok ? 'OK' : '要確認'}</span>
                <div><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.detail)}</small></div>
              </div>
            `).join('')}
          </div>
        `)}

        ${card('触る順番', 'スマホ確認', `
          <p class="note">GitHub反映後は、この順番で押して、古い画面が残っていないかだけ確認します。</p>
          <div class="grid-2">
            ${btn('ホーム', 'go', { screen: 'home', tab: '予定' }, 'ghost')}
            ${btn('カレンダー', 'go', { screen: 'calendar', tab: '予定' }, 'ghost')}
            ${btn('準備', 'go', { screen: 'prep', tab: '準備' }, 'ghost')}
            ${btn('当日運転席', 'go', { screen: 'cockpit', tab: '予定' }, 'ghost')}
            ${btn('＋記録', 'go', { screen: 'capture', tab: '＋' }, 'ghost')}
            ${btn('未確認箱', 'go', { screen: 'inbox', tab: '思い出' }, 'ghost')}
            ${btn('思い出', 'go', { screen: 'memories', tab: '思い出' }, 'ghost')}
            ${btn('次回改善', 'go', { screen: 'improvements', tab: '思い出' }, 'ghost')}
          </div>
        `)}

        ${card('控えと復旧', '消さずに守る', `
          <p class="card-text">公開前に控えをコピーしておけば、スマホ側の保存状態を後から確認できます。削除候補はすぐ消さず、復旧控えから未確認箱へ戻せます。</p>
        `, `${btn('総合確認をコピー', 'copyAuditSummary', {}, 'primary')}${btn('控えをコピー', 'copyBackup', {}, 'ghost')}${btn('未確認箱へ', 'go', { screen: 'inbox', tab: '思い出' }, 'ghost')}`)}
      </main>`;
    app.innerHTML = layout(body, { subtitle: '本番前に一本線をまとめて確認' });
  }


  function renderDataGuard() {
    const summary = routeSummary();
    const backupLength = backupText().length;
    const body = `
      <section class="hero audit-hero">
        <h1>データを守る</h1>
        <p>スマホ更新、GitHub反映、端末変更の前後で、OUTBASEの控えを作って読み込めるようにします。</p>
      </section>
      <main class="stack">
        ${card('現在の保存状態', '消さずに確認', `
          <div class="metric-row">
            <div class="metric"><small>流れ</small><strong>${summary.projects}件</strong></div>
            <div class="metric"><small>未整理</small><strong>${summary.inbox}件</strong></div>
            <div class="metric"><small>思い出</small><strong>${summary.memories}件</strong></div>
            <div class="metric"><small>改善</small><strong>${summary.improvements}件</strong></div>
          </div>
          <p class="note">最終保存：${escapeHtml(state.savedAt ? new Date(state.savedAt).toLocaleString('ja-JP') : 'これから保存')}</p>
          <p class="note">控えの大きさ：約${Math.ceil(backupLength / 1024)}KB</p>
        `, `${btn('控えをコピー', 'copyBackup', {}, 'primary')}${btn('総合確認をコピー', 'copyAuditSummary', {}, 'ghost')}`)}

        ${card('控えを読み込む', '貼り付けて戻す', `
          <p class="card-text">前にコピーしたOUTBASEの控えを貼り付けると、projects、記録、思い出、次回改善、カレンダーをまとめて読み込みます。</p>
          <p class="note">読み込み前に、今の状態も自動で一時控えとして端末内に残します。</p>
        `, `${btn('控えを貼り付けて読み込む', 'importBackup', {}, 'warn')}${btn('読み込み前の一時控えをコピー', 'copyPreImportBackup', {}, 'ghost')}`)}

        ${card('復旧控え', '完全削除後も確認', `
          <p class="card-text">完全削除した記録も、復旧控えに残っているものは未確認箱へ戻せます。</p>
          <div class="record-list">
            ${state.deletedRecords.slice(0, 5).map((record) => `
              <div class="record-card">
                <strong>${escapeHtml(record.type || '記録')} / ${escapeHtml(record.target || '保存先候補')}</strong>
                <p>${escapeHtml(record.text || '')}</p>
                <small>${escapeHtml(record.date || '')}</small>
                <div class="actions mini-actions">${btn('未確認箱へ戻す', 'restoreDeletedRecord', { id: record.id }, 'ghost')}</div>
              </div>
            `).join('') || '<div class="empty">復旧控えはまだありません。</div>'}
          </div>
        `, `${btn('未確認箱へ', 'go', { screen: 'inbox', tab: '思い出' }, 'ghost')}`)}

        ${card('表示と紐づけ', '古い表示を直す', `
          <p class="card-text">古い画面が残る時は表示を更新します。保存先や日付の抜けは、紐づけ補正で直します。</p>
          <div class="health-list">${healthNotes().map((text) => `<span>${escapeHtml(text)}</span>`).join('')}</div>
        `, `${btn('表示を更新', 'refreshApp', {}, 'ghost')}${btn('紐づけ補正', 'repairNow', {}, 'ghost')}${btn('本番前総合確認', 'go', { screen: 'releaseAudit', tab: '予定' }, 'ghost')}`)}
      </main>`;
    app.innerHTML = layout(body, { subtitle: '控えと復旧をまとめて守る' });
  }



  function renderExternalConnect() {
    const body = `
      <section class="hero">
        <h1>外部連携準備</h1>
        <p>本接続の前に、何を外へ出すか、何をOUTBASE内で守るかを整理します。勝手に同期・確定・削除はしません。</p>
      </section>
      <main class="stack">
        ${card('連携準備の全体像', 'まだ本接続しない', `
          <div class="metric-row">
            <div class="metric"><small>連携枠</small><strong>${state.integrations.length}件</strong></div>
            <div class="metric"><small>準備ライン</small><strong>${externalReadyCount()}件</strong></div>
            <div class="metric"><small>未整理</small><strong>${state.inbox.length}件</strong></div>
            <div class="metric"><small>控え</small><strong>${state.savedAt ? 'あり' : 'これから'}</strong></div>
          </div>
          <p class="note">写真・天気・予定・予約情報は、まずOUTBASE内のIDと日付に紐づけます。外部へ送る前に必ずムーが確認します。</p>
        `, `${btn('控えをコピー', 'copyBackup', {}, 'primary')}${btn('計画をコピー', 'copyExternalPlan', {}, 'ghost')}${btn('データを守る', 'go', { screen: 'dataGuard', tab: '思い出' }, 'ghost')}`)}

        ${state.integrations.map((item) => card(item.name, item.label, `
          <p class="card-text">${escapeHtml(item.summary)}</p>
          <div class="metric-row compact-metrics">
            <div class="metric"><small>状態</small><strong>${escapeHtml(item.status)}</strong></div>
            <div class="metric"><small>準備率</small><strong>${integrationProgress(item)}%</strong></div>
          </div>
          <div class="progress"><span style="width:${integrationProgress(item)}%"></span></div>
          <div class="check-list">
            ${item.steps.map((step) => `<button class="check-row ${step.done ? 'done' : ''}" data-action="toggleIntegrationStep" data-integration-id="${escapeHtml(item.id)}" data-step-id="${escapeHtml(step.id)}"><span>${step.done ? '✓' : '□'}</span><strong>${escapeHtml(step.text)}</strong></button>`).join('')}
          </div>
          <p class="note">${escapeHtml(item.note || '')}</p>
        `, `${btn('状態を変更', 'changeIntegrationStatus', { integrationId: item.id }, 'ghost')}${btn('メモを追加', 'addIntegrationNote', { integrationId: item.id }, 'ghost')}`)).join('')}

        ${card('連携メモ', '外に出す前の確認', `
          ${state.integrationNotes.length ? `<div class="list">${state.integrationNotes.map((note) => `<div class="item"><div class="item-main"><div class="item-title">${escapeHtml(note.title || '連携メモ')}</div><div class="item-sub">${escapeHtml(note.text)} · ${escapeHtml(note.date || '')}</div></div></div>`).join('')}</div>` : '<div class="empty">連携前に気づいたことを残します。</div>'}
        `, `${btn('メモを追加', 'addIntegrationNote', {}, 'primary')}${btn('計画をコピー', 'copyExternalPlan', {}, 'ghost')}`)}
      </main>`;
    app.innerHTML = layout(body, { subtitle: '外部連携は確認してから' });
  }

  function renderRecordDetail() {
    const found = findRecordById(state.recordDetailId);
    const record = found?.record;
    if (!record) {
      state.screen = 'inbox';
      state.recordDetailId = '';
      renderInbox();
      return;
    }
    const project = projectById(record.projectId);
    const body = `
      <section class="hero inbox-hero">
        <h1>記録詳細</h1>
        <p>実データ、保存先候補、記録日、復旧状態をここで確認します。勝手に確定・削除はしません。</p>
      </section>
      <main class="stack">
        ${card('記録内容', record.type || '記録', `
          <div class="metric-row">
            <div class="metric"><small>保存先候補</small><strong>${escapeHtml(projectLabel(project))}</strong></div>
            <div class="metric"><small>状態</small><strong>${escapeHtml(record.status || found.area)}</strong></div>
            <div class="metric"><small>記録日</small><strong>${escapeHtml(record.date || '')}</strong></div>
            <div class="metric"><small>種類</small><strong>${escapeHtml(record.type || '')}</strong></div>
          </div>
          ${record.media ? mediaPreview(record, 'large') : '<div class="empty">添付データはありません。</div>'}
          <p class="card-text">${escapeHtml(record.text || '')}</p>
          <div class="record-meta">
            <span>${escapeHtml(record.source || '記録')}</span>
            ${record.stepId ? `<span>工程:${escapeHtml(dayStepById(project, record.stepId)?.title || record.stepId)}</span>` : ''}
            <span>${escapeHtml(mediaSummary(record))}</span>
          </div>
        `, `${found.area === 'inbox' && record.status !== '削除候補' ? btn('思い出へ確定', 'confirmRecord', { id: record.id }, 'primary') : ''}${btn('修正', 'editRecord', { id: record.id }, 'ghost')}${btn('未確認箱へ', 'go', { screen: 'inbox', tab: '思い出' }, 'ghost')}${btn('思い出へ', 'go', { screen: 'memories', tab: '思い出' }, 'ghost')}`)}

        ${card('保存先候補', '必要なら変更', `
          <div class="project-target-list">
            ${state.projects.map((candidate) => `<button class="target-chip ${candidate.id === record.projectId ? 'active' : ''}" data-action="setRecordTarget" data-id="${escapeHtml(record.id)}" data-project-id="${escapeHtml(candidate.id)}"><strong>${escapeHtml(projectLabel(candidate))}</strong><small>${escapeHtml(candidate.title)}</small></button>`).join('')}
          </div>
        `)}
      </main>`;
    app.innerHTML = layout(body, { subtitle: '写真・声・GPSを記録単位で確認' });
  }

  function findRecordById(id) {
    const inbox = state.inbox.find((record) => record.id === id);
    if (inbox) return { record: inbox, area: 'inbox' };
    const memory = state.memories.find((record) => record.id === id);
    if (memory) return { record: memory, area: 'memories' };
    const deleted = state.deletedRecords.find((record) => record.id === id);
    if (deleted) return { record: deleted, area: 'deleted' };
    return null;
  }

  function mediaSummary(record) {
    const media = record?.media;
    if (!media) return '添付なし';
    if (media.kind === 'gps') return media.coords ? `${Number(media.coords.latitude).toFixed(5)}, ${Number(media.coords.longitude).toFixed(5)}` : 'GPS';
    if (media.durationMs) return `${media.kindLabel || media.kind} ${Math.round(media.durationMs / 1000)}秒`;
    const size = media.size ? `${Math.ceil(media.size / 1024)}KB` : '';
    return [media.kindLabel || media.kind, media.name, size].filter(Boolean).join(' / ');
  }

  function mediaPreview(record, mode = 'thumb') {
    const media = record?.media;
    if (!media) return '';
    const cls = mode === 'large' ? 'media-preview large' : 'media-preview';
    if (media.kind === 'image' && media.dataUrl) return `<div class="${cls}"><img src="${escapeAttr(media.dataUrl)}" alt="${escapeAttr(media.name || '写真')}" loading="lazy"></div>`;
    if (media.kind === 'video' && media.dataUrl) return `<div class="${cls}"><video src="${escapeAttr(media.dataUrl)}" controls playsinline></video></div>`;
    if (media.kind === 'audio' && media.dataUrl) return `<div class="${cls}"><audio src="${escapeAttr(media.dataUrl)}" controls></audio></div>`;
    if (media.kind === 'gps' && media.coords) {
      const lat = Number(media.coords.latitude);
      const lng = Number(media.coords.longitude);
      const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
      return `<div class="${cls} gps-preview"><strong>📍 GPS</strong><span>${lat.toFixed(6)}, ${lng.toFixed(6)}</span><a href="${escapeAttr(mapUrl)}" target="_blank" rel="noopener">地図で見る</a></div>`;
    }
    return `<div class="${cls} file-preview"><strong>${escapeHtml(media.kindLabel || '添付')}</strong><span>${escapeHtml(media.name || '')}</span><small>${escapeHtml(media.note || '端末内ファイルの記録を残しました')}</small></div>`;
  }

  function escapeAttr(value) {
    return String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderInbox() {
    const records = visibleInboxRecords();
    const activeCount = state.inbox.filter((record) => record.status !== '削除候補').length;
    const deleteCount = state.inbox.filter((record) => record.status === '削除候補').length;
    const body = `
      <section class="hero inbox-hero">
        <h1>未確認箱</h1>
        <p>保存先がまだ確定していない記録です。ここで保存先を選び、思い出へ確定し、不要なものだけ削除候補にします。</p>
      </section>
      <main class="stack">
        ${card('整理状況', '勝手に削除しない', `
          <div class="metric-row">
            <div class="metric"><small>未確認</small><strong>${activeCount}件</strong></div>
            <div class="metric"><small>削除候補</small><strong>${deleteCount}件</strong></div>
            <div class="metric"><small>思い出</small><strong>${state.memories.length}件</strong></div>
            <div class="metric"><small>復旧控え</small><strong>${state.deletedRecords.length}件</strong></div>
          </div>
          <div class="filter-row">
            <button class="filter-pill ${state.inboxFilter === 'all' ? 'active' : ''}" data-action="setInboxFilter" data-filter="all">全部</button>
            <button class="filter-pill ${state.inboxFilter === 'active' ? 'active' : ''}" data-action="setInboxFilter" data-filter="active">未確認だけ</button>
            <button class="filter-pill ${state.inboxFilter === 'delete' ? 'active' : ''}" data-action="setInboxFilter" data-filter="delete">削除候補</button>
          </div>
        `)}
        ${card('保存先を選んで確定', '未確認の記録', `
          ${records.length ? `<div class="list">${records.map((record) => inboxItem(record)).join('')}</div>` : '<div class="empty">この条件の記録はありません。＋から残したものがここに入ります。</div>'}
        `)}
        ${card('復旧の考え方', '間違えても戻せる', `
          <p class="note">削除候補はまだ消しません。完全に消す時だけ確認を出します。完全削除した記録も復旧控えから未確認箱へ戻せます。</p>
          ${state.deletedRecords.length ? `<div class="list recovery-list">${state.deletedRecords.map((record) => `
            <div class="item item-warn">
              <div class="item-main"><div class="item-title">${escapeHtml(record.type)} / ${escapeHtml(record.target)}</div><div class="item-sub">${escapeHtml(record.text)} · ${escapeHtml(record.deletedAt || '')}</div></div>
              <button class="tag light" data-action="restoreDeletedRecord" data-id="${escapeHtml(record.id)}">戻す</button>
            </div>
          `).join('')}</div>` : '<div class="empty">復旧控えはありません。</div>'}
        `, `${btn('＋で記録する', 'go', { screen: 'capture', tab: '＋' }, 'primary')}${btn('思い出を見る', 'go', { screen: 'memories', tab: '思い出' }, 'ghost')}${btn('控えをコピー', 'copyBackup', {}, 'ghost')}`)}
      </main>`;
    app.innerHTML = layout(body);
  }

  function inboxItem(record) {
    const project = projectById(record.projectId);
    const isDelete = record.status === '削除候補';
    return `
      <div class="item record-card ${isDelete ? 'item-warn' : ''}">
        <div class="item-main">
          <div class="item-title">${escapeHtml(record.type)} / 候補：${escapeHtml(projectLabel(project))}</div>
          <div class="item-sub">${escapeHtml(record.target)} · ${escapeHtml(record.text)} · ${escapeHtml(record.date || '')} · ${escapeHtml(recordAge(record) || record.time)}</div>
          ${record.media ? mediaPreview(record, 'thumb') : ''}
          <div class="record-meta">
            <span>${escapeHtml(record.source || '記録')}</span>
            ${record.stepId ? `<span>工程:${escapeHtml(dayStepById(project, record.stepId)?.title || record.stepId)}</span>` : ''}
            <span>${record.protect ? '保護中' : '通常'}</span>
            ${isDelete ? '<span>まだ戻せます</span>' : ''}
          </div>
          ${!isDelete ? `<div class="target-picker">
            ${state.projects.map((candidate) => `<button class="target-mini ${candidate.id === record.projectId ? 'active' : ''}" data-action="setRecordTarget" data-id="${escapeHtml(record.id)}" data-project-id="${escapeHtml(candidate.id)}">${escapeHtml(projectLabel(candidate))}</button>`).join('')}
          </div>` : ''}
        </div>
        <div class="actions compact-actions">
          ${isDelete
            ? `<button class="btn primary" data-action="restoreRecord" data-id="${escapeHtml(record.id)}">元に戻す</button>
               <button class="btn danger" data-action="permanentDeleteRecord" data-id="${escapeHtml(record.id)}">完全に削除</button>`
            : `<button class="btn primary" data-action="confirmRecord" data-id="${escapeHtml(record.id)}">思い出へ確定</button>
               <button class="btn ghost" data-action="openRecordDetail" data-id="${escapeHtml(record.id)}">詳細</button>
               <button class="btn ghost" data-action="editRecord" data-id="${escapeHtml(record.id)}">修正</button>
               <button class="btn ghost" data-action="deleteCandidate" data-id="${escapeHtml(record.id)}">削除候補</button>`}
        </div>
      </div>
    `;
  }

  function createRecord(type, projectId, target, text, stepId = '', extras = {}) {
    const project = projectById(projectId) || activeProject();
    const createdAt = new Date().toISOString();
    return {
      id: makeId('rec'),
      projectId: project.id,
      stepId,
      type,
      target: target || projectLabel(project),
      text: text || 'あとで整理する記録',
      time: new Date().toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      date: state.captureDate || todayISO(),
      createdAt,
      updatedAt: createdAt,
      status: '未確認',
      protect: true,
      source: stepId ? '当日運転席' : (state.screen === 'capture' ? '＋記録' : '画面内記録'),
      candidateHistory: [{ projectId: project.id, label: projectLabel(project), at: createdAt }],
      note: '保存先は候補です。確定はムーが行います。',
      ...extras
    };
  }

  function addRecord(type, projectId, target, text, stepId = '', extras = {}) {
    const record = createRecord(type, projectId, target, text, stepId, extras);
    state.inbox.unshift(record);
    state.captureDate = '';
    saveState();
    showToast('未確認箱に残しました');
    if (state.screen === 'capture' || state.screen === 'inbox' || state.screen === 'recordDetail') render();
  }

  function addMediaRecord(kind, projectId, media, text = '') {
    const project = projectById(projectId) || activeProject();
    const type = kind === 'image' ? '写真' : kind === 'video' ? '動画' : kind === 'audio' ? '声' : kind === 'gps' ? 'GPS' : 'メモ';
    const label = { image: '写真', video: '動画', audio: '声メモ', gps: 'GPS' }[kind] || '記録';
    addRecord(type, project.id, projectLabel(project), text || `${label}を残しました`, '', { media: { kind, kindLabel: label, ...media } });
  }

  function handlePickedFile(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const kind = input.dataset.mediaKind === 'video' ? 'video' : 'image';
    const project = activeProject();
    const baseMedia = { name: file.name, size: file.size, mime: file.type, capturedAt: new Date().toISOString() };
    const tooLarge = file.size > MAX_EMBED_BYTES;
    if (tooLarge && kind === 'video') {
      addMediaRecord(kind, project.id, { ...baseMedia, note: '動画は容量が大きいため、ファイル名とメモだけ保存しました。必要な動画は端末側に残してください。' }, `${kind === 'video' ? '動画' : '写真'}：${file.name}`);
      input.value = '';
      return;
    }
    if (tooLarge && kind === 'image') {
      readImageAsCompressedDataUrl(file).then((dataUrl) => {
        addMediaRecord(kind, project.id, { ...baseMedia, dataUrl, compressed: true, note: '画像を圧縮して保存しました。' }, `写真：${file.name}`);
        input.value = '';
      }).catch(() => {
        addMediaRecord(kind, project.id, { ...baseMedia, note: '画像が大きいため、ファイル名だけ保存しました。' }, `写真：${file.name}`);
        input.value = '';
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      addMediaRecord(kind, project.id, { ...baseMedia, dataUrl: reader.result }, `${kind === 'video' ? '動画' : '写真'}：${file.name}`);
      input.value = '';
    };
    reader.onerror = () => {
      addMediaRecord(kind, project.id, { ...baseMedia, note: '読み込みに失敗したため、ファイル名だけ保存しました。' }, `${kind === 'video' ? '動画' : '写真'}：${file.name}`);
      input.value = '';
    };
    reader.readAsDataURL(file);
  }

  function readImageAsCompressedDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.onload = () => {
          const max = 1400;
          const scale = Math.min(1, max / Math.max(image.width, image.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          const ctx = canvas.getContext('2d');
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.72));
        };
        image.onerror = reject;
        image.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function startVoiceMemo(projectId) {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      const text = promptText('声メモの内容', '声メモ：');
      if (text !== null) addRecord('声', projectId || state.activeProjectId, projectLabel(projectById(projectId) || activeProject()), text || '声メモを残しました', '', { media: { kind: 'audio', kindLabel: '声メモ', note: 'この端末では録音できないため、文字メモで残しました。' } });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceChunks = [];
      voiceRecorder = new MediaRecorder(stream);
      voiceStartedAt = Date.now();
      voiceRecorder.ondataavailable = (event) => { if (event.data && event.data.size) voiceChunks.push(event.data); };
      voiceRecorder.onstop = () => {
        const blob = new Blob(voiceChunks, { type: voiceRecorder?.mimeType || 'audio/webm' });
        const durationMs = Date.now() - voiceStartedAt;
        const reader = new FileReader();
        reader.onload = () => {
          addMediaRecord('audio', projectId || state.activeProjectId, { name: `voice-${Date.now()}.webm`, size: blob.size, mime: blob.type, dataUrl: reader.result, durationMs }, `声メモ ${Math.round(durationMs / 1000)}秒`);
          state.voiceRecording = false;
          saveState();
          renderCapture();
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((track) => track.stop());
        voiceRecorder = null;
      };
      voiceRecorder.start();
      state.voiceRecording = true;
      saveState();
      renderCapture();
      showToast('録音を開始しました');
    } catch (error) {
      showToast('録音を開始できませんでした');
    }
  }

  function stopVoiceMemo() {
    if (voiceRecorder && voiceRecorder.state !== 'inactive') {
      voiceRecorder.stop();
      showToast('録音を保存します');
    } else {
      state.voiceRecording = false;
      saveState();
      renderCapture();
    }
  }

  function getCurrentGPS(projectId) {
    if (!navigator.geolocation) {
      const text = promptText('GPSメモ', '現在地を取得できないため手入力');
      if (text !== null) addRecord('GPS', projectId || state.activeProjectId, projectLabel(projectById(projectId) || activeProject()), text || 'GPSメモ', '', { media: { kind: 'gps', kindLabel: 'GPS', note: 'この端末では現在地を取得できませんでした。' } });
      return;
    }
    showToast('現在地を取得しています');
    navigator.geolocation.getCurrentPosition((position) => {
      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        heading: position.coords.heading,
        speed: position.coords.speed
      };
      addMediaRecord('gps', projectId || state.activeProjectId, { coords, capturedAt: new Date().toISOString() }, `GPS：精度 約${Math.round(position.coords.accuracy || 0)}m`);
    }, () => {
      showToast('現在地を取得できませんでした');
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  }

  function visibleInboxRecords() {
    if (state.inboxFilter === 'active') return state.inbox.filter((record) => record.status !== '削除候補');
    if (state.inboxFilter === 'delete') return state.inbox.filter((record) => record.status === '削除候補');
    return state.inbox;
  }

  function recordAge(record) {
    if (!record?.createdAt) return '';
    const created = new Date(record.createdAt).getTime();
    if (!Number.isFinite(created)) return '';
    const minutes = Math.max(0, Math.round((Date.now() - created) / 60000));
    if (minutes < 60) return `${minutes}分前`;
    const hours = Math.round(minutes / 60);
    if (hours < 48) return `${hours}時間前`;
    return `${Math.round(hours / 24)}日前`;
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
      case 'projectManage': renderProjectManage(); break;
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
      case 'recordDetail': renderRecordDetail(); break;
      case 'memories': renderMemories(); break;
      case 'improvements': renderImprovements(); break;
      case 'inbox': renderInbox(); break;
      case 'releaseAudit': renderReleaseAudit(); break;
      case 'dataGuard': renderDataGuard(); break;
      case 'externalConnect': renderExternalConnect(); break;
      default: renderHome(); break;
    }
  }

  app.addEventListener('change', (event) => {
    const input = event.target.closest('input[type=\"file\"][data-media-kind]');
    if (input) handlePickedFile(input);
  });

  app.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;

    if (action === 'flowJump') {
      const target = screenFromFlow(button.dataset.key);
      setScreen(target.screen, target.tab);
      return;
    }

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



    if (action === 'setActiveOnly') {
      if (projectById(button.dataset.projectId)) state.activeProjectId = button.dataset.projectId;
      saveState();
      renderProjectManage();
      showToast('主役の流れを切り替えました');
      return;
    }

    if (action === 'createCampPlan') {
      const project = createCampProjectFromPrompts({ status: '次の予定', label: '次のキャンプ' });
      if (!project) return;
      state.projects.unshift(project);
      state.activeProjectId = project.id;
      syncProjectCalendar(state, project);
      state.calendarMonth = project.startDate.slice(0, 7);
      state.selectedDate = project.startDate;
      state.screen = 'plan';
      state.activeTab = '予定';
      saveState();
      render();
      showToast('キャンプ予定を追加しました');
      return;
    }

    if (action === 'createCampFromDate') {
      const date = button.dataset.date || state.selectedDate || todayISO();
      const project = createCampProjectFromPrompts({ startDate: date, endDate: date, status: '次の予定', label: '次のキャンプ' });
      if (!project) return;
      state.projects.unshift(project);
      state.activeProjectId = project.id;
      syncProjectCalendar(state, project);
      state.calendarMonth = project.startDate.slice(0, 7);
      state.selectedDate = project.startDate;
      state.screen = 'plan';
      state.activeTab = '予定';
      saveState();
      render();
      showToast('選択日から予定を作りました');
      return;
    }

    if (action === 'createPastCamp') {
      const project = createCampProjectFromPrompts({ startDate: state.selectedDate || todayISO(), endDate: state.selectedDate || todayISO(), status: '過去キャンプ', label: '過去キャンプ', memo: '過去キャンプとして登録しました。思い出と次回改善へつなげます。' });
      if (!project) return;
      state.projects.push(project);
      state.activeProjectId = project.id;
      syncProjectCalendar(state, project);
      state.calendarMonth = project.startDate.slice(0, 7);
      state.selectedDate = project.startDate;
      state.screen = 'plan';
      state.activeTab = '予定';
      saveState();
      render();
      showToast('過去キャンプを登録しました');
      return;
    }

    if (action === 'createBasicProject') {
      const answer = window.prompt('種類を番号で選ぶ\n1. 自宅散歩\n2. キャンプ場散歩\n3. 探す\n4. 外出', '1');
      if (answer === null) return;
      const types = { '1': 'walk', '2': 'campWalk', '3': 'search', '4': 'outing' };
      const type = types[answer] || 'walk';
      const title = promptText('タイトル', projectTypeName(type));
      if (title === null || !title) return;
      const place = promptText('場所', type === 'walk' ? '自宅周辺' : '場所はあとで決める');
      if (place === null) return;
      const startDate = promptText('日付 空欄可', state.selectedDate || '');
      if (startDate === null) return;
      if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
        showToast('日付は 2026-06-26 の形で入力してください');
        return;
      }
      const project = {
        id: makeId(type),
        type,
        title,
        label: projectTypeName(type),
        status: type === 'search' ? '候補集め' : 'いつでも',
        startDate,
        endDate: startDate,
        place: place || '',
        party: type === 'walk' || type === 'campWalk' ? 'コタ' : '夫婦＋コタ',
        parentProjectId: type === 'campWalk' ? campProject().id : '',
        memo: '実データとして追加した流れです。'
      };
      state.projects.push(project);
      state.activeProjectId = project.id;
      if (startDate) state.calendarItems.push({ id: `cal-${project.id}-start`, projectId: project.id, date: startDate, label: projectLabel(project), kind: type });
      state.screen = projectDefaultScreen(project);
      state.activeTab = projectDefaultTab(project);
      saveState();
      render();
      showToast('流れを追加しました');
      return;
    }

    if (action === 'editProject') {
      const project = projectById(button.dataset.projectId) || activeProject();
      if (!project) return;
      if (!editProjectByPrompt(project)) return;
      if (project.startDate) {
        state.calendarMonth = project.startDate.slice(0, 7);
        state.selectedDate = project.startDate;
      }
      saveState();
      render();
      showToast('流れを更新しました');
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
      if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
        showToast('日付は 2026-06-26 の形で入力してください');
        return;
      }
      project.startDate = start;
      project.endDate = end;
      syncProjectCalendar(state, project);
      state.calendarMonth = start.slice(0, 7);
      state.selectedDate = start;
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


    if (action === 'pickMedia') {
      const kind = button.dataset.kind;
      const inputId = kind === 'video' ? 'videoInput' : kind === 'camera' ? 'cameraInput' : 'photoInput';
      document.getElementById(inputId)?.click();
      return;
    }

    if (action === 'startVoice') {
      startVoiceMemo(button.dataset.projectId || state.activeProjectId);
      return;
    }

    if (action === 'stopVoice') {
      stopVoiceMemo();
      return;
    }

    if (action === 'getGPS') {
      getCurrentGPS(button.dataset.projectId || state.activeProjectId);
      return;
    }

    if (action === 'openRecordDetail') {
      state.recordDetailId = button.dataset.id || '';
      state.screen = 'recordDetail';
      state.activeTab = '思い出';
      saveState();
      renderRecordDetail();
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

    if (action === 'setInboxFilter') {
      state.inboxFilter = button.dataset.filter || 'all';
      saveState();
      renderInbox();
      return;
    }

    if (action === 'setRecordTarget') {
      const record = state.inbox.find((entry) => entry.id === button.dataset.id);
      const project = projectById(button.dataset.projectId);
      if (!record || !project) return;
      record.projectId = project.id;
      record.target = projectLabel(project);
      record.updatedAt = new Date().toISOString();
      record.candidateHistory = Array.isArray(record.candidateHistory) ? record.candidateHistory : [];
      record.candidateHistory.push({ projectId: project.id, label: projectLabel(project), at: record.updatedAt });
      saveState();
      renderInbox();
      showToast('保存先候補を変更しました');
      return;
    }

    if (action === 'editRecord') {
      const record = state.inbox.find((entry) => entry.id === button.dataset.id);
      if (!record) return;
      const target = promptText('保存先の中身メモ', record.target);
      if (target === null) return;
      const text = promptText('記録内容', record.text);
      if (text === null) return;
      const date = promptText('記録日', record.date || todayISO());
      if (date === null) return;
      record.target = target || record.target;
      record.text = text || record.text;
      record.date = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : record.date;
      record.updatedAt = new Date().toISOString();
      saveState();
      renderInbox();
      showToast('記録を修正しました');
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
      record.updatedAt = new Date().toISOString();
      record.candidateHistory = Array.isArray(record.candidateHistory) ? record.candidateHistory : [];
      record.candidateHistory.push({ projectId: project.id, label: projectLabel(project), at: record.updatedAt });
      saveState();
      renderInbox();
      showToast('保存先候補を変更しました');
      return;
    }

    if (action === 'deleteCandidate') {
      const record = state.inbox.find((entry) => entry.id === button.dataset.id);
      if (record) {
        record.status = '削除候補';
        record.deleteCandidateAt = new Date().toISOString();
        saveState();
        renderInbox();
        showToast('削除候補にしました。まだ戻せます');
      }
      return;
    }

    if (action === 'permanentDeleteRecord') {
      const index = state.inbox.findIndex((entry) => entry.id === button.dataset.id);
      const record = state.inbox[index];
      if (!record) return;
      const ok = window.confirm('この記録を完全に削除します。削除候補から戻せなくなります。よろしいですか？');
      if (!ok) return;
      state.inbox.splice(index, 1);
      state.deletedRecords.unshift({ ...record, status: '復旧控え', deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      saveState();
      renderInbox();
      showToast('完全に削除しました');
      return;
    }

    if (action === 'restoreRecord') {
      const record = state.inbox.find((entry) => entry.id === button.dataset.id);
      if (record) {
        record.status = '未確認';
        record.deleteCandidateAt = '';
        record.updatedAt = new Date().toISOString();
        saveState();
        renderInbox();
        showToast('未確認箱に戻しました');
      }
      return;
    }

    if (action === 'restoreDeletedRecord') {
      const index = state.deletedRecords.findIndex((entry) => entry.id === button.dataset.id);
      const record = state.deletedRecords[index];
      if (!record) return;
      state.deletedRecords.splice(index, 1);
      record.status = '未確認';
      record.deleteCandidateAt = '';
      record.updatedAt = new Date().toISOString();
      record.candidateHistory = Array.isArray(record.candidateHistory) ? record.candidateHistory : [{ projectId: record.projectId, label: record.target || projectLabel(projectById(record.projectId)), at: record.updatedAt }];
      state.inbox.unshift(record);
      saveState();
      renderInbox();
      showToast('復旧控えから未確認箱へ戻しました');
      return;
    }

    if (action === 'repairNow') {
      repairLinkedData(state);
      saveState();
      render();
      showToast('紐づけを補正しました');
      return;
    }

    if (action === 'copyAuditSummary') {
      const text = finalAuditSummaryText();
      navigator.clipboard?.writeText(text).then(() => showToast('総合確認をコピーしました')).catch(() => {
        window.prompt('OUTBASE総合確認', text);
        showToast('総合確認を表示しました');
      });
      return;
    }


    if (action === 'importBackup') {
      const text = window.prompt('OUTBASEの控えを貼り付け', '');
      if (text === null || !text.trim()) return;
      const ok = window.confirm('今の状態を一時控えに残して、貼り付けた控えを読み込みます。よろしいですか？');
      if (!ok) return;
      if (restoreFromBackupText(text.trim())) renderDataGuard();
      return;
    }

    if (action === 'copyPreImportBackup') {
      const text = readPreImportBackup();
      if (!text) {
        showToast('読み込み前の一時控えはまだありません');
        return;
      }
      navigator.clipboard?.writeText(text).then(() => showToast('一時控えをコピーしました')).catch(() => {
        window.prompt('読み込み前の一時控え', text);
        showToast('一時控えを表示しました');
      });
      return;
    }

    if (action === 'copyBackup') {
      const text = backupText();
      navigator.clipboard?.writeText(text).then(() => showToast('OUTBASEの控えをコピーしました')).catch(() => {
        window.prompt('OUTBASEの控え', text);
        showToast('控えを表示しました');
      });
      return;
    }

    if (action === 'refreshApp') {
      const reload = () => window.location.reload();
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => Promise.all(registrations.map((registration) => registration.update()))).finally(reload);
      } else {
        reload();
      }
      return;
    }

    if (action === 'addImprovement') {
      state.improvements.unshift({ id: makeId('imp'), projectId: button.dataset.projectId || state.activeProjectId, text: button.dataset.text || '次回改善', target: button.dataset.target || '次の準備', date: todayISO(), done: false, reflectionLog: [] });
      saveState();
      showToast('次回改善に追加しました');
      return;
    }

    if (action === 'improveFromMemory') {
      const record = state.memories.find((entry) => entry.id === button.dataset.id);
      if (record) {
        state.improvements.unshift({ id: makeId('imp'), projectId: record.projectId, text: `${record.target}：${record.text}`, target: improvementTargetForMemory(record), date: record.date || todayISO(), done: false, sourceRecordId: record.id, reflectionLog: [] });
        saveState();
        showToast('次回改善に送りました');
      }
      return;
    }

    if (action === 'reflectImprovement') {
      const item = state.improvements.find((entry) => entry.id === button.dataset.id);
      if (!item) return;
      if (item.done) {
        item.done = false;
        item.updatedAt = new Date().toISOString();
        ensureReflectionLog(item, '反映済みを解除しました。追加した確認項目は残します');
        saveState();
        renderImprovements();
        showToast('反映済みを解除しました');
        return;
      }
      item.done = true;
      item.reflectedAt = new Date().toISOString();
      applyImprovementToProject(item);
      saveState();
      renderImprovements();
      showToast('次の準備へ反映しました');
      return;
    }

    if (action === 'setImprovementTarget') {
      const item = state.improvements.find((entry) => entry.id === button.dataset.id);
      if (!item) return;
      item.target = button.dataset.target || '次の準備';
      item.updatedAt = new Date().toISOString();
      saveState();
      renderImprovements();
      showToast('反映先を変更しました');
      return;
    }

    if (action === 'editImprovement') {
      const item = state.improvements.find((entry) => entry.id === button.dataset.id);
      if (!item) return;
      const text = promptText('改善内容', item.text);
      if (text === null) return;
      const target = promptText('反映先', item.target || '次の準備');
      if (target === null) return;
      item.text = text || item.text;
      item.target = target || item.target || '次の準備';
      item.updatedAt = new Date().toISOString();
      saveState();
      renderImprovements();
      showToast('改善を修正しました');
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
