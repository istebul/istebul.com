import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl =
  new URL(
    "../../supabase/migrations/20260818016500_warehouse_packing_complete.sql",
    import.meta.url,
  );

const sql =
  await readFile(
    migrationUrl,
    "utf8",
  );

const executableSql =
  sql
    .replace(/--.*$/gm, "")
    .replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    );

test(
  "Packing complete ayrı SECURITY DEFINER RPC'dir",
  () => {
    assert.match(
      executableSql,
      /create or replace function\s+public\.warehouse_packing_complete_write/i,
    );

    assert.match(
      executableSql,
      /security definer/i,
    );

    assert.match(
      executableSql,
      /set search_path\s*=\s*public,\s*pg_temp/i,
    );
  },
);

test(
  "Packing complete caller JWT auth.uid kullanır",
  () => {
    assert.match(
      executableSql,
      /v_user_id\s+uuid\s*:=\s*auth\.uid\(\)/i,
    );

    assert.match(
      executableSql,
      /if v_user_id is null/i,
    );
  },
);

test(
  "Packing complete account rolü ile fail closed korunur",
  () => {
    assert.match(
      executableSql,
      /warehouse_has_account_role\s*\(/i,
    );

    assert.match(
      executableSql,
      /'warehouse_manager'/i,
    );

    assert.match(
      executableSql,
      /'picker'/i,
    );

    assert.match(
      executableSql,
      /'operator'/i,
    );
  },
);

test(
  "Packing complete stable idempotency kullanır",
  () => {
    assert.match(
      executableSql,
      /v_action constant text\s*:=\s*'complete'/i,
    );

    assert.match(
      executableSql,
      /'packingId'\s*,\s*p_packing_id/i,
    );

    assert.match(
      executableSql,
      /on conflict\s*\(\s*account_id\s*,\s*request_id\s*\)\s*do nothing/i,
    );

    assert.match(
      executableSql,
      /v_existing_user_id\s*<>\s*v_user_id/i,
    );

    assert.match(
      executableSql,
      /v_existing_payload\s*<>\s*v_payload/i,
    );
  },
);

test(
  "Packing parent account scoped FOR UPDATE ile kilitlenir",
  () => {
    assert.match(
      executableSql,
      /from public\.warehouse_packings[\s\S]*?account_id\s*=\s*p_account_id[\s\S]*?id\s*=\s*p_packing_id[\s\S]*?for update/i,
    );
  },
);

test(
  "yalnız in_progress veya partially_packed Packing tamamlanabilir",
  () => {
    assert.match(
      executableSql,
      /v_packing\.status\s+not in\s*\(\s*'in_progress'\s*,\s*'partially_packed'\s*\)/i,
    );
  },
);

test(
  "Packing item satırları readiness öncesi FOR UPDATE kilitlenir",
  () => {
    assert.match(
      executableSql,
      /from public\.warehouse_packing_items[\s\S]*?packing_id\s*=\s*v_packing\.id[\s\S]*?for update/i,
    );
  },
);

test(
  "Packing exception satırları readiness öncesi FOR UPDATE kilitlenir",
  () => {
    assert.match(
      executableSql,
      /from public\.warehouse_packing_exceptions[\s\S]*?packing_id\s*=\s*v_packing\.id[\s\S]*?for update/i,
    );
  },
);

test(
  "Packing package satırları readiness öncesi FOR UPDATE kilitlenir",
  () => {
    assert.match(
      executableSql,
      /from public\.warehouse_packing_packages[\s\S]*?packing_id\s*=\s*v_packing\.id[\s\S]*?for update/i,
    );
  },
);

test(
  "remaining_quantity sıfırdan büyük herhangi bir item complete işlemini engeller",
  () => {
    assert.match(
      executableSql,
      /warehouse_packing_items[\s\S]*?remaining_quantity\s*>\s*0/i,
    );

    assert.match(
      executableSql,
      /Tüm paketleme satırları işlenmeden operasyon tamamlanamaz/i,
    );
  },
);

test(
  "çözülmemiş Packing exception complete işlemini engeller",
  () => {
    assert.match(
      executableSql,
      /warehouse_packing_exceptions[\s\S]*?resolved\s*=\s*false/i,
    );

    assert.match(
      executableSql,
      /Çözülmemiş paketleme istisnaları varken operasyon tamamlanamaz/i,
    );
  },
);

test(
  "Packing complete en az bir package ister",
  () => {
    assert.match(
      executableSql,
      /select count\(\*\)[\s\S]*?from public\.warehouse_packing_packages/i,
    );

    assert.match(
      executableSql,
      /if v_package_count\s*=\s*0/i,
    );
  },
);

test(
  "complete yalnız sealed labelled veya shipping_ready package kabul eder",
  () => {
    assert.match(
      executableSql,
      /status not in\s*\(\s*'sealed'\s*,\s*'labelled'\s*,\s*'shipping_ready'\s*\)/i,
    );
  },
);

test(
  "cancelled open ve in_progress package dolaylı olarak complete dışıdır",
  () => {
    assert.doesNotMatch(
      executableSql,
      /status not in\s*\([^)]*'cancelled'/i,
    );

    assert.match(
      executableSql,
      /v_has_invalid_package/i,
    );
  },
);

test(
  "complete yalnız parent lifecycle alanlarını packed yapar",
  () => {
    assert.match(
      executableSql,
      /update public\.warehouse_packings[\s\S]*?status\s*=\s*'packed'[\s\S]*?packed_at\s*=\s*v_now[\s\S]*?updated_at\s*=\s*v_now/i,
    );
  },
);

test(
  "complete package item task exception label veya container mutation yapmaz",
  () => {
    for (const table of [
      "warehouse_packing_items",
      "warehouse_packing_packages",
      "warehouse_packing_package_items",
      "warehouse_packing_tasks",
      "warehouse_packing_exceptions",
      "warehouse_packing_labels",
      "warehouse_packing_containers",
    ]) {
      assert.doesNotMatch(
        executableSql,
        new RegExp(
          `(?:insert into|update|delete from)\\s+public\\.${table}\\b`,
          "i",
        ),
      );
    }
  },
);

test(
  "complete shipping_ready package lifecycle başlatmaz",
  () => {
    assert.doesNotMatch(
      executableSql,
      /update\s+public\.warehouse_packing_packages/i,
    );

    assert.doesNotMatch(
      executableSql,
      /status\s*=\s*'shipping_ready'/i,
    );

    assert.doesNotMatch(
      executableSql,
      /shipping_ready_at\s*=/i,
    );
  },
);

test(
  "complete inventory ve Picking mutation yapmaz",
  () => {
    assert.doesNotMatch(
      executableSql,
      /(?:insert into|update|delete from)\s+public\.warehouse_inventory_(?:balances|movements)/i,
    );

    assert.doesNotMatch(
      executableSql,
      /(?:insert into|update|delete from)\s+public\.warehouse_pickings\b/i,
    );

    assert.doesNotMatch(
      executableSql,
      /(?:insert into|update|delete from)\s+public\.warehouse_picking_items\b/i,
    );
  },
);

test(
  "complete RPC public anon kapalı authenticated execute açık ve service role yok",
  () => {
    assert.match(
      sql,
      /revoke all on function[\s\S]*?warehouse_packing_complete_write[\s\S]*?from public/i,
    );

    assert.match(
      sql,
      /revoke all on function[\s\S]*?warehouse_packing_complete_write[\s\S]*?from anon/i,
    );

    assert.match(
      sql,
      /grant execute on function[\s\S]*?warehouse_packing_complete_write[\s\S]*?to authenticated/i,
    );

    assert.doesNotMatch(
      executableSql,
      /service_role|SUPABASE_SERVICE_ROLE_KEY|serviceRole/i,
    );
  },
);
