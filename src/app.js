
(() => {
  'use strict';

  const VERSION = 'v144-calendar-context-lock';
  const STORAGE_KEY = 'outbase_v144_state';
  const LEGACY_KEYS = [
    'outbase_restart_43_state',
    'outbase_restart_42_state',
    'outbase_restart_35_state',
    'outbase_restart_34_state',
    'outbase_restart_33_state',
    'outbase_restart_32_state'
  ];

  const app = document.getElementById('app');
  const today = () => new Date().toISOString().slice(0, 10);
  const nowTime = () => new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const esc = (v) => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
  const id = (p) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  const dateObj = (iso) => {
    const [y,m,d] = String(iso || today()).split('-').map(Number);
    return new Date(y, (m || 1)-1, d || 1);
  };
  const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const addDays = (iso, n) => { const d = dateObj(iso); d.setDate(d.getDate()+n); return isoDate(d); };
  const inRange = (date, start, end) => date >= (start || date) && date <= (end || start || date);
  const screenNames = {
    home:'今日', calendar:'カレンダー', add:'追加', checks:'要確認', detail:'出来事', more:'控え'
  };

  const levelLabel = (level) => ({
    1:'普通', 2:'メモ付', 3:'準備付', 4:'記録付'
  })[Number(level)] || '普通';

  const typeLabel = (type) => ({
    normal:'普通', work:'仕事', hospital:'病院', payment:'支払い', family:'家族',
    pet:'ペット', shopping:'買い物', car:'車', camp:'キャンプ', walk:'散歩',
    travel:'旅行', picnic:'ピクニック', event:'イベント', other:'その他'
  })[type] || '予定';

  const defaultPrep = [
    { id:'prep-shop', group:'買い物', text:'買い物リストを確認', done:false },
    { id:'prep-cook', group:'料理', text:'料理と量を確認', done:false },
    { id:'prep-gear', group:'ギア', text:'ギア・電源・灯りを確認', done:false },
    { id:'prep-kota', group:'コタ', text:'フード・水・暑さ寒さを確認', done:false },
    { id:'prep-weather', group:'天気', text:'雨・風・気温を見る', done:false },
    { id:'prep-route', group:'ルート', text:'出発・経由地・帰路を見る', done:false }
  ];

  const defaultState = {
    version: VERSION,
    screen:'home',
    month: today().slice(0,7),
    selectedDate: today(),
    activeEventId:'',
    activeDetailTab:'summary',
    addMode:'event',
    toast:'',
    events:[
      {
        id:'evt-akagi',
        title:'スノーピーク赤城山キャンプ',
        type:'camp',
        level:4,
        startDate:'2026-06-26',
        endDate:'2026-06-27',
        startTime:'',
        endTime:'',
        location:'スノーピーク赤城山キャンプフィールド',
        memo:'夫婦＋コタ。準備・現地・記録・改善まで扱う出来事。',
        status:'planned',
        source:'sample',
        prep: clone(defaultPrep),
        records:[],
        improvements:[]
      },
      {
        id:'evt-sample-pay',
        title:'カード支払い確認',
        type:'payment',
        level:1,
        startDate: today(),
        endDate: today(),
        startTime:'',
        endTime:'',
        location:'',
        memo:'普通の予定は軽く扱う。',
        status:'planned',
        source:'sample',
        prep:[],
        records:[],
        improvements:[]
      }
    ],
    checks:[],
    trash:[]
  };

  let state = loadState();

  function loadState(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return normalize(JSON.parse(raw));
      for (const key of LEGACY_KEYS) {
        const legacy = localStorage.getItem(key);
        if (legacy) return normalize(migrate(JSON.parse(legacy)));
      }
    } catch (e) {
      console.warn(e);
    }
    return normalize(clone(defaultState));
  }

  function migrate(old){
    const next = clone(defaultState);
    next.events = [];
    const projects = Array.isArray(old.projects) ? old.projects : [];
    for (const p of projects) {
      next.events.push({
        id:p.id || id('evt'),
        title:p.title || p.label || p.place || '予定/出来事',
        type:p.type || 'other',
        level: eventLevelFromType(p.type),
        startDate:p.startDate || today(),
        endDate:p.endDate || p.startDate || today(),
        startTime:'',
        endTime:'',
        location:p.place || '',
        memo:p.memo || '',
        status:'planned',
        source:'legacy',
        prep: prepFromLegacy(p),
        records:[],
        improvements:[]
      });
    }
    if (!next.events.length) next.events = clone(defaultState.events);
    const allRecords = [
      ...(Array.isArray(old.inbox) ? old.inbox : []),
      ...(Array.isArray(old.memories) ? old.memories : [])
    ];
    for (const r of allRecords) {
      const evt = next.events.find(e => e.id === r.projectId) || next.events[0];
      evt.records = evt.records || [];
      evt.records.push({
        id:r.id || id('rec'),
        entry:r.type || r.recordType || 'メモ',
        text:r.text || r.memo || r.note || '',
        date:r.date || today(),
        time:r.time || nowTime(),
        source:'legacy',
        confidence: r.status === '確定' ? .9 : .55,
        media:Array.isArray(r.media) ? r.media : []
      });
    }
    const improvements = Array.isArray(old.improvements) ? old.improvements : [];
    for (const im of improvements) {
      const evt = next.events.find(e => e.id === im.projectId) || next.events[0];
      evt.improvements = evt.improvements || [];
      evt.improvements.push({
        id:im.id || id('imp'),
        text:im.text || im.note || '改善',
        done:Boolean(im.done),
        date: im.createdAt ? String(im.createdAt).slice(0,10) : today()
      });
    }
    next.activeEventId = next.events[0]?.id || '';
    return next;
  }

  function prepFromLegacy(p){
    if (Array.isArray(p.prep) && p.prep.length) {
      return p.prep.map(x => ({
        id:x.id || id('prep'),
        group:x.group || x.key || '準備',
        text:x.text || x.name || x.note || x.key || '準備',
        done:Boolean(x.done || x.status === '確認済み' || x.state === '買った')
      }));
    }
    return eventLevelFromType(p.type) >= 3 ? clone(defaultPrep) : [];
  }

  function eventLevelFromType(type){
    if (['camp','travel'].includes(type)) return 4;
    if (['walk','picnic','event','drive'].includes(type)) return 3;
    if (['pet','shopping','car'].includes(type)) return 2;
    return 1;
  }

  function normalize(s){
    s = { ...clone(defaultState), ...s };
    s.events = Array.isArray(s.events) && s.events.length ? s.events : clone(defaultState.events);
    s.events = s.events.map(e => ({
      id:e.id || id('evt'),
      title:e.title || '予定/出来事',
      type:e.type || 'other',
      level:Number(e.level || eventLevelFromType(e.type)),
      startDate:e.startDate || today(),
      endDate:e.endDate || e.startDate || today(),
      startTime:e.startTime || '',
      endTime:e.endTime || '',
      location:e.location || '',
      memo:e.memo || '',
      status:e.status || 'planned',
      source:e.source || 'local',
      prep:Array.isArray(e.prep) ? e.prep : [],
      records:Array.isArray(e.records) ? e.records : [],
      improvements:Array.isArray(e.improvements) ? e.improvements : []
    }));
    s.checks = Array.isArray(s.checks) ? s.checks : [];
    s.trash = Array.isArray(s.trash) ? s.trash : [];
    s.month = s.month || today().slice(0,7);
    s.selectedDate = s.selectedDate || today();
    if (s.activeEventId && !s.events.some(e => e.id === s.activeEventId)) s.activeEventId = '';
    s.activeDetailTab = s.activeDetailTab || 'summary';
    s.addMode = s.addMode || 'event';
    s.version = VERSION;
    return s;
  }

  function save(){
    state.version = VERSION;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, toast:'' }));
  }

  function toast(msg){
    state.toast = msg;
    render();
    clearTimeout(toast.t);
    toast.t = setTimeout(() => { state.toast = ''; render(); }, 1500);
  }

  function go(screen){
    state.screen = screen || 'home';
    save();
    render();
    window.scrollTo({top:0, behavior:'smooth'});
  }

  function sortedEvents(){
    return [...state.events].sort((a,b) => (a.startDate + (a.startTime || '')).localeCompare(b.startDate + (b.startTime || '')));
  }

  function eventsForDate(date){
    return sortedEvents().filter(e => inRange(date, e.startDate, e.endDate));
  }

  function nextEvents(limit=3){
    const t = today();
    return sortedEvents().filter(e => e.endDate >= t).slice(0, limit);
  }

  function activeEvent(){
    return state.events.find(e => e.id === state.activeEventId) || state.events[0] || null;
  }

  function dateLabel(e){
    if (!e) return '';
    let d = e.startDate || '';
    if (e.endDate && e.endDate !== e.startDate) d += ` - ${e.endDate}`;
    if (e.startTime) d += ` ${e.startTime}`;
    return d;
  }

  function layout(content){
    const checks = state.checks.length;
    app.innerHTML = `
      <header class="topbar">
        <button class="brand" data-action="go" data-screen="home">
          <div class="logo">OB</div>
          <div>
            <div class="brand-title">OUTBASE</div>
            <small class="brand-sub">全予定カレンダー / ${esc(screenNames[state.screen] || '')}</small>
          </div>
        </button>
        <div class="top-actions">
          <button class="pill-btn ${checks ? 'warn' : 'green'}" data-action="go" data-screen="checks">要確認 ${checks}</button>
        </div>
      </header>
      ${content}
      ${bottomNav()}
      ${addSheet()}
      ${state.toast ? `<div class="toast">${esc(state.toast)}</div>` : ''}
    `;
  }

  function bottomNav(){
    const nav = [
      ['home','⌂','今日'],
      ['calendar','□','カレンダー'],
      ['add','＋','追加'],
      ['checks','◇','要確認'],
      ['more','…','控え']
    ];
    return `<nav class="bottom-nav">${nav.map(([screen,icon,label]) => `
      <button class="nav ${state.screen === screen ? 'active' : ''}" data-action="${screen === 'add' ? 'openAdd' : 'go'}" data-screen="${screen}" data-mode="event">
        <b>${icon}</b><span>${label}</span>
      </button>`).join('')}</nav>`;
  }

  function renderHome(){
    const t = today();
    const todays = eventsForDate(t);
    const next = nextEvents(4);
    const records = state.events.reduce((sum,e) => sum + e.records.length, 0);
    layout(`
      <main class="screen active">
        <section class="hero">
          <div class="today-line">
            <div class="today-main">
              <small>今日</small>
              <strong>${formatJPDate(t)}</strong>
              <span>${todays.length ? `${todays.length}件の予定` : '今日の予定はまだありません'}</span>
            </div>
            <button class="pill-btn green" data-action="openAdd" data-mode="event">予定追加</button>
          </div>
          <div class="counts">
            <button class="count-tile" data-action="go" data-screen="calendar"><b>${state.events.length}</b><small>予定</small></button>
            <button class="count-tile" data-action="go" data-screen="checks"><b>${state.checks.length}</b><small>要確認</small></button>
            <button class="count-tile" data-action="go" data-screen="more"><b>${records}</b><small>記録</small></button>
          </div>
        </section>

        <section class="section">
          <div class="section-title"><h2>すぐ追加</h2><small>作って終わる</small></div>
          <div class="quick-row">
            ${quick('予定','予定','event','＋')}
            ${quick('準備','準備','prep','□')}
            ${quick('現地','現地','onsite','◎')}
            ${quick('実績','実績','past','○')}
            ${quick('メモ','メモ','memo','✎')}
          </div>
        </section>

        <section class="section">
          <div class="section-title"><h2>今日</h2><small>${t}</small></div>
          <div class="item-list">${todays.length ? todays.map(eventRow).join('') : `<div class="empty">今日の予定はありません。<br>予定・準備・現地記録のどこからでも始められます。</div>`}</div>
        </section>

        <section class="section">
          <div class="section-title"><h2>次の予定</h2><small>近い順</small></div>
          <div class="item-list">${next.length ? next.map(eventRow).join('') : `<div class="empty">次の予定はまだありません。</div>`}</div>
        </section>
      </main>
    `);
  }

  function quick(label, title, mode, icon){
    return `<button data-action="openAdd" data-mode="${mode}"><b>${icon}</b><span>${label}</span></button>`;
  }

  function eventRow(e){
    const prepOpen = e.prep.filter(p => !p.done).length;
    const meta = `${typeLabel(e.type)} / Lv.${e.level} ${levelLabel(e.level)} / ${dateLabel(e)}${e.location ? ' / ' + e.location : ''}`;
    return `
      <button class="row" data-action="openEvent" data-id="${esc(e.id)}">
        <span class="row-main">
          <strong>${esc(e.title)}</strong>
          <small>${esc(meta)}</small>
        </span>
        <span class="badge ${e.level >= 3 ? 'warn' : ''}">${e.level >= 3 ? `準備${prepOpen}` : levelLabel(e.level)}</span>
      </button>
    `;
  }

  function renderCalendar(){
    const [y,m] = state.month.split('-').map(Number);
    const first = new Date(y, m-1, 1);
    const start = new Date(y, m-1, 1 - first.getDay());
    const cells = [];
    for (let i=0; i<42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate()+i);
      cells.push(d);
    }
    const selected = eventsForDate(state.selectedDate);
    layout(`
      <main class="screen active">
        <div class="page-head">
          <div><h1>カレンダー</h1><p>全部の予定をここで見る</p></div>
          <button class="pill-btn green" data-action="openAdd" data-mode="event">予定追加</button>
        </div>
        <div class="calendar-head">
          <button class="icon-btn" data-action="moveMonth" data-delta="-1">前</button>
          <strong>${y}年 ${m}月</strong>
          <button class="icon-btn" data-action="moveMonth" data-delta="1">次</button>
        </div>
        <div class="calendar-grid">
          ${['日','月','火','水','木','金','土'].map(d => `<div class="dow">${d}</div>`).join('')}
          ${cells.map(d => dayCell(d, m)).join('')}
        </div>
        <section class="section">
          <div class="section-title"><h2>${formatJPDate(state.selectedDate)}</h2><small>${selected.length}件</small></div>
          <div class="item-list">${selected.length ? selected.map(eventRow).join('') : `<div class="empty">この日の予定はありません。</div>`}</div>
        </section>
      </main>
    `);
  }

  function dayCell(d, month){
    const iso = isoDate(d);
    const ev = eventsForDate(iso);
    const cls = [
      'day',
      d.getMonth()+1 !== month ? 'out' : '',
      iso === today() ? 'today' : '',
      iso === state.selectedDate ? 'selected' : ''
    ].filter(Boolean).join(' ');
    return `
      <button class="${cls}" data-action="selectDate" data-date="${iso}">
        <b>${d.getDate()}</b>
        <span class="dots">${ev.slice(0,4).map(() => '<i></i>').join('')}</span>
      </button>
    `;
  }

  function addSheet(){
    return `
      <div class="sheet-backdrop" data-sheet-backdrop data-action="closeAdd"></div>
      <section class="sheet" data-add-sheet>
        <div class="sheet-head">
          <strong>追加</strong>
          <button class="icon-btn" data-action="closeAdd">閉じる</button>
        </div>
        ${addForm()}
      </section>
    `;
  }

  function addForm(){
    const mode = state.addMode || 'event';
    return `
      <div class="mode-strip">
        ${modeButton('event','予定')}
        ${modeButton('prep','準備')}
        ${modeButton('onsite','現地')}
        ${modeButton('past','実績')}
        ${modeButton('memo','メモ')}
      </div>
      <form class="form" data-add-form>
        ${mode === 'event' ? eventFields() : ''}
        ${mode === 'prep' ? prepFields() : ''}
        ${mode === 'onsite' ? onsiteFields() : ''}
        ${mode === 'past' ? pastFields() : ''}
        ${mode === 'memo' ? memoFields() : ''}
        <button class="btn primary" type="submit">${saveButtonLabel(mode)}</button>
      </form>
    `;
  }

  function modeButton(mode, label){
    return `<button type="button" class="${state.addMode === mode ? 'active' : ''}" data-action="setAddMode" data-mode="${mode}">${label}</button>`;
  }

  function eventFields(){
    return `
      <input name="title" placeholder="予定名" required>
      <div class="form-grid">
        <input name="startDate" type="date" value="${today()}">
        <input name="endDate" type="date" value="${today()}">
      </div>
      <div class="form-grid">
        <input name="startTime" type="time">
        <input name="endTime" type="time">
      </div>
      <div class="form-grid">
        <select name="type">${typeOptions()}</select>
        <select name="level">
          <option value="1">Lv.1 普通</option>
          <option value="2">Lv.2 メモ/持ち物</option>
          <option value="3">Lv.3 準備付き</option>
          <option value="4">Lv.4 記録/改善付き</option>
        </select>
      </div>
      <input name="location" placeholder="場所">
      <textarea name="memo" placeholder="メモ"></textarea>
    `;
  }

  function prepFields(){
    return `
      <input name="title" placeholder="準備内容 例：買い物リストだけ先に作る" required>
      <div class="form-grid">
        <input name="date" type="date" value="${today()}">
        <select name="group">
          <option>買い物</option><option>料理</option><option>ギア</option><option>コタ</option><option>天気</option><option>ルート</option><option>その他</option>
        </select>
      </div>
      ${eventSelect('eventId', '自動で選ぶ')}
      <textarea name="memo" placeholder="補足。予定がなくても保存できる。"></textarea>
    `;
  }

  function onsiteFields(){
    return `
      <input name="title" placeholder="現地記録 例：サイトの地面がぬかるむ" required>
      <div class="form-grid">
        <input name="date" type="date" value="${today()}">
        <input name="time" type="time" value="${nowTime()}">
      </div>
      <div class="form-grid">
        <select name="entry"><option>メモ</option><option>写真</option><option>声</option><option>コタ</option><option>場所</option><option>料理</option><option>ギア</option></select>
        ${eventSelect('eventId', '自動で選ぶ')}
      </div>
      <input name="location" placeholder="場所/スポット">
      <textarea name="memo" placeholder="詳細"></textarea>
      <div class="media-note">写真・動画の本保存は後工程。ここでは文脈紐付けを優先。</div>
    `;
  }

  function pastFields(){
    return `
      <input name="title" placeholder="過去実績名 例：2026年5月 赤城山キャンプ" required>
      <div class="form-grid">
        <input name="startDate" type="date" value="${today()}">
        <input name="endDate" type="date" value="${today()}">
      </div>
      <div class="form-grid">
        <select name="type"><option value="camp">キャンプ</option><option value="travel">旅行</option><option value="walk">散歩</option><option value="event">イベント</option><option value="other">その他</option></select>
        <select name="level"><option value="4">Lv.4 記録/改善付き</option><option value="3">Lv.3 準備付き</option><option value="2">Lv.2 メモ付き</option></select>
      </div>
      <input name="location" placeholder="場所">
      <textarea name="memo" placeholder="覚えていること・写真から分かること"></textarea>
    `;
  }

  function memoFields(){
    return `
      <input name="title" placeholder="メモ見出し" required>
      <div class="form-grid">
        <input name="date" type="date" value="${today()}">
        ${eventSelect('eventId', '自動で選ぶ')}
      </div>
      <textarea name="memo" placeholder="内容。OUTBASEが文脈で予定/出来事に寄せる。"></textarea>
    `;
  }

  function eventSelect(name, firstLabel){
    return `<select name="${name}"><option value="">${firstLabel}</option>${sortedEvents().map(e => `<option value="${esc(e.id)}">${esc(e.title)} / ${esc(dateLabel(e))}</option>`).join('')}</select>`;
  }

  function typeOptions(){
    const types = ['normal','work','hospital','payment','family','pet','shopping','car','camp','walk','travel','picnic','event','other'];
    return types.map(t => `<option value="${t}">${typeLabel(t)}</option>`).join('');
  }

  function saveButtonLabel(mode){
    return {event:'予定を保存', prep:'準備を保存', onsite:'現地記録を保存', past:'実績を作成', memo:'メモを保存'}[mode] || '保存';
  }

  function openAdd(mode='event'){
    state.addMode = mode;
    save();
    render();
    document.querySelector('[data-sheet-backdrop]')?.classList.add('show');
    document.querySelector('[data-add-sheet]')?.classList.add('show');
  }

  function closeAdd(){
    document.querySelector('[data-sheet-backdrop]')?.classList.remove('show');
    document.querySelector('[data-add-sheet]')?.classList.remove('show');
  }

  function submitAdd(form){
    const data = Object.fromEntries(new FormData(form).entries());
    const mode = state.addMode;
    if (mode === 'event') return createEvent(data);
    if (mode === 'prep') return createPrep(data);
    if (mode === 'onsite') return createRecord(data);
    if (mode === 'past') return createPast(data);
    if (mode === 'memo') return createMemo(data);
  }

  function createEvent(data){
    const event = {
      id:id('evt'),
      title:data.title || '予定',
      type:data.type || 'normal',
      level:Number(data.level || eventLevelFromType(data.type)),
      startDate:data.startDate || today(),
      endDate:data.endDate || data.startDate || today(),
      startTime:data.startTime || '',
      endTime:data.endTime || '',
      location:data.location || '',
      memo:data.memo || '',
      status:'planned',
      source:'local',
      prep:Number(data.level || 1) >= 3 ? clone(defaultPrep) : [],
      records:[],
      improvements:[]
    };
    state.events.push(event);
    state.activeEventId = event.id;
    state.selectedDate = event.startDate;
    state.month = event.startDate.slice(0,7);
    state.screen = 'detail';
    save();
    closeAdd();
    toast('予定を保存');
  }

  function createPast(data){
    createEvent({ ...data, level:data.level || 4 });
    const e = activeEvent();
    if (e) {
      e.status = 'actual';
      e.source = 'past';
      save();
    }
  }

  function createPrep(data){
    const entry = {
      mode:'prep',
      title:data.title || '準備',
      text:data.memo || data.title || '',
      date:data.date || today(),
      group:data.group || '準備',
      eventId:data.eventId || ''
    };
    const target = resolveTarget(entry);
    const prep = { id:id('prep'), group:entry.group, text:entry.title + (entry.text && entry.text !== entry.title ? `：${entry.text}` : ''), done:false };
    if (target.event) {
      target.event.prep.push(prep);
      save();
      closeAdd();
      toast(`${target.event.title} に準備を保存`);
      return;
    }
    addCheck(entry, target.candidates);
    closeAdd();
    toast('要確認に保存');
  }

  function createRecord(data){
    const entry = {
      mode:'onsite',
      title:data.title || '現地記録',
      text:data.memo || data.title || '',
      date:data.date || today(),
      time:data.time || nowTime(),
      entry:data.entry || 'メモ',
      location:data.location || '',
      eventId:data.eventId || ''
    };
    const target = resolveTarget(entry);
    const record = { id:id('rec'), entry:entry.entry, text:entry.title + (entry.text && entry.text !== entry.title ? `\n${entry.text}` : ''), date:entry.date, time:entry.time, location:entry.location, confidence:target.confidence, source:'v144' };
    if (target.event) {
      target.event.records.unshift(record);
      save();
      closeAdd();
      toast(`${target.event.title} に記録`);
      return;
    }
    addCheck(entry, target.candidates);
    closeAdd();
    toast('要確認に保存');
  }

  function createMemo(data){
    const entry = {
      mode:'memo',
      title:data.title || 'メモ',
      text:data.memo || data.title || '',
      date:data.date || today(),
      eventId:data.eventId || ''
    };
    const target = resolveTarget(entry);
    const record = { id:id('rec'), entry:'メモ', text:entry.title + (entry.text && entry.text !== entry.title ? `\n${entry.text}` : ''), date:entry.date, time:nowTime(), confidence:target.confidence, source:'v144' };
    if (target.event) {
      target.event.records.unshift(record);
      save();
      closeAdd();
      toast(`${target.event.title} にメモ`);
      return;
    }
    addCheck(entry, target.candidates);
    closeAdd();
    toast('要確認に保存');
  }

  function resolveTarget(entry){
    if (entry.eventId) {
      const event = state.events.find(e => e.id === entry.eventId);
      if (event) return { event, candidates:[event], confidence:1 };
    }
    const scores = state.events.map(e => {
      let score = 0;
      if (inRange(entry.date, e.startDate, e.endDate)) score += .55;
      if (entry.date === addDays(e.startDate, -1) || entry.date === addDays(e.endDate, 1)) score += .18;
      if (entry.mode === 'onsite' && e.level >= 3 && inRange(entry.date, addDays(e.startDate,-1), addDays(e.endDate,1))) score += .22;
      if (entry.mode === 'prep' && e.level >= 3 && entry.date <= e.startDate) score += .18;
      const text = `${entry.title} ${entry.text} ${entry.location || ''}`.toLowerCase();
      const hay = `${e.title} ${e.location} ${typeLabel(e.type)}`.toLowerCase();
      for (const token of tokenize(hay)) {
        if (token.length >= 2 && text.includes(token)) score += .08;
      }
      return { event:e, score:Math.min(score, 1) };
    }).sort((a,b) => b.score - a.score);
    const top = scores[0];
    const candidates = scores.filter(x => x.score >= .32).slice(0,3).map(x => x.event);
    if (top && top.score >= .68) return { event:top.event, candidates, confidence:top.score };
    if (entry.mode === 'prep') {
      const temp = createTempEvent(entry, 3);
      return { event:temp, candidates:[temp], confidence:.62 };
    }
    if (entry.mode === 'onsite' && !candidates.length) {
      const temp = createTempEvent(entry, 3);
      return { event:temp, candidates:[temp], confidence:.58 };
    }
    return { event:null, candidates, confidence:top?.score || 0 };
  }

  function createTempEvent(entry, level){
    const title = entry.mode === 'prep' ? `${entry.date} 準備` : `${entry.date} 現地メモ`;
    const temp = {
      id:id('evt'),
      title,
      type:'other',
      level,
      startDate:entry.date,
      endDate:entry.date,
      startTime:'',
      endTime:'',
      location:entry.location || '',
      memo:'自動作成された仮出来事。あとで予定化・統合できます。',
      status:'temporary',
      source:'auto',
      prep: level >= 3 ? [] : [],
      records:[],
      improvements:[]
    };
    state.events.push(temp);
    return temp;
  }

  function tokenize(text){
    return String(text || '').split(/[\\s/・,、。｜|]+/).filter(Boolean).slice(0, 12);
  }

  function addCheck(entry, candidates){
    state.checks.unshift({
      id:id('chk'),
      entry,
      candidateIds:(candidates || []).map(e => e.id),
      createdAt:new Date().toISOString(),
      reason:'自動紐付けに迷ったもの'
    });
    save();
  }

  function renderChecks(){
    layout(`
      <main class="screen active">
        <div class="page-head">
          <div><h1>要確認</h1><p>全部整理する場所ではなく、迷った少数だけ。</p></div>
          <button class="pill-btn green" data-action="openAdd" data-mode="memo">メモ</button>
        </div>
        <div class="item-list">
          ${state.checks.length ? state.checks.map(checkRow).join('') : `<div class="empty">要確認はありません。<br>自動で紐付けできなかったものだけ、ここに来ます。</div>`}
        </div>
      </main>
    `);
  }

  function checkRow(c){
    const candidates = c.candidateIds.map(eid => state.events.find(e => e.id === eid)).filter(Boolean);
    return `
      <article class="row" style="display:block">
        <div class="row-main">
          <strong>${esc(c.entry.title || c.entry.mode)}</strong>
          <small>${esc(c.entry.date || '')} / ${esc(c.entry.mode)} / ${esc(c.reason || '')}</small>
          ${c.entry.text ? `<p>${esc(c.entry.text)}</p>` : ''}
        </div>
        <div class="btn-row">
          ${candidates.map(e => `<button class="btn primary" data-action="attachCheck" data-id="${esc(c.id)}" data-event-id="${esc(e.id)}">${esc(e.title)}</button>`).join('')}
          <button class="btn warn" data-action="makeCheckEvent" data-id="${esc(c.id)}">新規出来事</button>
          <button class="btn danger" data-action="deleteCheck" data-id="${esc(c.id)}">捨てる</button>
        </div>
      </article>
    `;
  }

  function attachCheck(checkId, eventId){
    const check = state.checks.find(c => c.id === checkId);
    const event = state.events.find(e => e.id === eventId);
    if (!check || !event) return;
    attachEntryToEvent(check.entry, event, .75);
    state.checks = state.checks.filter(c => c.id !== checkId);
    save();
    toast('紐付けました');
  }

  function attachEntryToEvent(entry, event, confidence){
    if (entry.mode === 'prep') {
      event.prep.push({ id:id('prep'), group:entry.group || '準備', text:entry.title + (entry.text ? `：${entry.text}` : ''), done:false });
    } else {
      event.records.unshift({ id:id('rec'), entry:entry.entry || 'メモ', text:entry.title + (entry.text ? `\n${entry.text}` : ''), date:entry.date || today(), time:entry.time || nowTime(), location:entry.location || '', confidence, source:'check' });
    }
  }

  function makeCheckEvent(checkId){
    const check = state.checks.find(c => c.id === checkId);
    if (!check) return;
    const e = createTempEvent(check.entry, check.entry.mode === 'memo' ? 2 : 3);
    attachEntryToEvent(check.entry, e, .55);
    state.checks = state.checks.filter(c => c.id !== checkId);
    state.activeEventId = e.id;
    state.screen = 'detail';
    save();
    toast('新規出来事にしました');
  }

  function renderDetail(){
    const e = activeEvent();
    if (!e) return renderHome();
    const openPrep = e.prep.filter(p => !p.done).length;
    layout(`
      <main class="screen active">
        <div class="detail-title">
          <div>
            <h1>${esc(e.title)}</h1>
            <p style="margin-top:6px;color:var(--muted);font-size:12px;font-weight:800">${esc(typeLabel(e.type))} / Lv.${e.level} ${esc(levelLabel(e.level))} / ${esc(dateLabel(e))}</p>
          </div>
          <button class="icon-btn" data-action="go" data-screen="calendar">戻る</button>
        </div>
        <div class="tabs">
          ${detailTab('summary','概要')}
          ${detailTab('prep',`準備${openPrep}`)}
          ${detailTab('records',`記録${e.records.length}`)}
          ${detailTab('improve',`改善${e.improvements.length}`)}
          ${detailTab('edit','編集')}
        </div>
        ${detailBody(e)}
      </main>
    `);
  }

  function detailTab(tab, label){
    return `<button class="${state.activeDetailTab === tab ? 'active' : ''}" data-action="detailTab" data-tab="${tab}">${label}</button>`;
  }

  function detailBody(e){
    const tab = state.activeDetailTab;
    if (tab === 'prep') return detailPrep(e);
    if (tab === 'records') return detailRecords(e);
    if (tab === 'improve') return detailImprove(e);
    if (tab === 'edit') return detailEdit(e);
    return detailSummary(e);
  }

  function detailSummary(e){
    return `
      <section class="hero">
        <div class="row-main">
          <strong>${esc(e.location || '場所未定')}</strong>
          <small>${esc(dateLabel(e))}</small>
          ${e.memo ? `<p>${esc(e.memo)}</p>` : ''}
        </div>
        <div class="btn-row">
          <button class="btn primary" data-action="openAddForEvent" data-mode="prep" data-id="${esc(e.id)}">準備を追加</button>
          <button class="btn primary" data-action="openAddForEvent" data-mode="onsite" data-id="${esc(e.id)}">現地記録</button>
          <button class="btn" data-action="openAddForEvent" data-mode="memo" data-id="${esc(e.id)}">メモ</button>
        </div>
      </section>
      <section class="section">
        <div class="section-title"><h2>中身</h2><small>軽い予定は軽く、深い予定だけ展開</small></div>
        <div class="counts">
          <button class="count-tile" data-action="detailTab" data-tab="prep"><b>${e.prep.length}</b><small>準備</small></button>
          <button class="count-tile" data-action="detailTab" data-tab="records"><b>${e.records.length}</b><small>記録</small></button>
          <button class="count-tile" data-action="detailTab" data-tab="improve"><b>${e.improvements.length}</b><small>改善</small></button>
        </div>
      </section>
    `;
  }

  function detailPrep(e){
    return `
      <section class="section">
        <div class="section-title"><h2>準備</h2><button class="pill-btn green" data-action="openAddForEvent" data-mode="prep" data-id="${esc(e.id)}">追加</button></div>
        <div class="item-list">${e.prep.length ? e.prep.map(p => `
          <div class="row compact">
            <span class="row-main"><strong>${esc(p.text)}</strong><small>${esc(p.group || '準備')}</small></span>
            <button class="badge ${p.done ? 'muted' : 'warn'}" data-action="togglePrep" data-event-id="${esc(e.id)}" data-id="${esc(p.id)}">${p.done ? '済' : '未'}</button>
          </div>`).join('') : `<div class="empty">準備はありません。</div>`}
        </div>
      </section>
    `;
  }

  function detailRecords(e){
    return `
      <section class="section">
        <div class="section-title"><h2>記録</h2><button class="pill-btn green" data-action="openAddForEvent" data-mode="onsite" data-id="${esc(e.id)}">追加</button></div>
        <div class="item-list">${e.records.length ? e.records.map(r => `
          <div class="row" style="display:block">
            <div class="row-main">
              <strong>${esc(r.entry || 'メモ')}</strong>
              <small>${esc(r.date || '')} ${esc(r.time || '')}${r.location ? ' / ' + esc(r.location) : ''}</small>
              <p>${esc(r.text || '')}</p>
            </div>
            <div class="btn-row"><button class="btn" data-action="recordToImprove" data-event-id="${esc(e.id)}" data-id="${esc(r.id)}">改善へ</button></div>
          </div>`).join('') : `<div class="empty">記録はありません。</div>`}
        </div>
      </section>
    `;
  }

  function detailImprove(e){
    return `
      <section class="section">
        <div class="section-title"><h2>改善</h2><button class="pill-btn green" data-action="addImprove" data-event-id="${esc(e.id)}">追加</button></div>
        <div class="item-list">${e.improvements.length ? e.improvements.map(im => `
          <div class="row compact">
            <span class="row-main"><strong>${esc(im.text)}</strong><small>${esc(im.date || '')}</small></span>
            <button class="badge ${im.done ? 'muted' : 'warn'}" data-action="toggleImprove" data-event-id="${esc(e.id)}" data-id="${esc(im.id)}">${im.done ? '反映済' : '未反映'}</button>
          </div>`).join('') : `<div class="empty">改善はありません。</div>`}
        </div>
      </section>
    `;
  }

  function detailEdit(e){
    return `
      <form class="form" data-edit-event data-id="${esc(e.id)}">
        <input name="title" value="${esc(e.title)}" placeholder="予定名">
        <div class="form-grid">
          <input name="startDate" type="date" value="${esc(e.startDate)}">
          <input name="endDate" type="date" value="${esc(e.endDate)}">
        </div>
        <div class="form-grid">
          <select name="type">${['normal','work','hospital','payment','family','pet','shopping','car','camp','walk','travel','picnic','event','other'].map(t => `<option value="${t}" ${e.type === t ? 'selected' : ''}>${typeLabel(t)}</option>`).join('')}</select>
          <select name="level">${[1,2,3,4].map(n => `<option value="${n}" ${Number(e.level) === n ? 'selected' : ''}>Lv.${n} ${levelLabel(n)}</option>`).join('')}</select>
        </div>
        <input name="location" value="${esc(e.location)}" placeholder="場所">
        <textarea name="memo" placeholder="メモ">${esc(e.memo)}</textarea>
        <button class="btn primary" type="submit">更新</button>
      </form>
    `;
  }

  function renderMore(){
    const backup = JSON.stringify({ ...state, toast:'' }, null, 2);
    layout(`
      <main class="screen active">
        <div class="page-head"><div><h1>控え</h1><p>ローカル保存。Google連携は後工程。</p></div></div>
        <section class="section">
          <button class="row" data-action="copyBackup"><span class="row-main"><strong>バックアップをコピー</strong><small>更新前の控え</small></span><span class="badge">コピー</span></button>
          <button class="row" data-action="importBackup"><span class="row-main"><strong>バックアップを読み込む</strong><small>貼り付けて復旧</small></span><span class="badge">復旧</span></button>
          <button class="row" data-action="copyStatus"><span class="row-main"><strong>状態をコピー</strong><small>予定 ${state.events.length} / 要確認 ${state.checks.length}</small></span><span class="badge">状態</span></button>
        </section>
      </main>
    `);
  }

  function renderAddScreen(){
    layout(`
      <main class="screen active">
        <div class="page-head"><div><h1>追加</h1><p>予定・準備・現地・実績・メモのどこからでも始める。</p></div></div>
        ${addForm()}
      </main>
    `);
  }

  function render(){
    state = normalize(state);
    if (state.screen === 'calendar') return renderCalendar();
    if (state.screen === 'add') return renderAddScreen();
    if (state.screen === 'checks') return renderChecks();
    if (state.screen === 'detail') return renderDetail();
    if (state.screen === 'more') return renderMore();
    return renderHome();
  }

  function formatJPDate(iso){
    const d = dateObj(iso);
    return `${d.getMonth()+1}/${d.getDate()} ${['日','月','火','水','木','金','土'][d.getDay()]}`;
  }

  async function copy(text, msg){
    try { await navigator.clipboard.writeText(text); toast(msg || 'コピーしました'); }
    catch(e) { prompt('コピーしてください', text); }
  }

  document.addEventListener('submit', (e) => {
    const add = e.target.closest('[data-add-form]');
    if (add) {
      e.preventDefault();
      submitAdd(add);
      return;
    }
    const edit = e.target.closest('[data-edit-event]');
    if (edit) {
      e.preventDefault();
      const event = state.events.find(x => x.id === edit.dataset.id);
      if (!event) return;
      const data = Object.fromEntries(new FormData(edit).entries());
      Object.assign(event, {
        title:data.title || event.title,
        type:data.type || event.type,
        level:Number(data.level || event.level),
        startDate:data.startDate || event.startDate,
        endDate:data.endDate || data.startDate || event.endDate,
        location:data.location || '',
        memo:data.memo || ''
      });
      save();
      toast('更新しました');
    }
  });

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;

    if (action === 'go') return go(el.dataset.screen);
    if (action === 'openAdd') return openAdd(el.dataset.mode || 'event');
    if (action === 'closeAdd') return closeAdd();
    if (action === 'setAddMode') {
      state.addMode = el.dataset.mode || 'event';
      save();
      const sheetOpen = Boolean(document.querySelector('[data-add-sheet]')?.classList.contains('show'));
      render();
      if (sheetOpen) {
        document.querySelector('[data-sheet-backdrop]')?.classList.add('show');
        document.querySelector('[data-add-sheet]')?.classList.add('show');
      }
      return;
    }
    if (action === 'moveMonth') {
      const [y,m] = state.month.split('-').map(Number);
      const d = new Date(y, m-1 + Number(el.dataset.delta || 0), 1);
      state.month = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      save();
      return renderCalendar();
    }
    if (action === 'selectDate') {
      state.selectedDate = el.dataset.date;
      save();
      return renderCalendar();
    }
    if (action === 'openEvent') {
      state.activeEventId = el.dataset.id;
      state.activeDetailTab = 'summary';
      state.screen = 'detail';
      save();
      return renderDetail();
    }
    if (action === 'detailTab') {
      state.activeDetailTab = el.dataset.tab || 'summary';
      save();
      return renderDetail();
    }
    if (action === 'openAddForEvent') {
      state.activeEventId = el.dataset.id || state.activeEventId;
      openAdd(el.dataset.mode || 'memo');
      const form = document.querySelector('[data-add-form]');
      const select = form?.querySelector('select[name="eventId"]');
      if (select) select.value = state.activeEventId;
      return;
    }
    if (action === 'togglePrep') {
      const event = state.events.find(x => x.id === el.dataset.eventId);
      const prep = event?.prep.find(x => x.id === el.dataset.id);
      if (prep) prep.done = !prep.done;
      save();
      return renderDetail();
    }
    if (action === 'addImprove') {
      const event = state.events.find(x => x.id === el.dataset.eventId);
      const text = prompt('改善メモ', '次回に活かす');
      if (event && text) {
        event.improvements.unshift({ id:id('imp'), text, done:false, date:today() });
        save();
        renderDetail();
      }
      return;
    }
    if (action === 'toggleImprove') {
      const event = state.events.find(x => x.id === el.dataset.eventId);
      const im = event?.improvements.find(x => x.id === el.dataset.id);
      if (im) im.done = !im.done;
      save();
      return renderDetail();
    }
    if (action === 'recordToImprove') {
      const event = state.events.find(x => x.id === el.dataset.eventId);
      const rec = event?.records.find(x => x.id === el.dataset.id);
      if (event && rec) {
        event.improvements.unshift({ id:id('imp'), text:rec.text.slice(0,120), done:false, date:today() });
        state.activeDetailTab = 'improve';
        save();
        toast('改善へ追加');
      }
      return;
    }
    if (action === 'attachCheck') return attachCheck(el.dataset.id, el.dataset.eventId);
    if (action === 'makeCheckEvent') return makeCheckEvent(el.dataset.id);
    if (action === 'deleteCheck') {
      const c = state.checks.find(x => x.id === el.dataset.id);
      if (c) state.trash.unshift(c);
      state.checks = state.checks.filter(x => x.id !== el.dataset.id);
      save();
      return toast('削除控えへ');
    }
    if (action === 'copyBackup') return copy(JSON.stringify({ ...state, toast:'' }, null, 2), 'バックアップをコピー');
    if (action === 'importBackup') {
      const raw = prompt('バックアップを貼り付け');
      if (!raw) return;
      try {
        state = normalize(JSON.parse(raw));
        save();
        toast('読み込みました');
      } catch(err) {
        toast('読み込めません');
      }
      return;
    }
    if (action === 'copyStatus') {
      return copy(`OUTBASE v144\n予定:${state.events.length}\n要確認:${state.checks.length}\n画面:${screenNames[state.screen]}`, '状態をコピー');
    }
  });

  render();
})();
