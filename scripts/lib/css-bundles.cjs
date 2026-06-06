/**
 * CSS bundle manifests — edit here; run `node scripts/generate-css-bundles.cjs`.
 * Bundles are built with esbuild in production (see css-build.cjs).
 */
const HOMEPAGE_EXTENSION = [
  'css/ib-brand-logo-v1.css',
  'css/home-header-saas-v1.css',
  'css/home-mockup-final-v1.css',
  'css/home-category-cards-premium-v2.css',
  'css/homepage-lean-v1.css',
  'css/home-trust-unified.css',
  'css/homepage-stability-polish.css',
  'css/growth-cro.css',
  'css/growth-retention.css',
  'css/help-center.css',
  'css/user-dashboard.css',
  'css/dashboard-v2.css',
  'css/billing-v1.css',
  'css/payments-ui.css',
  'css/listing-gallery.css',
  'css/enterprise-remediation.css',
  'css/enterprise-card-readability.css',
  'css/home-first-impression.css',
  'css/home-category-compact-v1.css',
  'css/home-newsletter-compact-v1.css',
  'css/home-category-layout-fix-v1.css',
  'css/home-newsletter-fix-critical-v1.css',
  'css/site-social-links-v1.css',
  'css/perf-home-v1.css',
  'css/home-economic-indicators.css'
];

/** Design system + readability for vertical decision pages (replaces 3–4 link tags). */
const VERTICAL_DECISION = [
  'css/layout-guard.css',
  'css/istebul-design-system-v4.css',
  'css/vertical-header-nav-v1.css',
  'css/rtl.css',
  'css/perf-vertical-v1.css',
  'css/vertical-brand-shell-v1.css',
  'css/vertical-nav-more-v1.css',
  'css/corporate-footer-v1.css',
  'css/ib-brand-logo-v1.css',
  /* Last: overrides DS v4 dark-shell rules on light cards */
  'css/enterprise-card-readability.css'
];

/** Lightweight shared polish for corporate / coming-soon pages. */
const VERTICAL_SHARED = [
  'css/enterprise-card-readability.css',
  'css/enterprise-remediation.css'
];

/** Auto page — secondary styles (ib-car.css stays separate for LCP). */
const AUTO_PAGE_EXTENSION = [
  'css/vertical-brand-shell-v1.css',
  'css/vertical-nav-more-v1.css',
  'css/auto-hero-dashboard-v1.css',
  'css/auto-results-v2.css',
  'css/decision-engine-v3.css',
  'css/home-economic-indicators.css',
  'css/auto-shell-unified-v1.css',
  'css/corporate-footer-v1.css',
  'css/auto-final-cta-contrast-v1.css',
  'css/vertical-category-heroes-v1.css',
  'css/site-social-links-v1.css',
  'css/category-guides-hub.css',
  'css/static-cookie-consent-v1.css'
];

/** Konut page — secondary styles (real-estate.css stays separate). */
const KONUT_PAGE_EXTENSION = [
  'css/vertical-brand-shell-v1.css',
  'css/vertical-nav-more-v1.css',
  'css/vertical-category-heroes-v1.css',
  'css/site-social-links-v1.css',
  'css/premium-decision-dashboard.css',
  'css/konut-results-v2.css',
  'css/home-economic-indicators.css',
  'css/konut-header-premium-v1.css',
  'css/konut-wizard-cards-v1.css'
];

const BUNDLES = {
  'css/bundles/homepage.bundle.css': HOMEPAGE_EXTENSION,
  'css/bundles/vertical-decision.bundle.css': VERTICAL_DECISION,
  'css/bundles/vertical-shared.bundle.css': VERTICAL_SHARED,
  'css/bundles/auto-page.bundle.css': AUTO_PAGE_EXTENSION,
  'css/bundles/konut-page.bundle.css': KONUT_PAGE_EXTENSION
};

module.exports = {
  BUNDLES,
  HOMEPAGE_EXTENSION,
  VERTICAL_DECISION,
  VERTICAL_SHARED,
  AUTO_PAGE_EXTENSION,
  KONUT_PAGE_EXTENSION
};
