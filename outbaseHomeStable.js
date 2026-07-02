/* OUTBASE S-1 Home Stable: separated home page, no legacy home mixing */
(function () {
  'use strict';
  function api() { return window.OUTBASE_SHELL_STABLE; }
  function $(id) { return api().$(id); }
  function esc(value) { return api().esc(value); }
  function now() { return api().now(); }
  async function safeRecords() {
    try { return typeof getRecords === 'function' ? await getRecords() : []; }
    catch (error) { return []; }
  }
  async function safeInbox() {
    try { return typeof getOutbaseStoreAll === 'function' ? await getOutbaseStoreAll('inbox_items') : []; }
    catch (error) { return []; }
  }
  function historyAction() {
    if (typeof showWalkHistoryPage === 'function') showWalkHistoryPage();
    else api().showPage('walkHistoryPage');
  }
  function buildNav() {
    return `<nav class="stable-nav">
      <button class="is-active" onclick="OUTBASE_HOME_STABLE.showHome()"><span>🏠</span>ホーム</button>
      <button onclick="startWalk&&startWalk()"><span>🐕</span>散歩</button>
      <button onclick="OUTBASE_HOME_STABLE.openWalkHistory()"><span>📚</span>履歴</button>
      <button onclick="showAssetInboxPage?showAssetInboxPage():OUTBASE_SHELL_STABLE.showPage('assetInboxPage')"><span>📁</span>素材</button>
    </nav>`;
  }
  function featureButton(icon, title, note, action) {
    return `<button class="stable-btn stable-muted" onclick="${action}"><span>${icon}</span>${title}<div class="stable-note">${note}</div></button>`;
  }
  async function renderHomeHtml() {
    const records = await safeRecords();
    const inbox = await safeInbox();
    const walks = records.filter(r => (r.recordType === 'walk') || (r.session && r.session.type === 'walk'));
    walks.sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));
    const latest = walks[0];
    const active = api().isWalkActive();
    const inboxCount = inbox.filter(x => !['linked','deleted','done'].includes(x.status)).length;
    return `<div class="stable-wrap">
      <section class="stable-card stable-hero">
        <div class="stable-kicker">OUTBASE HOME</div>
        <div class="stable-title">今使うものだけ、<br>迷わず開く。</div>
        <div class="stable-sub">ホームは散歩開始・散歩履歴・散歩へ戻るを優先します。未完成機能は前面に出しません。</div>
      </section>
      ${active ? `<section class="stable-card stable-active"><div class="stable-value">🐕 コタ散歩が継続中</div><div class="stable-note">記録操作は散歩モードへ戻って行います。</div><div style="height:10px"></div><button class="stable-btn stable-primary" onclick="OUTBASE_WALK_STABLE.returnToWalk()">散歩へ戻る</button></section>` : ''}
      <section class="stable-card"><b>すぐ使う</b><div class="stable-grid2" style="margin-top:10px">
        <button class="stable-btn stable-primary" onclick="startWalk&&startWalk()"><span>🐕</span>コタ散歩開始</button>
        <button class="stable-btn" onclick="OUTBASE_HOME_STABLE.openWalkHistory()"><span>📚</span>散歩履歴</button>
      </div></section>
      <section class="stable-card"><b>状態</b><div class="stable-grid3" style="margin-top:10px">
        <div class="stable-mini"><div class="stable-label">散歩記録</div><div class="stable-value">${walks.length}件</div><div class="stable-note">履歴入口を固定</div></div>
        <div class="stable-mini"><div class="stable-label">直近散歩</div><div class="stable-value">${esc(latest?.date ? latest.date.split(' ')[0] : 'なし')}</div><div class="stable-note">${esc(latest?.walk?.time || '')}</div></div>
        <div class="stable-mini"><div class="stable-label">未整理素材</div><div class="stable-value">${inboxCount}件</div><div class="stable-note">多い時だけ整理</div></div>
      </div></section>
      <section class="stable-card"><b>準備中の機能</b><div class="stable-note">記録・予定・PJ・素材はまだ完成前なので、小さく置きます。</div><div class="stable-grid4" style="margin-top:10px">
        ${featureButton('📝','記録','準備中','return false')}
        ${featureButton('📅','予定','準備中','return false')}
        ${featureButton('🗂️','PJ','準備中','return false')}
        ${featureButton('📁','素材','一覧へ','showAssetInboxPage?showAssetInboxPage():OUTBASE_SHELL_STABLE.showPage(\'assetInboxPage\')')}
      </div></section>
      <section class="stable-card"><b>チャッピー</b><div class="stable-note">今は画面安定化を優先中。MVP完成とは扱いません。</div></section>
      ${buildNav()}
    </div>`;
  }
  async function showHome() {
    const shell = api();
    if (!shell) return;
    shell.addStyle();
    const page = shell.ensurePage(shell.homePageId, 'page hidden stable-page');
    page.innerHTML = `<div class="stable-wrap"><section class="stable-card stable-hero"><div class="stable-kicker">OUTBASE HOME</div><div class="stable-title">ホーム準備中</div><div class="stable-sub">旧ホームを使わず、Stableホームを表示します。</div></section></div>`;
    shell.showRawPage(shell.homePageId);
    page.innerHTML = await renderHomeHtml();
    shell.setRoute('home');
    shell.showRawPage(shell.homePageId);
  }
  window.OUTBASE_HOME_STABLE = {
    showHome,
    refreshHome: showHome,
    openWalkHistory: historyAction
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showHome);
  else showHome();
  window.addEventListener('load', () => setTimeout(showHome, 500));
})();
