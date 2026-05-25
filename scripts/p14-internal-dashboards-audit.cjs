#!/usr/bin/env node
/**
 * P14 — Internal dashboards audit.
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
  'data/dashboards/internal-dashboards.json',
  'docs/INTERNAL_DASHBOARDS.md',
  'css/admin-internal-dashboards.css',
  'js/features/dashboards/internal-dashboard-context.js',
  'js/features/dashboards/internal-dashboard-views.js',
  'js/admin/internal-dashboards.js',
  'scripts/internal-dashboards-snapshot.cjs'
];

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) fail(`MISSING: ${rel}`);
}

const manifest = JSON.parse(
  fs.readFileSync(path.join(root, 'data/dashboards/internal-dashboards.json'), 'utf8')
);
for (const id of ['ceo', 'growth', 'revenue', 'partner_ops', 'support']) {
  if (!manifest.dashboards?.some((d) => d.id === id)) fail(`manifest missing dashboard ${id}`);
}

const adminHtml = fs.readFileSync(path.join(root, 'admin-panel.html'), 'utf8');
for (const page of [
  'dashboard-ceo',
  'dashboard-growth',
  'dashboard-revenue',
  'dashboard-partner-ops',
  'dashboard-support'
]) {
  if (!adminHtml.includes(`page-${page}`)) fail(`admin-panel missing page-${page}`);
}

const adminJs = fs.readFileSync(path.join(root, 'js/admin-panel.js'), 'utf8');
if (!adminJs.includes('loadCompanyDashboard')) fail('admin-panel needs loadCompanyDashboard');

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!pkg.scripts['metrics:dashboards:internal']) {
  fail('package.json missing metrics:dashboards:internal');
}
if (!pkg.scripts.test?.includes('p14-internal-dashboards-audit')) {
  fail('package.json test must include p14-internal-dashboards-audit');
}

if (failed) process.exit(1);
console.log('P14 internal dashboards audit OK');
