import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

const migrationPath = path.join(
  root,
  "supabase/migrations/20260822145000_warehouse_shipping_load_package_write.sql",
);

const servicePath = path.join(
  root,
  "src/warehouse/services/ShippingService.ts",
);

const persistencePath = path.join(
  root,
  "supabase/migrations/20260819231500_warehouse_shipping_persistence.sql",
);

const migration = fs.readFileSync(
  migrationPath,
  "utf8",
);

const service = fs.readFileSync(
  servicePath,
  "utf8",
);

const persistence = fs.readFileSync(
  persistencePath,
  "utf8",
);

function normalize(value) {
  return value
    .replace(/\s+/g, " ")
    .trim();
}

function extractRpc(sql) {
  const start = sql.indexOf(
    "create or replace function\n  public.warehouse_shipping_load_package_write(",
  );

  assert.notEqual(
    start,
    -1,
    "load_package RPC başlangıcı bulunamadı.",
  );

  const marker =
    "$warehouse_shipping_load_package_write$;";

  const end = sql.indexOf(
    marker,
    start,
  );

  assert.notEqual(
    end,
    -1,
    "load_package RPC bitişi bulunamadı.",
  );

  return sql.slice(
    start,
    end + marker.length,
  );
}

function extractLoadPackageSource() {
  const start = service.indexOf(
    "async loadPackage(",
  );

  const end = service.indexOf(
    "async completeLoading(",
    start,
  );

  assert.ok(
    start >= 0 &&
      end > start,
    "ShippingService.loadPackage region bulunamadı.",
  );

  return service.slice(
    start,
    end,
  );
}

const rpc = extractRpc(
  migration,
);

const source =
  extractLoadPackageSource();

const normalizedRpc =
  normalize(rpc);

test(
  "Shipping ledger action allowlist exact create_from_packing start_loading confirm_item_load ve load_package içerir",
  () => {
    const match = migration.match(
      /add\s+constraint\s+warehouse_shipping_write_requests_action_check[\s\S]*?check\s*\(\s*action\s+in\s*\(([\s\S]*?)\)\s*\)\s*;/i,
    );

    assert.ok(
      match,
      "action CHECK body bulunamadı.",
    );

    const actions =
      Array.from(
        match[1].matchAll(
          /'([^']+)'/g,
        ),
        (item) =>
          item[1],
      );

    assert.deepEqual(
      actions,
      [
        "create_from_packing",
        "start_loading",
        "confirm_item_load",
        "load_package",
      ],
    );
  },
);

test(
  "load_package RPC exact beş parametre taşır",
  () => {
    assert.match(
      migration,
      /warehouse_shipping_load_package_write\s*\(\s*p_request_id\s+uuid\s*,\s*p_account_id\s+uuid\s*,\s*p_shipping_id\s+uuid\s*,\s*p_shipping_package_id\s+uuid\s*,\s*p_loaded_by\s+text\s*\)/i,
    );
  },
);

test(
  "load_package caller identity auth.uid ve exact yedi account rolü ile korunur",
  () => {
    assert.match(
      rpc,
      /v_user_id\s+uuid\s*:=\s*auth\.uid\s*\(\s*\)/i,
    );

    assert.match(
      rpc,
      /warehouse_has_account_role\s*\(\s*p_account_id\s*,\s*array\s*\[\s*'owner'\s*,\s*'admin'\s*,\s*'warehouse_manager'\s*,\s*'supervisor'\s*,\s*'inventory_controller'\s*,\s*'picker'\s*,\s*'operator'\s*\]::text\[\]\s*\)/i,
    );

    assert.doesNotMatch(
      rpc,
      /\bp_user_id\b|\bservice_role\b/i,
    );
  },
);

test(
  "load_package required UUID girdileri ve loadedBy fail closed doğrulanır",
  () => {
    for (const parameter of [
      "p_request_id",
      "p_account_id",
      "p_shipping_id",
      "p_shipping_package_id",
    ]) {
      assert.match(
        rpc,
        new RegExp(
          `${parameter}\\s+is\\s+null`,
          "i",
        ),
      );
    }

    assert.match(
      rpc,
      /v_loaded_by\s+text\s*:=\s*nullif\s*\(\s*btrim\s*\(\s*p_loaded_by\s*\)\s*,\s*''\s*\)/i,
    );

    assert.match(
      rpc,
      /v_loaded_by\s+is\s+null/i,
    );
  },
);

test(
  "load_package canonical idempotency payload shippingId shippingPackageId ve normalized loadedBy bağlar",
  () => {
    assert.match(
      rpc,
      /v_payload\s*:=\s*jsonb_build_object\s*\(\s*'shippingId'\s*,\s*p_shipping_id\s*,\s*'shippingPackageId'\s*,\s*p_shipping_package_id\s*,\s*'loadedBy'\s*,\s*v_loaded_by\s*\)/i,
    );
  },
);

test(
  "load_package idempotency user action payload replay ve in-flight ayrımını korur",
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

    assert.match(
      rpc,
      /Paket yalnızca yükleme devam ederken araca yüklenebilir\./,
    );
  },
);

test(
  "hedef Shipping package account shipping package kimliğiyle FOR UPDATE kilitlenir",
  () => {
    assert.match(
      rpc,
      /select\s+\*\s+into\s+v_package\s+from\s+public\.warehouse_shipping_packages\s+where\s+account_id\s*=\s*p_account_id\s+and\s+shipping_id\s*=\s*p_shipping_id\s+and\s+id\s*=\s*p_shipping_package_id\s+for\s+update/i,
    );
  },
);

test(
  "package yalnız loading_ready veya loading durumundan loaded olabilir",
  () => {
    assert.match(
      rpc,
      /v_package\.status\s+not\s+in\s*\(\s*'loading_ready'\s*,\s*'loading'\s*\)/i,
    );

    assert.match(
      rpc,
      /Paket yüklemeye hazır durumda değil\./,
    );

    assert.match(
      rpc,
      /status\s*=\s*'loaded'/i,
    );
  },
);

test(
  "load_package lock order Shipping parent sonra target package şeklindedir",
  () => {
    const parent =
      rpc.indexOf(
        "from public.warehouse_shippings",
      );

    const shippingPackage =
      rpc.indexOf(
        "from public.warehouse_shipping_packages",
        parent + 1,
      );

    assert.ok(
      parent >= 0,
    );

    assert.ok(
      shippingPackage > parent,
    );
  },
);

test(
  "package atomic write loadedBy loadedAt updatedAt aynı server timestamp ile yazar",
  () => {
    assert.match(
      rpc,
      /v_now\s+timestamptz\s*:=\s*now\s*\(\s*\)/i,
    );

    assert.match(
      rpc,
      /update\s+public\.warehouse_shipping_packages[\s\S]*?status\s*=\s*'loaded'[\s\S]*?loaded_by\s*=\s*v_loaded_by[\s\S]*?loaded_at\s*=\s*v_now[\s\S]*?updated_at\s*=\s*v_now/i,
    );

    assert.match(
      rpc,
      /returning\s+\*\s+into\s+v_updated_package/i,
    );
  },
);

test(
  "load_package mutation surface yalnız Shipping ledger ve Shipping package tablolarıdır",
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
        "warehouse_shipping_packages",
        "warehouse_shipping_write_requests",
      ],
    );
  },
);

test(
  "load_package parent item task dock Packing Picking inventory downstream mutation yapmaz",
  () => {
    for (const table of [
      "warehouse_shippings",
      "warehouse_shipping_items",
      "warehouse_shipping_tasks",
      "warehouse_shipping_docks",
      "warehouse_packings",
      "warehouse_packing_items",
      "warehouse_packing_packages",
      "warehouse_picking_tasks",
      "warehouse_inventory_balances",
      "warehouse_inventory_movements",
      "warehouse_shipping_manifests",
      "warehouse_shipping_asns",
      "warehouse_shipping_tracking_events",
      "warehouse_shipping_proofs_of_delivery",
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
  "stable response package load sonucunu döndürür ve ledger completed sonucu saklar",
  () => {
    for (const key of [
      "ok",
      "action",
      "requestId",
      "shippingId",
      "shippingPackageId",
      "status",
      "loadedBy",
      "loadedAt",
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
  "load_package SECURITY DEFINER explicit search_path ve authenticated-only EXECUTE ACL kullanır",
  () => {
    assert.match(
      migration,
      /returns\s+jsonb\s+language\s+plpgsql\s+security\s+definer\s+set\s+search_path\s*=\s*public\s*,\s*pg_temp/i,
    );

    const signature =
      String.raw`warehouse_shipping_load_package_write\s*\(\s*uuid\s*,\s*uuid\s*,\s*uuid\s*,\s*uuid\s*,\s*text\s*\)`;

    for (const role of [
      "public",
      "anon",
      "authenticated",
    ]) {
      assert.match(
        migration,
        new RegExp(
          `revoke\\s+all\\s+on\\s+function\\s+public\\.${signature}\\s+from\\s+${role}`,
          "i",
        ),
      );
    }

    assert.match(
      migration,
      new RegExp(
        `grant\\s+execute\\s+on\\s+function\\s+public\\.${signature}\\s+to\\s+authenticated`,
        "i",
      ),
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
  "ShippingService.loadPackage input contract inline exact dört field olarak kalır",
  () => {
    assert.match(
      source,
      /async\s+loadPackage\s*\(\s*input\s*:\s*\{\s*tenantId\s*:\s*string\s*;\s*shippingId\s*:\s*string\s*;\s*shippingPackageId\s*:\s*string\s*;\s*loadedBy\s*:\s*string\s*;\s*\}\s*\)\s*:\s*Promise<ShippingPackage>/s,
    );
  },
);

test(
  "SQL loadPackage service davranışını daraltmadan korur ve source mutation savePackage only kalır",
  () => {
    assert.match(
      source,
      /shipping\.status\s*!==\s*"loading"/,
    );

    assert.match(
      source,
      /current\.id\s*===\s*input\.shippingPackageId/,
    );

    assert.match(
      source,
      /shippingPackage\.status\s*!==\s*"loading_ready"[\s\S]*?shippingPackage\.status\s*!==\s*"loading"/,
    );

    assert.match(
      source,
      /const\s+loadedBy\s*=\s*requireText\s*\(\s*input\.loadedBy\s*,\s*"Yüklemeyi yapan kullanıcı"\s*,?\s*\)/s,
    );

    assert.match(
      source,
      /const\s+timestamp\s*=\s*this\.now\s*\(\s*\)/,
    );

    assert.match(
      source,
      /this\.repository\.savePackage\s*\(\s*\{[\s\S]*?status\s*:\s*"loaded"[\s\S]*?loadedBy\s*,[\s\S]*?loadedAt\s*:\s*timestamp[\s\S]*?updatedAt\s*:\s*timestamp/s,
    );

    const repositoryCalls =
      Array.from(
        source.matchAll(
          /this\.repository\.([A-Za-z0-9_]+)\s*\(/g,
        ),
        (match) =>
          match[1],
      );

    const mutations =
      repositoryCalls.filter(
        (name) =>
          /^(?:save|create|update|delete)/.test(
            name,
          ),
      );

    assert.deepEqual(
      mutations,
      ["savePackage"],
    );
  },
);

test(
  "Shipping package persistence tenant key loaded metadata ve source durumlarını destekler",
  () => {
    const match = persistence.match(
      /create\s+table\s+if\s+not\s+exists\s+public\.warehouse_shipping_packages\s*\(([\s\S]*?)\n\);/i,
    );

    assert.ok(
      match,
      "warehouse_shipping_packages DDL bulunamadı.",
    );

    const ddl =
      normalize(
        match[0],
      );

    assert.match(
      ddl,
      /\bloaded_by\s+text\b/i,
    );

    assert.match(
      ddl,
      /\bloaded_at\s+timestamptz\b/i,
    );

    assert.match(
      ddl,
      /\bupdated_at\s+timestamptz\b/i,
    );

    assert.match(
      ddl,
      /unique\s*\(\s*account_id\s*,\s*shipping_id\s*,\s*id\s*\)/i,
    );

    for (const status of [
      "loading_ready",
      "loading",
      "loaded",
    ]) {
      assert.ok(
        ddl.includes(`'${status}'`),
        `Shipping package DB status eksik: ${status}`,
      );
    }
  },
);
