/**
 * Growth ops bootstrap — experiments, paid capture, retention, CRO hooks.
 */
import { initGrowthExperiments, trackExperimentConversion } from '../features/growth/growth-experiments.js';
import { capturePaidClickIds } from '../features/growth/paid-growth.js';
import { initRetentionEngine } from '../features/growth/retention-engine.js';
import { analytics } from '../core/analytics.js';

export function initGrowthOps() {
  if (typeof window === 'undefined') return;

  capturePaidClickIds();
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
    capturePaidClickIds();
    runExperiments();
  });

  document.addEventListener('click', (event) => {
    const cta = event.target.closest('[data-analytics-cta]');
    if (!cta || !analytics.hasConsent()) return;
    const ctaId = cta.getAttribute('data-analytics-cta') || '';
    if (ctaId.includes('cta_primary') || ctaId.includes('checkout')) {
      trackExperimentConversion(ctaId);
    }
  }, { capture: true });
}
