import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const script = fs.readFileSync(
  'scripts/apply-warehouse-migrations-api.sh',
  'utf8'
);

const workflow = fs.readFileSync(
  '.github/workflows/production-deploy.yml',
  'utf8'
);

const migrations = [
  '20260811222000_warehouse_product_inventory_persistence.sql',
  '20260811224000_warehouse_receiving_write_persistence.sql',
  '20260811235200_warehouse_atomic_inventory_posting.sql',
  '20260812101500_warehouse_putaway_persistence.sql',
  '20260812105000_warehouse_putaway_write_foundation.sql',
  '20260812124500_warehouse_putaway_atomic_execute.sql',
  '20260812132000_warehouse_putaway_complete.sql',
  '20260812161000_warehouse_picking_persistence.sql',
  '20260812164500_warehouse_picking_write_foundation.sql',
  '20260812170500_warehouse_inventory_reservation_persistence.sql',
  '20260812174500_warehouse_picking_atomic_execute.sql',
  '20260812181500_warehouse_picking_complete.sql',
  '20260812184500_warehouse_picking_resolve_exception.sql',
  '20260812212000_warehouse_quality_control_persistence.sql',
  '20260813080000_warehouse_quality_control_write_foundation.sql',
  '20260813130000_warehouse_cycle_count_persistence.sql',
  '20260813170000_warehouse_cycle_count_quantity_write.sql',
  '20260813213500_warehouse_cycle_count_variance_recount_persistence.sql',
  '20260813221000_warehouse_cycle_count_first_evaluation.sql',
  '20260813233000_warehouse_cycle_count_recount_quantity_write.sql',
  '20260814003000_warehouse_cycle_count_recount_evaluation.sql',
  '20260814010000_warehouse_cycle_count_completion.sql',
  '20260814011500_warehouse_cycle_count_recount_request_payload_fix.sql',
  '20260814012000_warehouse_cycle_count_completion_rpc.sql',
  '20260814013000_warehouse_cycle_count_management_read.sql',
  '20260814014000_warehouse_cycle_count_periodic_planning.sql',
  '20260814015000_warehouse_cycle_count_periodic_runtime.sql',
];

test('production fallback exact 27 WarehouseIQ migration zincirini taşır', () => {
  assert.equal(migrations.length, 27);

  for (const migration of migrations) {
    assert.match(script, new RegExp(migration.replaceAll('.', '\\.')));
  }
});

test('warehouse fallback tek atomik transaction bundle kullanır', () => {
  assert.match(script, /echo "begin;"/i);
  assert.match(script, /echo "commit;"/i);
  assert.match(script, /lock_timeout/);
  assert.match(script, /statement_timeout/);
});

test('production fallback Management API database query boundary kullanır', () => {
  assert.match(
    script,
    /api\.supabase\.com\/v1\/projects\/\$\{REF\}\/database\/query/
  );
  assert.match(script, /Authorization: Bearer \$\{TOKEN\}/);
});

test('fallback foundation preflight ve runtime postflight doğrular', () => {
  assert.match(script, /warehouse_accounts/);
  assert.match(script, /warehouse_locations/);
  assert.match(script, /warehouse_operations_dashboard_snapshots/);
  assert.match(script, /warehouse_inventory_balances/);
  assert.match(script, /warehouse_cycle_count_rules/);
  assert.match(script, /warehouse_cycle_count_schedules/);
  assert.match(script, /warehouse_cycle_count_schedule_runs/);
  assert.match(script, /warehouse_cycle_count_process_due_schedules/);
});

test('fallback migration history yazmaz veya migration repair yapmaz', () => {
  assert.doesNotMatch(script, /schema_migrations/);
  assert.doesNotMatch(script, /migration repair/);
  assert.doesNotMatch(script, /supabase db push/);
});

test('runtime hazırsa fallback tekrar migration uygulamaz', () => {
  assert.match(
    script,
    /if runtime_ready >\/dev\/null 2>&1; then[\s\S]*already ready[\s\S]*exit 0/
  );
});

test('production deploy blind Supabase db push içermez', () => {
  assert.doesNotMatch(
    workflow,
    /supabase\s+db\s+push/i
  );

  assert.doesNotMatch(
    workflow,
    /--include-all/i
  );

  assert.doesNotMatch(
    workflow,
    /steps\.db_push/i
  );
});

test('production deploy WarehouseIQ controlled Management API apply kullanır', () => {
  assert.match(
    workflow,
    /Apply WarehouseIQ schema \(Management API, controlled\)[\s\S]*if: steps\.gate\.outputs\.skip != 'true'[\s\S]*apply-warehouse-migrations-api\.sh/
  );
});

test('production schema apply gate dört kontrollü runnerı fail-closed doğrular', () => {
  assert.match(
    workflow,
    /steps\.vertical_schema_fallback\.outcome/
  );

  assert.match(
    workflow,
    /steps\.vpd_schema_fallback\.outcome/
  );

  assert.match(
    workflow,
    /steps\.ai_listings_schema_fallback\.outcome/
  );

  assert.match(
    workflow,
    /steps\.warehouse_schema_fallback\.outcome/
  );
});

test('production deploy WarehouseIQ şemasını ayrıca verify eder', () => {
  assert.match(
    workflow,
    /Verify WarehouseIQ schema[\s\S]*apply-warehouse-migrations-api\.sh --verify-only/
  );
});
