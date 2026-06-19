#!/usr/bin/env node
/**
 * P9 — Digital company ops automation audit.
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
  'data/ops/automation-roadmap.json',
  'data/ops/automation-manifest.json',
  'data/ops/alert-rules.json',
  'docs/OPS_AUTOMATION_ROADMAP.md',
  'docs/P9_DIGITAL_COMPANY_OPS.md',
  'js/features/ops/ops-alert-engine.js',
  'js/features/ops/ops-command-center.js',
  'scripts/ops-command-center.cjs',
  'scripts/ops-automation-run.cjs',
  'supabase/functions/ops-alert-digest/index.ts',
  '.github/workflows/ops-automation.yml'
];

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) fail(`MISSING: ${rel}`);
}

const roadmap = JSON.parse(
  fs.readFileSync(path.join(root, 'data/ops/automation-roadmap.json'), 'utf8')
);
if (roadmap.version !== 'p9.0') fail('automation-roadmap.json must be p9.0');
if (roadmap.domains?.length < 8) fail('roadmap needs 8 domains');

const rules = JSON.parse(fs.readFileSync(path.join(root, 'data/ops/alert-rules.json'), 'utf8'));
if (!rules.rules?.length) fail('alert-rules needs rules array');

const manifest = JSON.parse(
  fs.readFileSync(path.join(root, 'data/ops/automation-manifest.json'), 'utf8')
);
if (!manifest.snapshotScripts?.some((s) => s.npm === 'metrics:ops:center')) {
  fail('manifest must list metrics:ops:center');
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
for (const script of ['metrics:ops:center', 'ops:automation:run']) {
  if (!pkg.scripts[script]) fail(`package.json missing ${script}`);
}
if (!pkg.scripts.test?.includes('p9-ops-automation-audit')) {
  fail('package.json test must include p9-ops-automation-audit');
}

const adminHtml = fs.readFileSync(path.join(root, 'admin-panel.html'), 'utf8');
if (!adminHtml.includes('ops-command-center')) fail('admin-panel needs ops-command-center page');

const adminJs = fs.readFileSync(path.join(root, 'js/admin-panel.js'), 'utf8');
if (!adminJs.includes('loadOpsCommandCenter')) fail('admin-panel.js needs loadOpsCommandCenter');

const opsMd = fs.readFileSync(path.join(root, 'docs/OPS_AUTOMATION_ROADMAP.md'), 'utf8');
for (const token of ['Revenue Ops', 'lifecycle', 'ops-alert-digest', 'Ops Command Center']) {
  if (!opsMd.includes(token)) fail(`OPS_AUTOMATION_ROADMAP missing: ${token}`);
}

/** Faz 4A-1b-3C-2 — Ops Command Center dashboards.highlights ↔ nav labels */
const opsCommandCenterSource = fs.readFileSync(
  path.join(root, 'js/features/ops/ops-command-center.js'),
  'utf8'
);
for (const label of ["'Yatırımcı KPI'", "'Observability'", "'Operasyon Komuta Merkezi'"]) {
  if (!opsCommandCenterSource.includes(label)) {
    fail(`Faz 4A-1b-3C-2 ops command highlights terminology should include ${label}`);
  }
}
for (const legacy of ["'Executive KPIs'", "'Ops Command Center'"]) {
  if (opsCommandCenterSource.includes(legacy)) {
    fail(`Faz 4A-1b-3C-2 ops command highlights terminology should not include legacy ${legacy}`);
  }
}

if (failed) process.exit(1);
console.log('P9 ops automation audit OK');
