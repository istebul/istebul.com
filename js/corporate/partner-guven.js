import { PARTNER_FUNNEL_EVENTS, trackPartnerFunnel } from '../features/partner/partner-platform.js';
import {
  PARTNER_TRUST_NAV,
  renderTrustCenterHtml,
  escapeHtml
} from '../features/partner/partner-trust.js';

function mountNav() {
  const list = document.getElementById('partner-trust-nav-list');
  if (!list) return;
  list.innerHTML = PARTNER_TRUST_NAV.map(
    (item) => `<li><a href="#${escapeHtml(item.id)}">${escapeHtml(item.label)}</a></li>`
  ).join('');
}

function mountContent() {
  const root = document.getElementById('partner-trust-root');
  if (root) root.innerHTML = renderTrustCenterHtml();
}

document.addEventListener('DOMContentLoaded', () => {
  trackPartnerFunnel(PARTNER_FUNNEL_EVENTS.TRUST_VIEW, { path: '/partner-guven.html' });
  mountNav();
  mountContent();
});
