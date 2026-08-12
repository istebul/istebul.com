import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl =
  new URL(
    "../../supabase/migrations/20260812164500_warehouse_picking_write_foundation.sql",
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
  "Picking write foundation yalnız beş yönetim aksiyonunu açar",
  () => {
    for (const action of [
      "create",
      "add_item",
      "release",
      "create_task",
      "start",
    ]) {
      assert.ok(
        sql.includes(
          `'${action}'`,
        ),
        `Eksik action: ${action}`,
      );
    }

    const actionBlock =
      executableSql.match(
        /v_action\s*=\s*any\s*\(\s*array\[([\s\S]*?)\]::text\[\]\s*\)/i,
      );

    assert.ok(
      actionBlock,
      "Action allowlist bulunamadı.",
    );

    for (const forbidden of [
      "execute_item",
      "resolve_exception",
      "complete",
      "cancel",
      "create_wave",
      "create_batch",
    ]) {
      assert.doesNotMatch(
        actionBlock[1],
        new RegExp(
          `'${forbidden}'`,
          "i",
        ),
      );
    }
  },
);

test(
  "Picking write caller JWT auth.uid kullanır",
  () => {
    assert.match(
      executableSql,
      /auth\.uid\(\)/i,
    );

    assert.match(
      executableSql,
      /v_user_id\s+uuid\s*:=\s*auth\.uid\(\)/i,
    );
  },
);

test(
  "Picking write account role kontrolünde picker rolünü içerir",
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
        executableSql.includes(
          `'${role}'`,
        ),
        `Eksik role: ${role}`,
      );
    }
  },
);

test(
  "Picking write account + request id idempotency kullanır",
  () => {
    assert.match(
      executableSql,
      /warehouse_picking_write_requests/i,
    );

    assert.match(
      executableSql,
      /account_id\s*=\s*p_account_id[\s\S]*?request_id\s*=\s*p_request_id/i,
    );

    assert.match(
      executableSql,
      /request_payload\s*<>\s*v_payload|v_existing_payload\s*<>\s*v_payload/i,
    );

    assert.match(
      executableSql,
      /response_payload/i,
    );
  },
);

test(
  "release en az bir item ve geçerli miktar ister",
  () => {
    assert.match(
      executableSql,
      /v_item_count\s*=\s*0/i,
    );

    assert.match(
      executableSql,
      /requested_quantity\s*<=\s*0/i,
    );

    assert.match(
      executableSql,
      /remaining_quantity\s*<=\s*0/i,
    );
  },
);

test(
  "start released durum ve en az bir task ister",
  () => {
    assert.match(
      executableSql,
      /v_picking\.status\s*<>\s*'released'/i,
    );

    assert.match(
      executableSql,
      /v_task_count\s*=\s*0/i,
    );

    assert.match(
      executableSql,
      /warehouse_picking_tasks/i,
    );
  },
);

test(
  "create_task item ve source location bütünlüğünü doğrular",
  () => {
    assert.match(
      executableSql,
      /v_item\.source_location_id/i,
    );

    assert.match(
      executableSql,
      /warehouse_locations/i,
    );

    assert.match(
      executableSql,
      /source_location_id/i,
    );
  },
);

test(
  "A4 inventory balance veya movement mutation yapmaz",
  () => {
    assert.doesNotMatch(
      executableSql,
      /(?:insert\s+into|update|delete\s+from)\s+public\.warehouse_inventory_(?:balances|movements)/i,
    );
  },
);

test(
  "A4 reservation tüketmez",
  () => {
    assert.doesNotMatch(
      executableSql,
      /reservation.*consume|consume.*reservation|warehouse_inventory_reservation/i,
    );
  },
);

test(
  "A4 Picking complete veya cancel mutation yapmaz",
  () => {
    assert.doesNotMatch(
      executableSql,
      /status\s*=\s*'completed'/i,
    );

    assert.doesNotMatch(
      executableSql,
      /status\s*=\s*'cancelled'/i,
    );
  },
);

test(
  "RPC PUBLIC ve anon için kapalı, authenticated için execute açıktır",
  () => {
    assert.match(
      sql,
      /revoke all on function public\.warehouse_picking_write[\s\S]*?from public/i,
    );

    assert.match(
      sql,
      /revoke all on function public\.warehouse_picking_write[\s\S]*?from anon/i,
    );

    assert.match(
      sql,
      /grant execute on function public\.warehouse_picking_write[\s\S]*?to authenticated/i,
    );
  },
);

test(
  "A4 yükseltilmiş sunucu anahtarı kullanmaz",
  () => {
    assert.doesNotMatch(
      executableSql,
      /service_role|SUPABASE_SERVICE_ROLE_KEY|serviceRole/i,
    );
  },
);
