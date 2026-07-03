import { patchState } from './store.js?v=core05-8-calendar-interactive-20260703';

const routes = new Map();

export function registerRoute(name, renderer) {
  routes.set(name, renderer);
}

export function go(routeName) {
  const renderer = routes.get(routeName) || routes.get('home');
  patchState({ currentRoute: routeName });
  document.body.dataset.route = routeName;
  document.querySelectorAll('[data-route]').forEach((button) => {
    button.classList.toggle('active', button.dataset.route === routeName);
  });
  renderer?.();
}

export function bindNavigation() {
  document.querySelectorAll('[data-route]').forEach((button) => {
    button.addEventListener('click', () => go(button.dataset.route));
  });
}
