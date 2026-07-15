#!/usr/bin/env node
/**
 * PR-563 — Platform Home v1 release quality probes (static, no feature work).
 * Usage: node scripts/platform-home-v1-quality-gate.cjs
 * Exit 0 when no critical/high static blockers for home SEO/IA contracts.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const findings = [];

function ok(id, msg) {
  findings.push({ severity: 'pass', id, msg });
}
function find(sev, id, impact, fix) {
  findings.push({ severity: sev, id, impact, fix });
}

if (/<!DOCTYPE html>/i.test(html)) ok('html.doctype', 'DOCTYPE present');
else find('critical', 'html.doctype', 'Invalid HTML root', 'Add DOCTYPE');
if (/<html[^>]*lang="/i.test(html)) ok('html.lang', 'lang attribute present');
else find('high', 'html.lang', 'Missing lang', 'Add lang on <html>');
if (/id="hero-v4-title"/.test(html)) ok('seo.h1', 'H1 contract intact');
else find('critical', 'seo.h1', 'H1 missing/changed', 'Restore hero H1');

const seoChecks = [
  ['seo.canonical', /rel="canonical"[^>]*href="https:\/\/www\.istebul\.com\/"/],
  ['seo.og', /property="og:title"/],
  ['seo.twitter', /name="twitter:card"[^>]*content="summary_large_image"/],
  ['seo.hreflang', /hreflang="x-default"/],
  ['seo.robots', /name="robots"[^>]*content="index, follow/],
  ['seo.schema', /home-graph\.json/]
];
for (const [id, re] of seoChecks) {
  if (re.test(html)) ok(id, 'present');
  else find('high', id, 'SEO contract incomplete', 'Restore meta/schema');
}

if (/rel="icon"[^>]*href="\/favicon\.ico"/.test(html) && fs.existsSync(path.join(root, 'favicon.ico'))) {
  ok('favicon', 'favicon linked + file exists');
} else {
  find('medium', 'favicon', 'Missing favicon', 'Ship favicon.ico');
}

if (/id="platform-shell-home"/.test(html)) ok('platform.shell', 'platform-shell-home mount present');
else find('critical', 'platform.shell', 'Platform home shell missing', 'Restore #platform-shell-home');

for (const c of [
  'cta_decision_hero',
  'cta_decision_nav',
  'cta_decision_footer',
  'cta_decision_sticky',
  'cta_decision_pricing'
]) {
  if (html.includes(`data-analytics-cta="${c}"`)) ok(`analytics.${c}`, 'wired');
  else find('medium', `analytics.${c}`, 'CTA analytics gap', `Add data-analytics-cta=${c}`);
}

if (/href="\/karar-asistani\/"/.test(html)) ok('cta.karar', 'primary CTA href preserved');
else find('critical', 'cta.karar', 'Primary CTA broken', 'Restore /karar-asistani/');

for (const id of ['home', 'landing-faq', 'home-guides-strip', 'how-it-works', 'home-vertical-focus']) {
  if (new RegExp(`id="${id}"`).test(html)) ok(`hash.${id}`, 'target exists');
  else find('high', `hash.${id}`, `Hash #${id} broken`, `Restore id=${id}`);
}

if (/data-footer-ia="platform-v1"/.test(html)) ok('footer.ia', 'platform-v1 IA marker');
else find('high', 'footer.ia', 'Footer IA not platform-shaped', 'Keep PR-562 footer IA');

const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
if (/Sitemap:\s*https:\/\/www\.istebul\.com\/sitemap\.xml/.test(robots)) ok('robots.sitemap', 'robots → sitemap');
else find('high', 'robots.sitemap', 'Sitemap undiscoverable', 'Add Sitemap line');

const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
if (/loc>https:\/\/www\.istebul\.com\/<\/loc>/.test(sitemap)) ok('sitemap.home', 'homepage in sitemap');
else find('high', 'sitemap.home', 'Home missing from sitemap', 'Include / in sitemap');

try {
  JSON.parse(fs.readFileSync(path.join(root, 'data/schema/home-graph.json'), 'utf8'));
  ok('schema.json', 'home-graph.json parses');
} catch {
  find('high', 'schema.json', 'Invalid home schema JSON', 'Fix data/schema/home-graph.json');
}

const redirects = fs.readFileSync(path.join(root, '_redirects'), 'utf8');
const hasSpa = /\/\* \/index\.html 200/.test(redirects);
const has404 =
  fs.existsSync(path.join(root, '404.html')) || fs.existsSync(path.join(root, 'dist', '404.html'));
if (hasSpa && !has404) {
  find(
    'medium',
    'seo.soft404',
    'SPA fallback /* → index.html 200 without dedicated 404.html (Cloudflare soft-200 risk)',
    'Add branded 404.html in a follow-up PR'
  );
}

const dist = path.join(root, 'dist');
if (fs.existsSync(path.join(dist, 'index.html'))) ok('dist.index', 'dist index present');
else find('medium', 'dist.index', 'Build artifact missing in this workspace', 'Run npm run build');

const summary = {
  pass: findings.filter((f) => f.severity === 'pass').length,
  critical: findings.filter((f) => f.severity === 'critical').length,
  high: findings.filter((f) => f.severity === 'high').length,
  medium: findings.filter((f) => f.severity === 'medium').length,
  low: findings.filter((f) => f.severity === 'low').length,
  findings
};

console.log(JSON.stringify(summary, null, 2));
if (summary.critical > 0 || summary.high > 0) {
  console.error('platform-home-v1-quality-gate: BLOCKERS');
  process.exit(1);
}
console.log('platform-home-v1-quality-gate: OK');
process.exit(0);
