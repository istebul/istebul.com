import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildWarehouseOperationsCopilotRuntime
} from "../../functions/_shared/warehouse-copilot-runtime.js";

function snapshotRow({
  id,
  periodStart,
  periodEnd,
  calculatedAt,
  healthScore,
  orderCompletion,
  dispatch,
  taskCompletion,
  inventory,
  capacity,
  labor,
  fulfillment
}) {
  return {
    id,
    account_id: "11111111-1111-4111-8111-111111111111",
    warehouse_id: "22222222-2222-4222-8222-222222222222",
    period_start: periodStart,
    period_end: periodEnd,
    total_orders: 100,
    completed_orders: orderCompletion,
    on_time_orders: dispatch,
    delayed_orders: 100 - dispatch,
    total_tasks: 100,
    completed_tasks: taskCompletion,
    exception_tasks: 100 - taskCompletion,
    total_inventory_checks: 100,
    accurate_inventory_checks: inventory,
    used_capacity: capacity,
    total_capacity: 100,
    productive_minutes: labor,
    available_labor_minutes: 100,
    requested_items: 100,
    fulfilled_items: fulfillment,
    short_items: 100 - fulfillment,
    order_completion_rate: orderCompletion,
    on_time_dispatch_rate: dispatch,
    task_completion_rate: taskCompletion,
    task_exception_rate: 100 - taskCompletion,
    inventory_accuracy_rate: inventory,
    capacity_utilization_rate: capacity,
    labor_utilization_rate: labor,
    item_fulfillment_rate: fulfillment,
    short_pick_rate: 100 - fulfillment,
    health_score: healthScore,
    health_status: "attention",
    kpis: [
      {
        key: "order_completion",
        label: "Sipariş tamamlama",
        value: orderCompletion,
        unit: "percent",
        target: 95,
        status: orderCompletion >= 95 ? "good" : "warning"
      },
      {
        key: "on_time_dispatch",
        label: "Zamanında sevkiyat",
        value: dispatch,
        unit: "percent",
        target: 95,
        status: dispatch >= 95 ? "good" : "warning"
      },
      {
        key: "task_completion",
        label: "Görev tamamlama",
        value: taskCompletion,
        unit: "percent",
        target: 95,
        status: taskCompletion >= 95 ? "good" : "warning"
      },
      {
        key: "inventory_accuracy",
        label: "Stok doğruluğu",
        value: inventory,
        unit: "percent",
        target: 98,
        status: inventory >= 98 ? "good" : "warning"
      },
      {
        key: "capacity_utilization",
        label: "Kapasite kullanımı",
        value: capacity,
        unit: "percent",
        target: 90,
        status: capacity >= 85 && capacity <= 95 ? "good" : "warning"
      }
    ],
    alerts: [],
    calculated_at: calculatedAt
  };
}

const currentSnapshot = snapshotRow({
  id: "33333333-3333-4333-8333-333333333333",
  periodStart: "2026-08-10T00:00:00.000Z",
  periodEnd: "2026-08-10T23:59:59.999Z",
  calculatedAt: "2026-08-10T07:00:00.000Z",
  healthScore: 72,
  orderCompletion: 94,
  dispatch: 96,
  taskCompletion: 97,
  inventory: 99,
  capacity: 88,
  labor: 91,
  fulfillment: 98
});

const previousSnapshot = snapshotRow({
  id: "55555555-5555-4555-8555-555555555555",
  periodStart: "2026-08-09T00:00:00.000Z",
  periodEnd: "2026-08-09T23:59:59.999Z",
  calculatedAt: "2026-08-09T07:00:00.000Z",
  healthScore: 68,
  orderCompletion: 90,
  dispatch: 91,
  taskCompletion: 92,
  inventory: 97,
  capacity: 80,
  labor: 87,
  fulfillment: 94
});

const criticalException = {
  id: "44444444-4444-4444-8444-444444444444",
  account_id: "11111111-1111-4111-8111-111111111111",
  warehouse_id: "22222222-2222-4222-8222-222222222222",
  process: "shipping",
  category: "delay",
  code: "SHIP_DELAY",
  severity: "critical",
  root_cause: "Taşıyıcı gecikmesi",
  description: "2 sevkiyat gecikme riski taşıyor.",
  occurred_at: "2026-08-10T06:00:00.000Z",
  resolved_at: null,
  resolution_note: null,
  delay_minutes: 120,
  impacted_orders: 2,
  impacted_tasks: 2,
  impacted_items: 4,
  created_at: "2026-08-10T06:00:00.000Z"
};

test("runtime adapter 009A Copilot servisini canlı satırlarla çalıştırır", async () => {
  const result =
    await buildWarehouseOperationsCopilotRuntime({
      accountId: "11111111-1111-4111-8111-111111111111",
      warehouseId: "22222222-2222-4222-8222-222222222222",
      generatedAt: "2026-08-10T07:00:00.000Z",
      snapshot: currentSnapshot,
      trend: [
        previousSnapshot,
        currentSnapshot
      ],
      exceptions: [
        criticalException
      ],
      processVolumes: [
        {
          process: "shipping",
          operation_count: 18
        }
      ]
    });

  assert.equal(result.health.score, 72);
  assert.equal(
    result.health.statusLabel,
    "Dikkat gerekli"
  );
  assert.match(
    result.dailySummary,
    /72\/100/
  );
  assert.match(
    result.dailySummary,
    /açık istisna/
  );
  assert.equal(
    result.topRisk.source,
    "exception_analytics"
  );
  assert.equal(
    result.topRisk.priority,
    "immediate"
  );
  assert.ok(
    result.actions.some(
      (action) =>
        action.source ===
          "exception_analytics" &&
        action.priority === "immediate" &&
        action.dueLabel === "Hemen"
    )
  );
  assert.equal(
    result.topOpportunity.source,
    "comparison"
  );
  assert.equal(
    result.confidence.score,
    100
  );
  assert.equal(
    result.grounding.snapshotId,
    currentSnapshot.id
  );
});

test("snapshot yoksa Copilot runtime null döner", async () => {
  assert.equal(
    await buildWarehouseOperationsCopilotRuntime({
      accountId: "11111111-1111-4111-8111-111111111111",
      warehouseId: null,
      snapshot: null,
      generatedAt: "2026-08-10T07:00:00.000Z"
    }),
    null
  );
});

test("API paralel Copilot karar motoru taşımaz", async () => {
  const api = await readFile(
    "functions/api/warehouse/operations-center.js",
    "utf8"
  );

  assert.match(
    api,
    /buildWarehouseOperationsCopilotRuntime/
  );
  assert.doesNotMatch(
    api,
    /COPILOT_HEALTH_LABELS|copilotPriority|buildOperationsCopilotView/
  );
});

test("runtime kaynak kodu OperationsCopilotService'i tek otorite olarak kullanır", async () => {
  const source = await readFile(
    "src/warehouse/runtime/OperationsCopilotRuntime.ts",
    "utf8"
  );

  assert.match(
    source,
    /OperationsCopilotService/
  );
  assert.match(
    source,
    /OperationsExceptionAnalyticsService/
  );
  assert.match(
    source,
    /OperationsReportingService/
  );
  assert.doesNotMatch(
    source,
    /buildTopRisk|buildTopOpportunity|rankRiskKpis/
  );
});

test("WarehouseIQ operasyon merkezi Copilot panelini içerir", async () => {
  const html = await readFile(
    "warehouse/index.html",
    "utf8"
  );

  assert.match(html, /id="copilot"/);
  assert.match(
    html,
    /Günlük yönetici özeti/
  );
  assert.match(
    html,
    /id="copilot-ai-btn"/
  );
  assert.match(
    html,
    /AI anlatımını oluştur/
  );
});

test("AI anlatımı yalnız kullanıcı aksiyonuyla çağrılır", async () => {
  const js = await readFile(
    "js/warehouse/operations-center.js",
    "utf8"
  );

  assert.match(
    js,
    /fetchWarehouseCopilotNarration/
  );
  assert.match(
    js,
    /enhanceCopilotWithAi/
  );
  assert.match(
    js,
    /copilot-ai-btn/
  );
  assert.match(
    js,
    /addEventListener\("click"/
  );
});

test("Copilot kullanıcı metnini innerHTML kullanmadan render eder", async () => {
  const js = await readFile(
    "js/warehouse/operations-center.js",
    "utf8"
  );

  const start =
    js.indexOf(
      "function setCopilotState"
    );
  const end =
    js.indexOf(
      "function clearMetrics"
    );

  assert.ok(start >= 0);
  assert.ok(end > start);

  const source =
    js.slice(start, end);

  assert.match(
    source,
    /\.textContent\s*=/
  );
  assert.doesNotMatch(
    source,
    /\.innerHTML\s*=/
  );
});

test("production build Copilot tarayıcı bağımlılıklarını yayınlar", async () => {
  const [build, packageText] =
    await Promise.all([
      readFile(
        "scripts/production-build.cjs",
        "utf8"
      ),
      readFile(
        "package.json",
        "utf8"
      )
    ]);

  assert.match(
    build,
    /js\/warehouse\/operations-center\.js/
  );
  assert.match(
    build,
    /js\/warehouse\/operations-copilot-narration\.js/
  );
  assert.match(
    packageText,
    /build-warehouse-copilot-runtime\.cjs/
  );
});
