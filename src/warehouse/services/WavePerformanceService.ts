import type {
  Wave,
} from "../types/Wave";
import {
  InventoryValidationError,
} from "../types/InventoryErrors";
import type {
  WaveItem,
} from "../types/WaveItem";
import type {
  WaveOrder,
} from "../types/WaveOrder";
import type {
  WavePerformance,
  WavePerformanceFilter,
} from "../types/WavePerformance";
import type {
  WaveTask,
} from "../types/WaveTask";
import type {
  WaveRepository,
} from "./WaveRepository";

export interface WavePerformanceServiceDependencies {
  readonly repository: WaveRepository;
  readonly now?: () => string;
}

export interface WavePerformanceSnapshot {
  readonly wave: Wave;
  readonly orders: readonly WaveOrder[];
  readonly items: readonly WaveItem[];
  readonly tasks: readonly WaveTask[];
}

export interface WarehouseWavePerformance {
  readonly warehouseId: string;
  readonly performance: WavePerformance;
}

export interface WavePerformanceComparison {
  readonly current: WavePerformance;
  readonly previous: WavePerformance;
  readonly waveCompletionRateChange: number;
  readonly orderCompletionRateChange: number;
  readonly lineCompletionRateChange: number;
  readonly itemFulfillmentRateChange: number;
  readonly shortPickRateChange: number;
  readonly averageWaveDurationChange: number;
  readonly laborUtilizationRateChange: number;
  readonly equipmentUtilizationRateChange: number;
  readonly improved: boolean;
  readonly calculatedAt: string;
}

interface PerformanceAccumulator {
  totalWaves: number;
  completedWaves: number;
  cancelledWaves: number;
  exceptionWaves: number;
  totalOrders: number;
  completedOrders: number;
  totalLines: number;
  completedLines: number;
  totalItems: number;
  pickedItems: number;
  shortItems: number;
  waveDurations: number[];
  orderDurations: number[];
  taskDurations: number[];
  laborUtilizationRates: number[];
  equipmentUtilizationRates: number[];
}

export class WavePerformanceService {
  private readonly repository:
    WaveRepository;

  private readonly now: () => string;

  constructor(
    dependencies:
      WavePerformanceServiceDependencies,
  ) {
    this.repository =
      dependencies.repository;

    this.now =
      dependencies.now ??
      (() => new Date().toISOString());
  }

  async calculate(
    filter: WavePerformanceFilter,
  ): Promise<WavePerformance> {
    const normalizedFilter =
      this.normalizeFilter(filter);

    const waves =
      await this.repository.list({
        tenantId:
          normalizedFilter.tenantId,
        ...(normalizedFilter
          .warehouseId !== undefined
          ? {
              warehouseId:
                normalizedFilter
                  .warehouseId,
            }
          : {}),
      });

    const periodWaves =
      waves.filter(
        (wave) =>
          this.isWaveInPeriod(
            wave,
            normalizedFilter.periodStart,
            normalizedFilter.periodEnd,
          ),
      );

    const snapshots =
      await Promise.all(
        periodWaves.map(
          (wave) =>
            this.loadSnapshot(wave),
        ),
      );

    return this.calculateFromSnapshots(
      normalizedFilter,
      snapshots,
    );
  }

  calculateFromSnapshots(
    filter: WavePerformanceFilter,
    snapshots:
      readonly WavePerformanceSnapshot[],
  ): WavePerformance {
    const normalizedFilter =
      this.normalizeFilter(filter);

    const accumulator:
      PerformanceAccumulator = {
      totalWaves: 0,
      completedWaves: 0,
      cancelledWaves: 0,
      exceptionWaves: 0,
      totalOrders: 0,
      completedOrders: 0,
      totalLines: 0,
      completedLines: 0,
      totalItems: 0,
      pickedItems: 0,
      shortItems: 0,
      waveDurations: [],
      orderDurations: [],
      taskDurations: [],
      laborUtilizationRates: [],
      equipmentUtilizationRates: [],
    };

    for (
      const snapshot
      of snapshots
    ) {
      this.validateSnapshot(
        snapshot,
        normalizedFilter,
      );

      this.accumulateWave(
        accumulator,
        snapshot,
      );
    }

    const waveCompletionRate =
      this.calculateRate(
        accumulator.completedWaves,
        accumulator.totalWaves,
      );

    const orderCompletionRate =
      this.calculateRate(
        accumulator.completedOrders,
        accumulator.totalOrders,
      );

    const lineCompletionRate =
      this.calculateRate(
        accumulator.completedLines,
        accumulator.totalLines,
      );

    const itemFulfillmentRate =
      this.calculateRate(
        accumulator.pickedItems,
        accumulator.totalItems,
      );

    const shortPickRate =
      this.calculateRate(
        accumulator.shortItems,
        accumulator.totalItems,
      );

    return {
      tenantId:
        normalizedFilter.tenantId,
      periodStart:
        normalizedFilter.periodStart,
      periodEnd:
        normalizedFilter.periodEnd,
      totalWaves:
        accumulator.totalWaves,
      completedWaves:
        accumulator.completedWaves,
      cancelledWaves:
        accumulator.cancelledWaves,
      exceptionWaves:
        accumulator.exceptionWaves,
      totalOrders:
        accumulator.totalOrders,
      completedOrders:
        accumulator.completedOrders,
      totalLines:
        accumulator.totalLines,
      completedLines:
        accumulator.completedLines,
      totalItems:
        this.round(
          accumulator.totalItems,
        ),
      pickedItems:
        this.round(
          accumulator.pickedItems,
        ),
      shortItems:
        this.round(
          accumulator.shortItems,
        ),
      waveCompletionRate,
      orderCompletionRate,
      lineCompletionRate,
      itemFulfillmentRate,
      shortPickRate,
      averageWaveDurationMinutes:
        this.average(
          accumulator.waveDurations,
        ),
      averageOrderDurationMinutes:
        this.average(
          accumulator.orderDurations,
        ),
      averageTaskDurationMinutes:
        this.average(
          accumulator.taskDurations,
        ),
      laborUtilizationRate:
        this.average(
          accumulator
            .laborUtilizationRates,
        ),
      equipmentUtilizationRate:
        this.average(
          accumulator
            .equipmentUtilizationRates,
        ),
      calculatedAt:
        this.normalizeDate(
          this.now(),
          "Performans hesaplama tarihi",
        ),
      ...(normalizedFilter
        .warehouseId !== undefined
        ? {
            warehouseId:
              normalizedFilter
                .warehouseId,
          }
        : {}),
    };
  }

  async calculateByWarehouse(
    filter: Omit<
      WavePerformanceFilter,
      "warehouseId"
    >,
  ): Promise<
    readonly WarehouseWavePerformance[]
  > {
    const normalizedFilter =
      this.normalizeFilter(filter);

    const waves =
      await this.repository.list({
        tenantId:
          normalizedFilter.tenantId,
      });

    const periodWaves =
      waves.filter(
        (wave) =>
          this.isWaveInPeriod(
            wave,
            normalizedFilter.periodStart,
            normalizedFilter.periodEnd,
          ),
      );

    const warehouseIds = [
      ...new Set(
        periodWaves.map(
          (wave) =>
            wave.warehouseId,
        ),
      ),
    ].sort(
      (left, right) =>
        left.localeCompare(
          right,
          "tr",
          { numeric: true },
        ),
    );

    const results:
      WarehouseWavePerformance[] = [];

    for (
      const warehouseId
      of warehouseIds
    ) {
      const warehouseWaves =
        periodWaves.filter(
          (wave) =>
            wave.warehouseId ===
            warehouseId,
        );

      const snapshots =
        await Promise.all(
          warehouseWaves.map(
            (wave) =>
              this.loadSnapshot(wave),
          ),
        );

      const performance =
        this.calculateFromSnapshots(
          {
            tenantId:
              normalizedFilter.tenantId,
            warehouseId,
            periodStart:
              normalizedFilter.periodStart,
            periodEnd:
              normalizedFilter.periodEnd,
          },
          snapshots,
        );

      results.push({
        warehouseId,
        performance,
      });
    }

    return results;
  }

  async compare(
    currentFilter:
      WavePerformanceFilter,
    previousFilter:
      WavePerformanceFilter,
  ): Promise<WavePerformanceComparison> {
    const [
      current,
      previous,
    ] = await Promise.all([
      this.calculate(
        currentFilter,
      ),
      this.calculate(
        previousFilter,
      ),
    ]);

    if (
      current.tenantId !==
      previous.tenantId
    ) {
      throw new InventoryValidationError(
        "Karşılaştırılan performans dönemleri aynı firmaya ait olmalıdır.",
      );
    }

    if (
      current.warehouseId !==
      previous.warehouseId
    ) {
      throw new InventoryValidationError(
        "Karşılaştırılan performans dönemleri aynı depoya ait olmalıdır.",
      );
    }

    const waveCompletionRateChange =
      this.difference(
        current.waveCompletionRate,
        previous.waveCompletionRate,
      );

    const orderCompletionRateChange =
      this.difference(
        current.orderCompletionRate,
        previous.orderCompletionRate,
      );

    const lineCompletionRateChange =
      this.difference(
        current.lineCompletionRate,
        previous.lineCompletionRate,
      );

    const itemFulfillmentRateChange =
      this.difference(
        current.itemFulfillmentRate,
        previous.itemFulfillmentRate,
      );

    const shortPickRateChange =
      this.difference(
        current.shortPickRate,
        previous.shortPickRate,
      );

    const averageWaveDurationChange =
      this.difference(
        current
          .averageWaveDurationMinutes,
        previous
          .averageWaveDurationMinutes,
      );

    const laborUtilizationRateChange =
      this.difference(
        current
          .laborUtilizationRate,
        previous
          .laborUtilizationRate,
      );

    const equipmentUtilizationRateChange =
      this.difference(
        current
          .equipmentUtilizationRate,
        previous
          .equipmentUtilizationRate,
      );

    const positiveIndicators = [
      waveCompletionRateChange,
      orderCompletionRateChange,
      lineCompletionRateChange,
      itemFulfillmentRateChange,
      -shortPickRateChange,
      -averageWaveDurationChange,
    ];

    const improvementScore =
      positiveIndicators.reduce(
        (total, value) =>
          total + value,
        0,
      );

    return {
      current,
      previous,
      waveCompletionRateChange,
      orderCompletionRateChange,
      lineCompletionRateChange,
      itemFulfillmentRateChange,
      shortPickRateChange,
      averageWaveDurationChange,
      laborUtilizationRateChange,
      equipmentUtilizationRateChange,
      improved:
        improvementScore > 0,
      calculatedAt:
        this.normalizeDate(
          this.now(),
          "Performans karşılaştırma tarihi",
        ),
    };
  }

  calculateDurationMinutes(
    startedAt:
      string | undefined,
    completedAt:
      string | undefined,
  ): number | undefined {
    if (
      startedAt === undefined ||
      completedAt === undefined
    ) {
      return undefined;
    }

    const startTimestamp =
      this.parseDate(
        startedAt,
        "Başlangıç tarihi",
      );

    const completedTimestamp =
      this.parseDate(
        completedAt,
        "Bitiş tarihi",
      );

    if (
      completedTimestamp <
      startTimestamp
    ) {
      return undefined;
    }

    return this.round(
      (
        completedTimestamp -
        startTimestamp
      ) /
        (60 * 1000),
    );
  }

  private async loadSnapshot(
    wave: Wave,
  ): Promise<WavePerformanceSnapshot> {
    const [
      orders,
      items,
      tasks,
    ] = await Promise.all([
      this.repository.listOrders(
        wave.tenantId,
        wave.id,
      ),
      this.repository.listItems(
        wave.tenantId,
        wave.id,
      ),
      this.repository.listTasks(
        wave.tenantId,
        wave.id,
      ),
    ]);

    return {
      wave,
      orders,
      items,
      tasks,
    };
  }

  private accumulateWave(
    accumulator:
      PerformanceAccumulator,
    snapshot:
      WavePerformanceSnapshot,
  ): void {
    const {
      wave,
      orders,
      items,
      tasks,
    } = snapshot;

    accumulator.totalWaves += 1;

    if (
      wave.status === "completed"
    ) {
      accumulator.completedWaves += 1;
    }

    if (
      wave.status === "cancelled"
    ) {
      accumulator.cancelledWaves += 1;
    }

    if (
      wave.status === "exception"
    ) {
      accumulator.exceptionWaves += 1;
    }

    accumulator.totalOrders +=
      orders.length;

    accumulator.completedOrders +=
      orders.filter(
        (order) =>
          order.status ===
          "completed",
      ).length;

    const itemBasedLineCount =
      items.length;

    const orderBasedLineCount =
      orders.reduce(
        (total, order) =>
          total +
          Math.max(
            0,
            order.lineCount,
          ),
        0,
      );

    accumulator.totalLines +=
      itemBasedLineCount > 0
        ? itemBasedLineCount
        : orderBasedLineCount;

    if (items.length > 0) {
      accumulator.completedLines +=
        items.filter(
          (item) =>
            item.status ===
              "picked" ||
            (
              item.remainingQuantity ===
                0 &&
              item.pickedQuantity > 0
            ),
        ).length;
    } else {
      accumulator.completedLines +=
        orders
          .filter(
            (order) =>
              order.status ===
              "completed",
          )
          .reduce(
            (total, order) =>
              total +
              Math.max(
                0,
                order.lineCount,
              ),
            0,
          );
    }

    const itemBasedTotalQuantity =
      items.reduce(
        (total, item) =>
          total +
          Math.max(
            0,
            item.requestedQuantity,
          ),
        0,
      );

    const orderBasedTotalQuantity =
      orders.reduce(
        (total, order) =>
          total +
          Math.max(
            0,
            order.itemQuantity,
          ),
        0,
      );

    accumulator.totalItems +=
      itemBasedTotalQuantity > 0
        ? itemBasedTotalQuantity
        : orderBasedTotalQuantity;

    accumulator.pickedItems +=
      items.reduce(
        (total, item) =>
          total +
          Math.max(
            0,
            item.pickedQuantity,
          ),
        0,
      );

    accumulator.shortItems +=
      items.reduce(
        (total, item) =>
          total +
          Math.max(
            0,
            item.shortQuantity,
          ),
        0,
      );

    const waveDuration =
      this.calculateDurationMinutes(
        wave.startedAt ??
          wave.releasedAt,
        wave.completedAt,
      );

    if (
      waveDuration !== undefined
    ) {
      accumulator
        .waveDurations
        .push(waveDuration);
    }

    for (
      const order
      of orders
    ) {
      const orderDuration =
        this.calculateDurationMinutes(
          order.startedAt ??
            order.releasedAt ??
            order.allocatedAt,
          order.completedAt,
        );

      if (
        orderDuration !== undefined
      ) {
        accumulator
          .orderDurations
          .push(orderDuration);
      }
    }

    for (
      const task
      of tasks
    ) {
      if (
        task.actualMinutes !==
          undefined &&
        Number.isFinite(
          task.actualMinutes,
        ) &&
        task.actualMinutes >= 0
      ) {
        accumulator
          .taskDurations
          .push(
            this.round(
              task.actualMinutes,
            ),
          );

        continue;
      }

      const taskDuration =
        this.calculateDurationMinutes(
          task.startedAt ??
            task.releasedAt,
          task.completedAt,
        );

      if (
        taskDuration !== undefined
      ) {
        accumulator
          .taskDurations
          .push(taskDuration);
      }
    }

    if (
      wave.capacity !== undefined
    ) {
      accumulator
        .laborUtilizationRates
        .push(
          wave.capacity
            .laborUtilizationRate,
        );

      accumulator
        .equipmentUtilizationRates
        .push(
          wave.capacity
            .equipmentUtilizationRate,
        );
    }
  }

  private validateSnapshot(
    snapshot:
      WavePerformanceSnapshot,
    filter:
      WavePerformanceFilter,
  ): void {
    if (
      snapshot.wave.tenantId !==
      filter.tenantId
    ) {
      throw new InventoryValidationError(
        "Performans anlık görüntüsü farklı firmaya aittir.",
      );
    }

    if (
      filter.warehouseId !==
        undefined &&
      snapshot.wave.warehouseId !==
        filter.warehouseId
    ) {
      throw new InventoryValidationError(
        "Performans anlık görüntüsü farklı depoya aittir.",
      );
    }

    for (
      const order
      of snapshot.orders
    ) {
      if (
        order.tenantId !==
          snapshot.wave.tenantId ||
        order.waveId !==
          snapshot.wave.id
      ) {
        throw new InventoryValidationError(
          "Dalga performansındaki sipariş kaydı dalgayla uyuşmuyor.",
        );
      }
    }

    for (
      const item
      of snapshot.items
    ) {
      if (
        item.tenantId !==
          snapshot.wave.tenantId ||
        item.waveId !==
          snapshot.wave.id
      ) {
        throw new InventoryValidationError(
          "Dalga performansındaki ürün satırı dalgayla uyuşmuyor.",
        );
      }
    }

    for (
      const task
      of snapshot.tasks
    ) {
      if (
        task.tenantId !==
          snapshot.wave.tenantId ||
        task.waveId !==
          snapshot.wave.id
      ) {
        throw new InventoryValidationError(
          "Dalga performansındaki görev kaydı dalgayla uyuşmuyor.",
        );
      }
    }
  }

  private isWaveInPeriod(
    wave: Wave,
    periodStart: string,
    periodEnd: string,
  ): boolean {
    const activityDate =
      wave.completedAt ??
      wave.cancelledAt ??
      wave.startedAt ??
      wave.releasedAt ??
      wave.plannedAt ??
      wave.createdAt;

    const activityTimestamp =
      this.parseDate(
        activityDate,
        "Dalga faaliyet tarihi",
      );

    const periodStartTimestamp =
      this.parseDate(
        periodStart,
        "Performans dönemi başlangıcı",
      );

    const periodEndTimestamp =
      this.parseDate(
        periodEnd,
        "Performans dönemi bitişi",
      );

    return (
      activityTimestamp >=
        periodStartTimestamp &&
      activityTimestamp <=
        periodEndTimestamp
    );
  }

  private normalizeFilter(
    filter:
      WavePerformanceFilter,
  ): WavePerformanceFilter {
    const tenantId =
      this.requireText(
        filter.tenantId,
        "Firma kimliği",
      );

    const periodStart =
      this.normalizeDate(
        filter.periodStart,
        "Performans dönemi başlangıcı",
      );

    const periodEnd =
      this.normalizeDate(
        filter.periodEnd,
        "Performans dönemi bitişi",
      );

    if (
      periodEnd < periodStart
    ) {
      throw new InventoryValidationError(
        "Performans dönemi bitiş tarihi başlangıç tarihinden önce olamaz.",
      );
    }

    const warehouseId =
      filter.warehouseId ===
        undefined
        ? undefined
        : this.requireText(
            filter.warehouseId,
            "Depo kimliği",
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

  private calculateRate(
    numerator: number,
    denominator: number,
  ): number {
    if (
      denominator <= 0
    ) {
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

  private average(
    values: readonly number[],
  ): number {
    const validValues =
      values.filter(
        (value) =>
          Number.isFinite(value) &&
          value >= 0,
      );

    if (
      validValues.length === 0
    ) {
      return 0;
    }

    return this.round(
      validValues.reduce(
        (total, value) =>
          total + value,
        0,
      ) /
        validValues.length,
    );
  }

  private difference(
    current: number,
    previous: number,
  ): number {
    return this.round(
      current - previous,
    );
  }

  private requireText(
    value: unknown,
    fieldName: string,
  ): string {
    if (
      typeof value !== "string"
    ) {
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

  private parseDate(
    value: string,
    fieldName: string,
  ): number {
    const timestamp =
      Date.parse(value);

    if (
      Number.isNaN(timestamp)
    ) {
      throw new InventoryValidationError(
        `${fieldName} geçerli bir tarih olmalıdır.`,
      );
    }

    return timestamp;
  }

  private normalizeDate(
    value: string,
    fieldName: string,
  ): string {
    return new Date(
      this.parseDate(
        value,
        fieldName,
      ),
    ).toISOString();
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
