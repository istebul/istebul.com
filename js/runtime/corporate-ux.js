import { initExecutivePolish } from './executive-polish.js';
import { initP4ProductPolish } from './p4-product-polish.js';
import { initMobilePremiumUx } from './mobile-premium-ux.js';
import { initConversionMicroUx } from './conversion-micro-ux.js';

/** Standalone corporate / partner / moat pages (no SPA bundle). */
export function initCorporateUx() {
  initP4ProductPolish();
  initExecutivePolish();
  initMobilePremiumUx();
  initConversionMicroUx();
}
