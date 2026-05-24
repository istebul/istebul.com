#!/usr/bin/env node
/**
 * Static resilience audit — CI guard for BCP artifacts and critical deploy list.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const requiredDocs = [
  'docs/PRODUCTION_RESILIENCE_AUDIT.md',
  'docs/RESILIENCE_RUNBOOK.md',
  'docs/PRODUCTION_OBSERVABILITY.md',
  '.github/workflows/partner-retry.yml'
];

const deployWorkflow = fs.readFileSync(
  path.join(root, '.github/workflows/production-deploy.yml'),
  'utf8'
);

const requiredEdgeFunctions = [
  'auto-intake',
  'analytics-ingest',
  'ops-ingest',
  'partner-retry',
  'partner-dispatch',
  'lifecycle-enroll',
  'lifecycle-cron',
  'data-retention-cron'
];

let failed = false;

for (const rel of requiredDocs) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    console.error(`Missing resilience artifact: ${rel}`);
    failed = true;
  }
}

for (const fn of requiredEdgeFunctions) {
  if (!deployWorkflow.includes(fn)) {
    console.error(`production-deploy.yml missing edge function: ${fn}`);
    failed = true;
  }
}

if (!deployWorkflow.includes('partner-retry')) {
  console.error('partner-retry must be in production deploy list');
  failed = true;
}

if (failed) {
  process.exit(1);
}

console.log('Resilience audit static checks passed.');
