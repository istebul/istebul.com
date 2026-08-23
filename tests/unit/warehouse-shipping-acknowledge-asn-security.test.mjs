import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync(
  new URL(
    "../../supabase/migrations/20260822164000_warehouse_shipping_acknowledge_asn_write.sql",
    import.meta.url,
  ),
  "utf8",
);

const asnService = fs.readFileSync(
  new URL(
    "../../src/warehouse/services/ShippingAsnService.ts",
    import.meta.url,
  ),
  "utf8",
);

const asnTypes = fs.readFileSync(
  new URL(
    "../../src/warehouse/types/ShippingAsn.ts",
    import.meta.url,
  ),
  "utf8",
);

const persistence = fs.readFileSync(
  new URL(
    "../../supabase/migrations/20260819231500_warehouse_shipping_persistence.sql",
    import.meta.url,
  ),
  "utf8",
);

function extractFunction(sql, name) {
  const header = new RegExp(
    String.raw`create\s+or\s+replace\s+function\s+public\.${name}\s*\(`,
    "i",
  ).exec(sql);

  assert.ok(header);

  const rest = sql.slice(header.index);

  const opener =
    /\bas\s+(\$[A-Za-z0-9_]*\$)/i.exec(rest);

  assert.ok(opener);

  const tag = opener[1];

  const close = rest.indexOf(
    tag,
    opener.index + opener[0].length,
  );

  assert.notEqual(close, -1);

  return rest.slice(
    0,
    close + tag.length,
  );
}

function extractLedgerActions(sql) {
  const matches = [
    ...sql.matchAll(
      /constraint\s+warehouse_shipping_write_requests_action_check\s+check\s*\(\s*action\s+in\s*\(([\s\S]*?)\)\s*\)/gi,
    ),
  ];

  assert.ok(matches.length > 0);

  return [
    ...matches.at(-1)[1].matchAll(
      /'([^']+)'/g,
    ),
  ].map(
    (match) => match[1],
  );
}

function extractStableResponseKeys(fn) {
  const matches = [
    ...fn.matchAll(
      /v_result\s*:=\s*jsonb_build_object\s*\(([\s\S]*?)\)\s*;/gi,
    ),
  ];

  assert.ok(matches.length > 0);

  return [
    ...matches.at(-1)[1].matchAll(
      /'([^']+)'\s*,/g,
    ),
  ].map(
    (match) => match[1],
  );
}

const fn = extractFunction(
  migration,
  "warehouse_shipping_acknowledge_asn_write",
);

test(
  "acknowledge_asn ledger action allowlist exact on üç action içerir",
  () => {
    assert.deepEqual(
      extractLedgerActions(migration),
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
        "create_asn",
        "generate_asn",
        "send_asn",
        "acknowledge_asn",
      ],
    );
  },
);

test(
  "acknowledge_asn RPC exact dört UUID parametre taşır",
  () => {
    assert.match(
      migration,
      /warehouse_shipping_acknowledge_asn_write\s*\(\s*p_request_id\s+uuid\s*,\s*p_account_id\s+uuid\s*,\s*p_shipping_id\s+uuid\s*,\s*p_asn_id\s+uuid\s*\)\s*returns\s+jsonb/i,
    );
  },
);

test(
  "acknowledge_asn caller auth.uid ve exact yedi account rolü ile korunur",
  () => {
    assert.match(
      fn,
      /\bauth\.uid\s*\(\s*\)/i,
    );

    const roleMatch =
      /warehouse_has_account_role\s*\(\s*p_account_id\s*,\s*array\s*\[([\s\S]*?)\]\s*::text\[\]\s*\)/i.exec(
        fn,
      );

    assert.ok(roleMatch);

    const roles = [
      ...roleMatch[1].matchAll(
        /'([^']+)'/g,
      ),
    ].map(
      (match) => match[1],
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
  "acknowledge_asn required UUID girdilerini fail closed doğrular",
  () => {
    for (const parameter of [
      "p_request_id",
      "p_account_id",
      "p_shipping_id",
      "p_asn_id",
    ]) {
      assert.match(
        fn,
        new RegExp(
          String.raw`\b${parameter}\b[\s\S]{0,180}\bis\s+null\b`,
          "i",
        ),
      );
    }
  },
);

test(
  "acknowledge_asn canonical idempotency payload yalnız shippingId ve asnId bağlar",
  () => {
    assert.match(
      fn,
      /jsonb_build_object\s*\(\s*'shippingId'\s*,\s*p_shipping_id\s*,\s*'asnId'\s*,\s*p_asn_id\s*\)/i,
    );
  },
);

test(
  "acknowledge_asn idempotency replay collision ve in-flight ayrımını korur",
  () => {
    assert.match(
      fn,
      /Aynı istek kimliği farklı bir sevkiyat işlemi için kullanılamaz\./,
    );

    assert.match(
      fn,
      /Aynı sevkiyat isteği halen işleniyor\. Tekrar deneyin\./,
    );
  },
);

test(
  "acknowledge_asn hedef ASN account shipping id ile FOR UPDATE kilitlenir ve sole domain lock kalır",
  () => {
    assert.match(
      fn,
      /from\s+public\.warehouse_shipping_asns\s+as\s+asn[\s\S]*?asn\.account_id\s*=\s*p_account_id[\s\S]*?asn\.shipping_id\s*=\s*p_shipping_id[\s\S]*?asn\.id\s*=\s*p_asn_id[\s\S]*?for\s+update/i,
    );

    assert.doesNotMatch(
      fn,
      /\bwarehouse_shippings\b|\bwarehouse_shipping_carriers\b/i,
    );
  },
);

test(
  "acknowledge_asn yalnız sent ASN durumunu kabul eder",
  () => {
    assert.match(
      fn,
      /v_asn\.status\s*<>\s*'sent'/i,
    );

    assert.match(
      fn,
      /Yalnızca gönderilmiş ASN için alındı onayı verilebilir\./,
    );
  },
);

test(
  "acknowledge_asn Shipping parent lookup lock veya status gate eklemez",
  () => {
    assert.doesNotMatch(
      fn,
      /\bwarehouse_shippings\b|\bv_shipping\b/i,
    );
  },
);

test(
  "acknowledge_asn carrier manifest package service-level vehicle dock prerequisite eklemez",
  () => {
    for (const table of [
      "warehouse_shipping_carriers",
      "warehouse_shipping_manifests",
      "warehouse_shipping_packages",
      "warehouse_shipping_service_levels",
      "warehouse_shipping_vehicles",
      "warehouse_shipping_docks",
    ]) {
      assert.doesNotMatch(
        fn,
        new RegExp(
          String.raw`\b${table}\b`,
          "i",
        ),
      );
    }
  },
);

test(
  "acknowledge_asn ASN kaydını acknowledged durumuna tek server timestamp ile taşır",
  () => {
    assert.equal(
      [
        ...fn.matchAll(
          /\bclock_timestamp\s*\(\s*\)/gi,
        ),
      ].length,
      1,
    );

    assert.match(
      fn,
      /update\s+public\.warehouse_shipping_asns[\s\S]*?status\s*=\s*'acknowledged'[\s\S]*?acknowledged_at\s*=\s*v_now[\s\S]*?updated_at\s*=\s*v_now/i,
    );
  },
);

test(
  "acknowledge_asn CAS update account shipping id ve sent durumuna bağlıdır",
  () => {
    assert.match(
      fn,
      /update\s+public\.warehouse_shipping_asns[\s\S]*?where[\s\S]*?account_id\s*=\s*p_account_id[\s\S]*?shipping_id\s*=\s*p_shipping_id[\s\S]*?id\s*=\s*p_asn_id[\s\S]*?status\s*=\s*'sent'[\s\S]*?returning\s+\*[\s\S]*?into\s+v_asn/i,
    );

    assert.doesNotMatch(
      fn,
      /ASN gönderim sırasında güncellenemedi\./,
    );
  },
);

test(
  "acknowledge_asn acknowledgedBy generatedBy veya sentBy persistence alanı eklemez",
  () => {
    assert.doesNotMatch(
      fn,
      /\backnowledged_by\b|\backnowledgedBy\b|\bgenerated_by\b|\bgeneratedBy\b|\bsent_by\b|\bsentBy\b/i,
    );
  },
);

test(
  "acknowledge_asn mutation surface yalnız Shipping ledger ve ASN tablolarıdır",
  () => {
    const mutated = new Set();

    for (const regex of [
      /\binsert\s+into\s+public\.([a-z0-9_]+)/gi,
      /\bupdate\s+public\.([a-z0-9_]+)/gi,
      /\bdelete\s+from\s+public\.([a-z0-9_]+)/gi,
    ]) {
      for (const match of fn.matchAll(regex)) {
        mutated.add(match[1]);
      }
    }

    assert.deepEqual(
      [...mutated].sort(),
      [
        "warehouse_shipping_asns",
        "warehouse_shipping_write_requests",
      ],
    );
  },
);

test(
  "acknowledge_asn downstream Packing Picking ve inventory mutation yapmaz",
  () => {
    for (const table of [
      "warehouse_shippings",
      "warehouse_shipping_items",
      "warehouse_shipping_packages",
      "warehouse_shipping_carriers",
      "warehouse_shipping_service_levels",
      "warehouse_shipping_manifests",
      "warehouse_shipping_vehicles",
      "warehouse_shipping_docks",
      "warehouse_shipping_tasks",
      "warehouse_shipping_tracking_events",
      "warehouse_shipping_pods",
      "warehouse_shipping_exceptions",
      "warehouse_packings",
      "warehouse_picking",
      "warehouse_inventory",
    ]) {
      assert.doesNotMatch(
        fn,
        new RegExp(
          String.raw`(?:insert\s+into|update|delete\s+from)\s+public\.${table}\b`,
          "i",
        ),
      );
    }
  },
);

test(
  "acknowledge_asn stable exact 23-key response ve completed ledger sonucu saklar",
  () => {
    assert.deepEqual(
      extractStableResponseKeys(fn),
      [
        "ok",
        "action",
        "requestId",
        "shippingId",
        "asnId",
        "asnNumber",
        "status",
        "senderCode",
        "receiverCode",
        "plannedDispatchAt",
        "expectedDeliveryAt",
        "packageCount",
        "lines",
        "format",
        "content",
        "generatedAt",
        "sentAt",
        "acknowledgedAt",
        "rejectionReason",
        "notes",
        "createdBy",
        "createdAt",
        "updatedAt",
      ],
    );

    assert.match(
      fn,
      /update\s+public\.warehouse_shipping_write_requests[\s\S]*?response_payload\s*=\s*v_result[\s\S]*?completed_at\s*=\s*v_now[\s\S]*?request_id\s*=\s*p_request_id/i,
    );
  },
);

test(
  "acknowledge_asn SECURITY DEFINER explicit search_path authenticated-only ACL kullanır",
  () => {
    assert.match(
      migration,
      /warehouse_shipping_acknowledge_asn_write[\s\S]*?security\s+definer[\s\S]*?set\s+search_path\s*=\s*public\s*,\s*pg_temp/i,
    );

    for (const principal of [
      "public",
      "anon",
      "authenticated",
    ]) {
      assert.match(
        migration,
        new RegExp(
          String.raw`revoke\s+all[\s\S]*?warehouse_shipping_acknowledge_asn_write[\s\S]*?from\s+${principal}\s*;`,
          "i",
        ),
      );
    }

    assert.match(
      migration,
      /grant\s+execute[\s\S]*?warehouse_shipping_acknowledge_asn_write[\s\S]*?to\s+authenticated\s*;/i,
    );

    assert.doesNotMatch(
      migration,
      /service_role/i,
    );
  },
);

test(
  "ShippingAsnService acknowledge ve ASN type persistence source parity korunur",
  () => {
    const methodMatch =
      /async\s+acknowledge\s*\([\s\S]*?async\s+reject\s*\(/i.exec(
        asnService,
      );

    assert.ok(methodMatch);

    const method = methodMatch[0];

    assert.match(
      method,
      /this\.get\s*\(\s*input\.tenantId\s*,\s*input\.shippingId\s*,\s*input\.asnId\s*,?\s*\)/i,
    );

    assert.match(
      method,
      /asn\.status\s*!==\s*"sent"/,
    );

    assert.match(
      method,
      /status:\s*"acknowledged"/,
    );

    assert.match(
      method,
      /acknowledgedAt:\s*timestamp/,
    );

    assert.match(
      method,
      /updatedAt:\s*timestamp/,
    );

    assert.equal(
      [
        ...method.matchAll(
          /this\.now\s*\(\s*\)/g,
        ),
      ].length,
      1,
    );

    assert.match(
      asnTypes,
      /readonly\s+acknowledgedAt\?\s*:\s*string/,
    );

    assert.match(
      persistence,
      /create\s+table\s+if\s+not\s+exists\s+public\.warehouse_shipping_asns\s*\([\s\S]*?\backnowledged_at\s+timestamptz\b/i,
    );

    assert.doesNotMatch(
      persistence,
      /create\s+table\s+if\s+not\s+exists\s+public\.warehouse_shipping_asns\s*\([\s\S]*?\backnowledged_by\b[\s\S]*?^\s*\);/im,
    );
  },
);
