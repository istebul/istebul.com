import assert from "node:assert/strict";
import {
  createHash,
} from "node:crypto";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260822171000_warehouse_shipping_resolve_exception_write.sql";

const migration =
  readFileSync(
    migrationPath,
    "utf8",
  );

function normalize(value) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n+/g, "\n")
    .trim();
}

function sha256(fileName) {
  return createHash("sha256")
    .update(
      readFileSync(fileName),
    )
    .digest("hex");
}

function extractFunction() {
  const match =
    migration.match(
      /create\s+or\s+replace\s+function\s+public\.warehouse_shipping_resolve_exception_write\s*\(([\s\S]*?)\)\s*returns\s+jsonb([\s\S]*?)\$warehouse_shipping_resolve_exception_write\$;/i,
    );

  assert.ok(
    match,
    "resolve_exception RPC bulunamadı",
  );

  return {
    params: match[1],
    body: match[2],
  };
}

function extractJsonKeys(variableName) {
  const pattern =
    new RegExp(
      `${variableName}\\s*:=\\s*jsonb_build_object\\s*\\(([\\s\\S]*?)\\n\\s*\\);`,
      "i",
    );

  const match =
    migration.match(pattern);

  assert.ok(
    match,
    `${variableName} jsonb_build_object bulunamadı`,
  );

  return [
    ...match[1].matchAll(
      /^\s*'([^']+)'\s*,/gm,
    ),
  ].map(
    (entry) => entry[1],
  );
}

test(
  "ledger allowlist exact 19 Shipping actions içerir",
  () => {
    const match =
      migration.match(
        /warehouse_shipping_write_requests_action_check[\s\S]*?check\s*\(\s*action\s+in\s*\(([\s\S]*?)\)\s*\)/i,
      );

    assert.ok(match);

    const actions = [
      ...match[1].matchAll(
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
        "create_exception",
        "resolve_exception",
      ],
    );
  },
);

test(
  "RPC exact altı parametreye sahiptir ve default kullanmaz",
  () => {
    const { params } =
      extractFunction();

    const parsed = [
      ...params.matchAll(
        /\b(p_[a-z0-9_]+)\s+(uuid|text)\b/gi,
      ),
    ].map(
      (entry) => [
        entry[1],
        entry[2].toLowerCase(),
      ],
    );

    assert.deepEqual(
      parsed,
      [
        ["p_request_id", "uuid"],
        ["p_account_id", "uuid"],
        ["p_shipping_id", "uuid"],
        ["p_exception_id", "uuid"],
        ["p_resolved_by", "text"],
        ["p_resolution_notes", "text"],
      ],
    );

    assert.doesNotMatch(
      params,
      /\bdefault\b|:=/i,
    );
  },
);

test(
  "RPC SECURITY DEFINER ve explicit search_path kullanır",
  () => {
    const normalized =
      normalize(migration);

    assert.match(
      normalized,
      /returns\s+jsonb\s+language\s+plpgsql\s+security\s+definer\s+set\s+search_path\s*=\s*public\s*,\s*pg_temp/i,
    );
  },
);

test(
  "auth.uid ve exact yedi Shipping rolü kullanılır",
  () => {
    assert.match(
      migration,
      /v_user_id\s+uuid\s*:=\s*auth\.uid\(\)/i,
    );

    const match =
      migration.match(
        /warehouse_has_account_role\s*\(\s*p_account_id\s*,\s*array\s*\[([\s\S]*?)\]\s*::text\[\]/i,
      );

    assert.ok(match);

    const roles = [
      ...match[1].matchAll(
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
  "zorunlu UUID girdileri fail-closed doğrulanır",
  () => {
    const expected = [
      [
        "p_request_id",
        "İstek kimliği zorunludur.",
      ],
      [
        "p_account_id",
        "Firma kimliği zorunludur.",
      ],
      [
        "p_shipping_id",
        "Sevkiyat kimliği zorunludur.",
      ],
      [
        "p_exception_id",
        "Sevkiyat istisnası kimliği zorunludur.",
      ],
    ];

    for (
      const [field, message]
      of expected
    ) {
      assert.match(
        migration,
        new RegExp(
          `if\\s+${field}\\s+is\\s+null\\s+then[\\s\\S]*?${message.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?22023`,
          "i",
        ),
      );
    }
  },
);

test(
  "resolvedBy trim edilir ve exact boş hata verir",
  () => {
    assert.match(
      migration,
      /v_resolved_by\s*:=\s*nullif\s*\(\s*btrim\s*\(\s*p_resolved_by\s*\)\s*,\s*''\s*\)/i,
    );

    assert.match(
      migration,
      /İstisnayı çözen kullanıcı boş bırakılamaz\./,
    );
  },
);

test(
  "resolutionNotes trim edilir ve exact boş hata verir",
  () => {
    assert.match(
      migration,
      /v_resolution_notes\s*:=\s*nullif\s*\(\s*btrim\s*\(\s*p_resolution_notes\s*\)\s*,\s*''\s*\)/i,
    );

    assert.match(
      migration,
      /Çözüm açıklaması boş bırakılamaz\./,
    );
  },
);

test(
  "canonical idempotency payload exact dört anahtardır",
  () => {
    assert.deepEqual(
      extractJsonKeys("v_payload"),
      [
        "shippingId",
        "exceptionId",
        "resolvedBy",
        "resolutionNotes",
      ],
    );

    assert.match(
      migration,
      /'shippingId'\s*,\s*p_shipping_id[\s\S]*?'exceptionId'\s*,\s*p_exception_id[\s\S]*?'resolvedBy'\s*,\s*v_resolved_by[\s\S]*?'resolutionNotes'\s*,\s*v_resolution_notes/i,
    );
  },
);

test(
  "ilk ledger okuması account/request scoped FOR UPDATE kullanır",
  () => {
    assert.match(
      migration,
      /select\s+request\.\*\s+into\s+v_existing\s+from\s+public\.warehouse_shipping_write_requests\s+as\s+request\s+where\s+request\.account_id\s*=\s*p_account_id\s+and\s+request\.request_id\s*=\s*p_request_id\s+for\s+update/i,
    );
  },
);

test(
  "idempotency duplicate ve concurrency mesajları precedent parity taşır",
  () => {
    const expected = new Map([
      [
        "Aynı istek kimliği farklı bir kullanıcı tarafından kullanılamaz.",
        2,
      ],
      [
        "Aynı istek kimliği farklı bir sevkiyat işlemi için kullanılamaz.",
        2,
      ],
      [
        "Aynı sevkiyat isteği halen işleniyor. Tekrar deneyin.",
        2,
      ],
      [
        "Aynı sevkiyat isteği eşzamanlı olarak değişti. Tekrar deneyin.",
        1,
      ],
      [
        "Sevkiyat istek sonucu eşzamanlı olarak değişti. Tekrar deneyin.",
        1,
      ],
    ]);

    for (
      const [message, count]
      of expected
    ) {
      assert.equal(
        migration.split(message).length - 1,
        count,
        message,
      );
    }
  },
);

test(
  "insert-race ledger reread parity korunur",
  () => {
    assert.match(
      migration,
      /on\s+conflict\s*\(\s*account_id\s*,\s*request_id\s*\)\s*do\s+nothing[\s\S]*?get\s+diagnostics\s+v_inserted\s*=\s*row_count[\s\S]*?if\s+v_inserted\s*=\s*0\s+then[\s\S]*?select\s+request\.\*[\s\S]*?for\s+update/i,
    );

    assert.match(
      migration,
      /if\s+not\s+found\s+then\s+raise\s+exception\s+'Aynı sevkiyat isteği eşzamanlı olarak değişti\. Tekrar deneyin\.'/i,
    );
  },
);

test(
  "Shipping parent account-scoped existence read ile doğrulanır",
  () => {
    assert.match(
      migration,
      /select\s+shipping\.\*\s+into\s+v_shipping\s+from\s+public\.warehouse_shippings\s+as\s+shipping\s+where\s+shipping\.account_id\s*=\s*p_account_id\s+and\s+shipping\.id\s*=\s*p_shipping_id\s+for\s+update/i,
    );

    assert.match(
      migration,
      /Sevkiyat kaydı bulunamadı: %/,
    );
  },
);

test(
  "resolveException için Shipping status gate yoktur",
  () => {
    const { body } =
      extractFunction();

    assert.doesNotMatch(
      body,
      /\bv_shipping\.status\b|\bshipping\.status\b/i,
    );

    assert.doesNotMatch(
      body,
      /warehouse_shipping_status/i,
    );
  },
);

test(
  "target exception account shipping id scoped FOR UPDATE ile kilitlenir",
  () => {
    assert.match(
      migration,
      /select\s+shipping_exception\.\*\s+into\s+v_exception\s+from\s+public\.warehouse_shipping_exceptions\s+as\s+shipping_exception\s+where\s+shipping_exception\.account_id\s*=\s*p_account_id\s+and\s+shipping_exception\.shipping_id\s*=\s*p_shipping_id\s+and\s+shipping_exception\.id\s*=\s*p_exception_id\s+for\s+update/i,
    );
  },
);

test(
  "eksik exception exact source hata semantiğini taşır",
  () => {
    assert.match(
      migration,
      /Sevkiyat istisnası bulunamadı: %/,
    );

    assert.match(
      migration,
      /p_exception_id\s+using\s+errcode\s*=\s*'P0002'/i,
    );
  },
);

test(
  "daha önce çözülmüş exception exact source hatasıyla reddedilir",
  () => {
    assert.match(
      migration,
      /if\s+v_exception\.resolved\s+then[\s\S]*?'Sevkiyat istisnası daha önce çözülmüş\.'/i,
    );
  },
);

test(
  "exception update exact dört resolution alanını yazar",
  () => {
    const match =
      migration.match(
        /update\s+public\.warehouse_shipping_exceptions\s+set([\s\S]*?)where\s+account_id\s*=\s*p_account_id/i,
      );

    assert.ok(match);

    const setBlock =
      normalize(match[1]);

    assert.match(
      setBlock,
      /^resolved\s*=\s*true\s*,\s*resolved_by\s*=\s*v_resolved_by\s*,\s*resolved_at\s*=\s*v_now\s*,\s*resolution_notes\s*=\s*v_resolution_notes$/i,
    );
  },
);

test(
  "exception update exact resolved=false CAS kullanır",
  () => {
    assert.match(
      migration,
      /update\s+public\.warehouse_shipping_exceptions[\s\S]*?where\s+account_id\s*=\s*p_account_id\s+and\s+shipping_id\s*=\s*p_shipping_id\s+and\s+id\s*=\s*p_exception_id\s+and\s+resolved\s*=\s*false\s+returning\s+\*\s+into\s+v_exception/i,
    );

    assert.match(
      migration,
      /Sevkiyat istisnası eşzamanlı olarak değişti\. Tekrar deneyin\./,
    );
  },
);

test(
  "exact bir lifecycle now timestamp kullanılır",
  () => {
    const occurrences = [
      ...migration.matchAll(
        /\bnow\s*\(\s*\)/gi,
      ),
    ];

    assert.equal(
      occurrences.length,
      1,
    );

    assert.match(
      migration,
      /v_now\s*:=\s*now\s*\(\s*\)/i,
    );

    assert.match(
      migration,
      /resolved_at\s*=\s*v_now/i,
    );

    assert.match(
      migration,
      /completed_at\s*=\s*v_now/i,
    );
  },
);

test(
  "runtime mutation surface exact ledger ve exception tablolarıdır",
  () => {
    const tables = new Set();

    for (
      const entry
      of migration.matchAll(
        /\binsert\s+into\s+(?:public\.)?([a-z0-9_]+)/gi,
      )
    ) {
      tables.add(entry[1]);
    }

    for (
      const entry
      of migration.matchAll(
        /\bupdate\s+(?:public\.)?([a-z0-9_]+)/gi,
      )
    ) {
      tables.add(entry[1]);
    }

    for (
      const entry
      of migration.matchAll(
        /\bdelete\s+from\s+(?:public\.)?([a-z0-9_]+)/gi,
      )
    ) {
      tables.add(entry[1]);
    }

    assert.deepEqual(
      [...tables].sort(),
      [
        "warehouse_shipping_exceptions",
        "warehouse_shipping_write_requests",
      ],
    );
  },
);

test(
  "Shipping parent item package tablolarına runtime write yoktur",
  () => {
    const forbidden = [
      "warehouse_shippings",
      "warehouse_shipping_items",
      "warehouse_shipping_packages",
    ];

    for (const tableName of forbidden) {
      assert.doesNotMatch(
        migration,
        new RegExp(
          `(?:insert\\s+into|update|delete\\s+from)\\s+(?:public\\.)?${tableName}\\b`,
          "i",
        ),
      );
    }
  },
);

test(
  "tracking POD task manifest ASN tablolarına runtime write yoktur",
  () => {
    const forbidden = [
      "warehouse_shipping_tracking_events",
      "warehouse_shipping_proofs_of_delivery",
      "warehouse_shipping_tasks",
      "warehouse_shipping_manifests",
      "warehouse_shipping_asns",
    ];

    for (const tableName of forbidden) {
      assert.doesNotMatch(
        migration,
        new RegExp(
          `(?:insert\\s+into|update|delete\\s+from)\\s+(?:public\\.)?${tableName}\\b`,
          "i",
        ),
      );
    }
  },
);

test(
  "dock vehicle carrier Packing Picking inventory runtime write yoktur",
  () => {
    const forbidden = [
      "warehouse_shipping_docks",
      "warehouse_shipping_vehicles",
      "warehouse_shipping_carriers",
      "warehouse_packing",
      "warehouse_pickings",
      "inventory",
    ];

    for (const tableName of forbidden) {
      assert.doesNotMatch(
        migration,
        new RegExp(
          `(?:insert\\s+into|update|delete\\s+from)\\s+(?:public\\.)?${tableName}\\b`,
          "i",
        ),
      );
    }
  },
);

test(
  "stable response exact 20 anahtarı exact sırada taşır",
  () => {
    assert.deepEqual(
      extractJsonKeys("v_result"),
      [
        "ok",
        "action",
        "requestId",
        "shippingExceptionId",
        "shippingId",
        "shippingItemId",
        "shippingPackageId",
        "taskId",
        "manifestId",
        "type",
        "message",
        "warehouseId",
        "dockId",
        "vehicleId",
        "carrierId",
        "resolved",
        "resolvedBy",
        "resolvedAt",
        "resolutionNotes",
        "createdAt",
      ],
    );
  },
);

test(
  "response untouched exception alanlarını persisted v_exception üzerinden korur",
  () => {
    const expectedMappings = [
      ["shippingExceptionId", "v_exception.id"],
      ["shippingId", "v_exception.shipping_id"],
      ["shippingItemId", "v_exception.shipping_item_id"],
      ["shippingPackageId", "v_exception.shipping_package_id"],
      ["taskId", "v_exception.task_id"],
      ["manifestId", "v_exception.manifest_id"],
      ["type", "v_exception.type"],
      ["message", "v_exception.message"],
      ["warehouseId", "v_exception.warehouse_id"],
      ["dockId", "v_exception.dock_id"],
      ["vehicleId", "v_exception.vehicle_id"],
      ["carrierId", "v_exception.carrier_id"],
      ["resolved", "v_exception.resolved"],
      ["resolvedBy", "v_exception.resolved_by"],
      ["resolvedAt", "v_exception.resolved_at"],
      ["resolutionNotes", "v_exception.resolution_notes"],
      ["createdAt", "v_exception.created_at"],
    ];

    for (
      const [key, value]
      of expectedMappings
    ) {
      assert.match(
        migration,
        new RegExp(
          `'${key}'\\s*,\\s*${value.replace(/\./g, "\\.")}`,
          "i",
        ),
      );
    }
  },
);

test(
  "completed ledger sonucu exact CAS ile yazılır",
  () => {
    assert.match(
      migration,
      /update\s+public\.warehouse_shipping_write_requests\s+set\s+response_payload\s*=\s*v_result\s*,\s*completed_at\s*=\s*v_now\s+where\s+account_id\s*=\s*p_account_id\s+and\s+request_id\s*=\s*p_request_id\s+and\s+user_id\s*=\s*v_user_id\s+and\s+action\s*=\s*v_action\s+and\s+request_payload\s+is\s+not\s+distinct\s+from\s+v_payload\s+and\s+completed_at\s+is\s+null\s+and\s+response_payload\s+is\s+null/i,
    );

    assert.match(
      migration,
      /get\s+diagnostics\s+v_ledger_updated\s*=\s*row_count/i,
    );

    assert.match(
      migration,
      /if\s+v_ledger_updated\s*<>\s*1\s+then[\s\S]*?'Sevkiyat istek sonucu eşzamanlı olarak değişti\. Tekrar deneyin\.'/i,
    );
  },
);

test(
  "RPC ACL authenticated-only execute modelini taşır",
  () => {
    const signature =
      String.raw`public\.warehouse_shipping_resolve_exception_write\s*\(\s*uuid\s*,\s*uuid\s*,\s*uuid\s*,\s*uuid\s*,\s*text\s*,\s*text\s*\)`;

    assert.match(
      migration,
      new RegExp(
        `revoke\\s+all\\s+on\\s+function\\s+${signature}\\s+from\\s+public`,
        "i",
      ),
    );

    assert.match(
      migration,
      new RegExp(
        `revoke\\s+all\\s+on\\s+function\\s+${signature}\\s+from\\s+anon`,
        "i",
      ),
    );

    assert.match(
      migration,
      new RegExp(
        `revoke\\s+all\\s+on\\s+function\\s+${signature}\\s+from\\s+authenticated`,
        "i",
      ),
    );

    assert.match(
      migration,
      new RegExp(
        `grant\\s+execute\\s+on\\s+function\\s+${signature}\\s+to\\s+authenticated`,
        "i",
      ),
    );
  },
);

test(
  "direct table write grant ve service_role surface yoktur",
  () => {
    assert.doesNotMatch(
      migration,
      /\bgrant\s+(?:insert|update|delete|all)\s+on\s+(?:table\s+)?public\.warehouse_shipping_/i,
    );

    assert.doesNotMatch(
      migration,
      /\bservice_role\b/i,
    );
  },
);

test(
  "source authority SHA256 freeze exact kalır",
  () => {
    const expected = new Map([
      [
        "src/warehouse/services/ShippingService.ts",
        "e320382e8da52d1e04da74e7e4d7bdd602f2859321f2f4c6263f8944f3ac106c",
      ],
      [
        "src/warehouse/services/ShippingValidator.ts",
        "fd66d3d2620166cb74acd0c2d2c489665c00cbcc1bfc6105dc72bef2dce406a7",
      ],
      [
        "src/warehouse/types/ShippingException.ts",
        "e146d43f42d8edb1ba252b8b39420460cc987ad14d018a707c6eac2c792ae9a6",
      ],
      [
        "src/warehouse/services/ShippingRepository.ts",
        "6baaeeafa697af51a9cf1241fb246343ed6e61526cd56a95efbe91aeca77d2e5",
      ],
      [
        "src/warehouse/services/SupabaseShippingRepository.ts",
        "ca374ab7f9b1126a13340bd31d9ebac1092cadea6a42f77128e8786142f0ec7d",
      ],
      [
        "src/warehouse/services/InMemoryShippingRepository.ts",
        "5284b9a1fd83757b4cfd8603c45f274cbb05ac3ffe2606ed54293b71c20f3b54",
      ],
      [
        "supabase/migrations/20260819231500_warehouse_shipping_persistence.sql",
        "208761ae13c9956ba0a7a8e8b1363b3e71f22adeb236f8545ad61244f0226834",
      ],
      [
        "tests/unit/warehouse-shipping-engine.test.mjs",
        "71a3fd9a158753cd7976cdb673cb3a0feb16b35ae93082ca429d2eb944ef2bdb",
      ],
      [
        "supabase/migrations/20260822170500_warehouse_shipping_create_exception_write.sql",
        "e3bce5cf87864147ed03b4a457c7b066ce7191f16134d789e966fb1a4dd3ee72",
      ],
      [
        "tests/unit/warehouse-shipping-create-exception-security.test.mjs",
        "53d5bfba30f07b369d12e6bbc9140f55eb30c63779d01ac2d6dc5dc7b97d78fb",
      ],
    ]);

    for (
      const [fileName, expectedSha]
      of expected
    ) {
      assert.equal(
        sha256(fileName),
        expectedSha,
        fileName,
      );
    }
  },
);
