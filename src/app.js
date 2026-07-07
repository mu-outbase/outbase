(() => {
  'use strict';
  const VERSION = 'outbase-one-shot-full-20260707';
  const STORAGE_KEY = 'outbase_one_shot_full_state';
  const app = document.getElementById('app');
  const mediaInput = document.getElementById('mediaInput');
  const importInput = document.getElementById('importInput');

  const pad = (n) => String(n).padStart(2, '0');
  const today = () => new Date().toISOString().slice(0, 10);
  const nowTime = () => new Date().toLocaleTimeString('ja-JP', { hour:'2-digit', minute:'2-digit' });
  const uid = (p='id') => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  const dateObj = (iso) => { const [y,m,d] = String(iso || today()).split('-').map(Number); return new Date(y,(m||1)-1,d||1); };
  const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const addDays = (iso, days) => { const d = dateObj(iso); d.setDate(d.getDate()+days); return isoDate(d); };
  const monthKey = (iso) => String(iso || today()).slice(0,7);
  const h = (v) => String(v ?? '').replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const yen = (n) => n ? `${Number(n).toLocaleString('ja-JP')}円` : '未入力';
  const typeLabel = (t) => ({camp:'キャンプ',walk:'散歩',outing:'外出',normal:'予定',work:'仕事',hospital:'病院',payment:'支払い',pet:'ペット',car:'車',travel:'旅行'}[t] || t || '予定');
  const recLabel = (t) => ({photo:'写真',video:'動画',voice:'音声メモ',memo:'メモ',gps:'位置',poop:'💩',water:'💧',friend:'犬友達',spot:'スポット',setup:'設営撤収',weather:'天気',import:'取込',meal:'料理',gear:'ギア'}[t] || t);
  const toast = (msg) => { state.toast = msg; render(); setTimeout(() => { if (state.toast === msg) { state.toast = ''; render(); } }, 1700); };
  const clone = (x) => JSON.parse(JSON.stringify(x));

  const defaultPrep = (projectId, type='camp') => {
    const common = [
      ['天気','14日前から天気・風・気温を確認','要確認'],['ルート','出発時間・休憩・買い出し場所を確認','未'],['コタ','水・フード・カート・暑さ対策','未']
    ];
    const camp = [
      ['買い物','肉・野菜・朝食・飲み物・氷','未'],['料理','夜・朝・軽食・片付けまで決める','未'],['ギア','幕・寝具・照明・電源・空調・乾燥','未'],['設営','レイアウト・風向き・ペットエリア','未'],['思い出','撮りたい場面・残したいことを決める','未']
    ];
    const walk = [['散歩','ハーネス・水・袋・休憩地点','未'],['場所','車/徒歩・駐車場・日陰・犬可','要確認']];
    const arr = type === 'walk' ? [...walk, ...common.slice(0,1)] : [...camp, ...common];
    return arr.map(([group,text,status]) => ({ id: uid('prep'), projectId, group, text, status, done:false, source:'auto' }));
  };

  const DEFAULT = () => {
    const p1 = uid('project');
    const p2 = uid('project');
    return {
      version: VERSION,
      view: 'home',
      section: 'main',
      activeProjectId: p1,
      selectedDate: today(),
      calendarMonth: monthKey(today()),
      toast: '',
      modal: null,
      projects: [
        { id:p1, title:'赤城山キャンプ', type:'camp', status:'準備中', level:4, start:addDays(today(), 12), end:addDays(today(),13), place:'スノーピーク赤城山CF', site:'未設定', people:['ムー','リン'], pets:['コタ'], cost:{stay:0,food:0,road:0,fuel:0}, notes:'キャンプ前・現地・帰宅後をOUTBASEで回す', goals:['忘れ物を減らす','現地3秒記録','帰宅後に次回改善'] },
        { id:p2, title:'コタ散歩候補探し', type:'walk', status:'候補', level:3, start:addDays(today(), 3), end:addDays(today(),3), place:'柏から車40分圏内', site:'', people:['ムー'], pets:['コタ'], cost:{}, notes:'日陰・駐車場・犬可を優先', goals:['犬友達','スポット','💩/💧記録'] }
      ],
      prep: [],
      records: [
        { id:uid('rec'), projectId:p1, type:'memo', text:'初回は、出発前チェック→設営ログ→思い出レビューまで通す。', at:new Date().toISOString(), date:today(), time:nowTime(), location:null, media:[] }
      ],
      places: [
        { id:uid('place'), name:'スノーピーク赤城山CF', kind:'キャンプ場', area:'群馬県 前橋市', dog:'犬可', water:'温水/乾燥サービス確認', view:'高原・涼しい', score:{dog:5,view:4,summer:5,facility:4}, notes:'梅雨時期・乾燥サービス・直営の安心感。', favorite:true, photos:[] },
        { id:uid('place'), name:'近場散歩候補', kind:'散歩スポット', area:'柏から車40分', dog:'犬向け条件確認', water:'水場/日陰確認', view:'公園・湖・道の駅', score:{dog:4,view:3,summer:3,facility:3}, notes:'駐車場、日陰、休憩、混雑を要確認。', favorite:true, photos:[] }
      ],
      gear: [
        { id:uid('gear'), name:'リビングシェル アイボリー', category:'幕', qty:1, status:'主力', favorite:true, lastUsed:'', cost:0, notes:'寝室・リビング構成の中心' },
        { id:uid('gear'), name:'EcoFlow DELTA 3 1500', category:'電源', qty:1, status:'充電確認', favorite:true, lastUsed:'', cost:0, notes:'WAVE/冷蔵/照明' },
        { id:uid('gear'), name:'AirBuggy Dome3 Large', category:'コタ', qty:1, status:'忘れない', favorite:true, lastUsed:'', cost:0, notes:'暑さ・移動・休憩用' }
      ],
      meals: [
        { id:uid('meal'), name:'ガーリックシュリンプ', timing:'夜', rating:0, ingredients:['ブラックタイガー','にんにく','オリーブオイル','バター','レモン'], notes:'バケットなしでも量を調整' },
        { id:uid('meal'), name:'手作りピザ', timing:'夜', rating:0, ingredients:['ピザ生地','チーズ','ソース','具材'], notes:'ピザ生地は作る' },
        { id:uid('meal'), name:'ホットサンド', timing:'朝', rating:0, ingredients:['食パン','具材','チーズ'], notes:'朝は軽く' }
      ],
      setupSteps: [
        '家出発','休憩/買い出し','キャンプ場到着','受付開始','受付完了','サイト到着','レイアウト考察','レイアウト決定','荷下ろし開始','荷下ろし完了','設営開始','幕完了','寝室完了','キッチン完了','電源/空調完了','ペットエリア完了','設営完了','撤収開始','乾燥待ち','テント撤収','車載完了','チェックアウト','帰宅'
      ],
      weather: [],
      checks: [],
      imports: [],
      friends: [],
      settings: { chappyTone:'実用優先', familyShare:false, photosMode:'Google Photos URL/端末添付', user:'ムー' }
    };
  };

  let state = load();
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return normalize(parsed);
      }
    } catch (e) {}
    const s = DEFAULT();
    s.projects.forEach(p => { s.prep.push(...defaultPrep(p.id, p.type)); });
    return s;
  }
  function normalize(s) {
    const d = DEFAULT();
    const merged = { ...d, ...s };
    ['projects','prep','records','places','gear','meals','weather','checks','imports','friends'].forEach(k => { if (!Array.isArray(merged[k])) merged[k] = []; });
    if (!merged.activeProjectId || !merged.projects.some(p => p.id === merged.activeProjectId)) merged.activeProjectId = merged.projects[0]?.id || '';
    if (!merged.selectedDate) merged.selectedDate = today();
    if (!merged.calendarMonth) merged.calendarMonth = monthKey(today());
    if (!merged.setupSteps?.length) merged.setupSteps = d.setupSteps;
    return merged;
  }
  function save() { state.version = VERSION; localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function activeProject() { return state.projects.find(p => p.id === state.activeProjectId) || state.projects[0]; }
  function projectById(id) { return state.projects.find(p => p.id === id); }
  function projectDate(p) { return p?.start || ''; }
  function daysToProject(p) { if (!p?.start) return null; return Math.ceil((dateObj(p.start)-dateObj(today()))/86400000); }
  function projectPrep(p) { return state.prep.filter(x => x.projectId === p?.id); }
  function projectRecords(p) { return state.records.filter(x => x.projectId === p?.id).sort((a,b) => String(b.at).localeCompare(String(a.at))); }
  function progressFor(p) { const arr = projectPrep(p); if (!arr.length) return 0; return Math.round(arr.filter(x => x.done).length / arr.length * 100); }
  function grouped(arr, key) { return arr.reduce((m,x) => { const k = x[key] || 'その他'; (m[k] ||= []).push(x); return m; }, {}); }

  function render() {
    save();
    const p = activeProject();
    app.innerHTML = `${renderTopbar(p)}${renderPlanChip(p)}${renderBody()}${renderBottomNav()}${state.toast ? `<div class="toast">${h(state.toast)}</div>` : ''}${state.modal ? renderModal() : ''}`;
  }

  function renderTopbar(p) {
    const d = daysToProject(p);
    const label = d === null ? '日付未設定' : d === 0 ? '今日' : d > 0 ? `${d}日前` : `${Math.abs(d)}日経過`;
    return `<header class="topbar">
      <button class="brand" data-action="go" data-view="home" aria-label="ホームへ">
        <div class="logo">OB</div><div><div class="brand-title">OUTBASE</div><div class="brand-sub">体験を資産化する</div></div>
      </button>
      <button class="status-pill" data-action="open-project-switch">${h(label)}</button>
    </header>`;
  }
  function renderPlanChip(p) {
    if (!p) return '';
    return `<button class="plan-chip" data-action="open-project-switch">
      <span class="label">現在</span>
      <strong>${h(p.title)}</strong>
      <small>${h(typeLabel(p.type))} / ${h(p.place || '場所未設定')} / ${h(p.start || '日付なし')}</small>
      <i>切替</i>
    </button>`;
  }
  function renderBody() {
    return ({home:renderHome,plans:renderPlans,search:renderSearch,prep:renderPrep,add:renderAdd,memories:renderMemories}[state.view] || renderHome)();
  }
  function renderBottomNav() {
    const items = [['plans','予定'],['search','探す'],['prep','準備'],['add','＋'],['memories','思い出']];
    return `<nav class="bottom-nav">${items.map(([v,l]) => `<button class="nav-btn ${state.view===v?'active':''}" data-action="go" data-view="${v}"><span class="${v==='add'?'nav-plus':''}">${l}</span></button>`).join('')}</nav>`;
  }

  function renderHome() {
    const p = activeProject();
    const recs = projectRecords(p).slice(0,3);
    const tasks = todayTasks(p);
    const nexts = state.projects.slice().sort((a,b) => String(a.start||'9999').localeCompare(String(b.start||'9999'))).slice(0,4);
    return `<main class="stack">
      <section class="hero">
        <div class="hero-kicker">${h(typeLabel(p.type))} / ${h(p.status)}</div>
        <h1>今日は何する？</h1>
        <p>${h(p.title)}を、準備・現地記録・思い出・次回改善まで一本で回す。</p>
        <div class="hero-actions"><button class="btn primary" data-action="go" data-view="add">現地3秒記録</button><button class="btn" data-action="go" data-view="prep">準備を見る</button></div>
      </section>
      <section class="card"><div class="card-inner">
        <div class="card-header"><div><div class="eyebrow">次の行動</div><h2 class="card-title">開く理由があるホーム</h2></div><span class="tag light">${progressFor(p)}%</span></div>
        <div class="metric-row"><div class="metric"><small>現在プラン</small><strong>${h(p.title)}</strong></div><div class="metric"><small>予定日</small><strong>${h(p.start || '日付未設定')}</strong></div><div class="metric"><small>場所</small><strong>${h(p.place || '未設定')}</strong></div><div class="metric"><small>記録</small><strong>${projectRecords(p).length}件</strong></div></div>
        <div class="progress"><span style="width:${progressFor(p)}%"></span></div>
      </div></section>
      <section class="card"><div class="card-inner"><div class="card-header"><div><div class="eyebrow">今日やる3つ</div><h2 class="card-title">迷わないための確認</h2></div><button class="btn ghost" data-action="generate-prep">不足補完</button></div><div class="list">${tasks.map(t => renderTaskItem(t)).join('')}</div></div></section>
      <section class="card"><div class="card-inner"><div class="card-header"><div><div class="eyebrow">高機能カレンダー</div><h2 class="card-title">予定と体験をまとめる</h2></div><button class="btn ghost" data-action="go" data-view="plans">開く</button></div>${renderMiniCalendar()}</div></section>
      <section class="card"><div class="card-inner"><div class="card-header"><div><div class="eyebrow">最近の記録</div><h2 class="card-title">あとで資産になる素材</h2></div><button class="btn ghost" data-action="go" data-view="memories">整理</button></div>${recs.length ? `<div class="timeline">${recs.map(renderRecord).join('')}</div>` : `<div class="empty">まだ記録がない。現地3秒記録から写真・音声・位置・メモを残せる。</div>`}</div></section>
      ${renderChappyCard(p)}
    </main>`;
  }
  function todayTasks(p) {
    const arr = projectPrep(p).filter(x => !x.done).slice(0,3);
    if (arr.length) return arr;
    return [{id:'review', group:'レビュー', text:'記録を見返して次回改善を1つ残す', done:false, projectId:p?.id}];
  }
  function renderTaskItem(x) {
    return `<button class="item ${x.done?'done':''}" data-action="toggle-prep" data-id="${h(x.id)}"><span class="item-left"><span class="checkmark">${x.done?'✓':''}</span><span class="item-main"><span class="item-title">${h(x.text)}</span><span class="item-sub">${h(x.group || '確認')} / ${h(x.status || '未')}</span></span></span><span class="tag light">${x.done?'完了':'未'}</span></button>`;
  }
  function renderMiniCalendar() {
    const month = state.calendarMonth || monthKey(today());
    const items = state.projects.filter(p => String(p.start||'').startsWith(month)).slice(0,4);
    return `<div class="day-list">${items.length ? items.map(p => `<button class="date-card" data-action="select-project" data-id="${p.id}"><span>${h(String(p.start).slice(5).replace('-','/'))}</span><strong>${h(p.title)}</strong><small>${h(typeLabel(p.type))} / ${h(p.place || '')}</small></button>`).join('') : `<div class="empty">この月の予定はまだない。予定画面から追加できる。</div>`}</div>`;
  }

  function renderPlans() {
    const p = activeProject();
    return `<main class="stack">
      <section class="card"><div class="card-inner"><div class="card-header"><div><div class="eyebrow">予定</div><h2 class="card-title">全予定カレンダー</h2></div><button class="btn primary" data-action="open-modal" data-modal="project">予定追加</button></div>${renderCalendar()}<div class="divider"></div><div class="day-list">${state.projects.filter(x => x.start === state.selectedDate).map(renderProjectRow).join('') || `<div class="empty">${h(state.selectedDate)} の予定はまだない。</div>`}</div></div></section>
      <section class="card"><div class="card-inner"><div class="card-header"><div><div class="eyebrow">主役プラン</div><h2 class="card-title">${h(p.title)}</h2></div><span class="tag">${h(typeLabel(p.type))}</span></div>${renderProjectDetail(p)}</div></section>
      <section class="card"><div class="card-inner"><div class="card-header"><div><div class="eyebrow">日付未設定</div><h2 class="card-title">候補・未確定</h2></div></div><div class="day-list">${state.projects.filter(x => !x.start).map(renderProjectRow).join('') || `<div class="empty">日付未設定の予定はない。</div>`}</div></div></section>
    </main>`;
  }
  function renderCalendar() {
    const [yy,mm] = String(state.calendarMonth || monthKey(today())).split('-').map(Number);
    const first = new Date(yy, mm-1, 1);
    const last = new Date(yy, mm, 0);
    const prev = isoDate(new Date(yy, mm-2, 1)).slice(0,7);
    const next = isoDate(new Date(yy, mm, 1)).slice(0,7);
    const blanks = Array.from({length:first.getDay()}, (_,i) => `<div class="day empty" aria-hidden="true"></div>`);
    const days = Array.from({length:last.getDate()}, (_,i) => {
      const iso = `${yy}-${pad(mm)}-${pad(i+1)}`;
      const items = state.projects.filter(p => p.start === iso);
      const cls = ['day', iso===today()?'today':'', iso===state.selectedDate?'selected':'', items.length?'has':''].join(' ');
      return `<button class="${cls}" data-action="select-date" data-date="${iso}"><span class="num">${i+1}</span><span class="dots">${items.slice(0,3).map(p => `<i class="${p.type==='camp'?'camp':p.type==='walk'?'walk':'normal'}"></i>`).join('')}${items.length>3?'<i class="warn"></i>':''}</span>${items[0]?`<small>${h(items[0].title.slice(0,5))}</small>`:''}</button>`;
    });
    return `<div class="calendar-toolbar"><button class="btn ghost" data-action="month" data-month="${prev}">前</button><div class="month-label">${yy}年 ${mm}月</div><button class="btn ghost" data-action="month" data-month="${next}">次</button></div><div class="weekdays">${['日','月','火','水','木','金','土'].map(x=>`<span>${x}</span>`).join('')}</div><div class="calendar-grid">${[...blanks,...days].join('')}</div>`;
  }
  function renderProjectRow(p) {
    return `<button class="date-card" data-action="select-project" data-id="${p.id}"><span>${h((p.start||'--').slice(5).replace('-','/'))}</span><strong>${h(p.title)}</strong><small>${h(typeLabel(p.type))} / ${h(p.place || '場所未設定')} / ${h(p.status)}</small></button>`;
  }
  function renderProjectDetail(p) {
    if (!p) return `<div class="empty">予定を追加すると、準備・記録・思い出がつながる。</div>`;
    return `<p class="note">${h(p.notes || 'メモなし')}</p><div class="metric-row"><div class="metric"><small>準備</small><strong>${progressFor(p)}%</strong></div><div class="metric"><small>記録</small><strong>${projectRecords(p).length}件</strong></div><div class="metric"><small>費用</small><strong>${yen(Object.values(p.cost||{}).reduce((a,b)=>a+Number(b||0),0))}</strong></div><div class="metric"><small>深さ</small><strong>Lv.${h(p.level || 1)}</strong></div></div><div class="actions"><button class="btn primary" data-action="go" data-view="prep">準備</button><button class="btn" data-action="go" data-view="add">現地記録</button><button class="btn ghost" data-action="export-ics" data-id="${p.id}">ICS</button></div>`;
  }

  function renderSearch() {
    return `<main class="stack">
      <section class="hero"><div class="hero-kicker">探す / 取り込む</div><h1>行きたい場所を資産にする</h1><p>キャンプ場、散歩先、寄り道、予約スクショ、URL、写真を場所カードへまとめる。</p><div class="hero-actions"><button class="btn primary" data-action="open-modal" data-modal="place">場所追加</button><button class="btn" data-action="trigger-import">一括取込</button></div></section>
      <section class="card"><div class="card-inner"><div class="card-header"><div><div class="eyebrow">キャンプ場・場所カード</div><h2 class="card-title">候補と再訪理由</h2></div></div><div class="list">${state.places.map(renderPlace).join('')}</div></div></section>
      <section class="card"><div class="card-inner"><div class="card-header"><div><div class="eyebrow">MAP / 場所記憶</div><h2 class="card-title">ピンではなく場所カードで管理</h2></div><button class="btn ghost" data-action="save-gps">現在地</button></div><div class="map-box"><div class="route-line"></div><div class="map-pin pin1">管理棟</div><div class="map-pin pin2">サイト</div><div class="map-pin pin3">散歩道</div><div class="map-pin pin4">犬友達</div></div></div></section>
      <section class="card"><div class="card-inner"><div class="card-header"><div><div class="eyebrow">Weather Watch</div><h2 class="card-title">天気で予定を守る</h2></div><button class="btn ghost" data-action="open-modal" data-modal="weather">天気記録</button></div>${renderWeatherList()}</div></section>
      <section class="card"><div class="card-inner"><div class="card-header"><div><div class="eyebrow">一括取込</div><h2 class="card-title">入力ではなく候補承認</h2></div></div><form data-form="importText" class="field"><label>予約・購入・天気・メモの貼り付け</label><textarea name="text" placeholder="予約メール、購入履歴、天気メモ、キャンプ場URLなどを貼り付け"></textarea><button class="btn primary" type="submit">候補化</button></form>${renderChecks('import')}</div></section>
    </main>`;
  }
  function renderPlace(x) {
    return `<article class="item"><div class="item-main"><div class="item-title">${h(x.name)}</div><div class="item-sub">${h(x.kind)} / ${h(x.area)} / ${h(x.dog)}</div><div class="place-score"><div class="score-cell"><small>犬</small><strong>${x.score?.dog || '-'}</strong></div><div class="score-cell"><small>景色</small><strong>${x.score?.view || '-'}</strong></div><div class="score-cell"><small>暑さ</small><strong>${x.score?.summer || '-'}</strong></div><div class="score-cell"><small>設備</small><strong>${x.score?.facility || '-'}</strong></div></div></div><button class="tag light" data-action="place-to-project" data-id="${x.id}">予定化</button></article>`;
  }
  function renderWeatherList() {
    const arr = state.weather.slice(-4).reverse();
    return arr.length ? `<div class="list">${arr.map(w => `<div class="item"><div class="item-main"><div class="item-title">${h(w.place)} / ${h(w.date)}</div><div class="item-sub">${h(w.text)}</div></div><span class="tag ${Number(w.risk||0)>60?'warn':'light'}">${h(w.risk||0)}%</span></div>`).join('')}</div>` : `<div class="empty">天気API本接続前でも、スクショ/メモ/手入力を予報履歴として保存できる。</div>`;
  }

  function renderPrep() {
    const p = activeProject();
    const groups = grouped(projectPrep(p), 'group');
    return `<main class="stack">
      <section class="hero"><div class="hero-kicker">準備 / ${h(p?.title || '')}</div><h1>忘れないための準備</h1><p>買い物、料理、ギア、天気、ルート、コタ、設営を、予定に紐づけて残す。</p><div class="hero-actions"><button class="btn primary" data-action="generate-prep">不足補完</button><button class="btn" data-action="open-modal" data-modal="prep">準備追加</button></div></section>
      <section class="card"><div class="card-inner"><div class="card-header"><div><div class="eyebrow">チェックリスト</div><h2 class="card-title">準備進捗 ${progressFor(p)}%</h2></div><span class="tag light">${projectPrep(p).filter(x=>x.done).length}/${projectPrep(p).length}</span></div><div class="progress"><span style="width:${progressFor(p)}%"></span></div><div class="divider"></div>${Object.entries(groups).map(([g,items]) => `<div class="section"><h3 class="section-title">${h(g)}</h3><div class="list">${items.map(renderTaskItem).join('')}</div></div>`).join('') || `<div class="empty">準備項目がない。自動補完で作成できる。</div>`}</div></section>
      <section class="card"><div class="card-inner"><div class="card-header"><div><div class="eyebrow">ギア管理</div><h2 class="card-title">持ち物・使用履歴・忘れ物対策</h2></div><button class="btn ghost" data-action="open-modal" data-modal="gear">ギア追加</button></div>${renderGearList()}</div></section>
      <section class="card"><div class="card-inner"><div class="card-header"><div><div class="eyebrow">料理・買い物</div><h2 class="card-title">献立から買い物へ</h2></div><button class="btn ghost" data-action="open-modal" data-modal="meal">料理追加</button></div>${renderMealList()}<div class="divider"></div>${renderShopping()}</div></section>
      <section class="card"><div class="card-inner"><div class="card-header"><div><div class="eyebrow">設営・撤収ログ</div><h2 class="card-title">単純タイマーではなく工程ログ</h2></div><button class="btn ghost" data-action="go" data-view="add">記録</button></div><p class="note">家出発、受付、サイト到着、レイアウト、荷下ろし、設営、乾燥待ち、車載、帰宅までワンタップで残す。</p></div></section>
    </main>`;
  }
  function renderGearList() {
    return `<div class="list">${state.gear.map(g => `<div class="item"><div class="item-main"><div class="item-title">${h(g.name)}</div><div class="item-sub">${h(g.category)} / ${h(g.status)} / ${g.qty || 1}個 / ${yen(g.cost)}</div></div><button class="tag light" data-action="use-gear" data-id="${g.id}">使用</button></div>`).join('')}</div>`;
  }
  function renderMealList() {
    return `<div class="list">${state.meals.map(m => `<div class="item"><div class="item-main"><div class="item-title">${h(m.name)}</div><div class="item-sub">${h(m.timing)} / ${h((m.ingredients||[]).join('、'))}</div></div><button class="tag light" data-action="meal-record" data-id="${m.id}">作る</button></div>`).join('')}</div>`;
  }
  function renderShopping() {
    const items = [...new Set(state.meals.flatMap(m => m.ingredients || []))];
    return `<h3 class="section-title">買い物候補</h3><div class="chip-row">${items.map(x => `<span class="chip">${h(x)}</span>`).join('')}</div>`;
  }

  function renderAdd() {
    const p = activeProject();
    return `<main class="stack">
      <section class="hero"><div class="hero-kicker">現地3秒 / ${h(p?.title || '')}</div><h1>今これを残す</h1><p>写真、動画、音声メモ、位置、💩/💧、犬友達、スポット、設営撤収を迷わず保存する。</p></section>
      <section class="card"><div class="card-inner"><div class="card-header"><div><div class="eyebrow">3秒操作盤</div><h2 class="card-title">押せば記録になる</h2></div><span class="tag light">${h(typeLabel(p?.type))}</span></div><div class="op-grid">
        <button class="op-tile primary" data-action="trigger-media"><strong>写真 / 動画</strong><small>標準カメラ・端末ファイル</small></button>
        <button class="op-tile" data-action="voice"><strong>音声メモ</strong><small>録音ではなく文字起こし</small></button>
        <button class="op-tile" data-action="quick-memo"><strong>メモ</strong><small>気づいたことだけ</small></button>
        <button class="op-tile" data-action="save-gps"><strong>位置</strong><small>GPS・場所候補</small></button>
        <button class="op-tile" data-action="quick-record" data-type="poop" data-text="コタ 💩"><strong>💩</strong><small>犬ログ</small></button>
        <button class="op-tile" data-action="quick-record" data-type="water" data-text="水分補給"><strong>💧</strong><small>水・休憩</small></button>
        <button class="op-tile" data-action="friend"><strong>犬友達</strong><small>名前不明でもOK</small></button>
        <button class="op-tile" data-action="spot"><strong>スポット</strong><small>管理棟・サイト・景色</small></button>
      </div></div></section>
      <section class="card"><div class="card-inner"><div class="card-header"><div><div class="eyebrow">設営・撤収ログ</div><h2 class="card-title">工程をワンタップ</h2></div></div><div class="chip-row">${state.setupSteps.map(s => `<button class="chip" data-action="setup-log" data-step="${h(s)}">${h(s)}</button>`).join('')}</div></div></section>
      <section class="card"><div class="card-inner"><div class="card-header"><div><div class="eyebrow">入口</div><h2 class="card-title">予定なしでも始められる</h2></div></div><div class="grid2"><button class="btn" data-action="open-modal" data-modal="project">予定から開始</button><button class="btn" data-action="open-modal" data-modal="prep">準備から開始</button><button class="btn" data-action="quick-memo">メモから開始</button><button class="btn" data-action="open-modal" data-modal="past">過去実績</button></div></div></section>
      <section class="card"><div class="card-inner"><div class="card-header"><div><div class="eyebrow">直近記録</div><h2 class="card-title">保存された素材</h2></div></div><div class="timeline">${projectRecords(p).slice(0,8).map(renderRecord).join('') || `<div class="empty">まだ保存がない。</div>`}</div></div></section>
    </main>`;
  }

  function renderMemories() {
    const p = activeProject();
    const recs = projectRecords(p);
    return `<main class="stack">
      <section class="hero"><div class="hero-kicker">思い出 / 改善</div><h1>次回がラクになる記録</h1><p>写真・音声・場所・ギア・料理・天気を、レビューと次回改善へ変える。</p><div class="hero-actions"><button class="btn primary" data-action="make-review">レビュー生成</button><button class="btn" data-action="export-json">バックアップ</button></div></section>
      ${renderChappyCard(p)}
      <section class="card"><div class="card-inner"><div class="card-header"><div><div class="eyebrow">レビュー</div><h2 class="card-title">良かったこと・困ったこと・次回</h2></div><span class="tag light">${recs.length}記録</span></div><div class="list">${reviewItems(p).map(x => `<div class="item"><div class="item-main"><div class="item-title">${h(x.title)}</div><div class="item-sub">${h(x.text)}</div></div><span class="tag ${x.kind==='warn'?'warn':'light'}">${h(x.label)}</span></div>`).join('')}</div></div></section>
      <section class="card"><div class="card-inner"><div class="card-header"><div><div class="eyebrow">タイムライン</div><h2 class="card-title">素材を見返す</h2></div></div><div class="timeline">${state.records.slice().sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,30).map(renderRecord).join('') || `<div class="empty">記録がない。</div>`}</div></div></section>
      <section class="card"><div class="card-inner"><div class="card-header"><div><div class="eyebrow">要確認</div><h2 class="card-title">迷ったものだけ確認</h2></div></div>${renderChecks()}</div></section>
      <section class="card"><div class="card-inner"><div class="card-header"><div><div class="eyebrow">データ管理センター</div><h2 class="card-title">取込・書出し・復元</h2></div></div><div class="grid2"><button class="btn" data-action="trigger-import">ファイル取込</button><button class="btn" data-action="export-json">JSON書出し</button><button class="btn" data-action="copy-summary">共有用まとめ</button><button class="btn ghost" data-action="open-modal" data-modal="restore">復元</button></div><p class="note" style="margin-top:10px">Google Photos/Calendar/天気APIは外部認証前提。OUTBASE側はURL、ICS、履歴、添付、取込候補を保存する。</p></div></section>
    </main>`;
  }
  function renderRecord(r) {
    const p = projectById(r.projectId);
    const media = (r.media||[]).slice(0,4).map(m => m.kind === 'video' ? `<video src="${m.dataUrl}" muted playsinline></video>` : m.dataUrl ? `<img src="${m.dataUrl}" alt="${h(m.name||'media')}" />` : '').join('');
    return `<div class="timeline-item"><div class="time-dot">${h((r.time||'--:--').replace(':',''))}</div><div class="record-box"><div class="item-title">${h(recLabel(r.type))}</div><div class="item-sub">${h(r.text || '')}${p?` / ${h(p.title)}`:''}</div>${media?`<div class="record-media">${media}</div>`:''}</div></div>`;
  }
  function reviewItems(p) {
    const recs = projectRecords(p);
    const prep = projectPrep(p);
    const incomplete = prep.filter(x=>!x.done);
    return [
      {title:'良かったこと', text: recs.length ? `${recs.length}件の素材が残っている。写真・メモ・位置から思い出化できる。` : 'まだ素材が少ない。現地では3秒記録を使う。', label:'記録', kind:'ok'},
      {title:'困ったこと', text: incomplete.length ? `未完了準備が${incomplete.length}件ある。出発前に減らす。` : '未完了準備は少ない。', label:'準備', kind: incomplete.length ? 'warn':'ok'},
      {title:'次回改善', text: chappySuggestions(p)[0] || '次回は記録を1つ残して改善につなげる。', label:'次回', kind:'ok'}
    ];
  }
  function renderChappyCard(p) {
    const suggestions = chappySuggestions(p);
    return `<section class="card"><div class="card-inner"><div class="card-header"><div><div class="eyebrow">チャッピー提案</div><h2 class="card-title">次にやることだけ出す</h2></div><button class="btn ghost" data-action="make-review">更新</button></div><div class="list">${suggestions.map(s => `<div class="item"><div class="item-main"><div class="item-title">${h(s)}</div><div class="item-sub">記録・準備・天気・ギアから生成</div></div></div>`).join('')}</div></div></section>`;
  }
  function chappySuggestions(p) {
    const prep = projectPrep(p); const recs = projectRecords(p); const d = daysToProject(p);
    const s = [];
    if (d !== null && d <= 14 && d >= 0) s.push(`出発まで${d}日。天気・買い出し・ギア乾燥を確認する。`);
    if (prep.filter(x=>!x.done).length) s.push(`未完了準備が${prep.filter(x=>!x.done).length}件。まず「${prep.find(x=>!x.done)?.text}」を片付ける。`);
    if (!recs.some(r=>r.type==='weather')) s.push('天気スクショか予報メモを1つ保存して、Weather Watchに履歴を残す。');
    if (!recs.some(r=>r.type==='setup')) s.push('設営撤収ログを1回通すと、次回の出発逆算に使える。');
    if (state.gear.some(g=>String(g.status).includes('充電'))) s.push('電源・空調・ランタンの充電状態を出発前に確認する。');
    return s.slice(0,4);
  }
  function renderChecks(filter) {
    const arr = state.checks.filter(c => !filter || c.kind === filter).slice().reverse();
    if (!arr.length) return `<div class="empty">要確認はない。判断できないものだけここに出す。</div>`;
    return `<div class="list">${arr.map(c => `<div class="item item-warn"><div class="item-main"><div class="item-title">${h(c.title)}</div><div class="item-sub">${h(c.reason)}</div></div><div class="compact-actions"><button class="tag light" data-action="approve-check" data-id="${c.id}">承認</button><button class="tag warn" data-action="delete-check" data-id="${c.id}">削除</button></div></div>`).join('')}</div>`;
  }

  function renderModal() {
    const m = state.modal;
    const title = ({project:'予定追加',place:'場所追加',prep:'準備追加',gear:'ギア追加',meal:'料理追加',weather:'天気記録',restore:'復元',past:'過去実績',projectSwitch:'プラン切替'})[m] || '入力';
    const body = ({project:formProject,place:formPlace,prep:formPrep,gear:formGear,meal:formMeal,weather:formWeather,restore:formRestore,past:formPast,projectSwitch:formProjectSwitch})[m]?.() || '';
    return `<div class="modal-backdrop" data-action="close-modal"><section class="modal" onclick="event.stopPropagation()"><div class="card-inner"><div class="card-header"><div><div class="eyebrow">OUTBASE</div><h2 class="card-title">${h(title)}</h2></div><button class="btn ghost" data-action="close-modal">閉じる</button></div>${body}</div></section></div>`;
  }
  function formProjectSwitch() { return `<div class="list">${state.projects.map(p => `<button class="item ${p.id===state.activeProjectId?'item-warn':''}" data-action="set-active-project" data-id="${p.id}"><div class="item-main"><div class="item-title">${h(p.title)}</div><div class="item-sub">${h(typeLabel(p.type))} / ${h(p.start || '日付未設定')} / ${h(p.place || '')}</div></div><span class="tag light">選択</span></button>`).join('')}</div><div class="actions"><button class="btn primary" data-action="open-modal" data-modal="project">予定追加</button></div>`; }
  function formProject() { return `<form data-form="project" class="form-grid"><input name="title" placeholder="予定名 例: 赤城山キャンプ" required><div class="form-grid two"><select name="type"><option value="camp">キャンプ</option><option value="walk">散歩</option><option value="outing">外出</option><option value="normal">普通の予定</option><option value="hospital">病院</option><option value="payment">支払い</option><option value="work">仕事</option><option value="car">車</option></select><input name="start" type="date" value="${today()}"></div><input name="place" placeholder="場所"><textarea name="notes" placeholder="メモ・目的・注意点"></textarea><button class="btn primary" type="submit">保存して主役にする</button></form>`; }
  function formPlace() { return `<form data-form="place" class="form-grid"><input name="name" placeholder="場所名" required><div class="form-grid two"><input name="kind" placeholder="キャンプ場/散歩/寄り道"><input name="area" placeholder="エリア"></div><input name="dog" placeholder="犬条件"><textarea name="notes" placeholder="景色、温水、駐車場、日陰、再訪理由"></textarea><button class="btn primary" type="submit">場所カード保存</button></form>`; }
  function formPrep() { return `<form data-form="prep" class="form-grid"><div class="form-grid two"><input name="group" placeholder="分類 例: ギア"><input name="status" placeholder="状態 例: 未"></div><textarea name="text" placeholder="準備すること" required></textarea><button class="btn primary" type="submit">準備に追加</button></form>`; }
  function formGear() { return `<form data-form="gear" class="form-grid"><input name="name" placeholder="ギア名" required><div class="form-grid three"><input name="category" placeholder="分類"><input name="qty" type="number" placeholder="数量"><input name="cost" type="number" placeholder="金額"></div><input name="status" placeholder="状態"><textarea name="notes" placeholder="使用感、乾燥、故障、買替候補"></textarea><button class="btn primary" type="submit">ギア保存</button></form>`; }
  function formMeal() { return `<form data-form="meal" class="form-grid"><input name="name" placeholder="料理名" required><div class="form-grid two"><input name="timing" placeholder="夜/朝/昼"><input name="ingredients" placeholder="材料をカンマ区切り"></div><textarea name="notes" placeholder="量、好み、次回改善"></textarea><button class="btn primary" type="submit">料理保存</button></form>`; }
  function formWeather() { const p=activeProject(); return `<form data-form="weather" class="form-grid"><div class="form-grid two"><input name="place" value="${h(p?.place || '')}" placeholder="場所"><input name="date" type="date" value="${p?.start || today()}"></div><div class="form-grid two"><input name="risk" type="number" placeholder="雨リスク%"><input name="wind" placeholder="風速"></div><textarea name="text" placeholder="天気、気温、風、注意点"></textarea><button class="btn primary" type="submit">Weather Watchに保存</button></form>`; }
  function formRestore() { return `<form data-form="restore" class="form-grid"><textarea name="json" placeholder="OUTBASE JSONバックアップを貼り付け"></textarea><button class="btn danger" type="submit">復元する</button></form>`; }
  function formPast() { return `<form data-form="past" class="form-grid"><input name="title" placeholder="過去実績名" required><div class="form-grid two"><input name="start" type="date" value="${today()}"><input name="place" placeholder="場所"></div><textarea name="notes" placeholder="良かったこと、困ったこと、次回改善"></textarea><button class="btn primary" type="submit">実績として保存</button></form>`; }

  app.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const a = btn.dataset.action;
    if (a === 'go') { state.view = btn.dataset.view; state.modal = null; render(); }
    if (a === 'open-modal') { state.modal = btn.dataset.modal; render(); }
    if (a === 'close-modal') { state.modal = null; render(); }
    if (a === 'month') { state.calendarMonth = btn.dataset.month; render(); }
    if (a === 'select-date') { state.selectedDate = btn.dataset.date; render(); }
    if (a === 'select-project') { state.activeProjectId = btn.dataset.id; const p=activeProject(); state.selectedDate = p.start || state.selectedDate; state.view='plans'; render(); }
    if (a === 'set-active-project') { state.activeProjectId = btn.dataset.id; state.modal = null; toast('主役プランを切替'); render(); }
    if (a === 'toggle-prep') togglePrep(btn.dataset.id);
    if (a === 'generate-prep') generatePrep();
    if (a === 'trigger-media') mediaInput.click();
    if (a === 'trigger-import') importInput.click();
    if (a === 'quick-memo') quickMemo();
    if (a === 'voice') voiceMemo();
    if (a === 'save-gps') saveGps();
    if (a === 'quick-record') saveRecord(btn.dataset.type, btn.dataset.text);
    if (a === 'friend') friendRecord();
    if (a === 'spot') spotRecord();
    if (a === 'setup-log') setupLog(btn.dataset.step);
    if (a === 'use-gear') useGear(btn.dataset.id);
    if (a === 'meal-record') mealRecord(btn.dataset.id);
    if (a === 'place-to-project') placeToProject(btn.dataset.id);
    if (a === 'approve-check') approveCheck(btn.dataset.id);
    if (a === 'delete-check') { state.checks = state.checks.filter(c=>c.id!==btn.dataset.id); toast('要確認を削除'); render(); }
    if (a === 'make-review') { toast('レビューを更新'); render(); }
    if (a === 'export-json') exportJson();
    if (a === 'copy-summary') copySummary();
    if (a === 'export-ics') exportIcs(btn.dataset.id);
    if (a === 'open-project-switch') { state.modal = 'projectSwitch'; render(); }
  });
  app.addEventListener('submit', (e) => {
    const form = e.target.closest('form[data-form]');
    if (!form) return;
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    handleForm(form.dataset.form, data);
  });
  mediaInput.addEventListener('change', async () => { await handleMediaFiles(mediaInput.files); mediaInput.value=''; });
  importInput.addEventListener('change', async () => { await handleImportFiles(importInput.files); importInput.value=''; });

  function handleForm(kind, d) {
    const p = activeProject();
    if (kind === 'project' || kind === 'past') {
      const id = uid('project');
      const proj = { id, title:d.title, type:kind==='past'?'camp':d.type, status:kind==='past'?'実績':'準備中', level:kind==='past'?4:((d.type==='camp'||d.type==='walk')?4:1), start:d.start, end:d.start, place:d.place, site:'', people:['ムー'], pets:d.type==='camp'||d.type==='walk'?['コタ']:[], cost:{}, notes:d.notes, goals:[] };
      state.projects.push(proj); state.prep.push(...defaultPrep(id, proj.type)); state.activeProjectId = id; state.selectedDate = d.start || state.selectedDate; state.view = kind==='past'?'memories':'plans';
      if (kind==='past') saveRecord('memo', `過去実績登録：${d.notes||d.title}`, id);
      toast(kind==='past'?'過去実績を保存':'予定を保存');
    }
    if (kind === 'place') { state.places.push({id:uid('place'),name:d.name,kind:d.kind||'場所',area:d.area,dog:d.dog,water:'',view:'',score:{dog:3,view:3,summer:3,facility:3},notes:d.notes,favorite:true,photos:[]}); toast('場所カードを保存'); }
    if (kind === 'prep') { state.prep.push({id:uid('prep'), projectId:p?.id, group:d.group||'準備', text:d.text, status:d.status||'未', done:false, source:'manual'}); toast('準備を追加'); }
    if (kind === 'gear') { state.gear.push({id:uid('gear'),name:d.name,category:d.category||'未分類',qty:Number(d.qty||1),status:d.status||'登録',favorite:false,lastUsed:'',cost:Number(d.cost||0),notes:d.notes}); toast('ギアを保存'); }
    if (kind === 'meal') { state.meals.push({id:uid('meal'),name:d.name,timing:d.timing||'未定',rating:0,ingredients:String(d.ingredients||'').split(/[、,]/).map(x=>x.trim()).filter(Boolean),notes:d.notes}); toast('料理を保存'); }
    if (kind === 'weather') { state.weather.push({id:uid('weather'),projectId:p?.id,place:d.place,date:d.date,risk:Number(d.risk||0),wind:d.wind,text:d.text,at:new Date().toISOString()}); saveRecord('weather', `${d.place} ${d.date} ${d.text || ''} 雨${d.risk||0}% 風${d.wind||''}`); toast('天気を保存'); }
    if (kind === 'importText') { importText(d.text); }
    if (kind === 'restore') { restoreJson(d.json); return; }
    state.modal = null; render();
  }
  function togglePrep(id) { const x=state.prep.find(p=>p.id===id); if(x){x.done=!x.done; x.status=x.done?'完了':'未'; toast(x.done?'完了':'未完了に戻した'); render();} }
  function generatePrep() { const p=activeProject(); const existing = new Set(projectPrep(p).map(x=>`${x.group}:${x.text}`)); defaultPrep(p.id,p.type).forEach(x=>{ if(!existing.has(`${x.group}:${x.text}`)) state.prep.push(x); }); toast('不足準備を補完'); render(); }
  function saveRecord(type, text, projectId=state.activeProjectId, extra={}) { state.records.push({id:uid('rec'),projectId,type,text,at:new Date().toISOString(),date:today(),time:nowTime(),location:extra.location||null,media:extra.media||[]}); }
  function quickMemo() { const text = prompt('残すメモ'); if(text){ saveRecord('memo', text); toast('メモ保存'); render(); } }
  function voiceMemo() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { const text = prompt('音声認識が使えないため、文字メモとして保存'); if(text){saveRecord('voice', text); toast('音声メモ保存'); render();} return; }
    const rec = new SR(); rec.lang='ja-JP'; rec.interimResults=false; rec.maxAlternatives=1;
    toast('聞き取り中');
    rec.onresult = (ev) => { const text = ev.results[0][0].transcript; saveRecord('voice', text); toast('文字起こし保存'); render(); };
    rec.onerror = () => toast('音声認識に失敗'); rec.start();
  }
  function saveGps() {
    if (!navigator.geolocation) { saveRecord('gps','GPS非対応'); toast('GPS非対応'); render(); return; }
    toast('位置取得中');
    navigator.geolocation.getCurrentPosition(pos => { const loc={lat:pos.coords.latitude,lng:pos.coords.longitude,accuracy:pos.coords.accuracy}; saveRecord('gps',`位置保存 ${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)} / ±${Math.round(loc.accuracy)}m`, state.activeProjectId, {location:loc}); toast('位置保存'); render(); }, () => { saveRecord('gps','位置取得失敗'); toast('位置取得失敗'); render(); }, {enableHighAccuracy:true,timeout:8000});
  }
  function friendRecord() { const text=prompt('犬友達メモ（名前不明OK）','犬種・色・特徴・飼い主さんメモ'); if(text){ state.friends.push({id:uid('friend'),text,projectId:state.activeProjectId,at:new Date().toISOString()}); saveRecord('friend', text); toast('犬友達を保存'); render(); } }
  function spotRecord() { const text=prompt('スポット名・特徴','管理棟 / トイレ / 景色 / 日陰 / 散歩道など'); if(text){ saveRecord('spot', text); toast('スポット保存'); render(); } }
  function setupLog(step) { saveRecord('setup', step); toast(`${step} を保存`); render(); }
  function useGear(id) { const g=state.gear.find(x=>x.id===id); if(g){g.lastUsed=today(); saveRecord('gear', `${g.name} 使用`); toast('ギア使用履歴を保存'); render();} }
  function mealRecord(id) { const m=state.meals.find(x=>x.id===id); if(m){ saveRecord('meal', `${m.name} を作る/作った`); toast('料理記録を保存'); render(); } }
  function placeToProject(id) { const x=state.places.find(p=>p.id===id); if(!x) return; const pid=uid('project'); const proj={id:pid,title:`${x.name}へ行く`,type:x.kind?.includes('散歩')?'walk':'camp',status:'候補',level:3,start:'',end:'',place:x.name,site:'',people:['ムー'],pets:['コタ'],cost:{},notes:x.notes,goals:['犬可確認','天気確認','準備']}; state.projects.push(proj); state.prep.push(...defaultPrep(pid,proj.type)); state.activeProjectId=pid; state.view='plans'; toast('場所から予定候補を作成'); render(); }
  function approveCheck(id) { const c=state.checks.find(x=>x.id===id); if(!c) return; if(c.create==='gear') state.gear.push(c.payload); if(c.create==='place') state.places.push(c.payload); if(c.create==='project') { state.projects.push(c.payload); state.prep.push(...defaultPrep(c.payload.id,c.payload.type)); } saveRecord('import', `候補承認：${c.title}`); state.checks=state.checks.filter(x=>x.id!==id); toast('候補を承認'); render(); }
  async function handleMediaFiles(files) {
    const media=[];
    for (const file of [...files]) {
      const isVideo = file.type.startsWith('video/');
      const item = {name:file.name,type:file.type,size:file.size,kind:isVideo?'video':'photo'};
      if (file.size < 900000) item.dataUrl = await readAsDataURL(file); else item.note = '大容量のためメタ情報のみ保存';
      media.push(item);
    }
    if (media.length) { saveRecord(media.some(m=>m.kind==='video')?'video':'photo', `${media.length}件のメディアを保存`, state.activeProjectId, {media}); toast('メディア保存'); render(); }
  }
  async function handleImportFiles(files) {
    for (const file of [...files]) {
      let text = '';
      if (file.type.startsWith('text/') || /\.(txt|csv|md|json)$/i.test(file.name)) text = await file.text();
      state.imports.push({id:uid('import'),name:file.name,type:file.type,size:file.size,at:new Date().toISOString()});
      importText(text || file.name, file.name);
    }
    toast('ファイルを候補化'); render();
  }
  function readAsDataURL(file) { return new Promise((resolve) => { const r=new FileReader(); r.onload=()=>resolve(r.result); r.onerror=()=>resolve(''); r.readAsDataURL(file); }); }
  function importText(text='', name='貼付') {
    const t = String(text||'').trim(); if(!t) return;
    const lower = t.toLowerCase();
    const checks=[];
    if (/キャンプ|予約|サイト|宿泊|snow peak|スノーピーク|camp/.test(t)) checks.push({title:`キャンプ場/予約候補：${name}`, kind:'import', reason:t.slice(0,80), create:'project', payload:{id:uid('project'),title:t.match(/([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}A-Za-z0-9\- ]{3,30})(キャンプ|Camp|CAMP)/u)?.[0] || '取込キャンプ予定',type:'camp',status:'候補',level:4,start:'',end:'',place:'取込候補',site:'',people:['ムー'],pets:['コタ'],cost:{},notes:t.slice(0,200),goals:['取込内容確認']}});
    if (/ギア|snow peak|スノーピーク|購入|¥|円|gear|igt|ランタン|テント|タープ/i.test(t)) checks.push({title:`ギア候補：${name}`, kind:'import', reason:t.slice(0,80), create:'gear', payload:{id:uid('gear'),name:t.split(/\n|,|、/)[0].slice(0,32)||'取込ギア',category:'取込',qty:1,status:'候補',favorite:false,lastUsed:'',cost:Number((t.match(/[0-9,]{4,}/)?.[0]||'0').replaceAll(',','')),notes:t.slice(0,200)}});
    if (/天気|降水|雨|風|気温|weather|wind|℃/.test(t)) checks.push({title:`Weather Watch候補：${name}`, kind:'import', reason:t.slice(0,80), create:'weather', payload:null});
    if (/公園|道の駅|湖|森|散歩|ドッグ|犬/.test(t)) checks.push({title:`場所カード候補：${name}`, kind:'import', reason:t.slice(0,80), create:'place', payload:{id:uid('place'),name:t.split(/\n|,|、/)[0].slice(0,32)||'取込場所',kind:'場所候補',area:'未設定',dog:'犬条件確認',water:'',view:'',score:{dog:3,view:3,summer:3,facility:3},notes:t.slice(0,200),favorite:false,photos:[]}});
    if (!checks.length) checks.push({title:`メモ候補：${name}`, kind:'import', reason:t.slice(0,80), create:null, payload:null});
    checks.forEach(c=>state.checks.push({id:uid('check'), ...c}));
    saveRecord('import', `取込候補化：${name}`);
  }
  function exportJson() { downloadText(`outbase-backup-${today()}.json`, JSON.stringify(state, null, 2), 'application/json'); toast('JSONを書き出し'); }
  function restoreJson(text) { try { const next=normalize(JSON.parse(text)); state=next; state.modal=null; save(); toast('復元完了'); render(); } catch(e){ toast('復元失敗'); } }
  function copySummary() { const p=activeProject(); const txt = `OUTBASE共有\n${p?.title}\n${p?.start || ''} ${p?.place || ''}\n準備:${progressFor(p)}% 記録:${projectRecords(p).length}件\n次:${chappySuggestions(p).join(' / ')}`; navigator.clipboard?.writeText(txt).then(()=>toast('共有用まとめをコピー')).catch(()=>downloadText('outbase-summary.txt', txt, 'text/plain')); }
  function exportIcs(id) { const p=projectById(id); if(!p?.start){toast('日付がないためICS未作成');return;} const dt = p.start.replaceAll('-',''); const ics=`BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//OUTBASE//JP\nBEGIN:VEVENT\nUID:${p.id}@outbase\nDTSTAMP:${dt}T000000Z\nDTSTART;VALUE=DATE:${dt}\nSUMMARY:${p.title}\nLOCATION:${p.place||''}\nDESCRIPTION:${p.notes||''}\nEND:VEVENT\nEND:VCALENDAR`; downloadText(`${p.title}.ics`, ics, 'text/calendar'); toast('ICSを書き出し'); }
  function downloadText(name, text, type) { const blob=new Blob([text],{type}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(url), 1000); }

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  render();
})();
