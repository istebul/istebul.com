import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const migrationPath =
  "supabase/migrations/20260811224000_warehouse_receiving_write_persistence.sql";
const repositoryPath =
  "src/warehouse/services/SupabaseReceivingRepository.ts";
const indexPath = "src/warehouse/index.ts";

test("mal kabul persistence tabloları domain yapısını taşır", async () => {
  const sql = await readFile(migrationPath, "utf8");

  for (const table of [
    "warehouse_receivings",
    "warehouse_receiving_items",
    "warehouse_receiving_documents",
    "warehouse_receiving_tasks",
    "warehouse_receiving_write_requests",
  ]) {
    assert.ok(
      sql.includes(`create table if not exists public.${table}`),
      `${table} migration içinde bulunmalıdır`,
    );
  }

  for (const status of [
    "draft",
    "planned",
    "in_progress",
    "partially_received",
    "quality_control",
    "completed",
    "cancelled",
  ]) {
    assert.ok(sql.includes(`'${status}'`));
  }

  for (const source of [
    "purchase_order",
    "advance_shipping_notice",
    "warehouse_transfer",
    "customer_return",
    "production",
    "manual",
  ]) {
    assert.ok(sql.includes(`'${source}'`));
  }
});

test("mal kabul satırları ürün SKU lokasyon ve stok hareketi bütünlüğünü korur", async () => {
  const sql = await readFile(migrationPath, "utf8");

  assert.match(
    sql,
    /warehouse_receiving_items_product_fk[\s\S]{0,180}warehouse_products/,
  );
  assert.match(
    sql,
    /warehouse_receiving_items_sku_fk[\s\S]{0,180}warehouse_product_skus/,
  );
  assert.match(
    sql,
    /warehouse_receiving_items_location_fk[\s\S]{0,180}warehouse_locations/,
  );
  assert.match(
    sql,
    /warehouse_receiving_items_inventory_movement_fk[\s\S]{0,200}warehouse_inventory_movements/,
  );
  assert.match(
    sql,
    /warehouse_inventory_movements_account_id_id_uidx/,
  );
});

test("mal kabul yazma RPC yalnız güvenli ilk dört işlemi açar", async () => {
  const sql = await readFile(migrationPath, "utf8");

  assert.match(
    sql,
    /create or replace function public\.warehouse_receiving_write/,
  );

  for (const action of [
    "create",
    "add_item",
    "start",
    "receive_quantity",
  ]) {
    assert.ok(sql.includes(`'${action}'`));
  }

  assert.doesNotMatch(
    sql,
    /v_action\s*=\s*'complete'/,
  );
  assert.doesNotMatch(
    sql,
    /v_action\s*=\s*'complete_quality_control'/,
  );
});

test("RPC security invoker ve kullanıcı kimliği ile çalışır", async () => {
  const sql = await readFile(migrationPath, "utf8");

  assert.match(sql, /security invoker/);
  assert.match(sql, /auth\.uid\(\)/);
  assert.match(sql, /warehouse_has_account_role/);
  assert.equal(
    sql.includes("SUPABASE_SERVICE_ROLE_KEY"),
    false,
  );
});

test("write request tablosu idempotency ve payload çakışmasını korur", async () => {
  const sql = await readFile(migrationPath, "utf8");

  assert.match(
    sql,
    /primary key \(account_id, request_id\)/,
  );
  assert.match(
    sql,
    /v_existing_payload <> v_payload/,
  );
  assert.match(
    sql,
    /Aynı istek kimliği farklı bir işlem için kullanılamaz/,
  );
  assert.match(
    sql,
    /response = v_result/,
  );
});

test("miktar kabulü satır ve ana durumu aynı RPC transactionında günceller", async () => {
  const sql = await readFile(migrationPath, "utf8");

  assert.match(
    sql,
    /update public\.warehouse_receiving_items[\s\S]{0,1500}update public\.warehouse_receivings/,
  );
  assert.match(
    sql,
    /for update/,
  );
  assert.match(
    sql,
    /partially_received/,
  );
});

test("receiving tablolarında RLS açıktır", async () => {
  const sql = await readFile(migrationPath, "utf8");

  for (const table of [
    "warehouse_receivings",
    "warehouse_receiving_items",
    "warehouse_receiving_documents",
    "warehouse_receiving_tasks",
    "warehouse_receiving_write_requests",
  ]) {
    assert.ok(
      sql.includes(
        `alter table public.${table} enable row level security;`,
      ),
    );
  }

  assert.ok(sql.includes("'receiver'"));
  assert.ok(sql.includes("'inventory_controller'"));
});

test("Supabase Receiving repository arayüzü ve account izolasyonunu uygular", async () => {
  const source = await readFile(repositoryPath, "utf8");

  assert.match(
    source,
    /class SupabaseReceivingRepository/,
  );
  assert.match(
    source,
    /implements ReceivingRepository/,
  );
  assert.match(
    source,
    /\.eq\("account_id", tenantId\)/,
  );

  for (const table of [
    "warehouse_receivings",
    "warehouse_receiving_items",
    "warehouse_receiving_documents",
    "warehouse_receiving_tasks",
  ]) {
    assert.ok(source.includes(table));
  }

  assert.equal(
    source.includes("SUPABASE_SERVICE_ROLE_KEY"),
    false,
  );
});

test("Supabase Receiving repository Warehouse public exportunda bulunur", async () => {
  const source = await readFile(indexPath, "utf8");

  assert.match(source, /SupabaseReceivingRepository/);
});
