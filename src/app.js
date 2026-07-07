
(() => {
  'use strict';
  const VERSION = 'outbase-total-redesign-20260707';
  const STORAGE_KEY = 'outbase_total_redesign_state';
  const app = document.getElementById('app');
  const backupInput = document.getElementById('backupInput');

  const pad = n => String(n).padStart(2, '0');
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const asDate = iso => {
    if (!iso) return null;
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };
  const toISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (iso, n) => {
    const d = asDate(iso);
    d.setDate(d.getDate() + n);
    return toISO(d);
  };
  const monthKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  const uid = p => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const esc = v => String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  const formatDate = iso => iso ? `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}` : '日付なし';
  const countNights = (start, end) => {
    if (!start || !end) return '';
    const diff = Math.round((asDate(end) - asDate(start)) / 86400000);
    return diff > 0 ? `${diff}泊${diff + 1}日` : '日帰り';
  };
  const LABELS = {
    camp: 'キャンプ', normal: '予定', work: '仕事', hospital: '病院', payment: '支払い', pet: 'ペット', walk: '散歩', search: '探し物', memory: 'メモ', trip: '旅行', shopping: '買い物'
  };
  const REPEAT = { none: 'なし', daily: '毎日', weekly: '毎週', monthly: '毎月', yearly: '毎年' };
  const GEAR_STATUS = { home: '保管中', loaded: '積込済', use: '使用中', dry: '乾燥中', repair: '修理', replace: '買替候補' };

  function seed() {
    return {
      route: 'home',
      currentMonth: todayISO().slice(0, 7),
      selectedDate: todayISO(),
      currentPlanId: 'plan-akagi',
      prepTab: 'overview',
      gearTab: 'list',
      searchTab: 'places',
      walkMode: 'normal',
      drawer: null,
      toast: null,
      events: [
        { id: 'plan-akagi', title: 'スノーピーク赤城山CF', type: 'camp', start: '2026-07-18', end: '2026-07-20', repeat: 'none', place: '群馬県 前橋市', memo: 'リン友達夫婦と。雨なら乾燥サービス活用。', level: 4 },
        { id: 'evt-kota', title: 'コタと自宅散歩', type: 'walk', start: '2026-07-12', end: '2026-07-12', repeat: 'weekly', place: '自宅周辺', memo: '通常散歩。非公開体調メモあり。', level: 2 },
        { id: 'evt-card', title: 'カード引落確認', type: 'payment', start: '2026-07-27', end: '2026-07-27', repeat: 'monthly', place: '', memo: '家計チェック。', level: 1 },
        { id: 'evt-search', title: '次に行きたいキャンプ場探し', type: 'search', start: '', end: '', repeat: 'none', place: '', memo: '犬可 / 温水 / 4時間以内', level: 1 }
      ],
      meals: [
        { id: 'meal-1', name: 'ガーリックシュリンプ', slot: '1日目 夜', ingredients: ['ブラックタイガー 250g', 'にんにく', 'オリーブオイル', 'バター'], gear: ['スキレット大', 'トング'], note: 'バケットなし。量重すぎ注意。' },
        { id: 'meal-2', name: '自家製ピザ', slot: '1日目 夜', ingredients: ['ピザ生地', 'チーズ', 'ソース'], gear: ['ピザ道具'], note: '生地は自作。' }
      ],
      shopping: [
        { id: 'shop-1', name: 'ブラックタイガー', qty: '250g', group: '食材', done: false, source: 'ガーリックシュリンプ' },
        { id: 'shop-2', name: 'ブラータチーズ', qty: '1個', group: '食材', done: false, source: '前菜' },
        { id: 'shop-3', name: 'コタ用水', qty: '1式', group: 'コタ', done: false, source: '散歩' }
      ],
      weather: [
        { id: 'w1', timing: '7日前', note: '最低気温 / 風 / 雨傾向', done: false },
        { id: 'w2', timing: '3日前', note: '設営・撤収時間帯の雨風', done: false },
        { id: 'w3', timing: '前日', note: '服装 / コタ暑寒 / 幕体判断', done: false },
        { id: 'w4', timing: '当日', note: '出発 / 設営 / 撤収最終判断', done: false }
      ],
      boxes: [
        { id: 'box-1', name: 'シェルコン50 A', kind: 'ハード収納', home: '玄関収納', car: '左後方', role: '幕体' },
        { id: 'box-2', name: 'キッチンBOX', kind: 'コンテナ', home: '棚下', car: '右後方', role: '料理' },
        { id: 'box-3', name: 'コタBOX', kind: 'コンテナ', home: 'リビング横', car: '右後方', role: 'ペット' }
      ],
      gear: [
        { id: 'gear-1', name: 'リビングシェル アイボリー', cat: '幕体', qty: 1, boxId: 'box-1', car: '左後方', status: 'home', note: '乾燥確認', last: '2026-05-17' },
        { id: 'gear-2', name: 'アメニティドームM アイボリー', cat: '幕体', qty: 1, boxId: 'box-1', car: '左後方', status: 'home', note: '寝室', last: '2026-05-17' },
        { id: 'gear-3', name: 'スキレット大', cat: '料理', qty: 1, boxId: 'box-2', car: 'キッチン箱', status: 'home', note: 'ガーリックシュリンプ用', last: '2026-06-27' },
        { id: 'gear-4', name: 'ドッグオフトン', cat: 'ペット', qty: 1, boxId: 'box-3', car: '右後方', status: 'home', note: 'コタ用品', last: '2026-05-17' },
        { id: 'gear-5', name: 'たねほおずき', cat: '照明', qty: 7, boxId: 'box-2', car: '中央後方', status: 'dry', note: '充電確認', last: '2026-05-17' }
      ],
      places: [
        { id: 'place-1', name: '柏の葉公園', type: '通常散歩', note: '普段散歩候補。駐車場あり。', visits: 3 },
        { id: 'place-2', name: '赤城山 場内散歩ルート', type: 'キャンプ場散歩', note: '木陰あり。朝向き。', visits: 1 }
      ],
      dogFriends: [
        { id: 'friend-1', name: 'ハナちゃん', note: '穏やか。再会したい。', place: '柏の葉公園' }
      ],
      notes: [
        { id: 'note-1', title: '次回改善', text: '雨予報なら直営・乾燥サービスを優先。', private: false },
        { id: 'note-2', title: '体調メモ', text: '排泄記録は公開画面に出さず、ここだけに残す。', private: true }
      ],
      walk: {
        active: false,
        mode: 'normal',
        track: [],
        spots: [],
        friends: [],
        health: []
      }
    };
  }

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return seed();
      return Object.assign(seed(), JSON.parse(raw));
    } catch (e) {
      return seed();
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function setToast(message) {
    state.toast = message;
    render();
    setTimeout(() => {
      if (state.toast === message) {
        state.toast = null;
        render();
      }
    }, 1600);
  }

  function currentPlan() {
    return state.events.find(e => e.id === state.currentPlanId) || state.events.find(e => e.type === 'camp') || state.events[0];
  }

  function occurrencesForMonth(event, month = state.currentMonth) {
    if (!event.start) return [];
    const [y, m] = month.split('-').map(Number);
    const first = new Date(y, m - 1, 1);
    const last = new Date(y, m, 0);
    const start = asDate(event.start);
    const end = asDate(event.end || event.start);
    const out = [];
    const duration = Math.max(0, Math.round((end - start) / 86400000));

    function pushRange(rangeStart) {
      const rangeEnd = new Date(rangeStart);
      rangeEnd.setDate(rangeEnd.getDate() + duration);
      const clipStart = new Date(Math.max(rangeStart, first));
      const clipEnd = new Date(Math.min(rangeEnd, last));
      const multiple = toISO(rangeStart) !== toISO(rangeEnd);
      for (let d = new Date(clipStart); d <= clipEnd; d.setDate(d.getDate() + 1)) {
        out.push({
          event,
          date: toISO(d),
          multiple,
          starts: toISO(d) === toISO(rangeStart),
          ends: toISO(d) === toISO(rangeEnd)
        });
      }
    }

    if (!event.repeat || event.repeat === 'none') {
      if (end >= first && start <= last) pushRange(new Date(start));
      return out;
    }

    let cursor = new Date(start);
    let guard = 0;
    while (cursor <= last && guard < 120) {
      const cursorEnd = new Date(cursor);
      cursorEnd.setDate(cursorEnd.getDate() + duration);
      if (cursorEnd >= first && cursor <= last) pushRange(new Date(cursor));
      if (event.repeat === 'daily') cursor.setDate(cursor.getDate() + 1);
      else if (event.repeat === 'weekly') cursor.setDate(cursor.getDate() + 7);
      else if (event.repeat === 'monthly') cursor.setMonth(cursor.getMonth() + 1);
      else if (event.repeat === 'yearly') cursor.setFullYear(cursor.getFullYear() + 1);
      else break;
      guard++;
    }
    return out;
  }

  function dayOccurrences(iso) {
    return state.events.flatMap(e => occurrencesForMonth(e, iso.slice(0, 7))).filter(o => o.date === iso);
  }

  function unscheduledEvents() {
    return state.events.filter(e => !e.start);
  }

  function topbar() {
    const plan = currentPlan();
    const meta = plan.start ? `${formatDate(plan.start)}〜${formatDate(plan.end || plan.start)} / ${LABELS[plan.type] || plan.type}` : '日付未設定';
    return `
      <header class="topbar">
        <button class="brand" data-route="home">
          <span class="brand-mark">OB</span>
          <span class="brand-copy"><b>OUTBASE</b><small>quiet camp atelier</small></span>
        </button>
        <button class="plan-pill" data-act="edit-plan">
          <span class="plan-dot"></span>
          <strong>${esc(plan.title)}</strong>
          <small>${esc(meta)}</small>
        </button>
      </header>
    `;
  }

  function bottomNav() {
    const items = [
      ['home', '⌂', '今日'],
      ['calendar', '▦', '予定'],
      ['prep', '◫', '準備'],
      ['capture', '＋', '記録'],
      ['memory', '◌', '思い出']
    ];
    return `
      <nav class="bottom-nav">
        ${items.map(([route, icon, label]) => `
          <button class="nav-btn ${state.route === route ? 'active' : ''}" data-route="${route}">
            <span class="icon">${icon}</span>
            <span>${label}</span>
          </button>`).join('')}
      </nav>
    `;
  }

  function homeView() {
    const plan = currentPlan();
    const upcoming = state.events.filter(e => e.start).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 3);
    return `
      ${topbar()}
      <section class="hero">
        <h1>使うための静かな道具。</h1>
        <p>予定・準備・現地記録・思い出整理を、試作っぽさではなく、長く使える質感でまとめる。</p>
      </section>

      <section class="section">
        <div class="section-head">
          <div>
            <h2 class="section-title">今の主役</h2>
            <p class="section-sub">今触っているプランを大きく邪魔せずに確認。</p>
          </div>
          <span class="badge wood">${countNights(plan.start, plan.end || plan.start) || '進行中'}</span>
        </div>
        <div class="surface"><div class="surface-inner">
          <div class="row-item" data-act="open-event" data-id="${plan.id}">
            <span>
              <strong>${esc(plan.title)}</strong>
              <small>${esc(LABELS[plan.type])} / ${plan.start ? `${formatDate(plan.start)}〜${formatDate(plan.end || plan.start)}` : '日付未設定'} / ${esc(plan.place || '場所未設定')}</small>
            </span>
            <span class="badge dark">開く</span>
          </div>
          <div class="button-row" style="margin-top:12px">
            <button class="btn primary" data-route="calendar">予定を見る</button>
            <button class="btn" data-route="prep">準備する</button>
            <button class="btn" data-route="capture">現地で残す</button>
          </div>
        </div></div>
      </section>

      <section class="section">
        <div class="section-head">
          <div>
            <h2 class="section-title">入口を絞る</h2>
            <p class="section-sub">押す場所を迷わせない。多機能でも入口は少なく。</p>
          </div>
        </div>
        <div class="grid-2">
          <button class="quick-tile" data-route="calendar"><strong>予定</strong><small>単体・連日・繰り返しを見分けながら、全予定を俯瞰。</small></button>
          <button class="quick-tile" data-route="prep"><strong>準備</strong><small>料理・買い物・ギア・天気をつなげて準備の迷いを減らす。</small></button>
          <button class="quick-tile" data-route="capture"><strong>現地記録</strong><small>散歩・写真・声・メモを現地で素早く残す。</small></button>
          <button class="quick-tile" data-route="memory"><strong>思い出</strong><small>レビュー、次回改善、過去実績に回収する。</small></button>
        </div>
      </section>

      <section class="section">
        <div class="metric-row">
          <div class="metric"><small>買い物未完</small><strong>${state.shopping.filter(i => !i.done).length}件</strong></div>
          <div class="metric"><small>日付未設定</small><strong>${unscheduledEvents().length}件</strong></div>
          <div class="metric"><small>乾燥/修理</small><strong>${state.gear.filter(g => ['dry', 'repair', 'replace'].includes(g.status)).length}件</strong></div>
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <div>
            <h2 class="section-title">近い予定</h2>
            <p class="section-sub">押すと予定詳細を開く。</p>
          </div>
        </div>
        <div class="list">
          ${upcoming.map(e => rowEvent(e)).join('')}
        </div>
      </section>
      ${bottomNav()}
    `;
  }

  function calendarView() {
    const [year, month] = state.currentMonth.split('-').map(Number);
    const first = new Date(year, month - 1, 1);
    const start = new Date(first);
    start.setDate(1 - start.getDay());
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      cells.push({ iso: toISO(d), inMonth: d.getMonth() === month - 1, occurrences: dayOccurrences(toISO(d)) });
    }

    return `
      ${topbar()}
      <section class="section">
        <div class="surface"><div class="surface-inner calendar-shell">
          <div class="calendar-top">
            <button class="cal-nav" data-act="month-prev">‹</button>
            <div style="text-align:center">
              <div class="calendar-month">${year}年 ${month}月</div>
              <div class="calendar-sub">左右スライドでも月移動 / タップ選択 / 同日ダブルタップ追加</div>
            </div>
            <button class="cal-nav" data-act="month-next">›</button>
          </div>
          <div class="weekdays">${['日','月','火','水','木','金','土'].map(d => `<span>${d}</span>`).join('')}</div>
          <div class="month-grid" id="monthGrid">${cells.map(dayCell).join('')}</div>
          <div class="legend">
            <span><i class="dot"></i>単体予定</span>
            <span><i class="bar"></i>連日予定</span>
            <span><i class="camp"></i>キャンプ</span>
            <span>↻ 繰り返し</span>
          </div>
        </div></div>
      </section>
      <section class="section">
        <div class="section-head">
          <div>
            <h2 class="section-title">${formatDate(state.selectedDate)} の予定</h2>
            <p class="section-sub">その日の予定だけを下に集める。カレンダーは全体、詳細は下。</p>
          </div>
          <button class="btn primary" data-act="add-event" data-date="${state.selectedDate}">追加</button>
        </div>
        <div class="list">${renderSelectedDayEvents()}</div>
      </section>
      <section class="section">
        <div class="section-head">
          <div>
            <h2 class="section-title">日付未設定</h2>
            <p class="section-sub">候補探し、あとで決める予定、仮のメモ。</p>
          </div>
          <span class="badge">${unscheduledEvents().length}件</span>
        </div>
        <div class="list">
          ${unscheduledEvents().length ? unscheduledEvents().map(rowEvent).join('') : `<div class="unscheduled"><div class="empty-copy">日付未設定の予定はまだない。</div></div>`}
        </div>
      </section>
      ${bottomNav()}
    `;
  }

  function dayCell(cell) {
    const multi = cell.occurrences.filter(o => o.multiple).slice(0, 2);
    const singles = cell.occurrences.filter(o => !o.multiple).slice(0, 2);
    const tops = [22, 40];
    return `
      <button class="day ${cell.inMonth ? '' : 'out'} ${cell.iso === todayISO() ? 'today' : ''} ${cell.iso === state.selectedDate ? 'selected' : ''}" data-day="${cell.iso}">
        <span class="day-num">${Number(cell.iso.slice(8, 10))}</span>
        ${multi.map((o, idx) => `
          <span class="day-strip ${o.event.type === 'camp' ? 'camp' : ''} ${o.starts ? 'start' : ''} ${o.ends ? 'end' : ''}" style="top:${tops[idx]}px">${o.starts ? esc(o.event.title) : ''}${o.event.repeat !== 'none' ? ' ↻' : ''}</span>`).join('')}
        ${singles.map(o => `<span class="day-chip ${o.event.repeat !== 'none' ? 'repeat' : ''}">${esc(o.event.title)}</span>`).join('')}
        ${cell.occurrences.length > 4 ? `<span class="more-mark">+${cell.occurrences.length - 4}</span>` : ''}
      </button>
    `;
  }

  function renderSelectedDayEvents() {
    const list = dayOccurrences(state.selectedDate);
    if (!list.length) {
      return `<div class="unscheduled"><div class="empty-copy">この日の予定はまだない。必要ならここから追加。</div></div>`;
    }
    return list.map(o => rowEvent(o.event, o)).join('');
  }

  function rowEvent(event, occurrence = null) {
    const kind = occurrence ? (occurrence.multiple ? '連日予定' : '単体予定') : (event.start && event.end && event.start !== event.end ? '連日予定' : '単体予定');
    const repeat = event.repeat && event.repeat !== 'none' ? ` / ${REPEAT[event.repeat]}` : '';
    const dateText = event.start ? `${formatDate(event.start)}${event.end && event.end !== event.start ? '〜' + formatDate(event.end) : ''}` : '日付未設定';
    return `
      <button class="row-item" data-act="open-event" data-id="${event.id}">
        <span>
          <strong>${esc(event.title)}</strong>
          <small>${esc(LABELS[event.type] || event.type)} / ${dateText} / ${kind}${repeat}<br>${esc(event.place || '場所未設定')}</small>
        </span>
        <span class="badge ${kind === '連日予定' ? 'wood' : ''}">${kind === '連日予定' ? '連日' : '単体'}</span>
      </button>
    `;
  }

  function prepView() {
    return `
      ${topbar()}
      <section class="section">
        <div class="section-head">
          <div>
            <h2 class="section-title">準備</h2>
            <p class="section-sub">薄いカードの並びではなく、準備の流れで整理する。</p>
          </div>
        </div>
        <div class="chips">
          ${['overview:全体','meals:料理','shopping:買い物','gear:ギア','weather:天気'].map(item => {
            const [id, label] = item.split(':');
            return `<button class="chip ${state.prepTab === id ? 'active' : ''}" data-prep="${id}">${label}</button>`;
          }).join('')}
        </div>
      </section>
      ${renderPrepBody()}
      ${bottomNav()}
    `;
  }

  function renderPrepBody() {
    if (state.prepTab === 'meals') return renderMeals();
    if (state.prepTab === 'shopping') return renderShopping();
    if (state.prepTab === 'gear') return renderGear();
    if (state.prepTab === 'weather') return renderWeather();
    return `
      <section class="section">
        <div class="grid-2">
          <button class="quick-tile" data-prep="meals"><strong>料理</strong><small>献立 → 材料 → 必要ギアへつなげる。</small></button>
          <button class="quick-tile" data-prep="shopping"><strong>買い物</strong><small>LINEへコピーできる形まで整える。</small></button>
          <button class="quick-tile" data-prep="gear"><strong>ギア</strong><small>登録・変更・ボックス・積込・乾燥/修理。</small></button>
          <button class="quick-tile" data-prep="weather"><strong>天気</strong><small>設営 / 撤収 / コタ / 幕体判断。</small></button>
        </div>
      </section>
    `;
  }

  function renderMeals() {
    return `
      <section class="section">
        <div class="section-head">
          <div><h2 class="section-title">料理</h2><p class="section-sub">献立から材料・ギアへつなげる。</p></div>
          <button class="btn primary" data-act="add-meal">追加</button>
        </div>
        <div class="list">
          ${state.meals.map(meal => `
            <button class="row-item" data-act="edit-meal" data-id="${meal.id}">
              <span>
                <strong>${esc(meal.name)}</strong>
                <small>${esc(meal.slot)} / 材料 ${meal.ingredients.length} / ギア ${meal.gear.length}<br>${esc(meal.note)}</small>
              </span>
              <span class="badge">編集</span>
            </button>
          `).join('')}
        </div>
        <div class="button-row" style="margin-top:12px">
          <button class="btn" data-act="generate-shopping">献立から買い物反映</button>
        </div>
      </section>
    `;
  }

  function renderShopping() {
    return `
      <section class="section">
        <div class="section-head">
          <div><h2 class="section-title">買い物</h2><p class="section-sub">必要なものをひとつに集める。</p></div>
          <button class="btn primary" data-act="add-shopping">追加</button>
        </div>
        <div class="list">
          ${state.shopping.map(item => `
            <button class="row-item" data-act="toggle-shopping" data-id="${item.id}">
              <span>
                <strong>${item.done ? '✓ ' : ''}${esc(item.name)}</strong>
                <small>${esc(item.qty)} / ${esc(item.group)} / ${esc(item.source)}</small>
              </span>
              <span class="badge ${item.done ? 'dark' : ''}">${item.done ? '済' : '未'}</span>
            </button>
          `).join('')}
        </div>
        <div class="button-row" style="margin-top:12px">
          <button class="btn primary" data-act="copy-shopping">LINE用コピー</button>
        </div>
      </section>
    `;
  }

  function renderWeather() {
    return `
      <section class="section">
        <div class="section-head">
          <div><h2 class="section-title">天気判断</h2><p class="section-sub">見るためではなく、判断するために使う。</p></div></div>
        <div class="list">
          ${state.weather.map(w => `
            <button class="row-item" data-act="toggle-weather" data-id="${w.id}">
              <span><strong>${w.done ? '✓ ' : ''}${esc(w.timing)}</strong><small>${esc(w.note)}</small></span>
              <span class="badge ${w.done ? 'dark' : ''}">${w.done ? '済' : '確認'}</span>
            </button>`).join('')}
        </div>
      </section>
    `;
  }

  function renderGear() {
    return `
      <section class="section">
        <div class="section-head">
          <div><h2 class="section-title">ギア</h2><p class="section-sub">ボックス、車載位置、乾燥修理まで含めて管理。</p></div>
          <button class="btn primary" data-act="add-gear">登録</button>
        </div>
        <div class="chips">
          ${['list:一覧','boxes:ボックス','load:積込','care:乾燥/修理','import:取込'].map(item => {
            const [id, label] = item.split(':');
            return `<button class="chip ${state.gearTab === id ? 'active' : ''}" data-gear="${id}">${label}</button>`;
          }).join('')}
        </div>
      </section>
      ${renderGearBody()}
    `;
  }

  function renderGearBody() {
    if (state.gearTab === 'boxes') {
      return `
        <section class="section">
          <div class="section-head"><div><h2 class="subsection-title">ボックス管理</h2></div><button class="btn primary" data-act="add-box">BOX追加</button></div>
          <div class="list">
            ${state.boxes.map(box => {
              const items = state.gear.filter(g => g.boxId === box.id).map(g => g.name).join(' / ');
              return `<button class="row-item" data-act="edit-box" data-id="${box.id}"><span><strong>${esc(box.name)}</strong><small>${esc(box.kind)} / 家:${esc(box.home)} / 車:${esc(box.car)}<br>${esc(items || '中身なし')}</small></span><span class="badge">変更</span></button>`;
            }).join('')}
          </div>
        </section>
      `;
    }
    if (state.gearTab === 'load') {
      return `
        <section class="section">
          <div class="section-head"><div><h2 class="subsection-title">車載位置</h2></div></div>
          <div class="load-map">
            ${['左後方','中央後方','右後方','キッチン箱','照明箱','足元'].map(zone => {
              const items = state.gear.filter(g => g.car === zone).map(g => g.name).join(' / ') || '未配置';
              return `<div class="load-zone"><strong>${zone}</strong><small>${esc(items)}</small></div>`;
            }).join('')}
          </div>
          <div class="list" style="margin-top:12px">
            ${state.boxes.map(box => {
              const list = state.gear.filter(g => g.boxId === box.id);
              const loaded = list.filter(g => g.status === 'loaded').length;
              return `<button class="row-item" data-act="toggle-box-load" data-id="${box.id}"><span><strong>${esc(box.name)}</strong><small>${loaded}/${list.length} 積込済 / ${esc(box.car)}</small></span><span class="badge ${loaded === list.length && list.length ? 'dark' : ''}">${loaded === list.length && list.length ? '完了' : '確認'}</span></button>`;
            }).join('')}
          </div>
        </section>
      `;
    }
    if (state.gearTab === 'care') {
      const care = state.gear.filter(g => ['dry', 'repair', 'replace'].includes(g.status));
      return `
        <section class="section">
          <div class="list">
            ${care.length ? care.map(gearRow).join('') : `<div class="unscheduled"><div class="empty-copy">乾燥・修理・買替候補はまだない。</div></div>`}
          </div>
        </section>
      `;
    }
    if (state.gearTab === 'import') {
      return `
        <section class="section">
          <div class="surface"><div class="surface-inner">
            <div class="section-sub">Excel・購入履歴・写真は取込候補として保存。完全解析は後段で広げる。</div>
            <div class="button-row" style="margin-top:12px">
              <button class="btn primary" data-act="import-file">ファイル選択</button>
              <button class="btn" data-act="backup">バックアップ出力</button>
            </div>
          </div></div>
        </section>
      `;
    }
    return `
      <section class="section">
        <div class="list">${state.gear.map(gearRow).join('')}</div>
      </section>
    `;
  }

  function gearRow(gear) {
    const box = state.boxes.find(b => b.id === gear.boxId);
    return `
      <button class="row-item" data-act="edit-gear" data-id="${gear.id}">
        <span>
          <strong>${esc(gear.name)} ×${gear.qty}</strong>
          <small>${esc(gear.cat)} / ${esc(box ? box.name : '未収納')} / 車:${esc(gear.car || '未設定')} / ${esc(GEAR_STATUS[gear.status] || gear.status)}<br>${esc(gear.note || '')}</small>
        </span>
        <span class="badge">変更</span>
      </button>
    `;
  }

  function captureView() {
    return `
      ${topbar()}
      <section class="hero">
        <h1>現地で、考えずに残す。</h1>
        <p>写真、声、メモ、散歩、スポット。現地で触る画面は迷わず軽く。</p>
      </section>
      <section class="section">
        <div class="grid-2">
          <button class="quick-tile" data-act="add-event"><strong>予定追加</strong><small>単体 / 連日 / 繰り返し</small></button>
          <button class="quick-tile" data-act="quick-note"><strong>メモ</strong><small>日付未設定でも仮置きできる。</small></button>
          <button class="quick-tile" data-act="open-record"><strong>記録</strong><small>写真・声・テキストを素早く残す。</small></button>
          <button class="quick-tile" data-route="memory"><strong>後で整理</strong><small>思い出と改善へつなげる。</small></button>
        </div>
      </section>
      <section class="section">
        <div class="section-head">
          <div><h2 class="section-title">散歩</h2><p class="section-sub">通常散歩 / キャンプ場散歩。排泄は表に出さない。</p></div>
          <span class="badge ${state.walk.active ? 'dark' : ''}">${state.walk.active ? '記録中' : '停止中'}</span>
        </div>
        <div class="segment">
          <button class="${state.walkMode === 'normal' ? 'active' : ''}" data-walk="normal">通常散歩</button>
          <button class="${state.walkMode === 'camp' ? 'active' : ''}" data-walk="camp">キャンプ場散歩</button>
        </div>
        <div class="metric-row" style="margin-top:12px">
          <div class="metric"><small>GPS</small><strong>${state.walk.track.length}点</strong></div>
          <div class="metric"><small>スポット</small><strong>${state.walk.spots.length}件</strong></div>
          <div class="metric"><small>犬友達</small><strong>${state.walk.friends.length}件</strong></div>
        </div>
      </section>
      <section class="section">
        <div class="map-view">
          <canvas id="walkMap" width="580" height="220"></canvas>
          ${state.walk.track.length ? '' : '<div class="map-empty">GPSがまだない。<br>現在地を押すと散歩ルートが描かれる。</div>'}
        </div>
        <div class="button-row" style="margin-top:12px">
          <button class="btn ${state.walk.active ? 'alert' : 'primary'}" data-act="toggle-walk">${state.walk.active ? '散歩終了' : '散歩開始'}</button>
          <button class="btn" data-act="walk-gps">現在地</button>
          <button class="btn" data-act="walk-spot">スポット</button>
          <button class="btn" data-act="walk-friend">犬友達</button>
          <button class="btn" data-act="open-map">Google Map</button>
        </div>
      </section>
      <section class="section">
        <details class="privacy-note">
          <summary>非公開の体調メモ</summary>
          <div class="button-row" style="margin-top:12px">
            <button class="btn" data-act="health-note" data-type="体調">体調</button>
            <button class="btn" data-act="health-note" data-type="うんち">うんち</button>
            <button class="btn" data-act="health-note" data-type="おしっこ">おしっこ</button>
          </div>
          <div class="list" style="margin-top:12px">
            ${state.walk.health.length ? state.walk.health.slice().reverse().map(h => `<div class="row-item"><span><strong>${esc(h.type)}</strong><small>${esc(h.time)} / ${esc(h.mode)} / 非公開</small></span><span class="badge private">非公開</span></div>`).join('') : '<div class="empty-copy">非公開メモはまだない。</div>'}
          </div>
        </details>
      </section>
      ${bottomNav()}
    `;
  }

  function memoryView() {
    return `
      ${topbar()}
      <section class="hero">
        <h1>残した記録を、次回の力にする。</h1>
        <p>過去実績、レビュー、次回改善。記録を使える形に整える。</p>
      </section>
      <section class="section">
        <div class="section-head"><div><h2 class="section-title">残したメモ</h2><p class="section-sub">公開用と非公開を分ける。</p></div><button class="btn primary" data-act="open-record">追加</button></div>
        <div class="list">
          ${state.notes.map(note => `
            <div class="row-item">
              <span><strong>${esc(note.title)}</strong><small>${esc(note.text)}</small></span>
              <span class="badge ${note.private ? 'private' : ''}">${note.private ? '非公開' : '共有可'}</span>
            </div>
          `).join('')}
        </div>
      </section>
      <section class="section">
        <div class="section-head"><div><h2 class="section-title">場所と犬友達</h2><p class="section-sub">次回の散歩・探し物へ戻せるように残す。</p></div></div>
        <div class="split">
          <div>
            <div class="subsection-title">場所カード</div>
            <div class="list">${state.places.map(p => `<div class="row-item"><span><strong>${esc(p.name)}</strong><small>${esc(p.type)} / 訪問${p.visits}回<br>${esc(p.note)}</small></span><span class="badge">場所</span></div>`).join('')}</div>
          </div>
          <div>
            <div class="subsection-title">犬友達</div>
            <div class="list">${state.dogFriends.map(f => `<div class="row-item"><span><strong>${esc(f.name)}</strong><small>${esc(f.place)}<br>${esc(f.note)}</small></span><span class="badge">犬友達</span></div>`).join('')}</div>
          </div>
        </div>
      </section>
      <section class="section">
        <div class="section-head"><div><h2 class="section-title">バックアップ</h2><p class="section-sub">JSON保存と復元。</p></div></div>
        <div class="button-row">
          <button class="btn primary" data-act="backup">保存</button>
          <button class="btn" data-act="restore">復元</button>
        </div>
      </section>
      ${bottomNav()}
    `;
  }

  function renderDrawer() {
    if (!state.drawer) return '';
    return `<div class="drawer-backdrop" data-act="close-drawer"></div><div class="drawer">${drawerBody()}</div>`;
  }

  function drawerBody() {
    const d = state.drawer;
    if (d.type === 'event') {
      const item = state.events.find(e => e.id === d.id) || { id: '', title: '', type: 'normal', start: d.date || state.selectedDate, end: d.date || state.selectedDate, repeat: 'none', place: '', memo: '', level: 1 };
      return `
        <form class="form" data-form="event" data-id="${item.id}">
          <div class="section-head"><div><h2 class="section-title">${item.id ? '予定を整える' : '予定を追加'}</h2><p class="section-sub">単体・連日・繰り返しまでここで設定。</p></div><button type="button" class="btn" data-act="close-drawer">閉じる</button></div>
          <div class="field"><label>予定名</label><input name="title" required value="${esc(item.title)}" /></div>
          <div class="inline-2">
            <div class="field"><label>種類</label><select name="type">${Object.entries(LABELS).map(([k,v]) => `<option value="${k}" ${item.type===k?'selected':''}>${v}</option>`).join('')}</select></div>
            <div class="field"><label>繰り返し</label><select name="repeat">${Object.entries(REPEAT).map(([k,v]) => `<option value="${k}" ${item.repeat===k?'selected':''}>${v}</option>`).join('')}</select></div>
          </div>
          <div class="inline-2">
            <div class="field"><label>開始日</label><input type="date" name="start" value="${esc(item.start)}" /></div>
            <div class="field"><label>終了日</label><input type="date" name="end" value="${esc(item.end)}" /></div>
          </div>
          <div class="field"><label>場所</label><input name="place" value="${esc(item.place)}" /></div>
          <div class="field"><label>メモ</label><textarea name="memo">${esc(item.memo)}</textarea></div>
          <div class="button-row">
            <button class="btn primary" type="submit">保存</button>
            ${item.id ? `<button class="btn alert" type="button" data-act="delete-event" data-id="${item.id}">削除</button>` : ''}
          </div>
        </form>
      `;
    }
    if (d.type === 'meal') {
      const meal = state.meals.find(m => m.id === d.id) || { id: '', name: '', slot: '', ingredients: [], gear: [], note: '' };
      return `
        <form class="form" data-form="meal" data-id="${meal.id}">
          <div class="section-head"><div><h2 class="section-title">${meal.id ? '料理を変更' : '料理を追加'}</h2></div><button type="button" class="btn" data-act="close-drawer">閉じる</button></div>
          <div class="field"><label>料理名</label><input name="name" value="${esc(meal.name)}" required /></div>
          <div class="field"><label>タイミング</label><input name="slot" value="${esc(meal.slot)}" /></div>
          <div class="field"><label>材料（改行区切り）</label><textarea name="ingredients">${esc(meal.ingredients.join('\n'))}</textarea></div>
          <div class="field"><label>必要ギア（改行区切り）</label><textarea name="gear">${esc(meal.gear.join('\n'))}</textarea></div>
          <div class="field"><label>メモ</label><textarea name="note">${esc(meal.note)}</textarea></div>
          <div class="button-row"><button class="btn primary" type="submit">保存</button></div>
        </form>
      `;
    }
    if (d.type === 'gear') {
      const gear = state.gear.find(g => g.id === d.id) || { id: '', name: '', cat: '', qty: 1, boxId: state.boxes[0]?.id || '', car: '', status: 'home', note: '', last: '' };
      return `
        <form class="form" data-form="gear" data-id="${gear.id}">
          <div class="section-head"><div><h2 class="section-title">${gear.id ? 'ギアを変更' : 'ギアを登録'}</h2></div><button type="button" class="btn" data-act="close-drawer">閉じる</button></div>
          <div class="field"><label>ギア名</label><input name="name" value="${esc(gear.name)}" required /></div>
          <div class="inline-2">
            <div class="field"><label>カテゴリ</label><input name="cat" value="${esc(gear.cat)}" /></div>
            <div class="field"><label>数量</label><input type="number" min="1" name="qty" value="${esc(gear.qty)}" /></div>
          </div>
          <div class="inline-2">
            <div class="field"><label>収納BOX</label><select name="boxId">${state.boxes.map(box => `<option value="${box.id}" ${gear.boxId===box.id?'selected':''}>${esc(box.name)}</option>`).join('')}</select></div>
            <div class="field"><label>状態</label><select name="status">${Object.entries(GEAR_STATUS).map(([k,v]) => `<option value="${k}" ${gear.status===k?'selected':''}>${v}</option>`).join('')}</select></div>
          </div>
          <div class="field"><label>車載位置</label><input name="car" value="${esc(gear.car)}" /></div>
          <div class="field"><label>メモ</label><textarea name="note">${esc(gear.note)}</textarea></div>
          <div class="button-row"><button class="btn primary" type="submit">保存</button></div>
        </form>
      `;
    }
    if (d.type === 'box') {
      const box = state.boxes.find(b => b.id === d.id) || { id: '', name: '', kind: '', home: '', car: '', role: '' };
      return `
        <form class="form" data-form="box" data-id="${box.id}">
          <div class="section-head"><div><h2 class="section-title">${box.id ? 'BOXを変更' : 'BOXを追加'}</h2></div><button type="button" class="btn" data-act="close-drawer">閉じる</button></div>
          <div class="field"><label>BOX名</label><input name="name" value="${esc(box.name)}" required /></div>
          <div class="field"><label>種類</label><input name="kind" value="${esc(box.kind)}" /></div>
          <div class="inline-2"><div class="field"><label>家の場所</label><input name="home" value="${esc(box.home)}" /></div><div class="field"><label>車の場所</label><input name="car" value="${esc(box.car)}" /></div></div>
          <div class="field"><label>役割</label><input name="role" value="${esc(box.role)}" /></div>
          <div class="button-row"><button class="btn primary" type="submit">保存</button></div>
        </form>
      `;
    }
    if (d.type === 'note') {
      return `
        <form class="form" data-form="note">
          <div class="section-head"><div><h2 class="section-title">メモを追加</h2></div><button type="button" class="btn" data-act="close-drawer">閉じる</button></div>
          <div class="field"><label>タイトル</label><input name="title" required /></div>
          <div class="field"><label>本文</label><textarea name="text"></textarea></div>
          <div class="field"><label><input type="checkbox" name="private" style="width:auto;margin-right:8px" /> 非公開にする</label></div>
          <div class="button-row"><button class="btn primary" type="submit">保存</button></div>
        </form>
      `;
    }
    return '';
  }

  function render() {
    let html = '';
    if (state.route === 'calendar') html = calendarView();
    else if (state.route === 'prep') html = prepView();
    else if (state.route === 'capture') html = captureView();
    else if (state.route === 'memory') html = memoryView();
    else html = homeView();
    app.innerHTML = html + renderDrawer() + (state.toast ? `<div class="toast">${esc(state.toast)}</div>` : '');
    bind();
    if (state.route === 'capture') drawWalkMap();
    bindSwipe();
  }

  function bind() {
    document.querySelectorAll('[data-route]').forEach(el => {
      el.onclick = () => { state.route = el.dataset.route; save(); render(); };
    });
    document.querySelectorAll('[data-day]').forEach(el => {
      let lastTap = 0;
      el.onclick = () => {
        const now = Date.now();
        if (now - lastTap < 320) {
          state.drawer = { type: 'event', date: el.dataset.day };
        } else {
          state.selectedDate = el.dataset.day;
          state.currentMonth = el.dataset.day.slice(0, 7);
        }
        lastTap = now;
        save(); render();
      };
    });
    document.querySelectorAll('[data-prep]').forEach(el => { el.onclick = () => { state.prepTab = el.dataset.prep; save(); render(); }; });
    document.querySelectorAll('[data-gear]').forEach(el => { el.onclick = () => { state.gearTab = el.dataset.gear; save(); render(); }; });
    document.querySelectorAll('[data-walk]').forEach(el => { el.onclick = () => { state.walkMode = el.dataset.walk; save(); render(); }; });
    document.querySelectorAll('[data-act]').forEach(el => { el.onclick = ev => handleAction(el.dataset.act, el, ev); });
    document.querySelectorAll('form[data-form]').forEach(form => { form.onsubmit = handleSubmit; });
  }

  function bindSwipe() {
    const grid = document.getElementById('monthGrid');
    if (!grid) return;
    let startX = null;
    grid.ontouchstart = e => { startX = e.touches[0].clientX; };
    grid.ontouchend = e => {
      if (startX == null) return;
      const diff = e.changedTouches[0].clientX - startX;
      if (Math.abs(diff) > 60) moveMonth(diff < 0 ? 1 : -1);
      startX = null;
    };
  }

  function handleAction(action, el) {
    switch (action) {
      case 'edit-plan':
        state.drawer = { type: 'event', id: state.currentPlanId }; break;
      case 'open-event':
        state.drawer = { type: 'event', id: el.dataset.id }; break;
      case 'add-event':
        state.drawer = { type: 'event', date: el.dataset.date || state.selectedDate }; break;
      case 'delete-event':
        state.events = state.events.filter(e => e.id !== el.dataset.id);
        if (state.currentPlanId === el.dataset.id) state.currentPlanId = state.events.find(e => e.type === 'camp')?.id || state.events[0]?.id || '';
        state.drawer = null; setToast('予定を削除'); break;
      case 'close-drawer':
        state.drawer = null; break;
      case 'month-prev':
        moveMonth(-1); return;
      case 'month-next':
        moveMonth(1); return;
      case 'add-meal':
        state.drawer = { type: 'meal' }; break;
      case 'edit-meal':
        state.drawer = { type: 'meal', id: el.dataset.id }; break;
      case 'generate-shopping':
        generateShopping(); return;
      case 'add-shopping':
        addShopping(); return;
      case 'toggle-shopping':
        toggleShopping(el.dataset.id); return;
      case 'copy-shopping':
        copyShopping(); return;
      case 'toggle-weather':
        state.weather = state.weather.map(w => w.id === el.dataset.id ? { ...w, done: !w.done } : w); setToast('天気確認を更新'); break;
      case 'add-gear':
        state.drawer = { type: 'gear' }; break;
      case 'edit-gear':
        state.drawer = { type: 'gear', id: el.dataset.id }; break;
      case 'add-box':
        state.drawer = { type: 'box' }; break;
      case 'edit-box':
        state.drawer = { type: 'box', id: el.dataset.id }; break;
      case 'toggle-box-load':
        toggleBoxLoad(el.dataset.id); return;
      case 'import-file':
        backupInput.click(); return;
      case 'backup':
        exportBackup(); return;
      case 'restore':
        backupInput.click(); return;
      case 'quick-note':
        state.drawer = { type: 'note' }; break;
      case 'open-record':
        state.drawer = { type: 'note' }; break;
      case 'toggle-walk':
        toggleWalk(); return;
      case 'walk-gps':
        captureGPS(); return;
      case 'walk-spot':
        addWalkSpot(); return;
      case 'walk-friend':
        addWalkFriend(); return;
      case 'open-map':
        openMap(); return;
      case 'health-note':
        addHealthNote(el.dataset.type); return;
    }
    save(); render();
  }

  function handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const type = form.dataset.form;
    const id = form.dataset.id;
    const data = Object.fromEntries(new FormData(form).entries());

    if (type === 'event') {
      const item = {
        id: id || uid('evt'),
        title: data.title,
        type: data.type,
        start: data.start || '',
        end: data.end || data.start || '',
        repeat: data.repeat,
        place: data.place,
        memo: data.memo,
        level: 1
      };
      if (id) state.events = state.events.map(e => e.id === id ? item : e);
      else state.events = [...state.events, item];
      if (item.type === 'camp') state.currentPlanId = item.id;
      state.drawer = null;
      setToast('予定を保存');
    }

    if (type === 'meal') {
      const item = {
        id: id || uid('meal'),
        name: data.name,
        slot: data.slot,
        ingredients: data.ingredients.split('\n').map(s => s.trim()).filter(Boolean),
        gear: data.gear.split('\n').map(s => s.trim()).filter(Boolean),
        note: data.note
      };
      if (id) state.meals = state.meals.map(m => m.id === id ? item : m);
      else state.meals = [...state.meals, item];
      state.drawer = null;
      setToast('料理を保存');
    }

    if (type === 'gear') {
      const item = {
        id: id || uid('gear'),
        name: data.name,
        cat: data.cat,
        qty: Number(data.qty) || 1,
        boxId: data.boxId,
        car: data.car,
        status: data.status,
        note: data.note,
        last: todayISO()
      };
      if (id) state.gear = state.gear.map(g => g.id === id ? item : g);
      else state.gear = [...state.gear, item];
      state.drawer = null;
      setToast('ギアを保存');
    }

    if (type === 'box') {
      const item = { id: id || uid('box'), name: data.name, kind: data.kind, home: data.home, car: data.car, role: data.role };
      if (id) state.boxes = state.boxes.map(b => b.id === id ? item : b);
      else state.boxes = [...state.boxes, item];
      state.drawer = null;
      setToast('BOXを保存');
    }

    if (type === 'note') {
      state.notes = [...state.notes, { id: uid('note'), title: data.title, text: data.text, private: data.private === 'on' }];
      state.drawer = null;
      setToast('メモを保存');
    }

    save(); render();
  }

  function moveMonth(delta) {
    const [year, month] = state.currentMonth.split('-').map(Number);
    const d = new Date(year, month - 1 + delta, 1);
    state.currentMonth = monthKey(d);
    state.selectedDate = toISO(d);
    save(); render();
  }

  function generateShopping() {
    const existing = new Set(state.shopping.map(i => i.name));
    state.meals.forEach(meal => {
      meal.ingredients.forEach(ing => {
        if (!existing.has(ing)) {
          state.shopping.push({ id: uid('shop'), name: ing, qty: '要確認', group: '食材', done: false, source: meal.name });
          existing.add(ing);
        }
      });
    });
    save(); render(); setToast('献立から買い物へ反映');
  }

  function addShopping() {
    const name = prompt('買い物名');
    if (!name) return;
    const qty = prompt('数量', '1') || '1';
    state.shopping.push({ id: uid('shop'), name, qty, group: '手入力', done: false, source: '手入力' });
    save(); render();
  }

  function toggleShopping(id) {
    state.shopping = state.shopping.map(i => i.id === id ? { ...i, done: !i.done } : i);
    save(); render();
  }

  async function copyShopping() {
    const text = state.shopping.map(i => `${i.done ? '☑' : '□'} ${i.name}：${i.qty}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setToast('買い物リストをコピー');
    } catch (e) {
      prompt('コピーしてください', text);
    }
  }

  function toggleBoxLoad(boxId) {
    const targets = state.gear.filter(g => g.boxId === boxId);
    const allLoaded = targets.length && targets.every(g => g.status === 'loaded');
    state.gear = state.gear.map(g => g.boxId === boxId ? { ...g, status: allLoaded ? 'home' : 'loaded' } : g);
    save(); render();
  }

  function toggleWalk() {
    state.walk.active = !state.walk.active;
    state.walk.mode = state.walkMode;
    save(); render();
    setToast(state.walk.active ? '散歩を開始' : '散歩を終了');
  }

  function captureGPS() {
    const pushPoint = (lat, lng) => {
      state.walk.track.push({ lat, lng, time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) });
      save(); render();
      setToast('現在地を記録');
    };
    if (!navigator.geolocation) {
      pushPoint(35.867 + Math.random() / 1000, 139.975 + Math.random() / 1000);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => pushPoint(pos.coords.latitude, pos.coords.longitude),
      () => pushPoint(35.867 + Math.random() / 1000, 139.975 + Math.random() / 1000),
      { enableHighAccuracy: true, timeout: 4000 }
    );
  }

  function addWalkSpot() {
    const name = prompt('スポット名');
    if (!name) return;
    state.walk.spots.push({ id: uid('spot'), name, time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) });
    save(); render();
  }

  function addWalkFriend() {
    const name = prompt('犬友達名');
    if (!name) return;
    state.walk.friends.push({ id: uid('wf'), name, time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) });
    save(); render();
  }

  function addHealthNote(type) {
    state.walk.health.push({ type, mode: state.walkMode === 'camp' ? 'キャンプ場散歩' : '通常散歩', time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) });
    save(); render();
    setToast('非公開体調メモへ保存');
  }

  function openMap() {
    const point = state.walk.track[state.walk.track.length - 1];
    if (!point) {
      setToast('先に現在地を記録');
      return;
    }
    window.open(`https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}`, '_blank');
  }

  function drawWalkMap() {
    const canvas = document.getElementById('walkMap');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(31,33,29,.08)';
    for (let x = 0; x < w; x += 30) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
    for (let y = 0; y < h; y += 30) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
    const pts = state.walk.track;
    if (!pts.length) return;
    const lats = pts.map(p => p.lat), lngs = pts.map(p => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const spanLat = (maxLat - minLat) || .001;
    const spanLng = (maxLng - minLng) || .001;
    const mapped = pts.map(p => ({
      x: 24 + ((p.lng - minLng) / spanLng) * (w - 48),
      y: h - 24 - ((p.lat - minLat) / spanLat) * (h - 48)
    }));
    ctx.strokeStyle = '#31463a'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); mapped.forEach((p,i) => i ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y)); ctx.stroke();
    mapped.forEach((p,i) => {
      ctx.fillStyle = i === mapped.length - 1 ? '#1f211d' : '#887056';
      ctx.beginPath(); ctx.arc(p.x,p.y, i === mapped.length - 1 ? 5.2 : 4, 0, Math.PI*2); ctx.fill();
    });
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify({ version: VERSION, state }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `outbase_redesign_backup_${todayISO()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  backupInput.onchange = async () => {
    const file = backupInput.files && backupInput.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      if (file.name.endsWith('.json')) {
        const parsed = JSON.parse(text);
        if (parsed.state) {
          state = Object.assign(seed(), parsed.state);
          save(); render(); setToast('復元した');
        }
      } else {
        state.notes.push({ id: uid('note'), title: '取込候補', text: file.name, private: false });
        save(); render(); setToast('取込候補として保存');
      }
    } catch (e) {
      setToast('読み込み失敗');
    }
    backupInput.value = '';
  };

  render();
})();
