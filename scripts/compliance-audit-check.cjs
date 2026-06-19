#!/usr/bin/env node
/**
 * Static compliance readiness checks for CI.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let failed = false;

const required = [
  'docs/COMPLIANCE_READINESS_AUDIT.md',
  'docs/COMPLIANCE_RUNBOOK.md',
  'data/compliance/retention-schedule.json',
  'cerez-politikasi.html',
  'kvkk.html',
  'gizlilik.html',
  'kullanim-sartlari.html'
];

for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) {
    console.error(`Missing compliance artifact: ${rel}`);
    failed = true;
  }
}

const intake = fs.readFileSync(
  path.join(root, 'supabase/functions/auto-intake/index.ts'),
  'utf8'
);
if (!intake.includes('privacy_consent') || !intake.includes('Privacy consent required')) {
  console.error('auto-intake must enforce privacy_consent server-side');
  failed = true;
}

const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (!indexHtml.includes('newsletter-marketing-consent')) {
  console.error('newsletter form must include marketing consent checkbox');
  failed = true;
}

if (failed) process.exit(1);
console.log('Compliance audit static checks passed.');
