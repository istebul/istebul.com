#!/usr/bin/env node
/**
 * Admin schema contract — frontend table access must match admin-action listTables.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let failed = false;

const fail = (msg) => {
  console.error(`FAIL: ${msg}`);
  failed = true;
};

const adminActionSrc = fs.readFileSync(
  path.join(root, 'supabase/functions/admin-action/index.ts'),
  'utf8'
);

const listMatch = adminActionSrc.match(/const listTables = \[([\s\S]*?)\];/);
if (!listMatch) {
  fail('admin-action listTables block not found');
  process.exit(1);
}

const listTables = [...listMatch[1].matchAll(/"([a-z_]+)"/g)].map((m) => m[1]);

const REQUIRED_LIST_TABLES = [
  'site_settings',
  'listings',
  'profiles',
  'auto_leads',
  'auto_events',
  'subscriptions',
  'partner_endpoints',
  'partner_lead_dispatch_logs',
  'partner_applications',
  'operational_events',
  'lifecycle_enrollments',
  'lifecycle_messages',
  'finance_leads',
  'housing_leads',
  'vertical_leads',
  'analytics_events',
  'product_feedback',
  'decision_feedback',
  'outcome_signal_events',
  'payment_orders',
  'user_entitlements',
  'partner_billing',
  'partner_lead_credits',
  'payment_webhook_logs'
];

for (const table of REQUIRED_LIST_TABLES) {
  if (!listTables.includes(table)) {
    fail(`admin-action listTables missing required table: ${table}`);
  }
}

const repairMigration = path.join(
  root,
  'supabase/migrations/20260531220000_admin_production_stabilization_repair.sql'
);
if (!fs.existsSync(repairMigration)) {
  fail('missing 20260531220000_admin_production_stabilization_repair.sql');
} else {
  const repairSql = fs.readFileSync(repairMigration, 'utf8');
  if (!repairSql.includes('CREATE OR REPLACE FUNCTION public.is_admin()')) {
    fail('repair migration must define is_admin()');
  }
  if (!repairSql.includes('partner_lead_dispatch_logs')) {
    fail('repair migration must bootstrap partner_lead_dispatch_logs');
  }
}

const partnerCrmMigration = path.join(
  root,
  'supabase/migrations/20260531230000_partner_applications_crm_crud.sql'
);
if (!fs.existsSync(partnerCrmMigration)) {
  fail('missing 20260531230000_partner_applications_crm_crud.sql');
} else {
  const crmSql = fs.readFileSync(partnerCrmMigration, 'utf8');
  if (!crmSql.includes('is_archived')) {
    fail('partner CRM migration must add is_archived');
  }
  if (!crmSql.includes("'inactive'")) {
    fail('partner CRM migration must allow inactive status');
  }
}

for (const action of [
  'listPartnerApplications',
  'createPartnerApplication',
  'updatePartnerApplication',
  'archivePartnerApplication',
  'togglePartnerApplicationActive'
]) {
  if (!adminActionSrc.includes(`"${action}"`)) {
    fail(`admin-action missing partner CRM action: ${action}`);
  }
}

const adminQuery = fs.readFileSync(path.join(root, 'js/admin/admin-query.js'), 'utf8');
if (!adminQuery.includes('preferDirect')) {
  fail('admin-query must support admin-action-first via preferDirect flag');
}
if (!adminQuery.includes('fetchAdminRowById')) {
  fail('admin-query must export fetchAdminRowById');
}

const paymentsAdmin = fs.readFileSync(path.join(root, 'js/admin/payments-admin.js'), 'utf8');
if (!paymentsAdmin.includes('fetchAdminTable')) {
  fail('payments-admin must use fetchAdminTable');
}

const adminPanel = fs.readFileSync(path.join(root, 'js/admin-panel.js'), 'utf8');
const tableRefs = new Set();
for (const m of adminPanel.matchAll(/table:\s*'([a-z_]+)'/g)) {
  tableRefs.add(m[1]);
}
for (const m of adminPanel.matchAll(/adminList\(sb,\s*\{\s*table:\s*'([a-z_]+)'/g)) {
  tableRefs.add(m[1]);
}

for (const table of tableRefs) {
  if (!listTables.includes(table)) {
    fail(`admin-panel references table not in admin-action listTables: ${table}`);
  }
}

const routing = fs.readFileSync(path.join(root, 'js/admin/admin-page-routing.js'), 'utf8');
for (const page of ['vertical-leads', 'unified-funnel']) {
  if (!routing.includes(`'${page}'`)) {
    fail(`ADMIN_PAGE_IDS missing ${page}`);
  }
}

if (adminActionSrc.includes('SUPABASE_SERVICE_ROLE_KEY')) {
  const frontendFiles = ['js/admin-panel.js', 'js/core/admin-client.js', 'js/admin/admin-query.js'];
  for (const rel of frontendFiles) {
    const src = fs.readFileSync(path.join(root, rel), 'utf8');
    if (src.includes('SERVICE_ROLE_KEY') || src.includes('service_role')) {
      fail(`${rel} must not reference service role key`);
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log(
  'admin-schema-contract-audit: OK',
  `(${listTables.length} listTables, ${tableRefs.size} admin-panel tables checked)`
);
