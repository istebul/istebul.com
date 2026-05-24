import { initExecutivePolish } from './executive-polish.js';

export function initEnterpriseUx() {
  if (typeof document === 'undefined') return;

  initExecutivePolish();

  const markReady = () => {
    document.documentElement.classList.add('ib-ready');
    document.body?.classList.add('ib-ready');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', markReady, { once: true });
  } else {
    markReady();
  }

  // Failsafe: never leave main at opacity 0 if init stalls
  setTimeout(markReady, 2500);

  document.addEventListener('routeChanged', () => {
    document.dispatchEvent(new CustomEvent('ib:refresh-icons'));
  });
}
