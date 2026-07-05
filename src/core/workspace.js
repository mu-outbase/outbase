const WORKSPACE_FEATURES = new Set(['input', 'meal', 'route', 'gear', 'kota']);

export function isWorkspaceFeature(feature) {
  return WORKSPACE_FEATURES.has(feature || '');
}

export function deriveScreenContext(state = {}) {
  const route = state.currentRoute || 'home';
  const prepFeature = state.prepFeature || 'dashboard';
  const workspaceOpen = route === 'prep' && isWorkspaceFeature(prepFeature);
  let screenKind = 'hub';
  if (workspaceOpen) screenKind = 'workspace';
  if (state.walkSession?.status === 'active' && route === 'walk') screenKind = 'recording';
  return {
    route,
    screenKind,
    workspaceOpen,
    workspaceName: workspaceOpen ? prepFeature : '',
    bottomNavVisible: !workspaceOpen
  };
}

export function applyScreenContext(state = {}, root = document) {
  const context = deriveScreenContext(state);
  const body = root.body;
  const app = root.getElementById?.('app');
  if (!body) return context;
  body.dataset.route = context.route;
  body.dataset.screenKind = context.screenKind;
  body.dataset.workspaceOpen = context.workspaceOpen ? 'true' : 'false';
  body.dataset.workspaceName = context.workspaceName || '';
  body.classList.toggle('outbase-workspace-active', context.workspaceOpen);
  if (app) {
    app.dataset.route = context.route;
    app.dataset.screenKind = context.screenKind;
  }
  return context;
}
