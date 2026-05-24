import { initExecutivePolish } from './executive-polish.js';
import { initP4ProductPolish } from './p4-product-polish.js';
import { initMobilePremiumUx } from './mobile-premium-ux.js';
import { initConversionMicroUx } from './conversion-micro-ux.js';
import { initPerceivedPerformance } from './perceived-performance.js';

export function initEnterpriseUx() {
  if (typeof document === 'undefined') return;

  initP4ProductPolish();
  initExecutivePolish();
  initMobilePremiumUx();
  initConversionMicroUx();
  initPerceivedPerformance();

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
  setTimeout(markReady, 1800);

  document.addEventListener('routeChanged', () => {
    document.dispatchEvent(new CustomEvent('ib:refresh-icons'));
  });
}
