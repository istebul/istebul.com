import assert from "node:assert/strict";
import {
  readFile
} from "node:fs/promises";
import test from "node:test";

const MIGRATION =
  "supabase/migrations/20260813213500_warehouse_cycle_count_variance_recount_persistence.sql";

const CORE_PERSISTENCE =
  "supabase/migrations/20260813130000_warehouse_cycle_count_persistence.sql";

async function sql() {
  return readFile(
    MIGRATION,
    "utf8"
  );
}

test(
  "A7.3.0.1 Cycle Count result ve exception tablolarını oluşturur",
  async () => {
    const source =
      await sql();

    assert.match(
      source,
      /create table if not exists public\.warehouse_cycle_count_results/i
    );

    assert.match(
      source,
      /create table if not exists public\.warehouse_cycle_count_exceptions/i
    );
  }
);

test(
  "result persistence domain sonuç tiplerini ve evaluation stage ayrımını korur",
  async () => {
    const source =
      await sql();

    for (
      const type
      of [
        "match",
        "shortage",
        "surplus",
        "damaged",
        "unexpected_stock",
        "missing_stock",
        "recount_required"
      ]
    ) {
      assert.match(
        source,
        new RegExp(
          `'${type}'`
        )
      );
    }

    assert.match(
      source,
      /evaluation_stage\s+text\s+not null/i
    );

    assert.match(
      source,
      /'first_count'[\s\S]*'recount'/i
    );
  }
);

test(
  "result account count ve item composite izolasyonunu taşır",
  async () => {
    const source =
      await sql();

    assert.match(
      source,
      /warehouse_cycle_count_results_count_fk[\s\S]*foreign key\s*\(\s*account_id\s*,\s*cycle_count_id\s*\)[\s\S]*warehouse_cycle_counts/i
    );

    assert.match(
      source,
      /warehouse_cycle_count_results_item_fk[\s\S]*foreign key\s*\(\s*account_id\s*,\s*cycle_count_id\s*,\s*cycle_count_item_id\s*\)[\s\S]*warehouse_cycle_count_items/i
    );
  }
);

test(
  "result quantity ve variance alanları audit için kalıcıdır",
  async () => {
    const source =
      await sql();

    for (
      const field
      of [
        "expected_quantity",
        "counted_quantity",
        "damaged_quantity",
        "variance_quantity",
        "variance_percentage",
        "variance_value",
        "within_tolerance",
        "recount_required",
        "adjustment_required",
        "calculated_at"
      ]
    ) {
      assert.match(
        source,
        new RegExp(
          `\\b${field}\\b`,
          "i"
        )
      );
    }
  }
);

test(
  "bir sayım satırı için ilk ve yeniden sayım evaluation sonucu ayrı ve tekildir",
  async () => {
    const source =
      await sql();

    assert.match(
      source,
      /warehouse_cycle_count_results_item_stage_unique[\s\S]*unique\s*\(\s*account_id\s*,\s*cycle_count_item_id\s*,\s*evaluation_stage\s*\)/i
    );
  }
);

test(
  "exception persistence domain exception tiplerini ve çözüm alanlarını korur",
  async () => {
    const source =
      await sql();

    for (
      const type
      of [
        "location_not_found",
        "location_blocked",
        "product_not_found",
        "barcode_mismatch",
        "lot_mismatch",
        "serial_number_mismatch",
        "unexpected_product",
        "missing_stock",
        "excess_stock",
        "damaged_stock",
        "unit_mismatch",
        "variance_exceeded",
        "recount_required",
        "count_interrupted",
        "inventory_movement_detected",
        "approval_required",
        "adjustment_failed"
      ]
    ) {
      assert.match(
        source,
        new RegExp(
          `'${type}'`
        )
      );
    }

    assert.match(
      source,
      /resolved\s+boolean\s+not null\s+default false/i
    );

    assert.match(
      source,
      /resolved_by\s+uuid/i
    );

    assert.match(
      source,
      /resolved_at\s+timestamptz/i
    );

    assert.match(
      source,
      /resolution_notes\s+text/i
    );
  }
);

test(
  "exception account count item task warehouse location ve product kapsamını korur",
  async () => {
    const source =
      await sql();

    assert.match(
      source,
      /warehouse_cycle_count_exceptions_count_fk/i
    );

    assert.match(
      source,
      /warehouse_cycle_count_exceptions_item_fk/i
    );

    assert.match(
      source,
      /warehouse_cycle_count_exceptions_task_fk/i
    );

    assert.match(
      source,
      /warehouse_cycle_count_exceptions_warehouse_fk/i
    );

    assert.match(
      source,
      /warehouse_cycle_count_exceptions_location_fk/i
    );

    assert.match(
      source,
      /warehouse_cycle_count_exceptions_product_fk/i
    );
  }
);

test(
  "aynı item ve exception tipi için birden fazla açık kayıt engellenir",
  async () => {
    const source =
      await sql();

    assert.match(
      source,
      /create unique index if not exists warehouse_cycle_count_exceptions_open_item_type_uidx[\s\S]*account_id[\s\S]*cycle_count_item_id[\s\S]*type[\s\S]*resolved\s*=\s*false/i
    );
  }
);

test(
  "result ve exception RLS açık olsa da doğrudan istemci okumasına kapalıdır",
  async () => {
    const source =
      await sql();

    assert.match(
      source,
      /alter table public\.warehouse_cycle_count_results\s+enable row level security/i
    );

    assert.match(
      source,
      /alter table public\.warehouse_cycle_count_exceptions\s+enable row level security/i
    );

    assert.match(
      source,
      /revoke all\s+on table public\.warehouse_cycle_count_results\s+from authenticated/i
    );

    assert.match(
      source,
      /revoke all\s+on table public\.warehouse_cycle_count_exceptions\s+from authenticated/i
    );

    assert.doesNotMatch(
      source,
      /create policy warehouse_cycle_count_results_member_select/i
    );

    assert.doesNotMatch(
      source,
      /create policy warehouse_cycle_count_exceptions_member_select/i
    );

    assert.doesNotMatch(
      source,
      /grant select[\s\S]*warehouse_cycle_count_(results|exceptions)[\s\S]*authenticated/i
    );

    assert.doesNotMatch(
      source,
      /warehouse_has_account_access\s*\(\s*account_id\s*\)/i
    );
  }
);

test(
  "authenticated result veya exception tablosunda doğrudan privilege taşımaz",
  async () => {
    const source =
      await sql();

    assert.match(
      source,
      /revoke all\s+on table public\.warehouse_cycle_count_results\s+from authenticated/i
    );

    assert.match(
      source,
      /revoke all\s+on table public\.warehouse_cycle_count_exceptions\s+from authenticated/i
    );

    assert.doesNotMatch(
      source,
      /grant\s+(select|insert|update|delete|all)[\s\S]*warehouse_cycle_count_(results|exceptions)[\s\S]*authenticated/i
    );

    assert.doesNotMatch(
      source,
      /security definer/i
    );

    assert.doesNotMatch(
      source,
      /service_role|SUPABASE_SERVICE_ROLE_KEY/i
    );
  }
);

test(
  "expected quantity canlı bakiyeden değil Cycle Count snapshot alanından gelir",
  async () => {
    const [
      source,
      core
    ] =
      await Promise.all([
        sql(),
        readFile(
          CORE_PERSISTENCE,
          "utf8"
        )
      ]);

    assert.match(
      core,
      /expected_quantity\s+numeric\(18,\s*6\)\s+not null/i
    );

    assert.match(
      core,
      /first_count_quantity\s+numeric\(18,\s*6\)/i
    );

    assert.match(
      core,
      /second_count_quantity\s+numeric\(18,\s*6\)/i
    );

    assert.match(
      core,
      /tolerance_quantity\s+numeric\(18,\s*6\)/i
    );

    assert.match(
      core,
      /tolerance_percentage\s+numeric\(9,\s*4\)/i
    );

    assert.doesNotMatch(
      source,
      /warehouse_inventory_balances/i
    );
  }
);

test(
  "A7.3.0.1 yalnız persistence temelidir inventory adjustment approval veya RPC açmaz",
  async () => {
    const source =
      await sql();

    assert.doesNotMatch(
      source,
      /warehouse_inventory_(movements|balances)/i
    );

    assert.doesNotMatch(
      source,
      /warehouse_cycle_count_adjustments/i
    );

    assert.doesNotMatch(
      source,
      /warehouse_cycle_count_approvals/i
    );

    assert.doesNotMatch(
      source,
      /create\s+(or\s+replace\s+)?function/i
    );

    assert.doesNotMatch(
      source,
      /first_count_quantity\s*=/i
    );

    assert.doesNotMatch(
      source,
      /second_count_quantity\s*=/i
    );

    assert.doesNotMatch(
      source,
      /final_count_quantity\s*=/i
    );
  }
);
