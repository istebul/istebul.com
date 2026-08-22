import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260822160500_warehouse_shipping_create_manifest_write.sql";

const previousWritePath =
  "supabase/migrations/20260822160000_warehouse_shipping_complete_loading_write.sql";

const persistencePath =
  "supabase/migrations/20260819231500_warehouse_shipping_persistence.sql";

const servicePath =
  "src/warehouse/services/ShippingService.ts";

const manifestServicePath =
  "src/warehouse/services/ShippingManifestService.ts";

const validatorPath =
  "src/warehouse/services/ShippingValidator.ts";

const manifestTypePath =
  "src/warehouse/types/ShippingManifest.ts";

const migration =
  fs.readFileSync(
    migrationPath,
    "utf8",
  );

const previousWrite =
  fs.readFileSync(
    previousWritePath,
    "utf8",
  );

const persistence =
  fs.readFileSync(
    persistencePath,
    "utf8",
  );

const service =
  fs.readFileSync(
    servicePath,
    "utf8",
  );

const manifestService =
  fs.readFileSync(
    manifestServicePath,
    "utf8",
  );

const validator =
  fs.readFileSync(
    validatorPath,
    "utf8",
  );

const manifestType =
  fs.readFileSync(
    manifestTypePath,
    "utf8",
  );

function extractRpc(
  sql,
  functionName,
  delimiter,
) {
  const start =
    sql.indexOf(
      `create or replace function\n  public.${functionName}(`,
    );

  assert.notEqual(
    start,
    -1,
    `${functionName} başlangıcı bulunamadı`,
  );

  const marker =
    `${delimiter};`;

  const end =
    sql.indexOf(
      marker,
      start,
    );

  assert.notEqual(
    end,
    -1,
    `${functionName} sonu bulunamadı`,
  );

  return sql.slice(
    start,
    end + marker.length,
  );
}

function extractMethod(
  text,
  startNeedle,
  nextNeedle,
) {
  const start =
    text.indexOf(
      startNeedle,
    );

  assert.notEqual(
    start,
    -1,
    `${startNeedle} bulunamadı`,
  );

  const end =
    text.indexOf(
      nextNeedle,
      start + startNeedle.length,
    );

  assert.notEqual(
    end,
    -1,
    `${nextNeedle} bulunamadı`,
  );

  return text.slice(
    start,
    end,
  );
}

function extractTable(
  sql,
  table,
) {
  const pattern =
    new RegExp(
      `create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${table}\\s*\\(([\\s\\S]*?)\\n\\);`,
      "i",
    );

  const match =
    sql.match(
      pattern,
    );

  assert.ok(
    match,
    `${table} DDL bulunamadı`,
  );

  return match[1];
}

const rpc =
  extractRpc(
    migration,
    "warehouse_shipping_create_manifest_write",
    "$warehouse_shipping_create_manifest_write$",
  );

const outerCreate =
  extractMethod(
    service,
    "async createManifest(",
    "async generateManifest(",
  );

const innerCreate =
  extractMethod(
    manifestService,
    "async create(input:",
    "async generate(",
  );

const validatorCreate =
  extractMethod(
    validator,
    "export function validateCreateShippingManifest(",
    "export function validateCreateShippingAsn(",
  );

const manifestDdl =
  extractTable(
    persistence,
    "warehouse_shipping_manifests",
  );

test(
  "Shipping ledger action allowlist create_manifest ile exact altı action içerir",
  () => {
    const matches = [
      ...migration.matchAll(
        /add\s+constraint\s+warehouse_shipping_write_requests_action_check[\s\S]*?check\s*\(\s*action\s+in\s*\(([\s\S]*?)\)\s*\)\s*;/gi,
      ),
    ];

    assert.equal(
      matches.length,
      1,
    );

    const actions = [
      ...matches[0][1].matchAll(
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
      ],
    );
  },
);

test(
  "create_manifest server-only manifest number sequence oluşturur ve client rollerinden kapatır",
  () => {
    assert.match(
      migration,
      /create\s+sequence\s+if\s+not\s+exists\s+public\.warehouse_shipping_manifest_number_seq[\s\S]*?as\s+bigint[\s\S]*?cache\s+1\s*;/i,
    );

    for (
      const role of [
        "public",
        "anon",
        "authenticated",
      ]
    ) {
      assert.match(
        migration,
        new RegExp(
          `revoke\\s+all\\s+on\\s+sequence\\s+public\\.warehouse_shipping_manifest_number_seq\\s+from\\s+${role}\\s*;`,
          "i",
        ),
      );
    }

    assert.doesNotMatch(
      migration,
      /grant\s+usage\s+on\s+sequence\s+public\.warehouse_shipping_manifest_number_seq/i,
    );
  },
);

test(
  "create_manifest RPC exact request account shipping notes parametrelerini taşır",
  () => {
    assert.match(
      migration,
      /warehouse_shipping_create_manifest_write\s*\(\s*p_request_id\s+uuid\s*,\s*p_account_id\s+uuid\s*,\s*p_shipping_id\s+uuid\s*,\s*p_notes\s+text\s+default\s+null\s*\)/i,
    );

    assert.doesNotMatch(
      rpc,
      /\bp_created_by\b|\bp_carrier_id\b|\bp_service_level_id\b|\bp_vehicle_id\b/i,
    );
  },
);

test(
  "create_manifest caller auth.uid ve exact yedi account rolü ile korunur",
  () => {
    assert.match(
      rpc,
      /v_user_id\s+uuid\s*:=\s*auth\.uid\s*\(\s*\)/i,
    );

    assert.match(
      rpc,
      /warehouse_has_account_role\s*\(\s*p_account_id\s*,\s*array\s*\[\s*'owner'\s*,\s*'admin'\s*,\s*'warehouse_manager'\s*,\s*'supervisor'\s*,\s*'inventory_controller'\s*,\s*'picker'\s*,\s*'operator'\s*\]::text\[\]\s*\)/i,
    );
  },
);

test(
  "create_manifest required UUID girdilerini fail closed doğrular",
  () => {
    for (
      const parameter of [
        "p_request_id",
        "p_account_id",
        "p_shipping_id",
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

    assert.match(
      rpc,
      /Oturum açmış kullanıcı bulunamadı\./,
    );
  },
);

test(
  "create_manifest notes trim normalize eder ve canonical payload shippingId notes bağlar",
  () => {
    assert.match(
      rpc,
      /v_normalized_notes\s*:=\s*nullif\s*\(\s*btrim\s*\(\s*coalesce\s*\(\s*p_notes\s*,\s*''\s*\)\s*\)\s*,\s*''\s*\)/i,
    );

    assert.match(
      rpc,
      /v_payload\s*:=\s*jsonb_build_object\s*\(\s*'shippingId'\s*,\s*p_shipping_id\s*,\s*'notes'\s*,\s*v_normalized_notes\s*\)/i,
    );
  },
);

test(
  "create_manifest idempotency user action payload replay collision ve in-flight ayrımını korur",
  () => {
    assert.match(
      rpc,
      /from\s+public\.warehouse_shipping_write_requests[\s\S]*?account_id\s*=\s*p_account_id[\s\S]*?request_id\s*=\s*p_request_id[\s\S]*?for\s+update/i,
    );

    assert.match(
      rpc,
      /insert\s+into\s+public\.warehouse_shipping_write_requests[\s\S]*?on\s+conflict\s*\(\s*account_id\s*,\s*request_id\s*\)\s*do\s+nothing/i,
    );

    assert.match(
      rpc,
      /v_existing_response\s+is\s+not\s+null[\s\S]*?return\s+v_existing_response/i,
    );

    assert.match(
      rpc,
      /errcode\s*=\s*'42501'[\s\S]*?farklı bir kullanıcı/i,
    );

    assert.match(
      rpc,
      /errcode\s*=\s*'23505'[\s\S]*?farklı bir sevkiyat işlemi/i,
    );

    assert.match(
      rpc,
      /errcode\s*=\s*'40001'[\s\S]*?halen işleniyor/i,
    );
  },
);

test(
  "Shipping parent account scoped FOR UPDATE kilitlenir ve yalnız loaded kabul edilir",
  () => {
    assert.match(
      rpc,
      /from\s+public\.warehouse_shippings\s+as\s+shipping[\s\S]*?shipping\.account_id\s*=\s*p_account_id[\s\S]*?shipping\.id\s*=\s*p_shipping_id[\s\S]*?for\s+update/i,
    );

    assert.match(
      rpc,
      /v_shipping\.status\s*<>\s*'loaded'/i,
    );

    assert.match(
      rpc,
      /Manifest yalnızca yüklemesi tamamlanmış sevkiyat için oluşturulabilir\./,
    );
  },
);

test(
  "existing manifest set Shipping parent sonrasında FOR UPDATE kilitlenir",
  () => {
    const shippingLock =
      rpc.search(
        /from\s+public\.warehouse_shippings\s+as\s+shipping[\s\S]*?for\s+update/i,
      );

    const manifestLock =
      rpc.search(
        /perform\s+1\s+from\s+public\.warehouse_shipping_manifests[\s\S]*?account_id\s*=\s*p_account_id[\s\S]*?shipping_id\s*=\s*p_shipping_id[\s\S]*?for\s+update/i,
      );

    assert.ok(
      shippingLock >= 0,
    );

    assert.ok(
      manifestLock > shippingLock,
    );
  },
);

test(
  "cancelled ve rejected dışındaki existing manifest yeni manifest oluşturmayı engeller",
  () => {
    assert.match(
      rpc,
      /from\s+public\.warehouse_shipping_manifests[\s\S]*?account_id\s*=\s*p_account_id[\s\S]*?shipping_id\s*=\s*p_shipping_id[\s\S]*?status\s+not\s+in\s*\(\s*'cancelled'\s*,\s*'rejected'\s*\)/i,
    );

    assert.match(
      rpc,
      /Bu sevkiyat için aktif bir manifest zaten bulunmaktadır\./,
    );
  },
);

test(
  "manifest numarası server timestamp ve sequence ile MNF formatında üretilir",
  () => {
    assert.match(
      rpc,
      /v_now\s*:=\s*now\s*\(\s*\)/i,
    );

    assert.match(
      rpc,
      /'MNF-'\s*\|\|\s*to_char\s*\(\s*v_now\s+at\s+time\s+zone\s+'UTC'\s*,\s*'YYYYMMDD'\s*\)\s*\|\|\s*'-'\s*\|\|\s*lpad\s*\(\s*nextval\s*\(\s*'public\.warehouse_shipping_manifest_number_seq'::regclass\s*\)::text\s*,\s*6\s*,\s*'0'\s*\)/i,
    );

    assert.match(
      rpc,
      /exit\s+when\s+not\s+exists\s*\([\s\S]*?manifest_number\s*=\s*v_manifest_number/i,
    );
  },
);

test(
  "manifest insert draft packageCount zero packages boş ve Shipping snapshotlarını kullanır",
  () => {
    assert.match(
      rpc,
      /insert\s+into\s+public\.warehouse_shipping_manifests\s*\([\s\S]*?carrier_id[\s\S]*?service_level_id[\s\S]*?vehicle_id[\s\S]*?package_count[\s\S]*?packages[\s\S]*?created_by[\s\S]*?\)\s*values\s*\([\s\S]*?'draft'[\s\S]*?v_shipping\.carrier_id[\s\S]*?v_shipping\.service_level_id[\s\S]*?v_shipping\.vehicle_id[\s\S]*?0[\s\S]*?'\[\]'::jsonb[\s\S]*?v_user_id/i,
    );
  },
);

test(
  "manifest notes yalnız normalized inputtan yazılır",
  () => {
    assert.match(
      rpc,
      /insert\s+into\s+public\.warehouse_shipping_manifests[\s\S]*?\bnotes\b[\s\S]*?values\s*\([\s\S]*?v_normalized_notes/i,
    );

    assert.doesNotMatch(
      rpc,
      /\bnotes\s*=\s*p_notes\b/i,
    );
  },
);

test(
  "manifest created_by yalnız auth caller ve createdAt updatedAt aynı server timestamp kullanır",
  () => {
    assert.match(
      rpc,
      /created_by[\s\S]*?created_at[\s\S]*?updated_at[\s\S]*?\)\s*values\s*\([\s\S]*?v_user_id\s*,\s*v_now\s*,\s*v_now/i,
    );

    assert.doesNotMatch(
      rpc,
      /\bp_created_by\b/i,
    );
  },
);

test(
  "create_manifest mutation surface yalnız Shipping ledger ve manifest tablolarıdır",
  () => {
    const mutated = new Set(
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
        ...mutated,
      ].sort(),
      [
        "warehouse_shipping_manifests",
        "warehouse_shipping_write_requests",
      ],
    );
  },
);

test(
  "create_manifest Shipping parent item package task dock Packing Picking inventory downstream mutation yapmaz",
  () => {
    const forbidden = [
      "warehouse_shippings",
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
      "warehouse_shipping_asns",
      "warehouse_shipping_tracking_events",
      "warehouse_shipping_proofs_of_delivery",
    ];

    for (
      const table of forbidden
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
  "stable manifest response ledger completed sonucu olarak saklanır",
  () => {
    for (
      const key of [
        "ok",
        "action",
        "requestId",
        "shippingId",
        "manifestId",
        "manifestNumber",
        "status",
        "packageCount",
        "packages",
        "carrierId",
        "serviceLevelId",
        "vehicleId",
        "notes",
        "createdBy",
        "createdAt",
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
      /update\s+public\.warehouse_shipping_write_requests\s+set\s+response_payload\s*=\s*v_result\s*,\s*completed_at\s*=\s*v_now/i,
    );
  },
);

test(
  "create_manifest SECURITY DEFINER explicit search_path ve authenticated-only EXECUTE ACL kullanır",
  () => {
    assert.match(
      rpc,
      /security\s+definer/i,
    );

    assert.match(
      rpc,
      /set\s+search_path\s*=\s*public\s*,\s*pg_temp/i,
    );

    const signature =
      String.raw`warehouse_shipping_create_manifest_write\s*\(\s*uuid\s*,\s*uuid\s*,\s*uuid\s*,\s*text\s*\)`;

    for (
      const role of [
        "public",
        "anon",
        "authenticated",
      ]
    ) {
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
      /grant\s+(?:insert|update|delete|all)\s+on\s+(?:table\s+)?public\./i,
    );
  },
);

test(
  "ShippingService.createManifest exact loaded gate ve manifestService.create delegation davranışını korur",
  () => {
    assert.match(
      outerCreate,
      /input\s*:\s*\{[\s\S]*?tenantId\s*:\s*string[\s\S]*?shippingId\s*:\s*string[\s\S]*?notes\?\s*:\s*string[\s\S]*?createdBy\s*:\s*string/i,
    );

    assert.match(
      outerCreate,
      /shipping\.status\s*!==\s*"loaded"/,
    );

    assert.match(
      outerCreate,
      /this\.manifestService\.create\s*\(\s*\{/,
    );

    assert.match(
      outerCreate,
      /carrierId\s*:\s*shipping\.carrierId/,
    );

    assert.match(
      outerCreate,
      /serviceLevelId\s*:\s*shipping\.serviceLevelId/,
    );

    assert.match(
      outerCreate,
      /vehicleId\s*:\s*shipping\.vehicleId/,
    );

    assert.match(
      outerCreate,
      /input\.notes\?\.trim\s*\(\s*\)/,
    );

    assert.doesNotMatch(
      outerCreate,
      /this\.repository\./,
    );
  },
);

test(
  "ShippingManifestService.create active-manifest draft snapshot ve saveManifest davranışını korur",
  () => {
    assert.match(
      innerCreate,
      /validateCreateShippingManifest\s*\(/,
    );

    assert.match(
      innerCreate,
      /this\.repository\.findById\s*\(/,
    );

    assert.match(
      innerCreate,
      /this\.repository\.listManifests\s*\(/,
    );

    assert.match(
      innerCreate,
      /manifest\.status\s*!==\s*"cancelled"[\s\S]*?manifest\.status\s*!==\s*"rejected"/,
    );

    assert.match(
      innerCreate,
      /Bu sevkiyat için aktif bir manifest zaten bulunmaktadır\./,
    );

    assert.match(
      innerCreate,
      /this\.repository\.saveManifest\s*\(\s*\{[\s\S]*?status\s*:\s*"draft"[\s\S]*?packageCount\s*:\s*0[\s\S]*?packages\s*:\s*\[\]/,
    );

    assert.match(
      innerCreate,
      /this\.generateManifestNumber\s*\(\s*\)/,
    );
  },
);

test(
  "validateCreateShippingManifest required alanlar ve optional text normalization kontratını korur",
  () => {
    for (
      const field of [
        "carrierId",
        "serviceLevelId",
        "vehicleId",
        "notes",
      ]
    ) {
      assert.match(
        validatorCreate,
        new RegExp(
          `normalizeOptionalText\\s*\\(\\s*input\\.${field}\\s*,?\\s*\\)`,
          "i",
        ),
      );
    }

    assert.match(
      validatorCreate,
      /requireText\s*\(\s*input\.tenantId\s*,\s*"Firma kimliği"/,
    );

    assert.match(
      validatorCreate,
      /requireText\s*\(\s*input\.shippingId\s*,\s*"Sevkiyat kimliği"/,
    );

    assert.match(
      validatorCreate,
      /requireText\s*\(\s*input\.createdBy\s*,\s*"Oluşturan kullanıcı"/,
    );
  },
);

test(
  "Shipping manifest persistence create RPC için UUID actor lifecycle snapshot ve unique number kontratını destekler",
  () => {
    const required = [
      /\bid\s+uuid\s+primary\s+key/i,
      /\baccount_id\s+uuid\s+not\s+null/i,
      /\bshipping_id\s+uuid\s+not\s+null/i,
      /\bmanifest_number\s+text\s+not\s+null/i,
      /\bstatus\s+text\s+not\s+null\s+default\s+'draft'/i,
      /\bcarrier_id\s+uuid/i,
      /\bservice_level_id\s+uuid/i,
      /\bvehicle_id\s+uuid/i,
      /\bpackage_count\s+integer\s+not\s+null\s+default\s+0/i,
      /\bpackages\s+jsonb\s+not\s+null\s+default\s+'\[\]'::jsonb/i,
      /\bnotes\s+text/i,
      /\bcreated_by\s+uuid\s+not\s+null[\s\S]*?references\s+auth\.users\s*\(\s*id\s*\)/i,
      /unique\s*\(\s*account_id\s*,\s*manifest_number\s*\)/i,
    ];

    for (
      const pattern of required
    ) {
      assert.match(
        manifestDdl,
        pattern,
      );
    }

    for (
      const status of [
        "draft",
        "generated",
        "approved",
        "submitted",
        "accepted",
        "rejected",
        "cancelled",
      ]
    ) {
      assert.match(
        manifestDdl,
        new RegExp(
          `'${status}'`,
        ),
      );
    }

    assert.match(
      manifestType,
      /manifestNumber/,
    );

    assert.match(
      manifestType,
      /packageCount/,
    );

    assert.match(
      manifestType,
      /packages/,
    );
  },
);
