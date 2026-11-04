import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const runner = readFileSync(
  new URL('../../scripts/apply-warehouse-admin-access-api.sh', import.meta.url),
  'utf8',
);

const workflow = readFileSync(
  new URL('../../.github/workflows/production-deploy.yml', import.meta.url),
  'utf8',
);

test('runner verifies the complete assignment table privilege allowlist', () => {
  const aclStart = runner.indexOf(') AS assignment_acl_ready');
  assert.notEqual(aclStart, -1);

  const aclBlock = runner.slice(
    runner.lastIndexOf('    (', aclStart),
    aclStart,
  );

  for (const privilege of ['SELECT', 'INSERT', 'DELETE']) {
    assert.match(
      aclBlock,
      new RegExp('has_table_privilege\\([\\s\\S]*?' + privilege + "'"),
    );
  }

  for (const privilege of [
    'UPDATE',
    'TRUNCATE',
    'REFERENCES',
    'TRIGGER',
    'MAINTAIN',
  ]) {
    assert.match(
      aclBlock,
      new RegExp('NOT has_table_privilege\\([\\s\\S]*?' + privilege + "'"),
    );
  }
});

test('runner separates schema setup from assignment ACL hardening', () => {
  assert.match(runner, /20261011190000_warehouse_admin_user_access\.sql/);
  assert.match(runner, /20261011200000_warehouse_operational_access_guards\.sql/);
  assert.match(runner, /20261011210000_warehouse_rpc_role_alignment\.sql/);
  assert.match(runner, /20261104090000_warehouse_assignment_acl_hardening\.sql/);
  assert.match(runner, /assignment_acl_ready/);
  assert.match(runner, /schema_ready/);
  assert.match(runner, /if jq -e '\.\[0\]\.schema_ready == true'/);
  assert.match(runner, /MIGRATIONS=\(/);
});

test('runner wraps migrations in one bounded transaction', () => {
  assert.match(runner, /BEGIN;/i);
  assert.match(runner, /COMMIT;/i);
  assert.match(runner, /lock_timeout/);
  assert.match(runner, /statement_timeout/);
  assert.match(runner, /900000/);
});

test('runner fails closed when prerequisites are missing and verifies final state', () => {
  assert.match(runner, /prerequisites_ok/);
  assert.match(runner, /admin_ready/);
  assert.match(runner, /guard_ready/);
  assert.match(runner, /rpc_roles_ready/);
  assert.match(runner, /assignment_acl_ready/);
  assert.match(runner, /schema_ready/);
  assert.match(runner, /if \[ "\$MODE" = "--verify-only" \]/);
  assert.match(runner, /Migration sonrası doğrulama başarısız/);
});

test('runner uses Management API helpers without mutating migration history', () => {
  assert.match(runner, /mgmt_api_query_with_retry/);
  assert.match(runner, /--data-binary/);
  assert.match(runner, /APPLY_PAYLOAD_FILE/);
  assert.doesNotMatch(runner, /mgmt_api_apply_sql_file|mgmt_db_apply_sql_file/);
  assert.doesNotMatch(runner, /schema_migrations|migration repair|supabase\s+db\s+push|--include-all/i);
});


test('runner requires an explicit mode and sends the apply request once', () => {
  assert.match(runner, /MODE="\$\{1:-\}"/);
  assert.match(runner, /no retry or direct DB fallback/i);
});

test('production workflow gates Admin/access apply and orders schema before Pages', () => {
  assert.match(workflow, /workflow_dispatch:\s+inputs:\s+apply_warehouse_admin_access:[\s\S]*?type: boolean[\s\S]*?default: false/);
  assert.match(workflow, /deploy-cloudflare:[\s\S]*?needs: \[quality, deploy-edge-intake, deploy-supabase\]/);
  assert.match(workflow, /github\.event_name == 'workflow_dispatch' && inputs\.apply_warehouse_admin_access/);
  assert.match(workflow, /id: warehouse_admin_access_verification/);
  assert.match(workflow, /steps\.warehouse_admin_access_verification\.outcome/);
  assert.match(workflow, /SUPABASE_ACCESS_TOKEN not set.*refusing production release/);
});

test('Admin/access verification runs after an ambiguous apply failure', () => {
  assert.match(
    workflow,
    /id: warehouse_admin_access_schema\n\s+if: [^\n]+\n\s+continue-on-error: true\n\s+run: bash scripts\/apply-warehouse-admin-access-api\.sh apply/,
  );
  assert.match(
    workflow,
    /id: warehouse_admin_access_verification\n\s+if: always\(\) && steps\.gate\.outcome == 'success' && steps\.gate\.outputs\.skip != 'true' && github\.event_name == 'workflow_dispatch' && inputs\.apply_warehouse_admin_access == true\n\s+run: bash scripts\/apply-warehouse-admin-access-api\.sh --verify-only/,
  );
  assert.match(
    workflow,
    /name: Require controlled schema applies\n\s+if: always\(\) && steps\.gate\.outcome == 'success' && steps\.gate\.outputs\.skip != 'true'/,
  );
});

const historicalAdminAccessMigration = readFileSync(
  new URL('../../supabase/migrations/20261011190000_warehouse_admin_user_access.sql', import.meta.url),
  'utf8',
);

const assignmentAclMigration = readFileSync(
  new URL('../../supabase/migrations/20261104090000_warehouse_assignment_acl_hardening.sql', import.meta.url),
  'utf8',
);

test('historical Admin/access migration remains unchanged', () => {
  assert.match(
    historicalAdminAccessMigration,
    /REVOKE ALL ON TABLE public\.warehouse_user_warehouse_assignments FROM PUBLIC, anon;/,
  );
  assert.doesNotMatch(
    historicalAdminAccessMigration,
    /FROM PUBLIC, anon, authenticated;/,
  );
});

test('forward ACL migration revokes broad privileges before restoring required privileges', () => {
  const revoke = assignmentAclMigration.indexOf('REVOKE ALL');
  const grant = assignmentAclMigration.indexOf(
    'GRANT SELECT, INSERT, DELETE',
  );

  assert.notEqual(revoke, -1, 'Existing authenticated privileges must be revoked');
  assert.notEqual(grant, -1, 'Only required authenticated privileges must be granted');
  assert.ok(revoke < grant, 'REVOKE must execute before GRANT');
  assert.doesNotMatch(assignmentAclMigration, /\\bBEGIN;|\\bCOMMIT;/i);
  assert.doesNotMatch(
    assignmentAclMigration,
    /GRANT\\s+(?:ALL|UPDATE|TRUNCATE|REFERENCES|TRIGGER|MAINTAIN)[\\s\\S]{0,180}warehouse_user_warehouse_assignments[\\s\\S]{0,100}\\bTO\\s+authenticated\\b/i,
  );
});
