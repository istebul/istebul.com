import type {
  Replenishment,
} from "../types/Replenishment";
import type {
  ReplenishmentAllocation,
} from "../types/ReplenishmentAllocation";
import type {
  ReplenishmentPerformance,
  ReplenishmentPerformanceFilter,
} from "../types/ReplenishmentPerformance";
import type {
  ReplenishmentTask,
} from "../types/ReplenishmentTask";
import {
  InventoryValidationError,
} from "../types/InventoryErrors";

export interface ReplenishmentPerformanceInput {
  readonly filter:
    ReplenishmentPerformanceFilter;
  readonly replenishments:
    readonly Replenishment[];
  readonly tasks:
    readonly ReplenishmentTask[];
  readonly allocations:
    readonly ReplenishmentAllocation[];
}

export interface ReplenishmentPerformanceBreakdown {
  readonly performance:
    ReplenishmentPerformance;
  readonly includedReplenishmentIds:
    readonly string[];
  readonly completedReplenishmentIds:
    readonly string[];
  readonly exceptionReplenishmentIds:
    readonly string[];
  readonly emergencyReplenishmentIds:
    readonly string[];
}

export interface ReplenishmentPerformanceServiceDependencies {
  readonly now?: () => string;
}

export class ReplenishmentPerformanceService {
  private readonly now: () => string;

  constructor(
    dependencies:
      ReplenishmentPerformanceServiceDependencies = {},
  ) {
    this.now =
      dependencies.now ??
      (() => new Date().toISOString());
  }

  calculate(
    input: ReplenishmentPerformanceInput,
  ): ReplenishmentPerformance {
    return this.calculateBreakdown(
      input,
    ).performance;
  }

  calculateBreakdown(
    input: ReplenishmentPerformanceInput,
  ): ReplenishmentPerformanceBreakdown {
    const filter =
      this.validateFilter(
        input.filter,
      );

    const replenishments =
      input.replenishments
        .filter(
          (replenishment) =>
            replenishment.tenantId ===
              filter.tenantId,
        )
        .filter(
          (replenishment) =>
            filter.warehouseId ===
              undefined ||
            replenishment.warehouseId ===
              filter.warehouseId,
        )
        .filter(
          (replenishment) =>
            replenishment.createdAt >=
              filter.periodStart &&
            replenishment.createdAt <=
              filter.periodEnd,
        );

    const includedReplenishmentIds =
      replenishments.map(
        (replenishment) =>
          replenishment.id,
      );

    const includedIdSet =
      new Set(
        includedReplenishmentIds,
      );

    const tasks =
      input.tasks.filter(
        (task) =>
          task.tenantId ===
            filter.tenantId &&
          includedIdSet.has(
            task.replenishmentId,
          ),
      );

    const allocations =
      input.allocations.filter(
        (allocation) =>
          allocation.tenantId ===
            filter.tenantId &&
          includedIdSet.has(
            allocation.replenishmentId,
          ),
      );

    const completedReplenishments =
      replenishments.filter(
        (replenishment) =>
          replenishment.status ===
          "completed",
      );

    const cancelledReplenishments =
      replenishments.filter(
        (replenishment) =>
          replenishment.status ===
          "cancelled",
      );

    const exceptionReplenishments =
      replenishments.filter(
        (replenishment) =>
          replenishment.status ===
            "exception" ||
          replenishment.exceptions.some(
            (exception) =>
              !exception.resolved,
          ),
      );

    const emergencyReplenishments =
      replenishments.filter(
        (replenishment) =>
          replenishment.strategy ===
            "emergency" ||
          replenishment.source.type ===
            "short_pick" ||
          replenishment.priority >= 90,
      );

    const totalRequestedQuantity =
      replenishments.reduce(
        (total, replenishment) =>
          total +
          replenishment.items.reduce(
            (itemTotal, item) =>
              itemTotal +
              item.requestedQuantity,
            0,
          ),
        0,
      );

    const totalTransferredQuantity =
      allocations.reduce(
        (total, allocation) =>
          total +
          allocation
            .transferredQuantity,
        0,
      );

    const totalAllocatedQuantity =
      allocations
        .filter(
          (allocation) =>
            allocation.status !==
              "cancelled" &&
            allocation.status !==
              "released",
        )
        .reduce(
          (total, allocation) =>
            total +
            allocation
              .allocatedQuantity,
          0,
        );

    const totalReplenishments =
      replenishments.length;

    const completedCount =
      completedReplenishments.length;

    const completionRate =
      this.calculateRate(
        completedCount,
        totalReplenishments,
      );

    const fulfillmentRate =
      this.calculateRate(
        totalTransferredQuantity,
        totalRequestedQuantity,
      );

    const completionDurations =
      completedReplenishments
        .map((replenishment) =>
          this.calculateDurationMinutes(
            replenishment.startedAt ??
              replenishment.releasedAt ??
              replenishment.createdAt,
            replenishment.completedAt,
          ),
        )
        .filter(
          (duration) =>
            duration !== undefined,
        );

    const taskDurations =
      tasks
        .filter(
          (task) =>
            task.status ===
              "completed",
        )
        .map((task) =>
          this.calculateDurationMinutes(
            task.startedAt ??
              task.createdAt,
            task.completedAt,
          ),
        )
        .filter(
          (duration) =>
            duration !== undefined,
        );

    const sourceUtilizationRate =
      this.calculateRate(
        totalTransferredQuantity,
        totalAllocatedQuantity,
      );

    const destinationFillRates =
      replenishments
        .flatMap(
          (replenishment) =>
            replenishment.items,
        )
        .filter(
          (item) =>
            item.maximumQuantity !==
            undefined,
        )
        .map((item) => {
          const maximumQuantity =
            item.maximumQuantity;

          if (
            maximumQuantity ===
              undefined ||
            maximumQuantity === 0
          ) {
            return 0;
          }

          const finalQuantity =
            item.currentDestinationQuantity +
            item.transferredQuantity;

          return Math.min(
            100,
            (
              finalQuantity /
              maximumQuantity
            ) * 100,
          );
        });

    const performance:
      ReplenishmentPerformance = {
      tenantId: filter.tenantId,
      periodStart:
        filter.periodStart,
      periodEnd:
        filter.periodEnd,
      totalReplenishments,
      completedReplenishments:
        completedCount,
      cancelledReplenishments:
        cancelledReplenishments.length,
      exceptionReplenishments:
        exceptionReplenishments.length,
      totalRequestedQuantity:
        this.round(
          totalRequestedQuantity,
        ),
      totalTransferredQuantity:
        this.round(
          totalTransferredQuantity,
        ),
      completionRate,
      fulfillmentRate,
      averageCompletionMinutes:
        this.average(
          completionDurations,
        ),
      averageTaskMinutes:
        this.average(
          taskDurations,
        ),
      sourceUtilizationRate,
      destinationFillRate:
        this.average(
          destinationFillRates,
        ),
      emergencyReplenishmentRate:
        this.calculateRate(
          emergencyReplenishments.length,
          totalReplenishments,
        ),
      calculatedAt: this.now(),
      ...(filter.warehouseId !==
      undefined
        ? {
            warehouseId:
              filter.warehouseId,
          }
        : {}),
    };

    return {
      performance,
      includedReplenishmentIds,
      completedReplenishmentIds:
        completedReplenishments.map(
          (replenishment) =>
            replenishment.id,
        ),
      exceptionReplenishmentIds:
        exceptionReplenishments.map(
          (replenishment) =>
            replenishment.id,
        ),
      emergencyReplenishmentIds:
        emergencyReplenishments.map(
          (replenishment) =>
            replenishment.id,
        ),
    };
  }

  calculateRate(
    numerator: number,
    denominator: number,
  ): number {
    this.requireNonNegativeNumber(
      numerator,
      "Oran payı",
    );

    this.requireNonNegativeNumber(
      denominator,
      "Oran paydası",
    );

    if (denominator === 0) {
      return 0;
    }

    return this.round(
      Math.min(
        100,
        Math.max(
          0,
          (
            numerator /
            denominator
          ) * 100,
        ),
      ),
    );
  }

  calculateDurationMinutes(
    startedAt: string,
    completedAt:
      string | undefined,
  ): number | undefined {
    if (completedAt === undefined) {
      return undefined;
    }

    const startTimestamp =
      Date.parse(startedAt);

    const completedTimestamp =
      Date.parse(completedAt);

    if (
      Number.isNaN(startTimestamp) ||
      Number.isNaN(
        completedTimestamp,
      )
    ) {
      throw new InventoryValidationError(
        "İkmal süre hesabında geçersiz tarih bulundu.",
      );
    }

    if (
      completedTimestamp <
      startTimestamp
    ) {
      throw new InventoryValidationError(
        "İkmal tamamlanma tarihi başlangıç tarihinden önce olamaz.",
      );
    }

    return this.round(
      (
        completedTimestamp -
        startTimestamp
      ) /
        (60 * 1000),
    );
  }

  private validateFilter(
    filter:
      ReplenishmentPerformanceFilter,
  ): ReplenishmentPerformanceFilter {
    const tenantId =
      this.requireText(
        filter.tenantId,
        "Firma kimliği",
      );

    const periodStart =
      this.requireDate(
        filter.periodStart,
        "Dönem başlangıç tarihi",
      );

    const periodEnd =
      this.requireDate(
        filter.periodEnd,
        "Dönem bitiş tarihi",
      );

    if (
      periodEnd <
      periodStart
    ) {
      throw new InventoryValidationError(
        "Dönem bitiş tarihi başlangıç tarihinden önce olamaz.",
      );
    }

    const warehouseId =
      this.normalizeOptionalText(
        filter.warehouseId,
      );

    return {
      tenantId,
      periodStart,
      periodEnd,
      ...(warehouseId !== undefined
        ? { warehouseId }
        : {}),
    };
  }

  private average(
    values: readonly number[],
  ): number {
    if (values.length === 0) {
      return 0;
    }

    return this.round(
      values.reduce(
        (total, value) =>
          total + value,
        0,
      ) / values.length,
    );
  }

  private requireText(
    value: unknown,
    fieldName: string,
  ): string {
    if (typeof value !== "string") {
      throw new InventoryValidationError(
        `${fieldName} metin olmalıdır.`,
      );
    }

    const normalized =
      value.trim();

    if (!normalized) {
      throw new InventoryValidationError(
        `${fieldName} boş bırakılamaz.`,
      );
    }

    return normalized;
  }

  private normalizeOptionalText(
    value: unknown,
  ): string | undefined {
    if (
      value === undefined ||
      value === null
    ) {
      return undefined;
    }

    if (typeof value !== "string") {
      throw new InventoryValidationError(
        "İsteğe bağlı metin alanı geçersiz.",
      );
    }

    const normalized =
      value.trim();

    return normalized || undefined;
  }

  private requireDate(
    value: unknown,
    fieldName: string,
  ): string {
    const text =
      this.requireText(
        value,
        fieldName,
      );

    const timestamp =
      Date.parse(text);

    if (Number.isNaN(timestamp)) {
      throw new InventoryValidationError(
        `${fieldName} geçerli bir tarih olmalıdır.`,
      );
    }

    return new Date(
      timestamp,
    ).toISOString();
  }

  private requireNonNegativeNumber(
    value: unknown,
    fieldName: string,
  ): number {
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < 0
    ) {
      throw new InventoryValidationError(
        `${fieldName} sıfır veya daha büyük olmalıdır.`,
      );
    }

    return value;
  }

  private round(
    value: number,
  ): number {
    return Math.round(
      (
        value +
        Number.EPSILON
      ) * 10000,
    ) / 10000;
  }
}
