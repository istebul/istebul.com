/**
 * Deferred social widgets — separate file for CSP (no inline scripts on HTML shells).
 */
const bootSocial = () => import('/js/runtime/site-social-init.js').catch(() => {});
if ('requestIdleCallback' in window) {
  requestIdleCallback(bootSocial, { timeout: 2500 });
} else {
  window.addEventListener('load', () => setTimeout(bootSocial, 400), { once: true });
}
