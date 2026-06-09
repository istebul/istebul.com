#!/usr/bin/env node
/**
 * P4 consistency audit — brand, CTA, wiring across SPA + Auto + corporate.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const mustExist = [
  'css/p4-premium-product.css',
  'js/runtime/p4-product-polish.js',
  'js/runtime/corporate-ux.js',
  'docs/P4_PREMIUM_PRODUCT.md'
];

const mustContain = [
  ['css/style.css', "p4-premium-product.css"],
  ['js/runtime/enterprise-ux.js', 'initP4ProductPolish'],
  ['js/auto/auto-app.js', 'initP4ProductPolish'],
  ['scripts/production-build.cjs', 'p4-premium-product.css'],
  ['index.html', 'Kararını analiz et'],
  ['index.html', 'ib-hero-venture'],
  ['index.html', 'methodology-teaser'],
  ['index.html', 'class="ib-enterprise"'],
  ['css/style.css', 'final-enterprise-release.css'],
  ['auto/index.html', 'ib-auto'],
  ['js/ui/premium-pages.js', 'decision-assistant-form'],
  ['js/ui/premium-pages.js', 'Karar önizlemesi'],
  ['js/corporate/karar-moat.js', 'initCorporateUx'],
  ['karar-moat.html', 'ib-enterprise']
];

let failed = false;

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) {
    console.error('MISSING:', rel);
    failed = true;
  }
}

for (const [rel, needle] of mustContain) {
  const text = read(rel);
  if (!text.includes(needle)) {
    console.error('ASSERT FAILED:', rel, 'must contain', needle);
    failed = true;
  }
}

const partnerPages = [
  'partner-olun.html',
  'partner-planlar.html',
  'partner-guven.html',
  'partner-docs.html',
  'partner-basvuru.html'
];

for (const page of partnerPages) {
  const html = read(page);
  if (!html.includes('style.css')) {
    console.error('Partner page missing style.css:', page);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log('P4 consistency audit passed.');
