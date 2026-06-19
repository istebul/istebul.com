#!/usr/bin/env node
/**
 * P4.3 mobile premium UX audit.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const mustExist = [
  'css/p4-3-mobile-premium.css',
  'js/runtime/mobile-premium-ux.js',
  'docs/P4_3_MOBILE_UX.md'
];

const mustContain = [
  ['css/style.css', 'mobile-perfection.css'],
  ['js/runtime/enterprise-ux.js', 'initMobilePremiumUx'],
  ['js/auto/auto-app.js', 'initMobilePremiumUx'],
  ['scripts/production-build.cjs', 'p4-3-mobile-premium.css'],
  ['css/p4-3-mobile-premium.css', 'ib-keyboard-open'],
  ['css/p4-3-mobile-premium.css', 'safe-area-inset-bottom'],
  ['css/p4-3-mobile-premium.css', 'scroll-padding-bottom'],
  ['js/runtime/mobile-premium-ux.js', 'visualViewport'],
  ['css/mobile-perfection.css', '--ib-touch-lg']
];

let failed = false;

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) {
    console.error('MISSING:', rel);
    failed = true;
  }
}

for (const [rel, needle] of mustContain) {
  if (!read(rel).includes(needle)) {
    console.error('ASSERT FAILED:', rel, 'must contain', needle);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log('P4.3 mobile UX audit passed.');
