(() => {
  'use strict';

  const VERSION = 'outbase-remake-audit-20260707';
  const STORAGE_KEY = 'outbase_remake_audit_state_v1';
  const app = document.getElementById('app');
  const mediaInput = document.getElementById('mediaInput');
  const importInput = document.getElementById('importInput');

  const TYPES = {
    camp: 'キャンプ', walk: '散歩', campWalk: 'キャンプ場散歩', outing: '外出', hospital: '病院', payment: '支払い', work: '仕事', event: '行事', memo: 'メモ'
  };
  const GROUPS = {
    shop: '買い物', cook: '料理', gear: 'ギア', kota: 'コタ', weather: '天気', route: 'ルート', setup: '設営撤収', other: 'その他'
  };
  const REC_TYPES = { photo:'写真', video:'動画', voice:'音声メモ', note:'メモ', gps:'位置', poo:'うんち', pee:'おしっこ', dog:'犬友達', spot:'スポット', setup:'設営撤収', import:'取込' };

  const esc = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const uid = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  const today = () => new Date().toISOString().slice(0,10);
  const nowTime = () => new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'});
  const toDate = iso => { if (!iso) return null; const [y,m,d] = iso.split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
  const isoDate = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const addDays = (iso,n) => { const d = toDate(iso) || new Date(); d.setDate(d.getDate()+n); return isoDate(d); };
  const jpDate = iso => iso ? `${Number(iso.slice(5,7))}/${Number(iso.slice(8,10))}` : '日付未設定';
  const weekday = iso => iso ? '日月火水木金土'[toDate(iso).getDay()] : '';
  const compactDate = iso => iso ? `${jpDate(iso)}(${weekday(iso)})` : '日付未設定';
  const clamp = (n,min,max) => Math.max(min, Math.min(max, n));

  const defaultState = () => {
    const t = today();
    const future = addDays(t, 18);
    return {
      version: VERSION,
      activeTab: 'home',
      calendarMonth: t.slice(0,7),
      selectedDate: t,
      currentId: 'camp-next',
      activeSessionId: null,
      filter: 'all',
      experiences: [
        { id:'camp-next', title:'次のキャンプ', type:'camp', level:4, status:'planning', date:'', endDate:'', location:'行き先未設定', people:'夫婦＋コタ', note:'日付と場所を入れると、準備・天気監視・買い物・記録がつながる。', favorite:true, createdAt:t },
        { id:'walk-home', title:'コタと自宅散歩', type:'walk', level:3, status:'ready', date:t, endDate:'', location:'自宅周辺', people:'ムー＋コタ', note:'3秒記録で散歩ログを残す。', favorite:false, createdAt:t }
      ],
      prep: [
        { id:'p1', experienceId:'camp-next', group:'weather', text:'候補日の天気を見張る', done:false, source:'template' },
        { id:'p2', experienceId:'camp-next', group:'route', text:'行き先と買い出しルートを決める', done:false, source:'template' },
        { id:'p3', experienceId:'camp-next', group:'gear', text:'リビング・寝室・コタ用品を確認', done:false, source:'template' },
        { id:'p4', experienceId:'camp-next', group:'cook', text:'夜ごはんと朝ごはんを決める', done:false, source:'template' },
        { id:'p5', experienceId:'camp-next', group:'kota', text:'水・フード・マナー袋・カートを準備', done:false, source:'template' }
      ],
      gear: [
        { id:'g1', name:'リビングシェル', group:'幕', status:'要確認', note:'乾燥・ポール・ペグ' },
        { id:'g2', name:'アメニティドームM', group:'寝室', status:'要確認', note:'寝室候補' },
        { id:'g3', name:'グランドオフトンS ×2', group:'寝具', status:'通常', note:'夫婦分' },
        { id:'g4', name:'EcoFlow DELTA 3 1500', group:'電源', status:'充電確認', note:'WAVE/Glacier用途' },
        { id:'g5', name:'ドッグオフトン・フードボウルL', group:'コタ', status:'必須', note:'犬連れ必須' }
      ],
      meals: [
        { id:'m1', name:'ガーリックシュリンプ', timing:'夜', ingredients:'ブラックタイガー,にんにく,オリーブオイル,バター,レモン', gear:'大きいスキレット', note:'バゲットなしでも成立。量注意。' },
        { id:'m2', name:'手作りピザ', timing:'夜', ingredients:'ピザ生地,チーズ,トマトソース,具材', gear:'焼き台/フライパン', note:'生地は作る。' },
        { id:'m3', name:'ホットサンド', timing:'朝', ingredients:'パン,チーズ,ハム/卵', gear:'ホットサンドメーカー', note:'撤収朝向き。' }
      ],
      places: [
        { id:'pl1', name:'スノーピーク赤城山キャンプフィールド', category:'キャンプ場', area:'群馬県 前橋市', dog:true, weatherWatch:true, score:88, tags:['犬可','標高高め','直営','乾燥サービス'], note:'雨時期の候補。コタ連れ・友人同行にも使いやすい。' },
        { id:'pl2', name:'自宅周辺散歩ルート', category:'散歩', area:'柏市', dog:true, weatherWatch:false, score:76, tags:['短時間','普段使い'], note:'3秒記録のベースルート。' },
        { id:'pl3', name:'次に行きたいキャンプ場候補', category:'候補', area:'未定', dog:true, weatherWatch:true, score:60, tags:['要調査','犬可必須'], note:'検索・スクショ・URLから候補化する。' }
      ],
      records: [],
      reviews: [],
      imports: [],
      settings: { speech:true, location:true, googlePhotosUrl:'', calendarName:'OUTBASE', familyShare:false }
    };
  };

  let state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return migrate({ ...defaultState(), ...parsed });
    } catch (e) {
      return defaultState();
    }
  }

  function migrate(s) {
    s.version = VERSION;
    s.experiences ||= [];
    s.prep ||= [];
    s.gear ||= [];
    s.meals ||= [];
    s.places ||= [];
    s.records ||= [];
    s.reviews ||= [];
    s.imports ||= [];
    s.settings ||= defaultState().settings;
    if (!s.currentId || !s.experiences.some(x => x.id === s.currentId)) s.currentId = s.experiences[0]?.id || null;
    s.activeTab ||= 'home';
    s.selectedDate ||= today();
    s.calendarMonth ||= today().slice(0,7);
    s.filter ||= 'all';
    return s;
  }

  function save() {
    state.version = VERSION;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function currentExperience() {
    return state.experiences.find(e => e.id === state.currentId) || state.experiences[0] || null;
  }

  function experienceById(id) {
    return state.experiences.find(e => e.id === id) || currentExperience();
  }

  function experiencePrep(id = state.currentId) {
    return state.prep.filter(p => p.experienceId === id);
  }

  function experienceRecords(id = state.currentId) {
    return state.records.filter(r => r.experienceId === id);
  }

  function readiness(exp = currentExperience()) {
    if (!exp) return { score:0, done:0, total:0, records:0, checks:0 };
    const list = experiencePrep(exp.id);
    const total = list.length;
    const done = list.filter(p => p.done).length;
    const records = experienceRecords(exp.id).length;
    const checks = pendingChecks(exp.id).length;
    const base = total ? Math.round(done / total * 70) : 8;
    const dateScore = exp.date ? 12 : 0;
    const placeScore = exp.location && !/未設定|未定/.test(exp.location) ? 10 : 0;
    const recordScore = records ? 8 : 0;
    return { score: clamp(base + dateScore + placeScore + recordScore, 0, 100), done, total, records, checks };
  }

  function pendingChecks(expId = state.currentId) {
    return state.records.filter(r => (r.needsCheck || !r.experienceId) && (!expId || r.experienceId === expId));
  }

  function nextExperience() {
    const dated = state.experiences.filter(e => e.date && e.date >= today()).sort((a,b) => a.date.localeCompare(b.date));
    return dated[0] || currentExperience();
  }

  function toast(message) {
    let t = document.querySelector('.toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'toast hide';
      document.body.appendChild(t);
    }
    t.textContent = message;
    t.classList.remove('hide');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => t.classList.add('hide'), 2200);
  }

  function setTab(tab) {
    state.activeTab = tab;
    save();
    render();
  }

  function setCurrent(id) {
    state.currentId = id;
    save();
    render();
  }

  function setFilter(filter) {
    state.filter = filter;
    save();
    render();
  }

  function typeLabel(type) { return TYPES[type] || type || '予定'; }
  function groupLabel(group) { return GROUPS[group] || group || 'その他'; }
  function recLabel(type) { return REC_TYPES[type] || type || '記録'; }

  function chappyHints(exp = currentExperience()) {
    if (!exp) return ['次のキャンプを作ると、準備・記録・思い出がつながる。'];
    const prep = experiencePrep(exp.id);
    const undone = prep.filter(p => !p.done);
    const records = experienceRecords(exp.id);
    const hints = [];
    if (!exp.date) hints.push('まず日付を入れる。天気監視と準備逆算が動く。');
    if (/未設定|未定/.test(exp.location || '')) hints.push('行き先を入れる。場所カード・ルート・天気がつながる。');
    if (undone.some(p => p.group === 'weather')) hints.push('天気は手入力しない。候補地点をWeather Watchに入れて見張る。');
    if (undone.some(p => p.group === 'gear')) hints.push('ギアは一覧から選ぶ。忘れ物対策に回す。');
    if (records.length === 0 && exp.status === 'doing') hints.push('現地では考えずに3秒記録。整理は帰宅後でいい。');
    if (records.length >= 3) hints.push('記録が増えた。レビュー生成で次回改善に送れる。');
    if (!hints.length) hints.push('今日は未完了の準備を1つ終わらせれば十分。');
    return hints.slice(0, 3);
  }

  function render() {
    const exp = currentExperience();
    app.innerHTML = `
      ${renderTop(exp)}
      ${renderPlanChip(exp)}
      ${renderPage()}
      ${renderBottomNav()}
      <div id="modalRoot"></div>
    `;
  }

  function renderTop(exp) {
    return `
      <header class="topbar">
        <button class="brand" data-action="tab" data-tab="home" aria-label="ホームへ">
          <span class="logo">OB</span>
          <span class="brand-copy">
            <span class="brand-title">OUTBASE</span>
            <span class="brand-sub">FIELD NOTE / ${VERSION.replace('outbase-','')}</span>
          </span>
        </button>
        <div class="top-actions">
          <button class="top-btn" data-action="openBackup">控え</button>
          <button class="top-btn dark" data-action="triggerImport">取込</button>
        </div>
      </header>`;
  }

  function renderPlanChip(exp) {
    if (!exp) return '';
    return `
      <div class="plan-chip">
        <span class="label">現在</span>
        <button data-action="openProjectSwitcher">
          <div class="plan-name">${esc(exp.title)}</div>
          <div class="plan-meta">${esc(typeLabel(exp.type))} / ${esc(exp.date ? compactDate(exp.date) : '日付なし')} / ${esc(exp.location || '場所未設定')}</div>
        </button>
        <span class="plan-status">${statusLabel(exp.status)}</span>
      </div>`;
  }

  function statusLabel(status) {
    return { planning:'計画中', ready:'準備中', doing:'実施中', done:'思い出', candidate:'候補' }[status] || status || '計画中';
  }

  function renderPage() {
    const tab = state.activeTab;
    if (tab === 'schedule') return renderSchedule();
    if (tab === 'explore') return renderExplore();
    if (tab === 'prep') return renderPrep();
    if (tab === 'add') return renderAdd();
    if (tab === 'memory') return renderMemory();
    return renderHome();
  }

  function renderBottomNav() {
    const nav = [
      ['schedule','予定'], ['explore','探す'], ['prep','準備'], ['add','＋'], ['memory','思い出']
    ];
    return `<nav class="bottom-nav">${nav.map(([id,label]) => `<button class="nav-btn ${state.activeTab===id?'active':''} ${id==='add'?'nav-plus':''}" data-action="tab" data-tab="${id}">${label}</button>`).join('')}</nav>`;
  }

  function renderHome() {
    const exp = nextExperience();
    if (exp && exp.id !== state.currentId) state.currentId = exp.id;
    const r = readiness(exp);
    const missions = buildMissions(exp);
    return `
      <main class="stack">
        <section class="hero">
          <div class="hero-kicker">OUTBASE / TODAY</div>
          <h1>今日は何する？</h1>
          <p>キャンプ前・現地・帰宅後を、1つの流れで迷わず進める。</p>
          <div class="hero-line">
            <span class="pill dark">次の一手</span>
            <span class="pill gray">3秒記録</span>
            <span class="pill gray">次回改善</span>
          </div>
        </section>
        <section class="card">
          <div class="card-inner">
            <div class="card-head">
              <div>
                <div class="eyebrow">CHAPPY BOARD</div>
                <div class="card-title">${esc(exp?.title || '次の予定を作る')}</div>
                <p class="card-text">${esc(exp?.note || '予定を作ると、準備・記録・思い出が自然につながる。')}</p>
              </div>
              <span class="pill ${exp?.date ? 'dark':'warn'}">${esc(exp?.date ? compactDate(exp.date) : '日付未設定')}</span>
            </div>
            <div class="readiness" style="--score:${r.score}%;">
              <div class="gauge"><span>${r.score}</span></div>
              <div>
                <div class="metric-row grid-3">
                  <div class="metric"><small>準備</small><strong>${r.done}/${r.total}</strong></div>
                  <div class="metric"><small>記録</small><strong>${r.records}</strong></div>
                  <div class="metric"><small>確認</small><strong>${r.checks}</strong></div>
                </div>
                <div class="actions" style="margin-top:12px">
                  <button class="btn primary" data-action="tab" data-tab="prep">準備する</button>
                  <button class="btn" data-action="tab" data-tab="add">3秒記録</button>
                  <button class="btn ghost" data-action="openEvent" data-id="${esc(exp?.id || '')}">開く</button>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section class="card subtle">
          <div class="card-inner">
            <div class="card-head"><div><div class="eyebrow">TODAY'S MOVE</div><div class="card-title">今日の一手</div></div><button class="btn small" data-action="openPrep">追加</button></div>
            <div class="mission-list">${missions.map(renderMission).join('')}</div>
          </div>
        </section>
        <section class="card subtle">
          <div class="card-inner">
            <div class="card-head"><div><div class="eyebrow">CHAPPY</div><div class="card-title">ムー向け提案</div></div><span class="pill gray">提案のみ</span></div>
            <div class="list">${chappyHints(exp).map(h => `<div class="item"><div><div class="item-title">${esc(h)}</div><div class="item-sub">決定はムー。OUTBASEは候補だけ出す。</div></div></div>`).join('')}</div>
          </div>
        </section>
        <section class="card subtle">
          <div class="card-inner">
            <div class="card-head"><div><div class="eyebrow">FIELD MODE</div><div class="card-title">現地で開く理由</div></div><span class="pill dark">3秒</span></div>
            <div class="quick-grid">
              <button class="quick dark" data-action="startSession" data-kind="camp"><strong>キャンプ開始</strong><small>到着から記録</small></button>
              <button class="quick" data-action="startSession" data-kind="walk"><strong>散歩開始</strong><small>コタ・場所・スポット</small></button>
              <button class="quick" data-action="quickRecord" data-type="note"><strong>今メモ</strong><small>分類しないで残す</small></button>
              <button class="quick" data-action="generateReview"><strong>レビュー生成</strong><small>帰宅後に次回へ</small></button>
            </div>
          </div>
        </section>
      </main>`;
  }

  function buildMissions(exp) {
    if (!exp) return [{ title:'次のキャンプを作る', sub:'予定から開始', action:'openEventForm', done:false }];
    const undone = experiencePrep(exp.id).filter(p => !p.done).slice(0, 3).map(p => ({ id:p.id, title:p.text, sub:groupLabel(p.group), done:false, action:'togglePrep' }));
    if (!exp.date) undone.unshift({ title:'日付を決める', sub:'天気監視と逆算の起点', done:false, action:'openEvent' });
    if (!exp.location || /未設定|未定/.test(exp.location)) undone.unshift({ title:'行き先を決める', sub:'場所カードとルートの起点', done:false, action:'tabExplore' });
    if (!undone.length) undone.push({ title:'現地で3秒記録する', sub:'写真・声・位置・メモ', done:false, action:'tabAdd' });
    return undone.slice(0, 4);
  }

  function renderMission(m) {
    const actionAttr = m.action === 'togglePrep' ? `data-action="togglePrep" data-id="${m.id}"` : m.action === 'tabExplore' ? `data-action="tab" data-tab="explore"` : m.action === 'tabAdd' ? `data-action="tab" data-tab="add"` : `data-action="openEvent" data-id="${esc(currentExperience()?.id || '')}"`;
    return `<div class="mission ${m.done?'done':''}"><span class="check-dot">${m.done?'✓':'・'}</span><div><div class="mission-title">${esc(m.title)}</div><div class="mission-sub">${esc(m.sub)}</div></div><button ${actionAttr}>進む</button></div>`;
  }

  function renderSchedule() {
    const [y,m] = state.calendarMonth.split('-').map(Number);
    const first = new Date(y, m - 1, 1);
    const start = new Date(first); start.setDate(1 - first.getDay());
    const days = Array.from({ length: 42 }, (_,i) => { const d = new Date(start); d.setDate(start.getDate()+i); return d; });
    const selectedEvents = state.experiences.filter(e => e.date === state.selectedDate);
    const undated = state.experiences.filter(e => !e.date);
    return `
      <main class="stack">
        <section class="hero">
          <div class="hero-kicker">SCHEDULE</div>
          <h1>予定</h1>
          <p>ジョルテ代替。普通の予定もキャンプも、深さを変えて扱う。</p>
        </section>
        <section class="card calendar-card">
          <div class="card-inner">
            <div class="card-head"><div><div class="eyebrow">FIELD CALENDAR</div><div class="card-title">高機能カレンダー</div></div><button class="btn small primary" data-action="openEventForm">予定追加</button></div>
            <div class="calendar-toolbar"><button class="nav-round" data-action="month" data-dir="-1">‹</button><div class="month-label"><strong>${y}.${String(m).padStart(2,'0')}</strong><small>${compactDate(state.selectedDate)}</small></div><button class="nav-round" data-action="month" data-dir="1">›</button></div>
            <div class="weekdays">${['日','月','火','水','木','金','土'].map(d => `<div>${d}</div>`).join('')}</div>
            <div class="calendar-grid">${days.map(d => renderDay(d, m)).join('')}</div>
            <div class="divider"></div>
            <div class="card-head"><div><div class="eyebrow">${esc(compactDate(state.selectedDate))}</div><div class="card-title">この日の予定</div></div><span class="pill gray">${selectedEvents.length}件</span></div>
            <div class="event-list">${selectedEvents.length ? selectedEvents.map(renderEventCard).join('') : `<div class="empty">この日の予定はまだない。普通の予定もキャンプも追加できる。</div>`}</div>
          </div>
        </section>
        <section class="card subtle">
          <div class="card-inner">
            <div class="card-head"><div><div class="eyebrow">UNSCHEDULED</div><div class="card-title">日付未設定</div></div><span class="pill warn">${undated.length}件</span></div>
            <div class="undated">${undated.length ? undated.map(renderEventCard).join('') : `<div class="empty">日付なし予定はない。</div>`}</div>
          </div>
        </section>
      </main>`;
  }

  function renderDay(d, month) {
    const iso = isoDate(d);
    const list = state.experiences.filter(e => e.date === iso);
    const muted = d.getMonth() !== month - 1;
    const selected = state.selectedDate === iso;
    const labels = list.slice(0,2).map(e => `<span class="day-label">${esc(shortTitle(e.title))}</span>`).join('') + (list.length > 2 ? `<span class="day-label more">他 ${list.length-2}</span>` : '');
    return `<button class="day ${muted?'muted-day':''} ${selected?'selected':''} ${iso===today()?'today':''}" data-action="selectDate" data-date="${iso}"><span class="day-no">${d.getDate()}</span><div class="day-labels">${labels}</div></button>`;
  }

  function shortTitle(t) { return String(t || '').replace('スノーピーク','SP').slice(0, 5); }

  function renderEventCard(e) {
    const r = readiness(e);
    return `<div class="event-card"><div class="event-top"><div><div class="event-title">${esc(e.title)}</div><div class="event-meta">${esc(typeLabel(e.type))} / Lv.${esc(e.level || 1)} / ${esc(statusLabel(e.status))} / ${esc(e.date ? compactDate(e.date) : '日付なし')} / ${esc(e.location || '場所未設定')}</div></div><span class="pill ${e.status==='doing'?'dark':'gray'}">${esc(statusLabel(e.status))}</span></div><div class="event-foot"><button class="btn small primary" data-action="openEvent" data-id="${e.id}">開く</button><button class="btn small" data-action="setCurrent" data-id="${e.id}">主役</button><div class="progress"><span style="width:${r.score}%"></span></div></div></div>`;
  }

  function renderExplore() {
    const tabs = ['all','キャンプ場','散歩','候補','行事'];
    const places = state.places.filter(p => state.filter === 'all' || p.category === state.filter);
    return `
      <main class="stack">
        <section class="hero"><div class="hero-kicker">DISCOVERY</div><h1>探す</h1><p>予定とは分けて、キャンプ場・散歩先・寄り道・イベント候補を育てる。</p></section>
        <div class="tabs">${tabs.map(t => `<button class="tab ${state.filter===t?'active':''}" data-action="filter" data-filter="${t}">${t==='all'?'全部':t}</button>`).join('')}</div>
        <section class="card subtle"><div class="card-inner"><div class="card-head"><div><div class="eyebrow">PLACE CARDS</div><div class="card-title">場所カード</div></div><button class="btn small primary" data-action="openPlaceForm">追加</button></div><div class="list">${places.map(renderPlace).join('') || `<div class="empty">候補はまだない。予約スクショ・URL・メモから増やせる。</div>`}</div></div></section>
        <section class="card"><div class="card-inner"><div class="card-head"><div><div class="eyebrow">WEATHER WATCH</div><div class="card-title">天気から行き先を考える</div></div><span class="pill gray">接続口</span></div><p class="card-text">今はスクショ・URL・手入力候補を保存。外部天気API接続後に、降水・風・標高・犬可条件で自動監視する。</p><div class="actions"><button class="btn" data-action="triggerImport">天気スクショ取込</button><button class="btn" data-action="openPlaceForm">監視地点追加</button></div></div></section>
      </main>`;
  }

  function renderPlace(p) {
    return `<div class="place-card"><div class="event-top"><div><div class="event-title">${esc(p.name)}</div><div class="event-meta">${esc(p.category)} / ${esc(p.area)} / ${p.dog?'犬可':'犬条件未確認'}</div></div><span class="pill ${p.weatherWatch?'dark':'gray'}">${p.weatherWatch?'監視中':'候補'}</span></div><p class="card-text">${esc(p.note)}</p><div class="place-score"><strong>${esc(p.score)}</strong><span class="mini">候補スコア</span>${(p.tags || []).map(t => `<span class="pill gray">${esc(t)}</span>`).join('')}</div><div class="actions"><button class="btn small primary" data-action="makeEventFromPlace" data-id="${p.id}">予定化</button><button class="btn small" data-action="toggleWeather" data-id="${p.id}">${p.weatherWatch?'監視OFF':'天気監視'}</button></div></div>`;
  }

  function renderPrep() {
    const exp = currentExperience();
    const tabs = ['all','shop','cook','gear','kota','weather','route','setup'];
    const prep = experiencePrep(exp?.id).filter(p => state.filter === 'all' || p.group === state.filter);
    const gearRequired = state.gear.slice(0,5);
    return `
      <main class="stack">
        <section class="hero"><div class="hero-kicker">PREP</div><h1>準備</h1><p>${esc(exp?.title || '予定')} の準備。買い物・料理・ギア・コタ・天気・ルートを一画面で進める。</p></section>
        <section class="card"><div class="card-inner"><div class="card-head"><div><div class="eyebrow">READY FLOW</div><div class="card-title">キャンプ前に開く理由</div></div><button class="btn small primary" data-action="openPrep">準備追加</button></div><div class="flow">${renderFlowRows(exp)}</div></div></section>
        <div class="tabs">${tabs.map(t => `<button class="tab ${state.filter===t?'active':''}" data-action="filter" data-filter="${t}">${t==='all'?'全部':groupLabel(t)}</button>`).join('')}</div>
        <section class="card subtle"><div class="card-inner"><div class="card-head"><div><div class="eyebrow">CHECKLIST</div><div class="card-title">準備リスト</div></div><button class="btn small" data-action="buildShopping">買い物統合</button></div><div class="mission-list">${prep.length ? prep.map(p => renderPrepItem(p)).join('') : `<div class="empty">このカテゴリの準備はまだない。</div>`}</div></div></section>
        <section class="card subtle"><div class="card-inner"><div class="card-head"><div><div class="eyebrow">GEAR</div><div class="card-title">ギア管理</div></div><button class="btn small primary" data-action="openGearForm">追加</button></div><div class="list">${gearRequired.map(g => `<div class="item"><div><div class="item-title">${esc(g.name)}</div><div class="item-sub">${esc(g.group)} / ${esc(g.status)} / ${esc(g.note)}</div></div><span class="pill gray">${esc(g.status)}</span></div>`).join('')}</div></div></section>
        <section class="card subtle"><div class="card-inner"><div class="card-head"><div><div class="eyebrow">MEAL</div><div class="card-title">料理・献立・買い物</div></div><button class="btn small primary" data-action="openMealForm">追加</button></div><div class="list">${state.meals.map(m => `<div class="item"><div><div class="item-title">${esc(m.name)}</div><div class="item-sub">${esc(m.timing)} / ${esc(m.ingredients)} / ${esc(m.gear)}</div></div><span class="pill gray">${esc(m.timing)}</span></div>`).join('')}</div></div></section>
      </main>`;
  }

  function renderFlowRows(exp) {
    const rows = [
      ['予定', exp?.date ? compactDate(exp.date) : '日付を決める', !!exp?.date],
      ['行き先', exp?.location || '場所未設定', !!(exp?.location && !/未設定|未定/.test(exp.location))],
      ['天気', '14日前から監視・悪化なら代替候補', experiencePrep(exp?.id).some(p => p.group === 'weather' && p.done)],
      ['買い物', '献立から買い物を統合', experiencePrep(exp?.id).some(p => p.group === 'shop' && p.done)],
      ['ギア', '忘れ物・乾燥・充電を確認', experiencePrep(exp?.id).some(p => p.group === 'gear' && p.done)],
      ['当日', '設営撤収ログに送る', false]
    ];
    return rows.map((r,i) => `<div class="flow-row ${r[2]?'':'pending'}"><span class="flow-no">${i+1}</span><div><div class="flow-title">${esc(r[0])}</div><div class="flow-sub">${esc(r[1])}</div></div><span class="pill ${r[2]?'dark':'gray'}">${r[2]?'OK':'未'}</span></div>`).join('');
  }

  function renderPrepItem(p) {
    return `<div class="mission ${p.done?'done':''}"><button class="check-dot" data-action="togglePrep" data-id="${p.id}">${p.done?'✓':'・'}</button><div><div class="mission-title">${esc(p.text)}</div><div class="mission-sub">${esc(groupLabel(p.group))} / ${esc(p.source || 'manual')}</div></div><button data-action="deletePrep" data-id="${p.id}">削除</button></div>`;
  }

  function renderAdd() {
    const session = state.activeSessionId ? state.records.find(r => r.id === state.activeSessionId) : null;
    return `
      <main class="stack">
        <section class="hero"><div class="hero-kicker">CAPTURE</div><h1>＋</h1><p>入口は1つに決めない。予定・準備・現地・過去・メモから始める。</p></section>
        <section class="card"><div class="card-inner"><div class="kit-grid">
          <button class="kit primary" data-action="openEventForm"><strong>予定</strong><small>普通の予定もキャンプも</small></button>
          <button class="kit" data-action="openPrep"><strong>準備</strong><small>予定なしでも開始</small></button>
          <button class="kit" data-action="startSession" data-kind="camp"><strong>現地記録</strong><small>写真・声・場所・メモ</small></button>
          <button class="kit" data-action="openPastForm"><strong>過去実績</strong><small>後から登録</small></button>
          <button class="kit" data-action="quickRecord" data-type="note"><strong>メモ</strong><small>文脈で仮紐付け</small></button>
          <button class="kit" data-action="triggerImport"><strong>一括取込</strong><small>写真・PDF・Excel・スクショ</small></button>
        </div></div></section>
        ${renderSessionPanel(session)}
      </main>`;
  }

  function renderSessionPanel(session) {
    const active = getActiveSession();
    return `<section class="card"><div class="card-inner">
      <div class="card-head"><div><div class="eyebrow">FIELD RECORD</div><div class="card-title">${active ? '記録中' : '現地3秒記録'}</div><p class="card-text">${active ? `${esc(active.title)} / ${active.startedAt}` : '開始してから、分類せずに残す。整理は後で候補化。'}</p></div>${active ? `<button class="btn small warn" data-action="endSession">終了</button>` : `<span class="pill gray">待機</span>`}</div>
      <div class="quick-grid">
        <button class="quick dark" data-action="media"><strong>写真・動画</strong><small>標準カメラで撮る</small></button>
        <button class="quick" data-action="voice"><strong>声</strong><small>文字起こしメモ</small></button>
        <button class="quick" data-action="quickRecord" data-type="poo"><strong>うんち</strong><small>コタ記録</small></button>
        <button class="quick" data-action="quickRecord" data-type="pee"><strong>おしっこ</strong><small>コタ記録</small></button>
        <button class="quick" data-action="quickRecord" data-type="dog"><strong>犬友達</strong><small>名前・特徴を後で</small></button>
        <button class="quick" data-action="quickRecord" data-type="spot"><strong>スポット</strong><small>場所カード候補</small></button>
        <button class="quick" data-action="gps"><strong>位置</strong><small>GPSを保存</small></button>
        <button class="quick" data-action="openRecordForm"><strong>メモ</strong><small>手入力</small></button>
      </div>
    </div></section>`;
  }

  function renderMemory() {
    const exp = currentExperience();
    const records = state.records.filter(r => state.filter === 'all' || r.type === state.filter || r.experienceId === exp?.id);
    const filters = ['all','photo','voice','note','gps','poo','pee','dog','spot','import'];
    return `
      <main class="stack">
        <section class="hero"><div class="hero-kicker">MEMORY</div><h1>思い出</h1><p>記録を整理して、レビュー・次回改善・年表へつなげる。</p></section>
        <div class="tabs">${filters.map(f => `<button class="tab ${state.filter===f?'active':''}" data-action="filter" data-filter="${f}">${f==='all'?'全部':recLabel(f)}</button>`).join('')}</div>
        <section class="card"><div class="card-inner"><div class="card-head"><div><div class="eyebrow">RECORDS</div><div class="card-title">記録カード</div></div><span class="pill ${pendingChecks().length?'warn':'gray'}">要確認 ${pendingChecks().length}</span></div><div class="records">${records.length ? records.slice().reverse().map(renderRecord).join('') : `<div class="empty">記録はまだない。現地では＋から3秒で残す。</div>`}</div></div></section>
        <section class="card subtle"><div class="card-inner"><div class="card-head"><div><div class="eyebrow">REVIEW</div><div class="card-title">レビュー・次回改善</div></div><button class="btn small primary" data-action="generateReview">生成</button></div>${renderReview(exp)}</div></section>
        <section class="card subtle"><div class="card-inner"><div class="card-head"><div><div class="eyebrow">DATA CENTER</div><div class="card-title">控え・復元・外部接続</div></div><button class="btn small" data-action="openBackup">開く</button></div><p class="card-text">Google Photos / Google Calendar / 天気APIは、本接続前の保存構造と出力口を用意。静的PWAでは認証接続は別工程。</p></div></section>
      </main>`;
  }

  function renderRecord(r) {
    const exp = experienceById(r.experienceId);
    return `<div class="record"><div class="event-top"><div><div class="record-title">${esc(recLabel(r.type))} / ${esc(r.time || '')}</div><div class="record-body">${esc(r.text || r.fileName || '記録')}</div></div><span class="pill ${r.needsCheck?'warn':'gray'}">${r.needsCheck?'要確認':'保存済'}</span></div><div class="record-meta"><span>${esc(exp?.title || '未紐付け')}</span><span>${esc(r.date || today())}</span>${r.location ? `<span>${esc(r.location)}</span>` : ''}</div></div>`;
  }

  function renderReview(exp) {
    const rev = state.reviews.find(r => r.experienceId === exp?.id);
    if (!rev) return `<div class="review-box"><div class="item-title">レビュー待ち</div><div class="item-sub">記録が増えると、良かったこと・困ったこと・次回改善にまとめる。</div><div class="actions" style="margin-top:12px"><button class="btn primary" data-action="generateReview">レビュー生成</button><button class="btn" data-action="openReviewForm">手で書く</button></div></div>`;
    return `<div class="review-box"><div class="item-title">${esc(rev.title)}</div><p class="card-text">${esc(rev.summary)}</p><div class="divider"></div><div class="list"><div class="item"><div><div class="item-title">良かった</div><div class="item-sub">${esc(rev.good)}</div></div></div><div class="item"><div><div class="item-title">次回改善</div><div class="item-sub">${esc(rev.next)}</div></div></div></div></div>`;
  }

  function getActiveSession() {
    return state.records.find(r => r.id === state.activeSessionId && r.sessionStart);
  }

  function addRecord(type, text = '', extra = {}) {
    const exp = currentExperience();
    const rec = { id:uid('rec'), experienceId: exp?.id || null, type, text, date: today(), time: nowTime(), createdAt:new Date().toISOString(), needsCheck:false, ...extra };
    if (!rec.experienceId) rec.needsCheck = true;
    state.records.push(rec);
    save();
    render();
    toast(`${recLabel(type)}を保存`);
    return rec;
  }

  function startSession(kind) {
    const exp = currentExperience();
    if (state.activeSessionId && getActiveSession()) return toast('すでに記録中');
    const title = kind === 'walk' ? '散歩中' : 'キャンプ記録中';
    const session = { id:uid('session'), experienceId: exp?.id || null, type:kind === 'walk' ? 'walk' : 'setup', text:`${title}を開始`, title, sessionStart:true, date:today(), time:nowTime(), startedAt:nowTime(), createdAt:new Date().toISOString(), needsCheck:false };
    state.records.push(session);
    state.activeSessionId = session.id;
    if (exp && kind === 'camp') exp.status = 'doing';
    save();
    state.activeTab = 'add';
    render();
    toast(`${title}を開始`);
  }

  function endSession() {
    const session = getActiveSession();
    if (!session) return toast('記録中ではない');
    session.endedAt = nowTime();
    session.text += ` / 終了 ${session.endedAt}`;
    session.sessionStart = false;
    state.activeSessionId = null;
    const exp = currentExperience();
    if (exp?.status === 'doing') exp.status = 'done';
    save();
    render();
    toast('記録を終了');
  }

  function openModal(title, body) {
    const root = document.getElementById('modalRoot') || document.body;
    root.innerHTML = `<div class="overlay show"><div class="modal"><div class="modal-head"><div class="modal-title">${esc(title)}</div><button class="btn small" data-action="closeModal">閉じる</button></div><div class="modal-body">${body}</div></div></div>`;
  }

  function closeModal() {
    const root = document.getElementById('modalRoot');
    if (root) root.innerHTML = '';
  }

  function openEventForm(existing = null) {
    const e = existing || { title:'', type:'camp', level:4, status:'planning', date:state.selectedDate, location:'', note:'' };
    openModal(existing ? '予定を編集' : '予定を追加', `
      <form class="form-grid" data-form="event" data-id="${esc(existing?.id || '')}">
        <div class="field"><label>予定名</label><input name="title" value="${esc(e.title)}" placeholder="例：赤城山キャンプ" required></div>
        <div class="grid-2"><div class="field"><label>種別</label><select name="type">${Object.keys(TYPES).map(k => `<option value="${k}" ${e.type===k?'selected':''}>${TYPES[k]}</option>`).join('')}</select></div><div class="field"><label>深さ</label><select name="level">${[1,2,3,4].map(n => `<option value="${n}" ${Number(e.level)===n?'selected':''}>Lv.${n}</option>`).join('')}</select></div></div>
        <div class="grid-2"><div class="field"><label>日付</label><input type="date" name="date" value="${esc(e.date || '')}"></div><div class="field"><label>状態</label><select name="status">${['planning','ready','doing','done','candidate'].map(s => `<option value="${s}" ${e.status===s?'selected':''}>${statusLabel(s)}</option>`).join('')}</select></div></div>
        <div class="field"><label>場所</label><input name="location" value="${esc(e.location || '')}" placeholder="キャンプ場・病院・店名など"></div>
        <div class="field"><label>メモ</label><textarea name="note" placeholder="この予定で大事なこと">${esc(e.note || '')}</textarea></div>
        <button class="btn primary full" data-action="saveEvent">保存</button>
      </form>`);
  }

  function openPrepForm() {
    openModal('準備を追加', `<form class="form-grid" data-form="prep"><div class="field"><label>カテゴリ</label><select name="group">${Object.keys(GROUPS).map(k => `<option value="${k}">${GROUPS[k]}</option>`).join('')}</select></div><div class="field"><label>準備内容</label><input name="text" placeholder="例：ペグとハンマー確認" required></div><button class="btn primary full" data-action="savePrep">保存</button></form>`);
  }

  function openRecordForm() {
    openModal('メモを残す', `<form class="form-grid" data-form="record"><div class="field"><label>種類</label><select name="type">${Object.keys(REC_TYPES).map(k => `<option value="${k}">${REC_TYPES[k]}</option>`).join('')}</select></div><div class="field"><label>内容</label><textarea name="text" placeholder="後で整理できるように残す"></textarea></div><button class="btn primary full" data-action="saveRecord">保存</button></form>`);
  }

  function openPlaceForm() {
    openModal('場所カード追加', `<form class="form-grid" data-form="place"><div class="field"><label>名称</label><input name="name" placeholder="キャンプ場・公園・寄り道先" required></div><div class="grid-2"><div class="field"><label>カテゴリ</label><select name="category"><option>キャンプ場</option><option>散歩</option><option>候補</option><option>行事</option><option>買い物</option></select></div><div class="field"><label>エリア</label><input name="area" placeholder="県・市など"></div></div><div class="field"><label>メモ</label><textarea name="note" placeholder="犬可、景色、標高、温水、電源など"></textarea></div><button class="btn primary full" data-action="savePlace">保存</button></form>`);
  }

  function openGearForm() {
    openModal('ギア追加', `<form class="form-grid" data-form="gear"><div class="field"><label>ギア名</label><input name="name" required placeholder="例：ランドロックMFS"></div><div class="grid-2"><div class="field"><label>カテゴリ</label><input name="group" placeholder="幕・寝具・電源など"></div><div class="field"><label>状態</label><input name="status" placeholder="通常・要確認・充電など"></div></div><div class="field"><label>メモ</label><textarea name="note"></textarea></div><button class="btn primary full" data-action="saveGear">保存</button></form>`);
  }

  function openMealForm() {
    openModal('料理追加', `<form class="form-grid" data-form="meal"><div class="field"><label>料理名</label><input name="name" required placeholder="例：アヒージョ"></div><div class="grid-2"><div class="field"><label>タイミング</label><input name="timing" placeholder="夜・朝など"></div><div class="field"><label>必要ギア</label><input name="gear" placeholder="スキレットなど"></div></div><div class="field"><label>材料</label><textarea name="ingredients" placeholder="食材をカンマ区切り"></textarea></div><button class="btn primary full" data-action="saveMeal">保存</button></form>`);
  }

  function openBackup() {
    const json = esc(JSON.stringify(state, null, 2));
    openModal('控え・復元', `<div class="form-grid"><p class="card-text">JSONでバックアップ。ICSでカレンダー書き出し。Google連携は本接続前の出力口。</p><div class="actions"><button class="btn primary" data-action="exportJson">JSON控え</button><button class="btn" data-action="exportIcs">ICS書き出し</button><button class="btn" data-action="triggerImport">復元/取込</button><button class="btn warn" data-action="resetApp">初期化</button></div><div class="field"><label>現在データ</label><textarea readonly>${json}</textarea></div></div>`);
  }

  function openProjectSwitcher() {
    openModal('主役を切替', `<div class="list">${state.experiences.map(e => `<button class="item" data-action="chooseProject" data-id="${e.id}"><div><div class="item-title">${esc(e.title)}</div><div class="item-sub">${esc(typeLabel(e.type))} / ${esc(e.date ? compactDate(e.date) : '日付未設定')} / ${esc(e.location || '')}</div></div><span class="pill ${e.id===state.currentId?'dark':'gray'}">${e.id===state.currentId?'現在':'切替'}</span></button>`).join('')}</div><div class="actions" style="margin-top:14px"><button class="btn primary full" data-action="openEventForm">予定を追加</button></div>`);
  }

  function openEventDetail(e) {
    const r = readiness(e);
    openModal(e.title, `<div class="form-grid"><div class="readiness" style="--score:${r.score}%"><div class="gauge"><span>${r.score}</span></div><div><p class="card-text">${esc(typeLabel(e.type))} / ${esc(e.date ? compactDate(e.date) : '日付なし')} / ${esc(e.location || '場所未設定')}</p><div class="actions" style="margin-top:12px"><button class="btn primary" data-action="editEvent" data-id="${e.id}">編集</button><button class="btn" data-action="chooseProject" data-id="${e.id}">主役</button></div></div></div><div class="divider"></div><div class="grid-3"><div class="metric"><small>準備</small><strong>${r.done}/${r.total}</strong></div><div class="metric"><small>記録</small><strong>${r.records}</strong></div><div class="metric"><small>確認</small><strong>${r.checks}</strong></div></div><div class="actions"><button class="btn" data-action="tab" data-tab="prep">準備</button><button class="btn" data-action="tab" data-tab="add">記録</button><button class="btn" data-action="tab" data-tab="memory">思い出</button></div></div>`);
  }

  function saveForm(type, form, id = '') {
    const data = Object.fromEntries(new FormData(form).entries());
    const exp = currentExperience();
    if (type === 'event') {
      if (id) {
        const e = state.experiences.find(x => x.id === id);
        Object.assign(e, { title:data.title.trim(), type:data.type, level:Number(data.level), status:data.status, date:data.date, location:data.location.trim(), note:data.note.trim() });
      } else {
        const e = { id:uid('exp'), title:data.title.trim(), type:data.type, level:Number(data.level), status:data.status, date:data.date, endDate:'', location:data.location.trim(), people:'', note:data.note.trim(), createdAt:today() };
        state.experiences.push(e); state.currentId = e.id; state.selectedDate = e.date || state.selectedDate; if (e.date) state.calendarMonth = e.date.slice(0,7);
        seedPrepFor(e);
      }
    }
    if (type === 'prep') state.prep.push({ id:uid('prep'), experienceId:exp?.id || null, group:data.group, text:data.text.trim(), done:false, source:'manual' });
    if (type === 'record') addRecord(data.type, data.text.trim(), {});
    if (type === 'place') state.places.push({ id:uid('pl'), name:data.name.trim(), category:data.category, area:data.area.trim(), dog:true, weatherWatch:false, score:65, tags:['手入力'], note:data.note.trim() });
    if (type === 'gear') state.gear.push({ id:uid('gear'), name:data.name.trim(), group:data.group.trim() || 'その他', status:data.status.trim() || '通常', note:data.note.trim() });
    if (type === 'meal') state.meals.push({ id:uid('meal'), name:data.name.trim(), timing:data.timing.trim() || '未定', ingredients:data.ingredients.trim(), gear:data.gear.trim(), note:'' });
    save(); closeModal(); render(); toast('保存した');
  }

  function seedPrepFor(e) {
    if (e.type === 'camp') {
      ['天気を監視する','ルートと買い出しを決める','ギアを確認する','献立を決める','コタ用品を準備する'].forEach((text,i) => state.prep.push({ id:uid('prep'), experienceId:e.id, group:['weather','route','gear','cook','kota'][i], text, done:false, source:'template' }));
    } else if (e.type === 'walk' || e.type === 'campWalk') {
      state.prep.push({ id:uid('prep'), experienceId:e.id, group:'kota', text:'水・マナー袋・リード確認', done:false, source:'template' });
    }
  }

  function buildShopping() {
    const exp = currentExperience();
    const existing = state.prep.some(p => p.experienceId === exp?.id && p.group === 'shop' && p.source === 'meal');
    if (existing) return toast('買い物統合は作成済み');
    const ingredients = state.meals.flatMap(m => String(m.ingredients || '').split(',').map(x => x.trim()).filter(Boolean));
    const unique = [...new Set(ingredients)].slice(0, 12);
    unique.forEach(name => state.prep.push({ id:uid('prep'), experienceId:exp?.id || null, group:'shop', text:`${name}を買う`, done:false, source:'meal' }));
    save(); render(); toast(`${unique.length}件を買い物へ追加`);
  }

  function makeEventFromPlace(id) {
    const p = state.places.find(x => x.id === id); if (!p) return;
    const e = { id:uid('exp'), title:p.name, type:p.category === '散歩' ? 'walk' : 'camp', level:p.category === '散歩' ? 3 : 4, status:'candidate', date:'', endDate:'', location:p.name, people:'', note:p.note, createdAt:today() };
    state.experiences.push(e); state.currentId = e.id; seedPrepFor(e); save(); render(); toast('候補を予定化');
  }

  function generateReview() {
    const exp = currentExperience(); if (!exp) return toast('予定がない');
    const records = experienceRecords(exp.id);
    const good = records.filter(r => ['photo','spot','note'].includes(r.type)).slice(0,3).map(r => r.text || recLabel(r.type)).join(' / ') || '記録が増えると良かったことを抽出';
    const next = experiencePrep(exp.id).filter(p => !p.done).slice(0,3).map(p => p.text).join(' / ') || '次回は天気・ルート・持ち物を早めに確認';
    const summary = `${records.length}件の記録から、次回準備に使うメモを生成。`;
    const old = state.reviews.find(r => r.experienceId === exp.id);
    const review = { id: old?.id || uid('review'), experienceId:exp.id, title:`${exp.title} レビュー`, summary, good, problem:'困ったことは記録から追記', next, createdAt:new Date().toISOString() };
    if (old) Object.assign(old, review); else state.reviews.push(review);
    save(); state.activeTab = 'memory'; render(); toast('レビュー生成');
  }

  function download(name, content, type='application/json') {
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function exportIcs() {
    const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//OUTBASE//JP'];
    state.experiences.filter(e => e.date).forEach(e => {
      const dt = e.date.replaceAll('-','');
      lines.push('BEGIN:VEVENT',`UID:${e.id}@outbase`,`DTSTART;VALUE=DATE:${dt}`,`SUMMARY:${ics(e.title)}`,`LOCATION:${ics(e.location || '')}`,`DESCRIPTION:${ics(e.note || '')}`,'END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    download(`OUTBASE_${today()}.ics`, lines.join('\r\n'), 'text/calendar');
  }
  const ics = v => String(v || '').replaceAll('\\','\\\\').replaceAll('\n','\\n').replaceAll(',','\\,').replaceAll(';','\\;');

  function triggerImport() { importInput.click(); }
  function triggerMedia() { mediaInput.click(); }

  function handleImports(files) {
    [...files].forEach(file => {
      const item = { id:uid('imp'), name:file.name, size:file.size, type:file.type || 'unknown', date:today(), status:'候補', createdAt:new Date().toISOString() };
      state.imports.push(item);
      state.records.push({ id:uid('rec'), experienceId:state.currentId, type:'import', text:`取込候補: ${file.name}`, fileName:file.name, date:today(), time:nowTime(), createdAt:new Date().toISOString(), needsCheck:true });
      if (/\.json$/i.test(file.name)) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const incoming = JSON.parse(reader.result);
            if (incoming && incoming.experiences && incoming.prep) {
              state = migrate({ ...defaultState(), ...incoming });
              save(); render(); toast('JSONを復元');
            }
          } catch (e) { toast('JSON復元失敗'); }
        };
        reader.readAsText(file);
      }
    });
    save(); render(); toast(`${files.length}件を取込候補へ`);
  }

  function handleMedia(files) {
    [...files].forEach(file => {
      const type = file.type.startsWith('video') ? 'video' : 'photo';
      addRecord(type, `${file.name} を追加`, { fileName:file.name, fileType:file.type, fileSize:file.size, needsCheck:false });
    });
  }

  function voiceRecord() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      openRecordForm();
      toast('音声認識未対応。メモ入力へ');
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = 'ja-JP'; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = ev => addRecord('voice', ev.results[0][0].transcript, {});
    rec.onerror = () => toast('音声メモに失敗');
    rec.start();
    toast('話して記録');
  }

  function gpsRecord() {
    if (!navigator.geolocation) return addRecord('gps', 'GPS非対応', { needsCheck:true });
    toast('位置を取得中');
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude, accuracy } = pos.coords;
      addRecord('gps', `緯度 ${latitude.toFixed(5)} / 経度 ${longitude.toFixed(5)} / 誤差 ${Math.round(accuracy)}m`, { location:`${latitude.toFixed(5)},${longitude.toFixed(5)}` });
    }, () => addRecord('gps', '位置取得失敗', { needsCheck:true }), { enableHighAccuracy:true, timeout:8000 });
  }

  function monthMove(dir) {
    const [y,m] = state.calendarMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + Number(dir), 1);
    state.calendarMonth = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    save(); render();
  }

  function resetApp() {
    if (!confirm('OUTBASEを初期化しますか？控えを取ってから実行してください。')) return;
    localStorage.removeItem(STORAGE_KEY);
    state = defaultState();
    save(); render(); toast('初期化した');
  }

  document.addEventListener('click', ev => {
    const btn = ev.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    ev.preventDefault();
    if (action === 'tab') { closeModal(); return setTab(btn.dataset.tab); }
    if (action === 'filter') return setFilter(btn.dataset.filter);
    if (action === 'month') return monthMove(btn.dataset.dir);
    if (action === 'selectDate') { state.selectedDate = btn.dataset.date; state.calendarMonth = btn.dataset.date.slice(0,7); save(); return render(); }
    if (action === 'setCurrent' || action === 'chooseProject') { setCurrent(btn.dataset.id); closeModal(); return; }
    if (action === 'openProjectSwitcher') return openProjectSwitcher();
    if (action === 'openEventForm') return openEventForm();
    if (action === 'openEvent') { const e = state.experiences.find(x => x.id === btn.dataset.id) || currentExperience(); return e ? openEventDetail(e) : openEventForm(); }
    if (action === 'editEvent') { const e = state.experiences.find(x => x.id === btn.dataset.id); return openEventForm(e); }
    if (action === 'openPrep') return openPrepForm();
    if (action === 'openRecordForm') return openRecordForm();
    if (action === 'openPlaceForm') return openPlaceForm();
    if (action === 'openGearForm') return openGearForm();
    if (action === 'openMealForm') return openMealForm();
    if (action === 'openBackup') return openBackup();
    if (action === 'closeModal') return closeModal();
    if (action === 'saveEvent') return saveForm('event', btn.closest('form'), btn.closest('form')?.dataset.id || '');
    if (action === 'savePrep') return saveForm('prep', btn.closest('form'));
    if (action === 'saveRecord') return saveForm('record', btn.closest('form'));
    if (action === 'savePlace') return saveForm('place', btn.closest('form'));
    if (action === 'saveGear') return saveForm('gear', btn.closest('form'));
    if (action === 'saveMeal') return saveForm('meal', btn.closest('form'));
    if (action === 'togglePrep') { const p = state.prep.find(x => x.id === btn.dataset.id); if (p) p.done = !p.done; save(); return render(); }
    if (action === 'deletePrep') { state.prep = state.prep.filter(x => x.id !== btn.dataset.id); save(); return render(); }
    if (action === 'buildShopping') return buildShopping();
    if (action === 'makeEventFromPlace') return makeEventFromPlace(btn.dataset.id);
    if (action === 'toggleWeather') { const p = state.places.find(x => x.id === btn.dataset.id); if (p) p.weatherWatch = !p.weatherWatch; save(); return render(); }
    if (action === 'startSession') return startSession(btn.dataset.kind);
    if (action === 'endSession') return endSession();
    if (action === 'quickRecord') return addRecord(btn.dataset.type, defaultRecordText(btn.dataset.type), {});
    if (action === 'media') return triggerMedia();
    if (action === 'voice') return voiceRecord();
    if (action === 'gps') return gpsRecord();
    if (action === 'triggerImport') return triggerImport();
    if (action === 'exportJson') return download(`OUTBASE_backup_${today()}.json`, JSON.stringify(state, null, 2));
    if (action === 'exportIcs') return exportIcs();
    if (action === 'resetApp') return resetApp();
    if (action === 'generateReview') return generateReview();
    if (action === 'openPastForm') { openEventForm({ id:'', title:'過去キャンプ', type:'camp', level:4, status:'done', date:'', location:'', note:'後から実績登録' }); return; }
  });

  function defaultRecordText(type) {
    const map = { note:'今メモ', poo:'コタ うんち', pee:'コタ おしっこ', dog:'犬友達候補', spot:'スポット候補', gps:'位置記録' };
    return map[type] || `${recLabel(type)}を記録`;
  }

  mediaInput.addEventListener('change', e => { if (e.target.files?.length) handleMedia(e.target.files); e.target.value = ''; });
  importInput.addEventListener('change', e => { if (e.target.files?.length) handleImports(e.target.files); e.target.value = ''; });

  window.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js?v=' + VERSION).catch(() => {});
  }

  render();
})();
