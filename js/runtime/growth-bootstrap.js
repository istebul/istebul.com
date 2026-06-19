/**
 * Growth bootstrap — capture ref, paid click ids, persist referral.
 */
import { storeReferralCode } from '../features/growth/growth-engine.js';
import { trackReferralLinkClick } from '../features/growth/referral-client.js';
import { trackLandingVisit } from '../features/growth/growth-funnel.js';
import { capturePaidAttribution } from '../features/growth/paid-acquisition.js';
import { analytics } from '../core/analytics.js';

function captureGrowthParams() {
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref') || params.get('referral');
  const recovery = params.get('recover');
  const utmMedium = params.get('utm_medium');

  if (ref) {
    storeReferralCode(ref);
    if (analytics.hasConsent()) {
      analytics.track('growth_referral_land', { ref }, {
        category: 'growth',
        funnel: 'referral',
        funnel_step: 'land'
      });
      trackReferralLinkClick(ref).catch(() => {});
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

  if (utmMedium === 'lifecycle' && analytics.hasConsent()) {
    analytics.track('growth_email_click', {
      utm_source: params.get('utm_source'),
      utm_campaign: params.get('utm_campaign'),
      utm_content: params.get('utm_content')
    }, {
      category: 'growth',
      funnel: 'lifecycle_email',
      funnel_step: 'email_click'
    });
  }

  const campaign = params.get('utm_campaign') || '';
  const isReactivation =
    campaign.includes('reactivation') ||
    campaign === 'reactivation_ltv' ||
    campaign === 'habit_loop_reminder' ||
    campaign === 'saved_decision_revisit' ||
    campaign === 'inactive_users' ||
    campaign === 'retention_campaigns' ||
    params.get('utm_medium') === 'reactivation';

  if (isReactivation && analytics.hasConsent()) {
    analytics.track('retention_reactivation_land', {
      campaign,
      utm_content: params.get('utm_content'),
      decision_id: params.get('decision_id') || params.get('saved_decision')
    }, {
      category: 'growth',
      funnel: 'retention',
      funnel_step: 'reactivation_bootstrap'
    });
  }
}

captureGrowthParams();
capturePaidAttribution();

if (typeof document !== 'undefined') {
  document.addEventListener('cookieConsentAccepted', () => {
    captureGrowthParams();
    trackLandingVisit();
  });
}
