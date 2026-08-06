import type {
  Wave,
} from "../types/Wave";
import type {
  WaveAllocation,
} from "../types/WaveAllocation";
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
  WaveRelease,
  WaveReleaseStatus,
} from "../types/WaveRelease";
import type {
  WaveStatus,
} from "../types/WaveStatus";
import type {
  WaveTask,
} from "../types/WaveTask";
import type {
  WaveRepository,
} from "./WaveRepository";

export const WAVE_RELEASE_ACTIONS = [
  "request",
  "approve",
  "release",
  "pause",
  "resume",
  "complete",
  "cancel",
] as const;

export type WaveReleaseAction =
  (typeof WAVE_RELEASE_ACTIONS)[number];

export interface RequestWaveReleaseInput {
  readonly tenantId: string;
  readonly waveId: string;
  readonly requestedBy: string;
  readonly notes?: string;
}

export interface ApproveWaveReleaseInput {
  readonly tenantId: string;
  readonly waveId: string;
  readonly releaseId: string;
  readonly approvedBy: string;
  readonly notes?: string;
}

export interface ExecuteWaveReleaseInput {
  readonly tenantId: string;
  readonly waveId: string;
  readonly releaseId: string;
  readonly releasedBy: string;
  readonly allowPartial?: boolean;
  readonly allowUnapproved?: boolean;
  readonly notes?: string;
}

export interface PauseWaveInput {
  readonly tenantId: string;
  readonly waveId: string;
  readonly releaseId?: string;
  readonly pausedBy: string;
  readonly notes?: string;
}

export interface ResumeWaveInput {
  readonly tenantId: string;
  readonly waveId: string;
  readonly releaseId?: string;
  readonly resumedBy: string;
  readonly notes?: string;
}

export interface CompleteWaveInput {
  readonly tenantId: string;
  readonly waveId: string;
  readonly releaseId?: string;
  readonly completedBy: string;
  readonly allowPartial?: boolean;
  readonly notes?: string;
}

export interface CancelWaveInput {
  readonly tenantId: string;
  readonly waveId: string;
  readonly releaseId?: string;
  readonly cancelledBy: string;
  readonly reason: string;
  readonly notes?: string;
}

export interface WaveReleaseValidation {
  readonly valid: boolean;
  readonly capacityBlocked: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly orderCount: number;
  readonly releasableOrderCount: number;
  readonly itemCount: number;
  readonly fullyAllocatedItemCount: number;
  readonly partiallyAllocatedItemCount: number;
  readonly shortItemCount: number;
  readonly activeAllocationCount: number;
  readonly taskCount: number;
  readonly releasableTaskCount: number;
  readonly unresolvedExceptionCount: number;
  readonly checkedAt: string;
}

export interface WaveReleaseActionResult {
  readonly action: WaveReleaseAction;
  readonly success: boolean;
  readonly wave: Wave;
  readonly release: WaveRelease;
  readonly validation:
    WaveReleaseValidation | null;
  readonly changedOrderCount: number;
  readonly changedItemCount: number;
  readonly changedAllocationCount: number;
  readonly changedTaskCount: number;
  readonly warnings: readonly string[];
  readonly performedAt: string;
}

export interface WaveReleaseSummary {
  readonly releaseCount: number;
  readonly pendingCount: number;
  readonly approvedCount: number;
  readonly releasedCount: number;
  readonly partiallyReleasedCount: number;
  readonly pausedCount: number;
  readonly completedCount: number;
  readonly cancelledCount: number;
  readonly blockedCount: number;
  readonly latestRelease:
    WaveRelease | null;
}

export interface WaveReleaseServiceDependencies {
  readonly repository: WaveRepository;
  readonly now?: () => string;
  readonly idFactory?: () => string;
}

interface OperationalMutationResult {
  readonly changedOrderCount: number;
  readonly changedItemCount: number;
  readonly changedAllocationCount: number;
  readonly changedTaskCount: number;
}

export class WaveReleaseService {
  private readonly repository:
    WaveRepository;

  private readonly now: () => string;

  private readonly idFactory:
    () => string;

  constructor(
    dependencies:
      WaveReleaseServiceDependencies,
  ) {
    this.repository =
      dependencies.repository;

    this.now =
      dependencies.now ??
      (() => new Date().toISOString());

    this.idFactory =
      dependencies.idFactory ??
      (() =>
        `wave-release-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 12)}`);
  }

  async validate(
    tenantId: string,
    waveId: string,
  ): Promise<WaveReleaseValidation> {
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

    const checkedAt =
      this.normalizeDate(
        this.now(),
        "Serbest bırakma kontrol tarihi",
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
      this.repository.listAllocations(
        normalizedTenantId,
        normalizedWaveId,
      ),
      this.repository.listTasks(
        normalizedTenantId,
        normalizedWaveId,
      ),
      this.repository.listExceptions(
        normalizedTenantId,
        normalizedWaveId,
      ),
    ]);

    const errors: string[] = [];
    const warnings: string[] = [];

    const allowedStatuses =
      new Set<WaveStatus>([
        "planned",
        "capacity_checked",
        "ready",
        "exception",
        "paused",
      ]);

    if (!allowedStatuses.has(wave.status)) {
      errors.push(
        `Dalga mevcut durumda operasyona açılamaz: ${wave.status}.`,
      );
    }

    const capacityBlocked =
      wave.capacity !== undefined &&
      !wave.capacity.feasible;

    if (capacityBlocked) {
      errors.push(
        "Dalga kapasite kontrolü uygun değildir.",
      );

      errors.push(
        ...wave.capacity!.blockingReasons,
      );
    }

    if (orders.length === 0) {
      errors.push(
        "Dalgada sipariş bulunmuyor.",
      );
    }

    const releasableOrders =
      orders.filter(
        (order) =>
          order.status ===
            "eligible" ||
          order.status ===
            "allocated",
      );

    if (
      orders.length > 0 &&
      releasableOrders.length === 0
    ) {
      errors.push(
        "Dalgada operasyona açılabilir sipariş bulunmuyor.",
      );
    }

    if (items.length === 0) {
      errors.push(
        "Dalgada ürün satırı bulunmuyor.",
      );
    }

    const fullyAllocatedItems =
      items.filter(
        (item) =>
          item.allocatedQuantity >=
            item.requestedQuantity &&
          item.shortQuantity === 0,
      );

    const partiallyAllocatedItems =
      items.filter(
        (item) =>
          item.allocatedQuantity > 0 &&
          item.allocatedQuantity <
            item.requestedQuantity,
      );

    const shortItems =
      items.filter(
        (item) =>
          item.shortQuantity > 0 ||
          item.allocatedQuantity <
            item.requestedQuantity,
      );

    if (shortItems.length > 0) {
      errors.push(
        `${shortItems.length} dalga satırı tam olarak tahsis edilmemiştir.`,
      );
    }

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

    if (
      items.length > 0 &&
      activeAllocations.length === 0
    ) {
      errors.push(
        "Dalgada aktif stok tahsisi bulunmuyor.",
      );
    }

    const activeTasks =
      tasks.filter(
        (task) =>
          task.status !==
            "cancelled" &&
          task.status !==
            "completed",
      );

    const releasableTasks =
      activeTasks.filter(
        (task) =>
          task.status ===
            "pending" ||
          task.status ===
            "assigned",
      );

    if (activeTasks.length === 0) {
      errors.push(
        "Dalgada aktif toplama görevi bulunmuyor.",
      );
    } else if (
      releasableTasks.length === 0
    ) {
      errors.push(
        "Dalgada operasyona açılabilir görev bulunmuyor.",
      );
    }

    const unresolvedExceptions =
      exceptions.filter(
        (exception) =>
          !exception.resolved,
      );

    if (
      unresolvedExceptions.length > 0
    ) {
      errors.push(
        `${unresolvedExceptions.length} çözülmemiş dalga istisnası bulunmaktadır.`,
      );
    }

    if (
      wave.capacity === undefined
    ) {
      warnings.push(
        "Dalga için kapasite kontrolü kaydedilmemiştir.",
      );
    } else {
      warnings.push(
        ...wave.capacity.warnings,
      );
    }

    if (
      wave.status !== "ready"
    ) {
      warnings.push(
        `Dalga hazır durumunda değildir: ${wave.status}.`,
      );
    }

    if (
      partiallyAllocatedItems.length > 0
    ) {
      warnings.push(
        `${partiallyAllocatedItems.length} dalga satırı yalnızca kısmen tahsis edilmiştir.`,
      );
    }

    const tasksWithoutAssignment =
      activeTasks.filter(
        (task) =>
          task.assignedUserId ===
            undefined &&
          task.assignedTeamId ===
            undefined,
      );

    if (
      tasksWithoutAssignment.length > 0
    ) {
      warnings.push(
        `${tasksWithoutAssignment.length} görev henüz kullanıcıya veya ekibe atanmamıştır.`,
      );
    }

    return {
      valid: errors.length === 0,
      capacityBlocked,
      errors,
      warnings,
      orderCount: orders.length,
      releasableOrderCount:
        releasableOrders.length,
      itemCount: items.length,
      fullyAllocatedItemCount:
        fullyAllocatedItems.length,
      partiallyAllocatedItemCount:
        partiallyAllocatedItems.length,
      shortItemCount:
        shortItems.length,
      activeAllocationCount:
        activeAllocations.length,
      taskCount: activeTasks.length,
      releasableTaskCount:
        releasableTasks.length,
      unresolvedExceptionCount:
        unresolvedExceptions.length,
      checkedAt,
    };
  }

  async requestRelease(
    input: RequestWaveReleaseInput,
  ): Promise<WaveReleaseActionResult> {
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

    const requestedBy =
      this.requireText(
        input.requestedBy,
        "Talep eden kullanıcı",
      );

    await this.requireWave(
      tenantId,
      waveId,
    );

    const performedAt =
      this.normalizeDate(
        this.now(),
        "Serbest bırakma talep tarihi",
      );

    const validation =
      await this.validate(
        tenantId,
        waveId,
      );

    const status:
      WaveReleaseStatus =
        validation.capacityBlocked
          ? "capacity_blocked"
          : validation.valid
            ? "pending"
            : "validation_failed";

    const release:
      WaveRelease = {
      id: this.requireText(
        this.idFactory(),
        "Serbest bırakma kaydı kimliği",
      ),
      tenantId,
      waveId,
      status,
      requestedBy,
      requestedAt: performedAt,
      createdAt: performedAt,
      updatedAt: performedAt,
      ...this.optionalTextField(
        "notes",
        input.notes,
        "Serbest bırakma talep notu",
      ),
    };

    const savedRelease =
      await this.repository
        .saveRelease(release);

    const latestWave =
      await this.requireWave(
        tenantId,
        waveId,
      );

    return {
      action: "request",
      success: validation.valid,
      wave: latestWave,
      release: savedRelease,
      validation,
      changedOrderCount: 0,
      changedItemCount: 0,
      changedAllocationCount: 0,
      changedTaskCount: 0,
      warnings: [
        ...validation.warnings,
        ...validation.errors,
      ],
      performedAt,
    };
  }

  async approveRelease(
    input: ApproveWaveReleaseInput,
  ): Promise<WaveReleaseActionResult> {
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

    const releaseId =
      this.requireText(
        input.releaseId,
        "Serbest bırakma kaydı kimliği",
      );

    const approvedBy =
      this.requireText(
        input.approvedBy,
        "Onaylayan kullanıcı",
      );

    const release =
      await this.requireRelease(
        tenantId,
        waveId,
        releaseId,
      );

    if (release.status !== "pending") {
      throw new InventoryValidationError(
        `Serbest bırakma talebi mevcut durumda onaylanamaz: ${release.status}.`,
      );
    }

    const performedAt =
      this.normalizeDate(
        this.now(),
        "Serbest bırakma onay tarihi",
      );

    const validation =
      await this.validate(
        tenantId,
        waveId,
      );

    const nextStatus:
      WaveReleaseStatus =
        validation.capacityBlocked
          ? "capacity_blocked"
          : validation.valid
            ? "approved"
            : "validation_failed";

    const updatedRelease:
      WaveRelease = {
      ...release,
      status: nextStatus,
      updatedAt: performedAt,
      ...(validation.valid
        ? {
            approvedBy,
            approvedAt:
              performedAt,
          }
        : {}),
      ...this.mergeNotes(
        release.notes,
        input.notes,
      ),
    };

    const savedRelease =
      await this.repository
        .saveRelease(
          updatedRelease,
        );

    const latestWave =
      await this.requireWave(
        tenantId,
        waveId,
      );

    return {
      action: "approve",
      success:
        savedRelease.status ===
        "approved",
      wave: latestWave,
      release: savedRelease,
      validation,
      changedOrderCount: 0,
      changedItemCount: 0,
      changedAllocationCount: 0,
      changedTaskCount: 0,
      warnings: [
        ...validation.warnings,
        ...validation.errors,
      ],
      performedAt,
    };
  }

  async release(
    input: ExecuteWaveReleaseInput,
  ): Promise<WaveReleaseActionResult> {
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

    const releaseId =
      this.requireText(
        input.releaseId,
        "Serbest bırakma kaydı kimliği",
      );

    const releasedBy =
      this.requireText(
        input.releasedBy,
        "Operasyona açan kullanıcı",
      );

    const release =
      await this.requireRelease(
        tenantId,
        waveId,
        releaseId,
      );

    const statusAllowed =
      release.status === "approved" ||
      (
        input.allowUnapproved === true &&
        release.status === "pending"
      );

    if (!statusAllowed) {
      throw new InventoryValidationError(
        `Serbest bırakma kaydı mevcut durumda operasyona açılamaz: ${release.status}.`,
      );
    }

    const performedAt =
      this.normalizeDate(
        this.now(),
        "Dalga operasyona açılma tarihi",
      );

    const validation =
      await this.validate(
        tenantId,
        waveId,
      );

    const allowPartial =
      input.allowPartial === true;

    const blocked =
      validation.capacityBlocked ||
      (
        !validation.valid &&
        !allowPartial
      ) ||
      validation.releasableTaskCount ===
        0;

    if (blocked) {
      const failedStatus:
        WaveReleaseStatus =
          validation.capacityBlocked
            ? "capacity_blocked"
            : "validation_failed";

      const failedRelease:
        WaveRelease = {
        ...release,
        status: failedStatus,
        updatedAt: performedAt,
        ...this.mergeNotes(
          release.notes,
          input.notes,
        ),
      };

      const savedRelease =
        await this.repository
          .saveRelease(
            failedRelease,
          );

      const latestWave =
        await this.requireWave(
          tenantId,
          waveId,
        );

      return {
        action: "release",
        success: false,
        wave: latestWave,
        release: savedRelease,
        validation,
        changedOrderCount: 0,
        changedItemCount: 0,
        changedAllocationCount: 0,
        changedTaskCount: 0,
        warnings: [
          ...validation.warnings,
          ...validation.errors,
        ],
        performedAt,
      };
    }

    const mutation =
      await this.releaseOperationalRecords({
        tenantId,
        waveId,
        allowPartial,
        performedAt,
      });

    const nextReleaseStatus:
      WaveReleaseStatus =
        validation.valid
          ? "released"
          : "partially_released";

    const updatedRelease:
      WaveRelease = {
      ...release,
      status: nextReleaseStatus,
      releasedBy,
      releasedAt: performedAt,
      updatedAt: performedAt,
      ...this.mergeNotes(
        release.notes,
        input.notes,
      ),
    };

    const savedRelease =
      await this.repository
        .saveRelease(
          updatedRelease,
        );

    const currentWave =
      await this.requireWave(
        tenantId,
        waveId,
      );

    const allTasks =
      await this.repository.listTasks(
        tenantId,
        waveId,
      );

    const savedWave =
      await this.repository.save({
        ...currentWave,
        status: "released",
        releasedAt: performedAt,
        tasks: allTasks,
        updatedAt: performedAt,
      });

    return {
      action: "release",
      success: true,
      wave: savedWave,
      release: savedRelease,
      validation,
      ...mutation,
      warnings: [
        ...validation.warnings,
        ...(validation.valid
          ? []
          : [
              "Dalga kısmi serbest bırakma seçeneğiyle operasyona açılmıştır.",
              ...validation.errors,
            ]),
      ],
      performedAt,
    };
  }

  async pause(
    input: PauseWaveInput,
  ): Promise<WaveReleaseActionResult> {
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

    const pausedBy =
      this.requireText(
        input.pausedBy,
        "Dalgayı duraklatan kullanıcı",
      );

    const wave =
      await this.requireWave(
        tenantId,
        waveId,
      );

    const allowedStatuses =
      new Set<WaveStatus>([
        "released",
        "assigned",
        "in_progress",
        "partially_completed",
      ]);

    if (
      !allowedStatuses.has(
        wave.status,
      )
    ) {
      throw new InventoryValidationError(
        `Dalga mevcut durumda duraklatılamaz: ${wave.status}.`,
      );
    }

    const release =
      await this.resolveRelease({
        tenantId,
        waveId,
        ...(input.releaseId !==
        undefined
          ? {
              releaseId:
                input.releaseId,
            }
          : {}),
      });

    if (
      release.status !==
        "released" &&
      release.status !==
        "partially_released"
    ) {
      throw new InventoryValidationError(
        `Serbest bırakma kaydı mevcut durumda duraklatılamaz: ${release.status}.`,
      );
    }

    const performedAt =
      this.normalizeDate(
        this.now(),
        "Dalga duraklatma tarihi",
      );

    const updatedRelease:
      WaveRelease = {
      ...release,
      status: "paused",
      pausedBy,
      pausedAt: performedAt,
      updatedAt: performedAt,
      ...this.mergeNotes(
        release.notes,
        input.notes,
      ),
    };

    const savedRelease =
      await this.repository
        .saveRelease(
          updatedRelease,
        );

    const latestWave =
      await this.requireWave(
        tenantId,
        waveId,
      );

    const savedWave =
      await this.repository.save({
        ...latestWave,
        status: "paused",
        pausedAt: performedAt,
        updatedAt: performedAt,
      });

    return {
      action: "pause",
      success: true,
      wave: savedWave,
      release: savedRelease,
      validation: null,
      changedOrderCount: 0,
      changedItemCount: 0,
      changedAllocationCount: 0,
      changedTaskCount: 0,
      warnings: [],
      performedAt,
    };
  }

  async resume(
    input: ResumeWaveInput,
  ): Promise<WaveReleaseActionResult> {
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

    const resumedBy =
      this.requireText(
        input.resumedBy,
        "Dalgayı devam ettiren kullanıcı",
      );

    const wave =
      await this.requireWave(
        tenantId,
        waveId,
      );

    if (wave.status !== "paused") {
      throw new InventoryValidationError(
        `Yalnızca duraklatılmış dalga devam ettirilebilir: ${wave.status}.`,
      );
    }

    const release =
      await this.resolveRelease({
        tenantId,
        waveId,
        ...(input.releaseId !==
        undefined
          ? {
              releaseId:
                input.releaseId,
            }
          : {}),
      });

    if (release.status !== "paused") {
      throw new InventoryValidationError(
        `Serbest bırakma kaydı duraklatılmış durumda değildir: ${release.status}.`,
      );
    }

    const performedAt =
      this.normalizeDate(
        this.now(),
        "Dalga devam ettirme tarihi",
      );

    const updatedRelease:
      WaveRelease = {
      ...release,
      status: "released",
      resumedBy,
      resumedAt: performedAt,
      updatedAt: performedAt,
      ...this.mergeNotes(
        release.notes,
        input.notes,
      ),
    };

    const savedRelease =
      await this.repository
        .saveRelease(
          updatedRelease,
        );

    const latestWave =
      await this.requireWave(
        tenantId,
        waveId,
      );

    const savedWave =
      await this.repository.save({
        ...latestWave,
        status: "released",
        updatedAt: performedAt,
      });

    return {
      action: "resume",
      success: true,
      wave: savedWave,
      release: savedRelease,
      validation: null,
      changedOrderCount: 0,
      changedItemCount: 0,
      changedAllocationCount: 0,
      changedTaskCount: 0,
      warnings: [],
      performedAt,
    };
  }

  async complete(
    input: CompleteWaveInput,
  ): Promise<WaveReleaseActionResult> {
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

    this.requireText(
      input.completedBy,
      "Dalgayı tamamlayan kullanıcı",
    );

    const wave =
      await this.requireWave(
        tenantId,
        waveId,
      );

    const allowedStatuses =
      new Set<WaveStatus>([
        "released",
        "assigned",
        "in_progress",
        "partially_completed",
        "paused",
      ]);

    if (
      !allowedStatuses.has(
        wave.status,
      )
    ) {
      throw new InventoryValidationError(
        `Dalga mevcut durumda tamamlanamaz: ${wave.status}.`,
      );
    }

    const release =
      await this.resolveRelease({
        tenantId,
        waveId,
        ...(input.releaseId !==
        undefined
          ? {
              releaseId:
                input.releaseId,
            }
          : {}),
      });

    const tasks =
      await this.repository.listTasks(
        tenantId,
        waveId,
      );

    const activeTasks =
      tasks.filter(
        (task) =>
          task.status !==
          "cancelled",
      );

    const completedTaskCount =
      activeTasks.filter(
        (task) =>
          task.status ===
          "completed",
      ).length;

    const fullyCompleted =
      activeTasks.length > 0 &&
      completedTaskCount ===
        activeTasks.length;

    if (
      !fullyCompleted &&
      input.allowPartial !== true
    ) {
      throw new InventoryValidationError(
        `Dalga görevlerinin tamamı bitirilmemiştir: ${completedTaskCount}/${activeTasks.length}.`,
      );
    }

    const performedAt =
      this.normalizeDate(
        this.now(),
        "Dalga tamamlanma tarihi",
      );

    const waveStatus:
      WaveStatus =
        fullyCompleted
          ? "completed"
          : "partially_completed";

    const releaseStatus:
      WaveReleaseStatus =
        fullyCompleted
          ? "completed"
          : "partially_released";

    const updatedRelease:
      WaveRelease = {
      ...release,
      status: releaseStatus,
      updatedAt: performedAt,
      ...this.mergeNotes(
        release.notes,
        input.notes,
      ),
    };

    const savedRelease =
      await this.repository
        .saveRelease(
          updatedRelease,
        );

    const latestWave =
      await this.requireWave(
        tenantId,
        waveId,
      );

    const savedWave =
      await this.repository.save({
        ...latestWave,
        status: waveStatus,
        updatedAt: performedAt,
        ...(fullyCompleted
          ? {
              completedAt:
                performedAt,
            }
          : {}),
      });

    return {
      action: "complete",
      success: true,
      wave: savedWave,
      release: savedRelease,
      validation: null,
      changedOrderCount: 0,
      changedItemCount: 0,
      changedAllocationCount: 0,
      changedTaskCount: 0,
      warnings:
        fullyCompleted
          ? []
          : [
              `Dalga kısmi olarak tamamlandı: ${completedTaskCount}/${activeTasks.length} görev.`,
            ],
      performedAt,
    };
  }

  async cancel(
    input: CancelWaveInput,
  ): Promise<WaveReleaseActionResult> {
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

    const cancelledBy =
      this.requireText(
        input.cancelledBy,
        "Dalgayı iptal eden kullanıcı",
      );

    const reason =
      this.requireText(
        input.reason,
        "İptal nedeni",
      );

    const wave =
      await this.requireWave(
        tenantId,
        waveId,
      );

    if (
      wave.status === "completed" ||
      wave.status === "cancelled"
    ) {
      throw new InventoryValidationError(
        `Dalga mevcut durumda iptal edilemez: ${wave.status}.`,
      );
    }

    const performedAt =
      this.normalizeDate(
        this.now(),
        "Dalga iptal tarihi",
      );

    let release:
      WaveRelease;

    if (input.releaseId !== undefined) {
      release =
        await this.requireRelease(
          tenantId,
          waveId,
          this.requireText(
            input.releaseId,
            "Serbest bırakma kaydı kimliği",
          ),
        );
    } else {
      const latest =
        await this.findLatestRelease(
          tenantId,
          waveId,
        );

      release =
        latest ?? {
          id: this.requireText(
            this.idFactory(),
            "Serbest bırakma kaydı kimliği",
          ),
          tenantId,
          waveId,
          status: "cancelled",
          requestedBy: cancelledBy,
          requestedAt: performedAt,
          createdAt: performedAt,
          updatedAt: performedAt,
        };
    }

    const mutation =
      await this.cancelOperationalRecords({
        tenantId,
        waveId,
        performedAt,
      });

    const updatedRelease:
      WaveRelease = {
      ...release,
      status: "cancelled",
      cancellationReason: reason,
      updatedAt: performedAt,
      ...this.mergeNotes(
        release.notes,
        input.notes,
      ),
    };

    const savedRelease =
      await this.repository
        .saveRelease(
          updatedRelease,
        );

    const currentWave =
      await this.requireWave(
        tenantId,
        waveId,
      );

    const allTasks =
      await this.repository.listTasks(
        tenantId,
        waveId,
      );

    const savedWave =
      await this.repository.save({
        ...currentWave,
        status: "cancelled",
        cancelledAt: performedAt,
        cancellationReason: reason,
        tasks: allTasks,
        updatedAt: performedAt,
      });

    return {
      action: "cancel",
      success: true,
      wave: savedWave,
      release: savedRelease,
      validation: null,
      ...mutation,
      warnings: [],
      performedAt,
    };
  }

  async summarize(
    tenantId: string,
    waveId: string,
  ): Promise<WaveReleaseSummary> {
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

    await this.requireWave(
      normalizedTenantId,
      normalizedWaveId,
    );

    const releases =
      await this.repository
        .listReleases(
          normalizedTenantId,
          normalizedWaveId,
        );

    const countByStatus =
      (
        status: WaveReleaseStatus,
      ): number =>
        releases.filter(
          (release) =>
            release.status === status,
        ).length;

    return {
      releaseCount: releases.length,
      pendingCount:
        countByStatus("pending"),
      approvedCount:
        countByStatus("approved"),
      releasedCount:
        countByStatus("released"),
      partiallyReleasedCount:
        countByStatus(
          "partially_released",
        ),
      pausedCount:
        countByStatus("paused"),
      completedCount:
        countByStatus("completed"),
      cancelledCount:
        countByStatus("cancelled"),
      blockedCount:
        countByStatus(
          "capacity_blocked",
        ) +
        countByStatus(
          "validation_failed",
        ),
      latestRelease:
        this.selectLatestRelease(
          releases,
        ),
    };
  }

  private async releaseOperationalRecords(
    input: {
      tenantId: string;
      waveId: string;
      allowPartial: boolean;
      performedAt: string;
    },
  ): Promise<OperationalMutationResult> {
    const [
      orders,
      items,
      allocations,
      tasks,
    ] = await Promise.all([
      this.repository.listOrders(
        input.tenantId,
        input.waveId,
      ),
      this.repository.listItems(
        input.tenantId,
        input.waveId,
      ),
      this.repository.listAllocations(
        input.tenantId,
        input.waveId,
      ),
      this.repository.listTasks(
        input.tenantId,
        input.waveId,
      ),
    ]);

    let changedOrderCount = 0;
    let changedItemCount = 0;
    let changedAllocationCount = 0;
    let changedTaskCount = 0;

    for (const order of orders) {
      if (
        order.status !== "eligible" &&
        order.status !== "allocated"
      ) {
        continue;
      }

      const updatedOrder:
        WaveOrder = {
        ...order,
        status: "released",
        releasedAt:
          input.performedAt,
        updatedAt:
          input.performedAt,
      };

      await this.repository
        .saveOrder(updatedOrder);

      changedOrderCount += 1;
    }

    for (const item of items) {
      const fullyAllocated =
        item.allocatedQuantity >=
          item.requestedQuantity &&
        item.shortQuantity === 0;

      const partiallyAllocated =
        input.allowPartial &&
        item.allocatedQuantity > 0;

      if (
        !fullyAllocated &&
        !partiallyAllocated
      ) {
        continue;
      }

      if (
        item.status !== "allocated" &&
        item.status !== "short"
      ) {
        continue;
      }

      const updatedItem:
        WaveItem = {
        ...item,
        status: "released",
        releasedAt:
          input.performedAt,
        updatedAt:
          input.performedAt,
      };

      await this.repository
        .saveItem(updatedItem);

      changedItemCount += 1;
    }

    for (
      const allocation
      of allocations
    ) {
      if (
        allocation.status !==
          "planned" &&
        allocation.status !==
          "reserved"
      ) {
        continue;
      }

      const updatedAllocation:
        WaveAllocation = {
        ...allocation,
        status: "released",
        releasedAt:
          input.performedAt,
        updatedAt:
          input.performedAt,
      };

      await this.repository
        .saveAllocation(
          updatedAllocation,
        );

      changedAllocationCount += 1;
    }

    for (const task of tasks) {
      if (
        task.status !== "pending" &&
        task.status !== "assigned"
      ) {
        continue;
      }

      const updatedTask:
        WaveTask = {
        ...task,
        releasedAt:
          task.releasedAt ??
          input.performedAt,
        updatedAt:
          input.performedAt,
      };

      await this.repository
        .saveTask(updatedTask);

      changedTaskCount += 1;
    }

    return {
      changedOrderCount,
      changedItemCount,
      changedAllocationCount,
      changedTaskCount,
    };
  }

  private async cancelOperationalRecords(
    input: {
      tenantId: string;
      waveId: string;
      performedAt: string;
    },
  ): Promise<OperationalMutationResult> {
    const [
      orders,
      items,
      allocations,
      tasks,
    ] = await Promise.all([
      this.repository.listOrders(
        input.tenantId,
        input.waveId,
      ),
      this.repository.listItems(
        input.tenantId,
        input.waveId,
      ),
      this.repository.listAllocations(
        input.tenantId,
        input.waveId,
      ),
      this.repository.listTasks(
        input.tenantId,
        input.waveId,
      ),
    ]);

    let changedOrderCount = 0;
    let changedItemCount = 0;
    let changedAllocationCount = 0;
    let changedTaskCount = 0;

    for (const order of orders) {
      if (
        order.status === "completed" ||
        order.status === "removed"
      ) {
        continue;
      }

      await this.repository.saveOrder({
        ...order,
        status: "removed",
        updatedAt:
          input.performedAt,
      });

      changedOrderCount += 1;
    }

    for (const item of items) {
      if (
        item.status === "picked" ||
        item.status === "cancelled"
      ) {
        continue;
      }

      await this.repository.saveItem({
        ...item,
        status: "cancelled",
        updatedAt:
          input.performedAt,
      });

      changedItemCount += 1;
    }

    for (
      const allocation
      of allocations
    ) {
      if (
        allocation.status ===
          "completed" ||
        allocation.status ===
          "cancelled"
      ) {
        continue;
      }

      await this.repository
        .saveAllocation({
          ...allocation,
          status: "cancelled",
          updatedAt:
            input.performedAt,
        });

      changedAllocationCount += 1;
    }

    for (const task of tasks) {
      if (
        task.status === "completed" ||
        task.status === "cancelled"
      ) {
        continue;
      }

      await this.repository.saveTask({
        ...task,
        status: "cancelled",
        updatedAt:
          input.performedAt,
      });

      changedTaskCount += 1;
    }

    return {
      changedOrderCount,
      changedItemCount,
      changedAllocationCount,
      changedTaskCount,
    };
  }

  private async resolveRelease(
    input: {
      tenantId: string;
      waveId: string;
      releaseId?: string;
    },
  ): Promise<WaveRelease> {
    if (input.releaseId !== undefined) {
      return this.requireRelease(
        input.tenantId,
        input.waveId,
        this.requireText(
          input.releaseId,
          "Serbest bırakma kaydı kimliği",
        ),
      );
    }

    const latest =
      await this.findLatestRelease(
        input.tenantId,
        input.waveId,
      );

    if (!latest) {
      throw new InventoryValidationError(
        "Dalga için serbest bırakma kaydı bulunamadı.",
      );
    }

    return latest;
  }

  private async requireRelease(
    tenantId: string,
    waveId: string,
    releaseId: string,
  ): Promise<WaveRelease> {
    const releases =
      await this.repository
        .listReleases(
          tenantId,
          waveId,
        );

    const release =
      releases.find(
        (current) =>
          current.id === releaseId,
      );

    if (!release) {
      throw new InventoryValidationError(
        `Serbest bırakma kaydı bulunamadı: ${releaseId}`,
      );
    }

    return release;
  }

  private async findLatestRelease(
    tenantId: string,
    waveId: string,
  ): Promise<WaveRelease | null> {
    const releases =
      await this.repository
        .listReleases(
          tenantId,
          waveId,
        );

    return this.selectLatestRelease(
      releases,
    );
  }

  private selectLatestRelease(
    releases:
      readonly WaveRelease[],
  ): WaveRelease | null {
    const latest =
      [...releases].sort(
        (left, right) =>
          right.updatedAt.localeCompare(
            left.updatedAt,
          ) ||
          right.createdAt.localeCompare(
            left.createdAt,
          ),
      )[0];

    return latest
      ? structuredClone(latest)
      : null;
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

  private mergeNotes(
    existing: string | undefined,
    incoming: string | undefined,
  ): { notes?: string } {
    const normalizedIncoming =
      this.normalizeOptionalText(
        incoming,
        "İşlem notu",
      );

    if (
      normalizedIncoming ===
      undefined
    ) {
      return existing === undefined
        ? {}
        : { notes: existing };
    }

    if (existing === undefined) {
      return {
        notes: normalizedIncoming,
      };
    }

    return {
      notes:
        `${existing}\n${normalizedIncoming}`,
    };
  }

  private optionalTextField<
    Key extends string,
  >(
    key: Key,
    value: unknown,
    fieldName: string,
  ): Partial<Record<Key, string>> {
    const normalized =
      this.normalizeOptionalText(
        value,
        fieldName,
      );

    if (normalized === undefined) {
      return {};
    }

    return {
      [key]: normalized,
    } as Record<Key, string>;
  }

  private normalizeOptionalText(
    value: unknown,
    fieldName: string,
  ): string | undefined {
    if (
      value === undefined ||
      value === null
    ) {
      return undefined;
    }

    if (typeof value !== "string") {
      throw new InventoryValidationError(
        `${fieldName} metin olmalıdır.`,
      );
    }

    const normalized =
      value.trim();

    return normalized || undefined;
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
}
