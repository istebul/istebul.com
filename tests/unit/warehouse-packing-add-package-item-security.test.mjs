import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl =
  new URL(
    "../../supabase/migrations/20260818019500_warehouse_packing_add_package_item.sql",
    import.meta.url,
  );

const sql =
  await readFile(
    migrationUrl,
    "utf8",
  );

const executableSql =
  sql
    .replace(/--.*$/gm, "")
    .replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    );

test(
  "add_package_item ayrı SECURITY DEFINER RPC'dir",
  () => {
    assert.match(
      executableSql,
      /create or replace function\s+public\.warehouse_packing_add_package_item_write/i,
    );

    assert.match(
      executableSql,
      /security definer/i,
    );

    assert.match(
      executableSql,
      /set search_path\s*=\s*public,\s*pg_temp/i,
    );
  },
);

test(
  "add_package_item caller JWT auth.uid kullanır",
  () => {
    assert.match(
      executableSql,
      /v_user_id\s+uuid\s*:=\s*auth\.uid\(\)/i,
    );
  },
);

test(
  "add_package_item account rolü ile fail closed korunur",
  () => {
    assert.match(
      executableSql,
      /warehouse_has_account_role\s*\(/i,
    );
  },
);

test(
  "quantity pozitif weight ve volume nonnegative doğrulanır",
  () => {
    assert.match(
      executableSql,
      /v_quantity\s+is null[\s\S]*?v_quantity\s*<=\s*0/i,
    );

    assert.match(
      executableSql,
      /v_weight\s+is not null[\s\S]*?v_weight\s*<\s*0/i,
    );

    assert.match(
      executableSql,
      /v_volume\s+is not null[\s\S]*?v_volume\s*<\s*0/i,
    );
  },
);

test(
  "tracking verilirse JSON object olmalıdır",
  () => {
    assert.match(
      executableSql,
      /v_tracking\s+is not null[\s\S]*?jsonb_typeof\(v_tracking\)\s*<>\s*'object'/i,
    );
  },
);

test(
  "add_package_item stable idempotency ve user binding kullanır",
  () => {
    assert.match(
      executableSql,
      /v_action constant text\s*:=\s*'add_package_item'/i,
    );

    assert.match(
      executableSql,
      /warehouse_packing_write_requests/i,
    );

    assert.match(
      executableSql,
      /v_existing_user_id\s*<>\s*v_user_id/i,
    );

    assert.match(
      executableSql,
      /v_existing_payload\s*<>\s*v_payload/i,
    );

    assert.match(
      executableSql,
      /on conflict\s*\(\s*account_id\s*,\s*request_id\s*\)\s*do nothing/i,
    );
  },
);

test(
  "Packing parent account scope içinde doğrulanır ancak yeni status gate eklenmez",
  () => {
    assert.match(
      executableSql,
      /from public\.warehouse_packings[\s\S]*?account_id\s*=\s*p_account_id[\s\S]*?id\s*=\s*p_packing_id[\s\S]*?for share/i,
    );

    assert.doesNotMatch(
      executableSql,
      /v_packing\.status/i,
    );
  },
);

test(
  "package aynı Packing içinde FOR UPDATE kilitlenir",
  () => {
    assert.match(
      executableSql,
      /from public\.warehouse_packing_packages[\s\S]*?account_id\s*=\s*p_account_id[\s\S]*?packing_id\s*=\s*v_packing\.id[\s\S]*?id\s*=\s*p_package_id[\s\S]*?for update/i,
    );
  },
);

test(
  "sealed labelled shipping_ready cancelled package kapalıdır",
  () => {
    assert.match(
      executableSql,
      /v_package\.status\s+in\s*\(\s*'sealed'\s*,\s*'labelled'\s*,\s*'shipping_ready'\s*,\s*'cancelled'\s*\)/i,
    );
  },
);

test(
  "Packing item aynı parent scope içinde bulunur",
  () => {
    assert.match(
      executableSql,
      /from public\.warehouse_packing_items[\s\S]*?account_id\s*=\s*p_account_id[\s\S]*?packing_id\s*=\s*v_packing\.id[\s\S]*?id\s*=\s*p_packing_item_id/i,
    );
  },
);

test(
  "product SKU ve unit Packing item ile birebir eşleşir",
  () => {
    assert.match(
      executableSql,
      /v_item\.product_id\s*<>\s*p_product_id/i,
    );

    assert.match(
      executableSql,
      /v_item\.sku_id\s+is distinct from\s+p_sku_id/i,
    );

    assert.match(
      executableSql,
      /v_item\.unit\s*<>\s*v_unit/i,
    );
  },
);

test(
  "domain parity gereği quantity remainingQuantity ile karşılaştırılmaz",
  () => {
    assert.doesNotMatch(
      executableSql,
      /v_quantity\s*>\s*v_item\.remaining_quantity/i,
    );

    assert.doesNotMatch(
      executableSql,
      /remaining_quantity\s*-\s*v_quantity/i,
    );
  },
);

test(
  "package item caller input metadata ile atomik oluşturulur",
  () => {
    assert.match(
      executableSql,
      /insert into public\.warehouse_packing_package_items/i,
    );

    for (const value of [
      "p_product_id",
      "p_sku_id",
      "v_quantity",
      "v_unit",
      "v_tracking",
      "v_weight",
      "v_volume",
    ]) {
      assert.ok(
        executableSql.includes(value),
        `Eksik package-item value: ${value}`,
      );
    }
  },
);

test(
  "container aynı account içinde package containerId ile doğrulanır",
  () => {
    assert.match(
      executableSql,
      /from public\.warehouse_packing_containers[\s\S]*?account_id\s*=\s*p_account_id[\s\S]*?id\s*=\s*v_package\.container_id/i,
    );
  },
);

test(
  "calculated weight ve volume mevcut package item toplamına yeni satırı ekler",
  () => {
    assert.match(
      executableSql,
      /sum\(weight\)[\s\S]*?coalesce\(\s*v_weight,\s*0\s*\)/i,
    );

    assert.match(
      executableSql,
      /sum\(volume\)[\s\S]*?coalesce\(\s*v_volume,\s*0\s*\)/i,
    );
  },
);

test(
  "container usable weight kapasitesi korunur",
  () => {
    assert.match(
      executableSql,
      /v_usable_weight_kg/i,
    );

    assert.match(
      executableSql,
      /v_package\.weight_unit\s*=\s*'kg'/i,
    );

    assert.match(
      executableSql,
      /v_calculated_weight\s*>\s*v_usable_weight_kg/i,
    );
  },
);

test(
  "container usable volume kapasitesi korunur",
  () => {
    assert.match(
      executableSql,
      /v_usable_volume_cm3/i,
    );

    assert.match(
      executableSql,
      /v_package\.volume_unit\s*=\s*'cm3'/i,
    );

    assert.match(
      executableSql,
      /v_calculated_volume\s*>\s*v_usable_volume_cm3/i,
    );
  },
);

test(
  "package in_progress ve recalculated totals durumuna atomik geçer",
  () => {
    assert.match(
      executableSql,
      /update public\.warehouse_packing_packages[\s\S]*?status\s*=\s*'in_progress'[\s\S]*?calculated_weight\s*=\s*v_calculated_weight[\s\S]*?calculated_volume\s*=\s*v_calculated_volume/i,
    );
  },
);

test(
  "add_package_item Packing item quantity veya parent lifecycle değiştirmez",
  () => {
    assert.doesNotMatch(
      executableSql,
      /update public\.warehouse_packing_items/i,
    );

    assert.doesNotMatch(
      executableSql,
      /update public\.warehouse_packings\b/i,
    );
  },
);

test(
  "add_package_item task exception label lifecycle çalıştırmaz",
  () => {
    for (const table of [
      "warehouse_packing_tasks",
      "warehouse_packing_exceptions",
      "warehouse_packing_labels",
    ]) {
      assert.doesNotMatch(
        executableSql,
        new RegExp(
          `(?:insert into|update|delete from)\\s+public\\.${table}\\b`,
          "i",
        ),
      );
    }
  },
);

test(
  "add_package_item inventory ve Picking mutation yapmaz",
  () => {
    assert.doesNotMatch(
      executableSql,
      /(?:insert into|update|delete from)\s+public\.warehouse_inventory_(?:balances|movements)/i,
    );

    assert.doesNotMatch(
      executableSql,
      /(?:insert into|update|delete from)\s+public\.warehouse_pickings\b/i,
    );

    assert.doesNotMatch(
      executableSql,
      /(?:insert into|update|delete from)\s+public\.warehouse_picking_items\b/i,
    );
  },
);

test(
  "RPC public anon kapalı authenticated execute açık ve service role yok",
  () => {
    assert.match(
      sql,
      /revoke all on function[\s\S]*?warehouse_packing_add_package_item_write[\s\S]*?from public/i,
    );

    assert.match(
      sql,
      /revoke all on function[\s\S]*?warehouse_packing_add_package_item_write[\s\S]*?from anon/i,
    );

    assert.match(
      sql,
      /grant execute on function[\s\S]*?warehouse_packing_add_package_item_write[\s\S]*?to authenticated/i,
    );

    assert.doesNotMatch(
      executableSql,
      /service_role|SUPABASE_SERVICE_ROLE_KEY|serviceRole/i,
    );
  },
);
