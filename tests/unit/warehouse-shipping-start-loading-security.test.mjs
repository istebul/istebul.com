import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(
  fileURLToPath(import.meta.url)
);

const root = path.resolve(
  here,
  "../.."
);

const migrationPath = path.join(
  root,
  "supabase/migrations/20260822123000_warehouse_shipping_start_loading_write.sql"
);

const persistencePath = path.join(
  root,
  "supabase/migrations/20260819231500_warehouse_shipping_persistence.sql"
);

const servicePath = path.join(
  root,
  "src/warehouse/services/ShippingService.ts"
);

const sql = fs.readFileSync(
  migrationPath,
  "utf8"
);

const persistence = fs.readFileSync(
  persistencePath,
  "utf8"
);

const service = fs.readFileSync(
  servicePath,
  "utf8"
);

function functionRegion() {
  const match = sql.match(
    /create\s+or\s+replace\s+function\s+public\.warehouse_shipping_start_loading_write\s*\([\s\S]*?\$warehouse_shipping_start_loading_write\$;/i
  );

  assert.ok(
    match,
    "start_loading RPC region bulunamadı."
  );

  return match[0];
}

test(
  "Shipping ledger action allowlist create_from_packing ve start_loading içerir",
  () => {
    assert.match(
      sql,
      /drop\s+constraint\s+if\s+exists\s+warehouse_shipping_write_requests_action_check/i
    );

    assert.match(
      sql,
      /add\s+constraint\s+warehouse_shipping_write_requests_action_check[\s\S]*?action\s+in\s*\([\s\S]*?'create_from_packing'[\s\S]*?'start_loading'[\s\S]*?\)/i
    );
  }
);

test(
  "start_loading RPC exact üç UUID parametre taşır",
  () => {
    const match = sql.match(
      /create\s+or\s+replace\s+function\s+public\.warehouse_shipping_start_loading_write\s*\(([\s\S]*?)\)\s*returns\s+jsonb/i
    );

    assert.ok(match);

    const params = [
      ...match[1].matchAll(
        /\b(p_[a-z0-9_]+)\s+uuid\b/gi
      )
    ].map(
      (row) => row[1]
    );

    assert.deepEqual(
      params,
      [
        "p_request_id",
        "p_account_id",
        "p_shipping_id"
      ]
    );

    assert.doesNotMatch(
      match[1],
      /\bdefault\b/i
    );
  }
);

test(
  "start_loading actor identity yalnız auth.uid ve account rolü ile doğrulanır",
  () => {
    const rpc = functionRegion();

    assert.match(
      rpc,
      /v_user_id\s+uuid\s*:=\s*auth\.uid\s*\(\s*\)/i
    );

    assert.match(
      rpc,
      /warehouse_has_account_role\s*\(\s*p_account_id[\s\S]*?'owner'[\s\S]*?'admin'[\s\S]*?'warehouse_manager'[\s\S]*?'supervisor'[\s\S]*?'inventory_controller'[\s\S]*?'picker'[\s\S]*?'operator'/i
    );

    assert.match(
      rpc,
      /if\s+v_user_id\s+is\s+null[\s\S]*?errcode\s*=\s*'42501'/i
    );
  }
);

test(
  "start_loading idempotency canonical shippingId payloadına bağlıdır",
  () => {
    const rpc = functionRegion();

    assert.match(
      rpc,
      /v_action\s+constant\s+text\s*:=\s*'start_loading'/i
    );

    assert.match(
      rpc,
      /v_payload\s*:=\s*jsonb_build_object\s*\(\s*'shippingId'\s*,\s*p_shipping_id\s*\)/i
    );

    assert.match(
      rpc,
      /from\s+public\.warehouse_shipping_write_requests[\s\S]*?account_id\s*=\s*p_account_id[\s\S]*?request_id\s*=\s*p_request_id[\s\S]*?for\s+update/i
    );

    assert.match(
      rpc,
      /on\s+conflict\s*\(\s*account_id\s*,\s*request_id\s*\)\s*do\s+nothing/i
    );
  }
);

test(
  "idempotency kullanıcı action payload replay ve in-flight ayrımını korur",
  () => {
    const rpc = functionRegion();

    assert.match(
      rpc,
      /v_existing_user_id\s*<>\s*v_user_id[\s\S]*?errcode\s*=\s*'42501'/i
    );

    assert.match(
      rpc,
      /v_existing_action\s*<>\s*v_action[\s\S]*?v_existing_payload\s*<>\s*v_payload[\s\S]*?errcode\s*=\s*'23505'/i
    );

    assert.match(
      rpc,
      /if\s+v_existing_response\s+is\s+not\s+null\s+then\s+return\s+v_existing_response/i
    );

    assert.match(
      rpc,
      /errcode\s*=\s*'40001'[\s\S]*?halen\s+işleniyor/i
    );
  }
);

test(
  "Shipping parent account scoped FOR UPDATE kilitlenir",
  () => {
    const rpc = functionRegion();

    assert.match(
      rpc,
      /select\s+\*[\s\S]*?from\s+public\.warehouse_shippings[\s\S]*?account_id\s*=\s*p_account_id[\s\S]*?id\s*=\s*p_shipping_id[\s\S]*?for\s+update/i
    );
  }
);

test(
  "start_loading source parity released veya loading_ready kabul eder",
  () => {
    const rpc = functionRegion();

    assert.match(
      rpc,
      /v_shipping\.status\s+not\s+in\s*\(\s*'released'\s*,\s*'loading_ready'\s*\)/i
    );

    const start =
      service.indexOf(
        "async startLoading("
      );

    const end =
      service.indexOf(
        "async confirmItemLoad(",
        start
      );

    assert.ok(start >= 0);
    assert.ok(end > start);

    const domain =
      service.slice(
        start,
        end
      );

    assert.match(
      domain,
      /shipping\.status\s*!==\s*"released"[\s\S]*?shipping\.status\s*!==[\s\S]*?"loading_ready"/
    );
  }
);

test(
  "yükleme görevi load_package veya verify_packages olmalıdır ve satırlar kilitlenir",
  () => {
    const rpc = functionRegion();

    assert.match(
      rpc,
      /from\s+public\.warehouse_shipping_tasks[\s\S]*?account_id\s*=\s*p_account_id[\s\S]*?shipping_id\s*=\s*p_shipping_id[\s\S]*?type\s+in\s*\(\s*'load_package'\s*,\s*'verify_packages'\s*\)[\s\S]*?for\s+update/i
    );

    assert.match(
      rpc,
      /v_loading_task_count\s*=\s*0[\s\S]*?en\s+az\s+bir\s+paket\s+yükleme/i
    );
  }
);

test(
  "task prerequisite domain parity için task status ile ayrıca daraltılmaz",
  () => {
    const rpc = functionRegion();

    const start =
      rpc.indexOf(
        "perform 1"
      );

    const end =
      rpc.indexOf(
        "get diagnostics",
        start
      );

    assert.ok(start >= 0);
    assert.ok(end > start);

    const region =
      rpc.slice(
        start,
        end
      );

    assert.doesNotMatch(
      region,
      /\bstatus\b\s*(?:=|in\b)/i
    );
  }
);

test(
  "atanmış dock aynı account ve warehouse içinde FOR UPDATE kilitlenir",
  () => {
    const rpc = functionRegion();

    assert.match(
      rpc,
      /if\s+v_shipping\.dock_id\s+is\s+null/i
    );

    assert.match(
      rpc,
      /from\s+public\.warehouse_shipping_docks[\s\S]*?account_id\s*=\s*p_account_id[\s\S]*?warehouse_id\s*=\s*v_shipping\.warehouse_id[\s\S]*?id\s*=\s*v_shipping\.dock_id[\s\S]*?for\s+update/i
    );
  }
);

test(
  "dock active ve available veya reserved olmalıdır",
  () => {
    const rpc = functionRegion();

    assert.match(
      rpc,
      /not\s+v_dock\.active[\s\S]*?v_dock\.status\s+not\s+in\s*\(\s*'available'\s*,\s*'reserved'\s*\)/i
    );

    assert.match(
      persistence,
      /warehouse_shipping_docks_status_check[\s\S]*?'available'[\s\S]*?'reserved'[\s\S]*?'occupied'/i
    );
  }
);

test(
  "atomic mutation dock occupied ve Shipping loading durumuna geçirir",
  () => {
    const rpc = functionRegion();

    assert.match(
      rpc,
      /update\s+public\.warehouse_shipping_docks[\s\S]*?status\s*=\s*'occupied'[\s\S]*?updated_at\s*=\s*v_now/i
    );

    assert.match(
      rpc,
      /update\s+public\.warehouse_shippings[\s\S]*?status\s*=\s*'loading'[\s\S]*?loading_started_at\s*=\s*v_now[\s\S]*?updated_at\s*=\s*v_now/i
    );

    assert.match(
      rpc,
      /v_dock_updated\s*<>\s*1/i
    );

    assert.match(
      rpc,
      /v_shipping_updated\s*<>\s*1/i
    );
  }
);

test(
  "start_loading mutation surface yalnız ledger Shipping parent ve dock tablolarıdır",
  () => {
    const rpc = functionRegion();

    const mutationTables = new Set(
      [
        ...rpc.matchAll(
          /\b(?:insert\s+into|update|delete\s+from)\s+public\.([a-z0-9_]+)/gi
        )
      ].map(
        (row) => row[1]
      )
    );

    assert.deepEqual(
      [...mutationTables].sort(),
      [
        "warehouse_shipping_docks",
        "warehouse_shipping_write_requests",
        "warehouse_shippings"
      ]
    );
  }
);

test(
  "start_loading item package task downstream ve inventory mutation yapmaz",
  () => {
    const rpc = functionRegion();

    for (const table of [
      "warehouse_shipping_items",
      "warehouse_shipping_packages",
      "warehouse_shipping_tasks",
      "warehouse_shipping_manifests",
      "warehouse_shipping_asns",
      "warehouse_shipping_tracking_events",
      "warehouse_shipping_proofs_of_delivery",
      "warehouse_inventory_balances",
      "warehouse_inventory_movements",
      "warehouse_pickings",
      "warehouse_packings"
    ]) {
      assert.doesNotMatch(
        rpc,
        new RegExp(
          `(?:insert\\s+into|update|delete\\s+from)\\s+public\\.${table}\\b`,
          "i"
        )
      );
    }
  }
);

test(
  "stable response ledger içine completed sonuç olarak kaydedilir",
  () => {
    const rpc = functionRegion();

    for (const key of [
      "ok",
      "action",
      "requestId",
      "shippingId",
      "shippingNumber",
      "warehouseId",
      "dockId",
      "status",
      "loadingStartedAt",
      "dockStatus"
    ]) {
      assert.match(
        rpc,
        new RegExp(
          `'${key}'`
        )
      );
    }

    assert.match(
      rpc,
      /update\s+public\.warehouse_shipping_write_requests[\s\S]*?response_payload\s*=\s*v_result[\s\S]*?completed_at\s*=\s*v_now/i
    );
  }
);

test(
  "RPC SECURITY DEFINER search_path ve dar authenticated EXECUTE ACL kullanır",
  () => {
    assert.match(
      sql,
      /language\s+plpgsql\s+security\s+definer\s+set\s+search_path\s*=\s*public\s*,\s*pg_temp/i
    );

    assert.match(
      sql,
      /revoke\s+all\s+on\s+function\s+public\.warehouse_shipping_start_loading_write\s*\(\s*uuid\s*,\s*uuid\s*,\s*uuid\s*\)\s+from\s+public/i
    );

    assert.match(
      sql,
      /revoke\s+all\s+on\s+function\s+public\.warehouse_shipping_start_loading_write\s*\(\s*uuid\s*,\s*uuid\s*,\s*uuid\s*\)\s+from\s+anon/i
    );

    assert.match(
      sql,
      /revoke\s+all\s+on\s+function\s+public\.warehouse_shipping_start_loading_write\s*\(\s*uuid\s*,\s*uuid\s*,\s*uuid\s*\)\s+from\s+authenticated/i
    );

    assert.match(
      sql,
      /grant\s+execute\s+on\s+function\s+public\.warehouse_shipping_start_loading_write\s*\(\s*uuid\s*,\s*uuid\s*,\s*uuid\s*\)\s+to\s+authenticated/i
    );

    assert.doesNotMatch(
      sql,
      /\bservice_role\b/i
    );

    assert.doesNotMatch(
      sql,
      /grant\s+(?:insert|update|delete|all)\s+on\s+(?:table\s+)?public\.warehouse_[a-z0-9_]+[\s\S]*?to\s+authenticated/i
    );
  }
);
