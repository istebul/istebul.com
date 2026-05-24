import { initExecutivePolish } from './executive-polish.js';
import { initP4ProductPolish } from './p4-product-polish.js';
import { initMobilePremiumUx } from './mobile-premium-ux.js';
import { initConversionMicroUx } from './conversion-micro-ux.js';
import { initPerceivedPerformance } from './perceived-performance.js';
import { initBrandConsistency } from './brand-consistency.js';

/** Standalone corporate / partner / moat pages (no SPA bundle). */
export function initCorporateUx() {
  initP4ProductPolish();
  initExecutivePolish();
  initMobilePremiumUx();
  initConversionMicroUx();
  initPerceivedPerformance();
  initBrandConsistency();
}
