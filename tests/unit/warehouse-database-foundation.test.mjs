import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260804140000_warehouse_core_foundation.sql";

const schemaDocPath = "docs/warehouse/DATABASE_SCHEMA.md";
const architectureDocPath = "docs/warehouse/ARCHITECTURE.md";

const migration = fs.readFileSync(migrationPath, "utf8");
const schemaDoc = fs.readFileSync(schemaDocPath, "utf8");
const architectureDoc = fs.readFileSync(architectureDocPath, "utf8");

test("WarehouseIQ çekirdek tablolarını oluşturur", () => {
  for (const table of [
    "warehouse_accounts",
    "warehouse_users",
    "warehouses",
    "warehouse_locations",
  ]) {
    assert.match(
      migration,
      new RegExp(
        `create table if not exists public\\.${table}`,
        "i",
      ),
    );
  }
});

test("WarehouseIQ tablolarında RLS aktiftir", () => {
  for (const table of [
    "warehouse_accounts",
    "warehouse_users",
    "warehouses",
    "warehouse_locations",
  ]) {
    assert.match(
      migration,
      new RegExp(
        `alter table public\\.${table} enable row level security`,
        "i",
      ),
    );
  }
});

test("WarehouseIQ üyelik yardımcı fonksiyonlarını tanımlar", () => {
  assert.match(
    migration,
    /create or replace function public\.warehouse_has_account_access/i,
  );

  assert.match(
    migration,
    /create or replace function public\.warehouse_has_account_role/i,
  );
});

test("Depo kodu firma hesabı içinde benzersizdir", () => {
  assert.match(
    migration,
    /unique\s*\(\s*account_id\s*,\s*code\s*\)/i,
  );
});

test("Lokasyon tam kodu depo içinde benzersizdir", () => {
  assert.match(
    migration,
    /unique\s*\(\s*warehouse_id\s*,\s*full_code\s*\)/i,
  );
});

test("Lokasyon barkodu depo içinde benzersizdir", () => {
  assert.match(
    migration,
    /unique\s*\(\s*warehouse_id\s*,\s*barcode\s*\)/i,
  );
});

test("Depo kapasite ilişki kuralı tanımlıdır", () => {
  assert.match(
    migration,
    /usable_area_square_meters\s*<=\s*total_area_square_meters/i,
  );
});

test("Lokasyon sıcaklık aralığı kuralı tanımlıdır", () => {
  assert.match(
    migration,
    /temperature_minimum_celsius\s*<=\s*temperature_maximum_celsius/i,
  );
});

test("Updated-at tetikleyicileri tanımlıdır", () => {
  for (const trigger of [
    "trg_warehouse_accounts_updated_at",
    "trg_warehouse_users_updated_at",
    "trg_warehouses_updated_at",
    "trg_warehouse_locations_updated_at",
  ]) {
    assert.match(
      migration,
      new RegExp(`create trigger ${trigger}`, "i"),
    );
  }
});

test("Tehlikeli veri silme SQL komutları içermez", () => {
  assert.doesNotMatch(migration, /\bdrop table\b/i);
  assert.doesNotMatch(migration, /\btruncate table\b/i);
  assert.doesNotMatch(migration, /\bdelete from\b/i);
  assert.doesNotMatch(
    migration,
    /disable row level security/i,
  );
});

test("Kullanıcıya görünen WarehouseIQ dil standardı Türkçedir", () => {
  assert.match(
    architectureDoc,
    /WarehouseIQ kullanıcı arayüzü tamamen Türkçe olacaktır/i,
  );

  assert.match(architectureDoc, /Tüm menüler Türkçe/i);
  assert.match(architectureDoc, /Tüm yönergeler Türkçe/i);
  assert.match(
    architectureDoc,
    /Ham teknik değerler kullanıcı arayüzünde doğrudan gösterilmeyecektir/i,
  );
});

test("Veritabanı şeması Türkçe rol karşılıklarını belgeler", () => {
  for (const label of [
    "Firma Sahibi",
    "Depo Müdürü",
    "Depo Şefi",
    "Stok Sorumlusu",
    "Mal Kabul Personeli",
    "Kalite Kontrol Personeli",
    "Forklift Operatörü",
    "Toplama Personeli",
    "Paketleme Personeli",
    "Sevkiyat Personeli",
  ]) {
    assert.match(schemaDoc, new RegExp(label, "i"));
  }
});
