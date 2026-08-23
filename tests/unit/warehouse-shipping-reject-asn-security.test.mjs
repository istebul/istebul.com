import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260822164500_warehouse_shipping_reject_asn_write.sql";

const servicePath =
  "src/warehouse/services/ShippingAsnService.ts";

const typePath =
  "src/warehouse/types/ShippingAsn.ts";

const persistencePath =
  "supabase/migrations/20260819231500_warehouse_shipping_persistence.sql";

const sql =
  readFileSync(
    migrationPath,
    "utf8",
  );

const service =
  readFileSync(
    servicePath,
    "utf8",
  );

const types =
  readFileSync(
    typePath,
    "utf8",
  );

const persistence =
  readFileSync(
    persistencePath,
    "utf8",
  );

function compact(
  value,
) {
  return value
    .replace(/\s+/g, " ")
    .trim();
}

function extractFunction(
  source,
  functionName,
) {
  const header =
    new RegExp(
      String.raw`create\s+or\s+replace\s+function\s+public\.${functionName}\s*\(`,
      "i",
    ).exec(source);

  assert.ok(
    header,
    `${functionName} header bulunamadı.`,
  );

  const tail =
    source.slice(
      header.index,
    );

  const opener =
    /\bas\s+(\$[A-Za-z0-9_]*\$)/i.exec(
      tail,
    );

  assert.ok(
    opener,
  );

  const tag =
    opener[1];

  const close =
    tail.indexOf(
      tag,
      opener.index +
        opener[0].length,
    );

  assert.ok(
    close >= 0,
  );

  return tail.slice(
    0,
    close + tag.length,
  );
}

function extractLedgerActions(
  source,
) {
  const matches = [
    ...source.matchAll(
      /constraint\s+warehouse_shipping_write_requests_action_check\s+check\s*\(\s*action\s+in\s*\(([\s\S]*?)\)\s*\)/gi,
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
    (match) =>
      match[1],
  );
}

function extractResultKeys(
  source,
) {
  const result =
    /v_result\s*:=\s*jsonb_build_object\s*\(([\s\S]*?)\)\s*;/i.exec(
      source,
    );

  assert.ok(
    result,
  );

  return [
    ...result[1].matchAll(
      /'([^']+)'\s*,/g,
    ),
  ].map(
    (match) =>
      match[1],
  );
}

function mutationTables(
  source,
) {
  return [
    ...new Set(
      [
        ...source.matchAll(
          /\b(?:insert\s+into|update|delete\s+from)\s+(?:public\.)?([a-z0-9_]+)/gi,
        ),
      ].map(
        (match) =>
          match[1],
      ),
    ),
  ].sort();
}

const fn =
  extractFunction(
    sql,
    "warehouse_shipping_reject_asn_write",
  );

test(
  "reject_asn ledger action allowlist exact on dört action içerir",
  () => {
    assert.deepEqual(
      extractLedgerActions(
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
        "submit_manifest",
        "create_asn",
        "generate_asn",
        "send_asn",
        "acknowledge_asn",
        "reject_asn",
      ],
    );
  },
);

test(
  "reject_asn RPC exact dört UUID ve bir text parametre taşır",
  () => {
    const signature =
      /create\s+or\s+replace\s+function\s+public\.warehouse_shipping_reject_asn_write\s*\(([\s\S]*?)\)\s*returns\s+jsonb/i.exec(
        sql,
      );

    assert.ok(
      signature,
    );

    const params = [
      ...signature[1].matchAll(
        /\b(p_[a-z0-9_]+)\s+(uuid|text)\b/gi,
      ),
    ].map(
      (match) => [
        match[1],
        match[2].toLowerCase(),
      ],
    );

    assert.deepEqual(
      params,
      [
        ["p_request_id", "uuid"],
        ["p_account_id", "uuid"],
        ["p_shipping_id", "uuid"],
        ["p_asn_id", "uuid"],
        ["p_rejection_reason", "text"],
      ],
    );
  },
);

test(
  "reject_asn caller auth.uid ve exact yedi account rolü ile korunur",
  () => {
    assert.match(
      fn,
      /\bauth\.uid\s*\(\s*\)/i,
    );

    const roleMatch =
      /warehouse_has_account_role\s*\(\s*p_account_id\s*,\s*array\s*\[([\s\S]*?)\]\s*::text\[\]\s*\)/i.exec(
        fn,
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

    assert.ok(
      fn.includes(
        "Bu firma için ASN reddetme yetkiniz bulunmuyor.",
      ),
    );

    assert.equal(
      fn.includes(
        "Bu firma için ASN alındı onayı verme yetkiniz bulunmuyor.",
      ),
      false,
    );
  },
);

test(
  "reject_asn required UUID girdilerini fail closed doğrular",
  () => {
    for (
      const param of [
        "p_request_id",
        "p_account_id",
        "p_shipping_id",
        "p_asn_id",
      ]
    ) {
      assert.match(
        fn,
        new RegExp(
          String.raw`\b${param}\s+is\s+null\b`,
          "i",
        ),
      );
    }
  },
);

test(
  "reject_asn rejection reason trim edilir ve boş değer fail closed reddedilir",
  () => {
    assert.match(
      fn,
      /v_rejection_reason\s*:=\s*btrim\s*\(\s*coalesce\s*\(\s*p_rejection_reason\s*,\s*''\s*\)\s*\)\s*;/i,
    );

    assert.match(
      fn,
      /if\s+v_rejection_reason\s*=\s*''\s+then/i,
    );

    assert.ok(
      fn.includes(
        "ASN ret nedeni boş bırakılamaz.",
      ),
    );
  },
);

test(
  "reject_asn canonical payload exact shippingId asnId normalized rejectionReason bağlar",
  () => {
    const payload =
      /v_payload\s*:=\s*jsonb_build_object\s*\(([\s\S]*?)\)\s*;/i.exec(
        fn,
      );

    assert.ok(
      payload,
    );

    const keys = [
      ...payload[1].matchAll(
        /'([^']+)'\s*,/g,
      ),
    ].map(
      (match) =>
        match[1],
    );

    assert.deepEqual(
      keys,
      [
        "shippingId",
        "asnId",
        "rejectionReason",
      ],
    );

    assert.match(
      payload[1],
      /'shippingId'\s*,\s*p_shipping_id/i,
    );

    assert.match(
      payload[1],
      /'asnId'\s*,\s*p_asn_id/i,
    );

    assert.match(
      payload[1],
      /'rejectionReason'\s*,\s*v_rejection_reason/i,
    );
  },
);

test(
  "reject_asn idempotency replay collision ve in-flight ayrımını korur",
  () => {
    assert.ok(
      fn.includes(
        "Aynı istek kimliği farklı bir sevkiyat işlemi için kullanılamaz.",
      ),
    );

    assert.ok(
      fn.includes(
        "Aynı sevkiyat isteği halen işleniyor. Tekrar deneyin.",
      ),
    );

    assert.match(
      fn,
      /warehouse_shipping_write_requests/i,
    );
  },
);

test(
  "reject_asn hedef ASN account shipping id ile FOR UPDATE kilitlenir ve sole domain lock kalır",
  () => {
    const asnLock =
      /select\s+asn\.\*\s+into\s+v_asn\s+from\s+public\.warehouse_shipping_asns\s+as\s+asn\s+where\s+asn\.account_id\s*=\s*p_account_id\s+and\s+asn\.shipping_id\s*=\s*p_shipping_id\s+and\s+asn\.id\s*=\s*p_asn_id\s+for\s+update\s*;/i.exec(
        compact(
          fn,
        ),
      );

    assert.ok(
      asnLock,
    );

    const domainForUpdateTables = [
      ...fn.matchAll(
        /\bfrom\s+public\.(warehouse_shipping_[a-z0-9_]+)\b[\s\S]{0,700}?\bfor\s+update\b/gi,
      ),
    ]
      .map(
        (match) =>
          match[1],
      )
      .filter(
        (table) =>
          table !==
          "warehouse_shipping_write_requests",
      );

    assert.deepEqual(
      [
        ...new Set(
          domainForUpdateTables,
        ),
      ],
      [
        "warehouse_shipping_asns",
      ],
    );
  },
);

test(
  "reject_asn yalnız sent ASN durumunu kabul eder",
  () => {
    assert.match(
      compact(
        fn,
      ),
      /if v_asn\.status <> 'sent' then/i,
    );
  },
);

test(
  "reject_asn exact sent-only source doğrulama mesajını korur",
  () => {
    assert.ok(
      fn.includes(
        "Yalnızca gönderilmiş ASN reddedilebilir.",
      ),
    );
  },
);

test(
  "reject_asn Shipping parent lookup lock veya status gate eklemez",
  () => {
    assert.doesNotMatch(
      fn,
      /\bfrom\s+public\.warehouse_shippings\b/i,
    );

    assert.doesNotMatch(
      fn,
      /\bupdate\s+public\.warehouse_shippings\b/i,
    );
  },
);

test(
  "reject_asn carrier manifest package service-level vehicle dock prerequisite eklemez",
  () => {
    for (
      const table of [
        "warehouse_shipping_carriers",
        "warehouse_shipping_manifests",
        "warehouse_shipping_packages",
        "warehouse_shipping_service_levels",
        "warehouse_shipping_vehicles",
        "warehouse_shipping_docks",
      ]
    ) {
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
  "reject_asn ASN kaydını rejected reason ve tek server timestamp ile taşır",
  () => {
    const update =
      /update\s+public\.warehouse_shipping_asns\s+set([\s\S]*?)where\s+account_id\s*=\s*p_account_id/i.exec(
        fn,
      );

    assert.ok(
      update,
    );

    assert.equal(
      compact(
        update[1],
      ),
      "status = 'rejected', rejection_reason = v_rejection_reason, updated_at = v_now",
    );

    assert.equal(
      (
        fn.match(
          /\bclock_timestamp\s*\(\s*\)/gi,
        ) ?? []
      ).length,
      1,
    );
  },
);

test(
  "reject_asn CAS update account shipping id ve sent durumuna bağlıdır",
  () => {
    const update =
      /update\s+public\.warehouse_shipping_asns[\s\S]*?where([\s\S]*?)returning\s+\*\s+into\s+v_asn/i.exec(
        fn,
      );

    assert.ok(
      update,
    );

    const whereBody =
      compact(
        update[1],
      );

    assert.match(
      whereBody,
      /account_id = p_account_id/i,
    );

    assert.match(
      whereBody,
      /shipping_id = p_shipping_id/i,
    );

    assert.match(
      whereBody,
      /id = p_asn_id/i,
    );

    assert.match(
      whereBody,
      /status = 'sent'/i,
    );
  },
);

test(
  "reject_asn rejectedAt rejectedBy acknowledgedAt sentAt generatedAt createdBy mutation eklemez",
  () => {
    const update =
      /update\s+public\.warehouse_shipping_asns\s+set([\s\S]*?)where\s+account_id\s*=\s*p_account_id/i.exec(
        fn,
      );

    assert.ok(
      update,
    );

    for (
      const field of [
        "rejected_at",
        "rejected_by",
        "acknowledged_at",
        "sent_at",
        "generated_at",
        "created_by",
      ]
    ) {
      assert.doesNotMatch(
        update[1],
        new RegExp(
          String.raw`\b${field}\s*=`,
          "i",
        ),
      );
    }
  },
);

test(
  "reject_asn mutation surface yalnız Shipping ledger ve ASN tablolarıdır",
  () => {
    assert.deepEqual(
      mutationTables(
        fn,
      ),
      [
        "warehouse_shipping_asns",
        "warehouse_shipping_write_requests",
      ],
    );
  },
);

test(
  "reject_asn downstream Packing Picking ve inventory mutation yapmaz",
  () => {
    const mutated =
      mutationTables(
        fn,
      );

    for (
      const table of [
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
        "warehouse_shipping_delivery_proofs",
        "warehouse_shipping_exceptions",
        "warehouse_packings",
        "warehouse_pickings",
        "warehouse_inventory",
      ]
    ) {
      assert.equal(
        mutated.includes(
          table,
        ),
        false,
      );
    }
  },
);

test(
  "reject_asn stable exact 23-key response ve completed ledger sonucu saklar",
  () => {
    assert.deepEqual(
      extractResultKeys(
        fn,
      ),
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

    const completion =
      /update\s+public\.warehouse_shipping_write_requests\s+set([\s\S]*?)where\s+account_id\s*=\s*p_account_id[\s\S]*?request_id\s*=\s*p_request_id\s*;/i.exec(
        fn,
      );

    assert.ok(
      completion,
    );

    assert.match(
      completion[1],
      /response_payload\s*=\s*v_result/i,
    );

    assert.match(
      completion[1],
      /completed_at\s*=\s*v_now/i,
    );
  },
);

test(
  "reject_asn SECURITY DEFINER explicit search_path authenticated-only ACL kullanır",
  () => {
    assert.match(
      sql,
      /security\s+definer/i,
    );

    assert.match(
      sql,
      /set\s+search_path\s*=\s*public\s*,\s*pg_temp/i,
    );

    const sig =
      String.raw`public\.warehouse_shipping_reject_asn_write\s*\(\s*uuid\s*,\s*uuid\s*,\s*uuid\s*,\s*uuid\s*,\s*text\s*\)`;

    assert.match(
      sql,
      new RegExp(
        String.raw`revoke\s+all\s+on\s+function\s+${sig}\s+from\s+public`,
        "i",
      ),
    );

    assert.match(
      sql,
      new RegExp(
        String.raw`revoke\s+all\s+on\s+function\s+${sig}\s+from\s+anon`,
        "i",
      ),
    );

    assert.match(
      sql,
      new RegExp(
        String.raw`revoke\s+all\s+on\s+function\s+${sig}\s+from\s+authenticated`,
        "i",
      ),
    );

    assert.match(
      sql,
      new RegExp(
        String.raw`grant\s+execute\s+on\s+function\s+${sig}\s+to\s+authenticated`,
        "i",
      ),
    );

    assert.doesNotMatch(
      sql,
      /\bservice_role\b/i,
    );
  },
);

test(
  "ShippingAsnService reject local input requireText ve ASN persistence source parity korunur",
  () => {
    assert.match(
      service,
      /export\s+interface\s+RejectShippingAsnInput\s*\{[\s\S]*?tenantId\s*:\s*string\s*;[\s\S]*?shippingId\s*:\s*string\s*;[\s\S]*?asnId\s*:\s*string\s*;[\s\S]*?rejectionReason\s*:\s*string\s*;[\s\S]*?\}/,
    );

    assert.match(
      service,
      /function\s+requireText\s*\([\s\S]*?value\.trim\s*\(\s*\)[\s\S]*?return\s+normalized\s*;/,
    );

    assert.ok(
      service.includes(
        "`${fieldName} boş bırakılamaz.`",
      ),
    );

    assert.match(
      service,
      /async\s+reject\s*\([\s\S]*?asn\.status\s*!==\s*"sent"[\s\S]*?"Yalnızca gönderilmiş ASN reddedilebilir\."[\s\S]*?requireText\s*\([\s\S]*?input\.rejectionReason[\s\S]*?"ASN ret nedeni"[\s\S]*?status\s*:\s*"rejected"[\s\S]*?rejectionReason[\s\S]*?updatedAt\s*:\s*this\.now\s*\(\s*\)/,
    );

    assert.match(
      types,
      /readonly\s+rejectionReason\?\s*:\s*string\s*;/,
    );

    assert.match(
      persistence,
      /\brejection_reason\s+text\b/i,
    );

    assert.match(
      persistence,
      /\bupdated_at\s+timestamptz\b/i,
    );

    assert.doesNotMatch(
      persistence,
      /\brejected_at\b/i,
    );

    assert.doesNotMatch(
      persistence,
      /\brejected_by\b/i,
    );
  },
);
