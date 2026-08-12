import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";

const migrationUrl =
  new URL(
    "../../supabase/migrations/20260812170500_warehouse_inventory_reservation_persistence.sql",
    import.meta.url,
  );

const sql =
  await readFile(
    migrationUrl,
    "utf8",
  );

const executableSql =
  sql
    .replace(
      /--.*$/gm,
      "",
    )
    .replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    );

test(
  "Warehouse inventory reservation ayrı production tablosudur",
  () => {
    assert.match(
      sql,
      /create table if not exists public\.warehouse_inventory_reservations/i,
    );

    assert.doesNotMatch(
      executableSql,
      /references\s+public\.reservations\s*\(/i,
    );
  },
);

test(
  "reservation domain alanları persistence içinde korunur",
  () => {
    for (const column of [
      "reservation_number",
      "warehouse_id",
      "location_id",
      "product_id",
      "sku_id",
      "lot_number",
      "serial_number",
      "quantity",
      "consumed_quantity",
      "unit",
      "status",
      "reference_type",
      "reference_id",
      "reference_number",
      "expires_at",
      "created_by",
    ]) {
      assert.ok(
        sql.includes(
          column,
        ),
        `Eksik kolon: ${column}`,
      );
    }
  },
);

test(
  "reservation statusları domain ile eşleşir",
  () => {
    for (const status of [
      "active",
      "partially_consumed",
      "consumed",
      "cancelled",
      "expired",
    ]) {
      assert.ok(
        sql.includes(
          `'${status}'`,
        ),
        `Eksik status: ${status}`,
      );
    }
  },
);

test(
  "reservation miktar bütünlüğü korunur",
  () => {
    assert.match(
      sql,
      /quantity\s*>\s*0/i,
    );

    assert.match(
      sql,
      /consumed_quantity\s*>=\s*0/i,
    );

    assert.match(
      sql,
      /consumed_quantity\s*<=\s*quantity/i,
    );

    assert.match(
      sql,
      /status\s*=\s*'consumed'[\s\S]*?consumed_quantity\s*=\s*quantity/i,
    );
  },
);

test(
  "reservation tenant warehouse location product ve sku FK bütünlüğünü korur",
  () => {
    assert.match(
      sql,
      /references public\.warehouses\s*\(\s*account_id\s*,\s*id\s*\)/i,
    );

    assert.match(
      sql,
      /references public\.warehouse_locations\s*\(\s*account_id\s*,\s*warehouse_id\s*,\s*id\s*\)/i,
    );

    assert.match(
      sql,
      /references public\.warehouse_products\s*\(\s*account_id\s*,\s*id\s*\)/i,
    );

    assert.match(
      sql,
      /references public\.warehouse_product_skus\s*\(\s*account_id\s*,\s*product_id\s*,\s*id\s*\)/i,
    );
  },
);

test(
  "Picking reservation_id gerçek Warehouse reservation FK olur",
  () => {
    assert.match(
      sql,
      /alter table public\.warehouse_picking_items[\s\S]*?reservation_id[\s\S]*?references public\.warehouse_inventory_reservations/i,
    );

    assert.doesNotMatch(
      sql,
      /references\s+public\.reservations\s*\(/i,
    );
  },
);

test(
  "reservation tablosunda RLS ve account membership SELECT vardır",
  () => {
    assert.match(
      sql,
      /alter table public\.warehouse_inventory_reservations\s+enable row level security/i,
    );

    assert.match(
      sql,
      /warehouse_has_account_access\s*\(\s*account_id\s*\)/i,
    );

    assert.match(
      sql,
      /for select\s+to authenticated/i,
    );
  },
);

test(
  "authenticated doğrudan reservation mutation yapamaz",
  () => {
    assert.match(
      sql,
      /revoke insert, update, delete\s+on public\.warehouse_inventory_reservations\s+from authenticated/i,
    );

    assert.doesNotMatch(
      sql,
      /grant\s+(?:insert|update|delete|all)[\s\S]*?warehouse_inventory_reservations[\s\S]*?to authenticated/i,
    );
  },
);

test(
  "reservation persistence inventory balance veya ledger değiştirmez",
  () => {
    assert.doesNotMatch(
      executableSql,
      /(?:insert\s+into|update|delete\s+from)\s+public\.warehouse_inventory_(?:balances|movements)/i,
    );
  },
);

test(
  "reservation persistence execute_item veya reservation consume yapmaz",
  () => {
    assert.doesNotMatch(
      executableSql,
      /execute_item/i,
    );

    assert.doesNotMatch(
      executableSql,
      /consumed_quantity\s*=\s*consumed_quantity\s*\+/i,
    );
  },
);

test(
  "reservation persistence yükseltilmiş sunucu anahtarı kullanmaz",
  () => {
    assert.doesNotMatch(
      executableSql,
      /service_role|SUPABASE_SERVICE_ROLE_KEY|serviceRole/i,
    );
  },
);
