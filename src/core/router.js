import { patchState } from './store.js?v=core06-02-record-mode-map-confirm-20260704';

const routes = new Map();

const ROUTE_LABELS = {
  home: 'カレンダー',
  search: '探す',
  prep: '準備',
  walk: '記録',
  day: '当日',
  memory: '思い出',
  review: '思い出'
};

export function registerRoute(name, renderer) {
  routes.set(name, renderer);
}

function updateHeader(routeName) {
  const title = document.getElementById('appTitle');
  if (title) title.textContent = ROUTE_LABELS[routeName] || 'OUTBASE';
}

export function go(routeName) {
  const resolved = routes.has(routeName) ? routeName : 'home';
  const renderer = routes.get(resolved) || routes.get('home');
  patchState({ currentRoute: resolved });
  document.body.dataset.route = resolved;
  updateHeader(resolved);
  document.querySelectorAll('[data-route]').forEach((button) => {
    button.classList.toggle('active', button.dataset.route === resolved);
  });
  renderer?.();
}

export function bindNavigation() {
  document.querySelectorAll('[data-route]').forEach((button) => {
    button.addEventListener('click', () => go(button.dataset.route));
  });
}
