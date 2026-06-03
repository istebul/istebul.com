#!/usr/bin/env node
/**
 * Analytics & measurement deploy readiness — static contract audit.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let failed = false;

const fail = (msg) => {
  console.error(msg);
  failed = true;
};

const mustExist = [
  'supabase/migrations/20260602_analytics_internal_traffic.sql',
  'supabase/functions/_shared/analytics-traffic.ts',
  'supabase/functions/analytics-ingest/index.ts',
  'supabase/functions/admin-action/index.ts',
  'js/core/analytics.js',
  'js/core/analytics-internal.js',
  'js/core/third-party-analytics.js',
  'js/platform/site-analytics.js',
  'js/runtime/site-analytics-boot.js',
  'js/admin/platform-site-analytics-dashboard.js',
  'js/admin/analytics-traffic-filters.js',
  'functions/api/analytics-ingest.js',
  'functions/api/_shared/analytics-ingest-normalize.js',
  'functions/analytics-ingest.js'
];

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) fail(`MISSING: ${rel}`);
}

const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (!indexHtml.includes('homepage.bundle.css')) {
  fail('index.html must link css/bundles/homepage.bundle.css');
}

const kaskoHtml = fs.readFileSync(path.join(root, 'kasko/index.html'), 'utf8');
if (
  !kaskoHtml.includes('vertical-decision.bundle.css') &&
  !kaskoHtml.includes('vertical-shared.bundle.css')
) {
  fail('kasko/index.html must link vertical-decision.bundle.css or vertical-shared.bundle.css');
}
if (!kaskoHtml.includes('kasko-app.js')) {
  fail('kasko/index.html must load js/kasko/kasko-app.js');
}

const ingest = fs.readFileSync(
  path.join(root, 'supabase/functions/analytics-ingest/index.ts'),
  'utf8'
);
if (!ingest.includes('classifyAnalyticsTraffic')) {
  fail('analytics-ingest must call classifyAnalyticsTraffic');
}

const traffic = fs.readFileSync(
  path.join(root, 'supabase/functions/_shared/analytics-traffic.ts'),
  'utf8'
);
if (!traffic.includes('ANALYTICS_HASH_SALT')) fail('analytics-traffic must reference ANALYTICS_HASH_SALT');

const adminAction = fs.readFileSync(
  path.join(root, 'supabase/functions/admin-action/index.ts'),
  'utf8'
);
for (const action of [
  'list_analytics_exclusions',
  'add_analytics_ip_exclusion',
  'delete_analytics_exclusion'
]) {
  if (!adminAction.includes(`"${action}"`)) fail(`admin-action missing ${action}`);
}

const dashboard = fs.readFileSync(
  path.join(root, 'js/admin/platform-site-analytics-dashboard.js'),
  'utf8'
);
if (!dashboard.includes('buildPagePathRows')) fail('platform dashboard missing buildPagePathRows');
if (!dashboard.includes('buildPagePathDetail')) fail('platform dashboard missing buildPagePathDetail');

const homepageBundle = path.join(root, 'css/bundles/homepage.bundle.css');
if (!fs.existsSync(homepageBundle)) fail('css/bundles/homepage.bundle.css missing — run generate:css-bundles');

const analyticsApi = fs.readFileSync(path.join(root, 'functions/api/analytics-ingest.js'), 'utf8');
if (!analyticsApi.includes('onRequestPost')) fail('functions/api/analytics-ingest.js missing onRequestPost');
if (!analyticsApi.includes('onRequestOptions')) {
  fail('functions/api/analytics-ingest.js missing onRequestOptions');
}
if (!analyticsApi.includes('SUPABASE_SERVICE_ROLE_KEY')) {
  fail('functions/api/analytics-ingest.js must use SUPABASE_SERVICE_ROLE_KEY');
}

const analyticsClient = fs.readFileSync(path.join(root, 'js/core/analytics.js'), 'utf8');
if (!analyticsClient.includes('/api/analytics-ingest')) {
  fail('js/core/analytics.js must POST to /api/analytics-ingest');
}

const thirdParty = fs.readFileSync(path.join(root, 'js/core/third-party-analytics.js'), 'utf8');
if (!thirdParty.includes('loadClarity')) fail('third-party-analytics missing loadClarity');
if (!thirdParty.includes('CLARITY_PROJECT_ID')) {
  fail('third-party-analytics must read CLARITY_PROJECT_ID');
}
if (!dashboard.includes('exportPlatformAnalyticsCsv')) {
  fail('platform dashboard missing CSV export');
}
if (!dashboard.includes('renderPlatformAnalyticsEmptyGuide')) {
  fail('platform dashboard missing empty guide');
}

const headers = fs.readFileSync(path.join(root, '_headers'), 'utf8');
if (!headers.includes('static.cloudflareinsights.com')) {
  fail('_headers CSP must allow Cloudflare Web Analytics');
}
if (!headers.includes('www.clarity.ms')) {
  fail('_headers CSP must allow Microsoft Clarity (www.clarity.ms)');
}
if (!headers.includes('*.clarity.ms')) {
  fail('_headers CSP connect-src must allow https://*.clarity.ms');
}
if (!headers.includes('worker-src')) {
  fail('_headers CSP must include worker-src for service worker');
}
if (!headers.includes('https://www.istebul.com')) {
  fail('_headers CSP must allow explicit www.istebul.com origins');
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!pkg.scripts['audit:analytics']) fail('package.json must define audit:analytics script');

if (failed) process.exit(1);
console.log('analytics-deploy-readiness-audit: OK');
