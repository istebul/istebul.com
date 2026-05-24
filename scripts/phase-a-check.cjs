#!/usr/bin/env node
/**
 * Phase A (10k readiness) static artifact checks.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
let failed = false;

const required = [
  'docs/SCALE_PHASE_A_RUNBOOK.md',
  'docs/SCALE_ARCHITECTURE_ROADMAP.md',
  'data/deploy/edge-functions.json',
  'data/scale/slo-thresholds.json',
  'scripts/load/smoke-http.cjs',
  'scripts/load/k6-smoke.js',
  'scripts/slo-check.cjs',
  'supabase/functions/data-retention-cron/index.ts',
  'supabase/migrations/20260531_scale_phase_a_retention.sql'
];

for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) {
    console.error(`Missing Phase A artifact: ${rel}`);
    failed = true;
  }
}

const deployCheck = spawnSync(process.execPath, ['scripts/deploy-manifest-check.cjs'], {
  cwd: root,
  stdio: 'inherit'
});
if (deployCheck.status !== 0) failed = true;

if (failed) process.exit(1);
console.log('Phase A static checks passed.');
