import type {
  CreatePutawayInput,
  Putaway,
  PutawayListFilter,
} from "../types/Putaway";
import type {
  CreatePutawayItemInput,
  ExecutePutawayItemInput,
  PutawayItem,
} from "../types/PutawayItem";
import type {
  PutawaySuggestion,
} from "../types/PutawaySuggestion";
import type {
  CreatePutawayTaskInput,
  PutawayTask,
} from "../types/PutawayTask";
import type {
  PutawayException,
  PutawayExceptionType,
} from "../types/PutawayException";
import { InventoryValidationError } from "../types/InventoryErrors";
import type { PutawayRepository } from "./PutawayRepository";
import type { InventoryService } from "./InventoryService";
import type {
  GeneratePutawaySuggestionsInput,
  PutawaySuggestionService,
} from "./PutawaySuggestionService";
import {
  validateCreatePutaway,
  validateCreatePutawayItem,
  validateExecutePutaway,
} from "./PutawayValidator";

export interface PutawayServiceDependencies {
  repository: PutawayRepository;
  suggestionService: PutawaySuggestionService;
  inventoryService: InventoryService;
  createId?: () => string;
  now?: () => string;
  sequence?: () => number;
}

export class PutawayService {
  private readonly repository: PutawayRepository;
  private readonly suggestionService: PutawaySuggestionService;
  private readonly inventoryService: InventoryService;
  private readonly createId: () => string;
  private readonly now: () => string;
  private readonly sequence: () => number;

  constructor(
    dependencies: PutawayServiceDependencies,
  ) {
    let internalSequence = 0;

    this.repository = dependencies.repository;
    this.suggestionService = dependencies.suggestionService;
    this.inventoryService = dependencies.inventoryService;
    this.createId =
      dependencies.createId ?? (() => crypto.randomUUID());
    this.now =
      dependencies.now ?? (() => new Date().toISOString());
    this.sequence =
      dependencies.sequence ?? (() => ++internalSequence);
  }

  async create(
    input: CreatePutawayInput,
  ): Promise<Putaway> {
    const normalized = validateCreatePutaway(input);

    if (normalized.receivingId !== undefined) {
      const existing =
        await this.repository.findByReceivingId(
          normalized.tenantId,
          normalized.receivingId,
        );

      if (existing) {
        throw new InventoryValidationError(
          "Bu mal kabul kaydı için daha önce yerleştirme oluşturulmuş.",
        );
      }
    }

    if (
      normalized.qualityInspectionId !== undefined
    ) {
      const existing =
        await this.repository.findByQualityInspectionId(
          normalized.tenantId,
          normalized.qualityInspectionId,
        );

      if (existing) {
        throw new InventoryValidationError(
          "Bu kalite kontrol kaydı için daha önce yerleştirme oluşturulmuş.",
        );
      }
    }

    const timestamp = this.now();

    return this.repository.save({
      id: this.createId(),
      tenantId: normalized.tenantId,
      putawayNumber: this.generatePutawayNumber(),
      warehouseId: normalized.warehouseId,
      sourceLocationId:
        normalized.sourceLocationId,
      strategy: normalized.strategy,
      status: "draft",
      items: [],
      suggestions: [],
      exceptions: [],
      createdBy: normalized.createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(normalized.receivingId !== undefined
        ? { receivingId: normalized.receivingId }
        : {}),
      ...(normalized.qualityInspectionId !== undefined
        ? {
            qualityInspectionId:
              normalized.qualityInspectionId,
          }
        : {}),
      ...(normalized.referenceType !== undefined
        ? { referenceType: normalized.referenceType }
        : {}),
      ...(normalized.referenceId !== undefined
        ? { referenceId: normalized.referenceId }
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
    putawayId: string,
  ): Promise<Putaway> {
    const normalizedTenantId = tenantId.trim();
    const normalizedPutawayId = putawayId.trim();

    if (!normalizedTenantId) {
      throw new InventoryValidationError(
        "Firma kimliği boş bırakılamaz.",
      );
    }

    if (!normalizedPutawayId) {
      throw new InventoryValidationError(
        "Yerleştirme kimliği boş bırakılamaz.",
      );
    }

    const putaway = await this.repository.findById(
      normalizedTenantId,
      normalizedPutawayId,
    );

    if (!putaway) {
      throw new InventoryValidationError(
        `Yerleştirme kaydı bulunamadı: ${putawayId}`,
      );
    }

    return putaway;
  }

  async list(
    filter: PutawayListFilter,
  ): Promise<Putaway[]> {
    if (!filter.tenantId.trim()) {
      throw new InventoryValidationError(
        "Firma kimliği boş bırakılamaz.",
      );
    }

    return this.repository.list({
      ...filter,
      tenantId: filter.tenantId.trim(),
    });
  }

  async addItem(
    input: CreatePutawayItemInput,
  ): Promise<PutawayItem> {
    const normalized =
      validateCreatePutawayItem(input);

    const putaway = await this.get(
      normalized.tenantId,
      normalized.putawayId,
    );

    if (
      putaway.status !== "draft" &&
      putaway.status !== "planned"
    ) {
      throw new InventoryValidationError(
        "Yerleştirme satırı yalnızca taslak veya planlanmış kayda eklenebilir.",
      );
    }

    if (
      putaway.warehouseId !==
      normalized.warehouseId
    ) {
      throw new InventoryValidationError(
        "Yerleştirme satırındaki depo, ana yerleştirme kaydıyla aynı olmalıdır.",
      );
    }

    if (
      putaway.sourceLocationId !==
      normalized.sourceLocationId
    ) {
      throw new InventoryValidationError(
        "Yerleştirme satırındaki kaynak lokasyon, ana kayıtla aynı olmalıdır.",
      );
    }

    if (
      normalized.targetLocationId !== undefined &&
      normalized.targetLocationId ===
        normalized.sourceLocationId
    ) {
      throw new InventoryValidationError(
        "Kaynak ve hedef lokasyon aynı olamaz.",
      );
    }

    const timestamp = this.now();

    return this.repository.saveItem({
      id: this.createId(),
      tenantId: normalized.tenantId,
      putawayId: normalized.putawayId,
      lineNumber: putaway.items.length + 1,
      warehouseId: normalized.warehouseId,
      sourceLocationId:
        normalized.sourceLocationId,
      productId: normalized.productId,
      requestedQuantity:
        normalized.requestedQuantity,
      placedQuantity: 0,
      remainingQuantity:
        normalized.requestedQuantity,
      unit: normalized.unit,
      stockStatus:
        normalized.stockStatus ?? "available",
      strategy: normalized.strategy,
      inventoryMovementIds: [],
      transactionGroupIds: [],
      createdBy: normalized.createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(normalized.targetLocationId !== undefined
        ? {
            targetLocationId:
              normalized.targetLocationId,
          }
        : {}),
      ...(normalized.skuId !== undefined
        ? { skuId: normalized.skuId }
        : {}),
      ...(normalized.tracking !== undefined
        ? { tracking: normalized.tracking }
        : {}),
      ...(normalized.suggestionId !== undefined
        ? { suggestionId: normalized.suggestionId }
        : {}),
      ...(normalized.notes !== undefined
        ? { notes: normalized.notes }
        : {}),
    });
  }

  async start(
    tenantId: string,
    putawayId: string,
  ): Promise<Putaway> {
    const putaway = await this.get(
      tenantId,
      putawayId,
    );

    if (
      putaway.status !== "draft" &&
      putaway.status !== "planned"
    ) {
      throw new InventoryValidationError(
        "Yalnızca taslak veya planlanmış yerleştirme başlatılabilir.",
      );
    }

    if (putaway.items.length === 0) {
      throw new InventoryValidationError(
        "Yerleştirme başlatılmadan önce en az bir ürün satırı eklenmelidir.",
      );
    }

    const timestamp = this.now();

    return this.repository.save({
      ...putaway,
      status: "in_progress",
      startedAt: timestamp,
      updatedAt: timestamp,
    });
  }

  async generateSuggestions(
    input: GeneratePutawaySuggestionsInput,
  ): Promise<PutawaySuggestion[]> {
    const putaway = await this.get(
      input.tenantId,
      input.putawayId,
    );

    if (
      putaway.status === "completed" ||
      putaway.status === "cancelled"
    ) {
      throw new InventoryValidationError(
        "Tamamlanmış veya iptal edilmiş yerleştirme için öneri üretilemez.",
      );
    }

    return this.suggestionService.generate(input);
  }

  async executeItem(
    input: ExecutePutawayItemInput,
  ): Promise<PutawayItem> {
    const normalized = validateExecutePutaway(input);

    const putaway = await this.get(
      normalized.tenantId,
      normalized.putawayId,
    );

    if (
      putaway.status !== "in_progress" &&
      putaway.status !== "partially_completed"
    ) {
      throw new InventoryValidationError(
        "Yerleştirme yalnızca devam eden işlem üzerinde gerçekleştirilebilir.",
      );
    }

    const item = putaway.items.find(
      (current) =>
        current.id === normalized.putawayItemId,
    );

    if (!item) {
      throw new InventoryValidationError(
        `Yerleştirme satırı bulunamadı: ${normalized.putawayItemId}`,
      );
    }

    if (
      normalized.targetLocationId ===
      item.sourceLocationId
    ) {
      throw new InventoryValidationError(
        "Kaynak ve hedef lokasyon aynı olamaz.",
      );
    }

    if (
      normalized.quantity >
      item.remainingQuantity
    ) {
      throw new InventoryValidationError(
        `Yerleştirme miktarı kalan miktarı aşamaz. Kalan miktar: ${item.remainingQuantity}`,
      );
    }

    const [outboundMovement, inboundMovement] =
      await this.inventoryService.recordTransfer({
        tenantId: item.tenantId,
        movementType: "putaway",
        warehouseId: item.warehouseId,
        locationId: item.sourceLocationId,
        sourceWarehouseId: item.warehouseId,
        sourceLocationId: item.sourceLocationId,
        destinationWarehouseId: item.warehouseId,
        destinationLocationId:
          normalized.targetLocationId,
        productId: item.productId,
        quantity: normalized.quantity,
        unit: item.unit,
        stockStatus: item.stockStatus,
        createdBy: normalized.executedBy,
        reference: {
          referenceType: "putaway",
          referenceId: putaway.id,
          referenceNumber: putaway.putawayNumber,
        },
        reason: "Depo içi yerleştirme işlemi",
        ...(item.skuId !== undefined
          ? { skuId: item.skuId }
          : {}),
        ...(item.tracking !== undefined
          ? { tracking: item.tracking }
          : {}),
        ...(normalized.notes !== undefined
          ? { notes: normalized.notes }
          : {}),
      });

    const placedQuantity =
      item.placedQuantity + normalized.quantity;

    const remainingQuantity = Math.max(
      0,
      item.requestedQuantity - placedQuantity,
    );

    const movementIds = [
      ...item.inventoryMovementIds,
      outboundMovement.id,
      inboundMovement.id,
    ];

    const transactionGroupIds = [
      ...item.transactionGroupIds,
      ...new Set(
        [
          outboundMovement.transactionGroupId,
          inboundMovement.transactionGroupId,
        ].filter(
          (value): value is string =>
            value !== undefined,
        ),
      ),
    ];

    const updatedItem =
      await this.repository.saveItem({
        ...item,
        targetLocationId:
          normalized.targetLocationId,
        placedQuantity,
        remainingQuantity,
        inventoryMovementIds: movementIds,
        transactionGroupIds,
        updatedAt: this.now(),
        ...(normalized.notes !== undefined
          ? { notes: normalized.notes }
          : {}),
      });

    const refreshed = await this.get(
      normalized.tenantId,
      normalized.putawayId,
    );

    const allCompleted = refreshed.items.every(
      (current) => current.remainingQuantity === 0,
    );

    await this.repository.save({
      ...refreshed,
      status: allCompleted
        ? "in_progress"
        : "partially_completed",
      updatedAt: this.now(),
    });

    return updatedItem;
  }

  async createTask(
    input: CreatePutawayTaskInput,
  ): Promise<PutawayTask> {
    const putaway = await this.get(
      input.tenantId.trim(),
      input.putawayId.trim(),
    );

    if (
      putaway.status === "completed" ||
      putaway.status === "cancelled"
    ) {
      throw new InventoryValidationError(
        "Tamamlanmış veya iptal edilmiş yerleştirme için görev oluşturulamaz.",
      );
    }

    if (input.putawayItemId?.trim()) {
      const itemExists = putaway.items.some(
        (item) => item.id === input.putawayItemId?.trim(),
      );

      if (!itemExists) {
        throw new InventoryValidationError(
          "Görevin bağlı olduğu yerleştirme satırı bulunamadı.",
        );
      }
    }

    const sourceLocationId =
      input.sourceLocationId.trim();

    const targetLocationId =
      input.targetLocationId.trim();

    if (!sourceLocationId) {
      throw new InventoryValidationError(
        "Görev kaynak lokasyonu boş bırakılamaz.",
      );
    }

    if (!targetLocationId) {
      throw new InventoryValidationError(
        "Görev hedef lokasyonu boş bırakılamaz.",
      );
    }

    if (sourceLocationId === targetLocationId) {
      throw new InventoryValidationError(
        "Görev kaynak ve hedef lokasyonu aynı olamaz.",
      );
    }

    if (sourceLocationId !== putaway.sourceLocationId) {
      throw new InventoryValidationError(
        "Görev kaynak lokasyonu yerleştirme kaydıyla aynı olmalıdır.",
      );
    }

    const priority = input.priority ?? 50;

    if (
      !Number.isInteger(priority) ||
      priority < 1 ||
      priority > 100
    ) {
      throw new InventoryValidationError(
        "Görev önceliği 1 ile 100 arasında tam sayı olmalıdır.",
      );
    }

    const createdBy = input.createdBy.trim();

    if (!createdBy) {
      throw new InventoryValidationError(
        "Görevi oluşturan kullanıcı boş bırakılamaz.",
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
      tenantId: putaway.tenantId,
      putawayId: putaway.id,
      sourceLocationId,
      targetLocationId,
      status: input.assignedUserId?.trim()
        ? "assigned"
        : "pending",
      priority,
      createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(input.putawayItemId?.trim()
        ? {
            putawayItemId:
              input.putawayItemId.trim(),
          }
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
    putawayId: string,
  ): Promise<PutawayTask[]> {
    const putaway = await this.get(
      tenantId,
      putawayId,
    );

    return this.repository.listTasks(
      putaway.tenantId,
      putaway.id,
    );
  }

  async createException(input: {
    tenantId: string;
    putawayId: string;
    putawayItemId?: string;
    type: PutawayExceptionType;
    message: string;
    sourceLocationId?: string;
    targetLocationId?: string;
  }): Promise<PutawayException> {
    const putaway = await this.get(
      input.tenantId.trim(),
      input.putawayId.trim(),
    );

    if (
      putaway.status === "completed" ||
      putaway.status === "cancelled"
    ) {
      throw new InventoryValidationError(
        "Tamamlanmış veya iptal edilmiş yerleştirme için istisna oluşturulamaz.",
      );
    }

    const message = input.message.trim();

    if (!message) {
      throw new InventoryValidationError(
        "Yerleştirme istisnası mesajı boş bırakılamaz.",
      );
    }

    if (input.putawayItemId?.trim()) {
      const itemExists = putaway.items.some(
        (item) => item.id === input.putawayItemId?.trim(),
      );

      if (!itemExists) {
        throw new InventoryValidationError(
          "İstisnanın bağlı olduğu yerleştirme satırı bulunamadı.",
        );
      }
    }

    return this.repository.saveException({
      id: this.createId(),
      tenantId: putaway.tenantId,
      putawayId: putaway.id,
      type: input.type,
      message,
      resolved: false,
      createdAt: this.now(),
      ...(input.putawayItemId?.trim()
        ? {
            putawayItemId:
              input.putawayItemId.trim(),
          }
        : {}),
      ...(input.sourceLocationId?.trim()
        ? {
            sourceLocationId:
              input.sourceLocationId.trim(),
          }
        : {}),
      ...(input.targetLocationId?.trim()
        ? {
            targetLocationId:
              input.targetLocationId.trim(),
          }
        : {}),
    });
  }

  async resolveException(input: {
    tenantId: string;
    putawayId: string;
    exceptionId: string;
    resolvedBy: string;
    resolutionNotes?: string;
  }): Promise<PutawayException> {
    const putaway = await this.get(
      input.tenantId.trim(),
      input.putawayId.trim(),
    );

    const exceptionId = input.exceptionId.trim();

    if (!exceptionId) {
      throw new InventoryValidationError(
        "İstisna kimliği boş bırakılamaz.",
      );
    }

    const exception = putaway.exceptions.find(
      (current) => current.id === exceptionId,
    );

    if (!exception) {
      throw new InventoryValidationError(
        `Yerleştirme istisnası bulunamadı: ${input.exceptionId}`,
      );
    }

    if (exception.resolved) {
      throw new InventoryValidationError(
        "Yerleştirme istisnası daha önce çözülmüş.",
      );
    }

    const resolvedBy = input.resolvedBy.trim();

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
    putawayId: string,
  ): Promise<PutawayException[]> {
    const putaway = await this.get(
      tenantId,
      putawayId,
    );

    return this.repository.listExceptions(
      putaway.tenantId,
      putaway.id,
    );
  }

  async complete(
    tenantId: string,
    putawayId: string,
    completedBy: string,
  ): Promise<Putaway> {
    const putaway = await this.get(
      tenantId,
      putawayId,
    );

    if (
      putaway.status !== "in_progress" &&
      putaway.status !== "partially_completed"
    ) {
      throw new InventoryValidationError(
        "Yalnızca devam eden yerleştirme tamamlanabilir.",
      );
    }

    if (!completedBy.trim()) {
      throw new InventoryValidationError(
        "Yerleştirmeyi tamamlayan kullanıcı boş bırakılamaz.",
      );
    }

    if (putaway.items.length === 0) {
      throw new InventoryValidationError(
        "Ürün satırı bulunmayan yerleştirme tamamlanamaz.",
      );
    }

    const incompleteItem = putaway.items.find(
      (item) => item.remainingQuantity > 0,
    );

    if (incompleteItem) {
      throw new InventoryValidationError(
        `Tüm ürünler yerleştirilmeden işlem tamamlanamaz. Kalan miktar: ${incompleteItem.remainingQuantity}`,
      );
    }

    const missingMovement = putaway.items.find(
      (item) => item.inventoryMovementIds.length === 0,
    );

    if (missingMovement) {
      throw new InventoryValidationError(
        "Stok hareketi bulunmayan yerleştirme satırı tamamlanamaz.",
      );
    }

    const timestamp = this.now();

    return this.repository.save({
      ...putaway,
      status: "completed",
      completedAt: timestamp,
      updatedAt: timestamp,
    });
  }

  async cancel(
    tenantId: string,
    putawayId: string,
    reason: string,
  ): Promise<Putaway> {
    const putaway = await this.get(
      tenantId,
      putawayId,
    );

    const normalizedReason = reason.trim();

    if (!normalizedReason) {
      throw new InventoryValidationError(
        "İptal nedeni boş bırakılamaz.",
      );
    }

    if (
      putaway.status === "completed" ||
      putaway.status === "cancelled"
    ) {
      throw new InventoryValidationError(
        "Tamamlanmış veya iptal edilmiş yerleştirme tekrar iptal edilemez.",
      );
    }

    const hasInventoryMovement = putaway.items.some(
      (item) => item.inventoryMovementIds.length > 0,
    );

    if (hasInventoryMovement) {
      throw new InventoryValidationError(
        "Stok hareketi oluşturulmuş yerleştirme doğrudan iptal edilemez. Önce stok hareketleri ters kayıtla kapatılmalıdır.",
      );
    }

    const timestamp = this.now();

    return this.repository.save({
      ...putaway,
      status: "cancelled",
      cancellationReason: normalizedReason,
      cancelledAt: timestamp,
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

  private generatePutawayNumber(): string {
    const date = this.now()
      .slice(0, 10)
      .replaceAll("-", "");

    const sequence = String(
      this.sequence(),
    ).padStart(6, "0");

    return `YRL-${date}-${sequence}`;
  }
}
