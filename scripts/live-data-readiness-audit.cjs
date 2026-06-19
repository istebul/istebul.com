#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
let failed = false;

function fail(msg) {
  console.error('FAIL:', msg);
  failed = true;
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const required = [
  'docs/LIVE_DATA_30DAY_CHECKLIST.md',
  'js/runtime/live-data-integrations.js',
  'supabase/migrations/20260620_live_data_settings.sql'
];

required.forEach((rel) => {
  if (!fs.existsSync(path.join(root, rel))) fail(`missing ${rel}`);
});

const migration = read('supabase/migrations/20260620_live_data_settings.sql');
if (!migration.includes('live_providers_enabled')) {
  fail('migration must allowlist live_providers_enabled');
}

const adminAction = read('supabase/functions/admin-action/index.ts');
if (!adminAction.includes('live_finance_feed_url')) {
  fail('admin-action must allow live_finance_feed_url');
}

if (!adminAction.includes('Canlı sağlayıcı modu açılamaz')) {
  fail('admin-action must block live_providers_enabled without feed URL');
}

const adminPanel = read('admin-panel.html');
if (!adminPanel.includes('s-live_providers_enabled')) {
  fail('admin-panel must expose live_providers_enabled toggle');
}

const appJs = read('js/app.js');
if (!appJs.includes('bootstrapLiveDataIntegrations')) {
  fail('app.js must bootstrap live data integrations');
}

const pkg = JSON.parse(read('package.json'));
if (!pkg.scripts['audit:live-data']) {
  fail('package.json must define audit:live-data script');
}

if (failed) process.exit(1);
console.log('live-data-readiness-audit: OK');
