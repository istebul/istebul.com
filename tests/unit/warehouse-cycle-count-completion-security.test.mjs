import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source =
  fs.readFileSync(
    "supabase/migrations/20260814010000_warehouse_cycle_count_completion.sql",
    "utf8",
  );

test(
  "Cycle Count completion adjustment approval ve immutable report tablolarını oluşturur",
  () => {
    assert.match(
      source,
      /create table if not exists\s+public\.warehouse_cycle_count_adjustments/i,
    );

    assert.match(
      source,
      /create table if not exists\s+public\.warehouse_cycle_count_approvals/i,
    );

    assert.match(
      source,
      /create table if not exists\s+public\.warehouse_cycle_count_reports/i,
    );
  },
);

test(
  "Completion action contract önceki aksiyonları korur ve lifecycle aksiyonlarını ekler",
  () => {
    for (
      const action
      of [
        "record_quantity",
        "evaluate_first_count",
        "record_recount_quantity",
        "evaluate_recount",
        "approve_count",
        "prepare_adjustments",
        "approve_adjustments",
        "reject_adjustments",
        "process_adjustments",
        "complete_count",
      ]
    ) {
      assert.match(
        source,
        new RegExp(
          `'${action}'`,
        ),
      );
    }
  },
);

test(
  "Adjustment persistence domain type ve lifecycle durumlarını korur",
  () => {
    for (
      const value
      of [
        "increase",
        "decrease",
        "damage",
        "stock_status_change",
        "pending",
        "approval_required",
        "approved",
        "processing",
        "completed",
        "failed",
        "cancelled",
      ]
    ) {
      assert.match(
        source,
        new RegExp(
          `'${value}'`,
        ),
      );
    }
  },
);

test(
  "Approval persistence pending approved rejected cancelled durumlarını korur",
  () => {
    for (
      const value
      of [
        "pending",
        "approved",
        "rejected",
        "cancelled",
      ]
    ) {
      assert.match(
        source,
        new RegExp(
          `'${value}'`,
        ),
      );
    }
  },
);

test(
  "Bir sayım satırında ikinci aktif adjustment engellenir",
  () => {
    assert.match(
      source,
      /warehouse_cycle_count_adjustments_active_item_uidx/i,
    );

    assert.match(
      source,
      /where status not in\s*\(\s*'failed',\s*'cancelled',\s*'completed'\s*\)/i,
    );
  },
);

test(
  "Bir adjustment için ikinci pending approval engellenir",
  () => {
    assert.match(
      source,
      /warehouse_cycle_count_approvals_pending_adjustment_uidx/i,
    );
  },
);

test(
  "Completion report bir count için immutable tek snapshot kontratı taşır",
  () => {
    assert.match(
      source,
      /warehouse_cycle_count_reports_count_unique/i,
    );

    assert.match(
      source,
      /jsonb_typeof\(summary\)\s*=\s*'object'/i,
    );

    assert.match(
      source,
      /jsonb_typeof\(items\)\s*=\s*'array'/i,
    );
  },
);

test(
  "Adjustment approval ve report tablolarında RLS açıktır",
  () => {
    for (
      const table
      of [
        "warehouse_cycle_count_adjustments",
        "warehouse_cycle_count_approvals",
        "warehouse_cycle_count_reports",
      ]
    ) {
      assert.match(
        source,
        new RegExp(
          `alter table\\s+public\\.${table}\\s+enable row level security`,
          "i",
        ),
      );
    }
  },
);

test(
  "anon ve authenticated direct access kapalıdır",
  () => {
    for (
      const table
      of [
        "warehouse_cycle_count_adjustments",
        "warehouse_cycle_count_approvals",
        "warehouse_cycle_count_reports",
      ]
    ) {
      assert.match(
        source,
        new RegExp(
          `revoke all\\s+on table public\\.${table}\\s+from anon`,
          "i",
        ),
      );

      assert.match(
        source,
        new RegExp(
          `revoke all\\s+on table public\\.${table}\\s+from authenticated`,
          "i",
        ),
      );
    }
  },
);

test(
  "Persistence migration inventory balance veya movement mutation yapmaz",
  () => {
    assert.doesNotMatch(
      source,
      /update\s+public\.warehouse_inventory_balances/i,
    );

    assert.doesNotMatch(
      source,
      /insert\s+into\s+public\.warehouse_inventory_movements/i,
    );
  },
);
