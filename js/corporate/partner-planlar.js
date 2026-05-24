import { initCorporateUx } from '../runtime/corporate-ux.js';
import { PARTNER_FUNNEL_EVENTS, trackPartnerFunnel } from '../features/partner/partner-platform.js';
import {
  renderProductTierCards,
  renderComparisonTable,
  renderPricingFaq
} from '../features/partner/partner-offers.js';

function mountPricingPage() {
  const root = document.getElementById('partner-pricing-root');
  if (!root) return;

  root.innerHTML = `
    <p class="kicker">Partner · Karar altyapısı</p>
    <h1>Skorlu talep — klasik lead gen değil</h1>
    <p class="lead">Tüketici tarafında karar altyapısı; partner tarafında ürünleştirilmiş paketler: lead hacmi, SLA, routing, outcome geri beslemesi. Fiyatlar teklif ile netleşir — şeffaflık amacıyla, bağlayıcı fiyat iddiası yok.</p>

    <section aria-labelledby="partner-tiers-heading">
      <h2 id="partner-tiers-heading" class="section-title">Starter · Growth · Enterprise</h2>
      <div id="partner-offer-cards-root"></div>
    </section>

    <section aria-labelledby="partner-compare-heading" class="ib-partner-pricing-compare">
      <h2 id="partner-compare-heading" class="section-title">Özellik karşılaştırması</h2>
      <div id="partner-comparison-root"></div>
    </section>

    <section aria-labelledby="partner-faq-heading">
      <h2 id="partner-faq-heading" class="section-title">Sık sorulanlar</h2>
      <div id="partner-pricing-faq-root"></div>
    </section>

    <div class="final-cta-card ib-partner-final-cta">
      <p class="kicker">Self-serve</p>
      <h2>Teklif veya başvuru — aynı onboarding akışı</h2>
      <p>Plan seçimi başvuru formunda kaydedilir; teknik onboarding altı adımda tamamlanır.</p>
      <div class="final-cta-actions">
        <a class="btn primary" href="/partner-basvuru.html">Başvuruya git</a>
        <a class="btn secondary" href="/partner-docs.html">API dokümantasyonu</a>
      </div>
    </div>
  `;

  const cardsRoot = document.getElementById('partner-offer-cards-root');
  const compareRoot = document.getElementById('partner-comparison-root');
  const faqRoot = document.getElementById('partner-pricing-faq-root');

  if (cardsRoot) cardsRoot.innerHTML = renderProductTierCards({ origin: window.location.origin });
  if (compareRoot) compareRoot.innerHTML = renderComparisonTable();
  if (faqRoot) faqRoot.innerHTML = renderPricingFaq();

  root.querySelectorAll('a[href*="partner-basvuru"]').forEach((link) => {
    link.addEventListener('click', () => {
      const url = new URL(link.href);
      trackPartnerFunnel(PARTNER_FUNNEL_EVENTS.PRICING_CTA, {
        plan: url.searchParams.get('plan') || '',
        intent: url.searchParams.get('intent') || 'apply',
        path: '/partner-planlar.html'
      }, { oncePerSession: false });
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initCorporateUx();
  trackPartnerFunnel(PARTNER_FUNNEL_EVENTS.PRICING_VIEW, { path: '/partner-planlar.html' });
  mountPricingPage();
});
