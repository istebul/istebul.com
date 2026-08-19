import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const sql =
  fs.readFileSync(
    "supabase/migrations/20260819231500_warehouse_shipping_persistence.sql",
    "utf8",
  );

const tables = [
  "warehouse_shipping_carriers",
  "warehouse_shipping_service_levels",
  "warehouse_shipping_vehicles",
  "warehouse_shipping_docks",
  "warehouse_shippings",
  "warehouse_shipping_items",
  "warehouse_shipping_packages",
  "warehouse_shipping_tasks",
  "warehouse_shipping_manifests",
  "warehouse_shipping_asns",
  "warehouse_shipping_tracking_events",
  "warehouse_shipping_proofs_of_delivery",
  "warehouse_shipping_suggestions",
  "warehouse_shipping_exceptions",
];

test(
  "Shipping persistence 14 domain tablosunu oluşturur",
  () => {
    for (const table of tables) {
      assert.match(
        sql,
        new RegExp(
          `create table if not exists public\\.${table}\\b`,
          "i",
        ),
      );
    }
  },
);

test(
  "Shipping parent warehouse location packing tenant composite FK taşır",
  () => {
    assert.match(
      sql,
      /warehouse_shippings_warehouse_fk[\s\S]*?references\s+public\.warehouses\s*\(\s*account_id\s*,\s*id\s*\)/i,
    );

    assert.match(
      sql,
      /warehouse_shippings_location_fk[\s\S]*?references\s+public\.warehouse_locations\s*\(\s*account_id\s*,\s*warehouse_id\s*,\s*id\s*\)/i,
    );

    assert.match(
      sql,
      /warehouse_shippings_packing_fk[\s\S]*?references\s+public\.warehouse_packings\s*\(\s*account_id\s*,\s*id\s*\)/i,
    );
  },
);

test(
  "Packing → Shipping item/package handoff composite FK ile korunur",
  () => {
    assert.match(
      sql,
      /warehouse_shipping_items_packing_item_fk[\s\S]*?references\s+public\.warehouse_packing_items\s*\(\s*account_id\s*,\s*packing_id\s*,\s*id\s*\)/i,
    );

    assert.match(
      sql,
      /warehouse_shipping_packages_packing_package_fk[\s\S]*?references\s+public\.warehouse_packing_packages\s*\(\s*account_id\s*,\s*packing_id\s*,\s*id\s*\)/i,
    );
  },
);

test(
  "Shipping miktar constraint aşırı yüklemeyi engeller",
  () => {
    assert.match(
      sql,
      /requested_quantity\s*>\s*0/i,
    );

    assert.match(
      sql,
      /loaded_quantity\s*\+\s*damaged_quantity\s*\+\s*missing_quantity[\s\S]*?<=\s*requested_quantity/i,
    );

    assert.match(
      sql,
      /remaining_quantity\s*=[\s\S]*?requested_quantity[\s\S]*?-\s*loaded_quantity[\s\S]*?-\s*damaged_quantity[\s\S]*?-\s*missing_quantity/i,
    );
  },
);

test(
  "Carrier service-level vehicle dock tenant-safe master modelidir",
  () => {
    assert.match(
      sql,
      /warehouse_shipping_service_levels_carrier_fk[\s\S]*?references\s+public\.warehouse_shipping_carriers/i,
    );

    assert.match(
      sql,
      /warehouse_shipping_vehicles_carrier_fk[\s\S]*?references\s+public\.warehouse_shipping_carriers/i,
    );

    assert.match(
      sql,
      /warehouse_shipping_docks_location_fk[\s\S]*?references\s+public\.warehouse_locations/i,
    );

    assert.match(
      sql,
      /integration_code\s+text/i,
    );

    assert.match(
      sql,
      /warehouse_shipping_suggestions_dock_fk[\s\S]*?foreign key \(account_id, dock_id\)[\s\S]*?references public\.warehouse_shipping_docks\(account_id, id\)/i,
    );
  },
);

test(
  "Manifest ASN tracking POD shipment tenant boundary içinde kalır",
  () => {
    for (const name of [
      "warehouse_shipping_manifests_shipping_fk",
      "warehouse_shipping_asns_shipping_fk",
      "warehouse_shipping_tracking_events_shipping_fk",
      "warehouse_shipping_pod_shipping_fk",
    ]) {
      assert.match(
        sql,
        new RegExp(
          `${name}[\\s\\S]*?references\\s+public\\.warehouse_shippings\\s*\\(\\s*account_id\\s*,\\s*id\\s*\\)`,
          "i",
        ),
      );
    }

    assert.match(
      sql,
      /warehouse_shippings_manifest_fk[\s\S]*?foreign key \([\s\S]*?account_id,[\s\S]*?id,[\s\S]*?manifest_id[\s\S]*?\)[\s\S]*?references public\.warehouse_shipping_manifests\([\s\S]*?account_id,[\s\S]*?shipping_id,[\s\S]*?id[\s\S]*?\)/i,
    );

    assert.match(
      sql,
      /warehouse_shippings_asn_fk[\s\S]*?foreign key \([\s\S]*?account_id,[\s\S]*?id,[\s\S]*?asn_id[\s\S]*?\)[\s\S]*?references public\.warehouse_shipping_asns\([\s\S]*?account_id,[\s\S]*?shipping_id,[\s\S]*?id[\s\S]*?\)/i,
    );
  },
);

test(
  "Shipping operational statuses DB seviyesinde sınırlandırılır",
  () => {
    for (const value of [
      "'loading_ready'",
      "'loading'",
      "'loaded'",
      "'dispatched'",
      "'in_transit'",
      "'delivered'",
      "'partially_delivered'",
      "'delivery_failed'",
      "'returned'",
      "'cancelled'",
    ]) {
      assert.ok(
        sql.includes(value),
        value,
      );
    }
  },
);

test(
  "Shipping task dispatch operasyonlarını içerir",
  () => {
    for (const value of [
      "'verify_manifest'",
      "'generate_asn'",
      "'dispatch_vehicle'",
      "'confirm_delivery'",
    ]) {
      assert.ok(
        sql.includes(value),
        value,
      );
    }
  },
);

test(
  "Tüm Shipping tablolarında RLS açıktır",
  () => {
    for (const table of tables) {
      assert.match(
        sql,
        new RegExp(
          `alter table public\\.${table}\\s+enable row level security`,
          "i",
        ),
      );
    }
  },
);

test(
  "Her Shipping tablosunda authenticated SELECT account policy bulunur",
  () => {
    const count =
      (
        sql.match(
          /for select\s+to authenticated\s+using\s*\(\s*public\.warehouse_has_account_access\(account_id\)\s*\)/gi,
        ) ?? []
      ).length;

    assert.equal(
      count,
      tables.length,
    );
  },
);

test(
  "Authenticated ACL yalnız SELECT verir",
  () => {
    assert.match(
      sql,
      /revoke all on[\s\S]*?from anon,\s*authenticated;/i,
    );

    assert.match(
      sql,
      /grant select on[\s\S]*?to authenticated;/i,
    );

    assert.doesNotMatch(
      sql,
      /grant\s+(insert|update|delete|all)[\s\S]*?to\s+authenticated/i,
    );
  },
);

test(
  "A9.1 executable SQL write RPC veya SECURITY DEFINER içermez",
  () => {
    const executableSql =
      sql
        .split("\n")
        .filter(
          (line) =>
            !line
              .trimStart()
              .startsWith("--"),
        )
        .join("\n");

    assert.doesNotMatch(
      executableSql,
      /security\s+definer/i,
    );

    assert.doesNotMatch(
      executableSql,
      /create\s+(or\s+replace\s+)?function\s+public\.warehouse_shipping/i,
    );
  },
);

test(
  "Suggestion JSON score ve snapshots doğrulanır",
  () => {
    assert.match(
      sql,
      /warehouse_shipping_suggestions_score_check[\s\S]*?jsonb_typeof\(score\)\s*=\s*'object'/i,
    );

    assert.match(
      sql,
      /warehouse_shipping_suggestions_snapshot_check/i,
    );
  },
);

test(
  "Exception resolution metadata tutarlıdır",
  () => {
    assert.match(
      sql,
      /warehouse_shipping_exceptions_resolution_check[\s\S]*?resolved\s*=\s*false[\s\S]*?resolved_by\s+is\s+null[\s\S]*?resolved_at\s+is\s+null[\s\S]*?resolved\s*=\s*true[\s\S]*?resolved_by\s+is\s+not\s+null[\s\S]*?resolved_at\s+is\s+not\s+null/i,
    );
  },
);
