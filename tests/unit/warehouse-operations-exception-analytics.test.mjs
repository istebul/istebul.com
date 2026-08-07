import assert from "node:assert/strict";
import test, {
  after,
  before,
} from "node:test";
import {
  unlink,
} from "node:fs/promises";
import {
  build,
} from "esbuild";

const bundlePath =
  "/tmp/warehouse-operations-exception-analytics-test.mjs";

let warehouse;

before(async () => {
  await build({
    entryPoints: [
      "src/warehouse/index.ts",
    ],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: bundlePath,
    target: "node20",
    sourcemap: false,
  });

  warehouse = await import(
    `file://${bundlePath}?v=${Date.now()}`,
  );
});

after(async () => {
  await unlink(bundlePath).catch(
    () => undefined,
  );
});

function createContext() {
  let sequence = 0;

  const repository =
    new warehouse
      .InMemoryOperationsExceptionRepository();

  const service =
    new warehouse
      .OperationsExceptionAnalyticsService({
        repository,
        now: () =>
          "2026-08-07T09:00:00.000Z",
        idFactory: () =>
          `exception-${++sequence}`,
      });

  return {
    repository,
    service,
  };
}

function createException(
  overrides = {},
) {
  return {
    tenantId: "tenant-1",
    warehouseId: "warehouse-1",
    process: "picking",
    category: "inventory",
    code: "PICK-STOCK-MISMATCH",
    severity: "warning",
    rootCause: "Stok uyuşmazlığı",
    description:
      "Toplama lokasyonundaki fiziksel stok sistem stokuyla eşleşmedi.",
    occurredAt:
      "2026-08-07T08:00:00.000Z",
    delayMinutes: 30,
    impactedOrders: 2,
    impactedTasks: 1,
    impactedItems: 10,
    ...overrides,
  };
}

async function seedParetoData(
  context,
) {
  await context.service
    .recordException(
      createException(),
    );

  await context.service
    .recordException(
      createException({
        occurredAt:
          "2026-08-07T08:05:00.000Z",
        delayMinutes: 20,
      }),
    );

  await context.service
    .recordException(
      createException({
        occurredAt:
          "2026-08-07T08:10:00.000Z",
        severity: "critical",
        delayMinutes: 60,
      }),
    );

  await context.service
    .recordException(
      createException({
        process: "shipping",
        category: "carrier",
        code: "SHIP-CARRIER-DELAY",
        severity: "critical",
        rootCause:
          "Taşıyıcı gecikmesi",
        description:
          "Taşıyıcı aracı planlanan saatte depoya gelmedi.",
        occurredAt:
          "2026-08-07T08:15:00.000Z",
        delayMinutes: 120,
        impactedOrders: 8,
        impactedTasks: 2,
        impactedItems: 80,
      }),
    );

  await context.service
    .recordException(
      createException({
        process: "shipping",
        category: "carrier",
        code: "SHIP-CARRIER-DELAY",
        rootCause:
          "Taşıyıcı gecikmesi",
        description:
          "Taşıyıcı kapasite yetersizliği nedeniyle çıkış ertelendi.",
        occurredAt:
          "2026-08-07T08:20:00.000Z",
        resolvedAt:
          "2026-08-07T09:20:00.000Z",
        resolutionNote:
          "Alternatif araç yönlendirildi.",
        delayMinutes: 90,
        impactedOrders: 6,
        impactedTasks: 2,
        impactedItems: 60,
      }),
    );

  await context.service
    .recordException(
      createException({
        process: "packing",
        category: "equipment",
        code: "PACK-PRINTER-FAILURE",
        rootCause:
          "Etiket yazıcısı arızası",
        description:
          "Paketleme istasyonu etiket yazıcısı çalışmadı.",
        occurredAt:
          "2026-08-07T08:25:00.000Z",
        resolvedAt:
          "2026-08-07T08:55:00.000Z",
        resolutionNote:
          "Yedek yazıcı devreye alındı.",
        delayMinutes: 30,
        impactedOrders: 3,
        impactedTasks: 1,
        impactedItems: 25,
      }),
    );
}

test(
  "süreç hata oranlarını ve Pareto kök neden analizini üretir",
  async () => {
    const context =
      createContext();

    await seedParetoData(
      context,
    );

    const report =
      await context.service
        .analyze(
          {
            tenantId: "tenant-1",
            warehouseId:
              "warehouse-1",
            periodStart:
              "2026-08-07T00:00:00.000Z",
            periodEnd:
              "2026-08-07T23:59:59.999Z",
          },
          [
            {
              process: "picking",
              operationCount: 100,
            },
            {
              process: "shipping",
              operationCount: 50,
            },
            {
              process: "packing",
              operationCount: 40,
            },
          ],
        );

    assert.equal(
      report.totalExceptions,
      6,
    );

    const picking =
      report.processSummaries.find(
        (summary) =>
          summary.process ===
          "picking",
      );

    assert.equal(
      picking.exceptionCount,
      3,
    );

    assert.equal(
      picking.errorRate,
      3,
    );

    assert.equal(
      report.rootCausePareto[0]
        .rootCause,
      "Stok uyuşmazlığı",
    );

    assert.equal(
      report.rootCausePareto[0]
        .percentage,
      50,
    );

    assert.equal(
      report.rootCausePareto[1]
        .cumulativePercentage,
      83.33,
    );

    assert.equal(
      report.rootCausePareto[1]
        .withinPrimary80Percent,
      true,
    );
  },
);

test(
  "darboğazları puanlar ve Türkçe yönetici aksiyonları üretir",
  async () => {
    const context =
      createContext();

    await seedParetoData(
      context,
    );

    const report =
      await context.service
        .analyze(
          {
            tenantId: "tenant-1",
            warehouseId:
              "warehouse-1",
            periodStart:
              "2026-08-07T00:00:00.000Z",
            periodEnd:
              "2026-08-07T23:59:59.999Z",
          },
          [
            {
              process: "picking",
              operationCount: 100,
            },
            {
              process: "shipping",
              operationCount: 20,
            },
            {
              process: "packing",
              operationCount: 40,
            },
          ],
        );

    assert.equal(
      report.bottlenecks[0]
        .process,
      "shipping",
    );

    assert.ok(
      report.bottlenecks[0]
        .score >
        report.bottlenecks[1]
          .score,
    );

    assert.ok(
      report.managementActions.some(
        (action) =>
          action.code ===
          "RESOLVE_CRITICAL_EXCEPTIONS",
      ),
    );

    assert.ok(
      report.managementActions.some(
        (action) =>
          action.title.includes(
            "darboğazını azaltın",
          ),
      ),
    );

    assert.ok(
      report.managementActions.some(
        (action) =>
          action.title.includes(
            "kök nedenini ortadan kaldırın",
          ),
      ),
    );
  },
);

test(
  "firma, depo ve dönem izolasyonunu korur",
  async () => {
    const context =
      createContext();

    await context.service
      .recordException(
        createException(),
      );

    await context.service
      .recordException(
        createException({
          tenantId: "tenant-2",
        }),
      );

    await context.service
      .recordException(
        createException({
          warehouseId:
            "warehouse-2",
        }),
      );

    await context.service
      .recordException(
        createException({
          occurredAt:
            "2026-08-08T08:00:00.000Z",
        }),
      );

    const report =
      await context.service
        .analyze(
          {
            tenantId: "tenant-1",
            warehouseId:
              "warehouse-1",
            periodStart:
              "2026-08-07T00:00:00.000Z",
            periodEnd:
              "2026-08-07T23:59:59.999Z",
          },
          [
            {
              process: "picking",
              operationCount: 100,
            },
          ],
        );

    assert.equal(
      report.totalExceptions,
      1,
    );

    assert.equal(
      report.tenantId,
      "tenant-1",
    );

    assert.equal(
      report.warehouseId,
      "warehouse-1",
    );
  },
);

test(
  "geçersiz istisna ve hacim verilerini reddeder",
  async () => {
    const context =
      createContext();

    await assert.rejects(
      () =>
        context.service
          .recordException(
            createException({
              resolvedAt:
                "2026-08-07T07:00:00.000Z",
            }),
          ),
      /İstisna çözüm tarihi, oluşma tarihinden önce olamaz/,
    );

    await assert.rejects(
      () =>
        context.service
          .recordException(
            createException({
              delayMinutes: -1,
            }),
          ),
      /Gecikme süresi sıfır veya daha büyük olmalıdır/,
    );

    await assert.rejects(
      () =>
        context.service
          .analyze(
            {
              tenantId: "tenant-1",
              periodStart:
                "2026-08-08T00:00:00.000Z",
              periodEnd:
                "2026-08-07T00:00:00.000Z",
            },
            [],
          ),
      /Dönem başlangıcı, dönem bitişinden sonra olamaz/,
    );

    await assert.rejects(
      () =>
        context.service
          .analyze(
            {
              tenantId: "tenant-1",
              periodStart:
                "2026-08-07T00:00:00.000Z",
              periodEnd:
                "2026-08-07T23:59:59.999Z",
            },
            [
              {
                process: "picking",
                operationCount: 10,
              },
              {
                process: "picking",
                operationCount: 20,
              },
            ],
          ),
      /Toplama süreci için birden fazla operasyon hacmi tanımlanamaz/,
    );
  },
);
