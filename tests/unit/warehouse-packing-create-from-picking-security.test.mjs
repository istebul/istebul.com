import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl =
  new URL(
    "../../supabase/migrations/20260818005500_warehouse_packing_create_from_picking.sql",
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
  "create-from-picking ayrı SECURITY DEFINER RPC'dir",
  () => {
    assert.match(
      executableSql,
      /create or replace function public\.warehouse_packing_create_from_picking/i,
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
  "create-from-picking caller JWT auth.uid kullanır",
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
  "create-from-picking account rolü ile fail closed yetkilendirilir",
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
        executableSql.includes(
          `'${role}'`,
        ),
        `Eksik role: ${role}`,
      );
    }
  },
);

test(
  "create-from-picking account + request id idempotency kullanır",
  () => {
    assert.match(
      executableSql,
      /warehouse_packing_write_requests/i,
    );

    assert.match(
      executableSql,
      /'create_from_picking'/i,
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

    assert.match(
      executableSql,
      /response_payload\s*=\s*v_result/i,
    );
  },
);

test(
  "Picking parent account scoped FOR UPDATE ile kilitlenir",
  () => {
    assert.match(
      executableSql,
      /from public\.warehouse_pickings[\s\S]*?account_id\s*=\s*p_account_id[\s\S]*?id\s*=\s*p_picking_id[\s\S]*?for update/i,
    );
  },
);

test(
  "yalnız completed Picking aktarılabilir",
  () => {
    assert.match(
      executableSql,
      /v_picking\.status\s*<>\s*'completed'/i,
    );

    assert.match(
      executableSql,
      /Yalnızca tamamlanmış toplama kaydı paketlemeye aktarılabilir/i,
    );
  },
);

test(
  "yalnız picked_quantity sıfırdan büyük Picking satırları aktarılır",
  () => {
    const matches =
      executableSql.match(
        /picked_quantity\s*>\s*0/gi,
      ) ?? [];

    assert.ok(
      matches.length >= 3,
      "transfer count, validation ve INSERT SELECT picked_quantity > 0 kullanmalıdır.",
    );
  },
);

test(
  "transfer edilecek en az bir Picking item zorunludur",
  () => {
    assert.match(
      executableSql,
      /v_transferable_count\s*=\s*0/i,
    );

    assert.match(
      executableSql,
      /paketlemeye aktarılabilecek ürün bulunamadı/i,
    );
  },
);

test(
  "Packing location Picking deposuyla tenant scoped doğrulanır",
  () => {
    assert.match(
      executableSql,
      /from public\.warehouse_locations[\s\S]*?account_id\s*=\s*p_account_id[\s\S]*?warehouse_id\s*=\s*v_picking\.warehouse_id[\s\S]*?id\s*=\s*p_packing_location_id/i,
    );
  },
);

test(
  "shipping location aynı warehouse içinde doğrulanır ve packing location ile aynı olamaz",
  () => {
    assert.match(
      executableSql,
      /p_shipping_location_id\s+is not null[\s\S]*?p_shipping_location_id\s*=\s*p_packing_location_id/i,
    );

    assert.match(
      executableSql,
      /warehouse_id\s*=\s*v_picking\.warehouse_id[\s\S]*?id\s*=\s*p_shipping_location_id/i,
    );
  },
);

test(
  "aynı Picking ikinci kez Packing'e aktarılamaz",
  () => {
    assert.match(
      executableSql,
      /from public\.warehouse_packings[\s\S]*?picking_id\s*=\s*v_picking\.id/i,
    );

    assert.match(
      executableSql,
      /Bu toplama kaydı için daha önce paketleme emri oluşturulmuş/i,
    );
  },
);

test(
  "order ve picking reference metadata parent Packing'e taşınır",
  () => {
    assert.match(
      executableSql,
      /v_picking\.order_id/i,
    );

    assert.match(
      executableSql,
      /v_picking\.order_number/i,
    );

    assert.match(
      executableSql,
      /'picking'/i,
    );

    assert.match(
      executableSql,
      /v_picking\.picking_number/i,
    );
  },
);

test(
  "varsayılan strategy cartonization ve priority Picking'den devralınır",
  () => {
    assert.match(
      executableSql,
      /coalesce\(\s*p_strategy,\s*'cartonization'\s*\)/i,
    );

    assert.match(
      executableSql,
      /coalesce\(\s*p_priority,\s*v_picking\.priority\s*\)/i,
    );
  },
);

test(
  "plannedAt varsa parent planned yoksa draft oluşturulur",
  () => {
    assert.match(
      executableSql,
      /when p_planned_at is null\s+then 'draft'\s+else 'planned'/i,
    );
  },
);

test(
  "Packing requested quantity birebir Picking picked quantity'den oluşturulur",
  () => {
    assert.match(
      executableSql,
      /pi\.picked_quantity,\s*0,\s*0,\s*0,\s*pi\.picked_quantity/i,
    );

    assert.doesNotMatch(
      executableSql,
      /pi\.requested_quantity,\s*0,\s*0,\s*0,\s*pi\.requested_quantity/i,
    );
  },
);

test(
  "Packing item picking parent ve picking item kimliklerini korur",
  () => {
    assert.match(
      executableSql,
      /v_picking\.id,\s*pi\.id,\s*pi\.warehouse_id/i,
    );
  },
);

test(
  "Picking SKU ve InventoryTracking bilgisi Packing'e taşınır",
  () => {
    assert.match(
      executableSql,
      /pi\.sku_id/i,
    );

    assert.match(
      executableSql,
      /coalesce\(\s*pi\.tracking,\s*'\{\}'::jsonb\s*\)/i,
    );

    for (const field of [
      "lotNumber",
      "serialNumber",
      "productionDate",
      "expiryDate",
    ]) {
      assert.ok(
        executableSql.includes(
          `'${field}'`,
        ),
        `Eksik tracking field: ${field}`,
      );
    }

    assert.match(
      executableSql,
      /pi\.lot_number/i,
    );

    assert.match(
      executableSql,
      /pi\.serial_number/i,
    );

    assert.match(
      executableSql,
      /pi\.production_date/i,
    );

    assert.match(
      executableSql,
      /pi\.expiry_date/i,
    );
  },
);

test(
  "Packing item'ları caller user ile oluşturulur",
  () => {
    assert.match(
      executableSql,
      /created_by[\s\S]*?v_user_id/i,
    );
  },
);

test(
  "Packing parent ve tüm item'lar aynı RPC transactionında oluşturulur",
  () => {
    assert.match(
      executableSql,
      /insert into public\.warehouse_packings/i,
    );

    assert.match(
      executableSql,
      /insert into public\.warehouse_packing_items/i,
    );

    assert.match(
      executableSql,
      /v_inserted_count\s*<>\s*v_transferable_count/i,
    );
  },
);

test(
  "bozuk cross-warehouse Picking item fail closed reddedilir",
  () => {
    assert.match(
      executableSql,
      /warehouse_id\s*<>\s*v_picking\.warehouse_id/i,
    );
  },
);

test(
  "create-from-picking inventory balance veya movement yazmaz",
  () => {
    assert.doesNotMatch(
      executableSql,
      /(?:insert\s+into|update|delete\s+from)\s+public\.warehouse_inventory_(?:balances|movements)/i,
    );
  },
);

test(
  "create-from-picking yüksek etkili Packing execution yapmaz",
  () => {
    assert.doesNotMatch(
      executableSql,
      /insert\s+into\s+public\.warehouse_packing_package_items/i,
    );

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
  },
);

test(
  "RPC PUBLIC ve anon için kapalı authenticated için execute açıktır",
  () => {
    assert.match(
      sql,
      /revoke all on function[\s\S]*?warehouse_packing_create_from_picking[\s\S]*?from public/i,
    );

    assert.match(
      sql,
      /revoke all on function[\s\S]*?warehouse_packing_create_from_picking[\s\S]*?from anon/i,
    );

    assert.match(
      sql,
      /grant execute on function[\s\S]*?warehouse_packing_create_from_picking[\s\S]*?to authenticated/i,
    );
  },
);

test(
  "create-from-picking service role kullanmaz",
  () => {
    assert.doesNotMatch(
      executableSql,
      /service_role|SUPABASE_SERVICE_ROLE_KEY|serviceRole/i,
    );
  },
);
