import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const MIGRATION =
  "supabase/migrations/20260813130000_warehouse_cycle_count_persistence.sql";

async function source() {
  return readFile(MIGRATION, "utf8");
}

test("Cycle Count persistence üç çekirdek operasyon tablosunu oluşturur", async () => {
  const sql = await source();

  assert.match(
    sql,
    /create table if not exists public\.warehouse_cycle_counts/i
  );

  assert.match(
    sql,
    /create table if not exists public\.warehouse_cycle_count_items/i
  );

  assert.match(
    sql,
    /create table if not exists public\.warehouse_cycle_count_tasks/i
  );
});

test("Cycle Count ana kayıtları account ve warehouse izolasyonu taşır", async () => {
  const sql = await source();

  assert.match(
    sql,
    /warehouse_cycle_counts_account_number_unique[\s\S]*unique\s*\(\s*account_id\s*,\s*cycle_count_number\s*\)/i
  );

  assert.match(
    sql,
    /foreign key\s*\(\s*account_id\s*,\s*warehouse_id\s*\)[\s\S]*references public\.warehouses\s*\(\s*account_id\s*,\s*id\s*\)/i
  );
});

test("Cycle Count durum sözleşmesi domain ile uyumludur", async () => {
  const sql = await source();

  for (const status of [
    "draft",
    "planned",
    "released",
    "assigned",
    "in_progress",
    "counted",
    "recount_required",
    "under_review",
    "approved",
    "adjusted",
    "completed",
    "cancelled"
  ]) {
    assert.match(sql, new RegExp(`'${status}'`));
  }
});

test("Cycle Count item durumları domain ile uyumludur", async () => {
  const sql = await source();

  for (const status of [
    "pending",
    "assigned",
    "in_progress",
    "counted",
    "recount_required",
    "under_review",
    "approved",
    "adjusted",
    "cancelled"
  ]) {
    assert.match(sql, new RegExp(`'${status}'`));
  }
});

test("Cycle Count görev tipi ve durumları domain ile uyumludur", async () => {
  const sql = await source();

  for (const type of [
    "count_location",
    "count_product",
    "count_lot",
    "count_serial",
    "blind_count",
    "recount",
    "variance_review",
    "adjustment_review"
  ]) {
    assert.match(sql, new RegExp(`'${type}'`));
  }

  for (const status of [
    "pending",
    "assigned",
    "in_progress",
    "completed",
    "cancelled"
  ]) {
    assert.match(sql, new RegExp(`'${status}'`));
  }
});

test("Sayım satırı ürün lokasyon ve SKU tenant sınırlarını korur", async () => {
  const sql = await source();

  assert.match(
    sql,
    /references public\.warehouse_locations\s*\(\s*account_id\s*,\s*warehouse_id\s*,\s*id\s*\)/i
  );

  assert.match(
    sql,
    /references public\.warehouse_products\s*\(\s*account_id\s*,\s*id\s*\)/i
  );

  assert.match(
    sql,
    /references public\.warehouse_product_skus\s*\(\s*account_id\s*,\s*product_id\s*,\s*id\s*\)/i
  );
});

test("Sayım görevleri parent count ve item kapsamına bağlıdır", async () => {
  const sql = await source();

  assert.match(
    sql,
    /warehouse_cycle_count_tasks_count_fk[\s\S]*references public\.warehouse_cycle_counts/i
  );

  assert.match(
    sql,
    /warehouse_cycle_count_tasks_item_fk[\s\S]*references public\.warehouse_cycle_count_items/i
  );
});

test("Cycle Count tablolarında RLS etkin ve kullanıcı hesabı izolasyonu vardır", async () => {
  const sql = await source();

  for (const table of [
    "warehouse_cycle_counts",
    "warehouse_cycle_count_items",
    "warehouse_cycle_count_tasks"
  ]) {
    assert.match(
      sql,
      new RegExp(
        `alter table public\\.${table}\\s+enable row level security`,
        "i"
      )
    );
  }

  assert.match(
    sql,
    /warehouse_has_account_access\s*\(\s*account_id\s*\)/i
  );

  assert.match(
    sql,
    /warehouse_has_account_role\s*\(/i
  );
});

test("Cycle Count persistence service role veya RLS bypass içermez", async () => {
  const sql = await source();

  assert.equal(
    sql.includes("SUPABASE_SERVICE_ROLE_KEY"),
    false
  );

  assert.equal(
    /security\s+definer/i.test(sql),
    false
  );

  assert.equal(
    /disable\s+row\s+level\s+security/i.test(sql),
    false
  );
});

test("A7.0.1 stok mutation veya adjustment RPC oluşturmaz", async () => {
  const sql = await source();

  assert.equal(
    /create\s+(or\s+replace\s+)?function\s+public\..*(adjust|post_inventory|inventory_post)/i.test(sql),
    false
  );

  assert.equal(
    /insert\s+into\s+public\.warehouse_inventory_movements/i.test(sql),
    false
  );

  assert.equal(
    /update\s+public\.warehouse_inventory_balances/i.test(sql),
    false
  );
});

test("Cycle Count updated_at alanları trigger ile korunur", async () => {
  const sql = await source();

  assert.match(
    sql,
    /warehouse_cycle_count_touch_updated_at/i
  );

  assert.match(
    sql,
    /trg_warehouse_cycle_counts_updated_at/i
  );

  assert.match(
    sql,
    /trg_warehouse_cycle_count_items_updated_at/i
  );

  assert.match(
    sql,
    /trg_warehouse_cycle_count_tasks_updated_at/i
  );
});
