#!/usr/bin/env node
/**
 * P4.7 venture scale readiness audit.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const mustExist = [
  'docs/P4_7_SCALE_READINESS.md',
  'js/core/scale-limits.js',
  'supabase/migrations/20260608_p47_scale_analytics_indexes.sql',
  'tests/unit/scale-limits.test.mjs'
];

const mustContain = [
  ['js/core/analytics.js', 'scale-limits.js'],
  ['js/core/analytics.js', 'SCALE_LIMITS'],
  ['js/core/operational-telemetry.js', 'SCALE_LIMITS'],
  ['js/admin-panel.js', 'analyticsWindowDays'],
  ['js/admin-panel.js', 'gte(\'created_at\''],
  ['supabase/functions/analytics-ingest/index.ts', 'checkRateLimit'],
  ['functions/ai-proxy.js', 'checkRateLimit'],
  ['docs/P4_7_SCALE_READINESS.md', '10K'],
  ['docs/P4_7_SCALE_READINESS.md', '1M'],
  ['package.json', 'p4-7-scale-readiness-audit.cjs']
];

let failed = false;

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) {
    console.error('MISSING:', rel);
    failed = true;
  }
}

for (const [rel, needle] of mustContain) {
  if (!read(rel).includes(needle)) {
    console.error('ASSERT FAILED:', rel, 'must contain', needle);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log('P4.7 scale readiness audit passed.');
