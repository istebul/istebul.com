#!/usr/bin/env node
/**
 * P25 — Expansion roadmap prioritization audit.
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
  'data/ops/expansion-roadmap-prioritization.json',
  'docs/EXPANSION_ROADMAP_PRIORITIZATION.md',
  'js/features/ops/expansion-roadmap-prioritization.js',
  'js/features/ops/expansion-roadmap-prioritization-views.js',
  'scripts/expansion-roadmap-prioritization-snapshot.cjs',
  'data/platform/expansion-roadmap.json'
];

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) fail(`MISSING: ${rel}`);
}

const config = JSON.parse(
  fs.readFileSync(path.join(root, 'data/ops/expansion-roadmap-prioritization.json'), 'utf8')
);
if (config.version !== 'p25.0') fail('must be p25.0');
if ((config.categories || []).length !== 7) fail('need 7 categories');
if ((config.prioritizationCriteria || []).length !== 6) fail('need 6 criteria');
if (config.verdict?.firstCategory !== 'ev') fail('first category must be ev');

const catIds = ['ev', 'mortgage', 'tatil', 'sigorta', 'finans', 'education', 'elektronik'];
for (const id of catIds) {
  if (!config.categories.find((c) => c.id === id)) fail(`missing category ${id}`);
}

const doc = fs.readFileSync(path.join(root, 'docs/EXPANSION_ROADMAP_PRIORITIZATION.md'), 'utf8');
for (const token of ['Ev / Konut', 'monetization', 'elektronik', 'hangi kategori önce', 'mortgage']) {
  if (!doc.includes(token)) fail(`doc missing: ${token}`);
}

const adminHtml = fs.readFileSync(path.join(root, 'admin-panel.html'), 'utf8');
if (!adminHtml.includes('expansion-prioritization')) fail('admin needs expansion-prioritization page');

const adminJs = fs.readFileSync(path.join(root, 'js/admin-panel.js'), 'utf8');
if (!adminJs.includes('loadExpansionPrioritization')) fail('admin needs loadExpansionPrioritization');

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!pkg.scripts['metrics:expansion:prioritization']) fail('need metrics:expansion:prioritization');
if (!pkg.scripts.test?.includes('p25-expansion-roadmap-prioritization-audit')) {
  fail('test must include p25 audit');
}

if (failed) process.exit(1);
console.log('P25 expansion roadmap prioritization audit OK');
