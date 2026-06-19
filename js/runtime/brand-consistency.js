/**
 * P4.6 — Runtime brand alignment (CTA labels, trust microcopy).
 */
import { BRAND_VOICE } from '../core/brand-voice.js';

const DECISION_ENTRY_HREF = '/karar-asistani/';

const DECISION_ENTRY_SELECTORS =
  '[data-analytics-placement="methodology_teaser"], [data-analytics-placement="pricing_free"], [data-analytics-placement="pricing_static_free"], [data-analytics-placement="pricing_dynamic_free"], [data-analytics-placement="pricing_mid"], [data-analytics-placement="premium_footer"], [data-analytics-placement="planlar_footer"], [data-analytics-placement="metodoloji_trust"], [data-analytics-placement="footer"], [data-analytics-placement="nav_mobile"]';

const AUTO_CTA_SELECTORS =
  '.nav-cta-auto, [data-analytics-placement="partner_enterprise"], [data-analytics-placement="ai_engine"] .btn-outline, [data-analytics-placement="sample_preview"], [data-analytics-placement="home_auto_bridge"]';

export function initBrandConsistency() {
  if (typeof document === 'undefined') return;

  applyDecisionEntryCtas();
  applyAutoCtas();
  applySecondaryCtas();
  normalizeSectionKickers();

  document.addEventListener('routeChanged', () => {
    applyDecisionEntryCtas();
    applyAutoCtas();
    applySecondaryCtas();
    normalizeSectionKickers();
  });
}

function applyLabel(el, label) {
  const labelEl = el.querySelector('.growth-exp-label');
  if (labelEl) {
    labelEl.textContent = label;
  } else {
    el.textContent = label;
  }
  el.setAttribute('title', label);
  el.setAttribute('aria-label', label);
}

function applyDecisionEntryCtas() {
  document.querySelectorAll(DECISION_ENTRY_SELECTORS).forEach((el) => {
    if (!(el instanceof HTMLAnchorElement) && !(el instanceof HTMLButtonElement)) return;
    if (el.hasAttribute('data-hero-cta-primary') || el.classList.contains('nav-cta-decision')) return;
    const label = el.getAttribute('data-brand-cta') || BRAND_VOICE.cta.primaryDecisionFree;
    applyLabel(el, label);
    if (el instanceof HTMLAnchorElement) {
      el.href = DECISION_ENTRY_HREF;
    }
  });
}

function applyAutoCtas() {
  document.querySelectorAll(AUTO_CTA_SELECTORS).forEach((el) => {
    if (!(el instanceof HTMLAnchorElement) && !(el instanceof HTMLButtonElement)) return;
    const label = el.getAttribute('data-brand-cta') || BRAND_VOICE.cta.primaryAutoLegacy;
    applyLabel(el, label);
    if (el instanceof HTMLAnchorElement) {
      el.href = '/auto/';
    }
    el.setAttribute('title', label);
    el.setAttribute('aria-label', label);
  });
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
