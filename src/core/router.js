import { patchState } from './store.js?v=core05-5-time-phase-ux-20260703';

const routes = new Map();

export function registerRoute(name, renderer) {
  routes.set(name, renderer);
}

export function go(routeName) {
  const renderer = routes.get(routeName) || routes.get('home');
  const resolved = routes.has(routeName) ? routeName : 'home';
  document.body.dataset.route = resolved;
  patchState({ currentRoute: resolved });
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
