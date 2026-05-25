import { initCorporateUx } from '../runtime/corporate-ux.js';
import { initClosingKitPage } from '../features/sales/partner-closing-machine.js';
import { analytics } from '../core/analytics.js';

document.addEventListener('DOMContentLoaded', () => {
  initCorporateUx();
  initClosingKitPage().then(() => {
    if (analytics.hasConsent()) {
      analytics.track(
        'partner_closing_kit_view',
        { path: '/partner-closing-kit.html' },
        { category: 'partner', funnel: 'partner_sales', funnel_step: 'closing_kit' }
      );
    }
  });
});
