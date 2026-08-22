import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260822161000_warehouse_shipping_generate_manifest_write.sql";

const previousMigrationPath =
  "supabase/migrations/20260822160500_warehouse_shipping_create_manifest_write.sql";

const persistencePath =
  "supabase/migrations/20260819231500_warehouse_shipping_persistence.sql";

const shippingServicePath =
  "src/warehouse/services/ShippingService.ts";

const manifestServicePath =
  "src/warehouse/services/ShippingManifestService.ts";

const repositoryPath =
  "src/warehouse/services/SupabaseShippingRepository.ts";

const migration =
  fs.readFileSync(
    migrationPath,
    "utf8",
  );

const previousMigration =
  fs.readFileSync(
    previousMigrationPath,
    "utf8",
  );

const persistence =
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

const repository =
  fs.readFileSync(
    repositoryPath,
    "utf8",
  );

function extractFunction(
  source,
  marker,
  terminator,
) {
  const start =
    source.indexOf(
      marker,
    );

  assert.notEqual(
    start,
    -1,
    `marker bulunamadı: ${marker}`,
  );

  const end =
    source.indexOf(
      terminator,
      start,
    );

  assert.notEqual(
    end,
    -1,
    `terminator bulunamadı: ${terminator}`,
  );

  return source.slice(
    start,
    end +
      terminator.length,
  );
}

function extractMethod(
  source,
  marker,
  nextMarker,
) {
  const start =
    source.indexOf(
      marker,
    );

  assert.notEqual(
    start,
    -1,
    `method marker bulunamadı: ${marker}`,
  );

  const end =
    source.indexOf(
      nextMarker,
      start + marker.length,
    );

  assert.notEqual(
    end,
    -1,
    `next method marker bulunamadı: ${nextMarker}`,
  );

  return source.slice(
    start,
    end,
  );
}

const rpc =
  extractFunction(
    migration,
    "create or replace function\n  public.warehouse_shipping_generate_manifest_write(",
    "$warehouse_shipping_generate_manifest_write$;",
  );

const outerMethod =
  extractMethod(
    shippingService,
    "async generateManifest(",
    "async approveManifest(",
  );

const innerMethod =
  extractMethod(
    manifestService,
    "async generate(",
    "async approve(",
  );

function actionList(
  source,
) {
  const matches = [
    ...source.matchAll(
      /add\s+constraint\s+warehouse_shipping_write_requests_action_check[\s\S]*?check\s*\(\s*action\s+in\s*\(([\s\S]*?)\)\s*\)\s*;/gi,
    ),
  ];

  assert.ok(
    matches.length > 0,
    "Shipping ledger action constraint bulunamadı.",
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

function mutationTables(
  source,
) {
  return new Set(
    [
      ...source.matchAll(
        /\b(?:insert\s+into|update|delete\s+from)\s+public\.([a-z0-9_]+)/gi,
      ),
    ].map(
      (match) =>
        match[1].toLowerCase(),
    ),
  );
}

test(
  "Shipping ledger action allowlist generate_manifest ile exact yedi action içerir",
  () => {
    assert.deepEqual(
      actionList(
        migration,
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
      actionList(
        previousMigration,
      ),
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
  "generate_manifest RPC exact request account shipping manifest generatedBy parametrelerini taşır",
  () => {
    assert.match(
      migration,
      /warehouse_shipping_generate_manifest_write\s*\(\s*p_request_id\s+uuid\s*,\s*p_account_id\s+uuid\s*,\s*p_shipping_id\s+uuid\s*,\s*p_manifest_id\s+uuid\s*,\s*p_generated_by\s+text\s*\)\s*returns\s+jsonb/i,
    );

    assert.doesNotMatch(
      rpc,
      /\bp_created_by\b|\bp_generated_at\b|\bp_package_count\b|\bp_packages\b/i,
    );
  },
);

test(
  "generate_manifest caller auth.uid ve exact yedi account rolü ile korunur",
  () => {
    assert.match(
      rpc,
      /v_user_id\s+uuid\s*:=\s*auth\.uid\s*\(\s*\)/i,
    );

    const roleMatch =
      rpc.match(
        /warehouse_has_account_role\s*\(\s*p_account_id\s*,\s*array\s*\[([\s\S]*?)\]::text\[\]\s*\)/i,
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
        (match) =>
          match[1],
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
  "generate_manifest required UUID girdilerini ve generatedBy değerini fail closed doğrular",
  () => {
    for (
      const param
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
          `if\\s+${param}\\s+is\\s+null`,
          "i",
        ),
      );
    }

    assert.match(
      rpc,
      /v_generated_by\s*:=\s*nullif\s*\(\s*btrim\s*\(\s*coalesce\s*\(\s*p_generated_by\s*,\s*''\s*\)\s*\)\s*,\s*''\s*\)/i,
    );

    assert.match(
      rpc,
      /if\s+v_generated_by\s+is\s+null[\s\S]*?Manifesti oluşturan kullanıcı zorunludur\./i,
    );
  },
);

test(
  "generate_manifest canonical idempotency payload shipping manifest generatedBy bağlar",
  () => {
    assert.match(
      rpc,
      /v_payload\s*:=\s*jsonb_build_object\s*\(\s*'shippingId'\s*,\s*p_shipping_id\s*,\s*'manifestId'\s*,\s*p_manifest_id\s*,\s*'generatedBy'\s*,\s*v_generated_by\s*\)/i,
    );

    assert.match(
      rpc,
      /v_action\s+constant\s+text\s*:=\s*'generate_manifest'/i,
    );
  },
);

test(
  "generate_manifest idempotency user action payload replay collision ve in-flight ayrımını korur",
  () => {
    assert.match(
      rpc,
      /from\s+public\.warehouse_shipping_write_requests[\s\S]*?for\s+update/i,
    );

    assert.match(
      rpc,
      /insert\s+into\s+public\.warehouse_shipping_write_requests[\s\S]*?on\s+conflict\s*\(\s*account_id\s*,\s*request_id\s*\)\s*do\s+nothing/i,
    );

    assert.match(
      rpc,
      /v_existing\.user_id\s*<>\s*v_user_id[\s\S]*?errcode\s*=\s*'42501'/i,
    );

    assert.match(
      rpc,
      /v_existing\.action\s*<>\s*v_action[\s\S]*?v_existing\.request_payload\s*<>\s*v_payload[\s\S]*?errcode\s*=\s*'23505'/i,
    );

    assert.match(
      rpc,
      /v_existing\.completed_at\s+is\s+not\s+null[\s\S]*?v_existing\.response_payload\s+is\s+not\s+null[\s\S]*?return\s+v_existing\.response_payload/i,
    );

    assert.match(
      rpc,
      /Aynı sevkiyat isteği halen işleniyor\. Tekrar deneyin\.[\s\S]*?errcode\s*=\s*'40001'/i,
    );
  },
);

test(
  "generate_manifest Shipping varlığını doğrular ve hedef manifesti account shipping id ile FOR UPDATE kilitler",
  () => {
    assert.match(
      rpc,
      /from\s+public\.warehouse_shippings\s+as\s+shipping[\s\S]*?shipping\.account_id\s*=\s*p_account_id[\s\S]*?shipping\.id\s*=\s*p_shipping_id/i,
    );

    assert.match(
      rpc,
      /Sevkiyat kaydı bulunamadı:\s*%/i,
    );

    assert.match(
      rpc,
      /select\s+manifest\.\*\s+into\s+v_manifest\s+from\s+public\.warehouse_shipping_manifests\s+as\s+manifest[\s\S]*?manifest\.account_id\s*=\s*p_account_id[\s\S]*?manifest\.shipping_id\s*=\s*p_shipping_id[\s\S]*?manifest\.id\s*=\s*p_manifest_id[\s\S]*?for\s+update/i,
    );

    assert.match(
      rpc,
      /Manifest bulunamadı:\s*%/i,
    );
  },
);

test(
  "generate_manifest yalnız draft veya rejected manifest durumunu kabul eder",
  () => {
    assert.match(
      rpc,
      /v_manifest\.status\s+not\s+in\s*\(\s*'draft'\s*,\s*'rejected'\s*\)/i,
    );

    assert.match(
      rpc,
      /Yalnızca taslak veya reddedilmiş manifest yeniden oluşturulabilir\./i,
    );

    assert.doesNotMatch(
      rpc,
      /v_manifest\.status\s*(?:=|<>)\s*'loaded'/i,
    );
  },
);

test(
  "generate_manifest package setini manifest sonrasında loading_sequence sırasıyla FOR UPDATE kilitler ve boş seti engeller",
  () => {
    const manifestLock =
      rpc.search(
        /select\s+manifest\.\*[\s\S]*?for\s+update/i,
      );

    const packageLock =
      rpc.search(
        /perform\s+1\s+from\s+public\.warehouse_shipping_packages[\s\S]*?order\s+by\s+shipping_package\.loading_sequence[\s\S]*?for\s+update/i,
      );

    assert.ok(
      manifestLock >= 0,
    );

    assert.ok(
      packageLock > manifestLock,
    );

    assert.match(
      rpc,
      /Sevkiyat paketi bulunmadan manifest oluşturulamaz\./i,
    );
  },
);

test(
  "generate_manifest paketlerde yalnız pending ve cancelled durumlarını geçersiz sayar",
  () => {
    const statusMatch =
      rpc.match(
        /shipping_package\.status\s+in\s*\(([\s\S]*?)\)/i,
      );

    assert.ok(
      statusMatch,
    );

    assert.deepEqual(
      [
        ...statusMatch[1].matchAll(
          /'([^']+)'/g,
        ),
      ].map(
        (match) =>
          match[1],
      ),
      [
        "pending",
        "cancelled",
      ],
    );

    assert.match(
      rpc,
      /Bekleyen veya iptal edilmiş paketler manifeste eklenemez\./i,
    );

    assert.doesNotMatch(
      rpc,
      /shipping_package\.status\s*(?:=|<>)\s*'loaded'/i,
    );
  },
);

test(
  "generate_manifest package snapshot source helper ile aynı alanları üretir",
  () => {
    for (
      const pair
      of [
        [
          "shippingPackageId",
          "shipping_package.id",
        ],
        [
          "packageNumber",
          "shipping_package.package_number",
        ],
        [
          "sscc",
          "shipping_package.sscc",
        ],
        [
          "trackingNumber",
          "shipping_package.tracking_number",
        ],
        [
          "weight",
          "shipping_package.weight",
        ],
        [
          "volume",
          "shipping_package.volume",
        ],
      ]
    ) {
      const [
        jsonKey,
        sqlValue,
      ] = pair;

      assert.match(
        rpc,
        new RegExp(
          `'${jsonKey}'\\s*,\\s*${sqlValue.replaceAll(
            ".",
            "\\.",
          )}`,
          "i",
        ),
      );
    }

    assert.match(
      rpc,
      /jsonb_strip_nulls\s*\(\s*jsonb_build_object\s*\(/i,
    );

    const snapshotMatch =
      rpc.match(
        /jsonb_agg\s*\(\s*jsonb_strip_nulls\s*\(\s*jsonb_build_object\s*\(([\s\S]*?)\)\s*\)\s*order\s+by\s+shipping_package\.loading_sequence/i,
      );

    assert.ok(
      snapshotMatch,
    );

    assert.doesNotMatch(
      snapshotMatch[1],
      /'weightUnit'\s*,|'volumeUnit'\s*,/i,
    );
  },
);

test(
  "generate_manifest ağırlığı g ise kg dönüşümü yapar diğer durumda değeri korur",
  () => {
    assert.match(
      rpc,
      /when\s+shipping_package\.weight_unit\s*=\s*'g'\s+then\s+shipping_package\.weight\s*\/\s*1000\s+else\s+shipping_package\.weight/i,
    );

    assert.match(
      manifestService,
      /function\s+convertWeightToKg\s*\([\s\S]*?return\s+unit\s*===\s*"g"\s*\?\s*value\s*\/\s*1_000\s*:\s*value/i,
    );
  },
);

test(
  "generate_manifest hacmi m3 ise cm3 dönüşümü yapar diğer durumda değeri korur",
  () => {
    assert.match(
      rpc,
      /when\s+shipping_package\.volume_unit\s*=\s*'m3'\s+then\s+shipping_package\.volume\s*\*\s*1000000\s+else\s+shipping_package\.volume/i,
    );

    assert.match(
      manifestService,
      /function\s+convertVolumeToCm3\s*\([\s\S]*?return\s+unit\s*===\s*"m3"\s*\?\s*value\s*\*\s*1_000_000\s*:\s*value/i,
    );
  },
);

test(
  "generate_manifest total weight ve volume yalnız pozitifse overwrite eder aksi halde mevcut değeri korur",
  () => {
    assert.match(
      rpc,
      /total_weight\s*=\s*case\s+when\s+v_total_weight_kg\s*>\s*0\s+then\s+v_total_weight_kg\s+else\s+total_weight\s+end/i,
    );

    assert.match(
      rpc,
      /weight_unit\s*=\s*case\s+when\s+v_total_weight_kg\s*>\s*0\s+then\s+'kg'\s+else\s+weight_unit\s+end/i,
    );

    assert.match(
      rpc,
      /total_volume\s*=\s*case\s+when\s+v_total_volume_cm3\s*>\s*0\s+then\s+v_total_volume_cm3\s+else\s+total_volume\s+end/i,
    );

    assert.match(
      rpc,
      /volume_unit\s*=\s*case\s+when\s+v_total_volume_cm3\s*>\s*0\s+then\s+'cm3'\s+else\s+volume_unit\s+end/i,
    );

    assert.match(
      innerMethod,
      /totalWeightKg\s*>\s*0[\s\S]*?weightUnit\s*:\s*"kg"/i,
    );

    assert.match(
      innerMethod,
      /totalVolumeCm3\s*>\s*0[\s\S]*?volumeUnit\s*:\s*"cm3"/i,
    );
  },
);

test(
  "generate_manifest manifesti generated durumuna aynı server timestamp ve normalized generatedBy ile taşır",
  () => {
    assert.match(
      rpc,
      /v_now\s*:=\s*now\s*\(\s*\)/i,
    );

    assert.match(
      rpc,
      /update\s+public\.warehouse_shipping_manifests\s+set[\s\S]*?status\s*=\s*'generated'[\s\S]*?package_count\s*=\s*v_package_count[\s\S]*?packages\s*=\s*v_packages[\s\S]*?generated_by\s*=\s*v_generated_by[\s\S]*?generated_at\s*=\s*v_now[\s\S]*?updated_at\s*=\s*v_now/i,
    );
  },
);

test(
  "generate_manifest mutation surface yalnız Shipping ledger ve manifest tablolarıdır",
  () => {
    assert.deepEqual(
      [
        ...mutationTables(
          rpc,
        ),
      ].sort(),
      [
        "warehouse_shipping_manifests",
        "warehouse_shipping_write_requests",
      ],
    );
  },
);

test(
  "generate_manifest Shipping package item task dock Packing Picking inventory ASN tracking POD mutation yapmaz",
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
        "warehouse_packing_packages",
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
  "generate_manifest stable generated manifest response sonucunu ledger completed olarak saklar",
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
        "packageCount",
        "packages",
        "totalWeight",
        "totalVolume",
        "weightUnit",
        "volumeUnit",
        "generatedBy",
        "generatedAt",
        "updatedAt",
      ]
    ) {
      assert.match(
        rpc,
        new RegExp(
          `'${key}'\\s*,`,
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
  "generate_manifest SECURITY DEFINER explicit search_path ve authenticated-only EXECUTE ACL kullanır",
  () => {
    assert.match(
      migration,
      /security\s+definer/i,
    );

    assert.match(
      migration,
      /set\s+search_path\s*=\s*public\s*,\s*pg_temp/i,
    );

    const signature =
      String.raw`warehouse_shipping_generate_manifest_write\s*\(\s*uuid\s*,\s*uuid\s*,\s*uuid\s*,\s*uuid\s*,\s*text\s*\)`;

    for (
      const role
      of [
        "public",
        "anon",
        "authenticated",
      ]
    ) {
      assert.match(
        migration,
        new RegExp(
          `revoke\\s+all\\s+on\\s+function\\s+public\\.${signature}\\s+from\\s+${role}\\s*;`,
          "i",
        ),
      );
    }

    assert.match(
      migration,
      new RegExp(
        `grant\\s+execute\\s+on\\s+function\\s+public\\.${signature}\\s+to\\s+authenticated\\s*;`,
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
  "ShippingService.generateManifest exact dört inputu manifestService.generate çağrısına aktarır",
  () => {
    for (
      const token
      of [
        "tenantId: string;",
        "shippingId: string;",
        "manifestId: string;",
        "generatedBy: string;",
        "this.manifestService.generate({",
        "tenantId: input.tenantId",
        "shippingId: input.shippingId",
        "manifestId: input.manifestId",
        "generatedBy: input.generatedBy",
      ]
    ) {
      assert.ok(
        outerMethod.includes(
          token,
        ),
        `outer token eksik: ${token}`,
      );
    }

    assert.doesNotMatch(
      outerMethod,
      /this\.repository\./,
    );
  },
);

test(
  "ShippingManifestService.generate source durum package validation totals ve saveManifest davranışını korur",
  () => {
    assert.match(
      innerMethod,
      /manifest\.status\s*!==\s*"draft"\s*&&\s*manifest\.status\s*!==\s*"rejected"/,
    );

    assert.match(
      innerMethod,
      /requireText\s*\(\s*input\.generatedBy\s*,?\s*"Manifesti oluşturan kullanıcı"\s*,?\s*\)/,
    );

    assert.match(
      innerMethod,
      /this\.repository\.listPackages\s*\(\s*manifest\.tenantId\s*,\s*manifest\.shippingId\s*,?\s*\)/,
    );

    assert.match(
      innerMethod,
      /packages\.length\s*===\s*0/,
    );

    assert.match(
      innerMethod,
      /shippingPackage\.status\s*===\s*"pending"\s*\|\|\s*shippingPackage\.status\s*===\s*"cancelled"/s,
    );

    assert.match(
      innerMethod,
      /packages\.map\s*\(\s*buildManifestPackage\s*,?\s*\)/,
    );

    assert.match(
      innerMethod,
      /this\.repository\.saveManifest\s*\(\s*\{[\s\S]*?status\s*:\s*"generated"[\s\S]*?packageCount\s*:\s*manifestPackages\.length[\s\S]*?packages\s*:\s*manifestPackages[\s\S]*?generatedBy[\s\S]*?generatedAt\s*:\s*timestamp[\s\S]*?updatedAt\s*:\s*timestamp/,
    );
  },
);

test(
  "buildManifestPackage ve SQL snapshot aynı optional alan sözleşmesini korur",
  () => {
    const helperStart =
      manifestService.indexOf(
        "function buildManifestPackage(",
      );

    const helperEnd =
      manifestService.indexOf(
        "\n}",
        helperStart,
      );

    assert.notEqual(
      helperStart,
      -1,
    );

    assert.notEqual(
      helperEnd,
      -1,
    );

    const helper =
      manifestService.slice(
        helperStart,
        helperEnd + 2,
      );

    for (
      const field
      of [
        "shippingPackageId",
        "packageNumber",
        "sscc",
        "trackingNumber",
        "weight",
        "volume",
      ]
    ) {
      assert.ok(
        helper.includes(
          field,
        ),
        `helper field eksik: ${field}`,
      );
    }

    assert.doesNotMatch(
      helper,
      /weightUnit|volumeUnit/,
    );
  },
);

test(
  "Shipping persistence generate manifest için lifecycle package totals generated metadata alanlarını destekler",
  () => {
    for (
      const pattern
      of [
        /status\s+text\s+not\s+null\s+default\s+'draft'/i,
        /package_count\s+integer\s+not\s+null\s+default\s+0/i,
        /total_weight\s+numeric\(18,6\)/i,
        /total_volume\s+numeric\(18,6\)/i,
        /weight_unit\s+text/i,
        /volume_unit\s+text/i,
        /packages\s+jsonb\s+not\s+null\s+default\s+'\[\]'::jsonb/i,
        /generated_by\s+text/i,
        /generated_at\s+timestamptz/i,
        /updated_at\s+timestamptz\s+not\s+null\s+default\s+now\(\)/i,
      ]
    ) {
      assert.match(
        persistence,
        pattern,
      );
    }

    assert.match(
      persistence,
      /status\s+in\s*\([\s\S]*?'draft'[\s\S]*?'generated'[\s\S]*?'rejected'/i,
    );
  },
);

test(
  "Supabase Shipping package read modeli loading_sequence sırasını ve generate için gerekli alanları korur",
  () => {
    const listPackages =
      extractMethod(
        repository,
        "async listPackages(",
        "async listTasks(",
      );

    assert.match(
      listPackages,
      /PACKAGE_TABLE/,
    );

    assert.match(
      listPackages,
      /PACKAGE_SELECT/,
    );

    assert.match(
      listPackages,
      /tenantId/,
    );

    assert.match(
      listPackages,
      /shippingId/,
    );

    assert.match(
      listPackages,
      /"loading_sequence"/,
    );

    const mapper =
      extractMethod(
        repository,
        "function mapPackage(",
        "function mapException(",
      );

    for (
      const token
      of [
        "id: row.id",
        "packageNumber: row.package_number",
        "status: row.status",
        "loadingSequence: row.loading_sequence",
        "row.sscc",
        "row.tracking_number",
        "row.weight",
        "row.volume",
        "row.weight_unit",
        "row.volume_unit",
      ]
    ) {
      assert.ok(
        mapper.includes(
          token,
        ),
        `package mapper token eksik: ${token}`,
      );
    }
  },
);
