import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260812174500_warehouse_picking_atomic_execute.sql";

const apiPath =
  "functions/api/warehouse/picking.js";

const sql =
  await readFile(
    migrationPath,
    "utf8",
  );

const api =
  await readFile(
    apiPath,
    "utf8",
  );

const executableSql =
  sql
    .replace(
      /--.*$/gm,
      "",
    )
    .replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    );

test(
  "atomik Picking execute dar SECURITY DEFINER RPC oluşturur",
  () => {
    assert.match(
      executableSql,
      /create or replace function public\.warehouse_picking_execute_write/i,
    );

    assert.match(
      executableSql,
      /security definer/i,
    );

    assert.match(
      executableSql,
      /set search_path = public, pg_temp/i,
    );
  },
);

test(
  "execute caller JWT ve picker dahil operasyon rollerini doğrular",
  () => {
    assert.match(
      executableSql,
      /auth\.uid\(\)/,
    );

    assert.match(
      executableSql,
      /warehouse_has_account_role/,
    );

    assert.match(
      executableSql,
      /'picker'/,
    );

    assert.doesNotMatch(
      executableSql,
      /'viewer'/,
    );
  },
);

test(
  "execute stable account idempotency ve canonical payload kullanır",
  () => {
    assert.match(
      executableSql,
      /warehouse_picking_write_requests/,
    );

    assert.match(
      executableSql,
      /'execute_item'/,
    );

    assert.match(
      executableSql,
      /request_payload/,
    );

    assert.match(
      executableSql,
      /response_payload/,
    );

    assert.match(
      executableSql,
      /on conflict\s*\(\s*account_id\s*,\s*request_id\s*\)\s*do nothing/i,
    );

    assert.match(
      executableSql,
      /v_existing_payload\s*<>\s*v_payload/i,
    );
  },
);

test(
  "Picking parent ve item FOR UPDATE ile kilitlenir",
  () => {
    assert.match(
      executableSql,
      /from public\.warehouse_pickings[\s\S]{0,180}?for update/i,
    );

    assert.match(
      executableSql,
      /from public\.warehouse_picking_items[\s\S]{0,220}?for update/i,
    );
  },
);

test(
  "execute yalnız devam eden Picking üzerinde çalışır",
  () => {
    assert.match(
      executableSql,
      /v_picking\.status not in\s*\(\s*'in_progress'\s*,\s*'partially_completed'/i,
    );
  },
);

test(
  "quantity + shortQuantity kalan miktarı aşamaz",
  () => {
    assert.match(
      executableSql,
      /v_processed_quantity\s*:=\s*v_quantity\s*\+\s*v_short_quantity/i,
    );

    assert.match(
      executableSql,
      /v_processed_quantity\s*>\s*v_item\.remaining_quantity/i,
    );
  },
);

test(
  "kaynak ve hedef lokasyon account + warehouse kapsamında doğrulanır",
  () => {
    assert.match(
      executableSql,
      /into v_source_location[\s\S]{0,220}?account_id = p_account_id[\s\S]{0,160}?warehouse_id = v_item\.warehouse_id/i,
    );

    assert.match(
      executableSql,
      /into v_destination_location[\s\S]{0,220}?account_id = p_account_id[\s\S]{0,160}?warehouse_id = v_item\.warehouse_id/i,
    );

    assert.match(
      executableSql,
      /'blocked'/,
    );

    assert.match(
      executableSql,
      /'maintenance'/,
    );

    assert.match(
      executableSql,
      /'inactive'/,
    );
  },
);

test(
  "barkod yalnız item doğrulaması için warehouse_product_barcodes okur",
  () => {
    assert.match(
      executableSql,
      /from public\.warehouse_product_barcodes/i,
    );

    assert.match(
      executableSql,
      /product_id = v_item\.product_id/i,
    );

    assert.match(
      executableSql,
      /value = v_barcode/i,
    );
  },
);

test(
  "lot ve seri uyuşmazlığı execute işlemini reddeder",
  () => {
    assert.match(
      executableSql,
      /v_item\.lot_number is not null/i,
    );

    assert.match(
      executableSql,
      /v_item\.serial_number is not null/i,
    );

    assert.match(
      executableSql,
      /Lot takipli ürün için lot numarası okutulmalıdır/i,
    );

    assert.match(
      executableSql,
      /Seri numarası takipli ürün için seri numarası okutulmalıdır/i,
    );
  },
);

test(
  "bağlı reservation aynı transaction içinde FOR UPDATE kilitlenir",
  () => {
    assert.match(
      executableSql,
      /from public\.warehouse_inventory_reservations[\s\S]{0,180}?for update/i,
    );

    assert.match(
      executableSql,
      /'active'\s*,\s*'partially_consumed'/i,
    );

    assert.match(
      executableSql,
      /v_reservation\.quantity\s*-\s*v_reservation\.consumed_quantity/i,
    );
  },
);

test(
  "reservation depo lokasyon ürün SKU unit lot ve seri boyutlarında doğrulanır",
  () => {
    for (const field of [
      "v_reservation.warehouse_id",
      "v_reservation.location_id",
      "v_reservation.product_id",
      "v_reservation.sku_id",
      "v_reservation.unit",
      "v_reservation.lot_number",
      "v_reservation.serial_number",
    ]) {
      assert.ok(
        executableSql.includes(
          field,
        ),
        `Eksik reservation kontrolü: ${field}`,
      );
    }
  },
);

test(
  "quantity > 0 kaynak stoktan düşer ve hedef stoka atomik eklenir",
  () => {
    assert.match(
      executableSql,
      /if v_quantity > 0 then/i,
    );

    assert.match(
      executableSql,
      /quantity\s*=\s*quantity\s*-\s*v_quantity/i,
    );

    assert.match(
      executableSql,
      /insert into public\.warehouse_inventory_balances/i,
    );

    assert.match(
      executableSql,
      /on conflict\s*\([\s\S]{0,300}?stock_status[\s\S]{0,100}?\)\s*do update/i,
    );

    assert.match(
      executableSql,
      /warehouse_inventory_balances\.quantity\s*\+\s*excluded\.quantity/i,
    );
  },
);

test(
  "Picking transferi OUT + IN ledger ve aynı transaction group kullanır",
  () => {
    assert.match(
      executableSql,
      /'manual_adjustment_out'\s*,\s*'adjustment'/i,
    );

    assert.match(
      executableSql,
      /'manual_adjustment_in'\s*,\s*'adjustment'/i,
    );

    assert.match(
      executableSql,
      /'picking'/i,
    );

    assert.match(
      executableSql,
      /transaction_group_id/i,
    );

    assert.match(
      executableSql,
      /warehouse_inventory_movement_number_seq/i,
    );
  },
);

test(
  "reservation consume stok transferiyle aynı RPC transactionındadır",
  () => {
    assert.match(
      executableSql,
      /update public\.warehouse_inventory_reservations/i,
    );

    assert.match(
      executableSql,
      /consumed_quantity\s*=\s*v_reservation_consumed/i,
    );

    assert.match(
      executableSql,
      /'consumed'/i,
    );

    assert.match(
      executableSql,
      /'partially_consumed'/i,
    );
  },
);

test(
  "tam short-pick stok hareketi oluşturmadan exception üretir",
  () => {
    assert.match(
      executableSql,
      /if v_short_quantity > 0 then/i,
    );

    assert.match(
      executableSql,
      /insert into public\.warehouse_picking_exceptions/i,
    );

    assert.match(
      executableSql,
      /'short_pick'/i,
    );
  },
);

test(
  "Picking item picked short remaining movement ve transaction group alanlarını günceller",
  () => {
    assert.match(
      executableSql,
      /picked_quantity\s*=\s*picked_quantity\s*\+\s*v_quantity/i,
    );

    assert.match(
      executableSql,
      /short_quantity\s*=\s*short_quantity\s*\+\s*v_short_quantity/i,
    );

    assert.match(
      executableSql,
      /remaining_quantity\s*=\s*remaining_quantity\s*-\s*v_processed_quantity/i,
    );

    assert.match(
      executableSql,
      /inventory_movement_ids/i,
    );

    assert.match(
      executableSql,
      /transaction_group_ids/i,
    );
  },
);

test(
  "ilgili Picking task satır durumuna göre güncellenir",
  () => {
    assert.match(
      executableSql,
      /update public\.warehouse_picking_tasks/i,
    );

    assert.match(
      executableSql,
      /picking_item_id\s*=\s*v_item\.id/i,
    );

    assert.match(
      executableSql,
      /'completed'/i,
    );

    assert.match(
      executableSql,
      /'partially_completed'/i,
    );
  },
);

test(
  "execute tüm satırlar işlense bile parent completed yapmaz",
  () => {
    assert.match(
      executableSql,
      /v_parent_status\s*:=\s*'partially_completed'/i,
    );

    assert.match(
      executableSql,
      /v_parent_status\s*:=\s*'in_progress'/i,
    );

    assert.doesNotMatch(
      executableSql,
      /set\s+status\s*=\s*'completed'/i,
    );
  },
);

test(
  "execute RPC PUBLIC ve anon kapalı authenticated execute açıktır",
  () => {
    assert.match(
      sql,
      /revoke all on function public\.warehouse_picking_execute_write[\s\S]*?from public/i,
    );

    assert.match(
      sql,
      /revoke all on function public\.warehouse_picking_execute_write[\s\S]*?from anon/i,
    );

    assert.match(
      sql,
      /grant execute on function public\.warehouse_picking_execute_write[\s\S]*?to authenticated/i,
    );
  },
);

test(
  "atomik Picking execute service role veya direct table grant açmaz",
  () => {
    assert.doesNotMatch(
      executableSql + "\n" + api,
      /service_role|SUPABASE_SERVICE_ROLE_KEY|serviceRole/i,
    );

    assert.doesNotMatch(
      executableSql,
      /grant\s+(?:insert|update|delete|all)[\s\S]{0,120}?warehouse_inventory_(?:movements|balances|reservations)/i,
    );
  },
);

test(
  "HTTP execute_item yalnız atomik RPC üzerinden çalışır",
  () => {
    assert.match(
      api,
      /warehouse_picking_execute_write/,
    );

    assert.match(
      api,
      /p_short_quantity/,
    );

    assert.match(
      api,
      /p_barcode/,
    );

    assert.doesNotMatch(
      api,
      /\.from\(\s*["']warehouse_/,
    );
  },
);

test(
  "write request action constraint execute_item aksiyonunu runtime'da kabul eder",
  () => {
    const actionConstraint =
      executableSql.match(
        /add constraint\s+warehouse_picking_write_requests_action_check\s+check\s*\(\s*action\s+in\s*\(([\s\S]*?)\)\s*\)/i,
      );

    assert.ok(
      actionConstraint,
      "A5.2 execute action constraint upgrade bulunamadı.",
    );

    for (const action of [
      "create",
      "add_item",
      "release",
      "create_task",
      "start",
      "execute_item",
    ]) {
      assert.ok(
        actionConstraint[1].includes(
          `'${action}'`,
        ),
        `Runtime action constraint içinde eksik aksiyon: ${action}`,
      );
    }

    for (const forbidden of [
      "complete",
      "cancel",
      "resolve_exception",
    ]) {
      assert.doesNotMatch(
        actionConstraint[1],
        new RegExp(
          `'${forbidden}'`,
          "i",
        ),
      );
    }
  },
);

test(
  "short-pick exception INSERT yalnız persistence tablosunda bulunan kolonları kullanır",
  async () => {
    const persistenceSql =
      await readFile(
        "supabase/migrations/20260812161000_warehouse_picking_persistence.sql",
        "utf8",
      );

    const tableMatch =
      persistenceSql.match(
        /create table if not exists public\.warehouse_picking_exceptions\s*\(([\s\S]*?)\n\);/i,
      );

    assert.ok(
      tableMatch,
      "warehouse_picking_exceptions tablo tanımı bulunamadı.",
    );

    const tableColumns =
      new Set(
        tableMatch[1]
          .split("\n")
          .map((line) => line.trim())
          .filter(
            (line) =>
              /^[a-z_][a-z0-9_]*\s+/i.test(line) &&
              !/^(constraint|primary|foreign|unique|check|references|on)\b/i.test(
                line,
              ),
          )
          .map(
            (line) =>
              line.match(
                /^([a-z_][a-z0-9_]*)/i,
              )[1].toLowerCase(),
          ),
      );

    const insertMatch =
      executableSql.match(
        /insert into public\.warehouse_picking_exceptions\s*\(([\s\S]*?)\)\s*values\s*\(/i,
      );

    assert.ok(
      insertMatch,
      "Short-pick exception INSERT bulunamadı.",
    );

    const insertColumns =
      insertMatch[1]
        .split(",")
        .map(
          (column) =>
            column.trim().toLowerCase(),
        )
        .filter(Boolean);

    for (const column of insertColumns) {
      assert.ok(
        tableColumns.has(column),
        `Exception INSERT tabloda olmayan kolon kullanıyor: ${column}`,
      );
    }

    assert.doesNotMatch(
      insertMatch[1],
      /\bupdated_at\b/i,
    );
  },
);
