#!/usr/bin/env node
/**
 * P24 — Competitor attack scenario audit.
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
  'data/ops/competitor-attack-scenario.json',
  'docs/COMPETITOR_ATTACK_SCENARIO.md',
  'js/features/ops/competitor-attack-scenario.js',
  'js/features/ops/competitor-attack-views.js',
  'scripts/competitor-attack-snapshot.cjs',
  'data/ops/category-dominance-strategy.json'
];

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) fail(`MISSING: ${rel}`);
}

const config = JSON.parse(
  fs.readFileSync(path.join(root, 'data/ops/competitor-attack-scenario.json'), 'utf8')
);
if (config.version !== 'p24.0') fail('competitor-attack-scenario.json must be p24.0');
if ((config.attackScenarios || []).length < 4) fail('need 4+ attack scenarios');
if ((config.defensePlans || []).length !== 6) fail('need 6 defense pillars');

const defenseIds = ['product', 'data', 'growth', 'brand', 'partner', 'distribution'];
for (const id of defenseIds) {
  if (!config.defensePlans.find((p) => p.id === id)) fail(`missing defense ${id}`);
}

const attackIds = ['sahibinden_ai', 'bank_credit_compare', 'generic_ai_auto', 'vc_backed_rival'];
for (const id of attackIds) {
  if (!config.attackScenarios.find((a) => a.id === id)) fail(`missing attack ${id}`);
}

const doc = fs.readFileSync(path.join(root, 'docs/COMPETITOR_ATTACK_SCENARIO.md'), 'utf8');
for (const token of [
  'Sahibinden',
  'defense plan',
  'VC-backed',
  'generic AI',
  'partner defense',
  'defensible company'
]) {
  if (!doc.includes(token)) fail(`COMPETITOR_ATTACK_SCENARIO missing: ${token}`);
}

const adminHtml = fs.readFileSync(path.join(root, 'admin-panel.html'), 'utf8');
if (!adminHtml.includes('competitor-attack')) fail('admin needs competitor-attack page');

const adminJs = fs.readFileSync(path.join(root, 'js/admin-panel.js'), 'utf8');
if (!adminJs.includes('loadCompetitorAttack')) fail('admin needs loadCompetitorAttack');

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!pkg.scripts['metrics:competitor:attack']) {
  fail('package.json needs metrics:competitor:attack');
}
if (!pkg.scripts.test?.includes('p24-competitor-attack-audit')) {
  fail('package.json test must include p24-competitor-attack-audit');
}

if (failed) process.exit(1);
console.log('P24 competitor attack scenario audit OK');
