import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260822170500_warehouse_shipping_create_exception_write.sql";

const sql =
  fs.readFileSync(
    migrationPath,
    "utf8",
  );

const normalized =
  sql.replace(/\s+/g, " ");

function sha256(filePath) {
  return crypto
    .createHash("sha256")
    .update(
      fs.readFileSync(filePath),
    )
    .digest("hex");
}

function extractFunctionSignature() {
  const marker =
    "public.warehouse_shipping_create_exception_write";

  const nameIndex =
    sql.indexOf(marker);

  assert.notEqual(
    nameIndex,
    -1,
  );

  const open =
    sql.indexOf(
      "(",
      nameIndex,
    );

  assert.notEqual(
    open,
    -1,
  );

  let depth = 0;
  let close = -1;

  for (
    let index = open;
    index < sql.length;
    index += 1
  ) {
    if (sql[index] === "(") {
      depth += 1;
    } else if (
      sql[index] === ")"
    ) {
      depth -= 1;

      if (depth === 0) {
        close = index;
        break;
      }
    }
  }

  assert.notEqual(
    close,
    -1,
  );

  return sql
    .slice(
      open + 1,
      close,
    )
    .split(",")
    .map((entry) =>
      entry
        .trim()
        .replace(/\s+/g, " "),
    )
    .filter(Boolean);
}

function extractLedgerActions() {
  const match =
    sql.match(
      /warehouse_shipping_write_requests_action_check[\s\S]*?check\s*\(\s*action\s+in\s*\(([\s\S]*?)\)\s*\)/i,
    );

  assert.ok(match);

  return [
    ...match[1]
      .matchAll(
        /'([a-z0-9_]+)'/g,
      ),
  ].map(
    (entry) => entry[1],
  );
}

function extractJsonKeys(
  variableName,
) {
  const regex =
    new RegExp(
      `${variableName}\\s*:=\\s*jsonb_build_object\\s*\\(([\\s\\S]*?)\\n\\s*\\);`,
      "i",
    );

  const match =
    sql.match(regex);

  assert.ok(
    match,
    `${variableName} JSON block bulunamadı.`,
  );

  return [
    ...match[1].matchAll(
      /'([A-Za-z0-9_]+)'\s*,/g,
    ),
  ].map(
    (entry) => entry[1],
  );
}

test(
  "01 create_exception ledger exact 18 actions",
  () => {
    const actions =
      extractLedgerActions();

    assert.equal(
      actions.length,
      18,
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
      ],
    );
  },
);

test(
  "02 create_exception RPC exact twelve parameter signature",
  () => {
    assert.deepEqual(
      extractFunctionSignature(),
      [
        "p_request_id uuid",
        "p_account_id uuid",
        "p_shipping_id uuid",
        "p_type text",
        "p_message text",
        "p_shipping_item_id uuid",
        "p_shipping_package_id uuid",
        "p_task_id uuid",
        "p_manifest_id uuid",
        "p_dock_id uuid",
        "p_vehicle_id uuid",
        "p_carrier_id uuid",
      ],
    );
  },
);

test(
  "03 create_exception named dollar tag security definer search path",
  () => {
    assert.match(
      sql,
      /security\s+definer/i,
    );

    assert.match(
      sql,
      /set\s+search_path\s*=\s*public\s*,\s*pg_temp/i,
    );

    assert.equal(
      (
        sql.match(
          /\$warehouse_shipping_create_exception_write\$/g,
        ) ?? []
      ).length,
      2,
    );
  },
);

test(
  "04 create_exception auth uid exact seven Shipping roles",
  () => {
    assert.match(
      sql,
      /v_user_id\s+uuid\s*:=\s*auth\.uid\s*\(\s*\)/i,
    );

    const roleMatch =
      sql.match(
        /warehouse_has_account_role\s*\([\s\S]*?array\s*\[([\s\S]*?)\]\s*::text\[\]/i,
      );

    assert.ok(roleMatch);

    const roles = [
      ...roleMatch[1]
        .matchAll(
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
  "05 create_exception required request account shipping UUIDs fail closed",
  () => {
    for (
      const param of [
        "p_request_id",
        "p_account_id",
        "p_shipping_id",
      ]
    ) {
      assert.match(
        normalized,
        new RegExp(
          `if ${param} is null then`,
          "i",
        ),
      );
    }
  },
);

test(
  "06 exception type runtime allowlist exact twenty five source values",
  () => {
    const typeGate =
      sql.match(
        /p_type\s+not\s+in\s*\(([\s\S]*?)\)\s*then/i,
      );

    assert.ok(typeGate);

    const values = [
      ...typeGate[1]
        .matchAll(
          /'([a-z0-9_]+)'/g,
        ),
    ].map(
      (entry) => entry[1],
    );

    assert.deepEqual(
      values,
      [
        "package_missing",
        "package_excess",
        "package_damaged",
        "package_not_ready",
        "package_label_missing",
        "package_sscc_mismatch",
        "weight_mismatch",
        "volume_exceeded",
        "vehicle_capacity_exceeded",
        "vehicle_not_available",
        "driver_not_available",
        "carrier_not_available",
        "carrier_service_unavailable",
        "dock_not_available",
        "dock_assignment_conflict",
        "loading_sequence_error",
        "manifest_mismatch",
        "asn_generation_failed",
        "tracking_number_missing",
        "temperature_mismatch",
        "hazardous_material_mismatch",
        "address_invalid",
        "dispatch_blocked",
        "delivery_failed",
        "proof_of_delivery_missing",
      ],
    );
  },
);

test(
  "07 message mirrors requireText trim semantics and exact source error",
  () => {
    assert.match(
      normalized,
      /v_message := nullif\( btrim\(p_message\), '' \)/i,
    );

    assert.match(
      sql,
      /Sevkiyat istisnası açıklaması boş bırakılamaz\./,
    );
  },
);

test(
  "08 canonical idempotency payload exact ten domain keys",
  () => {
    assert.deepEqual(
      extractJsonKeys(
        "v_payload",
      ),
      [
        "shippingId",
        "type",
        "message",
        "shippingItemId",
        "shippingPackageId",
        "taskId",
        "manifestId",
        "dockId",
        "vehicleId",
        "carrierId",
      ],
    );
  },
);

test(
  "09 idempotency first reads existing request FOR UPDATE",
  () => {
    assert.match(
      normalized,
      /select request\.\* into v_existing from public\.warehouse_shipping_write_requests as request where request\.account_id = p_account_id and request\.request_id = p_request_id for update;/i,
    );
  },
);

test(
  "10 branch accurate idempotency duplicate messages match precedent",
  () => {
    const expectations = [
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
    ];

    for (
      const [
        message,
        expected,
      ] of expectations
    ) {
      assert.equal(
        sql.split(message).length - 1,
        expected,
        message,
      );
    }
  },
);

test(
  "11 idempotency insert uses account request conflict do nothing and reread",
  () => {
    assert.match(
      normalized,
      /insert into public\.warehouse_shipping_write_requests \( account_id, request_id, user_id, action, request_payload \) values \( p_account_id, p_request_id, v_user_id, v_action, v_payload \) on conflict \( account_id, request_id \) do nothing;/i,
    );

    assert.match(
      normalized,
      /if v_inserted = 0 then select request\.\* into v_existing from public\.warehouse_shipping_write_requests/i,
    );
  },
);

test(
  "12 Shipping parent is account scoped and FOR UPDATE",
  () => {
    assert.match(
      normalized,
      /select shipping\.\* into v_shipping from public\.warehouse_shippings as shipping where shipping\.account_id = p_account_id and shipping\.id = p_shipping_id for update;/i,
    );

    assert.match(
      sql,
      /Sevkiyat bulunamadı\./,
    );
  },
);

test(
  "13 createException adds no Shipping status gate",
  () => {
    assert.doesNotMatch(
      sql,
      /v_shipping\.status/i,
    );

    assert.doesNotMatch(
      sql,
      /shipping\.status\s+(?:=|<>|in|not\s+in)/i,
    );
  },
);

test(
  "14 optional shipping item membership gate mirrors source",
  () => {
    assert.match(
      normalized,
      /if p_shipping_item_id is not null then perform 1 from public\.warehouse_shipping_items as item where item\.account_id = p_account_id and item\.shipping_id = p_shipping_id and item\.id = p_shipping_item_id;/i,
    );

    assert.match(
      sql,
      /İstisnaya bağlı sevkiyat satırı bulunamadı\./,
    );
  },
);

test(
  "15 optional shipping package membership gate mirrors source",
  () => {
    assert.match(
      normalized,
      /if p_shipping_package_id is not null then perform 1 from public\.warehouse_shipping_packages as package where package\.account_id = p_account_id and package\.shipping_id = p_shipping_id and package\.id = p_shipping_package_id;/i,
    );

    assert.match(
      sql,
      /İstisnaya bağlı sevkiyat paketi bulunamadı\./,
    );
  },
);

test(
  "16 task manifest dock vehicle carrier get no extra source service gate",
  () => {
    for (
      const table of [
        "warehouse_shipping_tasks",
        "warehouse_shipping_manifests",
        "warehouse_shipping_docks",
        "warehouse_shipping_vehicles",
        "warehouse_shipping_carriers",
      ]
    ) {
      assert.doesNotMatch(
        sql,
        new RegExp(
          `from\\s+public\\.${table}`,
          "i",
        ),
      );
    }
  },
);

test(
  "17 exception insert exact source persistence fields",
  () => {
    const insert =
      sql.match(
        /insert\s+into\s+public\.warehouse_shipping_exceptions\s*\(([\s\S]*?)\)\s*values\s*\(([\s\S]*?)\)\s*returning\s+\*/i,
      );

    assert.ok(insert);

    const columns =
      insert[1]
        .split(",")
        .map(
          (value) =>
            value
              .trim()
              .replace(/\s+/g, " "),
        );

    assert.deepEqual(
      columns,
      [
        "id",
        "account_id",
        "shipping_id",
        "shipping_item_id",
        "shipping_package_id",
        "task_id",
        "manifest_id",
        "type",
        "message",
        "warehouse_id",
        "dock_id",
        "vehicle_id",
        "carrier_id",
        "resolved",
        "created_at",
      ],
    );
  },
);

test(
  "18 warehouseId derives from Shipping parent",
  () => {
    assert.match(
      normalized,
      /p_type, v_message, v_shipping\.warehouse_id, p_dock_id/i,
    );
  },
);

test(
  "19 exception is created unresolved without invented resolution metadata",
  () => {
    const insertRegion =
      sql.match(
        /insert\s+into\s+public\.warehouse_shipping_exceptions[\s\S]*?returning\s+\*\s*into\s+v_exception;/i,
      )?.[0];

    assert.ok(
      insertRegion,
    );

    assert.match(
      insertRegion,
      /\bfalse\b/i,
    );

    assert.doesNotMatch(
      insertRegion,
      /resolved_by/i,
    );

    assert.doesNotMatch(
      insertRegion,
      /resolved_at/i,
    );

    assert.doesNotMatch(
      insertRegion,
      /resolution_notes/i,
    );
  },
);

test(
  "20 creation lifecycle uses one server timestamp",
  () => {
    assert.equal(
      (
        sql.match(
          /\bv_now\s*:=\s*now\s*\(\s*\)\s*;/gi,
        ) ?? []
      ).length,
      1,
    );

    assert.match(
      normalized,
      /false, v_now \) returning \* into v_exception;/i,
    );

    assert.match(
      normalized,
      /completed_at = v_now/i,
    );
  },
);

test(
  "21 mutation surface exact ledger and exception tables",
  () => {
    const mutationTables =
      new Set();

    for (
      const match of sql.matchAll(
        /\b(?:insert\s+into|update|delete\s+from)\s+public\.([a-z0-9_]+)/gi,
      )
    ) {
      mutationTables.add(
        match[1],
      );
    }

    assert.deepEqual(
      [...mutationTables].sort(),
      [
        "warehouse_shipping_exceptions",
        "warehouse_shipping_write_requests",
      ],
    );
  },
);

test(
  "22 createException creates no tracking event or tracking mutation",
  () => {
    assert.doesNotMatch(
      sql,
      /warehouse_shipping_tracking_events/i,
    );

    assert.doesNotMatch(
      sql,
      /\btracking\b/i,
    );
  },
);

test(
  "23 createException does not mutate Shipping parent item package domains",
  () => {
    assert.doesNotMatch(
      normalized,
      /update public\.warehouse_shippings/i,
    );

    assert.doesNotMatch(
      normalized,
      /update public\.warehouse_shipping_items/i,
    );

    assert.doesNotMatch(
      normalized,
      /update public\.warehouse_shipping_packages/i,
    );

    assert.doesNotMatch(
      normalized,
      /insert into public\.warehouse_shipping_items/i,
    );

    assert.doesNotMatch(
      normalized,
      /insert into public\.warehouse_shipping_packages/i,
    );
  },
);

test(
  "24 stable response exact twenty keys",
  () => {
    assert.deepEqual(
      extractJsonKeys(
        "v_result",
      ),
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
  "25 completed ledger uses exact compare-and-set result write",
  () => {
    assert.match(
      normalized,
      /update public\.warehouse_shipping_write_requests set response_payload = v_result, completed_at = v_now where account_id = p_account_id and request_id = p_request_id and user_id = v_user_id and action = v_action and request_payload is not distinct from v_payload and completed_at is null and response_payload is null;/i,
    );

    assert.match(
      sql,
      /Sevkiyat istek sonucu eşzamanlı olarak değişti\. Tekrar deneyin\./,
    );
  },
);

test(
  "26 RPC ACL is authenticated only with exact twelve parameter types",
  () => {
    const acl =
      [
        ...sql.matchAll(
          /(revoke\s+all|grant\s+execute)\s+on\s+function\s+public\.warehouse_shipping_create_exception_write\s*\(([\s\S]*?)\)\s+(from|to)\s+(public|anon|authenticated)\s*;/gi,
        ),
      ];

    assert.equal(
      acl.length,
      4,
    );

    const observed =
      acl.map(
        (match) => ({
          verb:
            match[1]
              .toLowerCase()
              .replace(/\s+/g, " "),
          types:
            match[2]
              .split(",")
              .map(
                (value) =>
                  value
                    .trim()
                    .replace(/\s+/g, " "),
              ),
          direction:
            match[3].toLowerCase(),
          role:
            match[4].toLowerCase(),
        }),
      );

    const types = [
      "uuid",
      "uuid",
      "uuid",
      "text",
      "text",
      "uuid",
      "uuid",
      "uuid",
      "uuid",
      "uuid",
      "uuid",
      "uuid",
    ];

    assert.deepEqual(
      observed,
      [
        {
          verb: "revoke all",
          types,
          direction: "from",
          role: "public",
        },
        {
          verb: "revoke all",
          types,
          direction: "from",
          role: "anon",
        },
        {
          verb: "revoke all",
          types,
          direction: "from",
          role: "authenticated",
        },
        {
          verb: "grant execute",
          types,
          direction: "to",
          role: "authenticated",
        },
      ],
    );
  },
);

test(
  "27 migration opens no direct table write grant or service role surface",
  () => {
    assert.doesNotMatch(
      sql,
      /grant\s+(?:insert|update|delete|all)\s+on\s+(?:table\s+)?/i,
    );

    assert.doesNotMatch(
      sql,
      /service_role/i,
    );
  },
);

test(
  "28 frozen source authority hashes remain exact",
  () => {
    const expected = new Map([
      [
        "supabase/migrations/20260822170000_warehouse_shipping_record_proof_of_delivery_write.sql",
        "d9f27fdaaddd14300044079fdf0a74c78d1b1d589725476af7364225468ddfce",
      ],
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
    ]);

    for (
      const [
        filePath,
        expectedHash,
      ] of expected
    ) {
      assert.equal(
        sha256(filePath),
        expectedHash,
        filePath,
      );
    }
  },
);
