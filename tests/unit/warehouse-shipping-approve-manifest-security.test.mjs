import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260822161500_warehouse_shipping_approve_manifest_write.sql";

const previousMigrationPath =
  "supabase/migrations/20260822161000_warehouse_shipping_generate_manifest_write.sql";

const servicePath =
  "src/warehouse/services/ShippingService.ts";

const manifestServicePath =
  "src/warehouse/services/ShippingManifestService.ts";

const manifestTypePath =
  "src/warehouse/types/ShippingManifest.ts";

const persistencePath =
  "supabase/migrations/20260819231500_warehouse_shipping_persistence.sql";

const engineTestPath =
  "tests/unit/warehouse-shipping-engine.test.mjs";

const sql =
  readFileSync(
    migrationPath,
    "utf8",
  );

const previousSql =
  readFileSync(
    previousMigrationPath,
    "utf8",
  );

const shippingService =
  readFileSync(
    servicePath,
    "utf8",
  );

const manifestService =
  readFileSync(
    manifestServicePath,
    "utf8",
  );

const manifestType =
  readFileSync(
    manifestTypePath,
    "utf8",
  );

const persistence =
  readFileSync(
    persistencePath,
    "utf8",
  );

const engineTest =
  readFileSync(
    engineTestPath,
    "utf8",
  );

function extractFunction(
  source,
  functionName,
) {
  const start =
    source.indexOf(
      `create or replace function\n  public.${functionName}(`,
    );

  assert.notEqual(
    start,
    -1,
  );

  const marker =
    `$${functionName}$;`;

  const end =
    source.indexOf(
      marker,
      start,
    );

  assert.notEqual(
    end,
    -1,
  );

  return source.slice(
    start,
    end + marker.length,
  );
}

function extractMethod(
  source,
  startToken,
  endToken,
) {
  const start =
    source.indexOf(
      startToken,
    );

  assert.notEqual(
    start,
    -1,
  );

  const end =
    source.indexOf(
      endToken,
      start + startToken.length,
    );

  assert.notEqual(
    end,
    -1,
  );

  return source.slice(
    start,
    end,
  );
}

function extractActions(
  source,
) {
  const matches =
    [
      ...source.matchAll(
        /add\s+constraint\s+warehouse_shipping_write_requests_action_check[\s\S]*?check\s*\(\s*action\s+in\s*\(([\s\S]*?)\)\s*\)\s*;/gi,
      ),
    ];

  assert.ok(
    matches.length > 0,
  );

  return [
    ...matches.at(-1)[1].matchAll(
      /'([^']+)'/g,
    ),
  ].map(
    (match) => match[1],
  );
}

const rpc =
  extractFunction(
    sql,
    "warehouse_shipping_approve_manifest_write",
  );

const outerMethod =
  extractMethod(
    shippingService,
    "async approveManifest(",
    "async submitManifest(",
  );

const innerMethod =
  extractMethod(
    manifestService,
    "async approve(",
    "async submit(",
  );

test(
  "approve_manifest ledger action allowlist exact sekiz action içerir",
  () => {
    assert.deepEqual(
      extractActions(
        previousSql,
      ),
      [
        "create_from_packing",
        "start_loading",
        "confirm_item_load",
        "load_package",
        "complete_loading",
        "create_manifest",
        "generate_manifest",
      ],
    );

    assert.deepEqual(
      extractActions(
        sql,
      ),
      [
        "create_from_packing",
        "start_loading",
        "confirm_item_load",
        "load_package",
        "complete_loading",
        "create_manifest",
        "generate_manifest",
        "approve_manifest",
      ],
    );
  },
);

test(
  "approve_manifest RPC exact request account shipping manifest approvedBy parametrelerini taşır",
  () => {
    assert.match(
      sql,
      /warehouse_shipping_approve_manifest_write\s*\(\s*p_request_id\s+uuid\s*,\s*p_account_id\s+uuid\s*,\s*p_shipping_id\s+uuid\s*,\s*p_manifest_id\s+uuid\s*,\s*p_approved_by\s+text\s*\)\s*returns\s+jsonb/i,
    );
  },
);

test(
  "approve_manifest caller auth.uid ve exact yedi account rolü ile korunur",
  () => {
    assert.match(
      rpc,
      /v_user_id\s+uuid\s*:=\s*auth\.uid\s*\(\s*\)/i,
    );

    const roleMatch =
      rpc.match(
        /warehouse_has_account_role\s*\(\s*p_account_id\s*,\s*array\s*\[([\s\S]*?)\]::text\[\]/i,
      );

    assert.ok(
      roleMatch,
    );

    assert.deepEqual(
      [
        ...roleMatch[1].matchAll(
          /'([^']+)'/g,
        ),
      ].map(
        (match) => match[1],
      ),
      [
        "owner",
        "admin",
        "warehouse_manager",
        "supervisor",
        "inventory_controller",
        "picker",
        "operator",
      ],
    );
  },
);

test(
  "approve_manifest required UUID girdilerini ve approvedBy değerini fail closed doğrular",
  () => {
    for (
      const input
      of [
        "p_request_id",
        "p_account_id",
        "p_shipping_id",
        "p_manifest_id",
      ]
    ) {
      assert.match(
        rpc,
        new RegExp(
          `if\\s+${input}\\s+is\\s+null`,
          "i",
        ),
      );
    }

    assert.match(
      rpc,
      /v_approved_by\s*:=\s*nullif\s*\(\s*btrim\s*\(\s*coalesce\s*\(\s*p_approved_by\s*,\s*''\s*\)\s*\)\s*,\s*''\s*\)/i,
    );

    assert.match(
      rpc,
      /Manifesti onaylayan kullanıcı boş bırakılamaz\./,
    );
  },
);

test(
  "approve_manifest canonical idempotency payload shipping manifest approvedBy bağlar",
  () => {
    assert.match(
      rpc,
      /v_payload\s*:=\s*jsonb_build_object\s*\(\s*'shippingId'\s*,\s*p_shipping_id\s*,\s*'manifestId'\s*,\s*p_manifest_id\s*,\s*'approvedBy'\s*,\s*v_approved_by\s*\)/i,
    );
  },
);

test(
  "approve_manifest idempotency user action payload replay collision ve in-flight ayrımını korur",
  () => {
    assert.match(
      rpc,
      /from\s+public\.warehouse_shipping_write_requests[\s\S]*?for\s+update/i,
    );

    assert.match(
      rpc,
      /v_existing\.user_id\s*<>\s*v_user_id/i,
    );

    assert.match(
      rpc,
      /v_existing\.action\s*<>\s*v_action/i,
    );

    assert.match(
      rpc,
      /v_existing\.request_payload\s*<>\s*v_payload/i,
    );

    assert.match(
      rpc,
      /return\s+v_existing\.response_payload/i,
    );

    assert.match(
      rpc,
      /on\s+conflict\s*\(\s*account_id\s*,\s*request_id\s*\)\s*do\s+nothing/i,
    );

    assert.match(
      rpc,
      /Aynı istek kimliği farklı bir sevkiyat işlemi için kullanılamaz\./,
    );

    assert.match(
      rpc,
      /Aynı sevkiyat isteği halen işleniyor\. Tekrar deneyin\./,
    );
  },
);

test(
  "approve_manifest Shipping varlığını doğrular ve hedef manifesti account shipping id ile FOR UPDATE kilitler",
  () => {
    assert.match(
      rpc,
      /perform\s+1\s+from\s+public\.warehouse_shippings\s+as\s+shipping[\s\S]*?shipping\.account_id\s*=\s*p_account_id[\s\S]*?shipping\.id\s*=\s*p_shipping_id/i,
    );

    assert.match(
      rpc,
      /Sevkiyat kaydı bulunamadı: %s/,
    );

    assert.match(
      rpc,
      /select\s+manifest\.\*[\s\S]*?from\s+public\.warehouse_shipping_manifests\s+as\s+manifest[\s\S]*?manifest\.account_id\s*=\s*p_account_id[\s\S]*?manifest\.shipping_id\s*=\s*p_shipping_id[\s\S]*?manifest\.id\s*=\s*p_manifest_id[\s\S]*?for\s+update/i,
    );

    assert.match(
      rpc,
      /Manifest bulunamadı: %s/,
    );
  },
);

test(
  "approve_manifest yalnız generated manifest durumunu kabul eder",
  () => {
    assert.match(
      rpc,
      /v_manifest\.status\s*<>\s*'generated'/i,
    );

    assert.match(
      rpc,
      /Yalnızca oluşturulmuş manifest onaylanabilir\./,
    );

    assert.doesNotMatch(
      rpc,
      /v_manifest\.status\s+(?:not\s+in|in)\s*\(/i,
    );
  },
);

test(
  "approve_manifest stored manifest packageCount ve snapshot length parity prerequisite uygular",
  () => {
    assert.match(
      rpc,
      /v_manifest\.package_count\s*=\s*0/i,
    );

    assert.match(
      rpc,
      /Paket içermeyen manifest onaylanamaz\./,
    );

    assert.match(
      rpc,
      /jsonb_array_length\s*\(\s*v_manifest\.packages\s*\)\s*<>\s*v_manifest\.package_count/i,
    );

    assert.match(
      rpc,
      /Manifest paket sayısı ile paket kayıtları uyuşmamaktadır\./,
    );
  },
);

test(
  "approve_manifest source parity gereği live Shipping package read lock veya ek Shipping status gate eklemez",
  () => {
    assert.doesNotMatch(
      rpc,
      /warehouse_shipping_packages/i,
    );

    assert.doesNotMatch(
      rpc,
      /shipping\.status/i,
    );

    assert.doesNotMatch(
      rpc,
      /carrier_id\s+is\s+null|service_level_id\s+is\s+null|vehicle_id\s+is\s+null/i,
    );
  },
);

test(
  "approve_manifest approvedBy domain text olarak trim edilir ve auth uid ile değiştirilmez",
  () => {
    assert.match(
      rpc,
      /v_approved_by\s*:=\s*nullif\s*\(\s*btrim/i,
    );

    assert.match(
      rpc,
      /approved_by\s*=\s*v_approved_by/i,
    );

    assert.doesNotMatch(
      rpc,
      /approved_by\s*=\s*v_user_id/i,
    );
  },
);

test(
  "approve_manifest manifesti approved durumuna aynı server timestamp ile taşır",
  () => {
    const updateMatch =
      rpc.match(
        /update\s+public\.warehouse_shipping_manifests\s+set([\s\S]*?)returning\s+\*/i,
      );

    assert.ok(
      updateMatch,
    );

    const updateBody =
      updateMatch[1];

    assert.match(
      updateBody,
      /status\s*=\s*'approved'/i,
    );

    assert.match(
      updateBody,
      /approved_by\s*=\s*v_approved_by/i,
    );

    assert.match(
      updateBody,
      /approved_at\s*=\s*v_now/i,
    );

    assert.match(
      updateBody,
      /updated_at\s*=\s*v_now/i,
    );

    assert.match(
      rpc,
      /v_now\s*:=\s*clock_timestamp\s*\(\s*\)/i,
    );
  },
);

test(
  "approve_manifest mutation surface yalnız Shipping ledger ve manifest tablolarıdır",
  () => {
    const mutations =
      new Set(
        [
          ...rpc.matchAll(
            /\b(?:insert\s+into|update|delete\s+from)\s+public\.([a-z0-9_]+)/gi,
          ),
        ].map(
          (match) =>
            match[1].toLowerCase(),
        ),
      );

    assert.deepEqual(
      [
        ...mutations,
      ].sort(),
      [
        "warehouse_shipping_manifests",
        "warehouse_shipping_write_requests",
      ],
    );
  },
);

test(
  "approve_manifest Shipping package item task dock Packing Picking inventory ASN tracking POD mutation yapmaz",
  () => {
    for (
      const table
      of [
        "warehouse_shippings",
        "warehouse_shipping_packages",
        "warehouse_shipping_items",
        "warehouse_shipping_tasks",
        "warehouse_shipping_docks",
        "warehouse_packings",
        "warehouse_packing_items",
        "warehouse_picking_tasks",
        "warehouse_inventory_balances",
        "warehouse_inventory_movements",
        "warehouse_shipping_asns",
        "warehouse_shipping_tracking_events",
        "warehouse_shipping_proofs_of_delivery",
      ]
    ) {
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
  "approve_manifest stable approved response sonucunu ledger completed olarak saklar",
  () => {
    const resultMatch =
      rpc.match(
        /v_result\s*:=\s*jsonb_build_object\s*\(([\s\S]*?)\)\s*;\s*update\s+public\.warehouse_shipping_write_requests/i,
      );

    assert.ok(
      resultMatch,
    );

    const keys =
      [
        ...resultMatch[1].matchAll(
          /'([^']+)'\s*,/g,
        ),
      ].map(
        (match) => match[1],
      );

    assert.deepEqual(
      keys,
      [
        "ok",
        "action",
        "requestId",
        "shippingId",
        "manifestId",
        "manifestNumber",
        "status",
        "packageCount",
        "packages",
        "approvedBy",
        "approvedAt",
        "updatedAt",
      ],
    );

    assert.match(
      rpc,
      /update\s+public\.warehouse_shipping_write_requests\s+set\s+response_payload\s*=\s*v_result\s*,\s*completed_at\s*=\s*v_now/i,
    );
  },
);

test(
  "approve_manifest SECURITY DEFINER explicit search_path ve authenticated-only EXECUTE ACL kullanır",
  () => {
    assert.match(
      sql,
      /security\s+definer/i,
    );

    assert.match(
      sql,
      /set\s+search_path\s*=\s*public\s*,\s*pg_temp/i,
    );

    for (
      const role
      of [
        "public",
        "anon",
        "authenticated",
      ]
    ) {
      assert.match(
        sql,
        new RegExp(
          `revoke\\s+all[\\s\\S]*?warehouse_shipping_approve_manifest_write[\\s\\S]*?from\\s+${role}\\s*;`,
          "i",
        ),
      );
    }

    assert.match(
      sql,
      /grant\s+execute[\s\S]*?warehouse_shipping_approve_manifest_write[\s\S]*?to\s+authenticated\s*;/i,
    );

    assert.doesNotMatch(
      sql,
      /\bservice_role\b/i,
    );

    assert.doesNotMatch(
      sql,
      /grant\s+(?:insert|update|delete|all)\s+on\s+(?:table\s+)?public\./i,
    );
  },
);

test(
  "ShippingService.approveManifest exact dört inputu manifestService.approve çağrısına aktarır",
  () => {
    const fields =
      [
        ...outerMethod.matchAll(
          /^\s+(tenantId|shippingId|manifestId|approvedBy):\s*string;/gm,
        ),
      ].map(
        (match) => match[1],
      );

    assert.deepEqual(
      fields,
      [
        "tenantId",
        "shippingId",
        "manifestId",
        "approvedBy",
      ],
    );

    assert.match(
      outerMethod,
      /return\s+this\.manifestService\.approve\s*\(\s*\{[\s\S]*?tenantId\s*:\s*input\.tenantId[\s\S]*?shippingId\s*:\s*input\.shippingId[\s\S]*?manifestId\s*:\s*input\.manifestId[\s\S]*?approvedBy\s*:\s*input\.approvedBy/i,
    );

    assert.doesNotMatch(
      outerMethod,
      /this\.repository\./,
    );
  },
);

test(
  "ShippingManifestService.approve generated status package snapshot approvedBy ve saveManifest davranışını korur",
  () => {
    assert.match(
      innerMethod,
      /await\s+this\.get\s*\(/,
    );

    assert.match(
      innerMethod,
      /manifest\.status\s*!==\s*"generated"/,
    );

    assert.match(
      innerMethod,
      /manifest\.packageCount\s*===\s*0/,
    );

    assert.match(
      innerMethod,
      /manifest\.packages\.length\s*!==\s*manifest\.packageCount/s,
    );

    assert.match(
      innerMethod,
      /requireText\s*\(\s*input\.approvedBy\s*,\s*"Manifesti onaylayan kullanıcı"/s,
    );

    const repoCalls =
      [
        ...innerMethod.matchAll(
          /this\.repository\.([A-Za-z0-9_]+)\s*\(/g,
        ),
      ].map(
        (match) => match[1],
      );

    assert.deepEqual(
      repoCalls,
      [
        "saveManifest",
      ],
    );

    assert.match(
      innerMethod,
      /status:\s*"approved"/,
    );

    assert.match(
      innerMethod,
      /approvedAt:\s*timestamp/,
    );

    assert.match(
      innerMethod,
      /updatedAt:\s*timestamp/,
    );
  },
);

test(
  "Shipping manifest persistence approval lifecycle package snapshot ve approval metadata alanlarını destekler",
  () => {
    assert.match(
      manifestType,
      /"generated"[\s\S]*?"approved"/,
    );

    assert.match(
      manifestType,
      /readonly\s+packageCount:\s*number;/,
    );

    assert.match(
      manifestType,
      /readonly\s+packages:\s*readonly\s+ShippingManifestPackage\[\];/,
    );

    assert.match(
      manifestType,
      /readonly\s+approvedBy\?:\s*string;/,
    );

    assert.match(
      manifestType,
      /readonly\s+approvedAt\?:\s*string;/,
    );

    assert.match(
      persistence,
      /approved_by\s+text/i,
    );

    assert.match(
      persistence,
      /approved_at\s+timestamptz/i,
    );

    assert.match(
      persistence,
      /status\s+in\s*\([\s\S]*?'generated'[\s\S]*?'approved'/i,
    );
  },
);

test(
  "Shipping engine manifest yaşam döngüsü generate sonrası approvedBy ile approve ve approved status doğrular",
  () => {
    const lifecycle =
      extractMethod(
        engineTest,
        'test(\n  "manifest yaşam döngüsü tamamlanır"',
        'test(\n  "ASN JSON içeriği üretir ve gönderilir"',
      );

    assert.match(
      lifecycle,
      /\.generateManifest\s*\(/,
    );

    assert.match(
      lifecycle,
      /generated\.status[\s\S]*?"generated"/,
    );

    assert.match(
      lifecycle,
      /\.approveManifest\s*\([\s\S]*?approvedBy:\s*"manager-1"/,
    );

    assert.match(
      lifecycle,
      /approved\.status[\s\S]*?"approved"/,
    );
  },
);
