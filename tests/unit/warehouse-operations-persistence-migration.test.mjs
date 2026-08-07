import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const migrationPath =
  "supabase/migrations/20260807181500_warehouse_operations_persistence.sql";
const migration = await readFile(migrationPath, "utf8");

test("WarehouseIQ operasyon kalıcılığı üç çekirdek tabloyu oluşturur", () => {
  for (const table of [
    "warehouse_operations_dashboard_snapshots",
    "warehouse_operations_exceptions",
    "warehouse_operations_process_volumes",
  ]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
  }
});

test("operasyon tabloları hesap ve depo ilişkisini korur", () => {
  assert.match(migration, /references public\.warehouse_accounts\(id\) on delete cascade/);
  assert.match(migration, /references public\.warehouses\(account_id, id\)/);
});

test("dashboard snapshot sözleşmesi gerekli KPI alanlarını kalıcılaştırır", () => {
  for (const field of [
    "order_completion_rate","on_time_dispatch_rate","task_completion_rate",
    "inventory_accuracy_rate","capacity_utilization_rate","labor_utilization_rate",
    "item_fulfillment_rate","short_pick_rate","health_score","health_status","kpis","alerts",
  ]) assert.ok(migration.includes(field), `Eksik dashboard alanı: ${field}`);
});

test("istisna analizi süreç, kategori ve etki alanlarını kalıcılaştırır", () => {
  for (const field of [
    "process text not null","category text not null","severity text not null",
    "root_cause text not null","delay_minutes","impacted_orders","impacted_tasks","impacted_items","resolved_at",
  ]) assert.ok(migration.includes(field), `Eksik istisna alanı: ${field}`);
});

test("WarehouseIQ operasyon tablolarında RLS aktiftir", () => {
  assert.equal((migration.match(/enable row level security;/g) ?? []).length, 3);
});

test("RLS mevcut WarehouseIQ üyelik yardımcılarını kullanır", () => {
  assert.match(migration, /warehouse_has_account_access\(account_id\)/);
  assert.match(migration, /warehouse_has_account_role\(/);
});

test("dönem ve açık istisna sorguları için indeksler bulunur", () => {
  for (const index of [
    "warehouse_operations_dashboard_latest_idx",
    "warehouse_operations_dashboard_period_idx",
    "warehouse_operations_exceptions_period_idx",
    "warehouse_operations_exceptions_open_idx",
    "warehouse_operations_exceptions_process_idx",
    "warehouse_operations_process_volumes_period_idx",
  ]) assert.ok(migration.includes(index), `Eksik indeks: ${index}`);
});

test("tehlikeli toplu veri silme komutları içermez", () => {
  assert.doesNotMatch(migration, /\btruncate\b/i);
  assert.doesNotMatch(migration, /\bdrop\s+table\b/i);
});
