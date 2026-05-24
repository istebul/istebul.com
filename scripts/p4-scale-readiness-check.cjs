#!/usr/bin/env node
/**
 * P4 scale readiness — performance hints, moat health surface, build artifacts.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const checks = [
  ['css/p4-premium-product.css', 'content-visibility'],
  ['css/p4-premium-product.css', 'contain: layout'],
  ['scripts/production-build.cjs', 'build-manifest.json'],
  ['scripts/production-build.cjs', 'ib-car.css'],
  ['supabase/functions/moat-health/index.ts', 'defensibilityIndex'],
  ['js/features/moat/moat-architecture-shared.js', 'MOAT_ARCHITECTURE_VERSION'],
  ['_headers', 'Cache-Control'],
  ['netlify.toml', 'publish = "dist"'],
  ['docs/P4_7_SCALE_READINESS.md', 'Venture scale'],
  ['js/core/scale-limits.js', 'SCALE_LIMITS']
];

let failed = false;

for (const [rel, needle] of checks) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    console.error('MISSING:', rel);
    failed = true;
    continue;
  }
  if (!read(rel).includes(needle)) {
    console.error('ASSERT FAILED:', rel, 'must contain', needle);
    failed = true;
  }
}

const app = read('js/app.js');
if (!app.includes('initEnterpriseUx')) {
  console.error('SPA must wire initEnterpriseUx');
  failed = true;
}

if (failed) {
  process.exit(1);
}

console.log('P4 scale readiness check passed.');
