import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migration =
  fs.readFileSync(
    "supabase/migrations/20260814014000_warehouse_cycle_count_periodic_planning.sql",
    "utf8"
  );

test(
  "periodic planning rule schedule ve run persistence tablolarını oluşturur",
  () => {
    for (
      const table of [
        "warehouse_cycle_count_rules",
        "warehouse_cycle_count_schedules",
        "warehouse_cycle_count_schedule_runs",
      ]
    ) {
      assert.match(
        migration,
        new RegExp(
          `create table if not exists\\s+public\\.${table}`,
          "i"
        )
      );
    }
  }
);

test(
  "periodic rules mevcut Cycle Count strateji domainini korur",
  () => {
    for (
      const strategy of [
        "abc_classification",
        "location_based",
        "product_based",
        "lot_based",
        "serial_based",
        "random_sample",
        "risk_based",
        "value_based",
        "movement_based",
        "exception_based",
        "full_inventory",
        "blind_count",
      ]
    ) {
      assert.match(
        migration,
        new RegExp(
          `'${strategy}'`
        )
      );
    }
  }
);

test(
  "schedule yalnız monthly ve annual cadence kabul eder",
  () => {
    assert.match(
      migration,
      /cadence in\s*\(\s*'monthly',\s*'annual'/i
    );

    assert.match(
      migration,
      /cadence = 'monthly'[\s\S]*month_of_year is null/i
    );

    assert.match(
      migration,
      /cadence = 'annual'[\s\S]*month_of_year[\s\S]*between 1 and 12/i
    );
  }
);

test(
  "schedule warehouse timezone-aware contract taşır",
  () => {
    assert.match(
      migration,
      /timezone text not null[\s\S]*default 'Europe\/Istanbul'/i
    );

    assert.match(
      migration,
      /local_time time without time zone/i
    );

    assert.match(
      migration,
      /next_run_at timestamptz not null/i
    );
  }
);

test(
  "day of month 1-28 ile her ay güvenli çalıştırılabilir",
  () => {
    assert.match(
      migration,
      /day_of_month[\s\S]*between 1 and 28/i
    );
  }
);

test(
  "period run account schedule period key ile idempotenttir",
  () => {
    assert.match(
      migration,
      /unique\s*\(\s*account_id,\s*schedule_id,\s*period_key\s*\)/i
    );
  }
);

test(
  "run lifecycle pending generated released skipped failed durumlarını korur",
  () => {
    for (
      const status of [
        "pending",
        "generated",
        "released",
        "skipped",
        "failed",
      ]
    ) {
      assert.match(
        migration,
        new RegExp(
          `'${status}'`
        )
      );
    }

    assert.match(
      migration,
      /warehouse_cycle_count_schedule_runs_generated_state_check/i
    );
  }
);

test(
  "existing Cycle Count rule_id ve schedule_id tenant scoped FK olur",
  () => {
    assert.match(
      migration,
      /warehouse_cycle_counts_periodic_rule_fk[\s\S]*foreign key\s*\(\s*account_id,\s*warehouse_id,\s*rule_id\s*\)/i
    );

    assert.match(
      migration,
      /warehouse_cycle_counts_periodic_schedule_fk[\s\S]*foreign key\s*\(\s*account_id,\s*warehouse_id,\s*schedule_id\s*\)/i
    );
  }
);

test(
  "rule schedule run tablolarında RLS açıktır",
  () => {
    for (
      const table of [
        "warehouse_cycle_count_rules",
        "warehouse_cycle_count_schedules",
        "warehouse_cycle_count_schedule_runs",
      ]
    ) {
      assert.match(
        migration,
        new RegExp(
          `alter table\\s+public\\.${table}\\s+enable row level security`,
          "i"
        )
      );
    }
  }
);

test(
  "public anon authenticated direct periodic table access kapalıdır",
  () => {
    for (
      const table of [
        "warehouse_cycle_count_rules",
        "warehouse_cycle_count_schedules",
        "warehouse_cycle_count_schedule_runs",
      ]
    ) {
      for (
        const role of [
          "public",
          "anon",
          "authenticated",
        ]
      ) {
        assert.match(
          migration,
          new RegExp(
            `revoke all\\s+on table\\s+public\\.${table}\\s+from ${role}`,
            "i"
          )
        );
      }
    }
  }
);

test(
  "persistence foundation Cycle Count veya task üretmez",
  () => {
    assert.doesNotMatch(
      migration,
      /insert\s+into\s+public\.warehouse_cycle_counts/i
    );

    assert.doesNotMatch(
      migration,
      /insert\s+into\s+public\.warehouse_cycle_count_items/i
    );

    assert.doesNotMatch(
      migration,
      /insert\s+into\s+public\.warehouse_cycle_count_tasks/i
    );
  }
);

test(
  "periodic persistence inventory mutation yapmaz",
  () => {
    assert.doesNotMatch(
      migration,
      /update\s+public\.warehouse_inventory_balances/i
    );

    assert.doesNotMatch(
      migration,
      /insert\s+into\s+public\.warehouse_inventory_movements/i
    );

    assert.doesNotMatch(
      migration,
      /delete\s+from\s+public\.warehouse_inventory/i
    );
  }
);

test(
  "rule full inventory ve automatic release ayarlarını persistence eder",
  () => {
    assert.match(
      migration,
      /strategy text not null[\s\S]*default 'full_inventory'/i
    );

    assert.match(
      migration,
      /auto_release boolean not null[\s\S]*default true/i
    );

    assert.match(
      migration,
      /selection_config jsonb not null/i
    );
  }
);

test(
  "schedule kimliği rule ile birlikte tenant scoped unique contract taşır",
  () => {
    assert.match(
      migration,
      /warehouse_cycle_count_schedules_account_warehouse_rule_id_unique[\s\S]*unique\s*\(\s*account_id,\s*warehouse_id,\s*rule_id,\s*id\s*\)/i
    );
  }
);

test(
  "schedule run başka rule schedule çiftine bağlanamaz",
  () => {
    assert.match(
      migration,
      /warehouse_cycle_count_schedule_runs_schedule_fk[\s\S]*foreign key\s*\(\s*account_id,\s*warehouse_id,\s*rule_id,\s*schedule_id\s*\)[\s\S]*references public\.warehouse_cycle_count_schedules\s*\(\s*account_id,\s*warehouse_id,\s*rule_id,\s*id\s*\)/i
    );
  }
);

test(
  "schedule run başka depodaki Cycle Count kaydına bağlanamaz",
  () => {
    assert.match(
      migration,
      /warehouse_cycle_counts_account_warehouse_id_uidx[\s\S]*account_id,\s*warehouse_id,\s*id/i
    );

    assert.match(
      migration,
      /warehouse_cycle_count_schedule_runs_count_fk[\s\S]*foreign key\s*\(\s*account_id,\s*warehouse_id,\s*cycle_count_id\s*\)[\s\S]*references public\.warehouse_cycle_counts\s*\(\s*account_id,\s*warehouse_id,\s*id\s*\)/i
    );
  }
);

test(
  "Cycle Count rule ve schedule aynı periodic configuration çiftine bağlanır",
  () => {
    assert.match(
      migration,
      /warehouse_cycle_counts_periodic_rule_schedule_match_fk[\s\S]*foreign key\s*\(\s*account_id,\s*warehouse_id,\s*rule_id,\s*schedule_id\s*\)[\s\S]*references public\.warehouse_cycle_count_schedules\s*\(\s*account_id,\s*warehouse_id,\s*rule_id,\s*id\s*\)/i
    );
  }
);

test(
  "Cycle Count periodic rule_id ve schedule_id birlikte null veya birlikte dolu olmak zorundadır",
  () => {
    assert.match(
      migration,
      /warehouse_cycle_counts_periodic_pair_check[\s\S]*rule_id is null[\s\S]*schedule_id is null[\s\S]*rule_id is not null[\s\S]*schedule_id is not null[\s\S]*not valid/i
    );
  }
);
