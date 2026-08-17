import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../../supabase/migrations/20260818003000_warehouse_packing_persistence.sql",
  import.meta.url,
);

const sql = await readFile(migrationUrl, "utf8");

const executableSql = sql
  .replace(/--.*$/gm, "")
  .replace(/\/\*[\s\S]*?\*\//g, "");

const tables = [
  "warehouse_packings",
  "warehouse_packing_items",
  "warehouse_packing_containers",
  "warehouse_packing_packages",
  "warehouse_packing_package_items",
  "warehouse_packing_labels",
  "warehouse_packing_suggestions",
  "warehouse_packing_tasks",
  "warehouse_packing_exceptions",
  "warehouse_packing_write_requests",
];

test(
  "Packing persistence gerekli production tablolarını oluşturur",
  () => {
    for (const table of tables) {
      assert.match(
        sql,
        new RegExp(
          `create table if not exists public\\.${table}\\s*\\(`,
          "i",
        ),
        `${table} tablosu eksik`,
      );
    }
  },
);

test(
  "Packing tablolarının tamamında RLS açıktır",
  () => {
    for (const table of tables) {
      assert.match(
        sql,
        new RegExp(
          `alter table public\\.${table}\\s+enable row level security`,
          "i",
        ),
        `${table} RLS eksik`,
      );
    }
  },
);

test(
  "Packing read policyleri account üyeliği ile sınırlandırılır",
  () => {
    const matches =
      sql.match(
        /warehouse_has_account_access\s*\(\s*account_id\s*\)/gi,
      ) ?? [];

    assert.ok(
      matches.length >= tables.length,
      "Tüm Packing read policylerinde account access bekleniyor.",
    );
  },
);

test(
  "Packing write request yalnız çağıran kullanıcı tarafından okunur",
  () => {
    assert.match(
      sql,
      /warehouse_packing_write_requests_owner_select[\s\S]*?user_id\s*=\s*auth\.uid\(\)/i,
    );
  },
);

test(
  "authenticated rolüne doğrudan Packing mutation verilmez",
  () => {
    for (const table of tables) {
      assert.match(
        sql,
        new RegExp(
          `revoke insert, update, delete\\s+on public\\.${table}\\s+from authenticated`,
          "i",
        ),
        `${table} mutation revoke eksik`,
      );
    }

    assert.doesNotMatch(
      executableSql,
      /grant\s+(?:insert|update|delete|all)[\s\S]*?to\s+authenticated/i,
    );
  },
);

test(
  "anon rolü Packing tablolarına erişemez",
  () => {
    for (const table of tables) {
      assert.match(
        sql,
        new RegExp(
          `revoke all\\s+on public\\.${table}\\s+from anon`,
          "i",
        ),
        `${table} anon revoke eksik`,
      );
    }
  },
);

test(
  "Packing persistence service role kullanmaz",
  () => {
    assert.doesNotMatch(
      executableSql,
      /service[_ -]?role|SUPABASE_SERVICE|serviceRole/i,
    );
  },
);

test(
  "Packing persistence mutation RPC açmaz",
  () => {
    assert.doesNotMatch(
      executableSql,
      /security\s+definer/i,
    );

    assert.doesNotMatch(
      executableSql,
      /create\s+(?:or\s+replace\s+)?function\s+public\.warehouse_packing_/i,
    );
  },
);

test(
  "Packing persistence inventory ledger veya balance mutation yapmaz",
  () => {
    assert.doesNotMatch(
      executableSql,
      /insert\s+into\s+public\.warehouse_inventory_movements/i,
    );

    assert.doesNotMatch(
      executableSql,
      /(?:insert\s+into|update|delete\s+from)\s+public\.warehouse_inventory_balances/i,
    );
  },
);

test(
  "Sipariş ve genel referans kimlikleri external text contract olarak korunur",
  () => {
    assert.match(
      sql,
      /order_id\s+text/i,
    );

    assert.match(
      sql,
      /order_number\s+text/i,
    );

    assert.match(
      sql,
      /reference_id\s+text/i,
    );

    assert.match(
      sql,
      /reference_number\s+text/i,
    );
  },
);

test(
  "Picking referansı WarehouseIQ iç varlığına composite FK ile bağlıdır",
  () => {
    assert.match(
      sql,
      /foreign key\s*\(\s*account_id\s*,\s*picking_id\s*\)[\s\S]*?references public\.warehouse_pickings\s*\(\s*account_id\s*,\s*id\s*\)/i,
    );

    assert.match(
      sql,
      /references public\.warehouse_picking_items\s*\(\s*account_id\s*,\s*picking_id\s*,\s*id\s*\)/i,
    );
  },
);

test(
  "Packing item miktar muhasebesi kalan miktarı deterministik korur",
  () => {
    assert.match(
      sql,
      /remaining_quantity\s*=\s*requested_quantity\s*-\s*packed_quantity\s*-\s*damaged_quantity\s*-\s*missing_quantity/i,
    );
  },
);

test(
  "Paket içerikleri ayrı relational tabloda tutulur",
  () => {
    assert.match(
      sql,
      /create table if not exists public\.warehouse_packing_package_items/i,
    );

    assert.match(
      sql,
      /references public\.warehouse_packing_packages/i,
    );

    assert.match(
      sql,
      /references public\.warehouse_packing_items/i,
    );
  },
);

test(
  "Packing package kapatma için seal metadata sözleşmesi korunur",
  () => {
    assert.match(
      sql,
      /status not in\s*\(\s*'sealed'\s*,\s*'labelled'\s*,\s*'shipping_ready'\s*\)[\s\S]*?sealed_by is not null[\s\S]*?sealed_at is not null/i,
    );
  },
);

test(
  "Packing label lifecycle ve formatları DB constraint ile korunur",
  () => {
    for (const status of [
      "created",
      "generated",
      "printed",
      "failed",
      "cancelled",
    ]) {
      assert.match(
        sql,
        new RegExp(`'${status}'`),
      );
    }

    for (const format of [
      "zpl",
      "pdf",
      "png",
      "svg",
      "text",
    ]) {
      assert.match(
        sql,
        new RegExp(`'${format}'`),
      );
    }
  },
);

test(
  "Packing exception çözüm metadata bütünlüğü DB seviyesinde korunur",
  () => {
    assert.match(
      sql,
      /resolved\s*=\s*false[\s\S]*?resolved_by is null[\s\S]*?resolved_at is null/i,
    );

    assert.match(
      sql,
      /resolved\s*=\s*true[\s\S]*?resolved_by is not null[\s\S]*?resolved_at is not null/i,
    );
  },
);

test(
  "Packing write idempotency anahtarı account + request_id'dir",
  () => {
    assert.match(
      sql,
      /primary key\s*\(\s*account_id\s*,\s*request_id\s*\)/i,
    );
  },
);

test(
  "Packing write ledger domain mutation yüzeyini eksiksiz kapsar",
  () => {
    const actions = [
      "create_from_picking",
      "create",
      "add_item",
      "release",
      "start",
      "create_container",
      "set_container_active",
      "create_package",
      "generate_suggestions",
      "create_task",
      "confirm_item",
      "add_package_item",
      "seal_package",
      "generate_package_label",
      "create_label",
      "generate_label",
      "mark_label_printed",
      "mark_label_failed",
      "cancel_label",
      "create_exception",
      "resolve_exception",
      "complete",
      "mark_shipping_ready",
      "cancel",
    ];

    for (const action of actions) {
      assert.ok(
        sql.includes(`'${action}'`),
        `Eksik Packing write action: ${action}`,
      );
    }
  },
);

test(
  "Packing persistence barkod olayına otomatik mutation bağlamaz",
  () => {
    assert.doesNotMatch(
      executableSql,
      /warehouse:barcode-scan/i,
    );
  },
);
