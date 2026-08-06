import type {
  Wave,
} from "../types/Wave";
import type {
  WaveAllocation,
} from "../types/WaveAllocation";
import type {
  WaveCapacity,
} from "../types/WaveCapacity";
import {
  InventoryValidationError,
} from "../types/InventoryErrors";
import type {
  WaveItem,
} from "../types/WaveItem";
import type {
  WaveOrder,
  WaveOrderStatus,
} from "../types/WaveOrder";
import type {
  WaveRule,
} from "../types/WaveRule";
import type {
  WaveStatus,
} from "../types/WaveStatus";
import {
  WAVE_TASK_TYPES,
} from "../types/WaveTask";
import type {
  WaveTask,
  WaveTaskType,
} from "../types/WaveTask";
import type {
  WaveOptimizationResult,
  WaveOrderEvaluation,
} from "./WaveOptimizer";
import {
  WaveOptimizer,
} from "./WaveOptimizer";
import type {
  WaveRepository,
} from "./WaveRepository";

export interface WavePlanningInput {
  readonly tenantId: string;
  readonly waveId: string;
  readonly ruleId?: string;
  readonly capacity?: WaveCapacity;
  readonly allowOverdueOrders?: boolean;
}

export interface WavePlanningResult {
  readonly wave: Wave;
  readonly optimization:
    WaveOptimizationResult;
  readonly selectedOrders:
    readonly WaveOrder[];
  readonly rejectedOrders:
    readonly WaveOrder[];
  readonly capacity?: WaveCapacity;
  readonly rule?: WaveRule;
  readonly plannedAt: string;
}

export interface WaveTaskGenerationInput {
  readonly tenantId: string;
  readonly waveId: string;
  readonly createdBy: string;
  readonly taskType?: WaveTaskType;
  readonly plannedAt?: string;
  readonly replaceExisting?: boolean;
}

export interface WaveTaskGenerationResult {
  readonly wave: Wave;
  readonly createdTasks:
    readonly WaveTask[];
  readonly existingTasks:
    readonly WaveTask[];
  readonly skippedAllocationIds:
    readonly string[];
  readonly warnings:
    readonly string[];
  readonly allocationCount: number;
  readonly createdTaskCount: number;
  readonly skippedTaskCount: number;
  readonly readyForRelease: boolean;
  readonly generatedAt: string;
}

export interface WavePlanningSummary {
  readonly orderCount: number;
  readonly eligibleOrderCount: number;
  readonly exceptionOrderCount: number;
  readonly itemCount: number;
  readonly fullyAllocatedItemCount: number;
  readonly shortItemCount: number;
  readonly allocationCount: number;
  readonly taskCount: number;
  readonly pendingTaskCount: number;
  readonly completedTaskCount: number;
  readonly unresolvedExceptionCount: number;
  readonly readyForRelease: boolean;
}

export interface WavePlanningServiceDependencies {
  readonly repository:
    WaveRepository;
  readonly optimizer:
    WaveOptimizer;
  readonly now?: () => string;
  readonly idFactory?: () => string;
}

export class WavePlanningService {
  private readonly repository:
    WaveRepository;

  private readonly optimizer:
    WaveOptimizer;

  private readonly now: () => string;

  private readonly idFactory:
    () => string;

  constructor(
    dependencies:
      WavePlanningServiceDependencies,
  ) {
    this.repository =
      dependencies.repository;

    this.optimizer =
      dependencies.optimizer;

    this.now =
      dependencies.now ??
      (() => new Date().toISOString());

    this.idFactory =
      dependencies.idFactory ??
      (() =>
        `wave-task-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 12)}`);
  }

  async plan(
    input: WavePlanningInput,
  ): Promise<WavePlanningResult> {
    const tenantId =
      this.requireText(
        input.tenantId,
        "Firma kimliği",
      );

    const waveId =
      this.requireText(
        input.waveId,
        "Dalga kimliği",
      );

    const wave =
      await this.requireWave(
        tenantId,
        waveId,
      );

    this.validatePlanningStatus(
      wave.status,
    );

    const orders =
      await this.repository.listOrders(
        tenantId,
        waveId,
      );

    if (orders.length === 0) {
      throw new InventoryValidationError(
        "Dalga planlaması için en az bir sipariş gereklidir.",
      );
    }

    const rule =
      await this.resolveRule({
        tenantId,
        wave,
        ...(input.ruleId !== undefined
          ? {
              ruleId:
                input.ruleId,
            }
          : {}),
      });

    const capacity =
      this.resolveCapacity({
        wave,
        ...(input.capacity !==
        undefined
          ? {
              capacity:
                input.capacity,
            }
          : {}),
      });

    if (
      input.capacity !== undefined &&
      capacity !== undefined
    ) {
      await this.repository
        .saveCapacity(capacity);
    }

    const optimization =
      this.optimizer.optimize({
        orders,
        allowOverdueOrders:
          input.allowOverdueOrders ??
          false,
        ...(rule !== undefined
          ? { rule }
          : {}),
        ...(capacity !== undefined
          ? { capacity }
          : {}),
      });

    const plannedAt =
      this.normalizeDate(
        this.now(),
        "Dalga planlama tarihi",
      );

    const selectedOrders:
      WaveOrder[] = [];

    const rejectedOrders:
      WaveOrder[] = [];

    for (
      const evaluation
      of optimization.evaluations
    ) {
      const updatedOrder =
        this.buildPlannedOrder({
          evaluation,
          plannedAt,
        });

      const savedOrder =
        await this.repository
          .saveOrder(updatedOrder);

      if (evaluation.selected) {
        selectedOrders.push(
          savedOrder,
        );
      } else {
        rejectedOrders.push(
          savedOrder,
        );
      }
    }

    const latestWave =
      await this.requireWave(
        tenantId,
        waveId,
      );

    const nextStatus =
      this.resolvePlannedWaveStatus({
        optimization,
        ...(capacity !== undefined
          ? { capacity }
          : {}),
      });

    const savedWave =
      await this.repository.save({
        ...latestWave,
        status: nextStatus,
        plannedAt:
          latestWave.plannedAt ??
          plannedAt,
        updatedAt: plannedAt,
        ...(rule !== undefined
          ? {
              ruleId: rule.id,
            }
          : {}),
        ...(capacity !== undefined
          ? {
              capacity,
            }
          : {}),
      });

    return {
      wave: savedWave,
      optimization,
      selectedOrders,
      rejectedOrders,
      plannedAt,
      ...(capacity !== undefined
        ? { capacity }
        : {}),
      ...(rule !== undefined
        ? { rule }
        : {}),
    };
  }

  async generateTasks(
    input: WaveTaskGenerationInput,
  ): Promise<WaveTaskGenerationResult> {
    const tenantId =
      this.requireText(
        input.tenantId,
        "Firma kimliği",
      );

    const waveId =
      this.requireText(
        input.waveId,
        "Dalga kimliği",
      );

    const createdBy =
      this.requireText(
        input.createdBy,
        "Görevi oluşturan kullanıcı",
      );

    const taskType =
      input.taskType;

    if (
      taskType !== undefined &&
      !WAVE_TASK_TYPES.includes(
        taskType,
      )
    ) {
      throw new InventoryValidationError(
        "Dalga görev türü geçersiz.",
      );
    }

    const wave =
      await this.requireWave(
        tenantId,
        waveId,
      );

    this.validateTaskGenerationStatus(
      wave.status,
    );

    const generatedAt =
      this.normalizeDate(
        this.now(),
        "Görev oluşturma tarihi",
      );

    const plannedAt =
      input.plannedAt === undefined
        ? wave.plannedAt ??
          generatedAt
        : this.normalizeDate(
            input.plannedAt,
            "Planlanan görev tarihi",
          );

    const [
      items,
      allocations,
      existingTasks,
    ] = await Promise.all([
      this.repository.listItems(
        tenantId,
        waveId,
      ),
      this.repository
        .listAllocations(
          tenantId,
          waveId,
        ),
      this.repository.listTasks(
        tenantId,
        waveId,
      ),
    ]);

    const itemMap =
      new Map(
        items.map(
          (item) => [
            item.id,
            item,
          ],
        ),
      );

    const existingAllocationIds =
      new Set(
        existingTasks
          .filter(
            (task) =>
              task.status !==
              "cancelled",
          )
          .map(
            (task) =>
              task.allocationId,
          )
          .filter(
            (
              allocationId,
            ): allocationId is string =>
              allocationId !==
              undefined,
          ),
      );

    const createdTasks:
      WaveTask[] = [];

    const skippedAllocationIds:
      string[] = [];

    const warnings:
      string[] = [];

    const activeAllocations =
      allocations.filter(
        (allocation) =>
          allocation.status !==
            "cancelled" &&
          allocation.status !==
            "completed" &&
          allocation.remainingQuantity >
            0,
      );

    for (
      const allocation
      of activeAllocations
    ) {
      if (
        input.replaceExisting !==
          true &&
        existingAllocationIds.has(
          allocation.id,
        )
      ) {
        skippedAllocationIds.push(
          allocation.id,
        );

        continue;
      }

      const item =
        itemMap.get(
          allocation.waveItemId,
        );

      if (!item) {
        warnings.push(
          `Tahsis için dalga satırı bulunamadı: ${allocation.id}.`,
        );

        skippedAllocationIds.push(
          allocation.id,
        );

        continue;
      }

      const task =
        this.buildTask({
          wave,
          item,
          allocation,
          createdBy,
          plannedAt,
          generatedAt,
          ...(taskType !== undefined
            ? { taskType }
            : {}),
        });

      const savedTask =
        await this.repository
          .saveTask(task);

      createdTasks.push(
        savedTask,
      );
    }

    const allTasks =
      await this.repository.listTasks(
        tenantId,
        waveId,
      );

    const readiness =
      this.evaluateReadiness({
        wave,
        items,
        tasks: allTasks,
      });

    warnings.push(
      ...readiness.warnings,
    );

    const nextStatus:
      WaveStatus =
        readiness.readyForRelease
          ? "ready"
          : createdTasks.length > 0
            ? "planned"
            : wave.status;

    const savedWave =
      await this.repository.save({
        ...wave,
        status: nextStatus,
        tasks: allTasks,
        updatedAt: generatedAt,
      });

    return {
      wave: savedWave,
      createdTasks,
      existingTasks,
      skippedAllocationIds,
      warnings,
      allocationCount:
        activeAllocations.length,
      createdTaskCount:
        createdTasks.length,
      skippedTaskCount:
        skippedAllocationIds.length,
      readyForRelease:
        readiness.readyForRelease,
      generatedAt,
    };
  }

  async summarize(
    tenantId: string,
    waveId: string,
  ): Promise<WavePlanningSummary> {
    const normalizedTenantId =
      this.requireText(
        tenantId,
        "Firma kimliği",
      );

    const normalizedWaveId =
      this.requireText(
        waveId,
        "Dalga kimliği",
      );

    const wave =
      await this.requireWave(
        normalizedTenantId,
        normalizedWaveId,
      );

    const [
      orders,
      items,
      allocations,
      tasks,
      exceptions,
    ] = await Promise.all([
      this.repository.listOrders(
        normalizedTenantId,
        normalizedWaveId,
      ),
      this.repository.listItems(
        normalizedTenantId,
        normalizedWaveId,
      ),
      this.repository
        .listAllocations(
          normalizedTenantId,
          normalizedWaveId,
        ),
      this.repository.listTasks(
        normalizedTenantId,
        normalizedWaveId,
      ),
      this.repository
        .listExceptions(
          normalizedTenantId,
          normalizedWaveId,
        ),
    ]);

    const readiness =
      this.evaluateReadiness({
        wave,
        items,
        tasks,
      });

    return {
      orderCount: orders.length,
      eligibleOrderCount:
        orders.filter(
          (order) =>
            order.status ===
              "eligible" ||
            order.status ===
              "allocated" ||
            order.status ===
              "released" ||
            order.status ===
              "in_progress" ||
            order.status ===
              "partially_completed" ||
            order.status ===
              "completed",
        ).length,
      exceptionOrderCount:
        orders.filter(
          (order) =>
            order.status ===
            "exception",
        ).length,
      itemCount: items.length,
      fullyAllocatedItemCount:
        items.filter(
          (item) =>
            item.allocatedQuantity >=
              item.requestedQuantity &&
            item.shortQuantity === 0,
        ).length,
      shortItemCount:
        items.filter(
          (item) =>
            item.shortQuantity > 0,
        ).length,
      allocationCount:
        allocations.filter(
          (allocation) =>
            allocation.status !==
            "cancelled",
        ).length,
      taskCount:
        tasks.filter(
          (task) =>
            task.status !==
            "cancelled",
        ).length,
      pendingTaskCount:
        tasks.filter(
          (task) =>
            task.status ===
              "pending" ||
            task.status ===
              "assigned",
        ).length,
      completedTaskCount:
        tasks.filter(
          (task) =>
            task.status ===
            "completed",
        ).length,
      unresolvedExceptionCount:
        exceptions.filter(
          (exception) =>
            !exception.resolved,
        ).length,
      readyForRelease:
        readiness.readyForRelease,
    };
  }

  private async resolveRule(
    input: {
      tenantId: string;
      wave: Wave;
      ruleId?: string;
    },
  ): Promise<WaveRule | undefined> {
    const ruleId =
      input.ruleId ??
      input.wave.ruleId;

    if (ruleId === undefined) {
      return undefined;
    }

    const normalizedRuleId =
      this.requireText(
        ruleId,
        "Dalga kuralı kimliği",
      );

    const rule =
      await this.repository
        .findRuleById(
          input.tenantId,
          normalizedRuleId,
        );

    if (!rule) {
      throw new InventoryValidationError(
        `Dalga kuralı bulunamadı: ${normalizedRuleId}`,
      );
    }

    if (!rule.active) {
      throw new InventoryValidationError(
        "Pasif dalga kuralıyla planlama yapılamaz.",
      );
    }

    if (
      rule.warehouseId !==
        undefined &&
      rule.warehouseId !==
        input.wave.warehouseId
    ) {
      throw new InventoryValidationError(
        "Dalga kuralı farklı depoya aittir.",
      );
    }

    return rule;
  }

  private resolveCapacity(
    input: {
      wave: Wave;
      capacity?: WaveCapacity;
    },
  ): WaveCapacity | undefined {
    const source =
      input.capacity ??
      input.wave.capacity;

    if (source === undefined) {
      return undefined;
    }

    if (
      source.tenantId !==
      input.wave.tenantId
    ) {
      throw new InventoryValidationError(
        "Kapasite kaydı farklı firmaya aittir.",
      );
    }

    if (
      source.warehouseId !==
      input.wave.warehouseId
    ) {
      throw new InventoryValidationError(
        "Kapasite kaydı farklı depoya aittir.",
      );
    }

    if (
      source.waveId !== undefined &&
      source.waveId !==
        input.wave.id
    ) {
      throw new InventoryValidationError(
        "Kapasite kaydı farklı dalgaya aittir.",
      );
    }

    return {
      ...source,
      waveId: input.wave.id,
    };
  }

  private buildPlannedOrder(
    input: {
      evaluation:
        WaveOrderEvaluation;
      plannedAt: string;
    },
  ): WaveOrder {
    const status:
      WaveOrderStatus =
        input.evaluation.selected
          ? "eligible"
          : input.evaluation.eligible
            ? "pending"
            : "exception";

    return {
      ...input.evaluation.order,
      status,
      updatedAt:
        input.plannedAt,
    };
  }

  private resolvePlannedWaveStatus(
    input: {
      optimization:
        WaveOptimizationResult;
      capacity?: WaveCapacity;
    },
  ): WaveStatus {
    if (
      input.optimization
        .selectedOrderCount === 0
    ) {
      return "exception";
    }

    if (
      input.capacity !== undefined
    ) {
      return "capacity_checked";
    }

    return "planned";
  }

  private buildTask(
    input: {
      wave: Wave;
      item: WaveItem;
      allocation:
        WaveAllocation;
      createdBy: string;
      plannedAt: string;
      generatedAt: string;
      taskType?: WaveTaskType;
    },
  ): WaveTask {
    const taskType =
      input.taskType ??
      (
        input.item.zoneId !==
        undefined
          ? "zone_pick"
          : "pick"
      );

    const estimatedMinutes =
      this.estimateTaskMinutes(
        input.allocation,
      );

    return {
      id: this.requireText(
        this.idFactory(),
        "Dalga görevi kimliği",
      ),
      tenantId:
        input.wave.tenantId,
      waveId:
        input.wave.id,
      waveOrderId:
        input.item.waveOrderId,
      waveItemId:
        input.item.id,
      allocationId:
        input.allocation.id,
      warehouseId:
        input.wave.warehouseId,
      sourceLocationId:
        input.allocation
          .sourceLocationId,
      productId:
        input.item.productId,
      type: taskType,
      status: "pending",
      priority:
        input.item.priority,
      sequence:
        input.allocation.sequence,
      estimatedMinutes,
      plannedAt:
        input.plannedAt,
      createdBy:
        input.createdBy,
      createdAt:
        input.generatedAt,
      updatedAt:
        input.generatedAt,
      ...(input.item.zoneId !==
      undefined
        ? {
            zoneId:
              input.item.zoneId,
          }
        : {}),
      ...(input.allocation
        .destinationLocationId !==
      undefined
        ? {
            destinationLocationId:
              input.allocation
                .destinationLocationId,
          }
        : {}),
    };
  }

  private evaluateReadiness(
    input: {
      wave: Wave;
      items:
        readonly WaveItem[];
      tasks:
        readonly WaveTask[];
    },
  ): {
    readyForRelease: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];

    if (input.items.length === 0) {
      warnings.push(
        "Dalgada ürün satırı bulunmuyor.",
      );
    }

    const shortItems =
      input.items.filter(
        (item) =>
          item.shortQuantity > 0 ||
          item.allocatedQuantity <
            item.requestedQuantity,
      );

    if (shortItems.length > 0) {
      warnings.push(
        `${shortItems.length} dalga satırı tam olarak tahsis edilmemiştir.`,
      );
    }

    const activeTasks =
      input.tasks.filter(
        (task) =>
          task.status !==
          "cancelled",
      );

    if (activeTasks.length === 0) {
      warnings.push(
        "Dalgada serbest bırakılabilir görev bulunmuyor.",
      );
    }

    const unresolvedExceptions =
      input.wave.exceptions.filter(
        (exception) =>
          !exception.resolved,
      );

    if (
      unresolvedExceptions.length > 0
    ) {
      warnings.push(
        `${unresolvedExceptions.length} çözülmemiş dalga istisnası bulunmaktadır.`,
      );
    }

    if (
      input.wave.capacity !==
        undefined &&
      !input.wave.capacity.feasible
    ) {
      warnings.push(
        "Dalga kapasite kontrolü uygun değildir.",
      );
    }

    return {
      readyForRelease:
        input.items.length > 0 &&
        shortItems.length === 0 &&
        activeTasks.length > 0 &&
        unresolvedExceptions.length ===
          0 &&
        (
          input.wave.capacity ===
            undefined ||
          input.wave.capacity.feasible
        ),
      warnings,
    };
  }

  private estimateTaskMinutes(
    allocation:
      WaveAllocation,
  ): number {
    return this.round(
      Math.max(
        1,
        1 +
          allocation
            .allocatedQuantity *
            0.15,
      ),
    );
  }

  private validatePlanningStatus(
    status: WaveStatus,
  ): void {
    const allowedStatuses =
      new Set<WaveStatus>([
        "draft",
        "planned",
        "capacity_checked",
        "exception",
        "paused",
      ]);

    if (
      !allowedStatuses.has(status)
    ) {
      throw new InventoryValidationError(
        `Dalga mevcut durumda yeniden planlanamaz: ${status}.`,
      );
    }
  }

  private validateTaskGenerationStatus(
    status: WaveStatus,
  ): void {
    const allowedStatuses =
      new Set<WaveStatus>([
        "planned",
        "capacity_checked",
        "ready",
        "exception",
      ]);

    if (
      !allowedStatuses.has(status)
    ) {
      throw new InventoryValidationError(
        `Dalga mevcut durumda görev üretimine uygun değildir: ${status}.`,
      );
    }
  }

  private async requireWave(
    tenantId: string,
    waveId: string,
  ): Promise<Wave> {
    const wave =
      await this.repository.findById(
        tenantId,
        waveId,
      );

    if (!wave) {
      throw new InventoryValidationError(
        `Dalga kaydı bulunamadı: ${waveId}`,
      );
    }

    return wave;
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

  private normalizeDate(
    value: string,
    fieldName: string,
  ): string {
    const timestamp =
      Date.parse(value);

    if (Number.isNaN(timestamp)) {
      throw new InventoryValidationError(
        `${fieldName} geçerli bir tarih olmalıdır.`,
      );
    }

    return new Date(
      timestamp,
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
