import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl =
  new URL(
    "../../supabase/migrations/20260818011500_warehouse_packing_confirm_item.sql",
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
  "confirm-item ayrı SECURITY DEFINER RPC'dir",
  () => {
    assert.match(
      executableSql,
      /create or replace function public\.warehouse_packing_confirm_item_write/i,
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
  "confirm-item caller JWT auth.uid kullanır",
  () => {
    assert.match(
      executableSql,
      /v_user_id\s+uuid\s*:=\s*auth\.uid\(\)/i,
    );

    assert.match(
      executableSql,
      /if v_user_id is null/i,
    );
  },
);

test(
  "confirm-item account rolü ile fail closed korunur",
  () => {
    assert.match(
      executableSql,
      /warehouse_has_account_role\s*\(/i,
    );

    for (const role of [
      "owner",
      "admin",
      "warehouse_manager",
      "supervisor",
      "inventory_controller",
      "picker",
      "operator",
    ]) {
      assert.ok(
        executableSql.includes(`'${role}'`),
        `Eksik role: ${role}`,
      );
    }
  },
);

test(
  "confirm-item idempotency ledger confirm_item action kullanır",
  () => {
    assert.match(
      executableSql,
      /v_action constant text\s*:=\s*'confirm_item'/i,
    );

    assert.match(
      executableSql,
      /warehouse_packing_write_requests/i,
    );

    assert.match(
      executableSql,
      /v_existing_action\s*<>\s*v_action/i,
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
  "Packing parent item ve package aynı account/Packing scope içinde FOR UPDATE kilitlenir",
  () => {
    for (const table of [
      "warehouse_packings",
      "warehouse_packing_items",
      "warehouse_packing_packages",
    ]) {
      assert.match(
        executableSql,
        new RegExp(
          `from public\\.${table}[\\s\\S]*?for update`,
          "i",
        ),
        `${table} FOR UPDATE eksik`,
      );
    }
  },
);

test(
  "confirm yalnız in_progress veya partially_packed Packing üzerinde çalışır",
  () => {
    assert.match(
      executableSql,
      /v_packing\.status\s+not in\s*\(\s*'in_progress'\s*,\s*'partially_packed'\s*\)/i,
    );
  },
);

test(
  "sealed labelled shipping_ready ve cancelled paketlere confirmation kapalıdır",
  () => {
    assert.match(
      executableSql,
      /v_package\.status\s+in\s*\([\s\S]*?'sealed'[\s\S]*?'labelled'[\s\S]*?'shipping_ready'[\s\S]*?'cancelled'/i,
    );
  },
);

test(
  "miktarlar nonnegative ve en az biri pozitif olmalıdır",
  () => {
    assert.match(
      executableSql,
      /v_quantity\s*<\s*0/i,
    );

    assert.match(
      executableSql,
      /v_damaged_quantity\s*<\s*0/i,
    );

    assert.match(
      executableSql,
      /v_missing_quantity\s*<\s*0/i,
    );

    assert.match(
      executableSql,
      /v_quantity\s*=\s*0[\s\S]*?v_damaged_quantity\s*=\s*0[\s\S]*?v_missing_quantity\s*=\s*0/i,
    );
  },
);

test(
  "packed damaged missing toplamı remaining quantity değerini aşamaz",
  () => {
    assert.match(
      executableSql,
      /v_processed_quantity\s*:=\s*v_quantity\s*\+\s*v_damaged_quantity\s*\+\s*v_missing_quantity/i,
    );

    assert.match(
      executableSql,
      /v_processed_quantity\s*>\s*v_item\.remaining_quantity/i,
    );
  },
);

test(
  "barcode eşleşmesi fail closed doğrulanır",
  () => {
    assert.match(
      executableSql,
      /v_item\.barcode\s+is not null[\s\S]*?v_barcode\s+is distinct from\s+v_item\.barcode/i,
    );
  },
);

test(
  "lot takipli ürün lot okutulmasını ve eşleşmesini zorunlu tutar",
  () => {
    assert.match(
      executableSql,
      /v_item\.tracking\s*->>\s*'lotNumber'/i,
    );

    assert.match(
      executableSql,
      /v_expected_lot\s+is not null[\s\S]*?v_lot_number\s+is null/i,
    );

    assert.match(
      executableSql,
      /v_lot_number\s*<>\s*v_expected_lot/i,
    );
  },
);

test(
  "serial takipli ürün seri okutulmasını ve eşleşmesini zorunlu tutar",
  () => {
    assert.match(
      executableSql,
      /v_item\.tracking\s*->>\s*'serialNumber'/i,
    );

    assert.match(
      executableSql,
      /v_expected_serial\s+is not null[\s\S]*?v_serial_number\s+is null/i,
    );

    assert.match(
      executableSql,
      /v_serial_number\s*<>\s*v_expected_serial/i,
    );
  },
);

test(
  "quantity pozitif olduğunda fiziksel package item oluşturulur",
  () => {
    assert.match(
      executableSql,
      /if v_quantity > 0 then[\s\S]*?insert into public\.warehouse_packing_package_items/i,
    );
  },
);

test(
  "package item ürün SKU tracking weight ve volume metadata'sını Packing item'dan alır",
  () => {
    assert.match(
      executableSql,
      /v_item\.product_id/i,
    );

    assert.match(
      executableSql,
      /v_item\.sku_id/i,
    );

    assert.match(
      executableSql,
      /v_item\.tracking/i,
    );

    assert.match(
      executableSql,
      /v_item\.unit_weight\s*\*\s*v_quantity/i,
    );

    assert.match(
      executableSql,
      /v_item\.unit_volume\s*\*\s*v_quantity/i,
    );
  },
);

test(
  "package calculated weight ve volume mevcut fiziksel package item toplamıyla yeniden hesaplanır",
  () => {
    assert.match(
      executableSql,
      /sum\(weight\)/i,
    );

    assert.match(
      executableSql,
      /sum\(volume\)/i,
    );

    assert.match(
      executableSql,
      /calculated_weight\s*=\s*v_calculated_weight/i,
    );

    assert.match(
      executableSql,
      /calculated_volume\s*=\s*v_calculated_volume/i,
    );
  },
);

test(
  "package item eklenince package in_progress durumuna geçer",
  () => {
    assert.match(
      executableSql,
      /update public\.warehouse_packing_packages[\s\S]*?status\s*=\s*'in_progress'/i,
    );
  },
);

test(
  "container weight ve volume capacity fail closed doğrulanır",
  () => {
    assert.match(
      executableSql,
      /v_calculated_weight\s*>\s*v_usable_weight_kg/i,
    );

    assert.match(
      executableSql,
      /v_calculated_volume\s*>\s*v_usable_volume_cm3/i,
    );

    assert.match(
      executableSql,
      /Paket ağırlığı ambalaj kapasitesini aşmaktadır/i,
    );

    assert.match(
      executableSql,
      /Paket hacmi ambalaj kapasitesini aşmaktadır/i,
    );
  },
);

test(
  "damaged quantity otomatik damaged_product exception üretir",
  () => {
    assert.match(
      executableSql,
      /if v_damaged_quantity > 0 then[\s\S]*?insert into public\.warehouse_packing_exceptions[\s\S]*?'damaged_product'/i,
    );
  },
);

test(
  "missing quantity otomatik item_missing exception üretir",
  () => {
    assert.match(
      executableSql,
      /if v_missing_quantity > 0 then[\s\S]*?insert into public\.warehouse_packing_exceptions[\s\S]*?'item_missing'/i,
    );
  },
);

test(
  "Packing item quantity muhasebesi atomik güncellenir",
  () => {
    assert.match(
      executableSql,
      /v_new_packed\s*:=\s*v_item\.packed_quantity\s*\+\s*v_quantity/i,
    );

    assert.match(
      executableSql,
      /v_new_damaged\s*:=\s*v_item\.damaged_quantity\s*\+\s*v_damaged_quantity/i,
    );

    assert.match(
      executableSql,
      /v_new_missing\s*:=\s*v_item\.missing_quantity\s*\+\s*v_missing_quantity/i,
    );

    assert.match(
      executableSql,
      /remaining_quantity\s*=\s*v_new_remaining/i,
    );
  },
);

test(
  "item notes yalnız yeni notes verilmişse değiştirilir",
  () => {
    assert.match(
      executableSql,
      /when v_notes is null\s+then notes\s+else v_notes/i,
    );
  },
);

test(
  "item'e bağlı tasklar remaining durumuna göre partially_completed veya completed olur",
  () => {
    assert.match(
      executableSql,
      /update public\.warehouse_packing_tasks/i,
    );

    assert.match(
      executableSql,
      /when v_new_remaining = 0\s+then 'completed'\s+else 'partially_completed'/i,
    );

    assert.match(
      executableSql,
      /started_at\s*=\s*coalesce\(\s*started_at,\s*now\(\)\s*\)/i,
    );

    assert.match(
      executableSql,
      /completed_at[\s\S]*?when v_new_remaining = 0/i,
    );
  },
);

test(
  "parent all processed ise complete çağrısına kadar in_progress kalır",
  () => {
    assert.match(
      executableSql,
      /remaining_quantity\s*>\s*0[\s\S]*?v_parent_status\s*:=\s*'partially_packed'[\s\S]*?else[\s\S]*?v_parent_status\s*:=\s*'in_progress'/i,
    );

    assert.doesNotMatch(
      executableSql,
      /v_parent_status\s*:=\s*'packed'/i,
    );
  },
);

test(
  "confirm-item Picking veya inventory ledger mutasyonu yapmaz",
  () => {
    assert.doesNotMatch(
      executableSql,
      /(?:insert into|update|delete from)\s+public\.warehouse_pickings\b/i,
    );

    assert.doesNotMatch(
      executableSql,
      /(?:insert into|update|delete from)\s+public\.warehouse_picking_items\b/i,
    );

    assert.doesNotMatch(
      executableSql,
      /(?:insert into|update|delete from)\s+public\.warehouse_inventory_(?:balances|movements)/i,
    );
  },
);

test(
  "confirm-item sealing completion shipping veya label lifecycle yapmaz",
  () => {
    assert.doesNotMatch(
      executableSql,
      /status\s*=\s*'sealed'/i,
    );

    assert.doesNotMatch(
      executableSql,
      /status\s*=\s*'packed'/i,
    );

    assert.doesNotMatch(
      executableSql,
      /status\s*=\s*'shipping_ready'/i,
    );

    assert.doesNotMatch(
      executableSql,
      /warehouse_packing_labels/i,
    );
  },
);

test(
  "idempotent response quantity ve lifecycle sonucunu kaydeder",
  () => {
    for (const field of [
      "packedQuantity",
      "damagedQuantity",
      "missingQuantity",
      "remainingQuantity",
      "packingStatus",
      "packageStatus",
    ]) {
      assert.ok(
        executableSql.includes(`'${field}'`),
        `Eksik response field: ${field}`,
      );
    }

    assert.match(
      executableSql,
      /response_payload\s*=\s*v_result/i,
    );
  },
);

test(
  "RPC public ve anon için kapalı authenticated için execute açıktır",
  () => {
    assert.match(
      sql,
      /revoke all on function[\s\S]*?warehouse_packing_confirm_item_write[\s\S]*?from public/i,
    );

    assert.match(
      sql,
      /revoke all on function[\s\S]*?warehouse_packing_confirm_item_write[\s\S]*?from anon/i,
    );

    assert.match(
      sql,
      /grant execute on function[\s\S]*?warehouse_packing_confirm_item_write[\s\S]*?to authenticated/i,
    );
  },
);

test(
  "confirm-item service role kullanmaz",
  () => {
    assert.doesNotMatch(
      executableSql,
      /service_role|SUPABASE_SERVICE_ROLE_KEY|serviceRole/i,
    );
  },
);
