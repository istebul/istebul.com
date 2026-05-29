#!/usr/bin/env node
/**
 * FINAL ENTERPRISE UX RELEASE — release gate (responsive, a11y, overflow, hero V4).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const mustExist = [
  'css/final-enterprise-release.css',
  'css/hero-v4.css',
  'docs/FINAL_ENTERPRISE_UX_RELEASE.md'
];

const mustContain = [
  ['css/style.css', 'final-enterprise-release.css'],
  ['css/style.css', 'hero-v4.css'],
  ['css/final-enterprise-release.css', 'overflow-wrap: anywhere'],
  ['css/final-enterprise-release.css', 'word-break: break-word'],
  ['css/final-enterprise-release.css', 'box-sizing: border-box'],
  ['css/final-enterprise-release.css', ':focus-visible'],
  ['css/final-enterprise-release.css', '[class*=\'-v2-panel\']'],
  ['css/hero-v4.css', 'ib-hero-v4-categories'],
  ['css/hero-v4.css', 'ib-soon-badge'],
  ['index.html', 'ib-hero-v4'],
  ['index.html', 'hero-v4-title'],
  ['index.html', 'Ücretsiz analiz başlat'],
  ['index.html', 'ib-hero-v4-trust'],
  ['index.html', 'Sigorta'],
  ['index.html', 'Kasko'],
  ['index.html', 'data-preview-title'],
  ['admin-panel.html', 'final-enterprise-release.css'],
  ['admin-panel.html', 'admin-enterprise']
];

let failed = false;

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) {
    console.error('MISSING:', rel);
    failed = true;
  }
}

for (const [rel, needle] of mustContain) {
  const content = read(rel);
  if (!content.includes(needle)) {
    console.error('ASSERT FAILED:', rel, 'must contain', needle);
    failed = true;
  }
}

const index = read('index.html');
if (index.includes('onclick="')) {
  console.error('ASSERT FAILED: index.html should not use inline onclick');
  failed = true;
}

const finalCss = read('css/final-enterprise-release.css');
const overflowRules = ['overflow-x: clip', 'max-width: 100%'];
for (const rule of overflowRules) {
  if (!finalCss.includes(rule)) {
    console.error('OVERFLOW AUDIT FAILED: missing', rule);
    failed = true;
  }
}

if (!finalCss.includes('h1 {') || !finalCss.includes('h2 {')) {
  console.error('READABILITY AUDIT FAILED: heading hierarchy missing');
  failed = true;
}

if (!finalCss.includes('contain: layout')) {
  console.error('CLS AUDIT FAILED: hero contain rule missing');
  failed = true;
}

try {
  require('./accessibility-check.cjs');
} catch (err) {
  console.error('ACCESSIBILITY AUDIT FAILED:', err.message);
  failed = true;
}

if (failed) process.exit(1);
console.log('FINAL ENTERPRISE UX RELEASE audit passed.');
