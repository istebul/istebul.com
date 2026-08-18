import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../../supabase/migrations/20260818134000_warehouse_packing_truncate_acl_hardening.sql",
  import.meta.url,
);

const sql = (await readFile(migrationUrl, "utf8"))
  .replace(/--[^\n]*/g, " ")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();

const tables = [
  "warehouse_packings",
  "warehouse_packing_items",
  "warehouse_packing_containers",
  "warehouse_packing_packages",
  "warehouse_packing_package_items",
  "warehouse_packing_labels",
  "warehouse_packing_suggestions",
  "warehouse_packing_tasks",
  "warehouse_packing_exceptions",
  "warehouse_packing_write_requests",
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function count(pattern) {
  return [...sql.matchAll(pattern)].length;
}

test("Packing ACL hardening covers the exact 10 Packing tables", () => {
  const discovered = new Set(
    [...sql.matchAll(/\bpublic\.(warehouse_packings|warehouse_packing_[a-z0-9_]+)\b/g)]
      .map((match) => match[1]),
  );

  assert.deepEqual(
    [...discovered].sort(),
    [...tables].sort(),
  );
});

for (const table of tables) {
  test(`${table}: anon receives no direct table privileges`, () => {
    const escaped = escapeRegExp(table);

    assert.match(
      sql,
      new RegExp(
        `\\brevoke\\s+all\\s+on\\s+table\\s+public\\.${escaped}\\s+from\\s+anon\\s*;`,
      ),
    );
  });

  test(`${table}: authenticated ACL is reset before SELECT is restored`, () => {
    const escaped = escapeRegExp(table);

    const revoke = new RegExp(
      `\\brevoke\\s+all\\s+on\\s+table\\s+public\\.${escaped}\\s+from\\s+authenticated\\s*;`,
    );

    const select = new RegExp(
      `\\bgrant\\s+select\\s+on\\s+table\\s+public\\.${escaped}\\s+to\\s+authenticated\\s*;`,
    );

    assert.match(sql, revoke);
    assert.match(sql, select);

    assert.ok(
      sql.search(revoke) < sql.search(select),
      `${table}: SELECT must only be restored after REVOKE ALL`,
    );
  });
}

test("migration has exact ACL operation counts", () => {
  assert.equal(
    count(/\brevoke\s+all\s+on\s+table\s+public\.warehouse_[a-z0-9_]+\s+from\s+anon\s*;/g),
    10,
  );

  assert.equal(
    count(/\brevoke\s+all\s+on\s+table\s+public\.warehouse_[a-z0-9_]+\s+from\s+authenticated\s*;/g),
    10,
  );

  assert.equal(
    count(/\bgrant\s+select\s+on\s+table\s+public\.warehouse_[a-z0-9_]+\s+to\s+authenticated\s*;/g),
    10,
  );
});

test("migration never grants direct Packing mutation privileges", () => {
  assert.doesNotMatch(
    sql,
    /\bgrant\s+(?:all|insert|update|delete|truncate|trigger|references|maintain)\b[\s\S]*?\bto\s+(?:anon|authenticated)\b/,
  );
});

test("migration does not touch Packing RPC execution grants", () => {
  assert.doesNotMatch(
    sql,
    /\b(?:grant|revoke)\b[\s\S]*?\bon\s+function\b/,
  );
});

test("migration does not touch sequences", () => {
  assert.doesNotMatch(
    sql,
    /\b(?:grant|revoke)\b[\s\S]*?\bon\s+sequence\b/,
  );
});

test("migration does not mutate Warehouse domain data", () => {
  assert.doesNotMatch(
    sql,
    /\b(?:insert\s+into|update|delete\s+from|truncate\s+table)\s+public\./,
  );
});

test("migration does not touch Inventory or Picking objects", () => {
  assert.doesNotMatch(
    sql,
    /\bpublic\.warehouse_(?:inventory|picking)[a-z0-9_]*\b/,
  );
});

test("migration never introduces warehouse_orders", () => {
  assert.doesNotMatch(
    sql,
    /\bwarehouse_orders\b/,
  );
});

test("migration never references service_role", () => {
  assert.doesNotMatch(
    sql,
    /\bservice_role\b/,
  );
});
