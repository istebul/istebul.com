import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260812181500_warehouse_picking_complete.sql";

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
  "complete ayrı SECURITY DEFINER RPC'dir",
  () => {
    assert.match(
      executableSql,
      /create or replace function public\.warehouse_picking_complete_write/i,
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
  "complete caller JWT ve picker dahil yetkili rolleri doğrular",
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
  "complete stable idempotency kullanır",
  () => {
    assert.match(
      executableSql,
      /warehouse_picking_write_requests/i,
    );

    assert.match(
      executableSql,
      /v_action constant text\s*:=\s*'complete'/i,
    );

    assert.match(
      executableSql,
      /jsonb_build_object\s*\(\s*'pickingId'/i,
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
  "runtime action constraint complete aksiyonunu kabul eder",
  () => {
    const match =
      executableSql.match(
        /add constraint\s+warehouse_picking_write_requests_action_check\s+check\s*\(\s*action\s+in\s*\(([\s\S]*?)\)\s*\)/i,
      );

    assert.ok(
      match,
      "Complete action constraint bulunamadı.",
    );

    for (const action of [
      "create",
      "add_item",
      "release",
      "create_task",
      "start",
      "execute_item",
      "complete",
    ]) {
      assert.ok(
        match[1].includes(
          `'${action}'`,
        ),
        `Eksik runtime action: ${action}`,
      );
    }

    for (const forbidden of [
      "cancel",
      "resolve_exception",
    ]) {
      assert.doesNotMatch(
        match[1],
        new RegExp(
          `'${forbidden}'`,
          "i",
        ),
      );
    }
  },
);

test(
  "complete parent Picking satırını FOR UPDATE kilitler",
  () => {
    assert.match(
      executableSql,
      /from public\.warehouse_pickings[\s\S]{0,220}?for update/i,
    );
  },
);

test(
  "complete yalnız in_progress veya partially_completed Picking kabul eder",
  () => {
    assert.match(
      executableSql,
      /v_picking\.status not in\s*\(\s*'in_progress'\s*,\s*'partially_completed'/i,
    );
  },
);

test(
  "complete en az bir Picking item ister",
  () => {
    assert.match(
      executableSql,
      /v_item_count\s*=\s*0/i,
    );

    assert.match(
      executableSql,
      /from public\.warehouse_picking_items/i,
    );
  },
);

test(
  "complete kalan miktarı bulunan satırı reddeder",
  () => {
    assert.match(
      executableSql,
      /remaining_quantity\s*>\s*0/i,
    );

    assert.match(
      executableSql,
      /v_open_item_count\s*>\s*0/i,
    );
  },
);

test(
  "picked quantity bulunan satır movement kanıtı ister",
  () => {
    assert.match(
      executableSql,
      /picked_quantity\s*>\s*0/i,
    );

    assert.match(
      executableSql,
      /cardinality\s*\(\s*coalesce\s*\(\s*inventory_movement_ids/i,
    );

    assert.match(
      executableSql,
      /v_missing_movement_count\s*>\s*0/i,
    );
  },
);

test(
  "çözülmemiş Picking exception tamamlamayı engeller",
  () => {
    assert.match(
      executableSql,
      /from public\.warehouse_picking_exceptions/i,
    );

    assert.match(
      executableSql,
      /resolved\s*=\s*false/i,
    );

    assert.match(
      executableSql,
      /v_unresolved_exception_count\s*>\s*0/i,
    );
  },
);

test(
  "complete yalnız parent status ve completed_at lifecycle alanlarını günceller",
  () => {
    assert.match(
      executableSql,
      /update public\.warehouse_pickings/i,
    );

    assert.match(
      executableSql,
      /status\s*=\s*'completed'/i,
    );

    assert.match(
      executableSql,
      /completed_at\s*=\s*v_now/i,
    );
  },
);

test(
  "complete inventory balance veya ledger mutation yapmaz",
  () => {
    assert.doesNotMatch(
      executableSql,
      /(?:insert\s+into|update|delete\s+from)\s+public\.warehouse_inventory_(?:balances|movements)/i,
    );
  },
);

test(
  "complete reservation mutation yapmaz",
  () => {
    assert.doesNotMatch(
      executableSql,
      /(?:insert\s+into|update|delete\s+from)\s+public\.warehouse_inventory_reservations/i,
    );
  },
);

test(
  "complete Picking item task veya exception mutation yapmaz",
  () => {
    assert.doesNotMatch(
      executableSql,
      /(?:insert\s+into|update|delete\s+from)\s+public\.warehouse_picking_items/i,
    );

    assert.doesNotMatch(
      executableSql,
      /(?:insert\s+into|update|delete\s+from)\s+public\.warehouse_picking_tasks/i,
    );

    assert.doesNotMatch(
      executableSql,
      /(?:insert\s+into|update|delete\s+from)\s+public\.warehouse_picking_exceptions/i,
    );
  },
);

test(
  "complete PUBLIC ve anon kapalı authenticated execute açıktır",
  () => {
    assert.match(
      sql,
      /revoke all on function public\.warehouse_picking_complete_write[\s\S]*?from public/i,
    );

    assert.match(
      sql,
      /revoke all on function public\.warehouse_picking_complete_write[\s\S]*?from anon/i,
    );

    assert.match(
      sql,
      /grant execute on function public\.warehouse_picking_complete_write[\s\S]*?to authenticated/i,
    );
  },
);

test(
  "complete service role veya doğrudan tablo grant kullanmaz",
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
  "HTTP complete yalnız ayrı complete RPC üzerinden çalışır",
  () => {
    assert.match(
      api,
      /warehouse_picking_complete_write/i,
    );

    assert.match(
      api,
      /input\.action\s*===\s*"complete"/i,
    );

    assert.doesNotMatch(
      api,
      /\.from\(\s*["']warehouse_/i,
    );
  },
);
