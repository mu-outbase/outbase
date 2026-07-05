(() => {
  const STORAGE_KEY = 'outbase_restart_v1_state';
  const app = document.getElementById('app');

  const defaultState = {
    screen: 'home',
    activeTab: '予定',
    toast: '',
    walk: null,
    trip: {
      place: 'スノーピーク赤城山キャンプフィールド',
      dates: '次回予定',
      party: '夫婦＋コタ',
      checkin: '13:00',
      checkout: '11:00',
      weather: '雨と風を確認',
      route: '柏から出発予定',
      prepPercent: 62,
      memo: '準備・当日・記録・思い出をこの予定にまとめます。'
    },
    prep: [
      { key: '買い物', note: '料理から必要なものを確認します', status: '未完了' },
      { key: '料理', note: '日程・人数・量を見ながら決めます', status: '仮決定' },
      { key: 'ギア', note: '持つもの、使った結果、乾燥まで残します', status: '確認中' },
      { key: 'コタ', note: 'フード・水・暑さ寒さ対策を確認します', status: '未確認' },
      { key: '天気', note: '雨・風・気温を当日運転席に反映します', status: '要確認' },
      { key: 'ルート', note: '出発・経由地・買い出し・帰路を確認します', status: '確認済み' }
    ],
    shopping: [
      { name: 'ブラックタイガーまたは代替のエビ', group: '食材', detail: '2人なら200〜300g目安。売っていなければ冷凍エビ候補。', state: '未購入' },
      { name: 'ピザ用チーズ', group: '食材', detail: '量は控えめ。ブラータは食べ過ぎ注意。', state: '未購入' },
      { name: 'にんにく', group: '調味料', detail: 'ガーリックシュリンプ用。チューブでも代替可。', state: '未購入' },
      { name: 'オリーブオイル / バター / レモン', group: '調味料', detail: '家にあるものは買わない。', state: '未購入' },
      { name: 'バゲット', group: '今回は買わないもの', detail: '夜の量が多い時は無しでよい。', state: '今回は買わない' }
    ],
    meals: [
      { slot: '1日目 昼', menu: '移動中または軽め', caution: '設営前に重くしない' },
      { slot: '1日目 夜', menu: 'ピザ / ガーリックシュリンプ', caution: '量が多すぎないか確認' },
      { slot: '2日目 朝', menu: 'ホットサンド', caution: '撤収時間に合わせて軽く' },
      { slot: '2日目 昼', menu: 'なし / 帰路で調整', caution: '食べ過ぎ防止' }
    ],
    daySteps: [
      { title: '出発前', note: '忘れ物・コタ用品・天気を確認', state: '次' },
      { title: '往路', note: '運転中は操作しない。停車中に記録。', state: '待ち' },
      { title: '買い出し / 給油', note: '買い物リストとルートに紐づけ', state: '待ち' },
      { title: '到着 / 受付', note: 'チェックイン・サイト番号を残す', state: '待ち' },
      { title: 'サイト確認', note: '地面・風・トイレ距離・コタ向きを記録', state: '待ち' },
      { title: '設営', note: '手順・写真・声メモを残す', state: '待ち' },
      { title: '料理', note: '味・量・余り・失敗を当日中に残す', state: '待ち' },
      { title: 'コタ散歩', note: 'タイミングと様子を残す', state: '待ち' },
      { title: 'キャンプ場散歩', note: '場内地図・場所カードへ', state: '待ち' },
      { title: '撤収', note: '濡れ物・乾燥・忘れ物を確認', state: '待ち' },
      { title: '帰路', note: '寄り道・帰宅時間・片付けへ', state: '待ち' }
    ],
    inbox: [],
    memories: [],
    improvements: []
  };

  let state = loadState();
  let saveTimer = null;

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(defaultState);
      const parsed = JSON.parse(raw);
      return mergeState(structuredClone(defaultState), parsed);
    } catch (error) {
      return structuredClone(defaultState);
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
    return base;
  }

  function saveState() {
    clearTimeout(saveTimer);
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
        <div class="brand">
          <div class="logo">OB</div>
          <div>
            <div class="brand-title">OUTBASE</div>
            <div class="brand-sub">${escapeHtml(subtitle)}</div>
          </div>
        </div>
        <span class="pill">${state.inbox.length}件 あとで整理</span>
      </header>
      ${content}
      ${bottomNav()}
      ${state.toast ? `<div class="toast">${escapeHtml(state.toast)}</div>` : ''}
    `;
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
    const attrs = Object.entries(props).map(([k, v]) => `data-${k}="${escapeHtml(v)}"`).join(' ');
    return `<button class="btn ${type}" data-action="${action}" ${attrs}>${escapeHtml(label)}</button>`;
  }

  function renderHome() {
    const trip = state.trip;
    const content = `
      <section class="hero">
        <h1>今日は何する？</h1>
        <p>次のキャンプ、コタとの散歩、今残したい記録をここから始めます。</p>
      </section>
      <main class="stack">
        ${card('次のキャンプ', '予定', `
          <p class="card-text"><strong>${escapeHtml(trip.place)}</strong><br>${escapeHtml(trip.dates)} / <span class="kota-chip">${escapeHtml(trip.party)}</span></p>
          <div class="metric-row">
            <div class="metric"><small>準備</small><strong>${trip.prepPercent}%</strong></div>
            <div class="metric"><small>天気</small><strong>${escapeHtml(trip.weather)}</strong></div>
            <div class="metric"><small>ルート</small><strong>${escapeHtml(trip.route)}</strong></div>
            <div class="metric"><small>次にやること</small><strong>買い物とコタ用品</strong></div>
          </div>
          <div class="progress"><span style="width:${Number(trip.prepPercent) || 0}%"></span></div>
        `, `${btn('準備する', 'go', { screen: 'prep', tab: '準備' })}${btn('当日運転席', 'go', { screen: 'cockpit', tab: '予定' }, 'ghost')}${btn('予定詳細', 'go', { screen: 'plan', tab: '予定' }, 'ghost')}`)}

        ${card('コタと散歩', '散歩', `
          <p class="card-text">自宅散歩とキャンプ場散歩を分けて残します。地図・写真・声メモ・GPSはあとで整理できます。</p>
        `, `${btn('自宅散歩を始める', 'go', { screen: 'homeWalk', tab: '予定' })}${btn('キャンプ場散歩', 'go', { screen: 'campWalk', tab: '予定' }, 'ghost')}`)}

        ${card('キャンプ場を探す', '探す', `
          <p class="card-text">犬可・温水・景色・距離・コタ向きで候補を残します。候補は予定と準備につなげます。</p>
        `, `${btn('候補を見る', 'go', { screen: 'search', tab: '探す' })}${btn('今すぐ記録', 'go', { screen: 'capture', tab: '＋' }, 'ghost')}`)}

        ${card('未整理があります', 'あとで整理', `
          <p class="card-text">写真 ${state.inbox.filter((r) => r.type === '写真').length}件 / 声メモ ${state.inbox.filter((r) => r.type === '声').length}件 / 保存先候補 ${state.inbox.length}件</p>
        `, `${btn('あとで整理する', 'go', { screen: 'inbox', tab: '思い出' }, state.inbox.length ? 'warn' : 'ghost')}`)}
      </main>
    `;
    app.innerHTML = layout(content);
  }

  function renderPlan() {
    const trip = state.trip;
    const body = `
      <section class="hero">
        <h1>次のキャンプ</h1>
        <p>${escapeHtml(trip.memo)}</p>
      </section>
      <main class="stack">
        ${card(trip.place, '予定詳細', `
          <div class="metric-row">
            <div class="metric"><small>日程</small><strong>${escapeHtml(trip.dates)}</strong></div>
            <div class="metric"><small>同行</small><strong>${escapeHtml(trip.party)}</strong></div>
            <div class="metric"><small>チェックイン</small><strong>${escapeHtml(trip.checkin)}</strong></div>
            <div class="metric"><small>チェックアウト</small><strong>${escapeHtml(trip.checkout)}</strong></div>
            <div class="metric"><small>天気</small><strong>${escapeHtml(trip.weather)}</strong></div>
            <div class="metric"><small>ルート</small><strong>${escapeHtml(trip.route)}</strong></div>
          </div>
        `, `${btn('準備する', 'go', { screen: 'prep', tab: '準備' })}${btn('当日運転席', 'go', { screen: 'cockpit', tab: '予定' }, 'ghost')}${btn('思い出を見る', 'go', { screen: 'memories', tab: '思い出' }, 'ghost')}`)}
        ${card('準備状況', 'つながり', `
          <div class="list">
            ${state.prep.map((item) => `
              <div class="item">
                <div class="item-main"><div class="item-title">${escapeHtml(item.key)}</div><div class="item-sub">${escapeHtml(item.note)}</div></div>
                <span class="tag ${item.status === '確認済み' ? '' : 'light'}">${escapeHtml(item.status)}</span>
              </div>
            `).join('')}
          </div>
        `)}
      </main>`;
    app.innerHTML = layout(body);
  }

  function renderSearch() {
    const conditions = ['犬可', 'ドッグフリー', '温水', '景色', '距離', '料金', '季節', '天気', 'コタ向き'];
    const body = `
      <section class="hero">
        <h1>キャンプ場を探す</h1>
        <p>候補は、予定・準備・ルート・思い出へつなげます。</p>
      </section>
      <main class="stack">
        ${card('探す条件', '候補づくり', `
          <div class="grid-2">
            ${conditions.map((text) => `<button class="btn ghost" data-action="toast" data-message="${escapeHtml(text)}を候補条件に残しました">${escapeHtml(text)}</button>`).join('')}
          </div>
        `)}
        ${card('候補カード', '次につなぐ', `
          <p class="card-text">行きたい理由だけでなく、行かない理由も残します。次の予定にする時は、準備・ルート・天気までつなげます。</p>
        `, `${btn('候補にする', 'toast', { message: '候補に残しました' })}${btn('予定にする', 'toast', { message: '次のキャンプ候補にしました' }, 'ghost')}${btn('行かない理由を残す', 'addRecord', { type: 'メモ', target: '候補', text: '行かない理由メモ' }, 'ghost')}`)}
      </main>`;
    app.innerHTML = layout(body);
  }

  function renderPrep() {
    const body = `
      <section class="hero">
        <h1>準備</h1>
        <p>${escapeHtml(state.trip.place)} の準備を、買い物・料理・ギア・コタ・天気・ルートでつなげます。</p>
      </section>
      <main class="stack">
        ${card('今日やること', '準備する', `
          <div class="list">
            <div class="item"><div class="item-main"><div class="item-title">買い物リストを確認</div><div class="item-sub">料理から必要なものを反映します</div></div><span class="tag light">未完了</span></div>
            <div class="item"><div class="item-main"><div class="item-title">コタ用品を確認</div><div class="item-sub">フード・水・暑さ寒さ対策</div></div><span class="tag light">未確認</span></div>
            <div class="item"><div class="item-main"><div class="item-title">雨と風の対策</div><div class="item-sub">ギア・設営・撤収に反映</div></div><span class="tag warn">注意</span></div>
          </div>
        `)}
        ${card('準備メニュー', '予定に紐づく', `
          <div class="list">
            ${state.prep.map((item) => `
              <button class="item" data-action="openPrepItem" data-key="${escapeHtml(item.key)}">
                <div class="item-main"><div class="item-title">${escapeHtml(item.key)}</div><div class="item-sub">${escapeHtml(item.note)}</div></div>
                <span class="tag ${item.status === '確認済み' ? '' : 'light'}">${escapeHtml(item.status)}</span>
              </button>
            `).join('')}
          </div>
        `, `${btn('当日運転席へ', 'go', { screen: 'cockpit', tab: '予定' }, 'primary')}`)}
      </main>`;
    app.innerHTML = layout(body);
  }

  function renderShopping() {
    const groups = ['食材', '調味料', '今回は買わないもの'];
    const body = `
      <section class="hero">
        <h1>買い物</h1>
        <p>料理計画から反映されています。売っていない時の代替と、買わないものも残します。</p>
      </section>
      <main class="stack">
        ${groups.map((group) => card(group, '買い忘れ防止', `
          <div class="list">
            ${state.shopping.filter((item) => item.group === group).map((item, index) => `
              <div class="item">
                <div class="item-main"><div class="item-title">${escapeHtml(item.name)}</div><div class="item-sub">${escapeHtml(item.detail)}</div></div>
                <button class="tag ${item.state === '未購入' ? 'light' : ''}" data-action="toggleShopping" data-name="${escapeHtml(item.name)}">${escapeHtml(item.state)}</button>
              </div>
            `).join('') || '<div class="empty">ここに追加した買い物が入ります。</div>'}
          </div>
        `)).join('')}
        ${card('LINE用コピー', 'そのまま貼れる', `<p class="card-text">食材・調味料・あったら良いもの・買わないものを分けてコピーします。</p>`, `${btn('LINE用にコピー', 'copyShopping', {}, 'primary')}${btn('料理に戻る', 'go', { screen: 'cooking', tab: '準備' }, 'ghost')}`)}
      </main>`;
    app.innerHTML = layout(body);
  }

  function renderCooking() {
    const body = `
      <section class="hero">
        <h1>料理計画</h1>
        <p>日程・人数・量・設営時間を見ながら、買い物と調理ギアへ反映します。</p>
      </section>
      <main class="stack">
        ${card('食べる流れ', '量を見ながら決める', `
          <div class="list">
            ${state.meals.map((meal) => `
              <div class="item">
                <div class="item-main"><div class="item-title">${escapeHtml(meal.slot)}：${escapeHtml(meal.menu)}</div><div class="item-sub">${escapeHtml(meal.caution)}</div></div>
                <span class="tag light">料理</span>
              </div>
            `).join('')}
          </div>
        `, `${btn('買い物に反映', 'go', { screen: 'shopping', tab: '準備' })}${btn('当日料理に送る', 'go', { screen: 'cockpit', tab: '予定' }, 'ghost')}`)}
        ${card('当日後に聞くこと', '次回改善へ', `
          <div class="list">
            ${['量はどうだった？', '味はどうだった？', '余った？', '次回も作る？', '次回は減らす？'].map((text) => `<button class="item" data-action="addImprovement" data-text="${escapeHtml(text)}"><div class="item-main"><div class="item-title">${escapeHtml(text)}</div><div class="item-sub">思い出から次回改善へ送ります</div></div><span class="tag light">追加</span></button>`).join('')}
          </div>
        `)}
      </main>`;
    app.innerHTML = layout(body);
  }

  function renderCockpit() {
    const body = `
      <section class="hero">
        <h1>当日運転席</h1>
        <p>次にやることを見ながら、写真・声メモ・メモを残します。運転中は操作しないでください。</p>
      </section>
      <main class="stack">
        ${card('次にやること', '当日の流れ', `
          <div class="timeline">
            ${state.daySteps.map((step, index) => `
              <div class="step">
                <div class="dot ${index === 0 ? 'pending' : ''}">${index + 1}</div>
                <div>
                  <div class="item-title">${escapeHtml(step.title)}</div>
                  <div class="item-sub">${escapeHtml(step.note)}</div>
                  <div class="actions">
                    ${btn('開始', 'addRecord', { type: 'メモ', target: step.title, text: `${step.title}を開始` }, 'ghost')}
                    ${btn('写真', 'addRecord', { type: '写真', target: step.title, text: `${step.title}の写真` }, 'ghost')}
                    ${btn('声メモ', 'addRecord', { type: '声', target: step.title, text: `${step.title}の声メモ` }, 'ghost')}
                    ${btn('メモ', 'addRecord', { type: 'メモ', target: step.title, text: `${step.title}のメモ` }, 'ghost')}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        `)}
      </main>`;
    app.innerHTML = layout(body);
  }

  function renderWalk(kind) {
    const isCamp = kind === 'camp';
    const title = isCamp ? 'キャンプ場散歩' : '自宅散歩';
    const subtitle = isCamp ? `${state.trip.place} の滞在記録に残します` : 'コタとの散歩を記録します';
    const places = isCamp ? ['サイト周辺', 'トイレ', '炊事場', '売店', '景色', 'ドッグラン', '危険箇所', 'コタ向き'] : ['いつもの道', 'コタの様子', '場所メモ', '次回散歩メモ'];
    const body = `
      <section class="hero">
        <h1>${title}</h1>
        <p>${escapeHtml(subtitle)}</p>
      </section>
      <main class="stack">
        ${card('地図', isCamp ? 'キャンプ滞在に紐づく' : '自宅散歩履歴へ', `
          <div class="map-box" aria-label="地図の表示領域"></div>
          <div class="metric-row">
            <div class="metric"><small>距離</small><strong>${state.walk?.kind === kind ? state.walk.distance : '0.0'}km</strong></div>
            <div class="metric"><small>時間</small><strong>${state.walk?.kind === kind ? state.walk.time : '00:00'}</strong></div>
            <div class="metric"><small>コタ</small><strong>通常</strong></div>
          </div>
        `, `${btn('散歩開始', 'startWalk', { kind }, 'primary')}${btn('写真', 'addRecord', { type: '写真', target: title, text: `${title}の写真` }, 'ghost')}${btn('声メモ', 'addRecord', { type: '声', target: title, text: `${title}の声メモ` }, 'ghost')}${btn('終了', 'endWalk', { kind }, 'warn')}`)}
        ${card(isCamp ? '場内メモ' : '残すこと', '場所カード', `
          <div class="grid-2">
            ${places.map((place) => `<button class="btn ghost" data-action="addRecord" data-type="メモ" data-target="${escapeHtml(title)}" data-text="${escapeHtml(place)}">${escapeHtml(place)}</button>`).join('')}
          </div>
        `)}
      </main>`;
    app.innerHTML = layout(body);
  }

  function renderCapture() {
    const body = `
      <section class="hero">
        <h1>今これを残す</h1>
        <p>写真・動画・声・メモ・GPSを残します。保存先は候補だけ出し、確定はムーが決めます。</p>
      </section>
      <main class="stack">
        ${card('記録する', 'その場で残す', `
          <div class="grid-2">
            ${['写真', '動画', '声', 'メモ', 'GPS', 'あとで整理'].map((type) => `<button class="btn ${type === 'あとで整理' ? 'warn' : 'primary'}" data-action="addRecord" data-type="${type}" data-target="未確認箱" data-text="${type}を残しました">${type}</button>`).join('')}
          </div>
          <div class="field">
            <label for="quickMemo">手入力メモ</label>
            <textarea id="quickMemo" placeholder="例：風が強い、設営に時間がかかった、コタが歩きやすそう"></textarea>
          </div>
        `, `${btn('メモを未確認箱へ', 'saveQuickMemo', {}, 'primary')}`)}
        ${card('保存先候補', 'AIとGPSは候補だけ', `
          <div class="list">
            ${['キャンプ滞在', '設営', '料理', 'コタ散歩', 'キャンプ場散歩', '未確認箱'].map((target) => `<button class="item" data-action="addRecord" data-type="メモ" data-target="${escapeHtml(target)}" data-text="${escapeHtml(target)}に残すメモ"><div class="item-main"><div class="item-title">${escapeHtml(target)}</div><div class="item-sub">ここに保存する候補として残します</div></div><span class="tag light">候補</span></button>`).join('')}
          </div>
        `)}
      </main>`;
    app.innerHTML = layout(body);
  }

  function renderMemories() {
    const body = `
      <section class="hero">
        <h1>思い出</h1>
        <p>アルバムで終わらせず、次回改善に戻します。</p>
      </section>
      <main class="stack">
        ${card(state.trip.place, '時系列', `
          ${state.memories.length ? `<div class="list">${state.memories.map((record, index) => memoryItem(record, index)).join('')}</div>` : '<div class="empty">まだ思い出に確定した記録はありません。未確認箱から移すとここに並びます。</div>'}
        `, `${btn('未確認を片付ける', 'go', { screen: 'inbox', tab: '思い出' }, state.inbox.length ? 'warn' : 'ghost')}${btn('次回改善へ', 'go', { screen: 'improvements', tab: '思い出' }, 'ghost')}`)}
        ${card('振り返り', '次に活かす', `
          <div class="grid-2">
            ${['良かったこと', '失敗したこと', '忘れ物', '料理の量', 'ギア使用結果', 'コタの様子', '天気と撤収', '場所カード'].map((text) => `<button class="btn ghost" data-action="addImprovement" data-text="${escapeHtml(text)}を振り返る">${escapeHtml(text)}</button>`).join('')}
          </div>
        `)}
      </main>`;
    app.innerHTML = layout(body);
  }

  function memoryItem(record, index) {
    return `
      <div class="item">
        <div class="item-main">
          <div class="item-title">${escapeHtml(record.type)} / ${escapeHtml(record.target)}</div>
          <div class="item-sub">${escapeHtml(record.text)} · ${escapeHtml(record.time)}</div>
        </div>
        <button class="tag light" data-action="improveFromMemory" data-index="${index}">改善へ</button>
      </div>
    `;
  }

  function renderImprovements() {
    const body = `
      <section class="hero">
        <h1>次回改善</h1>
        <p>この記録を、次の準備に戻します。</p>
      </section>
      <main class="stack">
        ${card('改善候補', '準備へ反映', `
          ${state.improvements.length ? `<div class="list">${state.improvements.map((item, index) => `
            <div class="item">
              <div class="item-main"><div class="item-title">${escapeHtml(item.text)}</div><div class="item-sub">反映先：${escapeHtml(item.target || '次の準備')}</div></div>
              <button class="tag ${item.done ? '' : 'light'}" data-action="reflectImprovement" data-index="${index}">${item.done ? '反映済み' : '反映'}</button>
            </div>
          `).join('')}</div>` : '<div class="empty">思い出から次回改善に送るとここに並びます。</div>'}
        `)}
        ${card('反映先', '戻す場所', `
          <div class="grid-2">
            ${['買い物', '料理', 'ギア', 'コタ', '天気', 'ルート', '探す', '次の予定'].map((text) => `<button class="btn ghost" data-action="addImprovement" data-text="${escapeHtml(text)}に反映する改善" data-target="${escapeHtml(text)}">${escapeHtml(text)}</button>`).join('')}
          </div>
        `)}
      </main>`;
    app.innerHTML = layout(body);
  }

  function renderInbox() {
    const body = `
      <section class="hero">
        <h1>未確認箱</h1>
        <p>保存先がまだ確定していない記録です。勝手に削除せず、移動・修正・復旧できます。</p>
      </section>
      <main class="stack">
        ${card('あとで整理', '復旧できる', `
          ${state.inbox.length ? `<div class="list">${state.inbox.map((record, index) => `
            <div class="item">
              <div class="item-main"><div class="item-title">${escapeHtml(record.type)} / 候補：${escapeHtml(record.target)}</div><div class="item-sub">${escapeHtml(record.text)} · ${escapeHtml(record.time)}</div></div>
              <div class="actions">
                <button class="btn primary" data-action="confirmRecord" data-index="${index}">確定</button>
                <button class="btn ghost" data-action="moveRecord" data-index="${index}">移動</button>
                <button class="btn ghost" data-action="deleteCandidate" data-index="${index}">削除候補</button>
              </div>
            </div>
          `).join('')}</div>` : '<div class="empty">未確認の記録はありません。＋から残したものがここに入ります。</div>'}
        `)}
      </main>`;
    app.innerHTML = layout(body);
  }

  function addRecord(type, target, text) {
    const record = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      type,
      target,
      text,
      time: new Date().toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      status: '未確認'
    };
    state.inbox.unshift(record);
    saveState();
    showToast('未確認箱に残しました');
  }

  function copyShopping() {
    const lines = ['買い物リスト', '', '■食材'];
    state.shopping.filter((item) => item.group === '食材').forEach((item) => lines.push(`・${item.name}`));
    lines.push('', '■調味料');
    state.shopping.filter((item) => item.group === '調味料').forEach((item) => lines.push(`・${item.name}`));
    lines.push('', '■今回は買わない');
    state.shopping.filter((item) => item.group === '今回は買わないもの').forEach((item) => lines.push(`・${item.name}`));
    const text = lines.join('\n');
    navigator.clipboard?.writeText(text).then(() => showToast('LINE用にコピーしました')).catch(() => showToast('コピー文を作りました'));
  }

  function currentQuickMemo() {
    const input = document.getElementById('quickMemo');
    return input?.value?.trim() || 'あとで整理するメモ';
  }

  function render() {
    switch (state.screen) {
      case 'plan': renderPlan(); break;
      case 'search': renderSearch(); break;
      case 'prep': renderPrep(); break;
      case 'shopping': renderShopping(); break;
      case 'cooking': renderCooking(); break;
      case 'cockpit': renderCockpit(); break;
      case 'homeWalk': renderWalk('home'); break;
      case 'campWalk': renderWalk('camp'); break;
      case 'capture': renderCapture(); break;
      case 'memories': renderMemories(); break;
      case 'improvements': renderImprovements(); break;
      case 'inbox': renderInbox(); break;
      default: renderHome(); break;
    }
  }

  app.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;

    if (action === 'go') {
      setScreen(button.dataset.screen, button.dataset.tab || null);
      return;
    }

    if (action === 'toast') {
      showToast(button.dataset.message || '残しました');
      return;
    }

    if (action === 'openPrepItem') {
      const key = button.dataset.key;
      if (key === '買い物') setScreen('shopping', '準備');
      else if (key === '料理') setScreen('cooking', '準備');
      else if (key === 'ルート' || key === '天気') setScreen('cockpit', '予定');
      else showToast(`${key}を確認しました`);
      return;
    }

    if (action === 'toggleShopping') {
      const item = state.shopping.find((entry) => entry.name === button.dataset.name);
      if (item) item.state = item.state === '買った' ? '未購入' : '買った';
      saveState();
      renderShopping();
      showToast('買い物を更新しました');
      return;
    }

    if (action === 'copyShopping') {
      copyShopping();
      return;
    }

    if (action === 'addRecord') {
      addRecord(button.dataset.type || 'メモ', button.dataset.target || '未確認箱', button.dataset.text || '記録');
      return;
    }

    if (action === 'saveQuickMemo') {
      addRecord('メモ', '未確認箱', currentQuickMemo());
      return;
    }

    if (action === 'startWalk') {
      state.walk = { kind: button.dataset.kind, distance: '0.0', time: '00:00', startedAt: Date.now() };
      saveState();
      showToast('散歩を開始しました');
      return;
    }

    if (action === 'endWalk') {
      const target = button.dataset.kind === 'camp' ? 'キャンプ場散歩' : '自宅散歩';
      addRecord('メモ', target, `${target}を終了`);
      state.walk = null;
      saveState();
      return;
    }

    if (action === 'confirmRecord') {
      const index = Number(button.dataset.index);
      const [record] = state.inbox.splice(index, 1);
      if (record) {
        record.status = '確定';
        state.memories.unshift(record);
        saveState();
        renderInbox();
        showToast('思い出に移しました');
      }
      return;
    }

    if (action === 'moveRecord') {
      const index = Number(button.dataset.index);
      const record = state.inbox[index];
      if (record) {
        record.target = record.target === '未確認箱' ? state.trip.place : '未確認箱';
        saveState();
        renderInbox();
        showToast('保存先候補を変更しました');
      }
      return;
    }

    if (action === 'deleteCandidate') {
      const index = Number(button.dataset.index);
      const record = state.inbox[index];
      if (record) {
        record.status = '削除候補';
        saveState();
        renderInbox();
        showToast('削除候補にしました。まだ戻せます');
      }
      return;
    }

    if (action === 'addImprovement') {
      state.improvements.unshift({ text: button.dataset.text || '次回改善', target: button.dataset.target || '次の準備', done: false });
      saveState();
      showToast('次回改善に追加しました');
      return;
    }

    if (action === 'improveFromMemory') {
      const record = state.memories[Number(button.dataset.index)];
      if (record) {
        state.improvements.unshift({ text: `${record.target}：${record.text}`, target: '次の準備', done: false });
        saveState();
        showToast('次回改善に送りました');
      }
      return;
    }

    if (action === 'reflectImprovement') {
      const item = state.improvements[Number(button.dataset.index)];
      if (item) item.done = !item.done;
      saveState();
      renderImprovements();
      showToast(item?.done ? '次の準備へ反映しました' : '反映を戻しました');
    }
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').catch(() => undefined);
    });
  }

  render();
})();
