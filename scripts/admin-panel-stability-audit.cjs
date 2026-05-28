#!/usr/bin/env node
/**
 * Admin panel stability — resilient reads + admin-action list tables.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let failed = false;

const fail = (msg) => {
  console.error(msg);
  failed = true;
};

const mustExist = [
  'js/admin/admin-page-routing.js',
  'js/admin/admin-query.js',
  'js/features/ops/ops-health.js',
  'supabase/migrations/20260530_operational_observability.sql',
  'supabase/migrations/20260525_partner_delivery_enterprise.sql',
  'supabase/migrations/20260609_partner_applications_schema_repair.sql',
  'supabase/migrations/20260610_subscriptions_bootstrap.sql'
];

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) {
    fail(`MISSING: ${rel}`);
  }
}

const adminQuery = fs.readFileSync(path.join(root, 'js/admin/admin-query.js'), 'utf8');
if (!adminQuery.includes('fetchAdminTable')) {
  fail('admin-query must export fetchAdminTable');
}
if (!adminQuery.includes('isSchemaMissingError')) {
  fail('admin-query must detect schema cache errors');
}
if (!adminQuery.includes('PARTNER_APPLICATIONS_BASE_SELECT')) {
  fail('admin-query must define base partner_applications columns fallback');
}
if (!adminQuery.includes('runDirect')) {
  fail('admin-query must not pass undefined into direct() (breaks default params)');
}
if (adminQuery.includes('if (!isSchemaMissingError(res.error))')) {
  fail('admin-query must fall back to admin-action on all direct errors (incl. RLS)');
}
if (!adminQuery.includes('withAdminFetchTimeout')) {
  fail('admin-query must timeout direct Supabase reads to avoid stuck loading');
}

const repairSql = fs.readFileSync(
  path.join(root, 'supabase/migrations/20260609_partner_applications_schema_repair.sql'),
  'utf8'
);
if (!repairSql.includes('partner_endpoint_id')) {
  fail('partner applications repair migration must add partner_endpoint_id');
}

const adminPanel = fs.readFileSync(path.join(root, 'js/admin-panel.js'), 'utf8');
const requiredPatterns = [
  'registerAdminPageHandlers',
  'showAdminPage',
  'fetchAdminTable',
  'loadOperationalHealth',
  'partner_lead_dispatch_logs',
  'operational_events',
  'rollupSeverity24h',
  'renderAdminWarningBanner'
];

for (const pattern of requiredPatterns) {
  if (!adminPanel.includes(pattern)) {
    fail(`admin-panel.js missing: ${pattern}`);
  }
}

if (adminPanel.includes('partner_dispatch_logs')) {
  fail('admin-panel must not reference wrong table partner_dispatch_logs');
}
if (adminPanel.includes('partner_endpoint_id, onboarding_token')) {
  fail('partner_applications load must not enumerate optional columns in select');
}
if (!adminPanel.includes("table: 'subscriptions'") || !adminPanel.includes('loadExecutiveKpis')) {
  fail('executive KPIs must use fetchAdminTable for subscriptions');
}

const opsHealth = fs.readFileSync(path.join(root, 'js/features/ops/ops-health.js'), 'utf8');
if (!opsHealth.includes('rollupSeverity24h') || !opsHealth.includes('rollupHealth24h')) {
  fail('ops-health must provide client-side rollups');
}

const adminAction = fs.readFileSync(
  path.join(root, 'supabase/functions/admin-action/index.ts'),
  'utf8'
);

if (adminAction.includes('"partner_dispatch_logs"')) {
  fail('admin-action listTables must use partner_lead_dispatch_logs');
}
for (const table of [
  'operational_events',
  'admin_audit_logs',
  'partner_lead_dispatch_logs',
  'analytics_events'
]) {
  if (!adminAction.includes(`"${table}"`)) {
    fail(`admin-action must allow list for ${table}`);
  }
}

if (failed) {
  process.exit(1);
}

console.log('admin-panel-stability-audit: OK');
