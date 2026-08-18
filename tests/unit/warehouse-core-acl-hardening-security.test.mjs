import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const migrationUrl =
  new URL(
    "../../supabase/migrations/20260818232500_warehouse_core_acl_hardening.sql",
    import.meta.url,
  );

const sql =
  await readFile(
    migrationUrl,
    "utf8",
  );

const executableSql =
  sql
    .replace(
      /--.*$/gm,
      "",
    )
    .trim();

const normalizedStatements =
  executableSql
    .split(";")
    .map(
      (statement) =>
        statement
          .replace(
            /\s+/g,
            " ",
          )
          .trim()
          .toLowerCase(),
    )
    .filter(Boolean);

const expectedGrants =
  new Map([
    [
      "warehouse_accounts",
      "grant select, update on table public.warehouse_accounts to authenticated",
    ],
    [
      "warehouse_users",
      "grant select, insert, update, delete on table public.warehouse_users to authenticated",
    ],
    [
      "warehouses",
      "grant select, insert, update, delete on table public.warehouses to authenticated",
    ],
    [
      "warehouse_locations",
      "grant select, insert, update, delete on table public.warehouse_locations to authenticated",
    ],
    [
      "warehouse_operations_dashboard_snapshots",
      "grant select, insert, delete on table public.warehouse_operations_dashboard_snapshots to authenticated",
    ],
    [
      "warehouse_operations_exceptions",
      "grant select, insert, update, delete on table public.warehouse_operations_exceptions to authenticated",
    ],
    [
      "warehouse_operations_process_volumes",
      "grant select, insert, update, delete on table public.warehouse_operations_process_volumes to authenticated",
    ],
  ]);

const expectedTables =
  new Set(
    expectedGrants.keys(),
  );

test(
  "hardening migration yalnız exact 7 WarehouseIQ tablosunu kapsar",
  () => {
    const touchedTables =
      new Set();

    for (
      const statement
      of normalizedStatements
    ) {
      const match =
        statement.match(
          /on table public\.([a-z0-9_]+)/,
        );

      if (match) {
        touchedTables.add(
          match[1],
        );
      }
    }

    assert.deepEqual(
      [...touchedTables].sort(),
      [...expectedTables].sort(),
    );
  },
);

test(
  "her tablo anon için REVOKE ALL uygular",
  () => {
    for (
      const table
      of expectedTables
    ) {
      assert.ok(
        normalizedStatements.includes(
          `revoke all on table public.${table} from anon`,
        ),
        `anon revoke missing: ${table}`,
      );
    }
  },
);

test(
  "her tablo authenticated için önce REVOKE ALL uygular",
  () => {
    for (
      const table
      of expectedTables
    ) {
      assert.ok(
        normalizedStatements.includes(
          `revoke all on table public.${table} from authenticated`,
        ),
        `authenticated revoke missing: ${table}`,
      );
    }
  },
);

test(
  "authenticated grant matrix production RLS contract ile exact eşleşir",
  () => {
    for (
      const [
        table,
        expectedGrant,
      ]
      of expectedGrants
    ) {
      assert.ok(
        normalizedStatements.includes(
          expectedGrant,
        ),
        `grant mismatch: ${table}`,
      );
    }
  },
);

test(
  "migration exact 21 ACL statement içerir",
  () => {
    assert.equal(
      normalizedStatements.length,
      21,
    );
  },
);

test(
  "anon için hiçbir GRANT yoktur",
  () => {
    assert.doesNotMatch(
      executableSql,
      /\bgrant\b[\s\S]*?\bto\s+anon\b/i,
    );
  },
);

test(
  "PUBLIC için hiçbir table GRANT yoktur",
  () => {
    assert.doesNotMatch(
      executableSql,
      /\bgrant\b[\s\S]*?\bto\s+public\b/i,
    );
  },
);

test(
  "TRUNCATE REFERENCES TRIGGER yeniden grant edilmez",
  () => {
    assert.doesNotMatch(
      executableSql,
      /\bgrant\s+[^;]*\b(?:truncate|references|trigger)\b/i,
    );
  },
);

test(
  "migration tablo verisini mutate etmez ve DDL değiştirmez",
  () => {
    const prohibitedStart =
      /(?:^|;)\s*(?:insert\s+into|update\s+|delete\s+from|truncate\s+|alter\s+table|create\s+|drop\s+)/im;

    assert.doesNotMatch(
      executableSql,
      prohibitedStart,
    );
  },
);

test(
  "migration policy ve SECURITY DEFINER fonksiyonlarını değiştirmez",
  () => {
    assert.doesNotMatch(
      executableSql,
      /\b(?:create|alter|drop)\s+policy\b/i,
    );

    assert.doesNotMatch(
      executableSql,
      /\b(?:create|alter|drop)\s+(?:or\s+replace\s+)?function\b/i,
    );
  },
);

test(
  "service_role yetkisi eklenmez",
  () => {
    assert.doesNotMatch(
      executableSql,
      /\bservice_role\b/i,
    );
  },
);

test(
  "Packing tablolarının ACL sözleşmesine dokunulmaz",
  () => {
    assert.doesNotMatch(
      executableSql,
      /\bwarehouse_packing(?:s|_[a-z0-9_]+)\b/i,
    );
  },
);
