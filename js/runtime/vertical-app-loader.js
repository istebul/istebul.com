/**
 * Defer heavy vertical app bundles until after first paint / idle.
 */
const script = document.currentScript;
const appUrl = String(script?.getAttribute('data-vertical-app') || '').trim();

function loadVerticalApp() {
  if (!appUrl) return;
  void import(/* @vite-ignore */ appUrl).catch(() => {
    /* vertical boot optional — shell still usable */
  });
}

if (!appUrl) {
  /* no-op */
} else if (typeof requestIdleCallback === 'function') {
  requestIdleCallback(loadVerticalApp, { timeout: 2200 });
} else if (document.readyState === 'complete') {
  setTimeout(loadVerticalApp, 400);
} else {
  window.addEventListener('load', () => setTimeout(loadVerticalApp, 400), { once: true });
}
