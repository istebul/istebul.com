import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl =
  new URL(
    "../../supabase/migrations/20260818012500_warehouse_packing_seal_package.sql",
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
  "seal-package ayrı SECURITY DEFINER RPC'dir",
  () => {
    assert.match(
      executableSql,
      /create or replace function public\.warehouse_packing_seal_package_write/i,
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
  "seal-package gerçek mühürleyeni auth.uid üzerinden alır",
  () => {
    assert.match(
      executableSql,
      /v_user_id\s+uuid\s*:=\s*auth\.uid\(\)/i,
    );

    assert.match(
      executableSql,
      /sealed_by\s*=\s*v_user_id/i,
    );
  },
);

test(
  "seal-package account role authorization fail closed uygular",
  () => {
    assert.match(
      executableSql,
      /warehouse_has_account_role\s*\(/i,
    );
  },
);

test(
  "seal-package seal_package action ile idempotency ledger kullanır",
  () => {
    assert.match(
      executableSql,
      /v_action constant text\s*:=\s*'seal_package'/i,
    );

    assert.match(
      executableSql,
      /warehouse_packing_write_requests/i,
    );

    assert.match(
      executableSql,
      /v_existing_action\s*<>\s*v_action/i,
    );

    assert.match(
      executableSql,
      /v_existing_payload\s*<>\s*v_payload/i,
    );

    assert.match(
      executableSql,
      /on conflict\s*\(\s*account_id\s*,\s*request_id\s*\)\s*do nothing/i,
    );
  },
);

test(
  "Packing parent account scoped FOR UPDATE kilitlenir",
  () => {
    assert.match(
      executableSql,
      /from public\.warehouse_packings[\s\S]*?account_id\s*=\s*p_account_id[\s\S]*?id\s*=\s*p_packing_id[\s\S]*?for update/i,
    );
  },
);

test(
  "package aynı Packing scope içinde FOR UPDATE kilitlenir",
  () => {
    assert.match(
      executableSql,
      /from public\.warehouse_packing_packages[\s\S]*?account_id\s*=\s*p_account_id[\s\S]*?packing_id\s*=\s*v_packing\.id[\s\S]*?id\s*=\s*p_package_id[\s\S]*?for update/i,
    );
  },
);

test(
  "sealed labelled ve shipping_ready paket tekrar kapatılamaz",
  () => {
    assert.match(
      executableSql,
      /v_package\.status\s+in\s*\(\s*'sealed'\s*,\s*'labelled'\s*,\s*'shipping_ready'\s*\)/i,
    );
  },
);

test(
  "cancelled paket mühürlenemez",
  () => {
    assert.match(
      executableSql,
      /v_package\.status\s*=\s*'cancelled'/i,
    );
  },
);

test(
  "boş fiziksel paket mühürlenemez",
  () => {
    assert.match(
      executableSql,
      /from public\.warehouse_packing_package_items/i,
    );

    assert.match(
      executableSql,
      /v_package_item_count\s*=\s*0/i,
    );

    assert.match(
      executableSql,
      /Ürün bulunmayan paket mühürlenemez/i,
    );
  },
);

test(
  "actual weight verilirse sıfırdan büyük olmalıdır",
  () => {
    assert.match(
      executableSql,
      /v_actual_weight\s+is not null[\s\S]*?v_actual_weight\s*<=\s*0/i,
    );

    assert.match(
      executableSql,
      /Gerçek paket ağırlığı sıfırdan büyük olmalıdır/i,
    );
  },
);

test(
  "actual volume verilirse sıfırdan büyük olmalıdır",
  () => {
    assert.match(
      executableSql,
      /v_actual_volume\s+is not null[\s\S]*?v_actual_volume\s*<=\s*0/i,
    );

    assert.match(
      executableSql,
      /Gerçek paket hacmi sıfırdan büyük olmalıdır/i,
    );
  },
);

test(
  "seal package status sealed sealed_by sealed_at alanlarını atomik yazar",
  () => {
    assert.match(
      executableSql,
      /update public\.warehouse_packing_packages[\s\S]*?status\s*=\s*'sealed'/i,
    );

    assert.match(
      executableSql,
      /sealed_by\s*=\s*v_user_id/i,
    );

    assert.match(
      executableSql,
      /sealed_at\s*=\s*now\(\)/i,
    );
  },
);

test(
  "opsiyonel seal number actual weight ve volume korunur",
  () => {
    assert.match(
      executableSql,
      /seal_number[\s\S]*?v_seal_number/i,
    );

    assert.match(
      executableSql,
      /actual_weight[\s\S]*?v_actual_weight/i,
    );

    assert.match(
      executableSql,
      /actual_volume[\s\S]*?v_actual_volume/i,
    );
  },
);

test(
  "seal-package package item eklemez veya değiştirmez",
  () => {
    assert.doesNotMatch(
      executableSql,
      /insert into public\.warehouse_packing_package_items/i,
    );

    assert.doesNotMatch(
      executableSql,
      /update public\.warehouse_packing_package_items/i,
    );
  },
);

test(
  "seal-package parent Packing lifecycle değiştirmez",
  () => {
    assert.doesNotMatch(
      executableSql,
      /update public\.warehouse_packings\b/i,
    );
  },
);

test(
  "seal-package label veya shipping lifecycle başlatmaz",
  () => {
    assert.doesNotMatch(
      executableSql,
      /(?:insert into|update|delete from)\s+public\.warehouse_packing_labels/i,
    );

    assert.doesNotMatch(
      executableSql,
      /status\s*=\s*'labelled'/i,
    );

    assert.doesNotMatch(
      executableSql,
      /status\s*=\s*'shipping_ready'/i,
    );
  },
);

test(
  "seal-package inventory ve Picking mutation yapmaz",
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
  "RPC public ve anon için kapalı authenticated için execute açıktır",
  () => {
    assert.match(
      sql,
      /revoke all on function[\s\S]*?warehouse_packing_seal_package_write[\s\S]*?from public/i,
    );

    assert.match(
      sql,
      /revoke all on function[\s\S]*?warehouse_packing_seal_package_write[\s\S]*?from anon/i,
    );

    assert.match(
      sql,
      /grant execute on function[\s\S]*?warehouse_packing_seal_package_write[\s\S]*?to authenticated/i,
    );
  },
);

test(
  "seal-package service role kullanmaz",
  () => {
    assert.doesNotMatch(
      executableSql,
      /service_role|SUPABASE_SERVICE_ROLE_KEY|serviceRole/i,
    );
  },
);
