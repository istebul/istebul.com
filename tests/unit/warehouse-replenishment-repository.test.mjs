import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    new URL(
      "../../src/warehouse/services/SupabaseReplenishmentRepository.ts",
      import.meta.url,
    ),
    "utf8",
  );

test(
  "Supabase repository implements ReplenishmentRepository",
  () => {
    assert.match(
      source,
      /export\s+class\s+SupabaseReplenishmentRepository[\s\S]*?implements\s+ReplenishmentRepository/,
    );
  },
);

test(
  "repository binds exact persistence tables",
  () => {
    for (const table of [
      "warehouse_replenishments",
      "warehouse_replenishment_items",
      "warehouse_replenishment_demands",
      "warehouse_replenishment_allocations",
      "warehouse_replenishment_suggestions",
      "warehouse_replenishment_tasks",
      "warehouse_replenishment_exceptions",
      "warehouse_replenishment_rules",
    ]) {
      assert.match(
        source,
        new RegExp(
          `"${table}"`,
        ),
      );
    }
  },
);

test(
  "repository implements every ReplenishmentRepository operation",
  () => {
    for (const method of [
      "findById",
      "findByNumber",
      "findByReference",
      "list",
      "save",
      "saveItem",
      "saveDemand",
      "saveAllocation",
      "saveSuggestion",
      "saveTask",
      "saveException",
      "saveRule",
      "findRuleById",
      "findRuleByCode",
      "listRules",
      "listItems",
      "listDemands",
      "listAllocations",
      "listSuggestions",
      "listTasks",
      "listExceptions",
    ]) {
      assert.match(
        source,
        new RegExp(
          `async\\s+${method}\\s*\\(`,
        ),
      );
    }
  },
);

test(
  "repository read paths apply account tenant filters",
  () => {
    assert.match(
      source,
      /\.eq\(\s*"account_id"\s*,\s*tenantId\s*,?\s*\)/,
    );

    assert.match(
      source,
      /\.eq\(\s*"account_id"\s*,\s*filter\.tenantId\s*,?\s*\)/,
    );
  },
);

test(
  "all write payloads map tenantId to account_id",
  () => {
    for (const expression of [
      "replenishment.tenantId",
      "item.tenantId",
      "demand.tenantId",
      "allocation.tenantId",
      "suggestion.tenantId",
      "task.tenantId",
      "exception.tenantId",
      "rule.tenantId",
    ]) {
      assert.match(
        source,
        new RegExp(
          `account_id:\\s*${expression.replace(".", "\\.")}`,
        ),
      );
    }
  },
);

test(
  "repository uses persistence upserts and no RPC calls",
  () => {
    assert.match(
      source,
      /\.upsert\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\.rpc\s*\(/,
    );
  },
);

test(
  "aggregate hydration loads persisted item allocation suggestion and exception collections",
  () => {
    for (const method of [
      "this.listItems",
      "this.listAllocations",
      "this.listSuggestions",
      "this.listExceptions",
    ]) {
      assert.match(
        source,
        new RegExp(
          method.replace(
            ".",
            "\\.",
          ),
        ),
      );
    }

    assert.match(
      source,
      /Promise\.all\s*\(\s*\[/,
    );
  },
);

test(
  "demand and task records remain separately accessible through repository contract",
  () => {
    assert.match(
      source,
      /async\s+listDemands\s*\(/,
    );

    assert.match(
      source,
      /async\s+listTasks\s*\(/,
    );
  },
);

test(
  "findByReference uses canonical source JSON containment",
  () => {
    assert.match(
      source,
      /\.contains\(\s*"source"\s*,\s*\{[\s\S]*?type:\s*referenceType[\s\S]*?referenceId/,
    );
  },
);

test(
  "repository contains no service-role or unrelated workflow path",
  () => {
    assert.doesNotMatch(
      source,
      /service_role/i,
    );

    assert.doesNotMatch(
      source,
      /service-role/i,
    );

    assert.doesNotMatch(
      source,
      /warehouse_inventory_(?:balances|movements|reservations)/,
    );

    assert.doesNotMatch(
      source,
      /warehouse_(?:picking|packing|shipping)[a-z0-9_]*/,
    );
  },
);
