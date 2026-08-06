import type {
  CreateWaveInput,
  Wave,
  WaveListFilter,
} from "../types/Wave";
import type {
  WaveCapacity,
  WaveCapacityInput,
} from "../types/WaveCapacity";
import type {
  WaveException,
  WaveExceptionType,
} from "../types/WaveException";
import {
  isWaveExceptionType,
} from "../types/WaveException";
import {
  InventoryValidationError,
} from "../types/InventoryErrors";
import type {
  CreateWaveItemInput,
  WaveItem,
} from "../types/WaveItem";
import type {
  CreateWaveOrderInput,
  WaveOrder,
} from "../types/WaveOrder";
import type {
  WavePerformance,
  WavePerformanceFilter,
} from "../types/WavePerformance";
import type {
  CreateWaveRuleInput,
  WaveRule,
} from "../types/WaveRule";
import type {
  CreateWaveScheduleInput,
  WaveSchedule,
} from "../types/WaveSchedule";
import type {
  WaveStatus,
} from "../types/WaveStatus";
import {
  WaveAllocationService,
} from "./WaveAllocationService";
import type {
  AllocateWaveItemInput,
  WaveItemAllocationResult,
} from "./WaveAllocationService";
import {
  WaveCapacityService,
} from "./WaveCapacityService";
import {
  WaveOptimizer,
} from "./WaveOptimizer";
import {
  WavePerformanceService,
} from "./WavePerformanceService";
import type {
  WarehouseWavePerformance,
  WavePerformanceComparison,
} from "./WavePerformanceService";
import {
  WavePlanningService,
} from "./WavePlanningService";
import type {
  WavePlanningInput,
  WavePlanningResult,
  WavePlanningSummary,
  WaveTaskGenerationInput,
  WaveTaskGenerationResult,
} from "./WavePlanningService";
import {
  WaveReleaseService,
} from "./WaveReleaseService";
import type {
  ApproveWaveReleaseInput,
  CancelWaveInput,
  CompleteWaveInput,
  ExecuteWaveReleaseInput,
  PauseWaveInput,
  RequestWaveReleaseInput,
  ResumeWaveInput,
  WaveReleaseActionResult,
  WaveReleaseSummary,
  WaveReleaseValidation,
} from "./WaveReleaseService";
import type {
  WaveRepository,
} from "./WaveRepository";
import {
  validateCreateWave,
  validateCreateWaveItem,
  validateCreateWaveOrder,
  validateCreateWaveRule,
  validateCreateWaveSchedule,
} from "./WaveValidator";

export interface CreateWaveExceptionInput {
  readonly tenantId: string;
  readonly waveId: string;
  readonly type: WaveExceptionType;
  readonly message: string;
  readonly waveOrderId?: string;
  readonly waveItemId?: string;
  readonly waveTaskId?: string;
  readonly orderId?: string;
  readonly warehouseId?: string;
  readonly zoneId?: string;
  readonly productId?: string;
}

export interface ResolveWaveExceptionInput {
  readonly tenantId: string;
  readonly waveId: string;
  readonly exceptionId: string;
  readonly resolvedBy: string;
  readonly resolutionNotes?: string;
}

export interface WaveSnapshot {
  readonly wave: Wave;
  readonly orders:
    readonly WaveOrder[];
  readonly items:
    readonly WaveItem[];
  readonly allocations:
    Awaited<
      ReturnType<
        WaveRepository["listAllocations"]
      >
    >;
  readonly tasks:
    Awaited<
      ReturnType<
        WaveRepository["listTasks"]
      >
    >;
  readonly releases:
    Awaited<
      ReturnType<
        WaveRepository["listReleases"]
      >
    >;
  readonly exceptions:
    readonly WaveException[];
  readonly loadedAt: string;
}

export interface WaveServiceDependencies {
  readonly repository:
    WaveRepository;
  readonly now?: () => string;
  readonly idFactory?: (
    entity:
      | "wave"
      | "order"
      | "item"
      | "rule"
      | "schedule"
      | "exception",
  ) => string;
  readonly waveNumberFactory?:
    () => string;
  readonly optimizer?:
    WaveOptimizer;
  readonly capacityService?:
    WaveCapacityService;
  readonly allocationService?:
    WaveAllocationService;
  readonly planningService?:
    WavePlanningService;
  readonly releaseService?:
    WaveReleaseService;
  readonly performanceService?:
    WavePerformanceService;
}

export class WaveService {
  private readonly repository:
    WaveRepository;

  private readonly now: () => string;

  private readonly idFactory:
    NonNullable<
      WaveServiceDependencies[
        "idFactory"
      ]
    >;

  private readonly waveNumberFactory:
    () => string;

  private readonly capacityService:
    WaveCapacityService;

  private readonly allocationService:
    WaveAllocationService;

  private readonly planningService:
    WavePlanningService;

  private readonly releaseService:
    WaveReleaseService;

  private readonly performanceService:
    WavePerformanceService;

  constructor(
    dependencies:
      WaveServiceDependencies,
  ) {
    this.repository =
      dependencies.repository;

    this.now =
      dependencies.now ??
      (() => new Date().toISOString());

    this.idFactory =
      dependencies.idFactory ??
      ((entity) =>
        `${entity}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 12)}`);

    this.waveNumberFactory =
      dependencies.waveNumberFactory ??
      (() => {
        const date =
          new Date(
            this.now(),
          );

        const datePart = [
          date.getUTCFullYear(),
          String(
            date.getUTCMonth() + 1,
          ).padStart(2, "0"),
          String(
            date.getUTCDate(),
          ).padStart(2, "0"),
        ].join("");

        const randomPart =
          Math.random()
            .toString(36)
            .slice(2, 8)
            .toUpperCase();

        return `WAVE-${datePart}-${randomPart}`;
      });

    const optimizer =
      dependencies.optimizer ??
      new WaveOptimizer({
        now: this.now,
      });

    this.capacityService =
      dependencies.capacityService ??
      new WaveCapacityService({
        repository:
          this.repository,
        now: this.now,
      });

    this.allocationService =
      dependencies.allocationService ??
      new WaveAllocationService({
        repository:
          this.repository,
        now: this.now,
      });

    this.planningService =
      dependencies.planningService ??
      new WavePlanningService({
        repository:
          this.repository,
        optimizer,
        now: this.now,
      });

    this.releaseService =
      dependencies.releaseService ??
      new WaveReleaseService({
        repository:
          this.repository,
        now: this.now,
      });

    this.performanceService =
      dependencies.performanceService ??
      new WavePerformanceService({
        repository:
          this.repository,
        now: this.now,
      });
  }

  async createWave(
    input: CreateWaveInput,
  ): Promise<Wave> {
    const normalized =
      validateCreateWave(input);

    if (
      normalized.ruleId !==
      undefined
    ) {
      const rule =
        await this.repository
          .findRuleById(
            normalized.tenantId,
            normalized.ruleId,
          );

      if (!rule) {
        throw new InventoryValidationError(
          `Dalga kuralı bulunamadı: ${normalized.ruleId}`,
        );
      }

      if (!rule.active) {
        throw new InventoryValidationError(
          "Pasif dalga kuralıyla dalga oluşturulamaz.",
        );
      }

      if (
        rule.warehouseId !==
          undefined &&
        rule.warehouseId !==
          normalized.warehouseId
      ) {
        throw new InventoryValidationError(
          "Dalga kuralı farklı depoya aittir.",
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
          `Dalga takvimi bulunamadı: ${normalized.scheduleId}`,
        );
      }

      if (!schedule.active) {
        throw new InventoryValidationError(
          "Pasif dalga takvimiyle dalga oluşturulamaz.",
        );
      }

      if (
        schedule.warehouseId !==
        normalized.warehouseId
      ) {
        throw new InventoryValidationError(
          "Dalga takvimi farklı depoya aittir.",
        );
      }
    }

    const createdAt =
      this.normalizeDate(
        this.now(),
        "Dalga oluşturma tarihi",
      );

    const waveNumber =
      await this.createUniqueWaveNumber(
        normalized.tenantId,
      );

    const wave: Wave = {
      id: this.createId("wave"),
      tenantId:
        normalized.tenantId,
      waveNumber,
      warehouseId:
        normalized.warehouseId,
      name: normalized.name,
      strategy:
        normalized.strategy,
      status: "draft",
      priority:
        normalized.priority ?? 50,
      orders: [],
      items: [],
      allocations: [],
      tasks: [],
      releases: [],
      exceptions: [],
      createdBy:
        normalized.createdBy,
      createdAt,
      updatedAt: createdAt,
      ...(normalized.ruleId !==
      undefined
        ? {
            ruleId:
              normalized.ruleId,
          }
        : {}),
      ...(normalized.scheduleId !==
      undefined
        ? {
            scheduleId:
              normalized.scheduleId,
          }
        : {}),
      ...(normalized.plannedAt !==
      undefined
        ? {
            plannedAt:
              normalized.plannedAt,
          }
        : {}),
      ...(normalized.cutoffAt !==
      undefined
        ? {
            cutoffAt:
              normalized.cutoffAt,
          }
        : {}),
      ...(normalized.notes !==
      undefined
        ? {
            notes:
              normalized.notes,
          }
        : {}),
    };

    return this.repository.save(wave);
  }

  async addOrder(
    input: CreateWaveOrderInput,
  ): Promise<WaveOrder> {
    const normalized =
      validateCreateWaveOrder(
        input,
      );

    const wave =
      await this.requireWave(
        normalized.tenantId,
        normalized.waveId,
      );

    this.assertEditableWave(
      wave.status,
      "sipariş ekleme",
    );

    if (
      wave.warehouseId !==
      normalized.warehouseId
    ) {
      throw new InventoryValidationError(
        "Sipariş deposu ile dalga deposu uyuşmuyor.",
      );
    }

    const existingOrders =
      await this.repository.listOrders(
        normalized.tenantId,
        normalized.waveId,
      );

    if (
      existingOrders.some(
        (order) =>
          order.orderId ===
          normalized.orderId,
      )
    ) {
      throw new InventoryValidationError(
        `Sipariş zaten dalgaya eklenmiş: ${normalized.orderId}`,
      );
    }

    if (
      existingOrders.some(
        (order) =>
          order.orderNumber
            .trim()
            .toUpperCase() ===
          normalized.orderNumber
            .trim()
            .toUpperCase(),
      )
    ) {
      throw new InventoryValidationError(
        `Sipariş numarası dalgada zaten kullanılıyor: ${normalized.orderNumber}`,
      );
    }

    const createdAt =
      this.normalizeDate(
        this.now(),
        "Dalga siparişi oluşturma tarihi",
      );

    const order: WaveOrder = {
      id: this.createId("order"),
      tenantId:
        normalized.tenantId,
      waveId:
        normalized.waveId,
      orderId:
        normalized.orderId,
      orderNumber:
        normalized.orderNumber,
      warehouseId:
        normalized.warehouseId,
      priority:
        normalized.priority ?? 50,
      lineCount:
        normalized.lineCount,
      itemQuantity:
        normalized.itemQuantity,
      status: "pending",
      createdAt,
      updatedAt: createdAt,
      ...(normalized.customerId !==
      undefined
        ? {
            customerId:
              normalized.customerId,
          }
        : {}),
      ...(normalized.routeId !==
      undefined
        ? {
            routeId:
              normalized.routeId,
          }
        : {}),
      ...(normalized.carrierId !==
      undefined
        ? {
            carrierId:
              normalized.carrierId,
          }
        : {}),
      ...(normalized.serviceLevel !==
      undefined
        ? {
            serviceLevel:
              normalized.serviceLevel,
          }
        : {}),
      ...(normalized.temperatureZone !==
      undefined
        ? {
            temperatureZone:
              normalized
                .temperatureZone,
          }
        : {}),
      ...(normalized.shippingMethod !==
      undefined
        ? {
            shippingMethod:
              normalized.shippingMethod,
          }
        : {}),
      ...(normalized.destinationCountry !==
      undefined
        ? {
            destinationCountry:
              normalized
                .destinationCountry,
          }
        : {}),
      ...(normalized.destinationCity !==
      undefined
        ? {
            destinationCity:
              normalized
                .destinationCity,
          }
        : {}),
      ...(normalized.totalWeight !==
      undefined
        ? {
            totalWeight:
              normalized.totalWeight,
          }
        : {}),
      ...(normalized.totalVolume !==
      undefined
        ? {
            totalVolume:
              normalized.totalVolume,
          }
        : {}),
      ...(normalized.cutoffAt !==
      undefined
        ? {
            cutoffAt:
              normalized.cutoffAt,
          }
        : {}),
      ...(normalized.promisedAt !==
      undefined
        ? {
            promisedAt:
              normalized.promisedAt,
          }
        : {}),
      ...(normalized.notes !==
      undefined
        ? {
            notes:
              normalized.notes,
          }
        : {}),
    };

    return this.repository
      .saveOrder(order);
  }

  async addItem(
    input: CreateWaveItemInput,
  ): Promise<WaveItem> {
    const normalized =
      validateCreateWaveItem(input);

    const wave =
      await this.requireWave(
        normalized.tenantId,
        normalized.waveId,
      );

    this.assertEditableWave(
      wave.status,
      "ürün satırı ekleme",
    );

    if (
      wave.warehouseId !==
      normalized.warehouseId
    ) {
      throw new InventoryValidationError(
        "Ürün satırı deposu ile dalga deposu uyuşmuyor.",
      );
    }

    const orders =
      await this.repository.listOrders(
        normalized.tenantId,
        normalized.waveId,
      );

    const waveOrder =
      orders.find(
        (order) =>
          order.id ===
          normalized.waveOrderId,
      );

    if (!waveOrder) {
      throw new InventoryValidationError(
        `Dalga siparişi bulunamadı: ${normalized.waveOrderId}`,
      );
    }

    if (
      waveOrder.orderId !==
      normalized.orderId
    ) {
      throw new InventoryValidationError(
        "Ürün satırının sipariş kimliği dalga siparişiyle uyuşmuyor.",
      );
    }

    const existingItems =
      await this.repository.listItems(
        normalized.tenantId,
        normalized.waveId,
      );

    if (
      existingItems.some(
        (item) =>
          item.orderLineId ===
            normalized.orderLineId &&
          item.orderId ===
            normalized.orderId,
      )
    ) {
      throw new InventoryValidationError(
        `Sipariş satırı dalgada zaten mevcut: ${normalized.orderLineId}`,
      );
    }

    const createdAt =
      this.normalizeDate(
        this.now(),
        "Dalga ürün satırı oluşturma tarihi",
      );

    const item: WaveItem = {
      id: this.createId("item"),
      tenantId:
        normalized.tenantId,
      waveId:
        normalized.waveId,
      waveOrderId:
        normalized.waveOrderId,
      orderId:
        normalized.orderId,
      orderLineId:
        normalized.orderLineId,
      warehouseId:
        normalized.warehouseId,
      productId:
        normalized.productId,
      stockStatus:
        normalized.stockStatus,
      unit: normalized.unit,
      requestedQuantity:
        normalized.requestedQuantity,
      allocatedQuantity: 0,
      pickedQuantity: 0,
      shortQuantity: 0,
      remainingQuantity:
        normalized.requestedQuantity,
      priority:
        normalized.priority ?? 50,
      sequence:
        normalized.sequence ?? 1,
      status: "pending",
      createdAt,
      updatedAt: createdAt,
      ...(normalized.skuId !==
      undefined
        ? {
            skuId:
              normalized.skuId,
          }
        : {}),
      ...(normalized.zoneId !==
      undefined
        ? {
            zoneId:
              normalized.zoneId,
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
      ...(normalized.destinationLocationId !==
      undefined
        ? {
            destinationLocationId:
              normalized
                .destinationLocationId,
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
    };

    return this.repository
      .saveItem(item);
  }

  async createRule(
    input: CreateWaveRuleInput,
  ): Promise<WaveRule> {
    const normalized =
      validateCreateWaveRule(input);

    const existingRule =
      await this.repository
        .findRuleByCode(
          normalized.tenantId,
          normalized.code,
        );

    if (existingRule) {
      throw new InventoryValidationError(
        `Dalga kuralı kodu zaten kullanılıyor: ${normalized.code}`,
      );
    }

    const createdAt =
      this.normalizeDate(
        this.now(),
        "Dalga kuralı oluşturma tarihi",
      );

    const rule: WaveRule = {
      id: this.createId("rule"),
      tenantId:
        normalized.tenantId,
      code: normalized.code,
      name: normalized.name,
      strategy:
        normalized.strategy,
      automaticPlanning:
        normalized
          .automaticPlanning ??
        false,
      automaticRelease:
        normalized
          .automaticRelease ??
        false,
      allowPartialRelease:
        normalized
          .allowPartialRelease ??
        true,
      priority:
        normalized.priority ?? 50,
      active: true,
      createdBy:
        normalized.createdBy,
      createdAt,
      updatedAt: createdAt,
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
      ...(normalized.routeId !==
      undefined
        ? {
            routeId:
              normalized.routeId,
          }
        : {}),
      ...(normalized.carrierId !==
      undefined
        ? {
            carrierId:
              normalized.carrierId,
          }
        : {}),
      ...(normalized.serviceLevel !==
      undefined
        ? {
            serviceLevel:
              normalized.serviceLevel,
          }
        : {}),
      ...(normalized.temperatureZone !==
      undefined
        ? {
            temperatureZone:
              normalized
                .temperatureZone,
          }
        : {}),
      ...(normalized.maximumOrders !==
      undefined
        ? {
            maximumOrders:
              normalized.maximumOrders,
          }
        : {}),
      ...(normalized.maximumLines !==
      undefined
        ? {
            maximumLines:
              normalized.maximumLines,
          }
        : {}),
      ...(normalized.maximumItems !==
      undefined
        ? {
            maximumItems:
              normalized.maximumItems,
          }
        : {}),
      ...(normalized.maximumWeight !==
      undefined
        ? {
            maximumWeight:
              normalized.maximumWeight,
          }
        : {}),
      ...(normalized.maximumVolume !==
      undefined
        ? {
            maximumVolume:
              normalized.maximumVolume,
          }
        : {}),
      ...(normalized.maximumEstimatedMinutes !==
      undefined
        ? {
            maximumEstimatedMinutes:
              normalized
                .maximumEstimatedMinutes,
          }
        : {}),
      ...(normalized.cutoffBufferMinutes !==
      undefined
        ? {
            cutoffBufferMinutes:
              normalized
                .cutoffBufferMinutes,
          }
        : {}),
      ...(normalized.minimumPriority !==
      undefined
        ? {
            minimumPriority:
              normalized.minimumPriority,
          }
        : {}),
    };

    return this.repository
      .saveRule(rule);
  }

  async createSchedule(
    input: CreateWaveScheduleInput,
  ): Promise<WaveSchedule> {
    const normalized =
      validateCreateWaveSchedule(
        input,
      );

    const rule =
      await this.repository
        .findRuleById(
          normalized.tenantId,
          normalized.ruleId,
        );

    if (!rule) {
      throw new InventoryValidationError(
        `Dalga kuralı bulunamadı: ${normalized.ruleId}`,
      );
    }

    if (!rule.active) {
      throw new InventoryValidationError(
        "Pasif dalga kuralı için takvim oluşturulamaz.",
      );
    }

    if (
      rule.warehouseId !==
        undefined &&
      rule.warehouseId !==
        normalized.warehouseId
    ) {
      throw new InventoryValidationError(
        "Dalga kuralı ile takvim deposu uyuşmuyor.",
      );
    }

    const createdAt =
      this.normalizeDate(
        this.now(),
        "Dalga takvimi oluşturma tarihi",
      );

    const schedule:
      WaveSchedule = {
      id: this.createId(
        "schedule",
      ),
      tenantId:
        normalized.tenantId,
      ruleId:
        normalized.ruleId,
      warehouseId:
        normalized.warehouseId,
      name: normalized.name,
      startDate:
        normalized.startDate,
      frequencyMinutes:
        normalized.frequencyMinutes,
      releaseOffsetMinutes:
        normalized
          .releaseOffsetMinutes ??
        0,
      active: true,
      nextRunAt:
        normalized.startDate,
      createdBy:
        normalized.createdBy,
      createdAt,
      updatedAt: createdAt,
      ...(normalized.endDate !==
      undefined
        ? {
            endDate:
              normalized.endDate,
          }
        : {}),
      ...(normalized.cutoffTime !==
      undefined
        ? {
            cutoffTime:
              normalized.cutoffTime,
          }
        : {}),
    };

    return this.repository
      .saveSchedule(schedule);
  }

  async createException(
    input: CreateWaveExceptionInput,
  ): Promise<WaveException> {
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

    if (
      !isWaveExceptionType(
        input.type,
      )
    ) {
      throw new InventoryValidationError(
        "Dalga istisna türü geçersiz.",
      );
    }

    const wave =
      await this.requireWave(
        tenantId,
        waveId,
      );

    const createdAt =
      this.normalizeDate(
        this.now(),
        "Dalga istisnası oluşturma tarihi",
      );

    const exception:
      WaveException = {
      id: this.createId(
        "exception",
      ),
      tenantId,
      waveId,
      type: input.type,
      message:
        this.requireText(
          input.message,
          "İstisna mesajı",
        ),
      resolved: false,
      createdAt,
      ...(input.waveOrderId !==
      undefined
        ? {
            waveOrderId:
              this.requireText(
                input.waveOrderId,
                "Dalga siparişi kimliği",
              ),
          }
        : {}),
      ...(input.waveItemId !==
      undefined
        ? {
            waveItemId:
              this.requireText(
                input.waveItemId,
                "Dalga satırı kimliği",
              ),
          }
        : {}),
      ...(input.waveTaskId !==
      undefined
        ? {
            waveTaskId:
              this.requireText(
                input.waveTaskId,
                "Dalga görevi kimliği",
              ),
          }
        : {}),
      ...(input.orderId !==
      undefined
        ? {
            orderId:
              this.requireText(
                input.orderId,
                "Sipariş kimliği",
              ),
          }
        : {}),
      warehouseId:
        input.warehouseId ===
          undefined
          ? wave.warehouseId
          : this.requireText(
              input.warehouseId,
              "Depo kimliği",
            ),
      ...(input.zoneId !==
      undefined
        ? {
            zoneId:
              this.requireText(
                input.zoneId,
                "Depo bölgesi kimliği",
              ),
          }
        : {}),
      ...(input.productId !==
      undefined
        ? {
            productId:
              this.requireText(
                input.productId,
                "Ürün kimliği",
              ),
          }
        : {}),
    };

    const savedException =
      await this.repository
        .saveException(exception);

    const latestWave =
      await this.requireWave(
        tenantId,
        waveId,
      );

    if (
      latestWave.status !==
        "completed" &&
      latestWave.status !==
        "cancelled"
    ) {
      await this.repository.save({
        ...latestWave,
        status: "exception",
        updatedAt: createdAt,
      });
    }

    return savedException;
  }

  async resolveException(
    input: ResolveWaveExceptionInput,
  ): Promise<WaveException> {
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

    const exceptionId =
      this.requireText(
        input.exceptionId,
        "İstisna kimliği",
      );

    const resolvedBy =
      this.requireText(
        input.resolvedBy,
        "İstisnayı çözen kullanıcı",
      );

    await this.requireWave(
      tenantId,
      waveId,
    );

    const exceptions =
      await this.repository
        .listExceptions(
          tenantId,
          waveId,
        );

    const exception =
      exceptions.find(
        (current) =>
          current.id ===
          exceptionId,
      );

    if (!exception) {
      throw new InventoryValidationError(
        `Dalga istisnası bulunamadı: ${exceptionId}`,
      );
    }

    if (exception.resolved) {
      return exception;
    }

    const resolvedAt =
      this.normalizeDate(
        this.now(),
        "İstisna çözüm tarihi",
      );

    const resolutionNotes =
      this.normalizeOptionalText(
        input.resolutionNotes,
        "Çözüm notu",
      );

    const updatedException:
      WaveException = {
      ...exception,
      resolved: true,
      resolvedBy,
      resolvedAt,
      ...(resolutionNotes !==
      undefined
        ? {
            resolutionNotes,
          }
        : {}),
    };

    return this.repository
      .saveException(
        updatedException,
      );
  }

  async getWave(
    tenantId: string,
    waveId: string,
  ): Promise<Wave> {
    return this.requireWave(
      this.requireText(
        tenantId,
        "Firma kimliği",
      ),
      this.requireText(
        waveId,
        "Dalga kimliği",
      ),
    );
  }

  async getWaveByNumber(
    tenantId: string,
    waveNumber: string,
  ): Promise<Wave> {
    const normalizedTenantId =
      this.requireText(
        tenantId,
        "Firma kimliği",
      );

    const normalizedWaveNumber =
      this.requireText(
        waveNumber,
        "Dalga numarası",
      );

    const wave =
      await this.repository
        .findByNumber(
          normalizedTenantId,
          normalizedWaveNumber,
        );

    if (!wave) {
      throw new InventoryValidationError(
        `Dalga kaydı bulunamadı: ${normalizedWaveNumber}`,
      );
    }

    return wave;
  }

  async listWaves(
    filter: WaveListFilter,
  ): Promise<Wave[]> {
    return this.repository.list({
      ...filter,
      tenantId:
        this.requireText(
          filter.tenantId,
          "Firma kimliği",
        ),
    });
  }

  async getSnapshot(
    tenantId: string,
    waveId: string,
  ): Promise<WaveSnapshot> {
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

    const [
      wave,
      orders,
      items,
      allocations,
      tasks,
      releases,
      exceptions,
    ] = await Promise.all([
      this.requireWave(
        normalizedTenantId,
        normalizedWaveId,
      ),
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
        .listReleases(
          normalizedTenantId,
          normalizedWaveId,
        ),
      this.repository
        .listExceptions(
          normalizedTenantId,
          normalizedWaveId,
        ),
    ]);

    return {
      wave,
      orders,
      items,
      allocations,
      tasks,
      releases,
      exceptions,
      loadedAt:
        this.normalizeDate(
          this.now(),
          "Dalga anlık görüntü tarihi",
        ),
    };
  }

  calculateCapacity(
    input: WaveCapacityInput,
  ): WaveCapacity {
    return this.capacityService
      .calculate(input);
  }

  async calculateAndSaveCapacity(
    input: WaveCapacityInput,
  ): Promise<WaveCapacity> {
    return this.capacityService
      .calculateAndSave(input);
  }

  async allocateItem(
    input: AllocateWaveItemInput,
  ): Promise<WaveItemAllocationResult> {
    return this.allocationService
      .allocateAndSave(input);
  }

  async plan(
    input: WavePlanningInput,
  ): Promise<WavePlanningResult> {
    return this.planningService
      .plan(input);
  }

  async generateTasks(
    input: WaveTaskGenerationInput,
  ): Promise<WaveTaskGenerationResult> {
    return this.planningService
      .generateTasks(input);
  }

  async summarizePlanning(
    tenantId: string,
    waveId: string,
  ): Promise<WavePlanningSummary> {
    return this.planningService
      .summarize(
        tenantId,
        waveId,
      );
  }

  async validateRelease(
    tenantId: string,
    waveId: string,
  ): Promise<WaveReleaseValidation> {
    return this.releaseService
      .validate(
        tenantId,
        waveId,
      );
  }

  async requestRelease(
    input: RequestWaveReleaseInput,
  ): Promise<WaveReleaseActionResult> {
    return this.releaseService
      .requestRelease(input);
  }

  async approveRelease(
    input: ApproveWaveReleaseInput,
  ): Promise<WaveReleaseActionResult> {
    return this.releaseService
      .approveRelease(input);
  }

  async release(
    input: ExecuteWaveReleaseInput,
  ): Promise<WaveReleaseActionResult> {
    return this.releaseService
      .release(input);
  }

  async pause(
    input: PauseWaveInput,
  ): Promise<WaveReleaseActionResult> {
    return this.releaseService
      .pause(input);
  }

  async resume(
    input: ResumeWaveInput,
  ): Promise<WaveReleaseActionResult> {
    return this.releaseService
      .resume(input);
  }

  async complete(
    input: CompleteWaveInput,
  ): Promise<WaveReleaseActionResult> {
    return this.releaseService
      .complete(input);
  }

  async cancel(
    input: CancelWaveInput,
  ): Promise<WaveReleaseActionResult> {
    return this.releaseService
      .cancel(input);
  }

  async summarizeRelease(
    tenantId: string,
    waveId: string,
  ): Promise<WaveReleaseSummary> {
    return this.releaseService
      .summarize(
        tenantId,
        waveId,
      );
  }

  async calculatePerformance(
    filter: WavePerformanceFilter,
  ): Promise<WavePerformance> {
    return this.performanceService
      .calculate(filter);
  }

  async calculatePerformanceByWarehouse(
    filter: Omit<
      WavePerformanceFilter,
      "warehouseId"
    >,
  ): Promise<
    readonly WarehouseWavePerformance[]
  > {
    return this.performanceService
      .calculateByWarehouse(filter);
  }

  async comparePerformance(
    currentFilter:
      WavePerformanceFilter,
    previousFilter:
      WavePerformanceFilter,
  ): Promise<WavePerformanceComparison> {
    return this.performanceService
      .compare(
        currentFilter,
        previousFilter,
      );
  }

  private async createUniqueWaveNumber(
    tenantId: string,
  ): Promise<string> {
    for (
      let attempt = 0;
      attempt < 100;
      attempt += 1
    ) {
      const waveNumber =
        this.requireText(
          this.waveNumberFactory(),
          "Dalga numarası",
        ).toUpperCase();

      const existing =
        await this.repository
          .findByNumber(
            tenantId,
            waveNumber,
          );

      if (!existing) {
        return waveNumber;
      }
    }

    throw new InventoryValidationError(
      "Benzersiz dalga numarası oluşturulamadı.",
    );
  }

  private createId(
    entity:
      | "wave"
      | "order"
      | "item"
      | "rule"
      | "schedule"
      | "exception",
  ): string {
    return this.requireText(
      this.idFactory(entity),
      `${entity} kimliği`,
    );
  }

  private assertEditableWave(
    status: WaveStatus,
    operation: string,
  ): void {
    const allowedStatuses =
      new Set<WaveStatus>([
        "draft",
        "planned",
        "capacity_checked",
        "exception",
      ]);

    if (
      !allowedStatuses.has(status)
    ) {
      throw new InventoryValidationError(
        `Dalga mevcut durumda ${operation} işlemine uygun değildir: ${status}.`,
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

    if (
      typeof value !== "string"
    ) {
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

  private normalizeDate(
    value: string,
    fieldName: string,
  ): string {
    const timestamp =
      Date.parse(value);

    if (
      Number.isNaN(timestamp)
    ) {
      throw new InventoryValidationError(
        `${fieldName} geçerli bir tarih olmalıdır.`,
      );
    }

    return new Date(
      timestamp,
    ).toISOString();
  }
}
