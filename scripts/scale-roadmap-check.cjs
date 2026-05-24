#!/usr/bin/env node
/**
 * Static checks: scale architecture roadmap artifacts exist and are linked.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let failed = false;

const required = [
  'docs/SCALE_ARCHITECTURE_ROADMAP.md',
  'data/scale/thresholds.json'
];

for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) {
    console.error(`Missing scale artifact: ${rel}`);
    failed = true;
  }
}

const arch = fs.readFileSync(path.join(root, 'docs/ARCHITECTURE.md'), 'utf8');
if (!arch.includes('SCALE_ARCHITECTURE_ROADMAP')) {
  console.error('ARCHITECTURE.md must link to SCALE_ARCHITECTURE_ROADMAP');
  failed = true;
}

const thresholds = JSON.parse(
  fs.readFileSync(path.join(root, 'data/scale/thresholds.json'), 'utf8')
);
for (const tier of ['10k', '100k', '1M']) {
  if (!thresholds.tiers?.[tier]) {
    console.error(`thresholds.json missing tier: ${tier}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log('Scale roadmap static checks passed.');
