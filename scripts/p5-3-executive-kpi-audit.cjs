#!/usr/bin/env node
/**
 * P5.3 — Executive KPI dashboard audit.
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
  'docs/P5_3_EXECUTIVE_KPI_DASHBOARD.md',
  'js/features/metrics/executive-dashboard.js',
  'scripts/executive-kpi-snapshot.cjs'
];

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) fail(`MISSING: ${rel}`);
}

const execJs = fs.readFileSync(
  path.join(root, 'js/features/metrics/executive-dashboard.js'),
  'utf8'
);
for (const fn of [
  'buildExecutiveDashboard',
  'computeTrafficMetrics',
  'computeConversionMetrics',
  'computePartnerLeadQuality'
]) {
  if (!execJs.includes(fn)) fail(`executive-dashboard must export ${fn}`);
}

const admin = fs.readFileSync(path.join(root, 'js/admin-panel.js'), 'utf8');
if (!admin.includes('loadExecutiveKpis') || !admin.includes('buildExecutiveDashboard')) {
  fail('admin-panel must load executive CEO dashboard');
}
const executiveKpiBlock =
  admin.match(/async function loadExecutiveKpis\(\)[\s\S]*?^async function/m)?.[0] ?? '';
if (!executiveKpiBlock.length) {
  fail('loadExecutiveKpis block must exist in admin-panel');
}
if (!executiveKpiBlock.includes('Wizard tamamlama') || !executiveKpiBlock.includes('ARPU')) {
  fail('admin executive UI must show wizard + ARPU KPIs');
}

const scale = fs.readFileSync(path.join(root, 'js/core/scale-limits.js'), 'utf8');
if (!scale.includes('executiveWindowDays')) {
  fail('scale-limits must define executiveWindowDays');
}

const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
if (!pkg.includes('metrics:executive')) fail('package.json must define metrics:executive');

if (failed) process.exit(1);
console.log('P5.3 executive KPI audit passed.');
