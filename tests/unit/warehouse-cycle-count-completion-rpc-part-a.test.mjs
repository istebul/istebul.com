import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  "supabase/migrations/20260814012000_warehouse_cycle_count_completion_rpc.sql",
  "utf8",
);

test("completion RPC SECURITY DEFINER ve caller JWT kullanır", () => {
  assert.match(
    source,
    /warehouse_cycle_count_completion_write/i,
  );

  assert.match(
    source,
    /security definer/i,
  );

  assert.match(
    source,
    /auth\.uid\(\)/,
  );
});

test("completion idempotency request_payload gerçek kolonunu kullanır", () => {
  assert.match(
    source,
    /request_payload/i,
  );

  assert.doesNotMatch(
    source,
    /^\s+payload,\s*$/m,
  );

  assert.match(
    source,
    /response_payload/i,
  );
});

test("completion canonical payload warehouse count action ve notes bağlar", () => {
  assert.match(
    source,
    /'warehouseId'[\s\S]*p_warehouse_id/i,
  );

  assert.match(
    source,
    /'cycleCountId'[\s\S]*p_cycle_count_id/i,
  );

  assert.match(
    source,
    /'action'[\s\S]*v_action/i,
  );

  assert.match(
    source,
    /'notes'[\s\S]*v_notes/i,
  );
});

test("parent Cycle Count aynı account warehouse ve id ile FOR UPDATE kilitlenir", () => {
  assert.match(
    source,
    /from public\.warehouse_cycle_counts[\s\S]*account_id[\s\S]*warehouse_id[\s\S]*id[\s\S]*for update/i,
  );
});

test("prepare rol kontratı supervisor dahil dar yönetim rolleridir", () => {
  assert.match(
    source,
    /prepare_adjustments[\s\S]*warehouse_has_account_role[\s\S]*'supervisor'[\s\S]*'inventory_controller'/i,
  );
});

test("approve count açık recount review adjustment ve task varsa bloklanır", () => {
  assert.match(
    source,
    /recount_required = true/i,
  );

  assert.match(
    source,
    /adjustment_required = true/i,
  );

  assert.match(
    source,
    /'under_review'/i,
  );

  assert.match(
    source,
    /warehouse_cycle_count_tasks/i,
  );
});

test("approve_count yalnız item ve parent lifecycle onayı yapar", () => {
  const section =
    source.split(
      "-- PREPARE ADJUSTMENTS",
    )[0];

  assert.match(
    section,
    /status\s*=\s*'approved'/i,
  );

  assert.match(
    section,
    /approved_by\s*=\s*v_user_id/i,
  );

  assert.doesNotMatch(
    section,
    /update\s+public\.warehouse_inventory_balances/i,
  );

  assert.doesNotMatch(
    section,
    /insert\s+into\s+public\.warehouse_inventory_movements/i,
  );
});

test("prepare final quantity ve fiziksel timestamp zorunluluğunu uygular", () => {
  assert.match(
    source,
    /final_count_quantity is null/i,
  );

  assert.match(
    source,
    /coalesce\(\s*v_item\.recounted_at,\s*v_item\.counted_at\s*\)/i,
  );
});

test("prepare latest recount sonucunu first count sonucuna tercih eder", () => {
  assert.match(
    source,
    /evaluation_stage = 'recount'[\s\S]*then 0[\s\S]*else 1/i,
  );
});

test("prepare exact inventory natural key ve FOR UPDATE kullanır", () => {
  for (
    const token
    of [
      "warehouse_id",
      "location_id",
      "product_id",
      "sku_id",
      "lot_number",
      "serial_number",
      "stock_status",
    ]
  ) {
    assert.match(
      source,
      new RegExp(token),
    );
  }

  assert.match(
    source,
    /warehouse_inventory_balances[\s\S]*for update/i,
  );
});

test("tracking lotNumber ve serialNumber domain sözleşmesini kullanır", () => {
  assert.match(
    source,
    /tracking\s*->>\s*'lotNumber'/i,
  );

  assert.match(
    source,
    /tracking\s*->>\s*'serialNumber'/i,
  );
});

test("sayım sonrası stok hareketi adjustment hazırlamayı bloke eder", () => {
  assert.match(
    source,
    /last_movement_at[\s\S]*v_physical_counted_at/i,
  );

  assert.match(
    source,
    /'inventory_movement_detected'/i,
  );
});

test("unit mismatch kontrollü exception üretir", () => {
  assert.match(
    source,
    /v_balance\.unit <> v_item\.unit/i,
  );

  assert.match(
    source,
    /'unit_mismatch'/i,
  );
});

test("prepare adjustment ve pending approval persistence oluşturur", () => {
  assert.match(
    source,
    /insert into\s+public\.warehouse_cycle_count_adjustments/i,
  );

  assert.match(
    source,
    /'approval_required'/i,
  );

  assert.match(
    source,
    /insert into\s+public\.warehouse_cycle_count_approvals/i,
  );

  assert.match(
    source,
    /'pending'/i,
  );
});

test("prepare damage final quantity guardını uygular", () => {
  assert.match(
    source,
    /final_count_quantity\s*<\s*v_item\.damaged_quantity/i,
  );

  assert.match(
    source,
    /v_adjustment_type\s*:=\s*'damage'/i,
  );
});

test("approve_adjustments explicit approval audit alanlarını yazar", () => {
  assert.match(
    source,
    /status\s*=\s*'approved'[\s\S]*approved_by\s*=\s*v_user_id/i,
  );

  assert.match(
    source,
    /approver_id\s*=\s*v_user_id/i,
  );

  assert.match(
    source,
    /approved_at\s*=\s*v_now/i,
  );
});

test("approval_required exception başarılı onayda çözülür", () => {
  assert.match(
    source,
    /warehouse_cycle_count_exceptions[\s\S]*resolved\s*=\s*true[\s\S]*type\s*=\s*'approval_required'/i,
  );
});

test("reject_adjustments approval rejected adjustment cancelled item under_review yapar", () => {
  assert.match(
    source,
    /status\s*=\s*'rejected'/i,
  );

  assert.match(
    source,
    /status\s*=\s*'cancelled'/i,
  );

  assert.match(
    source,
    /status\s*=\s*'under_review'/i,
  );
});

test("Part A aşamaları hiçbir inventory balance veya movement mutationı yapmaz", () => {
  const partA =
    source.split(
      "-- PROCESS ADJUSTMENTS",
    )[0];

  assert.doesNotMatch(
    partA,
    /update\s+public\.warehouse_inventory_balances/i,
  );

  assert.doesNotMatch(
    partA,
    /insert\s+into\s+public\.warehouse_inventory_balances/i,
  );

  assert.doesNotMatch(
    partA,
    /insert\s+into\s+public\.warehouse_inventory_movements/i,
  );
});

test("process_adjustments ve complete_count artık gerçek lifecycle branchleridir", () => {
  assert.match(
    source,
    /elsif v_action = 'process_adjustments'/i,
  );

  assert.match(
    source,
    /elsif v_action = 'complete_count'/i,
  );

  assert.doesNotMatch(
    source,
    /errcode\s*=\s*'0A000'/i,
  );
});

test("RPC public ve anon kapalı authenticated execute sınırındadır", () => {
  assert.match(
    source,
    /from public;/i,
  );

  assert.match(
    source,
    /from anon;/i,
  );

  assert.match(
    source,
    /to authenticated;/i,
  );
});
