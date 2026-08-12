import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260812184500_warehouse_picking_resolve_exception.sql";

const apiPath =
  "functions/api/warehouse/picking.js";

const sql =
  await readFile(
    migrationPath,
    "utf8",
  );

const api =
  await readFile(
    apiPath,
    "utf8",
  );

const executableSql =
  sql
    .replace(
      /--.*$/gm,
      "",
    )
    .replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    );

test(
  "resolve_exception ayrı SECURITY DEFINER RPC'dir",
  () => {
    assert.match(
      executableSql,
      /create or replace function public\.warehouse_picking_resolve_exception_write/i,
    );

    assert.match(
      executableSql,
      /security definer/i,
    );

    assert.match(
      executableSql,
      /set search_path = public, pg_temp/i,
    );
  },
);

test(
  "resolve_exception caller JWT ve picker dahil yetkili rolleri doğrular",
  () => {
    assert.match(
      executableSql,
      /auth\.uid\(\)/i,
    );

    assert.match(
      executableSql,
      /warehouse_has_account_role/i,
    );

    assert.match(
      executableSql,
      /'picker'/i,
    );

    assert.doesNotMatch(
      executableSql,
      /'viewer'/i,
    );
  },
);

test(
  "resolvedBy RPC içinde auth.uid üzerinden belirlenir",
  () => {
    assert.match(
      executableSql,
      /v_user_id uuid\s*:=\s*auth\.uid\(\)/i,
    );

    assert.match(
      executableSql,
      /resolved_by\s*=\s*v_user_id/i,
    );

    assert.doesNotMatch(
      executableSql,
      /p_resolved_by/i,
    );
  },
);

test(
  "resolutionNotes opsiyoneldir ve normalize edilir",
  () => {
    assert.match(
      executableSql,
      /p_resolution_notes text default null/i,
    );

    assert.match(
      executableSql,
      /v_resolution_notes text\s*:=\s*nullif/i,
    );
  },
);

test(
  "resolve_exception stable idempotency kullanır",
  () => {
    assert.match(
      executableSql,
      /warehouse_picking_write_requests/i,
    );

    assert.match(
      executableSql,
      /v_action constant text\s*:=\s*'resolve_exception'/i,
    );

    assert.match(
      executableSql,
      /v_existing_payload\s*<>\s*v_payload/i,
    );

    assert.match(
      executableSql,
      /response_payload/i,
    );
  },
);

test(
  "runtime action constraint resolve_exception aksiyonunu kabul eder",
  () => {
    const match =
      executableSql.match(
        /add constraint\s+warehouse_picking_write_requests_action_check\s+check\s*\(\s*action\s+in\s*\(([\s\S]*?)\)\s*\)/i,
      );

    assert.ok(
      match,
      "resolve_exception action constraint bulunamadı.",
    );

    for (const action of [
      "create",
      "add_item",
      "release",
      "create_task",
      "start",
      "execute_item",
      "complete",
      "resolve_exception",
    ]) {
      assert.ok(
        match[1].includes(
          `'${action}'`,
        ),
        `Eksik runtime action: ${action}`,
      );
    }

    assert.doesNotMatch(
      match[1],
      /'cancel'/i,
    );
  },
);

test(
  "Picking parent account ve picking scope içinde doğrulanır",
  () => {
    assert.match(
      executableSql,
      /from public\.warehouse_pickings[\s\S]{0,180}?account_id\s*=\s*p_account_id[\s\S]{0,120}?id\s*=\s*p_picking_id/i,
    );
  },
);

test(
  "exception account picking ve exception id ile FOR UPDATE kilitlenir",
  () => {
    assert.match(
      executableSql,
      /from public\.warehouse_picking_exceptions[\s\S]{0,260}?account_id\s*=\s*p_account_id[\s\S]{0,140}?picking_id\s*=\s*p_picking_id[\s\S]{0,140}?id\s*=\s*p_exception_id[\s\S]{0,80}?for update/i,
    );
  },
);

test(
  "yalnız unresolved exception çözülebilir",
  () => {
    assert.match(
      executableSql,
      /if v_exception\.resolved then/i,
    );

    assert.match(
      executableSql,
      /Toplama istisnası daha önce çözülmüş/i,
    );
  },
);

test(
  "resolution yalnız exception çözüm alanlarını günceller",
  () => {
    assert.match(
      executableSql,
      /update public\.warehouse_picking_exceptions/i,
    );

    assert.match(
      executableSql,
      /resolved\s*=\s*true/i,
    );

    assert.match(
      executableSql,
      /resolved_by\s*=\s*v_user_id/i,
    );

    assert.match(
      executableSql,
      /resolved_at\s*=\s*v_now/i,
    );

    assert.match(
      executableSql,
      /resolution_notes\s*=\s*v_resolution_notes/i,
    );
  },
);

test(
  "resolve_exception inventory balance veya ledger mutation yapmaz",
  () => {
    assert.doesNotMatch(
      executableSql,
      /(?:insert\s+into|update|delete\s+from)\s+public\.warehouse_inventory_(?:balances|movements)/i,
    );
  },
);

test(
  "resolve_exception reservation mutation yapmaz",
  () => {
    assert.doesNotMatch(
      executableSql,
      /(?:insert\s+into|update|delete\s+from)\s+public\.warehouse_inventory_reservations/i,
    );
  },
);

test(
  "resolve_exception Picking parent item veya task mutation yapmaz",
  () => {
    assert.doesNotMatch(
      executableSql,
      /update\s+public\.warehouse_pickings/i,
    );

    assert.doesNotMatch(
      executableSql,
      /(?:insert\s+into|update|delete\s+from)\s+public\.warehouse_picking_items/i,
    );

    assert.doesNotMatch(
      executableSql,
      /(?:insert\s+into|update|delete\s+from)\s+public\.warehouse_picking_tasks/i,
    );
  },
);

test(
  "resolve_exception complete RPC çağırmaz",
  () => {
    assert.doesNotMatch(
      executableSql,
      /warehouse_picking_complete_write\s*\(/i,
    );
  },
);

test(
  "resolve_exception PUBLIC ve anon kapalı authenticated execute açıktır",
  () => {
    assert.match(
      sql,
      /revoke all on function public\.warehouse_picking_resolve_exception_write[\s\S]*?from public/i,
    );

    assert.match(
      sql,
      /revoke all on function public\.warehouse_picking_resolve_exception_write[\s\S]*?from anon/i,
    );

    assert.match(
      sql,
      /grant execute on function public\.warehouse_picking_resolve_exception_write[\s\S]*?to authenticated/i,
    );
  },
);

test(
  "resolve_exception service role veya direct table grant kullanmaz",
  () => {
    assert.doesNotMatch(
      executableSql + "\n" + api,
      /service_role|SUPABASE_SERVICE_ROLE_KEY|serviceRole/i,
    );

    assert.doesNotMatch(
      executableSql,
      /grant\s+(?:insert|update|delete|all)\s+on\s+public\.warehouse_/i,
    );
  },
);

test(
  "HTTP resolve_exception yalnız ayrı RPC üzerinden çalışır",
  () => {
    assert.match(
      api,
      /warehouse_picking_resolve_exception_write/i,
    );

    assert.match(
      api,
      /input\.action\s*===\s*"resolve_exception"/i,
    );

    assert.match(
      api,
      /p_exception_id/i,
    );

    assert.match(
      api,
      /p_resolution_notes/i,
    );

    assert.doesNotMatch(
      api,
      /p_resolved_by/i,
    );

    assert.doesNotMatch(
      api,
      /\.from\(\s*["']warehouse_/i,
    );
  },
);
