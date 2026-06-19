#!/usr/bin/env node
/**
 * Supabase Pro production hardening static audit (CI).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let failed = false;

const fail = (msg) => {
  console.error('FAIL:', msg);
  failed = true;
};

const mustExist = [
  'supabase/migrations/20260527_launch_security_hardening.sql',
  'supabase/migrations/20260616_supabase_pro_production_hardening.sql',
  'docs/SUPABASE_PRO_PRODUCTION_AUDIT.md',
  'supabase/functions/admin-action/index.ts',
  'functions/api/stripe-webhook.js',
  '_headers'
];

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) {
    fail(`MISSING: ${rel}`);
  }
}

const migrationsDir = path.join(root, 'supabase/migrations');
const combinedSql = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .map((f) => fs.readFileSync(path.join(migrationsDir, f), 'utf8'))
  .join('\n');

const rlsTargets = [
  { table: 'auto_leads', need: ['ENABLE ROW LEVEL SECURITY', 'auto_leads'] },
  { table: 'auto_events', need: ['auto_events'] },
  { table: 'profiles', need: ['profiles'] },
  { table: 'site_settings', need: ['site_settings', 'ENABLE ROW LEVEL SECURITY'] }
];

for (const { table, need } of rlsTargets) {
  if (!need.every((token) => combinedSql.includes(token))) {
    fail(`Migration set missing RLS coverage signal for ${table}`);
  }
}

const launchMigration = fs.readFileSync(
  path.join(root, 'supabase/migrations/20260527_launch_security_hardening.sql'),
  'utf8'
);
if (/\bDROP\s+POLICY\b/i.test(launchMigration)) {
  fail('launch_security_hardening must not DROP existing RLS policies');
}
if (/\bDROP\s+TABLE\b/i.test(launchMigration)) {
  fail('launch_security_hardening must not DROP TABLE');
}
if (!launchMigration.includes('enforce_minimum_admin_count')) {
  fail('launch_security_hardening must include last-admin guard');
}
if (!launchMigration.includes('is_admin()')) {
  fail('launch_security_hardening must define is_admin() helper');
}
if (!launchMigration.includes('Admins update auto_leads')) {
  fail('launch_security_hardening must allow admin update on auto_leads');
}

const proMigration = fs.readFileSync(
  path.join(root, 'supabase/migrations/20260616_supabase_pro_production_hardening.sql'),
  'utf8'
);
if (!proMigration.includes('Deny client write site_settings')) {
  fail('Pro hardening migration must lock site_settings client writes');
}
if (!proMigration.includes('DROP POLICY IF EXISTS "vertical_leads anon update own session"')) {
  fail('Pro hardening migration must drop permissive vertical_leads update policy');
}
if (!proMigration.includes('vertical_leads deny client update')) {
  fail('vertical_leads client update must be denied');
}

const walkJs = (dir, hits = []) => {
  if (!fs.existsSync(dir)) return hits;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      walkJs(full, hits);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      hits.push(full);
    }
  }
  return hits;
};

for (const file of walkJs(path.join(root, 'js'))) {
  const rel = path.relative(root, file);
  if (rel.includes('admin-panel')) continue;
  const text = fs.readFileSync(file, 'utf8');
  if (text.includes('SUPABASE_SERVICE_ROLE_KEY')) {
    fail(`Client bundle must not reference SERVICE_ROLE: ${rel}`);
  }
}

const envExample = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
if (!envExample.includes('SUPABASE_SERVICE_ROLE_KEY')) {
  fail('.env.example must document SUPABASE_SERVICE_ROLE_KEY as server-only');
}

const publicEnvKeys = fs.readFileSync(path.join(root, 'scripts/production-build.cjs'), 'utf8');
if (publicEnvKeys.includes("'SUPABASE_SERVICE_ROLE_KEY'")) {
  fail('production-build public env whitelist must not include SERVICE_ROLE');
}

const cms = fs.readFileSync(path.join(root, 'js/core/cms.js'), 'utf8');
if (cms.includes('site_settings?select=*')) {
  fail('cms.js must not fetch all site_settings columns via select=*');
}

const adminAction = fs.readFileSync(
  path.join(root, 'supabase/functions/admin-action/index.ts'),
  'utf8'
);
if (!adminAction.includes('home_category_auto_enabled')) {
  fail('admin-action must allow home_category_* settings keys');
}

if (failed) process.exit(1);
console.log('supabase-pro-production-audit: OK');
