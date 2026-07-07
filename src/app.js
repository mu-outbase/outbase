(() => {
  'use strict';

  const VERSION = 'outbase-usable-remake-20260707';
  const STORAGE_KEY = 'outbase_usable_remake_state';

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const app = $('#app');
  const mediaInput = $('#mediaInput');
  const importInput = $('#importInput');

  const pad = n => String(n).padStart(2,'0');
  const today = () => new Date().toISOString().slice(0,10);
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const dateObj = s => {
    if(!s) return null;
    const [y,m,d] = s.split('-').map(Number);
    return new Date(y, (m||1)-1, d||1);
  };
  const addDays = (s,n) => { const d=dateObj(s); d.setDate(d.getDate()+n); return iso(d); };
  const monthKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}`;
  const monthName = d => `${d.getFullYear()}年 ${d.getMonth()+1}月`;
  const uid = p => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
  const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
  const fmtShort = s => s ? `${Number(s.slice(5,7))}/${Number(s.slice(8,10))}` : '日付なし';
  const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));

  const typeLabel = {
    camp:'キャンプ', walk:'散歩', campWalk:'場内散歩', normal:'予定', work:'仕事', hospital:'病院',
    payment:'支払い', family:'家族', pet:'ペット', car:'車', shopping:'買い物', trip:'旅行', event:'行事'
  };
  const gearStatusLabel = {
    home:'保管中', loaded:'積込済', use:'使用中', dry:'乾燥中', repair:'修理', replace:'買替候補', sold:'売却済'
  };

  const defaultState = () => ({
    route:'home',
    tab:{prep:'camp', gear:'list', walk:'normal', calendar:'month'},
    selectedDate:today(),
    currentMonth: today().slice(0,7),
    currentProjectId:'camp-akagi',
    drawer:null,
    toast:null,
    events:[
      {id:'camp-akagi',title:'スノーピーク赤城山CF',type:'camp',start:'2026-07-18',end:'2026-07-20',repeat:'none',level:4,place:'群馬県 前橋市',memo:'犬連れ。乾燥サービス・梅雨想定。',prep:['買い物','料理','ギア','コタ','天気','ルート'],status:'planned'},
      {id:'pay-card',title:'クレカ支払い確認',type:'payment',start:today().slice(0,8)+'27',end:today().slice(0,8)+'27',repeat:'monthly',level:1,place:'',memo:'毎月の支払い確認。',status:'planned'},
      {id:'kota-vet',title:'コタ 予防・体調メモ確認',type:'pet',start:addDays(today(),5),end:addDays(today(),5),repeat:'none',level:2,place:'動物病院候補',memo:'散歩ログの体調メモも確認。',status:'planned'},
      {id:'unscheduled-memo',title:'次回キャンプで試したい配置',type:'camp',start:'',end:'',repeat:'none',level:3,place:'',memo:'日付未設定。カレンダーには出さず、日付未設定枠で扱う。',status:'idea'}
    ],
    prep:{
      meals:[
        {id:'meal1',name:'ガーリックシュリンプ',slot:'1日目 夜',people:2,ingredients:['ブラックタイガー 200〜300g','にんにく','オリーブオイル','バター','レモン'],gear:['スキレット大','トング','カセットコンロ'],note:'バケットなし。量を増やしすぎない。'},
        {id:'meal2',name:'自家製ピザ',slot:'1日目 夜',people:2,ingredients:['ピザ生地','チーズ','トマトソース','好みの具材'],gear:['ピザ道具','カッティングボード'],note:'生地は作る。'}
      ],
      shopping:[
        {id:'shop1',name:'ブラックタイガー',group:'食材',qty:'200〜300g',done:false,source:'献立'},
        {id:'shop2',name:'ブラータチーズ',group:'食材',qty:'1個',done:false,source:'献立'},
        {id:'shop3',name:'にんにく',group:'調味/食材',qty:'1個',done:false,source:'共通'},
        {id:'shop4',name:'コタ水・フード予備',group:'コタ',qty:'1式',done:false,source:'ペット'}
      ],
      weather:[
        {id:'w14',when:'14日前',check:'候補日と雨傾向',done:false},
        {id:'w7',when:'7日前',check:'最低気温・風・雨量',done:false},
        {id:'w3',when:'3日前',check:'設営/撤収時間帯の雨風',done:false},
        {id:'w1',when:'前日',check:'積込変更・服装・コタ暑寒対策',done:false},
        {id:'w0',when:'当日',check:'出発判断・現地判断',done:false}
      ],
      route:[
        {id:'r1',title:'出発時刻',value:'06:30〜06:45'},
        {id:'r2',title:'通り道コンビニ',value:'候補を予定カードに保存'},
        {id:'r3',title:'買い出し',value:'買い物リストと連動'}
      ]
    },
    gear:[
      {id:'g1',name:'リビングシェル アイボリー',cat:'幕体',qty:1,box:'b1',car:'左後方',status:'home',set:'キャンプ基本',note:'乾燥確認必須',last:'2026-05-17'},
      {id:'g2',name:'アメニティドームM アイボリー',cat:'幕体',qty:1,box:'b1',car:'左後方',status:'home',set:'キャンプ基本',note:'寝室用',last:'2026-05-17'},
      {id:'g3',name:'ヘキサエヴォPro. アイボリー',cat:'タープ',qty:1,box:'b2',car:'ルーフ',status:'home',set:'雨/日除け',note:'風チェック',last:'2026-05-17'},
      {id:'g4',name:'スキレット大',cat:'料理',qty:1,box:'b3',car:'キッチン箱',status:'home',set:'料理',note:'ガーリックシュリンプ用',last:'2026-06-27'},
      {id:'g5',name:'ドッグオフトン',cat:'ペット',qty:1,box:'b4',car:'右後方',status:'home',set:'コタ',note:'抜け毛確認',last:'2026-05-17'},
      {id:'g6',name:'たねほおずき',cat:'照明',qty:7,box:'b2',car:'照明箱',status:'home',set:'照明',note:'充電確認',last:'2026-05-17'}
    ],
    boxes:[
      {id:'b1',name:'シェルコン50 A',kind:'ハード収納',home:'玄関収納',car:'左後方',role:'幕体・大型'},
      {id:'b2',name:'シェルコン50 B',kind:'ハード収納',home:'玄関収納',car:'中央後方',role:'照明・タープ'},
      {id:'b3',name:'キッチンBOX',kind:'ソフト/コンテナ',home:'棚下',car:'右後方',role:'料理道具'},
      {id:'b4',name:'コタBOX',kind:'ペット用',home:'リビング横',car:'右後方',role:'犬用品'}
    ],
    walk:{
      active:false, mode:'normal', startedAt:null, projectId:null, track:[], health:[], friends:[], spots:[], notes:[]
    },
    placeCards:[
      {id:'p1',name:'赤城山 場内散歩ルート',type:'campWalk',publicNote:'木陰多め。朝の散歩向き。',privateNote:'排泄情報は非公開メモに保存。',visits:1},
      {id:'p2',name:'柏の葉公園',type:'normalWalk',publicNote:'普段散歩候補。駐車場あり。',privateNote:'犬友達候補あり。',visits:0}
    ],
    records:[
      {id:'rec1',eventId:'camp-akagi',kind:'memo',text:'夜は量が多いのでバケットなし。',date:today(),private:false}
    ],
    improvements:[
      {id:'imp1',eventId:'camp-akagi',text:'雨予報なら乾燥サービスのある直営キャンプ場優先。',done:false}
    ],
    settings:{firstRun:false}
  });

  let state = load();

  function load(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if(raw) return mergeDefault(JSON.parse(raw));
    } catch(e){}
    return defaultState();
  }
  function mergeDefault(saved){
    const base = defaultState();
    return {
      ...base,
      ...saved,
      tab:{...base.tab, ...(saved.tab||{})},
      prep:{...base.prep, ...(saved.prep||{})},
      settings:{...base.settings, ...(saved.settings||{})}
    };
  }
  function save(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  function toast(msg){
    state.toast = msg; render();
    setTimeout(()=>{ if(state.toast===msg){ state.toast=null; render(); }}, 1800);
  }
  function nav(route){
    state.route = route;
    save();
    render();
  }
  function currentProject(){
    return state.events.find(e=>e.id===state.currentProjectId) || state.events.find(e=>e.type==='camp') || state.events[0];
  }

  function eventOccurrences(event, monthStr=state.currentMonth){
    if(!event.start) return [];
    const start = dateObj(event.start);
    const end = dateObj(event.end || event.start);
    const [y,m] = monthStr.split('-').map(Number);
    const first = new Date(y,m-1,1);
    const last = new Date(y,m,0);
    const out = [];

    const pushRange = (s,e,repeatIndex=0) => {
      const d = new Date(Math.max(s.getTime(), first.getTime()));
      const until = new Date(Math.min(e.getTime(), last.getTime()));
      while(d <= until){
        out.push({date:iso(d), event, repeatIndex, multi: iso(s)!==iso(e)});
        d.setDate(d.getDate()+1);
      }
    };

    if(event.repeat === 'none' || !event.repeat){
      if(end >= first && start <= last) pushRange(start,end,0);
      return out;
    }

    let cursor = new Date(start);
    let idx = 0;
    while(cursor <= last && idx < 80){
      const duration = Math.max(0, Math.round((end-start)/(24*60*60*1000)));
      const curEnd = new Date(cursor); curEnd.setDate(curEnd.getDate()+duration);
      if(curEnd >= first && cursor <= last) pushRange(new Date(cursor), curEnd, idx);
      if(event.repeat === 'daily') cursor.setDate(cursor.getDate()+1);
      else if(event.repeat === 'weekly') cursor.setDate(cursor.getDate()+7);
      else if(event.repeat === 'monthly') cursor.setMonth(cursor.getMonth()+1);
      else if(event.repeat === 'yearly') cursor.setFullYear(cursor.getFullYear()+1);
      else break;
      idx++;
    }
    return out;
  }

  function eventsForDate(date){
    return state.events.flatMap(e=>eventOccurrences(e, date.slice(0,7))).filter(o=>o.date===date);
  }
  function unscheduledEvents(){
    return state.events.filter(e=>!e.start);
  }

  function topbar(){
    const p = currentProject();
    return `
      <div class="topbar">
        <button class="brand" data-action="home" aria-label="ホームへ">
          <div class="logo">OB</div>
          <div>
            <div class="brand-title">OUTBASE</div>
            <div class="brand-sub">RESTART-35 design / usable remake</div>
          </div>
        </button>
        <button class="plan-chip" data-action="plan">
          <span>現在</span>
          <b>${esc(p?.title || '予定なし')}</b>
          <small>${esc(p?.start ? `${fmtShort(p.start)}〜${fmtShort(p.end||p.start)} / ${typeLabel[p.type]||p.type}` : '日付未設定')}</small>
          <i>切替</i>
        </button>
      </div>
    `;
  }

  function bottomNav(){
    const items = [
      ['calendar','予定'],
      ['search','探す'],
      ['prep','準備'],
      ['plus','＋'],
      ['memory','思い出']
    ];
    return `<nav class="bottom-nav">${items.map(([r,label])=>`
      <button class="nav-btn ${state.route===r?'active':''}" data-route="${r}">${label}</button>
    `).join('')}</nav>`;
  }

  function home(){
    const p = currentProject();
    const next = state.events.filter(e=>e.start && e.start >= today()).sort((a,b)=>a.start.localeCompare(b.start))[0];
    const pendingShop = state.prep.shopping.filter(x=>!x.done).length;
    const dry = state.gear.filter(g=>g.status==='dry').length;
    return `
      ${topbar()}
      <main class="stack">
        <section class="hero">
          <div class="badge">今日の一手</div>
          <h1>今日は何する？</h1>
          <p>迷わないように、次に押す場所だけ出す。深い管理は必要な時だけ開く。</p>
        </section>

        <section class="card">
          <div class="card-inner">
            <div class="card-head">
              <div>
                <div class="eyebrow">NEXT PROJECT</div>
                <h2 class="card-title">${esc(next?.title || p?.title || '予定を入れる')}</h2>
              </div>
              <span class="tag dark">${esc(next ? fmtShort(next.start) : '未設定')}</span>
            </div>
            <p class="note">キャンプ前は準備、現地は記録、帰宅後は思い出と改善。普通の予定は軽く扱う。</p>
            <div class="grid2" style="margin-top:12px">
              <button class="quick-tile" data-route="prep"><strong>準備を進める</strong><small>料理・買い物・ギア・天気をここで確認</small></button>
              <button class="quick-tile" data-action="startWalk"><strong>散歩を始める</strong><small>通常散歩 / キャンプ場散歩を選んで記録</small></button>
              <button class="quick-tile" data-action="openGear"><strong>ギア確認</strong><small>ボックス・積込・乾燥・忘れ物を確認</small></button>
              <button class="quick-tile" data-route="calendar"><strong>カレンダー</strong><small>スライド月移動・連日・繰り返し対応</small></button>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card-inner">
            <div class="card-head">
              <div>
                <div class="eyebrow">STATUS</div>
                <h2 class="card-title">今の確認</h2>
              </div>
            </div>
            <div class="grid3">
              <div class="metric"><small>買い物</small><strong>${pendingShop}件 未完了</strong></div>
              <div class="metric"><small>ギア乾燥</small><strong>${dry}件</strong></div>
              <div class="metric"><small>要確認</small><strong>${unscheduledEvents().length}件 日付未設定</strong></div>
            </div>
          </div>
        </section>
      </main>
      ${bottomNav()}
    `;
  }

  function calendarView(){
    const d = new Date(Number(state.currentMonth.slice(0,4)), Number(state.currentMonth.slice(5,7))-1, 1);
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    const cells = [];
    for(let i=0;i<42;i++){
      const cur = new Date(start); cur.setDate(start.getDate()+i);
      const s = iso(cur);
      const occ = eventsForDate(s);
      cells.push({date:s, inMonth:cur.getMonth()===d.getMonth(), occ});
    }
    const selectedOcc = eventsForDate(state.selectedDate);
    const uns = unscheduledEvents();

    return `
      ${topbar()}
      <main class="stack">
        <section class="card" id="calendarCard">
          <div class="card-inner calendar-shell">
            <div class="card-head">
              <div>
                <div class="eyebrow">CALENDAR</div>
                <h2 class="card-title">予定</h2>
              </div>
              <span class="tag">左右スライドで月移動</span>
            </div>
            <div class="cal-head">
              <button class="btn ghost" data-action="prevMonth">前月</button>
              <div class="cal-title"><strong>${monthName(d)}</strong><small>タップ=日付選択 / ダブルタップ=予定追加</small></div>
              <button class="btn ghost" data-action="nextMonth">翌月</button>
            </div>
            <div class="weekdays">${['日','月','火','水','木','金','土'].map(x=>`<span>${x}</span>`).join('')}</div>
            <div class="cal-grid">
              ${cells.map(c=>{
                const labels = c.occ.slice(0,2);
                const more = c.occ.length - labels.length;
                return `<button class="day ${c.inMonth?'':'muted'} ${c.date===today()?'today':''} ${c.date===state.selectedDate?'selected':''}" data-date="${c.date}">
                  <span class="day-num">${Number(c.date.slice(8,10))}</span>
                  ${labels.map(o=>`<span class="day-label ${o.multi?'multi':''}">${o.multi?'↔ ':''}${esc(o.event.title)}</span>`).join('')}
                  ${more>0 ? `<span class="day-more">+${more}件</span>` : ''}
                </button>`;
              }).join('')}
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card-inner">
            <div class="card-head">
              <div>
                <div class="eyebrow">DAY</div>
                <h2 class="card-title">${fmtShort(state.selectedDate)} の予定</h2>
              </div>
              <button class="btn primary" data-action="addEvent" data-date="${state.selectedDate}">予定追加</button>
            </div>
            <div class="list">
              ${selectedOcc.length ? selectedOcc.map(o=>eventItem(o.event, o.multi)).join('') : `<div class="unscheduled"><p class="note">この日の予定はまだない。日付をダブルタップでも追加できる。</p></div>`}
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card-inner">
            <div class="card-head">
              <div>
                <div class="eyebrow">UNSCHEDULED</div>
                <h2 class="card-title">日付未設定</h2>
              </div>
              <span class="tag warn">${uns.length}件</span>
            </div>
            <p class="note">日付が無いものはカレンダーに無理に表示しない。ここで日付を決める。</p>
            <div class="list" style="margin-top:10px">
              ${uns.length ? uns.map(e=>eventItem(e,false,true)).join('') : '<p class="note">日付未設定はなし。</p>'}
            </div>
          </div>
        </section>
      </main>
      ${bottomNav()}
    `;
  }

  function eventItem(e, multi=false, uns=false){
    return `<button class="item" data-action="editEvent" data-id="${e.id}">
      <div class="item-main">
        <div class="item-title">${esc(e.title)}</div>
        <div class="item-sub">${uns?'日付未設定':`${fmtShort(e.start)}${e.end&&e.end!==e.start?'〜'+fmtShort(e.end):''}`} / ${esc(typeLabel[e.type]||e.type)} / Lv.${e.level || 1}${e.repeat && e.repeat!=='none' ? ' / 繰り返し' : ''}${multi?' / 連日':''}</div>
      </div>
      <span class="tag">${uns?'日付決める':'開く'}</span>
    </button>`;
  }

  function searchView(){
    return `
      ${topbar()}
      <main class="stack">
        <section class="hero">
          <div class="badge">探す</div>
          <h1>候補を育てる</h1>
          <p>キャンプ場・散歩先・寄り道・買い物先を場所カードにする。予定一覧とは混ぜない。</p>
        </section>
        <section class="card"><div class="card-inner">
          <div class="card-head"><div><div class="eyebrow">PLACE CARD</div><h2 class="card-title">場所カード</h2></div><button class="btn primary" data-action="addPlace">追加</button></div>
          <div class="list">
            ${state.placeCards.map(p=>`
              <button class="item" data-action="editPlace" data-id="${p.id}">
                <div class="item-main">
                  <div class="item-title">${esc(p.name)}</div>
                  <div class="item-sub">${esc(p.publicNote)} / 訪問${p.visits}回</div>
                </div>
                <span class="tag">${p.type==='campWalk'?'場内':'通常'}</span>
              </button>`).join('')}
          </div>
        </div></section>
      </main>
      ${bottomNav()}
    `;
  }

  function prepView(){
    const tabs = [
      ['camp','全体'],['meals','料理'],['shopping','買い物'],['gear','ギア'],['weather','天気'],['route','ルート'],['kota','コタ']
    ];
    return `
      ${topbar()}
      <main class="stack">
        <section class="card">
          <div class="card-inner">
            <div class="card-head">
              <div><div class="eyebrow">PREP</div><h2 class="card-title">準備</h2></div>
              <span class="tag">薄くしない</span>
            </div>
            <div class="tabs">${tabs.map(([id,label])=>`<button class="tab ${state.tab.prep===id?'active':''}" data-prep-tab="${id}">${label}</button>`).join('')}</div>
          </div>
        </section>
        ${prepBody()}
      </main>
      ${bottomNav()}
    `;
  }

  function prepBody(){
    const t = state.tab.prep;
    if(t==='meals') return mealsPanel();
    if(t==='shopping') return shoppingPanel();
    if(t==='gear') return gearPanel();
    if(t==='weather') return weatherPanel();
    if(t==='route') return routePanel();
    if(t==='kota') return kotaPanel();
    return `
      <section class="card"><div class="card-inner">
        <div class="card-head"><div><div class="eyebrow">NEXT ACTION</div><h2 class="card-title">キャンプ前に開く理由</h2></div></div>
        <div class="grid2">
          <button class="quick-tile" data-prep-tab="meals"><strong>料理を決める</strong><small>献立→材料→買い物→必要ギアまでつなぐ</small></button>
          <button class="quick-tile" data-prep-tab="gear"><strong>ギアを積む</strong><small>ボックス/車載位置/乾燥/忘れ物まで確認</small></button>
          <button class="quick-tile" data-prep-tab="weather"><strong>天気判断</strong><small>雨・風・気温・コタ・幕体を時系列で見る</small></button>
          <button class="quick-tile" data-prep-tab="route"><strong>ルート確認</strong><small>出発/買い出し/寄り道/帰路を予定に残す</small></button>
        </div>
      </div></section>`;
  }

  function mealsPanel(){
    return `<section class="card"><div class="card-inner">
      <div class="card-head"><div><div class="eyebrow">MEALS</div><h2 class="card-title">料理・献立</h2></div><button class="btn primary" data-action="addMeal">料理追加</button></div>
      <p class="note">料理は単体で終わらせない。材料・必要ギア・買い物リストへ接続する。</p>
      <div class="list" style="margin-top:10px">${state.prep.meals.map(m=>`
        <button class="item" data-action="editMeal" data-id="${m.id}">
          <div class="item-main"><div class="item-title">${esc(m.name)}</div>
          <div class="item-sub">${esc(m.slot)} / ${m.people}人 / 材料 ${m.ingredients.length} / ギア ${m.gear.length}<br>${esc(m.note)}</div></div>
          <span class="tag">編集</span>
        </button>`).join('')}</div>
      <div class="actions">
        <button class="btn" data-action="generateShopping">献立から買い物統合</button>
        <button class="btn" data-action="copyShopping">LINE用コピー</button>
      </div>
    </div></section>`;
  }

  function shoppingPanel(){
    const groups = {};
    state.prep.shopping.forEach(i => (groups[i.group] ||= []).push(i));
    return `<section class="card"><div class="card-inner">
      <div class="card-head"><div><div class="eyebrow">SHOPPING</div><h2 class="card-title">買い物</h2></div><button class="btn primary" data-action="addShopping">追加</button></div>
      <p class="note">買い忘れ防止。料理・コタ・共通品をまとめ、LINEに貼れる形で出す。</p>
      ${Object.entries(groups).map(([g,items])=>`
        <div style="margin-top:13px"><div class="eyebrow">${esc(g)}</div><div class="list" style="margin-top:7px">
          ${items.map(i=>`<button class="item" data-action="toggleShopping" data-id="${i.id}">
            <div class="item-main"><div class="item-title">${i.done?'✓ ':''}${esc(i.name)}</div><div class="item-sub">${esc(i.qty)} / ${esc(i.source)}</div></div><span class="tag">${i.done?'済':'未'}</span>
          </button>`).join('')}
        </div></div>`).join('')}
      <div class="actions"><button class="btn" data-action="copyShopping">LINE用コピー</button></div>
    </div></section>`;
  }

  function gearPanel(){
    const tabs = [['list','一覧'],['boxes','ボックス'],['load','積込'],['maint','乾燥/修理'],['import','取込']];
    return `<section class="card"><div class="card-inner">
      <div class="card-head"><div><div class="eyebrow">GEAR</div><h2 class="card-title">ギア管理</h2></div><button class="btn primary" data-action="addGear">ギア登録</button></div>
      <p class="note">登録・変更はここ。ボックス管理、車載位置、積込、乾燥、使用履歴を分けて見る。</p>
      <div class="tabs">${tabs.map(([id,label])=>`<button class="tab ${state.tab.gear===id?'active':''}" data-gear-tab="${id}">${label}</button>`).join('')}</div>
    </div></section>
    ${gearBody()}`;
  }

  function gearBody(){
    const t = state.tab.gear;
    if(t==='boxes') return boxesView();
    if(t==='load') return loadView();
    if(t==='maint') return maintenanceView();
    if(t==='import') return importView();
    return `<section class="card"><div class="card-inner">
      <div class="list">${state.gear.map(g=>gearItem(g)).join('')}</div>
    </div></section>`;
  }
  function gearItem(g){
    const box = state.boxes.find(b=>b.id===g.box);
    return `<button class="item" data-action="editGear" data-id="${g.id}">
      <div class="item-main">
        <div class="item-title">${esc(g.name)} ×${g.qty}</div>
        <div class="item-sub">${esc(g.cat)} / ${esc(box?.name || '未収納')} / 車載: ${esc(g.car || '未設定')} / ${esc(gearStatusLabel[g.status]||g.status)}<br>${esc(g.note||'')}</div>
      </div>
      <span class="tag">変更</span>
    </button>`;
  }

  function boxesView(){
    return `<section class="card"><div class="card-inner">
      <div class="card-head"><div><div class="eyebrow">BOX</div><h2 class="card-title">ボックス管理</h2></div><button class="btn primary" data-action="addBox">BOX追加</button></div>
      <p class="note">どのギアがどの箱に入るか、家の保管場所と車載位置を分けて管理する。</p>
      <div class="box-layout">
      ${state.boxes.map(b=>{
        const gs = state.gear.filter(g=>g.box===b.id);
        return `<div class="box-card">
          <div class="box-card-head"><div><strong>${esc(b.name)}</strong><div class="item-sub">${esc(b.kind)} / 家: ${esc(b.home)} / 車: ${esc(b.car)} / ${esc(b.role)}</div></div><button class="btn ghost" data-action="editBox" data-id="${b.id}">変更</button></div>
          <div class="box-gear">${gs.length?gs.map(g=>`<span class="tag">${esc(g.name)}</span>`).join(''):'<span class="tag warn">未割当なし</span>'}</div>
        </div>`;
      }).join('')}
      </div>
      <div class="car-map">
        ${['左後方','中央後方','右後方','ルーフ','キッチン箱','照明箱'].map(zone=>`
          <div class="car-zone"><b>${zone}</b>${state.gear.filter(g=>g.car===zone).slice(0,3).map(g=>esc(g.name)).join('<br>') || '未設定'}</div>
        `).join('')}
      </div>
    </div></section>`;
  }

  function loadView(){
    return `<section class="card"><div class="card-inner">
      <div class="card-head"><div><div class="eyebrow">LOAD</div><h2 class="card-title">積込チェック</h2></div></div>
      <p class="note">ボックス単位で積む。ギア単体は必要な時だけ確認。</p>
      <div class="list">${state.boxes.map(b=>{
        const total = state.gear.filter(g=>g.box===b.id).length;
        const loaded = state.gear.filter(g=>g.box===b.id && g.status==='loaded').length;
        return `<button class="item" data-action="toggleBoxLoaded" data-id="${b.id}">
          <div class="item-main"><div class="item-title">${esc(b.name)}</div><div class="item-sub">車載: ${esc(b.car)} / ${loaded}/${total} 積込済</div></div><span class="tag">${loaded===total?'完了':'確認'}</span>
        </button>`;
      }).join('')}</div>
    </div></section>`;
  }

  function maintenanceView(){
    const targets = state.gear.filter(g=>['dry','repair','replace'].includes(g.status) || /乾燥|修理|買替|破損/.test(g.note||''));
    return `<section class="card"><div class="card-inner">
      <div class="card-head"><div><div class="eyebrow">MAINTENANCE</div><h2 class="card-title">乾燥・修理・買替</h2></div></div>
      <div class="list">${targets.length?targets.map(g=>gearItem(g)).join(''):'<p class="note">現在の対象なし。使った後に乾燥・破損・買替をここへ出す。</p>'}</div>
    </div></section>`;
  }

  function importView(){
    return `<section class="card"><div class="card-inner">
      <div class="card-head"><div><div class="eyebrow">IMPORT</div><h2 class="card-title">取込候補</h2></div><button class="btn primary" data-action="importFile">ファイル選択</button></div>
      <p class="note">Excel・購入履歴・写真から候補化する入口。静的版ではファイル名を記録し、候補として保存する。</p>
      <div class="actions"><button class="btn" data-action="addGear">手入力で登録</button><button class="btn" data-action="backup">バックアップ</button></div>
    </div></section>`;
  }

  function weatherPanel(){
    return `<section class="card"><div class="card-inner">
      <div class="card-head"><div><div class="eyebrow">WEATHER WATCH</div><h2 class="card-title">天気判断</h2></div></div>
      <p class="note">天気は眺めるものではなく、設営・撤収・コタ・幕体を決める材料として扱う。</p>
      <div class="list" style="margin-top:10px">${state.prep.weather.map(w=>`
        <button class="item" data-action="toggleWeather" data-id="${w.id}">
          <div class="item-main"><div class="item-title">${w.done?'✓ ':''}${esc(w.when)}</div><div class="item-sub">${esc(w.check)}</div></div>
          <span class="tag">${w.done?'済':'確認'}</span>
        </button>`).join('')}</div>
      <div class="grid2" style="margin-top:12px">
        <div class="metric"><small>設営判断</small><strong>雨量・風速・地面</strong></div>
        <div class="metric"><small>撤収判断</small><strong>雨雲・乾燥・帰路</strong></div>
        <div class="metric"><small>コタ判断</small><strong>暑さ・寒さ・湿度</strong></div>
        <div class="metric"><small>幕体判断</small><strong>風・雨・結露</strong></div>
      </div>
    </div></section>`;
  }

  function routePanel(){
    return `<section class="card"><div class="card-inner">
      <div class="card-head"><div><div class="eyebrow">ROUTE</div><h2 class="card-title">ルート・寄り道</h2></div></div>
      <div class="list">${state.prep.route.map(r=>`
        <button class="item" data-action="editRoute" data-id="${r.id}">
          <div class="item-main"><div class="item-title">${esc(r.title)}</div><div class="item-sub">${esc(r.value)}</div></div><span class="tag">変更</span>
        </button>`).join('')}</div>
    </div></section>`;
  }

  function kotaPanel(){
    return `<section class="card"><div class="card-inner">
      <div class="card-head"><div><div class="eyebrow">KOTA</div><h2 class="card-title">コタ準備</h2></div></div>
      <div class="list">
        ${['フード・水・予備','ドッグオフトン・クッション','暑さ/寒さ対策','場内散歩モード確認','体調メモは非公開'].map(x=>`
          <div class="item"><div class="item-main"><div class="item-title">${x}</div><div class="item-sub">キャンプ予定に紐付け</div></div><span class="tag">確認</span></div>
        `).join('')}
      </div>
    </div></section>`;
  }

  function plusView(){
    return `
      ${topbar()}
      <main class="stack">
        <section class="hero">
          <div class="badge">追加</div>
          <h1>3秒で残す</h1>
          <p>ここは迷わず残す入口。細かい整理は後でOUTBASE側に寄せる。</p>
        </section>
        <section class="card"><div class="card-inner">
          <div class="grid2">
            <button class="quick-tile" data-action="addEvent"><strong>予定</strong><small>普通予定・キャンプ・連日・繰り返し</small></button>
            <button class="quick-tile" data-action="quickRecord"><strong>現地記録</strong><small>写真・動画・音声文字起こし・メモ</small></button>
            <button class="quick-tile" data-action="startWalk"><strong>散歩開始</strong><small>通常散歩 / キャンプ場散歩</small></button>
            <button class="quick-tile" data-action="quickMemo"><strong>メモ</strong><small>日付未設定でも残す</small></button>
          </div>
        </div></section>
        ${walkPanel()}
      </main>
      ${bottomNav()}
    `;
  }

  function walkPanel(){
    const w = state.walk;
    return `<section class="card"><div class="card-inner">
      <div class="card-head">
        <div><div class="eyebrow">WALK</div><h2 class="card-title">散歩</h2></div>
        <span class="tag ${w.active?'dark':''}">${w.active?'記録中':'停止中'}</span>
      </div>
      <p class="note">表に出すのは散歩・場所・犬友達・スポット。排泄は「体調メモ」の非公開パネルだけに保存する。</p>
      <div class="segment" style="margin-top:12px">
        <button class="${w.mode==='normal'?'active':''}" data-walk-mode="normal">通常散歩</button>
        <button class="${w.mode==='camp'?'active':''}" data-walk-mode="camp">キャンプ場散歩</button>
      </div>
      <div class="walk-hero" style="margin-top:12px">
        <div class="walk-status">
          <div class="metric"><small>モード</small><strong>${w.mode==='camp'?'キャンプ場':'通常'}</strong></div>
          <div class="metric"><small>GPS点</small><strong>${w.track.length}</strong></div>
          <div class="metric"><small>スポット</small><strong>${w.spots.length}</strong></div>
        </div>
        <div class="actions">
          ${w.active ? `<button class="btn danger" data-action="stopWalk">散歩終了</button>` : `<button class="btn primary" data-action="beginWalk">散歩開始</button>`}
          <button class="btn" data-action="captureLocation">現在地を記録</button>
          <button class="btn" data-action="addSpot">スポット</button>
          <button class="btn" data-action="addFriend">犬友達</button>
        </div>
      </div>

      <div class="map-panel" style="margin-top:12px">
        <canvas id="walkMap" width="560" height="220"></canvas>
        ${w.track.length ? '' : '<div class="map-empty">地図はここ。GPSを記録すると簡易ルートを描く。<br>外部地図はGoogle Mapsリンクで開く。</div>'}
      </div>
      <div class="actions">
        <button class="btn" data-action="openGoogleMap">Googleマップで開く</button>
        <button class="btn" data-action="exportWalk">散歩ログ出力</button>
      </div>

      <details class="private-panel">
        <summary>体調メモ（非公開）</summary>
        <p class="note">${w.mode==='camp'?'キャンプ場散歩でもレビュー表面には出さない。場所カードの非公開メモにだけ残す。':'通常散歩では体調ログとしてだけ保存。公開・共有表示には出さない。'}</p>
        <div class="health-buttons">
          <button class="btn" data-action="health" data-type="poop">大を記録</button>
          <button class="btn" data-action="health" data-type="pee">小を記録</button>
        </div>
        <div class="list" style="margin-top:10px">
          ${w.health.slice(-4).reverse().map(h=>`<div class="item"><div class="item-main"><div class="item-title">${h.type==='poop'?'大':'小'} / 非公開</div><div class="item-sub">${esc(h.time)} / ${esc(h.mode)}</div></div><span class="tag private">非公開</span></div>`).join('') || '<p class="note">まだ体調メモなし。</p>'}
        </div>
      </details>
    </div></section>`;
  }

  function memoryView(){
    const p = currentProject();
    return `
      ${topbar()}
      <main class="stack">
        <section class="hero">
          <div class="badge">思い出</div>
          <h1>次回に残す</h1>
          <p>写真を眺めるだけではなく、良かった・困った・次回忘れないへ変える。</p>
        </section>
        <section class="card"><div class="card-inner">
          <div class="card-head"><div><div class="eyebrow">RECORDS</div><h2 class="card-title">記録カード</h2></div><button class="btn primary" data-action="quickRecord">記録追加</button></div>
          <div class="list">${state.records.map(r=>`
            <div class="item"><div class="item-main"><div class="item-title">${esc(r.text)}</div><div class="item-sub">${fmtShort(r.date)} / ${r.private?'非公開':'家族共有'} / ${esc(state.events.find(e=>e.id===r.eventId)?.title||'未紐付け')}</div></div><span class="tag ${r.private?'private':''}">${r.kind}</span></div>
          `).join('')}</div>
        </div></section>
        <section class="card"><div class="card-inner">
          <div class="card-head"><div><div class="eyebrow">IMPROVEMENT</div><h2 class="card-title">次回改善</h2></div><button class="btn" data-action="addImprovement">追加</button></div>
          <div class="list">${state.improvements.map(i=>`
            <button class="item" data-action="toggleImprovement" data-id="${i.id}"><div class="item-main"><div class="item-title">${i.done?'✓ ':''}${esc(i.text)}</div><div class="item-sub">${esc(state.events.find(e=>e.id===i.eventId)?.title||p.title)}</div></div><span class="tag">${i.done?'済':'次回'}</span></button>
          `).join('')}</div>
        </div></section>
        <section class="card"><div class="card-inner">
          <div class="card-head"><div><div class="eyebrow">BACKUP</div><h2 class="card-title">バックアップ・復元</h2></div></div>
          <div class="actions">
            <button class="btn" data-action="backup">JSON出力</button>
            <button class="btn" data-action="restore">JSON読込</button>
            <button class="btn" data-action="ics">ICS書き出し</button>
          </div>
        </div></section>
      </main>
      ${bottomNav()}
    `;
  }

  function render(){
    const view = state.route==='calendar' ? calendarView()
      : state.route==='search' ? searchView()
      : state.route==='prep' ? prepView()
      : state.route==='plus' ? plusView()
      : state.route==='memory' ? memoryView()
      : home();
    app.innerHTML = `${view}${drawerHtml()}${state.toast?`<div class="toast">${esc(state.toast)}</div>`:''}`;
    bind();
    if(state.route==='plus') drawWalkMap();
  }

  function drawerHtml(){
    const d = state.drawer;
    if(!d) return '';
    if(d.type==='event') return drawerWrap(eventForm(d.id,d.date));
    if(d.type==='gear') return drawerWrap(gearForm(d.id));
    if(d.type==='box') return drawerWrap(boxForm(d.id));
    if(d.type==='meal') return drawerWrap(mealForm(d.id));
    if(d.type==='place') return drawerWrap(placeForm(d.id));
    if(d.type==='record') return drawerWrap(recordForm());
    if(d.type==='memo') return drawerWrap(memoForm());
    return '';
  }
  function drawerWrap(content){
    return `<div class="drawer-backdrop" data-action="closeDrawer"></div><div class="drawer">${content}</div>`;
  }

  function eventForm(id,date){
    const e = state.events.find(x=>x.id===id) || {id:'',title:'',type:'normal',start:date||state.selectedDate,end:date||state.selectedDate,repeat:'none',level:1,place:'',memo:''};
    return `<form class="form-grid" data-form="event" data-id="${e.id}">
      <div class="card-head"><div><div class="eyebrow">EVENT</div><h2 class="card-title">${e.id?'予定変更':'予定追加'}</h2></div><button type="button" class="btn ghost" data-action="closeDrawer">閉じる</button></div>
      <div class="field"><label>予定名</label><input name="title" value="${esc(e.title)}" required /></div>
      <div class="grid2"><div class="field"><label>種別</label><select name="type">${Object.entries(typeLabel).map(([k,v])=>`<option value="${k}" ${e.type===k?'selected':''}>${v}</option>`).join('')}</select></div><div class="field"><label>深さ</label><select name="level">${[1,2,3,4].map(n=>`<option value="${n}" ${Number(e.level)===n?'selected':''}>Lv.${n}</option>`).join('')}</select></div></div>
      <div class="grid2"><div class="field"><label>開始日</label><input name="start" type="date" value="${esc(e.start)}" /></div><div class="field"><label>終了日</label><input name="end" type="date" value="${esc(e.end || e.start)}" /></div></div>
      <div class="field"><label>繰り返し</label><select name="repeat">${[['none','なし'],['daily','毎日'],['weekly','毎週'],['monthly','毎月'],['yearly','毎年']].map(([k,v])=>`<option value="${k}" ${e.repeat===k?'selected':''}>${v}</option>`).join('')}</select></div>
      <div class="field"><label>場所</label><input name="place" value="${esc(e.place)}" /></div>
      <div class="field"><label>メモ</label><textarea name="memo">${esc(e.memo)}</textarea></div>
      <button class="btn primary full" type="submit">保存</button>
      ${e.id?`<button class="btn danger full" type="button" data-action="deleteEvent" data-id="${e.id}">削除</button>`:''}
    </form>`;
  }

  function gearForm(id){
    const g = state.gear.find(x=>x.id===id) || {id:'',name:'',cat:'',qty:1,box:'',car:'',status:'home',set:'',note:'',last:''};
    return `<form class="form-grid" data-form="gear" data-id="${g.id}">
      <div class="card-head"><div><div class="eyebrow">GEAR</div><h2 class="card-title">${g.id?'ギア変更':'ギア登録'}</h2></div><button type="button" class="btn ghost" data-action="closeDrawer">閉じる</button></div>
      <div class="field"><label>ギア名</label><input name="name" value="${esc(g.name)}" required /></div>
      <div class="grid2"><div class="field"><label>カテゴリ</label><input name="cat" value="${esc(g.cat)}" /></div><div class="field"><label>数量</label><input name="qty" type="number" min="1" value="${esc(g.qty)}" /></div></div>
      <div class="field"><label>ボックス</label><select name="box"><option value="">未収納</option>${state.boxes.map(b=>`<option value="${b.id}" ${g.box===b.id?'selected':''}>${esc(b.name)}</option>`).join('')}</select></div>
      <div class="grid2"><div class="field"><label>車載位置</label><input name="car" value="${esc(g.car)}" /></div><div class="field"><label>状態</label><select name="status">${Object.entries(gearStatusLabel).map(([k,v])=>`<option value="${k}" ${g.status===k?'selected':''}>${v}</option>`).join('')}</select></div></div>
      <div class="grid2"><div class="field"><label>セット</label><input name="set" value="${esc(g.set)}" /></div><div class="field"><label>最終使用</label><input name="last" type="date" value="${esc(g.last)}" /></div></div>
      <div class="field"><label>メモ</label><textarea name="note">${esc(g.note)}</textarea></div>
      <button class="btn primary full" type="submit">保存</button>
      ${g.id?`<button class="btn danger full" type="button" data-action="deleteGear" data-id="${g.id}">削除</button>`:''}
    </form>`;
  }

  function boxForm(id){
    const b = state.boxes.find(x=>x.id===id) || {id:'',name:'',kind:'',home:'',car:'',role:''};
    return `<form class="form-grid" data-form="box" data-id="${b.id}">
      <div class="card-head"><div><div class="eyebrow">BOX</div><h2 class="card-title">${b.id?'BOX変更':'BOX追加'}</h2></div><button type="button" class="btn ghost" data-action="closeDrawer">閉じる</button></div>
      <div class="field"><label>ボックス名</label><input name="name" value="${esc(b.name)}" required /></div>
      <div class="field"><label>種類</label><input name="kind" value="${esc(b.kind)}" /></div>
      <div class="grid2"><div class="field"><label>家の保管場所</label><input name="home" value="${esc(b.home)}" /></div><div class="field"><label>車載位置</label><input name="car" value="${esc(b.car)}" /></div></div>
      <div class="field"><label>役割</label><input name="role" value="${esc(b.role)}" /></div>
      <button class="btn primary full" type="submit">保存</button>
    </form>`;
  }

  function mealForm(id){
    const m = state.prep.meals.find(x=>x.id===id) || {id:'',name:'',slot:'',people:2,ingredients:[],gear:[],note:''};
    return `<form class="form-grid" data-form="meal" data-id="${m.id}">
      <div class="card-head"><div><div class="eyebrow">MEAL</div><h2 class="card-title">${m.id?'料理変更':'料理追加'}</h2></div><button type="button" class="btn ghost" data-action="closeDrawer">閉じる</button></div>
      <div class="field"><label>料理名</label><input name="name" value="${esc(m.name)}" required /></div>
      <div class="grid2"><div class="field"><label>タイミング</label><input name="slot" value="${esc(m.slot)}" /></div><div class="field"><label>人数</label><input name="people" type="number" min="1" value="${esc(m.people)}" /></div></div>
      <div class="field"><label>材料（改行区切り）</label><textarea name="ingredients">${esc(m.ingredients.join('\n'))}</textarea></div>
      <div class="field"><label>必要ギア（改行区切り）</label><textarea name="gear">${esc(m.gear.join('\n'))}</textarea></div>
      <div class="field"><label>メモ</label><textarea name="note">${esc(m.note)}</textarea></div>
      <button class="btn primary full" type="submit">保存</button>
    </form>`;
  }

  function placeForm(id){
    const p = state.placeCards.find(x=>x.id===id) || {id:'',name:'',type:'normalWalk',publicNote:'',privateNote:'',visits:0};
    return `<form class="form-grid" data-form="place" data-id="${p.id}">
      <div class="card-head"><div><div class="eyebrow">PLACE</div><h2 class="card-title">${p.id?'場所カード変更':'場所カード追加'}</h2></div><button type="button" class="btn ghost" data-action="closeDrawer">閉じる</button></div>
      <div class="field"><label>場所名</label><input name="name" value="${esc(p.name)}" required /></div>
      <div class="field"><label>種類</label><select name="type"><option value="normalWalk" ${p.type==='normalWalk'?'selected':''}>通常散歩</option><option value="campWalk" ${p.type==='campWalk'?'selected':''}>キャンプ場散歩</option><option value="camp" ${p.type==='camp'?'selected':''}>キャンプ場</option></select></div>
      <div class="field"><label>表に出すメモ</label><textarea name="publicNote">${esc(p.publicNote)}</textarea></div>
      <div class="field"><label>非公開メモ</label><textarea name="privateNote">${esc(p.privateNote)}</textarea></div>
      <button class="btn primary full" type="submit">保存</button>
    </form>`;
  }

  function recordForm(){
    return `<form class="form-grid" data-form="record">
      <div class="card-head"><div><div class="eyebrow">RECORD</div><h2 class="card-title">現地記録</h2></div><button type="button" class="btn ghost" data-action="closeDrawer">閉じる</button></div>
      <div class="field"><label>記録先</label><select name="eventId">${state.events.map(e=>`<option value="${e.id}" ${e.id===state.currentProjectId?'selected':''}>${esc(e.title)}</option>`).join('')}</select></div>
      <div class="field"><label>種別</label><select name="kind"><option value="memo">メモ</option><option value="voice">音声文字起こし</option><option value="photo">写真/動画</option></select></div>
      <div class="field"><label>内容</label><textarea name="text" placeholder="話した内容・気付いたこと・写真メモ"></textarea></div>
      <button class="btn" type="button" data-action="chooseMedia">写真/動画を選ぶ</button>
      <button class="btn primary full" type="submit">保存</button>
    </form>`;
  }
  function memoForm(){
    return `<form class="form-grid" data-form="memo">
      <div class="card-head"><div><div class="eyebrow">MEMO</div><h2 class="card-title">メモ</h2></div><button type="button" class="btn ghost" data-action="closeDrawer">閉じる</button></div>
      <div class="field"><label>内容</label><textarea name="text" required></textarea></div>
      <button class="btn primary full" type="submit">保存</button>
    </form>`;
  }

  function bind(){
    $$('[data-route]').forEach(b=>b.addEventListener('click',()=>nav(b.dataset.route)));
    $$('[data-action="home"]').forEach(b=>b.addEventListener('click',()=>nav('home')));
    $$('[data-prep-tab]').forEach(b=>b.addEventListener('click',()=>{state.tab.prep=b.dataset.prepTab; save(); render();}));
    $$('[data-gear-tab]').forEach(b=>b.addEventListener('click',()=>{state.tab.gear=b.dataset.gearTab; save(); render();}));
    $$('[data-walk-mode]').forEach(b=>b.addEventListener('click',()=>{state.walk.mode=b.dataset.walkMode; save(); render();}));

    $$('.day').forEach(day=>{
      let lastTap = 0;
      day.addEventListener('click',()=>{
        const now = Date.now();
        if(now - lastTap < 320){
          state.drawer={type:'event',date:day.dataset.date};
        } else {
          state.selectedDate=day.dataset.date;
          state.currentMonth=day.dataset.date.slice(0,7);
        }
        lastTap = now;
        save(); render();
      });
      day.addEventListener('dblclick',e=>{
        e.preventDefault();
        state.drawer={type:'event',date:day.dataset.date};
        save(); render();
      });
    });

    const cal = $('#calendarCard');
    if(cal){
      let sx = null;
      cal.addEventListener('touchstart',e=>{sx=e.touches[0].clientX;},{passive:true});
      cal.addEventListener('touchend',e=>{
        if(sx==null) return;
        const dx = e.changedTouches[0].clientX - sx;
        if(Math.abs(dx)>60) changeMonth(dx<0?1:-1);
        sx = null;
      },{passive:true});
    }

    $$('[data-action]').forEach(el=>{
      const a = el.dataset.action;
      if(['home','closeDrawer'].includes(a)) return;
      el.addEventListener('click',ev=>handleAction(ev, el));
    });

    $$('form[data-form]').forEach(f=>f.addEventListener('submit',submitForm));
  }

  function handleAction(ev, el){
    const a = el.dataset.action;
    if(a==='prevMonth') changeMonth(-1);
    if(a==='nextMonth') changeMonth(1);
    if(a==='addEvent') {state.drawer={type:'event',date:el.dataset.date||state.selectedDate}; render();}
    if(a==='editEvent') {state.drawer={type:'event',id:el.dataset.id}; render();}
    if(a==='deleteEvent') {state.events=state.events.filter(e=>e.id!==el.dataset.id); state.drawer=null; save(); render(); toast('予定を削除');}
    if(a==='closeDrawer') {state.drawer=null; render();}
    if(a==='plan') {state.drawer={type:'event',id:state.currentProjectId}; render();}
    if(a==='openGear') {state.route='prep'; state.tab.prep='gear'; save(); render();}
    if(a==='addGear') {state.drawer={type:'gear'}; render();}
    if(a==='editGear') {state.drawer={type:'gear',id:el.dataset.id}; render();}
    if(a==='deleteGear') {state.gear=state.gear.filter(g=>g.id!==el.dataset.id); state.drawer=null; save(); render(); toast('ギアを削除');}
    if(a==='addBox') {state.drawer={type:'box'}; render();}
    if(a==='editBox') {state.drawer={type:'box',id:el.dataset.id}; render();}
    if(a==='toggleBoxLoaded') toggleBoxLoaded(el.dataset.id);
    if(a==='addMeal') {state.drawer={type:'meal'}; render();}
    if(a==='editMeal') {state.drawer={type:'meal',id:el.dataset.id}; render();}
    if(a==='addShopping') addShoppingPrompt();
    if(a==='toggleShopping') toggleShopping(el.dataset.id);
    if(a==='generateShopping') generateShopping();
    if(a==='copyShopping') copyShopping();
    if(a==='toggleWeather') toggleWeather(el.dataset.id);
    if(a==='startWalk') {state.route='plus'; save(); render(); setTimeout(()=>$('.private-panel')?.scrollIntoView({behavior:'smooth',block:'center'}),60);}
    if(a==='beginWalk') beginWalk();
    if(a==='stopWalk') stopWalk();
    if(a==='captureLocation') captureLocation();
    if(a==='addSpot') addSpot();
    if(a==='addFriend') addFriend();
    if(a==='health') addHealth(el.dataset.type);
    if(a==='openGoogleMap') openGoogleMap();
    if(a==='exportWalk') exportWalk();
    if(a==='quickRecord') {state.drawer={type:'record'}; render();}
    if(a==='chooseMedia') mediaInput.click();
    if(a==='quickMemo') {state.drawer={type:'memo'}; render();}
    if(a==='addPlace') {state.drawer={type:'place'}; render();}
    if(a==='editPlace') {state.drawer={type:'place',id:el.dataset.id}; render();}
    if(a==='addImprovement') addImprovementPrompt();
    if(a==='toggleImprovement') toggleImprovement(el.dataset.id);
    if(a==='backup') backup();
    if(a==='restore') importInput.click();
    if(a==='ics') exportICS();
    if(a==='importFile') importInput.click();
  }

  function changeMonth(delta){
    const d = new Date(Number(state.currentMonth.slice(0,4)), Number(state.currentMonth.slice(5,7))-1+delta, 1);
    state.currentMonth = monthKey(d);
    state.selectedDate = iso(d);
    save(); render();
  }

  function submitForm(e){
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const id = form.dataset.id;
    const type = form.dataset.form;
    if(type==='event'){
      const obj = {
        id: id || uid('evt'),
        title: data.title.trim(),
        type: data.type,
        level: Number(data.level||1),
        start: data.start,
        end: data.end || data.start,
        repeat: data.repeat,
        place: data.place,
        memo: data.memo,
        status:'planned',
        prep: []
      };
      if(id) state.events = state.events.map(x=>x.id===id?{...x,...obj}:x);
      else state.events.push(obj);
      if(obj.type==='camp') state.currentProjectId=obj.id;
      state.drawer=null; save(); render(); toast('予定を保存');
    }
    if(type==='gear'){
      const obj = {id:id||uid('gear'), name:data.name.trim(), cat:data.cat, qty:Number(data.qty||1), box:data.box, car:data.car, status:data.status, set:data.set, note:data.note, last:data.last};
      if(id) state.gear = state.gear.map(x=>x.id===id?obj:x);
      else state.gear.push(obj);
      state.drawer=null; save(); render(); toast('ギアを保存');
    }
    if(type==='box'){
      const obj = {id:id||uid('box'), name:data.name.trim(), kind:data.kind, home:data.home, car:data.car, role:data.role};
      if(id) state.boxes = state.boxes.map(x=>x.id===id?obj:x);
      else state.boxes.push(obj);
      state.drawer=null; save(); render(); toast('BOXを保存');
    }
    if(type==='meal'){
      const obj = {id:id||uid('meal'), name:data.name.trim(), slot:data.slot, people:Number(data.people||2), ingredients:data.ingredients.split('\n').map(x=>x.trim()).filter(Boolean), gear:data.gear.split('\n').map(x=>x.trim()).filter(Boolean), note:data.note};
      if(id) state.prep.meals = state.prep.meals.map(x=>x.id===id?obj:x);
      else state.prep.meals.push(obj);
      state.drawer=null; save(); render(); toast('料理を保存');
    }
    if(type==='place'){
      const obj = {id:id||uid('place'), name:data.name.trim(), type:data.type, publicNote:data.publicNote, privateNote:data.privateNote, visits:0};
      if(id) state.placeCards = state.placeCards.map(x=>x.id===id?{...x,...obj}:x);
      else state.placeCards.push(obj);
      state.drawer=null; save(); render(); toast('場所カードを保存');
    }
    if(type==='record'){
      state.records.push({id:uid('rec'), eventId:data.eventId, kind:data.kind, text:data.text || '写真/動画メモ', date:today(), private:false});
      state.drawer=null; save(); render(); toast('記録を保存');
    }
    if(type==='memo'){
      state.records.push({id:uid('rec'), eventId:'', kind:'memo', text:data.text, date:today(), private:false});
      state.events.push({id:uid('evt'),title:data.text.slice(0,18)||'メモ',type:'normal',start:'',end:'',repeat:'none',level:1,place:'',memo:data.text,status:'idea'});
      state.drawer=null; save(); render(); toast('メモを保存');
    }
  }

  function toggleBoxLoaded(boxId){
    const gs = state.gear.filter(g=>g.box===boxId);
    const all = gs.every(g=>g.status==='loaded');
    state.gear = state.gear.map(g=>g.box===boxId ? {...g,status:all?'home':'loaded'} : g);
    save(); render(); toast(all?'積込を戻した':'BOXを積込済みにした');
  }
  function addShoppingPrompt(){
    const name = prompt('買い物名');
    if(!name) return;
    const qty = prompt('数量', '1') || '1';
    const group = prompt('分類', '食材') || '食材';
    state.prep.shopping.push({id:uid('shop'),name,qty,group,source:'手入力',done:false});
    save(); render(); toast('買い物を追加');
  }
  function toggleShopping(id){
    state.prep.shopping = state.prep.shopping.map(i=>i.id===id?{...i,done:!i.done}:i);
    save(); render();
  }
  function generateShopping(){
    const exists = new Set(state.prep.shopping.map(i=>i.name));
    state.prep.meals.forEach(m=>{
      m.ingredients.forEach(x=>{
        if(!exists.has(x)){
          state.prep.shopping.push({id:uid('shop'),name:x,group:'食材',qty:'要確認',source:m.name,done:false});
          exists.add(x);
        }
      });
    });
    save(); render(); toast('献立から買い物を統合');
  }
  async function copyShopping(){
    const text = state.prep.shopping.map(i=>`${i.done?'☑':'□'} ${i.name}：${i.qty}（${i.group}）`).join('\n');
    try { await navigator.clipboard.writeText(text); toast('LINE用にコピー'); }
    catch(e){ prompt('コピーしてください', text); }
  }
  function toggleWeather(id){
    state.prep.weather = state.prep.weather.map(w=>w.id===id?{...w,done:!w.done}:w);
    save(); render();
  }
  function beginWalk(){
    state.walk.active = true;
    state.walk.startedAt = new Date().toISOString();
    state.walk.projectId = state.walk.mode==='camp' ? state.currentProjectId : null;
    save(); render(); toast('散歩開始');
  }
  function stopWalk(){
    state.walk.active = false;
    const text = `${state.walk.mode==='camp'?'キャンプ場散歩':'通常散歩'}：GPS${state.walk.track.length}点 / スポット${state.walk.spots.length}件`;
    state.records.push({id:uid('rec'), eventId:state.walk.projectId || '', kind:'walk', text, date:today(), private:false});
    save(); render(); toast('散歩を保存');
  }
  function captureLocation(){
    if(!navigator.geolocation){
      fakeLocation();
      return;
    }
    navigator.geolocation.getCurrentPosition(pos=>{
      const p = {lat:pos.coords.latitude,lng:pos.coords.longitude,time:new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}),mode:state.walk.mode};
      state.walk.track.push(p);
      save(); render(); toast('現在地を記録');
    },()=>{
      fakeLocation();
    },{enableHighAccuracy:true,timeout:5000});
  }
  function fakeLocation(){
    const baseLat = 35.867 + Math.random()/1000;
    const baseLng = 139.975 + Math.random()/1000;
    state.walk.track.push({lat:baseLat,lng:baseLng,time:new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}),mode:state.walk.mode});
    save(); render(); toast('GPS代替点を記録');
  }
  function addSpot(){
    const name = prompt('スポット名', state.walk.mode==='camp'?'場内スポット':'散歩スポット');
    if(!name) return;
    state.walk.spots.push({id:uid('spot'),name,time:new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}),mode:state.walk.mode});
    save(); render(); toast('スポットを保存');
  }
  function addFriend(){
    const name = prompt('犬友達メモ', '名前未確認');
    if(!name) return;
    state.walk.friends.push({id:uid('friend'),name,time:new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}),mode:state.walk.mode});
    save(); render(); toast('犬友達を保存');
  }
  function addHealth(type){
    state.walk.health.push({id:uid('health'),type,time:new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}),mode:state.walk.mode==='camp'?'キャンプ場散歩':'通常散歩',private:true});
    save(); render(); toast('体調メモに非公開保存');
  }
  function openGoogleMap(){
    const last = state.walk.track[state.walk.track.length-1];
    if(!last){ toast('先に現在地を記録'); return; }
    window.open(`https://www.google.com/maps/search/?api=1&query=${last.lat},${last.lng}`,'_blank');
  }
  function exportWalk(){
    const blob = new Blob([JSON.stringify(state.walk,null,2)], {type:'application/json'});
    downloadBlob(blob, `outbase_walk_${today()}.json`);
  }
  function drawWalkMap(){
    const canvas = $('#walkMap');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = 'rgba(255,250,240,.28)';
    ctx.fillRect(0,0,w,h);
    ctx.strokeStyle = 'rgba(31,42,36,.12)';
    ctx.lineWidth = 1;
    for(let x=0;x<w;x+=32){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
    for(let y=0;y<h;y+=32){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
    const pts = state.walk.track;
    if(pts.length<1) return;
    const lats = pts.map(p=>p.lat), lngs = pts.map(p=>p.lng);
    const minLat=Math.min(...lats), maxLat=Math.max(...lats), minLng=Math.min(...lngs), maxLng=Math.max(...lngs);
    const map = p => ({
      x: 30 + (w-60) * (maxLng===minLng ? .5 : (p.lng-minLng)/(maxLng-minLng)),
      y: h-30 - (h-60) * (maxLat===minLat ? .5 : (p.lat-minLat)/(maxLat-minLat))
    });
    ctx.strokeStyle = '#2f5f4a'; ctx.lineWidth = 4; ctx.lineCap='round'; ctx.lineJoin='round';
    ctx.beginPath();
    pts.forEach((p,i)=>{const m=map(p); if(i===0) ctx.moveTo(m.x,m.y); else ctx.lineTo(m.x,m.y);});
    ctx.stroke();
    pts.forEach((p,i)=>{const m=map(p); ctx.fillStyle=i===0?'#7a5c35':(i===pts.length-1?'#a15c2f':'#2f5f4a'); ctx.beginPath(); ctx.arc(m.x,m.y,6,0,Math.PI*2); ctx.fill();});
  }

  function addImprovementPrompt(){
    const text = prompt('次回改善');
    if(!text) return;
    state.improvements.push({id:uid('imp'),eventId:state.currentProjectId,text,done:false});
    save(); render(); toast('改善を追加');
  }
  function toggleImprovement(id){
    state.improvements = state.improvements.map(i=>i.id===id?{...i,done:!i.done}:i);
    save(); render();
  }

  function backup(){
    const blob = new Blob([JSON.stringify({version:VERSION, exportedAt:new Date().toISOString(), state}, null, 2)], {type:'application/json'});
    downloadBlob(blob, `outbase_backup_${today()}.json`);
  }
  function exportICS(){
    const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//OUTBASE//JP'];
    state.events.filter(e=>e.start).forEach(e=>{
      const dtStart = e.start.replaceAll('-','');
      const dtEnd = addDays(e.end||e.start,1).replaceAll('-','');
      lines.push('BEGIN:VEVENT',`UID:${e.id}@outbase`,`SUMMARY:${escapeICS(e.title)}`,`DTSTART;VALUE=DATE:${dtStart}`,`DTEND;VALUE=DATE:${dtEnd}`,`DESCRIPTION:${escapeICS(e.memo||'')}`);
      if(e.repeat && e.repeat!=='none') lines.push(`RRULE:FREQ=${({daily:'DAILY',weekly:'WEEKLY',monthly:'MONTHLY',yearly:'YEARLY'}[e.repeat]||'')}`);
      lines.push('END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    downloadBlob(new Blob([lines.join('\r\n')],{type:'text/calendar'}),`outbase_${today()}.ics`);
  }
  function escapeICS(s){return String(s||'').replace(/[\\,;]/g,'\\$&').replace(/\n/g,'\\n');}
  function downloadBlob(blob, name){
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }

  importInput.addEventListener('change', async ()=>{
    const file = importInput.files?.[0];
    if(!file) return;
    try{
      const txt = await file.text();
      if(file.name.endsWith('.json')){
        const obj = JSON.parse(txt);
        if(obj.state) state = mergeDefault(obj.state);
        else state.records.push({id:uid('rec'),eventId:'',kind:'import',text:`取込候補: ${file.name}`,date:today(),private:false});
      } else {
        state.records.push({id:uid('rec'),eventId:'',kind:'import',text:`取込候補: ${file.name}`,date:today(),private:false});
      }
      save(); render(); toast('取込候補を保存');
    } catch(e){ toast('読み込みできなかった'); }
    importInput.value='';
  });
  mediaInput.addEventListener('change', ()=>{
    const files = Array.from(mediaInput.files||[]);
    if(files.length){
      state.records.push({id:uid('rec'),eventId:state.currentProjectId,kind:'media',text:`写真/動画 ${files.length}件を選択`,date:today(),private:false});
      save(); render(); toast('メディアを記録');
    }
    mediaInput.value='';
  });

  render();
})();
