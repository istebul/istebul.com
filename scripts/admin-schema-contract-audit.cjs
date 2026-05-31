#!/usr/bin/env node
/**
 * Admin schema contract — partner CRM actions and migration checks.
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

for (const table of ['partner_applications', 'partner_lead_dispatch_logs', 'subscriptions']) {
  if (!listTables.includes(table)) {
    fail(`admin-action listTables missing required table: ${table}`);
  }
}

const partnerCrmMigration = path.join(
  root,
  'supabase/migrations/20260618_partner_applications_crm_v1.sql'
);
if (!fs.existsSync(partnerCrmMigration)) {
  fail('missing 20260618_partner_applications_crm_v1.sql');
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
if (!adminQuery.includes('collectAdminFallbackNotes')) {
  fail('admin-query must export collectAdminFallbackNotes');
}

const moduleSrc = fs.readFileSync(
  path.join(root, 'js/admin/partner-applications-admin.js'),
  'utf8'
);
if (!moduleSrc.includes('listPartnerApplications')) {
  fail('partner-applications-admin must call listPartnerApplications');
}

if (failed) {
  process.exit(1);
}

console.log(
  'admin-schema-contract-audit: OK',
  `(${listTables.length} listTables, partner CRM actions verified)`
);
