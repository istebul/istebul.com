#!/usr/bin/env node
/**
 * P17 — Unit economics model audit.
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
  'data/investor/unit-economics-model.json',
  'js/features/investor/unit-economics-model.js',
  'js/features/investor/unit-economics-views.js',
  'scripts/unit-economics-snapshot.cjs',
  'docs/investor/UNIT_ECONOMICS.md'
];

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) fail(`MISSING: ${rel}`);
}

const modelJs = fs.readFileSync(
  path.join(root, 'js/features/investor/unit-economics-model.js'),
  'utf8'
);
for (const fn of [
  'buildUnitEconomicsModel',
  'computeLtvTry',
  'computeBlendedCacTry',
  'computePaybackMonths',
  'computeGrossMarginPct',
  'computePartnerMarginPct',
  'computeAiCostPerUserTry',
  'computeSupportCostPerUserTry',
  'computeConversionEconomics'
]) {
  if (!modelJs.includes(fn)) fail(`unit-economics-model missing ${fn}`);
}

const admin = fs.readFileSync(path.join(root, 'js/admin-panel.js'), 'utf8');
if (!admin.includes('renderUnitEconomicsPanel')) {
  fail('admin-panel must render unit economics panel');
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!pkg.scripts['metrics:unit-economics']) {
  fail('package.json needs metrics:unit-economics script');
}
if (!pkg.scripts.test?.includes('p17-unit-economics-model-audit')) {
  fail('package.json test must include p17-unit-economics-model-audit');
}

if (failed) process.exit(1);
console.log('P17 unit economics model audit OK');
