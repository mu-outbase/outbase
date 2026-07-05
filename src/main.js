const BUILD_ID = 'core07-2-1-prep-usability-20260705';

import { bindNavigation, registerRoute, go } from './core/router.js?v=core07-2-1-prep-usability-20260705';
import { getState, subscribe } from './core/store.js?v=core07-2-1-prep-usability-20260705';
import { setAppStatus, applyRuntimeTheme } from './ui/components.js?v=core07-2-1-prep-usability-20260705';
import { renderHome } from './modules/home/home.js?v=core07-2-1-prep-usability-20260705';
import { renderSearch } from './modules/search/search.js?v=core07-2-1-prep-usability-20260705';
import { renderPrep } from './modules/prep/prep.js?v=core07-2-1-prep-usability-20260705';
import { renderDay } from './modules/day/day.js?v=core07-2-1-prep-usability-20260705';
import { renderWalk } from './modules/walk/walk.js?v=core07-2-1-prep-usability-20260705';
import { renderMemory } from './modules/memory/memory.js?v=core07-2-1-prep-usability-20260705';
import { registerServiceWorker } from './modules/pwa/pwa.js?v=core07-2-1-prep-usability-20260705';


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
  const nav = document.querySelector('.bottom-nav');
  const active = document.getElementById('activeRecordingIndicator');
  const navRect = nav?.getBoundingClientRect?.();
  const navHeight = Math.ceil(navRect?.height || 64);
  const navBottom = Math.max(6, Math.ceil(window.innerHeight - (navRect?.bottom || (window.innerHeight - 6))));
  const activeVisible = active && getState().currentRoute !== 'walk' && getComputedStyle(active).display !== 'none';
  const activeHeight = activeVisible ? Math.ceil(active.getBoundingClientRect().height + 8) : 0;
  const gap = window.matchMedia('(max-width:520px)').matches ? 42 : 38;
  const spacer = Math.max(96, navHeight + navBottom + activeHeight + gap);
  document.documentElement.style.setProperty('--ob-nav-h', `${navHeight}px`);
  document.documentElement.style.setProperty('--ob-nav-bottom', `${navBottom}px`);
  document.documentElement.style.setProperty('--ob-scroll-spacer', `${spacer}px`);
  document.documentElement.style.setProperty('--ob-bottom-reserve', `${spacer}px`);
}
function syncBottomSpaceSoon() {
  requestAnimationFrame(syncBottomSpace);
  window.setTimeout(syncBottomSpace, 80);
  window.setTimeout(syncBottomSpace, 240);
}
window.OUTBASE_SYNC_BOTTOM_SPACE = syncBottomSpaceSoon;
window.addEventListener('resize', syncBottomSpaceSoon, { passive: true });
window.addEventListener('orientationchange', () => setTimeout(syncBottomSpaceSoon, 120), { passive: true });

refreshRuntimeTheme();
registerRoute('home', renderHome);
registerRoute('search', renderSearch);
registerRoute('prep', renderPrep);
registerRoute('day', renderDay);
registerRoute('walk', renderWalk);
registerRoute('memory', renderMemory);
registerRoute('review', renderMemory);
bindNavigation();
go('home');
updateActiveRecordingIndicator();
syncBottomSpaceSoon();
subscribe((state) => { updateActiveRecordingIndicator(state); syncBottomSpaceSoon(); });
registerServiceWorker().then(() => refreshRuntimeTheme());
window.setInterval(refreshRuntimeTheme, 60 * 1000);
