import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  "supabase/migrations/20260814011500_warehouse_cycle_count_recount_request_payload_fix.sql",
  "utf8",
);

test("recount RPC request_payload kolonunu kullanır", () => {
  assert.match(source, /\brequest_payload\b/);
  assert.doesNotMatch(source, /^\s+payload,\s*$/m);
});

test("canonical v_payload değişkeni korunur", () => {
  assert.match(source, /v_payload jsonb;/);
  assert.match(source, /v_payload\s*:=\s*jsonb_build_object/i);
});

test("caller JWT ve SECURITY DEFINER korunur", () => {
  assert.match(source, /auth\.uid\(\)/);
  assert.match(source, /security definer/i);
  assert.match(source, /warehouse_has_account_role/);
});

test("public ve anon kapalı authenticated execute korunur", () => {
  assert.match(source, /from public;/i);
  assert.match(source, /from anon;/i);
  assert.match(source, /to authenticated;/i);
});

test("fix inventory veya adjustment mutation yapmaz", () => {
  assert.doesNotMatch(source, /update\s+public\.warehouse_inventory_balances/i);
  assert.doesNotMatch(source, /insert\s+into\s+public\.warehouse_inventory_movements/i);
  assert.doesNotMatch(source, /insert\s+into\s+public\.warehouse_cycle_count_adjustments/i);
  assert.doesNotMatch(source, /insert\s+into\s+public\.warehouse_cycle_count_approvals/i);
});
