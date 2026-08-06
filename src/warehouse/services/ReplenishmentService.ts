import type {
  CreateReplenishmentInput,
  Replenishment,
  ReplenishmentListFilter,
} from "../types/Replenishment";
import type {
  ReplenishmentAllocation,
} from "../types/ReplenishmentAllocation";
import type {
  CreateReplenishmentDemandInput,
  ReplenishmentDemand,
} from "../types/ReplenishmentDemand";
import type {
  ReplenishmentException,
  ReplenishmentExceptionType,
} from "../types/ReplenishmentException";
import type {
  CreateReplenishmentItemInput,
  ReplenishmentItem,
} from "../types/ReplenishmentItem";
import type {
  CreateReplenishmentRuleInput,
  ReplenishmentRule,
} from "../types/ReplenishmentRule";
import type {
  ReplenishmentSuggestion,
} from "../types/ReplenishmentSuggestion";
import type {
  CreateReplenishmentTaskInput,
  ReplenishmentTask,
} from "../types/ReplenishmentTask";
import {
  InventoryValidationError,
} from "../types/InventoryErrors";
import type {
  ReplenishmentAllocationService,
} from "./ReplenishmentAllocationService";
import type {
  ReplenishmentDemandService,
} from "./ReplenishmentDemandService";
import type {
  ReplenishmentOptimizationResult,
} from "./ReplenishmentOptimizer";
import type {
  ReplenishmentOptimizer,
} from "./ReplenishmentOptimizer";
import type {
  ReplenishmentPerformanceService,
} from "./ReplenishmentPerformanceService";
import type {
  ReplenishmentRepository,
} from "./ReplenishmentRepository";
import type {
  GenerateReplenishmentSuggestionsInput,
  ReplenishmentSuggestionService,
} from "./ReplenishmentSuggestionService";
import {
  validateCreateReplenishment,
  validateCreateReplenishmentItem,
  validateCreateReplenishmentRule,
  validateCreateReplenishmentTask,
} from "./ReplenishmentValidator";

export interface ReplenishmentServiceDependencies {
  readonly repository:
    ReplenishmentRepository;
  readonly demandService:
    ReplenishmentDemandService;
  readonly suggestionService:
    ReplenishmentSuggestionService;
  readonly optimizer:
    ReplenishmentOptimizer;
  readonly allocationService:
    ReplenishmentAllocationService;
  readonly performanceService:
    ReplenishmentPerformanceService;
  readonly createId?: () => string;
  readonly now?: () => string;
  readonly sequence?: () => number;
}

let internalIdSequence = 0;
let internalNumberSequence = 0;

export class ReplenishmentService {
  private readonly repository:
    ReplenishmentRepository;

  private readonly demandService:
    ReplenishmentDemandService;

  private readonly suggestionService:
    ReplenishmentSuggestionService;

  private readonly optimizer:
    ReplenishmentOptimizer;

  private readonly allocationService:
    ReplenishmentAllocationService;

  private readonly performanceService:
    ReplenishmentPerformanceService;

  private readonly createId: () => string;

  private readonly now: () => string;

  private readonly sequence: () => number;

  constructor(
    dependencies:
      ReplenishmentServiceDependencies,
  ) {
    this.repository =
      dependencies.repository;

    this.demandService =
      dependencies.demandService;

    this.suggestionService =
      dependencies.suggestionService;

    this.optimizer =
      dependencies.optimizer;

    this.allocationService =
      dependencies.allocationService;

    this.performanceService =
      dependencies.performanceService;

    this.createId =
      dependencies.createId ??
      (() =>
        `replenishment-${String(
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
    input: CreateReplenishmentInput,
  ): Promise<Replenishment> {
    const normalized =
      validateCreateReplenishment(
        input,
      );

    if (
      normalized.source.referenceId !==
        undefined
    ) {
      const existing =
        await this.repository
          .findByReference(
            normalized.tenantId,
            normalized.source.type,
            normalized.source.referenceId,
          );

      if (existing) {
        throw new InventoryValidationError(
          "Bu kaynak referansı için daha önce ikmal kaydı oluşturulmuş.",
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
          "İkmal kaydına bağlı kural bulunamadı.",
        );
      }

      if (!rule.active) {
        throw new InventoryValidationError(
          "Pasif ikmal kuralıyla ikmal kaydı oluşturulamaz.",
        );
      }

      if (
        rule.warehouseId !== undefined &&
        rule.warehouseId !==
          normalized.warehouseId
      ) {
        throw new InventoryValidationError(
          "İkmal kuralı deposu ile ikmal kaydı deposu uyuşmuyor.",
        );
      }
    }

    const timestamp = this.now();

    return this.repository.save({
      id: this.createId(),
      tenantId:
        normalized.tenantId,
      replenishmentNumber:
        this.generateReplenishmentNumber(
          timestamp,
        ),
      warehouseId:
        normalized.warehouseId,
      strategy:
        normalized.strategy,
      source:
        structuredClone(
          normalized.source,
        ),
      status:
        normalized.plannedAt !==
        undefined
          ? "planned"
          : "draft",
      priority:
        normalized.priority ?? 50,
      items: [],
      allocations: [],
      suggestions: [],
      exceptions: [],
      createdBy:
        normalized.createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(normalized.ruleId !==
      undefined
        ? {
            ruleId:
              normalized.ruleId,
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
        ? {
            notes:
              normalized.notes,
          }
        : {}),
    });
  }

  async get(
    tenantId: string,
    replenishmentId: string,
  ): Promise<Replenishment> {
    const normalizedTenantId =
      this.requireText(
        tenantId,
        "Firma kimliği",
      );

    const normalizedReplenishmentId =
      this.requireText(
        replenishmentId,
        "İkmal kimliği",
      );

    const replenishment =
      await this.repository.findById(
        normalizedTenantId,
        normalizedReplenishmentId,
      );

    if (!replenishment) {
      throw new InventoryValidationError(
        `İkmal kaydı bulunamadı: ${normalizedReplenishmentId}`,
      );
    }

    return replenishment;
  }

  async getByNumber(
    tenantId: string,
    replenishmentNumber: string,
  ): Promise<Replenishment> {
    const normalizedTenantId =
      this.requireText(
        tenantId,
        "Firma kimliği",
      );

    const normalizedNumber =
      this.requireText(
        replenishmentNumber,
        "İkmal numarası",
      );

    const replenishment =
      await this.repository
        .findByNumber(
          normalizedTenantId,
          normalizedNumber,
        );

    if (!replenishment) {
      throw new InventoryValidationError(
        `İkmal kaydı bulunamadı: ${normalizedNumber}`,
      );
    }

    return replenishment;
  }

  async list(
    filter: ReplenishmentListFilter,
  ): Promise<Replenishment[]> {
    return this.repository.list({
      ...filter,
      tenantId: this.requireText(
        filter.tenantId,
        "Firma kimliği",
      ),
    });
  }

  async addItem(
    input: CreateReplenishmentItemInput,
  ): Promise<ReplenishmentItem> {
    const normalized =
      validateCreateReplenishmentItem(
        input,
      );

    const replenishment =
      await this.get(
        normalized.tenantId,
        normalized.replenishmentId,
      );

    if (
      replenishment.status !== "draft" &&
      replenishment.status !== "planned"
    ) {
      throw new InventoryValidationError(
        "İkmal satırı yalnızca taslak veya planlanmış ikmale eklenebilir.",
      );
    }

    if (
      replenishment.warehouseId !==
      normalized.warehouseId
    ) {
      throw new InventoryValidationError(
        "İkmal satırı deposu ikmal kaydı deposuyla uyuşmuyor.",
      );
    }

    const duplicate =
      replenishment.items.find(
        (item) =>
          item.destinationLocationId ===
            normalized
              .destinationLocationId &&
          item.productId ===
            normalized.productId &&
          item.skuId ===
            normalized.skuId &&
          item.stockStatus ===
            normalized.stockStatus &&
          this.trackingKey(
            item.tracking,
          ) ===
            this.trackingKey(
              normalized.tracking,
            ),
      );

    if (duplicate) {
      throw new InventoryValidationError(
        "Aynı hedef lokasyon, ürün ve takip bilgisi için ikmal satırı zaten bulunmaktadır.",
      );
    }

    const timestamp = this.now();

    return this.repository.saveItem({
      id: this.createId(),
      tenantId:
        replenishment.tenantId,
      replenishmentId:
        replenishment.id,
      lineNumber:
        replenishment.items.length + 1,
      warehouseId:
        normalized.warehouseId,
      destinationLocationId:
        normalized.destinationLocationId,
      productId:
        normalized.productId,
      stockStatus:
        normalized.stockStatus,
      unit:
        normalized.unit,
      requestedQuantity:
        normalized.requestedQuantity,
      allocatedQuantity: 0,
      transferredQuantity: 0,
      remainingQuantity:
        normalized.requestedQuantity,
      currentDestinationQuantity:
        normalized
          .currentDestinationQuantity,
      priority:
        normalized.priority ?? 50,
      status: "pending",
      createdBy:
        normalized.createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(normalized.skuId !==
      undefined
        ? {
            skuId:
              normalized.skuId,
          }
        : {}),
      ...(normalized.minimumQuantity !==
      undefined
        ? {
            minimumQuantity:
              normalized.minimumQuantity,
          }
        : {}),
      ...(normalized.maximumQuantity !==
      undefined
        ? {
            maximumQuantity:
              normalized.maximumQuantity,
          }
        : {}),
      ...(normalized.tracking !==
      undefined
        ? {
            tracking:
              structuredClone(
                normalized.tracking,
              ),
          }
        : {}),
      ...(normalized.requiredAt !==
      undefined
        ? {
            requiredAt:
              normalized.requiredAt,
          }
        : {}),
      ...(normalized.notes !== undefined
        ? {
            notes:
              normalized.notes,
          }
        : {}),
    });
  }

  async createDemand(
    input: CreateReplenishmentDemandInput,
  ): Promise<ReplenishmentDemand> {
    return this.demandService.create(
      input,
    );
  }

  async generateSuggestions(
    input:
      GenerateReplenishmentSuggestionsInput,
  ): Promise<ReplenishmentSuggestion[]> {
    return this.suggestionService
      .generate(input);
  }

  async optimizeAndAllocate(input: {
    tenantId: string;
    replenishmentId: string;
    allowPartialAllocation?: boolean;
  }): Promise<{
    optimization:
      ReplenishmentOptimizationResult;
    allocations:
      ReplenishmentAllocation[];
  }> {
    const replenishment =
      await this.get(
        input.tenantId,
        input.replenishmentId,
      );

    if (
      replenishment.status !== "draft" &&
      replenishment.status !== "planned"
    ) {
      throw new InventoryValidationError(
        "Optimizasyon yalnızca taslak veya planlanmış ikmalde yapılabilir.",
      );
    }

    if (
      replenishment.items.length === 0
    ) {
      throw new InventoryValidationError(
        "Satırı bulunmayan ikmal optimize edilemez.",
      );
    }

    const suggestions =
      await this.repository
        .listSuggestions(
          replenishment.tenantId,
          replenishment.id,
        );

    if (suggestions.length === 0) {
      throw new InventoryValidationError(
        "Optimizasyon için kaynak önerisi bulunamadı.",
      );
    }

    const rules =
      await this.repository.listRules(
        replenishment.tenantId,
        true,
      );

    const optimization =
      this.optimizer.optimize({
        items:
          replenishment.items,
        suggestions,
        rules,
        allowPartialAllocation:
          input.allowPartialAllocation ??
          true,
      });

    if (
      optimization.selections
        .length === 0
    ) {
      throw new InventoryValidationError(
        "Optimizer uygun tahsis seçimi üretemedi.",
      );
    }

    const allocations =
      await this.allocationService
        .createFromOptimization({
          tenantId:
            replenishment.tenantId,
          replenishmentId:
            replenishment.id,
          optimization,
        });

    const refreshed =
      await this.get(
        replenishment.tenantId,
        replenishment.id,
      );

    const allRequestedAllocated =
      refreshed.items.every(
        (item) =>
          item.allocatedQuantity >=
          item.requestedQuantity,
      );

    await this.repository.save({
      ...refreshed,
      status:
        allRequestedAllocated
          ? "planned"
          : refreshed.status,
      updatedAt: this.now(),
    });

    return {
      optimization,
      allocations,
    };
  }

  async release(input: {
    tenantId: string;
    replenishmentId: string;
    releasedBy: string;
  }): Promise<Replenishment> {
    const replenishment =
      await this.get(
        input.tenantId,
        input.replenishmentId,
      );

    this.requireText(
      input.releasedBy,
      "İkmale açan kullanıcı",
    );

    if (
      replenishment.status !== "draft" &&
      replenishment.status !== "planned"
    ) {
      throw new InventoryValidationError(
        "Yalnızca taslak veya planlanmış ikmal işleme açılabilir.",
      );
    }

    if (
      replenishment.items.length === 0
    ) {
      throw new InventoryValidationError(
        "Satırı bulunmayan ikmal işleme açılamaz.",
      );
    }

    const allocations =
      await this.repository
        .listAllocations(
          replenishment.tenantId,
          replenishment.id,
        );

    if (allocations.length === 0) {
      throw new InventoryValidationError(
        "Tahsis oluşturulmadan ikmal işleme açılamaz.",
      );
    }

    const activeAllocations =
      allocations.filter(
        (allocation) =>
          allocation.status !==
            "cancelled" &&
          allocation.status !==
            "released",
      );

    if (
      activeAllocations.length === 0
    ) {
      throw new InventoryValidationError(
        "Aktif tahsis bulunmadan ikmal işleme açılamaz.",
      );
    }

    const timestamp = this.now();

    return this.repository.save({
      ...replenishment,
      status: "released",
      releasedAt: timestamp,
      updatedAt: timestamp,
    });
  }

  async createRule(
    input: CreateReplenishmentRuleInput,
  ): Promise<ReplenishmentRule> {
    const normalized =
      validateCreateReplenishmentRule(
        input,
      );

    const existing =
      await this.repository
        .findRuleByCode(
          normalized.tenantId,
          normalized.code,
        );

    if (existing) {
      throw new InventoryValidationError(
        "Bu ikmal kuralı kodu daha önce kullanılmış.",
      );
    }

    const timestamp = this.now();

    return this.repository.saveRule({
      id: this.createId(),
      tenantId:
        normalized.tenantId,
      code:
        normalized.code,
      name:
        normalized.name,
      strategy:
        normalized.strategy,
      priority:
        normalized.priority ?? 50,
      automaticRelease:
        normalized.automaticRelease ??
        false,
      allowPartialAllocation:
        normalized
          .allowPartialAllocation ??
        true,
      active: true,
      createdBy:
        normalized.createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(normalized.description !==
      undefined
        ? {
            description:
              normalized.description,
          }
        : {}),
      ...(normalized.warehouseId !==
      undefined
        ? {
            warehouseId:
              normalized.warehouseId,
          }
        : {}),
      ...(normalized.zoneId !==
      undefined
        ? {
            zoneId:
              normalized.zoneId,
          }
        : {}),
      ...(normalized
        .destinationLocationId !==
      undefined
        ? {
            destinationLocationId:
              normalized
                .destinationLocationId,
          }
        : {}),
      ...(normalized.productId !==
      undefined
        ? {
            productId:
              normalized.productId,
          }
        : {}),
      ...(normalized.skuId !== undefined
        ? {
            skuId:
              normalized.skuId,
          }
        : {}),
      ...(normalized
        .productCategoryId !== undefined
        ? {
            productCategoryId:
              normalized
                .productCategoryId,
          }
        : {}),
      ...(normalized.abcClass !==
      undefined
        ? {
            abcClass:
              normalized.abcClass,
          }
        : {}),
      ...(normalized.minimumQuantity !==
      undefined
        ? {
            minimumQuantity:
              normalized.minimumQuantity,
          }
        : {}),
      ...(normalized.maximumQuantity !==
      undefined
        ? {
            maximumQuantity:
              normalized.maximumQuantity,
          }
        : {}),
      ...(normalized
        .safetyStockQuantity !==
      undefined
        ? {
            safetyStockQuantity:
              normalized
                .safetyStockQuantity,
          }
        : {}),
      ...(normalized.reorderPoint !==
      undefined
        ? {
            reorderPoint:
              normalized.reorderPoint,
          }
        : {}),
      ...(normalized
        .targetFillPercentage !==
      undefined
        ? {
            targetFillPercentage:
              normalized
                .targetFillPercentage,
          }
        : {}),
      ...(normalized
        .minimumTransferQuantity !==
      undefined
        ? {
            minimumTransferQuantity:
              normalized
                .minimumTransferQuantity,
          }
        : {}),
      ...(normalized
        .maximumTransferQuantity !==
      undefined
        ? {
            maximumTransferQuantity:
              normalized
                .maximumTransferQuantity,
          }
        : {}),
      ...(normalized.transferMultiple !==
      undefined
        ? {
            transferMultiple:
              normalized.transferMultiple,
          }
        : {}),
      ...(normalized.leadTimeMinutes !==
      undefined
        ? {
            leadTimeMinutes:
              normalized.leadTimeMinutes,
          }
        : {}),
    });
  }

  async setRuleActive(
    tenantId: string,
    ruleId: string,
    active: boolean,
  ): Promise<ReplenishmentRule> {
    const rule =
      await this.repository.findRuleById(
        this.requireText(
          tenantId,
          "Firma kimliği",
        ),
        this.requireText(
          ruleId,
          "İkmal kuralı kimliği",
        ),
      );

    if (!rule) {
      throw new InventoryValidationError(
        "İkmal kuralı bulunamadı.",
      );
    }

    return this.repository.saveRule({
      ...rule,
      active,
      updatedAt: this.now(),
    });
  }

  async listRules(
    tenantId: string,
    activeOnly = false,
  ): Promise<ReplenishmentRule[]> {
    return this.repository.listRules(
      this.requireText(
        tenantId,
        "Firma kimliği",
      ),
      activeOnly,
    );
  }

  async listItems(
    tenantId: string,
    replenishmentId: string,
  ): Promise<ReplenishmentItem[]> {
    await this.get(
      tenantId,
      replenishmentId,
    );

    return this.repository.listItems(
      tenantId,
      replenishmentId,
    );
  }

  async listDemands(
    tenantId: string,
    replenishmentId: string,
  ): Promise<ReplenishmentDemand[]> {
    return this.demandService.list(
      tenantId,
      replenishmentId,
    );
  }

  async listSuggestions(
    tenantId: string,
    replenishmentId: string,
  ): Promise<ReplenishmentSuggestion[]> {
    return this.suggestionService.list(
      tenantId,
      replenishmentId,
    );
  }

  async listAllocations(
    tenantId: string,
    replenishmentId: string,
  ): Promise<ReplenishmentAllocation[]> {
    return this.allocationService.list(
      tenantId,
      replenishmentId,
    );
  }

  async listTasks(
    tenantId: string,
    replenishmentId: string,
  ): Promise<ReplenishmentTask[]> {
    await this.get(
      tenantId,
      replenishmentId,
    );

    return this.repository.listTasks(
      tenantId,
      replenishmentId,
    );
  }

  async listExceptions(
    tenantId: string,
    replenishmentId: string,
  ): Promise<ReplenishmentException[]> {
    await this.get(
      tenantId,
      replenishmentId,
    );

    return this.repository
      .listExceptions(
        tenantId,
        replenishmentId,
      );
  }

  async reserveAllocations(input: {
    tenantId: string;
    replenishmentId: string;
    requestedBy: string;
  }): Promise<ReplenishmentAllocation[]> {
    const replenishment =
      await this.get(
        input.tenantId,
        input.replenishmentId,
      );

    if (
      replenishment.status !==
        "released" &&
      replenishment.status !==
        "planned"
    ) {
      throw new InventoryValidationError(
        "Tahsisler yalnızca planlanmış veya işleme açılmış ikmalde rezerve edilebilir.",
      );
    }

    const requestedBy =
      this.requireText(
        input.requestedBy,
        "Rezervasyonu yapan kullanıcı",
      );

    const allocations =
      await this.repository
        .listAllocations(
          replenishment.tenantId,
          replenishment.id,
        );

    const reservable =
      allocations.filter(
        (allocation) =>
          allocation.status ===
          "planned",
      );

    if (reservable.length === 0) {
      throw new InventoryValidationError(
        "Rezerve edilecek planlanmış tahsis bulunamadı.",
      );
    }

    const reserved:
      ReplenishmentAllocation[] = [];

    for (const allocation of reservable) {
      reserved.push(
        await this.allocationService.reserve({
          tenantId:
            replenishment.tenantId,
          replenishmentId:
            replenishment.id,
          allocationId:
            allocation.id,
          requestedBy,
        }),
      );
    }

    return reserved;
  }

  async createTask(
    input: CreateReplenishmentTaskInput,
  ): Promise<ReplenishmentTask> {
    const normalized =
      validateCreateReplenishmentTask(
        input,
      );

    const replenishment =
      await this.get(
        normalized.tenantId,
        normalized.replenishmentId,
      );

    if (
      replenishment.status !==
        "released" &&
      replenishment.status !==
        "assigned"
    ) {
      throw new InventoryValidationError(
        "İkmal görevi yalnızca işleme açılmış veya görev atanmış ikmalde oluşturulabilir.",
      );
    }

    if (
      replenishment.warehouseId !==
      normalized.warehouseId
    ) {
      throw new InventoryValidationError(
        "Görev deposu ikmal kaydı deposuyla uyuşmuyor.",
      );
    }

    if (
      normalized
        .replenishmentItemId !==
        undefined &&
      !replenishment.items.some(
        (item) =>
          item.id ===
          normalized
            .replenishmentItemId,
      )
    ) {
      throw new InventoryValidationError(
        "Göreve bağlı ikmal satırı bulunamadı.",
      );
    }

    if (
      normalized.allocationId !==
        undefined &&
      !replenishment.allocations.some(
        (allocation) =>
          allocation.id ===
          normalized.allocationId,
      )
    ) {
      throw new InventoryValidationError(
        "Göreve bağlı ikmal tahsisi bulunamadı.",
      );
    }

    const timestamp = this.now();

    const task =
      await this.repository.saveTask({
        id: this.createId(),
        tenantId:
          replenishment.tenantId,
        replenishmentId:
          replenishment.id,
        warehouseId:
          replenishment.warehouseId,
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
        ...(normalized
          .replenishmentItemId !==
        undefined
          ? {
              replenishmentItemId:
                normalized
                  .replenishmentItemId,
            }
          : {}),
        ...(normalized.allocationId !==
        undefined
          ? {
              allocationId:
                normalized.allocationId,
            }
          : {}),
        ...(normalized.sourceLocationId !==
        undefined
          ? {
              sourceLocationId:
                normalized
                  .sourceLocationId,
            }
          : {}),
        ...(normalized
          .destinationLocationId !==
        undefined
          ? {
              destinationLocationId:
                normalized
                  .destinationLocationId,
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
          ? {
              notes:
                normalized.notes,
            }
          : {}),
      });

    if (
      replenishment.status ===
      "released"
    ) {
      await this.repository.save({
        ...replenishment,
        status: "assigned",
        updatedAt: timestamp,
      });
    }

    if (
      normalized
        .replenishmentItemId !==
      undefined
    ) {
      const item =
        replenishment.items.find(
          (current) =>
            current.id ===
            normalized
              .replenishmentItemId,
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
    replenishmentId: string;
    startedBy: string;
  }): Promise<Replenishment> {
    const replenishment =
      await this.get(
        input.tenantId,
        input.replenishmentId,
      );

    this.requireText(
      input.startedBy,
      "İkmali başlatan kullanıcı",
    );

    if (
      replenishment.status !==
        "released" &&
      replenishment.status !==
        "assigned"
    ) {
      throw new InventoryValidationError(
        "İkmal yalnızca işleme açılmış veya görev atanmış durumdayken başlatılabilir.",
      );
    }

    const tasks =
      await this.repository.listTasks(
        replenishment.tenantId,
        replenishment.id,
      );

    if (tasks.length === 0) {
      throw new InventoryValidationError(
        "İkmal görevi oluşturulmadan operasyon başlatılamaz.",
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
        "İkmali başlatmak için atanmış en az bir görev gereklidir.",
      );
    }

    const timestamp = this.now();

    await this.repository.save({
      ...replenishment,
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
      const allocation
      of replenishment.allocations
    ) {
      if (
        allocation.status ===
          "reserved" ||
        allocation.status ===
          "planned"
      ) {
        await this.allocationService.start({
          tenantId:
            replenishment.tenantId,
          replenishmentId:
            replenishment.id,
          allocationId:
            allocation.id,
          startedBy:
            input.startedBy,
        });
      }
    }

    for (const item of replenishment.items) {
      if (
        item.status === "allocated" ||
        item.status === "assigned"
      ) {
        await this.repository.saveItem({
          ...item,
          status: "in_progress",
          startedAt:
            item.startedAt ??
            timestamp,
          updatedAt: timestamp,
        });
      }
    }

    return this.get(
      replenishment.tenantId,
      replenishment.id,
    );
  }

  async transfer(input: {
    tenantId: string;
    replenishmentId: string;
    allocationId: string;
    quantity: number;
    transferredBy: string;
  }): Promise<ReplenishmentAllocation> {
    const replenishment =
      await this.get(
        input.tenantId,
        input.replenishmentId,
      );

    if (
      replenishment.status !==
      "in_progress"
    ) {
      throw new InventoryValidationError(
        "Transfer yalnızca devam eden ikmal operasyonunda yapılabilir.",
      );
    }

    const allocation =
      await this.allocationService.transfer({
        tenantId:
          replenishment.tenantId,
        replenishmentId:
          replenishment.id,
        allocationId:
          input.allocationId,
        quantity:
          input.quantity,
        transferredBy:
          input.transferredBy,
      });

    await this.refreshExecutionStatus(
      replenishment.tenantId,
      replenishment.id,
    );

    return allocation;
  }

  async completeTask(input: {
    tenantId: string;
    replenishmentId: string;
    taskId: string;
    completedBy: string;
  }): Promise<ReplenishmentTask> {
    const replenishment =
      await this.get(
        input.tenantId,
        input.replenishmentId,
      );

    this.requireText(
      input.completedBy,
      "Görevi tamamlayan kullanıcı",
    );

    const taskId =
      this.requireText(
        input.taskId,
        "Görev kimliği",
      );

    const task =
      (
        await this.repository.listTasks(
          replenishment.tenantId,
          replenishment.id,
        )
      ).find(
        (current) =>
          current.id === taskId,
      );

    if (!task) {
      throw new InventoryValidationError(
        `İkmal görevi bulunamadı: ${taskId}`,
      );
    }

    if (
      task.status !== "in_progress"
    ) {
      throw new InventoryValidationError(
        "Yalnızca devam eden ikmal görevi tamamlanabilir.",
      );
    }

    const timestamp = this.now();

    return this.repository.saveTask({
      ...task,
      status: "completed",
      completedAt: timestamp,
      updatedAt: timestamp,
    });
  }

  async createException(input: {
    tenantId: string;
    replenishmentId: string;
    type: ReplenishmentExceptionType;
    message: string;
    replenishmentItemId?: string;
    taskId?: string;
    allocationId?: string;
    sourceLocationId?: string;
    destinationLocationId?: string;
    productId?: string;
    skuId?: string;
  }): Promise<ReplenishmentException> {
    const replenishment =
      await this.get(
        input.tenantId,
        input.replenishmentId,
      );

    if (
      input.replenishmentItemId !==
        undefined &&
      !replenishment.items.some(
        (item) =>
          item.id ===
          input.replenishmentItemId,
      )
    ) {
      throw new InventoryValidationError(
        "İstisnaya bağlı ikmal satırı bulunamadı.",
      );
    }

    const timestamp = this.now();

    await this.repository.save({
      ...replenishment,
      status: "exception",
      updatedAt: timestamp,
    });

    return this.repository.saveException({
      id: this.createId(),
      tenantId:
        replenishment.tenantId,
      replenishmentId:
        replenishment.id,
      warehouseId:
        replenishment.warehouseId,
      type: input.type,
      message:
        this.requireText(
          input.message,
          "İstisna açıklaması",
        ),
      resolved: false,
      createdAt: timestamp,
      ...(input.replenishmentItemId !==
      undefined
        ? {
            replenishmentItemId:
              input.replenishmentItemId,
          }
        : {}),
      ...(input.taskId !== undefined
        ? {
            taskId:
              input.taskId,
          }
        : {}),
      ...(input.allocationId !==
      undefined
        ? {
            allocationId:
              input.allocationId,
          }
        : {}),
      ...(input.sourceLocationId !==
      undefined
        ? {
            sourceLocationId:
              input.sourceLocationId,
          }
        : {}),
      ...(input.destinationLocationId !==
      undefined
        ? {
            destinationLocationId:
              input.destinationLocationId,
          }
        : {}),
      ...(input.productId !== undefined
        ? {
            productId:
              input.productId,
          }
        : {}),
      ...(input.skuId !== undefined
        ? {
            skuId:
              input.skuId,
          }
        : {}),
    });
  }

  async resolveException(input: {
    tenantId: string;
    replenishmentId: string;
    exceptionId: string;
    resolvedBy: string;
    resolutionNotes: string;
  }): Promise<ReplenishmentException> {
    const replenishment =
      await this.get(
        input.tenantId,
        input.replenishmentId,
      );

    const exceptionId =
      this.requireText(
        input.exceptionId,
        "İstisna kimliği",
      );

    const exception =
      replenishment.exceptions.find(
        (current) =>
          current.id === exceptionId,
      );

    if (!exception) {
      throw new InventoryValidationError(
        `İkmal istisnası bulunamadı: ${exceptionId}`,
      );
    }

    if (exception.resolved) {
      throw new InventoryValidationError(
        "İkmal istisnası daha önce çözülmüş.",
      );
    }

    const timestamp = this.now();

    const resolved =
      await this.repository.saveException({
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

    const unresolved =
      (
        await this.repository
          .listExceptions(
            replenishment.tenantId,
            replenishment.id,
          )
      ).filter(
        (current) =>
          !current.resolved,
      );

    if (unresolved.length === 0) {
      await this.refreshExecutionStatus(
        replenishment.tenantId,
        replenishment.id,
      );
    }

    return resolved;
  }

  async complete(input: {
    tenantId: string;
    replenishmentId: string;
    completedBy: string;
  }): Promise<Replenishment> {
    const replenishment =
      await this.get(
        input.tenantId,
        input.replenishmentId,
      );

    this.requireText(
      input.completedBy,
      "İkmali tamamlayan kullanıcı",
    );

    if (
      replenishment.status !==
        "in_progress" &&
      replenishment.status !==
        "partially_completed"
    ) {
      throw new InventoryValidationError(
        "İkmal mevcut durumda tamamlanamaz.",
      );
    }

    const unresolvedExceptions =
      (
        await this.repository
          .listExceptions(
            replenishment.tenantId,
            replenishment.id,
          )
      ).filter(
        (exception) =>
          !exception.resolved,
      );

    if (
      unresolvedExceptions.length > 0
    ) {
      throw new InventoryValidationError(
        "Çözülmemiş ikmal istisnası varken operasyon tamamlanamaz.",
      );
    }

    const allocations =
      await this.repository
        .listAllocations(
          replenishment.tenantId,
          replenishment.id,
        );

    if (
      allocations.some(
        (allocation) =>
          allocation.status !==
            "completed" &&
          allocation.status !==
            "cancelled" &&
          allocation.status !==
            "released",
      )
    ) {
      throw new InventoryValidationError(
        "Tüm tahsisler sonuçlanmadan ikmal tamamlanamaz.",
      );
    }

    const items =
      await this.repository.listItems(
        replenishment.tenantId,
        replenishment.id,
      );

    if (
      items.some(
        (item) =>
          item.status !== "completed" &&
          item.status !== "cancelled",
      )
    ) {
      throw new InventoryValidationError(
        "Tüm ikmal satırları tamamlanmadan operasyon kapatılamaz.",
      );
    }

    const timestamp = this.now();

    return this.repository.save({
      ...replenishment,
      status: "completed",
      completedAt: timestamp,
      updatedAt: timestamp,
    });
  }

  async cancel(input: {
    tenantId: string;
    replenishmentId: string;
    cancelledBy: string;
    reason: string;
  }): Promise<Replenishment> {
    const replenishment =
      await this.get(
        input.tenantId,
        input.replenishmentId,
      );

    this.requireText(
      input.cancelledBy,
      "İkmali iptal eden kullanıcı",
    );

    const reason =
      this.requireText(
        input.reason,
        "İptal nedeni",
      );

    if (
      replenishment.status ===
      "completed"
    ) {
      throw new InventoryValidationError(
        "Tamamlanmış ikmal iptal edilemez.",
      );
    }

    const allocations =
      await this.repository
        .listAllocations(
          replenishment.tenantId,
          replenishment.id,
        );

    if (
      allocations.some(
        (allocation) =>
          allocation.status ===
            "completed" &&
          allocation.transferredQuantity >
            0,
      )
    ) {
      throw new InventoryValidationError(
        "Stok transferi tamamlanmış ikmal doğrudan iptal edilemez.",
      );
    }

    for (const allocation of allocations) {
      if (
        allocation.status !==
          "cancelled" &&
        allocation.status !==
          "completed"
      ) {
        await this.allocationService.cancel({
          tenantId:
            replenishment.tenantId,
          replenishmentId:
            replenishment.id,
          allocationId:
            allocation.id,
          reason,
        });
      }
    }

    const tasks =
      await this.repository.listTasks(
        replenishment.tenantId,
        replenishment.id,
      );

    const timestamp = this.now();

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
      ...replenishment,
      status: "cancelled",
      cancelledAt: timestamp,
      cancellationReason: reason,
      updatedAt: timestamp,
    });
  }

  private async refreshExecutionStatus(
    tenantId: string,
    replenishmentId: string,
  ): Promise<void> {
    const replenishment =
      await this.get(
        tenantId,
        replenishmentId,
      );

    const exceptions =
      await this.repository
        .listExceptions(
          tenantId,
          replenishmentId,
        );

    if (
      exceptions.some(
        (exception) =>
          !exception.resolved,
      )
    ) {
      await this.repository.save({
        ...replenishment,
        status: "exception",
        updatedAt: this.now(),
      });

      return;
    }

    const items =
      await this.repository.listItems(
        tenantId,
        replenishmentId,
      );

    if (items.length === 0) {
      return;
    }

    const allCompleted =
      items.every(
        (item) =>
          item.status === "completed" ||
          item.status === "cancelled",
      );

    const partiallyCompleted =
      items.some(
        (item) =>
          item.status ===
            "partially_completed" ||
          item.transferredQuantity > 0,
      );

    await this.repository.save({
      ...replenishment,
      status: allCompleted
        ? "partially_completed"
        : partiallyCompleted
          ? "partially_completed"
          : "in_progress",
      updatedAt: this.now(),
    });
  }

  private generateReplenishmentNumber(
    timestamp: string,
  ): string {
    const date =
      new Date(timestamp);

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
      "IKM",
      `${year}${month}${day}`,
      String(
        this.sequence(),
      ).padStart(6, "0"),
    ].join("-");
  }

  private trackingKey(
    tracking:
      | ReplenishmentItem["tracking"]
      | CreateReplenishmentItemInput["tracking"],
  ): string {
    if (tracking === undefined) {
      return "";
    }

    return JSON.stringify({
      lotNumber:
        tracking.lotNumber ?? "",
      serialNumber:
        tracking.serialNumber ?? "",
      productionDate:
        tracking.productionDate ?? "",
      expiryDate:
        tracking.expiryDate ?? "",
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

    const normalized =
      value.trim();

    if (!normalized) {
      throw new InventoryValidationError(
        `${fieldName} boş bırakılamaz.`,
      );
    }

    return normalized;
  }
}
