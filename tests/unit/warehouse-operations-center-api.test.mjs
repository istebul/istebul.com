import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  buildLiveSnapshot,
  extractBearerToken,
  normalizeUuid,
  selectAuthorizedAccount
} from "../../functions/api/warehouse/operations-center.js";

test("WarehouseIQ API Bearer tokenı ayıklar", () => {
  const request = new Request("https://istebul.com/api/warehouse/operations-center", {
    headers: { Authorization: "Bearer örnek-token" }
  });
  assert.equal(extractBearerToken(request), "örnek-token");
  assert.equal(extractBearerToken(new Request("https://istebul.com/api/warehouse/operations-center")), null);
});

test("WarehouseIQ API UUID doğrular", () => {
  assert.equal(normalizeUuid("11111111-1111-4111-8111-111111111111"), "11111111-1111-4111-8111-111111111111");
  assert.equal(normalizeUuid("firma-1"), null);
});

test("WarehouseIQ API yalnız aktif üyelikten firma seçer", () => {
  const membership = {
    account_id: "11111111-1111-4111-8111-111111111111",
    role: "warehouse_manager",
    status: "active"
  };
  const result = selectAuthorizedAccount([membership], membership.account_id);
  assert.equal(result.ok, true);
  assert.deepEqual(result.membership, membership);
});

test("WarehouseIQ API yetkisiz firma seçimini reddeder", () => {
  const result = selectAuthorizedAccount([
    {
      account_id: "11111111-1111-4111-8111-111111111111",
      role: "viewer",
      status: "active"
    }
  ], "22222222-2222-4222-8222-222222222222");
  assert.deepEqual(result, { ok: false, reason: "account_forbidden" });
});

test("WarehouseIQ API servis rolü kullanmaz ve kullanıcı JWT'sini RLS için iletir", async () => {
  const source = await readFile("functions/api/warehouse/operations-center.js", "utf8");
  assert.equal(source.includes("SUPABASE_SERVICE_ROLE_KEY"), false);
  assert.match(source, /Authorization:\s*`Bearer \$\{token\}`/);
  assert.match(source, /warehouse_users/);
  assert.match(source, /status:\s*"eq\.active"/);
  assert.match(source, /onRequestGet/);
  assert.match(source, /onRequestOptions/);
  assert.equal(source.includes("onRequestPost"), false);
});

test(
  "WarehouseIQ API gerçek operasyon satırlarından request-time canlı snapshot üretir",
  () => {
    const snapshot =
      buildLiveSnapshot({
        accountId:
          "11111111-1111-4111-8111-111111111111",

        warehouseId:
          "22222222-2222-4222-8222-222222222222",

        periodStart:
          "2026-08-18T20:00:00.000Z",

        periodEnd:
          "2026-08-19T20:00:00.000Z",

        generatedAt:
          "2026-08-19T20:00:00.000Z",

        pickings: [
          {
            status: "completed"
          },
          {
            status: "in_progress"
          }
        ],

        pickingItems: [
          {
            requested_quantity: 10,
            picked_quantity: 8,
            short_quantity: 2
          },
          {
            requested_quantity: 20,
            picked_quantity: 16,
            short_quantity: 4
          }
        ],

        taskRows: [
          {
            status: "completed"
          },
          {
            status: "exception"
          }
        ],

        cycleCountItems: [
          {
            expected_quantity: 10,
            final_count_quantity: 10,
            tolerance_quantity: 0
          }
        ],

        locations: [
          {
            id:
              "33333333-3333-4333-8333-333333333333",
            maximum_unit_count: 100
          }
        ],

        inventoryBalances: [
          {
            location_id:
              "33333333-3333-4333-8333-333333333333",
            quantity: 40
          }
        ]
      });

    assert.ok(snapshot);

    assert.equal(
      snapshot.total_orders,
      2
    );

    assert.equal(
      snapshot.completed_orders,
      1
    );

    assert.equal(
      snapshot.order_completion_rate,
      50
    );

    assert.equal(
      snapshot.total_tasks,
      2
    );

    assert.equal(
      snapshot.task_completion_rate,
      50
    );

    assert.equal(
      snapshot.inventory_accuracy_rate,
      100
    );

    assert.equal(
      snapshot.requested_items,
      30
    );

    assert.equal(
      snapshot.fulfilled_items,
      24
    );

    assert.equal(
      snapshot.short_items,
      6
    );

    assert.equal(
      snapshot.item_fulfillment_rate,
      80
    );

    assert.equal(
      snapshot.used_capacity,
      40
    );

    assert.equal(
      snapshot.total_capacity,
      100
    );

    assert.equal(
      snapshot.capacity_utilization_rate,
      40
    );

    assert.equal(
      snapshot.on_time_dispatch_rate,
      null
    );

    assert.equal(
      snapshot.labor_utilization_rate,
      null
    );

    assert.equal(
      snapshot.health_score,
      70
    );

    assert.equal(
      snapshot.health_status,
      "attention"
    );
  }
);

test(
  "WarehouseIQ API gerçek lokasyon varken kapasite tanımlı olmasa da canlı snapshot üretir",
  () => {
    const snapshot =
      buildLiveSnapshot({
        accountId:
          "11111111-1111-4111-8111-111111111111",
        warehouseId:
          "22222222-2222-4222-8222-222222222222",
        periodStart:
          "2026-08-18T20:00:00.000Z",
        periodEnd:
          "2026-08-19T20:00:00.000Z",
        generatedAt:
          "2026-08-19T20:00:00.000Z",
        locations: [
          {
            id:
              "33333333-3333-4333-8333-333333333333",
            maximum_unit_count: null
          }
        ]
      });

    assert.ok(snapshot);
    assert.equal(snapshot.total_orders, 0);
    assert.equal(snapshot.total_tasks, 0);
    assert.equal(snapshot.total_inventory_checks, 0);
    assert.equal(snapshot.used_capacity, null);
    assert.equal(snapshot.total_capacity, null);
  }
);

test(
  "WarehouseIQ API veri yokken sahte sıfır snapshot üretmez",
  () => {
    const snapshot =
      buildLiveSnapshot({
        accountId:
          "11111111-1111-4111-8111-111111111111",

        warehouseId: null,

        periodStart:
          "2026-08-18T20:00:00.000Z",

        periodEnd:
          "2026-08-19T20:00:00.000Z",

        generatedAt:
          "2026-08-19T20:00:00.000Z"
      });

    assert.equal(
      snapshot,
      null
    );
  }
);

test(
  "WarehouseIQ live snapshot GET yolu servis rolü veya veri tabanı mutation kullanmaz",
  async () => {
    const source = await readFile(
      "functions/api/warehouse/operations-center.js",
      "utf8"
    );

    assert.match(
      source,
      /loadLiveOperationsSnapshot/
    );

    assert.match(
      source,
      /buildLiveSnapshot/
    );

    assert.match(
      source,
      /warehouse_pickings/
    );

    assert.match(
      source,
      /warehouse_inventory_balances/
    );

    assert.match(
      source,
      /warehouse_cycle_count_items/
    );

    assert.equal(
      source.includes(
        "SUPABASE_SERVICE_ROLE_KEY"
      ),
      false
    );

    assert.equal(
      source.includes(
        "onRequestPost"
      ),
      false
    );

    assert.doesNotMatch(
      source,
      /\.(?:insert|upsert|update|delete)\s*\(/
    );
  }
);
