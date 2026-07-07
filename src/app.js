(() => {
  'use strict';

  const VERSION = 'outbase-final-audit-20260707';
  const STORAGE_KEY = 'outbase_final_audit_state_v1';
  const app = document.getElementById('app');
  const mediaInput = document.getElementById('mediaInput');
  const importInput = document.getElementById('importInput');
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const nowTime = () => new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  const uid = p => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const clone = v => JSON.parse(JSON.stringify(v));
  const dateObj = iso => { const [y,m,d] = String(iso || todayISO()).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
  const isoDate = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const addDays = (iso, n) => { const d = dateObj(iso); d.setDate(d.getDate()+n); return isoDate(d); };
  const monthKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  const jpDate = iso => iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('ja-JP', { month:'numeric', day:'numeric', weekday:'short' }) : '日付なし';
  const dayNames = ['日','月','火','水','木','金','土'];
  const types = { camp:'キャンプ', walk:'散歩', campWalk:'キャンプ場散歩', outing:'外出', work:'仕事', hospital:'病院', payment:'支払い', family:'家族', pet:'ペット', car:'車', event:'行事', memo:'メモ' };
  const levels = { 1:'普通', 2:'メモ', 3:'準備', 4:'記録' };
  const state0 = () => {
    const today = todayISO();
    const nextCamp = addDays(today, 18);
    const campEnd = addDays(nextCamp, 2);
    const payDay = `${today.slice(0,8)}25`;
    return {
      version: VERSION,
      ui: { tab:'home', selectedDate: today, month: today.slice(0,7), currentId:'camp-akagi', drawer:false, prepTab:'shopping', exploreTab:'places', memoryTab:'all', plusMode:'event', modal:null, search:'', activeSessionId:null, toast:'' },
      events: [
        { id:'camp-akagi', title:'スノーピーク赤城山キャンプフィールド', type:'camp', start:nextCamp, end:campEnd, location:'スノーピーク赤城山キャンプフィールド', level:4, status:'予定', weatherWatch:true, favorite:true, memo:'犬連れ・標高・風と撤収雨を重点確認', attendees:'ムー / リン / コタ', pets:'コタ', route:'柏 → 赤城山。買い出し経由候補あり', prepTemplate:true, recurrence:null },
        { id:'walk-home', title:'コタと自宅散歩', type:'walk', start:today, end:today, location:'自宅周辺', level:3, status:'準備中', weatherWatch:false, favorite:false, memo:'通常散歩。健康ログ優先', attendees:'ムー / コタ', pets:'コタ', route:'自宅周辺', recurrence:null },
        { id:'pay-card', title:'カード支払い確認', type:'payment', start:payDay, end:payDay, location:'自宅', level:1, status:'予定', weatherWatch:false, memo:'毎月繰り返し。通知対象', recurrence:{ freq:'monthly', interval:1, until:addDays(today,365) } },
        { id:'spway', title:'Snow Peak Way 情報確認', type:'event', start:addDays(today, 40), end:addDays(today,40), location:'未定', level:2, status:'監視', weatherWatch:false, memo:'募集開始・開催情報を監視', recurrence:{ freq:'yearly', interval:1, until:addDays(today,900) } }
      ],
      undated: [
        { id:'wish-yamanaka', title:'Lake Lodge YAMANAKA再検討', type:'camp', location:'山中湖', level:2, memo:'雨予報時の代替として再評価' },
        { id:'memo-camp-search', title:'次に行きたいキャンプ場探し', type:'memo', location:'候補未決定', level:1, memo:'犬可・温水・景色・4時間以内' }
      ],
      prep: {
        gear: [
          { id:'gear-ls', name:'リビングシェル', category:'幕体', qty:'1', must:true, status:'未確認', dry:false, last:'SP赤城山', note:'風が強い時は張り綱優先' },
          { id:'gear-amenity', name:'アメニティドームM', category:'寝室', qty:'1', must:true, status:'未確認', dry:false, last:'SP赤城山', note:'別寝室運用' },
          { id:'gear-igt', name:'IGT / 400脚', category:'キッチン', qty:'一式', must:true, status:'未確認', dry:false, last:'雪峰祭後', note:'料理構成と連動' },
          { id:'gear-hoozuki', name:'ほおずき / たねほおずき', category:'照明', qty:'必要数', must:true, status:'未確認', dry:false, last:'毎回', note:'寝室・タープ下' },
          { id:'gear-kota', name:'コタ用品', category:'ペット', qty:'一式', must:true, status:'未確認', dry:false, last:'毎回', note:'水・フード・リード・カート' },
          { id:'gear-battery', name:'EcoFlow / WAVE / Glacier', category:'電源・冷却', qty:'必要数', must:false, status:'未確認', dry:false, last:'夏キャンプ', note:'暑さ・冷蔵・給電判断' }
        ],
        recipes: [
          { id:'recipe-shrimp', name:'ガーリックシュリンプ', meal:'夜', people:2, difficulty:'普通', weather:'風弱め', gear:['スキレット大','バーナー','トング'], ingredients:[{name:'ブラックタイガー',qty:300,unit:'g'},{name:'にんにく',qty:2,unit:'片'},{name:'オリーブオイル',qty:40,unit:'ml'},{name:'バター',qty:10,unit:'g'},{name:'レモン',qty:1,unit:'個'}], note:'バゲット無し想定。量を増やしすぎない。' },
          { id:'recipe-pizza', name:'手作りピザ', meal:'夜', people:2, difficulty:'やや手間', weather:'雨でも可', gear:['IGT','バーナー','フライパン/焼き台'], ingredients:[{name:'強力粉',qty:200,unit:'g'},{name:'薄力粉',qty:50,unit:'g'},{name:'ドライイースト',qty:3,unit:'g'},{name:'チーズ',qty:120,unit:'g'},{name:'トマトソース',qty:1,unit:'袋'}], note:'生地は作る。LINEコピー対象。' },
          { id:'recipe-hotdog', name:'朝ホットドッグ', meal:'朝', people:2, difficulty:'簡単', weather:'撤収日向き', gear:['バーナー','ホットサンドメーカー'], ingredients:[{name:'パン',qty:2,unit:'本'},{name:'ソーセージ',qty:2,unit:'本'},{name:'チーズ',qty:2,unit:'枚'}], note:'撤収日の軽さ優先。' }
        ],
        manualShopping:[{id:'shop-coffee', name:'コーヒー', qty:'必要分', category:'飲料', checked:false},{id:'shop-ice', name:'氷', qty:'1袋', category:'保冷', checked:false}],
        kota:[{id:'kota-food', name:'フード', checked:false},{id:'kota-water', name:'水とボウル', checked:false},{id:'kota-cart', name:'AirBuggy Dome3', checked:false},{id:'kota-cooling', name:'暑さ対策', checked:false},{id:'kota-manner', name:'マナー袋・ウェット', checked:false}],
        setupSteps:[
          {id:'set-reception', name:'受付', phase:'設営', done:false, note:'チェックイン時刻とサイト番号'},
          {id:'set-layout', name:'レイアウト決定', phase:'設営', done:false, note:'風向き・日差し・コタ動線'},
          {id:'set-unload', name:'荷下ろし', phase:'設営', done:false, note:'先にタープ/幕/ペット'},
          {id:'set-shell', name:'リビング設営', phase:'設営', done:false, note:'張り綱と風'},
          {id:'out-pack', name:'前日片付け', phase:'撤収', done:false, note:'夜露・乾燥・翌朝雨'},
          {id:'out-car', name:'車載', phase:'撤収', done:false, note:'濡れ物分離と忘れ物確認'}
        ]
      },
      places: [
        { id:'place-akagi', name:'スノーピーク赤城山キャンプフィールド', category:'キャンプ場', address:'群馬県前橋市', altitude:'約1350m', favorite:5, pet:5, visits:1, weatherWatch:true, memo:'標高・風・撤収時の雨を重点確認。犬連れ直営安心。', season:'夏は涼しさ重視', cards:['受付','炊事場','トイレ','景色','散歩ルート'] },
        { id:'place-home', name:'自宅周辺', category:'散歩', address:'柏市周辺', altitude:'低地', favorite:3, pet:4, visits:10, weatherWatch:false, memo:'通常散歩。健康ログと犬友達を蓄積。', season:'暑さ注意', cards:['公園','休憩','犬友達'] }
      ],
      dogFriends:[{id:'dog-1', name:'名前不明の柴犬', breed:'柴犬', color:'茶', place:'自宅周辺', count:2, memo:'夕方に会うことが多い'}],
      records: [],
      sessions: [],
      checks: [],
      improvements: [{id:'imp-1', eventId:'camp-akagi', text:'撤収日の朝食は軽くする', source:'前回会話', done:false}],
      weather: [
        { id:'w1', placeId:'place-akagi', date:nextCamp, label:'設営日 午後', rain:35, wind:5, temp:22, humidity:78, note:'風が5m以上なら張り綱優先。雨具は入口側へ。' },
        { id:'w2', placeId:'place-akagi', date:addDays(nextCamp,1), label:'中日 夜', rain:25, wind:3, temp:17, humidity:82, note:'冷え込み。コタの寝床と上着確認。' },
        { id:'w3', placeId:'place-akagi', date:campEnd, label:'撤収 朝', rain:50, wind:4, temp:19, humidity:88, note:'濡れ撤収リスク。前日片付けを強める。' }
      ],
      importQueue: [],
      lastSavedAt: new Date().toISOString()
    };
  };

  let state = load();
  let clickTimer = null;
  let swipeStartX = 0;
  let swipeStartY = 0;

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return migrate(JSON.parse(raw));
    } catch(e) {}
    return state0();
  }
  function migrate(s) {
    const base = state0();
    return { ...base, ...s, ui: { ...base.ui, ...(s.ui || {}) }, prep: { ...base.prep, ...(s.prep || {}) } };
  }
  function save() {
    state.lastSavedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  function toast(text) { state.ui.toast = text; render(); setTimeout(() => { state.ui.toast=''; render(); }, 1400); }
  function setTab(tab) { state.ui.tab = tab; state.ui.drawer = false; save(); render(); }
  function currentEvent() { return state.events.find(e => e.id === state.ui.currentId) || nextEvent() || state.events[0]; }
  function nextEvent() { const t = todayISO(); return state.events.filter(e => e.start >= t).sort((a,b)=>a.start.localeCompare(b.start))[0] || state.events[0]; }
  function setCurrent(id) { state.ui.currentId = id; state.ui.drawer = false; save(); render(); }
  function eventType(e) { return types[e.type] || e.type || '予定'; }
  function eventMeta(e) { return `${eventType(e)} / Lv.${e.level || 1} ${levels[e.level || 1] || ''} / ${e.start ? jpDate(e.start) : '日付なし'}${e.end && e.end !== e.start ? '〜' + jpDate(e.end) : ''} / ${e.location || '場所未定'}`; }

  function expandEventsForRange(start, end) {
    const out = [];
    state.events.forEach(e => {
      if (!e.start) return;
      if (e.recurrence && e.recurrence.freq) {
        out.push(...expandRecurring(e, start, end));
      } else {
        const from = e.start;
        const to = e.end || e.start;
        if (to >= start && from <= end) {
          let d = from;
          while (d <= to) { if (d >= start && d <= end) out.push({ ...e, occurrenceDate:d, span:e.start !== (e.end || e.start) }); d = addDays(d,1); }
        }
      }
    });
    return out.sort((a,b)=>(a.occurrenceDate||a.start).localeCompare(b.occurrenceDate||b.start) || (b.level||0)-(a.level||0));
  }
  function expandRecurring(e, start, end) {
    const out = [];
    let d = e.start;
    const until = e.recurrence.until || end;
    let guard = 0;
    while (d <= end && d <= until && guard < 500) {
      if (d >= start) out.push({ ...e, occurrenceDate:d, recurring:true });
      const dt = dateObj(d);
      const interval = Number(e.recurrence.interval || 1);
      if (e.recurrence.freq === 'daily') dt.setDate(dt.getDate()+interval);
      else if (e.recurrence.freq === 'weekly') dt.setDate(dt.getDate()+7*interval);
      else if (e.recurrence.freq === 'monthly') dt.setMonth(dt.getMonth()+interval);
      else if (e.recurrence.freq === 'yearly') dt.setFullYear(dt.getFullYear()+interval);
      else break;
      d = isoDate(dt); guard++;
    }
    return out;
  }
  function monthDays() {
    const [y,m] = state.ui.month.split('-').map(Number);
    const first = new Date(y, m-1, 1);
    const start = new Date(first); start.setDate(1 - first.getDay());
    const days = [];
    for (let i=0;i<42;i++) { const d = new Date(start); d.setDate(start.getDate()+i); days.push(d); }
    return days;
  }
  function moveMonth(n) { const [y,m] = state.ui.month.split('-').map(Number); const d = new Date(y,m-1+n,1); state.ui.month = monthKey(d); save(); render(); }

  function render() {
    const ev = currentEvent();
    app.innerHTML = `
      ${topbar(ev)}
      ${currentChip(ev)}
      ${mainView()}
      ${bottomNav()}
      ${modal()}
      ${state.ui.toast ? `<div class="toast">${esc(state.ui.toast)}</div>` : ''}
    `;
    bindView();
  }
  function topbar(ev) {
    return `<header class="topbar">
      <button class="brand" data-action="home" aria-label="ホーム">
        <div class="logo">OB</div><div><div class="brand-title">OUTBASE</div><div class="brand-sub">FIELD OS / 使うための完成版</div></div>
      </button>
      <div class="top-actions"><button class="pill" data-action="backup">控え</button><button class="pill" data-action="import">取込</button></div>
    </header>`;
  }
  function currentChip(ev) {
    const candidates = [nextEvent(), ...state.events].filter(Boolean).filter((e,i,a)=>a.findIndex(x=>x.id===e.id)===i).slice(0,7);
    return `<div class="current-chip">
      <button class="small-plan-chip" data-action="toggleDrawer"><span class="small-plan-label">現在</span><b>${esc(ev?.title || '予定未選択')}</b><small>${esc(ev ? eventMeta(ev) : '仮保存')}</small><i>切替</i></button>
      ${state.ui.drawer ? `<div class="drawer">
        <div class="card-header"><b>主役プランを切替</b><button class="btn slim ghost" data-action="toggleDrawer">閉じる</button></div>
        ${candidates.map(e=>`<button class="item" data-action="current" data-id="${e.id}"><span class="item-main"><span class="item-title">${esc(e.title)}</span><span class="item-sub">${esc(eventMeta(e))}</span></span><span class="tag ${e.id===ev.id?'':'light'}">${e.id===ev.id?'選択中':'切替'}</span></button>`).join('')}
        <button class="btn primary" data-action="openEvent" data-date="${state.ui.selectedDate}">予定を追加</button>
      </div>` : ''}
    </div>`;
  }
  function mainView() {
    if (state.ui.tab === 'home') return homeView();
    if (state.ui.tab === 'calendar') return calendarView(false);
    if (state.ui.tab === 'explore') return exploreView();
    if (state.ui.tab === 'prep') return prepView();
    if (state.ui.tab === 'plus') return plusView();
    if (state.ui.tab === 'memory') return memoryView();
    return homeView();
  }
  function homeView() {
    const ev = currentEvent();
    const tasks = homeTasks(ev);
    return `<main class="stack">
      <section class="hero"><div class="eyebrow">OUTBASE</div><h1>今日は何する？</h1><p>予定を見る、準備する、現地で残す、帰って次回に活かす。開いたら今日の一手が分かる。</p></section>
      <section class="card"><div class="card-inner">
        <div class="card-header"><div><div class="eyebrow">今日の一手</div><h2 class="card-title">${esc(primaryAction(ev))}</h2><p class="card-text">${esc(ev.title)} を基準に、準備・天気・記録・改善をまとめて見る。</p></div><span class="tag">${esc(ev.status || '予定')}</span></div>
        <div class="kpi-row"><div class="kpi"><small>準備</small><strong>${prepDoneCount()}/${prepTotalCount()}</strong></div><div class="kpi"><small>記録</small><strong>${state.records.filter(r=>r.eventId===ev.id).length}</strong></div><div class="kpi"><small>要確認</small><strong>${state.checks.length}</strong></div></div>
        <div class="actions"><button class="btn primary" data-tab="prep">準備を見る</button><button class="btn" data-tab="plus">3秒記録</button><button class="btn ghost" data-tab="memory">思い出へ</button></div>
      </div></section>
      ${calendarCard(true)}
      <section class="grid-2">
        ${tasks.map(t=>`<button class="card" data-tab="${t.tab}"><div class="card-inner"><div class="eyebrow">${esc(t.k)}</div><h3 class="card-title">${esc(t.t)}</h3><p class="card-text">${esc(t.d)}</p></div></button>`).join('')}
      </section>
    </main>`;
  }
  function primaryAction(ev) {
    if (!ev) return '仮保存から始める';
    if (ev.type === 'camp') return 'キャンプ前の抜けを潰す';
    if (ev.type === 'walk') return 'コタの散歩を軽く残す';
    return '予定を確認する';
  }
  function homeTasks(ev) {
    return [
      {k:'天気', t:'設営・撤収判断', d:'雨・風・気温を時間帯で確認。前日片付けも判断する。', tab:'prep'},
      {k:'散歩', t:'通常 / キャンプ場で切替', d:'うんち・おしっこ・犬友達・スポットの意味をモード別に変える。', tab:'plus'},
      {k:'料理', t:'献立から買い物へ', d:'料理別と食材別を統合。LINEへコピーできる。', tab:'prep'},
      {k:'次回', t:'改善を準備へ戻す', d:'帰宅後のメモを次回の忘れ物防止に変える。', tab:'memory'}
    ];
  }
  function calendarView(embedded) { return `<main class="stack">${!embedded?`<section class="hero"><div class="eyebrow">CALENDAR</div><h1>高機能カレンダー</h1><p>左右スライドで月移動。1回タップで日付選択、同じ日をダブルタップで予定追加。連日・繰り返しも表示。</p></section>`:''}${calendarCard(false)}${undatedCard()}</main>`; }
  function calendarCard(compact) {
    const selected = state.ui.selectedDate;
    const list = eventsOnDate(selected);
    return `<section class="card calendar-shell" data-swipe="calendar"><div class="card-inner">
      <div class="calendar-head"><button class="round" data-action="month" data-step="-1">‹</button><button class="month-title" data-action="today"><strong>${esc(state.ui.month.replace('-','年 '))}月</strong><small>${esc(jpDate(selected))}</small></button><button class="round" data-action="month" data-step="1">›</button></div>
      <div class="calendar-weekdays">${dayNames.map(d=>`<span>${d}</span>`).join('')}</div>
      <div class="calendar-grid">${monthDays().map(dayCell).join('')}</div>
      <div class="divider"></div>
      <div class="card-header"><div><h2 class="agenda-date">${esc(jpDate(selected))}</h2><p class="card-text">タップで表示、ダブルタップで予定追加</p></div><button class="btn primary slim" data-action="openEvent" data-date="${selected}">予定追加</button></div>
      <div class="item-list">${list.length ? list.map(agendaItem).join('') : `<div class="empty">この日の予定はまだない</div>`}</div>
    </div></section>`;
  }
  function dayCell(d) {
    const iso = isoDate(d); const inMonth = iso.slice(0,7) === state.ui.month; const selected = iso === state.ui.selectedDate; const today = iso === todayISO(); const evs = eventsOnDate(iso); const lines = evs.slice(0,2);
    return `<button class="calendar-day ${inMonth?'':'other'} ${selected?'selected':''} ${today?'today':''}" data-action="selectDate" data-date="${iso}"><span class="num">${d.getDate()}</span><span class="day-lines">${lines.map(e=>`<span class="day-line type-${esc(e.type)} ${e.span?'span':''}">${esc(shortTitle(e.title))}</span>`).join('')}${evs.length>2?`<span class="day-more">他 ${evs.length-2}件</span>`:''}</span></button>`;
  }
  function shortTitle(t) { return String(t || '').replace('スノーピーク','SP').replace('キャンプフィールド','CF').slice(0,9); }
  function eventsOnDate(iso) { return expandEventsForRange(iso, iso); }
  function agendaItem(e) { return `<button class="item" data-action="openEventDetail" data-id="${e.id}"><span class="item-main"><span class="item-title">${esc(e.title)}</span><span class="item-sub">${esc(eventMeta(e))}${e.recurring?' / 繰り返し':''}${e.span?' / 連日':''}</span><span class="item-tools"><span class="tag light">主役</span><span class="tag gray">準備</span><span class="tag gray">記録</span></span></span><span class="tag ${e.status==='実行中'?'warn':'light'}">${esc(e.status||'予定')}</span></button>`; }
  function undatedCard() { return `<section class="card"><div class="card-inner"><div class="card-header"><div><h2 class="card-title">日付未設定</h2><p class="card-text">日付なし予定はカレンダー日付に混ぜない。</p></div><button class="btn slim" data-action="openUndated">追加</button></div><div class="item-list">${state.undated.map(u=>`<button class="item" data-action="promoteUndated" data-id="${u.id}"><span class="item-main"><span class="item-title">${esc(u.title)}</span><span class="item-sub">${esc(types[u.type]||u.type)} / ${esc(u.location||'場所未定')} / ${esc(u.memo||'')}</span></span><span class="tag light">日付設定</span></button>`).join('')}</div></div></section>`; }

  function exploreView() {
    return `<main class="stack"><section class="hero"><div class="eyebrow">EXPLORE</div><h1>探す</h1><p>キャンプ場・散歩先・寄り道・犬友達・発見メモを、予定とは分けて貯める。</p></section>
      <div class="filter-row">${['places:場所','weather:天気監視','dogs:犬友達','discover:発見メモ'].map(x=>{const [id,l]=x.split(':');return `<button class="filter-pill ${state.ui.exploreTab===id?'active':''}" data-explore="${id}">${l}</button>`}).join('')}</div>
      ${state.ui.exploreTab==='places'?placesView():state.ui.exploreTab==='weather'?weatherView():state.ui.exploreTab==='dogs'?dogsView():discoverView()}
    </main>`;
  }
  function placesView() { return `<section class="card"><div class="card-inner"><div class="card-header"><div><h2 class="card-title">場所カード</h2><p class="card-text">固定場所と発見カードを分け、検索対象はアーカイブも含める。</p></div><button class="btn primary slim" data-action="openPlace">追加</button></div><div class="item-list">${state.places.map(p=>`<div class="item"><span class="item-main place-card"><span class="item-title">${esc(p.name)}</span><span class="item-sub">${esc(p.category)} / ${esc(p.address)} / 標高 ${esc(p.altitude)} / 訪問 ${p.visits}回</span><span class="place-meta"><span class="tag light">お気に入り ${p.favorite}</span><span class="tag light">ペット ${p.pet}</span>${p.weatherWatch?'<span class="tag warn">Weather Watch</span>':''}</span><span class="item-sub">${esc(p.memo)}</span></span><button class="btn slim" data-action="placeToEvent" data-id="${p.id}">予定化</button></div>`).join('')}</div></div></section>`; }
  function weatherView() { const ev = currentEvent(); const place = state.places.find(p => p.name === ev.location || p.id === 'place-akagi') || state.places[0]; const rows = state.weather.filter(w=>w.placeId===place.id); return `<section class="card"><div class="card-inner"><div class="card-header"><div><h2 class="card-title">Weather Watch</h2><p class="card-text">14日前から、降水・風・気温・撤収朝を判断材料にする。API未接続時もスクショ取込・手入力で履歴化。</p></div><button class="btn slim primary" data-action="openWeather">追加</button></div><div class="weather-grid">${rows.map(w=>`<div class="weather-box"><strong>${esc(w.label)}</strong><span>${jpDate(w.date)} / 雨 ${w.rain}% / 風 ${w.wind}m / ${w.temp}℃ / 湿度 ${w.humidity}%</span><span>${esc(w.note)}</span></div>`).join('')}</div><div class="divider"></div><div class="weather-risk">${weatherRisks(rows).map(r=>`<div class="risk ${r.bad?'bad':'ok'}"><span>${esc(r.name)}</span><b>${esc(r.text)}</b></div>`).join('')}</div></div></section>`; }
  function weatherRisks(rows) { if (!rows.length) return [{name:'監視', text:'データ待ち', bad:false}]; return [{name:'設営判断', text:Math.max(...rows.map(r=>r.wind))>=5?'風対策優先':'通常設営可', bad:Math.max(...rows.map(r=>r.wind))>=5},{name:'雨判断', text:Math.max(...rows.map(r=>r.rain))>=50?'濡れ撤収注意':'雨リスク低め', bad:Math.max(...rows.map(r=>r.rain))>=50},{name:'コタ判断', text:Math.min(...rows.map(r=>r.temp))<=18?'夜の冷え対策':'温度問題少', bad:Math.min(...rows.map(r=>r.temp))<=18}]; }
  function dogsView() { return `<section class="card"><div class="card-inner"><div class="card-header"><div><h2 class="card-title">犬友達</h2><p class="card-text">名前不明OK。特徴と会った回数を残す。</p></div><button class="btn slim primary" data-action="recordDog">追加</button></div><div class="item-list">${state.dogFriends.map(d=>`<div class="item"><span class="item-main"><span class="item-title">${esc(d.name)}</span><span class="item-sub">${esc(d.breed)} / ${esc(d.color)} / ${esc(d.place)} / ${d.count}回</span><span class="item-sub">${esc(d.memo)}</span></span><span class="tag light">記憶</span></div>`).join('')}</div></div></section>`; }
  function discoverView() { return `<section class="card"><div class="card-inner"><div class="card-header"><div><h2 class="card-title">発見メモ</h2><p class="card-text">温泉、イベント、ショップ、景色、犬連れ候補。予定化前の置き場。</p></div><button class="btn slim primary" data-action="openQuick" data-kind="discover">追加</button></div>${state.records.filter(r=>r.kind==='discover').length?recordsList(state.records.filter(r=>r.kind==='discover')):`<div class="empty">発見メモはまだない</div>`}</div></section>`; }

  function prepView() {
    const ev = currentEvent();
    return `<main class="stack"><section class="hero"><div class="eyebrow">PREP</div><h1>準備</h1><p>${esc(ev.title)} の買い物・料理・ギア・コタ・天気・ルートを、次回改善までつなげる。</p></section>
      <div class="tab-row">${['shopping:買い物','cooking:料理','gear:ギア','kota:コタ','weather:天気','route:ルート'].map(x=>{const[id,l]=x.split(':');return `<button class="tab-pill ${state.ui.prepTab===id?'active':''}" data-prep="${id}">${l}</button>`}).join('')}</div>
      ${state.ui.prepTab==='shopping'?shoppingView():state.ui.prepTab==='cooking'?cookingView():state.ui.prepTab==='gear'?gearView():state.ui.prepTab==='kota'?kotaView():state.ui.prepTab==='weather'?weatherView():routeView()}
    </main>`;
  }
  function recipeShopping() {
    const map = new Map();
    state.prep.recipes.forEach(r => r.ingredients.forEach(i => { const key = `${i.name}|${i.unit}`; const cur = map.get(key) || { name:i.name, qty:0, unit:i.unit, recipes:[] }; cur.qty += Number(i.qty) || 0; cur.recipes.push(r.name); map.set(key, cur); }));
    return [...map.values()];
  }
  function shoppingView() { const rows = recipeShopping(); return `<section class="card"><div class="card-inner"><div class="card-header"><div><h2 class="card-title">買い物リスト</h2><p class="card-text">献立から自動統合。料理別・食材別の両方で見て、LINEへコピー。</p></div><button class="btn primary slim" data-action="copyShopping">LINEコピー</button></div><div class="item-list">${rows.map(i=>`<div class="check-row"><button class="check" data-action="noop"> </button><span><b>${esc(i.name)} ${i.qty}${esc(i.unit)}</b><small class="item-sub">${esc(i.recipes.join(' / '))}</small></span><span class="tag light">統合</span></div>`).join('')}${state.prep.manualShopping.map(i=>`<div class="check-row"><button class="check ${i.checked?'done':''}" data-action="toggleManualShop" data-id="${i.id}">${i.checked?'✓':''}</button><span><b>${esc(i.name)} ${esc(i.qty)}</b><small class="item-sub">${esc(i.category)} / 手動追加</small></span><span class="tag gray">手動</span></div>`).join('')}</div></div></section>`; }
  function cookingView() { return `<section class="card"><div class="card-inner"><div class="card-header"><div><h2 class="card-title">料理・献立</h2><p class="card-text">料理カードに材料・必要ギア・天気・評価を持たせる。</p></div><button class="btn slim primary" data-action="openRecipe">料理追加</button></div><div class="item-list">${state.prep.recipes.map(r=>`<div class="item"><span class="item-main"><span class="item-title">${esc(r.name)}</span><span class="item-sub">${esc(r.meal)} / ${r.people}人 / ${esc(r.difficulty)} / 天気: ${esc(r.weather)}</span><span class="item-sub">材料：${esc(r.ingredients.map(i=>`${i.name}${i.qty}${i.unit}`).join('、'))}</span><span class="item-sub">ギア：${esc(r.gear.join('、'))}</span><span class="item-sub">${esc(r.note)}</span></span><span class="tag light">献立</span></div>`).join('')}</div></div></section>`; }
  function gearView() { const total = state.prep.gear.length; const done = state.prep.gear.filter(g=>g.status==='積込済').length; return `<section class="card"><div class="card-inner"><div class="card-header"><div><h2 class="card-title">ギア管理</h2><p class="card-text">持参・積込・乾燥・使用履歴・忘れ物を同じカードで管理。</p></div><button class="btn slim primary" data-action="openGear">追加</button></div><div class="progress"><span style="width:${Math.round(done/Math.max(total,1)*100)}%"></span></div><div class="item-list" style="margin-top:12px">${state.prep.gear.map(g=>`<div class="item"><span class="item-main"><span class="item-title">${esc(g.name)}</span><span class="item-sub">${esc(g.category)} / 数量 ${esc(g.qty)} / ${esc(g.status)} / 前回 ${esc(g.last)}</span><span class="item-sub">${esc(g.note)}</span><span class="item-tools"><button class="tag ${g.status==='積込済'?'':'light'}" data-action="gearStatus" data-id="${g.id}" data-status="積込済">積込</button><button class="tag ${g.dry?'':'gray'}" data-action="gearDry" data-id="${g.id}">乾燥</button><button class="tag warn" data-action="gearStatus" data-id="${g.id}" data-status="忘れた">忘れ</button></span></span><span class="tag ${g.must?'warn':'light'}">${g.must?'必須':'任意'}</span></div>`).join('')}</div></div></section>`; }
  function kotaView() { return `<section class="card"><div class="card-inner"><div class="card-header"><div><h2 class="card-title">コタ準備</h2><p class="card-text">散歩・暑さ・寒さ・水・フード・マナー用品を予定と天気に連動。</p></div><span class="tag light">犬連れ</span></div><div class="item-list">${state.prep.kota.map(k=>`<div class="check-row"><button class="check ${k.checked?'done':''}" data-action="toggleKota" data-id="${k.id}">${k.checked?'✓':''}</button><span><b>${esc(k.name)}</b><small class="item-sub">キャンプ/散歩共通。現地記録と次回改善へ接続。</small></span><span class="tag light">コタ</span></div>`).join('')}</div></div></section>`; }
  function routeView() { return `<section class="card"><div class="card-inner"><div class="card-header"><div><h2 class="card-title">ルート・設営撤収ログ</h2><p class="card-text">単純タイマーではなく、受付・到着・荷下ろし・設営・休憩・撤収・車載まで記録。</p></div><button class="btn slim primary" data-action="startSetupLog">開始</button></div><div class="route-steps">${state.prep.setupSteps.map((s,i)=>`<div class="step"><button class="step-no" data-action="toggleSetup" data-id="${s.id}">${s.done?'✓':i+1}</button><div class="step-body"><b>${esc(s.name)}</b><div class="item-sub">${esc(s.phase)} / ${esc(s.note)}</div></div></div>`).join('')}</div></div></section>`; }

  function plusView() { const session = activeSession(); return `<main class="stack"><section class="hero"><div class="eyebrow">QUICK</div><h1>＋</h1><p>入口は1つに決めない。予定・準備・現地・過去・メモから始め、OUTBASEが候補へまとめる。</p></section>
    <section class="card"><div class="card-inner"><div class="grid-2">${[
      ['event','予定','普通の予定もキャンプも'],['prep','準備','予定なしでも開始'],['field','現地記録','写真・声・場所・メモ'],['past','過去実績','後から登録'],['memo','メモ','文脈で仮紐付け'],['import','一括取込','写真・PDF・Excel']
    ].map(x=>`<button class="btn ${state.ui.plusMode===x[0]?'primary':'ghost'}" data-plus="${x[0]}"><b>${x[1]}</b><small>${x[2]}</small></button>`).join('')}</div></div></section>
    ${plusModeView()}
    ${sessionView(session)}
  </main>`; }
  function plusModeView() { const m = state.ui.plusMode; if (m==='event') return quickEventView(); if (m==='prep') return quickPrepView(); if (m==='field') return quickFieldView(); if (m==='past') return quickPastView(); if (m==='memo') return quickMemoView(); return importView(); }
  function quickEventView() { return `<section class="card"><div class="card-inner"><h2 class="card-title">予定を追加</h2><p class="card-text">連日・繰り返し・普通予定まで対応。</p><div class="actions"><button class="btn primary" data-action="openEvent" data-date="${state.ui.selectedDate}">日付あり予定</button><button class="btn ghost" data-action="openUndated">日付未設定</button></div></div></section>`; }
  function quickPrepView() { return `<section class="card"><div class="card-inner"><h2 class="card-title">準備から開始</h2><p class="card-text">買い物・ギア・料理メモを仮出来事として保存し、近い予定に候補表示。</p><div class="field"><textarea id="quickPrepText" placeholder="例：ピザ用チーズとオリーブオイルを買う"></textarea></div><div class="actions"><button class="btn primary" data-action="saveQuickPrep">保存</button></div></div></section>`; }
  function quickFieldView() { return `<section class="card"><div class="card-inner"><div class="card-header"><div><h2 class="card-title">現地3秒記録</h2><p class="card-text">分類しない。保存先は候補。通常散歩とキャンプ場散歩で、うんち/おしっこの意味を変える。</p></div><button class="btn slim primary" data-action="startSession">開始</button></div><div class="record-grid">${recordButtons().map(b=>`<button class="record-btn" data-action="${b.a}"><strong>${b.t}</strong><small>${b.d}</small></button>`).join('')}</div></div></section>`; }
  function recordButtons() { return [{a:'pickMedia',t:'写真・動画',d:'Google Photos正本前提'}, {a:'voice',t:'声メモ',d:'録音ではなく文字化'}, {a:'poop',t:'うんち',d:'通常=健康 / キャンプ=場所'}, {a:'pee',t:'おしっこ',d:'通常=健康 / キャンプ=場所'}, {a:'recordDog',t:'犬友達',d:'名前不明OK'}, {a:'recordSpot',t:'スポット',d:'場所カード候補'}, {a:'gps',t:'位置',d:'GPS候補'}, {a:'manualMemo',t:'メモ',d:'手入力'}]; }
  function quickPastView() { return `<section class="card"><div class="card-inner"><h2 class="card-title">過去実績</h2><p class="card-text">過去キャンプ・散歩・外出を後から登録。思い出と改善へ接続。</p><div class="actions"><button class="btn primary" data-action="openPastEvent">過去実績を追加</button></div></div></section>`; }
  function quickMemoView() { return `<section class="card"><div class="card-inner"><h2 class="card-title">メモ</h2><p class="card-text">文脈で仮紐付け。判断できないものだけ要確認へ。</p><div class="field"><textarea id="quickMemoText" placeholder="気になることをそのまま"></textarea></div><div class="actions"><button class="btn primary" data-action="saveQuickMemo">保存</button></div></div></section>`; }
  function importView() { return `<section class="card"><div class="card-inner"><h2 class="card-title">一括取込</h2><p class="card-text">スクショ・写真・PDF・Excelを候補化。1件ずつ登録しない。</p><div class="actions"><button class="btn primary" data-action="import">ファイル選択</button><button class="btn ghost" data-action="exportICS">ICS出力</button></div>${state.importQueue.length?`<div class="divider"></div><div class="item-list">${state.importQueue.map(q=>`<div class="item"><span class="item-main"><span class="item-title">${esc(q.name)}</span><span class="item-sub">${esc(q.type)} / 候補化待ち</span></span><span class="tag warn">要承認</span></div>`).join('')}</div>`:''}</div></section>`; }
  function sessionView(session) { if (!session) return `<section class="card"><div class="card-inner"><h2 class="card-title">散歩モード</h2><p class="card-text">開始すると、通常散歩 / キャンプ場散歩 / 自由記録を選んで記録できる。</p><div class="grid-3"><button class="btn primary" data-action="startWalk" data-mode="normal">通常散歩</button><button class="btn" data-action="startWalk" data-mode="camp">キャンプ場散歩</button><button class="btn ghost" data-action="startWalk" data-mode="free">自由記録</button></div></div></section>`; return `<section class="card"><div class="card-inner"><div class="session-bar"><span><b>${esc(session.modeLabel)}</b><br><small>${esc(session.startedAt)} / 記録 ${state.records.filter(r=>r.sessionId===session.id).length}件</small></span><button class="btn danger slim" data-action="endSession">終了</button></div><div class="divider"></div><p class="card-text">${session.mode==='camp'?'キャンプ場散歩：うんち/おしっこは健康ログに加え、場所カード・マナー確認にも紐付け。':'通常散歩：うんち/おしっこは健康ログ、ルート、時間へ紐付け。'}</p></div></section>`; }
  function activeSession() { return state.sessions.find(s => s.id === state.ui.activeSessionId && !s.endedAt); }

  function memoryView() { const ev = currentEvent(); const records = state.records.filter(r=>!ev || r.eventId===ev.id || state.ui.memoryTab==='all'); return `<main class="stack"><section class="hero"><div class="eyebrow">MEMORY</div><h1>思い出</h1><p>記録を整理して、レビュー・次回改善・年表へつなげる。</p></section><div class="filter-row">${['all:全部','photo:写真','voice:声','spot:スポット','check:要確認'].map(x=>{const[id,l]=x.split(':');return `<button class="filter-pill ${state.ui.memoryTab===id?'active':''}" data-memory="${id}">${l}</button>`}).join('')}</div>${reviewView(ev)}${checksView()}<section class="card"><div class="card-inner"><div class="card-header"><div><h2 class="card-title">記録カード</h2><p class="card-text">Google Photos正本、OUTBASEは検索・整理情報を保持。</p></div><span class="tag light">${records.length}件</span></div>${records.length?recordsList(filterRecords(records)):`<div class="empty">記録はまだない</div>`}</div></section>${dataCenterView()}</main>`; }
  function filterRecords(records) { const f = state.ui.memoryTab; if (f==='all') return records; if (f==='check') return records.filter(r=>r.needsCheck); return records.filter(r=>r.kind===f); }
  function recordsList(records) { return `<div class="item-list">${records.map(r=>`<div class="item"><span class="item-main"><span class="item-title">${esc(recordTitle(r))}</span><span class="item-sub">${esc(r.date)} ${esc(r.time)} / ${esc(r.modeLabel || '')} / ${esc(r.place || '')}</span><span class="item-sub">${esc(r.text || r.note || '')}</span></span><span class="tag ${r.needsCheck?'warn':'light'}">${r.needsCheck?'要確認':'保存'}</span></div>`).join('')}</div>`; }
  function recordTitle(r) { return ({photo:'写真',video:'動画',voice:'音声メモ',poop:'うんち',pee:'おしっこ',dog:'犬友達',spot:'スポット',gps:'位置',memo:'メモ',prep:'準備メモ',discover:'発見メモ'}[r.kind] || r.kind || '記録'); }
  function reviewView(ev) { const imps = state.improvements.filter(i=>!ev || i.eventId===ev.id); return `<section class="card"><div class="card-inner"><div class="card-header"><div><h2 class="card-title">レビュー・次回改善</h2><p class="card-text">記録が増えるほど、次回の持ち物・料理・天気判断へ戻る。</p></div><button class="btn slim primary" data-action="generateReview">生成</button></div><div class="item-list">${imps.length?imps.map(i=>`<div class="check-row"><button class="check ${i.done?'done':''}" data-action="toggleImprovement" data-id="${i.id}">${i.done?'✓':''}</button><span><b>${esc(i.text)}</b><small class="item-sub">${esc(i.source||'レビュー')}</small></span><span class="tag light">次回へ</span></div>`).join(''):`<div class="empty">レビュー待ち</div>`}</div></div></section>`; }
  function checksView() { return `<section class="card"><div class="card-inner"><div class="card-header"><div><h2 class="card-title">要確認</h2><p class="card-text">全部を未整理に投げない。判断できない少数だけ確認。</p></div><span class="tag ${state.checks.length?'warn':'light'}">${state.checks.length}</span></div>${state.checks.length?`<div class="item-list">${state.checks.map(c=>`<div class="item"><span class="item-main"><span class="item-title">${esc(c.title)}</span><span class="item-sub">${esc(c.reason)}</span></span><button class="btn slim primary" data-action="resolveCheck" data-id="${c.id}">確認済</button></div>`).join('')}</div>`:`<div class="empty">要確認はない</div>`}</div></section>`; }
  function dataCenterView() { return `<section class="card"><div class="card-inner"><h2 class="card-title">データ管理センター</h2><p class="card-text">オフライン保存、バックアップ、復元、ICS出力。外部API接続前でもデータは消さない。</p><div class="actions"><button class="btn primary" data-action="backup">バックアップ</button><button class="btn ghost" data-action="restorePrompt">復元</button><button class="btn ghost" data-action="exportICS">ICS</button></div></div></section>`; }
  function bottomNav() { const tabs = [['calendar','予定'],['explore','探す'],['prep','準備'],['plus','＋'],['memory','思い出']]; return `<nav class="bottom-nav">${tabs.map(([id,l])=>`<button class="nav-btn ${state.ui.tab===id?'active':''}" data-tab="${id}">${l}</button>`).join('')}</nav>`; }

  function modal() { const m = state.ui.modal; if (!m) return ''; if (m.type==='event') return eventModal(m); if (m.type==='backup') return backupModal(); if (m.type==='detail') return detailModal(m.id); if (m.type==='quick') return quickModal(m.kind); if (m.type==='place') return placeModal(); if (m.type==='recipe') return recipeModal(); if (m.type==='gear') return gearModal(); if (m.type==='weather') return weatherModal(); return ''; }
  function modalShell(title, body, actions='') { return `<div class="modal-backdrop" data-action="closeModal"><section class="modal" onclick="event.stopPropagation()"><div class="modal-head"><h2>${esc(title)}</h2><button class="btn slim ghost" data-action="closeModal">閉じる</button></div>${body}${actions}</section></div>`; }
  function eventModal(m) { const d = m.date || state.ui.selectedDate; return modalShell('予定を作成', `<div class="field"><label>予定名</label><input id="evTitle" value="" placeholder="例：キャンプ / 病院 / 支払い" /></div><div class="fields-2"><div class="field"><label>開始日</label><input id="evStart" type="date" value="${d}" /></div><div class="field"><label>終了日</label><input id="evEnd" type="date" value="${d}" /></div></div><div class="fields-2"><div class="field"><label>種別</label><select id="evType">${Object.entries(types).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></div><div class="field"><label>深さ</label><select id="evLevel"><option value="1">Lv.1 普通</option><option value="2">Lv.2 メモ</option><option value="3">Lv.3 準備</option><option value="4">Lv.4 記録</option></select></div></div><div class="fields-2"><div class="field"><label>繰り返し</label><select id="evRepeat"><option value="">なし</option><option value="daily">毎日</option><option value="weekly">毎週</option><option value="monthly">毎月</option><option value="yearly">毎年</option></select></div><div class="field"><label>場所</label><input id="evLocation" placeholder="場所未定" /></div></div><div class="field"><label>メモ</label><textarea id="evMemo" placeholder="通知・準備・犬可条件など"></textarea></div>`, `<div class="actions"><button class="btn primary" data-action="saveEvent">保存</button></div>`); }
  function detailModal(id) { const e = state.events.find(x=>x.id===id); if (!e) return ''; return modalShell(e.title, `<p class="card-text">${esc(eventMeta(e))}</p><div class="divider"></div><div class="grid-2"><button class="btn primary" data-action="current" data-id="${e.id}">主役にする</button><button class="btn" data-tab="prep" data-action="closeAndTab">準備へ</button><button class="btn" data-tab="plus" data-action="closeAndTab">記録へ</button><button class="btn ghost" data-tab="memory" data-action="closeAndTab">思い出へ</button></div><div class="divider"></div><p class="note">${esc(e.memo||'')}</p>`); }
  function backupModal() { const json = JSON.stringify(state, null, 2); return modalShell('バックアップ', `<p class="card-text">この内容を保存しておけば復元できる。</p><div class="copy-box" id="backupText">${esc(json)}</div>`, `<div class="actions"><button class="btn primary" data-action="copyBackup">コピー</button><button class="btn ghost" data-action="downloadBackup">JSON保存</button></div>`); }
  function quickModal(kind) { return modalShell(kind==='discover'?'発見メモ':'メモ', `<div class="field"><label>内容</label><textarea id="quickModalText" placeholder="気になること"></textarea></div>`, `<div class="actions"><button class="btn primary" data-action="saveQuickModal" data-kind="${kind}">保存</button></div>`); }
  function placeModal() { return modalShell('場所カード追加', `<div class="field"><label>名称</label><input id="placeName" /></div><div class="fields-2"><div class="field"><label>カテゴリ</label><input id="placeCat" value="キャンプ場" /></div><div class="field"><label>住所</label><input id="placeAddr" /></div></div><div class="field"><label>メモ</label><textarea id="placeMemo"></textarea></div>`, `<div class="actions"><button class="btn primary" data-action="savePlace">保存</button></div>`); }
  function recipeModal() { return modalShell('料理追加', `<div class="field"><label>料理名</label><input id="recipeName" /></div><div class="fields-2"><div class="field"><label>食事枠</label><input id="recipeMeal" placeholder="夜/朝" /></div><div class="field"><label>人数</label><input id="recipePeople" type="number" value="2" /></div></div><div class="field"><label>材料（1行1つ：食材 数量 単位）</label><textarea id="recipeIngredients" placeholder="エビ 300 g\nにんにく 2 片"></textarea></div>`, `<div class="actions"><button class="btn primary" data-action="saveRecipe">保存</button></div>`); }
  function gearModal() { return modalShell('ギア追加', `<div class="field"><label>ギア名</label><input id="gearName" /></div><div class="fields-2"><div class="field"><label>カテゴリ</label><input id="gearCat" /></div><div class="field"><label>数量</label><input id="gearQty" /></div></div><div class="field"><label>メモ</label><textarea id="gearNote"></textarea></div>`, `<div class="actions"><button class="btn primary" data-action="saveGear">保存</button></div>`); }
  function weatherModal() { return modalShell('天気監視を追加', `<div class="fields-2"><div class="field"><label>日付</label><input id="weatherDate" type="date" value="${state.ui.selectedDate}" /></div><div class="field"><label>時間帯</label><input id="weatherLabel" placeholder="撤収 朝" /></div></div><div class="grid-4"><div class="field"><label>雨%</label><input id="weatherRain" type="number" value="30" /></div><div class="field"><label>風m</label><input id="weatherWind" type="number" value="3" /></div><div class="field"><label>気温℃</label><input id="weatherTemp" type="number" value="20" /></div><div class="field"><label>湿度%</label><input id="weatherHum" type="number" value="70" /></div></div><div class="field"><label>判断メモ</label><textarea id="weatherNote"></textarea></div>`, `<div class="actions"><button class="btn primary" data-action="saveWeather">保存</button></div>`); }

  function bindView() {
    app.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click', e=>{ const tab = b.dataset.tab; if (b.dataset.action==='closeAndTab') closeModal(); setTab(tab); }));
    app.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click', e=>handleAction(e,b)));
    app.querySelectorAll('[data-prep]').forEach(b=>b.addEventListener('click', ()=>{ state.ui.prepTab=b.dataset.prep; save(); render(); }));
    app.querySelectorAll('[data-explore]').forEach(b=>b.addEventListener('click', ()=>{ state.ui.exploreTab=b.dataset.explore; save(); render(); }));
    app.querySelectorAll('[data-memory]').forEach(b=>b.addEventListener('click', ()=>{ state.ui.memoryTab=b.dataset.memory; save(); render(); }));
    app.querySelectorAll('[data-plus]').forEach(b=>b.addEventListener('click', ()=>{ state.ui.plusMode=b.dataset.plus; save(); render(); }));
    const sw = app.querySelector('[data-swipe="calendar"]');
    if (sw) {
      sw.addEventListener('touchstart', e=>{ swipeStartX=e.touches[0].clientX; swipeStartY=e.touches[0].clientY; }, {passive:true});
      sw.addEventListener('touchend', e=>{ const dx=e.changedTouches[0].clientX-swipeStartX; const dy=e.changedTouches[0].clientY-swipeStartY; if(Math.abs(dx)>70 && Math.abs(dx)>Math.abs(dy)*1.3) moveMonth(dx<0?1:-1); }, {passive:true});
    }
  }
  function handleAction(e,b) {
    const a = b.dataset.action;
    if (a==='home') return setTab('home');
    if (a==='toggleDrawer') { state.ui.drawer=!state.ui.drawer; save(); return render(); }
    if (a==='current') return setCurrent(b.dataset.id);
    if (a==='month') return moveMonth(Number(b.dataset.step));
    if (a==='today') { state.ui.selectedDate=todayISO(); state.ui.month=todayISO().slice(0,7); save(); return render(); }
    if (a==='selectDate') return selectDate(b.dataset.date);
    if (a==='openEvent') return openModal({type:'event',date:b.dataset.date});
    if (a==='openEventDetail') return openModal({type:'detail', id:b.dataset.id});
    if (a==='closeModal') return closeModal();
    if (a==='saveEvent') return saveEvent();
    if (a==='backup') return openModal({type:'backup'});
    if (a==='copyBackup') return copyText(JSON.stringify(state,null,2),'バックアップをコピー');
    if (a==='downloadBackup') return downloadFile(`outbase-backup-${todayISO()}.json`, JSON.stringify(state,null,2), 'application/json');
    if (a==='restorePrompt') return restorePrompt();
    if (a==='import') return importInput.click();
    if (a==='exportICS') return exportICS();
    if (a==='openUndated') return openModal({type:'event',date:''});
    if (a==='promoteUndated') return promoteUndated(b.dataset.id);
    if (a==='toggleManualShop') return toggleManualShop(b.dataset.id);
    if (a==='copyShopping') return copyShopping();
    if (a==='openRecipe') return openModal({type:'recipe'});
    if (a==='saveRecipe') return saveRecipe();
    if (a==='openGear') return openModal({type:'gear'});
    if (a==='saveGear') return saveGear();
    if (a==='gearStatus') return gearStatus(b.dataset.id,b.dataset.status);
    if (a==='gearDry') return gearDry(b.dataset.id);
    if (a==='toggleKota') return toggleKota(b.dataset.id);
    if (a==='toggleSetup') return toggleSetup(b.dataset.id);
    if (a==='startSetupLog') return addRecord('setup','設営撤収ログ開始');
    if (a==='openWeather') return openModal({type:'weather'});
    if (a==='saveWeather') return saveWeather();
    if (a==='openPlace') return openModal({type:'place'});
    if (a==='savePlace') return savePlace();
    if (a==='placeToEvent') return placeToEvent(b.dataset.id);
    if (a==='startSession') return startWalk('normal');
    if (a==='startWalk') return startWalk(b.dataset.mode);
    if (a==='endSession') return endSession();
    if (a==='pickMedia') return mediaInput.click();
    if (a==='voice') return voiceMemo();
    if (a==='poop') return toiletRecord('poop');
    if (a==='pee') return toiletRecord('pee');
    if (a==='recordDog') return recordDog();
    if (a==='recordSpot') return recordSpot();
    if (a==='gps') return gpsRecord();
    if (a==='manualMemo') return manualMemo();
    if (a==='saveQuickPrep') return saveQuickPrep();
    if (a==='saveQuickMemo') return saveQuickMemo();
    if (a==='openQuick') return openModal({type:'quick', kind:b.dataset.kind});
    if (a==='saveQuickModal') return saveQuickModal(b.dataset.kind);
    if (a==='openPastEvent') return openPastEvent();
    if (a==='generateReview') return generateReview();
    if (a==='toggleImprovement') return toggleImprovement(b.dataset.id);
    if (a==='resolveCheck') return resolveCheck(b.dataset.id);
    if (a==='noop') return;
  }
  function selectDate(date) {
    if (clickTimer && state.ui.selectedDate === date) { clearTimeout(clickTimer); clickTimer=null; openModal({type:'event', date}); return; }
    clickTimer = setTimeout(()=>{ clickTimer=null; }, 280);
    state.ui.selectedDate = date; state.ui.month = date.slice(0,7); save(); render();
  }
  function openModal(m) { state.ui.modal=m; save(); render(); }
  function closeModal() { state.ui.modal=null; save(); render(); }
  function saveEvent() {
    const title = val('evTitle') || '新しい予定'; const start = val('evStart'); const end = val('evEnd') || start; const repeat = val('evRepeat');
    const ev = { id:uid('event'), title, type:val('evType')||'event', start:start||'', end:end||start||'', location:val('evLocation')||'場所未定', level:Number(val('evLevel')||1), status:'予定', memo:val('evMemo'), recurrence: repeat?{freq:repeat, interval:1, until:addDays(start || todayISO(), repeat==='yearly'?365*3:365)}:null };
    if (start) { state.events.push(ev); state.ui.currentId=ev.id; state.ui.selectedDate=start; state.ui.month=start.slice(0,7); } else { state.undated.push({ ...ev, start:null, end:null }); }
    closeModal(); save(); toast('予定を保存');
  }
  function val(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }
  function prepDoneCount(){ return state.prep.gear.filter(g=>g.status==='積込済').length + state.prep.kota.filter(k=>k.checked).length + state.prep.manualShopping.filter(s=>s.checked).length; }
  function prepTotalCount(){ return state.prep.gear.length + state.prep.kota.length + state.prep.manualShopping.length; }
  function toggleManualShop(id){ const i=state.prep.manualShopping.find(x=>x.id===id); if(i) i.checked=!i.checked; save(); render(); }
  function copyShopping(){ const text = ['【OUTBASE 買い物リスト】', ...recipeShopping().map(i=>`・${i.name} ${i.qty}${i.unit}（${i.recipes.join(' / ')}）`), ...state.prep.manualShopping.map(i=>`・${i.name} ${i.qty}`)].join('\n'); copyText(text,'買い物リストをコピー'); }
  function saveRecipe(){ const ingredients = val('recipeIngredients').split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{ const p=l.split(/\s+/); return { name:p[0]||l, qty:Number(p[1])||1, unit:p[2]||'個' }; }); state.prep.recipes.push({id:uid('recipe'), name:val('recipeName')||'料理', meal:val('recipeMeal')||'未定', people:Number(val('recipePeople')||2), difficulty:'未設定', weather:'未設定', gear:[], ingredients, note:''}); closeModal(); save(); toast('料理を追加'); }
  function saveGear(){ state.prep.gear.push({id:uid('gear'), name:val('gearName')||'ギア', category:val('gearCat')||'未分類', qty:val('gearQty')||'1', must:false, status:'未確認', dry:false, last:'未使用', note:val('gearNote')}); closeModal(); save(); toast('ギアを追加'); }
  function gearStatus(id,status){ const g=state.prep.gear.find(x=>x.id===id); if(g) g.status=status; save(); render(); }
  function gearDry(id){ const g=state.prep.gear.find(x=>x.id===id); if(g) g.dry=!g.dry; save(); render(); }
  function toggleKota(id){ const k=state.prep.kota.find(x=>x.id===id); if(k) k.checked=!k.checked; save(); render(); }
  function toggleSetup(id){ const s=state.prep.setupSteps.find(x=>x.id===id); if(s) s.done=!s.done; addRecord('setup', `${s?.name || '工程'} ${s?.done?'完了':'未完了'}`); save(); render(); }
  function saveWeather(){ const place = state.places.find(p=>p.weatherWatch) || state.places[0]; state.weather.push({id:uid('weather'), placeId:place.id, date:val('weatherDate')||state.ui.selectedDate, label:val('weatherLabel')||'監視', rain:Number(val('weatherRain')||0), wind:Number(val('weatherWind')||0), temp:Number(val('weatherTemp')||0), humidity:Number(val('weatherHum')||0), note:val('weatherNote')}); closeModal(); save(); toast('天気監視を追加'); }
  function savePlace(){ state.places.push({id:uid('place'), name:val('placeName')||'場所', category:val('placeCat')||'場所', address:val('placeAddr')||'', altitude:'未設定', favorite:3, pet:3, visits:0, weatherWatch:false, memo:val('placeMemo'), season:'', cards:[]}); closeModal(); save(); toast('場所を追加'); }
  function placeToEvent(id){ const p=state.places.find(x=>x.id===id); if(!p) return; state.events.push({id:uid('event'), title:`${p.name}へ行く`, type:p.category.includes('キャンプ')?'camp':'outing', start:state.ui.selectedDate, end:state.ui.selectedDate, location:p.name, level:3, status:'予定', memo:p.memo, recurrence:null}); save(); toast('予定に追加'); render(); }
  function startWalk(mode){ const s={id:uid('session'), eventId:currentEvent()?.id, mode:mode==='camp'?'camp':mode==='free'?'free':'normal', modeLabel:mode==='camp'?'キャンプ場散歩':mode==='free'?'自由記録':'通常散歩', startedAt:nowTime(), date:todayISO(), gps:[], records:[]}; state.sessions.push(s); state.ui.activeSessionId=s.id; state.ui.plusMode='field'; save(); render(); toast('記録開始'); }
  function endSession(){ const s=activeSession(); if(s){s.endedAt=nowTime(); state.ui.activeSessionId=null; addRecord('session', `${s.modeLabel}終了`);} save(); render(); toast('記録終了'); }
  function addRecord(kind,text,extra={}){ const s=activeSession(); const ev=currentEvent(); const r={id:uid('rec'), kind, text, note:text, eventId:extra.eventId || ev?.id || null, sessionId:s?.id||null, mode:s?.mode||'', modeLabel:s?.modeLabel||'', date:todayISO(), time:nowTime(), place:ev?.location||'', needsCheck:extra.needsCheck||false, ...extra}; state.records.unshift(r); if(r.needsCheck) state.checks.push({id:uid('check'), title:recordTitle(r), reason:'保存先または場所候補の確認が必要', recordId:r.id}); save(); }
  function toiletRecord(kind){ const s=activeSession() || startAndReturn('normal'); const isCamp = s.mode === 'camp'; const text = kind==='poop' ? (isCamp?'うんち：回収済み・場所カード候補も保存':'うんち：健康ログとして保存') : (isCamp?'おしっこ：場所/マナー注意として保存':'おしっこ：健康ログとして保存'); addRecord(kind,text,{needsCheck:isCamp, place:isCamp?(currentEvent()?.location||'キャンプ場'):'自宅周辺'}); render(); toast(kind==='poop'?'うんち記録':'おしっこ記録'); }
  function startAndReturn(mode){ const s={id:uid('session'), eventId:currentEvent()?.id, mode, modeLabel:'通常散歩', startedAt:nowTime(), date:todayISO(), gps:[], records:[]}; state.sessions.push(s); state.ui.activeSessionId=s.id; save(); return s; }
  function recordDog(){ addRecord('dog','犬友達候補。名前不明OK。特徴を後で補完',{needsCheck:true}); toast('犬友達を記録'); render(); }
  function recordSpot(){ addRecord('spot','スポット候補。場所カードへ変換可能',{needsCheck:true}); toast('スポットを記録'); render(); }
  function manualMemo(){ const text=prompt('メモ内容')||''; if(text) { addRecord('memo', text, {needsCheck: !guessEvent(text)}); toast('メモ保存'); render(); } }
  function saveQuickPrep(){ const t=val('quickPrepText'); if(t){ addRecord('prep',t,{needsCheck:!guessEvent(t)}); toast('準備メモ保存'); render(); } }
  function saveQuickMemo(){ const t=val('quickMemoText'); if(t){ addRecord('memo',t,{needsCheck:!guessEvent(t)}); toast('メモ保存'); render(); } }
  function saveQuickModal(kind){ const t=val('quickModalText'); if(t){ addRecord(kind,t,{needsCheck:true}); closeModal(); save(); toast('保存'); } }
  function guessEvent(text){ const ev=currentEvent(); return ev && (text.includes('キャンプ') || text.includes('コタ') || text.includes('買') || text.includes('ギア')); }
  function openPastEvent(){ openModal({type:'event', date:addDays(todayISO(),-30)}); }
  function generateReview(){ const ev=currentEvent(); const count=state.records.filter(r=>r.eventId===ev.id).length; const text = count ? `${ev.title} の記録${count}件から、次回の忘れ物・天気・料理を確認する` : `${ev.title} は記録待ち。帰宅後に良かった点と失敗を残す`; state.improvements.unshift({id:uid('imp'), eventId:ev.id, text, source:'チャッピー提案', done:false}); save(); render(); toast('レビュー生成'); }
  function toggleImprovement(id){ const i=state.improvements.find(x=>x.id===id); if(i) i.done=!i.done; save(); render(); }
  function resolveCheck(id){ state.checks = state.checks.filter(c=>c.id!==id); save(); render(); }
  function gpsRecord(){ if(!navigator.geolocation){ addRecord('gps','GPS非対応。手動位置候補',{needsCheck:true}); toast('GPS非対応'); render(); return; } navigator.geolocation.getCurrentPosition(pos=>{ addRecord('gps',`位置 ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`,{lat:pos.coords.latitude,lng:pos.coords.longitude}); toast('位置を保存'); render(); },()=>{ addRecord('gps','GPS取得失敗。手動確認へ',{needsCheck:true}); toast('GPS取得失敗'); render(); }); }
  function voiceMemo(){ const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition; if(!SpeechRecognition){ manualVoiceFallback(); return; } const rec = new SpeechRecognition(); rec.lang='ja-JP'; rec.interimResults=false; rec.onresult=e=>{ const text=e.results[0][0].transcript; addRecord('voice',text,{needsCheck:!guessEvent(text)}); toast('声メモ保存'); render(); }; rec.onerror=manualVoiceFallback; rec.start(); toast('話してください'); }
  function manualVoiceFallback(){ const text=prompt('音声文字起こしメモ（非対応時は手入力）')||''; if(text) { addRecord('voice',text,{needsCheck:!guessEvent(text)}); toast('声メモ保存'); render(); } }
  mediaInput.addEventListener('change', e=>{ [...e.target.files].forEach(f=>addRecord(f.type.startsWith('video')?'video':'photo', f.name, { fileName:f.name, fileType:f.type, needsCheck:false })); e.target.value=''; save(); render(); toast('写真/動画を保存'); });
  importInput.addEventListener('change', e=>{ [...e.target.files].forEach(f=>state.importQueue.unshift({id:uid('impq'), name:f.name, type:f.type || f.name.split('.').pop(), createdAt:new Date().toISOString()})); e.target.value=''; save(); render(); toast('取込候補に追加'); });
  function promoteUndated(id){ const u=state.undated.find(x=>x.id===id); if(!u) return; state.undated=state.undated.filter(x=>x.id!==id); state.events.push({...u,id:uid('event'),start:state.ui.selectedDate,end:state.ui.selectedDate,status:'予定'}); save(); render(); toast('日付を設定'); }
  function copyText(text,msg){ navigator.clipboard?.writeText(text).then(()=>toast(msg)).catch(()=>{ prompt('コピーしてください',text); }); }
  function downloadFile(name,text,type){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type})); a.download=name; a.click(); URL.revokeObjectURL(a.href); }
  function restorePrompt(){ const text=prompt('バックアップJSONを貼り付け'); if(!text) return; try{ const data=JSON.parse(text); state=migrate(data); save(); render(); toast('復元完了'); } catch(e){ toast('復元失敗'); } }
  function exportICS(){ const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//OUTBASE//FIELD OS//JA']; state.events.forEach(e=>{ if(!e.start) return; lines.push('BEGIN:VEVENT',`UID:${e.id}@outbase`,`SUMMARY:${ics(e.title)}`,`DTSTART;VALUE=DATE:${e.start.replaceAll('-','')}`,`DTEND;VALUE=DATE:${addDays(e.end||e.start,1).replaceAll('-','')}`,`LOCATION:${ics(e.location||'')}`,`DESCRIPTION:${ics(e.memo||'')}`); if(e.recurrence?.freq) lines.push(`RRULE:FREQ=${e.recurrence.freq.toUpperCase()};INTERVAL=${e.recurrence.interval||1}`); lines.push('END:VEVENT'); }); lines.push('END:VCALENDAR'); downloadFile(`outbase-${todayISO()}.ics`, lines.join('\r\n'), 'text/calendar'); toast('ICS出力'); }
  function ics(s){ return String(s||'').replace(/[\\,;]/g,'\\$&').replace(/\n/g,'\\n'); }

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js?v=' + VERSION).catch(()=>{});
  render();
})();
