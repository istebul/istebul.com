import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260822162000_warehouse_shipping_submit_manifest_write.sql";

const previousWritePath =
  "supabase/migrations/20260822161500_warehouse_shipping_approve_manifest_write.sql";

const persistencePath =
  "supabase/migrations/20260819231500_warehouse_shipping_persistence.sql";

const shippingServicePath =
  "src/warehouse/services/ShippingService.ts";

const manifestServicePath =
  "src/warehouse/services/ShippingManifestService.ts";

const manifestTypePath =
  "src/warehouse/types/ShippingManifest.ts";

const repositoryPath =
  "src/warehouse/services/SupabaseShippingRepository.ts";

const engineTestPath =
  "tests/unit/warehouse-shipping-engine.test.mjs";

const sql =
  fs.readFileSync(
    migrationPath,
    "utf8",
  );

const previousSql =
  fs.readFileSync(
    previousWritePath,
    "utf8",
  );

const persistenceSql =
  fs.readFileSync(
    persistencePath,
    "utf8",
  );

const shippingService =
  fs.readFileSync(
    shippingServicePath,
    "utf8",
  );

const manifestService =
  fs.readFileSync(
    manifestServicePath,
    "utf8",
  );

const manifestType =
  fs.readFileSync(
    manifestTypePath,
    "utf8",
  );

const repository =
  fs.readFileSync(
    repositoryPath,
    "utf8",
  );

const engineTest =
  fs.readFileSync(
    engineTestPath,
    "utf8",
  );

function extractSubmitRpc() {
  const start =
    sql.indexOf(
      "create or replace function\n  public.warehouse_shipping_submit_manifest_write(",
    );

  const end =
    sql.indexOf(
      "$warehouse_shipping_submit_manifest_write$;",
      start,
    );

  assert.ok(
    start >= 0,
    "submit_manifest RPC başlangıcı bulunmalı",
  );

  assert.ok(
    end > start,
    "submit_manifest RPC sonu bulunmalı",
  );

  return sql.slice(
    start,
    end,
  );
}

function extractSourceMethod(
  source,
  startNeedle,
  endNeedle,
) {
  const start =
    source.indexOf(
      startNeedle,
    );

  const end =
    source.indexOf(
      endNeedle,
      start,
    );

  assert.ok(
    start >= 0,
    `${startNeedle} bulunmalı`,
  );

  assert.ok(
    end > start,
    `${endNeedle} sınırı bulunmalı`,
  );

  return source.slice(
    start,
    end,
  );
}

const rpc =
  extractSubmitRpc();

test(
  "submit_manifest ledger action allowlist exact dokuz action içerir",
  () => {
    const matches = [
      ...sql.matchAll(
        /warehouse_shipping_write_requests_action_check[\s\S]*?action\s+in\s*\(([\s\S]*?)\)\s*\)/gi,
      ),
    ];

    assert.ok(
      matches.length >= 1,
    );

    const actions = [
      ...matches.at(-1)[1].matchAll(
        /'([^']+)'/g,
      ),
    ].map(
      (match) =>
        match[1],
    );

    assert.deepEqual(
      actions,
      [
        "create_from_packing",
        "start_loading",
        "confirm_item_load",
        "load_package",
        "complete_loading",
        "create_manifest",
        "generate_manifest",
        "approve_manifest",
        "submit_manifest",
      ],
    );
  },
);

test(
  "submit_manifest RPC exact request account shipping manifest UUID parametrelerini taşır",
  () => {
    assert.match(
      sql,
      /warehouse_shipping_submit_manifest_write\s*\(\s*p_request_id\s+uuid\s*,\s*p_account_id\s+uuid\s*,\s*p_shipping_id\s+uuid\s*,\s*p_manifest_id\s+uuid\s*\)/i,
    );

    assert.doesNotMatch(
      rpc,
      /\bp_submitted_by\b/i,
    );
  },
);

test(
  "submit_manifest caller auth.uid ve exact yedi account rolü ile korunur",
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

    const roles = [
      ...roleMatch[1].matchAll(
        /'([^']+)'/g,
      ),
    ].map(
      (match) =>
        match[1],
    );

    assert.deepEqual(
      roles,
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
  "submit_manifest required UUID girdilerini fail closed doğrular",
  () => {
    for (
      const parameter
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
          `if\\s+${parameter}\\s+is\\s+null\\s+then`,
          "i",
        ),
      );
    }
  },
);

test(
  "submit_manifest canonical idempotency payload yalnız shippingId ve manifestId bağlar",
  () => {
    const payloadMatch =
      rpc.match(
        /v_payload\s*:=\s*jsonb_build_object\s*\(([\s\S]*?)\)\s*;/i,
      );

    assert.ok(
      payloadMatch,
    );

    assert.match(
      payloadMatch[1],
      /'shippingId'\s*,\s*p_shipping_id/i,
    );

    assert.match(
      payloadMatch[1],
      /'manifestId'\s*,\s*p_manifest_id/i,
    );

    assert.doesNotMatch(
      payloadMatch[1],
      /submittedBy|approvedBy|generatedBy/i,
    );
  },
);

test(
  "submit_manifest idempotency kullanıcı action payload replay collision ve in-flight ayrımını korur",
  () => {
    assert.match(
      rpc,
      /warehouse_shipping_write_requests[\s\S]*?for\s+update/i,
    );

    assert.match(
      rpc,
      /on\s+conflict\s*\(\s*account_id\s*,\s*request_id\s*\)\s*do\s+nothing/i,
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
      /v_existing\.request_payload\s+is\s+distinct\s+from\s+v_payload/i,
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
  "submit_manifest Shipping varlığını read only doğrular ve hedef manifesti FOR UPDATE kilitler",
  () => {
    assert.match(
      rpc,
      /from\s+public\.warehouse_shippings\s+as\s+shipping[\s\S]*?shipping\.account_id\s*=\s*p_account_id[\s\S]*?shipping\.id\s*=\s*p_shipping_id/i,
    );

    assert.match(
      rpc,
      /Sevkiyat kaydı bulunamadı:/,
    );

    assert.match(
      rpc,
      /from\s+public\.warehouse_shipping_manifests\s+as\s+manifest[\s\S]*?manifest\.account_id\s*=\s*p_account_id[\s\S]*?manifest\.shipping_id\s*=\s*p_shipping_id[\s\S]*?manifest\.id\s*=\s*p_manifest_id[\s\S]*?for\s+update/i,
    );

    assert.match(
      rpc,
      /Manifest bulunamadı:/,
    );
  },
);

test(
  "submit_manifest yalnız approved manifest durumunu kabul eder",
  () => {
    assert.match(
      rpc,
      /v_manifest\.status\s*<>\s*'approved'/i,
    );

    assert.match(
      rpc,
      /Yalnızca onaylanmış manifest taşıyıcıya gönderilebilir\./,
    );

    assert.doesNotMatch(
      rpc,
      /v_manifest\.status\s+(?:=|<>|in)[\s\S]*?'generated'/i,
    );
  },
);

test(
  "submit_manifest manifest carrierId zorunluluğunu source parity ile korur",
  () => {
    assert.match(
      rpc,
      /v_manifest\.carrier_id\s+is\s+null/i,
    );

    assert.match(
      rpc,
      /Manifest gönderimi için taşıyıcı atanmalıdır\./,
    );
  },
);

test(
  "submit_manifest taşıyıcıyı account ve id ile read only doğrular",
  () => {
    assert.match(
      rpc,
      /from\s+public\.warehouse_shipping_carriers\s+as\s+carrier[\s\S]*?carrier\.account_id\s*=\s*p_account_id[\s\S]*?carrier\.id\s*=\s*v_manifest\.carrier_id/i,
    );

    assert.match(
      rpc,
      /Manifest taşıyıcısı bulunamadı\./,
    );

    assert.doesNotMatch(
      rpc,
      /update\s+public\.warehouse_shipping_carriers/i,
    );

    assert.doesNotMatch(
      rpc,
      /delete\s+from\s+public\.warehouse_shipping_carriers/i,
    );

    assert.doesNotMatch(
      rpc,
      /insert\s+into\s+public\.warehouse_shipping_carriers/i,
    );
  },
);

test(
  "submit_manifest pasif taşıyıcıyı reddeder",
  () => {
    assert.match(
      rpc,
      /if\s+not\s+v_carrier\.active\s+then/i,
    );

    assert.match(
      rpc,
      /Pasif taşıyıcıya manifest gönderilemez\./,
    );
  },
);

test(
  "submit_manifest manifest desteklemeyen taşıyıcıyı reddeder",
  () => {
    assert.match(
      rpc,
      /if\s+not\s+v_carrier\.manifest_supported\s+then/i,
    );

    assert.match(
      rpc,
      /Seçilen taşıyıcı manifest gönderimini desteklemiyor\./,
    );
  },
);

test(
  "submit_manifest source parity gereği Shipping status package service-level vehicle veya ASN gate eklemez",
  () => {
    assert.doesNotMatch(
      rpc,
      /shipping\.status/i,
    );

    assert.doesNotMatch(
      rpc,
      /warehouse_shipping_packages/i,
    );

    assert.doesNotMatch(
      rpc,
      /service_level_id\s+is\s+null/i,
    );

    assert.doesNotMatch(
      rpc,
      /vehicle_id\s+is\s+null/i,
    );

    assert.doesNotMatch(
      rpc,
      /warehouse_shipping_asns/i,
    );
  },
);

test(
  "submit_manifest manifesti submitted durumuna aynı server timestamp ile taşır",
  () => {
    assert.match(
      rpc,
      /v_now\s*:=\s*clock_timestamp\s*\(\s*\)/i,
    );

    assert.match(
      rpc,
      /update\s+public\.warehouse_shipping_manifests[\s\S]*?status\s*=\s*'submitted'[\s\S]*?submitted_at\s*=\s*v_now[\s\S]*?updated_at\s*=\s*v_now/i,
    );

    assert.doesNotMatch(
      rpc,
      /submitted_by/i,
    );
  },
);

test(
  "submit_manifest mutation surface yalnız Shipping ledger ve manifest tablolarıdır",
  () => {
    const mutations = new Set(
      [
        ...rpc.matchAll(
          /\b(?:insert\s+into|update|delete\s+from)\s+public\.([a-z0-9_]+)/gi,
        ),
      ].map(
        (match) =>
          match[1],
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
  "submit_manifest Shipping carrier package item task dock Packing Picking inventory ASN tracking POD mutation yapmaz",
  () => {
    const forbidden = [
      "warehouse_shippings",
      "warehouse_shipping_carriers",
      "warehouse_shipping_packages",
      "warehouse_shipping_items",
      "warehouse_shipping_tasks",
      "warehouse_shipping_docks",
      "warehouse_packing",
      "warehouse_picking",
      "warehouse_inventory",
      "warehouse_shipping_asns",
      "warehouse_shipping_tracking_events",
      "warehouse_shipping_proofs_of_delivery",
    ];

    for (
      const table
      of forbidden
    ) {
      assert.doesNotMatch(
        rpc,
        new RegExp(
          `(?:insert\\s+into|update|delete\\s+from)\\s+public\\.${table}\\b`,
          "i",
        ),
      );
    }
  },
);

test(
  "submit_manifest stable submitted response sonucunu ledger completed olarak saklar",
  () => {
    for (
      const key
      of [
        "ok",
        "action",
        "requestId",
        "shippingId",
        "manifestId",
        "manifestNumber",
        "status",
        "carrierId",
        "submittedAt",
        "updatedAt",
      ]
    ) {
      assert.match(
        rpc,
        new RegExp(
          `'${key}'`,
        ),
      );
    }

    assert.match(
      rpc,
      /response_payload\s*=\s*v_response[\s\S]*?completed_at\s*=\s*v_now/i,
    );
  },
);

test(
  "submit_manifest SECURITY DEFINER explicit search_path ve authenticated-only EXECUTE ACL kullanır",
  () => {
    assert.match(
      sql,
      /warehouse_shipping_submit_manifest_write[\s\S]*?security\s+definer[\s\S]*?set\s+search_path\s*=\s*public\s*,\s*pg_temp/i,
    );

    assert.match(
      sql,
      /revoke\s+all[\s\S]*?warehouse_shipping_submit_manifest_write[\s\S]*?from\s+public/i,
    );

    assert.match(
      sql,
      /revoke\s+all[\s\S]*?warehouse_shipping_submit_manifest_write[\s\S]*?from\s+anon/i,
    );

    assert.match(
      sql,
      /grant\s+execute[\s\S]*?warehouse_shipping_submit_manifest_write[\s\S]*?to\s+authenticated/i,
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
  "ShippingService.submitManifest ve ShippingManifestService.submit source parity korunur",
  () => {
    const outer =
      extractSourceMethod(
        shippingService,
        "async submitManifest(",
        "async listManifests(",
      );

    assert.match(
      outer,
      /tenantId:\s*string;/,
    );

    assert.match(
      outer,
      /shippingId:\s*string;/,
    );

    assert.match(
      outer,
      /manifestId:\s*string;/,
    );

    assert.doesNotMatch(
      outer,
      /submittedBy/,
    );

    assert.match(
      outer,
      /return\s+this\.manifestService\.submit\s*\(/,
    );

    const inner =
      extractSourceMethod(
        manifestService,
        "async submit(",
        "async accept(",
      );

    assert.match(
      inner,
      /manifest\.status\s*!==\s*"approved"/,
    );

    assert.match(
      inner,
      /manifest\.carrierId\s*===\s*undefined/,
    );

    assert.match(
      inner,
      /\.findCarrierById\s*\(/,
    );

    assert.match(
      inner,
      /!carrier\.active/,
    );

    assert.match(
      inner,
      /!carrier\.manifestSupported/,
    );

    assert.match(
      inner,
      /status:\s*"submitted"/,
    );

    assert.match(
      inner,
      /submittedAt:\s*timestamp/,
    );

    assert.match(
      inner,
      /updatedAt:\s*timestamp/,
    );
  },
);

test(
  "Shipping persistence repository type ve engine lifecycle submit kontratını destekler",
  () => {
    assert.match(
      persistenceSql,
      /warehouse_shipping_manifests[\s\S]*?carrier_id\s+uuid[\s\S]*?submitted_at\s+timestamptz/i,
    );

    assert.doesNotMatch(
      persistenceSql.match(
        /create table if not exists public\.warehouse_shipping_manifests\s*\(([\s\S]*?)\n\);/i,
      )?.[1] ?? "",
      /^\s*submitted_by\s+/im,
    );

    assert.match(
      persistenceSql,
      /warehouse_shipping_carriers[\s\S]*?manifest_supported\s+boolean[\s\S]*?active\s+boolean/i,
    );

    assert.match(
      manifestType,
      /readonly\s+carrierId\?:\s*string;/,
    );

    assert.match(
      manifestType,
      /readonly\s+submittedAt\?:\s*string;/,
    );

    assert.doesNotMatch(
      manifestType,
      /readonly\s+submittedBy/,
    );

    assert.match(
      repository,
      /\.eq\("account_id",\s*tenantId\)[\s\S]*?\.eq\(column,\s*value\)[\s\S]*?\.maybeSingle\(\)/,
    );

    assert.match(
      repository,
      /manifestSupported:\s*row\.manifest_supported/,
    );

    assert.match(
      repository,
      /active:\s*row\.active/,
    );

    assert.match(
      engineTest,
      /\.approveManifest\([\s\S]*?approved\.status[\s\S]*?"approved"[\s\S]*?\.submitManifest\([\s\S]*?submitted\.status[\s\S]*?"submitted"[\s\S]*?\.accept\(/,
    );

    assert.match(
      previousSql,
      /'approve_manifest'/,
    );
  },
);
