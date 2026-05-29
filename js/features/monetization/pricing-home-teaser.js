/**
 * Ana sayfa fiyatlandırma — Billing V1 grid (Free / Pro / Partner).
 */
import { renderBillingV1PricingGrid } from '../billing/billing-v1-pricing.js';
import { revenueManager } from './revenue-manager.js';

export function renderHomePricingTeaser() {
  return `
    <div class="ib-pricing-home-teaser" data-pricing-home-teaser>
      ${renderBillingV1PricingGrid({
        stripeReady: true,
        trialEligible: revenueManager.trialEligible
      })}
    </div>`;
}
