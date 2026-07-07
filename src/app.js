(() => {
  'use strict';

  const VERSION = 'v148-forward-37-40-design-fix-lock';
  const STORAGE_KEY = 'outbase_v148_state';
  const LEGACY_KEYS = [
    'outbase_v148_state','outbase_v145_state','outbase_v144_state','outbase_v143_state','outbase_restart_43_state','outbase_restart_42_state','outbase_restart_35_state'
  ];
  const MAX_PREVIEW_BYTES = 520000;
  const app = document.getElementById('app');
  const mediaInput = document.getElementById('mediaInput');
  const importFileInput = document.getElementById('importFileInput');

  const now = () => new Date();
  const today = () => now().toISOString().slice(0, 10);
  const nowTime = () => now().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  const uid = (p = 'id') => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const esc = (v) => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const dateObj = (iso) => { const [y,m,d] = String(iso || today()).split('-').map(Number); return new Date(y || now().getFullYear(), (m || 1) - 1, d || 1); };
  const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const addDays = (iso, n) => { const d = dateObj(iso); d.setDate(d.getDate() + n); return isoDate(d); };
  const sameDay = (a, b) => String(a || '').slice(0,10) === String(b || '').slice(0,10);
  const inRange = (date, start, end) => date >= (start || date) && date <= (end || start || date);
  const jpDate = (iso) => iso ? dateObj(iso).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' }) : '日付なし';
  const typeLabels = {
    camp:'キャンプ', walk:'散歩', outing:'外出', work:'仕事', hospital:'病院', payment:'支払い', family:'家族', pet:'ペット', car:'車', shopping:'買い物', travel:'旅行', event:'行事', memo:'メモ'
  };
  const levelLabels = { 1:'Lv.1 普通', 2:'Lv.2 メモ', 3:'Lv.3 準備', 4:'Lv.4 記録' };
  const recordLabels = { photo:'写真', video:'動画', voice:'音声メモ', memo:'メモ', poop:'💩', pee:'💧', dog:'犬友達', spot:'スポット', location:'位置', weather:'天気', gear:'ギア', meal:'料理', setup:'設営撤収' };

  const defaultState = () => ({
    version: VERSION,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ui: { tab: 'home', selectedDate: today(), calendarMonth: today().slice(0,7), modal: null, toast: '', prepFilter: 'all', memoryFilter: 'all', searchFilter: 'place' },
    settings: { compactMode: true, captureRule: '3秒記録', googlePhotosPolicy: 'Google Photos正本 / OUTBASEは参照管理', familyShare: false },
    activeEventId: null,
    activeSessionId: null,
    events: [],
    sessions: [],
    records: [],
    prep: [],
    places: [],
    gear: [],
    meals: [],
    checks: [],
    imports: [],
    backups: [],
    dogFriends: []
  });

  let state = loadState();
  let lastGeo = null;
  let activeCaptureKind = 'photo';

  function loadState() {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      for (const key of LEGACY_KEYS) {
        const legacy = localStorage.getItem(key);
        if (legacy) { raw = legacy; break; }
      }
    }
    const base = defaultState();
    if (!raw) return seed(base);
    try {
      const old = JSON.parse(raw);
      return normalize({ ...base, ...old, ui: { ...base.ui, ...(old.ui || {}) }, settings: { ...base.settings, ...(old.settings || {}) }, version: VERSION });
    } catch {
      return seed(base);
    }
  }

  function seed(s) {
    s.places = [
      { id: uid('place'), name: '未登録のキャンプ場・散歩先', category: '候補', favorite: false, weatherWatch: false, notes: '検索・写真・予約スクショから候補化する入口', visits: 0 }
    ];
    s.gear = [
      { id: uid('gear'), name: 'ギア取込待ち', category: '取込', status: '候補', source: 'Excel/購入履歴/写真から登録', memo: '手入力前提にしない' }
    ];
    s.meals = [
      { id: uid('meal'), name: '献立候補', slot: '未定', ingredients: '食材を入れると買い物へ統合', gear: '', rating: '', memo: '料理・献立・買い物の入口' }
    ];
    return s;
  }

  function normalize(s) {
    const base = defaultState();
    for (const k of ['events','sessions','records','prep','places','gear','meals','checks','imports','backups','dogFriends']) if (!Array.isArray(s[k])) s[k] = [];
    s.settings = { ...base.settings, ...(s.settings || {}) };
    s.ui = { ...base.ui, ...(s.ui || {}) };
    if (!s.ui.selectedDate) s.ui.selectedDate = today();
    if (!s.ui.calendarMonth) s.ui.calendarMonth = s.ui.selectedDate.slice(0,7);
    return s;
  }

  function save() {
    state.updatedAt = new Date().toISOString();
    state.version = VERSION;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  function setToast(message) {
    state.ui.toast = message;
    save(); render();
    window.clearTimeout(setToast.timer);
    setToast.timer = window.setTimeout(() => { state.ui.toast = ''; save(); render(); }, 1900);
  }
  function activeEvent() {
    const current = state.events.find(e => e.id === state.activeEventId);
    if (current && current.start) return current;
    return nextEvent() || null;
  }
  function nextEvent() {
    return state.events
      .filter(e => e.start && (e.end || e.start) >= today() && e.status !== 'archived' && e.status !== 'actual')
      .sort((a,b) => String(a.start).localeCompare(String(b.start)))[0] || null;
  }
  function currentSession() {
    const s = state.sessions.find(x => x.id === state.activeSessionId && x.status === 'active');
    if (!s) return null;
    const started = Date.parse(s.startedAt || '');
    if (Number.isFinite(started) && Date.now() - started > 1000 * 60 * 60 * 12) return null;
    return s;
  }
  function eventById(id) { return state.events.find(e => e.id === id); }
  function placeById(id) { return state.places.find(p => p.id === id); }
  function recordsForEvent(id) { return state.records.filter(r => r.eventId === id); }
  function prepForEvent(id) { return state.prep.filter(p => p.eventId === id); }
  function sessionsForEvent(id) { return state.sessions.filter(s => s.parentEventId === id); }
  function upcomingEvents(limit = 6) {
    return state.events
      .filter(e => e.start && (e.end || e.start) >= today() && e.status !== 'actual' && e.status !== 'archived')
      .sort((a,b) => String(a.start).localeCompare(String(b.start))).slice(0, limit);
  }
  function eventsOnDate(iso) { return state.events.filter(e => e.start && inRange(iso, e.start, e.end)); }
  function isDeepEvent(e) { return Number(e.level || 1) >= 3 || ['camp','walk','travel','outing','pet'].includes(e.type); }

  function render() {
    const tab = state.ui.tab === 'home' ? 'home' : state.ui.tab;
    app.innerHTML = `${renderTopbar()}${renderContent(tab)}${renderBottomNav()}${state.ui.modal ? renderModal(state.ui.modal) : ''}${state.ui.toast ? `<div class="toast">${esc(state.ui.toast)}</div>` : ''}`;
  }

  function renderTopbar() {
    const ae = activeEvent();
    const current = ae ? `${typeLabels[ae.type] || '予定'} / ${jpDate(ae.start)}` : '予定未選択';
    return `<header class="topbar restartHead">
      <div class="restartHeadRow">
        <div class="restartTitleBlock">
          <div class="kicker">OUTBASE / RESTART-35</div>
          <h1>今日は何する？</h1>
          <p>カレンダーを見ながら、どの画面でもプランを切り替えます。</p>
        </div>
        <div class="topActions"><button data-action="openBackup">控え</button><button class="dark" data-action="openImport">取込</button></div>
      </div>
      <div class="planChip"><button data-action="openPlanSelect"><span class="label">現在</span><strong>${esc(ae?.title || '予定・出来事を選択')}</strong><small>${esc(current)}</small><i>切替</i></button></div>
    </header>`;
  }
  function renderContent(tab) {
    if (tab === 'schedule') return renderSchedulePage();
    if (tab === 'search') return renderSearchPage();
    if (tab === 'prep') return renderPrepPage();
    if (tab === 'add') return renderAddPage();
    if (tab === 'memory') return renderMemoryPage();
    return renderHomePage();
  }

  function renderBottomNav() {
    const active = state.ui.tab;
    const btn = (id, label, cls='') => `<button class="navBtn ${active===id?'active':''} ${cls}" data-tab="${id}"><span>${label}</span></button>`;
    return `<nav class="bottomNav">${btn('schedule','予定')}${btn('search','探す')}${btn('prep','準備')}${btn('add','＋','plus')}${btn('memory','思い出')}</nav>`;
  }
  function renderHomePage() {
    const next = nextEvent();
    const openChecks = state.checks.filter(c => c.status !== 'done');
    const active = currentSession();
    return `<main>
      <section class="card hero">
        <h1>今日は何する？</h1>
        <p>予定・準備・散歩・現地記録・思い出を、同じ出来事へ自然にまとめる。</p>
        <div class="grid four" style="margin-top:14px">
          <button class="quickBtn primary" data-action="startCamp">キャンプ<small>計画・準備・現地</small></button>
          <button class="quickBtn" data-action="startWalk">散歩<small>3秒記録</small></button>
          <button class="quickBtn" data-action="openRecord" data-kind="memo">記録<small>写真・声・メモ</small></button>
          <button class="quickBtn soft" data-tab="memory">思い出<small>整理・改善</small></button>
        </div>
      </section>
      ${active ? renderActiveSession(active) : ''}
      ${renderCalendarCard()}
      <section class="card subtle">
        <div class="sectionTitle"><h2>次に見るもの</h2><small>${state.events.length}件の予定/出来事</small></div>
        <div class="list">
          ${next ? renderEventItem(next, true) : `<div class="empty">予定がまだない。＋から普通の予定・キャンプ・散歩を追加。</div>`}
          ${openChecks.length ? `<button class="quickBtn warn" data-action="openChecks">要確認 ${openChecks.length}件<small>迷った記録だけ確認</small></button>` : `<div class="pill green">要確認なし</div>`}
          ${renderChappyMini()}
        </div>
      </section>
    </main>`;
  }

  function renderActiveSession(s) {
    const mins = Math.max(1, Math.round((Date.now() - new Date(s.startAt).getTime()) / 60000));
    const count = state.records.filter(r => r.sessionId === s.id).length;
    return `<section class="captureBar">
      <div class="row between"><div><strong>${esc(typeLabels[s.type] || '活動')}中</strong><br><small class="muted">${mins}分 / 記録${count}件</small></div><button class="miniBtn red" data-action="endSession" data-id="${s.id}">終了</button></div>
      <div class="captureGrid" style="margin-top:10px">
        <button class="captureBtn primary" data-action="captureMedia" data-kind="photo">📷<span>写真</span></button>
        <button class="captureBtn" data-action="voiceMemo">🎤<span>声</span></button>
        <button class="captureBtn" data-action="quickRecord" data-kind="poop">💩<span>うんち</span></button>
        <button class="captureBtn" data-action="quickRecord" data-kind="pee">💧<span>おしっこ</span></button>
        <button class="captureBtn" data-action="openRecord" data-kind="dog">🐶<span>犬友達</span></button>
        <button class="captureBtn" data-action="openRecord" data-kind="spot">⭐<span>スポット</span></button>
        <button class="captureBtn" data-action="quickLocation">📍<span>位置</span></button>
        <button class="captureBtn" data-action="openRecord" data-kind="memo">メモ<span>手入力</span></button>
      </div>
    </section>`;
  }

  function renderCalendarCard() {
    const month = state.ui.calendarMonth || today().slice(0,7);
    const [y,m] = month.split('-').map(Number);
    const first = new Date(y, m-1, 1);
    const start = new Date(first); start.setDate(1 - first.getDay());
    const days = [];
    for (let i=0;i<42;i++) { const d = new Date(start); d.setDate(start.getDate()+i); days.push(d); }
    const cal = days.map(d => {
      const iso = isoDate(d);
      const evs = eventsOnDate(iso);
      return `<button class="day ${d.getMonth()!==m-1?'out':''} ${sameDay(iso,today())?'today':''} ${sameDay(iso,state.ui.selectedDate)?'selected':''}" data-action="selectDate" data-date="${iso}"><b>${d.getDate()}</b><span class="dots">${evs.slice(0,3).map(e => `<i class="dot ${esc(e.type)}"></i>`).join('')}</span></button>`;
    }).join('');
    const selectedEvents = eventsOnDate(state.ui.selectedDate);
    return `<section class="card">
      <div class="monthHead"><button class="chipBtn" data-action="moveMonth" data-delta="-1">‹</button><strong>高機能カレンダー ${y}.${String(m).padStart(2,'0')}</strong><button class="chipBtn" data-action="moveMonth" data-delta="1">›</button></div>
      <div class="calendar">${['日','月','火','水','木','金','土'].map(d=>`<div class="dow">${d}</div>`).join('')}${cal}</div>
      <div class="divider"></div>
      <div class="sectionTitle"><h2>${jpDate(state.ui.selectedDate)}</h2><button class="miniBtn dark" data-action="openEventForm" data-date="${state.ui.selectedDate}">予定追加</button></div>
      <div class="list">${selectedEvents.length ? selectedEvents.map(e => renderEventItem(e)).join('') : `<div class="empty">この日の予定はまだない</div>`}</div>
    </section>`;
  }

  function renderSchedulePage() {
    const dated = [...state.events].filter(e => e.start).sort((a,b) => String(a.start || '').localeCompare(String(b.start || '')));
    const noDate = [...state.events].filter(e => !e.start && e.status !== 'archived').sort((a,b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
    return `<main>
      ${renderCalendarCard()}
      <section class="card subtle">
        <div class="sectionTitle"><h2>予定・出来事</h2><button class="miniBtn dark" data-action="openEventForm">追加</button></div>
        <div class="tabs">${Object.entries(typeLabels).map(([k,v]) => `<button class="tabBtn" data-action="filterSchedule" data-type="${k}">${v}</button>`).join('')}</div>
        <div class="list">${dated.length ? dated.map(e => renderEventItem(e)).join('') : `<div class="empty">日付のある予定はまだない</div>`}</div>
        ${noDate.length ? `<div class="sectionTitle"><h2>日付未設定</h2><small>${noDate.length}件</small></div><div class="list">${noDate.map(e => renderEventItem(e)).join('')}</div>` : ''}
      </section>
    </main>`;
  }
  function renderEventItem(e, expanded=false) {
    const progress = eventProgress(e);
    const checks = state.checks.filter(c => c.eventId === e.id && c.status !== 'done').length;
    const recs = recordsForEvent(e.id).length;
    const preps = prepForEvent(e.id);
    return `<article class="item">
      <div class="itemHead">
        <div class="grow"><strong>${esc(e.title)}</strong><br><small>${esc(typeLabels[e.type] || e.type)} / ${esc(levelLabels[e.level] || 'Lv.1')} / ${jpDate(e.start)}${e.location ? ' / '+esc(e.location) : ''}</small></div>
        <span class="pill ${e.status==='actual'?'brown':e.status==='active'?'green':''}">${esc(e.status === 'actual' ? '実績' : e.status === 'active' ? '実行中' : '予定')}</span>
      </div>
      ${isDeepEvent(e) || expanded ? `<div class="progress"><i style="width:${progress}%"></i></div><small>準備 ${preps.filter(p=>p.done).length}/${preps.length} / 記録 ${recs} / 要確認 ${checks}</small>` : ''}
      <div class="itemActions"><button class="miniBtn dark" data-action="openEvent" data-id="${e.id}">開く</button><button class="miniBtn green" data-action="activateEvent" data-id="${e.id}">主役</button><button class="miniBtn" data-action="openPrepForm" data-event="${e.id}">準備</button><button class="miniBtn" data-action="openRecord" data-event="${e.id}" data-kind="memo">記録</button></div>
    </article>`;
  }

  function eventProgress(e) {
    const list = prepForEvent(e.id);
    if (!list.length) return recordsForEvent(e.id).length ? 66 : 8;
    return Math.round((list.filter(p => p.done).length / list.length) * 100);
  }

  function renderChappyMini() {
    const suggestions = buildSuggestions().slice(0,3);
    return `<div class="item"><div class="itemHead"><div><strong>チャッピー</strong><br><small>記録から次にやることを候補化</small></div><span class="pill green">提案のみ</span></div>${suggestions.length ? suggestions.map(s=>`<small>・${esc(s)}</small>`).join('') : '<small>予定や記録が増えると提案を出す</small>'}</div>`;
  }

  function renderSearchPage() {
    const f = state.ui.searchFilter || 'place';
    return `<main>
      <section class="card hero"><h1>探す</h1><p>キャンプ場・散歩先・寄り道・イベント候補を、予定とは分けて保存。</p></section>
      <div class="tabs"><button class="tabBtn ${f==='place'?'active':''}" data-search="place">場所</button><button class="tabBtn ${f==='dog'?'active':''}" data-search="dog">犬友達</button><button class="tabBtn ${f==='discover'?'active':''}" data-search="discover">発見メモ</button><button class="tabBtn ${f==='weather'?'active':''}" data-search="weather">天気監視</button></div>
      ${f === 'weather' ? renderWeatherWatch() : f === 'dog' ? renderDogFriends() : f === 'discover' ? renderDiscoveries() : renderPlaces()}
    </main>`;
  }

  function renderPlaces() {
    return `<section class="card"><div class="sectionTitle"><h2>場所カード</h2><button class="miniBtn dark" data-action="openPlaceForm">追加</button></div><div class="list">${state.places.map(p => `<article class="item"><div class="itemHead"><div><strong>${esc(p.name)}</strong><br><small>${esc(p.category || '場所')} ${p.address ? '/ '+esc(p.address) : ''}</small></div><span class="pill ${p.weatherWatch?'green':''}">${p.weatherWatch?'天気監視':'候補'}</span></div><small>${esc(p.notes || '写真・予約スクショ・URLから候補化')}</small><div class="itemActions"><button class="miniBtn" data-action="togglePlaceFavorite" data-id="${p.id}">${p.favorite?'お気に入り解除':'お気に入り'}</button><button class="miniBtn green" data-action="togglePlaceWeather" data-id="${p.id}">${p.weatherWatch?'監視OFF':'Weather Watch'}</button><button class="miniBtn" data-action="openEventForm" data-place="${p.id}">予定化</button></div></article>`).join('')}</div></section>`;
  }


  function renderDogFriends() {
    return `<section class="card"><div class="sectionTitle"><h2>犬友達</h2><button class="miniBtn dark" data-action="openDogFriendForm">追加</button></div><div class="list">${state.dogFriends.length ? state.dogFriends.map(d => `<article class="item"><div class="itemHead"><div><strong>${esc(d.name)}</strong><br><small>${esc(d.breed || '犬友達')} / ${esc(d.owner || '飼い主未登録')}</small></div><span class="pill green">候補化</span></div><small>${esc(d.notes || '次回以降は写真・場所・名前から候補表示')}</small><div class="itemActions"><button class="miniBtn" data-action="dogRecord" data-id="${d.id}">会った</button></div></article>`).join('') : `<div class="empty">初回だけ登録。以後は候補表示へ使う。</div>`}</div></section>`;
  }

  function renderDiscoveries() {
    const list = state.records.filter(r => ['spot','memo','photo','video'].includes(r.kind) && !r.eventId);
    return `<section class="card"><div class="sectionTitle"><h2>発見メモ</h2><button class="miniBtn dark" data-action="openRecord" data-kind="spot">追加</button></div><div class="list">${list.length ? list.map(r => renderRecordItem(r)).join('') : `<div class="empty">気になる場所・行事・ショップはここに残す</div>`}</div></section>`;
  }

  function renderWeatherWatch() {
    const watch = state.events.filter(e => e.weatherWatch).concat(state.places.filter(p => p.weatherWatch).map(p => ({ id:p.id, title:p.name, type:'place', start:'', location:p.address, place:true })));
    return `<section class="card"><div class="sectionTitle"><h2>Weather Watch</h2><button class="miniBtn dark" data-action="openEventForm">予定追加</button></div><div class="list">${watch.length ? watch.map(w => `<article class="item"><div class="itemHead"><div><strong>${esc(w.title)}</strong><br><small>${w.place?'場所':'予定'} ${w.start ? '/ '+jpDate(w.start) : ''}</small></div><span class="pill green">監視</span></div><small>14日前から雨・風・気温・代替候補の確認対象</small></article>`).join('') : `<div class="empty">天気監視したい予定・場所をONにする</div>`}</div></section>`;
  }

  function renderPrepPage() {
    const ae = activeEvent();
    const filter = state.ui.prepFilter || 'all';
    const items = state.prep.filter(p => filter === 'all' || p.group === filter || p.eventId === filter);
    return `<main>
      <section class="card hero"><h1>準備</h1><p>${ae ? esc(ae.title)+' の準備' : '予定なしでも準備から始められる'}</p><div class="grid two" style="margin-top:13px"><button class="quickBtn primary" data-action="openPrepForm">準備追加<small>買い物・料理・ギア</small></button><button class="quickBtn" data-action="generateDefaultPrep">不足候補<small>定番を追加</small></button></div></section>
      <div class="tabs"><button class="tabBtn ${filter==='all'?'active':''}" data-prep-filter="all">全部</button><button class="tabBtn ${filter==='買い物'?'active':''}" data-prep-filter="買い物">買い物</button><button class="tabBtn ${filter==='料理'?'active':''}" data-prep-filter="料理">料理</button><button class="tabBtn ${filter==='ギア'?'active':''}" data-prep-filter="ギア">ギア</button><button class="tabBtn ${filter==='コタ'?'active':''}" data-prep-filter="コタ">コタ</button><button class="tabBtn ${filter==='天気'?'active':''}" data-prep-filter="天気">天気</button><button class="tabBtn ${filter==='ルート'?'active':''}" data-prep-filter="ルート">ルート</button></div>
      <section class="card"><div class="sectionTitle"><h2>準備リスト</h2><button class="miniBtn" data-action="openShoppingFromMeals">買い物統合</button></div><div class="list">${items.length ? items.map(renderPrepItem).join('') : `<div class="empty">準備はまだない</div>`}</div></section>
      ${renderGearPanel()}${renderMealPanel()}${renderSetupPanel()}
    </main>`;
  }

  function renderPrepItem(p) {
    const e = eventById(p.eventId);
    return `<article class="item"><div class="itemHead"><div><strong>${esc(p.text)}</strong><br><small>${esc(p.group || '準備')}${e ? ' / '+esc(e.title) : ' / 仮紐付け待ち'}</small></div><button class="miniBtn ${p.done?'green':''}" data-action="togglePrep" data-id="${p.id}">${p.done?'完了':'未完'}</button></div>${p.memo ? `<small>${esc(p.memo)}</small>` : ''}</article>`;
  }

  function renderGearPanel() {
    return `<section class="card subtle"><div class="sectionTitle"><h2>ギア管理</h2><button class="miniBtn dark" data-action="openGearForm">追加</button></div><div class="list">${state.gear.slice(0,6).map(g => `<article class="item"><div class="itemHead"><div><strong>${esc(g.name)}</strong><br><small>${esc(g.category || 'ギア')} / ${esc(g.source || '手入力・取込')}</small></div><span class="pill ${g.status==='使用中'?'green':''}">${esc(g.status || '候補')}</span></div><small>${esc(g.memo || '使用履歴・乾燥・忘れ物の候補')}</small></article>`).join('')}</div></section>`;
  }

  function renderMealPanel() {
    return `<section class="card subtle"><div class="sectionTitle"><h2>料理・献立・買い物</h2><button class="miniBtn dark" data-action="openMealForm">追加</button></div><div class="list">${state.meals.slice(0,6).map(m => `<article class="item"><div class="itemHead"><div><strong>${esc(m.name)}</strong><br><small>${esc(m.slot || '未定')} / ${esc(m.ingredients || '食材未入力')}</small></div><span class="pill brown">献立</span></div><small>${esc(m.memo || '買い物リストへ統合')}</small></article>`).join('')}</div></section>`;
  }

  function renderSetupPanel() {
    const ae = activeEvent();
    const setup = state.records.filter(r => r.kind === 'setup' && (!ae || r.eventId === ae.id));
    return `<section class="card subtle"><div class="sectionTitle"><h2>設営・撤収ログ</h2><button class="miniBtn dark" data-action="openSetupLog">追加</button></div><div class="list">${setup.length ? setup.slice(0,5).map(renderRecordItem).join('') : `<div class="empty">受付・到着・荷下ろし・設営・休憩・撤収・車載までログ化</div>`}</div></section>`;
  }

  function renderAddPage() {
    return `<main><section class="card hero"><h1>＋</h1><p>入口は1つに決めない。予定・準備・現地・過去・メモから始める。</p></section><section class="card"><div class="grid two">
      <button class="quickBtn primary" data-action="openEventForm">予定<small>普通の予定もキャンプも</small></button>
      <button class="quickBtn" data-action="openPrepForm">準備<small>予定なしでも開始</small></button>
      <button class="quickBtn" data-action="openRecord" data-kind="memo">現地記録<small>写真・声・場所・メモ</small></button>
      <button class="quickBtn soft" data-action="openActualForm">過去実績<small>後から登録</small></button>
      <button class="quickBtn" data-action="openRecord" data-kind="memo" data-loose="1">メモ<small>文脈で仮紐付け</small></button>
      <button class="quickBtn warn" data-action="openImport">一括取込<small>写真・PDF・Excel・スクショ</small></button>
    </div></section>${currentSession() ? renderActiveSession(currentSession()) : ''}</main>`;
  }

  function renderMemoryPage() {
    const filter = state.ui.memoryFilter || 'all';
    const records = state.records.filter(r => filter === 'all' || r.kind === filter).slice().sort((a,b) => String(b.at).localeCompare(String(a.at)));
    const actuals = state.events.filter(e => e.status === 'actual');
    return `<main><section class="card hero"><h1>思い出</h1><p>記録を整理して、レビュー・次回改善・年表へつなげる。</p></section>
      <div class="tabs"><button class="tabBtn ${filter==='all'?'active':''}" data-memory-filter="all">全部</button><button class="tabBtn ${filter==='photo'?'active':''}" data-memory-filter="photo">写真</button><button class="tabBtn ${filter==='voice'?'active':''}" data-memory-filter="voice">声</button><button class="tabBtn ${filter==='spot'?'active':''}" data-memory-filter="spot">スポット</button><button class="tabBtn ${filter==='setup'?'active':''}" data-memory-filter="setup">設営</button></div>
      <section class="card"><div class="sectionTitle"><h2>過去実績</h2><button class="miniBtn dark" data-action="openActualForm">追加</button></div><div class="list">${actuals.length ? actuals.map(e => renderEventItem(e)).join('') : `<div class="empty">過去キャンプ・散歩・外出を登録</div>`}</div></section>
      <section class="card subtle"><div class="sectionTitle"><h2>記録カード</h2><button class="miniBtn" data-action="openChecks">要確認</button></div><div class="list">${records.length ? records.map(renderRecordItem).join('') : `<div class="empty">記録はまだない</div>`}</div></section>
      <section class="card subtle"><div class="sectionTitle"><h2>レビュー・次回改善</h2><button class="miniBtn dark" data-action="generateReview">生成</button></div><div class="list">${buildReviewItems().map(t => `<div class="item"><strong>${esc(t.title)}</strong><small>${esc(t.text)}</small></div>`).join('')}</div></section>
    </main>`;
  }

  function renderRecordItem(r) {
    const e = eventById(r.eventId);
    const p = placeById(r.placeId);
    return `<article class="item"><div class="itemHead"><div><strong>${esc(recordLabels[r.kind] || r.kind)} ${r.fileName ? ' / '+esc(r.fileName) : ''}</strong><br><small>${jpDate((r.at || '').slice(0,10))} ${esc(r.time || '')}${e ? ' / '+esc(e.title) : ''}${p ? ' / '+esc(p.name) : ''}</small></div><span class="pill ${r.needsCheck?'orange':'green'}">${r.needsCheck?'要確認':'保存'}</span></div>${r.preview ? `<img src="${r.preview}" alt="" style="max-width:100%;border-radius:14px;margin-top:6px">` : ''}${r.text ? `<small>${esc(r.text)}</small>` : ''}<div class="itemActions"><button class="miniBtn" data-action="openRecordDetail" data-id="${r.id}">開く</button>${!r.eventId ? `<button class="miniBtn green" data-action="openLinkRecord" data-id="${r.id}">紐付け</button>` : ''}</div></article>`;
  }

  function renderModal(modal) {
    const { type, data = {} } = modal;
    let body = '';
    if (type === 'eventForm') body = renderEventForm(data);
    if (type === 'prepForm') body = renderPrepForm(data);
    if (type === 'recordForm') body = renderRecordForm(data);
    if (type === 'placeForm') body = renderPlaceForm(data);
    if (type === 'gearForm') body = renderGearForm(data);
    if (type === 'mealForm') body = renderMealForm(data);
    if (type === 'dogFriendForm') body = renderDogFriendForm(data);
    if (type === 'backup') body = renderBackupSheet();
    if (type === 'import') body = renderImportSheet();
    if (type === 'eventDetail') body = renderEventDetail(data.id);
    if (type === 'checks') body = renderChecksSheet();
    if (type === 'planSelect') body = renderPlanSelect();
    if (type === 'recordDetail') body = renderRecordDetail(data.id);
    if (type === 'linkRecord') body = renderLinkRecord(data.id);
    return `<div class="sheetBackdrop" data-action="closeModal"><section class="sheet" data-sheet><div class="sheetHead"><h2>${esc(modalTitle(type))}</h2><button class="closeBtn" data-action="closeModal">×</button></div>${body}</section></div>`;
  }

  function modalTitle(type) {
    return ({ eventForm:'予定・出来事', prepForm:'準備追加', recordForm:'記録', placeForm:'場所カード', gearForm:'ギア', mealForm:'料理・献立', dogFriendForm:'犬友達', backup:'控え・復元', import:'一括取込', eventDetail:'予定詳細', checks:'要確認', planSelect:'主役プラン切替', recordDetail:'記録詳細', linkRecord:'記録の紐付け' })[type] || 'OUTBASE';
  }

  function renderEventForm(d={}) {
    const e = d.id ? eventById(d.id) : null;
    const place = d.place ? placeById(d.place) : null;
    const status = d.status || e?.status || 'planned';
    return `<form class="formGrid" data-form="event">
      <input type="hidden" name="id" value="${esc(e?.id || '')}">
      <div class="field"><label>予定名</label><input name="title" required value="${esc(e?.title || d.title || '')}" placeholder="例：スノーピーク赤城山 / コタ散歩 / 病院"></div>
      <div class="inlineFields"><div class="field"><label>種別</label><select name="type">${Object.entries(typeLabels).map(([k,v])=>`<option value="${k}" ${(e?.type || d.type || (place?'outing':'camp'))===k?'selected':''}>${v}</option>`).join('')}</select></div><div class="field"><label>深さ</label><select name="level">${[1,2,3,4].map(l=>`<option value="${l}" ${String(e?.level || d.level || 3)===String(l)?'selected':''}>${levelLabels[l]}</option>`).join('')}</select></div></div>
      <div class="inlineFields"><div class="field"><label>開始日</label><input type="date" name="start" value="${esc(e?.start || d.date || today())}"></div><div class="field"><label>終了日</label><input type="date" name="end" value="${esc(e?.end || d.date || e?.start || today())}"></div></div>
      <div class="field"><label>場所</label><input name="location" value="${esc(e?.location || place?.name || '')}" placeholder="キャンプ場・公園・店名など"></div>
      <div class="inlineFields"><div class="field"><label>状態</label><select name="status"><option value="planned" ${status==='planned'?'selected':''}>予定</option><option value="active" ${status==='active'?'selected':''}>実行中</option><option value="actual" ${status==='actual'?'selected':''}>実績</option></select></div><div class="field"><label>天気監視</label><select name="weatherWatch"><option value="false">OFF</option><option value="true" ${e?.weatherWatch?'selected':''}>ON</option></select></div></div>
      <div class="field"><label>メモ</label><textarea name="notes" placeholder="同行者、サイト番号、予約情報、注意点">${esc(e?.notes || '')}</textarea></div>
      <button class="quickBtn primary" type="submit">保存<small>予定/出来事として管理</small></button>
    </form>`;
  }

  function renderPrepForm(d={}) {
    const ae = activeEvent();
    return `<form class="formGrid" data-form="prep"><input type="hidden" name="eventId" value="${esc(d.event || ae?.id || '')}"><div class="field"><label>グループ</label><select name="group">${['買い物','料理','ギア','コタ','天気','ルート','設営','撤収','その他'].map(g=>`<option>${g}</option>`).join('')}</select></div><div class="field"><label>やること</label><input name="text" required placeholder="例：コタの水・フード確認"></div><div class="field"><label>メモ</label><textarea name="memo" placeholder="量、担当、店、注意点"></textarea></div><button class="quickBtn primary" type="submit">準備を保存<small>予定なしでも仮紐付け</small></button></form>`;
  }

  function renderRecordForm(d={}) {
    const ae = d.event ? eventById(d.event) : activeEvent();
    const kind = d.kind || 'memo';
    return `<form class="formGrid" data-form="record"><input type="hidden" name="eventId" value="${esc(d.event || ae?.id || '')}"><input type="hidden" name="kind" value="${esc(kind)}"><div class="field"><label>記録種別</label><input value="${esc(recordLabels[kind] || kind)}" disabled></div><div class="field"><label>メモ</label><textarea name="text" placeholder="声・写真・場所に残したいこと"></textarea></div><div class="grid two"><button class="quickBtn" type="button" data-action="captureMedia" data-kind="photo">写真/動画<small>ファイル選択</small></button><button class="quickBtn" type="button" data-action="quickLocation">GPS<small>時刻と一緒に保存</small></button></div><button class="quickBtn primary" type="submit">記録を保存<small>${ae ? esc(ae.title)+'へ紐付け' : '文脈で仮紐付け'}</small></button></form>`;
  }

  function renderPlaceForm() {
    return `<form class="formGrid" data-form="place"><div class="field"><label>場所名</label><input name="name" required placeholder="キャンプ場・公園・店・景色スポット"></div><div class="inlineFields"><div class="field"><label>カテゴリ</label><select name="category"><option>キャンプ場</option><option>散歩先</option><option>寄り道</option><option>店</option><option>イベント</option><option>温泉</option><option>候補</option></select></div><div class="field"><label>天気監視</label><select name="weatherWatch"><option value="false">OFF</option><option value="true">ON</option></select></div></div><div class="field"><label>住所/URL</label><input name="address" placeholder="住所・URL・予約サイト"></div><div class="field"><label>メモ</label><textarea name="notes" placeholder="犬可、景色、温水、標高、注意点"></textarea></div><button class="quickBtn primary" type="submit">場所カード保存</button></form>`;
  }

  function renderGearForm() {
    return `<form class="formGrid" data-form="gear"><div class="field"><label>ギア名</label><input name="name" required placeholder="Snow Peak製品名など"></div><div class="inlineFields"><div class="field"><label>カテゴリ</label><input name="category" placeholder="テント/灯り/寝具/調理"></div><div class="field"><label>状態</label><select name="status"><option>候補</option><option>所有</option><option>使用中</option><option>乾燥中</option><option>修理</option></select></div></div><div class="field"><label>メモ</label><textarea name="memo" placeholder="購入日、価格、使用感、忘れ物注意"></textarea></div><button class="quickBtn primary" type="submit">ギア保存</button></form>`;
  }


  function renderDogFriendForm() {
    return `<form class="formGrid" data-form="dogFriend"><div class="field"><label>犬の名前</label><input name="name" required placeholder="犬友達の名前"></div><div class="inlineFields"><div class="field"><label>犬種・特徴</label><input name="breed" placeholder="犬種・色・特徴"></div><div class="field"><label>飼い主</label><input name="owner" placeholder="分かる範囲で"></div></div><div class="field"><label>よく会う場所・メモ</label><textarea name="notes" placeholder="場所、相性、次回声かけメモ"></textarea></div><button class="quickBtn primary" type="submit">犬友達保存</button></form>`;
  }

  function renderMealForm() {
    return `<form class="formGrid" data-form="meal"><div class="field"><label>料理名</label><input name="name" required placeholder="ガーリックシュリンプなど"></div><div class="inlineFields"><div class="field"><label>枠</label><input name="slot" placeholder="1日目夜/朝/昼"></div><div class="field"><label>必要ギア</label><input name="gear" placeholder="スキレットなど"></div></div><div class="field"><label>食材</label><textarea name="ingredients" placeholder="食材を改行またはカンマで入力"></textarea></div><div class="field"><label>メモ</label><textarea name="memo" placeholder="量、余り、次回改善"></textarea></div><button class="quickBtn primary" type="submit">献立保存</button></form>`;
  }

  function renderBackupSheet() {
    const json = JSON.stringify(state, null, 2);
    return `<div class="formGrid"><p class="muted">ローカル保存を丸ごと控える。GitHub更新前後の復旧用。</p><div class="grid two"><button class="quickBtn primary" data-action="copyBackup">控えをコピー<small>クリップボード</small></button><button class="quickBtn" data-action="downloadBackup">JSON保存<small>端末へ</small></button></div><div class="field"><label>復元用JSON</label><textarea id="restoreText" placeholder="ここへ控えを貼り付け"></textarea></div><button class="quickBtn warn" data-action="restoreBackup">読み込み復元<small>現在データを置換</small></button><details><summary class="pill">現在の控えを見る</summary><pre class="codeBox">${esc(json)}</pre></details></div>`;
  }

  function renderImportSheet() {
    return `<div class="formGrid"><p class="muted">写真・スクショ・PDF・Excelを1件ずつ手入力しない。まず候補として保存し、後で承認する。</p><button class="quickBtn primary" data-action="pickImportFiles">ファイル選択<small>写真 / PDF / Excel / スクショ</small></button><div class="field"><label>URL・予約情報・購入履歴テキスト</label><textarea id="importText" placeholder="予約メール、購入履歴、天気スクショの内容など"></textarea></div><button class="quickBtn" data-action="saveImportText">テキスト取込<small>候補を作成</small></button><div class="divider"></div><div class="list">${state.imports.slice().reverse().slice(0,8).map(i => `<div class="item"><strong>${esc(i.name || i.kind)}</strong><small>${esc(i.summary || '')}</small><span class="pill orange">候補</span></div>`).join('') || `<div class="empty">取込候補はまだない</div>`}</div></div>`;
  }

  function renderEventDetail(id) {
    const e = eventById(id); if (!e) return `<div class="empty">予定が見つからない</div>`;
    const preps = prepForEvent(id); const recs = recordsForEvent(id); const sessions = sessionsForEvent(id);
    return `<div class="formGrid"><div class="item"><div class="itemHead"><div><strong>${esc(e.title)}</strong><br><small>${esc(typeLabels[e.type] || e.type)} / ${jpDate(e.start)}${e.location?' / '+esc(e.location):''}</small></div><span class="pill green">${esc(levelLabels[e.level] || '')}</span></div><small>${esc(e.notes || '')}</small><div class="grid two"><button class="quickBtn primary" data-action="startSessionForEvent" data-id="${e.id}">開始<small>現地記録</small></button><button class="quickBtn" data-action="openEventFormEdit" data-id="${e.id}">編集<small>予定内容</small></button></div></div><section><div class="sectionTitle"><h2>準備</h2><button class="miniBtn" data-action="openPrepForm" data-event="${e.id}">追加</button></div><div class="list">${preps.length?preps.map(renderPrepItem).join(''):'<div class="empty">準備なし</div>'}</div></section><section><div class="sectionTitle"><h2>記録</h2><button class="miniBtn" data-action="openRecord" data-event="${e.id}" data-kind="memo">追加</button></div><div class="list">${recs.length?recs.map(renderRecordItem).join(''):'<div class="empty">記録なし</div>'}</div></section><section><div class="sectionTitle"><h2>活動ログ</h2></div><div class="list">${sessions.length?sessions.map(s=>`<div class="item"><strong>${esc(typeLabels[s.type]||s.type)}</strong><small>${esc(s.startAt)}${s.endAt?' → '+esc(s.endAt):' / 実行中'}</small></div>`).join(''):'<div class="empty">セッションなし</div>'}</div></section></div>`;
  }

  function renderChecksSheet() {
    const checks = state.checks.filter(c => c.status !== 'done');
    return `<div class="list">${checks.length ? checks.map(c => `<article class="item"><div class="itemHead"><div><strong>${esc(c.text)}</strong><br><small>${esc(c.reason || '候補確認')}</small></div><span class="pill orange">要確認</span></div><div class="itemActions">${(c.candidates||[]).map(id => eventById(id)).filter(Boolean).map(e => `<button class="miniBtn green" data-action="resolveCheck" data-check="${c.id}" data-event="${e.id}">${esc(e.title)}</button>`).join('')}<button class="miniBtn" data-action="newEventFromCheck" data-check="${c.id}">新規予定</button><button class="miniBtn red" data-action="dismissCheck" data-check="${c.id}">後で</button></div></article>`).join('') : `<div class="empty">要確認なし</div>`}</div>`;
  }

  function renderPlanSelect() {
    const evs = upcomingEvents(12).concat(state.events.filter(e => e.status === 'active')).filter((e,i,a)=>a.findIndex(x=>x.id===e.id)===i);
    return `<div class="list"><button class="quickBtn primary" data-action="openEventForm">新しい予定を作る<small>普通の予定もOK</small></button>${evs.length ? evs.map(e => `<article class="item"><div class="itemHead"><div><strong>${esc(e.title)}</strong><br><small>${jpDate(e.start)} / ${esc(typeLabels[e.type]||e.type)}</small></div><button class="miniBtn green" data-action="activateEvent" data-id="${e.id}">主役</button></div></article>`).join('') : `<div class="empty">予定がまだない</div>`}</div>`;
  }

  function renderRecordDetail(id) {
    const r = state.records.find(x => x.id === id); if (!r) return '<div class="empty">記録なし</div>';
    return `<div class="formGrid">${renderRecordItem(r)}<div class="field"><label>Google Photos方針</label><input disabled value="${esc(r.googlePhotosStatus || state.settings.googlePhotosPolicy)}"></div><button class="quickBtn" data-action="openLinkRecord" data-id="${r.id}">予定/出来事へ紐付け</button></div>`;
  }

  function renderLinkRecord(id) {
    const r = state.records.find(x => x.id === id); if (!r) return '<div class="empty">記録なし</div>';
    const candidates = contextCandidates((r.at || today()).slice(0,10), r.text || recordLabels[r.kind] || '記録');
    return `<div class="list">${candidates.length ? candidates.map(e => `<article class="item"><div class="itemHead"><div><strong>${esc(e.title)}</strong><br><small>${jpDate(e.start)} / ${esc(typeLabels[e.type]||e.type)}</small></div><button class="miniBtn green" data-action="linkRecord" data-record="${r.id}" data-event="${e.id}">紐付け</button></div></article>`).join('') : '<div class="empty">候補なし</div>'}<button class="quickBtn primary" data-action="openEventForm">新規予定を作る</button></div>`;
  }

  function contextCandidates(date, text='') {
    const ds = date || today();
    let list = state.events.filter(e => inRange(ds, e.start, e.end));
    if (!list.length && state.activeEventId) list = [eventById(state.activeEventId)].filter(Boolean);
    const words = String(text).split(/[\s、。\/／・,]+/).filter(w => w.length >= 2);
    const wordHits = state.events.filter(e => words.some(w => `${e.title} ${e.location} ${e.notes}`.includes(w)));
    return [...list, ...wordHits].filter((e,i,a)=>e && a.findIndex(x=>x.id===e.id)===i).slice(0,4);
  }

  function linkContext(entry) {
    const cands = contextCandidates(entry.date || today(), entry.text || entry.title || '');
    if (state.activeEventId && eventById(state.activeEventId)) return { eventId: state.activeEventId, needsCheck: false, candidates: cands.map(e => e.id) };
    if (cands.length === 1) return { eventId: cands[0].id, needsCheck: false, candidates: [cands[0].id] };
    if (cands.length > 1) return { eventId: cands[0].id, needsCheck: true, candidates: cands.map(e => e.id), reason: '複数候補あり' };
    return { eventId: '', needsCheck: true, candidates: [], reason: '近い予定なし' };
  }

  function addCheck(kind, entryId, text, candidates, reason, eventId='') {
    state.checks.push({ id: uid('check'), kind, entryId, eventId, text, candidates, reason, status: 'open', createdAt: new Date().toISOString() });
  }

  function createDefaultPrep(eventId) {
    const e = eventById(eventId);
    if (!e) return;
    const base = [
      ['買い物','食材・飲み物・氷を確認'], ['料理','献立と量を確認'], ['ギア','テント・灯り・寝具を確認'], ['コタ','フード・水・マナー袋・カート確認'], ['天気','雨・風・気温を確認'], ['ルート','出発時刻・経由地・給油を確認']
    ];
    if (e.type !== 'camp') base.splice(2, 0, ['持ち物','必要なものを確認']);
    base.forEach(([group,text]) => {
      if (!state.prep.some(p => p.eventId === eventId && p.text === text)) state.prep.push({ id: uid('prep'), eventId, group, text, done:false, memo:'', createdAt:new Date().toISOString() });
    });
  }

  function addRecord({ kind='memo', text='', eventId='', sessionId='', file=null, preview='', needsCheck=false, candidates=[], placeId='' }) {
    const at = new Date().toISOString();
    let link = { eventId, needsCheck, candidates };
    if (!eventId && !sessionId) link = linkContext({ date: at.slice(0,10), text });
    if (sessionId) {
      const s = state.sessions.find(x => x.id === sessionId);
      if (s?.parentEventId) link.eventId = s.parentEventId;
    }
    const r = {
      id: uid('rec'), kind, text, at, date: at.slice(0,10), time: nowTime(), eventId: eventId || link.eventId || '', sessionId: sessionId || state.activeSessionId || '', placeId, lat:lastGeo?.lat || '', lng:lastGeo?.lng || '', fileName:file?.name || '', mediaKind:file?.type || '', fileSize:file?.size || 0, preview, needsCheck: Boolean(link.needsCheck), googlePhotosStatus: file ? 'Google Photos正本候補 / OUTBASEは参照情報' : state.settings.googlePhotosPolicy
    };
    state.records.push(r);
    if (r.needsCheck) addCheck('record', r.id, text || recordLabels[kind] || '記録', link.candidates || [], link.reason || '文脈確認', r.eventId);
    save();
    return r;
  }

  function startSession(type='walk', eventId='') {
    let evId = eventId || state.activeEventId || '';
    if (!evId && type === 'walk') {
      const e = { id:uid('evt'), title:`コタ散歩 ${jpDate(today())}`, type:'walk', level:4, start:today(), end:today(), location:'', status:'active', weatherWatch:false, notes:'散歩開始から自動作成', createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() };
      state.events.push(e);
      evId = e.id;
    }
    const s = { id: uid('ses'), type, parentEventId: evId, status:'active', startAt:new Date().toISOString(), endAt:'', startLat:lastGeo?.lat || '', startLng:lastGeo?.lng || '', note:'' };
    state.sessions.push(s);
    state.activeSessionId = s.id;
    if (evId) { state.activeEventId = evId; const e = eventById(evId); if (e) e.status = 'active'; }
    save();
    getGeo(false);
    setToast(`${typeLabels[type] || '活動'}を開始`);
  }

  function endSession(id) {
    const s = state.sessions.find(x => x.id === id);
    if (!s) return;
    s.status = 'done'; s.endAt = new Date().toISOString();
    if (state.activeSessionId === id) state.activeSessionId = null;
    const e = eventById(s.parentEventId); if (e && e.status === 'active') e.status = e.start < today() ? 'actual' : 'planned';
    addRecord({ kind:'memo', text:`${typeLabels[s.type] || '活動'}終了`, eventId:s.parentEventId, sessionId:id });
    save(); setToast('終了を保存');
  }

  function buildSuggestions() {
    const res = [];
    const next = nextEvent();
    if (next) {
      const days = Math.ceil((dateObj(next.start) - dateObj(today())) / 86400000);
      if (days <= 14 && next.weatherWatch) res.push(`${next.title} は天気監視対象。雨・風・気温を確認`);
      if (isDeepEvent(next) && prepForEvent(next.id).length === 0) res.push(`${next.title} の準備候補を追加`);
      const undone = prepForEvent(next.id).filter(p => !p.done).length;
      if (undone) res.push(`${next.title} の未完了準備が${undone}件`);
    }
    if (state.checks.some(c => c.status !== 'done')) res.push('要確認の記録を紐付け');
    if (!state.records.length) res.push('散歩・写真・声メモを1件残す');
    return res;
  }

  function buildReviewItems() {
    const items = [];
    const actual = state.events.filter(e => e.status === 'actual').slice(-1)[0];
    if (actual) items.push({ title:'直近実績', text:`${actual.title} の記録${recordsForEvent(actual.id).length}件から次回改善を作成可能` });
    const poop = state.records.filter(r => r.kind === 'poop').length;
    if (poop) items.push({ title:'コタ記録', text:`💩記録 ${poop}件。散歩ルート改善や体調メモへ利用` });
    const setup = state.records.filter(r => r.kind === 'setup').length;
    if (setup) items.push({ title:'設営撤収', text:`設営・撤収ログ ${setup}件。次回の到着時刻と撤収開始に反映` });
    if (!items.length) items.push({ title:'レビュー待ち', text:'記録が増えると、次回の持ち物・料理・天気判断へつながる' });
    return items;
  }

  async function getGeo(showToast = true) {
    if (!navigator.geolocation) { if (showToast) setToast('GPS非対応'); return null; }
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition((pos) => {
        lastGeo = { lat: Number(pos.coords.latitude.toFixed(6)), lng: Number(pos.coords.longitude.toFixed(6)), accuracy: Math.round(pos.coords.accuracy || 0), at: new Date().toISOString() };
        if (showToast) setToast('GPSを保存');
        resolve(lastGeo);
      }, () => { if (showToast) setToast('GPS取得できない'); resolve(null); }, { enableHighAccuracy:true, timeout:9000, maximumAge:30000 });
    });
  }

  function openModal(type, data = {}) { state.ui.modal = { type, data }; save(); render(); }
  function closeModal() { state.ui.modal = null; save(); render(); }

  function handleForm(form) {
    const fd = new FormData(form);
    const kind = form.dataset.form;
    if (kind === 'event') {
      const id = fd.get('id') || uid('evt');
      const existing = eventById(id);
      const event = existing || { id, createdAt:new Date().toISOString() };
      Object.assign(event, {
        title: String(fd.get('title') || '').trim() || '無題の予定',
        type: fd.get('type') || 'event', level: Number(fd.get('level') || 1), start: fd.get('start') || today(), end: fd.get('end') || fd.get('start') || today(), location: String(fd.get('location') || '').trim(), status: fd.get('status') || 'planned', weatherWatch: fd.get('weatherWatch') === 'true', notes: String(fd.get('notes') || '').trim(), updatedAt:new Date().toISOString()
      });
      if (!existing) state.events.push(event);
      state.activeEventId = event.id;
      if (event.level >= 3 || event.type === 'camp') createDefaultPrep(event.id);
      save(); closeModal(); setToast('予定を保存'); return;
    }
    if (kind === 'prep') {
      const link = fd.get('eventId') ? { eventId: fd.get('eventId'), needsCheck:false } : linkContext({ date: today(), text: fd.get('text') });
      const p = { id:uid('prep'), eventId:link.eventId || '', group:fd.get('group') || 'その他', text:String(fd.get('text')||'').trim(), memo:String(fd.get('memo')||'').trim(), done:false, createdAt:new Date().toISOString() };
      if (!p.text) return;
      state.prep.push(p);
      if (link.needsCheck) addCheck('prep', p.id, p.text, link.candidates || [], link.reason || '準備の紐付け確認', p.eventId);
      save(); closeModal(); setToast('準備を保存'); return;
    }
    if (kind === 'record') {
      addRecord({ kind:fd.get('kind') || 'memo', text:String(fd.get('text')||'').trim(), eventId:fd.get('eventId') || '' });
      closeModal(); setToast('記録を保存'); return;
    }
    if (kind === 'place') {
      state.places.push({ id:uid('place'), name:String(fd.get('name')||'').trim(), category:fd.get('category') || '候補', address:String(fd.get('address')||'').trim(), notes:String(fd.get('notes')||'').trim(), favorite:false, weatherWatch:fd.get('weatherWatch') === 'true', lat:lastGeo?.lat || '', lng:lastGeo?.lng || '', visits:0, createdAt:new Date().toISOString() });
      save(); closeModal(); setToast('場所カード保存'); return;
    }
    if (kind === 'gear') {
      state.gear.push({ id:uid('gear'), name:String(fd.get('name')||'').trim(), category:String(fd.get('category')||'').trim(), status:fd.get('status') || '候補', source:'手入力/取込', memo:String(fd.get('memo')||'').trim(), createdAt:new Date().toISOString() });
      save(); closeModal(); setToast('ギア保存'); return;
    }
    if (kind === 'dogFriend') {
      state.dogFriends.push({ id:uid('dog'), name:String(fd.get('name')||'').trim(), breed:String(fd.get('breed')||'').trim(), owner:String(fd.get('owner')||'').trim(), notes:String(fd.get('notes')||'').trim(), createdAt:new Date().toISOString() });
      save(); closeModal(); setToast('犬友達保存'); return;
    }
    if (kind === 'meal') {
      state.meals.push({ id:uid('meal'), name:String(fd.get('name')||'').trim(), slot:String(fd.get('slot')||'').trim(), ingredients:String(fd.get('ingredients')||'').trim(), gear:String(fd.get('gear')||'').trim(), memo:String(fd.get('memo')||'').trim(), createdAt:new Date().toISOString() });
      save(); closeModal(); setToast('献立保存'); return;
    }
  }

  function openShoppingFromMeals() {
    const ingredients = state.meals.flatMap(m => String(m.ingredients || '').split(/[\n,、]/).map(x => x.trim()).filter(Boolean));
    const unique = [...new Set(ingredients)];
    const ae = activeEvent();
    unique.forEach(x => {
      if (!state.prep.some(p => p.group === '買い物' && p.text === x)) state.prep.push({ id:uid('prep'), eventId:ae?.id || '', group:'買い物', text:x, memo:'献立から自動統合', done:false, createdAt:new Date().toISOString() });
    });
    save(); setToast(`買い物 ${unique.length}件を統合`);
  }

  function generateDefaultEvent(kind='camp') {
    openModal('eventForm', { type: kind, level: kind === 'camp' ? 4 : kind === 'walk' ? 3 : 2, date: state.ui.selectedDate || today() });
  }

  function generateDefaultPrep() {
    const ae = activeEvent();
    if (!ae) { openModal('eventForm', { level:3 }); return; }
    createDefaultPrep(ae.id); save(); setToast('準備候補を追加');
  }

  async function copyBackup() {
    const text = JSON.stringify(state, null, 2);
    try { await navigator.clipboard.writeText(text); setToast('控えをコピー'); }
    catch { setToast('コピーできない'); }
  }
  function downloadBackup() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type:'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `outbase-backup-${today()}.json`; a.click(); URL.revokeObjectURL(a.href);
  }
  function restoreBackup() {
    const text = document.getElementById('restoreText')?.value || '';
    try { state = normalize(JSON.parse(text)); save(); closeModal(); setToast('復元完了'); }
    catch { setToast('JSONを確認'); }
  }

  function saveImportText() {
    const text = document.getElementById('importText')?.value.trim();
    if (!text) return;
    const kind = /予約|宿泊|サイト|チェックイン/.test(text) ? 'キャンプ予約' : /購入|注文|Snow Peak|スノーピーク/.test(text) ? '購入履歴' : /天気|雨|風|気温/.test(text) ? '天気' : 'メモ';
    state.imports.push({ id:uid('imp'), kind, name:`${kind}テキスト`, summary:text.slice(0,120), raw:text, status:'candidate', createdAt:new Date().toISOString() });
    if (kind === 'キャンプ予約') openModal('eventForm', { title: guessTitle(text) || 'キャンプ予定', type:'camp', level:4 });
    else { save(); setToast('取込候補を保存'); render(); }
  }

  function guessTitle(text) {
    const lines = String(text).split('\n').map(x=>x.trim()).filter(Boolean);
    return lines.find(l => /キャンプ|Camp|CAMP|フィールド|オート|ロッジ|山|湖|森/.test(l)) || lines[0] || '';
  }

  function handleImportFiles(files) {
    [...files].forEach(file => state.imports.push({ id:uid('imp'), kind:file.type || 'file', name:file.name, summary:`${Math.round(file.size/1024)}KB / 候補として保存`, status:'candidate', createdAt:new Date().toISOString() }));
    save(); setToast(`${files.length}件を候補保存`); render();
  }

  function handleMediaFiles(files) {
    const session = currentSession();
    [...files].forEach(file => {
      if (file.size <= MAX_PREVIEW_BYTES && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => { addRecord({ kind:file.type.startsWith('video/')?'video':'photo', text:'', sessionId:session?.id || '', file, preview:reader.result }); save(); render(); };
        reader.readAsDataURL(file);
      } else {
        addRecord({ kind:file.type.startsWith('video/')?'video':'photo', text:'', sessionId:session?.id || '', file, preview:'' });
      }
    });
    setToast(`${files.length}件を記録`);
  }

  function startVoiceMemo() {
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech) { openModal('recordForm', { kind:'voice' }); return; }
    const recog = new Speech();
    recog.lang = 'ja-JP'; recog.interimResults = false; recog.maxAlternatives = 1;
    setToast('話してください');
    recog.onresult = (ev) => { const text = ev.results?.[0]?.[0]?.transcript || ''; addRecord({ kind:'voice', text, sessionId:currentSession()?.id || '' }); save(); setToast('音声メモ保存'); render(); };
    recog.onerror = () => openModal('recordForm', { kind:'voice' });
    recog.start();
  }

  function quickLocation() {
    getGeo(true).then((g) => { if (g) { addRecord({ kind:'location', text:`現在地 ${g.lat}, ${g.lng} / 精度${g.accuracy}m`, sessionId:currentSession()?.id || '' }); save(); render(); } });
  }

  function openSetupLog() {
    openModal('recordForm', { kind:'setup', event:activeEvent()?.id || '' });
  }

  function resolveCheck(checkId, eventId) {
    const c = state.checks.find(x => x.id === checkId); if (!c) return;
    c.status = 'done'; c.eventId = eventId;
    const r = state.records.find(x => x.id === c.entryId); if (r) { r.eventId = eventId; r.needsCheck = false; }
    const p = state.prep.find(x => x.id === c.entryId); if (p) p.eventId = eventId;
    save(); setToast('紐付け完了');
  }

  function createEventFromCheck(checkId) {
    const c = state.checks.find(x => x.id === checkId); if (!c) return;
    openModal('eventForm', { title:c.text, level:2, type:'memo', date:today() });
  }

  function installServiceWorker() {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js?v=' + VERSION).catch(() => undefined);
  }

  document.addEventListener('submit', (ev) => {
    const form = ev.target.closest('form[data-form]');
    if (!form) return;
    ev.preventDefault(); handleForm(form);
  });

  document.addEventListener('click', (ev) => {
    const sheet = ev.target.closest('[data-sheet]');
    if (ev.target.matches('.sheetBackdrop') && !sheet) closeModal();
    const tabBtn = ev.target.closest('[data-tab]');
    if (tabBtn) { state.ui.tab = tabBtn.dataset.tab; save(); render(); return; }
    const searchBtn = ev.target.closest('[data-search]');
    if (searchBtn) { state.ui.searchFilter = searchBtn.dataset.search; save(); render(); return; }
    const prepFilter = ev.target.closest('[data-prep-filter]');
    if (prepFilter) { state.ui.prepFilter = prepFilter.dataset.prepFilter; save(); render(); return; }
    const memFilter = ev.target.closest('[data-memory-filter]');
    if (memFilter) { state.ui.memoryFilter = memFilter.dataset.memoryFilter; save(); render(); return; }
    const btn = ev.target.closest('[data-action]');
    if (!btn) return;
    const a = btn.dataset.action;
    ev.preventDefault(); ev.stopPropagation();
    if (a === 'closeModal') return closeModal();
    if (a === 'openBackup') return openModal('backup');
    if (a === 'openImport') return openModal('import');
    if (a === 'openPlanSelect') return openModal('planSelect');
    if (a === 'openEventForm') return openModal('eventForm', { date: btn.dataset.date, place: btn.dataset.place });
    if (a === 'openEventFormEdit') return openModal('eventForm', { id: btn.dataset.id });
    if (a === 'openActualForm') return openModal('eventForm', { status:'actual', level:4, date:addDays(today(), -1) });
    if (a === 'openPrepForm') return openModal('prepForm', { event: btn.dataset.event || '' });
    if (a === 'openRecord') return openModal('recordForm', { event: btn.dataset.event || '', kind: btn.dataset.kind || 'memo', loose: btn.dataset.loose });
    if (a === 'openPlaceForm') return openModal('placeForm');
    if (a === 'openGearForm') return openModal('gearForm');
    if (a === 'openMealForm') return openModal('mealForm');
    if (a === 'openDogFriendForm') return openModal('dogFriendForm');
    if (a === 'openEvent') return openModal('eventDetail', { id: btn.dataset.id });
    if (a === 'openChecks') return openModal('checks');
    if (a === 'openRecordDetail') return openModal('recordDetail', { id: btn.dataset.id });
    if (a === 'openLinkRecord') return openModal('linkRecord', { id: btn.dataset.id });
    if (a === 'startCamp') return generateDefaultEvent('camp');
    if (a === 'startWalk') return startSession('walk');
    if (a === 'startSessionForEvent') return startSession(eventById(btn.dataset.id)?.type || 'outing', btn.dataset.id);
    if (a === 'endSession') return endSession(btn.dataset.id);
    if (a === 'captureMedia') { activeCaptureKind = btn.dataset.kind || 'photo'; mediaInput.click(); return; }
    if (a === 'voiceMemo') return startVoiceMemo();
    if (a === 'dogRecord') { const d = state.dogFriends.find(x=>x.id===btn.dataset.id); if (d) addRecord({ kind:'dog', text:`犬友達: ${d.name}`, sessionId:currentSession()?.id || '' }); save(); setToast('犬友達を記録'); render(); return; }
    if (a === 'quickRecord') { addRecord({ kind:btn.dataset.kind, text:recordLabels[btn.dataset.kind] || btn.dataset.kind, sessionId:currentSession()?.id || '' }); save(); setToast('ワンタップ保存'); render(); return; }
    if (a === 'quickLocation') return quickLocation();
    if (a === 'selectDate') { state.ui.selectedDate = btn.dataset.date; state.ui.calendarMonth = btn.dataset.date.slice(0,7); save(); render(); return; }
    if (a === 'moveMonth') { const [y,m] = state.ui.calendarMonth.split('-').map(Number); const d = new Date(y, m-1 + Number(btn.dataset.delta), 1); state.ui.calendarMonth = isoDate(d).slice(0,7); save(); render(); return; }
    if (a === 'activateEvent') { state.activeEventId = btn.dataset.id; save(); closeModal(); setToast('主役プラン切替'); return; }
    if (a === 'togglePrep') { const p = state.prep.find(x => x.id === btn.dataset.id); if (p) p.done = !p.done; save(); render(); return; }
    if (a === 'generateDefaultPrep') return generateDefaultPrep();
    if (a === 'openShoppingFromMeals') return openShoppingFromMeals();
    if (a === 'openSetupLog') return openSetupLog();
    if (a === 'togglePlaceFavorite') { const p = placeById(btn.dataset.id); if (p) p.favorite = !p.favorite; save(); render(); return; }
    if (a === 'togglePlaceWeather') { const p = placeById(btn.dataset.id); if (p) p.weatherWatch = !p.weatherWatch; save(); render(); return; }
    if (a === 'copyBackup') return copyBackup();
    if (a === 'downloadBackup') return downloadBackup();
    if (a === 'restoreBackup') return restoreBackup();
    if (a === 'pickImportFiles') { importFileInput.click(); return; }
    if (a === 'saveImportText') return saveImportText();
    if (a === 'resolveCheck') return resolveCheck(btn.dataset.check, btn.dataset.event);
    if (a === 'newEventFromCheck') return createEventFromCheck(btn.dataset.check);
    if (a === 'dismissCheck') { const c = state.checks.find(x=>x.id===btn.dataset.check); if (c) c.status = 'later'; save(); render(); return; }
    if (a === 'linkRecord') { const r = state.records.find(x=>x.id===btn.dataset.record); if (r) { r.eventId = btn.dataset.event; r.needsCheck = false; } save(); closeModal(); setToast('記録を紐付け'); return; }
    if (a === 'generateReview') { buildSuggestions().forEach(s => addRecord({ kind:'memo', text:`チャッピー提案: ${s}`, eventId:activeEvent()?.id || '' })); save(); setToast('レビュー候補を保存'); render(); return; }
  });

  mediaInput.addEventListener('change', () => { if (mediaInput.files?.length) handleMediaFiles(mediaInput.files); mediaInput.value = ''; });
  importFileInput.addEventListener('change', () => { if (importFileInput.files?.length) handleImportFiles(importFileInput.files); importFileInput.value = ''; });

  installServiceWorker();
  render();
})();
