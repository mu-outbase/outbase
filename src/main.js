const BUILD_ID = 'core06-01-record-pages-theme-20260704';

import { bindNavigation, registerRoute, go } from './core/router.js?v=core06-01-record-pages-theme-20260704';
import { getState, subscribe } from './core/store.js?v=core06-01-record-pages-theme-20260704';
import { setAppStatus, applyRuntimeTheme } from './ui/components.js?v=core06-01-record-pages-theme-20260704';
import { renderHome } from './modules/home/home.js?v=core06-01-record-pages-theme-20260704';
import { renderSearch } from './modules/search/search.js?v=core06-01-record-pages-theme-20260704';
import { renderPrep } from './modules/prep/prep.js?v=core06-01-record-pages-theme-20260704';
import { renderDay } from './modules/day/day.js?v=core06-01-record-pages-theme-20260704';
import { renderWalk } from './modules/walk/walk.js?v=core06-01-record-pages-theme-20260704';
import { renderMemory } from './modules/memory/memory.js?v=core06-01-record-pages-theme-20260704';
import { registerServiceWorker } from './modules/pwa/pwa.js?v=core06-01-record-pages-theme-20260704';

document.body.dataset.build = BUILD_ID;

function refreshRuntimeTheme() {
  const runtime = applyRuntimeTheme();
  setAppStatus(runtime.label);
  document.body.dataset.runtimeLabel = runtime.label;
  return runtime;
}

const runtime = refreshRuntimeTheme();

function activeRecordingLabel(state = getState()) {
  const session = state.walkSession;
  if (!session || session.status !== 'active') return null;
  const typeLabel = { walk: 'コタ散歩', camp: 'キャンプ記録', life: 'メモ' }[session.type] || '記録';
  const count = Array.isArray(session.records) ? session.records.length : 0;
  return `${typeLabel} 記録中 / ${count}件`;
}

function updateActiveRecordingIndicator(state = getState()) {
  const label = activeRecordingLabel(state);
  document.body.dataset.recording = label ? 'active' : 'idle';
  let button = document.getElementById('activeRecordingIndicator');
  if (!label) {
    button?.remove();
    return;
  }
  if (!button) {
    button = document.createElement('button');
    button.id = 'activeRecordingIndicator';
    button.className = 'active-recording-indicator';
    button.type = 'button';
    button.addEventListener('click', () => go('walk'));
    document.body.appendChild(button);
  }
  button.innerHTML = `<strong>REC</strong><span>${label}</span>`;
}


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
