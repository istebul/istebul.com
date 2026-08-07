import {
  InventoryValidationError,
} from "../types/InventoryErrors";
import type {
  OperationsActionPriority,
  OperationsBottleneck,
  OperationsExceptionAnalyticsReport,
  OperationsExceptionCategory,
  OperationsExceptionFilter,
  OperationsExceptionInput,
  OperationsExceptionRecord,
  OperationsExceptionSeverity,
  OperationsManagementAction,
  OperationsProcessExceptionSummary,
  OperationsProcessVolume,
  OperationsRootCauseParetoItem,
  WarehouseOperationProcess,
} from "../types/OperationsExceptionAnalytics";
import type {
  OperationsExceptionRepository,
} from "./OperationsExceptionRepository";

export interface OperationsExceptionAnalyticsServiceDependencies {
  readonly repository: OperationsExceptionRepository;
  readonly now?: () => string;
  readonly idFactory?: () => string;
}

interface ProcessAccumulator {
  operationCount: number;
  records: OperationsExceptionRecord[];
}

interface RootCauseAccumulator {
  exceptionCount: number;
  totalDelayMinutes: number;
  impactedOrders: number;
}

const PROCESS_LABELS:
  Readonly<Record<WarehouseOperationProcess, string>> = {
    receiving: "Mal kabul",
    quality_control: "Kalite kontrol",
    putaway: "Yerleştirme",
    replenishment: "İkmal",
    picking: "Toplama",
    wave_planning: "Dalga planlama",
    packing: "Paketleme",
    shipping: "Sevkiyat",
    cycle_count: "Döngüsel sayım",
    inventory: "Stok yönetimi",
  };

const PROCESSES =
  Object.keys(
    PROCESS_LABELS,
  ) as WarehouseOperationProcess[];

const CATEGORIES:
  readonly OperationsExceptionCategory[] = [
    "delay",
    "quality",
    "inventory",
    "capacity",
    "equipment",
    "labor",
    "system",
    "carrier",
    "other",
  ];

const SEVERITIES:
  readonly OperationsExceptionSeverity[] = [
    "info",
    "warning",
    "critical",
  ];

export class OperationsExceptionAnalyticsService {
  private readonly repository:
    OperationsExceptionRepository;

  private readonly now: () => string;

  private readonly idFactory: () => string;

  constructor(
    dependencies:
      OperationsExceptionAnalyticsServiceDependencies,
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

  async recordException(
    input: OperationsExceptionInput,
  ): Promise<OperationsExceptionRecord> {
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

    const process =
      this.requireProcess(
        input.process,
      );

    const category =
      this.requireCategory(
        input.category,
      );

    const severity =
      this.requireSeverity(
        input.severity,
      );

    const occurredAt =
      this.requiredDate(
        input.occurredAt,
        "İstisna oluşma tarihi",
      );

    const resolvedAt =
      input.resolvedAt === undefined
        ? undefined
        : this.requiredDate(
            input.resolvedAt,
            "İstisna çözüm tarihi",
          );

    if (
      resolvedAt !== undefined &&
      resolvedAt < occurredAt
    ) {
      throw new InventoryValidationError(
        "İstisna çözüm tarihi, oluşma tarihinden önce olamaz.",
      );
    }

    const record:
      OperationsExceptionRecord = {
      id:
        this.idFactory(),
      tenantId,
      ...(warehouseId !== undefined
        ? { warehouseId }
        : {}),
      process,
      category,
      code:
        this.requiredText(
          input.code,
          "İstisna kodu",
        ).toUpperCase(),
      severity,
      rootCause:
        this.requiredText(
          input.rootCause,
          "Kök neden",
        ),
      description:
        this.requiredText(
          input.description,
          "İstisna açıklaması",
        ),
      occurredAt,
      ...(resolvedAt !== undefined
        ? { resolvedAt }
        : {}),
      ...(input.resolutionNote !== undefined
        ? {
            resolutionNote:
              this.requiredText(
                input.resolutionNote,
                "Çözüm notu",
              ),
          }
        : {}),
      delayMinutes:
        this.nonNegative(
          input.delayMinutes ?? 0,
          "Gecikme süresi",
        ),
      impactedOrders:
        this.nonNegativeInteger(
          input.impactedOrders ?? 0,
          "Etkilenen sipariş sayısı",
        ),
      impactedTasks:
        this.nonNegativeInteger(
          input.impactedTasks ?? 0,
          "Etkilenen görev sayısı",
        ),
      impactedItems:
        this.nonNegative(
          input.impactedItems ?? 0,
          "Etkilenen ürün miktarı",
        ),
      createdAt:
        this.now(),
    };

    return this.repository.save(
      record,
    );
  }

  async analyze(
    filter: OperationsExceptionFilter,
    volumes:
      readonly OperationsProcessVolume[],
  ): Promise<OperationsExceptionAnalyticsReport> {
    const normalizedFilter =
      this.normalizeFilter(filter);

    const normalizedVolumes =
      this.normalizeVolumes(
        volumes,
      );

    const records =
      await this.repository.list(
        normalizedFilter,
      );

    const processSummaries =
      this.buildProcessSummaries(
        records,
        normalizedVolumes,
      );

    const rootCausePareto =
      this.buildRootCausePareto(
        records,
      );

    const bottlenecks =
      this.buildBottlenecks(
        processSummaries,
      );

    const managementActions =
      this.buildManagementActions(
        records,
        rootCausePareto,
        bottlenecks,
      );

    return {
      tenantId:
        normalizedFilter.tenantId,
      ...(normalizedFilter.warehouseId !==
      undefined
        ? {
            warehouseId:
              normalizedFilter.warehouseId,
          }
        : {}),
      periodStart:
        normalizedFilter.periodStart,
      periodEnd:
        normalizedFilter.periodEnd,
      totalExceptions:
        records.length,
      unresolvedExceptions:
        records.filter(
          (record) =>
            record.resolvedAt ===
            undefined,
        ).length,
      criticalExceptions:
        records.filter(
          (record) =>
            record.severity ===
            "critical",
        ).length,
      totalDelayMinutes:
        this.round(
          records.reduce(
            (total, record) =>
              total +
              record.delayMinutes,
            0,
          ),
        ),
      impactedOrders:
        records.reduce(
          (total, record) =>
            total +
            record.impactedOrders,
          0,
        ),
      impactedTasks:
        records.reduce(
          (total, record) =>
            total +
            record.impactedTasks,
          0,
        ),
      impactedItems:
        this.round(
          records.reduce(
            (total, record) =>
              total +
              record.impactedItems,
            0,
          ),
        ),
      processSummaries,
      rootCausePareto,
      bottlenecks,
      managementActions,
      calculatedAt:
        this.now(),
    };
  }

  private buildProcessSummaries(
    records:
      readonly OperationsExceptionRecord[],
    volumes:
      readonly OperationsProcessVolume[],
  ): OperationsProcessExceptionSummary[] {
    const processes =
      new Map<
        WarehouseOperationProcess,
        ProcessAccumulator
      >();

    for (const process of PROCESSES) {
      processes.set(
        process,
        {
          operationCount: 0,
          records: [],
        },
      );
    }

    for (const volume of volumes) {
      const accumulator =
        processes.get(
          volume.process,
        )!;

      accumulator.operationCount =
        volume.operationCount;
    }

    for (const record of records) {
      processes.get(
        record.process,
      )!.records.push(
        record,
      );
    }

    return [...processes.entries()]
      .map(
        ([process, accumulator]) =>
          this.summarizeProcess(
            process,
            accumulator,
          ),
      )
      .filter(
        (summary) =>
          summary.operationCount > 0 ||
          summary.exceptionCount > 0,
      )
      .sort(
        (left, right) =>
          right.errorRate -
            left.errorRate ||
          right.criticalCount -
            left.criticalCount ||
          right.totalDelayMinutes -
            left.totalDelayMinutes ||
          left.label.localeCompare(
            right.label,
            "tr",
          ),
      );
  }

  private summarizeProcess(
    process: WarehouseOperationProcess,
    accumulator: ProcessAccumulator,
  ): OperationsProcessExceptionSummary {
    const records =
      accumulator.records;

    const totalDelayMinutes =
      records.reduce(
        (total, record) =>
          total +
          record.delayMinutes,
        0,
      );

    const resolutionDurations =
      records
        .filter(
          (record) =>
            record.resolvedAt !==
            undefined,
        )
        .map(
          (record) =>
            (
              Date.parse(
                record.resolvedAt!,
              ) -
              Date.parse(
                record.occurredAt,
              )
            ) /
            60000,
        );

    const averageResolutionMinutes =
      resolutionDurations.length === 0
        ? 0
        : resolutionDurations.reduce(
            (total, duration) =>
              total +
              duration,
            0,
          ) /
          resolutionDurations.length;

    return {
      process,
      label:
        PROCESS_LABELS[process],
      operationCount:
        accumulator.operationCount,
      exceptionCount:
        records.length,
      unresolvedCount:
        records.filter(
          (record) =>
            record.resolvedAt ===
            undefined,
        ).length,
      criticalCount:
        records.filter(
          (record) =>
            record.severity ===
            "critical",
        ).length,
      totalDelayMinutes:
        this.round(
          totalDelayMinutes,
        ),
      averageDelayMinutes:
        records.length === 0
          ? 0
          : this.round(
              totalDelayMinutes /
              records.length,
            ),
      averageResolutionMinutes:
        this.round(
          averageResolutionMinutes,
        ),
      impactedOrders:
        records.reduce(
          (total, record) =>
            total +
            record.impactedOrders,
          0,
        ),
      impactedTasks:
        records.reduce(
          (total, record) =>
            total +
            record.impactedTasks,
          0,
        ),
      impactedItems:
        this.round(
          records.reduce(
            (total, record) =>
              total +
              record.impactedItems,
            0,
          ),
        ),
      errorRate:
        accumulator.operationCount === 0
          ? (
              records.length === 0
                ? 0
                : 100
            )
          : this.rate(
              records.length,
              accumulator.operationCount,
            ),
    };
  }

  private buildRootCausePareto(
    records:
      readonly OperationsExceptionRecord[],
  ): OperationsRootCauseParetoItem[] {
    if (records.length === 0) {
      return [];
    }

    const causes =
      new Map<
        string,
        RootCauseAccumulator
      >();

    for (const record of records) {
      const accumulator =
        causes.get(
          record.rootCause,
        ) ?? {
          exceptionCount: 0,
          totalDelayMinutes: 0,
          impactedOrders: 0,
        };

      accumulator.exceptionCount += 1;
      accumulator.totalDelayMinutes +=
        record.delayMinutes;
      accumulator.impactedOrders +=
        record.impactedOrders;

      causes.set(
        record.rootCause,
        accumulator,
      );
    }

    const sorted =
      [...causes.entries()]
        .sort(
          (left, right) =>
            right[1].exceptionCount -
              left[1].exceptionCount ||
            right[1].totalDelayMinutes -
              left[1].totalDelayMinutes ||
            left[0].localeCompare(
              right[0],
              "tr",
            ),
        );

    let cumulativePercentage = 0;

    return sorted.map(
      ([rootCause, accumulator], index) => {
        const percentage =
          this.rate(
            accumulator.exceptionCount,
            records.length,
          );

        const previousCumulative =
          cumulativePercentage;

        cumulativePercentage =
          this.round(
            cumulativePercentage +
            percentage,
          );

        return {
          rank:
            index + 1,
          rootCause,
          exceptionCount:
            accumulator.exceptionCount,
          percentage,
          cumulativePercentage,
          totalDelayMinutes:
            this.round(
              accumulator.totalDelayMinutes,
            ),
          impactedOrders:
            accumulator.impactedOrders,
          withinPrimary80Percent:
            previousCumulative < 80,
        };
      },
    );
  }

  private buildBottlenecks(
    summaries:
      readonly OperationsProcessExceptionSummary[],
  ): OperationsBottleneck[] {
    return summaries
      .filter(
        (summary) =>
          summary.exceptionCount > 0,
      )
      .map(
        (summary) => {
          const score =
            this.round(
              Math.min(
                40,
                summary.errorRate * 4,
              ) +
              Math.min(
                24,
                summary.unresolvedCount * 8,
              ) +
              Math.min(
                24,
                summary.criticalCount * 12,
              ) +
              Math.min(
                12,
                summary.totalDelayMinutes /
                  30,
              ),
            );

          return {
            rank: 0,
            process:
              summary.process,
            label:
              summary.label,
            score,
            errorRate:
              summary.errorRate,
            unresolvedCount:
              summary.unresolvedCount,
            criticalCount:
              summary.criticalCount,
            totalDelayMinutes:
              summary.totalDelayMinutes,
            explanation:
              this.buildBottleneckExplanation(
                summary,
              ),
          };
        },
      )
      .sort(
        (left, right) =>
          right.score -
            left.score ||
          right.totalDelayMinutes -
            left.totalDelayMinutes ||
          left.label.localeCompare(
            right.label,
            "tr",
          ),
      )
      .map(
        (bottleneck, index) => ({
          ...bottleneck,
          rank:
            index + 1,
        }),
      );
  }

  private buildBottleneckExplanation(
    summary:
      OperationsProcessExceptionSummary,
  ): string {
    const parts: string[] = [];

    if (summary.errorRate >= 5) {
      parts.push(
        `hata oranı yüzde ${summary.errorRate}`,
      );
    }

    if (summary.criticalCount > 0) {
      parts.push(
        `${summary.criticalCount} kritik istisna`,
      );
    }

    if (summary.unresolvedCount > 0) {
      parts.push(
        `${summary.unresolvedCount} çözülmemiş kayıt`,
      );
    }

    if (summary.totalDelayMinutes > 0) {
      parts.push(
        `${summary.totalDelayMinutes} dakika toplam gecikme`,
      );
    }

    if (parts.length === 0) {
      return "Süreçte izlenmesi gereken operasyon istisnaları bulunuyor.";
    }

    return `${summary.label} sürecinde ${parts.join(", ")} tespit edildi.`;
  }

  private buildManagementActions(
    records:
      readonly OperationsExceptionRecord[],
    pareto:
      readonly OperationsRootCauseParetoItem[],
    bottlenecks:
      readonly OperationsBottleneck[],
  ): OperationsManagementAction[] {
    const actions:
      OperationsManagementAction[] = [];

    const criticalUnresolved =
      records.filter(
        (record) =>
          record.severity ===
            "critical" &&
          record.resolvedAt ===
            undefined,
      );

    if (criticalUnresolved.length > 0) {
      actions.push({
        code:
          "RESOLVE_CRITICAL_EXCEPTIONS",
        priority:
          "immediate",
        title:
          "Kritik istisnaları hemen çözüm kuyruğuna alın",
        description:
          `${criticalUnresolved.length} kritik istisna henüz çözülmedi. Operasyon sorumlusu, hedef çözüm süresi ve takip zamanı atanmalıdır.`,
      });
    }

    const primaryBottleneck =
      bottlenecks[0];

    if (
      primaryBottleneck !==
        undefined &&
      primaryBottleneck.score >= 30
    ) {
      actions.push({
        code:
          "REMOVE_PRIMARY_BOTTLENECK",
        priority:
          primaryBottleneck.score >= 60
            ? "immediate"
            : "high",
        title:
          `${primaryBottleneck.label} darboğazını azaltın`,
        description:
          `${primaryBottleneck.explanation} Kapasite, görev dağılımı ve süreç kuralları aynı aksiyon planında incelenmelidir.`,
        process:
          primaryBottleneck.process,
      });
    }

    const primaryCause =
      pareto.find(
        (item) =>
          item.withinPrimary80Percent,
      );

    if (primaryCause !== undefined) {
      actions.push({
        code:
          "ELIMINATE_PRIMARY_ROOT_CAUSE",
        priority:
          primaryCause.percentage >= 40
            ? "high"
            : "medium",
        title:
          `"${primaryCause.rootCause}" kök nedenini ortadan kaldırın`,
        description:
          `Bu kök neden ${primaryCause.exceptionCount} istisna ve ${primaryCause.totalDelayMinutes} dakika gecikme oluşturdu. Kalıcı düzeltici faaliyet sahibi ve tamamlanma tarihi belirlenmelidir.`,
      });
    }

    const totalDelayMinutes =
      records.reduce(
        (total, record) =>
          total +
          record.delayMinutes,
        0,
      );

    if (totalDelayMinutes >= 120) {
      actions.push({
        code:
          "RECOVER_OPERATION_DELAY",
        priority:
          totalDelayMinutes >= 480
            ? "high"
            : "medium",
        title:
          "Birikmiş operasyon gecikmesini geri kazanın",
        description:
          `Toplam ${this.round(totalDelayMinutes)} dakikalık gecikme bulunuyor. Kritik siparişler yeniden önceliklendirilmeli ve vardiya kapasitesi gözden geçirilmelidir.`,
      });
    }

    const highErrorProcess =
      bottlenecks.find(
        (item) =>
          item.errorRate >= 5,
      );

    if (highErrorProcess !== undefined) {
      actions.push({
        code:
          "REDUCE_PROCESS_ERROR_RATE",
        priority:
          highErrorProcess.errorRate >= 10
            ? "high"
            : "medium",
        title:
          `${highErrorProcess.label} hata oranını düşürün`,
        description:
          `Süreç hata oranı yüzde ${highErrorProcess.errorRate}. Standart iş adımları, kullanıcı eğitimi ve sistem doğrulamaları birlikte kontrol edilmelidir.`,
        process:
          highErrorProcess.process,
      });
    }

    return this.uniqueActions(
      actions,
    ).slice(
      0,
      5,
    );
  }

  private uniqueActions(
    actions:
      readonly OperationsManagementAction[],
  ): OperationsManagementAction[] {
    const seen =
      new Set<string>();

    return actions.filter(
      (action) => {
        if (
          seen.has(
            action.code,
          )
        ) {
          return false;
        }

        seen.add(
          action.code,
        );

        return true;
      },
    );
  }

  private normalizeFilter(
    filter: OperationsExceptionFilter,
  ): OperationsExceptionFilter {
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

    if (periodStart > periodEnd) {
      throw new InventoryValidationError(
        "Dönem başlangıcı, dönem bitişinden sonra olamaz.",
      );
    }

    return {
      tenantId,
      ...(warehouseId !== undefined
        ? { warehouseId }
        : {}),
      periodStart,
      periodEnd,
      ...(filter.process !== undefined
        ? {
            process:
              this.requireProcess(
                filter.process,
              ),
          }
        : {}),
      ...(filter.severity !== undefined
        ? {
            severity:
              this.requireSeverity(
                filter.severity,
              ),
          }
        : {}),
      ...(filter.unresolvedOnly !==
      undefined
        ? {
            unresolvedOnly:
              filter.unresolvedOnly,
          }
        : {}),
    };
  }

  private normalizeVolumes(
    volumes:
      readonly OperationsProcessVolume[],
  ): OperationsProcessVolume[] {
    const processes =
      new Set<WarehouseOperationProcess>();

    return volumes.map(
      (volume) => {
        const process =
          this.requireProcess(
            volume.process,
          );

        if (
          processes.has(
            process,
          )
        ) {
          throw new InventoryValidationError(
            `${PROCESS_LABELS[process]} süreci için birden fazla operasyon hacmi tanımlanamaz.`,
          );
        }

        processes.add(
          process,
        );

        return {
          process,
          operationCount:
            this.nonNegativeInteger(
              volume.operationCount,
              `${PROCESS_LABELS[process]} operasyon sayısı`,
            ),
        };
      },
    );
  }

  private requireProcess(
    process: WarehouseOperationProcess,
  ): WarehouseOperationProcess {
    if (
      !PROCESSES.includes(
        process,
      )
    ) {
      throw new InventoryValidationError(
        "Desteklenmeyen depo operasyon süreci.",
      );
    }

    return process;
  }

  private requireCategory(
    category: OperationsExceptionCategory,
  ): OperationsExceptionCategory {
    if (
      !CATEGORIES.includes(
        category,
      )
    ) {
      throw new InventoryValidationError(
        "Desteklenmeyen istisna kategorisi.",
      );
    }

    return category;
  }

  private requireSeverity(
    severity: OperationsExceptionSeverity,
  ): OperationsExceptionSeverity {
    if (
      !SEVERITIES.includes(
        severity,
      )
    ) {
      throw new InventoryValidationError(
        "Desteklenmeyen istisna önem seviyesi.",
      );
    }

    return severity;
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

  private nonNegativeInteger(
    value: number,
    label: string,
  ): number {
    const normalized =
      this.nonNegative(
        value,
        label,
      );

    if (
      !Number.isInteger(
        normalized,
      )
    ) {
      throw new InventoryValidationError(
        `${label} tam sayı olmalıdır.`,
      );
    }

    return normalized;
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
