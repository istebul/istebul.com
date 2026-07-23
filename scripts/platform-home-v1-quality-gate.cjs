#!/usr/bin/env node
/**
 * Platform Home / EPIC-002 release quality probes (static, no feature work).
 * Usage: node scripts/platform-home-v1-quality-gate.cjs
 * Exit 0 when no critical/high static blockers for Platform + AI surface contracts.
 */
const fs = require('fs');
const path = require('path');
const {
  collectReleaseContractFailures,
  resolveSitemapArtifact
} = require('./lib/platform-landing-surface-contract.cjs');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const aiHtml = fs.existsSync(path.join(root, 'ai/index.html'))
  ? fs.readFileSync(path.join(root, 'ai/index.html'), 'utf8')
  : '';
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

for (const msg of collectReleaseContractFailures(root)) {
  find('critical', 'release.contract', msg, 'Align Platform `/` + AI `/ai/` + sitemap SoT');
}
if (!findings.some((f) => f.id === 'release.contract' && f.severity !== 'pass')) {
  ok('release.contract', 'Platform + AI + sitemap contract OK');
}

if (/id="platform-landing"/.test(html)) ok('platform.mount', 'platform-landing present');
else find('critical', 'platform.mount', 'Platform Landing missing', 'Restore #platform-landing');

if (/id="hero-v4-title"/.test(aiHtml)) ok('ai.h1', 'AI Landing H1 intact on /ai');
else find('critical', 'ai.h1', 'AI H1 missing on /ai', 'Restore #hero-v4-title on ai/index.html');

const seoChecks = [
  ['seo.canonical', /rel="canonical"[^>]*href="https:\/\/www\.istebul\.com\/"/],
  ['seo.og', /property="og:title"/],
  ['seo.twitter', /name="twitter:card"[^>]*content="summary_large_image"/],
  ['seo.hreflang', /hreflang="x-default"/],
  ['seo.robots', /name="robots"[^>]*content="index, follow/],
  ['seo.schema', /platform-graph\.json/]
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

if (/href="\/ai\/"/.test(html)) ok('cta.ai', 'Platform links to /ai/');
else find('critical', 'cta.ai', 'Missing /ai/ product link', 'Link İSTEBUL AI from Platform chrome');

if (/href="\/karar-asistani\/"/.test(html) || /href="\/ai\/"/.test(html)) {
  ok('cta.product', 'product CTA path preserved');
} else {
  find('critical', 'cta.product', 'Primary product CTA broken', 'Restore /ai/ or /karar-asistani/');
}

if (/data-footer-ia="platform-v1"/.test(html)) ok('footer.ia', 'platform-v1 IA marker');
else find('high', 'footer.ia', 'Footer IA not platform-shaped', 'Keep platform footer IA');

const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
if (/Sitemap:\s*https:\/\/www\.istebul\.com\/sitemap\.xml/.test(robots)) ok('robots.sitemap', 'robots → sitemap');
else find('high', 'robots.sitemap', 'Sitemap undiscoverable', 'Add Sitemap line');

const { xml: sitemap } = resolveSitemapArtifact(root);
if (/loc>https:\/\/www\.istebul\.com\/<\/loc>/.test(sitemap)) ok('sitemap.home', 'homepage in sitemap');
else find('high', 'sitemap.home', 'Home missing from sitemap', 'Include / in site.json SoT');
if (/loc>https:\/\/www\.istebul\.com\/ai\/<\/loc>/.test(sitemap)) ok('sitemap.ai', '/ai/ in sitemap');
else find('critical', 'sitemap.ai', '/ai/ missing from sitemap', 'Add /ai/ to data/seo/site.json');

try {
  JSON.parse(fs.readFileSync(path.join(root, 'data/schema/platform-graph.json'), 'utf8'));
  ok('schema.json', 'platform-graph.json parses');
} catch {
  find('high', 'schema.json', 'Invalid platform schema JSON', 'Fix data/schema/platform-graph.json');
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
const blockers = summary.critical + summary.high;
process.exit(blockers > 0 ? 1 : 0);
