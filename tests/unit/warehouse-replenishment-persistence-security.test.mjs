import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration =
  fs.readFileSync(
    new URL(
      "../../supabase/migrations/20260819010000_warehouse_replenishment_persistence.sql",
      import.meta.url,
    ),
    "utf8",
  );

const tables = [
  "warehouse_replenishment_rules",
  "warehouse_replenishments",
  "warehouse_replenishment_items",
  "warehouse_replenishment_demands",
  "warehouse_replenishment_allocations",
  "warehouse_replenishment_suggestions",
  "warehouse_replenishment_tasks",
  "warehouse_replenishment_exceptions",
  "warehouse_replenishment_performance",
];

test(
  "replenishment persistence creates exact nine-table domain",
  () => {
    const created =
      [
        ...migration.matchAll(
          /create\s+table\s+if\s+not\s+exists\s+public\.(warehouse_replenishment[a-z0-9_]*)/gi,
        ),
      ].map(
        (match) =>
          match[1],
      );

    assert.deepEqual(
      [...new Set(created)].sort(),
      [...tables].sort(),
    );
  },
);

test(
  "all replenishment tables enable RLS",
  () => {
    for (const table of tables) {
      assert.match(
        migration,
        new RegExp(
          `alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`,
          "i",
        ),
      );
    }
  },
);

test(
  "all read policies are authenticated and tenant scoped",
  () => {
    for (const table of tables) {
      assert.match(
        migration,
        new RegExp(
          `create\\s+policy[\\s\\S]*?on\\s+public\\.${table}[\\s\\S]*?for\\s+select[\\s\\S]*?to\\s+authenticated[\\s\\S]*?warehouse_has_account_access\\s*\\(\\s*account_id\\s*\\)`,
          "i",
        ),
      );
    }
  },
);

test(
  "anon and authenticated privileges are reset before read-only grants",
  () => {
    for (const table of tables) {
      assert.match(
        migration,
        new RegExp(
          `revoke\\s+all\\s+on\\s+public\\.${table}\\s+from\\s+anon\\s*,\\s*authenticated`,
          "i",
        ),
      );

      assert.match(
        migration,
        new RegExp(
          `grant\\s+select\\s+on\\s+public\\.${table}\\s+to\\s+authenticated`,
          "i",
        ),
      );
    }
  },
);

test(
  "authenticated receives no direct replenishment mutation privilege",
  () => {
    for (const table of tables) {
      assert.doesNotMatch(
        migration,
        new RegExp(
          `grant\\s+(?:all|insert|update|delete|[^;]*\\binsert\\b[^;]*)\\s+on\\s+public\\.${table}\\s+to\\s+authenticated`,
          "i",
        ),
      );
    }
  },
);

test(
  "service role table grants are infrastructure ACL only",
  () => {
    for (const table of tables) {
      assert.match(
        migration,
        new RegExp(
          `grant\\s+all\\s+on\\s+public\\.${table}\\s+to\\s+service_role`,
          "i",
        ),
      );
    }

    assert.doesNotMatch(
      migration,
      /\bif\b[\s\S]{0,160}\bservice_role\b/i,
    );
  },
);

test(
  "master table persists exact status domain",
  () => {
    for (const status of [
      "draft",
      "planned",
      "released",
      "assigned",
      "in_progress",
      "partially_completed",
      "completed",
      "exception",
      "cancelled",
    ]) {
      assert.match(
        migration,
        new RegExp(
          `'${status}'`,
        ),
      );
    }
  },
);

test(
  "master source uses canonical replenishment source types",
  () => {
    for (const sourceType of [
      "manual",
      "minimum_stock",
      "maximum_stock",
      "order_demand",
      "wave_demand",
      "short_pick",
      "cycle_count",
      "inventory_exception",
      "forecast",
      "scheduled",
      "external_system",
    ]) {
      assert.match(
        migration,
        new RegExp(
          `'${sourceType}'`,
        ),
      );
    }

    assert.match(
      migration,
      /source\s+jsonb\s+not\s+null/i,
    );
  },
);

test(
  "source reference uniqueness is tenant scoped",
  () => {
    assert.match(
      migration,
      /create\s+unique\s+index[\s\S]*?warehouse_replenishments_source_reference_uidx[\s\S]*?account_id[\s\S]*?source->>'type'[\s\S]*?source->>'referenceId'/i,
    );
  },
);

test(
  "child records use account plus replenishment composite foreign keys",
  () => {
    for (const table of [
      "warehouse_replenishment_items",
      "warehouse_replenishment_demands",
      "warehouse_replenishment_allocations",
      "warehouse_replenishment_suggestions",
      "warehouse_replenishment_tasks",
      "warehouse_replenishment_exceptions",
    ]) {
      const start =
        migration.indexOf(
          `create table if not exists public.${table}`,
        );

      const end =
        migration.indexOf(
          "\n);",
          start,
        );

      assert.notEqual(
        start,
        -1,
      );

      assert.notEqual(
        end,
        -1,
      );

      const block =
        migration.slice(
          start,
          end + 3,
        );

      assert.match(
        block,
        /foreign\s+key\s*\(\s*account_id\s*,\s*replenishment_id\s*\)[\s\S]*?references\s+public\.warehouse_replenishments\s*\(\s*account_id\s*,\s*id\s*\)/i,
      );
    }
  },
);

test(
  "warehouse references are account scoped",
  () => {
    assert.match(
      migration,
      /warehouse_replenishments_warehouse_fk[\s\S]*?foreign\s+key\s*\(\s*account_id\s*,\s*warehouse_id\s*\)[\s\S]*?references\s+public\.warehouses\s*\(\s*account_id\s*,\s*id\s*\)/i,
    );

    assert.match(
      migration,
      /warehouse_replenishment_items_warehouse_fk[\s\S]*?foreign\s+key\s*\(\s*account_id\s*,\s*warehouse_id\s*\)[\s\S]*?references\s+public\.warehouses\s*\(\s*account_id\s*,\s*id\s*\)/i,
    );
  },
);

test(
  "destination item location preserves account and warehouse scope",
  () => {
    assert.match(
      migration,
      /warehouse_replenishment_items_destination_fk[\s\S]*?foreign\s+key\s*\(\s*account_id\s*,\s*warehouse_id\s*,\s*destination_location_id\s*\)[\s\S]*?references\s+public\.warehouse_locations\s*\(\s*account_id\s*,\s*warehouse_id\s*,\s*id\s*\)/i,
    );
  },
);

test(
  "no-SKU destination product uniqueness is deterministic",
  () => {
    assert.match(
      migration,
      /warehouse_replenishment_items_destination_product_uidx[\s\S]*?coalesce\s*\(\s*sku_id[\s\S]*?00000000-0000-0000-0000-000000000000/i,
    );
  },
);

test(
  "quantity score and KPI guards are persisted",
  () => {
    assert.match(
      migration,
      /requested_quantity\s*>\s*0/i,
    );

    assert.match(
      migration,
      /allocated_quantity\s*>\s*0/i,
    );

    assert.match(
      migration,
      /urgency_score\s*>?=\s*0[\s\S]*?urgency_score\s*<=\s*100/i,
    );

    assert.match(
      migration,
      /completion_rate\s*>?=\s*0[\s\S]*?completion_rate\s*<=\s*100/i,
    );

    assert.match(
      migration,
      /fulfillment_rate\s*>?=\s*0[\s\S]*?fulfillment_rate\s*<=\s*100/i,
    );
  },
);

test(
  "persistence phase creates no write RPC or SECURITY DEFINER function",
  () => {
    assert.doesNotMatch(
      migration,
      /create\s+(?:or\s+replace\s+)?function\s+public\.warehouse_replenishment/i,
    );

    assert.doesNotMatch(
      migration,
      /\bsecurity\s+definer\b/i,
    );
  },
);

test(
  "persistence phase performs no inventory or workflow mutation",
  () => {
    assert.doesNotMatch(
      migration,
      /\b(?:insert\s+into|update|delete\s+from|truncate)\s+public\.warehouse_inventory_(?:balances|movements|reservations)\b/i,
    );

    assert.doesNotMatch(
      migration,
      /\b(?:insert\s+into|update|delete\s+from|truncate)\s+public\.warehouse_(?:picking|packing|shipping)[a-z0-9_]*\b/i,
    );
  },
);

test(
  "migration has no migration repair or include-all path",
  () => {
    assert.doesNotMatch(
      migration,
      /migration\s+repair/i,
    );

    assert.doesNotMatch(
      migration,
      /--include-all/i,
    );
  },
);

test(
  "rule FK delete semantics preserves tenant account_id and nulls only nullable rule_id",
  () => {
    const masterTable =
      migration.match(
        /create\s+table\s+if\s+not\s+exists\s+public\.warehouse_replenishments\s*\([\s\S]*?\n\);/i,
      )?.[0] ?? "";

    assert.notEqual(
      masterTable,
      "",
      "warehouse_replenishments table definition bulunmalı",
    );

    assert.match(
      masterTable,
      /\baccount_id\s+uuid\s+not\s+null\b/i,
    );

    assert.match(
      masterTable,
      /\brule_id\s+uuid\s*,/i,
    );

    assert.match(
      masterTable,
      /constraint\s+warehouse_replenishments_rule_fk[\s\S]*?foreign\s+key\s*\(\s*account_id\s*,\s*rule_id\s*\)[\s\S]*?references\s+public\.warehouse_replenishment_rules\s*\(\s*account_id\s*,\s*id\s*\)[\s\S]*?on\s+delete\s+set\s+null\s*\(\s*rule_id\s*\)/i,
    );

    assert.doesNotMatch(
      masterTable,
      /constraint\s+warehouse_replenishments_rule_fk[\s\S]*?on\s+delete\s+set\s+null\s*(?=\n|\r|,)/i,
    );
  },
);
