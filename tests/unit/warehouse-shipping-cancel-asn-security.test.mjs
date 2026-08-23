import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260822165000_warehouse_shipping_cancel_asn_write.sql";
const shippingServicePath =
  "src/warehouse/services/ShippingService.ts";
const asnServicePath =
  "src/warehouse/services/ShippingAsnService.ts";
const asnTypePath =
  "src/warehouse/types/ShippingAsn.ts";
const persistencePath =
  "supabase/migrations/20260819231500_warehouse_shipping_persistence.sql";

const sql = readFileSync(migrationPath, "utf8");
const shippingService = readFileSync(shippingServicePath, "utf8");
const asnService = readFileSync(asnServicePath, "utf8");
const asnTypes = readFileSync(asnTypePath, "utf8");
const persistence = readFileSync(persistencePath, "utf8");

function compact(value) {
  return value.replace(/\s+/g, " ").trim();
}

function extractFunction(source, functionName) {
  const header =
    new RegExp(
      String.raw`create\s+or\s+replace\s+function\s+public\.${functionName}\s*\(`,
      "i",
    ).exec(source);

  assert.ok(header);

  const tail = source.slice(header.index);
  const opener = /\bas\s+(\$[A-Za-z0-9_]*\$)/i.exec(tail);

  assert.ok(opener);

  const tag = opener[1];
  const close =
    tail.indexOf(
      tag,
      opener.index + opener[0].length,
    );

  assert.ok(close >= 0);

  return tail.slice(
    0,
    close + tag.length,
  );
}

function ledgerActions(source) {
  const matches = [
    ...source.matchAll(
      /constraint\s+warehouse_shipping_write_requests_action_check\s+check\s*\(\s*action\s+in\s*\(([\s\S]*?)\)\s*\)/gi,
    ),
  ];

  assert.ok(matches.length > 0);

  return [
    ...matches.at(-1)[1].matchAll(/'([^']+)'/g),
  ].map((match) => match[1]);
}

function resultKeys(source) {
  const result =
    /v_result\s*:=\s*jsonb_build_object\s*\(([\s\S]*?)\)\s*;/i.exec(
      source,
    );

  assert.ok(result);

  return [
    ...result[1].matchAll(/'([^']+)'\s*,/g),
  ].map((match) => match[1]);
}

function mutationTables(source) {
  return [
    ...new Set(
      [
        ...source.matchAll(
          /\b(?:insert\s+into|update|delete\s+from)\s+(?:public\.)?([a-z0-9_]+)/gi,
        ),
      ].map((match) => match[1]),
    ),
  ].sort();
}

const fn =
  extractFunction(
    sql,
    "warehouse_shipping_cancel_asn_write",
  );

test(
  "cancel_asn ledger action allowlist exact on beş action içerir",
  () => {
    assert.deepEqual(
      ledgerActions(sql),
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
        "cancel_asn",
      ],
    );
  },
);

test(
  "cancel_asn RPC exact dört UUID ve bir text parametre taşır",
  () => {
    const signature =
      /create\s+or\s+replace\s+function\s+public\.warehouse_shipping_cancel_asn_write\s*\(([\s\S]*?)\)\s*returns\s+jsonb/i.exec(
        sql,
      );

    assert.ok(signature);

    const params = [
      ...signature[1].matchAll(
        /\b(p_[a-z0-9_]+)\s+(uuid|text)\b/gi,
      ),
    ].map((match) => [
      match[1],
      match[2].toLowerCase(),
    ]);

    assert.deepEqual(
      params,
      [
        ["p_request_id", "uuid"],
        ["p_account_id", "uuid"],
        ["p_shipping_id", "uuid"],
        ["p_asn_id", "uuid"],
        ["p_cancellation_reason", "text"],
      ],
    );
  },
);

test(
  "cancel_asn caller auth.uid ve exact yedi account rolü ile korunur",
  () => {
    assert.match(fn, /\bauth\.uid\s*\(\s*\)/i);

    const roleMatch =
      /warehouse_has_account_role\s*\(\s*p_account_id\s*,\s*array\s*\[([\s\S]*?)\]\s*::text\[\]\s*\)/i.exec(
        fn,
      );

    assert.ok(roleMatch);

    assert.deepEqual(
      [
        ...roleMatch[1].matchAll(/'([^']+)'/g),
      ].map((match) => match[1]),
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
  "cancel_asn required UUID girdilerini fail closed doğrular",
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
  "cancel_asn cancellation reason optional trim edilir ve boş değer null olur",
  () => {
    assert.match(
      fn,
      /v_cancellation_reason\s*:=\s*nullif\s*\(\s*btrim\s*\(\s*coalesce\s*\(\s*p_cancellation_reason\s*,\s*''\s*\)\s*\)\s*,\s*''\s*\)\s*;/i,
    );

    assert.doesNotMatch(
      fn,
      /if\s+v_cancellation_reason\s*=\s*''/i,
    );

    assert.doesNotMatch(
      fn,
      /ASN ret nedeni boş bırakılamaz\./,
    );
  },
);

test(
  "cancel_asn canonical payload exact shippingId asnId cancellationReason bağlar",
  () => {
    const payload =
      /v_payload\s*:=\s*jsonb_build_object\s*\(([\s\S]*?)\)\s*;/i.exec(
        fn,
      );

    assert.ok(payload);

    assert.deepEqual(
      [
        ...payload[1].matchAll(/'([^']+)'\s*,/g),
      ].map((match) => match[1]),
      [
        "shippingId",
        "asnId",
        "cancellationReason",
      ],
    );

    assert.match(
      payload[1],
      /'cancellationReason'\s*,\s*v_cancellation_reason/i,
    );
  },
);

test(
  "cancel_asn idempotency replay collision ve in-flight ayrımını korur",
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
  },
);

test(
  "cancel_asn hedef ASN account shipping id ile FOR UPDATE kilitlenir ve sole domain lock kalır",
  () => {
    assert.match(
      compact(fn),
      /select asn\.\* into v_asn from public\.warehouse_shipping_asns as asn where asn\.account_id = p_account_id and asn\.shipping_id = p_shipping_id and asn\.id = p_asn_id for update;/i,
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
      ]
    ) {
      assert.doesNotMatch(
        fn,
        new RegExp(
          String.raw`from\s+public\.${table}\b[\s\S]{0,350}?\bfor\s+update\b`,
          "i",
        ),
      );
    }
  },
);

test(
  "cancel_asn acknowledged ve cancelled ASN durumlarını exact blocked status yapar",
  () => {
    assert.match(
      compact(fn),
      /if \( v_asn\.status = 'acknowledged' or v_asn\.status = 'cancelled' \) then/i,
    );
  },
);

test(
  "cancel_asn exact blocked-status hata mesajını korur",
  () => {
    assert.ok(
      fn.includes(
        "Alındı onayı verilmiş veya iptal edilmiş ASN doğrudan iptal edilemez.",
      ),
    );
  },
);

test(
  "cancel_asn draft generated sent rejected için ek gate ve Shipping parent gate eklemez",
  () => {
    for (
      const status of [
        "draft",
        "generated",
        "sent",
        "rejected",
      ]
    ) {
      assert.doesNotMatch(
        fn,
        new RegExp(
          String.raw`v_asn\.status\s*<>\s*'${status}'`,
          "i",
        ),
      );
    }

    assert.doesNotMatch(
      fn,
      /\bfrom\s+public\.warehouse_shippings\b/i,
    );
  },
);

test(
  "cancel_asn existing notes ve cancellation reason normalize edilip newline ile birleştirilir",
  () => {
    assert.match(
      fn,
      /v_existing_notes\s*:=\s*nullif\s*\(\s*btrim\s*\(\s*coalesce\s*\(\s*v_asn\.notes\s*,\s*''\s*\)\s*\)\s*,\s*''\s*\)\s*;/i,
    );

    assert.match(
      fn,
      /concat_ws\s*\(\s*E'\\n'\s*,\s*v_existing_notes\s*,[\s\S]*?'İptal nedeni: '\s*\|\|\s*v_cancellation_reason/i,
    );
  },
);

test(
  "cancel_asn empty composed notes mevcut persisted notes değerini korur",
  () => {
    const update =
      /update\s+public\.warehouse_shipping_asns\s+set([\s\S]*?)where\s+account_id\s*=\s*p_account_id/i.exec(
        fn,
      );

    assert.ok(update);

    assert.match(
      update[1],
      /notes\s*=\s*coalesce\s*\(\s*v_notes\s*,\s*notes\s*\)/i,
    );
  },
);

test(
  "cancel_asn ASN cancelled notes ve exact tek server timestamp mutation yapar",
  () => {
    const update =
      /update\s+public\.warehouse_shipping_asns\s+set([\s\S]*?)where\s+account_id\s*=\s*p_account_id/i.exec(
        fn,
      );

    assert.ok(update);

    assert.equal(
      compact(update[1]),
      "status = 'cancelled', notes = coalesce( v_notes, notes ), updated_at = v_now",
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
  "cancel_asn CAS account shipping id ve acknowledged cancelled NOT IN kullanır",
  () => {
    const update =
      /update\s+public\.warehouse_shipping_asns[\s\S]*?where([\s\S]*?)returning\s+\*\s+into\s+v_asn/i.exec(
        fn,
      );

    assert.ok(update);

    const whereBody = compact(update[1]);

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
      /status not in \( 'acknowledged', 'cancelled' \)/i,
    );
  },
);

test(
  "cancel_asn unrelated ASN lifecycle alanlarını mutation yapmaz",
  () => {
    const update =
      /update\s+public\.warehouse_shipping_asns\s+set([\s\S]*?)where\s+account_id\s*=\s*p_account_id/i.exec(
        fn,
      );

    assert.ok(update);

    for (
      const field of [
        "cancelled_at",
        "cancelled_by",
        "cancellation_reason",
        "acknowledged_at",
        "sent_at",
        "generated_at",
        "rejection_reason",
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
  "cancel_asn mutation surface yalnız Shipping ledger ve ASN tablolarıdır",
  () => {
    assert.deepEqual(
      mutationTables(fn),
      [
        "warehouse_shipping_asns",
        "warehouse_shipping_write_requests",
      ],
    );
  },
);

test(
  "cancel_asn stable exact 23-key response ve completed ledger sonucu saklar",
  () => {
    assert.deepEqual(
      resultKeys(fn),
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
      /response_payload\s*=\s*v_result/i,
    );

    assert.match(
      fn,
      /completed_at\s*=\s*v_now/i,
    );
  },
);

test(
  "cancel_asn SECURITY DEFINER explicit search_path authenticated-only ACL kullanır",
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
      String.raw`public\.warehouse_shipping_cancel_asn_write\s*\(\s*uuid\s*,\s*uuid\s*,\s*uuid\s*,\s*uuid\s*,\s*text\s*\)`;

    for (
      const pattern of [
        String.raw`revoke\s+all\s+on\s+function\s+${sig}\s+from\s+public`,
        String.raw`revoke\s+all\s+on\s+function\s+${sig}\s+from\s+anon`,
        String.raw`revoke\s+all\s+on\s+function\s+${sig}\s+from\s+authenticated`,
        String.raw`grant\s+execute\s+on\s+function\s+${sig}\s+to\s+authenticated`,
      ]
    ) {
      assert.match(
        sql,
        new RegExp(
          pattern,
          "i",
        ),
      );
    }

    assert.doesNotMatch(
      sql,
      /\bservice_role\b/i,
    );
  },
);

test(
  "ShippingAsnService cancel input method ASN type ve persistence source parity korunur",
  () => {
    assert.match(
      asnService,
      /export\s+interface\s+CancelShippingAsnInput\s*\{[\s\S]*?tenantId\s*:\s*string\s*;[\s\S]*?shippingId\s*:\s*string\s*;[\s\S]*?asnId\s*:\s*string\s*;[\s\S]*?cancellationReason\?\s*:\s*string\s*;[\s\S]*?\}/,
    );

    assert.match(
      asnService,
      /async\s+cancel\s*\([\s\S]*?asn\.status\s*===\s*"acknowledged"[\s\S]*?asn\.status\s*===\s*"cancelled"[\s\S]*?"Alındı onayı verilmiş veya iptal edilmiş ASN doğrudan iptal edilemez\."[\s\S]*?input\.cancellationReason[\s\S]*?\?\.trim\s*\(\s*\)[\s\S]*?asn\.notes\?\.trim\s*\(\s*\)[\s\S]*?`İptal nedeni: \$\{cancellationReason\}`[\s\S]*?\.join\s*\(\s*"\\n"\s*\)[\s\S]*?status\s*:\s*"cancelled"[\s\S]*?updatedAt\s*:\s*this\.now\s*\(\s*\)/,
    );

    assert.doesNotMatch(
      shippingService,
      /\bcancelAsn\s*\(/,
    );

    assert.match(
      asnTypes,
      /"cancelled"/,
    );

    const asnTable =
      /create\s+table\s+if\s+not\s+exists\s+public\.warehouse_shipping_asns\s*\(([\s\S]*?)^\s*\);/im.exec(
        persistence,
      );

    assert.ok(asnTable);

    assert.match(
      asnTable[1],
      /\bnotes\s+text\b/i,
    );

    assert.match(
      asnTable[1],
      /\bupdated_at\s+timestamptz\b/i,
    );

    for (
      const forbidden of [
        "cancelled_at",
        "cancelled_by",
        "cancellation_reason",
      ]
    ) {
      assert.doesNotMatch(
        asnTable[1],
        new RegExp(
          String.raw`\b${forbidden}\b`,
          "i",
        ),
      );
    }
  },
);
