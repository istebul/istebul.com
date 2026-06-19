#!/usr/bin/env node
/**
 * P22 — International expansion audit check.
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
  'data/ops/international-expansion-audit.json',
  'docs/INTERNATIONAL_EXPANSION_AUDIT.md',
  'js/features/ops/international-expansion-audit.js',
  'js/features/ops/international-expansion-views.js',
  'scripts/international-expansion-snapshot.cjs',
  'data/i18n/locales.json',
  'js/features/monetization/pricing-localization.js',
  'js/platform/locale-registry.js'
];

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) fail(`MISSING: ${rel}`);
}

const config = JSON.parse(
  fs.readFileSync(path.join(root, 'data/ops/international-expansion-audit.json'), 'utf8')
);
if (config.version !== 'p22.0') fail('international-expansion-audit.json must be p22.0');
if ((config.dimensions || []).length < 10) fail('need 10 dimensions');
if ((config.priorityMarkets || []).length < 6) fail('need priority markets');

const doc = fs.readFileSync(path.join(root, 'docs/INTERNATIONAL_EXPANSION_AUDIT.md'), 'utf8');
for (const token of ['Germany', 'i18n', 'domain strategy', 'Wave 1', 'GDPR']) {
  if (!doc.includes(token)) fail(`INTERNATIONAL_EXPANSION_AUDIT missing: ${token}`);
}

const adminHtml = fs.readFileSync(path.join(root, 'admin-panel.html'), 'utf8');
if (!adminHtml.includes('international-expansion')) fail('admin needs international-expansion page');

const adminJs = fs.readFileSync(path.join(root, 'js/admin-panel.js'), 'utf8');
if (!adminJs.includes('loadInternationalExpansion')) fail('admin needs loadInternationalExpansion');

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!pkg.scripts['metrics:international:audit']) {
  fail('package.json needs metrics:international:audit');
}
if (!pkg.scripts.test?.includes('p22-international-expansion-audit')) {
  fail('package.json test must include p22-international-expansion-audit');
}

if (failed) process.exit(1);
console.log('P22 international expansion audit OK');
