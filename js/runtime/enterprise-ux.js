import { initExecutivePolish } from './executive-polish.js';
import { initP4ProductPolish } from './p4-product-polish.js';
import { initMobilePremiumUx } from './mobile-premium-ux.js';

export function initEnterpriseUx() {
  if (typeof document === 'undefined') return;

  initP4ProductPolish();
  initExecutivePolish();
  initMobilePremiumUx();

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
