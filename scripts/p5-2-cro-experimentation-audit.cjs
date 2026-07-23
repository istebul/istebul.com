#!/usr/bin/env node
/**
 * P5.2 — CRO experimentation framework audit.
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
  'docs/P5_2_CRO_EXPERIMENTATION.md',
  'data/growth/cro-framework.json',
  'data/growth/experiments.json',
  'js/features/growth/cro-experiment-framework.js',
  'js/features/growth/growth-experiments.js',
  'css/growth-cro.css',
  'js/runtime/growth-ops.js'
];

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) fail(`MISSING: ${rel}`);
}

const framework = JSON.parse(
  fs.readFileSync(path.join(root, 'data/growth/cro-framework.json'), 'utf8')
);
const experiments = JSON.parse(
  fs.readFileSync(path.join(root, 'data/growth/experiments.json'), 'utf8')
);

const zoneIds = (framework.zones || []).map((z) => z.id);
const requiredZones = ['hero', 'cta', 'wizard', 'pricing', 'checkout', 'trust'];
for (const z of requiredZones) {
  if (!zoneIds.includes(z)) fail(`cro-framework.json missing zone: ${z}`);
}

const activeByZone = {};
for (const exp of experiments.experiments || []) {
  if (exp.status !== 'active') continue;
  activeByZone[exp.zone] = (activeByZone[exp.zone] || 0) + 1;
  const w = (exp.variants || []).reduce((s, v) => s + (Number(v.weight) || 0), 0);
  if (w !== 100) fail(`experiment ${exp.id} weights must sum to 100 (got ${w})`);
}

for (const z of requiredZones) {
  if (!activeByZone[z]) fail(`no active experiment for zone: ${z}`);
}

if (experiments.frameworkVersion !== 'p5.2') {
  fail('experiments.json must declare frameworkVersion p5.2');
}

const croJs = fs.readFileSync(
  path.join(root, 'js/features/growth/cro-experiment-framework.js'),
  'utf8'
);
if (!croJs.includes('metricMatchesExperiment')) fail('CRO framework must match metrics');

const growthExp = fs.readFileSync(
  path.join(root, 'js/features/growth/growth-experiments.js'),
  'utf8'
);
if (!growthExp.includes('refreshGrowthExperiments')) {
  fail('growth-experiments must support dynamic refresh');
}

const ops = fs.readFileSync(path.join(root, 'js/runtime/growth-ops.js'), 'utf8');
if (!ops.includes('ib:wizard-rendered') || !ops.includes('wizard_step_advance')) {
  fail('growth-ops must wire wizard CRO conversions');
}

/* CRO selectors live on AI product surface after Platform Cutover */
const aiIndex = fs.readFileSync(path.join(root, 'ai/index.html'), 'utf8');
if (!aiIndex.includes('data-hero-cta-primary')) {
  fail('ai/index.html must expose hero CRO experiment selector');
}
if (!aiIndex.includes('data-cro-cta-sticky') && !aiIndex.includes('data-cro-cta-secondary')) {
  fail('ai/index.html must expose CRO CTA experiment selectors');
}
if (!ops.includes('[data-cro-trust-headline]') && !ops.includes('#trust')) {
  fail('growth-ops must retain trust-zone CRO wiring');
}

if (failed) process.exit(1);
console.log('P5.2 CRO experimentation audit passed.');
