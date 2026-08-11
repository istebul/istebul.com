import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const migrationPath =
  "supabase/migrations/20260811235200_warehouse_atomic_inventory_posting.sql";

test("atomik receiving complete RPC JWT kimliği ve rol doğrulaması yapar", async () => {
  const sql = await readFile(migrationPath, "utf8");

  assert.match(
    sql,
    /create or replace function public\.warehouse_receiving_complete_write/,
  );
  assert.match(sql, /security definer/);
  assert.match(sql, /auth\.uid\(\)/);
  assert.match(sql, /warehouse_has_account_role/);
  assert.match(
    sql,
    /revoke all on function public\.warehouse_receiving_complete_write/,
  );
  assert.match(
    sql,
    /grant execute on function public\.warehouse_receiving_complete_write[\s\S]*to authenticated/,
  );
  assert.equal(
    sql.includes("SUPABASE_SERVICE_ROLE_KEY"),
    false,
  );
});

test("stok bakiyesi doğrudan authenticated yazımına kapatılır", async () => {
  const sql = await readFile(migrationPath, "utf8");

  assert.match(
    sql,
    /drop policy if exists warehouse_inventory_balances_operator_insert/,
  );
  assert.match(
    sql,
    /drop policy if exists warehouse_inventory_balances_operator_update/,
  );
  assert.match(
    sql,
    /revoke insert, update[\s\S]*warehouse_inventory_balances[\s\S]*from authenticated/,
  );
  assert.match(
    sql,
    /grant select[\s\S]*warehouse_inventory_balances[\s\S]*to authenticated/,
  );
});

test("complete action idempotency sözleşmesine eklenir", async () => {
  const sql = await readFile(migrationPath, "utf8");

  assert.match(
    sql,
    /warehouse_receiving_write_requests_action_check/,
  );
  assert.match(sql, /'complete'/);
  assert.match(
    sql,
    /Aynı istek kimliği farklı bir işlem için kullanılamaz/,
  );
  assert.match(
    sql,
    /response = v_result/,
  );
});

test("receiving ve item satırları transaction içinde kilitlenir", async () => {
  const sql = await readFile(migrationPath, "utf8");

  assert.match(
    sql,
    /from public\.warehouse_receivings[\s\S]{0,300}for update/,
  );
  assert.match(
    sql,
    /from public\.warehouse_receiving_items[\s\S]{0,300}for update/,
  );
});

test("işlem görmemiş satır ve kalite kontrol kuralları korunur", async () => {
  const sql = await readFile(migrationPath, "utf8");

  assert.match(sql, /received_quantity = 0/);
  assert.match(sql, /quality_control_required/);
  assert.match(sql, /status = 'quality_control'/);
  assert.match(sql, /postedMovementCount', 0/);
});

test("stok hareketi bakiye ve receiving item tek fonksiyon içinde yazılır", async () => {
  const sql = await readFile(migrationPath, "utf8");

  assert.match(
    sql,
    /insert into public\.warehouse_inventory_movements/,
  );
  assert.match(
    sql,
    /insert into public\.warehouse_inventory_balances/,
  );
  assert.match(
    sql,
    /on conflict \([\s\S]*account_id[\s\S]*stock_status[\s\S]*\)[\s\S]*do update/,
  );
  assert.match(
    sql,
    /update public\.warehouse_receiving_items[\s\S]*inventory_movement_id/,
  );
  assert.match(
    sql,
    /update public\.warehouse_receivings[\s\S]*status = 'completed'/,
  );
});

test("receiving kaynak hareket eşlemesi mevcut domain davranışını korur", async () => {
  const sql = await readFile(migrationPath, "utf8");

  for (const pair of [
    ["purchase_order", "purchase_receipt"],
    ["advance_shipping_notice", "purchase_receipt"],
    ["production", "production_receipt"],
    ["customer_return", "customer_return"],
    ["manual", "goods_receipt"],
  ]) {
    assert.ok(
      sql.includes(`when '${pair[0]}' then '${pair[1]}'`),
      `${pair[0]} -> ${pair[1]} eşlemesi bulunmalıdır`,
    );
  }

  assert.match(
    sql,
    /Depolar arası transfer kabulü Transfer Engine tamamlandıktan sonra etkinleştirilecektir\./,
  );
});

test("movement ve balance aynı movement kimliği ile bağlanır", async () => {
  const sql = await readFile(migrationPath, "utf8");

  assert.match(sql, /v_movement_id := gen_random_uuid\(\)/);
  assert.match(
    sql,
    /last_movement_id[\s\S]*v_movement_id/,
  );
  assert.match(
    sql,
    /inventory_movement_id = v_movement_id/,
  );
  assert.match(
    sql,
    /warehouse_inventory_movement_number_seq/,
  );
});
