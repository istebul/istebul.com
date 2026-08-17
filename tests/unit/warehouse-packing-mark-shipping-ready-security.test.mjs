import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl =
  new URL(
    "../../supabase/migrations/20260818017500_warehouse_packing_mark_shipping_ready.sql",
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
  "mark_shipping_ready ayrı SECURITY DEFINER RPC'dir",
  () => {
    assert.match(
      executableSql,
      /create or replace function\s+public\.warehouse_packing_mark_shipping_ready_write/i,
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
  "mark_shipping_ready caller JWT auth.uid kullanır",
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
  "mark_shipping_ready account rolü ile fail closed korunur",
  () => {
    assert.match(
      executableSql,
      /warehouse_has_account_role\s*\(/i,
    );

    for (const role of [
      "owner",
      "admin",
      "warehouse_manager",
      "supervisor",
      "inventory_controller",
      "picker",
      "operator",
    ]) {
      assert.ok(
        executableSql.includes(`'${role}'`),
        `Eksik role: ${role}`,
      );
    }
  },
);

test(
  "mark_shipping_ready stable idempotency ve kullanıcı bağlama kullanır",
  () => {
    assert.match(
      executableSql,
      /v_action constant text\s*:=\s*'mark_shipping_ready'/i,
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
  "Packing parent account scoped FOR UPDATE kilitlenir",
  () => {
    assert.match(
      executableSql,
      /from public\.warehouse_packings[\s\S]*?account_id\s*=\s*p_account_id[\s\S]*?id\s*=\s*p_packing_id[\s\S]*?for update/i,
    );
  },
);

test(
  "yalnız packed Packing sevkiyata hazırlanabilir",
  () => {
    assert.match(
      executableSql,
      /v_packing\.status\s*<>\s*'packed'/i,
    );

    assert.match(
      executableSql,
      /Yalnızca tamamlanmış paketleme sevkiyata hazır duruma getirilebilir/i,
    );
  },
);

test(
  "package set readiness öncesi FOR UPDATE kilitlenir",
  () => {
    assert.match(
      executableSql,
      /from public\.warehouse_packing_packages[\s\S]*?packing_id\s*=\s*v_packing\.id[\s\S]*?for update/i,
    );
  },
);

test(
  "yalnız labelled veya shipping_ready package kabul edilir",
  () => {
    assert.match(
      executableSql,
      /status not in\s*\(\s*'labelled'\s*,\s*'shipping_ready'\s*\)/i,
    );

    assert.match(
      executableSql,
      /Tüm paketler etiketlenmeden sevkiyata hazır duruma geçilemez/i,
    );
  },
);

test(
  "sealed open in_progress cancelled package dolaylı olarak reddedilir",
  () => {
    assert.doesNotMatch(
      executableSql,
      /status not in\s*\([^)]*'sealed'/i,
    );

    assert.match(
      executableSql,
      /v_has_invalid_package/i,
    );
  },
);

test(
  "domain parity için yeni package-count-required gate eklenmez",
  () => {
    assert.doesNotMatch(
      executableSql,
      /if\s+v_package_count\s*=\s*0/i,
    );
  },
);

test(
  "tüm package satırları aynı transaction içinde shipping_ready olur",
  () => {
    assert.match(
      executableSql,
      /update public\.warehouse_packing_packages[\s\S]*?status\s*=\s*'shipping_ready'[\s\S]*?updated_at\s*=\s*v_now/i,
    );

    assert.match(
      executableSql,
      /status in\s*\(\s*'labelled'\s*,\s*'shipping_ready'\s*\)/i,
    );
  },
);

test(
  "updated package count toplam locked package count ile doğrulanır",
  () => {
    assert.match(
      executableSql,
      /get diagnostics\s+v_updated_package_count\s*=\s*row_count/i,
    );

    assert.match(
      executableSql,
      /v_updated_package_count\s*<>\s*v_package_count/i,
    );
  },
);

test(
  "parent shipping_ready ve shipping_ready_at aynı server timestamp ile yazılır",
  () => {
    assert.match(
      executableSql,
      /update public\.warehouse_packings[\s\S]*?status\s*=\s*'shipping_ready'[\s\S]*?shipping_ready_at\s*=\s*v_now[\s\S]*?updated_at\s*=\s*v_now/i,
    );
  },
);

test(
  "mark_shipping_ready item package-item task exception label container mutation yapmaz",
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
  "mark_shipping_ready inventory ve Picking mutation yapmaz",
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
  "mark_shipping_ready label generation veya printing başlatmaz",
  () => {
    assert.doesNotMatch(
      executableSql,
      /insert into public\.warehouse_packing_labels/i,
    );

    assert.doesNotMatch(
      executableSql,
      /status\s*=\s*'printed'/i,
    );

    assert.doesNotMatch(
      executableSql,
      /generate_package_label/i,
    );
  },
);

test(
  "idempotent response parent ve package sonuçlarını saklar",
  () => {
    for (const field of [
      "status",
      "shippingReadyAt",
      "packageCount",
      "updatedPackageCount",
    ]) {
      assert.ok(
        executableSql.includes(`'${field}'`),
        `Eksik response field: ${field}`,
      );
    }

    assert.match(
      executableSql,
      /response_payload\s*=\s*v_result/i,
    );
  },
);

test(
  "RPC public anon kapalı authenticated execute açık ve service role yok",
  () => {
    assert.match(
      sql,
      /revoke all on function[\s\S]*?warehouse_packing_mark_shipping_ready_write[\s\S]*?from public/i,
    );

    assert.match(
      sql,
      /revoke all on function[\s\S]*?warehouse_packing_mark_shipping_ready_write[\s\S]*?from anon/i,
    );

    assert.match(
      sql,
      /grant execute on function[\s\S]*?warehouse_packing_mark_shipping_ready_write[\s\S]*?to authenticated/i,
    );

    assert.doesNotMatch(
      executableSql,
      /service_role|SUPABASE_SERVICE_ROLE_KEY|serviceRole/i,
    );
  },
);
