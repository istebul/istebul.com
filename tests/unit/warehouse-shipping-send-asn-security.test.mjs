import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration =
  fs.readFileSync(
    "supabase/migrations/20260822163500_warehouse_shipping_send_asn_write.sql",
    "utf8",
  );

const shippingService =
  fs.readFileSync(
    "src/warehouse/services/ShippingService.ts",
    "utf8",
  );

const asnService =
  fs.readFileSync(
    "src/warehouse/services/ShippingAsnService.ts",
    "utf8",
  );

function extractSendFunction() {
  const header =
    migration.match(
      /create\s+or\s+replace\s+function\s+public\.warehouse_shipping_send_asn_write\s*\(/i,
    );

  assert.ok(header);

  const rest =
    migration.slice(header.index);

  const opener =
    rest.match(
      /\bas\s+(\$[A-Za-z0-9_]*\$)/i,
    );

  assert.ok(opener);

  const tag =
    opener[1];

  const close =
    rest.indexOf(
      tag,
      opener.index +
        opener[0].length,
    );

  assert.ok(close >= 0);

  return rest.slice(
    0,
    close + tag.length,
  );
}

const sendFunction =
  extractSendFunction();

function domainPosition(pattern) {
  const match =
    pattern.exec(sendFunction);

  assert.ok(match);

  return match.index;
}

test(
  "send_asn ledger action allowlist exact on iki action içerir",
  () => {
    const matches = [
      ...migration.matchAll(
        /constraint\s+warehouse_shipping_write_requests_action_check\s+check\s*\(\s*action\s+in\s*\(([\s\S]*?)\)\s*\)/gi,
      ),
    ];

    assert.ok(matches.length > 0);

    const actions = [
      ...matches.at(-1)[1].matchAll(
        /'([^']+)'/g,
      ),
    ].map(
      (match) => match[1],
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
        "create_asn",
        "generate_asn",
        "send_asn",
      ],
    );
  },
);

test(
  "send_asn RPC exact dört UUID parametre taşır",
  () => {
    assert.match(
      migration,
      /warehouse_shipping_send_asn_write\s*\(\s*p_request_id\s+uuid\s*,\s*p_account_id\s+uuid\s*,\s*p_shipping_id\s+uuid\s*,\s*p_asn_id\s+uuid\s*\)/i,
    );

    const signature =
      sendFunction.slice(
        0,
        sendFunction.indexOf(
          "returns jsonb",
        ),
      );

    assert.doesNotMatch(
      signature,
      /\bp_generated_by\b|\bp_sent_by\b|\btext\b/i,
    );
  },
);

test(
  "send_asn caller auth.uid ve exact yedi account rolü ile korunur",
  () => {
    assert.match(
      sendFunction,
      /auth\.uid\s*\(\s*\)/i,
    );

    for (
      const role of [
        "owner",
        "admin",
        "warehouse_manager",
        "supervisor",
        "inventory_controller",
        "picker",
        "operator",
      ]
    ) {
      assert.match(
        sendFunction,
        new RegExp(
          `'${role}'`,
          "i",
        ),
      );
    }

    assert.doesNotMatch(
      sendFunction,
      /service_role/i,
    );
  },
);

test(
  "send_asn required UUID girdilerini fail closed doğrular",
  () => {
    for (
      const parameter of [
        "p_request_id",
        "p_account_id",
        "p_shipping_id",
        "p_asn_id",
      ]
    ) {
      assert.match(
        sendFunction,
        new RegExp(
          `${parameter}\\s+is\\s+null`,
          "i",
        ),
      );
    }
  },
);

test(
  "send_asn canonical idempotency payload yalnız shippingId ve asnId bağlar",
  () => {
    const payload =
      sendFunction.match(
        /v_payload\s*:=\s*jsonb_build_object\s*\(([\s\S]*?)\)\s*;/i,
      );

    assert.ok(payload);

    assert.match(
      payload[1],
      /'shippingId'\s*,\s*p_shipping_id/i,
    );

    assert.match(
      payload[1],
      /'asnId'\s*,\s*p_asn_id/i,
    );

    assert.doesNotMatch(
      payload[1],
      /generatedBy|sentBy|carrierId/i,
    );
  },
);

test(
  "send_asn idempotency replay collision ve in-flight ayrımını korur",
  () => {
    assert.match(
      migration,
      /Aynı istek kimliği farklı bir sevkiyat işlemi için kullanılamaz\./,
    );

    assert.match(
      migration,
      /Aynı sevkiyat isteği halen işleniyor\. Tekrar deneyin\./,
    );

    assert.match(
      sendFunction,
      /'send_asn'/,
    );
  },
);

test(
  "send_asn lock order Shipping sonra ASN ve carrier read şeklindedir",
  () => {
    const shippingPos =
      domainPosition(
        /select\s+shipping\.\*[\s\S]*?from\s+public\.warehouse_shippings\s+as\s+shipping[\s\S]*?for\s+update\s*;/i,
      );

    const asnPos =
      domainPosition(
        /select\s+asn\.\*[\s\S]*?from\s+public\.warehouse_shipping_asns\s+as\s+asn[\s\S]*?for\s+update\s*;/i,
      );

    const carrierPos =
      domainPosition(
        /select\s+carrier\.id\s*,\s*carrier\.active\s*,\s*carrier\.asn_supported[\s\S]*?from\s+public\.warehouse_shipping_carriers\s+as\s+carrier/i,
      );

    assert.ok(
      shippingPos < asnPos,
    );

    assert.ok(
      asnPos < carrierPos,
    );

    const carrierRegion =
      sendFunction.slice(
        carrierPos,
        sendFunction.indexOf(
          "v_now :=",
          carrierPos,
        ),
      );

    assert.doesNotMatch(
      carrierRegion,
      /for\s+update/i,
    );
  },
);

test(
  "send_asn hedef ASN account shipping id ile FOR UPDATE kilitlenir",
  () => {
    assert.match(
      sendFunction,
      /select\s+asn\.\*[\s\S]*?from\s+public\.warehouse_shipping_asns\s+as\s+asn[\s\S]*?asn\.account_id\s*=\s*p_account_id[\s\S]*?asn\.shipping_id\s*=\s*p_shipping_id[\s\S]*?asn\.id\s*=\s*p_asn_id[\s\S]*?for\s+update/i,
    );
  },
);

test(
  "send_asn yalnız generated ASN durumunu kabul eder",
  () => {
    assert.match(
      sendFunction,
      /v_asn\.status\s*<>\s*'generated'/i,
    );

    assert.match(
      sendFunction,
      /Yalnızca oluşturulmuş ASN gönderilebilir\./,
    );
  },
);

test(
  "send_asn Shipping varlığını doğrular ve outer Shipping status gate eklemez",
  () => {
    assert.match(
      sendFunction,
      /select\s+shipping\.\*[\s\S]*?from\s+public\.warehouse_shippings/i,
    );

    assert.match(
      sendFunction,
      /Sevkiyat kaydı bulunamadı:/,
    );

    assert.doesNotMatch(
      sendFunction,
      /v_shipping\.status/i,
    );
  },
);

test(
  "send_asn Shipping carrier_id zorunluluğunu korur",
  () => {
    assert.match(
      sendFunction,
      /v_shipping\.carrier_id\s+is\s+null/i,
    );

    assert.match(
      sendFunction,
      /ASN gönderimi için taşıyıcı atanmalıdır\./,
    );
  },
);

test(
  "send_asn carrier account ve id ile read only doğrulanır",
  () => {
    assert.match(
      sendFunction,
      /from\s+public\.warehouse_shipping_carriers\s+as\s+carrier[\s\S]*?carrier\.account_id\s*=\s*p_account_id[\s\S]*?carrier\.id\s*=\s*v_shipping\.carrier_id/i,
    );
  },
);

test(
  "send_asn pasif taşıyıcıyı reddeder",
  () => {
    assert.match(
      sendFunction,
      /if\s+not\s+v_carrier\.active\s+then/i,
    );

    assert.match(
      sendFunction,
      /Pasif taşıyıcıya ASN gönderilemez\./,
    );
  },
);

test(
  "send_asn ASN desteklemeyen taşıyıcıyı reddeder",
  () => {
    assert.match(
      sendFunction,
      /if\s+not\s+v_carrier\.asn_supported\s+then/i,
    );

    assert.match(
      sendFunction,
      /Seçilen taşıyıcı ASN gönderimini desteklemiyor\./,
    );
  },
);

test(
  "send_asn manifest package service-level vehicle dock prerequisite eklemez",
  () => {
    for (
      const table of [
        "warehouse_shipping_manifests",
        "warehouse_shipping_packages",
        "warehouse_shipping_service_levels",
        "warehouse_shipping_vehicles",
        "warehouse_shipping_docks",
        "warehouse_shipping_tasks",
      ]
    ) {
      assert.doesNotMatch(
        sendFunction,
        new RegExp(
          `public\\.${table}\\b`,
          "i",
        ),
      );
    }
  },
);

test(
  "send_asn ASN kaydını sent durumuna tek server timestamp ile taşır",
  () => {
    assert.equal(
      (
        sendFunction.match(
          /v_now\s*:=\s*clock_timestamp\s*\(\s*\)\s*;/gi,
        ) ?? []
      ).length,
      1,
    );

    assert.match(
      sendFunction,
      /update\s+public\.warehouse_shipping_asns[\s\S]*?status\s*=\s*'sent'[\s\S]*?sent_at\s*=\s*v_now[\s\S]*?updated_at\s*=\s*v_now/i,
    );
  },
);

test(
  "send_asn sentBy veya generatedBy client persistence alanı eklemez",
  () => {
    assert.doesNotMatch(
      sendFunction,
      /sentBy|sent_by|p_sent_by|generatedBy|p_generated_by|v_generated_by/i,
    );
  },
);

test(
  "send_asn mutation surface yalnız Shipping ledger ve ASN tablolarıdır",
  () => {
    const mutated =
      new Set(
        [
          ...sendFunction.matchAll(
            /\b(?:insert\s+into|update|delete\s+from)\s+public\.([a-z0-9_]+)/gi,
          ),
        ].map(
          (match) => match[1],
        ),
      );

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
  "send_asn Shipping carrier downstream tablolarını mutation yapmaz",
  () => {
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
        "warehouse_shipping_pods",
        "warehouse_shipping_exceptions",
      ]
    ) {
      assert.doesNotMatch(
        sendFunction,
        new RegExp(
          `\\b(?:insert\\s+into|update|delete\\s+from)\\s+public\\.${table}\\b`,
          "i",
        ),
      );
    }
  },
);

test(
  "send_asn stable sent response ve ledger completed sonucu saklar",
  () => {
    const responseIndex =
      sendFunction.indexOf(
        "v_result :=",
      );

    assert.ok(responseIndex >= 0);

    const response =
      sendFunction.slice(
        responseIndex,
      );

    const keys = [
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
    ];

    let cursor = -1;

    for (const key of keys) {
      const next =
        response.indexOf(
          `'${key}'`,
          cursor + 1,
        );

      assert.ok(
        next > cursor,
        `response key order: ${key}`,
      );

      cursor = next;
    }

    assert.match(
      response,
      /response_payload\s*=\s*v_result/i,
    );

    assert.match(
      response,
      /completed_at\s*=\s*v_now/i,
    );
  },
);

test(
  "send_asn SECURITY DEFINER explicit search_path authenticated-only ACL kullanır",
  () => {
    assert.match(
      sendFunction,
      /security\s+definer/i,
    );

    assert.match(
      sendFunction,
      /set\s+search_path\s*=\s*public\s*,\s*pg_temp/i,
    );

    for (
      const principal of [
        "public",
        "anon",
        "authenticated",
      ]
    ) {
      assert.match(
        migration,
        new RegExp(
          `revoke\\s+all\\s+on\\s+function\\s+public\\.warehouse_shipping_send_asn_write\\s*\\(\\s*uuid\\s*,\\s*uuid\\s*,\\s*uuid\\s*,\\s*uuid\\s*\\)\\s+from\\s+${principal}`,
          "i",
        ),
      );
    }

    assert.match(
      migration,
      /grant\s+execute\s+on\s+function\s+public\.warehouse_shipping_send_asn_write\s*\(\s*uuid\s*,\s*uuid\s*,\s*uuid\s*,\s*uuid\s*\)\s+to\s+authenticated/i,
    );

    assert.doesNotMatch(
      migration,
      /grant\s+execute[\s\S]*?service_role/i,
    );
  },
);

test(
  "ShippingService.sendAsn ve ShippingAsnService.send source parity korunur",
  () => {
    assert.match(
      shippingService,
      /async\s+sendAsn\s*\(\s*input:\s*\{[\s\S]*?tenantId:\s*string;[\s\S]*?shippingId:\s*string;[\s\S]*?asnId:\s*string;[\s\S]*?return\s+this\.asnService\.send\s*\(\s*\{[\s\S]*?tenantId:\s*input\.tenantId[\s\S]*?shippingId:\s*input\.shippingId[\s\S]*?asnId:\s*input\.asnId/i,
    );

    assert.match(
      asnService,
      /async\s+send\s*\([\s\S]*?asn\.status\s*!==\s*"generated"[\s\S]*?shipping\.carrierId\s*===\s*undefined[\s\S]*?!carrier\.active[\s\S]*?!carrier\.asnSupported[\s\S]*?status:\s*"sent"[\s\S]*?sentAt:\s*timestamp[\s\S]*?updatedAt:\s*timestamp/i,
    );
  },
);
