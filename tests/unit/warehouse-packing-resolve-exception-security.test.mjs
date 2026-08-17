import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl =
  new URL(
    "../../supabase/migrations/20260818015500_warehouse_packing_resolve_exception.sql",
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
  "resolve_exception ayrı SECURITY DEFINER RPC'dir",
  () => {
    assert.match(
      executableSql,
      /create or replace function\s+public\.warehouse_packing_resolve_exception_write/i,
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
  "resolve_exception caller JWT auth.uid kullanır",
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
  "resolvedBy istemciden alınmaz ve auth.uid üzerinden belirlenir",
  () => {
    assert.doesNotMatch(
      executableSql,
      /p_resolved_by/i,
    );

    assert.match(
      executableSql,
      /resolved_by\s*=\s*v_user_id/i,
    );
  },
);

test(
  "resolve_exception account rolü ile fail closed yetkilendirilir",
  () => {
    assert.match(
      executableSql,
      /warehouse_has_account_role\s*\(/i,
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
  "resolutionNotes opsiyoneldir ve whitespace normalize edilir",
  () => {
    assert.match(
      executableSql,
      /v_resolution_notes\s+text\s*:=\s*nullif\([\s\S]*?btrim\(/i,
    );
  },
);

test(
  "resolve_exception canonical payload packing exception ve resolutionNotes bağlar",
  () => {
    assert.match(
      executableSql,
      /'packingId'\s*,\s*p_packing_id/i,
    );

    assert.match(
      executableSql,
      /'exceptionId'\s*,\s*p_exception_id/i,
    );

    assert.match(
      executableSql,
      /'resolutionNotes'\s*,\s*v_resolution_notes/i,
    );
  },
);

test(
  "resolve_exception stable account request idempotency kullanır",
  () => {
    assert.match(
      executableSql,
      /warehouse_packing_write_requests/i,
    );

    assert.match(
      executableSql,
      /on conflict\s*\(\s*account_id\s*,\s*request_id\s*\)\s*do nothing/i,
    );

    assert.match(
      executableSql,
      /v_existing_action\s*<>\s*v_action/i,
    );

    assert.match(
      executableSql,
      /v_existing_payload\s*<>\s*v_payload/i,
    );
  },
);

test(
  "idempotency request kimliği başka kullanıcı tarafından yeniden kullanılamaz",
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
  "Packing parent yalnız account ve packing kimliği ile doğrulanır",
  () => {
    assert.match(
      executableSql,
      /from public\.warehouse_packings[\s\S]*?account_id\s*=\s*p_account_id[\s\S]*?id\s*=\s*p_packing_id[\s\S]*?for share/i,
    );
  },
);

test(
  "resolve_exception parent Packing statusuna yeni terminal-state yasağı eklemez",
  () => {
    assert.doesNotMatch(
      executableSql,
      /v_packing\.status/i,
    );
  },
);

test(
  "exception account packing ve exception id ile FOR UPDATE kilitlenir",
  () => {
    assert.match(
      executableSql,
      /from public\.warehouse_packing_exceptions[\s\S]*?account_id\s*=\s*p_account_id[\s\S]*?packing_id\s*=\s*v_packing\.id[\s\S]*?id\s*=\s*p_exception_id[\s\S]*?for update/i,
    );
  },
);

test(
  "yalnız unresolved Packing exception çözülebilir",
  () => {
    assert.match(
      executableSql,
      /if v_exception\.resolved then/i,
    );

    assert.match(
      executableSql,
      /Paketleme istisnası daha önce çözülmüş/i,
    );
  },
);

test(
  "resolution yalnız exception çözüm metadata alanlarını değiştirir",
  () => {
    assert.match(
      executableSql,
      /update public\.warehouse_packing_exceptions[\s\S]*?resolved\s*=\s*true[\s\S]*?resolved_by\s*=\s*v_user_id[\s\S]*?resolved_at\s*=\s*v_now[\s\S]*?resolution_notes\s*=\s*v_resolution_notes/i,
    );
  },
);

test(
  "resolve_exception Packing parent item package task label container değiştirmez",
  () => {
    for (const table of [
      "warehouse_packings",
      "warehouse_packing_items",
      "warehouse_packing_packages",
      "warehouse_packing_tasks",
      "warehouse_packing_labels",
      "warehouse_packing_containers",
      "warehouse_packing_package_items",
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
  "resolve_exception inventory ve Picking mutation yapmaz",
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
  "resolve_exception complete veya shipping lifecycle başlatmaz",
  () => {
    assert.doesNotMatch(
      executableSql,
      /warehouse_packing_complete_write/i,
    );

    assert.doesNotMatch(
      executableSql,
      /warehouse_packing_mark_shipping_ready/i,
    );

    assert.doesNotMatch(
      executableSql,
      /status\s*=\s*'packed'/i,
    );

    assert.doesNotMatch(
      executableSql,
      /status\s*=\s*'shipping_ready'/i,
    );
  },
);

test(
  "resolve_exception PUBLIC anon kapalı authenticated execute açık ve service role yok",
  () => {
    assert.match(
      sql,
      /revoke all on function[\s\S]*?warehouse_packing_resolve_exception_write[\s\S]*?from public/i,
    );

    assert.match(
      sql,
      /revoke all on function[\s\S]*?warehouse_packing_resolve_exception_write[\s\S]*?from anon/i,
    );

    assert.match(
      sql,
      /grant execute on function[\s\S]*?warehouse_packing_resolve_exception_write[\s\S]*?to authenticated/i,
    );

    assert.doesNotMatch(
      executableSql,
      /service_role|SUPABASE_SERVICE_ROLE_KEY|serviceRole/i,
    );
  },
);
