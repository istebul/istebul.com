/**
 * Static pricing markup for no-JS / pre-hydration visibility (plan cards).
 */
export function renderStaticPricingFallback() {
    return `
      <div class="ib-pricing-shell ib-pricing-shell--home" data-pricing-static-fallback>
        <div class="ib-pricing-cards-stage">
          <div class="revenue-pricing-grid revenue-pricing-grid--triple revenue-pricing-grid--cards">
            <article class="revenue-plan-card">
              <div class="revenue-plan-card-head">
                <span class="revenue-plan-badge">Bireysel</span>
                <h3 class="revenue-plan-title">Başlangıç</h3>
                <p class="revenue-plan-price">Ücretsiz</p>
              </div>
              <p class="revenue-plan-desc">TCO özeti ve 2 model karşılaştırma — satın alma öncesi yanlış seçim riskini görün</p>
              <ul class="revenue-plan-features">
                <li class="revenue-plan-feature"><span class="revenue-plan-feature-icon" aria-hidden="true">✓</span><span>Ücretsiz TCO özeti</span></li>
                <li class="revenue-plan-feature"><span class="revenue-plan-feature-icon" aria-hidden="true">✓</span><span>2 araç karşılaştırma</span></li>
                <li class="revenue-plan-feature"><span class="revenue-plan-feature-icon" aria-hidden="true">✓</span><span>Şeffaf metodoloji</span></li>
              </ul>
              <div class="revenue-plan-card-foot">
                <a href="/auto/" class="btn btn-outline btn-block" data-analytics-cta="cta_primary_auto" data-analytics-placement="pricing_static_free">TCO analizini başlat</a>
              </div>
            </article>
            <article class="revenue-plan-card revenue-plan-card--featured">
              <div class="revenue-plan-card-head">
                <span class="revenue-plan-badge revenue-plan-badge--popular">En popüler</span>
                <span class="revenue-trial-badge">7 gün risk almadan dene</span>
                <h3 class="revenue-plan-title">isteBul Pro</h3>
                <p class="revenue-plan-price">₺299<small>/ ay</small></p>
              </div>
              <p class="revenue-plan-desc">Tam karar altyapısı: sınırsız TCO, premium rapor, öncelikli eşleşme</p>
              <ul class="revenue-plan-features">
                <li class="revenue-plan-feature"><span class="revenue-plan-feature-icon" aria-hidden="true">✓</span><span>Sınırsız karşılaştırma</span></li>
                <li class="revenue-plan-feature"><span class="revenue-plan-feature-icon" aria-hidden="true">✓</span><span>Premium karar raporu</span></li>
                <li class="revenue-plan-feature"><span class="revenue-plan-feature-icon" aria-hidden="true">✓</span><span>Öncelikli partner eşleşmesi</span></li>
                <li class="revenue-plan-feature"><span class="revenue-plan-feature-icon" aria-hidden="true">✓</span><span>7 gün ücretsiz deneme</span></li>
                <li class="revenue-plan-feature"><span class="revenue-plan-feature-icon" aria-hidden="true">✓</span><span>Stripe güvenli ödeme</span></li>
              </ul>
              <div class="revenue-plan-card-foot">
                <a href="/planlar?checkout=pro" class="btn btn-primary btn-block" data-native-route data-analytics-cta="cta_primary_checkout" data-analytics-placement="pricing_static_pro">7 gün ücretsiz dene</a>
                <p class="revenue-plan-hint revenue-plan-hint--checkout">7 gün deneme · Stripe · istediğiniz zaman iptal</p>
              </div>
            </article>
            <article class="revenue-plan-card revenue-plan-card--enterprise">
              <div class="revenue-plan-card-head">
                <span class="revenue-plan-badge">Kurumsal</span>
                <h3 class="revenue-plan-title">Enterprise</h3>
                <p class="revenue-plan-price">Özel teklif</p>
              </div>
              <p class="revenue-plan-desc">Galeri ağları ve yüksek hacimli partner operasyonları</p>
              <ul class="revenue-plan-features">
                <li class="revenue-plan-feature"><span class="revenue-plan-feature-icon" aria-hidden="true">✓</span><span>Özel SLA ve destek</span></li>
                <li class="revenue-plan-feature"><span class="revenue-plan-feature-icon" aria-hidden="true">✓</span><span>API / webhook entegrasyonu</span></li>
                <li class="revenue-plan-feature"><span class="revenue-plan-feature-icon" aria-hidden="true">✓</span><span>Çoklu kullanıcı yönetimi</span></li>
              </ul>
              <div class="revenue-plan-card-foot">
                <a href="/iletisim.html?konu=enterprise" class="btn btn-outline btn-block">Kurumsal teklif al</a>
              </div>
            </article>
          </div>
        </div>
      </div>
      <p class="revenue-risk-reversal" role="note">
        <span>7 gün ücretsiz deneme</span>
        <span>Stripe ile güvenli ödeme</span>
        <span>İstediğiniz zaman iptal</span>
      </p>`;
}
