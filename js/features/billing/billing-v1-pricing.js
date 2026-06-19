/**
 * Billing V1 — Free / Pro / Partner pricing grid (ana sayfa & planlar).
 */
import { escapeHtml } from '../../core/security.js';
import { PLANS } from '../monetization/plans.js';

/**
 * @param {object} [opts]
 * @param {boolean} [opts.paymentReady]
 * @param {boolean} [opts.stripeReady] @deprecated use paymentReady
 * @param {boolean} [opts.trialEligible]
 */
export function renderBillingV1PricingGrid(opts = {}) {
  const esc = escapeHtml;
  const paymentReady =
    opts.paymentReady !== false && opts.stripeReady !== false;
  const trialEligible = opts.trialEligible !== false;
  const free = PLANS.free;
  const pro = PLANS.pro;
  const ent = PLANS.enterprise;
  const monthly = pro.billing.monthly;

  const proCta = paymentReady
    ? `<button type="button" class="btn btn-primary btn-block billing-v1-cta-pro" data-payment-product="pro_monthly" data-analytics-cta="cta_primary_checkout" data-analytics-placement="billing_v1_pro">Pro'ya geç</button>`
    : `<a href="/planlar" class="btn btn-primary btn-block" data-native-route>Erken erişim — Planlar</a>`;

  return `
    <div class="billing-v1-pricing-grid" data-billing-v1-pricing role="list" aria-label="Üyelik planları">
      <article class="billing-v1-plan-card" role="listitem">
        <span class="billing-v1-plan-kicker">Free</span>
        <h3 class="billing-v1-plan-name">${esc(free.name)}</h3>
        <p class="billing-v1-plan-price">${esc(free.priceLabel)}</p>
        <p class="billing-v1-plan-desc">${esc(free.description)}</p>
        <ul class="billing-v1-plan-features">
          ${free.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}
        </ul>
        <a href="/karar-asistani/" class="btn btn-outline btn-block">Ön değerlendirmeye başla</a>
      </article>

      <article class="billing-v1-plan-card billing-v1-plan-card--pro" role="listitem">
        <span class="billing-v1-plan-kicker billing-v1-plan-kicker--pro">Pro</span>
        ${trialEligible && paymentReady ? `<span class="billing-v1-trial">${esc(pro.trialLabel)}</span>` : ''}
        <h3 class="billing-v1-plan-name">${esc(pro.name)}</h3>
        <p class="billing-v1-plan-price">${esc(monthly.priceDisplay)}<small>${esc(monthly.periodLabel)}</small></p>
        <p class="billing-v1-plan-desc">${esc(pro.description)}</p>
        <ul class="billing-v1-plan-features">
          ${pro.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}
        </ul>
        ${proCta}
        <a href="/planlar" class="btn btn-ghost btn-sm btn-block" data-native-route>Plan detayları</a>
      </article>

      <article class="billing-v1-plan-card billing-v1-plan-card--partner" role="listitem">
        <span class="billing-v1-plan-kicker">Partner / Enterprise</span>
        <h3 class="billing-v1-plan-name">${esc(ent.name)}</h3>
        <p class="billing-v1-plan-price">${esc(ent.priceLabel)}</p>
        <p class="billing-v1-plan-desc">${esc(ent.description)}</p>
        <ul class="billing-v1-plan-features">
          ${ent.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}
        </ul>
        <a href="${esc(ent.contactHref)}" class="btn btn-outline btn-block">${esc(ent.cta)}</a>
        <a href="/partner-olun.html" class="btn btn-ghost btn-sm btn-block">Partner programı</a>
      </article>
    </div>`;
}
