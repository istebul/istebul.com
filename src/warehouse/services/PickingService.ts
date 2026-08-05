import type {
  CreatePickingInput,
  Picking,
  PickingListFilter,
} from "../types/Picking";
import type {
  CreatePickingBatchInput,
  PickingBatch,
} from "../types/PickingBatch";
import type {
  CreatePickingWaveInput,
  PickingWave,
} from "../types/PickingWave";
import type {
  ConfirmPickingItemInput,
  CreatePickingItemInput,
  PickingItem,
} from "../types/PickingItem";
import type {
  PickingException,
  PickingExceptionType,
} from "../types/PickingException";
import type {
  PickingRoute,
  PickingRouteLocation,
} from "../types/PickingRoute";
import type {
  PickingSuggestion,
} from "../types/PickingSuggestion";
import type {
  CreatePickingTaskInput,
  PickingTask,
} from "../types/PickingTask";
import { InventoryValidationError } from "../types/InventoryErrors";
import type { InventoryService } from "./InventoryService";
import type { ReservationService } from "./ReservationService";
import type { PickingRepository } from "./PickingRepository";
import {
  type GeneratePickingSuggestionsInput,
  type PickingSuggestionService,
} from "./PickingSuggestionService";
import {
  type PickingRouteOptimizer,
} from "./PickingRouteOptimizer";
import {
  validateConfirmPickingItem,
  validateCreatePicking,
  validateCreatePickingItem,
  validatePickingConfirmationTotals,
} from "./PickingValidator";

export interface PickingServiceDependencies {
  repository: PickingRepository;
  suggestionService: PickingSuggestionService;
  routeOptimizer: PickingRouteOptimizer;
  inventoryService: InventoryService;
  reservationService: ReservationService;
  createId?: () => string;
  now?: () => string;
  sequence?: () => number;
}

export interface CreatePickingRouteRequest {
  tenantId: string;
  pickingId: string;
  locations: readonly PickingRouteLocation[];
  startLocationId?: string;
  endLocationId?: string;
  averageWalkingSpeedMetersPerSecond?: number;
}

export class PickingService {
  private readonly repository: PickingRepository;
  private readonly suggestionService: PickingSuggestionService;
  private readonly routeOptimizer: PickingRouteOptimizer;
  private readonly inventoryService: InventoryService;
  private readonly reservationService: ReservationService;
  private readonly createId: () => string;
  private readonly now: () => string;
  private readonly sequence: () => number;

  constructor(
    dependencies: PickingServiceDependencies,
  ) {
    let internalSequence = 0;

    this.repository = dependencies.repository;
    this.suggestionService =
      dependencies.suggestionService;
    this.routeOptimizer =
      dependencies.routeOptimizer;
    this.inventoryService =
      dependencies.inventoryService;
    this.reservationService =
      dependencies.reservationService;

    this.createId =
      dependencies.createId ??
      (() => crypto.randomUUID());

    this.now =
      dependencies.now ??
      (() => new Date().toISOString());

    this.sequence =
      dependencies.sequence ??
      (() => ++internalSequence);
  }

  async create(
    input: CreatePickingInput,
  ): Promise<Picking> {
    const normalized =
      validateCreatePicking(input);

    if (normalized.orderId !== undefined) {
      const existing =
        await this.repository.findByOrderId(
          normalized.tenantId,
          normalized.orderId,
        );

      if (existing) {
        throw new InventoryValidationError(
          "Bu sipariş için daha önce toplama kaydı oluşturulmuş.",
        );
      }
    }

    const timestamp = this.now();

    return this.repository.save({
      id: this.createId(),
      tenantId: normalized.tenantId,
      pickingNumber:
        this.generatePickingNumber(),
      warehouseId: normalized.warehouseId,
      destinationLocationId:
        normalized.destinationLocationId,
      strategy: normalized.strategy,
      status: "draft",
      priority: normalized.priority ?? 50,
      items: [],
      suggestions: [],
      exceptions: [],
      routes: [],
      createdBy: normalized.createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(normalized.orderId !== undefined
        ? { orderId: normalized.orderId }
        : {}),
      ...(normalized.orderNumber !== undefined
        ? { orderNumber: normalized.orderNumber }
        : {}),
      ...(normalized.waveId !== undefined
        ? { waveId: normalized.waveId }
        : {}),
      ...(normalized.batchId !== undefined
        ? { batchId: normalized.batchId }
        : {}),
      ...(normalized.referenceType !== undefined
        ? {
            referenceType:
              normalized.referenceType,
          }
        : {}),
      ...(normalized.referenceId !== undefined
        ? {
            referenceId:
              normalized.referenceId,
          }
        : {}),
      ...(normalized.referenceNumber !== undefined
        ? {
            referenceNumber:
              normalized.referenceNumber,
          }
        : {}),
      ...(normalized.plannedAt !== undefined
        ? { plannedAt: normalized.plannedAt }
        : {}),
      ...(normalized.notes !== undefined
        ? { notes: normalized.notes }
        : {}),
    });
  }

  async get(
    tenantId: string,
    pickingId: string,
  ): Promise<Picking> {
    const normalizedTenantId =
      tenantId.trim();

    const normalizedPickingId =
      pickingId.trim();

    if (!normalizedTenantId) {
      throw new InventoryValidationError(
        "Firma kimliği boş bırakılamaz.",
      );
    }

    if (!normalizedPickingId) {
      throw new InventoryValidationError(
        "Toplama kimliği boş bırakılamaz.",
      );
    }

    const picking =
      await this.repository.findById(
        normalizedTenantId,
        normalizedPickingId,
      );

    if (!picking) {
      throw new InventoryValidationError(
        `Toplama kaydı bulunamadı: ${pickingId}`,
      );
    }

    return picking;
  }

  async list(
    filter: PickingListFilter,
  ): Promise<Picking[]> {
    const tenantId =
      filter.tenantId.trim();

    if (!tenantId) {
      throw new InventoryValidationError(
        "Firma kimliği boş bırakılamaz.",
      );
    }

    return this.repository.list({
      ...filter,
      tenantId,
    });
  }

  async addItem(
    input: CreatePickingItemInput,
  ): Promise<PickingItem> {
    const normalized =
      validateCreatePickingItem(input);

    const picking = await this.get(
      normalized.tenantId,
      normalized.pickingId,
    );

    if (
      picking.status !== "draft" &&
      picking.status !== "planned"
    ) {
      throw new InventoryValidationError(
        "Toplama satırı yalnızca taslak veya planlanmış kayda eklenebilir.",
      );
    }

    if (
      picking.warehouseId !==
      normalized.warehouseId
    ) {
      throw new InventoryValidationError(
        "Toplama satırındaki depo ana toplama kaydıyla aynı olmalıdır.",
      );
    }

    const destinationLocationId =
      normalized.destinationLocationId ??
      picking.destinationLocationId;

    if (
      normalized.sourceLocationId !== undefined &&
      normalized.sourceLocationId ===
        destinationLocationId
    ) {
      throw new InventoryValidationError(
        "Kaynak ve hedef lokasyon aynı olamaz.",
      );
    }

    const duplicateItem =
      picking.items.find(
        (item) =>
          item.productId ===
            normalized.productId &&
          item.skuId === normalized.skuId &&
          item.unit === normalized.unit &&
          item.sourceLocationId ===
            normalized.sourceLocationId &&
          item.tracking?.lotNumber ===
            normalized.tracking?.lotNumber &&
          item.tracking?.serialNumber ===
            normalized.tracking?.serialNumber,
      );

    if (duplicateItem) {
      throw new InventoryValidationError(
        "Aynı ürün, SKU, lokasyon ve takip bilgileriyle toplama satırı zaten bulunmaktadır.",
      );
    }

    const timestamp = this.now();

    return this.repository.saveItem({
      id: this.createId(),
      tenantId: normalized.tenantId,
      pickingId: normalized.pickingId,
      lineNumber: picking.items.length + 1,
      warehouseId: normalized.warehouseId,
      productId: normalized.productId,
      requestedQuantity:
        normalized.requestedQuantity,
      pickedQuantity: 0,
      shortQuantity: 0,
      remainingQuantity:
        normalized.requestedQuantity,
      unit: normalized.unit,
      stockStatus:
        normalized.stockStatus ?? "available",
      strategy: normalized.strategy,
      destinationLocationId,
      inventoryMovementIds: [],
      transactionGroupIds: [],
      createdBy: normalized.createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(normalized.skuId !== undefined
        ? { skuId: normalized.skuId }
        : {}),
      ...(normalized.tracking !== undefined
        ? { tracking: normalized.tracking }
        : {}),
      ...(normalized.sourceLocationId !== undefined
        ? {
            sourceLocationId:
              normalized.sourceLocationId,
          }
        : {}),
      ...(normalized.suggestionId !== undefined
        ? {
            suggestionId:
              normalized.suggestionId,
          }
        : {}),
      ...(normalized.reservationId !== undefined
        ? {
            reservationId:
              normalized.reservationId,
          }
        : {}),
      ...(normalized.notes !== undefined
        ? { notes: normalized.notes }
        : {}),
    });
  }

  async release(
    tenantId: string,
    pickingId: string,
  ): Promise<Picking> {
    const picking = await this.get(
      tenantId,
      pickingId,
    );

    if (
      picking.status !== "draft" &&
      picking.status !== "planned"
    ) {
      throw new InventoryValidationError(
        "Yalnızca taslak veya planlanmış toplama kaydı operasyona açılabilir.",
      );
    }

    if (picking.items.length === 0) {
      throw new InventoryValidationError(
        "Toplama operasyona açılmadan önce en az bir ürün satırı eklenmelidir.",
      );
    }

    const invalidItem = picking.items.find(
      (item) =>
        item.requestedQuantity <= 0 ||
        item.remainingQuantity <= 0,
    );

    if (invalidItem) {
      throw new InventoryValidationError(
        "Geçersiz miktar içeren toplama satırı operasyona açılamaz.",
      );
    }

    const timestamp = this.now();

    return this.repository.save({
      ...picking,
      status: "released",
      releasedAt: timestamp,
      updatedAt: timestamp,
    });
  }

  async start(
    tenantId: string,
    pickingId: string,
  ): Promise<Picking> {
    const picking = await this.get(
      tenantId,
      pickingId,
    );

    if (picking.status !== "released") {
      throw new InventoryValidationError(
        "Yalnızca toplamaya açılmış kayıt başlatılabilir.",
      );
    }

    const tasks =
      await this.repository.listTasks(
        picking.tenantId,
        picking.id,
      );

    if (tasks.length === 0) {
      throw new InventoryValidationError(
        "Toplama başlatılmadan önce en az bir toplama görevi oluşturulmalıdır.",
      );
    }

    const timestamp = this.now();

    return this.repository.save({
      ...picking,
      status: "in_progress",
      startedAt: timestamp,
      updatedAt: timestamp,
    });
  }

  async generateSuggestions(
    input: GeneratePickingSuggestionsInput,
  ): Promise<PickingSuggestion[]> {
    const picking = await this.get(
      input.tenantId,
      input.pickingId,
    );

    if (
      picking.status === "completed" ||
      picking.status === "cancelled"
    ) {
      throw new InventoryValidationError(
        "Tamamlanmış veya iptal edilmiş toplama için stok önerisi oluşturulamaz.",
      );
    }

    return this.suggestionService.generate(
      input,
    );
  }

  async createTask(
    input: CreatePickingTaskInput,
  ): Promise<PickingTask> {
    const tenantId =
      input.tenantId.trim();

    const pickingId =
      input.pickingId.trim();

    const warehouseId =
      input.warehouseId.trim();

    const sourceLocationId =
      input.sourceLocationId.trim();

    const destinationLocationId =
      input.destinationLocationId?.trim();

    const createdBy =
      input.createdBy.trim();

    const picking = await this.get(
      tenantId,
      pickingId,
    );

    if (
      picking.status === "completed" ||
      picking.status === "cancelled"
    ) {
      throw new InventoryValidationError(
        "Tamamlanmış veya iptal edilmiş toplama için görev oluşturulamaz.",
      );
    }

    if (!warehouseId) {
      throw new InventoryValidationError(
        "Görev depo kimliği boş bırakılamaz.",
      );
    }

    if (
      warehouseId !== picking.warehouseId
    ) {
      throw new InventoryValidationError(
        "Görev deposu toplama kaydıyla aynı olmalıdır.",
      );
    }

    if (!sourceLocationId) {
      throw new InventoryValidationError(
        "Görev kaynak lokasyonu boş bırakılamaz.",
      );
    }

    if (!createdBy) {
      throw new InventoryValidationError(
        "Görevi oluşturan kullanıcı boş bırakılamaz.",
      );
    }

    if (
      destinationLocationId !== undefined &&
      sourceLocationId ===
        destinationLocationId
    ) {
      throw new InventoryValidationError(
        "Görev kaynak ve hedef lokasyonu aynı olamaz.",
      );
    }

    const pickingItemId =
      input.pickingItemId?.trim();

    if (pickingItemId !== undefined) {
      const item = picking.items.find(
        (current) =>
          current.id === pickingItemId,
      );

      if (!item) {
        throw new InventoryValidationError(
          "Görevin bağlı olduğu toplama satırı bulunamadı.",
        );
      }

      if (
        item.sourceLocationId !== undefined &&
        item.sourceLocationId !==
          sourceLocationId
      ) {
        throw new InventoryValidationError(
          "Görev kaynak lokasyonu toplama satırıyla aynı olmalıdır.",
        );
      }
    }

    const priority =
      input.priority ?? picking.priority;

    if (
      !Number.isInteger(priority) ||
      priority < 1 ||
      priority > 100
    ) {
      throw new InventoryValidationError(
        "Görev önceliği 1 ile 100 arasında tam sayı olmalıdır.",
      );
    }

    const existingTasks =
      await this.repository.listTasks(
        picking.tenantId,
        picking.id,
      );

    const sequence =
      input.sequence ??
      existingTasks.length + 1;

    if (
      !Number.isInteger(sequence) ||
      sequence <= 0
    ) {
      throw new InventoryValidationError(
        "Görev sırası sıfırdan büyük tam sayı olmalıdır.",
      );
    }

    const plannedAt = input.plannedAt
      ? this.normalizeDate(
          input.plannedAt,
          "Görev planlama tarihi",
        )
      : undefined;

    const timestamp = this.now();

    return this.repository.saveTask({
      id: this.createId(),
      tenantId: picking.tenantId,
      pickingId: picking.id,
      warehouseId: picking.warehouseId,
      sourceLocationId,
      status: input.assignedUserId?.trim()
        ? "assigned"
        : "pending",
      priority,
      sequence,
      createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(pickingItemId !== undefined
        ? { pickingItemId }
        : {}),
      ...(destinationLocationId !== undefined
        ? { destinationLocationId }
        : {}),
      ...(input.assignedUserId?.trim()
        ? {
            assignedUserId:
              input.assignedUserId.trim(),
          }
        : {}),
      ...(input.assignedEquipmentId?.trim()
        ? {
            assignedEquipmentId:
              input.assignedEquipmentId.trim(),
          }
        : {}),
      ...(plannedAt !== undefined
        ? { plannedAt }
        : {}),
      ...(input.notes?.trim()
        ? { notes: input.notes.trim() }
        : {}),
    });
  }

  async listTasks(
    tenantId: string,
    pickingId: string,
  ): Promise<PickingTask[]> {
    const picking = await this.get(
      tenantId,
      pickingId,
    );

    return this.repository.listTasks(
      picking.tenantId,
      picking.id,
    );
  }

  async createOptimizedRoute(
    input: CreatePickingRouteRequest,
  ): Promise<PickingRoute> {
    const picking = await this.get(
      input.tenantId,
      input.pickingId,
    );

    if (
      picking.status === "completed" ||
      picking.status === "cancelled"
    ) {
      throw new InventoryValidationError(
        "Tamamlanmış veya iptal edilmiş toplama için rota oluşturulamaz.",
      );
    }

    const tasks =
      await this.repository.listTasks(
        picking.tenantId,
        picking.id,
      );

    if (tasks.length === 0) {
      throw new InventoryValidationError(
        "Rota oluşturmak için en az bir toplama görevi gereklidir.",
      );
    }

    const route =
      this.routeOptimizer.optimize({
        tenantId: picking.tenantId,
        pickingId: picking.id,
        warehouseId: picking.warehouseId,
        tasks,
        locations: input.locations,
        ...(input.startLocationId?.trim()
          ? {
              startLocationId:
                input.startLocationId.trim(),
            }
          : {}),
        ...(input.endLocationId?.trim()
          ? {
              endLocationId:
                input.endLocationId.trim(),
            }
          : {}),
        ...(input
          .averageWalkingSpeedMetersPerSecond !==
        undefined
          ? {
              averageWalkingSpeedMetersPerSecond:
                input
                  .averageWalkingSpeedMetersPerSecond,
            }
          : {}),
      });

    return this.repository.saveRoute(
      route,
    );
  }

  async listRoutes(
    tenantId: string,
    pickingId: string,
  ): Promise<PickingRoute[]> {
    const picking = await this.get(
      tenantId,
      pickingId,
    );

    return this.repository.listRoutes(
      picking.tenantId,
      picking.id,
    );
  }

  async confirmItem(
    input: ConfirmPickingItemInput,
  ): Promise<PickingItem> {
    const normalized =
      validateConfirmPickingItem(input);

    const picking = await this.get(
      normalized.tenantId,
      normalized.pickingId,
    );

    if (
      picking.status !== "in_progress" &&
      picking.status !== "partially_completed"
    ) {
      throw new InventoryValidationError(
        "Toplama onayı yalnızca devam eden operasyon üzerinde verilebilir.",
      );
    }

    const item = picking.items.find(
      (current) =>
        current.id === normalized.pickingItemId,
    );

    if (!item) {
      throw new InventoryValidationError(
        `Toplama satırı bulunamadı: ${normalized.pickingItemId}`,
      );
    }

    validatePickingConfirmationTotals(
      item.remainingQuantity,
      normalized,
    );

    if (
      item.sourceLocationId !== undefined &&
      item.sourceLocationId !==
        normalized.sourceLocationId
    ) {
      throw new InventoryValidationError(
        "Okutulan kaynak lokasyon toplama satırındaki lokasyonla uyuşmamaktadır.",
      );
    }

    const expectedDestinationLocationId =
      item.destinationLocationId ??
      picking.destinationLocationId;

    if (
      normalized.destinationLocationId !==
      expectedDestinationLocationId
    ) {
      throw new InventoryValidationError(
        "Toplama hedef lokasyonu operasyonun hedef lokasyonuyla uyuşmamaktadır.",
      );
    }

    const expectedLotNumber =
      item.tracking?.lotNumber;

    if (
      expectedLotNumber !== undefined &&
      normalized.lotNumber === undefined
    ) {
      throw new InventoryValidationError(
        "Lot takipli ürün için lot numarası okutulmalıdır.",
      );
    }

    if (
      expectedLotNumber !== undefined &&
      normalized.lotNumber !==
        expectedLotNumber
    ) {
      throw new InventoryValidationError(
        "Okutulan lot numarası toplama satırıyla uyuşmamaktadır.",
      );
    }

    const expectedSerialNumber =
      item.tracking?.serialNumber;

    if (
      expectedSerialNumber !== undefined &&
      normalized.serialNumber === undefined
    ) {
      throw new InventoryValidationError(
        "Seri numarası takipli ürün için seri numarası okutulmalıdır.",
      );
    }

    if (
      expectedSerialNumber !== undefined &&
      normalized.serialNumber !==
        expectedSerialNumber
    ) {
      throw new InventoryValidationError(
        "Okutulan seri numarası toplama satırıyla uyuşmamaktadır.",
      );
    }

    const reservation =
      item.reservationId !== undefined
        ? await this.reservationService.get(
            item.tenantId,
            item.reservationId,
          )
        : undefined;

    if (reservation !== undefined) {
      if (
        reservation.warehouseId !==
          item.warehouseId ||
        reservation.locationId !==
          normalized.sourceLocationId ||
        reservation.productId !==
          item.productId ||
        reservation.skuId !== item.skuId ||
        reservation.unit !== item.unit
      ) {
        throw new InventoryValidationError(
          "Rezervasyon bilgileri toplama satırıyla uyuşmamaktadır.",
        );
      }

      const lotNumber =
        normalized.lotNumber ??
        item.tracking?.lotNumber;

      const serialNumber =
        normalized.serialNumber ??
        item.tracking?.serialNumber;

      if (
        reservation.lotNumber !== undefined &&
        reservation.lotNumber !== lotNumber
      ) {
        throw new InventoryValidationError(
          "Rezervasyon lot numarası okutulan lot numarasıyla uyuşmamaktadır.",
        );
      }

      if (
        reservation.serialNumber !== undefined &&
        reservation.serialNumber !== serialNumber
      ) {
        throw new InventoryValidationError(
          "Rezervasyon seri numarası okutulan seri numarasıyla uyuşmamaktadır.",
        );
      }

      const reservableQuantity =
        reservation.quantity -
        reservation.consumedQuantity;

      if (
        normalized.quantity >
        reservableQuantity
      ) {
        throw new InventoryValidationError(
          `Toplama miktarı kalan rezervasyon miktarını aşamaz. Kalan rezervasyon: ${reservableQuantity}`,
        );
      }
    }

    const lotNumber =
      normalized.lotNumber ??
      item.tracking?.lotNumber;

    const serialNumber =
      normalized.serialNumber ??
      item.tracking?.serialNumber;

    const tracking = {
      ...(item.tracking ?? {}),
      ...(lotNumber !== undefined
        ? { lotNumber }
        : {}),
      ...(serialNumber !== undefined
        ? { serialNumber }
        : {}),
    };

    const hasTracking =
      Object.keys(tracking).length > 0;

    let outboundMovement:
      | Awaited<
          ReturnType<
            InventoryService["recordTransfer"]
          >
        >[0]
      | undefined;

    let inboundMovement:
      | Awaited<
          ReturnType<
            InventoryService["recordTransfer"]
          >
        >[1]
      | undefined;

    if (normalized.quantity > 0) {
      [outboundMovement, inboundMovement] =
        await this.inventoryService.recordTransfer({
          tenantId: item.tenantId,
          movementType: "location_transfer",
          warehouseId: item.warehouseId,
          locationId:
            normalized.sourceLocationId,
          sourceWarehouseId:
            item.warehouseId,
          sourceLocationId:
            normalized.sourceLocationId,
          destinationWarehouseId:
            item.warehouseId,
          destinationLocationId:
            normalized.destinationLocationId,
          productId: item.productId,
          quantity: normalized.quantity,
          unit: item.unit,
          stockStatus: item.stockStatus,
          createdBy: normalized.pickedBy,
          reference: {
            referenceType: "picking",
            referenceId: picking.id,
            referenceNumber:
              picking.pickingNumber,
          },
          reason: "Sipariş toplama işlemi",
          ...(item.skuId !== undefined
            ? { skuId: item.skuId }
            : {}),
          ...(hasTracking
            ? { tracking }
            : {}),
          ...(normalized.notes !== undefined
            ? { notes: normalized.notes }
            : {}),
        });
    }

    try {
      if (
        reservation !== undefined &&
        normalized.quantity > 0
      ) {
        await this.reservationService.consume({
          tenantId: item.tenantId,
          reservationId: reservation.id,
          quantity: normalized.quantity,
        });
      }
    } catch (error) {
      /*
       * Rezervasyon tüketimi başarısız olursa iki yönlü
       * stok transferi ters kayıtlarla geri alınır.
       */
      if (
        inboundMovement !== undefined &&
        outboundMovement !== undefined
      ) {
        await this.inventoryService.reverseMovement(
          item.tenantId,
          inboundMovement.id,
          normalized.pickedBy,
          "Rezervasyon tüketimi başarısız olduğu için toplama transferi geri alındı.",
        );

        await this.inventoryService.reverseMovement(
          item.tenantId,
          outboundMovement.id,
          normalized.pickedBy,
          "Rezervasyon tüketimi başarısız olduğu için toplama transferi geri alındı.",
        );
      }

      throw error;
    }

    const pickedQuantity =
      item.pickedQuantity +
      normalized.quantity;

    const shortQuantity =
      item.shortQuantity +
      (normalized.shortQuantity ?? 0);

    const remainingQuantity = Math.max(
      0,
      item.requestedQuantity -
        pickedQuantity -
        shortQuantity,
    );

    const newMovements = [
      outboundMovement,
      inboundMovement,
    ].filter(
      (
        movement,
      ): movement is NonNullable<
        typeof movement
      > => movement !== undefined,
    );

    const inventoryMovementIds = [
      ...item.inventoryMovementIds,
      ...newMovements.map(
        (movement) => movement.id,
      ),
    ];

    const transactionGroupIds = [
      ...item.transactionGroupIds,
      ...new Set(
        newMovements
          .map(
            (movement) =>
              movement.transactionGroupId,
          )
          .filter(
            (value): value is string =>
              value !== undefined,
          ),
      ),
    ];

    if (
      (normalized.shortQuantity ?? 0) > 0
    ) {
      await this.repository.saveException({
        id: this.createId(),
        tenantId: picking.tenantId,
        pickingId: picking.id,
        pickingItemId: item.id,
        type: "short_pick",
        message:
          `Eksik toplama kaydedildi. Eksik miktar: ${normalized.shortQuantity ?? 0}`,
        warehouseId: item.warehouseId,
        locationId:
          normalized.sourceLocationId,
        productId: item.productId,
        resolved: false,
        createdAt: this.now(),
      });
    }

    const updatedItem =
      await this.repository.saveItem({
        ...item,
        sourceLocationId:
          normalized.sourceLocationId,
        destinationLocationId:
          normalized.destinationLocationId,
        pickedQuantity,
        shortQuantity,
        remainingQuantity,
        inventoryMovementIds,
        transactionGroupIds,
        updatedAt: this.now(),
        ...(hasTracking
          ? { tracking }
          : {}),
        ...(normalized.notes !== undefined
          ? { notes: normalized.notes }
          : {}),
      });

    const tasks =
      await this.repository.listTasks(
        picking.tenantId,
        picking.id,
      );

    const relatedTasks = tasks.filter(
      (task) =>
        task.pickingItemId === item.id &&
        task.sourceLocationId ===
          normalized.sourceLocationId,
    );

    for (const task of relatedTasks) {
      await this.repository.saveTask({
        ...task,
        status:
          remainingQuantity === 0
            ? "completed"
            : "partially_completed",
        updatedAt: this.now(),
        ...(task.startedAt === undefined
          ? { startedAt: this.now() }
          : {}),
        ...(remainingQuantity === 0
          ? { completedAt: this.now() }
          : {}),
      });
    }

    const refreshed = await this.get(
      picking.tenantId,
      picking.id,
    );

    const allProcessed =
      refreshed.items.every(
        (current) =>
          current.remainingQuantity === 0,
      );

    await this.repository.save({
      ...refreshed,
      status: allProcessed
        ? "in_progress"
        : "partially_completed",
      updatedAt: this.now(),
    });

    return updatedItem;
  }

  async createException(input: {
    tenantId: string;
    pickingId: string;
    pickingItemId?: string;
    taskId?: string;
    type: PickingExceptionType;
    message: string;
    warehouseId?: string;
    locationId?: string;
    productId?: string;
  }): Promise<PickingException> {
    const picking = await this.get(
      input.tenantId,
      input.pickingId,
    );

    if (
      picking.status === "completed" ||
      picking.status === "cancelled"
    ) {
      throw new InventoryValidationError(
        "Tamamlanmış veya iptal edilmiş toplama için istisna oluşturulamaz.",
      );
    }

    const message = input.message.trim();

    if (!message) {
      throw new InventoryValidationError(
        "Toplama istisnası mesajı boş bırakılamaz.",
      );
    }

    const pickingItemId =
      input.pickingItemId?.trim();

    if (pickingItemId !== undefined) {
      const itemExists = picking.items.some(
        (item) => item.id === pickingItemId,
      );

      if (!itemExists) {
        throw new InventoryValidationError(
          "İstisnanın bağlı olduğu toplama satırı bulunamadı.",
        );
      }
    }

    const taskId = input.taskId?.trim();

    if (taskId !== undefined) {
      const tasks =
        await this.repository.listTasks(
          picking.tenantId,
          picking.id,
        );

      const taskExists = tasks.some(
        (task) => task.id === taskId,
      );

      if (!taskExists) {
        throw new InventoryValidationError(
          "İstisnanın bağlı olduğu toplama görevi bulunamadı.",
        );
      }
    }

    return this.repository.saveException({
      id: this.createId(),
      tenantId: picking.tenantId,
      pickingId: picking.id,
      type: input.type,
      message,
      resolved: false,
      createdAt: this.now(),
      ...(pickingItemId !== undefined
        ? { pickingItemId }
        : {}),
      ...(taskId !== undefined
        ? { taskId }
        : {}),
      ...(input.warehouseId?.trim()
        ? {
            warehouseId:
              input.warehouseId.trim(),
          }
        : {}),
      ...(input.locationId?.trim()
        ? {
            locationId:
              input.locationId.trim(),
          }
        : {}),
      ...(input.productId?.trim()
        ? {
            productId:
              input.productId.trim(),
          }
        : {}),
    });
  }

  async resolveException(input: {
    tenantId: string;
    pickingId: string;
    exceptionId: string;
    resolvedBy: string;
    resolutionNotes?: string;
  }): Promise<PickingException> {
    const picking = await this.get(
      input.tenantId,
      input.pickingId,
    );

    const exceptionId =
      input.exceptionId.trim();

    if (!exceptionId) {
      throw new InventoryValidationError(
        "İstisna kimliği boş bırakılamaz.",
      );
    }

    const exceptions =
      await this.repository.listExceptions(
        picking.tenantId,
        picking.id,
      );

    const exception = exceptions.find(
      (current) =>
        current.id === exceptionId,
    );

    if (!exception) {
      throw new InventoryValidationError(
        `Toplama istisnası bulunamadı: ${input.exceptionId}`,
      );
    }

    if (exception.resolved) {
      throw new InventoryValidationError(
        "Toplama istisnası daha önce çözülmüş.",
      );
    }

    const resolvedBy =
      input.resolvedBy.trim();

    if (!resolvedBy) {
      throw new InventoryValidationError(
        "İstisnayı çözen kullanıcı boş bırakılamaz.",
      );
    }

    return this.repository.saveException({
      ...exception,
      resolved: true,
      resolvedBy,
      resolvedAt: this.now(),
      ...(input.resolutionNotes?.trim()
        ? {
            resolutionNotes:
              input.resolutionNotes.trim(),
          }
        : {}),
    });
  }

  async listExceptions(
    tenantId: string,
    pickingId: string,
  ): Promise<PickingException[]> {
    const picking = await this.get(
      tenantId,
      pickingId,
    );

    return this.repository.listExceptions(
      picking.tenantId,
      picking.id,
    );
  }

  async complete(
    tenantId: string,
    pickingId: string,
    completedBy: string,
  ): Promise<Picking> {
    const picking = await this.get(
      tenantId,
      pickingId,
    );

    if (
      picking.status !== "in_progress" &&
      picking.status !== "partially_completed"
    ) {
      throw new InventoryValidationError(
        "Yalnızca devam eden toplama operasyonu tamamlanabilir.",
      );
    }

    if (!completedBy.trim()) {
      throw new InventoryValidationError(
        "Toplamayı tamamlayan kullanıcı boş bırakılamaz.",
      );
    }

    if (picking.items.length === 0) {
      throw new InventoryValidationError(
        "Ürün satırı bulunmayan toplama tamamlanamaz.",
      );
    }

    const unprocessedItem =
      picking.items.find(
        (item) =>
          item.remainingQuantity > 0,
      );

    if (unprocessedItem) {
      throw new InventoryValidationError(
        `Tüm toplama satırları işlenmeden operasyon tamamlanamaz. Kalan miktar: ${unprocessedItem.remainingQuantity}`,
      );
    }

    const missingMovement =
      picking.items.find(
        (item) =>
          item.pickedQuantity > 0 &&
          item.inventoryMovementIds.length === 0,
      );

    if (missingMovement) {
      throw new InventoryValidationError(
        "Toplanan miktarı bulunan ancak stok hareketi olmayan satır tamamlanamaz.",
      );
    }

    const unresolvedExceptions =
      await this.repository.listExceptions(
        picking.tenantId,
        picking.id,
      );

    if (
      unresolvedExceptions.some(
        (exception) =>
          !exception.resolved,
      )
    ) {
      throw new InventoryValidationError(
        "Çözülmemiş toplama istisnaları varken operasyon tamamlanamaz.",
      );
    }

    const timestamp = this.now();

    return this.repository.save({
      ...picking,
      status: "completed",
      completedAt: timestamp,
      updatedAt: timestamp,
    });
  }

  async cancel(
    tenantId: string,
    pickingId: string,
    reason: string,
  ): Promise<Picking> {
    const picking = await this.get(
      tenantId,
      pickingId,
    );

    const normalizedReason =
      reason.trim();

    if (!normalizedReason) {
      throw new InventoryValidationError(
        "İptal nedeni boş bırakılamaz.",
      );
    }

    if (
      picking.status === "completed" ||
      picking.status === "cancelled"
    ) {
      throw new InventoryValidationError(
        "Tamamlanmış veya iptal edilmiş toplama tekrar iptal edilemez.",
      );
    }

    const hasInventoryMovement =
      picking.items.some(
        (item) =>
          item.inventoryMovementIds.length >
          0,
      );

    if (hasInventoryMovement) {
      throw new InventoryValidationError(
        "Stok hareketi oluşturulmuş toplama doğrudan iptal edilemez. Önce stok ve rezervasyon hareketleri kontrollü ters kayıtla kapatılmalıdır.",
      );
    }

    const timestamp = this.now();

    return this.repository.save({
      ...picking,
      status: "cancelled",
      cancellationReason:
        normalizedReason,
      cancelledAt: timestamp,
      updatedAt: timestamp,
    });
  }

  async createWave(
    input: CreatePickingWaveInput,
  ): Promise<PickingWave> {
    const tenantId = input.tenantId.trim();
    const warehouseId = input.warehouseId.trim();
    const createdBy = input.createdBy.trim();

    if (!tenantId) {
      throw new InventoryValidationError(
        "Firma kimliği boş bırakılamaz.",
      );
    }

    if (!warehouseId) {
      throw new InventoryValidationError(
        "Depo kimliği boş bırakılamaz.",
      );
    }

    if (!createdBy) {
      throw new InventoryValidationError(
        "Dalgayı oluşturan kullanıcı boş bırakılamaz.",
      );
    }

    const pickingIds = [
      ...new Set(
        input.pickingIds
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    ];

    if (pickingIds.length === 0) {
      throw new InventoryValidationError(
        "Dalga oluşturmak için en az bir toplama kaydı gereklidir.",
      );
    }

    for (const pickingId of pickingIds) {
      const picking = await this.get(
        tenantId,
        pickingId,
      );

      if (picking.warehouseId !== warehouseId) {
        throw new InventoryValidationError(
          "Dalga içindeki tüm toplama kayıtları aynı depoya ait olmalıdır.",
        );
      }

      if (
        picking.status === "completed" ||
        picking.status === "cancelled"
      ) {
        throw new InventoryValidationError(
          "Tamamlanmış veya iptal edilmiş toplama kaydı dalgaya eklenemez.",
        );
      }
    }

    const plannedAt = input.plannedAt
      ? this.normalizeDate(
          input.plannedAt,
          "Dalga planlama tarihi",
        )
      : undefined;

    const timestamp = this.now();

    const wave = await this.repository.saveWave({
      id: this.createId(),
      tenantId,
      waveNumber:
        this.generateWaveNumber(),
      warehouseId,
      status: plannedAt
        ? "planned"
        : "draft",
      pickingIds,
      createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(plannedAt !== undefined
        ? { plannedAt }
        : {}),
      ...(input.notes?.trim()
        ? { notes: input.notes.trim() }
        : {}),
    });

    for (const pickingId of pickingIds) {
      const picking = await this.get(
        tenantId,
        pickingId,
      );

      await this.repository.save({
        ...picking,
        waveId: wave.id,
        status:
          picking.status === "draft" &&
          plannedAt !== undefined
            ? "planned"
            : picking.status,
        updatedAt: timestamp,
      });
    }

    return wave;
  }

  async listWaves(
    tenantId: string,
    warehouseId?: string,
  ): Promise<PickingWave[]> {
    const normalizedTenantId =
      tenantId.trim();

    if (!normalizedTenantId) {
      throw new InventoryValidationError(
        "Firma kimliği boş bırakılamaz.",
      );
    }

    return this.repository.listWaves(
      normalizedTenantId,
      warehouseId?.trim() || undefined,
    );
  }

  async releaseWave(
    tenantId: string,
    waveId: string,
  ): Promise<PickingWave> {
    const waves =
      await this.repository.listWaves(
        tenantId.trim(),
      );

    const wave = waves.find(
      (current) =>
        current.id === waveId.trim(),
    );

    if (!wave) {
      throw new InventoryValidationError(
        `Toplama dalgası bulunamadı: ${waveId}`,
      );
    }

    if (
      wave.status !== "draft" &&
      wave.status !== "planned"
    ) {
      throw new InventoryValidationError(
        "Yalnızca taslak veya planlanmış dalga operasyona açılabilir.",
      );
    }

    const timestamp = this.now();

    for (const pickingId of wave.pickingIds) {
      const picking = await this.get(
        wave.tenantId,
        pickingId,
      );

      if (
        picking.status === "draft" ||
        picking.status === "planned"
      ) {
        await this.release(
          picking.tenantId,
          picking.id,
        );
      }
    }

    return this.repository.saveWave({
      ...wave,
      status: "released",
      releasedAt: timestamp,
      updatedAt: timestamp,
    });
  }

  async createBatch(
    input: CreatePickingBatchInput,
  ): Promise<PickingBatch> {
    const tenantId = input.tenantId.trim();
    const warehouseId = input.warehouseId.trim();
    const createdBy = input.createdBy.trim();

    if (!tenantId) {
      throw new InventoryValidationError(
        "Firma kimliği boş bırakılamaz.",
      );
    }

    if (!warehouseId) {
      throw new InventoryValidationError(
        "Depo kimliği boş bırakılamaz.",
      );
    }

    if (!createdBy) {
      throw new InventoryValidationError(
        "Partiyi oluşturan kullanıcı boş bırakılamaz.",
      );
    }

    const pickingIds = [
      ...new Set(
        input.pickingIds
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    ];

    if (pickingIds.length === 0) {
      throw new InventoryValidationError(
        "Parti oluşturmak için en az bir toplama kaydı gereklidir.",
      );
    }

    for (const pickingId of pickingIds) {
      const picking = await this.get(
        tenantId,
        pickingId,
      );

      if (picking.warehouseId !== warehouseId) {
        throw new InventoryValidationError(
          "Parti içindeki tüm toplama kayıtları aynı depoya ait olmalıdır.",
        );
      }

      if (
        picking.status === "completed" ||
        picking.status === "cancelled"
      ) {
        throw new InventoryValidationError(
          "Tamamlanmış veya iptal edilmiş toplama kaydı partiye eklenemez.",
        );
      }
    }

    const plannedAt = input.plannedAt
      ? this.normalizeDate(
          input.plannedAt,
          "Parti planlama tarihi",
        )
      : undefined;

    const timestamp = this.now();

    const batch =
      await this.repository.saveBatch({
        id: this.createId(),
        tenantId,
        batchNumber:
          this.generateBatchNumber(),
        warehouseId,
        status: plannedAt
          ? "planned"
          : "draft",
        pickingIds,
        createdBy,
        createdAt: timestamp,
        updatedAt: timestamp,
        ...(input.assignedUserId?.trim()
          ? {
              assignedUserId:
                input.assignedUserId.trim(),
            }
          : {}),
        ...(input.assignedEquipmentId?.trim()
          ? {
              assignedEquipmentId:
                input.assignedEquipmentId.trim(),
            }
          : {}),
        ...(plannedAt !== undefined
          ? { plannedAt }
          : {}),
        ...(input.notes?.trim()
          ? { notes: input.notes.trim() }
          : {}),
      });

    for (const pickingId of pickingIds) {
      const picking = await this.get(
        tenantId,
        pickingId,
      );

      await this.repository.save({
        ...picking,
        batchId: batch.id,
        status:
          picking.status === "draft" &&
          plannedAt !== undefined
            ? "planned"
            : picking.status,
        updatedAt: timestamp,
      });
    }

    return batch;
  }

  async listBatches(
    tenantId: string,
    warehouseId?: string,
  ): Promise<PickingBatch[]> {
    const normalizedTenantId =
      tenantId.trim();

    if (!normalizedTenantId) {
      throw new InventoryValidationError(
        "Firma kimliği boş bırakılamaz.",
      );
    }

    return this.repository.listBatches(
      normalizedTenantId,
      warehouseId?.trim() || undefined,
    );
  }

  async releaseBatch(
    tenantId: string,
    batchId: string,
  ): Promise<PickingBatch> {
    const batches =
      await this.repository.listBatches(
        tenantId.trim(),
      );

    const batch = batches.find(
      (current) =>
        current.id === batchId.trim(),
    );

    if (!batch) {
      throw new InventoryValidationError(
        `Toplama partisi bulunamadı: ${batchId}`,
      );
    }

    if (
      batch.status !== "draft" &&
      batch.status !== "planned"
    ) {
      throw new InventoryValidationError(
        "Yalnızca taslak veya planlanmış parti operasyona açılabilir.",
      );
    }

    const timestamp = this.now();

    for (const pickingId of batch.pickingIds) {
      const picking = await this.get(
        batch.tenantId,
        pickingId,
      );

      if (
        picking.status === "draft" ||
        picking.status === "planned"
      ) {
        await this.release(
          picking.tenantId,
          picking.id,
        );
      }
    }

    return this.repository.saveBatch({
      ...batch,
      status: "released",
      releasedAt: timestamp,
      updatedAt: timestamp,
    });
  }

  private normalizeDate(
    value: string,
    fieldName: string,
  ): string {
    const timestamp = Date.parse(value);

    if (Number.isNaN(timestamp)) {
      throw new InventoryValidationError(
        `${fieldName} geçerli bir tarih olmalıdır.`,
      );
    }

    return new Date(timestamp).toISOString();
  }

  private generateWaveNumber(): string {
    const date = this.now()
      .slice(0, 10)
      .replaceAll("-", "");

    const sequence = String(
      this.sequence(),
    ).padStart(6, "0");

    return `DLG-${date}-${sequence}`;
  }

  private generateBatchNumber(): string {
    const date = this.now()
      .slice(0, 10)
      .replaceAll("-", "");

    const sequence = String(
      this.sequence(),
    ).padStart(6, "0");

    return `PRT-${date}-${sequence}`;
  }

  private generatePickingNumber(): string {
    const date = this.now()
      .slice(0, 10)
      .replaceAll("-", "");

    const sequence = String(
      this.sequence(),
    ).padStart(6, "0");

    return `TPL-${date}-${sequence}`;
  }
}
