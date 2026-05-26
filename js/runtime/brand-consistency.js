/**
 * P4.6 — Runtime brand alignment (CTA labels, trust microcopy).
 */
import { BRAND_VOICE } from '../core/brand-voice.js';

const PRIMARY_AUTO_SELECTORS =
  '.nav-cta-auto, [data-analytics-placement="methodology_teaser"], [data-analytics-placement="partner_enterprise"], [data-analytics-placement="pricing_free"], [data-analytics-placement="premium_hero"], [data-analytics-placement="premium_footer"], [data-analytics-placement="ai_engine"] .btn-outline, [data-analytics-placement="sample_preview"], [data-analytics-placement="footer"]';

export function initBrandConsistency() {
  if (typeof document === 'undefined') return;

  applyPrimaryAutoCtas();
  applySecondaryCtas();
  normalizeSectionKickers();

  document.addEventListener('routeChanged', () => {
    applyPrimaryAutoCtas();
    applySecondaryCtas();
    normalizeSectionKickers();
  });
}

function applyPrimaryAutoCtas() {
  document.querySelectorAll(PRIMARY_AUTO_SELECTORS).forEach((el) => {
    if (!(el instanceof HTMLAnchorElement) && !(el instanceof HTMLButtonElement)) return;
    if (el.hasAttribute('data-hero-cta-primary') || el.classList.contains('nav-cta-decision')) return;
    const label = el.getAttribute('data-brand-cta') || BRAND_VOICE.cta.primaryAutoLegacy;
    const labelEl = el.querySelector('.growth-exp-label');
    if (labelEl) {
      labelEl.textContent = label;
    } else {
      el.textContent = label;
    }
    el.setAttribute('title', BRAND_VOICE.cta.primaryAutoLegacy);
    el.setAttribute('aria-label', BRAND_VOICE.cta.primaryAutoLegacy);
  });

  const sticky = document.querySelector('.cro-sticky-cta .btn-primary');
  if (sticky instanceof HTMLElement && !sticky.dataset.brandApplied) {
    sticky.textContent = BRAND_VOICE.cta.primaryDecision;
    sticky.dataset.brandApplied = '1';
  }
}

function applySecondaryCtas() {
  document.querySelectorAll('[data-cro-cta-secondary]').forEach((el) => {
    if (el instanceof HTMLElement && !el.dataset.brandSecondary) {
      const label = el.getAttribute('data-brand-cta-secondary') || BRAND_VOICE.cta.methodology;
      if (!el.textContent.includes('Metodoloji')) {
        el.textContent = label;
      }
      el.dataset.brandSecondary = '1';
    }
  });
}

function normalizeSectionKickers() {
  const map = {
    Piyasa: BRAND_VOICE.kickers.options,
    'Canlı deneyim': BRAND_VOICE.kickers.preview,
    Güven: BRAND_VOICE.kickers.trust
  };

  document.querySelectorAll('.section-kicker').forEach((el) => {
    const text = el.textContent.trim();
    if (map[text]) el.textContent = map[text];
  });
}
