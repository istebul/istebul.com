import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl =
  new URL(
    "../../supabase/migrations/20260818004500_warehouse_packing_write_foundation.sql",
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
  "Packing write foundation yalnız düşük ve orta etkili dokuz aksiyonu açar",
  () => {
    const allowed = [
      "create",
      "add_item",
      "release",
      "start",
      "create_container",
      "set_container_active",
      "create_package",
      "create_task",
      "create_exception",
    ];

    for (const action of allowed) {
      assert.ok(
        executableSql.includes(
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
      "create_from_picking",
      "generate_suggestions",
      "confirm_item",
      "add_package_item",
      "seal_package",
      "generate_package_label",
      "create_label",
      "generate_label",
      "mark_label_printed",
      "mark_label_failed",
      "cancel_label",
      "resolve_exception",
      "complete",
      "mark_shipping_ready",
      "cancel",
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
  "Packing write caller JWT auth.uid kullanır",
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
  "Packing write account rolü ile fail closed yetkilendirilir",
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
  "Packing write account + request id idempotency uygular",
  () => {
    assert.match(
      executableSql,
      /warehouse_packing_write_requests/i,
    );

    assert.match(
      executableSql,
      /account_id\s*=\s*p_account_id[\s\S]*?request_id\s*=\s*p_request_id/i,
    );

    assert.match(
      executableSql,
      /v_existing_payload\s*<>\s*v_payload/i,
    );

    assert.match(
      executableSql,
      /v_existing_action\s*<>\s*v_action/i,
    );

    assert.match(
      executableSql,
      /response_payload/i,
    );

    assert.match(
      executableSql,
      /on conflict\s*\(\s*account_id\s*,\s*request_id\s*\)\s*do nothing/i,
    );
  },
);

test(
  "Packing parent ve mutation hedeflerinde row locking kullanılır",
  () => {
    const locks =
      executableSql.match(
        /for update/gi,
      ) ?? [];

    assert.ok(
      locks.length >= 5,
      "Packing mutation hedeflerinde yeterli FOR UPDATE bekleniyor.",
    );
  },
);

test(
  "create tenant depo ve lokasyon bütünlüğünü doğrular",
  () => {
    assert.match(
      executableSql,
      /from public\.warehouses/i,
    );

    assert.match(
      executableSql,
      /from public\.warehouse_locations/i,
    );

    assert.match(
      executableSql,
      /warehouse_id\s*=\s*v_warehouse_id/i,
    );

    assert.match(
      executableSql,
      /packing_location_id/i,
    );
  },
);

test(
  "create external order ve reference kimliklerini text contract olarak taşır",
  () => {
    assert.match(
      executableSql,
      /v_order_id\s+text/i,
    );

    assert.match(
      executableSql,
      /v_reference_id\s+text/i,
    );

    assert.match(
      executableSql,
      /reference_type[\s\S]*reference_id/i,
    );
  },
);

test(
  "add_item parent status ve product SKU tenant bütünlüğünü doğrular",
  () => {
    assert.match(
      executableSql,
      /v_packing\.status\s+not in\s*\(\s*'draft'\s*,\s*'planned'\s*\)/i,
    );

    assert.match(
      executableSql,
      /from public\.warehouse_products/i,
    );

    assert.match(
      executableSql,
      /from public\.warehouse_product_skus/i,
    );

    assert.match(
      executableSql,
      /warehouse_picking_items/i,
    );
  },
);

test(
  "release en az bir item ve işlenmemiş geçerli miktar ister",
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
  "start yalnız released durum ve en az bir task ister",
  () => {
    assert.match(
      executableSql,
      /v_packing\.status\s*<>\s*'released'/i,
    );

    assert.match(
      executableSql,
      /v_task_count\s*=\s*0/i,
    );

    assert.match(
      executableSql,
      /warehouse_packing_tasks/i,
    );
  },
);

test(
  "create_package yalnız aktif container kullanır ve terminal Packing'i reddeder",
  () => {
    assert.match(
      executableSql,
      /warehouse_packing_containers[\s\S]*?active\s*=\s*true/i,
    );

    for (const status of [
      "packed",
      "shipping_ready",
      "cancelled",
    ]) {
      assert.ok(
        executableSql.includes(
          `'${status}'`,
        ),
      );
    }

    assert.match(
      executableSql,
      /parent_package_id/i,
    );
  },
);

test(
  "create_task item package kullanıcı depo ve lokasyon sınırlarını korur",
  () => {
    assert.match(
      executableSql,
      /warehouse_packing_items/i,
    );

    assert.match(
      executableSql,
      /warehouse_packing_packages/i,
    );

    assert.match(
      executableSql,
      /from public\.warehouse_users/i,
    );

    assert.match(
      executableSql,
      /status\s*=\s*'active'/i,
    );
  },
);

test(
  "create_exception terminal Packing için kapalı ve child referansları tenant scoped",
  () => {
    assert.match(
      executableSql,
      /warehouse_packing_exceptions/i,
    );

    assert.match(
      executableSql,
      /warehouse_packing_items/i,
    );

    assert.match(
      executableSql,
      /warehouse_packing_packages/i,
    );

    assert.match(
      executableSql,
      /warehouse_packing_containers/i,
    );

    assert.match(
      executableSql,
      /warehouse_locations/i,
    );
  },
);

test(
  "A8.2 inventory ledger veya balance mutation yapmaz",
  () => {
    assert.doesNotMatch(
      executableSql,
      /(?:insert\s+into|update|delete\s+from)\s+public\.warehouse_inventory_(?:balances|movements)/i,
    );
  },
);

test(
  "A8.2 high impact Packing mutationlarını gerçekleştirmez",
  () => {
    assert.doesNotMatch(
      executableSql,
      /insert\s+into\s+public\.warehouse_packing_package_items/i,
    );

    assert.doesNotMatch(
      executableSql,
      /status\s*=\s*'sealed'/i,
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
  "RPC PUBLIC ve anon için kapalı authenticated için execute açıktır",
  () => {
    assert.match(
      sql,
      /revoke all on function public\.warehouse_packing_write[\s\S]*?from public/i,
    );

    assert.match(
      sql,
      /revoke all on function public\.warehouse_packing_write[\s\S]*?from anon/i,
    );

    assert.match(
      sql,
      /grant execute on function public\.warehouse_packing_write[\s\S]*?to authenticated/i,
    );
  },
);

test(
  "A8.2 service role veya browser elevated key kullanmaz",
  () => {
    assert.doesNotMatch(
      executableSql,
      /service_role|SUPABASE_SERVICE_ROLE_KEY|serviceRole/i,
    );
  },
);

test(
  "create paketleme ve sevkiyat lokasyonunun aynı olmasını reddeder",
  () => {
    assert.match(
      executableSql,
      /v_shipping_location_id\s+is not null[\s\S]*?v_shipping_location_id\s*=\s*v_packing_location_id[\s\S]*?Paketleme ve sevkiyat lokasyonu aynı olamaz/i,
    );
  },
);

test(
  "create_exception taskId referansını aynı account ve Packing içinde doğrular ve saklar",
  () => {
    assert.match(
      executableSql,
      /v_task_id\s*:=\s*nullif\([\s\S]*?v_payload\s*->>\s*'taskId'/i,
    );

    assert.match(
      executableSql,
      /from public\.warehouse_packing_tasks[\s\S]*?account_id\s*=\s*p_account_id[\s\S]*?packing_id\s*=\s*v_packing\.id[\s\S]*?id\s*=\s*v_task_id/i,
    );

    assert.match(
      executableSql,
      /insert into public\.warehouse_packing_exceptions\s*\([\s\S]*?task_id[\s\S]*?\)[\s\S]*?values\s*\([\s\S]*?v_task_id/i,
    );
  },
);
