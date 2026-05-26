#!/usr/bin/env node
/**
 * Validates code ↔ migration alignment for auto_leads qualification columns.
 * Run after `supabase db push` on production, or in CI without DB (migration file check only).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const REQUIRED_COLUMNS = [
  'purchase_timeline',
  'financing_intent',
  'trade_in',
  'urgency',
  'contact_preference',
  'ai_summary',
  'ai_confidence'
];

let failed = false;

function fail(msg) {
  console.error('FAIL:', msg);
  failed = true;
}

const migrationsDir = path.join(root, 'supabase/migrations');
const sqlFiles = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));
const combinedSql = sqlFiles
  .map((f) => fs.readFileSync(path.join(migrationsDir, f), 'utf8'))
  .join('\n');

for (const col of REQUIRED_COLUMNS) {
  if (!combinedSql.includes(col)) {
    fail(`migration set missing column reference: ${col}`);
  }
}

const intake = fs.readFileSync(path.join(root, 'supabase/functions/auto-intake/index.ts'), 'utf8');
for (const col of REQUIRED_COLUMNS) {
  if (!intake.includes(col)) {
    fail(`auto-intake missing payload field: ${col}`);
  }
}

const admin = fs.readFileSync(path.join(root, 'js/admin-panel.js'), 'utf8');
for (const col of REQUIRED_COLUMNS) {
  if (!admin.includes(`lead.${col}`)) {
    fail(`admin-panel missing display for: ${col}`);
  }
}

const finalMigration = path.join(migrationsDir, '20260526_final_production_lead_fields.sql');
if (!fs.existsSync(finalMigration)) {
  fail('missing 20260526_final_production_lead_fields.sql');
}

if (process.env.SUPABASE_DB_URL || process.env.DATABASE_URL) {
  console.log('DB URL set — run `supabase db push` separately; schema introspection not bundled here.');
}

if (failed) process.exit(1);
console.log('verify-supabase-lead-schema: OK', `(${REQUIRED_COLUMNS.length} columns)`);
