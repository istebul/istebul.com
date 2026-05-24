#!/usr/bin/env node
/**
 * P4.4 conversion micro-UX audit.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const mustExist = [
  'js/core/conversion-copy.js',
  'js/runtime/conversion-micro-ux.js',
  'css/conversion-micro-ux.css',
  'docs/P4_4_CONVERSION_UX.md'
];

const mustContain = [
  ['css/style.css', 'conversion-micro-ux.css'],
  ['js/runtime/enterprise-ux.js', 'initConversionMicroUx'],
  ['js/features/auth/auth.js', 'conversion-copy.js'],
  ['js/app.js', 'CONVERSION_COPY'],
  ['js/core/conversion-copy.js', 'Analizini kaydet ve devam et'],
  ['js/runtime/conversion-micro-ux.js', 'ib-conversion-trust-line'],
  ['index.html', 'Analizini kaydet'],
  ['js/auto/auto-app.js', 'initConversionMicroUx'],
  ['js/runtime/corporate-ux.js', 'initConversionMicroUx'],
  ['scripts/production-build.cjs', 'conversion-micro-ux.css']
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
console.log('P4.4 conversion UX audit passed.');
