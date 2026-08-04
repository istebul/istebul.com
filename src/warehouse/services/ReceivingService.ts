import type {
  CreateReceivingInput,
  Receiving,
  ReceivingListFilter,
} from "../types/Receiving";
import type {
  CreateReceivingItemInput,
  ReceiveItemQuantityInput,
  ReceivingItem,
} from "../types/ReceivingItem";
import type {
  CreateReceivingDocumentInput,
  ReceivingDocument,
} from "../types/ReceivingDocument";
import type {
  CreateReceivingTaskInput,
  ReceivingTask,
} from "../types/ReceivingTask";
import {
  InventoryValidationError,
} from "../types/InventoryErrors";
import type { InventoryService } from "./InventoryService";
import type { ReceivingRepository } from "./ReceivingRepository";
import {
  validateCreateReceiving,
  validateCreateReceivingItem,
  validateReceiveQuantity,
} from "./ReceivingValidator";

export interface ReceivingServiceDependencies {
  repository: ReceivingRepository;
  inventoryService: InventoryService;
  createId?: () => string;
  now?: () => string;
  sequence?: () => number;
}

export class ReceivingService {
  private readonly repository: ReceivingRepository;
  private readonly inventoryService: InventoryService;
  private readonly createId: () => string;
  private readonly now: () => string;
  private readonly sequence: () => number;

  constructor(dependencies: ReceivingServiceDependencies) {
    let internalSequence = 0;

    this.repository = dependencies.repository;
    this.inventoryService = dependencies.inventoryService;
    this.createId =
      dependencies.createId ?? (() => crypto.randomUUID());
    this.now =
      dependencies.now ?? (() => new Date().toISOString());
    this.sequence =
      dependencies.sequence ?? (() => ++internalSequence);
  }

  async create(input: CreateReceivingInput): Promise<Receiving> {
    const normalized = validateCreateReceiving(input);

    if (
      normalized.referenceType !== undefined &&
      normalized.referenceId !== undefined
    ) {
      const existing = await this.repository.findByReference(
        normalized.tenantId,
        normalized.referenceType,
        normalized.referenceId,
      );

      if (existing) {
        throw new InventoryValidationError(
          "Bu referans belge için daha önce mal kabul kaydı oluşturulmuş.",
        );
      }
    }

    const timestamp = this.now();

    return this.repository.save({
      id: this.createId(),
      tenantId: normalized.tenantId,
      receivingNumber: this.generateReceivingNumber(),
      warehouseId: normalized.warehouseId,
      receivingLocationId: normalized.receivingLocationId,
      source: normalized.source,
      status: "draft",
      items: [],
      exceptions: [],
      createdBy: normalized.createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(normalized.supplierId !== undefined
        ? { supplierId: normalized.supplierId }
        : {}),
      ...(normalized.supplierName !== undefined
        ? { supplierName: normalized.supplierName }
        : {}),
      ...(normalized.referenceType !== undefined
        ? { referenceType: normalized.referenceType }
        : {}),
      ...(normalized.referenceId !== undefined
        ? { referenceId: normalized.referenceId }
        : {}),
      ...(normalized.referenceNumber !== undefined
        ? { referenceNumber: normalized.referenceNumber }
        : {}),
      ...(normalized.vehiclePlate !== undefined
        ? { vehiclePlate: normalized.vehiclePlate }
        : {}),
      ...(normalized.deliveryNoteNumber !== undefined
        ? { deliveryNoteNumber: normalized.deliveryNoteNumber }
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
    receivingId: string,
  ): Promise<Receiving> {
    const receiving = await this.repository.findById(
      tenantId.trim(),
      receivingId.trim(),
    );

    if (!receiving) {
      throw new InventoryValidationError(
        `Mal kabul kaydı bulunamadı: ${receivingId}`,
      );
    }

    return receiving;
  }

  async list(
    filter: ReceivingListFilter,
  ): Promise<Receiving[]> {
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

  async start(
    tenantId: string,
    receivingId: string,
  ): Promise<Receiving> {
    const receiving = await this.get(tenantId, receivingId);

    if (
      receiving.status !== "draft" &&
      receiving.status !== "planned"
    ) {
      throw new InventoryValidationError(
        "Yalnızca taslak veya planlanmış mal kabul başlatılabilir.",
      );
    }

    if (receiving.items.length === 0) {
      throw new InventoryValidationError(
        "Mal kabul başlatılmadan önce en az bir ürün satırı eklenmelidir.",
      );
    }

    return this.repository.save({
      ...receiving,
      status: "in_progress",
      startedAt: this.now(),
      updatedAt: this.now(),
    });
  }

  async addItem(
    input: CreateReceivingItemInput,
  ): Promise<ReceivingItem> {
    const normalized = validateCreateReceivingItem(input);
    const receiving = await this.get(
      normalized.tenantId,
      normalized.receivingId,
    );

    if (
      receiving.status !== "draft" &&
      receiving.status !== "planned"
    ) {
      throw new InventoryValidationError(
        "Ürün satırı yalnızca taslak veya planlanmış mal kabule eklenebilir.",
      );
    }

    if (receiving.warehouseId !== normalized.warehouseId) {
      throw new InventoryValidationError(
        "Ürün satırındaki depo, mal kabul deposuyla aynı olmalıdır.",
      );
    }

    if (
      receiving.receivingLocationId !==
      normalized.receivingLocationId
    ) {
      throw new InventoryValidationError(
        "Ürün satırındaki lokasyon, mal kabul lokasyonuyla aynı olmalıdır.",
      );
    }

    const timestamp = this.now();

    return this.repository.saveItem({
      id: this.createId(),
      tenantId: normalized.tenantId,
      receivingId: normalized.receivingId,
      lineNumber: receiving.items.length + 1,
      warehouseId: normalized.warehouseId,
      receivingLocationId: normalized.receivingLocationId,
      productId: normalized.productId,
      expectedQuantity: normalized.expectedQuantity,
      receivedQuantity: 0,
      acceptedQuantity: 0,
      rejectedQuantity: 0,
      damagedQuantity: 0,
      unit: normalized.unit,
      stockStatus: normalized.stockStatus ?? "available",
      qualityControlRequired:
        normalized.qualityControlRequired ?? false,
      unexpectedProduct: normalized.unexpectedProduct ?? false,
      overDeliveryAllowed:
        normalized.overDeliveryAllowed ?? false,
      createdBy: normalized.createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(normalized.skuId !== undefined
        ? { skuId: normalized.skuId }
        : {}),
      ...(normalized.tracking !== undefined
        ? { tracking: normalized.tracking }
        : {}),
      ...(normalized.notes !== undefined
        ? { notes: normalized.notes }
        : {}),
    });
  }

  async receiveQuantity(
    input: ReceiveItemQuantityInput,
  ): Promise<ReceivingItem> {
    const normalized = validateReceiveQuantity(input);
    const receiving = await this.get(
      normalized.tenantId,
      normalized.receivingId,
    );

    if (
      receiving.status !== "in_progress" &&
      receiving.status !== "partially_received"
    ) {
      throw new InventoryValidationError(
        "Miktar yalnızca devam eden mal kabul işlemine girilebilir.",
      );
    }

    const item = receiving.items.find(
      (current) => current.id === normalized.receivingItemId,
    );

    if (!item) {
      throw new InventoryValidationError(
        `Mal kabul satırı bulunamadı: ${normalized.receivingItemId}`,
      );
    }

    const nextReceivedQuantity =
      item.receivedQuantity + normalized.receivedQuantity;

    if (
      nextReceivedQuantity > item.expectedQuantity &&
      !item.overDeliveryAllowed
    ) {
      throw new InventoryValidationError(
        "Fazla teslimata izin verilmediği için gelen miktar beklenen miktarı aşamaz.",
      );
    }

    const nextAcceptedQuantity =
      item.acceptedQuantity + normalized.acceptedQuantity;

    const nextRejectedQuantity =
      item.rejectedQuantity +
      (normalized.rejectedQuantity ?? 0);

    const nextDamagedQuantity =
      item.damagedQuantity +
      (normalized.damagedQuantity ?? 0);

    const updatedItem = await this.repository.saveItem({
      ...item,
      receivedQuantity: nextReceivedQuantity,
      acceptedQuantity: nextAcceptedQuantity,
      rejectedQuantity: nextRejectedQuantity,
      damagedQuantity: nextDamagedQuantity,
      updatedAt: this.now(),
      ...(normalized.tracking !== undefined
        ? { tracking: normalized.tracking }
        : {}),
      ...(normalized.rejectionReason !== undefined
        ? { rejectionReason: normalized.rejectionReason }
        : {}),
    });

    const refreshed = await this.get(
      normalized.tenantId,
      normalized.receivingId,
    );

    const allExpectedReceived = refreshed.items.every(
      (current) =>
        current.receivedQuantity >= current.expectedQuantity,
    );

    await this.repository.save({
      ...refreshed,
      status: allExpectedReceived
        ? "in_progress"
        : "partially_received",
      updatedAt: this.now(),
    });

    return updatedItem;
  }

  async addDocument(
    input: CreateReceivingDocumentInput,
  ): Promise<ReceivingDocument> {
    const receiving = await this.get(
      input.tenantId.trim(),
      input.receivingId.trim(),
    );

    if (receiving.status === "cancelled") {
      throw new InventoryValidationError(
        "İptal edilmiş mal kabule belge eklenemez.",
      );
    }

    const documentNumber = input.documentNumber.trim();

    if (!documentNumber) {
      throw new InventoryValidationError(
        "Belge numarası boş bırakılamaz.",
      );
    }

    const createdBy = input.createdBy.trim();

    if (!createdBy) {
      throw new InventoryValidationError(
        "Belgeyi ekleyen kullanıcı boş bırakılamaz.",
      );
    }

    const documentDate = input.documentDate
      ? this.normalizeOptionalDate(
          input.documentDate,
          "Belge tarihi",
        )
      : undefined;

    return this.repository.saveDocument({
      id: this.createId(),
      tenantId: receiving.tenantId,
      receivingId: receiving.id,
      type: input.type,
      documentNumber,
      createdBy,
      createdAt: this.now(),
      ...(documentDate !== undefined ? { documentDate } : {}),
      ...(input.externalSystem?.trim()
        ? { externalSystem: input.externalSystem.trim() }
        : {}),
      ...(input.externalId?.trim()
        ? { externalId: input.externalId.trim() }
        : {}),
      ...(input.fileName?.trim()
        ? { fileName: input.fileName.trim() }
        : {}),
      ...(input.fileUrl?.trim()
        ? { fileUrl: input.fileUrl.trim() }
        : {}),
      ...(input.notes?.trim()
        ? { notes: input.notes.trim() }
        : {}),
    });
  }

  async listDocuments(
    tenantId: string,
    receivingId: string,
  ): Promise<ReceivingDocument[]> {
    await this.get(tenantId, receivingId);

    return this.repository.listDocuments(
      tenantId.trim(),
      receivingId.trim(),
    );
  }

  async createTask(
    input: CreateReceivingTaskInput,
  ): Promise<ReceivingTask> {
    const receiving = await this.get(
      input.tenantId.trim(),
      input.receivingId.trim(),
    );

    if (
      receiving.status === "completed" ||
      receiving.status === "cancelled"
    ) {
      throw new InventoryValidationError(
        "Tamamlanmış veya iptal edilmiş mal kabul için görev oluşturulamaz.",
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

    const timestamp = this.now();

    return this.repository.saveTask({
      id: this.createId(),
      tenantId: receiving.tenantId,
      receivingId: receiving.id,
      type: input.type,
      status: input.assignedUserId?.trim()
        ? "assigned"
        : "pending",
      priority,
      createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(input.receivingItemId?.trim()
        ? { receivingItemId: input.receivingItemId.trim() }
        : {}),
      ...(input.assignedUserId?.trim()
        ? { assignedUserId: input.assignedUserId.trim() }
        : {}),
      ...(input.assignedEquipmentId?.trim()
        ? {
            assignedEquipmentId:
              input.assignedEquipmentId.trim(),
          }
        : {}),
      ...(input.plannedAt
        ? {
            plannedAt: this.normalizeOptionalDate(
              input.plannedAt,
              "Görev planlama tarihi",
            ),
          }
        : {}),
      ...(input.notes?.trim()
        ? { notes: input.notes.trim() }
        : {}),
    });
  }

  async listTasks(
    tenantId: string,
    receivingId: string,
  ): Promise<ReceivingTask[]> {
    await this.get(tenantId, receivingId);

    return this.repository.listTasks(
      tenantId.trim(),
      receivingId.trim(),
    );
  }

  async complete(
    tenantId: string,
    receivingId: string,
    completedBy: string,
  ): Promise<Receiving> {
    const receiving = await this.get(tenantId, receivingId);

    if (
      receiving.status !== "in_progress" &&
      receiving.status !== "partially_received"
    ) {
      throw new InventoryValidationError(
        "Yalnızca devam eden mal kabul işlemi tamamlanabilir.",
      );
    }

    if (!completedBy.trim()) {
      throw new InventoryValidationError(
        "Tamamlayan kullanıcı boş bırakılamaz.",
      );
    }

    if (receiving.items.length === 0) {
      throw new InventoryValidationError(
        "Ürün satırı bulunmayan mal kabul tamamlanamaz.",
      );
    }

    const hasUnprocessedItems = receiving.items.some(
      (item) => item.receivedQuantity === 0,
    );

    if (hasUnprocessedItems) {
      throw new InventoryValidationError(
        "Hiç işlem görmemiş ürün satırları bulunduğu için mal kabul tamamlanamaz.",
      );
    }

    const itemsRequiringQualityControl = receiving.items.filter(
      (item) =>
        item.qualityControlRequired &&
        item.acceptedQuantity > 0 &&
        item.inventoryMovementId === undefined,
    );

    if (itemsRequiringQualityControl.length > 0) {
      return this.repository.save({
        ...receiving,
        status: "quality_control",
        updatedAt: this.now(),
      });
    }

    const postedItems: ReceivingItem[] = [];

    for (const item of receiving.items) {
      if (
        item.acceptedQuantity <= 0 ||
        item.inventoryMovementId !== undefined
      ) {
        postedItems.push(item);
        continue;
      }

      const movement = await this.inventoryService.recordMovement({
        tenantId: receiving.tenantId,
        movementType: this.resolveInventoryMovementType(
          receiving.source,
        ),
        warehouseId: item.warehouseId,
        locationId: item.receivingLocationId,
        productId: item.productId,
        quantity: item.acceptedQuantity,
        unit: item.unit,
        stockStatus: item.stockStatus,
        createdBy: completedBy.trim(),
        reference: {
          referenceType: "receiving",
          referenceId: receiving.id,
          referenceNumber: receiving.receivingNumber,
        },
        ...(item.skuId !== undefined
          ? { skuId: item.skuId }
          : {}),
        ...(item.tracking !== undefined
          ? { tracking: item.tracking }
          : {}),
        ...(item.notes !== undefined
          ? { notes: item.notes }
          : {}),
      });

      const updatedItem = await this.repository.saveItem({
        ...item,
        inventoryMovementId: movement.id,
        updatedAt: this.now(),
      });

      postedItems.push(updatedItem);
    }

    const refreshed = await this.get(tenantId, receivingId);

    const timestamp = this.now();

    return this.repository.save({
      ...refreshed,
      status: "completed",
      completedAt: timestamp,
      updatedAt: timestamp,
    });
  }

  async completeQualityControl(
    tenantId: string,
    receivingId: string,
    completedBy: string,
  ): Promise<Receiving> {
    const receiving = await this.get(tenantId, receivingId);

    if (receiving.status !== "quality_control") {
      throw new InventoryValidationError(
        "Yalnızca kalite kontroldeki mal kabul tamamlanabilir.",
      );
    }

    if (!completedBy.trim()) {
      throw new InventoryValidationError(
        "Kalite kontrolü tamamlayan kullanıcı boş bırakılamaz.",
      );
    }

    const normalizedItems: ReceivingItem[] = [];

    for (const item of receiving.items) {
      if (
        item.acceptedQuantity <= 0 ||
        item.inventoryMovementId !== undefined
      ) {
        normalizedItems.push(item);
        continue;
      }

      const movement = await this.inventoryService.recordMovement({
        tenantId: receiving.tenantId,
        movementType: this.resolveInventoryMovementType(
          receiving.source,
        ),
        warehouseId: item.warehouseId,
        locationId: item.receivingLocationId,
        productId: item.productId,
        quantity: item.acceptedQuantity,
        unit: item.unit,
        stockStatus: "available",
        createdBy: completedBy.trim(),
        reference: {
          referenceType: "receiving",
          referenceId: receiving.id,
          referenceNumber: receiving.receivingNumber,
        },
        ...(item.skuId !== undefined
          ? { skuId: item.skuId }
          : {}),
        ...(item.tracking !== undefined
          ? { tracking: item.tracking }
          : {}),
      });

      const updatedItem = await this.repository.saveItem({
        ...item,
        stockStatus: "available",
        inventoryMovementId: movement.id,
        updatedAt: this.now(),
      });

      normalizedItems.push(updatedItem);
    }

    const refreshed = await this.get(tenantId, receivingId);
    const timestamp = this.now();

    return this.repository.save({
      ...refreshed,
      status: "completed",
      completedAt: timestamp,
      updatedAt: timestamp,
    });
  }

  async cancel(
    tenantId: string,
    receivingId: string,
    reason: string,
  ): Promise<Receiving> {
    const receiving = await this.get(tenantId, receivingId);
    const normalizedReason = reason.trim();

    if (!normalizedReason) {
      throw new InventoryValidationError(
        "İptal nedeni boş bırakılamaz.",
      );
    }

    if (
      receiving.status === "completed" ||
      receiving.status === "cancelled"
    ) {
      throw new InventoryValidationError(
        "Tamamlanmış veya iptal edilmiş mal kabul tekrar iptal edilemez.",
      );
    }

    const inventoryPosted = receiving.items.some(
      (item) => item.inventoryMovementId !== undefined,
    );

    if (inventoryPosted) {
      throw new InventoryValidationError(
        "Stoğa işlenmiş mal kabul doğrudan iptal edilemez. Önce stok hareketleri ters kayıtla kapatılmalıdır.",
      );
    }

    const timestamp = this.now();

    return this.repository.save({
      ...receiving,
      status: "cancelled",
      cancellationReason: normalizedReason,
      cancelledAt: timestamp,
      updatedAt: timestamp,
    });
  }

  private resolveInventoryMovementType(
    source: Receiving["source"],
  ):
    | "goods_receipt"
    | "purchase_receipt"
    | "production_receipt"
    | "customer_return"
    | "warehouse_transfer_in" {
    switch (source) {
      case "purchase_order":
      case "advance_shipping_notice":
        return "purchase_receipt";

      case "production":
        return "production_receipt";

      case "customer_return":
        return "customer_return";

      case "warehouse_transfer":
        throw new InventoryValidationError(
          "Depolar arası transfer kabulü Transfer Engine tamamlandıktan sonra etkinleştirilecektir.",
        );

      case "manual":
        return "goods_receipt";
    }
  }

  private normalizeOptionalDate(
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

  private generateReceivingNumber(): string {
    const date = this.now().slice(0, 10).replaceAll("-", "");
    const sequence = String(this.sequence()).padStart(6, "0");

    return `MK-${date}-${sequence}`;
  }
}
