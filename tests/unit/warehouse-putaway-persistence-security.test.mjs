import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260812101500_warehouse_putaway_persistence.sql";

const sql = fs.readFileSync(migrationPath, "utf8");

test(
  "Putaway persistence ana ve satır tablolarını oluşturur",
  () => {
    assert.match(
      sql,
      /create table if not exists public\.warehouse_putaways/i,
    );

    assert.match(
      sql,
      /create table if not exists public\.warehouse_putaway_items/i,
    );

    assert.match(
      sql,
      /create table if not exists public\.warehouse_putaway_write_requests/i,
    );
  },
);

test(
  "Putaway persistence RLS etkinleştirir",
  () => {
    assert.match(
      sql,
      /alter table public\.warehouse_putaways\s+enable row level security/i,
    );

    assert.match(
      sql,
      /alter table public\.warehouse_putaway_items\s+enable row level security/i,
    );

    assert.match(
      sql,
      /warehouse_putaways_member_select/i,
    );

    assert.match(
      sql,
      /warehouse_putaway_items_member_select/i,
    );
  },
);

test(
  "authenticated doğrudan Putaway mutation yapamaz",
  () => {
    assert.match(
      sql,
      /revoke insert,\s*update,\s*delete\s+on public\.warehouse_putaways\s+from authenticated/i,
    );

    assert.match(
      sql,
      /revoke insert,\s*update,\s*delete\s+on public\.warehouse_putaway_items\s+from authenticated/i,
    );

    assert.match(
      sql,
      /revoke insert,\s*update,\s*delete\s+on public\.warehouse_putaway_write_requests\s+from authenticated/i,
    );
  },
);

test(
  "Putaway write request kimliği account bazında idempotenttir",
  () => {
    assert.match(
      sql,
      /primary key\s*\(\s*account_id,\s*request_id\s*\)/i,
    );

    assert.match(
      sql,
      /execute_item/,
    );

    assert.match(
      sql,
      /complete/,
    );
  },
);

test(
  "Putaway item kaynak ve hedef lokasyonu aynı olamaz",
  () => {
    assert.match(
      sql,
      /target_location_id\s*<>\s*source_location_id/i,
    );
  },
);

test(
  "Putaway quantity sözleşmesi requested placed remaining tutarlılığını korur",
  () => {
    assert.match(
      sql,
      /placed_quantity\s*<=\s*requested_quantity/i,
    );

    assert.match(
      sql,
      /remaining_quantity\s*=\s*requested_quantity\s*-\s*placed_quantity/i,
    );
  },
);

test(
  "Putaway persistence service role içermez",
  () => {
    assert.doesNotMatch(
      sql,
      /service_role|SUPABASE_SERVICE_ROLE_KEY/i,
    );
  },
);

test(
  "Putaway persistence inventory tablolarına yeni authenticated mutation grant açmaz",
  () => {
    assert.doesNotMatch(
      sql,
      /grant\s+(insert|update|delete)[\s\S]{0,100}warehouse_inventory_(movements|balances)[\s\S]{0,100}authenticated/i,
    );
  },
);

test(
  "Putaway SQL string sabitleri tek tırnaklıdır",
  () => {
    assert.match(
      sql,
      /default\s+\x27draft\x27/i,
    );

    assert.match(
      sql,
      /default\s+\x27available\x27/i,
    );

    assert.match(
      sql,
      /\x27fixed_location\x27/,
    );

    assert.match(
      sql,
      /\x27partially_completed\x27/,
    );

    assert.match(
      sql,
      /\x27piece\x27/,
    );

    assert.match(
      sql,
      /\x27execute_item\x27/,
    );

    assert.match(
      sql,
      /default\s+\x27\{\}\x27::jsonb/i,
    );

    assert.match(
      sql,
      /jsonb_typeof\(request_payload\)\s*=\s*\x27object\x27/i,
    );

    assert.match(
      sql,
      /jsonb_typeof\(response_payload\)\s*=\s*\x27object\x27/i,
    );
  },
);

test(
  "Putaway repository alt tabloları persistence katmanında bulunur",
  () => {
    assert.match(
      sql,
      /create table if not exists public\.warehouse_putaway_suggestions/i,
    );

    assert.match(
      sql,
      /create table if not exists public\.warehouse_putaway_tasks/i,
    );

    assert.match(
      sql,
      /create table if not exists public\.warehouse_putaway_exceptions/i,
    );
  },
);

test(
  "Putaway alt tablolarında RLS açıktır",
  () => {
    assert.match(
      sql,
      /alter table public\.warehouse_putaway_suggestions\s+enable row level security/i,
    );

    assert.match(
      sql,
      /alter table public\.warehouse_putaway_tasks\s+enable row level security/i,
    );

    assert.match(
      sql,
      /alter table public\.warehouse_putaway_exceptions\s+enable row level security/i,
    );
  },
);

test(
  "authenticated Putaway alt tablolarına doğrudan mutation yapamaz",
  () => {
    assert.match(
      sql,
      /revoke insert,\s*update,\s*delete\s+on public\.warehouse_putaway_suggestions\s+from authenticated/i,
    );

    assert.match(
      sql,
      /revoke insert,\s*update,\s*delete\s+on public\.warehouse_putaway_tasks\s+from authenticated/i,
    );

    assert.match(
      sql,
      /revoke insert,\s*update,\s*delete\s+on public\.warehouse_putaway_exceptions\s+from authenticated/i,
    );
  },
);

test(
  "Putaway suggestion skor ve hedef lokasyon sözleşmesini taşır",
  () => {
    assert.match(
      sql,
      /capacity_score numeric/i,
    );

    assert.match(
      sql,
      /compatibility_score numeric/i,
    );

    assert.match(
      sql,
      /total_score numeric/i,
    );

    assert.match(
      sql,
      /target_location_id uuid not null/i,
    );
  },
);

test(
  "Putaway task durum ve öncelik sözleşmesini taşır",
  () => {
    assert.match(
      sql,
      /\x27pending\x27/,
    );

    assert.match(
      sql,
      /\x27assigned\x27/,
    );

    assert.match(
      sql,
      /priority between 1 and 100/i,
    );
  },
);

test(
  "Putaway exception tür ve çözüm sözleşmesini taşır",
  () => {
    assert.match(
      sql,
      /\x27source_stock_not_found\x27/,
    );

    assert.match(
      sql,
      /\x27target_location_blocked\x27/,
    );

    assert.match(
      sql,
      /resolved_by is not null/i,
    );

    assert.match(
      sql,
      /resolved_at is not null/i,
    );
  },
);

test(
  "Putaway item seçili suggestion kaydına bağlı olabilir",
  () => {
    assert.match(
      sql,
      /warehouse_putaway_items_suggestion_fk/i,
    );

    assert.match(
      sql,
      /references public\.warehouse_putaway_suggestions/i,
    );
  },
);
