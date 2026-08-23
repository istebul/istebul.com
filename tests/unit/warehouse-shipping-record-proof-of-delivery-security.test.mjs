import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

const migrationPath =
  process.env.POD_MIGRATION_PATH ??
  path.join(
    root,
    "supabase/migrations/20260822170000_warehouse_shipping_record_proof_of_delivery_write.sql",
  );

const migration =
  fs.readFileSync(
    migrationPath,
    "utf8",
  );

const shippingServicePath =
  path.join(
    root,
    "src/warehouse/services/ShippingService.ts",
  );

const validatorPath =
  path.join(
    root,
    "src/warehouse/services/ShippingValidator.ts",
  );

const podTypePath =
  path.join(
    root,
    "src/warehouse/types/ShippingProofOfDelivery.ts",
  );

const trackingServicePath =
  path.join(
    root,
    "src/warehouse/services/ShippingTrackingService.ts",
  );

const repositoryPath =
  path.join(
    root,
    "src/warehouse/services/ShippingRepository.ts",
  );

const supabaseRepositoryPath =
  path.join(
    root,
    "src/warehouse/services/SupabaseShippingRepository.ts",
  );

const inMemoryRepositoryPath =
  path.join(
    root,
    "src/warehouse/services/InMemoryShippingRepository.ts",
  );

const persistencePath =
  path.join(
    root,
    "supabase/migrations/20260819231500_warehouse_shipping_persistence.sql",
  );

const dispatchPath =
  path.join(
    root,
    "supabase/migrations/20260822165500_warehouse_shipping_dispatch_write.sql",
  );

const engineTestPath =
  path.join(
    root,
    "tests/unit/warehouse-shipping-engine.test.mjs",
  );

const shippingService =
  fs.readFileSync(
    shippingServicePath,
    "utf8",
  );

const validator =
  fs.readFileSync(
    validatorPath,
    "utf8",
  );

const podType =
  fs.readFileSync(
    podTypePath,
    "utf8",
  );

const trackingService =
  fs.readFileSync(
    trackingServicePath,
    "utf8",
  );

const persistence =
  fs.readFileSync(
    persistencePath,
    "utf8",
  );

const compact = (value) =>
  value
    .replace(/\s+/g, " ")
    .trim();

function sha256(fileName) {
  return crypto
    .createHash("sha256")
    .update(
      fs.readFileSync(fileName),
    )
    .digest("hex");
}

function functionSignature() {
  const match =
    migration.match(
      /public\.warehouse_shipping_record_proof_of_delivery_write\s*\(([\s\S]*?)\)\s*returns\s+jsonb/i,
    );

  assert.ok(
    match,
    "POD RPC signature bulunamadı.",
  );

  return match[1]
    .split(",")
    .map((item) =>
      compact(item),
    );
}

function objectKeys(variableName) {
  const expression =
    new RegExp(
      `${variableName}\\s*:=\\s*jsonb_build_object\\s*\\(([\\s\\S]*?)\\n\\s*\\);`,
      "i",
    );

  const match =
    migration.match(expression);

  assert.ok(
    match,
    `${variableName} jsonb object bulunamadı.`,
  );

  return [
    ...match[1].matchAll(
      /'([A-Za-z0-9_]+)'\s*,/g,
    ),
  ].map(
    (entry) => entry[1],
  );
}

function sqlStatement(startExpression) {
  const match =
    startExpression.exec(
      migration,
    );

  assert.ok(
    match,
    "SQL statement başlangıcı bulunamadı.",
  );

  const start =
    match.index;

  let quote = false;
  let depth = 0;

  for (
    let index = start;
    index < migration.length;
    index += 1
  ) {
    const char =
      migration[index];

    const next =
      migration[index + 1];

    if (
      char === "'" &&
      quote &&
      next === "'"
    ) {
      index += 1;
      continue;
    }

    if (char === "'") {
      quote =
        !quote;
      continue;
    }

    if (quote) {
      continue;
    }

    if (char === "(") {
      depth += 1;
      continue;
    }

    if (char === ")") {
      depth -= 1;
      continue;
    }

    if (
      char === ";" &&
      depth === 0
    ) {
      return migration.slice(
        start,
        index + 1,
      );
    }
  }

  assert.fail(
    "SQL statement sonu bulunamadı.",
  );
}

function insertBlock(tableName) {
  return sqlStatement(
    new RegExp(
      `insert\\s+into\\s+public\\.${tableName}\\b`,
      "i",
    ),
  );
}

function updateBlock(tableName) {
  return sqlStatement(
    new RegExp(
      `update\\s+public\\.${tableName}\\b`,
      "i",
    ),
  );
}

test(
  "01 POD ledger exact 17 actions",
  () => {
    const constraint =
      migration.match(
        /warehouse_shipping_write_requests_action_check[\s\S]*?check\s*\(\s*action\s+in\s*\(([\s\S]*?)\)\s*\)/i,
      );

    assert.ok(constraint);

    const actions = [
      ...constraint[1].matchAll(
        /'([a-z0-9_]+)'/g,
      ),
    ].map(
      (entry) => entry[1],
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
        "acknowledge_asn",
        "reject_asn",
        "cancel_asn",
        "dispatch",
        "record_proof_of_delivery",
      ],
    );
  },
);

test(
  "02 POD RPC exact fifteen parameter signature",
  () => {
    assert.deepEqual(
      functionSignature(),
      [
        "p_request_id uuid",
        "p_account_id uuid",
        "p_shipping_id uuid",
        "p_recipient_name text",
        "p_recipient_identity_number text",
        "p_recipient_phone text",
        "p_signature_url text",
        "p_photo_urls text[]",
        "p_document_urls text[]",
        "p_latitude numeric",
        "p_longitude numeric",
        "p_delivery_address text",
        "p_delivered_at timestamptz",
        "p_captured_by text",
        "p_notes text",
      ],
    );
  },
);

test(
  "03 POD auth uid exact seven Shipping roles",
  () => {
    assert.match(
      migration,
      /v_user_id\s+uuid\s*:=\s*auth\.uid\s*\(\s*\)/i,
    );

    const roleCall =
      migration.match(
        /warehouse_has_account_role\s*\(\s*p_account_id\s*,\s*array\s*\[([\s\S]*?)\]\s*::text\[\]/i,
      );

    assert.ok(roleCall);

    const roles = [
      ...roleCall[1].matchAll(
        /'([a-z_]+)'/g,
      ),
    ].map(
      (entry) => entry[1],
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
  "04 POD required UUID inputs fail closed",
  () => {
    for (
      const token of [
        "if p_request_id is null",
        "if p_account_id is null",
        "if p_shipping_id is null",
      ]
    ) {
      assert.ok(
        compact(migration)
          .toLowerCase()
          .includes(
            compact(token)
              .toLowerCase(),
          ),
      );
    }

    assert.match(
      migration,
      /İstek kimliği zorunludur\./,
    );

    assert.match(
      migration,
      /Firma kimliği zorunludur\./,
    );

    assert.match(
      migration,
      /Sevkiyat kimliği zorunludur\./,
    );
  },
);

test(
  "05 recipientName and capturedBy required canonical trim",
  () => {
    assert.match(
      migration,
      /v_recipient_name\s*:=\s*nullif\s*\(\s*btrim\s*\(\s*coalesce\s*\(\s*p_recipient_name/i,
    );

    assert.match(
      migration,
      /v_captured_by\s*:=\s*nullif\s*\(\s*btrim\s*\(\s*coalesce\s*\(\s*p_captured_by/i,
    );

    assert.match(
      migration,
      /Teslim alan kişi boş bırakılamaz\./,
    );

    assert.match(
      migration,
      /Teslimat kanıtını kaydeden kullanıcı boş bırakılamaz\./,
    );
  },
);

test(
  "06 optional POD text fields normalize with trim to null",
  () => {
    for (
      const name of [
        "p_recipient_identity_number",
        "p_recipient_phone",
        "p_signature_url",
        "p_delivery_address",
        "p_notes",
      ]
    ) {
      assert.match(
        migration,
        new RegExp(
          `nullif\\s*\\(\\s*btrim\\s*\\(\\s*coalesce\\s*\\(\\s*${name}`,
          "i",
        ),
      );
    }
  },
);

test(
  "07 recipientPhone mirrors source format validation",
  () => {
    assert.match(
      migration,
      /v_recipient_phone[\s\S]*?!~\s*'\^\\\+\?\[0-9\(\)\[:space:\]-\]\{7,25\}\$'/i,
    );

    assert.match(
      migration,
      /Telefon numarası geçerli biçimde olmalıdır\./,
    );

    assert.match(
      validator,
      /!\s*\/\^\\\+\?\[0-9\(\)\\s-\]\{7,25\}\$\//,
    );
  },
);

test(
  "08 signature URL requires HTTP or HTTPS",
  () => {
    assert.match(
      migration,
      /v_signature_url[\s\S]*?!~\*\s*'\^https\?:\/\//i,
    );

    assert.match(
      migration,
      /İmza dosyası adresi geçerli bir HTTP veya HTTPS adresi olmalıdır\./,
    );

    assert.match(
      validator,
      /parsed\.protocol\s*!==\s*"http:"[\s\S]*?parsed\.protocol\s*!==\s*"https:"/,
    );
  },
);

test(
  "09 photo and document arrays default trim and validate URLs",
  () => {
    assert.match(
      migration,
      /p_photo_urls[\s\S]*?'\{\}'::text\[\]/i,
    );

    assert.match(
      migration,
      /p_document_urls[\s\S]*?'\{\}'::text\[\]/i,
    );

    assert.match(
      migration,
      /array_agg\s*\(\s*btrim\(item\.value\)/i,
    );

    assert.match(
      migration,
      /Teslimat fotoğrafı adresi boş bırakılamaz\./,
    );

    assert.match(
      migration,
      /Teslimat belgesi adresi boş bırakılamaz\./,
    );

    assert.match(
      migration,
      /format\s*\(\s*'%s\. teslimat fotoğrafı adresi geçerli bir HTTP veya HTTPS adresi olmalıdır\.'\s*,\s*photo\.ordinality\s*\)/i,
    );

    assert.match(
      migration,
      /format\s*\(\s*'%s\. teslimat belgesi adresi geçerli bir HTTP veya HTTPS adresi olmalıdır\.'\s*,\s*document\.ordinality\s*\)/i,
    );

    assert.match(
      migration,
      /from unnest\(v_photo_urls\)\s+with ordinality\s+as photo\(url, ordinality\)/i,
    );

    assert.match(
      migration,
      /from unnest\(v_document_urls\)\s+with ordinality\s+as document\(url, ordinality\)/i,
    );
  },
);

test(
  "10 latitude longitude pair and bounds mirror validator",
  () => {
    assert.match(
      migration,
      /\(\s*p_latitude\s+is\s+null\s*\)\s*<>\s*\(\s*p_longitude\s+is\s+null\s*\)/i,
    );

    assert.match(
      migration,
      /p_latitude\s*<\s*-90[\s\S]*?p_latitude\s*>\s*90/i,
    );

    assert.match(
      migration,
      /p_longitude\s*<\s*-180[\s\S]*?p_longitude\s*>\s*180/i,
    );

    assert.match(
      migration,
      /Teslimat kanıtı için enlem ve boylam birlikte verilmelidir\./,
    );
  },
);

test(
  "11 POD evidence requires signature photo or document",
  () => {
    assert.match(
      migration,
      /v_signature_url\s+is\s+null[\s\S]*?cardinality\(v_photo_urls\)\s*=\s*0[\s\S]*?cardinality\(v_document_urls\)\s*=\s*0/i,
    );

    assert.match(
      migration,
      /Teslimat kanıtı için imza, fotoğraf veya belge bilgilerinden en az biri gereklidir\./,
    );

    assert.match(
      validator,
      /signatureUrl\s*===\s*undefined[\s\S]*?photoUrls\.length\s*===\s*0[\s\S]*?documentUrls\.length\s*===\s*0/,
    );
  },
);

test(
  "12 canonical payload exact normalized POD input keys",
  () => {
    assert.deepEqual(
      objectKeys(
        "v_payload",
      ),
      [
        "shippingId",
        "recipientName",
        "recipientIdentityNumber",
        "recipientPhone",
        "signatureUrl",
        "photoUrls",
        "documentUrls",
        "latitude",
        "longitude",
        "deliveryAddress",
        "deliveredAt",
        "capturedBy",
        "notes",
      ],
    );
  },
);

test(
  "13 POD idempotency replay collision and inflight exact",
  () => {
    assert.match(
      migration,
      /Aynı istek kimliği farklı bir kullanıcı tarafından kullanılamaz\./,
    );

    assert.match(
      migration,
      /Aynı istek kimliği farklı bir sevkiyat işlemi için kullanılamaz\./,
    );

    assert.match(
      migration,
      /Aynı sevkiyat isteği halen işleniyor\. Tekrar deneyin\./,
    );

    assert.match(
      migration,
      /Aynı sevkiyat isteği eşzamanlı olarak değişti\. Tekrar deneyin\./,
    );

    assert.match(
      migration,
      /return\s+v_existing\.response_payload/i,
    );
  },
);

test(
  "14 POD Shipping parent is account scoped and FOR UPDATE",
  () => {
    assert.match(
      compact(migration),
      /select shipping\.\* into v_shipping from public\.warehouse_shippings as shipping where shipping\.account_id = p_account_id and shipping\.id = p_shipping_id for update/i,
    );
  },
);

test(
  "15 POD Shipping source statuses exact dispatched in_transit partially_delivered",
  () => {
    const statusGate =
      migration.match(
        /if\s+v_shipping\.status\s+not\s+in\s*\(([\s\S]*?)\)\s+then/i,
      );

    assert.ok(statusGate);

    const statuses = [
      ...statusGate[1].matchAll(
        /'([a-z_]+)'/g,
      ),
    ].map(
      (entry) => entry[1],
    );

    assert.deepEqual(
      statuses,
      [
        "dispatched",
        "in_transit",
        "partially_delivered",
      ],
    );
  },
);

test(
  "16 POD exact Shipping status validation message",
  () => {
    const message =
      "Teslimat kanıtı yalnızca sevk edilmiş veya taşımadaki sevkiyat için kaydedilebilir.";

    assert.ok(
      migration.includes(message),
    );

    assert.ok(
      shippingService.includes(message),
    );
  },
);

test(
  "17 active POD gate is account shipping scoped and locked",
  () => {
    assert.match(
      compact(migration),
      /from public\.warehouse_shipping_proofs_of_delivery as pod where pod\.account_id = p_account_id and pod\.shipping_id = p_shipping_id and pod\.status <> 'cancelled'[\s\S]*?limit 1 for update/i,
    );
  },
);

test(
  "18 active POD duplicate exact source error",
  () => {
    const message =
      "Bu sevkiyat için aktif teslimat kanıtı zaten bulunmaktadır.";

    assert.ok(
      migration.includes(message),
    );

    assert.ok(
      shippingService.includes(message),
    );
  },
);

test(
  "19 cancelled POD history does not block new capture",
  () => {
    assert.match(
      migration,
      /pod\.status\s*<>\s*'cancelled'/i,
    );

    assert.match(
      shippingService,
      /proof\.status\s*!==\s*"cancelled"/,
    );
  },
);

test(
  "20 POD deliveredAt uses supplied value or one lifecycle timestamp",
  () => {
    assert.match(
      migration,
      /v_now\s*:=\s*now\s*\(\s*\)/i,
    );

    assert.match(
      compact(migration),
      /v_delivered_at := coalesce\( p_delivered_at, v_now \)/i,
    );

    assert.match(
      shippingService,
      /deliveredAt:\s*normalized\.deliveredAt\s*\?\?\s*timestamp/,
    );
  },
);

test(
  "21 POD insert exact captured lifecycle fields",
  () => {
    const block =
      insertBlock(
        "warehouse_shipping_proofs_of_delivery",
      );

    for (
      const token of [
        "account_id",
        "shipping_id",
        "status",
        "recipient_name",
        "photo_urls",
        "document_urls",
        "delivered_at",
        "captured_by",
        "created_at",
        "updated_at",
      ]
    ) {
      assert.ok(
        block.includes(token),
      );
    }

    assert.match(
      block,
      /'captured'/,
    );

    assert.match(
      block,
      /v_delivered_at/,
    );

    assert.match(
      block,
      /v_now[\s\S]*?v_now/,
    );
  },
);

test(
  "22 POD optional persisted evidence fields match source type",
  () => {
    const block =
      insertBlock(
        "warehouse_shipping_proofs_of_delivery",
      );

    for (
      const token of [
        "recipient_identity_number",
        "recipient_phone",
        "signature_url",
        "latitude",
        "longitude",
        "delivery_address",
        "notes",
      ]
    ) {
      assert.ok(
        block.includes(token),
      );
    }

    for (
      const token of [
        "recipientIdentityNumber",
        "recipientPhone",
        "signatureUrl",
        "latitude",
        "longitude",
        "deliveryAddress",
        "notes",
      ]
    ) {
      assert.ok(
        podType.includes(token),
      );
    }
  },
);

test(
  "23 POD capture does not invent verification rejection or cancellation mutation",
  () => {
    const block =
      insertBlock(
        "warehouse_shipping_proofs_of_delivery",
      )
        .toLowerCase();

    for (
      const forbidden of [
        "verified_by",
        "verified_at",
        "rejection_reason",
      ]
    ) {
      assert.equal(
        block.includes(forbidden),
        false,
      );
    }

    assert.equal(
      /'verified'|'rejected'|'cancelled'/.test(
        block,
      ),
      false,
    );
  },
);

test(
  "24 POD creates exact delivered driver tracking event",
  () => {
    const block =
      insertBlock(
        "warehouse_shipping_tracking_events",
      );

    assert.match(
      block,
      /'delivered'/,
    );

    assert.match(
      block,
      /'driver'/,
    );

    assert.match(
      block,
      /v_pod\.delivered_at/,
    );

    assert.match(
      block,
      /Teslimat %s tarafından teslim alındı\./,
    );

    assert.match(
      block,
      /v_pod\.latitude/,
    );

    assert.match(
      block,
      /v_pod\.longitude/,
    );
  },
);

test(
  "25 delivered tracking duplicate tuple mirrors TrackingService",
  () => {
    assert.match(
      compact(migration),
      /event\.type = 'delivered' and event\.shipping_package_id is null and event\.external_event_code is null and event\.occurred_at = v_pod\.delivered_at/i,
    );

    const message =
      "Aynı sevkiyat takip olayı daha önce kaydedilmiş.";

    assert.ok(
      migration.includes(message),
    );

    assert.ok(
      trackingService.includes(message),
    );
  },
);

test(
  "26 delivered tracking updates Shipping parent exact lifecycle fields",
  () => {
    const block =
      updateBlock(
        "warehouse_shippings",
      );

    assert.match(
      block,
      /status\s*=\s*'delivered'/i,
    );

    assert.match(
      block,
      /delivered_at\s*=\s*v_pod\.delivered_at/i,
    );

    assert.match(
      block,
      /actual_delivery_at\s*=\s*v_pod\.delivered_at/i,
    );

    assert.match(
      block,
      /updated_at\s*=\s*v_now/i,
    );

    assert.match(
      trackingService,
      /case\s+"delivered":[\s\S]*?status:\s*"delivered"[\s\S]*?deliveredAt:\s*timestamp[\s\S]*?actualDeliveryAt:\s*timestamp/,
    );
  },
);

test(
  "27 POD delivered event has no package mutation",
  () => {
    assert.doesNotMatch(
      migration,
      /(?:insert\s+into|update)\s+public\.warehouse_shipping_packages/i,
    );

    const trackingInsert =
      insertBlock(
        "warehouse_shipping_tracking_events",
      );

    assert.match(
      trackingInsert,
      /shipping_package_id/i,
    );

    assert.match(
      trackingInsert,
      /\bnull\b/i,
    );
  },
);

test(
  "28 POD mutation surface exact ledger POD tracking Shipping",
  () => {
    const mutated =
      new Set(
        [
          ...migration.matchAll(
            /\b(?:insert\s+into|update)\s+public\.(warehouse_[a-z0-9_]+)/gi,
          ),
        ].map(
          (entry) => entry[1],
        ),
      );

    assert.deepEqual(
      [...mutated].sort(),
      [
        "warehouse_shipping_proofs_of_delivery",
        "warehouse_shipping_tracking_events",
        "warehouse_shipping_write_requests",
        "warehouse_shippings",
      ].sort(),
    );
  },
);

test(
  "29 POD adjacent Shipping Packing Picking inventory domains remain read only",
  () => {
    const forbidden = [
      "warehouse_shipping_items",
      "warehouse_shipping_packages",
      "warehouse_shipping_tasks",
      "warehouse_shipping_manifests",
      "warehouse_shipping_asns",
      "warehouse_shipping_carriers",
      "warehouse_shipping_service_levels",
      "warehouse_shipping_vehicles",
      "warehouse_shipping_docks",
      "warehouse_shipping_exceptions",
      "warehouse_packing",
      "warehouse_picking",
      "warehouse_inventory",
    ];

    for (
      const table of forbidden
    ) {
      assert.doesNotMatch(
        migration,
        new RegExp(
          `(?:insert\\s+into|update|delete\\s+from)\\s+public\\.${table}\\b`,
          "i",
        ),
      );
    }
  },
);

test(
  "30 POD stable response exact twenty three keys",
  () => {
    assert.deepEqual(
      objectKeys(
        "v_result",
      ),
      [
        "ok",
        "action",
        "requestId",
        "shippingId",
        "proofOfDeliveryId",
        "status",
        "recipientName",
        "recipientIdentityNumber",
        "recipientPhone",
        "signatureUrl",
        "photoUrls",
        "documentUrls",
        "latitude",
        "longitude",
        "deliveryAddress",
        "deliveredAt",
        "capturedBy",
        "verifiedBy",
        "verifiedAt",
        "rejectionReason",
        "notes",
        "createdAt",
        "updatedAt",
      ],
    );
  },
);

test(
  "31 POD completed ledger and authenticated only RPC ACL",
  () => {
    assert.match(
      compact(migration),
      /update public\.warehouse_shipping_write_requests set response_payload = v_result, completed_at = v_now/i,
    );

    assert.match(
      migration,
      /security\s+definer/i,
    );

    assert.match(
      migration,
      /set\s+search_path\s*=\s*public\s*,\s*pg_temp/i,
    );

    assert.match(
      migration,
      /revoke\s+all\s+on\s+function[\s\S]*?from\s+public\s*;/i,
    );

    assert.match(
      migration,
      /revoke\s+all\s+on\s+function[\s\S]*?from\s+anon\s*;/i,
    );

    assert.match(
      migration,
      /revoke\s+all\s+on\s+function[\s\S]*?from\s+authenticated\s*;/i,
    );

    assert.match(
      migration,
      /grant\s+execute\s+on\s+function[\s\S]*?to\s+authenticated\s*;/i,
    );

    assert.doesNotMatch(
      migration,
      /service_role/i,
    );
  },
);

test(
  "32 POD source validator tracking repository persistence hashes remain frozen",
  () => {
    const expected = new Map([
      [
        shippingServicePath,
        "e320382e8da52d1e04da74e7e4d7bdd602f2859321f2f4c6263f8944f3ac106c",
      ],
      [
        validatorPath,
        "fd66d3d2620166cb74acd0c2d2c489665c00cbcc1bfc6105dc72bef2dce406a7",
      ],
      [
        podTypePath,
        "fabe1d9601d14bcd0cf7bad58007fae4c6309cc88b6fa049cbdef49decaaf145",
      ],
      [
        trackingServicePath,
        "87906e3afa9b2b794cebbcbf18b173471bf06b185d83c134edf1551e1ee37ade",
      ],
      [
        repositoryPath,
        "6baaeeafa697af51a9cf1241fb246343ed6e61526cd56a95efbe91aeca77d2e5",
      ],
      [
        supabaseRepositoryPath,
        "ca374ab7f9b1126a13340bd31d9ebac1092cadea6a42f77128e8786142f0ec7d",
      ],
      [
        inMemoryRepositoryPath,
        "5284b9a1fd83757b4cfd8603c45f274cbb05ac3ffe2606ed54293b71c20f3b54",
      ],
      [
        persistencePath,
        "208761ae13c9956ba0a7a8e8b1363b3e71f22adeb236f8545ad61244f0226834",
      ],
      [
        dispatchPath,
        "0f4e103476db298beacba8cb2e9dc0812778a4647faab2e5f0a9b9b7fa34fe3b",
      ],
      [
        engineTestPath,
        "71a3fd9a158753cd7976cdb673cb3a0feb16b35ae93082ca429d2eb944ef2bdb",
      ],
    ]);

    for (
      const [fileName, digest]
      of expected
    ) {
      assert.equal(
        sha256(fileName),
        digest,
        fileName,
      );
    }

    assert.match(
      shippingService,
      /async\s+recordProofOfDelivery\s*\(/,
    );

    assert.match(
      validator,
      /validateCreateShippingProofOfDelivery\s*\(/,
    );

    assert.match(
      podType,
      /export\s+interface\s+CreateShippingProofOfDeliveryInput/,
    );

    assert.match(
      trackingService,
      /case\s+"delivered":/,
    );

    assert.match(
      persistence,
      /create\s+table\s+if\s+not\s+exists\s+public\.warehouse_shipping_proofs_of_delivery/i,
    );
  },
);
