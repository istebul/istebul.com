import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

const migrationPath = path.join(
  root,
  "supabase/migrations/20260822160000_warehouse_shipping_complete_loading_write.sql",
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
    "create or replace function\n  public.warehouse_shipping_complete_loading_write(",
  );

  assert.notEqual(
    start,
    -1,
    "complete_loading RPC başlangıcı bulunamadı.",
  );

  const marker =
    "$warehouse_shipping_complete_loading_write$;";

  const end = sql.indexOf(
    marker,
    start,
  );

  assert.notEqual(
    end,
    -1,
    "complete_loading RPC bitişi bulunamadı.",
  );

  return sql.slice(
    start,
    end + marker.length,
  );
}

function extractSource() {
  const start = service.indexOf(
    "async completeLoading(",
  );

  const end = service.indexOf(
    "async createManifest(",
    start,
  );

  assert.ok(
    start >= 0 &&
      end > start,
    "ShippingService.completeLoading region bulunamadı.",
  );

  return service.slice(
    start,
    end,
  );
}

const rpc = extractRpc(
  migration,
);

const source = extractSource();

test(
  "Shipping ledger action allowlist complete_loading ile exact beş action içerir",
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
        "complete_loading",
      ],
    );
  },
);

test(
  "complete_loading RPC exact üç UUID parametre taşır",
  () => {
    assert.match(
      migration,
      /warehouse_shipping_complete_loading_write\s*\(\s*p_request_id\s+uuid\s*,\s*p_account_id\s+uuid\s*,\s*p_shipping_id\s+uuid\s*\)/i,
    );
  },
);

test(
  "complete_loading caller identity auth.uid ve exact yedi account rolü ile korunur",
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
  "complete_loading request account shipping UUID girdilerini fail closed doğrular",
  () => {
    for (const parameter of [
      "p_request_id",
      "p_account_id",
      "p_shipping_id",
    ]) {
      assert.match(
        rpc,
        new RegExp(
          `${parameter}\\s+is\\s+null`,
          "i",
        ),
      );
    }
  },
);

test(
  "complete_loading canonical idempotency payload yalnız shippingId bağlar",
  () => {
    assert.match(
      rpc,
      /v_payload\s*:=\s*jsonb_build_object\s*\(\s*'shippingId'\s*,\s*p_shipping_id\s*\)/i,
    );
  },
);

test(
  "complete_loading idempotency user action payload replay ve in-flight ayrımını korur",
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
      /Yalnızca yükleme devam eden sevkiyatın yüklemesi tamamlanabilir\./,
    );
  },
);

test(
  "Shipping item set account shipping kapsamında FOR UPDATE kilitlenir ve remaining_quantity pozitif satır yüklemeyi engeller",
  () => {
    assert.match(
      rpc,
      /perform\s+1\s+from\s+public\.warehouse_shipping_items\s+where\s+account_id\s*=\s*p_account_id\s+and\s+shipping_id\s*=\s*p_shipping_id\s+for\s+update/i,
    );

    assert.match(
      rpc,
      /exists\s*\(\s*select\s+1\s+from\s+public\.warehouse_shipping_items[\s\S]*?account_id\s*=\s*p_account_id[\s\S]*?shipping_id\s*=\s*p_shipping_id[\s\S]*?remaining_quantity\s*>\s*0/i,
    );

    assert.match(
      rpc,
      /Tüm sevkiyat satırları sonuçlandırılmadan yükleme tamamlanamaz\./,
    );
  },
);

test(
  "Shipping package set account shipping kapsamında FOR UPDATE kilitlenir ve loaded olmayan paket engeller",
  () => {
    assert.match(
      rpc,
      /perform\s+1\s+from\s+public\.warehouse_shipping_packages\s+where\s+account_id\s*=\s*p_account_id\s+and\s+shipping_id\s*=\s*p_shipping_id\s+for\s+update/i,
    );

    assert.match(
      rpc,
      /exists\s*\(\s*select\s+1\s+from\s+public\.warehouse_shipping_packages[\s\S]*?account_id\s*=\s*p_account_id[\s\S]*?shipping_id\s*=\s*p_shipping_id[\s\S]*?status\s*<>\s*'loaded'/i,
    );

    assert.match(
      rpc,
      /Tüm sevkiyat paketleri yüklenmeden araç yüklemesi tamamlanamaz\./,
    );
  },
);

test(
  "complete_loading lock order Shipping parent sonra items sonra packages şeklindedir",
  () => {
    const parent =
      rpc.indexOf(
        "from public.warehouse_shippings",
      );

    const items =
      rpc.indexOf(
        "from public.warehouse_shipping_items",
        parent + 1,
      );

    const packages =
      rpc.indexOf(
        "from public.warehouse_shipping_packages",
        items + 1,
      );

    assert.ok(
      parent >= 0,
    );

    assert.ok(
      items > parent,
    );

    assert.ok(
      packages > items,
    );
  },
);

test(
  "complete_loading Shipping parent status loaded ve loadedAt updatedAt aynı server timestamp ile yazar",
  () => {
    assert.match(
      rpc,
      /v_now\s*:=\s*now\s*\(\s*\)/i,
    );

    assert.match(
      rpc,
      /update\s+public\.warehouse_shippings[\s\S]*?status\s*=\s*'loaded'[\s\S]*?loaded_at\s*=\s*v_now[\s\S]*?updated_at\s*=\s*v_now/i,
    );

    assert.match(
      rpc,
      /returning\s+\*\s+into\s+v_updated_shipping/i,
    );
  },
);

test(
  "complete_loading mutation surface yalnız Shipping ledger ve Shipping parent tablolarıdır",
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
        "warehouse_shipping_write_requests",
        "warehouse_shippings",
      ],
    );
  },
);

test(
  "complete_loading item package task dock Packing Picking inventory downstream mutation yapmaz",
  () => {
    for (const table of [
      "warehouse_shipping_items",
      "warehouse_shipping_packages",
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
  "stable response loaded Shipping sonucunu döndürür ve ledger completed sonucu saklar",
  () => {
    for (const key of [
      "ok",
      "action",
      "requestId",
      "shippingId",
      "status",
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
  "complete_loading SECURITY DEFINER explicit search_path ve authenticated-only EXECUTE ACL kullanır",
  () => {
    assert.match(
      migration,
      /returns\s+jsonb\s+language\s+plpgsql\s+security\s+definer\s+set\s+search_path\s*=\s*public\s*,\s*pg_temp/i,
    );

    const signature =
      String.raw`warehouse_shipping_complete_loading_write\s*\(\s*uuid\s*,\s*uuid\s*,\s*uuid\s*\)`;

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
  "ShippingService.completeLoading input contract exact tenantId ve shippingId string parametreleridir",
  () => {
    assert.match(
      source,
      /async\s+completeLoading\s*\(\s*tenantId\s*:\s*string\s*,\s*shippingId\s*:\s*string\s*,?\s*\)\s*:\s*Promise<Shipping>/s,
    );
  },
);

test(
  "SQL completeLoading source status item package ve save davranışını daraltmadan korur",
  () => {
    assert.match(
      source,
      /shipping\.status\s*!==\s*"loading"/,
    );

    assert.match(
      source,
      /shipping\.items\.filter\s*\([\s\S]*?item\.remainingQuantity\s*>\s*0/,
    );

    assert.match(
      source,
      /incompleteItems\.length\s*>\s*0/,
    );

    assert.match(
      source,
      /shipping\.packages\.filter\s*\([\s\S]*?shippingPackage\.status\s*!==\s*"loaded"/,
    );

    assert.match(
      source,
      /unloadedPackages\.length\s*>\s*0/,
    );

    assert.match(
      source,
      /const\s+timestamp\s*=\s*this\.now\s*\(\s*\)/,
    );

    assert.match(
      source,
      /this\.repository\.save\s*\(\s*\{[\s\S]*?status\s*:\s*"loaded"[\s\S]*?loadedAt\s*:\s*timestamp[\s\S]*?updatedAt\s*:\s*timestamp/s,
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
          /^(?:save|create|update|delete|replace|set|mark|complete)/.test(
            name,
          ),
      );

    assert.deepEqual(
      mutations,
      ["save"],
    );
  },
);

test(
  "Shipping persistence completeLoading için parent loaded metadata item remaining ve package status kontratını destekler",
  () => {
    const shippingMatch =
      persistence.match(
        /create\s+table\s+if\s+not\s+exists\s+public\.warehouse_shippings\s*\(([\s\S]*?)\n\);/i,
      );

    const itemMatch =
      persistence.match(
        /create\s+table\s+if\s+not\s+exists\s+public\.warehouse_shipping_items\s*\(([\s\S]*?)\n\);/i,
      );

    const packageMatch =
      persistence.match(
        /create\s+table\s+if\s+not\s+exists\s+public\.warehouse_shipping_packages\s*\(([\s\S]*?)\n\);/i,
      );

    assert.ok(
      shippingMatch,
      "warehouse_shippings DDL bulunamadı.",
    );

    assert.ok(
      itemMatch,
      "warehouse_shipping_items DDL bulunamadı.",
    );

    assert.ok(
      packageMatch,
      "warehouse_shipping_packages DDL bulunamadı.",
    );

    const shippingDdl =
      normalize(
        shippingMatch[0],
      );

    const itemDdl =
      normalize(
        itemMatch[0],
      );

    const packageDdl =
      normalize(
        packageMatch[0],
      );

    assert.match(
      shippingDdl,
      /\bloaded_at\s+timestamptz\b/i,
    );

    assert.match(
      shippingDdl,
      /\bupdated_at\s+timestamptz\b/i,
    );

    assert.ok(
      shippingDdl.includes(
        "'loading'",
      ),
    );

    assert.ok(
      shippingDdl.includes(
        "'loaded'",
      ),
    );

    assert.match(
      itemDdl,
      /\bremaining_quantity\s+numeric\(18,6\)\s+not\s+null\b/i,
    );

    assert.match(
      itemDdl,
      /remaining_quantity\s*>=\s*0/i,
    );

    assert.match(
      packageDdl,
      /\bstatus\s+text\s+not\s+null\b/i,
    );

    assert.ok(
      packageDdl.includes(
        "'loaded'",
      ),
    );
  },
);
