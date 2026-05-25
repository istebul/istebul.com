#!/usr/bin/env node
/**
 * P20 — Company operating system audit.
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
  'data/ops/company-operating-system.json',
  'data/ops/decision-log.json',
  'data/product/feedback-themes.json',
  'docs/COMPANY_OPERATING_SYSTEM.md',
  'docs/templates/DECISION_RECORD_TEMPLATE.md',
  'js/features/ops/company-operating-system.js',
  'js/features/ops/company-operating-views.js',
  'scripts/company-operating-snapshot.cjs'
];

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) fail(`MISSING: ${rel}`);
}

const config = JSON.parse(
  fs.readFileSync(path.join(root, 'data/ops/company-operating-system.json'), 'utf8')
);
if (config.version !== 'p20.0') fail('company-operating-system.json must be p20.0');
for (const key of [
  'weeklyKpiReview',
  'productReviewCadence',
  'growthReviewCadence',
  'salesReviewCadence',
  'incidentReview',
  'roadmapPrioritizationFramework',
  'decisionDocumentation'
]) {
  if (!config[key]) fail(`company-operating-system missing ${key}`);
}

const log = JSON.parse(fs.readFileSync(path.join(root, 'data/ops/decision-log.json'), 'utf8'));
if (!log.records?.length) fail('decision-log needs records');
if (!log.roadmapQueue?.length) fail('decision-log needs roadmapQueue');

const osJs = fs.readFileSync(
  path.join(root, 'js/features/ops/company-operating-system.js'),
  'utf8'
);
for (const fn of ['buildCompanyOperatingSnapshot', 'computeRiceScore']) {
  if (!osJs.includes(fn)) fail(`company-operating-system missing ${fn}`);
}

const adminHtml = fs.readFileSync(path.join(root, 'admin-panel.html'), 'utf8');
if (!adminHtml.includes('company-operating-system')) {
  fail('admin-panel needs company-operating-system page');
}

const adminJs = fs.readFileSync(path.join(root, 'js/admin-panel.js'), 'utf8');
if (!adminJs.includes('loadCompanyOperatingSystem')) {
  fail('admin-panel.js needs loadCompanyOperatingSystem');
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!pkg.scripts['metrics:company:operating']) {
  fail('package.json needs metrics:company:operating');
}
if (!pkg.scripts.test?.includes('p20-company-operating-system-audit')) {
  fail('package.json test must include p20-company-operating-system-audit');
}

const manifest = JSON.parse(
  fs.readFileSync(path.join(root, 'data/ops/automation-manifest.json'), 'utf8')
);
if (!manifest.snapshotScripts?.some((s) => s.npm === 'metrics:company:operating')) {
  fail('automation-manifest must list metrics:company:operating');
}

const doc = fs.readFileSync(path.join(root, 'docs/COMPANY_OPERATING_SYSTEM.md'), 'utf8');
for (const token of ['Weekly KPI', 'RICE', 'Incident', 'Decision', 'Growth review']) {
  if (!doc.includes(token)) fail(`COMPANY_OPERATING_SYSTEM missing: ${token}`);
}

if (failed) process.exit(1);
console.log('P20 company operating system audit OK');
