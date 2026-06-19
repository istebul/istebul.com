#!/usr/bin/env node
/**
 * P21 — Hiring architecture audit.
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
  'data/ops/hiring-architecture.json',
  'docs/HIRING_ARCHITECTURE.md',
  'js/features/ops/hiring-architecture.js',
  'js/features/ops/hiring-architecture-views.js',
  'scripts/hiring-architecture-snapshot.cjs'
];

const roleIds = [
  'growth_marketer',
  'product_designer',
  'frontend_engineer',
  'backend_platform_engineer',
  'ai_product_analyst',
  'b2b_sales_lead',
  'partner_success_manager',
  'ops_manager'
];

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) fail(`MISSING: ${rel}`);
}

const config = JSON.parse(
  fs.readFileSync(path.join(root, 'data/ops/hiring-architecture.json'), 'utf8')
);
if (config.version !== 'p21.0') fail('hiring-architecture.json must be p21.0');
if ((config.roles || []).length !== 8) fail('need exactly 8 roles');

for (const id of roleIds) {
  const role = config.roles.find((r) => r.id === id);
  if (!role) fail(`missing role ${id}`);
  if (!role.why || !role.when?.hireTrigger) fail(`${id} needs why and when`);
  if (!role.kpis?.length || !role.first90Days?.length) fail(`${id} needs kpis and first90Days`);
}

const adminHtml = fs.readFileSync(path.join(root, 'admin-panel.html'), 'utf8');
if (!adminHtml.includes('hiring-architecture')) fail('admin needs hiring-architecture page');

const adminJs = fs.readFileSync(path.join(root, 'js/admin-panel.js'), 'utf8');
if (!adminJs.includes('loadHiringArchitecture')) fail('admin needs loadHiringArchitecture');

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!pkg.scripts['metrics:hiring:architecture']) {
  fail('package.json needs metrics:hiring:architecture');
}
if (!pkg.scripts.test?.includes('p21-hiring-architecture-audit')) {
  fail('package.json test must include p21-hiring-architecture-audit');
}

const doc = fs.readFileSync(path.join(root, 'docs/HIRING_ARCHITECTURE.md'), 'utf8');
for (const title of ['Growth Marketer', 'Ops Manager', '90 gün', 'Hire sequence']) {
  if (!doc.includes(title)) fail(`HIRING_ARCHITECTURE missing: ${title}`);
}

if (failed) process.exit(1);
console.log('P21 hiring architecture audit OK');
