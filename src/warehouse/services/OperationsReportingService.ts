import {
  InventoryValidationError,
} from "../types/InventoryErrors";
import type {
  OperationsDashboardHealthStatus,
  OperationsDashboardSnapshot,
} from "../types/OperationsDashboard";
import type {
  OperationsKpiTrend,
  OperationsMetricComparison,
  OperationsPeriodComparison,
  OperationsPeriodComparisonFilter,
  OperationsPeriodSummary,
  OperationsReportFilter,
  OperationsReportMetricKey,
  OperationsTrendDirection,
  OperationsTrendFilter,
  OperationsWarehouseReport,
} from "../types/OperationsReport";
import type {
  OperationsDashboardRepository,
} from "./OperationsDashboardRepository";

export interface OperationsReportingServiceDependencies {
  readonly repository: OperationsDashboardRepository;
  readonly now?: () => string;
}

type MetricMode =
  | "higher"
  | "lower"
  | "target";

interface MetricDefinition {
  readonly key: OperationsReportMetricKey;
  readonly label: string;
  readonly mode: MetricMode;
  readonly target?: number;
}

const METRICS:
  readonly MetricDefinition[] = [
    {
      key: "health_score",
      label: "Operasyon sağlık skoru",
      mode: "higher",
    },
    {
      key: "order_completion",
      label: "Sipariş tamamlama",
      mode: "higher",
    },
    {
      key: "on_time_dispatch",
      label: "Zamanında sevkiyat",
      mode: "higher",
    },
    {
      key: "task_completion",
      label: "Görev tamamlama",
      mode: "higher",
    },
    {
      key: "task_exception",
      label: "Görev istisna oranı",
      mode: "lower",
    },
    {
      key: "inventory_accuracy",
      label: "Stok doğruluğu",
      mode: "higher",
    },
    {
      key: "capacity_utilization",
      label: "Kapasite kullanımı",
      mode: "target",
      target: 90,
    },
    {
      key: "labor_utilization",
      label: "Personel verimliliği",
      mode: "higher",
    },
    {
      key: "item_fulfillment",
      label: "Ürün karşılama",
      mode: "higher",
    },
    {
      key: "short_pick",
      label: "Eksik toplama oranı",
      mode: "lower",
    },
  ];

export class OperationsReportingService {
  private readonly repository:
    OperationsDashboardRepository;

  private readonly now: () => string;

  constructor(
    dependencies:
      OperationsReportingServiceDependencies,
  ) {
    this.repository =
      dependencies.repository;

    this.now =
      dependencies.now ??
      (() => new Date().toISOString());
  }

  async comparePeriods(
    filter: OperationsPeriodComparisonFilter,
  ): Promise<OperationsPeriodComparison> {
    const normalized =
      this.normalizeComparisonFilter(
        filter,
      );

    const [currentSnapshots, previousSnapshots] =
      await Promise.all([
        this.repository.list({
          tenantId:
            normalized.tenantId,
          ...(normalized.warehouseId !==
          undefined
            ? {
                warehouseId:
                  normalized.warehouseId,
              }
            : {}),
          periodStart:
            normalized.currentPeriodStart,
          periodEnd:
            normalized.currentPeriodEnd,
        }),
        this.repository.list({
          tenantId:
            normalized.tenantId,
          ...(normalized.warehouseId !==
          undefined
            ? {
                warehouseId:
                  normalized.warehouseId,
              }
            : {}),
          periodStart:
            normalized.previousPeriodStart,
          periodEnd:
            normalized.previousPeriodEnd,
        }),
      ]);

    this.requireSnapshots(
      currentSnapshots,
      "Güncel dönem",
    );

    this.requireSnapshots(
      previousSnapshots,
      "Önceki dönem",
    );

    const current =
      this.summarize(
        {
          tenantId:
            normalized.tenantId,
          ...(normalized.warehouseId !==
          undefined
            ? {
                warehouseId:
                  normalized.warehouseId,
              }
            : {}),
          periodStart:
            normalized.currentPeriodStart,
          periodEnd:
            normalized.currentPeriodEnd,
        },
        currentSnapshots,
      );

    const previous =
      this.summarize(
        {
          tenantId:
            normalized.tenantId,
          ...(normalized.warehouseId !==
          undefined
            ? {
                warehouseId:
                  normalized.warehouseId,
              }
            : {}),
          periodStart:
            normalized.previousPeriodStart,
          periodEnd:
            normalized.previousPeriodEnd,
        },
        previousSnapshots,
      );

    const metrics =
      METRICS.map(
        (definition) =>
          this.compareMetric(
            definition,
            current,
            previous,
          ),
      );

    const improvingMetricCount =
      metrics.filter(
        (metric) =>
          metric.direction ===
          "improving",
      ).length;

    const decliningMetricCount =
      metrics.filter(
        (metric) =>
          metric.direction ===
          "declining",
      ).length;

    return {
      current,
      previous,
      metrics,
      improvingMetricCount,
      decliningMetricCount,
      improved:
        improvingMetricCount >
        decliningMetricCount,
      calculatedAt:
        this.now(),
    };
  }

  async buildTrend(
    filter: OperationsTrendFilter,
  ): Promise<OperationsKpiTrend> {
    const normalized =
      this.normalizeTrendFilter(
        filter,
      );

    const definition =
      this.requireMetric(
        normalized.metric,
      );

    const snapshots =
      await this.repository.list({
        tenantId:
          normalized.tenantId,
        ...(normalized.warehouseId !==
        undefined
          ? {
              warehouseId:
                normalized.warehouseId,
            }
          : {}),
        periodStart:
          normalized.periodStart,
        periodEnd:
          normalized.periodEnd,
      });

    this.requireSnapshots(
      snapshots,
      "Trend dönemi",
    );

    const points =
      [...snapshots]
        .sort(
          (left, right) =>
            left.periodStart.localeCompare(
              right.periodStart,
            ) ||
            left.calculatedAt.localeCompare(
              right.calculatedAt,
            ),
        )
        .map(
          (snapshot) => ({
            snapshotId:
              snapshot.id,
            ...(snapshot.warehouseId !==
            undefined
              ? {
                  warehouseId:
                    snapshot.warehouseId,
                }
              : {}),
            periodStart:
              snapshot.periodStart,
            periodEnd:
              snapshot.periodEnd,
            value:
              this.metricValueFromSnapshot(
                normalized.metric,
                snapshot,
              ),
            healthStatus:
              snapshot.healthStatus,
          }),
        );

    const firstValue =
      points[0].value;

    const lastValue =
      points[points.length - 1].value;

    return {
      tenantId:
        normalized.tenantId,
      ...(normalized.warehouseId !==
      undefined
        ? {
            warehouseId:
              normalized.warehouseId,
          }
        : {}),
      metric:
        normalized.metric,
      label:
        definition.label,
      periodStart:
        normalized.periodStart,
      periodEnd:
        normalized.periodEnd,
      points,
      firstValue,
      lastValue,
      change:
        this.round(
          lastValue -
          firstValue,
        ),
      direction:
        this.resolveDirection(
          definition,
          firstValue,
          lastValue,
        ),
      calculatedAt:
        this.now(),
    };
  }

  async buildWarehouseReport(
    filter: OperationsReportFilter,
  ): Promise<OperationsWarehouseReport> {
    const normalized =
      this.normalizeReportFilter(
        filter,
        false,
      );

    const snapshots =
      await this.repository.list({
        tenantId:
          normalized.tenantId,
        periodStart:
          normalized.periodStart,
        periodEnd:
          normalized.periodEnd,
      });

    const warehouseGroups =
      new Map<
        string,
        OperationsDashboardSnapshot[]
      >();

    for (const snapshot of snapshots) {
      if (!snapshot.warehouseId) {
        continue;
      }

      const warehouseSnapshots =
        warehouseGroups.get(
          snapshot.warehouseId,
        ) ?? [];

      warehouseSnapshots.push(
        snapshot,
      );

      warehouseGroups.set(
        snapshot.warehouseId,
        warehouseSnapshots,
      );
    }

    if (warehouseGroups.size === 0) {
      throw new InventoryValidationError(
        "Depo performans raporu için kayıtlı dashboard verisi bulunamadı.",
      );
    }

    const summaries =
      [...warehouseGroups.entries()]
        .map(
          ([warehouseId, items]) =>
            this.summarize(
              {
                tenantId:
                  normalized.tenantId,
                warehouseId,
                periodStart:
                  normalized.periodStart,
                periodEnd:
                  normalized.periodEnd,
              },
              items,
            ),
        )
        .sort(
          (left, right) =>
            right.healthScore -
              left.healthScore ||
            right.onTimeDispatchRate -
              left.onTimeDispatchRate ||
            right.inventoryAccuracyRate -
              left.inventoryAccuracyRate ||
            (left.warehouseId ?? "")
              .localeCompare(
                right.warehouseId ?? "",
              ),
        );

    return {
      tenantId:
        normalized.tenantId,
      periodStart:
        normalized.periodStart,
      periodEnd:
        normalized.periodEnd,
      warehouseCount:
        summaries.length,
      warehouses:
        summaries.map(
          (summary, index) => ({
            rank: index + 1,
            warehouseId:
              summary.warehouseId!,
            summary,
          }),
        ),
      calculatedAt:
        this.now(),
    };
  }

  summarize(
    filter: OperationsReportFilter,
    snapshots:
      readonly OperationsDashboardSnapshot[],
  ): OperationsPeriodSummary {
    const normalized =
      this.normalizeReportFilter(
        filter,
        true,
      );

    this.requireSnapshots(
      snapshots,
      "Rapor dönemi",
    );

    for (const snapshot of snapshots) {
      if (
        snapshot.tenantId !==
        normalized.tenantId
      ) {
        throw new InventoryValidationError(
          "Dashboard kaydı farklı bir firmaya aittir.",
        );
      }

      if (
        normalized.warehouseId !==
          undefined &&
        snapshot.warehouseId !==
          normalized.warehouseId
      ) {
        throw new InventoryValidationError(
          "Dashboard kaydı farklı bir depoya aittir.",
        );
      }
    }

    const totals =
      snapshots.reduce(
        (accumulator, snapshot) => ({
          totalOrders:
            accumulator.totalOrders +
            snapshot.totalOrders,
          completedOrders:
            accumulator.completedOrders +
            snapshot.completedOrders,
          onTimeOrders:
            accumulator.onTimeOrders +
            snapshot.onTimeOrders,
          totalTasks:
            accumulator.totalTasks +
            snapshot.totalTasks,
          completedTasks:
            accumulator.completedTasks +
            snapshot.completedTasks,
          exceptionTasks:
            accumulator.exceptionTasks +
            snapshot.exceptionTasks,
          totalInventoryChecks:
            accumulator.totalInventoryChecks +
            snapshot.totalInventoryChecks,
          accurateInventoryChecks:
            accumulator.accurateInventoryChecks +
            snapshot.accurateInventoryChecks,
          usedCapacity:
            accumulator.usedCapacity +
            snapshot.usedCapacity,
          totalCapacity:
            accumulator.totalCapacity +
            snapshot.totalCapacity,
          productiveMinutes:
            accumulator.productiveMinutes +
            snapshot.productiveMinutes,
          availableLaborMinutes:
            accumulator.availableLaborMinutes +
            snapshot.availableLaborMinutes,
          requestedItems:
            accumulator.requestedItems +
            snapshot.requestedItems,
          fulfilledItems:
            accumulator.fulfilledItems +
            snapshot.fulfilledItems,
          shortItems:
            accumulator.shortItems +
            snapshot.shortItems,
          healthScoreTotal:
            accumulator.healthScoreTotal +
            snapshot.healthScore,
        }),
        {
          totalOrders: 0,
          completedOrders: 0,
          onTimeOrders: 0,
          totalTasks: 0,
          completedTasks: 0,
          exceptionTasks: 0,
          totalInventoryChecks: 0,
          accurateInventoryChecks: 0,
          usedCapacity: 0,
          totalCapacity: 0,
          productiveMinutes: 0,
          availableLaborMinutes: 0,
          requestedItems: 0,
          fulfilledItems: 0,
          shortItems: 0,
          healthScoreTotal: 0,
        },
      );

    const healthScore =
      this.round(
        totals.healthScoreTotal /
        snapshots.length,
      );

    return {
      tenantId:
        normalized.tenantId,
      ...(normalized.warehouseId !==
      undefined
        ? {
            warehouseId:
              normalized.warehouseId,
          }
        : {}),
      periodStart:
        normalized.periodStart,
      periodEnd:
        normalized.periodEnd,
      snapshotCount:
        snapshots.length,
      totalOrders:
        totals.totalOrders,
      completedOrders:
        totals.completedOrders,
      totalTasks:
        totals.totalTasks,
      completedTasks:
        totals.completedTasks,
      requestedItems:
        totals.requestedItems,
      fulfilledItems:
        totals.fulfilledItems,
      orderCompletionRate:
        this.rate(
          totals.completedOrders,
          totals.totalOrders,
        ),
      onTimeDispatchRate:
        this.rate(
          totals.onTimeOrders,
          totals.completedOrders,
        ),
      taskCompletionRate:
        this.rate(
          totals.completedTasks,
          totals.totalTasks,
        ),
      taskExceptionRate:
        this.rate(
          totals.exceptionTasks,
          totals.totalTasks,
        ),
      inventoryAccuracyRate:
        this.rate(
          totals.accurateInventoryChecks,
          totals.totalInventoryChecks,
        ),
      capacityUtilizationRate:
        this.rate(
          totals.usedCapacity,
          totals.totalCapacity,
        ),
      laborUtilizationRate:
        this.rate(
          totals.productiveMinutes,
          totals.availableLaborMinutes,
        ),
      itemFulfillmentRate:
        this.rate(
          totals.fulfilledItems,
          totals.requestedItems,
        ),
      shortPickRate:
        this.rate(
          totals.shortItems,
          totals.requestedItems,
        ),
      healthScore,
      healthStatus:
        this.resolveHealthStatus(
          healthScore,
        ),
    };
  }

  private compareMetric(
    definition: MetricDefinition,
    current: OperationsPeriodSummary,
    previous: OperationsPeriodSummary,
  ): OperationsMetricComparison {
    const currentValue =
      this.metricValueFromSummary(
        definition.key,
        current,
      );

    const previousValue =
      this.metricValueFromSummary(
        definition.key,
        previous,
      );

    const change =
      this.round(
        currentValue -
        previousValue,
      );

    const direction =
      this.resolveDirection(
        definition,
        previousValue,
        currentValue,
      );

    return {
      key:
        definition.key,
      label:
        definition.label,
      currentValue,
      previousValue,
      change,
      changeRate:
        this.changeRate(
          previousValue,
          currentValue,
        ),
      direction,
      improved:
        direction ===
        "improving",
    };
  }

  private resolveDirection(
    definition: MetricDefinition,
    previousValue: number,
    currentValue: number,
  ): OperationsTrendDirection {
    const epsilon = 0.01;

    if (
      Math.abs(
        currentValue -
        previousValue,
      ) <= epsilon
    ) {
      return "stable";
    }

    if (
      definition.mode ===
      "higher"
    ) {
      return currentValue >
        previousValue
        ? "improving"
        : "declining";
    }

    if (
      definition.mode ===
      "lower"
    ) {
      return currentValue <
        previousValue
        ? "improving"
        : "declining";
    }

    const target =
      definition.target ?? 0;

    const previousDistance =
      Math.abs(
        previousValue -
        target,
      );

    const currentDistance =
      Math.abs(
        currentValue -
        target,
      );

    if (
      Math.abs(
        currentDistance -
        previousDistance,
      ) <= epsilon
    ) {
      return "stable";
    }

    return currentDistance <
      previousDistance
      ? "improving"
      : "declining";
  }

  private metricValueFromSummary(
    key: OperationsReportMetricKey,
    summary: OperationsPeriodSummary,
  ): number {
    switch (key) {
      case "health_score":
        return summary.healthScore;
      case "order_completion":
        return summary.orderCompletionRate;
      case "on_time_dispatch":
        return summary.onTimeDispatchRate;
      case "task_completion":
        return summary.taskCompletionRate;
      case "task_exception":
        return summary.taskExceptionRate;
      case "inventory_accuracy":
        return summary.inventoryAccuracyRate;
      case "capacity_utilization":
        return summary.capacityUtilizationRate;
      case "labor_utilization":
        return summary.laborUtilizationRate;
      case "item_fulfillment":
        return summary.itemFulfillmentRate;
      case "short_pick":
        return summary.shortPickRate;
    }
  }

  private metricValueFromSnapshot(
    key: OperationsReportMetricKey,
    snapshot: OperationsDashboardSnapshot,
  ): number {
    switch (key) {
      case "health_score":
        return snapshot.healthScore;
      case "order_completion":
        return snapshot.orderCompletionRate;
      case "on_time_dispatch":
        return snapshot.onTimeDispatchRate;
      case "task_completion":
        return snapshot.taskCompletionRate;
      case "task_exception":
        return snapshot.taskExceptionRate;
      case "inventory_accuracy":
        return snapshot.inventoryAccuracyRate;
      case "capacity_utilization":
        return snapshot.capacityUtilizationRate;
      case "labor_utilization":
        return snapshot.laborUtilizationRate;
      case "item_fulfillment":
        return snapshot.itemFulfillmentRate;
      case "short_pick":
        return snapshot.shortPickRate;
    }
  }

  private normalizeComparisonFilter(
    filter: OperationsPeriodComparisonFilter,
  ): OperationsPeriodComparisonFilter {
    const tenantId =
      this.requiredText(
        filter.tenantId,
        "Firma kimliği",
      );

    const warehouseId =
      filter.warehouseId === undefined
        ? undefined
        : this.requiredText(
            filter.warehouseId,
            "Depo kimliği",
          );

    const currentPeriodStart =
      this.requiredDate(
        filter.currentPeriodStart,
        "Güncel dönem başlangıcı",
      );

    const currentPeriodEnd =
      this.requiredDate(
        filter.currentPeriodEnd,
        "Güncel dönem bitişi",
      );

    const previousPeriodStart =
      this.requiredDate(
        filter.previousPeriodStart,
        "Önceki dönem başlangıcı",
      );

    const previousPeriodEnd =
      this.requiredDate(
        filter.previousPeriodEnd,
        "Önceki dönem bitişi",
      );

    this.validatePeriod(
      currentPeriodStart,
      currentPeriodEnd,
      "Güncel dönem",
    );

    this.validatePeriod(
      previousPeriodStart,
      previousPeriodEnd,
      "Önceki dönem",
    );

    return {
      tenantId,
      ...(warehouseId !== undefined
        ? { warehouseId }
        : {}),
      currentPeriodStart,
      currentPeriodEnd,
      previousPeriodStart,
      previousPeriodEnd,
    };
  }

  private normalizeTrendFilter(
    filter: OperationsTrendFilter,
  ): OperationsTrendFilter {
    const normalized =
      this.normalizeReportFilter(
        filter,
        true,
      );

    this.requireMetric(
      filter.metric,
    );

    return {
      ...normalized,
      metric:
        filter.metric,
    };
  }

  private normalizeReportFilter(
    filter: OperationsReportFilter,
    allowWarehouseId: boolean,
  ): OperationsReportFilter {
    const tenantId =
      this.requiredText(
        filter.tenantId,
        "Firma kimliği",
      );

    const warehouseId =
      filter.warehouseId === undefined
        ? undefined
        : this.requiredText(
            filter.warehouseId,
            "Depo kimliği",
          );

    if (
      !allowWarehouseId &&
      warehouseId !== undefined
    ) {
      throw new InventoryValidationError(
        "Depo karşılaştırma raporunda depo filtresi kullanılamaz.",
      );
    }

    const periodStart =
      this.requiredDate(
        filter.periodStart,
        "Dönem başlangıcı",
      );

    const periodEnd =
      this.requiredDate(
        filter.periodEnd,
        "Dönem bitişi",
      );

    this.validatePeriod(
      periodStart,
      periodEnd,
      "Rapor dönemi",
    );

    return {
      tenantId,
      ...(warehouseId !== undefined
        ? { warehouseId }
        : {}),
      periodStart,
      periodEnd,
    };
  }

  private requireMetric(
    key: OperationsReportMetricKey,
  ): MetricDefinition {
    const definition =
      METRICS.find(
        (metric) =>
          metric.key === key,
      );

    if (!definition) {
      throw new InventoryValidationError(
        "Desteklenmeyen operasyon KPI metriği.",
      );
    }

    return definition;
  }

  private requireSnapshots(
    snapshots:
      readonly OperationsDashboardSnapshot[],
    label: string,
  ): void {
    if (snapshots.length === 0) {
      throw new InventoryValidationError(
        `${label} için dashboard verisi bulunamadı.`,
      );
    }
  }

  private validatePeriod(
    periodStart: string,
    periodEnd: string,
    label: string,
  ): void {
    if (periodStart > periodEnd) {
      throw new InventoryValidationError(
        `${label} başlangıcı, bitişinden sonra olamaz.`,
      );
    }
  }

  private requiredText(
    value: string,
    label: string,
  ): string {
    const normalized =
      value?.trim();

    if (!normalized) {
      throw new InventoryValidationError(
        `${label} zorunludur.`,
      );
    }

    return normalized;
  }

  private requiredDate(
    value: string,
    label: string,
  ): string {
    const normalized =
      this.requiredText(
        value,
        label,
      );

    if (
      Number.isNaN(
        Date.parse(normalized),
      )
    ) {
      throw new InventoryValidationError(
        `${label} geçerli bir tarih olmalıdır.`,
      );
    }

    return new Date(
      normalized,
    ).toISOString();
  }

  private rate(
    numerator: number,
    denominator: number,
  ): number {
    if (denominator === 0) {
      return 0;
    }

    return this.round(
      numerator /
        denominator *
        100,
    );
  }

  private changeRate(
    previousValue: number,
    currentValue: number,
  ): number {
    if (previousValue === 0) {
      return currentValue === 0
        ? 0
        : 100;
    }

    return this.round(
      (
        currentValue -
        previousValue
      ) /
        Math.abs(
          previousValue,
        ) *
        100,
    );
  }

  private resolveHealthStatus(
    score: number,
  ): OperationsDashboardHealthStatus {
    if (score >= 90) {
      return "healthy";
    }

    if (score >= 75) {
      return "attention";
    }

    return "critical";
  }

  private round(
    value: number,
  ): number {
    return Math.round(
      value * 100,
    ) / 100;
  }
}
