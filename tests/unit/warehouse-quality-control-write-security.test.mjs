import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";


const migrationPath =
  "supabase/migrations/20260813080000_warehouse_quality_control_write_foundation.sql";


async function source() {
  return readFile(
    migrationPath,
    "utf8",
  );
}


test(
  "QC-P2.1 yalnız create add_item ve start actionlarını açar",
  async () => {
    const sql =
      await source();

    assert.match(
      sql,
      /array\s*\[\s*'create'\s*,\s*'add_item'\s*,\s*'start'\s*\]::text\[\]/i,
    );

    assert.match(
      sql,
      /warehouse_quality_write_requests_action_check[\s\S]*?'create'[\s\S]*?'add_item'[\s\S]*?'start'/i,
    );
  },
);


test(
  "QC-P2.1 kritik sonraki Quality mutationlarını açmaz",
  async () => {
    const sql =
      await source();

    const actionBlock =
      sql.match(
        /v_action\s*=\s*any\s*\(\s*array\s*\[([\s\S]*?)\]::text\[\]/i,
      )?.[1] ?? "";

    for (const forbidden of [
      "record_result",
      "complete",
      "cancel",
      "create_sample",
      "add_document",
      "create_task",
      "create_exception",
      "resolve_exception",
    ]) {
      assert.doesNotMatch(
        actionBlock,
        new RegExp(
          `'${forbidden}'`,
          "i",
        ),
      );
    }
  },
);


test(
  "Quality write RPC SECURITY DEFINER ve sabit search_path kullanır",
  async () => {
    const sql =
      await source();

    assert.match(
      sql,
      /create or replace function\s+public\.warehouse_quality_control_write/i,
    );

    assert.match(
      sql,
      /language plpgsql\s+security definer\s+set search_path = public, pg_temp/i,
    );
  },
);


test(
  "Quality write RPC caller JWT kimliğini zorunlu tutar",
  async () => {
    const sql =
      await source();

    assert.match(
      sql,
      /v_user_id uuid\s*:=\s*auth\.uid\(\)/i,
    );

    assert.match(
      sql,
      /if v_user_id is null then[\s\S]*?WarehouseIQ oturumu gerekli/i,
    );

    assert.doesNotMatch(
      sql,
      /service_role/i,
    );
  },
);


test(
  "Quality write RPC account rol kapısını uygular",
  async () => {
    const sql =
      await source();

    assert.match(
      sql,
      /warehouse_has_account_role\s*\(\s*p_account_id/i,
    );

    for (const role of [
      "owner",
      "admin",
      "warehouse_manager",
      "supervisor",
      "inventory_controller",
      "quality_controller",
      "operator",
    ]) {
      assert.match(
        sql,
        new RegExp(
          `'${role}'`,
          "i",
        ),
      );
    }
  },
);


test(
  "Quality write request kimliği account bazında idempotenttir",
  async () => {
    const sql =
      await source();

    assert.match(
      sql,
      /primary key\s*\(\s*account_id\s*,\s*request_id\s*\)/i,
    );

    assert.match(
      sql,
      /v_existing_action\s*<>\s*v_action/i,
    );

    assert.match(
      sql,
      /v_existing_payload\s*<>\s*v_payload/i,
    );

    assert.match(
      sql,
      /v_existing_user_id\s*<>\s*v_user_id/i,
    );

    assert.match(
      sql,
      /v_existing_response is not null/i,
    );

    assert.match(
      sql,
      /on conflict\s*\(\s*account_id\s*,\s*request_id\s*\)\s*do nothing/i,
    );
  },
);


test(
  "write request tablosu browser direct erişimine kapalıdır",
  async () => {
    const sql =
      await source();

    assert.match(
      sql,
      /alter table public\.warehouse_quality_write_requests\s+enable row level security/i,
    );

    assert.match(
      sql,
      /revoke all[\s\S]*?public\.warehouse_quality_write_requests[\s\S]*?from authenticated/i,
    );

    assert.doesNotMatch(
      sql,
      /grant\s+(select|insert|update|delete|all)[\s\S]*?warehouse_quality_write_requests[\s\S]*?to authenticated/i,
    );
  },
);


test(
  "authenticated rolüne yalnız Quality RPC execute yetkisi verilir",
  async () => {
    const sql =
      await source();

    assert.match(
      sql,
      /grant execute on function\s+public\.warehouse_quality_control_write[\s\S]*?to authenticated/i,
    );

    assert.match(
      sql,
      /revoke all on function\s+public\.warehouse_quality_control_write[\s\S]*?from public/i,
    );

    assert.match(
      sql,
      /revoke all on function\s+public\.warehouse_quality_control_write[\s\S]*?from anon/i,
    );
  },
);


test(
  "create action depo lokasyon ve receiving tenant sınırını doğrular",
  async () => {
    const sql =
      await source();

    assert.match(
      sql,
      /from public\.warehouses[\s\S]*?account_id = p_account_id[\s\S]*?id = v_warehouse_id/i,
    );

    assert.match(
      sql,
      /from public\.warehouse_locations[\s\S]*?account_id = p_account_id[\s\S]*?warehouse_id = v_warehouse_id[\s\S]*?id = v_location_id/i,
    );

    assert.match(
      sql,
      /from public\.warehouse_receivings[\s\S]*?account_id = p_account_id[\s\S]*?id = v_receiving_id/i,
    );
  },
);


test(
  "aynı receiving için ikinci Quality Inspection engellenir",
  async () => {
    const sql =
      await source();

    assert.match(
      sql,
      /from public\.warehouse_quality_inspections[\s\S]*?account_id = p_account_id[\s\S]*?receiving_id = v_receiving_id/i,
    );

    assert.match(
      sql,
      /Bu mal kabul kaydı için daha önce kalite kontrol oluşturulmuş/i,
    );
  },
);


test(
  "create action kullanıcı kimliğini payloadtan değil auth uid üzerinden yazar",
  async () => {
    const sql =
      await source();

    const createBlock =
      sql.match(
        /if v_action = 'create' then([\s\S]*?)elsif v_action = 'add_item'/i,
      )?.[1] ?? "";

    assert.match(
      createBlock,
      /created_by[\s\S]*?v_user_id/i,
    );

    assert.doesNotMatch(
      createBlock,
      /createdBy/,
    );
  },
);


test(
  "add_item parent Quality kaydını kilitler",
  async () => {
    const sql =
      await source();

    const block =
      sql.match(
        /elsif v_action = 'add_item' then([\s\S]*?)elsif v_action = 'start'/i,
      )?.[1] ?? "";

    assert.match(
      block,
      /from public\.warehouse_quality_inspections[\s\S]*?for update/i,
    );

    assert.match(
      block,
      /status not in\s*\(\s*'draft'\s*,\s*'planned'\s*\)/i,
    );
  },
);


test(
  "add_item depo ve lokasyonu parent kayıtla aynı tutar",
  async () => {
    const sql =
      await source();

    assert.match(
      sql,
      /v_inspection\.warehouse_id\s*<>\s*v_warehouse_id/i,
    );

    assert.match(
      sql,
      /v_inspection\.location_id\s*<>\s*v_location_id/i,
    );
  },
);


test(
  "add_item product ve SKU account bütünlüğünü doğrular",
  async () => {
    const sql =
      await source();

    assert.match(
      sql,
      /from public\.warehouse_products[\s\S]*?account_id = p_account_id[\s\S]*?id = v_product_id/i,
    );

    assert.match(
      sql,
      /from public\.warehouse_product_skus[\s\S]*?account_id = p_account_id[\s\S]*?product_id = v_product_id[\s\S]*?id = v_sku_id/i,
    );
  },
);


test(
  "add_item receiving item kullanılırsa tenant güvenli receiving satırı doğrulanır",
  async () => {
    const sql =
      await source();

    assert.match(
      sql,
      /if v_receiving_item_id is not null then/i,
    );

    assert.match(
      sql,
      /from public\.warehouse_receiving_items[\s\S]*?account_id = p_account_id[\s\S]*?receiving_id = v_receiving_id[\s\S]*?id = v_receiving_item_id/i,
    );
  },
);


test(
  "add_item line number parent lock altında deterministik üretilir",
  async () => {
    const sql =
      await source();

    assert.match(
      sql,
      /coalesce\s*\(\s*max\(line_number\)\s*,\s*0\s*\)\s*\+\s*1/i,
    );

    const persistenceSql =
      await readFile(
        "supabase/migrations/20260812212000_warehouse_quality_control_persistence.sql",
        "utf8",
      );

    assert.match(
      persistenceSql,
      /constraint warehouse_quality_inspection_items_line_unique/i,
    );

    assert.match(
      persistenceSql,
      /unique\s*\(\s*account_id\s*,\s*inspection_id\s*,\s*line_number\s*\)/i,
    );
  },
);


test(
  "start yalnız draft veya planned kaydı başlatır ve item gerektirir",
  async () => {
    const sql =
      await source();

    const block =
      sql.match(
        /elsif v_action = 'start' then([\s\S]*?)-- =======================================================\s*-- Idempotent response kapanışı/i,
      )?.[1] ?? "";

    assert.match(
      block,
      /for update/i,
    );

    assert.match(
      block,
      /status not in\s*\(\s*'draft'\s*,\s*'planned'\s*\)/i,
    );

    assert.match(
      block,
      /from public\.warehouse_quality_inspection_items/i,
    );

    assert.match(
      block,
      /status = 'in_progress'/i,
    );
  },
);


test(
  "QC-P2.1 inventory movement veya balance tablolarını mutate etmez",
  async () => {
    const sql =
      await source();

    assert.doesNotMatch(
      sql,
      /\b(insert\s+into|update|delete\s+from)\s+public\.warehouse_inventory_/i,
    );

    assert.doesNotMatch(
      sql,
      /warehouse_inventory_post/i,
    );
  },
);


test(
  "QC-P2.1 Receiving durumunu veya stok posting sorumluluğunu değiştirmez",
  async () => {
    const sql =
      await source();

    assert.doesNotMatch(
      sql,
      /update\s+public\.warehouse_receivings/i,
    );

    assert.doesNotMatch(
      sql,
      /inventory_movement_id\s*=/i,
    );
  },
);
