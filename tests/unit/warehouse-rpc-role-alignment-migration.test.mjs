import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const migration = readFileSync(
  new URL(
    '../../supabase/migrations/20261011210000_warehouse_rpc_role_alignment.sql',
    import.meta.url,
  ),
  'utf8',
);

const packingFunctions = [
  'warehouse_packing_write',
  'warehouse_packing_create_from_picking',
  'warehouse_packing_confirm_item_write',
  'warehouse_packing_seal_package_write',
  'warehouse_packing_generate_package_label_write',
  'warehouse_packing_label_write',
  'warehouse_packing_resolve_exception_write',
  'warehouse_packing_complete_write',
  'warehouse_packing_mark_shipping_ready_write',
  'warehouse_packing_cancel_write',
  'warehouse_packing_add_package_item_write',
  'warehouse_packing_generate_suggestions_write',
];

const shippingFunctions = [
  'warehouse_shipping_create_from_packing_write',
  'warehouse_shipping_start_loading_write',
  'warehouse_shipping_confirm_item_load_write',
  'warehouse_shipping_load_package_write',
  'warehouse_shipping_complete_loading_write',
  'warehouse_shipping_create_manifest_write',
  'warehouse_shipping_generate_manifest_write',
  'warehouse_shipping_approve_manifest_write',
  'warehouse_shipping_submit_manifest_write',
  'warehouse_shipping_create_asn_write',
  'warehouse_shipping_generate_asn_write',
  'warehouse_shipping_send_asn_write',
  'warehouse_shipping_acknowledge_asn_write',
  'warehouse_shipping_reject_asn_write',
  'warehouse_shipping_cancel_asn_write',
  'warehouse_shipping_dispatch_write',
  'warehouse_shipping_prepare_loading_write',
  'warehouse_shipping_accept_manifest_write',
  'warehouse_shipping_release_write',
  'warehouse_shipping_create_task_write',
  'warehouse_shipping_assign_carrier_vehicle_write',
  'warehouse_shipping_record_proof_of_delivery_write',
  'warehouse_shipping_create_exception_write',
  'warehouse_shipping_resolve_exception_write',
];

test('all expected Packing RPCs are included in the alignment migration', () => {
  for (const name of packingFunctions) {
    assert.ok(migration.includes(`'${name}'`), `missing Packing RPC: ${name}`);
  }
  assert.ok(
    migration.includes("'''inventory_controller'', ''packer'', ''picker'', ''operator'''"),
  );
});

test('all expected Shipping RPCs are included in the alignment migration', () => {
  for (const name of shippingFunctions) {
    assert.ok(migration.includes(`'${name}'`), `missing Shipping RPC: ${name}`);
  }
  assert.match(
    migration,
    /'inventory_controller'', ''dispatcher'', ''picker'', ''operator''/,
  );
});

test('driver is added only to the proof-of-delivery RPC role list', () => {
  assert.match(
    migration,
    /v_function\.proname = 'warehouse_shipping_record_proof_of_delivery_write'/,
  );
  assert.match(
    migration,
    /''inventory_controller'', ''dispatcher'', ''driver'', ''picker'', ''operator''/,
  );
});

test('unexpected definitions fail closed instead of silently skipping a rewrite', () => {
  assert.match(migration, /warehouse_rpc_role_alignment_expected_role_list_missing/);
  assert.match(migration, /warehouse_rpc_role_alignment_no_packing_change/);
  assert.match(migration, /warehouse_rpc_role_alignment_no_shipping_change/);
  assert.match(migration, /warehouse_rpc_role_alignment_packing_function_count_mismatch/);
  assert.match(migration, /warehouse_rpc_role_alignment_shipping_function_count_mismatch/);
});

test('migration accepts already-aligned lists for safe repeated deployment', () => {
  assert.match(migration, /v_packing_roles_pattern text/);
  assert.match(migration, /v_driver_roles_pattern text/);
  assert.match(migration, /IF v_definition ~\* v_packing_roles_pattern THEN/);
  assert.match(migration, /IF v_definition ~\* v_driver_roles_pattern THEN/);
  assert.match(migration, /ELSIF v_definition ~\* v_dispatcher_roles_pattern THEN/);
});

test('migration rewrites existing function definitions without changing signatures deliberately', () => {
  assert.match(migration, /pg_get_functiondef\(v_function\.oid\)/);
  assert.match(migration, /EXECUTE v_rewritten/);
  assert.doesNotMatch(migration, /DROP FUNCTION/i);
});
