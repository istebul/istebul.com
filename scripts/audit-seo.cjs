#!/usr/bin/env node
/**
 * SEO metadata consistency: route meta JSON, sitemap, robots, critical pages.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let failed = false;

function fail(msg) {
  console.error('FAIL:', msg);
  failed = true;
}

const meta = JSON.parse(fs.readFileSync(path.join(root, 'data/route-document-meta.json'), 'utf8'));
const origin = meta.siteOrigin || 'https://www.istebul.com';

if (!/^https:\/\/www\.istebul\.com$/.test(origin)) {
  fail('siteOrigin must be https://www.istebul.com');
}

const home = meta.surfaces?.home;
if (!home?.title || !home.description) fail('home surface missing title/description');
if (home.title && !/AI|karar/i.test(home.title + home.description)) {
  fail('home meta should reflect AI decision platform positioning');
}

const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');

if (!robots.includes('Sitemap: https://www.istebul.com/sitemap.xml')) {
  fail('robots.txt missing canonical sitemap URL');
}

const requiredSitemapPaths = [
  'https://www.istebul.com/',
  'https://www.istebul.com/auto/',
  'https://www.istebul.com/konut/',
  'https://www.istebul.com/tatil/',
  'https://www.istebul.com/finans/',
  'https://www.istebul.com/metodoloji/',
  'https://www.istebul.com/veri-kaynaklari/',
  'https://www.istebul.com/karar-asistani/',
  'https://www.istebul.com/planlar',
  'https://www.istebul.com/ilanlar/',
  'https://www.istebul.com/karsilastir/',
  'https://www.istebul.com/yardim.html',
  'https://www.istebul.com/blog',
  'https://www.istebul.com/duyurular',
  'https://www.istebul.com/kampanyalar',
  'https://www.istebul.com/sigorta/',
  'https://www.istebul.com/kasko/',
  'https://www.istebul.com/rehber/suv-mi-sedan-mi/',
  'https://www.istebul.com/rehber/elektrikli-arac-rehberi/',
  'https://www.istebul.com/rehber/finansman-rehberi/',
  'https://www.istebul.com/rehber/tco-rehberi/',
  'https://www.istebul.com/rehber/ikinci-el-rehberi/'
];

for (const loc of requiredSitemapPaths) {
  if (!sitemap.includes(loc)) fail(`sitemap missing ${loc}`);
}

function checkPage(rel, checks) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    fail(`missing page ${rel}`);
    return;
  }
  const html = fs.readFileSync(full, 'utf8');
  if (!/<title>[^<]+<\/title>/i.test(html)) fail(`${rel}: missing <title>`);
  if (!/meta\s+name=["']description["']/i.test(html)) fail(`${rel}: missing meta description`);
  if (checks.canonical && !html.includes(checks.canonical)) {
    fail(`${rel}: expected canonical ${checks.canonical}`);
  }
  if (/meta\s+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)) {
    fail(`${rel}: accidental noindex`);
  }
  if (checks.aiCopy && !/AI|karar|TCO|maliyet/i.test(html.slice(0, 8000))) {
    fail(`${rel}: weak decision-platform messaging in head/hero region`);
  }
}

checkPage('index.html', {
  canonical: 'https://www.istebul.com/',
  aiCopy: true
});
checkPage('auto/index.html', {
  canonical: 'https://www.istebul.com/auto/',
  aiCopy: true
});
checkPage('konut/index.html', { canonical: 'https://www.istebul.com/konut/' });
checkPage('tatil/index.html', { canonical: 'https://www.istebul.com/tatil/' });
checkPage('finans/index.html', { canonical: 'https://www.istebul.com/finans/' });
checkPage('metodoloji/index.html', { canonical: 'https://www.istebul.com/metodoloji/' });
checkPage('veri-kaynaklari/index.html', { canonical: 'https://www.istebul.com/veri-kaynaklari/' });
checkPage('sigorta/index.html', {
  canonical: 'https://www.istebul.com/sigorta/',
  aiCopy: true
});

if (!sitemap.includes('<lastmod>')) {
  fail('sitemap.xml should include lastmod entries');
}

const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (!indexHtml.includes('application/ld+json')) fail('index.html missing JSON-LD');
if (!indexHtml.includes('ROUTE_BOOTSTRAP_START')) fail('index.html missing route bootstrap');
if (!indexHtml.includes('route-bootstrap-head.js')) {
  fail('index.html must load external route-bootstrap-head.js (CSP-safe)');
}
if (/<script>\s*\/\* ROUTE_BOOTSTRAP_START/i.test(indexHtml)) {
  fail('index.html must not inline route bootstrap script');
}

if (failed) process.exit(1);
console.log('seo-audit: OK');
