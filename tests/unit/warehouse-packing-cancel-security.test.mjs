import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl =
  new URL(
    "../../supabase/migrations/20260818018500_warehouse_packing_cancel.sql",
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
  "Packing cancel ayrı SECURITY DEFINER RPC'dir",
  () => {
    assert.match(
      executableSql,
      /create or replace function\s+public\.warehouse_packing_cancel_write/i,
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
  "Packing cancel caller JWT auth.uid kullanır",
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
  "Packing cancel account rolü ile fail closed korunur",
  () => {
    assert.match(
      executableSql,
      /warehouse_has_account_role\s*\(/i,
    );
  },
);

test(
  "iptal nedeni whitespace normalize edilir ve boş bırakılamaz",
  () => {
    assert.match(
      executableSql,
      /v_reason\s+text\s*:=\s*nullif\([\s\S]*?btrim/i,
    );

    assert.match(
      executableSql,
      /if v_reason is null/i,
    );

    assert.match(
      executableSql,
      /İptal nedeni boş bırakılamaz/i,
    );
  },
);

test(
  "cancel action packingId ve normalized reason ile stable idempotency kullanır",
  () => {
    assert.match(
      executableSql,
      /v_action constant text\s*:=\s*'cancel'/i,
    );

    assert.match(
      executableSql,
      /'packingId'\s*,\s*p_packing_id/i,
    );

    assert.match(
      executableSql,
      /'reason'\s*,\s*v_reason/i,
    );

    assert.match(
      executableSql,
      /on conflict\s*\(\s*account_id\s*,\s*request_id\s*\)\s*do nothing/i,
    );
  },
);

test(
  "cancel idempotency request id başka kullanıcı tarafından kullanılamaz",
  () => {
    assert.match(
      executableSql,
      /v_existing_user_id\s*<>\s*v_user_id/i,
    );

    assert.match(
      executableSql,
      /Bu istek kimliği başka bir kullanıcıya aittir/i,
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
  "packed shipping_ready ve cancelled parent doğrudan iptal edilemez",
  () => {
    assert.match(
      executableSql,
      /v_packing\.status\s+in\s*\(\s*'packed'\s*,\s*'shipping_ready'\s*,\s*'cancelled'\s*\)/i,
    );
  },
);

test(
  "package set cancel kontrolünden önce FOR UPDATE kilitlenir",
  () => {
    assert.match(
      executableSql,
      /from public\.warehouse_packing_packages[\s\S]*?packing_id\s*=\s*v_packing\.id[\s\S]*?for update/i,
    );
  },
);

test(
  "sealed labelled ve shipping_ready package parent cancel işlemini engeller",
  () => {
    assert.match(
      executableSql,
      /status in\s*\(\s*'sealed'\s*,\s*'labelled'\s*,\s*'shipping_ready'\s*\)/i,
    );

    assert.match(
      executableSql,
      /Mühürlenmiş veya etiketlenmiş paket bulunan operasyon doğrudan iptal edilemez/i,
    );
  },
);

test(
  "open in_progress veya cancelled child package için ek yasak uydurulmaz",
  () => {
    const packageGuard =
      executableSql.match(
        /select exists\s*\([\s\S]*?from public\.warehouse_packing_packages[\s\S]*?status in\s*\(([\s\S]*?)\)\s*\)[\s\S]*?into v_has_closed_package/i,
      );

    assert.ok(packageGuard);

    assert.doesNotMatch(
      packageGuard[1],
      /'open'|'in_progress'|'cancelled'/i,
    );
  },
);

test(
  "cancel package-count-required gate eklemez",
  () => {
    assert.doesNotMatch(
      executableSql,
      /package_count/i,
    );
  },
);

test(
  "başarıda yalnız parent cancelled cancellation_reason ve cancelled_at alır",
  () => {
    assert.match(
      executableSql,
      /update public\.warehouse_packings[\s\S]*?status\s*=\s*'cancelled'[\s\S]*?cancellation_reason\s*=\s*v_reason[\s\S]*?cancelled_at\s*=\s*v_now[\s\S]*?updated_at\s*=\s*v_now/i,
    );
  },
);

test(
  "cancel child package lifecycle değiştirmez",
  () => {
    assert.doesNotMatch(
      executableSql,
      /update public\.warehouse_packing_packages\b/i,
    );
  },
);

test(
  "cancel item package-item task exception label container mutation yapmaz",
  () => {
    for (const table of [
      "warehouse_packing_items",
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
  "cancel inventory ve Picking mutation yapmaz",
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
  "cancel complete shipping-ready veya label lifecycle başlatmaz",
  () => {
    assert.doesNotMatch(
      executableSql,
      /warehouse_packing_complete_write/i,
    );

    assert.doesNotMatch(
      executableSql,
      /warehouse_packing_mark_shipping_ready_write/i,
    );

    assert.doesNotMatch(
      executableSql,
      /insert into public\.warehouse_packing_labels/i,
    );
  },
);

test(
  "RPC public anon kapalı authenticated execute açık ve service role yok",
  () => {
    assert.match(
      sql,
      /revoke all on function[\s\S]*?warehouse_packing_cancel_write[\s\S]*?from public/i,
    );

    assert.match(
      sql,
      /revoke all on function[\s\S]*?warehouse_packing_cancel_write[\s\S]*?from anon/i,
    );

    assert.match(
      sql,
      /grant execute on function[\s\S]*?warehouse_packing_cancel_write[\s\S]*?to authenticated/i,
    );

    assert.doesNotMatch(
      executableSql,
      /service_role|SUPABASE_SERVICE_ROLE_KEY|serviceRole/i,
    );
  },
);
