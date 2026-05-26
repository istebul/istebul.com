#!/usr/bin/env node
/**
 * P11-exit — Acquisition / exit optionality audit (distinct from P11 customer-ops).
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
  'data/ops/acquisition-exit-optionality.json',
  'docs/ACQUISITION_EXIT_OPTIONALITY.md',
  'docs/investor/EXIT_OPTIONALITY_REPORT.md',
  'docs/exit-optionality-report.md',
  'metrics/exit-optionality.js',
  'js/features/ops/acquisition-exit-optionality.js',
  'js/features/ops/acquisition-exit-views.js',
  'scripts/acquisition-exit-snapshot.cjs',
  'data/investor/investor-readiness.json',
  'docs/investor/DATA_ROOM_INDEX.md'
];

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) fail(`MISSING: ${rel}`);
}

const config = JSON.parse(
  fs.readFileSync(path.join(root, 'data/ops/acquisition-exit-optionality.json'), 'utf8')
);
if (config.version !== 'p11-exit.0') fail('must be p11-exit.0');
if ((config.scenarios || []).length !== 3) fail('need 3 scenarios');
for (const id of ['bootstrap', 'seed', 'strategic_acquisition']) {
  if (!config.scenarios.find((s) => s.id === id)) fail(`missing scenario ${id}`);
}
if ((config.strategicBuyers || []).length < 5) fail('need strategic buyers');

const doc = fs.readFileSync(path.join(root, 'docs/ACQUISITION_EXIT_OPTIONALITY.md'), 'utf8');
for (const token of [
  'bootstrap',
  'seed',
  'strategic acquisition',
  '90 günlük',
  'data room',
  'Sahibinden',
  'valuation'
]) {
  if (!doc.includes(token)) fail(`ACQUISITION_EXIT_OPTIONALITY missing: ${token}`);
}

const adminHtml = fs.readFileSync(path.join(root, 'admin-panel.html'), 'utf8');
if (!adminHtml.includes('acquisition-exit')) fail('admin needs acquisition-exit page');

const adminJs = fs.readFileSync(path.join(root, 'js/admin-panel.js'), 'utf8');
if (!adminJs.includes('loadAcquisitionExit')) fail('admin needs loadAcquisitionExit');
if (!adminJs.includes('computeExitOptionalityMetrics')) fail('admin needs founder exit metrics');
const views = fs.readFileSync(path.join(root, 'js/features/ops/acquisition-exit-views.js'), 'utf8');
if (!views.includes('renderFounderExitMetrics')) fail('acquisition-exit-views needs founder metrics');

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!pkg.scripts['metrics:exit:optionality']) fail('need metrics:exit:optionality');
if (!pkg.scripts.test?.includes('p11-exit-optionality-audit')) {
  fail('test must include p11-exit-optionality-audit');
}

if (failed) process.exit(1);
console.log('P11 exit optionality audit OK');
