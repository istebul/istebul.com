#!/usr/bin/env node
/**
 * P26 — Strategic partnership roadmap audit.
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
  'data/ops/strategic-partnership-roadmap.json',
  'docs/STRATEGIC_PARTNERSHIP_ROADMAP.md',
  'js/features/ops/strategic-partnership-roadmap.js',
  'js/features/ops/strategic-partnership-views.js',
  'scripts/strategic-partnership-snapshot.cjs',
  'data/partner/partner-ops.json'
];

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) fail(`MISSING: ${rel}`);
}

const config = JSON.parse(
  fs.readFileSync(path.join(root, 'data/ops/strategic-partnership-roadmap.json'), 'utf8')
);
if (config.version !== 'p26.0') fail('must be p26.0');
if ((config.partnerTypes || []).length !== 7) fail('need 7 partner types');

const typeIds = [
  'bayiler',
  'finans_sirketleri',
  'bankalar',
  'sigorta',
  'marketplace',
  'api_providers',
  'affiliate_networks'
];
for (const id of typeIds) {
  if (!config.partnerTypes.find((t) => t.id === id)) fail(`missing type ${id}`);
}

const doc = fs.readFileSync(path.join(root, 'docs/STRATEGIC_PARTNERSHIP_ROADMAP.md'), 'utf8');
for (const token of [
  'bankalar',
  'distribution',
  'monetization',
  'affiliate',
  'API providers',
  'Bayiler'
]) {
  if (!doc.includes(token)) fail(`doc missing: ${token}`);
}

const adminHtml = fs.readFileSync(path.join(root, 'admin-panel.html'), 'utf8');
if (!adminHtml.includes('strategic-partnerships')) fail('admin needs strategic-partnerships page');

const adminJs = fs.readFileSync(path.join(root, 'js/admin-panel.js'), 'utf8');
if (!adminJs.includes('loadStrategicPartnerships')) fail('admin needs loadStrategicPartnerships');

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!pkg.scripts['metrics:partnerships:roadmap']) fail('need metrics:partnerships:roadmap');
if (!pkg.scripts.test?.includes('p26-strategic-partnership-audit')) {
  fail('test must include p26 audit');
}

if (failed) process.exit(1);
console.log('P26 strategic partnership roadmap audit OK');
