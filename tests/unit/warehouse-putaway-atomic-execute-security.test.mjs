import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const migrationPath =
  "supabase/migrations/20260812124500_warehouse_putaway_atomic_execute.sql";

const httpPath = "functions/api/warehouse/putaway.js";

const sql = await readFile(migrationPath, "utf8");
const httpSource = await readFile(httpPath, "utf8");

test("atomik Putaway execute dar SECURITY DEFINER RPC oluşturur", () => {
  assert.match(
    sql,
    /create or replace function public\.warehouse_putaway_execute_write/,
  );
  assert.match(sql, /security definer/i);
  assert.match(sql, /set search_path = public, pg_temp/i);
});

test("execute RPC caller JWT ve Putaway operasyon rollerini doğrular", () => {
  assert.match(sql, /auth\.uid\(\)/);
  assert.match(sql, /warehouse_has_account_role/);
  assert.match(sql, /'forklift_operator'/);
  assert.doesNotMatch(
    sql,
    /array\[[\s\S]{0,350}'viewer'[\s\S]{0,40}\]::text\[\]/,
  );
});

test("execute RPC account bazlı idempotency payloadını korur", () => {
  assert.match(sql, /warehouse_putaway_write_requests/);
  assert.match(sql, /'execute_item'/);
  assert.match(sql, /request_payload/);
  assert.match(sql, /response_payload/);
  assert.match(
    sql,
    /on conflict \(account_id, request_id\) do nothing/i,
  );
  assert.match(sql, /for update/i);
  assert.match(
    sql,
    /v_existing_payload <> v_payload/,
  );
});

test("Putaway ve satır transaction boyunca kilitlenir", () => {
  assert.match(
    sql,
    /from public\.warehouse_putaways[\s\S]{0,160}for update/i,
  );
  assert.match(
    sql,
    /from public\.warehouse_putaway_items[\s\S]{0,220}for update/i,
  );
});

test("hedef lokasyon aynı depo içinde aktif ve blokajsız olmalıdır", () => {
  assert.match(
    sql,
    /from public\.warehouse_locations[\s\S]{0,180}warehouse_id = v_item\.warehouse_id/,
  );
  assert.match(sql, /not v_target\.active/);
  assert.match(sql, /'blocked'/);
  assert.match(sql, /'maintenance'/);
  assert.match(sql, /'inactive'/);
  assert.match(sql, /for share/i);
});

test("balance natural key null güvenli ve deterministik kilitlenir", () => {
  assert.match(
    sql,
    /sku_id is not distinct from v_item\.sku_id/i,
  );
  assert.match(
    sql,
    /lot_number is not distinct from v_item\.lot_number/i,
  );
  assert.match(
    sql,
    /serial_number is not distinct from v_item\.serial_number/i,
  );
  assert.match(
    sql,
    /stock_status = v_item\.stock_status/i,
  );
  assert.match(
    sql,
    /order by location_id, id[\s\S]{0,40}for update/i,
  );
});

test("kaynak bakiye yeterli stok ve aynı unit ister", () => {
  assert.match(
    sql,
    /v_source_balance\.quantity < p_quantity/i,
  );
  assert.match(
    sql,
    /v_source_balance\.unit <> v_item\.unit/i,
  );
  assert.match(
    sql,
    /quantity = quantity - p_quantity/i,
  );
});

test("aynı depo Putaway ledgerı manual adjustment çiftini kullanır", () => {
  assert.match(
    sql,
    /'manual_adjustment_out',\s*'adjustment'/,
  );
  assert.match(
    sql,
    /'manual_adjustment_in',\s*'adjustment'/,
  );
  assert.match(sql, /'putaway'/);
  assert.match(sql, /transaction_group_id/);
});

test("outbound ve inbound aynı transfer boyutlarını taşır", () => {
  for (const field of [
    "source_warehouse_id",
    "source_location_id",
    "destination_warehouse_id",
    "destination_location_id",
    "lot_number",
    "serial_number",
    "production_date",
    "expiry_date",
  ]) {
    assert.ok(sql.includes(field), `${field} migration içinde olmalıdır`);
  }
});

test("hedef balance natural key ile atomik upsert edilir", () => {
  assert.match(
    sql,
    /insert into public\.warehouse_inventory_balances/,
  );
  assert.match(
    sql,
    /on conflict \([\s\S]{0,300}stock_status[\s\S]{0,80}\)\s*do update/i,
  );
  assert.match(
    sql,
    /warehouse_inventory_balances\.quantity\s*\+\s*excluded\.quantity/i,
  );
  assert.match(
    sql,
    /warehouse_inventory_balances\.unit = excluded\.unit/i,
  );
});

test("Putaway satırı movement ve transaction group kimlikleriyle güncellenir", () => {
  assert.match(sql, /inventory_movement_ids/);
  assert.match(sql, /transaction_group_ids/);
  assert.match(
    sql,
    /placed_quantity = placed_quantity \+ p_quantity/i,
  );
  assert.match(
    sql,
    /remaining_quantity = remaining_quantity - p_quantity/i,
  );
});

test("execute tüm satırlar bitse bile otomatik completed yapmaz", () => {
  assert.match(
    sql,
    /v_parent_status := 'partially_completed'/,
  );
  assert.match(
    sql,
    /v_parent_status := 'in_progress'/,
  );
  assert.doesNotMatch(
    sql,
    /set\s+status\s*=\s*'completed'/i,
  );
});

test("atomik RPC direct grant veya service role açmaz", () => {
  assert.doesNotMatch(
    sql,
    /SUPABASE_SERVICE_ROLE_KEY|service_role/i,
  );
  assert.doesNotMatch(
    sql,
    /grant\s+(insert|update|delete)[\s\S]{0,100}warehouse_inventory_(movements|balances)/i,
  );
  assert.match(
    sql,
    /revoke all on function public\.warehouse_putaway_execute_write[\s\S]{0,180}from public/i,
  );
  assert.match(
    sql,
    /grant execute on function public\.warehouse_putaway_execute_write[\s\S]{0,180}to authenticated/i,
  );

});
