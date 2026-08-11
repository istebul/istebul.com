import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const migrationPath =
  "supabase/migrations/20260811222000_warehouse_product_inventory_persistence.sql";

const productRepositoryPath =
  "src/warehouse/services/SupabaseProductRepository.ts";

const inventoryRepositoryPath =
  "src/warehouse/services/SupabaseInventoryRepository.ts";

const warehouseIndexPath = "src/warehouse/index.ts";

test(
  "ürün, SKU ve barkod tabloları domain sözleşmesini taşır",
  async () => {
    const sql = await readFile(
      migrationPath,
      "utf8",
    );

    assert.match(
      sql,
      /create table if not exists public\.warehouse_products/,
    );
    assert.match(
      sql,
      /create table if not exists public\.warehouse_product_skus/,
    );
    assert.match(
      sql,
      /create table if not exists public\.warehouse_product_barcodes/,
    );

    for (const status of [
      "draft",
      "active",
      "inactive",
      "discontinued",
      "archived",
    ]) {
      assert.ok(sql.includes(`'${status}'`));
    }

    for (const barcode of [
      "ean13",
      "ean8",
      "upca",
      "upce",
      "code128",
      "code39",
      "itf14",
      "qr",
      "internal",
    ]) {
      assert.ok(sql.includes(`'${barcode}'`));
    }

    assert.match(
      sql,
      /unique \(account_id, value\)/,
    );
  },
);

test(
  "stok hareketi ve bakiye tabloları lot seri takibini taşır",
  async () => {
    const sql = await readFile(
      migrationPath,
      "utf8",
    );

    assert.match(
      sql,
      /create table if not exists public\.warehouse_inventory_movements/,
    );
    assert.match(
      sql,
      /create table if not exists public\.warehouse_inventory_balances/,
    );

    assert.match(sql, /lot_number text/);
    assert.match(sql, /serial_number text/);
    assert.match(sql, /production_date date/);
    assert.match(sql, /expiry_date date/);
    assert.match(sql, /last_movement_id uuid/);
  assert.match(sql, /warehouse_inventory_balances_quantity_check[\s\S]{0,120}quantity >= 0/);
  assert.doesNotMatch(sql, /warehouse_inventory_balances_last_movement_fk/);
    assert.match(sql, /nulls not distinct/);
  },
);

test(
  "stok hareket defteri append-only izinleriyle tanımlanır",
  async () => {
    const sql = await readFile(
      migrationPath,
      "utf8",
    );

    assert.match(
      sql,
      /create policy warehouse_inventory_movements_operator_insert/,
    );

    assert.match(
      sql,
      /grant select, insert\s+on public\.warehouse_inventory_movements/,
    );

    assert.doesNotMatch(
      sql,
      /create policy warehouse_inventory_movements_operator_update/,
    );

    assert.doesNotMatch(
      sql,
      /create policy warehouse_inventory_movements_operator_delete/,
    );
  },
);

test(
  "RLS kullanıcı JWT üyeliği ve rol yardımcılarını kullanır",
  async () => {
    const sql = await readFile(
      migrationPath,
      "utf8",
    );

    assert.match(
      sql,
      /warehouse_has_account_access\(account_id\)/,
    );
    assert.match(
      sql,
      /warehouse_has_account_role\(/,
    );
    assert.match(
      sql,
      /created_by = auth\.uid\(\)/,
    );

    assert.ok(sql.includes("'receiver'"));
    assert.ok(
      sql.includes("'inventory_controller'"),
    );
  },
);

test(
  "Supabase Product repository firma izolasyonunu uygular",
  async () => {
    const source = await readFile(
      productRepositoryPath,
      "utf8",
    );

    assert.match(
      source,
      /class SupabaseProductRepository/,
    );
    assert.match(
      source,
      /\.eq\("account_id", tenantId\)/,
    );
    assert.match(
      source,
      /warehouse_product_barcodes/,
    );
    assert.match(
      source,
      /warehouse_product_skus/,
    );

    assert.equal(
      source.includes(
        "SUPABASE_SERVICE_ROLE_KEY",
      ),
      false,
    );
  },
);

test(
  "Supabase Inventory repository append-only hareket ve doğal bakiye anahtarını kullanır",
  async () => {
    const source = await readFile(
      inventoryRepositoryPath,
      "utf8",
    );

    assert.match(
      source,
      /class SupabaseInventoryRepository/,
    );

    assert.match(
      source,
      /\.insert\(toMovementRow\(movement\)\)/,
    );

    for (const column of [
      "account_id",
      "warehouse_id",
      "location_id",
      "product_id",
      "sku_id",
      "lot_number",
      "serial_number",
      "stock_status",
    ]) {
      assert.ok(
        source.includes(`"${column}"`),
      );
    }

    assert.equal(
      source.includes(
        "SUPABASE_SERVICE_ROLE_KEY",
      ),
      false,
    );
  },
);

test(
  "migration ürün ve stok tablolarında RLS açar",
  async () => {
    const sql = await readFile(
      migrationPath,
      "utf8",
    );

    for (const table of [
      "warehouse_products",
      "warehouse_product_skus",
      "warehouse_product_barcodes",
      "warehouse_inventory_movements",
      "warehouse_inventory_balances",
    ]) {
      assert.ok(
        sql.includes(
          `alter table public.${table} enable row level security;`,
        ),
      );
    }
  },
);

test("Supabase persistence repositoryleri Warehouse dışa aktarımında bulunur", async () => {
  const source = await readFile(warehouseIndexPath, "utf8");

  assert.match(source, /SupabaseProductRepository/);
  assert.match(source, /SupabaseInventoryRepository/);
});
