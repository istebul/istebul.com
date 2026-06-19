import { mountCorporatePage } from '../runtime/corporate-page-mount.js';
import {
  PARTNER_FUNNEL_EVENTS,
  renderRateCardHtml,
  trackPartnerFunnel
} from '../features/partner/partner-platform.js';
import { renderTrustSummaryGrid } from '../features/partner/partner-trust.js';

function mountRateCard() {
  const root = document.getElementById('partner-rate-card-root');
  if (root) {
    root.innerHTML = renderRateCardHtml({ origin: window.location.origin });
  }
}

mountCorporatePage(() => {
  trackPartnerFunnel(PARTNER_FUNNEL_EVENTS.LANDING_VIEW, {
    path: window.location.pathname
  });

  mountRateCard();

  const trustRoot = document.getElementById('partner-trust-summary-root');
  if (trustRoot) trustRoot.innerHTML = renderTrustSummaryGrid();

  document.querySelectorAll('a[href="/partner-basvuru.html"]').forEach((link) => {
    link.addEventListener('click', () => {
      trackPartnerFunnel(PARTNER_FUNNEL_EVENTS.APPLICATION_START, { source: 'landing_cta' }, { oncePerSession: true });
    });
  });
}, { label: 'Partner programı' });
