import { patchState } from './store.js?v=core08-c-prep-workspace-stable-20260705';

const routes = new Map();
const ROUTE_LABELS = {
  home: '予定',
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

function applyActiveNav(resolved) {
  document.querySelectorAll('.bottom-nav [data-route]').forEach((button) => {
    button.classList.toggle('active', button.dataset.route === resolved);
    button.setAttribute('aria-current', button.dataset.route === resolved ? 'page' : 'false');
  });
}

function applyRoute(resolved, renderer) {
  patchState({ currentRoute: resolved, prepFeature: resolved === 'prep' ? undefined : 'dashboard' });
  document.body.dataset.route = resolved;
  updateHeader(resolved);
  applyActiveNav(resolved);
  renderer?.();
  requestAnimationFrame(() => window.OUTBASE_SYNC_BOTTOM_SPACE?.());
  window.navigator?.vibrate?.(resolved === 'walk' ? 8 : 3);
}

export function go(routeName) {
  const resolved = routes.has(routeName) ? routeName : 'home';
  const renderer = routes.get(resolved) || routes.get('home');
  if (document.startViewTransition) document.startViewTransition(() => applyRoute(resolved, renderer));
  else applyRoute(resolved, renderer);
}

function bindBottomNavDelegation() {
  const nav = document.querySelector('.bottom-nav');
  if (!nav || nav.dataset.outbaseBound === 'true') return;
  nav.dataset.outbaseBound = 'true';
  nav.addEventListener('click', (event) => {
    const button = event.target.closest('[data-route]');
    if (!button || !nav.contains(button) || button.disabled) return;
    event.preventDefault();
    event.stopPropagation();
    const route = button.getAttribute('data-route');
    go(route);
  }, { passive: false });
}

export function bindNavigation() {
  bindBottomNavDelegation();
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
