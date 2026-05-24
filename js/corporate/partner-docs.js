import { PARTNER_FUNNEL_EVENTS, trackPartnerFunnel } from '../features/partner/partner-platform.js';

document.addEventListener('DOMContentLoaded', () => {
  trackPartnerFunnel(PARTNER_FUNNEL_EVENTS.DOCS_VIEW, { path: '/partner-docs.html' });
});
