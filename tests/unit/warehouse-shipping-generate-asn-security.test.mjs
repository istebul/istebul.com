import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const migrationPath =
  process.env.A9310_MIGRATION_PATH ??
  path.join(
    root,
    "supabase/migrations/20260822163000_warehouse_shipping_generate_asn_write.sql",
  );

const sql = fs.readFileSync(
  migrationPath,
  "utf8",
);

const asnService = fs.readFileSync(
  path.join(
    root,
    "src/warehouse/services/ShippingAsnService.ts",
  ),
  "utf8",
);

const shippingService = fs.readFileSync(
  path.join(
    root,
    "src/warehouse/services/ShippingService.ts",
  ),
  "utf8",
);

function functionBody() {
  const match = sql.match(
    /as \$warehouse_shipping_generate_asn_write\$([\s\S]*?)\$warehouse_shipping_generate_asn_write\$;/i,
  );

  assert.ok(match);
  return match[1];
}

function actionConstraint() {
  const match = sql.match(
    /constraint\s+warehouse_shipping_write_requests_action_check\s+check\s*\(\s*action\s+in\s*\(([\s\S]*?)\)\s*\)/i,
  );

  assert.ok(match);

  return [
    ...match[1].matchAll(/'([^']+)'/g),
  ].map((entry) => entry[1]);
}

test(
  "generate_asn ledger action allowlist exact on bir action içerir",
  () => {
    assert.deepEqual(
      actionConstraint(),
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
      ],
    );
  },
);

test(
  "generate_asn ayrı SECURITY DEFINER RPC ve explicit search_path kullanır",
  () => {
    assert.match(
      sql,
      /public\.warehouse_shipping_generate_asn_write\s*\(\s*p_request_id uuid,\s*p_account_id uuid,\s*p_shipping_id uuid,\s*p_asn_id uuid,\s*p_generated_by text\s*\)/i,
    );

    assert.match(
      sql,
      /returns jsonb\s+language plpgsql\s+security definer\s+set search_path = public, pg_temp/i,
    );
  },
);

test(
  "generate_asn caller auth.uid ve exact yedi account rolü ile korunur",
  () => {
    const body = functionBody();

    assert.match(
      body,
      /v_user_id uuid := auth\.uid\(\)/i,
    );

    const match = body.match(
      /warehouse_has_account_role\s*\(\s*p_account_id,\s*array\[([\s\S]*?)\]::text\[\]/i,
    );

    assert.ok(match);

    assert.deepEqual(
      [
        ...match[1].matchAll(/'([^']+)'/g),
      ].map((entry) => entry[1]),
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
  "generate_asn required request account shipping ASN UUID girdilerini fail closed doğrular",
  () => {
    const body = functionBody();

    for (
      const field of [
        "p_request_id",
        "p_account_id",
        "p_shipping_id",
        "p_asn_id",
      ]
    ) {
      assert.match(
        body,
        new RegExp(
          `if\\s+${field}\\s+is\\s+null`,
          "i",
        ),
      );
    }
  },
);

test(
  "generate_asn generatedBy değerini trim eder ve boş değeri reddeder",
  () => {
    const body = functionBody();

    assert.match(
      body,
      /v_generated_by\s*:=\s*nullif\s*\(\s*btrim\s*\(\s*coalesce\s*\(\s*p_generated_by,\s*''\s*\)/i,
    );

    assert.match(
      body,
      /if v_generated_by is null then[\s\S]*?ASN oluşturan kullanıcı boş bırakılamaz\./i,
    );
  },
);

test(
  "generate_asn canonical idempotency payload shipping ASN generatedBy bağlar",
  () => {
    assert.match(
      functionBody(),
      /v_payload\s*:=\s*jsonb_build_object\s*\(\s*'shippingId',\s*p_shipping_id,\s*'asnId',\s*p_asn_id,\s*'generatedBy',\s*v_generated_by\s*\)/i,
    );
  },
);

test(
  "generate_asn idempotency user action payload replay collision ve in-flight ayrımını korur",
  () => {
    const body = functionBody();

    assert.match(body, /v_existing\.user_id\s*<>\s*v_user_id/i);
    assert.match(body, /v_existing\.action\s*<>\s*v_action/i);
    assert.match(
      body,
      /v_existing\.request_payload\s+is distinct from\s+v_payload/i,
    );
    assert.match(body, /return\s+v_existing\.response_payload/i);
    assert.match(
      body,
      /Aynı sevkiyat isteği halen işleniyor\. Tekrar deneyin\./i,
    );
    assert.match(
      body,
      /on conflict\s*\(\s*account_id,\s*request_id\s*\)\s*do nothing/i,
    );
  },
);

test(
  "generate_asn lock order Shipping parent ASN items packages şeklindedir",
  () => {
    const body = functionBody();

    const shipping =
      body.indexOf("select shipping.*");
    const asn =
      body.indexOf("select asn.*");
    const item =
      body.indexOf("perform item.id");
    const pkg =
      body.indexOf("perform shipping_package.id");

    assert.ok(shipping >= 0);
    assert.ok(asn > shipping);
    assert.ok(item > asn);
    assert.ok(pkg > item);

    assert.ok(
      (
        body
          .slice(shipping, pkg + 500)
          .match(/for update/gi) ?? []
      ).length >= 4,
    );
  },
);

test(
  "generate_asn hedef ASN account shipping id ile kilitlenir ve yalnız draft veya rejected kabul edilir",
  () => {
    const body = functionBody();

    assert.match(
      body,
      /from public\.warehouse_shipping_asns[\s\S]*?asn\.account_id\s*=\s*p_account_id[\s\S]*?asn\.shipping_id\s*=\s*p_shipping_id[\s\S]*?asn\.id\s*=\s*p_asn_id[\s\S]*?for update/i,
    );

    assert.match(
      body,
      /v_asn\.status not in\s*\(\s*'draft',\s*'rejected'\s*\)/i,
    );
  },
);

test(
  "generate_asn Shipping items ve packages varlığını doğrular fakat outer Shipping status gate eklemez",
  () => {
    const body = functionBody();

    assert.match(body, /ASN sevkiyat kaydı bulunamadı\./i);
    assert.match(
      body,
      /Sevkiyat satırı bulunmadan ASN oluşturulamaz\./i,
    );
    assert.match(
      body,
      /Sevkiyat paketi bulunmadan ASN oluşturulamaz\./i,
    );

    assert.doesNotMatch(
      body,
      /v_shipping\.status/i,
    );
  },
);

test(
  "generate_asn package validation yalnız pending ve cancelled durumlarını geçersiz sayar",
  () => {
    const body = functionBody();

    const match = body.match(
      /v_invalid_package_count[\s\S]*?shipping_package\.status in\s*\(([\s\S]*?)\)\s*;/i,
    );

    assert.ok(match);

    assert.deepEqual(
      [
        ...match[1].matchAll(/'([^']+)'/g),
      ].map((entry) => entry[1]),
      [
        "pending",
        "cancelled",
      ],
    );
  },
);

test(
  "generate_asn line snapshot persisted lineNumber product quantity unit ve line order kullanır",
  () => {
    const body = functionBody();

    assert.match(body, /'lineNumber',\s*item\.line_number/i);
    assert.match(body, /'productId',\s*item\.product_id/i);
    assert.match(body, /'quantity',\s*item\.requested_quantity/i);
    assert.match(body, /'unit',\s*item\.unit/i);
    assert.match(
      body,
      /jsonb_agg\s*\([\s\S]*?order by\s*item\.line_number/i,
    );
  },
);

test(
  "generate_asn line snapshot optional sku lot ve serial alanlarını source contract ile korur",
  () => {
    const body = functionBody();

    assert.match(body, /'skuId',\s*item\.sku_id/i);
    assert.match(
      body,
      /'lotNumber',\s*item\.tracking\s*->>\s*'lotNumber'/i,
    );
    assert.match(
      body,
      /'serialNumber',\s*item\.tracking\s*->>\s*'serialNumber'/i,
    );
    assert.match(body, /jsonb_strip_nulls/i);
  },
);

test(
  "generate_asn package association aynı packing_id için ilk loading_sequence paketini kullanır",
  () => {
    const body = functionBody();

    assert.match(
      body,
      /left join lateral[\s\S]*?candidate\.packing_id\s*=\s*item\.packing_id[\s\S]*?order by\s*candidate\.loading_sequence,\s*candidate\.id[\s\S]*?limit 1/i,
    );

    assert.match(
      body,
      /'packageNumber',\s*package_match\.package_number/i,
    );
    assert.match(
      body,
      /'sscc',\s*package_match\.sscc/i,
    );
  },
);

test(
  "generate_asn packageCount current Shipping package count değerinden üretilir",
  () => {
    const body = functionBody();

    assert.match(
      body,
      /select count\(\*\)::integer\s+into v_package_count\s+from public\.warehouse_shipping_packages/i,
    );
    assert.match(
      body,
      /'packageCount',\s*v_package_count/i,
    );
  },
);

test(
  "generate_asn json ve custom formatlarını aynı JSON serializer yoluna bağlar",
  () => {
    const body = functionBody();

    assert.match(
      body,
      /v_asn\.format in\s*\(\s*'json',\s*'custom'\s*\)/i,
    );

    assert.match(body, /jsonb_pretty/i);
    assert.match(body, /'asnNumber'/i);
    assert.match(body, /'shippingId'/i);
    assert.match(body, /'packageCount'/i);
    assert.match(body, /'lines'/i);
  },
);

test(
  "generate_asn XML serializer source tag yapısını ve XML escaping davranışını korur",
  () => {
    const body = functionBody();

    for (
      const token of [
        '<?xml version="1.0" encoding="UTF-8"?>',
        "<AdvancedShippingNotice>",
        "<AsnNumber>",
        "<ShippingId>",
        "<PackageCount>",
        "<SenderCode>",
        "<ReceiverCode>",
        "<Lines>",
        "<Line>",
        "<LineNumber>",
        "<ProductId>",
        "<SkuId>",
        "<Quantity>",
        "<Unit>",
        "<LotNumber>",
        "<SerialNumber>",
        "<PackageNumber>",
        "<Sscc>",
        "&amp;",
        "&lt;",
        "&gt;",
        "&quot;",
        "&apos;",
      ]
    ) {
      assert.ok(
        body.includes(token),
        `missing token ${token}`,
      );
    }
  },
);

test(
  "generate_asn EDI serializer exact HDR LIN TRL semantic shape kullanır",
  () => {
    const body = functionBody();

    assert.ok(body.includes("'HDR|'"));
    assert.ok(body.includes("'LIN|'"));
    assert.ok(body.includes("'TRL|'"));
    assert.match(
      body,
      /jsonb_array_length\(v_lines\)/i,
    );
  },
);

test(
  "generate_asn EDIFACT serializer source DESADV PAC GIN BX GIN BJ ve UNT davranışını korur",
  () => {
    const body = functionBody();

    for (
      const token of [
        "UNH+1+DESADV:D:01B:UN",
        "BGM+351+",
        "CPS+1",
        "PAC+",
        "LIN+",
        "QTY+12:",
        "GIN+BX+",
        "GIN+BJ+",
        "UNT+",
      ]
    ) {
      assert.ok(
        body.includes(token),
        `missing token ${token}`,
      );
    }

    assert.match(
      body,
      /4\s*\+\s*jsonb_array_length\(v_lines\)\s*\*\s*2/i,
    );
  },
);

test(
  "generate_asn ASN kaydını generated durumuna tek server timestamp ile taşır ve generatedBy persist etmez",
  () => {
    const body = functionBody();

    const match = body.match(
      /update public\.warehouse_shipping_asns([\s\S]*?)returning \*/i,
    );

    assert.ok(match);

    const update = match[0];

    assert.match(update, /status\s*=\s*'generated'/i);
    assert.match(update, /package_count\s*=\s*v_package_count/i);
    assert.match(update, /lines\s*=\s*v_lines/i);
    assert.match(update, /content\s*=\s*v_content/i);
    assert.match(update, /generated_at\s*=\s*v_now/i);
    assert.match(update, /updated_at\s*=\s*v_now/i);
    assert.doesNotMatch(update, /generated_by/i);

    assert.match(
      body,
      /v_now\s*:=\s*clock_timestamp\(\)/i,
    );
  },
);

test(
  "generate_asn mutation surface yalnız Shipping ledger ve ASN tablolarıdır",
  () => {
    const body = functionBody();

    const mutated = [
      ...new Set(
        [
          ...body.matchAll(
            /\b(?:insert\s+into|update|delete\s+from)\s+public\.(warehouse_[a-z0-9_]+)/gi,
          ),
        ].map((match) => match[1]),
      ),
    ].sort();

    assert.deepEqual(
      mutated,
      [
        "warehouse_shipping_asns",
        "warehouse_shipping_write_requests",
      ],
    );
  },
);

test(
  "generate_asn Shipping parent item package manifest carrier task dock Packing Picking inventory mutation veya prerequisite eklemez",
  () => {
    const body = functionBody();

    for (
      const table of [
        "warehouse_shippings",
        "warehouse_shipping_items",
        "warehouse_shipping_packages",
        "warehouse_shipping_manifests",
        "warehouse_shipping_carriers",
        "warehouse_shipping_service_levels",
        "warehouse_shipping_vehicles",
        "warehouse_shipping_docks",
        "warehouse_shipping_tasks",
        "warehouse_shipping_tracking_events",
        "warehouse_shipping_pods",
        "warehouse_shipping_exceptions",
        "warehouse_packings",
        "warehouse_picking_tasks",
        "warehouse_inventory",
      ]
    ) {
      assert.doesNotMatch(
        body,
        new RegExp(
          `(?:insert\\s+into|update|delete\\s+from)\\s+public\\.${table}`,
          "i",
        ),
      );
    }

    assert.doesNotMatch(
      body,
      /supports_asn|manifest_id|carrier_id|service_level_id|vehicle_id|dock_id/i,
    );
  },
);

test(
  "generate_asn stable response generated ASN lifecycle alanlarını döndürür ve ledger completed saklar",
  () => {
    const body = functionBody();

    for (
      const key of [
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
      ]
    ) {
      assert.match(
        body,
        new RegExp(`'${key}'`, "i"),
      );
    }

    const result = body.match(
      /v_result\s*:=\s*jsonb_build_object\s*\(([\s\S]*?)\);\s*update\s+public\.warehouse_shipping_write_requests/i,
    );

    assert.ok(result);
    assert.doesNotMatch(
      result[1],
      /'generatedBy'/i,
    );

    assert.match(
      body,
      /response_payload\s*=\s*v_result,\s*completed_at\s*=\s*v_now/i,
    );
  },
);

test(
  "generate_asn authenticated-only EXECUTE ACL kullanır service role veya direct table grant açmaz",
  () => {
    assert.match(
      sql,
      /revoke all[\s\S]*?warehouse_shipping_generate_asn_write[\s\S]*?from public/i,
    );

    assert.match(
      sql,
      /revoke all[\s\S]*?warehouse_shipping_generate_asn_write[\s\S]*?from anon/i,
    );

    assert.match(
      sql,
      /grant execute[\s\S]*?warehouse_shipping_generate_asn_write[\s\S]*?to authenticated/i,
    );

    assert.doesNotMatch(sql, /service_role/i);

    assert.doesNotMatch(
      sql,
      /grant\s+(?:insert|update|delete|all)\s+on\s+(?:table\s+)?public\.warehouse_shipping_/i,
    );
  },
);

test(
  "ShippingService ve ShippingAsnService generate ASN source lifecycle parity korunur",
  () => {
    assert.match(
      shippingService,
      /async generateAsn\(input:\s*\{[\s\S]*?tenantId: string;[\s\S]*?shippingId: string;[\s\S]*?asnId: string;[\s\S]*?generatedBy: string;[\s\S]*?return this\.asnService\.generate\(\{[\s\S]*?generatedBy: input\.generatedBy,/i,
    );

    assert.match(
      asnService,
      /asn\.status !== "draft" &&[\s\S]*?asn\.status !== "rejected"/i,
    );

    assert.match(
      asnService,
      /requireText\(\s*input\.generatedBy,\s*"ASN oluşturan kullanıcı"/i,
    );

    assert.match(
      asnService,
      /shipping\.items\.length === 0/i,
    );

    assert.match(
      asnService,
      /packages\.length === 0/i,
    );

    assert.match(
      asnService,
      /shippingPackage\.status ===\s*"pending"\s*\|\|[\s\S]*?shippingPackage\.status ===\s*"cancelled"/i,
    );

    assert.match(
      asnService,
      /const timestamp = this\.now\(\)/i,
    );

    assert.match(
      asnService,
      /status:\s*"generated"[\s\S]*?packageCount:\s*packages\.length[\s\S]*?lines,[\s\S]*?content,[\s\S]*?generatedAt:\s*timestamp,[\s\S]*?updatedAt:\s*timestamp/i,
    );
  },
);
