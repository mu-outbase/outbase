import { patchState } from './store.js?v=core06-09-premium-interaction-ux-20260704';

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

function applyRoute(resolved, renderer) {
  patchState({ currentRoute: resolved });
  document.body.dataset.route = resolved;
  updateHeader(resolved);
  document.querySelectorAll('[data-route]').forEach((button) => {
    button.classList.toggle('active', button.dataset.route === resolved);
  });
  renderer?.();
  window.navigator?.vibrate?.(resolved === 'walk' ? 8 : 3);
}

export function go(routeName) {
  const resolved = routes.has(routeName) ? routeName : 'home';
  const renderer = routes.get(resolved) || routes.get('home');
  if (document.startViewTransition) {
    document.startViewTransition(() => applyRoute(resolved, renderer));
  } else {
    applyRoute(resolved, renderer);
  }
}

export function bindNavigation() {
  document.querySelectorAll('[data-route]').forEach((button) => {
    button.addEventListener('click', () => go(button.dataset.route));
  });
  document.addEventListener('click', (event) => {
    const button = event.target.closest('button, .btn, .premium-primary, .premium-action, .record-launch, .action-btn');
    if (!button || button.disabled) return;
    button.animate?.([
      { transform: 'scale(1)', filter: 'brightness(1)' },
      { transform: 'scale(.975)', filter: 'brightness(.98)' },
      { transform: 'scale(1)', filter: 'brightness(1)' }
    ], { duration: 140, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }, { passive: true });
}
