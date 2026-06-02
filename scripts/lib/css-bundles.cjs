/**
 * CSS bundle manifests — edit here; run `node scripts/generate-css-bundles.cjs`.
 * Bundles are built with esbuild in production (see css-build.cjs).
 */
const HOMEPAGE_EXTENSION = [
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
  'css/perf-home-v1.css'
];

/** Design system + readability for vertical decision pages (replaces 3–4 link tags). */
const VERTICAL_DECISION = [
  'css/layout-guard.css',
  'css/enterprise-card-readability.css',
  'css/istebul-design-system-v4.css',
  'css/vertical-header-nav-v1.css',
  'css/rtl.css'
];

/** Lightweight shared polish for corporate / coming-soon pages. */
const VERTICAL_SHARED = [
  'css/enterprise-card-readability.css',
  'css/enterprise-remediation.css'
];

const BUNDLES = {
  'css/bundles/homepage.bundle.css': HOMEPAGE_EXTENSION,
  'css/bundles/vertical-decision.bundle.css': VERTICAL_DECISION,
  'css/bundles/vertical-shared.bundle.css': VERTICAL_SHARED
};

module.exports = { BUNDLES, HOMEPAGE_EXTENSION, VERTICAL_DECISION, VERTICAL_SHARED };
