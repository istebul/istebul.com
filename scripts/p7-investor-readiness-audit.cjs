#!/usr/bin/env node
/**
 * P7 — Investor readiness audit.
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
  'docs/P7_INVESTOR_READINESS.md',
  'docs/investor/INVESTOR_METRICS_STORY.md',
  'docs/investor/FINANCIAL_MODEL.md',
  'docs/investor/GROWTH_AND_GTM_NARRATIVE.md',
  'data/investor/investor-readiness.json',
  'data/investor/metrics-story.json',
  'data/investor/moat-story.json',
  'data/investor/financial-model.json',
  'data/investor/growth-story.json',
  'data/investor/gtm-narrative.json',
  'data/investor/deck-readiness.json',
  'js/features/investor/investor-narrative.js',
  'js/features/investor/investor-readiness.js',
  'js/features/metrics/investor-kpis.js',
  'scripts/investor-readiness-pack.cjs',
  'scripts/investor-metrics-snapshot.cjs'
];

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) fail(`MISSING: ${rel}`);
}

const manifest = JSON.parse(
  fs.readFileSync(path.join(root, 'data/investor/investor-readiness.json'), 'utf8')
);
if (manifest.version !== 'p7.0') fail('investor-readiness.json must be p7.0');

const deck = JSON.parse(
  fs.readFileSync(path.join(root, 'data/investor/deck-readiness.json'), 'utf8')
);
if ((deck.slides || []).length < 14) fail('deck-readiness needs 14 slides');

const moat = JSON.parse(
  fs.readFileSync(path.join(root, 'data/investor/moat-story.json'), 'utf8')
);
if ((moat.pillars || []).length < 4) fail('moat-story needs 4 pillars');

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!pkg.scripts['metrics:investor:pack']) fail('package.json missing metrics:investor:pack');
if (!String(pkg.scripts.test || '').includes('p7-investor-readiness-audit')) {
  fail('npm test must include p7-investor-readiness-audit');
}
if (!String(pkg.scripts['test:router'] || '').includes('investor-readiness.test')) {
  fail('test:router must include investor-readiness.test.mjs');
}

const dataRoom = fs.readFileSync(path.join(root, 'docs/investor/DATA_ROOM_INDEX.md'), 'utf8');
if (!dataRoom.includes('investor-readiness-pack')) fail('DATA_ROOM_INDEX must reference readiness pack');

if (failed) process.exit(1);
console.log('P7 investor readiness audit OK');
