(() => {
  'use strict';

  const STATE_FLAG = 'outbaseNavigation';
  const STATE_DEPTH = 'overlayDepth';
  const CONTROL_SELECTOR = 'button,[role="button"]';
  const ROOT_SELECTOR = [
    'dialog',
    '[role="dialog"]',
    '[aria-modal="true"]',
    '[id$="Sheet"]',
    '[id$="Editor"]',
    '[id$="Modal"]',
    '[class*="Backdrop"]',
    '[class*="backdrop"]',
    '[class*="Modal"]',
    '[class*="modal"]',
    '[class*="Sheet"]',
    '[class*="sheet"]',
    '[class*="Editor"]',
    '[class*="editor"]'
  ].join(',');

  let applyingPopState = false;
  let synchronizingProgrammaticClose = false;
  let syncTimer = 0;

  function visible(element) {
    if (!element || !element.isConnected) return false;
    const style = getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    if (Number(style.opacity) === 0) return false;
    return element.getClientRects().length > 0;
  }

  function datasetLooksLikeClose(element) {
    return Object.keys(element.dataset || {}).some(key => {
      const normalized = key.toLowerCase();
      return normalized.startsWith('close') || normalized.endsWith('close');
    });
  }

  function isCloseControl(element) {
    if (!element) return false;
    const aria = String(element.getAttribute('aria-label') || '').toLowerCase();
    const title = String(element.getAttribute('title') || '').toLowerCase();
    const className = typeof element.className === 'string' ? element.className.toLowerCase() : '';
    return datasetLooksLikeClose(element) ||
      aria.includes('閉じる') || aria.includes('close') ||
      title.includes('閉じる') || title.includes('close') ||
      /(^|\s)(close|modal-close|sheet-close)(\s|$)/.test(className);
  }

  function layerRoot(button) {
    return button.closest(ROOT_SELECTOR) || button;
  }

  function effectiveZIndex(element) {
    let node = element;
    let highest = 0;
    while (node && node !== document.documentElement) {
      const value = Number.parseInt(getComputedStyle(node).zIndex, 10);
      if (Number.isFinite(value)) highest = Math.max(highest, value);
      node = node.parentElement;
    }
    return highest;
  }

  function layerOrder(element) {
    const all = [...document.querySelectorAll('*')];
    return all.indexOf(element);
  }

  function openLayers() {
    const controls = [...document.querySelectorAll(CONTROL_SELECTOR)]
      .filter(button => visible(button) && isCloseControl(button));

    const byRoot = new Map();
    controls.forEach(button => {
      const root = layerRoot(button);
      if (!visible(root)) return;
      const current = byRoot.get(root);
      const candidate = {
        root,
        button,
        zIndex: effectiveZIndex(root),
        order: layerOrder(root)
      };
      if (!current || candidate.order >= current.order) byRoot.set(root, candidate);
    });

    return [...byRoot.values()].sort((a, b) => {
      if (a.zIndex !== b.zIndex) return a.zIndex - b.zIndex;
      return a.order - b.order;
    });
  }

  function stateDepth(state = history.state) {
    if (!state || state[STATE_FLAG] !== true) return 0;
    const value = Number(state[STATE_DEPTH] || 0);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  }

  function replaceState(depth) {
    history.replaceState({
      ...(history.state || {}),
      [STATE_FLAG]: true,
      [STATE_DEPTH]: Math.max(0, depth)
    }, '', location.href);
  }

  function pushState(depth) {
    history.pushState({
      ...(history.state || {}),
      [STATE_FLAG]: true,
      [STATE_DEPTH]: Math.max(0, depth)
    }, '', location.href);
  }

  function syncHistoryWithDom() {
    if (applyingPopState || synchronizingProgrammaticClose) return;

    const actualDepth = openLayers().length;
    const currentDepth = stateDepth();

    if (actualDepth > currentDepth) {
      for (let depth = currentDepth + 1; depth <= actualDepth; depth += 1) {
        pushState(depth);
      }
      return;
    }

    if (actualDepth < currentDepth) {
      synchronizingProgrammaticClose = true;
      history.go(actualDepth - currentDepth);
    }
  }

  function scheduleSync() {
    clearTimeout(syncTimer);
    syncTimer = window.setTimeout(syncHistoryWithDom, 40);
  }

  function closeUntilDepth(targetDepth) {
    const layers = openLayers();
    if (layers.length <= targetDepth) {
      applyingPopState = false;
      scheduleSync();
      return;
    }

    const top = layers[layers.length - 1];
    if (!top?.button) {
      applyingPopState = false;
      replaceState(layers.length);
      return;
    }

    top.button.click();
    window.setTimeout(() => closeUntilDepth(targetDepth), 0);
  }

  window.addEventListener('popstate', event => {
    if (synchronizingProgrammaticClose) {
      synchronizingProgrammaticClose = false;
      scheduleSync();
      return;
    }

    const layers = openLayers();
    if (!layers.length) return;

    const targetDepth = stateDepth(event.state);
    applyingPopState = true;
    closeUntilDepth(targetDepth);
  });

  window.addEventListener('DOMContentLoaded', () => {
    replaceState(0);

    const observer = new MutationObserver(scheduleSync);
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'open']
    });

    scheduleSync();
  });

  window.addEventListener('pageshow', scheduleSync);
  window.addEventListener('hashchange', scheduleSync);
  globalThis.addEventListener('outbase:entry-refresh', scheduleSync);
  globalThis.addEventListener('outbase:activity-refresh', scheduleSync);
  globalThis.addEventListener('outbase:core-ready', scheduleSync);
})();
