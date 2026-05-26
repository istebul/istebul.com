/**
 * Ana sayfa fiyatlandırma — kompakt kart özeti; tam planlar /planlar'da.
 */
import { PLANS } from './plans.js';

export function renderHomePricingTeaser() {
  const pro = PLANS.pro;
  const monthly = pro.billing.monthly;

  return `
    <div class="ib-pricing-home-teaser" data-pricing-home-teaser>
      <article class="revenue-plan-card ib-pricing-teaser-card ib-pricing-teaser-card--free">
        <div class="revenue-plan-card-head">
          <span class="revenue-plan-badge">Bireysel</span>
          <h3 class="revenue-plan-title">${PLANS.free.name}</h3>
          <p class="revenue-plan-price">${PLANS.free.priceLabel}</p>
        </div>
        <p class="revenue-plan-desc">TCO özeti · 2 karşılaştırma · AI gerekçe (saatlik kota)</p>
        <div class="revenue-plan-card-foot">
          <a href="/auto/" class="btn btn-outline btn-block" data-analytics-cta="cta_primary_auto" data-analytics-placement="pricing_teaser_free">Ücretsiz analiz</a>
        </div>
      </article>
      <article class="revenue-plan-card revenue-plan-card--featured ib-pricing-teaser-card ib-pricing-teaser-card--pro">
        <div class="revenue-plan-card-head">
          <span class="revenue-plan-badge revenue-plan-badge--popular">En popüler</span>
          <span class="revenue-trial-badge">${pro.trialLabel}</span>
          <h3 class="revenue-plan-title">${pro.name}</h3>
          <p class="revenue-plan-price">${monthly.priceDisplay}<small>${monthly.periodLabel}</small></p>
        </div>
        <p class="revenue-plan-desc">Sınırsız karşılaştırma · premium rapor · sınırsız AI rafine</p>
        <div class="revenue-plan-card-foot">
          <button type="button" class="btn btn-primary btn-block" data-upgrade-checkout data-billing="monthly" data-trial="1" data-analytics-cta="cta_primary_checkout" data-analytics-placement="pricing_teaser_pro">${pro.trialLabel}</button>
          <a href="/planlar" class="btn btn-ghost btn-sm" data-native-route>Tüm planları karşılaştır</a>
        </div>
      </article>
    </div>`;
}
