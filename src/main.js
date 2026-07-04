const BUILD_ID = 'core06-08-human-centered-ux-20260704';

import { bindNavigation, registerRoute, go } from './core/router.js?v=core06-08-human-centered-ux-20260704';
import { getState, subscribe } from './core/store.js?v=core06-08-human-centered-ux-20260704';
import { setAppStatus, applyRuntimeTheme } from './ui/components.js?v=core06-08-human-centered-ux-20260704';
import { renderHome } from './modules/home/home.js?v=core06-08-human-centered-ux-20260704';
import { renderSearch } from './modules/search/search.js?v=core06-08-human-centered-ux-20260704';
import { renderPrep } from './modules/prep/prep.js?v=core06-08-human-centered-ux-20260704';
import { renderDay } from './modules/day/day.js?v=core06-08-human-centered-ux-20260704';
import { renderWalk } from './modules/walk/walk.js?v=core06-08-human-centered-ux-20260704';
import { renderMemory } from './modules/memory/memory.js?v=core06-08-human-centered-ux-20260704';
import { registerServiceWorker } from './modules/pwa/pwa.js?v=core06-08-human-centered-ux-20260704';

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
    homeWalk: '自宅散歩',
    campWalk: 'キャンプ場散歩',
    walk: '自宅散歩',
    camp: 'キャンプ滞在',
    life: 'メモ',
    memo: 'メモ',
    setup: '設営',
    cook: '料理',
    teardown: '撤収'
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
  if (session.type === 'camp') return `記録中：親 ${parent} ＞ 今 ${child} / ${count}件`;
  const place = session.locationLabel ? ` / ${session.locationLabel}` : '';
  return `記録中：${child}${place} / ${count}件`;
}

function updateActiveRecordingIndicator(state = getState()) {
  const label = activeRecordingLabel(state);
  document.body.dataset.recording = label ? 'active' : 'idle';
  const recordTab = document.querySelector('.record-tab');
  if (recordTab) {
    recordTab.classList.toggle('live', Boolean(label));
    const small = recordTab.querySelector('small');
    if (small) small.textContent = label ? '戻る' : '記録';
  }
  let button = document.getElementById('activeRecordingIndicator');
  if (!label) {
    button?.remove();
    return;
  }
  if (!button) {
    button = document.createElement('div');
    button.id = 'activeRecordingIndicator';
    button.className = 'active-recording-indicator live-glance';
    button.setAttribute('aria-live', 'polite');
    document.body.appendChild(button);
  }
  button.innerHTML = `<strong>記録中</strong><span>${label}</span><em>＋で戻る</em>`;
}

const runtime = refreshRuntimeTheme();

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
subscribe(updateActiveRecordingIndicator);

registerServiceWorker().then(() => refreshRuntimeTheme());
window.setInterval(refreshRuntimeTheme, 60 * 1000);
