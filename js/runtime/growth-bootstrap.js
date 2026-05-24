/**
 * Growth bootstrap — capture ref, paid click ids, persist referral.
 */
import { storeReferralCode } from '../features/growth/growth-engine.js';
import { analytics } from '../core/analytics.js';

function captureGrowthParams() {
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref') || params.get('referral');
  const recovery = params.get('recover');

  if (ref) {
    storeReferralCode(ref);
    if (analytics.hasConsent()) {
      analytics.track('growth_referral_land', { ref }, {
        category: 'growth',
        funnel: 'referral',
        funnel_step: 'land'
      });
    }
  }

  if (recovery) {
    if (analytics.hasConsent()) {
      analytics.track('growth_lead_recovery_click', { campaign: recovery }, {
        category: 'growth',
        funnel: 'abandoned_lead',
        funnel_step: 'recovery_land'
      });
    }
  }
}

captureGrowthParams();

if (typeof document !== 'undefined') {
  document.addEventListener('cookieConsentAccepted', () => {
    captureGrowthParams();
  });
}
