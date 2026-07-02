/* OUTBASE S-1 Shell Stable: central screen controller, no app.js/walk.js edits */
(function () {
  'use strict';

  const VERSION = 'S1-STABLE';
  const STYLE_ID = 'outbaseShellStableStyle';
  const HOME_PAGE = 'outbaseHomeStablePage';
  const WALK_PAGE = 'outbaseWalkStablePage';
  const RESULT_PAGE = 'outbaseWalkResultStablePage';
  let route = 'home';
  let ready = false;

  function $(id) { return document.getElementById(id); }
  function esc(value) {
    return String(value ?? '')
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
    } catch (error) { return false; }
  }
  function addStyle() {
    if ($(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      :root{--obg:#1f6f3a;--obd:#123d25;--obs:#edf6ee;--obb:#fbfaf5;--obt:#243127;--obm:#6b766c;--obl:#e5ebe4;--obr:#c91f28;}
      body{background:#fbfaf5;color:#243127}
      .stable-page{background:linear-gradient(180deg,#f4f8f2 0%,#fbfaf5 100%);padding:14px 14px 108px;box-sizing:border-box;min-height:calc(100vh - 72px)}
      .stable-wrap{display:flex;flex-direction:column;gap:14px;max-width:720px;margin:0 auto}
      .stable-card{background:#fff;border:1px solid rgba(31,111,58,.08);border-radius:24px;padding:16px;box-shadow:0 10px 24px rgba(20,81,45,.08);color:var(--obt);box-sizing:border-box}
      .stable-hero{background:linear-gradient(135deg,#1f6f3a,#4f8f5b);color:#fff;min-height:112px;position:relative;overflow:hidden}.stable-hero:after{content:'';position:absolute;right:22px;top:18px;width:58px;height:58px;border-radius:50%;background:rgba(255,255,255,.35)}
      .stable-kicker{font-size:12px;letter-spacing:.12em;opacity:.92;font-weight:900}.stable-title{font-size:27px;font-weight:900;line-height:1.25;position:relative;z-index:1}.stable-sub{font-size:13px;line-height:1.55;margin-top:8px;opacity:.92;position:relative;z-index:1}
      .stable-grid2{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.stable-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.stable-grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
      .stable-btn{border:1px solid var(--obl);background:#fff;color:var(--obd);border-radius:18px;font-weight:900;min-height:58px;padding:10px;font-size:15px;width:100%;box-sizing:border-box;margin:0}.stable-btn span{display:block;font-size:22px;margin-bottom:4px}.stable-primary{background:linear-gradient(180deg,var(--obg),var(--obd));color:#fff;border:0}.stable-danger{background:linear-gradient(180deg,#d4242d,#a5161d);color:#fff;border:0}.stable-muted{background:#f8faf7;color:#6b766c}.stable-link{border:0;background:transparent;color:#6b766c;text-decoration:underline;font-weight:900;min-height:38px;margin:0}
      .stable-mini{border:1px solid var(--obl);border-radius:18px;padding:12px;min-height:80px;background:#fff}.stable-label,.stable-note{font-size:12px;color:var(--obm);line-height:1.5}.stable-value{font-size:20px;font-weight:900;line-height:1.3}.stable-active{border-left:5px solid var(--obg)}
      .stable-nav{position:fixed;left:50%;transform:translateX(-50%);bottom:10px;width:min(680px,calc(100vw - 20px));display:grid;grid-template-columns:repeat(4,1fr);gap:2px;background:rgba(255,255,255,.96);border:1px solid rgba(31,111,58,.1);border-radius:22px;box-shadow:0 10px 22px rgba(20,81,45,.12);padding:8px;z-index:70}.stable-nav button{border:0;background:transparent;color:var(--obm);font-size:11px;font-weight:900;min-height:48px;margin:0}.stable-nav button.is-active{color:var(--obd)}.stable-nav span{display:block;font-size:20px}
      .stable-map{height:230px;border-radius:20px;border:1px solid var(--obl);background:#eef4ee;overflow:hidden;display:flex;align-items:center;justify-content:center;color:#6b766c;font-weight:900;text-align:center;padding:12px;box-sizing:border-box}.stable-map .leaflet-control-attribution{font-size:10px}.stable-pill{display:inline-block;border-radius:999px;background:#edf6ee;color:#123d25;padding:6px 10px;font-size:12px;font-weight:900}.stable-status{font-size:13px;color:#6b766c;line-height:1.5;min-height:20px}.stable-transcript{border:1px dashed var(--obl);border-radius:16px;background:#fbfaf5;padding:10px;min-height:42px;font-size:14px;color:#243127;line-height:1.5}
      @media(max-width:520px){.stable-title{font-size:24px}.stable-card{padding:15px}.stable-grid4{grid-template-columns:repeat(2,1fr)}.stable-btn{font-size:14px}.stable-map{height:220px}}
    `;
    document.head.appendChild(style);
  }
  function ensurePage(id, className) {
    let page = $(id);
    if (page) return page;
    page = document.createElement('div');
    page.id = id;
    page.className = className || 'page hidden stable-page';
    document.body.insertBefore(page, document.body.querySelector('script') || null);
    return page;
  }
  function hideAllPages() {
    document.querySelectorAll('.page').forEach(page => page.classList.add('hidden'));
  }
  function showRawPage(id) {
    addStyle();
    hideAllPages();
    const page = $(id);
    if (page) page.classList.remove('hidden');
    markReady();
  }
  function showPage(id) {
    addStyle();
    if (!id || id === 'home' || id === 'homePage' || id === HOME_PAGE) {
      route = 'home';
      if (window.OUTBASE_HOME_STABLE?.showHome) return window.OUTBASE_HOME_STABLE.showHome();
      showRawPage(HOME_PAGE);
      return;
    }
    if (id === 'walk' || id === 'walkPage' || id === WALK_PAGE) {
      route = 'walk';
      if (isWalkActive() && window.OUTBASE_WALK_STABLE?.showWalk) return window.OUTBASE_WALK_STABLE.showWalk();
      showRawPage(WALK_PAGE);
      return;
    }
    route = id;
    showRawPage(id);
  }
  function markReady() {
    ready = true;
    document.body.classList.add('outbase-stable-ready');
    document.body.classList.add('outbase-life-ready');
  }
  function boot() {
    addStyle();
    ensurePage(HOME_PAGE);
    ensurePage(WALK_PAGE);
    ensurePage(RESULT_PAGE);
    window.showPage = showPage;
    window.backToHome = function () { showPage('home'); };
    markReady();
    if (isWalkActive() && window.OUTBASE_WALK_STABLE?.showWalk) window.OUTBASE_WALK_STABLE.showWalk();
    else showPage('home');
  }
  window.OUTBASE_SHELL_STABLE = {
    version: VERSION, $, esc, now, addStyle, ensurePage, showRawPage, showPage,
    hideAllPages, markReady, isWalkActive,
    homePageId: HOME_PAGE, walkPageId: WALK_PAGE, resultPageId: RESULT_PAGE,
    getRoute: () => route,
    setRoute: value => { route = value || route; },
    isReady: () => ready
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  window.addEventListener('load', () => setTimeout(() => {
    window.showPage = showPage;
    window.backToHome = function () { showPage('home'); };
    if (isWalkActive() && window.OUTBASE_WALK_STABLE?.showWalk) window.OUTBASE_WALK_STABLE.showWalk();
    else window.OUTBASE_HOME_STABLE?.refreshHome?.();
  }, 250));
})();
