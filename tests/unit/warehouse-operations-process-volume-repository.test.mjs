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
  "/tmp/warehouse-operations-process-volume-repository-test.mjs";

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

function createClient({
  rows = [],
  error = null,
} = {}) {
  const calls = [];

  const builder = {
    select(value) {
      calls.push(["select", value]);
      return this;
    },
    eq(column, value) {
      calls.push(["eq", column, value]);
      return this;
    },
    gte(column, value) {
      calls.push(["gte", column, value]);
      return this;
    },
    lte(column, value) {
      calls.push(["lte", column, value]);
      return this;
    },
    is(column, value) {
      calls.push(["is", column, value]);
      return this;
    },
    order(column, options) {
      calls.push(["order", column, options]);

      return Promise.resolve({
        data: rows,
        error,
      });
    },
  };

  return {
    calls,
    client: {
      from(table) {
        calls.push(["from", table]);
        return builder;
      },
    },
  };
}

const filter = {
  tenantId:
    "11111111-1111-1111-1111-111111111111",
  periodStart:
    "2026-08-07T00:00:00.000Z",
  periodEnd:
    "2026-08-07T23:59:59.999Z",
};

test(
  "firma-geneli süreç hacmi yalnız depo kimliği boş kayıtları okur",
  async () => {
    const fake = createClient({
      rows: [
        {
          process: "receiving",
          operation_count: 120,
        },
        {
          process: "shipping",
          operation_count: 95,
        },
      ],
    });

    const repository =
      new warehouse
        .SupabaseOperationsProcessVolumeRepository(
          fake.client,
        );

    const result =
      await repository.list(filter);

    assert.deepEqual(
      result,
      [
        {
          process: "receiving",
          operationCount: 120,
        },
        {
          process: "shipping",
          operationCount: 95,
        },
      ],
    );

    assert.ok(
      fake.calls.some(
        ([method, column, value]) =>
          method === "eq" &&
          column === "account_id" &&
          value === filter.tenantId,
      ),
    );

    assert.ok(
      fake.calls.some(
        ([method, column, value]) =>
          method === "is" &&
          column === "warehouse_id" &&
          value === null,
      ),
    );

    assert.ok(
      fake.calls.some(
        ([method, column, value]) =>
          method === "gte" &&
          column === "period_end" &&
          value === filter.periodStart,
      ),
    );

    assert.ok(
      fake.calls.some(
        ([method, column, value]) =>
          method === "lte" &&
          column === "period_start" &&
          value === filter.periodEnd,
      ),
    );
  },
);

test(
  "depo bazlı süreç hacmi yalnız istenen depoyu okur",
  async () => {
    const fake = createClient();

    const repository =
      new warehouse
        .SupabaseOperationsProcessVolumeRepository(
          fake.client,
        );

    await repository.list({
      ...filter,
      warehouseId:
        "22222222-2222-2222-2222-222222222222",
    });

    assert.ok(
      fake.calls.some(
        ([method, column, value]) =>
          method === "eq" &&
          column === "warehouse_id" &&
          value ===
            "22222222-2222-2222-2222-222222222222",
      ),
    );

    assert.equal(
      fake.calls.some(
        ([method, column]) =>
          method === "is" &&
          column === "warehouse_id",
      ),
      false,
    );
  },
);

test(
  "süreç hacmi veritabanı hatasını Türkçe bağlamla yükseltir",
  async () => {
    const fake = createClient({
      error: {
        message: "erişim reddedildi",
      },
    });

    const repository =
      new warehouse
        .SupabaseOperationsProcessVolumeRepository(
          fake.client,
        );

    await assert.rejects(
      () => repository.list(filter),
      /Operasyon süreç hacimleri okunamadı: erişim reddedildi/,
    );
  },
);

test(
  "analitik sorgu servisi kalıcı hacimleri analiz servisine aktarır",
  async () => {
    const volumes = [
      {
        process: "picking",
        operationCount: 40,
      },
    ];

    const calls = [];

    const service =
      new warehouse
        .OperationsExceptionAnalyticsQueryService({
          processVolumeRepository: {
            async list(receivedFilter) {
              calls.push([
                "volume",
                receivedFilter,
              ]);
              return volumes;
            },
          },
          analyticsService: {
            async analyze(
              receivedFilter,
              receivedVolumes,
            ) {
              calls.push([
                "analytics",
                receivedFilter,
                receivedVolumes,
              ]);

              return {
                tenantId:
                  receivedFilter.tenantId,
                periodStart:
                  receivedFilter.periodStart,
                periodEnd:
                  receivedFilter.periodEnd,
                totalExceptions: 0,
                unresolvedExceptions: 0,
                criticalExceptions: 0,
                totalDelayMinutes: 0,
                impactedOrders: 0,
                impactedTasks: 0,
                impactedItems: 0,
                processSummaries: [],
                rootCausePareto: [],
                bottlenecks: [],
                managementActions: [],
                calculatedAt:
                  "2026-08-07T22:00:00.000Z",
              };
            },
          },
        });

    const result =
      await service.analyze(filter);

    assert.equal(
      result.tenantId,
      filter.tenantId,
    );

    assert.deepEqual(
      calls,
      [
        [
          "volume",
          filter,
        ],
        [
          "analytics",
          filter,
          volumes,
        ],
      ],
    );
  },
);
