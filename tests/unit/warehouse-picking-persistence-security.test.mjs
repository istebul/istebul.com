import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  PICKING_STRATEGIES,
} from "../../src/warehouse/types/PickingStrategy.ts";

const migrationUrl = new URL(
  "../../supabase/migrations/20260812161000_warehouse_picking_persistence.sql",
  import.meta.url,
);

const sql = await readFile(migrationUrl, "utf8");

const executableSql = sql
  .replace(/--.*$/gm, "")
  .replace(/\/\*[\s\S]*?\*\//g, "");

const tables = [
  "warehouse_picking_waves",
  "warehouse_picking_batches",
  "warehouse_pickings",
  "warehouse_picking_items",
  "warehouse_picking_suggestions",
  "warehouse_picking_tasks",
  "warehouse_picking_routes",
  "warehouse_picking_exceptions",
  "warehouse_picking_write_requests",
];

test(
  "Picking persistence gerekli tabloları oluşturur",
  () => {
    for (const table of tables) {
      assert.match(
        sql,
        new RegExp(
          `create table if not exists public\\.${table}\\s*\\(`,
          "i",
        ),
        `${table} tablosu bulunamadı`,
      );
    }
  },
);

test(
  "Picking tablolarında RLS açıktır",
  () => {
    for (const table of tables) {
      assert.match(
        sql,
        new RegExp(
          `alter table public\\.${table}\\s+enable row level security`,
          "i",
        ),
        `${table} için RLS bulunamadı`,
      );
    }
  },
);

test(
  "Picking read policy account üyeliği ile sınırlıdır",
  () => {
    const accessMatches =
      sql.match(
        /warehouse_has_account_access\s*\(\s*account_id\s*\)/gi,
      ) ?? [];

    assert.ok(
      accessMatches.length >= tables.length,
      "Tüm Picking read policy'lerinde account erişim kontrolü bekleniyor.",
    );
  },
);

test(
  "Picking write request yalnız çağıran kullanıcının kaydını gösterir",
  () => {
    assert.match(
      sql,
      /warehouse_picking_write_requests_owner_select[\s\S]*?user_id\s*=\s*auth\.uid\(\)/i,
    );
  },
);

test(
  "authenticated rolüne doğrudan Picking mutation verilmez",
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
      sql,
      /grant\s+(?:insert|update|delete|all)[\s\S]*?to\s+authenticated/i,
    );
  },
);

test(
  "Picking persistence caller JWT dışında service role kullanmaz",
  () => {
    assert.doesNotMatch(
      executableSql,
      /service[_ -]?role|SUPABASE_SERVICE|serviceRole/i,
    );
  },
);

test(
  "Picking persistence inventory bakiyesi veya hareketi yazmaz",
  () => {
    assert.doesNotMatch(
      sql,
      /(?:insert\s+into|update|delete\s+from)\s+public\.warehouse_inventory_(?:balances|movements)/i,
    );
  },
);

test(
  "reservation_id korunur fakat var olmayan reservation tablosuna FK kurulmaz",
  () => {
    assert.match(
      sql,
      /\breservation_id\s+uuid\b/i,
    );

    assert.doesNotMatch(
      sql,
      /references\s+public\.[a-z0-9_]*reservation[a-z0-9_]*\s*\(/i,
    );
  },
);

test(
  "Picking strategy constraintleri domain stratejilerinin tamamını kapsar",
  () => {
    const strategyBlocks = [
      ...sql.matchAll(
        /constraint warehouse_(?:pickings|picking_items|picking_suggestions)_strategy_check[\s\S]*?strategy\s+in\s*\(([\s\S]*?)\)\s*\)\s*,/gi,
      ),
    ].map((match) => match[1]);

    assert.equal(
      strategyBlocks.length,
      3,
      "Ana Picking, item ve suggestion için üç strategy constraint bekleniyor.",
    );

    for (const block of strategyBlocks) {
      for (const strategy of PICKING_STRATEGIES) {
        assert.ok(
          block.includes(`'${strategy}'`),
          `Eksik Picking strategy: ${strategy}`,
        );
      }
    }
  },
);

test(
  "Wave ve batch tenant composite FK silmede account_id değerini null yapmaz",
  () => {
    assert.doesNotMatch(
      sql,
      /references public\.warehouse_picking_(?:waves|batches)\s*\(\s*account_id\s*,\s*id\s*\)[\s\S]{0,80}?on delete set null/i,
    );

    assert.match(
      sql,
      /references public\.warehouse_picking_waves\s*\(\s*account_id\s*,\s*id\s*\)\s*on delete restrict/i,
    );

    assert.match(
      sql,
      /references public\.warehouse_picking_batches\s*\(\s*account_id\s*,\s*id\s*\)\s*on delete restrict/i,
    );
  },
);

test(
  "Picking parent yaşam döngüsü domain statuslarını korur",
  () => {
    for (const status of [
      "draft",
      "planned",
      "released",
      "in_progress",
      "partially_completed",
      "completed",
      "cancelled",
    ]) {
      assert.ok(
        sql.includes(`'${status}'`),
        `Eksik Picking status: ${status}`,
      );
    }
  },
);

test(
  "Picking item miktar bütünlüğü DB constraint ile korunur",
  () => {
    assert.match(
      sql,
      /picked_quantity\s*\+\s*short_quantity\s*<=\s*requested_quantity/i,
    );

    assert.match(
      sql,
      /remaining_quantity\s*=\s*requested_quantity\s*-\s*picked_quantity\s*-\s*short_quantity/i,
    );
  },
);

test(
  "Picking source ve destination aynı lokasyon olamaz",
  () => {
    assert.match(
      sql,
      /source_location_id\s*<>\s*destination_location_id/i,
    );
  },
);

test(
  "Picking item product ve SKU tenant FK bütünlüğünü korur",
  () => {
    assert.match(
      sql,
      /references public\.warehouse_products\s*\(\s*account_id\s*,\s*id\s*\)/i,
    );

    assert.match(
      sql,
      /references public\.warehouse_product_skus\s*\(\s*account_id\s*,\s*product_id\s*,\s*id\s*\)/i,
    );
  },
);

test(
  "Picking write request idempotency anahtarı account + request_id'dir",
  () => {
    assert.match(
      sql,
      /primary key\s*\(\s*account_id\s*,\s*request_id\s*\)/i,
    );
  },
);

test(
  "Picking persistence barkod taramasına write davranışı eklemez",
  () => {
    assert.doesNotMatch(
      sql,
      /warehouse:barcode-scan/i,
    );
  },
);
