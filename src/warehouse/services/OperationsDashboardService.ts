import {
  InventoryValidationError,
} from "../types/InventoryErrors";
import type {
  OperationsDashboardAlert,
  OperationsDashboardAlertSeverity,
  OperationsDashboardFilter,
  OperationsDashboardHealthStatus,
  OperationsDashboardInput,
  OperationsDashboardKpi,
  OperationsDashboardKpiStatus,
  OperationsDashboardSnapshot,
} from "../types/OperationsDashboard";
import type {
  OperationsDashboardRepository,
} from "./OperationsDashboardRepository";

export interface OperationsDashboardServiceDependencies {
  readonly repository: OperationsDashboardRepository;
  readonly now?: () => string;
  readonly idFactory?: () => string;
}

interface AlertRule {
  readonly code: string;
  readonly severity: OperationsDashboardAlertSeverity;
  readonly title: string;
  readonly message: string;
  readonly metricValue: number;
  readonly threshold: number;
  readonly active: boolean;
}

export class OperationsDashboardService {
  private readonly repository:
    OperationsDashboardRepository;

  private readonly now: () => string;

  private readonly idFactory: () => string;

  constructor(
    dependencies:
      OperationsDashboardServiceDependencies,
  ) {
    this.repository =
      dependencies.repository;

    this.now =
      dependencies.now ??
      (() => new Date().toISOString());

    this.idFactory =
      dependencies.idFactory ??
      (() => crypto.randomUUID());
  }

  async createSnapshot(
    input: OperationsDashboardInput,
  ): Promise<OperationsDashboardSnapshot> {
    const normalized =
      this.normalizeInput(input);

    const calculatedAt =
      this.now();

    const orderCompletionRate =
      this.rate(
        normalized.completedOrders,
        normalized.totalOrders,
      );

    const onTimeDispatchRate =
      this.rate(
        normalized.onTimeOrders,
        normalized.completedOrders,
      );

    const taskCompletionRate =
      this.rate(
        normalized.completedTasks,
        normalized.totalTasks,
      );

    const taskExceptionRate =
      this.rate(
        normalized.exceptionTasks,
        normalized.totalTasks,
      );

    const inventoryAccuracyRate =
      this.rate(
        normalized.accurateInventoryChecks,
        normalized.totalInventoryChecks,
      );

    const capacityUtilizationRate =
      this.rate(
        normalized.usedCapacity,
        normalized.totalCapacity,
      );

    const laborUtilizationRate =
      this.rate(
        normalized.productiveMinutes,
        normalized.availableLaborMinutes,
      );

    const itemFulfillmentRate =
      this.rate(
        normalized.fulfilledItems,
        normalized.requestedItems,
      );

    const shortPickRate =
      this.rate(
        normalized.shortItems,
        normalized.requestedItems,
      );

    const kpis =
      this.buildKpis({
        orderCompletionRate,
        onTimeDispatchRate,
        taskCompletionRate,
        inventoryAccuracyRate,
        capacityUtilizationRate,
        laborUtilizationRate,
        itemFulfillmentRate,
      });

    const healthScore =
      this.calculateHealthScore(kpis);

    const healthStatus =
      this.resolveHealthStatus(
        healthScore,
      );

    const snapshotId =
      this.idFactory();

    const alerts =
      this.buildAlerts({
        idPrefix: snapshotId,
        tenantId: normalized.tenantId,
        ...(normalized.warehouseId !== undefined
          ? {
              warehouseId:
                normalized.warehouseId,
            }
          : {}),
        calculatedAt,
        onTimeDispatchRate,
        taskExceptionRate,
        inventoryAccuracyRate,
        capacityUtilizationRate,
        shortPickRate,
      });

    const snapshot:
      OperationsDashboardSnapshot = {
      id: snapshotId,
      ...normalized,
      orderCompletionRate,
      onTimeDispatchRate,
      taskCompletionRate,
      taskExceptionRate,
      inventoryAccuracyRate,
      capacityUtilizationRate,
      laborUtilizationRate,
      itemFulfillmentRate,
      shortPickRate,
      healthScore,
      healthStatus,
      kpis,
      alerts,
      calculatedAt,
    };

    return this.repository.save(
      snapshot,
    );
  }

  async getLatest(
    filter: OperationsDashboardFilter,
  ): Promise<OperationsDashboardSnapshot | null> {
    return this.repository.findLatest(
      this.normalizeFilter(filter),
    );
  }

  async list(
    filter: OperationsDashboardFilter,
  ): Promise<OperationsDashboardSnapshot[]> {
    return this.repository.list(
      this.normalizeFilter(filter),
    );
  }

  private normalizeInput(
    input: OperationsDashboardInput,
  ): OperationsDashboardInput {
    const tenantId =
      this.requiredText(
        input.tenantId,
        "Firma kimliği",
      );

    const warehouseId =
      input.warehouseId === undefined
        ? undefined
        : this.requiredText(
            input.warehouseId,
            "Depo kimliği",
          );

    const periodStart =
      this.requiredDate(
        input.periodStart,
        "Dönem başlangıcı",
      );

    const periodEnd =
      this.requiredDate(
        input.periodEnd,
        "Dönem bitişi",
      );

    if (periodStart > periodEnd) {
      throw new InventoryValidationError(
        "Dönem başlangıcı, dönem bitişinden sonra olamaz.",
      );
    }

    const normalized = {
      tenantId,
      ...(warehouseId !== undefined
        ? { warehouseId }
        : {}),
      periodStart,
      periodEnd,
      totalOrders:
        this.nonNegative(
          input.totalOrders,
          "Toplam sipariş",
        ),
      completedOrders:
        this.nonNegative(
          input.completedOrders,
          "Tamamlanan sipariş",
        ),
      onTimeOrders:
        this.nonNegative(
          input.onTimeOrders,
          "Zamanında tamamlanan sipariş",
        ),
      delayedOrders:
        this.nonNegative(
          input.delayedOrders,
          "Geciken sipariş",
        ),
      totalTasks:
        this.nonNegative(
          input.totalTasks,
          "Toplam görev",
        ),
      completedTasks:
        this.nonNegative(
          input.completedTasks,
          "Tamamlanan görev",
        ),
      exceptionTasks:
        this.nonNegative(
          input.exceptionTasks,
          "İstisnalı görev",
        ),
      totalInventoryChecks:
        this.nonNegative(
          input.totalInventoryChecks,
          "Toplam stok kontrolü",
        ),
      accurateInventoryChecks:
        this.nonNegative(
          input.accurateInventoryChecks,
          "Doğru stok kontrolü",
        ),
      usedCapacity:
        this.nonNegative(
          input.usedCapacity,
          "Kullanılan kapasite",
        ),
      totalCapacity:
        this.nonNegative(
          input.totalCapacity,
          "Toplam kapasite",
        ),
      productiveMinutes:
        this.nonNegative(
          input.productiveMinutes,
          "Üretken süre",
        ),
      availableLaborMinutes:
        this.nonNegative(
          input.availableLaborMinutes,
          "Kullanılabilir iş gücü süresi",
        ),
      requestedItems:
        this.nonNegative(
          input.requestedItems,
          "Talep edilen ürün miktarı",
        ),
      fulfilledItems:
        this.nonNegative(
          input.fulfilledItems,
          "Karşılanan ürün miktarı",
        ),
      shortItems:
        this.nonNegative(
          input.shortItems,
          "Eksik ürün miktarı",
        ),
    };

    this.notGreater(
      normalized.completedOrders,
      normalized.totalOrders,
      "Tamamlanan sipariş, toplam siparişi aşamaz.",
    );

    this.notGreater(
      normalized.onTimeOrders,
      normalized.completedOrders,
      "Zamanında tamamlanan sipariş, tamamlanan siparişi aşamaz.",
    );

    this.notGreater(
      normalized.delayedOrders,
      normalized.totalOrders,
      "Geciken sipariş, toplam siparişi aşamaz.",
    );

    this.notGreater(
      normalized.completedTasks,
      normalized.totalTasks,
      "Tamamlanan görev, toplam görevi aşamaz.",
    );

    this.notGreater(
      normalized.exceptionTasks,
      normalized.totalTasks,
      "İstisnalı görev, toplam görevi aşamaz.",
    );

    this.notGreater(
      normalized.accurateInventoryChecks,
      normalized.totalInventoryChecks,
      "Doğru stok kontrolü, toplam stok kontrolünü aşamaz.",
    );

    this.notGreater(
      normalized.fulfilledItems,
      normalized.requestedItems,
      "Karşılanan ürün miktarı, talep edilen miktarı aşamaz.",
    );

    this.notGreater(
      normalized.shortItems,
      normalized.requestedItems,
      "Eksik ürün miktarı, talep edilen miktarı aşamaz.",
    );

    return normalized;
  }

  private normalizeFilter(
    filter: OperationsDashboardFilter,
  ): OperationsDashboardFilter {
    return {
      tenantId:
        this.requiredText(
          filter.tenantId,
          "Firma kimliği",
        ),
      ...(filter.warehouseId !== undefined
        ? {
            warehouseId:
              this.requiredText(
                filter.warehouseId,
                "Depo kimliği",
              ),
          }
        : {}),
      ...(filter.periodStart !== undefined
        ? {
            periodStart:
              this.requiredDate(
                filter.periodStart,
                "Dönem başlangıcı",
              ),
          }
        : {}),
      ...(filter.periodEnd !== undefined
        ? {
            periodEnd:
              this.requiredDate(
                filter.periodEnd,
                "Dönem bitişi",
              ),
          }
        : {}),
    };
  }

  private buildKpis(
    rates: {
      orderCompletionRate: number;
      onTimeDispatchRate: number;
      taskCompletionRate: number;
      inventoryAccuracyRate: number;
      capacityUtilizationRate: number;
      laborUtilizationRate: number;
      itemFulfillmentRate: number;
    },
  ): OperationsDashboardKpi[] {
    return [
      this.kpi(
        "order_completion",
        "Sipariş tamamlama",
        rates.orderCompletionRate,
        95,
        false,
      ),
      this.kpi(
        "on_time_dispatch",
        "Zamanında sevkiyat",
        rates.onTimeDispatchRate,
        95,
        false,
      ),
      this.kpi(
        "task_completion",
        "Görev tamamlama",
        rates.taskCompletionRate,
        95,
        false,
      ),
      this.kpi(
        "inventory_accuracy",
        "Stok doğruluğu",
        rates.inventoryAccuracyRate,
        98,
        false,
      ),
      this.kpi(
        "capacity_utilization",
        "Kapasite kullanımı",
        rates.capacityUtilizationRate,
        90,
        true,
      ),
      this.kpi(
        "labor_utilization",
        "Personel verimliliği",
        rates.laborUtilizationRate,
        85,
        false,
      ),
      this.kpi(
        "item_fulfillment",
        "Ürün karşılama",
        rates.itemFulfillmentRate,
        98,
        false,
      ),
    ];
  }

  private kpi(
    key: OperationsDashboardKpi["key"],
    label: string,
    value: number,
    target: number,
    lowerIsBetter: boolean,
  ): OperationsDashboardKpi {
    return {
      key,
      label,
      value,
      unit: "percent",
      target,
      status:
        this.resolveKpiStatus(
          value,
          target,
          lowerIsBetter,
        ),
    };
  }

  private resolveKpiStatus(
    value: number,
    target: number,
    lowerIsBetter: boolean,
  ): OperationsDashboardKpiStatus {
    if (lowerIsBetter) {
      if (value <= target) {
        return "good";
      }

      return value <= 100
        ? "warning"
        : "critical";
    }

    if (value >= target) {
      return "good";
    }

    return value >= target - 10
      ? "warning"
      : "critical";
  }

  private calculateHealthScore(
    kpis: readonly OperationsDashboardKpi[],
  ): number {
    const score =
      kpis.reduce(
        (total, kpi) => {
          if (
            kpi.key ===
            "capacity_utilization"
          ) {
            const capacityScore =
              kpi.value <= 90
                ? 100
                : Math.max(
                    0,
                    100 -
                      (kpi.value - 90) *
                        5,
                  );

            return total +
              capacityScore;
          }

          return total +
            Math.min(
              100,
              kpi.value,
            );
        },
        0,
      ) / kpis.length;

    return this.round(score);
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

  private buildAlerts(
    metrics: {
      idPrefix: string;
      tenantId: string;
      warehouseId?: string;
      calculatedAt: string;
      onTimeDispatchRate: number;
      taskExceptionRate: number;
      inventoryAccuracyRate: number;
      capacityUtilizationRate: number;
      shortPickRate: number;
    },
  ): OperationsDashboardAlert[] {
    const rules: AlertRule[] = [
      {
        code: "INVENTORY_ACCURACY_CRITICAL",
        severity: "critical",
        title: "Stok doğruluğu kritik seviyede",
        message:
          "Stok doğruluğu yüzde 90 seviyesinin altına düştü. Öncelikli sayım ve kök neden analizi başlatılmalıdır.",
        metricValue:
          metrics.inventoryAccuracyRate,
        threshold: 90,
        active:
          metrics.inventoryAccuracyRate <
          90,
      },
      {
        code: "INVENTORY_ACCURACY_WARNING",
        severity: "warning",
        title: "Stok doğruluğu hedefin altında",
        message:
          "Stok doğruluğu yüzde 98 hedefinin altında. Sayım farkları ve hareket kayıtları kontrol edilmelidir.",
        metricValue:
          metrics.inventoryAccuracyRate,
        threshold: 98,
        active:
          metrics.inventoryAccuracyRate >=
            90 &&
          metrics.inventoryAccuracyRate <
            98,
      },
      {
        code: "CAPACITY_CRITICAL",
        severity: "critical",
        title: "Depo kapasitesi aşıldı",
        message:
          "Kullanılan kapasite toplam kapasiteyi aşıyor. Acil yer açma ve sevkiyat planı uygulanmalıdır.",
        metricValue:
          metrics.capacityUtilizationRate,
        threshold: 100,
        active:
          metrics.capacityUtilizationRate >
          100,
      },
      {
        code: "CAPACITY_WARNING",
        severity: "warning",
        title: "Depo kapasitesi kritik sınıra yaklaştı",
        message:
          "Kapasite kullanımı yüzde 90 seviyesini aştı. Yerleştirme ve sevkiyat planı gözden geçirilmelidir.",
        metricValue:
          metrics.capacityUtilizationRate,
        threshold: 90,
        active:
          metrics.capacityUtilizationRate >
            90 &&
          metrics.capacityUtilizationRate <=
            100,
      },
      {
        code: "ON_TIME_DISPATCH_CRITICAL",
        severity: "critical",
        title: "Zamanında sevkiyat kritik seviyede",
        message:
          "Zamanında sevkiyat oranı yüzde 75 seviyesinin altına düştü. Geciken siparişler için aksiyon planı oluşturulmalıdır.",
        metricValue:
          metrics.onTimeDispatchRate,
        threshold: 75,
        active:
          metrics.onTimeDispatchRate <
          75,
      },
      {
        code: "ON_TIME_DISPATCH_WARNING",
        severity: "warning",
        title: "Zamanında sevkiyat hedefin altında",
        message:
          "Zamanında sevkiyat oranı yüzde 95 hedefinin altında. Dalga, toplama ve yükleme gecikmeleri incelenmelidir.",
        metricValue:
          metrics.onTimeDispatchRate,
        threshold: 95,
        active:
          metrics.onTimeDispatchRate >=
            75 &&
          metrics.onTimeDispatchRate <
            95,
      },
      {
        code: "TASK_EXCEPTION_WARNING",
        severity:
          metrics.taskExceptionRate > 15
            ? "critical"
            : "warning",
        title: "Görev istisna oranı yükseldi",
        message:
          "Operasyon görevlerindeki istisna oranı hedefin üzerinde. İstisna nedenleri ve sorumlu süreçler incelenmelidir.",
        metricValue:
          metrics.taskExceptionRate,
        threshold: 5,
        active:
          metrics.taskExceptionRate >
          5,
      },
      {
        code: "SHORT_PICK_WARNING",
        severity:
          metrics.shortPickRate > 8
            ? "critical"
            : "warning",
        title: "Eksik toplama oranı yükseldi",
        message:
          "Eksik toplama oranı hedefin üzerinde. Stok doğruluğu, lokasyon ve replenishment süreçleri kontrol edilmelidir.",
        metricValue:
          metrics.shortPickRate,
        threshold: 3,
        active:
          metrics.shortPickRate >
          3,
      },
    ];

    return rules
      .filter(
        (rule) => rule.active,
      )
      .map(
        (rule, index) => ({
          id:
            `${metrics.idPrefix}-alert-${index + 1}`,
          tenantId:
            metrics.tenantId,
          ...(metrics.warehouseId !==
          undefined
            ? {
                warehouseId:
                  metrics.warehouseId,
              }
            : {}),
          code: rule.code,
          severity:
            rule.severity,
          title: rule.title,
          message: rule.message,
          metricValue:
            this.round(
              rule.metricValue,
            ),
          threshold:
            rule.threshold,
          createdAt:
            metrics.calculatedAt,
        }),
      );
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

  private nonNegative(
    value: number,
    label: string,
  ): number {
    if (
      !Number.isFinite(value) ||
      value < 0
    ) {
      throw new InventoryValidationError(
        `${label} sıfır veya daha büyük olmalıdır.`,
      );
    }

    return value;
  }

  private notGreater(
    value: number,
    upperLimit: number,
    message: string,
  ): void {
    if (value > upperLimit) {
      throw new InventoryValidationError(
        message,
      );
    }
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

  private round(
    value: number,
  ): number {
    return Math.round(
      value * 100,
    ) / 100;
  }
}
