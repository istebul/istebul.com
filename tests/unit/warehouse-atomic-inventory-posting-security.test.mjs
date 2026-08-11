import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const atomicMigrationPath =
  "supabase/migrations/20260811235200_warehouse_atomic_inventory_posting.sql";
const receivingMigrationPath =
  "supabase/migrations/20260811224000_warehouse_receiving_write_persistence.sql";

test("complete mutation kapısı dar SECURITY DEFINER sınırında kalır", async () => {
  const sql = await readFile(atomicMigrationPath, "utf8");

  assert.match(
    sql,
    /create or replace function public\.warehouse_receiving_complete_write\([\s\S]{0,240}security definer[\s\S]{0,120}set search_path = public, pg_temp/i,
  );
  assert.match(sql, /v_user_id uuid := auth\.uid\(\)/);
  assert.match(sql, /warehouse_has_account_role\(/);
  assert.match(
    sql,
    /revoke all on function public\.warehouse_receiving_complete_write\([\s\S]{0,160}\) from public;/i,
  );
  assert.match(
    sql,
    /grant execute on function public\.warehouse_receiving_complete_write\([\s\S]{0,160}\) to authenticated;/i,
  );
  assert.doesNotMatch(
    sql,
    /grant execute on function public\.warehouse_receiving_complete_write\([\s\S]{0,160}\) to anon;/i,
  );
});

test("mevcut receiving write RPC SECURITY INVOKER olarak korunur", async () => {
  const sql = await readFile(receivingMigrationPath, "utf8");

  assert.match(
    sql,
    /create or replace function public\.warehouse_receiving_write\([\s\S]{0,260}security invoker/i,
  );
  assert.match(sql, /v_user_id uuid := auth\.uid\(\)/);
});

test("authenticated kullanıcı stok bakiyesine doğrudan yazamaz", async () => {
  const sql = await readFile(atomicMigrationPath, "utf8");

  assert.match(
    sql,
    /drop policy if exists warehouse_inventory_balances_operator_insert[\s\S]{0,180}warehouse_inventory_balances;/i,
  );
  assert.match(
    sql,
    /drop policy if exists warehouse_inventory_balances_operator_update[\s\S]{0,180}warehouse_inventory_balances;/i,
  );
  assert.match(
    sql,
    /revoke insert, update\s+on public\.warehouse_inventory_balances\s+from authenticated;/i,
  );
  assert.doesNotMatch(
    sql,
    /grant[\s\S]{0,80}(insert|update)[\s\S]{0,80}warehouse_inventory_balances[\s\S]{0,80}authenticated/i,
  );
});

test("complete transaction önce kayıtları kilitler sonra stok ve durum yazar", async () => {
  const sql = await readFile(atomicMigrationPath, "utf8");
  const functionStart = sql.indexOf(
    "create or replace function public.warehouse_receiving_complete_write",
  );
  const functionSql = sql.slice(functionStart);

  const receivingLock = functionSql.indexOf(
    "from public.warehouse_receivings",
  );
  const itemLock = functionSql.indexOf(
    "from public.warehouse_receiving_items",
  );
  const movementInsert = functionSql.indexOf(
    "insert into public.warehouse_inventory_movements",
  );
  const balanceWrite = functionSql.indexOf(
    "insert into public.warehouse_inventory_balances",
  );
  const itemMovementLink = functionSql.indexOf(
    "inventory_movement_id = v_movement_id",
  );
  const completeStatus = functionSql.indexOf(
    "status = 'completed'",
  );

  for (const position of [
    receivingLock,
    itemLock,
    movementInsert,
    balanceWrite,
    itemMovementLink,
    completeStatus,
  ]) {
    assert.ok(position >= 0);
  }

  assert.match(
    functionSql.slice(receivingLock, movementInsert),
    /for update/i,
  );
  assert.match(
    functionSql.slice(itemLock, movementInsert),
    /for update/i,
  );

  assert.ok(receivingLock < movementInsert);
  assert.ok(itemLock < movementInsert);
  assert.ok(movementInsert < balanceWrite);
  assert.ok(balanceWrite < itemMovementLink);
  assert.ok(itemMovementLink < completeStatus);
});

test("idempotency receiving kimliğini payload ile bağlar", async () => {
  const sql = await readFile(atomicMigrationPath, "utf8");

  assert.match(
    sql,
    /v_payload\s*:=\s*jsonb_build_object\([\s\S]{0,180}'receivingId'[\s\S]{0,100}p_receiving_id/i,
  );
  assert.match(
    sql,
    /primary key \(account_id, request_id\)|on conflict \(account_id, request_id\) do nothing/i,
  );
  assert.match(
    sql,
    /v_existing_action <> 'complete'[\s\S]{0,120}v_existing_payload <> v_payload/i,
  );
});

test("service role atomik posting katmanına girmez", async () => {
  const atomicSql = await readFile(atomicMigrationPath, "utf8");
  const api = await readFile(
    "functions/api/warehouse/receiving.js",
    "utf8",
  );

  assert.equal(atomicSql.includes("SUPABASE_SERVICE_ROLE_KEY"), false);
  assert.equal(api.includes("SUPABASE_SERVICE_ROLE_KEY"), false);
  assert.match(api, /SUPABASE_ANON_KEY/);
  assert.match(api, /Authorization:\s*`Bearer \$\{token\}`/);
});


test("inventory ledger doğrudan authenticated yazımına kapalıdır", async () => {
  const sql = await readFile(
    "supabase/migrations/20260811235200_warehouse_atomic_inventory_posting.sql",
    "utf8",
  );

  assert.match(
    sql,
    /drop policy if exists warehouse_inventory_movements_operator_insert/,
  );
  assert.match(
    sql,
    /revoke insert[\s\S]{0,160}warehouse_inventory_movements[\s\S]{0,80}from authenticated/,
  );
  assert.match(
    sql,
    /grant select[\s\S]{0,120}warehouse_inventory_movements[\s\S]{0,80}to authenticated/,
  );
});

test("movement sequence mevcut ledgerdan seed edilir ve istemciye kapalıdır", async () => {
  const sql = await readFile(
    "supabase/migrations/20260811235200_warehouse_atomic_inventory_posting.sql",
    "utf8",
  );

  assert.match(sql, /v_existing_max bigint/);
  assert.match(sql, /v_sequence_last bigint/);
  assert.match(sql, /regexp_match[\s\S]{0,220}HRK-/);
  assert.match(sql, /greatest\(v_existing_max, v_sequence_last\)/);
  assert.match(sql, /setval\(/);

  assert.match(
    sql,
    /revoke all[\s\S]{0,160}warehouse_inventory_movement_number_seq[\s\S]{0,80}from authenticated/,
  );
});
