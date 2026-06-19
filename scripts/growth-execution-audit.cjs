#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let failed = false;

const fail = (msg) => {
  console.error(msg);
  failed = true;
};

const mustExist = [
  'docs/GROWTH_EXECUTION_PLAN.md',
  'data/growth/experiments.json',
  'data/growth/channels.json',
  'js/features/growth/growth-kpis.js',
  'js/features/growth/growth-experiments.js',
  'js/features/growth/cro-experiment-framework.js',
  'data/growth/cro-framework.json',
  'js/features/growth/paid-growth.js',
  'js/features/growth/retention-engine.js',
  'js/runtime/growth-ops.js',
  'scripts/growth-command-center.cjs',
  'scripts/lib/growth-kpis.cjs'
];

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) fail(`MISSING: ${rel}`);
}

const platform = fs.readFileSync(
  path.join(root, 'supabase/functions/_shared/platform-analytics.ts'),
  'utf8'
);
for (const ev of [
  'growth_experiment_exposure',
  'paid_click_capture',
  'retention_return_visit'
]) {
  if (!platform.includes(ev)) fail(`platform-analytics must allow ${ev}`);
}

const analytics = fs.readFileSync(path.join(root, 'js/core/analytics.js'), 'utf8');
if (!analytics.includes('msclkid')) fail('analytics must capture msclkid');

const admin = fs.readFileSync(path.join(root, 'js/admin-panel.js'), 'utf8');
if (!admin.includes('Growth Command Center')) fail('admin must render Growth Command Center');

const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (!index.includes('data-hero-cta-primary')) fail('homepage hero must expose experiment selector');

if (failed) process.exit(1);
console.log('Growth execution audit passed.');
