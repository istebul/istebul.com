import { initExecutivePolish } from './executive-polish.js';
import { initP4ProductPolish } from './p4-product-polish.js';

/** Standalone corporate / partner / moat pages (no SPA bundle). */
export function initCorporateUx() {
  initP4ProductPolish();
  initExecutivePolish();
}
