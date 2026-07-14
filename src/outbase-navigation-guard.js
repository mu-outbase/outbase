(() => {
  'use strict';

  const overlayCloseSelectors = [
    '[data-phase14-close]',
    '[data-prep-editor-close]',
    '[data-prep-memo-close]',
    '[data-destination-close]',
    '[data-chappy-close]',
    '[data-search-close]',
    '[data-memory-detail-close]',
    '[data-library-editor-close]',
    '[data-close-prep-sheet]',
    '[data-close-plan-sheet]',
    '[data-close-sheet]'
  ];

  const overlayRoots = [
    '.phase14ReviewBackdrop',
    '#outbasePrepMemoEditor',
    '#outbasePrepMemoSheet',
    '#outbaseChappyDestinationSheet',
    '#outbaseChappySheet',
    '#outbaseGlobalSearch',
    '#outbaseMemoryDetail'
  ];

  let trackedDepth = 0;
  let closingFromHistory = false;

  function visible(element) {
    if (!element) return false;
    const style = getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden';
  }

  function openOverlayCount() {
    return overlayRoots.reduce((count, selector) => {
      return count + (visible(document.querySelector(selector)) ? 1 : 0);
    }, 0);
  }

  function findTopCloseButton() {
    for (const selector of overlayCloseSelectors) {
      const button = document.querySelector(selector);
      if (visible(button)) return button;
    }
    return null;
  }

  function syncHistoryDepth() {
    const nextDepth = openOverlayCount();
    if (!closingFromHistory && nextDepth > trackedDepth) {
      for (let depth = trackedDepth + 1; depth <= nextDepth; depth += 1) {
        history.pushState({ outbase: true, overlayDepth: depth }, '', location.href);
      }
    }
    trackedDepth = nextDepth;
  }

  function isCloseControl(target) {
    return overlayCloseSelectors.some(selector => target.closest?.(selector));
  }

  window.addEventListener('click', event => {
    if (!isCloseControl(event.target)) return;
    if (!trackedDepth || !history.state?.outbase) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    history.back();
  }, true);

  window.addEventListener('popstate', () => {
    if (!trackedDepth) return;
    const closeButton = findTopCloseButton();
    if (!closeButton) {
      trackedDepth = openOverlayCount();
      return;
    }
    closingFromHistory = true;
    closeButton.click();
    requestAnimationFrame(() => {
      trackedDepth = openOverlayCount();
      closingFromHistory = false;
    });
  });

  window.addEventListener('DOMContentLoaded', () => {
    history.replaceState({ outbase: true, overlayDepth: 0 }, '', location.href);
    trackedDepth = openOverlayCount();
    const observer = new MutationObserver(() => {
      requestAnimationFrame(syncHistoryDepth);
    });
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden']
    });
  });
})();
