import { initCorporateUx } from '../runtime/corporate-ux.js';
import {
  renderProductTierCards,
  renderComparisonTable,
  renderPricingFaq
} from '../features/partner/partner-offers.js';
import { renderObjectionPlaybookHtml } from '../features/sales/partner-objections.js';
import { getPricingTalkTrack } from '../features/sales/partner-pricing-strategy.js';
import { PARTNER_FUNNEL_EVENTS, trackPartnerFunnel } from '../features/partner/partner-platform.js';

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

    <section class="ib-partner-pricing-sales" aria-labelledby="partner-sales-heading">
      <h2 id="partner-sales-heading" class="section-title">Satış ekibi için: itirazlar ve kapanış</h2>
      <p class="text-muted">Şeffaf fiyatlandırma ve karar altyapısı konumlandırması — bağlayıcı liste fiyatı iddiası olmadan.</p>
      <div id="partner-sales-objections-root"></div>
      <div id="partner-sales-talktrack-root"></div>
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

  const objectionsRoot = document.getElementById('partner-sales-objections-root');
  const talkRoot = document.getElementById('partner-sales-talktrack-root');
  if (objectionsRoot) {
    renderObjectionPlaybookHtml({ compact: true }).then((html) => {
      objectionsRoot.innerHTML = html;
      trackPartnerFunnel(PARTNER_FUNNEL_EVENTS.OBJECTION_VIEW, { path: '/partner-planlar.html' });
      objectionsRoot.querySelectorAll('details').forEach((el) => {
        el.addEventListener('toggle', () => {
          if (el.open) {
            trackPartnerFunnel(PARTNER_FUNNEL_EVENTS.OBJECTION_VIEW, {
              objection_id: el.dataset.objectionId
            }, { oncePerSession: false });
          }
        });
      });
    });
  }
  if (talkRoot) {
    const growth = getPricingTalkTrack('growth');
    talkRoot.innerHTML = `
      <aside class="ib-partner-pilot-banner">
        <strong>${growth.headline}</strong>
        <p>${growth.bandLine}</p>
        <p class="text-muted">${growth.objectionHook}</p>
      </aside>`;
  }

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
