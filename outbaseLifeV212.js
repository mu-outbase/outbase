/* OUTBASE LifeOS v212: home/pages + single-screen guard */
(function () {
  'use strict';
  const V = '212';
  const ROOT = 'outbaseLifeOSV212';
  const STYLE = 'outbaseLifeOSV212Style';
  const RESULT = 'outbaseWalkResultPageV212';
  const WALK_PANEL = 'outbaseWalkPanelV212';
  const VIDEO_INPUT = 'walkVideoInputV212';
  const LIFE_PAGES = {
    record: 'outbaseRecordPageV212',
    calendar: 'outbaseCalendarPageV212',
    project: 'outbaseProjectPageV212',
    assets: 'outbaseAssetsPageV212'
  };
  let route = 'home';
  let enforcing = false;

  function $(id) { return document.getElementById(id); }
  function esc(v) {
    return String(v ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
  function now() { return new Date().toLocaleString(); }
  function isWalkActive() {
    try {
      return typeof currentSession !== 'undefined' && currentSession &&
        currentSession.type === 'walk' && currentSession.status === EVENT_STATUS.ACTIVE;
    } catch (e) { return false; }
  }
  function hasActiveOutbaseState() {
    try { return typeof hasActiveState === 'function' && hasActiveState(); }
    catch (e) { return false; }
  }
  function markReady() { document.body.classList.add('outbase-life-ready'); }
  function addStyle() {
    if ($(STYLE)) return;
    const s = document.createElement('style');
    s.id = STYLE;
    s.textContent = `
      :root{--obg:#1f6f3a;--obd:#123d25;--obs:#edf6ee;--obb:#fbfaf5;--obt:#243127;--obm:#6b766c;--obl:#e5ebe4;--obr:#c91f28;}
      body{background:#fbfaf5}.page{box-sizing:border-box}.life212-page,#homePage{background:linear-gradient(180deg,#f4f8f2 0%,#fbfaf5 100%);padding:14px 14px 104px}
      .life212-wrap{display:flex;flex-direction:column;gap:14px}.life212-card{background:#fff;border:1px solid rgba(31,111,58,.08);border-radius:24px;padding:16px;box-shadow:0 10px 24px rgba(20,81,45,.08);color:var(--obt)}
      .life212-hero{background:linear-gradient(135deg,#1f6f3a,#4f8f5b);color:#fff;min-height:128px;position:relative;overflow:hidden}.life212-hero:after{content:'';position:absolute;right:22px;top:18px;width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,.35)}
      .life212-kicker{font-size:12px;letter-spacing:.12em;opacity:.92}.life212-title{font-size:28px;font-weight:900;line-height:1.25;position:relative;z-index:1}.life212-sub{font-size:13px;line-height:1.55;margin-top:8px;opacity:.92;position:relative;z-index:1}
      .life212-grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.life212-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.life212-grid2{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
      .life212-btn,.walk212-btn,.result212-btn{border:1px solid var(--obl);background:#fff;color:var(--obd);border-radius:18px;font-weight:900;min-height:58px;padding:10px;font-size:15px}.life212-primary,.walk212-primary,.result212-primary{background:linear-gradient(180deg,var(--obg),var(--obd));color:#fff;border:0}
      .life212-btn span,.walk212-btn span{display:block;font-size:22px;margin-bottom:4px}.life212-mini{border:1px solid var(--obl);border-radius:18px;padding:12px;min-height:82px;background:#fff}.life212-label,.life212-note{font-size:12px;color:var(--obm);line-height:1.5}.life212-value{font-size:20px;font-weight:900;line-height:1.3}.life212-active{border-left:5px solid var(--obg)}
      .life212-nav{position:fixed;left:50%;transform:translateX(-50%);bottom:10px;width:min(680px,calc(100vw - 20px));display:grid;grid-template-columns:repeat(5,1fr);gap:2px;background:rgba(255,255,255,.96);border:1px solid rgba(31,111,58,.1);border-radius:22px;box-shadow:0 10px 22px rgba(20,81,45,.12);padding:8px;z-index:70}.life212-nav button{border:0;background:transparent;color:var(--obm);font-size:11px;font-weight:900;min-height:48px}.life212-nav button.is-active{color:var(--obd)}.life212-nav span{display:block;font-size:20px}
      #walkPage{background:linear-gradient(180deg,#f4f8f2 0%,#fbfaf5 100%);padding:14px 14px 26px!important}#walkPage .life212-nav{display:none!important}#walkPage>.card{border-radius:24px;box-shadow:0 10px 24px rgba(20,81,45,.08);border:1px solid rgba(31,111,58,.08)}#walkPage .timer{font-size:44px;font-weight:900;text-align:center}
      .walk212-hide{display:none!important}.walk212-card{display:flex;flex-direction:column;gap:12px}.walk212-head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.walk212-badge{font-size:12px;background:#edf6ee;color:var(--obd);border-radius:999px;padding:6px 10px;font-weight:900}.walk212-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.walk212-btn{min-height:76px}.walk212-end{background:linear-gradient(180deg,#d4242d,#a5161d);color:#fff;border:0;min-height:70px}.walk212-detail{border:1px solid var(--obl);border-radius:18px;padding:10px;background:#fff}.walk212-detail summary{font-weight:900;color:var(--obd)}.walk212-status{font-size:13px;color:var(--obm);line-height:1.5;min-height:20px}.walk212-home{border:0;background:transparent;color:var(--obm);font-weight:900;text-decoration:underline;text-align:center;min-height:36px}
      #${RESULT}{background:linear-gradient(180deg,#f4f8f2 0%,#fbfaf5 100%);padding:14px 14px 40px}.result212-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.result212-mini{border:1px solid var(--obl);border-radius:18px;padding:12px}.result212-label{font-size:12px;color:var(--obm)}.result212-value{font-size:21px;font-weight:900}.result212-actions{display:flex;flex-direction:column;gap:10px}
      @media(max-width:520px){.life212-title{font-size:24px}.life212-grid4{gap:7px}.life212-btn{font-size:12px;padding:8px 2px}.life212-btn span{font-size:20px}.life212-card{padding:15px}.walk212-grid{gap:8px}.walk212-btn{font-size:15px}}
    `;
    document.head.appendChild(s);
  }
  function ensure(id) {
    let p = $(id);
    if (p) return p;
    p = document.createElement('div');
    p.id = id;
    p.className = 'page hidden life212-page';
    document.body.insertBefore(p, document.body.querySelector('script') || null);
    return p;
  }
  function hideAll() { document.querySelectorAll('.page').forEach(p => p.classList.add('hidden')); }
  function showOnly(id) { hideAll(); const p = $(id); if (p) p.classList.remove('hidden'); }
  function enforceOnly(id) {
    if (enforcing) return;
    enforcing = true;
    try {
      document.querySelectorAll('.page').forEach(p => { if (p.id !== id) p.classList.add('hidden'); });
      const p = $(id); if (p) p.classList.remove('hidden');
    } finally { enforcing = false; }
  }
  function nav(active) {
    const items = [['home','🏠','ホーム'],['record','📝','記録'],['calendar','📅','予定'],['project','🗂️','PJ'],['assets','📁','素材']];
    return '<nav class="life212-nav">' + items.map(item => {
      const on = active === item[0] ? 'is-active' : '';
      return `<button class="${on}" onclick="showOutbaseLifePageV212('${item[0]}')"><span>${item[1]}</span>${item[2]}</button>`;
    }).join('') + '</nav>';
  }
  async function safeRecords() { try { return typeof getRecords === 'function' ? await getRecords() : []; } catch (e) { return []; } }
  async function safeStore(name) { try { return typeof getOutbaseStoreAll === 'function' ? await getOutbaseStoreAll(name) : []; } catch (e) { return []; } }
  async function buildHome() {
    const records = await safeRecords();
    const inbox = await safeStore('inbox_items');
    const latest = records.sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0))[0];
    const cnt = inbox.filter(x => !['linked','deleted','done'].includes(x.status)).length;
    const active = isWalkActive() || hasActiveOutbaseState();
    return `<div id="${ROOT}" class="life212-wrap">
      <section class="life212-card life212-hero"><div class="life212-kicker">OUTBASE LIFE OS</div><div class="life212-title">今日を整理して、<br>大事なことだけ知らせる。</div><div class="life212-sub">家族・ペット・予定・記録・素材・思い出をつなぐ入口。</div></section>
      ${active ? `<section class="life212-card life212-active"><div class="life212-value">🐕 コタ散歩が継続中</div><div class="life212-note">ホームでは確認だけ。記録操作は散歩モードへ戻って行います。</div><div style="height:10px"></div><button class="life212-btn life212-primary" onclick="returnToActiveWalkV212()">散歩へ戻る</button></section>` : ''}
      <section class="life212-card"><b>🌿 チャッピー：次回キャンプを確認できます</b><div class="life212-note">天気・買い物・ギア・当日メモをPJ側にまとめます。</div></section>
      <section class="life212-card"><b>すぐ使う</b><div class="life212-grid4" style="margin-top:10px"><button class="life212-btn" onclick="startWalk&&startWalk()"><span>🐕</span>コタ散歩</button><button class="life212-btn" onclick="showOutbaseLifePageV212('record')"><span>📝</span>記録</button><button class="life212-btn" onclick="showOutbaseLifePageV212('calendar')"><span>📅</span>予定</button><button class="life212-btn" onclick="showOutbaseLifePageV212('assets')"><span>📁</span>素材</button></div></section>
      <section class="life212-card"><b>提案・注意</b><div class="life212-grid3" style="margin-top:10px"><div class="life212-mini"><div class="life212-label">未整理</div><div class="life212-value">${cnt}件</div><div class="life212-note">多い時だけ整理提案</div></div><div class="life212-mini"><div class="life212-label">次回キャンプ</div><div class="life212-value">赤城山</div><div class="life212-note">準備はPJへ集約</div></div><div class="life212-mini"><div class="life212-label">直近</div><div class="life212-value">${esc(latest?.title || '記録なし')}</div><div class="life212-note">${esc(latest?.date || '')}</div></div></div></section>${nav('home')}</div>`;
  }
  function simplePage(key) {
    const defs = {
      record:['RECORD','写真・音声・メモを迷わず残す。','通常記録はここ。散歩中は散歩専用UIだけ使います。','＋ 記録入力を開く','showAssetCapturePage&&showAssetCapturePage()'],
      calendar:['CALENDAR','予定から準備と注意につなげる。','Googleカレンダー連携前提。今は骨格確認。','予定の骨格確認','return false'],
      project:['PROJECT','予定を準備・記録・レビューへ。','キャンプから始めて旅行/通院/車/家にも広げる。','キャンプPJを開く/作る','openOutbaseCampPrep&&openOutbaseCampPrep()'],
      assets:['ASSETS','素材を確認して思い出と記録につなげる。','写真・動画・音声・メモ・未整理インボックス。','素材一覧を開く','showAssetInboxPage&&showAssetInboxPage()']
    };
    const d = defs[key];
    return `<div class="life212-wrap"><section class="life212-card life212-hero"><div class="life212-kicker">${d[0]}</div><div class="life212-title">${d[1]}</div><div class="life212-sub">${d[2]}</div></section><section class="life212-card"><button class="life212-btn life212-primary" onclick="${d[4]}">${d[3]}</button></section>${nav(key)}</div>`;
  }
  async function showLife(key = 'home') {
    addStyle();
    route = key;
    if (key === 'home') {
      const home = $('homePage');
      if (home) { home.innerHTML = await buildHome(); showOnly('homePage'); }
    } else {
      const page = ensure(LIFE_PAGES[key]);
      page.innerHTML = simplePage(key);
      showOnly(LIFE_PAGES[key]);
    }
    markReady();
    window.scrollTo(0,0);
  }
  function setupLife() {
    addStyle();
    Object.values(LIFE_PAGES).forEach(ensure);
    ensure(RESULT);
    if (!isWalkActive()) showLife('home');
  }
  window.OUTBASE_LIFE_V212 = {
    $, esc, now, addStyle, ensure, showOnly, enforceOnly,
    showLife, isWalkActive, hasActiveOutbaseState,
    setRoute: value => { route = value; },
    getRoute: () => route,
    resultPageId: RESULT,
    walkPanelId: WALK_PANEL,
    videoInputId: VIDEO_INPUT,
    markReady
  };
  window.showOutbaseLifePageV212 = showLife;
  window.showOutbaseLifePageV211 = showLife;
  window.showOutbaseLifePageV210 = showLife;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupLife);
  else setupLife();
})();
