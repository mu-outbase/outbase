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

  function visible(element) {
    if (!element) return false;
    const style = getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden';
  }

  function findTopCloseButton() {
    for (const selector of overlayCloseSelectors) {
      const button = document.querySelector(selector);
      if (visible(button)) return button;
    }
    return null;
  }

  function hasOpenOverlay() {
    return overlayRoots.some(selector => visible(document.querySelector(selector)));
  }

  window.addEventListener('popstate', event => {
    if (!hasOpenOverlay()) return;

    const closeButton = findTopCloseButton();
    if (!closeButton) return;

    event.preventDefault();
    closeButton.click();

    // Androidの戻るでページ遷移せず、閉じた画面に留める。
    history.pushState({ outbase: true, overlayClosed: true }, '', location.href);
  });

  window.addEventListener('DOMContentLoaded', () => {
    if (!history.state?.outbase) {
      history.replaceState({ outbase: true }, '', location.href);
    }
  });
})();
