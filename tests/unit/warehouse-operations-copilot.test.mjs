import assert from "node:assert/strict";
import test from "node:test";

import {
  OperationsCopilotService,
} from "../../src/warehouse/services/OperationsCopilotService.ts";

const baseSnapshot = {
  id: "snapshot-1",
  tenantId: "tenant-1",
  warehouseId: "warehouse-1",
  periodStart: "2026-08-08T00:00:00.000Z",
  periodEnd: "2026-08-08T23:59:59.999Z",
  healthScore: 64,
  healthStatus: "attention",
  kpis: [
    {
      key: "order_completion",
      label: "Sipariş tamamlama",
      value: 91,
      unit: "percent",
      target: 98,
      status: "warning",
    },
    {
      key: "inventory_accuracy",
      label: "Stok doğruluğu",
      value: 99,
      unit: "percent",
      target: 98,
      status: "good",
    },
  ],
  alerts: [],
  calculatedAt: "2026-08-08T10:00:00.000Z",
};

const analytics = {
  tenantId: "tenant-1",
  warehouseId: "warehouse-1",
  periodStart: "2026-08-08T00:00:00.000Z",
  periodEnd: "2026-08-08T23:59:59.999Z",
  totalExceptions: 4,
  unresolvedExceptions: 2,
  managementActions: [
    {
      code: "RESOLVE_CRITICAL_EXCEPTIONS",
      priority: "immediate",
      title: "Kritik istisnaları hemen çözüm kuyruğuna alın",
      description: "2 kritik istisna henüz çözülmedi.",
    },
  ],
  calculatedAt: "2026-08-08T10:05:00.000Z",
};

const periodComparison = {
  current: {
    tenantId: "tenant-1",
    warehouseId: "warehouse-1",
  },
  previous: {
    tenantId: "tenant-1",
    warehouseId: "warehouse-1",
  },
  metrics: [
    {
      key: "inventory_accuracy",
      label: "Stok doğruluğu",
      currentValue: 99,
      previousValue: 97,
      change: 2,
      changeRate: 2.06,
      direction: "improving",
      improved: true,
    },
  ],
  improvingMetricCount: 1,
  decliningMetricCount: 0,
  improved: true,
  calculatedAt: "2026-08-08T10:10:00.000Z",
};

test("Copilot deterministik karar özeti üretir", () => {
  const result = new OperationsCopilotService().build({
    snapshot: baseSnapshot,
    exceptionAnalytics: analytics,
    comparison: periodComparison,
    generatedAt: "2026-08-08T10:15:00.000Z",
  });

  assert.equal(result.generatedAt, "2026-08-08T10:15:00.000Z");
  assert.equal(result.health.score, 64);
  assert.match(result.dailySummary, /Depo sağlık skoru 64\/100/);
  assert.match(result.dailySummary, /2 açık istisna/);
  assert.equal(result.actions[0].priority, "immediate");
  assert.equal(result.grounding.snapshotId, "snapshot-1");
});

test("KPI değerlerini uydurmadan risk ve aksiyona dönüştürür", () => {
  const result = new OperationsCopilotService().build({
    snapshot: baseSnapshot,
  });

  assert.equal(result.topRisk?.title, "Sipariş tamamlama hedefin altında");
  assert.match(result.topRisk?.description ?? "", /yüzde 91; hedef yüzde 98/);
  assert.match(result.actions[0].description, /yüzde 91; hedef yüzde 98/);
});

test("İstisna aksiyonlarını önceliğiyle taşır", () => {
  const result = new OperationsCopilotService().build({
    snapshot: { ...baseSnapshot, kpis: [] },
    exceptionAnalytics: analytics,
  });

  assert.equal(
    result.actions[0].id,
    "exception-action-RESOLVE_CRITICAL_EXCEPTIONS",
  );
  assert.equal(result.actions[0].dueLabel, "Hemen");
  assert.equal(result.topRisk?.source, "exception_analytics");
});

test("İyileşen metriği fırsat olarak gösterir", () => {
  const result = new OperationsCopilotService().build({
    snapshot: { ...baseSnapshot, kpis: [] },
    comparison: periodComparison,
  });

  assert.equal(result.topOpportunity?.title, "Stok doğruluğu iyileşiyor");
  assert.equal(result.topOpportunity?.source, "comparison");
});

test("Farklı firma kapsamındaki analizi reddeder", () => {
  assert.throws(
    () =>
      new OperationsCopilotService().build({
        snapshot: baseSnapshot,
        exceptionAnalytics: { ...analytics, tenantId: "tenant-2" },
      }),
    /aynı firma ve depo kapsamında/,
  );
});

test("009A harici model çağrısı ve veri yazımı yapmadığını açıklar", () => {
  const result = new OperationsCopilotService().build({
    snapshot: { ...baseSnapshot, kpis: [] },
  });

  assert.match(result.disclosure, /harici model çağrısı yapılmaz/);
  assert.match(result.disclosure, /operasyon verisini değiştirmez/);
});

test("Acil istisna aksiyonu uyarı KPI'sından daha yüksek risk önceliği alır", () => {
  const result = new OperationsCopilotService().build({
    snapshot: baseSnapshot,
    exceptionAnalytics: analytics,
  });

  assert.equal(result.topRisk?.source, "exception_analytics");
  assert.equal(result.topRisk?.priority, "immediate");
  assert.equal(
    result.topRisk?.id,
    "exception-risk-RESOLVE_CRITICAL_EXCEPTIONS",
  );
});
