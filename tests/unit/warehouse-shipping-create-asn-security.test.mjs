import test from "node:test";
import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";

const migrationPath =
  "supabase/migrations/20260822162500_warehouse_shipping_create_asn_write.sql";

const previousWritePath =
  "supabase/migrations/20260822162000_warehouse_shipping_submit_manifest_write.sql";

const persistencePath =
  "supabase/migrations/20260819231500_warehouse_shipping_persistence.sql";

const shippingServicePath =
  "src/warehouse/services/ShippingService.ts";

const asnServicePath =
  "src/warehouse/services/ShippingAsnService.ts";

const validatorPath =
  "src/warehouse/services/ShippingValidator.ts";

const asnTypePath =
  "src/warehouse/types/ShippingAsn.ts";

const repositoryPath =
  "src/warehouse/services/SupabaseShippingRepository.ts";

const repositoryInterfacePath =
  "src/warehouse/services/ShippingRepository.ts";

const engineTestPath =
  "tests/unit/warehouse-shipping-engine.test.mjs";

const sql =
  readFileSync(
    migrationPath,
    "utf8",
  );

const previousWrite =
  readFileSync(
    previousWritePath,
    "utf8",
  );

const persistence =
  readFileSync(
    persistencePath,
    "utf8",
  );

const shippingService =
  readFileSync(
    shippingServicePath,
    "utf8",
  );

const asnService =
  readFileSync(
    asnServicePath,
    "utf8",
  );

const validator =
  readFileSync(
    validatorPath,
    "utf8",
  );

const asnType =
  readFileSync(
    asnTypePath,
    "utf8",
  );

const repository =
  readFileSync(
    repositoryPath,
    "utf8",
  );

const repositoryInterface =
  readFileSync(
    repositoryInterfacePath,
    "utf8",
  );

const engineTest =
  readFileSync(
    engineTestPath,
    "utf8",
  );

function extractRpc() {
  const match =
    sql.match(
      /create\s+or\s+replace\s+function\s+public\.warehouse_shipping_create_asn_write\s*\([\s\S]*?\$warehouse_shipping_create_asn_write\$;/i,
    );

  assert.ok(
    match,
    "create ASN RPC region bulunamadı",
  );

  return match[0];
}

function extractBlock(
  source,
  startToken,
  endToken,
) {
  const start =
    source.indexOf(startToken);

  const end =
    source.indexOf(
      endToken,
      start,
    );

  assert.notEqual(
    start,
    -1,
    `${startToken} bulunamadı`,
  );

  assert.notEqual(
    end,
    -1,
    `${endToken} bulunamadı`,
  );

  return source.slice(
    start,
    end,
  );
}

const rpc =
  extractRpc();

test(
  "create_asn ledger action allowlist exact on action içerir",
  () => {
    const match =
      sql.match(
        /warehouse_shipping_write_requests_action_check[\s\S]*?action\s+in\s*\(([\s\S]*?)\)\s*\)/i,
      );

    assert.ok(match);

    const actions =
      [
        ...match[1].matchAll(
          /'([^']+)'/g,
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
      ],
    );
  },
);

test(
  "create_asn server-only ASN numara sequence oluşturur",
  () => {
    assert.match(
      sql,
      /create\s+sequence\s+if\s+not\s+exists\s+public\.warehouse_shipping_asn_number_seq[\s\S]*?start\s+with\s+1[\s\S]*?increment\s+by\s+1/i,
    );

    assert.match(
      sql,
      /revoke\s+all\s+on\s+sequence\s+public\.warehouse_shipping_asn_number_seq\s+from\s+public\s*,\s*anon\s*,\s*authenticated\s*;/i,
    );

    assert.doesNotMatch(
      sql,
      /grant\s+(?:usage|all)[\s\S]*?warehouse_shipping_asn_number_seq[\s\S]*?to\s+(?:anon|authenticated)/i,
    );
  },
);

test(
  "create_asn RPC exact request account shipping ve dört optional text parametresi taşır",
  () => {
    assert.match(
      rpc,
      /warehouse_shipping_create_asn_write\s*\(\s*p_request_id\s+uuid\s*,\s*p_account_id\s+uuid\s*,\s*p_shipping_id\s+uuid\s*,\s*p_sender_code\s+text\s*,\s*p_receiver_code\s+text\s*,\s*p_format\s+text\s*,\s*p_notes\s+text\s*\)/i,
    );

    assert.doesNotMatch(
      rpc.split(
        "returns jsonb",
      )[0],
      /\bp_created_by\b/i,
    );
  },
);

test(
  "create_asn caller auth.uid ve exact yedi account rolü ile korunur",
  () => {
    assert.match(
      rpc,
      /v_user_id\s+uuid\s*:=\s*auth\.uid\s*\(\s*\)/i,
    );

    const roleMatch =
      rpc.match(
        /warehouse_has_account_role\s*\(\s*p_account_id\s*,\s*array\s*\[([\s\S]*?)\]::text\[\]/i,
      );

    assert.ok(roleMatch);

    const roles =
      [
        ...roleMatch[1].matchAll(
          /'([^']+)'/g,
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
  "create_asn UUID girdilerini fail closed doğrular ve created_by actor clienttan alınmaz",
  () => {
    assert.match(
      rpc,
      /p_request_id\s+is\s+null[\s\S]*?İstek kimliği boş bırakılamaz\./i,
    );

    assert.match(
      rpc,
      /p_account_id\s+is\s+null[\s\S]*?Firma kimliği boş bırakılamaz\./i,
    );

    assert.match(
      rpc,
      /p_shipping_id\s+is\s+null[\s\S]*?Sevkiyat kimliği boş bırakılamaz\./i,
    );

    assert.match(
      rpc,
      /created_by[\s\S]*?v_user_id/i,
    );

    assert.doesNotMatch(
      rpc,
      /\bp_created_by\b/i,
    );
  },
);

test(
  "create_asn optional textleri trim eder formatı null ise json yapar ve canonical payload bağlar",
  () => {
    assert.match(
      rpc,
      /v_sender_code\s*:=\s*nullif\s*\(\s*btrim\s*\(\s*p_sender_code\s*\)\s*,\s*''\s*\)/i,
    );

    assert.match(
      rpc,
      /v_receiver_code\s*:=\s*nullif\s*\(\s*btrim\s*\(\s*p_receiver_code\s*\)\s*,\s*''\s*\)/i,
    );

    assert.match(
      rpc,
      /v_notes\s*:=\s*nullif\s*\(\s*btrim\s*\(\s*p_notes\s*\)\s*,\s*''\s*\)/i,
    );

    assert.match(
      rpc,
      /v_format\s*:=\s*coalesce\s*\(\s*p_format\s*,\s*'json'\s*\)/i,
    );

    assert.match(
      rpc,
      /v_format\s+not\s+in\s*\(\s*'json'\s*,\s*'xml'\s*,\s*'edi'\s*,\s*'edifact'\s*,\s*'custom'\s*\)/i,
    );

    const payloadMatch =
      rpc.match(
        /v_payload\s*:=\s*jsonb_build_object\s*\(([\s\S]*?)\)\s*;/i,
      );

    assert.ok(payloadMatch);

    const pairs =
      [
        ...payloadMatch[1].matchAll(
          /'([^']+)'\s*,\s*([a-zA-Z0-9_]+)/g,
        ),
      ].map(
        (entry) => [
          entry[1],
          entry[2],
        ],
      );

    assert.deepEqual(
      pairs,
      [
        [
          "shippingId",
          "p_shipping_id",
        ],
        [
          "senderCode",
          "v_sender_code",
        ],
        [
          "receiverCode",
          "v_receiver_code",
        ],
        [
          "format",
          "v_format",
        ],
        [
          "notes",
          "v_notes",
        ],
      ],
    );
  },
);

test(
  "create_asn idempotency user action payload replay collision ve in-flight ayrımını korur",
  () => {
    assert.match(
      rpc,
      /warehouse_shipping_write_requests[\s\S]*?for\s+update/i,
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
      /request_payload\s+is\s+distinct\s+from\s+v_payload/i,
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

    assert.match(
      rpc,
      /return\s+v_existing\.response_payload\s*;/i,
    );
  },
);

test(
  "create_asn Shipping parenti FOR UPDATE kilitler ve yalnız loaded veya dispatched kabul eder",
  () => {
    assert.match(
      rpc,
      /from\s+public\.warehouse_shippings\s+as\s+shipping[\s\S]*?shipping\.account_id\s*=\s*p_account_id[\s\S]*?shipping\.id\s*=\s*p_shipping_id[\s\S]*?for\s+update/i,
    );

    assert.match(
      rpc,
      /v_shipping\.status\s*<>\s*'loaded'\s+and\s+v_shipping\.status\s*<>\s*'dispatched'/i,
    );

    assert.match(
      rpc,
      /ASN yalnızca yüklenmiş veya sevk edilmiş operasyon için oluşturulabilir\./,
    );
  },
);

test(
  "create_asn existing ASN setini Shipping sonrasında kilitler ve cancelled rejected dışını aktif sayar",
  () => {
    const shippingLock =
      rpc.search(
        /from\s+public\.warehouse_shippings[\s\S]*?for\s+update/i,
      );

    const asnLock =
      rpc.search(
        /perform\s+asn\.id[\s\S]*?from\s+public\.warehouse_shipping_asns[\s\S]*?for\s+update/i,
      );

    assert.ok(
      shippingLock >= 0,
    );

    assert.ok(
      asnLock > shippingLock,
    );

    assert.match(
      rpc,
      /asn\.status\s+not\s+in\s*\(\s*'cancelled'\s*,\s*'rejected'\s*\)/i,
    );

    assert.match(
      rpc,
      /Bu sevkiyat için aktif bir ASN zaten bulunmaktadır\./,
    );
  },
);

test(
  "create_asn numarası UTC server timestamp ve dedicated sequence ile ASN-YYYYMMDD-000001 biçiminde üretilir",
  () => {
    assert.match(
      rpc,
      /v_now\s*:=\s*clock_timestamp\s*\(\s*\)/i,
    );

    assert.match(
      rpc,
      /'ASN-'\s*\|\|\s*to_char\s*\(\s*v_now\s+at\s+time\s+zone\s+'UTC'\s*,\s*'YYYYMMDD'\s*\)[\s\S]*?\|\|\s*'-'[\s\S]*?\|\|\s*lpad\s*\(\s*nextval\s*\(\s*'public\.warehouse_shipping_asn_number_seq'\s*\)::text\s*,\s*6\s*,\s*'0'\s*\)/i,
    );

    assert.doesNotMatch(
      rpc.split(
        "returns jsonb",
      )[0],
      /\bp_asn_number\b/i,
    );
  },
);

test(
  "create_asn draft ASN skeletonini packageCount zero lines boş ve normalized format ile insert eder",
  () => {
    assert.match(
      rpc,
      /insert\s+into\s+public\.warehouse_shipping_asns\s*\([\s\S]*?account_id[\s\S]*?shipping_id[\s\S]*?asn_number[\s\S]*?status[\s\S]*?package_count[\s\S]*?lines[\s\S]*?format[\s\S]*?created_by[\s\S]*?created_at[\s\S]*?updated_at[\s\S]*?\)\s*values\s*\([\s\S]*?p_account_id[\s\S]*?p_shipping_id[\s\S]*?v_asn_number[\s\S]*?'draft'[\s\S]*?0[\s\S]*?'\[\]'::jsonb[\s\S]*?v_format[\s\S]*?v_user_id[\s\S]*?v_now[\s\S]*?v_now/i,
    );
  },
);

test(
  "create_asn created_by yalnız auth caller ve createdAt updatedAt aynı server timestamp kullanır",
  () => {
    assert.match(
      rpc,
      /created_by[\s\S]*?created_at[\s\S]*?updated_at[\s\S]*?\)[\s\S]*?v_user_id[\s\S]*?v_now[\s\S]*?v_now/i,
    );

    assert.doesNotMatch(
      rpc,
      /\bcreated_by\s*=\s*p_/i,
    );
  },
);

test(
  "create_asn Shipping planned ve expected delivery snapshotları ile optional alanları korur",
  () => {
    assert.match(
      rpc,
      /planned_dispatch_at[\s\S]*?expected_delivery_at[\s\S]*?v_shipping\.planned_at[\s\S]*?v_shipping\.expected_delivery_at/i,
    );

    assert.match(
      rpc,
      /sender_code[\s\S]*?receiver_code[\s\S]*?notes[\s\S]*?v_sender_code[\s\S]*?v_receiver_code[\s\S]*?v_notes/i,
    );
  },
);

test(
  "create_asn mutation surface yalnız Shipping ledger ve ASN tablolarıdır",
  () => {
    const mutations =
      new Set(
        [
          ...rpc.matchAll(
            /\b(?:insert\s+into|update|delete\s+from)\s+public\.([a-z0-9_]+)/gi,
          ),
        ].map(
          (entry) =>
            entry[1].toLowerCase(),
        ),
      );

    assert.deepEqual(
      [
        ...mutations,
      ].sort(),
      [
        "warehouse_shipping_asns",
        "warehouse_shipping_write_requests",
      ],
    );
  },
);

test(
  "create_asn Shipping parent item package manifest carrier task dock inventory Packing Picking mutation yapmaz",
  () => {
    const forbiddenUpdateInsert =
      [
        "warehouse_shippings",
        "warehouse_shipping_items",
        "warehouse_shipping_packages",
        "warehouse_shipping_manifests",
        "warehouse_shipping_carriers",
        "warehouse_shipping_tasks",
        "warehouse_shipping_docks",
      ];

    for (
      const table
      of forbiddenUpdateInsert
    ) {
      assert.doesNotMatch(
        rpc,
        new RegExp(
          String.raw`\b(?:insert\s+into|update|delete\s+from)\s+public\.${table}\b`,
          "i",
        ),
      );
    }

    assert.doesNotMatch(
      rpc,
      /\basn_id\s*=/i,
    );

    assert.doesNotMatch(
      rpc,
      /\bwarehouse_inventory\b|\bwarehouse_packing\b|\bwarehouse_picking\b/i,
    );
  },
);

test(
  "create_asn source parity gereği carrier manifest item package generate veya send prerequisite eklemez",
  () => {
    for (
      const pattern
      of [
        /warehouse_shipping_carriers/i,
        /warehouse_shipping_manifests/i,
        /warehouse_shipping_items/i,
        /warehouse_shipping_packages/i,
        /\basn_supported\b/i,
        /\bmanifest_supported\b/i,
        /\bgenerated_at\s*=/i,
        /\bsent_at\s*=/i,
      ]
    ) {
      assert.doesNotMatch(
        rpc,
        pattern,
      );
    }
  },
);

test(
  "create_asn stable draft response sonucunu ledger completed olarak saklar",
  () => {
    const responseMatch =
      rpc.match(
        /v_response\s*:=\s*jsonb_build_object\s*\(([\s\S]*?)\)\s*;/i,
      );

    assert.ok(responseMatch);

    const keys =
      [
        ...responseMatch[1].matchAll(
          /'([^']+)'\s*,/g,
        ),
      ].map(
        (entry) => entry[1],
      );

    assert.deepEqual(
      keys,
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
        "notes",
        "createdBy",
        "createdAt",
        "updatedAt",
      ],
    );

    assert.match(
      rpc,
      /response_payload\s*=\s*v_response[\s\S]*?completed_at\s*=\s*v_now/i,
    );
  },
);

test(
  "create_asn SECURITY DEFINER explicit search_path authenticated-only EXECUTE ACL kullanır",
  () => {
    assert.match(
      rpc,
      /security\s+definer/i,
    );

    assert.match(
      rpc,
      /set\s+search_path\s*=\s*public\s*,\s*pg_temp/i,
    );

    assert.match(
      sql,
      /revoke\s+all[\s\S]*?warehouse_shipping_create_asn_write[\s\S]*?from\s+public\s*,\s*anon\s*,\s*authenticated\s*;/i,
    );

    assert.match(
      sql,
      /grant\s+execute[\s\S]*?warehouse_shipping_create_asn_write[\s\S]*?to\s+authenticated\s*;/i,
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
  "ShippingService createAsn outer gate trim ve ShippingAsnService create source parity korunur",
  () => {
    const outer =
      extractBlock(
        shippingService,
        "async createAsn(input: {",
        "async generateAsn(",
      );

    assert.match(
      outer,
      /shipping\.status\s*!==\s*"loaded"\s*&&\s*shipping\.status\s*!==\s*"dispatched"/,
    );

    assert.match(
      outer,
      /ASN yalnızca yüklenmiş veya sevk edilmiş operasyon için oluşturulabilir\./,
    );

    assert.match(
      outer,
      /return\s+this\.asnService\.create\s*\(/,
    );

    assert.match(
      outer,
      /input\.senderCode\?\.trim\(\)/,
    );

    assert.match(
      outer,
      /input\.receiverCode\?\.trim\(\)/,
    );

    assert.match(
      outer,
      /input\.notes\?\.trim\(\)/,
    );

    assert.doesNotMatch(
      outer,
      /this\.repository\./,
    );

    const inner =
      extractBlock(
        asnService,
        "async create(input: {",
        "async generate(",
      );

    const calls =
      [
        ...inner.matchAll(
          /this\.repository\s*\.\s*([A-Za-z0-9_]+)\s*\(/g,
        ),
      ].map(
        (entry) => entry[1],
      );

    assert.deepEqual(
      calls,
      [
        "findById",
        "listAsns",
        "saveAsn",
      ],
    );

    assert.match(
      inner,
      /asn\.status\s*!==\s*"cancelled"\s*&&\s*asn\.status\s*!==\s*"rejected"/,
    );

    assert.match(
      inner,
      /status:\s*"draft"/,
    );

    assert.match(
      inner,
      /packageCount:\s*0/,
    );

    assert.match(
      inner,
      /lines:\s*\[\]/,
    );
  },
);

test(
  "Shipping ASN validator persistence repository type ve engine lifecycle create kontratını destekler",
  () => {
    const validatorBlock =
      extractBlock(
        validator,
        "export function validateCreateShippingAsn(",
        "export function validateCreateShippingTrackingEvent(",
      );

    assert.match(
      validatorBlock,
      /format:\s*input\.format\s*\?\?\s*"json"/,
    );

    assert.match(
      validatorBlock,
      /createdBy:\s*requireText\s*\([\s\S]*?input\.createdBy[\s\S]*?"Oluşturan kullanıcı"/,
    );

    assert.match(
      asnType,
      /SHIPPING_ASN_STATUSES\s*=\s*\[[\s\S]*?"draft"[\s\S]*?"generated"[\s\S]*?"sent"[\s\S]*?"acknowledged"[\s\S]*?"rejected"[\s\S]*?"cancelled"/,
    );

    assert.match(
      asnType,
      /format\?:\s*ShippingAsn\["format"\]/,
    );

    assert.match(
      persistence,
      /create\s+table\s+if\s+not\s+exists\s+public\.warehouse_shipping_asns[\s\S]*?created_by\s+uuid\s+not\s+null[\s\S]*?references\s+auth\.users\(id\)/i,
    );

    assert.match(
      persistence,
      /warehouse_shipping_asns_account_number_unique[\s\S]*?unique\s*\(\s*account_id\s*,\s*asn_number\s*\)/i,
    );

    assert.match(
      repositoryInterface,
      /saveAsn\s*\([\s\S]*?asn:\s*ShippingAsn[\s\S]*?\):\s*Promise<ShippingAsn>/,
    );

    assert.match(
      repository,
      /async\s+saveAsn\s*\([\s\S]*?return\s+this\.rejectWrite\(\)/,
    );

    assert.match(
      repository,
      /async\s+listAsns\s*\([\s\S]*?ASN_TABLE[\s\S]*?ASN_SELECT[\s\S]*?tenantId[\s\S]*?shippingId[\s\S]*?"created_at"[\s\S]*?mapAsn/,
    );

    assert.match(
      engineTest,
      /ASN JSON içeriği üretir ve gönderilir[\s\S]*?\.createAsn\s*\(\{[\s\S]*?senderCode:\s*"DEPO-IZMIR"[\s\S]*?format:\s*"json"[\s\S]*?createdBy:\s*"user-1"/,
    );

    assert.match(
      previousWrite,
      /submit_manifest/,
    );
  },
);
