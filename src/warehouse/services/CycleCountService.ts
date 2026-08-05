import type {
  CreateCycleCountInput,
  CycleCount,
  CycleCountListFilter,
} from "../types/CycleCount";
import type {
  ConfirmCycleCountItemInput,
  CreateCycleCountItemInput,
  CycleCountItem,
  RecountCycleCountItemInput,
} from "../types/CycleCountItem";
import type {
  CycleCountException,
  CycleCountExceptionType,
} from "../types/CycleCountException";
import type {
  CycleCountResult,
} from "../types/CycleCountResult";
import type {
  CreateCycleCountTaskInput,
  CycleCountTask,
} from "../types/CycleCountTask";
import {
  InventoryValidationError,
} from "../types/InventoryErrors";
import type {
  CycleCountRepository,
} from "./CycleCountRepository";
import type {
  CycleCountVarianceService,
} from "./CycleCountVarianceService";
import type {
  CycleCountAccuracyService,
} from "./CycleCountAccuracyService";
import type {
  CycleCountAdjustmentService,
} from "./CycleCountAdjustmentService";
import type {
  CycleCountPlanningService,
} from "./CycleCountPlanningService";
import {
  validateConfirmCycleCountItem,
  validateCreateCycleCount,
  validateCreateCycleCountItem,
  validateCreateCycleCountTask,
  validateRecountCycleCountItem,
} from "./CycleCountValidator";

export interface CycleCountServiceDependencies {
  repository: CycleCountRepository;
  varianceService: CycleCountVarianceService;
  accuracyService: CycleCountAccuracyService;
  adjustmentService: CycleCountAdjustmentService;
  planningService: CycleCountPlanningService;
  createId?: () => string;
  now?: () => string;
  sequence?: () => number;
}

let internalIdSequence = 0;
let internalNumberSequence = 0;

export class CycleCountService {
  private readonly repository:
    CycleCountRepository;

  private readonly varianceService:
    CycleCountVarianceService;

  private readonly accuracyService:
    CycleCountAccuracyService;

  private readonly adjustmentService:
    CycleCountAdjustmentService;

  private readonly planningService:
    CycleCountPlanningService;

  private readonly createId: () => string;

  private readonly now: () => string;

  private readonly sequence: () => number;

  constructor(
    dependencies:
      CycleCountServiceDependencies,
  ) {
    this.repository =
      dependencies.repository;

    this.varianceService =
      dependencies.varianceService;

    this.accuracyService =
      dependencies.accuracyService;

    this.adjustmentService =
      dependencies.adjustmentService;

    this.planningService =
      dependencies.planningService;

    this.createId =
      dependencies.createId ??
      (() =>
        `cycle-count-${String(
          ++internalIdSequence,
        ).padStart(6, "0")}`);

    this.now =
      dependencies.now ??
      (() => new Date().toISOString());

    this.sequence =
      dependencies.sequence ??
      (() => ++internalNumberSequence);
  }

  async create(
    input: CreateCycleCountInput,
  ): Promise<CycleCount> {
    const normalized =
      validateCreateCycleCount(input);

    if (
      normalized.referenceType !==
        undefined &&
      normalized.referenceId !==
        undefined
    ) {
      const existing =
        await this.repository
          .findByReference(
            normalized.tenantId,
            normalized.referenceType,
            normalized.referenceId,
          );

      if (existing) {
        throw new InventoryValidationError(
          "Bu referans için daha önce döngüsel sayım oluşturulmuş.",
        );
      }
    }

    if (
      normalized.ruleId !== undefined
    ) {
      const rule =
        await this.repository
          .findRuleById(
            normalized.tenantId,
            normalized.ruleId,
          );

      if (!rule) {
        throw new InventoryValidationError(
          "Sayım emrine bağlı kural bulunamadı.",
        );
      }

      if (!rule.active) {
        throw new InventoryValidationError(
          "Pasif sayım kuralıyla sayım emri oluşturulamaz.",
        );
      }
    }

    if (
      normalized.scheduleId !==
      undefined
    ) {
      const schedule =
        await this.repository
          .findScheduleById(
            normalized.tenantId,
            normalized.scheduleId,
          );

      if (!schedule) {
        throw new InventoryValidationError(
          "Sayım emrine bağlı plan bulunamadı.",
        );
      }

      if (
        schedule.status !== "active"
      ) {
        throw new InventoryValidationError(
          "Yalnızca aktif sayım planından sayım emri oluşturulabilir.",
        );
      }
    }

    const timestamp = this.now();

    return this.repository.save({
      id: this.createId(),
      tenantId:
        normalized.tenantId,
      cycleCountNumber:
        this.generateCycleCountNumber(
          timestamp,
        ),
      warehouseId:
        normalized.warehouseId,
      strategy:
        normalized.strategy,
      status: normalized.plannedAt
        ? "planned"
        : "draft",
      blindCount:
        normalized.blindCount ??
        false,
      freezeInventory:
        normalized.freezeInventory ??
        false,
      priority:
        normalized.priority ?? 50,
      items: [],
      results: [],
      adjustments: [],
      approvals: [],
      exceptions: [],
      createdBy:
        normalized.createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(normalized.ruleId !==
      undefined
        ? { ruleId: normalized.ruleId }
        : {}),
      ...(normalized.scheduleId !==
      undefined
        ? {
            scheduleId:
              normalized.scheduleId,
          }
        : {}),
      ...(normalized.referenceType !==
      undefined
        ? {
            referenceType:
              normalized.referenceType,
          }
        : {}),
      ...(normalized.referenceId !==
      undefined
        ? {
            referenceId:
              normalized.referenceId,
          }
        : {}),
      ...(normalized.referenceNumber !==
      undefined
        ? {
            referenceNumber:
              normalized.referenceNumber,
          }
        : {}),
      ...(normalized.toleranceQuantity !==
      undefined
        ? {
            toleranceQuantity:
              normalized.toleranceQuantity,
          }
        : {}),
      ...(normalized.tolerancePercentage !==
      undefined
        ? {
            tolerancePercentage:
              normalized.tolerancePercentage,
          }
        : {}),
      ...(normalized.plannedAt !==
      undefined
        ? {
            plannedAt:
              normalized.plannedAt,
          }
        : {}),
      ...(normalized.notes !== undefined
        ? { notes: normalized.notes }
        : {}),
    });
  }

  async get(
    tenantId: string,
    cycleCountId: string,
  ): Promise<CycleCount> {
    const normalizedTenantId =
      this.requireText(
        tenantId,
        "Firma kimliği",
      );

    const normalizedCycleCountId =
      this.requireText(
        cycleCountId,
        "Sayım kimliği",
      );

    const cycleCount =
      await this.repository.findById(
        normalizedTenantId,
        normalizedCycleCountId,
      );

    if (!cycleCount) {
      throw new InventoryValidationError(
        `Döngüsel sayım kaydı bulunamadı: ${normalizedCycleCountId}`,
      );
    }

    return cycleCount;
  }

  async getByNumber(
    tenantId: string,
    cycleCountNumber: string,
  ): Promise<CycleCount> {
    const normalizedTenantId =
      this.requireText(
        tenantId,
        "Firma kimliği",
      );

    const normalizedNumber =
      this.requireText(
        cycleCountNumber,
        "Sayım numarası",
      );

    const cycleCount =
      await this.repository.findByNumber(
        normalizedTenantId,
        normalizedNumber,
      );

    if (!cycleCount) {
      throw new InventoryValidationError(
        `Döngüsel sayım kaydı bulunamadı: ${normalizedNumber}`,
      );
    }

    return cycleCount;
  }

  async list(
    filter: CycleCountListFilter,
  ): Promise<CycleCount[]> {
    return this.repository.list({
      ...filter,
      tenantId: this.requireText(
        filter.tenantId,
        "Firma kimliği",
      ),
    });
  }

  async addItem(
    input: CreateCycleCountItemInput,
  ): Promise<CycleCountItem> {
    const normalized =
      validateCreateCycleCountItem(input);

    const cycleCount =
      await this.get(
        normalized.tenantId,
        normalized.cycleCountId,
      );

    if (
      cycleCount.status !== "draft" &&
      cycleCount.status !== "planned"
    ) {
      throw new InventoryValidationError(
        "Sayım satırı yalnızca taslak veya planlanmış sayıma eklenebilir.",
      );
    }

    if (
      cycleCount.warehouseId !==
      normalized.warehouseId
    ) {
      throw new InventoryValidationError(
        "Sayım satırının deposu sayım emri deposuyla uyuşmuyor.",
      );
    }

    const duplicate =
      cycleCount.items.find(
        (item) =>
          item.locationId ===
            normalized.locationId &&
          item.productId ===
            normalized.productId &&
          item.skuId ===
            normalized.skuId &&
          this.trackingKey(
            item.tracking,
          ) ===
            this.trackingKey(
              normalized.tracking,
            ),
      );

    if (duplicate) {
      throw new InventoryValidationError(
        "Aynı lokasyon, ürün ve takip bilgisi için sayım satırı zaten bulunmaktadır.",
      );
    }

    const timestamp = this.now();

    return this.repository.saveItem({
      id: this.createId(),
      tenantId:
        cycleCount.tenantId,
      cycleCountId:
        cycleCount.id,
      lineNumber:
        cycleCount.items.length + 1,
      warehouseId:
        normalized.warehouseId,
      locationId:
        normalized.locationId,
      productId:
        normalized.productId,
      unit: normalized.unit,
      status: "pending",
      blindCount:
        normalized.blindCount ??
        cycleCount.blindCount,
      expectedQuantity:
        normalized.expectedQuantity,
      damagedQuantity: 0,
      recountRequired: false,
      adjustmentRequired: false,
      createdBy:
        normalized.createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(normalized.skuId !==
      undefined
        ? { skuId: normalized.skuId }
        : {}),
      ...(normalized.inventoryBalanceId !==
      undefined
        ? {
            inventoryBalanceId:
              normalized.inventoryBalanceId,
          }
        : {}),
      ...(normalized.stockStatus !==
      undefined
        ? {
            stockStatus:
              normalized.stockStatus,
          }
        : {}),
      ...(normalized.tracking !==
      undefined
        ? {
            tracking:
              normalized.tracking,
          }
        : {}),
      ...(normalized.unitCost !==
      undefined
        ? {
            unitCost:
              normalized.unitCost,
          }
        : {}),
      ...(normalized.currency !==
      undefined
        ? {
            currency:
              normalized.currency,
          }
        : {}),
      ...(normalized.toleranceQuantity !==
      undefined
        ? {
            toleranceQuantity:
              normalized.toleranceQuantity,
          }
        : cycleCount.toleranceQuantity !==
          undefined
          ? {
              toleranceQuantity:
                cycleCount
                  .toleranceQuantity,
            }
          : {}),
      ...(normalized.tolerancePercentage !==
      undefined
        ? {
            tolerancePercentage:
              normalized
                .tolerancePercentage,
          }
        : cycleCount
              .tolerancePercentage !==
            undefined
          ? {
              tolerancePercentage:
                cycleCount
                  .tolerancePercentage,
            }
          : {}),
      ...(normalized.notes !== undefined
        ? { notes: normalized.notes }
        : {}),
    });
  }

  async release(input: {
    tenantId: string;
    cycleCountId: string;
    releasedBy: string;
  }): Promise<CycleCount> {
    const cycleCount =
      await this.get(
        input.tenantId,
        input.cycleCountId,
      );

    this.requireText(
      input.releasedBy,
      "Sayıma açan kullanıcı",
    );

    if (
      cycleCount.status !== "draft" &&
      cycleCount.status !== "planned"
    ) {
      throw new InventoryValidationError(
        "Yalnızca taslak veya planlanmış sayım sayıma açılabilir.",
      );
    }

    if (cycleCount.items.length === 0) {
      throw new InventoryValidationError(
        "Satırı bulunmayan sayım emri sayıma açılamaz.",
      );
    }

    const timestamp = this.now();

    return this.repository.save({
      ...cycleCount,
      status: "released",
      releasedAt: timestamp,
      updatedAt: timestamp,
    });
  }

  async createTask(
    input: CreateCycleCountTaskInput,
  ): Promise<CycleCountTask> {
    const normalized =
      validateCreateCycleCountTask(
        input,
      );

    const cycleCount =
      await this.get(
        normalized.tenantId,
        normalized.cycleCountId,
      );

    if (
      cycleCount.status !== "released" &&
      cycleCount.status !== "assigned"
    ) {
      throw new InventoryValidationError(
        "Sayım görevi yalnızca sayıma açılmış veya görev atanmış sayımda oluşturulabilir.",
      );
    }

    if (
      cycleCount.warehouseId !==
      normalized.warehouseId
    ) {
      throw new InventoryValidationError(
        "Görev deposu sayım emri deposuyla uyuşmuyor.",
      );
    }

    if (
      normalized.cycleCountItemId !==
      undefined &&
      !cycleCount.items.some(
        (item) =>
          item.id ===
          normalized.cycleCountItemId,
      )
    ) {
      throw new InventoryValidationError(
        "Göreve bağlı sayım satırı bulunamadı.",
      );
    }

    const timestamp = this.now();

    const task =
      await this.repository.saveTask({
        id: this.createId(),
        tenantId:
          cycleCount.tenantId,
        cycleCountId:
          cycleCount.id,
        warehouseId:
          cycleCount.warehouseId,
        type: normalized.type,
        status:
          normalized.assignedUserId !==
            undefined ||
          normalized.assignedTeamId !==
            undefined
            ? "assigned"
            : "pending",
        priority:
          normalized.priority ?? 50,
        sequence:
          normalized.sequence ?? 1,
        createdBy:
          normalized.createdBy,
        createdAt: timestamp,
        updatedAt: timestamp,
        ...(normalized.cycleCountItemId !==
        undefined
          ? {
              cycleCountItemId:
                normalized
                  .cycleCountItemId,
            }
          : {}),
        ...(normalized.locationId !==
        undefined
          ? {
              locationId:
                normalized.locationId,
            }
          : {}),
        ...(normalized.productId !==
        undefined
          ? {
              productId:
                normalized.productId,
            }
          : {}),
        ...(normalized.assignedUserId !==
        undefined
          ? {
              assignedUserId:
                normalized
                  .assignedUserId,
            }
          : {}),
        ...(normalized.assignedTeamId !==
        undefined
          ? {
              assignedTeamId:
                normalized
                  .assignedTeamId,
            }
          : {}),
        ...(normalized
          .assignedEquipmentId !==
        undefined
          ? {
              assignedEquipmentId:
                normalized
                  .assignedEquipmentId,
            }
          : {}),
        ...(normalized.plannedAt !==
        undefined
          ? {
              plannedAt:
                normalized.plannedAt,
            }
          : {}),
        ...(normalized.notes !== undefined
          ? { notes: normalized.notes }
          : {}),
      });

    if (
      cycleCount.status === "released"
    ) {
      await this.repository.save({
        ...cycleCount,
        status: "assigned",
        updatedAt: timestamp,
      });
    }

    if (
      normalized.cycleCountItemId !==
      undefined
    ) {
      const item =
        cycleCount.items.find(
          (current) =>
            current.id ===
            normalized
              .cycleCountItemId,
        );

      if (item) {
        await this.repository.saveItem({
          ...item,
          status: "assigned",
          updatedAt: timestamp,
        });
      }
    }

    return task;
  }

  async start(input: {
    tenantId: string;
    cycleCountId: string;
    startedBy: string;
  }): Promise<CycleCount> {
    const cycleCount =
      await this.get(
        input.tenantId,
        input.cycleCountId,
      );

    this.requireText(
      input.startedBy,
      "Sayımı başlatan kullanıcı",
    );

    if (
      cycleCount.status !== "released" &&
      cycleCount.status !== "assigned"
    ) {
      throw new InventoryValidationError(
        "Sayım yalnızca sayıma açılmış veya görev atanmış durumdayken başlatılabilir.",
      );
    }

    const tasks =
      await this.repository.listTasks(
        cycleCount.tenantId,
        cycleCount.id,
      );

    if (tasks.length === 0) {
      throw new InventoryValidationError(
        "Sayım görevi oluşturulmadan sayım başlatılamaz.",
      );
    }

    if (
      !tasks.some(
        (task) =>
          task.status === "assigned" ||
          task.status ===
            "in_progress",
      )
    ) {
      throw new InventoryValidationError(
        "Sayımı başlatmak için atanmış en az bir görev gereklidir.",
      );
    }

    const timestamp = this.now();

    await this.repository.save({
      ...cycleCount,
      status: "in_progress",
      startedAt: timestamp,
      updatedAt: timestamp,
    });

    for (const task of tasks) {
      if (task.status === "assigned") {
        await this.repository.saveTask({
          ...task,
          status: "in_progress",
          startedAt:
            task.startedAt ??
            timestamp,
          updatedAt: timestamp,
        });
      }
    }

    for (
      const item
      of cycleCount.items
    ) {
      if (
        item.status === "pending" ||
        item.status === "assigned"
      ) {
        await this.repository.saveItem({
          ...item,
          status: "in_progress",
          updatedAt: timestamp,
        });
      }
    }

    return this.get(
      cycleCount.tenantId,
      cycleCount.id,
    );
  }

  async listItems(
    tenantId: string,
    cycleCountId: string,
  ): Promise<CycleCountItem[]> {
    await this.get(
      tenantId,
      cycleCountId,
    );

    return this.repository.listItems(
      tenantId,
      cycleCountId,
    );
  }

  async listTasks(
    tenantId: string,
    cycleCountId: string,
  ): Promise<CycleCountTask[]> {
    await this.get(
      tenantId,
      cycleCountId,
    );

    return this.repository.listTasks(
      tenantId,
      cycleCountId,
    );
  }

  async listResults(
    tenantId: string,
    cycleCountId: string,
  ): Promise<CycleCountResult[]> {
    await this.get(
      tenantId,
      cycleCountId,
    );

    return this.repository.listResults(
      tenantId,
      cycleCountId,
    );
  }

  async listExceptions(
    tenantId: string,
    cycleCountId: string,
  ): Promise<CycleCountException[]> {
    await this.get(
      tenantId,
      cycleCountId,
    );

    return this.repository.listExceptions(
      tenantId,
      cycleCountId,
    );
  }

  async confirmItem(
    input: ConfirmCycleCountItemInput,
  ): Promise<CycleCountItem> {
    const normalized =
      validateConfirmCycleCountItem(
        input,
      );

    const cycleCount =
      await this.get(
        normalized.tenantId,
        normalized.cycleCountId,
      );

    if (
      cycleCount.status !==
      "in_progress"
    ) {
      throw new InventoryValidationError(
        "Sayım satırı yalnızca devam eden sayımda onaylanabilir.",
      );
    }

    const item =
      this.requireItem(
        cycleCount.items,
        normalized.cycleCountItemId,
      );

    if (
      item.status !== "in_progress" &&
      item.status !== "assigned"
    ) {
      throw new InventoryValidationError(
        "Sayım satırı mevcut durumda sayılamaz.",
      );
    }

    this.validateTrackingConfirmation(
      item,
      {
        ...(normalized.lotNumber !==
        undefined
          ? {
              lotNumber:
                normalized.lotNumber,
            }
          : {}),
        ...(normalized.serialNumber !==
        undefined
          ? {
              serialNumber:
                normalized.serialNumber,
            }
          : {}),
      },
    );

    const result =
      this.varianceService
        .calculateFromItem(
          item,
          normalized.countedQuantity,
          normalized.damagedQuantity ??
            0,
        );

    const timestamp = this.now();

    await this.repository.saveResult(
      result,
    );

    const updatedItem:
      CycleCountItem = {
        ...item,
        status: result.recountRequired
          ? "recount_required"
          : result.adjustmentRequired
            ? "under_review"
            : "counted",
        firstCountQuantity:
          normalized.countedQuantity,
        finalCountQuantity:
          normalized.countedQuantity,
        damagedQuantity:
          normalized.damagedQuantity ??
          0,
        varianceQuantity:
          result.varianceQuantity,
        variancePercentage:
          result.variancePercentage,
        recountRequired:
          result.recountRequired,
        adjustmentRequired:
          result.adjustmentRequired,
        countedBy:
          normalized.countedBy,
        countedAt: timestamp,
        updatedAt: timestamp,
        ...(result.varianceValue !==
        undefined
          ? {
              varianceValue:
                result.varianceValue,
            }
          : {}),
        ...(normalized.notes !== undefined
          ? { notes: normalized.notes }
          : {}),
      };

    await this.repository.saveItem(
      updatedItem,
    );

    if (
      result.recountRequired ||
      result.adjustmentRequired ||
      result.damagedQuantity > 0
    ) {
      await this.createAutomaticVarianceException({
        cycleCount,
        item: updatedItem,
        result,
        createdAt: timestamp,
      });
    }

    await this.refreshCountStatus(
      cycleCount.tenantId,
      cycleCount.id,
    );

    return updatedItem;
  }

  async recountItem(
    input: RecountCycleCountItemInput,
  ): Promise<CycleCountItem> {
    const normalized =
      validateRecountCycleCountItem(
        input,
      );

    const cycleCount =
      await this.get(
        normalized.tenantId,
        normalized.cycleCountId,
      );

    if (
      cycleCount.status !==
        "in_progress" &&
      cycleCount.status !==
        "recount_required"
    ) {
      throw new InventoryValidationError(
        "Yeniden sayım mevcut sayım durumunda yapılamaz.",
      );
    }

    const item =
      this.requireItem(
        cycleCount.items,
        normalized.cycleCountItemId,
      );

    if (
      item.status !==
      "recount_required"
    ) {
      throw new InventoryValidationError(
        "Yalnızca yeniden sayım gereken satır tekrar sayılabilir.",
      );
    }

    const result =
      this.varianceService
        .calculateFromItem(
          item,
          normalized.countedQuantity,
          normalized.damagedQuantity ??
            0,
        );

    const timestamp = this.now();

    await this.repository.saveResult(
      result,
    );

    const updatedItem:
      CycleCountItem = {
        ...item,
        status: result.recountRequired
          ? "recount_required"
          : result.adjustmentRequired
            ? "under_review"
            : "counted",
        secondCountQuantity:
          normalized.countedQuantity,
        finalCountQuantity:
          normalized.countedQuantity,
        damagedQuantity:
          normalized.damagedQuantity ??
          0,
        varianceQuantity:
          result.varianceQuantity,
        variancePercentage:
          result.variancePercentage,
        recountRequired:
          result.recountRequired,
        adjustmentRequired:
          result.adjustmentRequired,
        recountedBy:
          normalized.recountedBy,
        recountedAt: timestamp,
        updatedAt: timestamp,
        ...(result.varianceValue !==
        undefined
          ? {
              varianceValue:
                result.varianceValue,
            }
          : {}),
        ...(normalized.notes !== undefined
          ? { notes: normalized.notes }
          : {}),
      };

    await this.repository.saveItem(
      updatedItem,
    );

    if (
      result.recountRequired ||
      result.adjustmentRequired ||
      result.damagedQuantity > 0
    ) {
      await this.createAutomaticVarianceException({
        cycleCount,
        item: updatedItem,
        result,
        createdAt: timestamp,
      });
    }

    await this.refreshCountStatus(
      cycleCount.tenantId,
      cycleCount.id,
    );

    return updatedItem;
  }

  async createException(input: {
    tenantId: string;
    cycleCountId: string;
    type: CycleCountExceptionType;
    message: string;
    cycleCountItemId?: string;
    taskId?: string;
    warehouseId?: string;
    locationId?: string;
    productId?: string;
    lotNumber?: string;
    serialNumber?: string;
  }): Promise<CycleCountException> {
    const cycleCount =
      await this.get(
        input.tenantId,
        input.cycleCountId,
      );

    const message =
      this.requireText(
        input.message,
        "İstisna açıklaması",
      );

    if (
      input.cycleCountItemId !==
        undefined &&
      !cycleCount.items.some(
        (item) =>
          item.id ===
          input.cycleCountItemId,
      )
    ) {
      throw new InventoryValidationError(
        "İstisnaya bağlı sayım satırı bulunamadı.",
      );
    }

    const timestamp = this.now();

    return this.repository
      .saveException({
        id: this.createId(),
        tenantId:
          cycleCount.tenantId,
        cycleCountId:
          cycleCount.id,
        type: input.type,
        message,
        resolved: false,
        createdAt: timestamp,
        ...(input.cycleCountItemId !==
        undefined
          ? {
              cycleCountItemId:
                input.cycleCountItemId,
            }
          : {}),
        ...(input.taskId !== undefined
          ? { taskId: input.taskId }
          : {}),
        ...(input.warehouseId !==
        undefined
          ? {
              warehouseId:
                input.warehouseId,
            }
          : {
              warehouseId:
                cycleCount.warehouseId,
            }),
        ...(input.locationId !==
        undefined
          ? {
              locationId:
                input.locationId,
            }
          : {}),
        ...(input.productId !==
        undefined
          ? {
              productId:
                input.productId,
            }
          : {}),
        ...(input.lotNumber !==
        undefined
          ? {
              lotNumber:
                input.lotNumber,
            }
          : {}),
        ...(input.serialNumber !==
        undefined
          ? {
              serialNumber:
                input.serialNumber,
            }
          : {}),
      });
  }

  async resolveException(input: {
    tenantId: string;
    cycleCountId: string;
    exceptionId: string;
    resolvedBy: string;
    resolutionNotes: string;
  }): Promise<CycleCountException> {
    const cycleCount =
      await this.get(
        input.tenantId,
        input.cycleCountId,
      );

    const exceptionId =
      this.requireText(
        input.exceptionId,
        "İstisna kimliği",
      );

    const exception =
      cycleCount.exceptions.find(
        (current) =>
          current.id === exceptionId,
      );

    if (!exception) {
      throw new InventoryValidationError(
        `Sayım istisnası bulunamadı: ${exceptionId}`,
      );
    }

    if (exception.resolved) {
      throw new InventoryValidationError(
        "Sayım istisnası daha önce çözülmüş.",
      );
    }

    const timestamp = this.now();

    return this.repository
      .saveException({
        ...exception,
        resolved: true,
        resolvedBy:
          this.requireText(
            input.resolvedBy,
            "İstisnayı çözen kullanıcı",
          ),
        resolvedAt: timestamp,
        resolutionNotes:
          this.requireText(
            input.resolutionNotes,
            "Çözüm açıklaması",
          ),
      });
  }

  async submitForReview(input: {
    tenantId: string;
    cycleCountId: string;
    submittedBy: string;
  }): Promise<CycleCount> {
    const cycleCount =
      await this.get(
        input.tenantId,
        input.cycleCountId,
      );

    this.requireText(
      input.submittedBy,
      "İncelemeye gönderen kullanıcı",
    );

    if (
      cycleCount.status !==
        "counted" &&
      cycleCount.status !==
        "recount_required" &&
      cycleCount.status !==
        "in_progress"
    ) {
      throw new InventoryValidationError(
        "Sayım mevcut durumda incelemeye gönderilemez.",
      );
    }

    const items =
      await this.repository.listItems(
        cycleCount.tenantId,
        cycleCount.id,
      );

    if (items.length === 0) {
      throw new InventoryValidationError(
        "Satırı bulunmayan sayım incelemeye gönderilemez.",
      );
    }

    const unfinished =
      items.filter(
        (item) =>
          item.status === "pending" ||
          item.status === "assigned" ||
          item.status ===
            "in_progress",
      );

    if (unfinished.length > 0) {
      throw new InventoryValidationError(
        "Tüm sayım satırları sonuçlanmadan inceleme başlatılamaz.",
      );
    }

    const unresolvedRecounts =
      items.filter(
        (item) =>
          item.recountRequired,
      );

    if (
      unresolvedRecounts.length > 0
    ) {
      throw new InventoryValidationError(
        "Yeniden sayım gereken satırlar tamamlanmadan inceleme başlatılamaz.",
      );
    }

    const timestamp = this.now();

    return this.repository.save({
      ...cycleCount,
      status: "under_review",
      countedAt:
        cycleCount.countedAt ??
        timestamp,
      updatedAt: timestamp,
    });
  }

  async approve(input: {
    tenantId: string;
    cycleCountId: string;
    approvedBy: string;
  }): Promise<CycleCount> {
    const cycleCount =
      await this.get(
        input.tenantId,
        input.cycleCountId,
      );

    const approvedBy =
      this.requireText(
        input.approvedBy,
        "Sayımı onaylayan kullanıcı",
      );

    if (
      cycleCount.status !==
      "under_review"
    ) {
      throw new InventoryValidationError(
        "Yalnızca inceleme bekleyen sayım onaylanabilir.",
      );
    }

    const unresolvedExceptions =
      cycleCount.exceptions.filter(
        (exception) =>
          !exception.resolved,
      );

    if (
      unresolvedExceptions.length > 0
    ) {
      throw new InventoryValidationError(
        "Çözülmemiş sayım istisnaları varken sayım onaylanamaz.",
      );
    }

    const items =
      await this.repository.listItems(
        cycleCount.tenantId,
        cycleCount.id,
      );

    const timestamp = this.now();

    for (const item of items) {
      if (
        item.status === "counted" ||
        item.status === "under_review"
      ) {
        await this.repository.saveItem({
          ...item,
          status: "approved",
          approvedBy,
          approvedAt: timestamp,
          updatedAt: timestamp,
        });
      }
    }

    return this.repository.save({
      ...cycleCount,
      status: "approved",
      approvedAt: timestamp,
      updatedAt: timestamp,
    });
  }

  async calculateAccuracy(input: {
    tenantId: string;
    cycleCountId: string;
    periodStart?: string;
    periodEnd?: string;
  }) {
    const cycleCount =
      await this.get(
        input.tenantId,
        input.cycleCountId,
      );

    const items =
      await this.repository.listItems(
        cycleCount.tenantId,
        cycleCount.id,
      );

    const results =
      await this.repository.listResults(
        cycleCount.tenantId,
        cycleCount.id,
      );

    const periodStart =
      input.periodStart ??
      cycleCount.startedAt ??
      cycleCount.createdAt;

    const periodEnd =
      input.periodEnd ??
      this.now();

    return this.accuracyService
      .calculateBreakdown({
        filter: {
          tenantId:
            cycleCount.tenantId,
          warehouseId:
            cycleCount.warehouseId,
          periodStart,
          periodEnd,
        },
        items,
        results,
      });
  }

  async complete(input: {
    tenantId: string;
    cycleCountId: string;
    completedBy: string;
  }): Promise<CycleCount> {
    const cycleCount =
      await this.get(
        input.tenantId,
        input.cycleCountId,
      );

    this.requireText(
      input.completedBy,
      "Sayımı tamamlayan kullanıcı",
    );

    if (
      cycleCount.status !==
        "approved" &&
      cycleCount.status !==
        "adjusted"
    ) {
      throw new InventoryValidationError(
        "Sayım yalnızca onaylandıktan veya stok düzeltmeleri tamamlandıktan sonra kapatılabilir.",
      );
    }

    const unresolvedExceptions =
      (
        await this.repository
          .listExceptions(
            cycleCount.tenantId,
            cycleCount.id,
          )
      ).filter(
        (exception) =>
          !exception.resolved,
      );

    if (
      unresolvedExceptions.length > 0
    ) {
      throw new InventoryValidationError(
        "Çözülmemiş sayım istisnası varken sayım tamamlanamaz.",
      );
    }

    const adjustments =
      await this.repository
        .listAdjustments(
          cycleCount.tenantId,
          cycleCount.id,
        );

    const incompleteAdjustments =
      adjustments.filter(
        (adjustment) =>
          adjustment.status !==
            "completed" &&
          adjustment.status !==
            "cancelled",
      );

    if (
      incompleteAdjustments.length > 0
    ) {
      throw new InventoryValidationError(
        "Bekleyen stok düzeltmeleri tamamlanmadan sayım kapatılamaz.",
      );
    }

    const items =
      await this.repository.listItems(
        cycleCount.tenantId,
        cycleCount.id,
      );

    const incompleteItems =
      items.filter(
        (item) =>
          item.status !== "approved" &&
          item.status !== "adjusted",
      );

    if (
      incompleteItems.length > 0
    ) {
      throw new InventoryValidationError(
        "Tüm sayım satırları onaylanmadan sayım tamamlanamaz.",
      );
    }

    const timestamp = this.now();

    return this.repository.save({
      ...cycleCount,
      status: "completed",
      completedAt: timestamp,
      updatedAt: timestamp,
    });
  }

  async markAdjusted(input: {
    tenantId: string;
    cycleCountId: string;
    adjustedBy: string;
  }): Promise<CycleCount> {
    const cycleCount =
      await this.get(
        input.tenantId,
        input.cycleCountId,
      );

    this.requireText(
      input.adjustedBy,
      "Stok düzeltmesini tamamlayan kullanıcı",
    );

    if (
      cycleCount.status !== "approved"
    ) {
      throw new InventoryValidationError(
        "Sayım onaylanmadan stok düzeltildi durumuna geçirilemez.",
      );
    }

    const adjustments =
      await this.repository
        .listAdjustments(
          cycleCount.tenantId,
          cycleCount.id,
        );

    if (adjustments.length === 0) {
      throw new InventoryValidationError(
        "Sayımda stok düzeltme kaydı bulunmamaktadır.",
      );
    }

    if (
      adjustments.some(
        (adjustment) =>
          adjustment.status !==
            "completed" &&
          adjustment.status !==
            "cancelled",
      )
    ) {
      throw new InventoryValidationError(
        "Tüm stok düzeltmeleri sonuçlanmadan sayım düzeltildi durumuna geçirilemez.",
      );
    }

    const timestamp = this.now();

    return this.repository.save({
      ...cycleCount,
      status: "adjusted",
      adjustedAt: timestamp,
      updatedAt: timestamp,
    });
  }

  async cancel(input: {
    tenantId: string;
    cycleCountId: string;
    cancelledBy: string;
    reason: string;
  }): Promise<CycleCount> {
    const cycleCount =
      await this.get(
        input.tenantId,
        input.cycleCountId,
      );

    this.requireText(
      input.cancelledBy,
      "Sayımı iptal eden kullanıcı",
    );

    const reason =
      this.requireText(
        input.reason,
        "İptal nedeni",
      );

    if (
      cycleCount.status ===
        "completed" ||
      cycleCount.status ===
        "adjusted"
    ) {
      throw new InventoryValidationError(
        "Tamamlanmış veya stok düzeltmesi yapılmış sayım iptal edilemez.",
      );
    }

    const adjustments =
      await this.repository
        .listAdjustments(
          cycleCount.tenantId,
          cycleCount.id,
        );

    if (
      adjustments.some(
        (adjustment) =>
          adjustment.status ===
            "processing" ||
          adjustment.status ===
            "completed",
      )
    ) {
      throw new InventoryValidationError(
        "İşlenmiş stok düzeltmesi bulunan sayım doğrudan iptal edilemez.",
      );
    }

    const timestamp = this.now();

    const tasks =
      await this.repository.listTasks(
        cycleCount.tenantId,
        cycleCount.id,
      );

    for (const task of tasks) {
      if (
        task.status !== "completed" &&
        task.status !== "cancelled"
      ) {
        await this.repository.saveTask({
          ...task,
          status: "cancelled",
          updatedAt: timestamp,
        });
      }
    }

    return this.repository.save({
      ...cycleCount,
      status: "cancelled",
      cancelledAt: timestamp,
      cancellationReason: reason,
      updatedAt: timestamp,
    });
  }

  private async refreshCountStatus(
    tenantId: string,
    cycleCountId: string,
  ): Promise<void> {
    const cycleCount =
      await this.get(
        tenantId,
        cycleCountId,
      );

    const items =
      await this.repository.listItems(
        tenantId,
        cycleCountId,
      );

    if (items.length === 0) {
      return;
    }

    const hasRecount =
      items.some(
        (item) =>
          item.recountRequired ||
          item.status ===
            "recount_required",
      );

    const allCounted =
      items.every(
        (item) =>
          item.status === "counted" ||
          item.status ===
            "under_review" ||
          item.status === "approved" ||
          item.status === "adjusted",
      );

    const timestamp = this.now();

    if (hasRecount) {
      await this.repository.save({
        ...cycleCount,
        status: "recount_required",
        updatedAt: timestamp,
      });

      return;
    }

    if (allCounted) {
      await this.repository.save({
        ...cycleCount,
        status: "counted",
        countedAt: timestamp,
        updatedAt: timestamp,
      });
    }
  }

  private async createAutomaticVarianceException(
    input: {
      cycleCount: CycleCount;
      item: CycleCountItem;
      result: CycleCountResult;
      createdAt: string;
    },
  ): Promise<void> {
    const existing =
      input.cycleCount.exceptions.find(
        (exception) =>
          exception.cycleCountItemId ===
            input.item.id &&
          !exception.resolved &&
          (
            exception.type ===
              "variance_exceeded" ||
            exception.type ===
              "recount_required" ||
            exception.type ===
              "damaged_stock"
          ),
      );

    if (existing) {
      return;
    }

    const type:
      CycleCountExceptionType =
      input.result.damagedQuantity > 0
        ? "damaged_stock"
        : input.result.recountRequired
          ? "recount_required"
          : "variance_exceeded";

    const message =
      input.result.damagedQuantity > 0
        ? `Sayım satırında ${input.result.damagedQuantity} birim hasarlı stok tespit edildi.`
        : `Beklenen ve sayılan stok arasında ${input.result.varianceQuantity} birim fark tespit edildi.`;

    await this.repository.saveException({
      id: this.createId(),
      tenantId:
        input.cycleCount.tenantId,
      cycleCountId:
        input.cycleCount.id,
      cycleCountItemId:
        input.item.id,
      warehouseId:
        input.item.warehouseId,
      locationId:
        input.item.locationId,
      productId:
        input.item.productId,
      type,
      message,
      resolved: false,
      createdAt:
        input.createdAt,
      ...(input.item.tracking
        ?.lotNumber !== undefined
        ? {
            lotNumber:
              input.item.tracking
                .lotNumber,
          }
        : {}),
      ...(input.item.tracking
        ?.serialNumber !== undefined
        ? {
            serialNumber:
              input.item.tracking
                .serialNumber,
          }
        : {}),
    });
  }

  private validateTrackingConfirmation(
    item: CycleCountItem,
    confirmation: {
      lotNumber?: string;
      serialNumber?: string;
    },
  ): void {
    const expectedLot =
      item.tracking?.lotNumber;

    const expectedSerial =
      item.tracking?.serialNumber;

    if (
      expectedLot !== undefined &&
      confirmation.lotNumber !==
        expectedLot
    ) {
      throw new InventoryValidationError(
        "Sayım lot numarası beklenen lotla uyuşmuyor.",
      );
    }

    if (
      expectedSerial !== undefined &&
      confirmation.serialNumber !==
        expectedSerial
    ) {
      throw new InventoryValidationError(
        "Sayım seri numarası beklenen seri numarasıyla uyuşmuyor.",
      );
    }
  }

  private requireItem(
    items: readonly CycleCountItem[],
    itemId: string,
  ): CycleCountItem {
    const item =
      items.find(
        (current) =>
          current.id === itemId,
      );

    if (!item) {
      throw new InventoryValidationError(
        `Sayım satırı bulunamadı: ${itemId}`,
      );
    }

    return item;
  }

  private generateCycleCountNumber(
    timestamp: string,
  ): string {
    const date = new Date(timestamp);

    const year =
      date.getUTCFullYear();

    const month =
      String(
        date.getUTCMonth() + 1,
      ).padStart(2, "0");

    const day =
      String(
        date.getUTCDate(),
      ).padStart(2, "0");

    return [
      "SAY",
      `${year}${month}${day}`,
      String(
        this.sequence(),
      ).padStart(6, "0"),
    ].join("-");
  }

  private trackingKey(
    tracking:
      | CycleCountItem["tracking"]
      | CreateCycleCountItemInput["tracking"],
  ): string {
    if (!tracking) {
      return "";
    }

    return JSON.stringify({
      lotNumber:
        tracking.lotNumber ?? "",
      serialNumber:
        tracking.serialNumber ?? "",
      expiryDate:
        tracking.expiryDate ?? "",
      productionDate:
        tracking.productionDate ?? "",
    });
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

    const normalized = value.trim();

    if (!normalized) {
      throw new InventoryValidationError(
        `${fieldName} boş bırakılamaz.`,
      );
    }

    return normalized;
  }
}
