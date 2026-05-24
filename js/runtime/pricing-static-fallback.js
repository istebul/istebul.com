/**
 * Static pricing markup for no-JS / pre-hydration visibility (plan cards).
 */
export function renderStaticPricingFallback() {
    return `
      <div class="revenue-pricing-grid revenue-pricing-grid--static" data-pricing-static-fallback>
        <article class="revenue-plan-card">
          <span class="revenue-plan-badge">Bireysel</span>
          <h3>Başlangıç</h3>
          <p class="revenue-plan-price">Ücretsiz</p>
          <p class="revenue-plan-desc">Araç karar analizi özeti ve temel karşılaştırma</p>
          <ul>
            <li>Auto karar analizi (özet)</li>
            <li>2 araç karşılaştırma</li>
            <li>Şeffaf metodoloji özeti</li>
          </ul>
          <a href="/auto/" class="btn btn-outline" data-analytics-cta="cta_primary_auto" data-analytics-placement="pricing_static_free">Ücretsiz analizi başlat</a>
        </article>
        <article class="revenue-plan-card revenue-plan-card--featured">
          <span class="revenue-plan-badge revenue-plan-badge--pro">Önerilen</span>
          <span class="revenue-trial-badge">7 gün ücretsiz deneme</span>
          <h3>isteBul Pro</h3>
          <p class="revenue-plan-price">₺299<small>/ ay</small></p>
          <p class="revenue-plan-desc">Gelişmiş raporlar, sınırsız karşılaştırma ve öncelikli partner eşleşmesi</p>
          <ul>
            <li>Sınırsız karşılaştırma</li>
            <li>Detaylı premium karar raporu</li>
            <li>Öncelikli partner eşleşmesi</li>
          </ul>
          <p class="revenue-plan-hint">Yıllık ₺2.870 (%20 tasarruf) · Stripe ile güvenli ödeme</p>
          <a href="/planlar?checkout=pro" class="btn btn-primary" data-native-route data-analytics-cta="cta_primary_checkout" data-analytics-placement="pricing_static_pro">7 gün ücretsiz dene</a>
        </article>
        <article class="revenue-plan-card revenue-plan-card--enterprise">
          <span class="revenue-plan-badge">Kurumsal</span>
          <h3>Enterprise</h3>
          <p class="revenue-plan-price">Özel teklif</p>
          <p class="revenue-plan-desc">Galeri ağları ve yüksek hacimli partner operasyonları</p>
          <ul>
            <li>Özel SLA ve destek</li>
            <li>API / webhook entegrasyonu</li>
            <li>Çoklu kullanıcı yönetimi</li>
          </ul>
          <a href="/iletisim.html?konu=enterprise" class="btn btn-outline">Kurumsal teklif al</a>
        </article>
      </div>`;
}
