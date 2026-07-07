
(() => {
  'use strict';

  const APP_VERSION = 'restart-42-mvp-line-lock';
  const STORAGE_KEY = 'outbase_restart_42_state';
  const LEGACY_KEYS = [
    'outbase_restart_35_state',
    'outbase_restart_34_state',
    'outbase_restart_33_state',
    'outbase_restart_32_state'
  ];
  const app = document.getElementById('app');
  const MAX_EMBED_BYTES = 1500000;
  let mediaDrafts = [];
  let recorder = null;
  let voiceChunks = [];
  let recognition = null;

  const defaultProjects = [
    {
      id: 'camp-akagi',
      type: 'camp',
      title: 'スノーピーク赤城山キャンプフィールド',
      label: '次のキャンプ',
      status: '準備中',
      startDate: '2026-06-26',
      endDate: '2026-06-27',
      place: 'スノーピーク赤城山キャンプフィールド',
      party: '夫婦＋コタ',
      memo: 'ホーム→記録→未確認箱→思い出→改善→次回準備へつなぐ主役プラン。',
      prep: [
        { id: 'shopping', group: '買い物', name: '買い物リスト確認', note: '料理と調味料から候補を確認', done: false },
        { id: 'cooking', group: '料理', name: '料理メニュー確認', note: '量が多すぎないか確認', done: false },
        { id: 'gear', group: 'ギア', name: 'ギア積込み確認', note: '幕・寝具・灯り・電源', done: false },
        { id: 'kota', group: 'コタ', name: 'コタ用品確認', note: 'フード・水・暑さ寒さ・カート', done: false },
        { id: 'weather', group: '天気', name: '天気・風確認', note: '設営・撤収・コタ対策', done: false },
        { id: 'route', group: 'ルート', name: 'ルート・買い出し確認', note: '出発、経由地、帰路', done: false }
      ],
      prepNotes: []
    },
    {
      id: 'walk-kota',
      type: 'walk',
      title: 'コタ散歩',
      label: '散歩',
      status: 'いつでも',
      startDate: '',
      endDate: '',
      place: '自宅周辺',
      party: 'コタ',
      memo: '散歩中に写真・声・GPS・時刻を止めずに残す。'
    },
    {
      id: 'campwalk-akagi',
      type: 'campWalk',
      title: '赤城山キャンプ場散歩',
      label: 'キャンプ場散歩',
      status: '滞在中',
      startDate: '2026-06-26',
      endDate: '2026-06-27',
      place: 'スノーピーク赤城山キャンプフィールド',
      party: '夫婦＋コタ',
      memo: 'サイト、炊事場、トイレ、景色、注意点をキャンプ場知識として残す。'
    },
    {
      id: 'search-next',
      type: 'search',
      title: '次に行きたいキャンプ場探し',
      label: '探す',
      status: '候補集め',
      startDate: '',
      endDate: '',
      place: '未定',
      party: '夫婦＋コタ',
      memo: '犬可、温水、景色、距離、季節を候補化する。'
    }
  ];

  const defaultState = {
    version: APP_VERSION,
    screen: 'home',
    activeProjectId: 'camp-akagi',
    projects: defaultProjects,
    inbox: [],
    memories: [],
    improvements: [],
    deleted: [],
    toast: '',
    savedAt: ''
  };

  let state = loadState();

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function loadState() {
    try {
      const current = localStorage.getItem(STORAGE_KEY);
      if (current) return normalize({ ...clone(defaultState), ...JSON.parse(current), version: APP_VERSION });
      for (const key of LEGACY_KEYS) {
        const raw = localStorage.getItem(key);
        if (raw) return normalize(migrateLegacy(JSON.parse(raw)));
      }
    } catch (error) {
      console.warn(error);
    }
    return normalize(clone(defaultState));
  }

  function migrateLegacy(old) {
    const next = clone(defaultState);
    if (Array.isArray(old.projects) && old.projects.length) next.projects = old.projects.map((project) => ({
      id: project.id || makeId('project'),
      type: project.type || 'camp',
      title: project.title || project.place || project.label || 'プラン',
      label: project.label || project.title || 'プラン',
      status: project.status || '進行中',
      startDate: project.startDate || '',
      endDate: project.endDate || project.startDate || '',
      place: project.place || project.title || '',
      party: project.party || '',
      memo: project.memo || '',
      prep: normalizePrep(project),
      prepNotes: Array.isArray(project.planNotes) ? project.planNotes : []
    }));
    next.activeProjectId = old.activeProjectId || next.projects[0]?.id || 'camp-akagi';
    next.inbox = Array.isArray(old.inbox) ? old.inbox.map(migrateRecord) : [];
    next.memories = Array.isArray(old.memories) ? old.memories.map(migrateRecord) : [];
    next.improvements = Array.isArray(old.improvements) ? old.improvements.map(migrateImprovement) : [];
    next.screen = 'home';
    return next;
  }

  function normalizePrep(project) {
    const source = Array.isArray(project.prep) ? project.prep : [];
    if (!source.length && Array.isArray(project.shopping)) {
      return [
        { id: 'shopping', group: '買い物', name: '買い物リスト確認', note: `${project.shopping.length}件`, done: false },
        { id: 'cooking', group: '料理', name: '料理メニュー確認', note: `${(project.meals || []).length}件`, done: false },
        { id: 'gear', group: 'ギア', name: 'ギア確認', note: `${(project.gear || []).length}件`, done: false },
        { id: 'kota', group: 'コタ', name: 'コタ用品確認', note: `${(project.kota || []).length}件`, done: false },
        { id: 'weather', group: '天気', name: '天気確認', note: project.weather || '確認', done: false },
        { id: 'route', group: 'ルート', name: 'ルート確認', note: project.route || '確認', done: false }
      ];
    }
    return source.map((item) => ({
      id: item.id || makeId('prep'),
      group: item.group || item.key || '準備',
      name: item.name || item.key || '準備項目',
      note: item.note || '',
      done: Boolean(item.done || item.status === '確認済み' || item.state === '買った')
    }));
  }

  function migrateRecord(record) {
    return {
      id: record.id || makeId('record'),
      projectId: record.projectId || state?.activeProjectId || 'camp-akagi',
      type: record.type || record.recordType || 'メモ',
      target: record.target || record.title || '未分類',
      text: record.text || record.memo || record.note || record.title || '',
      date: record.date || todayISO(),
      time: record.time || timeLabel(record.createdAt),
      createdAt: record.createdAt || new Date().toISOString(),
      status: record.status || '未確認',
      media: Array.isArray(record.media) ? record.media : [],
      candidate: record.candidate || ''
    };
  }

  function migrateImprovement(item) {
    return {
      id: item.id || makeId('improve'),
      projectId: item.projectId || 'camp-akagi',
      text: item.text || item.note || '改善メモ',
      target: item.target || '次回準備',
      done: Boolean(item.done),
      createdAt: item.createdAt || new Date().toISOString(),
      reflectedAt: item.reflectedAt || ''
    };
  }

  function normalize(target) {
    target.projects = Array.isArray(target.projects) && target.projects.length ? target.projects : clone(defaultProjects);
    target.projects = target.projects.map((project) => ({
      ...project,
      id: project.id || makeId('project'),
      type: project.type || 'outing',
      title: project.title || project.place || project.label || 'プラン',
      label: project.label || project.title || 'プラン',
      status: project.status || '進行中',
      prep: Array.isArray(project.prep) ? project.prep : normalizePrep(project),
      prepNotes: Array.isArray(project.prepNotes) ? project.prepNotes : []
    }));
    if (!target.projects.some((p) => p.id === target.activeProjectId)) target.activeProjectId = target.projects[0].id;
    target.inbox = Array.isArray(target.inbox) ? target.inbox.map(migrateRecord) : [];
    target.memories = Array.isArray(target.memories) ? target.memories.map(migrateRecord) : [];
    target.improvements = Array.isArray(target.improvements) ? target.improvements.map(migrateImprovement) : [];
    target.deleted = Array.isArray(target.deleted) ? target.deleted : [];
    target.version = APP_VERSION;
    return target;
  }

  function saveState() {
    try {
      state.savedAt = new Date().toISOString();
      state.version = APP_VERSION;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, toast: '' }));
    } catch (error) {
      showToast('保存容量が足りない可能性があります');
    }
  }

  function makeId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function timeLabel(value) {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  }

  function dateLabel(project) {
    if (!project?.startDate) return '日付未定';
    if (project.endDate && project.endDate !== project.startDate) return `${project.startDate}〜${project.endDate}`;
    return project.startDate;
  }

  function typeLabel(type) {
    return {
      camp: 'キャンプ',
      walk: '散歩',
      campWalk: 'キャンプ場散歩',
      search: '探す',
      drive: 'ドライブ',
      picnic: 'ピクニック',
      event: 'イベント',
      outing: '外出'
    }[type] || '活動';
  }

  function activeProject() {
    return state.projects.find((project) => project.id === state.activeProjectId) || state.projects[0];
  }

  function projectById(id) {
    return state.projects.find((project) => project.id === id) || null;
  }

  function projectRecords(projectId) {
    return [...state.inbox, ...state.memories].filter((record) => record.projectId === projectId);
  }

  function prepPercent(project) {
    const list = project?.prep || [];
    if (!list.length) return 0;
    return Math.round((list.filter((item) => item.done).length / list.length) * 100);
  }

  function showToast(message) {
    state.toast = message;
    render();
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
      state.toast = '';
      render();
    }, 1700);
  }

  function setScreen(screen) {
    state.screen = screen;
    saveState();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setActiveProject(projectId, screen = null) {
    if (projectById(projectId)) state.activeProjectId = projectId;
    if (screen) state.screen = screen;
    saveState();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function pageTitle() {
    return {
      home: 'ホーム',
      prep: '次回準備',
      record: '記録',
      inbox: '未確認箱',
      memories: '思い出',
      improvements: '改善',
      settings: '設定'
    }[state.screen] || 'OUTBASE';
  }

  function layout(content, options = {}) {
    const isHome = state.screen === 'home';
    return `
      <header class="topbar">
        <button class="brand" data-action="go" data-screen="home" aria-label="ホーム">
          <div class="logo">OB</div>
          <div>
            <div class="brand-title">OUTBASE</div>
            <div class="brand-sub">${escapeHtml(options.subtitle || 'MVP一本線整理LOCK')}</div>
          </div>
        </button>
        <button class="header-pill" data-action="go" data-screen="inbox">${state.inbox.length}件 未確認</button>
      </header>
      ${!isHome ? targetChip() : ''}
      ${content}
      ${bottomNav()}
      ${sheetMarkup()}
      ${state.toast ? `<div class="toast">${escapeHtml(state.toast)}</div>` : ''}
    `;
  }

  function targetChip() {
    const p = activeProject();
    const label = state.screen === 'record' ? '保存先' : '対象';
    return `
      <button class="target-chip" data-action="openProjectSheet">
        <span class="target-label">${label}</span>
        <span class="target-text">
          <strong>${escapeHtml(p.label || p.title)}</strong>
          <small>${escapeHtml(typeLabel(p.type))} / ${escapeHtml(dateLabel(p))}</small>
        </span>
        <span class="target-change">変更</span>
      </button>
    `;
  }

  function bottomNav() {
    const navs = [
      { screen: 'home', icon: '⌂', label: 'ホーム' },
      { screen: 'prep', icon: '□', label: '準備' },
      { screen: 'record', icon: '＋', label: '記録' },
      { screen: 'inbox', icon: '◇', label: '未確認' },
      { screen: 'memories', icon: '◯', label: '思い出' }
    ];
    return `
      <nav class="bottom-nav" aria-label="OUTBASE下ナビ">
        ${navs.map((nav) => `
          <button class="nav-btn ${state.screen === nav.screen ? 'active' : ''}" data-action="go" data-screen="${nav.screen}">
            <span class="nav-icon">${nav.icon}</span>
            <span>${nav.label}</span>
          </button>
        `).join('')}
      </nav>
    `;
  }

  function sheetMarkup() {
    const p = activeProject();
    return `
      <div class="sheet-backdrop" data-sheet-backdrop data-action="closeSheet"></div>
      <section class="sheet" data-project-sheet aria-label="プラン変更">
        <div class="sheet-head">
          <div>
            <div class="eyebrow">PLAN TARGET</div>
            <h2>対象を変える</h2>
          </div>
          <button class="btn ghost" data-action="closeSheet">閉じる</button>
        </div>
        <div class="sheet-list">
          ${state.projects.map((project) => `
            <button class="plan-option ${project.id === p.id ? 'active' : ''}" data-action="selectProject" data-project-id="${escapeHtml(project.id)}">
              <span>
                <strong>${escapeHtml(project.label || project.title)}</strong><br>
                <small>${escapeHtml(typeLabel(project.type))} / ${escapeHtml(project.title)} / ${escapeHtml(dateLabel(project))}</small>
              </span>
              <b>${project.id === p.id ? '現在' : '選択'}</b>
            </button>
          `).join('')}
        </div>
        <button class="btn primary full" data-action="addProject">日付だけ予定を追加</button>
      </section>
    `;
  }

  function flowStrip(active = 'home') {
    const steps = [
      ['home', 'ホーム'],
      ['record', '記録'],
      ['inbox', '未確認'],
      ['memories', '思い出'],
      ['prep', '次回準備']
    ];
    return `<div class="flow-strip">${steps.map(([key, label]) => `<button class="flow-step ${key === active ? 'active' : ''}" data-action="go" data-screen="${key}">${label}</button>`).join('')}</div>`;
  }

  function renderHome() {
    const p = activeProject();
    const percent = prepPercent(p);
    const activeRecords = projectRecords(p.id).length;
    const openImprovements = state.improvements.filter((item) => !item.done).length;
    const body = `
      <main class="page home-page">
        <section class="home-hero">
          <div class="kicker">RESTART-42 / MVP一本線</div>
          <h1>今日は何を残す？</h1>
          <p class="lead">考えずに記録して、未確認箱で片付けて、改善を次回準備へ戻します。</p>
          ${flowStrip('home')}
        </section>

        <section class="plan-carousel">
          <div class="section-title">
            <div><small>PLAN</small><strong>今どの予定？</strong></div>
            <button class="btn ghost" data-action="openProjectSheet">切替</button>
          </div>
          <div class="plan-track">
            ${state.projects.map((project) => planSlide(project)).join('')}
          </div>
        </section>

        <section class="dashboard-grid">
          <button class="metric" data-action="go" data-screen="record"><small>すぐ記録</small><strong>3秒</strong></button>
          <button class="metric" data-action="go" data-screen="inbox"><small>未確認</small><strong>${state.inbox.length}</strong></button>
          <button class="metric" data-action="go" data-screen="prep"><small>準備</small><strong>${percent}%</strong></button>
          <button class="metric" data-action="go" data-screen="improvements"><small>改善</small><strong>${openImprovements}</strong></button>
        </section>

        <section class="card">
          <div class="card-head">
            <div><div class="eyebrow">NOW</div><h2>${escapeHtml(p.label || p.title)}</h2></div>
            <span class="tag">${escapeHtml(typeLabel(p.type))}</span>
          </div>
          <p><strong>${escapeHtml(p.title)}</strong><br>${escapeHtml(dateLabel(p))} / ${escapeHtml(p.place || '場所未定')}</p>
          <div class="progress" style="margin:12px 0 10px"><span style="width:${percent}%"></span></div>
          <div class="actions">
            <button class="btn primary" data-action="go" data-screen="record">今これを残す</button>
            <button class="btn ghost" data-action="go" data-screen="prep">次回準備</button>
            <button class="btn ghost" data-action="go" data-screen="inbox">あとで整理 ${state.inbox.length}</button>
          </div>
        </section>

        <section class="card">
          <div class="card-head">
            <div><div class="eyebrow">LINE</div><h2>一本線の状態</h2></div>
          </div>
          <div class="list">
            ${lineStatus('記録', activeRecords, '写真・声・メモを残す', 'record')}
            ${lineStatus('未確認箱', state.inbox.length, '保存先・分類をあとで確認', 'inbox')}
            ${lineStatus('思い出', state.memories.length, '確定した記録', 'memories')}
            ${lineStatus('改善', openImprovements, '次回準備へ戻す', 'improvements')}
          </div>
        </section>
      </main>
    `;
    app.innerHTML = layout(body, { subtitle: 'ホーム→記録→未確認→改善' });
  }

  function planSlide(project) {
    const active = project.id === state.activeProjectId;
    const percent = prepPercent(project);
    return `
      <section class="plan-slide ${active ? 'active' : ''}">
        <button class="brand" data-action="selectProject" data-project-id="${escapeHtml(project.id)}">
          <div style="min-width:0;width:100%">
            <div class="plan-kicker"><span>${active ? '現在の主役' : '横スライド候補'}</span><span>${escapeHtml(typeLabel(project.type))}</span></div>
            <div class="plan-slide-title">${escapeHtml(project.label || project.title)}</div>
            <div class="plan-meta">${escapeHtml(project.title)} / ${escapeHtml(dateLabel(project))}</div>
          </div>
        </button>
        <div class="progress"><span style="width:${percent}%"></span></div>
        ${active ? `<div class="slide-actions">
          <button class="primary" data-action="go" data-screen="record">記録</button>
          <button data-action="go" data-screen="prep">準備</button>
          <button data-action="go" data-screen="inbox">整理</button>
          <button data-action="go" data-screen="improvements">改善</button>
        </div>` : ''}
      </section>
    `;
  }

  function lineStatus(title, count, note, screen) {
    return `
      <button class="item" data-action="go" data-screen="${screen}">
        <div class="item-main">
          <div class="item-title">${escapeHtml(title)}</div>
          <div class="item-sub">${escapeHtml(note)}</div>
        </div>
        <span class="tag">${count}件</span>
      </button>
    `;
  }

  function renderPrep() {
    const p = activeProject();
    const percent = prepPercent(p);
    const list = p.prep || [];
    const body = `
      <main class="page">
        <section class="card">
          <div class="card-head">
            <div><div class="eyebrow">NEXT PREP</div><h2>次回準備へ戻す</h2></div>
            <span class="tag">${percent}%</span>
          </div>
          <p>買い物・料理・ギア・コタ・天気・ルートは、完璧入力ではなく候補として残します。</p>
          <div class="progress" style="margin-top:12px"><span style="width:${percent}%"></span></div>
        </section>

        <section class="card">
          <div class="card-head"><div><div class="eyebrow">CHECK</div><h2>準備チェック</h2></div></div>
          <div class="check-list">
            ${list.map((item) => `
              <div class="check-row ${item.done ? 'done' : ''}">
                <button class="check-box" data-action="togglePrep" data-id="${escapeHtml(item.id)}">${item.done ? '✓' : '□'}</button>
                <div class="item-main">
                  <div class="item-title">${escapeHtml(item.name)}</div>
                  <div class="item-sub">${escapeHtml(item.group || '準備')} / ${escapeHtml(item.note || '')}</div>
                </div>
                <button class="tag light" data-action="recordPrep" data-target="${escapeHtml(item.group || item.name)}">メモ</button>
              </div>
            `).join('')}
          </div>
          <div class="actions" style="margin-top:12px">
            <button class="btn primary" data-action="addPrepCandidate">候補を追加</button>
            <button class="btn ghost" data-action="copyPrep">LINE用コピー</button>
          </div>
        </section>

        <section class="card">
          <div class="card-head"><div><div class="eyebrow">FROM IMPROVE</div><h2>改善から戻ったもの</h2></div></div>
          ${p.prepNotes?.length ? `<div class="list">${p.prepNotes.map((note, index) => `
            <div class="item">
              <div class="item-main"><div class="item-title">改善反映 ${index + 1}</div><div class="item-sub">${escapeHtml(note.text || note)}</div></div>
            </div>
          `).join('')}</div>` : `<div class="empty">思い出や未確認箱から改善を送ると、ここに戻ります。</div>`}
        </section>
      </main>
    `;
    app.innerHTML = layout(body, { subtitle: pageTitle() });
  }

  function renderRecord() {
    const p = activeProject();
    const body = `
      <main class="page">
        <section class="record-panel">
          <div class="kicker">3秒記録</div>
          <h1>今これを残す</h1>
          <p class="lead">分類できなくても止めない。保存先だけ確認して、未確認箱へ逃がします。</p>

          <div class="record-buttons">
            ${quickRecordButton('📷', '写真', '写真')}
            ${quickRecordButton('💩', 'うんち', 'コタ')}
            ${quickRecordButton('💧', '水/トイレ', 'コタ')}
            ${quickRecordButton('🐶', '犬友達', '散歩')}
            ${quickRecordButton('⭐', 'スポット', '場所')}
          </div>

          <div class="form-grid">
            <textarea data-record-text placeholder="声でもメモでもOK。空欄でも保存できます。"></textarea>
            <div class="capture-actions">
              <label class="file-label">写真/動画を選ぶ<input type="file" accept="image/*,video/*" multiple data-media-input></label>
              <button class="btn ghost" data-action="clearMediaDrafts">選択クリア</button>
            </div>
            <div class="voice-row">
              <button class="btn ghost" data-action="startVoice">音声メモ開始</button>
              <button class="btn ghost" data-action="stopVoice">音声メモ停止</button>
            </div>
            <div class="voice-status" data-voice-status></div>
            <button class="btn primary full" data-action="saveFreeRecord">未確認箱へ保存</button>
          </div>
        </section>

        <section class="card">
          <div class="card-head"><div><div class="eyebrow">TARGET</div><h2>保存先</h2></div></div>
          <p><strong>${escapeHtml(p.label || p.title)}</strong><br>${escapeHtml(typeLabel(p.type))} / ${escapeHtml(dateLabel(p))}</p>
          <div class="actions" style="margin-top:12px">
            <button class="btn ghost" data-action="openProjectSheet">保存先を変える</button>
            <button class="btn ghost" data-action="go" data-screen="inbox">未確認箱を見る</button>
          </div>
        </section>
      </main>
    `;
    app.innerHTML = layout(body, { subtitle: '現地3秒記録' });
    bindMediaInput();
  }

  function quickRecordButton(icon, label, target) {
    return `<button data-action="quickRecord" data-type="${escapeHtml(label)}" data-target="${escapeHtml(target)}"><b>${icon}</b><small>${escapeHtml(label)}</small></button>`;
  }

  function renderInbox() {
    const body = `
      <main class="page">
        <section class="card">
          <div class="card-head">
            <div><div class="eyebrow">SAFETY BOX</div><h2>未確認箱</h2></div>
            <span class="tag">${state.inbox.length}件</span>
          </div>
          <p>AIが勝手に確定しない。保存先・分類・改善候補をここで確認します。</p>
        </section>

        ${state.inbox.length ? `<section class="list">${state.inbox.map((record) => recordItem(record, 'inbox')).join('')}</section>` : `<div class="empty">未確認はありません。記録するとここに入ります。</div>`}
      </main>
    `;
    app.innerHTML = layout(body, { subtitle: '未確認を片付ける' });
  }

  function renderMemories() {
    const body = `
      <main class="page">
        <section class="card">
          <div class="card-head">
            <div><div class="eyebrow">MEMORY</div><h2>思い出</h2></div>
            <span class="tag">${state.memories.length}件</span>
          </div>
          <p>確定した記録。ここで終わらせず、気づきは改善へ送ります。</p>
          <div class="actions" style="margin-top:12px">
            <button class="btn ghost" data-action="go" data-screen="improvements">改善を見る</button>
            <button class="btn ghost" data-action="go" data-screen="settings">控え</button>
          </div>
        </section>

        ${state.memories.length ? `<section class="list">${state.memories.map((record) => recordItem(record, 'memory')).join('')}</section>` : `<div class="empty">まだ思い出はありません。未確認箱から確定します。</div>`}
      </main>
    `;
    app.innerHTML = layout(body, { subtitle: '思い出から改善へ' });
  }

  function recordItem(record, mode) {
    const p = projectById(record.projectId);
    return `
      <article class="item">
        <div class="item-main">
          <div class="item-title">${escapeHtml(record.type || '記録')} / ${escapeHtml(record.target || '未分類')}</div>
          <div class="item-sub">${escapeHtml(record.date || '')} ${escapeHtml(record.time || '')} / ${escapeHtml(p?.label || '未確認箱')}</div>
          ${record.text ? `<p style="margin-top:8px">${escapeHtml(record.text)}</p>` : ''}
          ${mediaMarkup(record.media)}
        </div>
        <div class="actions">
          ${mode === 'inbox' ? `
            <button class="btn primary" data-action="confirmRecord" data-id="${escapeHtml(record.id)}">確定</button>
            <button class="btn ghost" data-action="recordToImprove" data-id="${escapeHtml(record.id)}">改善へ</button>
            <button class="btn ghost" data-action="changeRecordProject" data-id="${escapeHtml(record.id)}">保存先</button>
            <button class="btn danger" data-action="deleteRecord" data-id="${escapeHtml(record.id)}">削除</button>
          ` : `
            <button class="btn ghost" data-action="memoryToImprove" data-id="${escapeHtml(record.id)}">改善へ</button>
            <button class="btn ghost" data-action="restoreToInbox" data-id="${escapeHtml(record.id)}">未確認へ</button>
          `}
        </div>
      </article>
    `;
  }

  function mediaMarkup(media = []) {
    if (!media.length) return '';
    return `<div class="item-media">${media.map((item) => {
      if (item.dataUrl && item.kind === 'image') return `<img src="${item.dataUrl}" alt="${escapeHtml(item.name || '画像')}">`;
      if (item.dataUrl && item.kind === 'video') return `<video src="${item.dataUrl}" controls></video>`;
      if (item.dataUrl && item.kind === 'audio') return `<audio src="${item.dataUrl}" controls></audio>`;
      return `<span class="tag light">${escapeHtml(item.name || item.kind || 'メディア')}</span>`;
    }).join('')}</div>`;
  }

  function renderImprovements() {
    const open = state.improvements.filter((item) => !item.done);
    const done = state.improvements.filter((item) => item.done);
    const body = `
      <main class="page">
        <section class="card">
          <div class="card-head">
            <div><div class="eyebrow">IMPROVE</div><h2>次回へ戻す</h2></div>
            <span class="tag">${open.length}件</span>
          </div>
          <p>思い出で終わらせない。買い物・料理・ギア・コタ・天気・ルートへ戻します。</p>
          <div class="actions" style="margin-top:12px">
            <button class="btn primary" data-action="addImprovement">改善を追加</button>
            <button class="btn ghost" data-action="go" data-screen="prep">次回準備へ</button>
          </div>
        </section>

        <section class="card">
          <div class="card-head"><div><div class="eyebrow">OPEN</div><h2>未反映</h2></div></div>
          ${open.length ? `<div class="list">${open.map(improvementItem).join('')}</div>` : `<div class="empty">未反映の改善はありません。</div>`}
        </section>

        <section class="card">
          <div class="card-head"><div><div class="eyebrow">DONE</div><h2>反映済み</h2></div></div>
          ${done.length ? `<div class="list">${done.map(improvementItem).join('')}</div>` : `<div class="empty">反映済みはまだありません。</div>`}
        </section>
      </main>
    `;
    app.innerHTML = layout(body, { subtitle: '改善を次回準備へ' });
  }

  function improvementItem(item) {
    const p = projectById(item.projectId) || activeProject();
    return `
      <article class="item">
        <div class="item-main">
          <div class="item-title">${escapeHtml(item.target || '次回準備')}</div>
          <div class="item-sub">${escapeHtml(p.label || p.title)} / ${item.done ? '反映済み' : '未反映'}</div>
          <p style="margin-top:8px">${escapeHtml(item.text)}</p>
        </div>
        <div class="actions">
          ${item.done ? `<button class="btn ghost" data-action="reopenImprove" data-id="${escapeHtml(item.id)}">戻す</button>` : `<button class="btn primary" data-action="reflectImprove" data-id="${escapeHtml(item.id)}">準備へ反映</button>`}
          <button class="btn danger" data-action="deleteImprove" data-id="${escapeHtml(item.id)}">削除</button>
        </div>
      </article>
    `;
  }

  function renderSettings() {
    const backup = backupText();
    const body = `
      <main class="page">
        <section class="card">
          <div class="card-head"><div><div class="eyebrow">DATA GUARD</div><h2>控えと復旧</h2></div></div>
          <p>スマホ更新前後の控え。MVP外の監査や細かい分析はここへ退避。</p>
          <div class="actions" style="margin-top:12px">
            <button class="btn primary" data-action="copyBackup">控えをコピー</button>
            <button class="btn ghost" data-action="importBackup">控えを読み込む</button>
            <button class="btn ghost" data-action="copySummary">状態をコピー</button>
          </div>
        </section>
        <section class="card">
          <div class="card-head"><div><div class="eyebrow">STATUS</div><h2>保存状態</h2></div></div>
          <div class="dashboard-grid">
            <div class="metric"><small>プラン</small><strong>${state.projects.length}</strong></div>
            <div class="metric"><small>未確認</small><strong>${state.inbox.length}</strong></div>
            <div class="metric"><small>思い出</small><strong>${state.memories.length}</strong></div>
            <div class="metric"><small>改善</small><strong>${state.improvements.length}</strong></div>
          </div>
          <p class="note" style="margin-top:12px">控えサイズ：約${Math.ceil(backup.length / 1024)}KB / 最終保存：${escapeHtml(state.savedAt ? new Date(state.savedAt).toLocaleString('ja-JP') : 'これから')}</p>
        </section>
      </main>
    `;
    app.innerHTML = layout(body, { subtitle: '設定・控え' });
  }

  function render() {
    state = normalize(state);
    const screen = state.screen || 'home';
    if (screen === 'prep') return renderPrep();
    if (screen === 'record') return renderRecord();
    if (screen === 'inbox') return renderInbox();
    if (screen === 'memories') return renderMemories();
    if (screen === 'improvements') return renderImprovements();
    if (screen === 'settings') return renderSettings();
    return renderHome();
  }

  function bindMediaInput() {
    const input = document.querySelector('[data-media-input]');
    if (!input) return;
    input.addEventListener('change', async () => {
      const files = Array.from(input.files || []);
      mediaDrafts = [];
      for (const file of files.slice(0, 4)) {
        const kind = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file';
        if (file.size <= MAX_EMBED_BYTES && (kind === 'image' || kind === 'video')) {
          const dataUrl = await fileToDataUrl(file);
          mediaDrafts.push({ kind, name: file.name, type: file.type, size: file.size, dataUrl });
        } else {
          mediaDrafts.push({ kind, name: file.name, type: file.type, size: file.size, note: '大きいファイルのため名前だけ保存' });
        }
      }
      showToast(`${mediaDrafts.length}件選択しました`);
    });
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function startVoice() {
    const status = document.querySelector('[data-voice-status]');
    if (recorder && recorder.state === 'recording') return;
    voiceChunks = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (event) => {
        if (event.data?.size) voiceChunks.push(event.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(voiceChunks, { type: 'audio/webm' });
        const dataUrl = await blobToDataUrl(blob);
        mediaDrafts.push({ kind: 'audio', name: `voice-${Date.now()}.webm`, type: 'audio/webm', size: blob.size, dataUrl });
        stream.getTracks().forEach((track) => track.stop());
        showToast('音声メモを追加しました');
      };
      recorder.start();

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = 'ja-JP';
        recognition.interimResults = true;
        recognition.continuous = true;
        recognition.onresult = (event) => {
          const text = Array.from(event.results).map((r) => r[0]?.transcript || '').join('');
          const area = document.querySelector('[data-record-text]');
          if (area && text) area.value = text;
        };
        recognition.start();
      }
      if (status) status.textContent = '録音中。止めるを押すと未確認箱に添付できます。';
    } catch (error) {
      if (status) status.textContent = '音声が使えません。メモ欄に入力してください。';
      showToast('音声権限を確認してください');
    }
  }

  function stopVoice() {
    try {
      if (recognition) recognition.stop();
      recognition = null;
      if (recorder && recorder.state === 'recording') recorder.stop();
      const status = document.querySelector('[data-voice-status]');
      if (status) status.textContent = '音声停止。保存時に添付します。';
    } catch (error) {
      showToast('音声停止に失敗しました');
    }
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.readAsDataURL(blob);
    });
  }

  function saveRecord({ type = 'メモ', target = '未分類', text = '', media = [] } = {}) {
    const p = activeProject();
    const record = {
      id: makeId('record'),
      projectId: p.id,
      type,
      target,
      text,
      date: todayISO(),
      time: timeLabel(),
      createdAt: new Date().toISOString(),
      status: '未確認',
      media: media.slice(0, 5)
    };
    state.inbox.unshift(record);
    mediaDrafts = [];
    saveState();
    showToast('未確認箱へ保存しました');
    state.screen = 'record';
    render();
  }

  function saveFreeRecord() {
    const text = document.querySelector('[data-record-text]')?.value || '';
    saveRecord({ type: mediaDrafts.length ? '写真/動画/音声' : 'メモ', target: '未分類', text, media: mediaDrafts });
  }

  function findRecordInInbox(id) {
    const index = state.inbox.findIndex((record) => record.id === id);
    return { index, record: index >= 0 ? state.inbox[index] : null };
  }

  function confirmRecord(id) {
    const { index, record } = findRecordInInbox(id);
    if (!record) return;
    record.status = '確定';
    state.inbox.splice(index, 1);
    state.memories.unshift(record);
    saveState();
    showToast('思い出に確定しました');
  }

  function recordToImprovement(record, source = '未確認') {
    state.improvements.unshift({
      id: makeId('improve'),
      projectId: record.projectId || activeProject().id,
      text: record.text || `${record.type || '記録'}からの改善`,
      target: record.target || '次回準備',
      done: false,
      source,
      createdAt: new Date().toISOString(),
      reflectedAt: ''
    });
  }

  function backupText() {
    return JSON.stringify({ ...state, toast: '' }, null, 2);
  }

  async function copyText(text, doneMessage = 'コピーしました') {
    try {
      await navigator.clipboard.writeText(text);
      showToast(doneMessage);
    } catch (error) {
      prompt('コピーしてください', text);
    }
  }

  function stateSummaryText() {
    const p = activeProject();
    return [
      'OUTBASE Restart-42 状態',
      `現在：${p.label || p.title}`,
      `プラン：${state.projects.length}件`,
      `未確認：${state.inbox.length}件`,
      `思い出：${state.memories.length}件`,
      `改善：${state.improvements.filter((item) => !item.done).length}件`,
      '',
      '一本線：ホーム → 記録 → 未確認箱 → 思い出 → 改善 → 次回準備'
    ].join('\n');
  }

  function prepText() {
    const p = activeProject();
    return [
      `OUTBASE 次回準備：${p.label || p.title}`,
      `${p.title} / ${dateLabel(p)}`,
      '',
      ...(p.prep || []).map((item) => `${item.done ? '✓' : '□'} ${item.group || '準備'}：${item.name} - ${item.note || ''}`),
      '',
      ...(p.prepNotes || []).map((note) => `改善：${note.text || note}`)
    ].join('\n');
  }

  function addProject() {
    const title = prompt('予定名', '新しい予定');
    if (!title) return;
    const date = prompt('日付（空欄可）', todayISO()) || '';
    const project = {
      id: makeId('project'),
      type: 'camp',
      title,
      label: title,
      status: '仮予定',
      startDate: date,
      endDate: date,
      place: title,
      party: '夫婦＋コタ',
      memo: '日付だけで作った仮予定',
      prep: clone(defaultProjects[0].prep),
      prepNotes: []
    };
    state.projects.unshift(project);
    setActiveProject(project.id, 'home');
    showToast('予定を追加しました');
  }

  function addPrepCandidate() {
    const group = prompt('分類（買い物/料理/ギア/コタ/天気/ルート）', '買い物');
    if (group === null) return;
    const name = prompt('候補内容', '追加候補');
    if (!name) return;
    const p = activeProject();
    p.prep = Array.isArray(p.prep) ? p.prep : [];
    p.prep.push({ id: makeId('prep'), group: group || '準備', name, note: '追加候補', done: false });
    saveState();
    showToast('準備候補を追加しました');
  }

  function addImprovement(text = null, projectId = null, target = null) {
    const value = text || prompt('改善メモ', '次回に活かすメモ');
    if (!value) return;
    state.improvements.unshift({
      id: makeId('improve'),
      projectId: projectId || activeProject().id,
      text: value,
      target: target || '次回準備',
      done: false,
      createdAt: new Date().toISOString(),
      reflectedAt: ''
    });
    saveState();
    showToast('改善に追加しました');
  }

  function reflectImprove(id) {
    const item = state.improvements.find((entry) => entry.id === id);
    if (!item) return;
    const p = projectById(item.projectId) || activeProject();
    p.prepNotes = Array.isArray(p.prepNotes) ? p.prepNotes : [];
    p.prepNotes.unshift({ text: item.text, target: item.target, at: new Date().toISOString() });
    item.done = true;
    item.reflectedAt = new Date().toISOString();
    state.activeProjectId = p.id;
    state.screen = 'prep';
    saveState();
    showToast('次回準備へ戻しました');
  }

  function importBackup() {
    const text = prompt('OUTBASE控えを貼り付け');
    if (!text) return;
    try {
      const parsed = JSON.parse(text);
      state = normalize({ ...clone(defaultState), ...parsed, version: APP_VERSION, toast: '' });
      saveState();
      showToast('控えを読み込みました');
    } catch (error) {
      showToast('控えを読み込めませんでした');
    }
  }

  function openSheet() {
    document.querySelector('[data-sheet-backdrop]')?.classList.add('show');
    document.querySelector('[data-project-sheet]')?.classList.add('show');
  }

  function closeSheet() {
    document.querySelector('[data-sheet-backdrop]')?.classList.remove('show');
    document.querySelector('[data-project-sheet]')?.classList.remove('show');
  }

  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;

    if (action === 'go') return setScreen(target.dataset.screen || 'home');
    if (action === 'openProjectSheet') return openSheet();
    if (action === 'closeSheet') return closeSheet();
    if (action === 'selectProject') {
      closeSheet();
      return setActiveProject(target.dataset.projectId);
    }
    if (action === 'addProject') return addProject();

    if (action === 'quickRecord') {
      return saveRecord({ type: target.dataset.type || 'メモ', target: target.dataset.target || '未分類', text: target.dataset.type || '', media: mediaDrafts });
    }
    if (action === 'saveFreeRecord') return saveFreeRecord();
    if (action === 'clearMediaDrafts') {
      mediaDrafts = [];
      const input = document.querySelector('[data-media-input]');
      if (input) input.value = '';
      return showToast('選択をクリアしました');
    }
    if (action === 'startVoice') return startVoice();
    if (action === 'stopVoice') return stopVoice();

    if (action === 'confirmRecord') return confirmRecord(target.dataset.id);
    if (action === 'deleteRecord') {
      const { index, record } = findRecordInInbox(target.dataset.id);
      if (!record) return;
      state.deleted.unshift(record);
      state.inbox.splice(index, 1);
      saveState();
      return showToast('削除控えへ移動しました');
    }
    if (action === 'recordToImprove') {
      const { record } = findRecordInInbox(target.dataset.id);
      if (!record) return;
      recordToImprovement(record, '未確認');
      saveState();
      return showToast('改善へ送りました');
    }
    if (action === 'changeRecordProject') {
      const { record } = findRecordInInbox(target.dataset.id);
      if (!record) return;
      const names = state.projects.map((p, i) => `${i + 1}: ${p.label || p.title}`).join('\n');
      const selected = Number(prompt(`保存先番号\n${names}`, '1')) - 1;
      const p = state.projects[selected];
      if (p) {
        record.projectId = p.id;
        saveState();
        showToast('保存先を変更しました');
      }
      return;
    }
    if (action === 'memoryToImprove') {
      const record = state.memories.find((entry) => entry.id === target.dataset.id);
      if (!record) return;
      recordToImprovement(record, '思い出');
      saveState();
      return showToast('改善へ送りました');
    }
    if (action === 'restoreToInbox') {
      const index = state.memories.findIndex((entry) => entry.id === target.dataset.id);
      if (index < 0) return;
      const record = state.memories[index];
      record.status = '未確認';
      state.memories.splice(index, 1);
      state.inbox.unshift(record);
      saveState();
      return showToast('未確認箱へ戻しました');
    }

    if (action === 'togglePrep') {
      const p = activeProject();
      const item = (p.prep || []).find((entry) => entry.id === target.dataset.id);
      if (!item) return;
      item.done = !item.done;
      saveState();
      return render();
    }
    if (action === 'recordPrep') {
      state.screen = 'record';
      saveState();
      render();
      const area = document.querySelector('[data-record-text]');
      if (area) area.value = `${target.dataset.target || '準備'}メモ：`;
      return;
    }
    if (action === 'addPrepCandidate') return addPrepCandidate();
    if (action === 'copyPrep') return copyText(prepText(), '準備をコピーしました');

    if (action === 'addImprovement') return addImprovement();
    if (action === 'reflectImprove') return reflectImprove(target.dataset.id);
    if (action === 'reopenImprove') {
      const item = state.improvements.find((entry) => entry.id === target.dataset.id);
      if (item) {
        item.done = false;
        item.reflectedAt = '';
        saveState();
        render();
      }
      return;
    }
    if (action === 'deleteImprove') {
      state.improvements = state.improvements.filter((entry) => entry.id !== target.dataset.id);
      saveState();
      return showToast('改善を削除しました');
    }

    if (action === 'copyBackup') return copyText(backupText(), '控えをコピーしました');
    if (action === 'importBackup') return importBackup();
    if (action === 'copySummary') return copyText(stateSummaryText(), '状態をコピーしました');
  });

  render();
})();
