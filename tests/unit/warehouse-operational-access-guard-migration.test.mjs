import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const migration = readFileSync(
  new URL('../../supabase/migrations/20261011200000_warehouse_operational_access_guards.sql', import.meta.url),
  'utf8',
);

test('access helper requires active membership, matching warehouse and assignment plus module permission', () => {
  assert.match(migration, /warehouse_has_warehouse_permission\s*\(/i);
  assert.match(migration, /membership\.status\s*=\s*'active'/i);
  assert.match(migration, /warehouse_user_warehouse_assignments/i);
  assert.match(migration, /warehouse_user_permissions/i);
  assert.match(migration, /warehouse\.id\s*=\s*requested_warehouse_id/i);
});

test('legacy owner is compatibility-only and not added to assignable roles here', () => {
  assert.match(migration, /membership\.role\s+IN\s*\('admin',\s*'owner'\)/i);
  assert.match(migration, /assignable role in the Admin API/i);
  assert.doesNotMatch(migration, /INSERT\s+INTO\s+public\.warehouse_users[\s\S]{0,300}['"]owner['"]/i);
});

test('trigger validates old and new scope and blocks moving a row across warehouses', () => {
  assert.match(migration, /TG_OP IN \('UPDATE', 'DELETE'\)/i);
  assert.match(migration, /TG_OP IN \('INSERT', 'UPDATE'\)/i);
  assert.match(migration, /warehouse_operational_scope_immutable/i);
  assert.match(migration, /warehouse_assignment_or_module_permission_required/i);
});

test('core operation modules have explicit permission mappings', () => {
  for (const permission of ['receiving', 'putaway', 'picking', 'packing', 'shipping', 'cycle_count', 'quality_control']) {
    assert.ok(migration.includes(`'${permission}'`), `missing permission mapping: ${permission}`);
  }
});

test('guard triggers attach only to warehouse-scoped operational records, not idempotency request tables', () => {
  assert.match(migration, /CREATE TRIGGER trg_warehouse_operational_access_guard/i);
  assert.match(migration, /warehouse_receivings/);
  assert.match(migration, /warehouse_putaways/);
  assert.match(migration, /warehouse_pickings/);
  assert.match(migration, /warehouse_packings/);
  assert.match(migration, /warehouse_shippings/);
  assert.match(migration, /warehouse_cycle_counts/);
  assert.match(migration, /warehouse_quality_inspections/);
  for (const rootTable of ['warehouse_receivings', 'warehouse_putaways', 'warehouse_pickings', 'warehouse_packings', 'warehouse_shippings', 'warehouse_cycle_counts']) {
    assert.match(migration, new RegExp(`source_table = '${rootTable}'`), `missing root table mapping: ${rootTable}`);
  }
  assert.doesNotMatch(migration, /'warehouse_receiving_write_requests'\s*,/i);
  assert.doesNotMatch(migration, /'warehouse_picking_write_requests'\s*,/i);
  assert.doesNotMatch(migration, /'warehouse_packing_write_requests'\s*,/i);
  assert.doesNotMatch(migration, /'warehouse_shipping_write_requests'\s*,/i);
});

test('service-role exception is the only explicit write-guard bypass', () => {
  assert.match(migration, /COALESCE\(auth\.role\(\), ''\) = 'service_role'/i);
  assert.match(migration, /service key must never be sent to a browser/i);
});


test('explicit warehouse rows validate their parents too', () => {
  const warehouseResolution = migration.indexOf(
    "v_warehouse_id :=\n    NULLIF(BTRIM(source_row ->> 'warehouse_id'), '')::uuid;"
  );
  const parentValidation = migration.indexOf(
    "IF COALESCE(array_length(v_parent_keys, 1), 0) > 0 THEN"
  );

  assert.notEqual(warehouseResolution, -1);
  assert.notEqual(parentValidation, -1);
  assert.ok(parentValidation > warehouseResolution);
  assert.match(
    migration,
    /v_warehouse_id IS DISTINCT FROM v_parent_warehouse_id/i
  );
});

test('picking waves and batches validate every linked picking', () => {
  assert.match(
    migration,
    /source_table IN\s*\(\s*'warehouse_picking_waves',\s*'warehouse_picking_batches'\s*\)/i
  );
  assert.match(
    migration,
    /jsonb_array_elements\(source_row -> 'picking_ids'\)/i
  );
  assert.match(
    migration,
    /picking\.account_id = requested_account_id\s+AND picking\.id = v_picking_id/i
  );
});

test('each operational table uses only its primary module permission', () => {
  const start = migration.indexOf(
    'CREATE OR REPLACE FUNCTION public.warehouse_operational_permissions_for_table('
  );
  const end = migration.indexOf(
    'REVOKE ALL ON FUNCTION public.warehouse_operational_permissions_for_table',
    start
  );
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  const mapping = migration.slice(start, end);
  for (const permission of [
    'receiving',
    'putaway',
    'picking',
    'packing',
    'shipping',
    'cycle_count',
    'quality_control',
  ]) {
    assert.ok(
      mapping.includes(`ARRAY['${permission}']`),
      `missing dedicated mapping for ${permission}`
    );
  }

  assert.doesNotMatch(mapping, /ARRAY\['picking',\s*'packing'\]/i);
  assert.doesNotMatch(mapping, /ARRAY\['packing',\s*'shipping'\]/i);
});

test('location references must belong to the resolved warehouse', () => {
  assert.match(
    migration,
    /FOREACH v_key IN ARRAY v_location_keys LOOP/i
  );
  assert.match(
    migration,
    /FROM public\.warehouse_locations location/i
  );
  assert.match(
    migration,
    /v_parent_warehouse_id IS DISTINCT FROM v_warehouse_id/i
  );
});


test('operational location fields and dock references are validated', () => {
  for (const field of [
    'location_id',
    'source_location_id',
    'destination_location_id',
    'receiving_location_id',
    'target_location_id',
    'start_location_id',
    'end_location_id',
    'packing_location_id',
    'shipping_location_id',
  ]) {
    assert.match(migration, new RegExp(`'${field}'`));
  }

  assert.match(migration, /FROM public\.warehouse_shipping_docks dock/i);
  assert.match(
    migration,
    /dock\.account_id = requested_account_id[\s\S]*?dock\.id = v_parent_id/i
  );
});

test('cycle-count approval adjustments must match account, count, and warehouse', () => {
  const start = migration.indexOf(
    'Approval adjustments must match the same account, count, and warehouse.'
  );
  const end = migration.indexOf(
    '-- Dalga ve parti içindeki her picking aynı depo/firma kapsamında olmalı.',
    start
  );

  assert.notEqual(start, -1, 'missing approval adjustment validation');
  assert.notEqual(end, -1, 'approval validation block has no expected end marker');

  const block = migration.slice(start, end);
  assert.match(block, /source_table = 'warehouse_cycle_count_approvals'/i);
  assert.match(block, /FROM public\.warehouse_cycle_count_adjustments adjustment/i);
  assert.match(block, /adjustment\.account_id = requested_account_id/i);
  assert.match(block, /adjustment\.cycle_count_id\s*=/i);
  assert.match(block, /adjustment\.warehouse_id/i);
  assert.match(block, /v_parent_warehouse_id IS DISTINCT FROM v_warehouse_id/i);
});
