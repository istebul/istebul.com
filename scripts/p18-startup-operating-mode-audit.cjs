#!/usr/bin/env node
/**
 * P18 — Startup operating mode audit.
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
  'data/ops/startup-operating-mode.json',
  'docs/STARTUP_OPERATING_MODE.md',
  'js/features/ops/startup-operating-center.js',
  'js/features/ops/startup-operating-views.js',
  'scripts/startup-operating-snapshot.cjs'
];

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) fail(`MISSING: ${rel}`);
}

const config = JSON.parse(
  fs.readFileSync(path.join(root, 'data/ops/startup-operating-mode.json'), 'utf8')
);
if (config.version !== 'p18.0') fail('startup-operating-mode.json must be p18.0');
if ((config.scalePillars || []).length < 8) fail('need 8 scale pillars');
if ((config.bottlenecks || []).length < 5) fail('need bottleneck registry');
if ((config.executiveRoles || []).length < 6) fail('need 6 executive roles');

const centerJs = fs.readFileSync(
  path.join(root, 'js/features/ops/startup-operating-center.js'),
  'utf8'
);
for (const fn of ['buildStartupOperatingSnapshot', 'scorePillarReadiness', 'scoreBottleneckUrgency']) {
  if (!centerJs.includes(fn)) fail(`startup-operating-center missing ${fn}`);
}

const viewsJs = fs.readFileSync(
  path.join(root, 'js/features/ops/startup-operating-views.js'),
  'utf8'
);
if (!viewsJs.includes('renderStartupOperatingCenter')) {
  fail('startup-operating-views missing renderStartupOperatingCenter');
}

const adminHtml = fs.readFileSync(path.join(root, 'admin-panel.html'), 'utf8');
if (!adminHtml.includes('startup-operating-center')) {
  fail('admin-panel needs startup-operating-center page');
}

const adminJs = fs.readFileSync(path.join(root, 'js/admin-panel.js'), 'utf8');
if (!adminJs.includes('loadStartupOperatingCenter')) {
  fail('admin-panel.js needs loadStartupOperatingCenter');
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!pkg.scripts['metrics:startup:operating']) {
  fail('package.json needs metrics:startup:operating');
}
if (!pkg.scripts.test?.includes('p18-startup-operating-mode-audit')) {
  fail('package.json test must include p18-startup-operating-mode-audit');
}

const manifest = JSON.parse(
  fs.readFileSync(path.join(root, 'data/ops/automation-manifest.json'), 'utf8')
);
if (!manifest.snapshotScripts?.some((s) => s.npm === 'metrics:startup:operating')) {
  fail('automation-manifest must list metrics:startup:operating');
}
if (!manifest.adminSurfaces?.some((s) => s.page === 'startup-operating-center')) {
  fail('automation-manifest needs startup-operating-center admin surface');
}

const opsRun = fs.readFileSync(path.join(root, 'scripts/ops-automation-run.cjs'), 'utf8');
if (!opsRun.includes('startup-operating-snapshot')) {
  fail('ops-automation-run must invoke startup-operating-snapshot');
}

const doc = fs.readFileSync(path.join(root, 'docs/STARTUP_OPERATING_MODE.md'), 'utf8');
for (const token of ['Organizational scaling', 'Decision cadence', 'Bottleneck', 'P18']) {
  if (!doc.includes(token)) fail(`STARTUP_OPERATING_MODE missing: ${token}`);
}

if (failed) process.exit(1);
console.log('P18 startup operating mode audit OK');
