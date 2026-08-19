import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl =
  new URL(
    "../../supabase/migrations/20260820001500_warehouse_shipping_write_rpc.sql",
    import.meta.url,
  );

const persistenceUrl =
  new URL(
    "../../supabase/migrations/20260819231500_warehouse_shipping_persistence.sql",
    import.meta.url,
  );

const sql =
  await readFile(
    migrationUrl,
    "utf8",
  );

const persistenceSql =
  await readFile(
    persistenceUrl,
    "utf8",
  );

const executableSql =
  sql
    .replace(/--.*$/gm, "")
    .replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    );

test(
  "A9.2 yalnız tek dar create-from-packing Shipping RPC açar",
  () => {
    const functions =
      executableSql.match(
        /create\s+or\s+replace\s+function\s+public\.warehouse_shipping_[a-z0-9_]+/gi,
      ) ?? [];

    assert.equal(
      functions.length,
      1,
    );

    assert.match(
      executableSql,
      /create\s+or\s+replace\s+function\s+public\.warehouse_shipping_create_from_packing_write\s*\(/i,
    );

    for (const forbidden of [
      "save_item",
      "save_package",
      "save_task",
      "save_manifest",
      "save_asn",
      "save_tracking",
      "save_carrier",
      "save_vehicle",
      "save_dock",
    ]) {
      assert.doesNotMatch(
        executableSql,
        new RegExp(
          `warehouse_shipping_${forbidden}`,
          "i",
        ),
      );
    }
  },
);

test(
  "Shipping write ledger account request idempotency taşır",
  () => {
    assert.match(
      executableSql,
      /create\s+table\s+if\s+not\s+exists\s+public\.warehouse_shipping_write_requests/i,
    );

    assert.match(
      executableSql,
      /primary key\s*\(\s*account_id\s*,\s*request_id\s*\)/i,
    );

    assert.match(
      executableSql,
      /v_existing_action\s*<>\s*v_action/i,
    );

    assert.match(
      executableSql,
      /v_existing_payload\s*<>\s*v_payload/i,
    );

    assert.match(
      executableSql,
      /response_payload/i,
    );

    assert.match(
      executableSql,
      /on conflict\s*\(\s*account_id\s*,\s*request_id\s*\)\s*do nothing/i,
    );
  },
);

test(
  "Shipping write actor identity yalnız caller auth.uid üzerinden gelir",
  () => {
    assert.match(
      executableSql,
      /v_user_id\s+uuid\s*:=\s*auth\.uid\(\)/i,
    );

    assert.doesNotMatch(
      executableSql,
      /\bp_created_by\b/i,
    );

    assert.match(
      executableSql,
      /created_by[\s\S]*?v_user_id/i,
    );
  },
);

test(
  "Shipping create account rolü ile fail closed yetkilendirilir",
  () => {
    assert.match(
      executableSql,
      /warehouse_has_account_role\s*\(\s*p_account_id/i,
    );

    for (const role of [
      "owner",
      "admin",
      "warehouse_manager",
      "supervisor",
      "inventory_controller",
      "picker",
      "operator",
    ]) {
      assert.ok(
        executableSql.includes(
          `'${role}'`,
        ),
        `Eksik rol: ${role}`,
      );
    }
  },
);

test(
  "Shipping RPC SECURITY DEFINER explicit search_path ve dar EXECUTE ACL kullanır",
  () => {
    assert.match(
      executableSql,
      /language\s+plpgsql\s+security\s+definer\s+set\s+search_path\s*=\s*public\s*,\s*pg_temp/i,
    );

    for (const role of [
      "public",
      "anon",
      "authenticated",
    ]) {
      assert.match(
        executableSql,
        new RegExp(
          `revoke\\s+all\\s+on\\s+function[\\s\\S]*?warehouse_shipping_create_from_packing_write[\\s\\S]*?from\\s+${role}`,
          "i",
        ),
      );
    }

    assert.match(
      executableSql,
      /grant\s+execute\s+on\s+function[\s\S]*?warehouse_shipping_create_from_packing_write[\s\S]*?to\s+authenticated/i,
    );
  },
);

test(
  "Shipping number server sequence ile SVK formatında üretilir ve sequence client rollerine kapalıdır",
  () => {
    assert.match(
      executableSql,
      /create\s+sequence\s+if\s+not\s+exists\s+public\.warehouse_shipping_number_seq/i,
    );

    assert.match(
      executableSql,
      /nextval\s*\(\s*'public\.warehouse_shipping_number_seq'::regclass\s*\)/i,
    );

    assert.ok(
      executableSql.includes(
        "'SVK-'",
      ),
    );

    for (const role of [
      "public",
      "anon",
      "authenticated",
    ]) {
      assert.match(
        executableSql,
        new RegExp(
          `revoke\\s+all\\s+on\\s+sequence\\s+public\\.warehouse_shipping_number_seq\\s+from\\s+${role}`,
          "i",
        ),
      );
    }
  },
);

test(
  "Packing parent FOR UPDATE kilitlenir ve shipping_ready zorunludur",
  () => {
    assert.match(
      executableSql,
      /from\s+public\.warehouse_packings[\s\S]*?where[\s\S]*?account_id\s*=\s*p_account_id[\s\S]*?id\s*=\s*p_packing_id[\s\S]*?for\s+update/i,
    );

    assert.match(
      executableSql,
      /v_packing\.status\s*<>\s*'shipping_ready'/i,
    );
  },
);

test(
  "Packing package seti kilitlenir ve en az bir shipping_ready paket zorunludur",
  () => {
    assert.match(
      executableSql,
      /from\s+public\.warehouse_packing_packages[\s\S]*?packing_id\s*=\s*v_packing\.id[\s\S]*?for\s+update/i,
    );

    assert.match(
      executableSql,
      /v_package_count\s*=\s*0/i,
    );

    assert.match(
      executableSql,
      /status\s*<>\s*'shipping_ready'/i,
    );
  },
);

test(
  "Shipping location tenant warehouse tip active ve operasyon durumu ile doğrulanır",
  () => {
    assert.match(
      executableSql,
      /from\s+public\.warehouse_locations/i,
    );

    assert.match(
      executableSql,
      /warehouse_id\s*=\s*v_packing\.warehouse_id/i,
    );

    assert.match(
      executableSql,
      /id\s*=\s*p_shipping_location_id/i,
    );

    assert.match(
      executableSql,
      /active\s*=\s*true/i,
    );

    assert.match(
      executableSql,
      /location_type\s+in\s*\(\s*'shipping'\s*,\s*'cross_dock'\s*\)/i,
    );

    for (const status of [
      "blocked",
      "maintenance",
      "inactive",
    ]) {
      assert.ok(
        executableSql.includes(
          `'${status}'`,
        ),
      );
    }
  },
);

test(
  "Aynı Packing için ikinci Shipping hem RPC hem persistence unique index ile engellenir",
  () => {
    assert.match(
      executableSql,
      /from\s+public\.warehouse_shippings[\s\S]*?packing_id\s*=\s*v_packing\.id[\s\S]*?for\s+update/i,
    );

    assert.match(
      persistenceSql,
      /create\s+unique\s+index\s+if\s+not\s+exists\s+warehouse_shippings_packing_unique[\s\S]*?on\s+public\.warehouse_shippings\s*\(\s*account_id\s*,\s*packing_id\s*\)/i,
    );
  },
);

test(
  "Shipping parent draft olarak Packing referans snapshotı ile oluşturulur",
  () => {
    assert.match(
      executableSql,
      /insert\s+into\s+public\.warehouse_shippings/i,
    );

    assert.match(
      executableSql,
      /v_strategy[\s\S]*?'draft'[\s\S]*?v_packing\.id/i,
    );

    assert.match(
      executableSql,
      /'packing'[\s\S]*?v_packing\.id::text[\s\S]*?v_packing\.packing_number/i,
    );

    assert.match(
      executableSql,
      /v_user_id[\s\S]*?v_now[\s\S]*?v_now/i,
    );
  },
);

test(
  "Shipping adres snapshotları server tarafında domain formatıyla üretilir",
  () => {
    for (const value of [
      "Depo Çıkış Adresi",
      "Teslimat Adresi",
      "Türkiye",
      "Belirtilmedi",
      "ship_from",
      "ship_to",
    ]) {
      assert.ok(
        executableSql.includes(
          `'${value}'`,
        ),
        `Eksik adres snapshot alanı: ${value}`,
      );
    }

    assert.match(
      executableSql,
      /coalesce\s*\(\s*v_packing\.shipping_location_id\s*,\s*v_packing\.packing_location_id\s*\)/i,
    );
  },
);

test(
  "Packing item handoff yalnız packed_quantity pozitif satırları taşır",
  () => {
    assert.match(
      executableSql,
      /insert\s+into\s+public\.warehouse_shipping_items/i,
    );

    assert.match(
      executableSql,
      /from\s+public\.warehouse_packing_items\s+as\s+item/i,
    );

    assert.match(
      executableSql,
      /item\.packed_quantity\s*>\s*0/i,
    );

    const packedQuantityUses =
      executableSql.match(
        /item\.packed_quantity/gi,
      ) ?? [];

    assert.ok(
      packedQuantityUses.length >= 3,
      "requested ve remaining miktarlar packed_quantity üzerinden gelmeli.",
    );

    for (const field of [
      "item.tracking",
      "item.unit_weight",
      "item.unit_volume",
      "item.temperature_controlled",
      "item.hazardous_material",
    ]) {
      assert.ok(
        executableSql.includes(
          field,
        ),
        `Eksik item handoff alanı: ${field}`,
      );
    }
  },
);

test(
  "Packing package handoff pending durum ve weight volume precedence korur",
  () => {
    assert.match(
      executableSql,
      /insert\s+into\s+public\.warehouse_shipping_packages/i,
    );

    assert.match(
      executableSql,
      /from\s+public\.warehouse_packing_packages\s+as\s+package/i,
    );

    assert.match(
      executableSql,
      /'pending'/i,
    );

    assert.match(
      executableSql,
      /coalesce\s*\(\s*package\.actual_weight\s*,\s*package\.calculated_weight\s*\)/i,
    );

    assert.match(
      executableSql,
      /coalesce\s*\(\s*package\.actual_volume\s*,\s*package\.calculated_volume\s*\)/i,
    );

    assert.match(
      executableSql,
      /row_number\(\)\s+over/i,
    );
  },
);

test(
  "Nested package parent ilişkisi Packing ID yerine Shipping package ID ile remap edilir",
  () => {
    assert.match(
      executableSql,
      /update\s+public\.warehouse_shipping_packages\s+as\s+child_shipping/i,
    );

    assert.match(
      executableSql,
      /parent_package_id\s*=\s*parent_shipping\.id/i,
    );

    assert.match(
      executableSql,
      /parent_shipping\.packing_package_id\s*=\s*source_child\.parent_package_id/i,
    );

    assert.match(
      executableSql,
      /v_parent_updated_count\s*<>\s*v_parent_link_count/i,
    );
  },
);

test(
  "Stable response request ledger içine tamamlanmış sonuç olarak kaydedilir",
  () => {
    for (const key of [
      "requestId",
      "shippingId",
      "shippingNumber",
      "packingId",
      "status",
      "itemCount",
      "packageCount",
    ]) {
      assert.ok(
        executableSql.includes(
          `'${key}'`,
        ),
        `Eksik response key: ${key}`,
      );
    }

    assert.match(
      executableSql,
      /update\s+public\.warehouse_shipping_write_requests[\s\S]*?response_payload\s*=\s*v_result[\s\S]*?completed_at\s*=\s*v_now/i,
    );
  },
);

test(
  "A9.2 mutation surface yalnız Shipping ledger parent item package tablolarıdır",
  () => {
    const targets =
      new Set();

    const pattern =
      /\b(insert\s+into|update|delete\s+from)\s+public\.([a-z0-9_]+)/gi;

    for (
      const match
      of executableSql.matchAll(
        pattern,
      )
    ) {
      targets.add(
        match[2],
      );
    }

    assert.deepEqual(
      [...targets].sort(),
      [
        "warehouse_shipping_items",
        "warehouse_shipping_packages",
        "warehouse_shipping_write_requests",
        "warehouse_shippings",
      ].sort(),
    );
  },
);

test(
  "A9.2 direct table write grant service role ve inventory mutation açmaz",
  () => {
    assert.doesNotMatch(
      executableSql,
      /\bservice[_-]?role\b/i,
    );

    assert.doesNotMatch(
      executableSql,
      /warehouse_inventory_(?:balances|movements)/i,
    );

    assert.doesNotMatch(
      executableSql,
      /grant\s+(?:insert|update|delete|all)\s+on\s+(?:table\s+)?public\.warehouse_[a-z0-9_]+[\s\S]*?to\s+authenticated/i,
    );

    assert.match(
      executableSql,
      /alter\s+table\s+public\.warehouse_shipping_write_requests\s+enable\s+row\s+level\s+security/i,
    );

    for (const role of [
      "public",
      "anon",
      "authenticated",
    ]) {
      assert.match(
        executableSql,
        new RegExp(
          `revoke\\s+all\\s+on\\s+table\\s+public\\.warehouse_shipping_write_requests\\s+from\\s+${role}`,
          "i",
        ),
      );
    }
  },
);
