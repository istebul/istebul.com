#!/usr/bin/env node
/**
 * Ensures production-deploy.yml deploys all Supabase functions in edge-functions.json.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, 'data/deploy/edge-functions.json'), 'utf8')
);
const workflow = fs.readFileSync(
  path.join(root, '.github/workflows/production-deploy.yml'),
  'utf8'
);

const expected = manifest.functions || [];
const missing = [];

for (const fn of expected) {
  const dir = path.join(root, 'supabase/functions', fn);
  if (!fs.existsSync(dir)) {
    console.error(`Edge function directory missing: supabase/functions/${fn}`);
    process.exit(1);
  }
  if (!workflow.includes(fn)) {
    missing.push(fn);
  }
}

if (missing.length) {
  console.error(
    'production-deploy.yml missing deploy entries for:',
    missing.join(', ')
  );
  process.exit(1);
}

console.log(`Deploy manifest OK (${expected.length} Supabase edge functions).`);
