/**
 * Ana sayfa fiyatlandırma — Billing V1 grid (Free / Pro / Partner).
 */
import { renderBillingV1PricingGrid } from '../billing/billing-v1-pricing.js';

export function renderHomePricingTeaser(revenueManager) {
  return `
    <div class="ib-pricing-home-teaser" data-pricing-home-teaser>
      ${renderBillingV1PricingGrid({
        stripeReady: true,
        trialEligible: revenueManager?.trialEligible
      })}
    </div>`;
}
