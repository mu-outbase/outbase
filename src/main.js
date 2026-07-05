const BUILD_ID = 'core08-e1-one-tap-record-20260705';

import { bindNavigation, registerRoute, go } from './core/router.js?v=core08-e1-one-tap-record-20260705';
import { getState, subscribe } from './core/store.js?v=core08-e1-one-tap-record-20260705';
import { applyScreenContext, deriveScreenContext } from './core/workspace.js?v=core08-e1-one-tap-record-20260705';
import { setAppStatus, applyRuntimeTheme } from './ui/components.js?v=core08-e1-one-tap-record-20260705';
import { renderHome } from './modules/home/home.js?v=core08-e1-one-tap-record-20260705';
import { enhanceHomeCommander, initHomeCommander } from './modules/home/homeCommander.js?v=core08-e1-one-tap-record-20260705';
import { renderSearch } from './modules/search/search.js?v=core08-e1-one-tap-record-20260705';
import { renderPrep } from './modules/prep/prep.js?v=core08-e1-one-tap-record-20260705';
import { renderWalk } from './modules/walk/walk.js?v=core08-e1-one-tap-record-20260705';
import { renderMemory } from './modules/memory/memory.js?v=core08-e1-one-tap-record-20260705';
import { registerServiceWorker } from './modules/pwa/pwa.js?v=core08-e1-one-tap-record-20260705';


document.body.dataset.build = BUILD_ID;

function refreshRuntimeTheme() {
  const runtime = applyRuntimeTheme();
  setAppStatus(runtime.label);
  document.body.dataset.runtimeLabel = runtime.label;
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const color = { morning: '#f4e5cc', day: '#f4efe4', evening: '#ead7c4', night: '#d9d4c8' }[runtime.theme] || '#f4efe4';
  if (themeMeta) themeMeta.setAttribute('content', color);
  return runtime;
}

function modeLabel(type) {
  return {
    homeWalk: '自宅散歩', campWalk: '場内散歩', walk: '自宅散歩', camp: 'キャンプ滞在',
    life: 'メモ', memo: 'メモ', setup: '設営', cook: '料理', teardown: '撤収'
  }[type] || '記録';
}

function normalizedActiveMode(session) {
  if (session?.activeChild?.type) return session.activeChild.type;
  if (session?.type === 'walk') return 'homeWalk';
  if (session?.type === 'life') return 'memo';
  return session?.type || 'memo';
}

function activeRecordingLabel(state = getState()) {
  const session = state.walkSession;
  if (!session || session.status !== 'active') return null;
  const parent = session.parentTitle || session.title || modeLabel(session.type);
  const child = modeLabel(normalizedActiveMode(session));
  const count = Array.isArray(session.records) ? session.records.length : 0;
  if (session.type === 'camp') return `${parent} ＞ ${child} / ${count}件`;
  const place = session.locationLabel ? ` / ${session.locationLabel}` : '';
  return `${child}${place} / ${count}件`;
}

function updateActiveRecordingIndicator(state = getState()) {
  const label = activeRecordingLabel(state);
  document.body.dataset.recording = label ? 'active' : 'idle';
  const recordTab = document.querySelector('.record-tab');
  if (recordTab) {
    recordTab.classList.toggle('live', Boolean(label));
    const small = recordTab.querySelector('small');
    if (small) small.textContent = label ? '記録中' : '記録';
  }
  let bar = document.getElementById('activeRecordingIndicator');
  if (!label) { bar?.remove(); syncBottomSpaceSoon(); return; }
  if (!bar) {
    bar = document.createElement('button');
    bar.id = 'activeRecordingIndicator';
    bar.className = 'active-recording-indicator compact-live-pill';
    bar.type = 'button';
    bar.setAttribute('aria-live', 'polite');
    document.body.appendChild(bar);
    bar.addEventListener('click', () => go('walk'));
  }
  bar.innerHTML = `<strong>記録中</strong><span>${label}</span><em>タップで戻る</em>`;
  syncBottomSpaceSoon();
}


function syncBottomSpace() {
  const state = getState();
  const context = applyScreenContext(state);
  const nav = document.querySelector('.bottom-nav');
  const active = document.getElementById('activeRecordingIndicator');
  const navRect = nav?.getBoundingClientRect?.();
  const navHeight = Math.ceil(navRect?.height || 64);
  const navBottom = Math.max(6, Math.ceil(window.innerHeight - (navRect?.bottom || (window.innerHeight - 6))));
  const activeVisible = active && state.currentRoute !== 'walk' && getComputedStyle(active).display !== 'none';
  const activeHeight = activeVisible ? Math.ceil(active.getBoundingClientRect().height + 8) : 0;
  const workspaceOpen = context.screenKind === 'workspace';
  const baseSpacer = Math.max(62, Math.round(navHeight * 0.58) + navBottom);
  const spacer = workspaceOpen ? 0 : Math.min(92, baseSpacer + activeHeight);
  const screenPad = workspaceOpen ? 0 : Math.max(8, Math.min(18, Math.round(spacer * 0.18)));
  const targets = [document.documentElement, document.body].filter(Boolean);
  targets.forEach((target) => {
    target.style.setProperty('--ob-nav-h', `${navHeight}px`);
    target.style.setProperty('--ob-nav-bottom', `${navBottom}px`);
    target.style.setProperty('--ob-scroll-spacer', `${spacer}px`);
    target.style.setProperty('--ob-bottom-reserve', `${spacer}px`);
    target.style.setProperty('--ob-screen-bottom-pad', `${screenPad}px`);
  });
}
function syncBottomSpaceSoon() {
  requestAnimationFrame(syncBottomSpace);
  window.setTimeout(syncBottomSpace, 80);
  window.setTimeout(syncBottomSpace, 240);
}
window.OUTBASE_SYNC_BOTTOM_SPACE = syncBottomSpaceSoon;
window.addEventListener('resize', syncBottomSpaceSoon, { passive: true });
window.addEventListener('orientationchange', () => setTimeout(syncBottomSpaceSoon, 120), { passive: true });


function dayAutoLayerCount(state = getState()) {
  const project = state.nextProject || {};
  const reservation = project.reservation || {};
  const key = project.id || project.baseId || project.projectId || ['nextProject', reservation.campground || project.title || 'camp', reservation.dateText || 'undated'].join('__');
  const list = (name) => Array.isArray(state[name]?.[key]) ? state[name][key] : [];
  const records = list('dayRecords').filter((item) => ['unconfirmed', 'wrong', 'later'].includes(item.recordStatus || item.status || 'unconfirmed')).length;
  const events = list('dayAutoEvents').filter((item) => !['confirmed', 'dismissed'].includes(item.status)).length;
  const queue = list('dayConnectQueue').filter((item) => item.status !== 'accepted').length;
  return { total: records + events + queue, records, events, queue };
}

function d9ProjectLabel(state = getState()) {
  const project = state.nextProject || {};
  const reservation = project.reservation || {};
  const campground = reservation.campground || project.title || '次のキャンプ';
  const date = reservation.dateText || project.dateText || '';
  return date ? `${campground} / ${date}` : campground;
}

function insertD9HomeBridge() {
  const shell = document.getElementById('app');
  if (!shell || shell.querySelector('[data-d9-home-bridge]')) return;
  const count = dayAutoLayerCount();
  const card = document.createElement('section');
  card.className = 'd9-autolog-card';
  card.dataset.d9HomeBridge = 'true';
  card.innerHTML = `
    <div class="d9-kicker">OUTBASE 自動ログ</div>
    <h2>当日は「＋」で残すだけ</h2>
    <p>${escapeForD9(d9ProjectLabel())}</p>
    <div class="d9-home-actions">
      <button type="button" data-d9-go="prep"><strong>行く前は準備</strong><small>ルート / 料理 / ギア / コタ</small></button>
      <button type="button" data-d9-go="walk" class="primary"><strong>当日は＋で残す</strong><small>写真 / 声 / メモ / あとで</small></button>
      <button type="button" data-d9-go="memory"><strong>帰宅後は思い出</strong><small>未確認 ${count.total}件</small></button>
    </div>
  `;
  shell.prepend(card);
  shell.querySelectorAll('[data-d9-go]').forEach((button) => button.addEventListener('click', () => go(button.dataset.d9Go)));
}

function insertD9MemoryBridge() {
  const shell = document.getElementById('app');
  if (!shell || shell.querySelector('[data-d9-memory-bridge]')) return;
  const count = dayAutoLayerCount();
  const card = document.createElement('section');
  card.className = 'd9-autolog-card d9-memory-bridge';
  card.dataset.d9MemoryBridge = 'true';
  card.innerHTML = `
    <div class="d9-kicker">未確認箱</div>
    <h2>キャンプ後にまとめて整理</h2>
    <p>当日タブは廃止。Google Maps・GPS・写真・メモ・声の候補は裏で持ち、ここで確認する。</p>
    <div class="d9-counts"><span>未確認 ${count.total}件</span><span>記録 ${count.records}件</span><span>自動 ${count.events}件</span><span>連携 ${count.queue}件</span></div>
  `;
  shell.prepend(card);
}

function insertD9PrepBridge() {
  const shell = document.getElementById('app');
  if (!shell || shell.querySelector('[data-d9-prep-bridge]')) return;
  const card = document.createElement('section');
  card.className = 'd9-route-card';
  card.dataset.d9PrepBridge = 'true';
  card.innerHTML = `
    <div><div class="d9-kicker">ルート</div><h2>Google Mapsで開く</h2><p>ドライブ中はOUTBASEを操作しない。戻った後に時刻・GPS・予定との差から補完する。</p></div>
    <button type="button" id="d9GoogleMaps">Google Maps</button>
  `;
  shell.prepend(card);
  card.querySelector('#d9GoogleMaps')?.addEventListener('click', () => {
    const state = getState();
    const project = state.nextProject || {};
    const destination = project.reservation?.campground || project.title || 'キャンプ場';
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;
    window.open(url, '_blank', 'noopener');
  });
}

function escapeForD9(value) {
  return String(value ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function renderLegacyDayRedirect() {
  go('home');
}

function resolveInitialRoute(route) {
  if (!route || route === 'day' || route === 'review') return 'home';
  return route;
}

refreshRuntimeTheme();
applyScreenContext(getState());
registerRoute('home', () => { renderHome(); enhanceHomeCommander(); insertD9HomeBridge(); });
registerRoute('search', renderSearch);
registerRoute('prep', () => { renderPrep(); insertD9PrepBridge(); });
registerRoute('day', renderLegacyDayRedirect);
registerRoute('walk', renderWalk);
registerRoute('memory', () => { renderMemory(); insertD9MemoryBridge(); });
registerRoute('review', () => { renderMemory(); insertD9MemoryBridge(); });
bindNavigation();
go(resolveInitialRoute(getState().currentRoute));
initHomeCommander();
updateActiveRecordingIndicator();
syncBottomSpaceSoon();
subscribe((state) => { applyScreenContext(state); updateActiveRecordingIndicator(state); syncBottomSpaceSoon(); });
registerServiceWorker().then(() => refreshRuntimeTheme());
window.setInterval(refreshRuntimeTheme, 60 * 1000);
