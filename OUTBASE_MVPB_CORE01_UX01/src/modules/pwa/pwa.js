export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return 'service-worker unsupported';
  try {
    await navigator.serviceWorker.register('./service-worker.js');
    return 'PWA準備OK';
  } catch (error) {
    console.warn('service worker registration failed', error);
    return 'PWA未登録';
  }
}
