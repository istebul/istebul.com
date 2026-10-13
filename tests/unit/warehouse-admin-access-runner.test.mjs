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

test('runner applies only the three explicitly approved WarehouseIQ access migrations', () => {
  assert.match(runner, /20261011190000_warehouse_admin_user_access\.sql/);
  assert.match(runner, /20261011200000_warehouse_operational_access_guards\.sql/);
  assert.match(runner, /20261011210000_warehouse_rpc_role_alignment\.sql/);
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
    /id: warehouse_admin_access_verification\n\s+if: always\(\) && steps\.gate\.outcome == 'success' && steps\.gate\.outputs\.skip != 'true'\n\s+run: bash scripts\/apply-warehouse-admin-access-api\.sh --verify-only/,
  );
  assert.match(
    workflow,
    /name: Require controlled schema applies\n\s+if: always\(\) && steps\.gate\.outcome == 'success' && steps\.gate\.outputs\.skip != 'true'/,
  );
});
