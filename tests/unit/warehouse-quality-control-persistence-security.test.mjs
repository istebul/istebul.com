import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";


const migrationPath =
  "supabase/migrations/20260812212000_warehouse_quality_control_persistence.sql";


async function migrationSource() {
  return readFile(
    migrationPath,
    "utf8",
  );
}


const TABLES = [
  "warehouse_quality_inspections",
  "warehouse_quality_inspection_items",
  "warehouse_quality_samples",
  "warehouse_quality_documents",
  "warehouse_quality_tasks",
  "warehouse_quality_exceptions",
];


test(
  "QC-P1 altı Quality Control persistence tablosunu oluşturur",
  async () => {
    const sql =
      await migrationSource();

    for (
      const table
      of TABLES
    ) {
      assert.match(
        sql,
        new RegExp(
          `create table if not exists public\\.${table}\\b`,
          "i",
        ),
        `${table} oluşturulmalı.`,
      );
    }
  },
);


test(
  "Quality ana kaydı firma depo ve lokasyon kapsamında tutulur",
  async () => {
    const sql =
      await migrationSource();

    assert.match(
      sql,
      /warehouse_quality_inspections_warehouse_fk/i,
    );

    assert.match(
      sql,
      /warehouse_quality_inspections_location_fk/i,
    );

    assert.match(
      sql,
      /warehouse_quality_inspections_account_number_unique/i,
    );

    assert.match(
      sql,
      /warehouse_quality_inspections_receiving_uidx/i,
    );
  },
);


test(
  "Quality child tabloları account ve inspection üzerinden tenant güvenli bağlıdır",
  async () => {
    const sql =
      await migrationSource();

    for (const name of [
      "warehouse_quality_inspection_items_inspection_fk",
      "warehouse_quality_samples_inspection_fk",
      "warehouse_quality_documents_inspection_fk",
      "warehouse_quality_tasks_inspection_fk",
      "warehouse_quality_exceptions_inspection_fk",
    ]) {
      assert.match(
        sql,
        new RegExp(
          name,
          "i",
        ),
      );
    }

    assert.match(
      sql,
      /foreign key\s*\(\s*account_id\s*,\s*inspection_id\s*\)/i,
    );
  },
);


test(
  "Quality domain durum ve karar sözleşmeleri veritabanında sınırlandırılır",
  async () => {
    const sql =
      await migrationSource();

    for (const value of [
      "waiting_result",
      "conditionally_accepted",
      "return_to_supplier",
      "laboratory_inspection",
      "under_review",
      "laboratory_test",
      "laboratory_result_failed",
    ]) {
      assert.match(
        sql,
        new RegExp(
          `'${value}'`,
          "i",
        ),
      );
    }
  },
);


test(
  "tüm Quality tablolarında RLS açıktır",
  async () => {
    const sql =
      await migrationSource();

    for (
      const table
      of TABLES
    ) {
      assert.match(
        sql,
        new RegExp(
          `alter table public\\.${table}\\s+enable row level security`,
          "i",
        ),
      );
    }
  },
);


test(
  "authenticated Quality erişimi yalnız account access ile SELECT'tir",
  async () => {
    const sql =
      await migrationSource();

    for (
      const table
      of TABLES
    ) {
      assert.match(
        sql,
        new RegExp(
          `create policy ${table}_member_select[\\s\\S]{0,220}?for select to authenticated[\\s\\S]{0,220}?warehouse_has_account_access\\s*\\(\\s*account_id\\s*\\)`,
          "i",
        ),
      );

      assert.match(
        sql,
        new RegExp(
          `grant select[\\s\\S]{0,100}?public\\.${table}[\\s\\S]{0,100}?to authenticated`,
          "i",
        ),
      );
    }
  },
);


test(
  "authenticated kullanıcıya doğrudan Quality mutation izni verilmez",
  async () => {
    const sql =
      await migrationSource();

    for (
      const table
      of TABLES
    ) {
      assert.match(
        sql,
        new RegExp(
          `revoke insert, update, delete[\\s\\S]{0,100}?public\\.${table}[\\s\\S]{0,100}?from authenticated`,
          "i",
        ),
      );
    }

    assert.doesNotMatch(
      sql,
      /create policy[\s\S]{0,100}?for insert to authenticated/i,
    );

    assert.doesNotMatch(
      sql,
      /create policy[\s\S]{0,100}?for update to authenticated/i,
    );

    assert.doesNotMatch(
      sql,
      /create policy[\s\S]{0,100}?for delete to authenticated/i,
    );

    assert.doesNotMatch(
      sql,
      /grant\s+(insert|update|delete|all)[\s\S]{0,120}?to authenticated/i,
    );
  },
);


test(
  "anon Quality tablolarına erişemez",
  async () => {
    const sql =
      await migrationSource();

    for (
      const table
      of TABLES
    ) {
      assert.match(
        sql,
        new RegExp(
          `revoke all[\\s\\S]{0,100}?public\\.${table}[\\s\\S]{0,100}?from anon`,
          "i",
        ),
      );
    }
  },
);


test(
  "QC-P1 write RPC veya HTTP yetkisi açmaz",
  async () => {
    const sql =
      await migrationSource();

    assert.doesNotMatch(
      sql,
      /create or replace function public\.warehouse_quality/i,
    );

    assert.doesNotMatch(
      sql,
      /grant execute/i,
    );

    assert.doesNotMatch(
      sql,
      /request_id/i,
    );
  },
);


test(
  "QC-P1 inventory movement veya balance tablolarını mutate etmez",
  async () => {
    const sql =
      await migrationSource();

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
  "açık Quality exception sorgusu için partial index vardır",
  async () => {
    const sql =
      await migrationSource();

    assert.match(
      sql,
      /warehouse_quality_exceptions_open_idx/i,
    );

    assert.match(
      sql,
      /where resolved = false/i,
    );
  },
);
