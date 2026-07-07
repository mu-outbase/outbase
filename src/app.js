(() => {
  'use strict';
  const VERSION = 'outbase-deep-remake-20260707';
  const STORAGE_KEY = 'outbase_deep_remake_state_v1';
  const app = document.getElementById('app');
  const mediaInput = document.getElementById('mediaInput');
  const importInput = document.getElementById('importInput');

  const pad = n => String(n).padStart(2, '0');
  const today = () => new Date().toISOString().slice(0, 10);
  const nowTime = () => new Date().toLocaleTimeString('ja-JP', {hour:'2-digit', minute:'2-digit'});
  const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const uid = p => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
  const clone = o => JSON.parse(JSON.stringify(o));
  const dateObj = iso => { const [y,m,d] = String(iso || today()).split('-').map(Number); return new Date(y,(m||1)-1,d||1); };
  const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const addDays = (iso, n) => { const d = dateObj(iso); d.setDate(d.getDate()+n); return isoDate(d); };
  const monthKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}`;
  const jpDate = iso => { if (!iso) return '日付未設定'; const d = dateObj(iso); return `${d.getMonth()+1}/${d.getDate()}(${['日','月','火','水','木','金','土'][d.getDay()]})`; };
  const between = (date,start,end) => date >= (start || date) && date <= (end || start || date);

  const defaultState = () => ({
    version: VERSION,
    view: 'home',
    selectedDate: today(),
    calendarCursor: today().slice(0,7) + '-01',
    activeProjectId: 'camp-akagi',
    walkMode: 'normal',
    walking: null,
    ui: { prepFilter: 'all', memoryFilter: 'all', searchFilter: 'places' },
    events: [
      {id:'camp-akagi', title:'スノーピーク赤城山キャンプ', type:'camp', level:4, status:'予定', start:'2026-07-23', end:'2026-07-24', location:'スノーピーク赤城山キャンプフィールド', recurrence:'none', memo:'予約から帰宅後レビューまで管理するキャンププロジェクト。', projectId:'camp-akagi'},
      {id:'walk-home', title:'コタと自宅散歩', type:'walk', level:3, status:'準備', start:today(), end:today(), location:'自宅周辺', recurrence:'none', memo:'通常散歩。健康・思い出・犬友達・危険メモを私的に残す。', projectId:'walk-home'},
      {id:'pay-card', title:'カード引落し確認', type:'pay', level:1, status:'普通', start:today().slice(0,8)+'27', end:today().slice(0,8)+'27', location:'-', recurrence:'monthly', memo:'繰り返し予定のサンプル。', projectId:null},
      {id:'car-check', title:'アルファード車検・点検メモ', type:'car', level:2, status:'普通', start:'2026-08-05', end:'2026-08-05', location:'ディーラー', recurrence:'yearly', memo:'毎年/隔年の管理を想定。', projectId:null},
      {id:'camp-search', title:'次に行きたいキャンプ場探し', type:'search', level:1, status:'未設定', start:null, end:null, noDate:true, location:'候補未決定', recurrence:'none', memo:'日付未設定枠。カレンダー日付には出さない。', projectId:null}
    ],
    projects: [
      {id:'camp-akagi', title:'スノーピーク赤城山キャンプ', type:'camp', start:'2026-07-23', end:'2026-07-24', stage:'準備中', people:'ムー・リン・コタ', site:'サイト未確定', weatherWatch:true},
      {id:'walk-home', title:'コタと自宅散歩', type:'walk', start:today(), end:today(), stage:'通常散歩', people:'ムー・コタ', site:'自宅周辺', weatherWatch:false}
    ],
    campgrounds: [
      {id:'akagi', name:'スノーピーク赤城山キャンプフィールド', dog:'犬可 / 直営 / 乾燥サービス確認', elevation:'約1350m', facilities:'管理棟・炊事場・トイレ・売店・灰捨て場', site:'風・日陰・水はけ・トイレ距離を記録対象', note:'犬連れ導線と幕体判断に使う場所カード。'},
      {id:'candidate', name:'次回候補：山中湖・那須・鹿沼', dog:'犬可を最優先', elevation:'暑期は標高/エアコン重視', facilities:'温水・電源・ドッグフリーを確認', site:'候補比較用', note:'予約スクショ/URL/MAPから候補化する。'}
    ],
    places: [
      {id:'p1', name:'管理棟までの犬連れ導線', kind:'campWalk', privacy:'公開可', location:'赤城山CF', tags:['管理棟','犬連れ','導線'], memo:'写真と音声から次回案内に使う。排泄ログはここには出さない。'},
      {id:'p2', name:'自宅周辺・安全な日陰ルート', kind:'normalWalk', privacy:'私的', location:'自宅周辺', tags:['日陰','休憩','安全'], memo:'通常散歩の体調・足取り・犬友達の記録に使う。'}
    ],
    dogFriends: [
      {id:'df1', name:'名前未確認の白い小型犬', breed:'不明', relation:'コタが落ち着いて挨拶', place:'自宅周辺', note:'飼い主さんの呼び方は次回確認。'}
    ],
    gear: [
      {id:'g1', name:'リビングシェル アイボリー', brand:'Snow Peak', category:'幕体', model:'65周年', qty:1, storage:'シェルフ横', car:'後方下段', container:'大型バッグ', set:'夏キャンプ基本', status:'持参候補', packed:false, used:22, last:'2026-05-17', dry:'乾燥済', issue:'雨撤収時は乾燥サービス判断', next:'風と雨でヘキサエヴォ併用を判断'},
      {id:'g2', name:'アメニティドームM アイボリー', brand:'Snow Peak', category:'寝室', model:'SDE-001系', qty:1, storage:'幕体棚', car:'後方下段', container:'大型バッグ', set:'デュオ寝室', status:'持参候補', packed:false, used:18, last:'2026-05-17', dry:'乾燥済', issue:'ドッキングしない運用も記録', next:'寝室単独時の設営時間を測る'},
      {id:'g3', name:'EcoFlow WAVE3', brand:'EcoFlow', category:'空調', model:'WAVE3', qty:1, storage:'電源棚', car:'助手席側上段', container:'専用箱', set:'暑期対策', status:'要判断', packed:false, used:2, last:'2026-05-17', dry:'-', issue:'消費電力と排熱導線', next:'気温25℃超なら候補'},
      {id:'g4', name:'ドッグオフトン・水・フード', brand:'Snow Peak / ペット', category:'コタ', model:'-', qty:1, storage:'ペット棚', car:'取り出しやすい位置', container:'ペットバッグ', set:'コタ基本', status:'必須', packed:false, used:22, last:'2026-05-17', dry:'洗濯確認', issue:'水切れ防止', next:'出発前チェック先頭'}
    ],
    meals: [
      {id:'m1', slot:'1日目 夜', name:'ガーリックシュリンプ', servings:2, ingredients:[['ブラックタイガー', '200〜300g'], ['にんにく','1個'], ['オリーブオイル','適量'], ['バター','少量'], ['レモン','任意']], gear:['大きいスキレット','バーナー','トング'], buyWhen:'当日購入', note:'バゲットなし前提。量が多くなりすぎないよう注意。'},
      {id:'m2', slot:'1日目 夜', name:'ピザ生地から作るピザ', servings:2, ingredients:[['強力粉/薄力粉','必要量'], ['チーズ','適量'], ['具材','少なめ'], ['トマトソース','1袋']], gear:['スキレットまたはフライパン','火器','カッティングボード'], buyWhen:'事前購入', note:'リンにLINEで送れるレシピを保持。'},
      {id:'m3', slot:'2日目 朝', name:'ホットサンド', servings:2, ingredients:[['食パン','4枚'], ['ハム/チーズ','2人分'], ['卵','2個']], gear:['ホットサンドメーカー','バーナー'], buyWhen:'前日購入', note:'撤収朝は軽く。'}
    ],
    setupPhases: ['家出発','休憩・買い出し','キャンプ場到着','受付開始','受付完了','サイト到着','レイアウト考察','レイアウト決定','荷下ろし','設営開始','幕体/タープ','寝室/リビング/キッチン','電源/空調/ランタン','ペットエリア','休憩/中断','設営完了','前日片付け','撤収開始','乾燥待ち','車載','サイト確認','チェックアウト','帰宅'],
    setupLogs: [],
    records: [
      {id:'r1', type:'memo', title:'前回改善：朝の撤収を早める', text:'前日片付けを増やす。雨なら乾燥サービス判断を先にする。', date:'2026-05-17', projectId:'camp-akagi', privacy:'private'},
      {id:'r2', type:'place', title:'赤城山・風の向きメモ', text:'タープ向きとコタの待機位置を風で判断。', date:'2026-05-16', projectId:'camp-akagi', privacy:'private'}
    ],
    healthLogs: [],
    improvements: [
      {id:'i1', target:'ギア', title:'ペット用品を取り出しやすい位置へ', reason:'到着直後に水・フード・リードが必要', status:'次回反映'},
      {id:'i2', target:'撤収', title:'前日片付けを増やす', reason:'朝の撤収時間を短縮する', status:'次回反映'}
    ],
    imports: [],
    weatherWatch: {
      location:'赤城山CF', updated:'未接続API / 監視ルール表示',
      checkpoints:[
        {label:'14日前', rain:'候補', wind:'傾向', temp:'標高補正', humidity:'-', dog:'暑熱注意の有無', action:'予約継続/代替候補'},
        {label:'7日前', rain:'降水確率', wind:'平均/最大', temp:'夜間最低', humidity:'結露候補', dog:'暑さ/寒さ', action:'幕体・空調・服装'},
        {label:'3日前', rain:'時間帯雨', wind:'設営時風', temp:'昼夜差', humidity:'乾燥/結露', dog:'散歩時間', action:'買い物/ギア最終'},
        {label:'前日', rain:'設営/夜/撤収', wind:'突風', temp:'寝具', humidity:'乾燥待ち', dog:'車待機不可', action:'出発/キャンセル判断'},
        {label:'当日', rain:'1時間単位', wind:'現地実測', temp:'体感', humidity:'幕体乾燥', dog:'路面温度', action:'設営順/撤収開始'}
      ]
    }
  });

  let state = load();
  let touchStartX = 0;
  let lastTap = {date:null, time:0};

  function load(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(raw){
        const loaded = JSON.parse(raw);
        const base = defaultState();
        return {...base, ...loaded, version: VERSION, ui:{...base.ui, ...(loaded.ui||{})}};
      }
    }catch(e){}
    return defaultState();
  }
  function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function setState(patch){ state = {...state, ...patch}; save(); render(); }
  function activeProject(){ return state.projects.find(p => p.id === state.activeProjectId) || state.projects[0]; }
  function eventTypeLabel(type){ return ({camp:'キャンプ',walk:'散歩',campWalk:'キャンプ場散歩',work:'仕事',pay:'支払い',medical:'病院',family:'家族',car:'車',search:'探す',memo:'メモ'}[type] || type || '予定'); }
  function eventTone(type){ return ({camp:'camp',walk:'walk',campWalk:'walk',work:'work',pay:'pay',car:'work',medical:'pay'}[type] || 'camp'); }

  function isOccurrence(ev, iso){
    if(ev.noDate || !ev.start) return false;
    if(ev.recurrence && ev.recurrence !== 'none'){
      const d = dateObj(iso), s = dateObj(ev.start);
      if(ev.recurrence === 'monthly') return d.getDate() === s.getDate();
      if(ev.recurrence === 'yearly') return d.getMonth() === s.getMonth() && d.getDate() === s.getDate();
      if(ev.recurrence === 'weekly') return d.getDay() === s.getDay() && iso >= ev.start;
    }
    return between(iso, ev.start, ev.end || ev.start);
  }
  function eventsOnDate(iso){ return state.events.filter(ev => isOccurrence(ev, iso)); }
  function noDateEvents(){ return state.events.filter(ev => ev.noDate || !ev.start); }
  function selectedEvents(){ return eventsOnDate(state.selectedDate); }

  function monthMatrix(cursor){
    const c = dateObj(cursor); c.setDate(1);
    const start = new Date(c); start.setDate(1 - start.getDay());
    const rows = [];
    for(let i=0;i<42;i++){ const d = new Date(start); d.setDate(start.getDate()+i); rows.push(d); }
    return rows;
  }
  function changeMonth(delta){
    const d = dateObj(state.calendarCursor); d.setMonth(d.getMonth()+delta); d.setDate(1);
    state.calendarCursor = isoDate(d);
    save(); render();
  }
  function selectDate(iso){
    const now = Date.now();
    if(lastTap.date === iso && now - lastTap.time < 380){ openEventModal(iso); lastTap = {date:null,time:0}; return; }
    lastTap = {date:iso,time:now};
    state.selectedDate = iso;
    save(); render();
  }

  function header(){
    const p = activeProject();
    return `
      <header class="topbar">
        <div class="brand">
          <div class="logo">OB</div>
          <div class="brand-copy"><div class="brand-title">OUTBASE</div><div class="brand-sub">本質再読込 / 深掘り監査版</div></div>
        </div>
        <div class="top-actions">
          <button class="header-btn" data-action="backup">控え</button>
          <button class="header-btn dark" data-action="import">取込</button>
        </div>
      </header>
      <div class="small-plan-zone">
        <button class="small-plan-chip" data-action="switchPlan">
          <span class="small-plan-label">現在</span>
          <span><strong>${esc(p.title)}</strong><small>${esc(eventTypeLabel(p.type))} / ${esc(p.start || '日付未設定')}${p.end && p.end !== p.start ? '〜'+esc(p.end) : ''}</small></span>
          <i>切替</i>
        </button>
      </div>`;
  }
  function bottomNav(){
    const nav = [['calendar','予定'],['search','探す'],['prep','準備'],['plus','＋'],['memory','思い出']];
    return `<nav class="bottom-nav">${nav.map(([id,label])=>`<button class="nav-btn ${state.view===id?'active':''}" data-nav="${id}">${label}</button>`).join('')}</nav>`;
  }
  function shell(content){ return `${header()}${content}${bottomNav()}${modalRoot()}${toastRoot()}`; }

  function renderHome(){
    const p = activeProject();
    const day = selectedEvents();
    return shell(`
      <section class="hero">
        <div class="hero-kicker">OUTBASE / 今日の一手</div>
        <h1>今日は何する？</h1>
        <p>予定を見るだけで終わらせない。キャンプ前、現地、帰宅後、次回改善までつなげる。</p>
      </section>
      <section class="stack">
        <article class="card"><div class="card-inner">
          <div class="card-header"><div><div class="eyebrow">次に開く理由</div><h2 class="card-title">${esc(p.title)}</h2></div><span class="tag dark">${esc(p.stage)}</span></div>
          <div class="plan-flow">
            ${phasePill('天気監視', '設営/夜/撤収の雨・風・気温を見る', '7日前〜当日')}
            ${phasePill('準備', '料理・買い物・ギア・コタを確認', '買い物統合')}
            ${phasePill('現地', '写真・動画・声・体調・スポットを3秒で残す', '非公開ログ含む')}
            ${phasePill('帰宅後', '良かった/失敗/次回を自動候補にする', '次回へ返す')}
          </div>
          <div class="actions"><button class="btn primary" data-nav="prep">準備を見る</button><button class="btn" data-nav="plus">現地で残す</button><button class="btn ghost" data-nav="memory">前回改善</button></div>
        </div></article>
        ${calendarCard('home')}
        <article class="card"><div class="card-inner">
          <div class="card-header"><div><div class="eyebrow">チャッピーメモ</div><h2 class="card-title">考えなくていい確認</h2></div><span class="tag">候補</span></div>
          <div class="item-list">
            ${homeItem('雨・風', '3日前から設営と撤収を分けて見る。風が強ければタープとコタ待機位置を先に決める。')}
            ${homeItem('買い物', '献立から統合。魚介/肉/調味料/消耗品/氷/薪を別枠で確認。')}
            ${homeItem('ギア', 'Excel取込・保管場所・車載位置・コンテナ・乾燥/破損/忘れ物まで見る。')}
          </div>
        </div></article>
      </section>`);
  }
  function phasePill(title, text, tag){ return `<div class="phase-row"><b>${esc(title)}</b><small>${esc(text)}</small><span class="tag">${esc(tag)}</span></div>`; }
  function homeItem(title, sub){ return `<div class="item"><div class="item-main"><div class="item-title">${esc(title)}</div><div class="item-sub">${esc(sub)}</div></div></div>`; }

  function calendarCard(context='full'){
    const cursor = dateObj(state.calendarCursor);
    const days = monthMatrix(state.calendarCursor);
    return `<article class="card calendar-shell" data-calendar-shell="1">
      <div class="card-inner">
        <div class="card-header"><div><div class="eyebrow">高機能カレンダー</div><h2 class="card-title">全予定・連日・繰り返し</h2></div><button class="btn slim primary" data-action="addEvent" data-date="${esc(state.selectedDate)}">予定追加</button></div>
        <div class="calendar-toolbar">
          <button class="cal-nav" data-action="monthPrev">‹</button>
          <div class="calendar-summary"><strong>${cursor.getFullYear()}年 ${cursor.getMonth()+1}月</strong><span>左右スライド月移動 / タップ選択 / ダブルタップ追加</span></div>
          <button class="cal-nav" data-action="monthNext">›</button>
        </div>
        <div class="calendar-weekdays">${['日','月','火','水','木','金','土'].map(d=>`<b>${d}</b>`).join('')}</div>
        <div class="calendar-grid">
          ${days.map(dayCell).join('')}
        </div>
        <div class="day-detail">
          <div class="card-header"><div><div class="eyebrow">${esc(jpDate(state.selectedDate))}</div><h2 class="card-title">この日の予定</h2></div><span class="tag">${selectedEvents().length}件</span></div>
          <div class="item-list">${selectedEvents().length ? selectedEvents().map(eventItem).join('') : '<div class="empty">この日はまだ予定がない。日付をダブルタップで追加。</div>'}</div>
          ${noDateEvents().length ? `<div class="sep"></div><div class="subheading">日付未設定</div><div class="item-list">${noDateEvents().map(eventItem).join('')}</div>` : ''}
        </div>
      </div>
    </article>`;
  }
  function dayCell(d){
    const iso = isoDate(d), c = dateObj(state.calendarCursor), inMonth = d.getMonth() === c.getMonth(), items = eventsOnDate(iso);
    const classes = ['calendar-day'];
    if(!inMonth) classes.push('empty-day');
    if(iso === today()) classes.push('today');
    if(iso === state.selectedDate) classes.push('selected');
    if(items.some(ev => ev.start && ev.end && ev.end !== ev.start)) classes.push('range');
    if(items.some(ev => ev.start === iso && ev.end && ev.end !== ev.start)) classes.push('range-start');
    if(items.some(ev => ev.end === iso && ev.end !== ev.start)) classes.push('range-end');
    const bars = items.slice(0,3).map(ev => `<i class="day-bar ${eventTone(ev.type)}" title="${esc(ev.title)}"></i>`).join('');
    const more = items.length > 3 ? `<span class="day-more">他${items.length-3}</span>` : '';
    return `<button class="${classes.join(' ')}" data-date="${iso}"><span class="day-number">${d.getDate()}</span><span class="day-bars">${bars}${more}</span></button>`;
  }
  function eventItem(ev){
    const rec = ev.recurrence && ev.recurrence !== 'none' ? ` / ${recurrenceLabel(ev.recurrence)}` : '';
    const range = ev.start ? `${jpDate(ev.start)}${ev.end && ev.end !== ev.start ? '〜'+jpDate(ev.end) : ''}` : '日付未設定';
    return `<div class="item compact"><div class="item-main"><div class="item-title">${esc(ev.title)}</div><div class="item-sub">${esc(eventTypeLabel(ev.type))} / Lv.${esc(ev.level)} / ${esc(ev.status)} / ${esc(range)}${esc(rec)} / ${esc(ev.location||'')}</div></div><div class="right"><span class="tag ${ev.type==='camp'?'dark':''}">${esc(ev.status)}</span><button class="btn slim" data-action="setProject" data-id="${esc(ev.projectId || ev.id)}">主役</button></div></div>`;
  }
  function recurrenceLabel(r){ return ({weekly:'毎週',monthly:'毎月',yearly:'毎年'}[r] || r); }

  function renderCalendar(){ return shell(`<section class="hero"><div class="hero-kicker">予定</div><h1>予定を育てる</h1><p>ジョルテ代替の中心。月スライド、タップ、ダブルタップ、連日、繰り返し、日付未設定を分けて扱う。</p></section>${calendarCard('full')}`); }

  function renderSearch(){
    return shell(`<section class="hero"><div class="hero-kicker">探す</div><h1>行き先を育てる</h1><p>キャンプ場・散歩先・寄り道は予定とは分けて保存。URL、予約スクショ、MAP、写真、声から場所カード候補にする。</p></section>
    <section class="stack">
      <article class="card"><div class="card-inner"><div class="card-header"><div><div class="eyebrow">場所カード</div><h2 class="card-title">犬連れ・設備・導線</h2></div><button class="btn slim primary" data-action="addPlace">追加</button></div>
      <div class="item-list">${state.campgrounds.map(c=>`<div class="item compact"><div class="item-main"><div class="item-title">${esc(c.name)}</div><div class="item-sub">${esc(c.dog)} / ${esc(c.elevation)} / ${esc(c.facilities)}</div><div class="chip-row" style="margin-top:8px"><span class="tag">犬条件</span><span class="tag">サイト</span><span class="tag">天気監視</span></div></div></div>`).join('')}</div></div></article>
      <article class="card"><div class="card-inner"><div class="card-header"><div><div class="eyebrow">ルート・寄り道</div><h2 class="card-title">現ルート優先</h2></div><span class="tag">下り/追加時間</span></div>
      <div class="item-list">${homeItem('買い出し候補', '現ルート上、軽微な寄り道、寄り道ありを分ける。追加時間を最優先表示。')}${homeItem('休憩・温泉・昼食', '予定到着との差分を保存し、次回出発時刻へ返す。')}</div></div></article>
      ${weatherCard()}
    </section>`);
  }
  function weatherCard(){
    const w = state.weatherWatch;
    return `<article class="card"><div class="card-inner"><div class="card-header"><div><div class="eyebrow">Weather Watch</div><h2 class="card-title">手入力ではなく判断材料</h2></div><span class="tag warn">API接続前</span></div><p class="note">${esc(w.location)} / ${esc(w.updated)}。雨・風・気温・湿度を設営/夜/撤収/コタ判断へつなぐ。</p><div class="weather-grid" style="margin-top:12px">${w.checkpoints.map(row=>`<div class="weather-row"><b>${esc(row.label)}</b><div class="weather-badges"><span class="tag">雨 ${esc(row.rain)}</span><span class="tag">風 ${esc(row.wind)}</span><span class="tag">気温 ${esc(row.temp)}</span><span class="tag private">コタ ${esc(row.dog)}</span><span class="tag warn">${esc(row.action)}</span></div></div>`).join('')}</div></div></article>`;
  }

  function renderPrep(){
    const p = activeProject();
    const filters = [['all','全部'],['meal','料理'],['shop','買い物'],['gear','ギア'],['route','ルート'],['setup','設営撤収'],['kota','コタ']];
    return shell(`<section class="hero"><div class="hero-kicker">準備</div><h1>忘れない準備</h1><p>${esc(p.title)} の準備。料理、買い物、ギア、ルート、天気、設営撤収が別々ではなく繋がる。</p></section>
    <div class="filter-row" style="margin-bottom:12px">${filters.map(([id,label])=>`<button class="chip ${state.ui.prepFilter===id?'active':''}" data-action="prepFilter" data-filter="${id}">${label}</button>`).join('')}</div>
    <section class="stack">${prepContent()}</section>`);
  }
  function prepContent(){
    const f = state.ui.prepFilter;
    const chunks = [];
    if(f==='all'||f==='meal') chunks.push(mealSection());
    if(f==='all'||f==='shop') chunks.push(shoppingSection());
    if(f==='all'||f==='gear') chunks.push(gearSection());
    if(f==='all'||f==='route') chunks.push(routeSection());
    if(f==='all'||f==='setup') chunks.push(setupSection());
    if(f==='all'||f==='kota') chunks.push(kotaSection());
    return chunks.join('');
  }
  function mealSection(){
    return `<article class="card"><div class="card-inner"><div class="card-header"><div><div class="eyebrow">料理・献立</div><h2 class="card-title">朝昼夜・人数・買い物連動</h2></div><button class="btn slim primary" data-action="lineMeal">LINEコピー</button></div><div class="meal-grid">${state.meals.map(m=>`<div class="meal-card"><div class="meal-head"><div><span class="tag">${esc(m.slot)}</span><h3>${esc(m.name)}</h3></div><span class="tag">${esc(m.servings)}人分</span></div><ul><li>材料：${m.ingredients.map(i=>`${esc(i[0])} ${esc(i[1])}`).join(' / ')}</li><li>必要ギア：${m.gear.map(esc).join(' / ')}</li><li>購入：${esc(m.buyWhen)}</li><li>${esc(m.note)}</li></ul></div>`).join('')}</div></div></article>`;
  }
  function allShoppingItems(){
    const items = [];
    state.meals.forEach(m => m.ingredients.forEach(([name,qty]) => items.push({id:`${m.id}-${name}`, name, qty, source:m.name, group:guessShoppingGroup(name), done:false})));
    items.push({id:'gas', name:'ガス缶/燃料', qty:'残量確認', source:'火器', group:'消耗品', done:false});
    items.push({id:'ice', name:'氷', qty:'当日', source:'クーラー', group:'消耗品', done:false});
    items.push({id:'kota-food', name:'コタの水・フード', qty:'必須', source:'コタ', group:'ペット', done:false});
    return items;
  }
  function guessShoppingGroup(name){ if(/タイガー|肉|卵|ハム|チーズ|食パン|具材/.test(name)) return '食品'; if(/油|バター|ソース|にんにく|レモン/.test(name)) return '調味料'; return 'その他'; }
  function shoppingSection(){
    const items = allShoppingItems();
    return `<article class="card"><div class="card-inner"><div class="card-header"><div><div class="eyebrow">買い物</div><h2 class="card-title">献立から自動統合</h2></div><button class="btn slim primary" data-action="copyShopping">コピー</button></div><div class="item-list">${items.map(it=>`<div class="item shopping-row"><button class="check ${it.done?'done':''}" data-action="toggleShopping"></button><div class="item-main"><div class="item-title">${esc(it.name)} <span class="tag">${esc(it.group)}</span></div><div class="item-sub">${esc(it.qty)} / 元：${esc(it.source)}</div></div><span class="tag">未</span></div>`).join('')}</div></div></article>`;
  }
  function gearSection(){
    return `<article class="card"><div class="card-inner"><div class="card-header"><div><div class="eyebrow">ギア管理</div><h2 class="card-title">台帳ではなく使える持ち物</h2></div><button class="btn slim primary" data-action="openGearImport">取込</button></div><p class="note">Excel、購入履歴、写真から候補化。保管場所・車載位置・コンテナ・乾燥・破損・忘れ物・使用履歴まで見る。</p><div class="gear-table" style="margin-top:12px">${state.gear.map(g=>`<div class="gear-row"><div><div class="item-title">${esc(g.name)}</div><div class="item-sub">${esc(g.brand)} / ${esc(g.category)} / ${esc(g.model)} / 数量${esc(g.qty)}</div><div class="gear-meta"><span class="tag">保管 ${esc(g.storage)}</span><span class="tag">車載 ${esc(g.car)}</span><span class="tag">箱 ${esc(g.container)}</span><span class="tag private">${esc(g.dry)}</span><span class="tag warn">${esc(g.issue)}</span></div></div><button class="btn slim ${g.packed?'primary':''}" data-action="packGear" data-id="${esc(g.id)}">${g.packed?'積込済':'積込'}</button></div>`).join('')}</div></div></article>`;
  }
  function routeSection(){
    return `<article class="card"><div class="card-inner"><div class="card-header"><div><div class="eyebrow">ルート</div><h2 class="card-title">出発・買い出し・寄り道</h2></div><span class="tag">差分保存</span></div><div class="item-list">${homeItem('出発予定', '06:30〜06:45。通り道コンビニを指定し、寄り道は追加時間で分類。')}${homeItem('Google Map連携候補', '予想到着・実到着・渋滞ポイント・休憩を保存して次回へ返す。')}</div></div></article>`;
  }
  function setupSection(){
    return `<article class="card"><div class="card-inner"><div class="card-header"><div><div class="eyebrow">設営・撤収ログ</div><h2 class="card-title">単純タイマー禁止</h2></div><button class="btn slim primary" data-action="logSetup">工程記録</button></div><div class="item-list">${state.setupPhases.slice(0,10).map((ph,i)=>`<div class="item dense"><div class="item-main"><div class="item-title">${i+1}. ${esc(ph)}</div><div class="item-sub">時刻/GPS/天気/人数係数/中断理由を保存。次回逆算に使う。</div></div><button class="btn slim" data-action="logSetup" data-phase="${esc(ph)}">記録</button></div>`).join('')}</div></div></article>`;
  }
  function kotaSection(){
    return `<article class="card"><div class="card-inner"><div class="card-header"><div><div class="eyebrow">コタ準備</div><h2 class="card-title">犬連れ前提</h2></div><span class="tag private">体調は非公開</span></div><div class="item-list">${homeItem('水・フード・リード', '到着直後に必要。車載は取り出しやすい位置。')}${homeItem('暑さ/寒さ/路面', '天気監視と連動。散歩時間・車待機不可を先に出す。')}${homeItem('体調ログ', '表には出さず、散歩中の体調パネルから非公開で記録。')}</div></div></article>`;
  }

  function renderPlus(){
    const walking = state.walking;
    return shell(`<section class="hero"><div class="hero-kicker">記録</div><h1>3秒で残す</h1><p>入力欄ではなく現地ボタン。排泄ログは表に出さず、体調パネル内で非公開保存する。</p></section>
    <section class="stack">
      <article class="card"><div class="card-inner"><div class="card-header"><div><div class="eyebrow">入口</div><h2 class="card-title">予定・準備・現地・過去・メモ</h2></div><span class="tag">後で紐付け</span></div><div class="grid-2"><button class="record-tile primary" data-action="addEvent"><strong>予定</strong><small>普通の予定もキャンプも</small></button><button class="record-tile" data-nav="prep"><strong>準備</strong><small>予定なしでも開始</small></button><button class="record-tile" data-action="quickRecord"><strong>現地記録</strong><small>写真・声・場所・メモ</small></button><button class="record-tile" data-action="pastActual"><strong>過去実績</strong><small>後から登録</small></button><button class="record-tile" data-action="quickMemo"><strong>メモ</strong><small>文脈で仮紐付け</small></button><button class="record-tile" data-action="import"><strong>一括取込</strong><small>写真/PDF/Excel/スクショ</small></button></div></div></article>
      <article class="card"><div class="card-inner"><div class="card-header"><div><div class="eyebrow">散歩</div><h2 class="card-title">${walking ? '散歩中' : '散歩を開始'}</h2></div>${walking ? '<button class="btn slim warn" data-action="endWalk">終了</button>' : '<span class="tag">手動開始</span>'}</div>${walkPanel()}</div></article>
      <article class="card"><div class="card-inner"><div class="card-header"><div><div class="eyebrow">現地ボタン</div><h2 class="card-title">表に出すものだけ</h2></div><span class="tag private">体調は奥</span></div><div class="record-grid"><button class="record-tile primary" data-action="media" data-kind="photo"><strong>写真</strong><small>標準カメラ/高画質</small></button><button class="record-tile" data-action="media" data-kind="video"><strong>動画</strong><small>将来拡張も保持</small></button><button class="record-tile" data-action="voice"><strong>声メモ</strong><small>録音ではなく文字起こし</small></button><button class="record-tile" data-action="health"><strong>体調</strong><small>非公開ログ</small></button><button class="record-tile" data-action="dogFriend"><strong>犬友達</strong><small>候補表示/遭遇</small></button><button class="record-tile" data-action="spot"><strong>スポット</strong><small>場所カード候補</small></button></div></div></article>
    </section>`);
  }
  function walkPanel(){
    if(!state.walking){
      return `<div class="grid-2"><button class="btn primary" data-action="startWalk" data-mode="normal">通常散歩開始</button><button class="btn" data-action="startWalk" data-mode="camp">キャンプ場散歩開始</button></div><div class="private-box" style="margin-top:12px"><h3>モード差分</h3><p>通常散歩：健康・思い出・犬友達を私的に残す。キャンプ場散歩：管理棟・サイト・設備・導線・景色を場所カード化する。体調/排泄ログはどちらも表レビューには出さない。</p></div>`;
    }
    return `<div class="metric-row"><div class="metric"><small>モード</small><strong>${state.walking.mode==='camp'?'キャンプ場散歩':'通常散歩'}</strong></div><div class="metric"><small>開始</small><strong>${esc(state.walking.startedAt)}</strong></div><div class="metric"><small>記録</small><strong>${state.records.filter(r=>r.sessionId===state.walking.id).length}件</strong></div></div><div class="private-box" style="margin-top:12px"><h3>非公開ログの扱い</h3><p>${state.walking.mode==='camp'?'キャンプ場散歩では設備・導線・景色は場所カード化。体調/排泄ログは公開レビュー・場所カード表面・候補比較には出さない。':'通常散歩ではコタの健康・足取り・危険を私的に蓄積。表には出さず、必要な時だけ体調履歴で見る。'}</p></div>`;
  }

  function renderMemory(){
    return shell(`<section class="hero"><div class="hero-kicker">思い出</div><h1>次回へ返す</h1><p>記録を並べるだけではなく、レビュー・改善・持ち物・料理・撤収時刻に戻す。</p></section>
    <section class="stack">
      <article class="card"><div class="card-inner"><div class="card-header"><div><div class="eyebrow">レビュー・次回改善</div><h2 class="card-title">作文ではなく行動へ</h2></div><button class="btn slim primary" data-action="generateReview">生成候補</button></div><div class="item-list">${state.improvements.map(i=>`<div class="item"><div class="item-main"><div class="item-title">${esc(i.title)}</div><div class="item-sub">${esc(i.target)} / ${esc(i.reason)}</div></div><span class="tag">${esc(i.status)}</span></div>`).join('')}</div></div></article>
      <article class="card"><div class="card-inner"><div class="card-header"><div><div class="eyebrow">記録カード</div><h2 class="card-title">写真・声・場所・メモ</h2></div><span class="tag">${state.records.length}件</span></div><div class="item-list">${state.records.map(r=>`<div class="item compact"><div class="item-main"><div class="item-title">${esc(r.title)}</div><div class="item-sub">${esc(r.date)} / ${esc(r.type)} / ${esc(r.privacy || 'private')}</div><p class="note" style="margin-top:6px">${esc(r.text)}</p></div></div>`).join('')}</div></div></article>
      <article class="card"><div class="card-inner"><div class="card-header"><div><div class="eyebrow">体調ログ</div><h2 class="card-title">表に出さない記録</h2></div><span class="tag private">非公開</span></div><div class="private-box"><h3>公開しないルール</h3><p>体調/排泄は散歩中の操作には必要だが、ホーム・場所カード表面・キャンプ場レビュー・共有候補には出さない。通常散歩では健康履歴、キャンプ場散歩では公開レビューから除外した私的ログとして保存する。</p></div><div class="item-list" style="margin-top:12px">${state.healthLogs.length ? state.healthLogs.map(h=>`<div class="item"><div class="item-main"><div class="item-title">${esc(h.kind)} / ${esc(h.mode)}</div><div class="item-sub">${esc(h.date)} ${esc(h.time)} / ${esc(h.place||'位置候補')}</div></div><span class="tag private">非公開</span></div>`).join('') : '<div class="empty">非公開ログはまだない</div>'}</div></div></article>
    </section>`);
  }

  function render(){
    const views = {home:renderHome, calendar:renderCalendar, search:renderSearch, prep:renderPrep, plus:renderPlus, memory:renderMemory};
    app.innerHTML = (views[state.view] || renderHome)();
    bind();
  }
  function modalRoot(){ return '<div id="modalRoot"></div>'; }
  function toastRoot(){ return '<div id="toastRoot"></div>'; }
  function toast(msg){ const root = document.getElementById('toastRoot'); if(!root) return; root.innerHTML = `<div class="toast">${esc(msg)}</div>`; setTimeout(()=>{ root.innerHTML=''; }, 1900); }
  function bind(){
    app.querySelectorAll('[data-nav]').forEach(btn => btn.addEventListener('click', () => setState({view:btn.dataset.nav})));
    app.querySelectorAll('[data-date]').forEach(btn => btn.addEventListener('click', () => selectDate(btn.dataset.date)));
    app.querySelectorAll('[data-action]').forEach(btn => btn.addEventListener('click', e => handleAction(e, btn)));
    const cal = app.querySelector('[data-calendar-shell]');
    if(cal){
      cal.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, {passive:true});
      cal.addEventListener('touchend', e => { const dx = e.changedTouches[0].screenX - touchStartX; if(Math.abs(dx) > 70) changeMonth(dx < 0 ? 1 : -1); }, {passive:true});
    }
  }
  function handleAction(e, btn){
    const a = btn.dataset.action;
    if(a === 'monthPrev') return changeMonth(-1);
    if(a === 'monthNext') return changeMonth(1);
    if(a === 'addEvent') return openEventModal(btn.dataset.date || state.selectedDate);
    if(a === 'setProject') { const id = btn.dataset.id; const ev = state.events.find(x=>x.id===id || x.projectId===id); if(ev?.projectId) state.activeProjectId = ev.projectId; else if(state.projects.some(p=>p.id===id)) state.activeProjectId = id; save(); render(); return; }
    if(a === 'switchPlan') return openPlanSwitch();
    if(a === 'prepFilter') { state.ui.prepFilter = btn.dataset.filter; save(); render(); return; }
    if(a === 'startWalk') return startWalk(btn.dataset.mode);
    if(a === 'endWalk') return endWalk();
    if(a === 'health') return openHealthModal();
    if(a === 'media') return mediaInput?.click();
    if(a === 'import') return importInput?.click();
    if(a === 'voice') return openTextModal('声メモ', '話した内容を文字起こしメモとして保存', 'voice');
    if(a === 'quickMemo') return openTextModal('メモ', '文脈で仮紐付けするメモ', 'memo');
    if(a === 'quickRecord') return openTextModal('現地記録', '写真・声・場所・メモをあとで紐付け', 'record');
    if(a === 'dogFriend') return openTextModal('犬友達', '犬名・犬種・相性・飼い主呼称など。未確認でも保存', 'dogFriend');
    if(a === 'spot') return openTextModal('スポット', '景色・日陰・水飲み・危険・設備など', 'spot');
    if(a === 'pastActual') return openTextModal('過去実績', '過去キャンプ・散歩・外出を後から登録', 'actual');
    if(a === 'copyShopping') return copyText(allShoppingItems().map(i=>`□ ${i.name}：${i.qty}（${i.group} / ${i.source}）`).join('\n'), '買い物リストをコピー');
    if(a === 'lineMeal') return copyText(state.meals.map(m=>`■${m.slot} ${m.name}\n材料：${m.ingredients.map(i=>i.join(' ')).join(' / ')}\nギア：${m.gear.join(' / ')}\nメモ：${m.note}`).join('\n\n'), '献立をコピー');
    if(a === 'openGearImport') return openGearImport();
    if(a === 'packGear') { const g = state.gear.find(x=>x.id===btn.dataset.id); if(g) g.packed = !g.packed; save(); render(); return; }
    if(a === 'logSetup') return logSetup(btn.dataset.phase || '工程');
    if(a === 'backup') return backup();
    if(a === 'addPlace') return openTextModal('場所カード候補', 'URL・予約スクショ・写真・声メモから候補化する', 'place');
    if(a === 'generateReview') return generateReview();
  }
  function startWalk(mode){
    state.walking = {id:uid('walk'), mode, date:today(), startedAt:nowTime(), projectId: mode === 'camp' ? state.activeProjectId : 'walk-home'};
    state.walkMode = mode;
    save(); render(); toast(`${mode==='camp'?'キャンプ場散歩':'通常散歩'}を開始`);
  }
  function endWalk(){
    if(state.walking){
      state.records.unshift({id:uid('rec'), type:'walk', title:`${state.walking.mode==='camp'?'キャンプ場散歩':'通常散歩'}終了`, text:'散歩セッションを終了。写真・声・体調・犬友達・スポットを後で紐付け可能。', date:today(), projectId:state.walking.projectId, sessionId:state.walking.id, privacy:'private'});
      state.walking = null; save(); render(); toast('散歩を終了');
    }
  }
  function openEventModal(date){
    openModal('予定追加', `<div class="form-grid"><div class="field"><label>予定名</label><input id="evTitle" value="新しい予定" /></div><div class="grid-2"><div class="field"><label>種類</label><select id="evType"><option value="camp">キャンプ</option><option value="walk">散歩</option><option value="work">仕事</option><option value="medical">病院</option><option value="pay">支払い</option><option value="family">家族</option><option value="car">車</option><option value="search">探す</option></select></div><div class="field"><label>深さ</label><select id="evLevel"><option value="1">Lv.1 普通</option><option value="2">Lv.2 メモ/持ち物</option><option value="3">Lv.3 準備</option><option value="4">Lv.4 記録/改善</option></select></div></div><div class="grid-2"><div class="field"><label>開始日</label><input id="evStart" type="date" value="${esc(date || today())}" /></div><div class="field"><label>終了日（連日予定）</label><input id="evEnd" type="date" value="${esc(date || today())}" /></div></div><div class="grid-2"><div class="field"><label>繰り返し</label><select id="evRec"><option value="none">なし</option><option value="weekly">毎週</option><option value="monthly">毎月</option><option value="yearly">毎年</option></select></div><div class="field"><label>場所</label><input id="evLoc" value="" placeholder="場所/候補" /></div></div><div class="field"><label>メモ</label><textarea id="evMemo" placeholder="予約番号、キャンセル期限、注意点など"></textarea></div><button class="btn primary" id="saveEventBtn">保存</button></div>`);
    document.getElementById('saveEventBtn').onclick = () => {
      const title = document.getElementById('evTitle').value.trim() || '新しい予定';
      const type = document.getElementById('evType').value;
      const start = document.getElementById('evStart').value;
      const end = document.getElementById('evEnd').value || start;
      const projectId = type === 'camp' ? uid('camp') : null;
      const ev = {id:uid('event'), title, type, level:Number(document.getElementById('evLevel').value), status:'予定', start, end, location:document.getElementById('evLoc').value, recurrence:document.getElementById('evRec').value, memo:document.getElementById('evMemo').value, projectId};
      state.events.push(ev);
      if(projectId) state.projects.push({id:projectId, title, type:'camp', start, end, stage:'準備中', people:'未設定', site:ev.location, weatherWatch:true});
      state.selectedDate = start;
      save(); closeModal(); render(); toast('予定を追加');
    };
  }
  function openPlanSwitch(){
    openModal('主役プラン切替', `<div class="item-list">${state.projects.map(p=>`<button class="item" data-plan-id="${esc(p.id)}"><div class="item-main"><div class="item-title">${esc(p.title)}</div><div class="item-sub">${esc(eventTypeLabel(p.type))} / ${esc(p.start||'日付未設定')} / ${esc(p.stage)}</div></div><span class="tag ${p.id===state.activeProjectId?'dark':''}">${p.id===state.activeProjectId?'現在':'切替'}</span></button>`).join('')}</div>`);
    document.querySelectorAll('[data-plan-id]').forEach(b=>b.onclick=()=>{ state.activeProjectId=b.dataset.planId; save(); closeModal(); render(); });
  }
  function openHealthModal(){
    const mode = state.walking?.mode || state.walkMode || 'normal';
    const modeLabel = mode === 'camp' ? 'キャンプ場散歩' : '通常散歩';
    openModal('体調ログ（非公開）', `<div class="private-box"><h3>表に出さない</h3><p>${modeLabel}中。ここで保存した内容はホーム、場所カード表面、キャンプ場レビュー、共有候補には表示しない。通常散歩では健康履歴、キャンプ場散歩では私的ログとして保持する。</p></div><div class="grid-2" style="margin-top:12px"><button class="btn" data-health="大">大を記録</button><button class="btn" data-health="小">小を記録</button><button class="btn" data-health="水分">水分</button><button class="btn" data-health="足取り">足取り</button><button class="btn" data-health="拾い食い">拾い食い</button><button class="btn" data-health="危険">危険</button></div><div class="field" style="margin-top:12px"><label>非公開メモ</label><textarea id="healthMemo" placeholder="状態や場所の補足。公開レビューには出さない"></textarea></div>`);
    document.querySelectorAll('[data-health]').forEach(b=>b.onclick=()=>{ state.healthLogs.unshift({id:uid('health'), kind:b.dataset.health, mode:modeLabel, date:today(), time:nowTime(), memo:document.getElementById('healthMemo')?.value || '', projectId:state.walking?.projectId || state.activeProjectId, privacy:'private'}); save(); closeModal(); render(); toast('非公開体調ログに保存'); });
  }
  function openTextModal(title, help, type){
    openModal(title, `<div class="form-grid"><p class="note">${esc(help)}</p><div class="field"><label>タイトル</label><input id="textTitle" value="${esc(title)}" /></div><div class="field"><label>内容</label><textarea id="textBody" placeholder="短く残す。分類は後で候補化"></textarea></div><button class="btn primary" id="saveTextBtn">保存</button></div>`);
    document.getElementById('saveTextBtn').onclick = () => {
      state.records.unshift({id:uid('rec'), type, title:document.getElementById('textTitle').value || title, text:document.getElementById('textBody').value || help, date:today(), projectId:state.walking?.projectId || state.activeProjectId, sessionId:state.walking?.id || null, privacy:type==='place'?'candidate':'private'});
      save(); closeModal(); render(); toast('記録を保存');
    };
  }
  function openGearImport(){
    openModal('ギア取込', `<div class="form-grid"><p class="note">Excel、購入履歴、写真、スクショを候補化する前提。ここでは候補テキストを保存する。</p><div class="field"><label>取込メモ</label><textarea id="gearImportText" placeholder="例：Snow Peak チタンダブルボウル600 x2 価格 購入日 保管場所"></textarea></div><button class="btn primary" id="saveGearImport">候補として保存</button></div>`);
    document.getElementById('saveGearImport').onclick = () => { state.imports.unshift({id:uid('imp'), type:'gear', text:document.getElementById('gearImportText').value, date:today()}); save(); closeModal(); toast('ギア取込候補を保存'); };
  }
  function logSetup(phase){
    state.setupLogs.unshift({id:uid('setup'), projectId:state.activeProjectId, phase, date:today(), time:nowTime(), note:'工程ワンタップ記録'});
    save(); toast(`${phase}を記録`);
  }
  function generateReview(){
    state.improvements.unshift({id:uid('imp'), target:'自動候補', title:'記録から次回確認を作成', reason:'天気・ギア・料理・撤収ログを確認して次回準備に返す', status:'候補'});
    save(); render(); toast('レビュー候補を生成');
  }
  function backup(){
    const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `outbase-backup-${today()}.json`; a.click(); URL.revokeObjectURL(url);
  }
  function copyText(text, message){ navigator.clipboard?.writeText(text).then(()=>toast(message)).catch(()=>toast('コピーできなかった')); }
  function openModal(title, body){
    const root = document.getElementById('modalRoot');
    root.innerHTML = `<div class="modal-backdrop" data-close-modal="1"><div class="modal" role="dialog" aria-modal="true"><div class="modal-head"><div class="modal-title">${esc(title)}</div><button class="close-btn" data-close="1">×</button></div>${body}</div></div>`;
    root.querySelector('[data-close]')?.addEventListener('click', closeModal);
    root.querySelector('[data-close-modal]')?.addEventListener('click', e => { if(e.target.dataset.closeModal) closeModal(); });
  }
  function closeModal(){ const root = document.getElementById('modalRoot'); if(root) root.innerHTML = ''; }

  mediaInput?.addEventListener('change', () => {
    const files = Array.from(mediaInput.files || []);
    files.forEach(file => state.records.unshift({id:uid('media'), type:file.type.startsWith('video')?'video':'photo', title:file.name, text:'メディア参照候補。Google Photos本接続後はURL参照へ移行。', date:today(), projectId:state.walking?.projectId || state.activeProjectId, sessionId:state.walking?.id || null, privacy:'private'}));
    mediaInput.value=''; save(); render(); toast(`${files.length}件のメディア候補`);
  });
  importInput?.addEventListener('change', () => {
    const files = Array.from(importInput.files || []);
    files.forEach(file => state.imports.unshift({id:uid('file'), type:'file', name:file.name, size:file.size, date:today()}));
    importInput.value=''; save(); toast(`${files.length}件を取込候補へ`);
  });

  render();
})();
