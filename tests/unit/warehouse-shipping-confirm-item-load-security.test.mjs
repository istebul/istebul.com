import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

const migrationPath = path.join(
  root,
  "supabase/migrations/20260822134500_warehouse_shipping_confirm_item_load_write.sql",
);

const startLoadingMigrationPath = path.join(
  root,
  "supabase/migrations/20260822123000_warehouse_shipping_start_loading_write.sql",
);

const servicePath = path.join(
  root,
  "src/warehouse/services/ShippingService.ts",
);

const validatorPath = path.join(
  root,
  "src/warehouse/services/ShippingValidator.ts",
);

const migration = fs.readFileSync(
  migrationPath,
  "utf8",
);

const startLoadingMigration =
  fs.readFileSync(
    startLoadingMigrationPath,
    "utf8",
  );

const service = fs.readFileSync(
  servicePath,
  "utf8",
);

const validator = fs.readFileSync(
  validatorPath,
  "utf8",
);

function normalizeSql(value) {
  return value
    .replace(/\s+/g, " ")
    .trim();
}

function extractRpc(sql) {
  const start = sql.indexOf(
    "create or replace function\n  public.warehouse_shipping_confirm_item_load_write(",
  );

  assert.notEqual(
    start,
    -1,
    "confirm_item_load RPC başlangıcı bulunamadı.",
  );

  const marker =
    "$warehouse_shipping_confirm_item_load_write$;";

  const end = sql.indexOf(
    marker,
    start,
  );

  assert.notEqual(
    end,
    -1,
    "confirm_item_load RPC bitişi bulunamadı.",
  );

  return sql.slice(
    start,
    end + marker.length,
  );
}

const rpc = extractRpc(
  migration,
);

const normalizedRpc =
  normalizeSql(rpc);

test(
  "Shipping ledger action allowlist create_from_packing start_loading ve confirm_item_load içerir",
  () => {
    assert.match(
      migration,
      /warehouse_shipping_write_requests_action_check[\s\S]*?action\s+in\s*\([\s\S]*?'create_from_packing'[\s\S]*?'start_loading'[\s\S]*?'confirm_item_load'[\s\S]*?\)/i,
    );
  },
);

test(
  "confirm_item_load RPC exact on parametre taşır",
  () => {
    assert.match(
      migration,
      /warehouse_shipping_confirm_item_load_write\s*\(\s*p_request_id\s+uuid\s*,\s*p_account_id\s+uuid\s*,\s*p_shipping_id\s+uuid\s*,\s*p_shipping_item_id\s+uuid\s*,\s*p_shipping_package_id\s+uuid\s*,\s*p_quantity\s+numeric\s*,\s*p_damaged_quantity\s+numeric\s*,\s*p_missing_quantity\s+numeric\s*,\s*p_loaded_by\s+text\s*,\s*p_notes\s+text\s*\)/i,
    );
  },
);

test(
  "confirm_item_load actor identity yalnız auth.uid ve account rolü ile doğrulanır",
  () => {
    assert.match(
      rpc,
      /v_user_id\s+uuid\s*:=\s*auth\.uid\s*\(\s*\)/i,
    );

    assert.match(
      rpc,
      /warehouse_has_account_role\s*\(\s*p_account_id\s*,\s*array\s*\[[\s\S]*?'owner'[\s\S]*?'admin'[\s\S]*?'warehouse_manager'[\s\S]*?'supervisor'[\s\S]*?'inventory_controller'[\s\S]*?'picker'[\s\S]*?'operator'[\s\S]*?\]::text\[\]\s*\)/i,
    );

    assert.doesNotMatch(
      rpc,
      /p_user_id|p_created_by|service_role/i,
    );
  },
);

test(
  "confirm_item_load miktarları ve loadedBy değerini fail closed doğrular",
  () => {
    assert.match(
      rpc,
      /p_quantity\s+is\s+null/i,
    );

    assert.match(
      rpc,
      /p_quantity\s*<\s*0/i,
    );

    assert.match(
      rpc,
      /v_damaged_quantity\s*<\s*0/i,
    );

    assert.match(
      rpc,
      /v_missing_quantity\s*<\s*0/i,
    );

    assert.match(
      rpc,
      /p_quantity\s*=\s*0[\s\S]*?v_damaged_quantity\s*=\s*0[\s\S]*?v_missing_quantity\s*=\s*0/i,
    );

    assert.match(
      rpc,
      /v_loaded_by\s+is\s+null/i,
    );

    assert.match(
      rpc,
      /'NaN'::numeric/i,
    );
  },
);

test(
  "confirm_item_load canonical idempotency payload source inputlarını bağlar",
  () => {
    assert.match(
      rpc,
      /v_payload\s*:=\s*jsonb_strip_nulls\s*\(\s*jsonb_build_object\s*\(/i,
    );

    for (const key of [
      "shippingId",
      "shippingItemId",
      "shippingPackageId",
      "quantity",
      "damagedQuantity",
      "missingQuantity",
      "loadedBy",
      "notes",
    ]) {
      assert.ok(
        rpc.includes(`'${key}'`),
        `canonical payload key eksik: ${key}`,
      );
    }
  },
);

test(
  "idempotency kullanıcı action payload replay ve in-flight ayrımını korur",
  () => {
    assert.match(
      rpc,
      /from\s+public\.warehouse_shipping_write_requests[\s\S]*?account_id\s*=\s*p_account_id[\s\S]*?request_id\s*=\s*p_request_id[\s\S]*?for\s+update/i,
    );

    assert.match(
      rpc,
      /v_existing_user_id\s*<>\s*v_user_id[\s\S]*?errcode\s*=\s*'42501'/i,
    );

    assert.match(
      rpc,
      /v_existing_action\s*<>\s*v_action[\s\S]*?v_existing_payload\s*<>\s*v_payload[\s\S]*?errcode\s*=\s*'23505'/i,
    );

    assert.match(
      rpc,
      /v_existing_response\s+is\s+not\s+null[\s\S]*?return\s+v_existing_response/i,
    );

    assert.match(
      rpc,
      /on\s+conflict\s*\(\s*account_id\s*,\s*request_id\s*\)\s*do\s+nothing/i,
    );

    assert.match(
      rpc,
      /errcode\s*=\s*'40001'/i,
    );
  },
);

test(
  "Shipping parent account scoped FOR UPDATE kilitlenir ve yalnız loading kabul edilir",
  () => {
    assert.match(
      rpc,
      /select\s+\*\s+into\s+v_shipping\s+from\s+public\.warehouse_shippings\s+where\s+account_id\s*=\s*p_account_id\s+and\s+id\s*=\s*p_shipping_id\s+for\s+update/i,
    );

    assert.match(
      rpc,
      /v_shipping\.status\s*<>\s*'loading'/i,
    );
  },
);

test(
  "hedef Shipping item account shipping ve item kimliğiyle FOR UPDATE kilitlenir",
  () => {
    assert.match(
      rpc,
      /select\s+\*\s+into\s+v_item\s+from\s+public\.warehouse_shipping_items\s+where\s+account_id\s*=\s*p_account_id\s+and\s+shipping_id\s*=\s*p_shipping_id\s+and\s+id\s*=\s*p_shipping_item_id\s+for\s+update/i,
    );
  },
);

test(
  "processed quantity mevcut remaining_quantity değerini aşamaz",
  () => {
    assert.match(
      rpc,
      /v_processed_quantity\s*:=\s*p_quantity\s*\+\s*v_damaged_quantity\s*\+\s*v_missing_quantity/i,
    );

    assert.match(
      rpc,
      /v_processed_quantity\s*>\s*v_item\.remaining_quantity/i,
    );
  },
);

test(
  "optional Shipping package yalnız verilmişse aynı account ve Shipping içinde kilitlenir",
  () => {
    assert.match(
      rpc,
      /if\s+p_shipping_package_id\s+is\s+not\s+null\s+then[\s\S]*?from\s+public\.warehouse_shipping_packages[\s\S]*?account_id\s*=\s*p_account_id[\s\S]*?shipping_id\s*=\s*p_shipping_id[\s\S]*?id\s*=\s*p_shipping_package_id[\s\S]*?for\s+update/i,
    );
  },
);

test(
  "lock order Shipping parent sonra item sonra optional package şeklindedir",
  () => {
    const parent =
      rpc.indexOf(
        "from public.warehouse_shippings",
      );

    const item =
      rpc.indexOf(
        "from public.warehouse_shipping_items",
        parent + 1,
      );

    const shippingPackage =
      rpc.indexOf(
        "from public.warehouse_shipping_packages",
        item + 1,
      );

    assert.ok(
      parent >= 0,
    );

    assert.ok(
      item > parent,
    );

    assert.ok(
      shippingPackage > item,
    );
  },
);

test(
  "loaded damaged missing additive hesaplanır ve remaining requested üzerinden yeniden hesaplanır",
  () => {
    assert.match(
      rpc,
      /v_loaded_quantity\s*:=\s*v_item\.loaded_quantity\s*\+\s*p_quantity/i,
    );

    assert.match(
      rpc,
      /v_new_damaged_quantity\s*:=\s*v_item\.damaged_quantity\s*\+\s*v_damaged_quantity/i,
    );

    assert.match(
      rpc,
      /v_new_missing_quantity\s*:=\s*v_item\.missing_quantity\s*\+\s*v_missing_quantity/i,
    );

    assert.match(
      rpc,
      /v_remaining_quantity\s*:=\s*greatest\s*\(\s*0\s*,\s*v_item\.requested_quantity\s*-\s*v_loaded_quantity\s*-\s*v_new_damaged_quantity\s*-\s*v_new_missing_quantity\s*\)/i,
    );
  },
);

test(
  "item write server timestamp kullanır notes yalnız normalize edilmiş input varsa değişir",
  () => {
    assert.match(
      rpc,
      /update\s+public\.warehouse_shipping_items[\s\S]*?updated_at\s*=\s*v_now/i,
    );

    assert.match(
      rpc,
      /notes\s*=\s*case\s+when\s+v_notes\s+is\s+not\s+null\s+then\s+v_notes\s+else\s+notes\s+end/i,
    );

    const updateStart =
      normalizedRpc.indexOf(
        "update public.warehouse_shipping_items",
      );

    const updateEnd =
      normalizedRpc.indexOf(
        "returning * into v_updated_item",
        updateStart,
      );

    assert.ok(
      updateStart >= 0 &&
        updateEnd > updateStart,
    );

    const updateRegion =
      normalizedRpc.slice(
        updateStart,
        updateEnd,
      );

    assert.doesNotMatch(
      updateRegion,
      /loaded_by/i,
    );
  },
);

test(
  "confirm_item_load mutation surface yalnız Shipping ledger ve Shipping item tablolarıdır",
  () => {
    const mutations =
      new Set(
        Array.from(
          rpc.matchAll(
            /\b(?:insert\s+into|update|delete\s+from)\s+public\.([a-z0-9_]+)/gi,
          ),
          (match) =>
            match[1].toLowerCase(),
        ),
      );

    assert.deepEqual(
      [...mutations].sort(),
      [
        "warehouse_shipping_items",
        "warehouse_shipping_write_requests",
      ],
    );
  },
);

test(
  "confirm_item_load parent package task dock Packing Picking ve inventory mutation yapmaz",
  () => {
    for (const table of [
      "warehouse_shippings",
      "warehouse_shipping_packages",
      "warehouse_shipping_tasks",
      "warehouse_shipping_docks",
      "warehouse_packings",
      "warehouse_packing_items",
      "warehouse_packing_packages",
      "warehouse_picking_tasks",
      "warehouse_inventory_balances",
      "warehouse_inventory_movements",
    ]) {
      assert.doesNotMatch(
        rpc,
        new RegExp(
          `\\b(?:insert\\s+into|update|delete\\s+from)\\s+public\\.${table}\\b`,
          "i",
        ),
      );
    }
  },
);

test(
  "stable response item miktarlarını döndürür ve ledger completed sonucu olarak saklanır",
  () => {
    for (const key of [
      "ok",
      "action",
      "requestId",
      "shippingId",
      "shippingItemId",
      "shippingPackageId",
      "loadedQuantity",
      "damagedQuantity",
      "missingQuantity",
      "remainingQuantity",
      "notes",
      "updatedAt",
    ]) {
      assert.ok(
        rpc.includes(`'${key}'`),
        `stable response key eksik: ${key}`,
      );
    }

    assert.match(
      rpc,
      /update\s+public\.warehouse_shipping_write_requests[\s\S]*?response_payload\s*=\s*v_result[\s\S]*?completed_at\s*=\s*v_now/i,
    );
  },
);

test(
  "RPC SECURITY DEFINER search_path ve dar authenticated EXECUTE ACL kullanır",
  () => {
    assert.match(
      migration,
      /returns\s+jsonb\s+language\s+plpgsql\s+security\s+definer\s+set\s+search_path\s*=\s*public\s*,\s*pg_temp/i,
    );

    for (const role of [
      "public",
      "anon",
      "authenticated",
    ]) {
      assert.match(
        migration,
        new RegExp(
          `revoke\\s+all\\s+on\\s+function[\\s\\S]*?warehouse_shipping_confirm_item_load_write[\\s\\S]*?from\\s+${role}`,
          "i",
        ),
      );
    }

    assert.match(
      migration,
      /grant\s+execute\s+on\s+function[\s\S]*?warehouse_shipping_confirm_item_load_write[\s\S]*?to\s+authenticated/i,
    );

    assert.doesNotMatch(
      migration,
      /\bservice_role\b/i,
    );

    assert.doesNotMatch(
      migration,
      /grant\s+(?:insert|update|delete|all)\s+on\s+(?:table\s+)?public\.warehouse_[a-z0-9_]+[\s\S]*?to\s+authenticated/i,
    );
  },
);

test(
  "A9.3.2 SQL source confirmItemLoad ve validator kontratını daraltmadan korur",
  () => {
    const serviceStart =
      service.indexOf(
        "async confirmItemLoad(",
      );

    const serviceEnd =
      service.indexOf(
        "async loadPackage(",
        serviceStart,
      );

    assert.ok(
      serviceStart >= 0 &&
        serviceEnd > serviceStart,
    );

    const source =
      service.slice(
        serviceStart,
        serviceEnd,
      );

    assert.match(
      source,
      /shipping\.status\s*!==\s*"loading"/,
    );

    assert.match(
      source,
      /validateShippingLoadTotals\s*\(\s*item\.remainingQuantity\s*,\s*normalized\s*,?\s*\)/,
    );

    assert.match(
      source,
      /normalized\.shippingPackageId\s*!==\s*undefined[\s\S]*?shipping\.packages\.some/,
    );

    assert.match(
      source,
      /this\.repository\.saveItem\s*\(\s*\{/,
    );

    assert.doesNotMatch(
      source,
      /this\.repository\.(?:savePackage|saveTask|save)\s*\(/,
    );

    assert.match(
      validator,
      /quantity\s*===\s*0[\s\S]*?damagedQuantity\s*===\s*0[\s\S]*?missingQuantity\s*===\s*0/,
    );

    assert.match(
      validator,
      /totalProcessed\s*>\s*remainingQuantity/,
    );

    assert.match(
      startLoadingMigration,
      /'create_from_packing'[\s\S]*?'start_loading'/,
    );
  },
);
