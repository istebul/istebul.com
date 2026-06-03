#!/usr/bin/env node
/**
 * Google Search Console / index readiness — static checks before & after deploy.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let failed = 0;
const fail = (msg) => {
  console.error('gsc-index:', msg);
  failed = 1;
};

const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sigorta = fs.readFileSync(path.join(root, 'sigorta/index.html'), 'utf8');

if (!robots.includes('Sitemap: https://www.istebul.com/sitemap.xml')) {
  fail('robots.txt must declare www sitemap');
}

for (const loc of [
  'https://www.istebul.com/',
  'https://www.istebul.com/sigorta/',
  'https://www.istebul.com/auto/',
  'https://www.istebul.com/konut/'
]) {
  if (!sitemap.includes(loc)) fail(`sitemap missing ${loc}`);
}

if (!sitemap.includes('<lastmod>')) fail('sitemap should include lastmod');

if (/noindex/i.test(sigorta.match(/<head[\s\S]*?<\/head>/i)?.[0] || '')) {
  fail('sigorta/index.html must not noindex');
}

if (!sigorta.includes('application/ld+json')) fail('sigorta needs structured data');
if (!sigorta.includes('BreadcrumbList')) fail('sigorta needs BreadcrumbList schema');

const homeSchemaPath = index.includes('home-graph.json')
  ? path.join(root, 'data/schema/home-graph.json')
  : null;
const homeSchema = homeSchemaPath && fs.existsSync(homeSchemaPath)
  ? fs.readFileSync(homeSchemaPath, 'utf8')
  : index;
if (!homeSchema.includes('ItemList')) fail('homepage needs ItemList schema for categories');
if (!homeSchema.includes('https://www.istebul.com/sigorta/')) {
  fail('homepage schema must link sigorta');
}

if (!index.includes('rel="sitemap"')) fail('index should link sitemap');

const siteSeo = JSON.parse(fs.readFileSync(path.join(root, 'data/seo/site.json'), 'utf8'));
const sigortaEntry = (siteSeo.staticUrls || siteSeo.urls || []).find((u) => u.loc === '/sigorta/');
if (!sigortaEntry || Number(sigortaEntry.priority) < 0.8) {
  fail('data/seo/site.json sigorta priority should be >= 0.8');
}

if (failed) process.exit(1);
console.log('gsc-index-readiness-audit: OK');
