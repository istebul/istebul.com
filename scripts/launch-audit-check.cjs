#!/usr/bin/env node
/**
 * Static launch audit — fails CI if critical security artifacts are missing.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const mustExist = [
  '_headers',
  'supabase/migrations/20260527_launch_security_hardening.sql',
  'supabase/functions/_shared/webhook-url.ts',
  'functions/api/stripe-webhook.js',
  'functions/api/create-checkout.js',
  'docs/LAUNCH_PRODUCTION_AUDIT.md'
];

const mustContain = [
  ['js/auto/auto-app.js', 'revenueManager.isPremium'],
  ['js/core/api.js', 'admin-action edge function'],
  ['supabase/functions/auto-intake/index.ts', 'Verification failed'],
  ['supabase/functions/analytics-ingest/index.ts', 'Forbidden'],
];

let failed = false;

for (const rel of mustExist) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    console.error('MISSING:', rel);
    failed = true;
  }
}

for (const [rel, needle] of mustContain) {
  const full = path.join(root, rel);
  const text = fs.readFileSync(full, 'utf8');
  if (!text.includes(needle)) {
    console.error('ASSERT FAILED:', rel, 'must contain', needle);
    failed = true;
  }
}

const headers = fs.readFileSync(path.join(root, '_headers'), 'utf8');
if (!headers.includes('Content-Security-Policy')) {
  console.error('CSP missing in _headers');
  failed = true;
}

if (failed) {
  process.exit(1);
}

console.log('Launch audit static checks passed.');
