/**
 * Growth ops bootstrap — experiments, paid capture, retention, CRO hooks.
 */
import {
  initGrowthExperiments,
  refreshGrowthExperiments,
  trackExperimentConversion
} from '../features/growth/growth-experiments.js';
import {
  capturePaidAttribution,
  trackPaidLandingView
} from '../features/growth/paid-acquisition.js';
import { initRetentionEngine } from '../features/growth/retention-engine.js';
import { analytics } from '../core/analytics.js';

export function initGrowthOps() {
  if (typeof window === 'undefined') return;

  capturePaidAttribution();
  trackPaidLandingView();
  initRetentionEngine();

  const runExperiments = () => {
    initGrowthExperiments().catch(() => {});
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runExperiments, { once: true });
  } else {
    runExperiments();
  }

  document.addEventListener('cookieConsentAccepted', () => {
    capturePaidAttribution();
    trackPaidLandingView();
    runExperiments();
  });

  document.addEventListener('ib:pricing-rendered', () => {
    refreshGrowthExperiments().catch(() => {});
  });

  document.addEventListener('ib:wizard-rendered', () => {
    refreshGrowthExperiments().catch(() => {});
  });

  document.addEventListener('click', (event) => {
    if (!analytics.hasConsent()) return;

    const cta = event.target.closest('[data-analytics-cta]');
    if (cta) {
      const ctaId = cta.getAttribute('data-analytics-cta') || '';
      trackExperimentConversion(ctaId);
      if (ctaId.includes('cta_primary_auto')) trackExperimentConversion('hero_cta_click');
      if (ctaId.includes('checkout')) trackExperimentConversion('checkout_start');
    }

    if (event.target.closest('[data-wizard-next]')) {
      trackExperimentConversion('wizard_step_advance');
    }

    if (event.target.closest('#trust .trust-card, [data-cro-trust-headline]')) {
      trackExperimentConversion('trust_block_view');
    }
  }, { capture: true });

  const trustSection = document.getElementById('trust');
  if (trustSection && 'IntersectionObserver' in window) {
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          trackExperimentConversion('trust_block_view');
          obs.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    obs.observe(trustSection);
  }
}
