(() => {
  'use strict';

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

  let syncTimer = 0;
  let observedDepth = 0;

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

  function syncHistoryWithDom() {
    observedDepth = openLayers().length;
    return observedDepth;
  }

  function scheduleSync() {
    clearTimeout(syncTimer);
    syncTimer = window.setTimeout(syncHistoryWithDom, 40);
  }

  window.addEventListener('DOMContentLoaded', () => {
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
