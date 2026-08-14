import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  "supabase/migrations/20260814012000_warehouse_cycle_count_completion_rpc.sql",
  "utf8",
);

const processSection =
  source.split(
    "-- PROCESS ADJUSTMENTS",
  )[1]?.split(
    "-- COMPLETE COUNT + IMMUTABLE REPORT",
  )[0] || "";

const completeSection =
  source.split(
    "-- COMPLETE COUNT + IMMUTABLE REPORT",
  )[1]?.split(
    "-- IDEMPOTENT RESPONSE",
  )[0] || "";

test("process_adjustments yalnız approved parent üzerinde çalışır", () => {
  assert.match(
    processSection,
    /v_count\.status <> 'approved'/i,
  );
});

test("process preflight inventory mutation başlamadan önce approved adjustmentları FOR UPDATE kilitler", () => {
  assert.match(
    processSection,
    /status\s*=\s*'approved'[\s\S]*for update/i,
  );

  const preflight =
    processSection.split(
      "-- POSTING",
    )[0];

  assert.doesNotMatch(
    preflight,
    /insert\s+into\s+public\.warehouse_inventory_movements/i,
  );

  assert.doesNotMatch(
    preflight,
    /update\s+public\.warehouse_inventory_balances/i,
  );
});

test("preflight item ve exact source balance kayıtlarını kilitler", () => {
  assert.match(
    processSection,
    /warehouse_cycle_count_items[\s\S]*for update/i,
  );

  assert.match(
    processSection,
    /warehouse_inventory_balances[\s\S]*lot_number[\s\S]*serial_number[\s\S]*stock_status[\s\S]*for update/i,
  );
});

test("preflight current quantity approved previous_quantity ile birebir eşleşir", () => {
  assert.match(
    processSection,
    /v_balance\.quantity\s*<>\s*v_adjustment\.previous_quantity/i,
  );
});

test("preflight fiziksel sayım sonrasındaki inventory movementı bloke eder", () => {
  assert.match(
    processSection,
    /last_movement_at[\s\S]*v_physical_counted_at/i,
  );

  assert.match(
    processSection,
    /'inventory_movement_detected'/i,
  );

  assert.match(
    processSection,
    /'requiresPhysicalRecount'[\s\S]*true/i,
  );
});

test("preflight başarısızlığında inventory mutation olmadan adjustment failed olur", () => {
  const preflight =
    processSection.split(
      "-- POSTING",
    )[0];

  assert.match(
    preflight,
    /status\s*=\s*'failed'/i,
  );

  assert.match(
    preflight,
    /status\s*=\s*'under_review'/i,
  );

  assert.doesNotMatch(
    preflight,
    /insert\s+into\s+public\.warehouse_inventory_movements/i,
  );
});

test("quantity correction count_surplus veya count_shortage ledger hareketi üretir", () => {
  assert.match(
    processSection,
    /'count_surplus'/i,
  );

  assert.match(
    processSection,
    /'count_shortage'/i,
  );

  assert.match(
    processSection,
    /'adjustment'/i,
  );
});

test("inventory movement DB sequence ile numaralanır", () => {
  assert.match(
    processSection,
    /warehouse_inventory_movement_number_seq/i,
  );

  assert.match(
    processSection,
    /'HRK-'/i,
  );
});

test("Cycle Count movement referansı ve adjustment transaction group korunur", () => {
  assert.match(
    processSection,
    /'cycle_count'/i,
  );

  assert.match(
    processSection,
    /p_cycle_count_id::text/i,
  );

  assert.match(
    processSection,
    /v_count\.cycle_count_number/i,
  );

  assert.match(
    processSection,
    /v_adjustment\.id::text/i,
  );
});

test("stok bakiyesi stale variance eklemek yerine doğrudan final physical quantity olur", () => {
  assert.match(
    processSection,
    /quantity\s*=\s*v_item\.final_count_quantity/i,
  );
});

test("damage source status stoktan düşülür ve damaged balance'a eklenir", () => {
  assert.match(
    processSection,
    /'damage'/i,
  );

  assert.match(
    processSection,
    /stock_status[\s\S]*'damaged'/i,
  );

  assert.match(
    processSection,
    /quantity\s*=\s*quantity\s*-\s*v_item\.damaged_quantity/i,
  );

  assert.match(
    processSection,
    /insert into\s+public\.warehouse_inventory_balances/i,
  );

  assert.match(
    processSection,
    /public\.warehouse_inventory_balances\.quantity\s*\+\s*excluded\.quantity/i,
  );
});

test("adjustment success primary inventory movement audit kimliğini saklar", () => {
  assert.match(
    processSection,
    /inventory_movement_id\s*=\s*v_primary_movement_id/i,
  );

  assert.match(
    processSection,
    /processed_by\s*=\s*v_user_id/i,
  );

  assert.match(
    processSection,
    /processed_at\s*=\s*v_now/i,
  );
});

test("başarılı posting item adjusted yapar ve adjustment_required kapatır", () => {
  assert.match(
    processSection,
    /status\s*=\s*'adjusted'/i,
  );

  assert.match(
    processSection,
    /adjustment_required\s*=\s*false/i,
  );
});

test("posting ilgili variance damage approval exceptionlarını çözer", () => {
  for (
    const type
    of [
      "variance_exceeded",
      "damaged_stock",
      "approval_required",
    ]
  ) {
    assert.match(
      processSection,
      new RegExp(`'${type}'`),
    );
  }

  assert.match(
    processSection,
    /resolved\s*=\s*true/i,
  );
});

test("tüm posting başarılıysa parent adjusted olur", () => {
  assert.match(
    processSection,
    /warehouse_cycle_counts[\s\S]*status\s*=\s*'adjusted'/i,
  );

  assert.match(
    processSection,
    /adjusted_at/i,
  );
});

test("complete yalnız approved veya adjusted parent kabul eder", () => {
  assert.match(
    completeSection,
    /v_count\.status not in\s*\(\s*'approved',\s*'adjusted'\s*\)/i,
  );
});

test("complete açık recount review adjustment ve pending approval blockerlarını kontrol eder", () => {
  assert.match(
    completeSection,
    /recount_required = true/i,
  );

  assert.match(
    completeSection,
    /adjustment_required = true/i,
  );

  assert.match(
    completeSection,
    /'under_review'/i,
  );

  assert.match(
    completeSection,
    /warehouse_cycle_count_approvals/i,
  );

  assert.match(
    completeSection,
    /status\s*=\s*'pending'/i,
  );
});

test("complete tamamlanmamış task ve unresolved exception varken bloklanır", () => {
  assert.match(
    completeSection,
    /warehouse_cycle_count_tasks/i,
  );

  assert.match(
    completeSection,
    /warehouse_cycle_count_exceptions/i,
  );

  assert.match(
    completeSection,
    /resolved\s*=\s*false/i,
  );
});

test("complete immutable report için ikinci snapshotı engeller", () => {
  assert.match(
    completeSection,
    /warehouse_cycle_count_reports/i,
  );

  assert.match(
    completeSection,
    /immutable completion report zaten oluşturulmuş/i,
  );
});

test("report summary zorunlu operasyon metriklerini içerir", () => {
  for (
    const key
    of [
      "cycleCountNumber",
      "strategy",
      "startedAt",
      "countedAt",
      "approvedAt",
      "adjustedAt",
      "completedAt",
      "totalItems",
      "matchedItems",
      "varianceItems",
      "recountItems",
      "adjustedItems",
      "damagedItems",
      "accuracyPercentage",
      "totalAbsoluteVarianceQuantity",
      "totalAbsoluteVarianceValue",
    ]
  ) {
    assert.match(
      completeSection,
      new RegExp(`'${key}'`),
    );
  }
});

test("report item snapshot yönetim detaylarını içerir", () => {
  for (
    const key
    of [
      "lineNumber",
      "warehouseId",
      "locationId",
      "locationCode",
      "productId",
      "productCode",
      "productName",
      "skuId",
      "skuCode",
      "stockStatus",
      "unit",
      "expectedQuantity",
      "firstCountQuantity",
      "secondCountQuantity",
      "finalCountQuantity",
      "damagedQuantity",
      "varianceQuantity",
      "variancePercentage",
      "varianceValue",
      "countedBy",
      "countedAt",
      "recountedBy",
      "recountedAt",
      "approvedBy",
      "approvedAt",
      "status",
    ]
  ) {
    assert.match(
      completeSection,
      new RegExp(`'${key}'`),
    );
  }
});

test("report codes schema driftine dayanıklı to_jsonb lookup kullanır", () => {
  assert.match(
    completeSection,
    /to_jsonb\(l\)\s*->>\s*'full_code'/i,
  );

  assert.match(
    completeSection,
    /to_jsonb\(p\)\s*->>\s*'code'/i,
  );

  assert.match(
    completeSection,
    /to_jsonb\(s\)\s*->>\s*'sku_code'/i,
  );
});

test("immutable report completion ile aynı transaction içinde insert edilir", () => {
  assert.match(
    completeSection,
    /insert into\s+public\.warehouse_cycle_count_reports/i,
  );

  assert.match(
    completeSection,
    /status[\s\S]*'completed'/i,
  );

  assert.match(
    completeSection,
    /generated_by[\s\S]*v_user_id/i,
  );
});

test("final parent status completed ve completed_at yazılır", () => {
  assert.match(
    completeSection,
    /warehouse_cycle_counts[\s\S]*status\s*=\s*'completed'/i,
  );

  assert.match(
    completeSection,
    /completed_at\s*=\s*v_now/i,
  );
});

test("completion response blind-count detaylarını dışarı çıkarmaz", () => {
  const responseBlocks = [
    ...source.matchAll(
      /v_response\s*:=\s*jsonb_build_object\(([\s\S]*?)\n\s*\);/gi,
    ),
  ]
    .map((match) => match[1])
    .join("\n");

  for (
    const forbidden
    of [
      "expectedQuantity",
      "firstCountQuantity",
      "secondCountQuantity",
      "finalCountQuantity",
      "varianceQuantity",
      "varianceValue",
      "unitCost",
    ]
  ) {
    assert.doesNotMatch(
      responseBlocks,
      new RegExp(`'${forbidden}'`),
    );
  }
});

test("damage target balance upsert sonuçsuz kalırsa transaction fail-fast olur", () => {
  assert.match(
    processSection,
    /v_damage_balance_id\s*:=\s*null/i,
  );

  assert.match(
    processSection,
    /returning id\s*into\s*v_damage_balance_id/i,
  );

  assert.match(
    processSection,
    /if v_damage_balance_id is null then[\s\S]*raise exception/i,
  );

  assert.match(
    processSection,
    /Hasarlı stok bakiyesi farklı ölçü birimiyle güncellenemez/i,
  );
});
