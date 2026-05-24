import {
  PARTNER_FUNNEL_EVENTS,
  renderRateCardHtml,
  trackPartnerFunnel
} from '../features/partner/partner-platform.js';

function mountRateCard() {
  const root = document.getElementById('partner-rate-card-root');
  if (root) root.innerHTML = renderRateCardHtml();
}

document.addEventListener('DOMContentLoaded', () => {
  trackPartnerFunnel(PARTNER_FUNNEL_EVENTS.LANDING_VIEW, {
    path: window.location.pathname
  });

  mountRateCard();

  document.querySelectorAll('a[href="/partner-basvuru.html"]').forEach((link) => {
    link.addEventListener('click', () => {
      trackPartnerFunnel(PARTNER_FUNNEL_EVENTS.APPLICATION_START, { source: 'landing_cta' }, { oncePerSession: true });
    });
  });
});
