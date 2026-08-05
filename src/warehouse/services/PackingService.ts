import type {
  CreatePackingInput,
  Packing,
  PackingListFilter,
} from "../types/Packing";
import type {
  ConfirmPackingItemInput,
  CreatePackingItemInput,
  PackingItem,
} from "../types/PackingItem";
import type {
  AddPackingPackageItemInput,
  CreatePackingPackageInput,
  PackingPackage,
  PackingPackageItem,
} from "../types/PackingPackage";
import type {
  PackingException,
  PackingExceptionType,
} from "../types/PackingException";
import type {
  PackingLabel,
} from "../types/PackingLabel";
import type {
  PackingSuggestion,
} from "../types/PackingSuggestion";
import type {
  CreatePackingTaskInput,
  PackingTask,
} from "../types/PackingTask";
import {
  InventoryValidationError,
} from "../types/InventoryErrors";
import type {
  PackingRepository,
} from "./PackingRepository";
import type {
  PickingService,
} from "./PickingService";
import type {
  GeneratePackingSuggestionsInput,
  PackingSuggestionService,
} from "./PackingSuggestionService";
import type {
  PackingContainerService,
} from "./PackingContainerService";
import type {
  PackingLabelService,
} from "./PackingLabelService";
import {
  validateAddPackingPackageItem,
  validateConfirmPackingItem,
  validateCreatePacking,
  validateCreatePackingItem,
  validateCreatePackingPackage,
  validateCreatePackingTask,
  validatePackingConfirmationTotals,
} from "./PackingValidator";

export interface PackingServiceDependencies {
  repository: PackingRepository;
  suggestionService: PackingSuggestionService;
  containerService: PackingContainerService;
  labelService: PackingLabelService;
  pickingService: PickingService;
  createId?: () => string;
  now?: () => string;
  sequence?: () => number;
}

export class PackingService {
  private readonly repository:
    PackingRepository;

  private readonly suggestionService:
    PackingSuggestionService;

  private readonly containerService:
    PackingContainerService;

  private readonly labelService:
    PackingLabelService;

  private readonly pickingService:
    PickingService;

  private readonly createId:
    () => string;

  private readonly now:
    () => string;

  private readonly sequence:
    () => number;

  constructor(
    dependencies:
      PackingServiceDependencies,
  ) {
    let internalSequence = 0;

    this.repository =
      dependencies.repository;

    this.suggestionService =
      dependencies.suggestionService;

    this.containerService =
      dependencies.containerService;

    this.labelService =
      dependencies.labelService;

    this.pickingService =
      dependencies.pickingService;

    this.createId =
      dependencies.createId ??
      (() => crypto.randomUUID());

    this.now =
      dependencies.now ??
      (() =>
        new Date().toISOString());

    this.sequence =
      dependencies.sequence ??
      (() => ++internalSequence);
  }

  async createFromPicking(input: {
    tenantId: string;
    pickingId: string;
    packingLocationId: string;
    shippingLocationId?: string;
    strategy?: Packing["strategy"];
    priority?: number;
    plannedAt?: string;
    notes?: string;
    createdBy: string;
  }): Promise<Packing> {
    const tenantId =
      input.tenantId.trim();

    const pickingId =
      input.pickingId.trim();

    if (!tenantId) {
      throw new InventoryValidationError(
        "Firma kimliği boş bırakılamaz.",
      );
    }

    if (!pickingId) {
      throw new InventoryValidationError(
        "Toplama kimliği boş bırakılamaz.",
      );
    }

    const existing =
      await this.repository
        .findByPickingId(
          tenantId,
          pickingId,
        );

    if (existing) {
      throw new InventoryValidationError(
        "Bu toplama kaydı için daha önce paketleme emri oluşturulmuş.",
      );
    }

    const picking =
      await this.pickingService.get(
        tenantId,
        pickingId,
      );

    if (picking.status !== "completed") {
      throw new InventoryValidationError(
        "Yalnızca tamamlanmış toplama kaydı paketlemeye aktarılabilir.",
      );
    }

    const transferableItems =
      picking.items.filter(
        (item) =>
          item.pickedQuantity > 0,
      );

    if (transferableItems.length === 0) {
      throw new InventoryValidationError(
        "Toplama kaydında paketlemeye aktarılabilecek ürün bulunamadı.",
      );
    }

    const packing = await this.create({
      tenantId: picking.tenantId,
      warehouseId: picking.warehouseId,
      packingLocationId:
        input.packingLocationId,
      strategy:
        input.strategy ??
        "cartonization",
      pickingId: picking.id,
      ...(picking.orderId !== undefined
        ? { orderId: picking.orderId }
        : {}),
      ...(picking.orderNumber !== undefined
        ? {
            orderNumber:
              picking.orderNumber,
          }
        : {}),
      referenceType: "picking",
      referenceId: picking.id,
      referenceNumber:
        picking.pickingNumber,
      priority:
        input.priority ??
        picking.priority,
      createdBy:
        input.createdBy,
      ...(input.shippingLocationId?.trim()
        ? {
            shippingLocationId:
              input.shippingLocationId.trim(),
          }
        : {}),
      ...(input.plannedAt !== undefined
        ? {
            plannedAt:
              input.plannedAt,
          }
        : {}),
      ...(input.notes?.trim()
        ? { notes: input.notes.trim() }
        : {}),
    });

    for (const pickingItem of transferableItems) {
      await this.addItem({
        tenantId: packing.tenantId,
        packingId: packing.id,
        pickingId: picking.id,
        pickingItemId:
          pickingItem.id,
        warehouseId:
          pickingItem.warehouseId,
        packingLocationId:
          packing.packingLocationId,
        productId:
          pickingItem.productId,
        requestedQuantity:
          pickingItem.pickedQuantity,
        unit: pickingItem.unit,
        createdBy:
          input.createdBy,
        ...(pickingItem.skuId !== undefined
          ? {
              skuId:
                pickingItem.skuId,
            }
          : {}),
        ...(pickingItem.tracking !== undefined
          ? {
              tracking:
                pickingItem.tracking,
            }
          : {}),
      });
    }

    return this.get(
      packing.tenantId,
      packing.id,
    );
  }

  async create(
    input: CreatePackingInput,
  ): Promise<Packing> {
    const normalized =
      validateCreatePacking(input);

    if (
      normalized.pickingId !== undefined
    ) {
      const existing =
        await this.repository
          .findByPickingId(
            normalized.tenantId,
            normalized.pickingId,
          );

      if (existing) {
        throw new InventoryValidationError(
          "Bu toplama kaydı için daha önce paketleme emri oluşturulmuş.",
        );
      }
    }

    if (
      normalized.orderId !== undefined
    ) {
      const existing =
        await this.repository
          .findByOrderId(
            normalized.tenantId,
            normalized.orderId,
          );

      if (existing) {
        throw new InventoryValidationError(
          "Bu sipariş için daha önce paketleme emri oluşturulmuş.",
        );
      }
    }

    if (
      normalized.referenceType !== undefined &&
      normalized.referenceId !== undefined
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
          "Bu referans için daha önce paketleme emri oluşturulmuş.",
        );
      }
    }

    const timestamp = this.now();

    return this.repository.save({
      id: this.createId(),
      tenantId: normalized.tenantId,
      packingNumber:
        this.generatePackingNumber(),
      warehouseId:
        normalized.warehouseId,
      packingLocationId:
        normalized.packingLocationId,
      strategy: normalized.strategy,
      status: normalized.plannedAt
        ? "planned"
        : "draft",
      priority:
        normalized.priority ?? 50,
      items: [],
      packages: [],
      labels: [],
      suggestions: [],
      exceptions: [],
      createdBy: normalized.createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(normalized.shippingLocationId !==
      undefined
        ? {
            shippingLocationId:
              normalized.shippingLocationId,
          }
        : {}),
      ...(normalized.pickingId !== undefined
        ? {
            pickingId:
              normalized.pickingId,
          }
        : {}),
      ...(normalized.orderId !== undefined
        ? {
            orderId:
              normalized.orderId,
          }
        : {}),
      ...(normalized.orderNumber !== undefined
        ? {
            orderNumber:
              normalized.orderNumber,
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
      ...(normalized.plannedAt !== undefined
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
    packingId: string,
  ): Promise<Packing> {
    const normalizedTenantId =
      tenantId.trim();

    const normalizedPackingId =
      packingId.trim();

    if (!normalizedTenantId) {
      throw new InventoryValidationError(
        "Firma kimliği boş bırakılamaz.",
      );
    }

    if (!normalizedPackingId) {
      throw new InventoryValidationError(
        "Paketleme kimliği boş bırakılamaz.",
      );
    }

    const packing =
      await this.repository.findById(
        normalizedTenantId,
        normalizedPackingId,
      );

    if (!packing) {
      throw new InventoryValidationError(
        `Paketleme kaydı bulunamadı: ${packingId}`,
      );
    }

    return packing;
  }

  async list(
    filter: PackingListFilter,
  ): Promise<Packing[]> {
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
    input: CreatePackingItemInput,
  ): Promise<PackingItem> {
    const normalized =
      validateCreatePackingItem(input);

    const packing = await this.get(
      normalized.tenantId,
      normalized.packingId,
    );

    if (
      packing.status !== "draft" &&
      packing.status !== "planned"
    ) {
      throw new InventoryValidationError(
        "Paketleme satırı yalnızca taslak veya planlanmış kayda eklenebilir.",
      );
    }

    if (
      packing.warehouseId !==
      normalized.warehouseId
    ) {
      throw new InventoryValidationError(
        "Paketleme satırındaki depo ana paketleme kaydıyla aynı olmalıdır.",
      );
    }

    if (
      packing.packingLocationId !==
      normalized.packingLocationId
    ) {
      throw new InventoryValidationError(
        "Paketleme satırındaki lokasyon ana paketleme kaydıyla aynı olmalıdır.",
      );
    }

    const duplicateItem =
      packing.items.find(
        (item) =>
          item.productId ===
            normalized.productId &&
          item.skuId ===
            normalized.skuId &&
          item.unit ===
            normalized.unit &&
          item.pickingItemId ===
            normalized.pickingItemId &&
          item.tracking?.lotNumber ===
            normalized.tracking?.lotNumber &&
          item.tracking?.serialNumber ===
            normalized.tracking?.serialNumber,
      );

    if (duplicateItem) {
      throw new InventoryValidationError(
        "Aynı ürün, SKU, toplama satırı ve takip bilgileriyle paketleme satırı zaten bulunmaktadır.",
      );
    }

    const timestamp = this.now();

    return this.repository.saveItem({
      id: this.createId(),
      tenantId: normalized.tenantId,
      packingId: normalized.packingId,
      lineNumber:
        packing.items.length + 1,
      warehouseId:
        normalized.warehouseId,
      packingLocationId:
        normalized.packingLocationId,
      productId:
        normalized.productId,
      requestedQuantity:
        normalized.requestedQuantity,
      packedQuantity: 0,
      damagedQuantity: 0,
      missingQuantity: 0,
      remainingQuantity:
        normalized.requestedQuantity,
      unit: normalized.unit,
      temperatureControlled:
        normalized.temperatureControlled ??
        false,
      hazardousMaterial:
        normalized.hazardousMaterial ??
        false,
      createdBy:
        normalized.createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(normalized.pickingId !== undefined
        ? {
            pickingId:
              normalized.pickingId,
          }
        : {}),
      ...(normalized.pickingItemId !==
      undefined
        ? {
            pickingItemId:
              normalized.pickingItemId,
          }
        : {}),
      ...(normalized.skuId !== undefined
        ? {
            skuId:
              normalized.skuId,
          }
        : {}),
      ...(normalized.tracking !== undefined
        ? {
            tracking:
              normalized.tracking,
          }
        : {}),
      ...(normalized.barcode !== undefined
        ? {
            barcode:
              normalized.barcode,
          }
        : {}),
      ...(normalized.unitWeight !== undefined
        ? {
            unitWeight:
              normalized.unitWeight,
          }
        : {}),
      ...(normalized.unitVolume !== undefined
        ? {
            unitVolume:
              normalized.unitVolume,
          }
        : {}),
      ...(normalized.weightUnit !== undefined
        ? {
            weightUnit:
              normalized.weightUnit,
          }
        : {}),
      ...(normalized.volumeUnit !== undefined
        ? {
            volumeUnit:
              normalized.volumeUnit,
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

  async release(
    tenantId: string,
    packingId: string,
  ): Promise<Packing> {
    const packing = await this.get(
      tenantId,
      packingId,
    );

    if (
      packing.status !== "draft" &&
      packing.status !== "planned"
    ) {
      throw new InventoryValidationError(
        "Yalnızca taslak veya planlanmış paketleme emri operasyona açılabilir.",
      );
    }

    if (packing.items.length === 0) {
      throw new InventoryValidationError(
        "Paketleme emri operasyona açılmadan önce en az bir ürün satırı eklenmelidir.",
      );
    }

    const invalidItem =
      packing.items.find(
        (item) =>
          item.requestedQuantity <= 0 ||
          item.remainingQuantity <= 0,
      );

    if (invalidItem) {
      throw new InventoryValidationError(
        "Geçersiz miktar içeren paketleme satırı operasyona açılamaz.",
      );
    }

    const timestamp = this.now();

    return this.repository.save({
      ...packing,
      status: "released",
      releasedAt: timestamp,
      updatedAt: timestamp,
    });
  }

  async start(
    tenantId: string,
    packingId: string,
  ): Promise<Packing> {
    const packing = await this.get(
      tenantId,
      packingId,
    );

    if (
      packing.status !== "released"
    ) {
      throw new InventoryValidationError(
        "Yalnızca paketlemeye açılmış kayıt başlatılabilir.",
      );
    }

    const tasks =
      await this.repository.listTasks(
        packing.tenantId,
        packing.id,
      );

    if (tasks.length === 0) {
      throw new InventoryValidationError(
        "Paketleme başlatılmadan önce en az bir görev oluşturulmalıdır.",
      );
    }

    const timestamp = this.now();

    return this.repository.save({
      ...packing,
      status: "in_progress",
      startedAt: timestamp,
      updatedAt: timestamp,
    });
  }

  async createPackage(
    input: CreatePackingPackageInput,
  ): Promise<PackingPackage> {
    const normalized =
      validateCreatePackingPackage(
        input,
      );

    const packing = await this.get(
      normalized.tenantId,
      normalized.packingId,
    );

    if (
      packing.status === "packed" ||
      packing.status ===
        "shipping_ready" ||
      packing.status === "cancelled"
    ) {
      throw new InventoryValidationError(
        "Tamamlanmış veya iptal edilmiş paketleme için yeni paket oluşturulamaz.",
      );
    }

    const container =
      await this.containerService.get(
        packing.tenantId,
        normalized.containerId,
      );

    if (!container.active) {
      throw new InventoryValidationError(
        "Pasif ambalaj kullanılarak paket oluşturulamaz.",
      );
    }

    if (
      normalized.parentPackageId !==
      undefined
    ) {
      const parentPackage =
        packing.packages.find(
          (item) =>
            item.id ===
            normalized.parentPackageId,
        );

      if (!parentPackage) {
        throw new InventoryValidationError(
          "Üst paket kaydı bulunamadı.",
        );
      }

      if (
        parentPackage.status ===
          "cancelled"
      ) {
        throw new InventoryValidationError(
          "İptal edilmiş paket üst paket olarak kullanılamaz.",
        );
      }
    }

    const timestamp = this.now();

    return this.repository.savePackage({
      id: this.createId(),
      tenantId:
        normalized.tenantId,
      packingId:
        normalized.packingId,
      packageNumber:
        this.generatePackageNumber(),
      containerId:
        normalized.containerId,
      status: "open",
      weightUnit:
        normalized.weightUnit ?? "kg",
      volumeUnit:
        normalized.volumeUnit ?? "cm3",
      items: [],
      createdBy:
        normalized.createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(normalized.parentPackageId !==
      undefined
        ? {
            parentPackageId:
              normalized.parentPackageId,
          }
        : {}),
    });
  }

  async generateSuggestions(
    input: GeneratePackingSuggestionsInput,
  ): Promise<PackingSuggestion[]> {
    const packing = await this.get(
      input.tenantId,
      input.packingId,
    );

    if (
      packing.status === "packed" ||
      packing.status ===
        "shipping_ready" ||
      packing.status === "cancelled"
    ) {
      throw new InventoryValidationError(
        "Tamamlanmış veya iptal edilmiş paketleme için öneri üretilemez.",
      );
    }

    return this.suggestionService.generate(
      input,
    );
  }

  async createTask(
    input: CreatePackingTaskInput,
  ): Promise<PackingTask> {
    const normalized =
      validateCreatePackingTask(input);

    const packing = await this.get(
      normalized.tenantId,
      normalized.packingId,
    );

    if (
      packing.status === "packed" ||
      packing.status ===
        "shipping_ready" ||
      packing.status === "cancelled"
    ) {
      throw new InventoryValidationError(
        "Tamamlanmış veya iptal edilmiş paketleme için görev oluşturulamaz.",
      );
    }

    if (
      packing.warehouseId !==
      normalized.warehouseId
    ) {
      throw new InventoryValidationError(
        "Görev deposu paketleme kaydıyla aynı olmalıdır.",
      );
    }

    if (
      packing.packingLocationId !==
      normalized.packingLocationId
    ) {
      throw new InventoryValidationError(
        "Görev lokasyonu paketleme kaydıyla aynı olmalıdır.",
      );
    }

    if (
      normalized.packingItemId !==
      undefined
    ) {
      const itemExists =
        packing.items.some(
          (item) =>
            item.id ===
            normalized.packingItemId,
        );

      if (!itemExists) {
        throw new InventoryValidationError(
          "Görevin bağlı olduğu paketleme satırı bulunamadı.",
        );
      }
    }

    if (
      normalized.packageId !==
      undefined
    ) {
      const packageExists =
        packing.packages.some(
          (item) =>
            item.id ===
            normalized.packageId,
        );

      if (!packageExists) {
        throw new InventoryValidationError(
          "Görevin bağlı olduğu paket bulunamadı.",
        );
      }
    }

    const existingTasks =
      await this.repository.listTasks(
        packing.tenantId,
        packing.id,
      );

    const sequence =
      input.sequence ??
      existingTasks.length + 1;

    const timestamp = this.now();

    return this.repository.saveTask({
      id: this.createId(),
      tenantId:
        normalized.tenantId,
      packingId:
        normalized.packingId,
      warehouseId:
        normalized.warehouseId,
      packingLocationId:
        normalized.packingLocationId,
      status:
        normalized.assignedUserId !==
        undefined
          ? "assigned"
          : "pending",
      priority:
        normalized.priority ?? 50,
      sequence,
      createdBy:
        normalized.createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(normalized.packingItemId !==
      undefined
        ? {
            packingItemId:
              normalized.packingItemId,
          }
        : {}),
      ...(normalized.packageId !==
      undefined
        ? {
            packageId:
              normalized.packageId,
          }
        : {}),
      ...(normalized.assignedUserId !==
      undefined
        ? {
            assignedUserId:
              normalized.assignedUserId,
          }
        : {}),
      ...(normalized.assignedEquipmentId !==
      undefined
        ? {
            assignedEquipmentId:
              normalized.assignedEquipmentId,
          }
        : {}),
      ...(normalized.stationId !== undefined
        ? {
            stationId:
              normalized.stationId,
          }
        : {}),
      ...(normalized.plannedAt !== undefined
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

  async listPackages(
    tenantId: string,
    packingId: string,
  ): Promise<PackingPackage[]> {
    const packing = await this.get(
      tenantId,
      packingId,
    );

    return this.repository.listPackages(
      packing.tenantId,
      packing.id,
    );
  }

  async listTasks(
    tenantId: string,
    packingId: string,
  ): Promise<PackingTask[]> {
    const packing = await this.get(
      tenantId,
      packingId,
    );

    return this.repository.listTasks(
      packing.tenantId,
      packing.id,
    );
  }

  async listSuggestions(
    tenantId: string,
    packingId: string,
  ): Promise<PackingSuggestion[]> {
    const packing = await this.get(
      tenantId,
      packingId,
    );

    return this.repository
      .listSuggestions(
        packing.tenantId,
        packing.id,
      );
  }

  async confirmItem(
    input: ConfirmPackingItemInput,
  ): Promise<PackingItem> {
    const normalized =
      validateConfirmPackingItem(input);

    const packing = await this.get(
      normalized.tenantId,
      normalized.packingId,
    );

    if (
      packing.status !== "in_progress" &&
      packing.status !== "partially_packed"
    ) {
      throw new InventoryValidationError(
        "Paketleme onayı yalnızca devam eden operasyonda verilebilir.",
      );
    }

    const item = packing.items.find(
      (current) =>
        current.id ===
        normalized.packingItemId,
    );

    if (!item) {
      throw new InventoryValidationError(
        `Paketleme satırı bulunamadı: ${normalized.packingItemId}`,
      );
    }

    const packingPackage =
      packing.packages.find(
        (current) =>
          current.id ===
          normalized.packageId,
      );

    if (!packingPackage) {
      throw new InventoryValidationError(
        `Paket bulunamadı: ${normalized.packageId}`,
      );
    }

    if (
      packingPackage.status === "sealed" ||
      packingPackage.status === "labelled" ||
      packingPackage.status === "shipping_ready" ||
      packingPackage.status === "cancelled"
    ) {
      throw new InventoryValidationError(
        "Kapalı, etiketlenmiş, sevkiyata hazır veya iptal edilmiş pakete ürün eklenemez.",
      );
    }

    validatePackingConfirmationTotals(
      item.remainingQuantity,
      normalized,
    );

    if (
      item.barcode !== undefined &&
      normalized.barcode !== item.barcode
    ) {
      throw new InventoryValidationError(
        "Okutulan barkod paketleme satırıyla uyuşmamaktadır.",
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
        "Okutulan lot numarası paketleme satırıyla uyuşmamaktadır.",
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
        "Okutulan seri numarası paketleme satırıyla uyuşmamaktadır.",
      );
    }

    const weight =
      item.unitWeight !== undefined
        ? item.unitWeight *
          normalized.quantity
        : undefined;

    const volume =
      item.unitVolume !== undefined
        ? item.unitVolume *
          normalized.quantity
        : undefined;

    if (normalized.quantity > 0) {
      await this.addPackageItem({
        tenantId: item.tenantId,
        packingId: item.packingId,
        packageId: packingPackage.id,
        packingItemId: item.id,
        productId: item.productId,
        quantity: normalized.quantity,
        unit: item.unit,
        ...(item.skuId !== undefined
          ? { skuId: item.skuId }
          : {}),
        ...(item.tracking !== undefined
          ? { tracking: item.tracking }
          : {}),
        ...(weight !== undefined
          ? { weight }
          : {}),
        ...(volume !== undefined
          ? { volume }
          : {}),
      });
    }

    if (
      (normalized.damagedQuantity ?? 0) > 0
    ) {
      await this.createException({
        tenantId: packing.tenantId,
        packingId: packing.id,
        packingItemId: item.id,
        packageId: packingPackage.id,
        type: "damaged_product",
        message:
          `Hasarlı ürün kaydedildi. Hasarlı miktar: ${normalized.damagedQuantity ?? 0}`,
        warehouseId: item.warehouseId,
        locationId:
          item.packingLocationId,
        productId: item.productId,
      });
    }

    if (
      (normalized.missingQuantity ?? 0) > 0
    ) {
      await this.createException({
        tenantId: packing.tenantId,
        packingId: packing.id,
        packingItemId: item.id,
        packageId: packingPackage.id,
        type: "item_missing",
        message:
          `Eksik paketleme kaydedildi. Eksik miktar: ${normalized.missingQuantity ?? 0}`,
        warehouseId: item.warehouseId,
        locationId:
          item.packingLocationId,
        productId: item.productId,
      });
    }

    const packedQuantity =
      item.packedQuantity +
      normalized.quantity;

    const damagedQuantity =
      item.damagedQuantity +
      (normalized.damagedQuantity ?? 0);

    const missingQuantity =
      item.missingQuantity +
      (normalized.missingQuantity ?? 0);

    const remainingQuantity = Math.max(
      0,
      item.requestedQuantity -
        packedQuantity -
        damagedQuantity -
        missingQuantity,
    );

    const updatedItem =
      await this.repository.saveItem({
        ...item,
        packedQuantity,
        damagedQuantity,
        missingQuantity,
        remainingQuantity,
        updatedAt: this.now(),
        ...(normalized.notes !== undefined
          ? { notes: normalized.notes }
          : {}),
      });

    const tasks =
      await this.repository.listTasks(
        packing.tenantId,
        packing.id,
      );

    const relatedTasks =
      tasks.filter(
        (task) =>
          task.packingItemId === item.id,
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
      packing.tenantId,
      packing.id,
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
        : "partially_packed",
      updatedAt: this.now(),
    });

    return updatedItem;
  }

  async addPackageItem(
    input: AddPackingPackageItemInput,
  ): Promise<PackingPackageItem> {
    const normalized =
      validateAddPackingPackageItem(
        input,
      );

    const packing = await this.get(
      normalized.tenantId,
      normalized.packingId,
    );

    const packingPackage =
      packing.packages.find(
        (item) =>
          item.id === normalized.packageId,
      );

    if (!packingPackage) {
      throw new InventoryValidationError(
        "Ürün eklenecek paket bulunamadı.",
      );
    }

    if (
      packingPackage.status === "sealed" ||
      packingPackage.status === "labelled" ||
      packingPackage.status === "shipping_ready" ||
      packingPackage.status === "cancelled"
    ) {
      throw new InventoryValidationError(
        "Kapalı veya iptal edilmiş pakete ürün eklenemez.",
      );
    }

    const packingItem =
      packing.items.find(
        (item) =>
          item.id ===
          normalized.packingItemId,
      );

    if (!packingItem) {
      throw new InventoryValidationError(
        "Paketleme satırı bulunamadı.",
      );
    }

    if (
      packingItem.productId !==
        normalized.productId ||
      packingItem.skuId !==
        normalized.skuId ||
      packingItem.unit !==
        normalized.unit
    ) {
      throw new InventoryValidationError(
        "Paket ürün bilgileri paketleme satırıyla uyuşmamaktadır.",
      );
    }

    const timestamp = this.now();

    const packageItem:
      PackingPackageItem = {
        id: this.createId(),
        packingItemId:
          normalized.packingItemId,
        productId:
          normalized.productId,
        quantity:
          normalized.quantity,
        unit: normalized.unit,
        createdAt: timestamp,
        ...(normalized.skuId !== undefined
          ? { skuId: normalized.skuId }
          : {}),
        ...(normalized.tracking !== undefined
          ? { tracking: normalized.tracking }
          : {}),
        ...(normalized.weight !== undefined
          ? { weight: normalized.weight }
          : {}),
        ...(normalized.volume !== undefined
          ? { volume: normalized.volume }
          : {}),
      };

    const items = [
      ...packingPackage.items,
      packageItem,
    ];

    const calculatedWeight =
      items.reduce(
        (total, item) =>
          total + (item.weight ?? 0),
        0,
      );

    const calculatedVolume =
      items.reduce(
        (total, item) =>
          total + (item.volume ?? 0),
        0,
      );

    const container =
      await this.containerService.get(
        packing.tenantId,
        packingPackage.containerId,
      );

    const capacity =
      this.containerService
        .calculateCapacity(container);

    if (
      capacity.usableWeightKg !== undefined &&
      packingPackage.weightUnit === "kg" &&
      calculatedWeight >
        capacity.usableWeightKg
    ) {
      throw new InventoryValidationError(
        "Paket ağırlığı ambalaj kapasitesini aşmaktadır.",
      );
    }

    if (
      capacity.usableVolumeCm3 !== undefined &&
      packingPackage.volumeUnit === "cm3" &&
      calculatedVolume >
        capacity.usableVolumeCm3
    ) {
      throw new InventoryValidationError(
        "Paket hacmi ambalaj kapasitesini aşmaktadır.",
      );
    }

    await this.repository.savePackage({
      ...packingPackage,
      status: "in_progress",
      items,
      calculatedWeight,
      calculatedVolume,
      updatedAt: timestamp,
    });

    return packageItem;
  }

  async sealPackage(input: {
    tenantId: string;
    packingId: string;
    packageId: string;
    sealedBy: string;
    sealNumber?: string;
    actualWeight?: number;
    actualVolume?: number;
  }): Promise<PackingPackage> {
    const packing = await this.get(
      input.tenantId,
      input.packingId,
    );

    const packageId =
      input.packageId.trim();

    const packingPackage =
      packing.packages.find(
        (item) => item.id === packageId,
      );

    if (!packingPackage) {
      throw new InventoryValidationError(
        "Mühürlenecek paket bulunamadı.",
      );
    }

    if (
      packingPackage.status === "sealed" ||
      packingPackage.status === "labelled" ||
      packingPackage.status === "shipping_ready"
    ) {
      throw new InventoryValidationError(
        "Paket daha önce kapatılmış.",
      );
    }

    if (
      packingPackage.status === "cancelled"
    ) {
      throw new InventoryValidationError(
        "İptal edilmiş paket mühürlenemez.",
      );
    }

    if (
      packingPackage.items.length === 0
    ) {
      throw new InventoryValidationError(
        "Ürün bulunmayan paket mühürlenemez.",
      );
    }

    const sealedBy =
      input.sealedBy.trim();

    if (!sealedBy) {
      throw new InventoryValidationError(
        "Paketi mühürleyen kullanıcı boş bırakılamaz.",
      );
    }

    if (
      input.actualWeight !== undefined &&
      (
        !Number.isFinite(
          input.actualWeight,
        ) ||
        input.actualWeight <= 0
      )
    ) {
      throw new InventoryValidationError(
        "Gerçek paket ağırlığı sıfırdan büyük olmalıdır.",
      );
    }

    if (
      input.actualVolume !== undefined &&
      (
        !Number.isFinite(
          input.actualVolume,
        ) ||
        input.actualVolume <= 0
      )
    ) {
      throw new InventoryValidationError(
        "Gerçek paket hacmi sıfırdan büyük olmalıdır.",
      );
    }

    const timestamp = this.now();

    return this.repository.savePackage({
      ...packingPackage,
      status: "sealed",
      sealedBy,
      sealedAt: timestamp,
      updatedAt: timestamp,
      ...(input.sealNumber?.trim()
        ? {
            sealNumber:
              input.sealNumber.trim(),
          }
        : {}),
      ...(input.actualWeight !== undefined
        ? {
            actualWeight:
              input.actualWeight,
          }
        : {}),
      ...(input.actualVolume !== undefined
        ? {
            actualVolume:
              input.actualVolume,
          }
        : {}),
    });
  }

  async generatePackageLabel(input: {
    tenantId: string;
    packingId: string;
    packageId: string;
    createdBy: string;
    format?: "zpl" | "pdf" | "png" | "svg" | "text";
    printerId?: string;
  }): Promise<PackingLabel> {
    const packing = await this.get(
      input.tenantId,
      input.packingId,
    );

    const packingPackage =
      packing.packages.find(
        (item) =>
          item.id ===
          input.packageId.trim(),
      );

    if (!packingPackage) {
      throw new InventoryValidationError(
        "Etiket oluşturulacak paket bulunamadı.",
      );
    }

    if (
      packingPackage.status !== "sealed" &&
      packingPackage.status !== "labelled"
    ) {
      throw new InventoryValidationError(
        "Paket etiketi yalnızca mühürlenmiş paket için oluşturulabilir.",
      );
    }

    const label =
      await this.labelService.create({
        tenantId: packing.tenantId,
        packingId: packing.id,
        packageId: packingPackage.id,
        type: "sscc",
        format: input.format ?? "zpl",
        sscc:
          this.labelService.generateSscc(),
        createdBy:
          input.createdBy.trim(),
        ...(input.printerId?.trim()
          ? {
              printerId:
                input.printerId.trim(),
            }
          : {}),
      });

    const generated =
      await this.labelService.generate({
        tenantId: packing.tenantId,
        packingId: packing.id,
        labelId: label.id,
      });

    await this.repository.savePackage({
      ...packingPackage,
      status: "labelled",
      updatedAt: this.now(),
      ...(generated.sscc !== undefined
        ? { sscc: generated.sscc }
        : {}),
    });

    return generated;
  }

  async createException(input: {
    tenantId: string;
    packingId: string;
    packingItemId?: string;
    packageId?: string;
    containerId?: string;
    taskId?: string;
    type: PackingExceptionType;
    message: string;
    warehouseId?: string;
    locationId?: string;
    productId?: string;
  }): Promise<PackingException> {
    const packing = await this.get(
      input.tenantId,
      input.packingId,
    );

    if (
      packing.status === "packed" ||
      packing.status === "shipping_ready" ||
      packing.status === "cancelled"
    ) {
      throw new InventoryValidationError(
        "Tamamlanmış veya iptal edilmiş paketleme için istisna oluşturulamaz.",
      );
    }

    const message =
      input.message.trim();

    if (!message) {
      throw new InventoryValidationError(
        "Paketleme istisnası mesajı boş bırakılamaz.",
      );
    }

    return this.repository.saveException({
      id: this.createId(),
      tenantId: packing.tenantId,
      packingId: packing.id,
      type: input.type,
      message,
      resolved: false,
      createdAt: this.now(),
      ...(input.packingItemId?.trim()
        ? {
            packingItemId:
              input.packingItemId.trim(),
          }
        : {}),
      ...(input.packageId?.trim()
        ? {
            packageId:
              input.packageId.trim(),
          }
        : {}),
      ...(input.containerId?.trim()
        ? {
            containerId:
              input.containerId.trim(),
          }
        : {}),
      ...(input.taskId?.trim()
        ? {
            taskId:
              input.taskId.trim(),
          }
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
    packingId: string;
    exceptionId: string;
    resolvedBy: string;
    resolutionNotes?: string;
  }): Promise<PackingException> {
    const packing = await this.get(
      input.tenantId,
      input.packingId,
    );

    const exceptions =
      await this.repository
        .listExceptions(
          packing.tenantId,
          packing.id,
        );

    const exception =
      exceptions.find(
        (item) =>
          item.id ===
          input.exceptionId.trim(),
      );

    if (!exception) {
      throw new InventoryValidationError(
        "Paketleme istisnası bulunamadı.",
      );
    }

    if (exception.resolved) {
      throw new InventoryValidationError(
        "Paketleme istisnası daha önce çözülmüş.",
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
    packingId: string,
  ): Promise<PackingException[]> {
    const packing = await this.get(
      tenantId,
      packingId,
    );

    return this.repository
      .listExceptions(
        packing.tenantId,
        packing.id,
      );
  }

  async complete(
    tenantId: string,
    packingId: string,
  ): Promise<Packing> {
    const packing = await this.get(
      tenantId,
      packingId,
    );

    if (
      packing.status !== "in_progress" &&
      packing.status !== "partially_packed"
    ) {
      throw new InventoryValidationError(
        "Yalnızca devam eden paketleme operasyonu tamamlanabilir.",
      );
    }

    if (
      packing.items.some(
        (item) =>
          item.remainingQuantity > 0,
      )
    ) {
      throw new InventoryValidationError(
        "Tüm paketleme satırları işlenmeden operasyon tamamlanamaz.",
      );
    }

    const exceptions =
      await this.repository
        .listExceptions(
          packing.tenantId,
          packing.id,
        );

    if (
      exceptions.some(
        (item) => !item.resolved,
      )
    ) {
      throw new InventoryValidationError(
        "Çözülmemiş paketleme istisnaları varken operasyon tamamlanamaz.",
      );
    }

    const packages =
      await this.repository
        .listPackages(
          packing.tenantId,
          packing.id,
        );

    if (packages.length === 0) {
      throw new InventoryValidationError(
        "Paket oluşturulmadan paketleme operasyonu tamamlanamaz.",
      );
    }

    if (
      packages.some(
        (item) =>
          item.status !== "sealed" &&
          item.status !== "labelled" &&
          item.status !== "shipping_ready",
      )
    ) {
      throw new InventoryValidationError(
        "Tüm paketler mühürlenmeden operasyon tamamlanamaz.",
      );
    }

    const timestamp = this.now();

    return this.repository.save({
      ...packing,
      status: "packed",
      packedAt: timestamp,
      updatedAt: timestamp,
    });
  }

  async markShippingReady(
    tenantId: string,
    packingId: string,
  ): Promise<Packing> {
    const packing = await this.get(
      tenantId,
      packingId,
    );

    if (packing.status !== "packed") {
      throw new InventoryValidationError(
        "Yalnızca tamamlanmış paketleme sevkiyata hazır duruma getirilebilir.",
      );
    }

    const packages =
      await this.repository
        .listPackages(
          packing.tenantId,
          packing.id,
        );

    if (
      packages.some(
        (item) =>
          item.status !== "labelled" &&
          item.status !== "shipping_ready",
      )
    ) {
      throw new InventoryValidationError(
        "Tüm paketler etiketlenmeden sevkiyata hazır duruma geçilemez.",
      );
    }

    const timestamp = this.now();

    for (const item of packages) {
      await this.repository.savePackage({
        ...item,
        status: "shipping_ready",
        updatedAt: timestamp,
      });
    }

    return this.repository.save({
      ...packing,
      status: "shipping_ready",
      shippingReadyAt: timestamp,
      updatedAt: timestamp,
    });
  }

  async cancel(
    tenantId: string,
    packingId: string,
    reason: string,
  ): Promise<Packing> {
    const packing = await this.get(
      tenantId,
      packingId,
    );

    const normalizedReason =
      reason.trim();

    if (!normalizedReason) {
      throw new InventoryValidationError(
        "İptal nedeni boş bırakılamaz.",
      );
    }

    if (
      packing.status === "packed" ||
      packing.status === "shipping_ready" ||
      packing.status === "cancelled"
    ) {
      throw new InventoryValidationError(
        "Tamamlanmış veya iptal edilmiş paketleme doğrudan iptal edilemez.",
      );
    }

    const packages =
      await this.repository
        .listPackages(
          packing.tenantId,
          packing.id,
        );

    if (
      packages.some(
        (item) =>
          item.status === "sealed" ||
          item.status === "labelled" ||
          item.status === "shipping_ready",
      )
    ) {
      throw new InventoryValidationError(
        "Mühürlenmiş veya etiketlenmiş paket bulunan operasyon doğrudan iptal edilemez.",
      );
    }

    const timestamp = this.now();

    return this.repository.save({
      ...packing,
      status: "cancelled",
      cancellationReason:
        normalizedReason,
      cancelledAt: timestamp,
      updatedAt: timestamp,
    });
  }

  private generatePackingNumber(): string {
    const date = this.now()
      .slice(0, 10)
      .replaceAll("-", "");

    const sequence = String(
      this.sequence(),
    ).padStart(6, "0");

    return `PKL-${date}-${sequence}`;
  }

  private generatePackageNumber(): string {
    const date = this.now()
      .slice(0, 10)
      .replaceAll("-", "");

    const sequence = String(
      this.sequence(),
    ).padStart(6, "0");

    return `PKT-${date}-${sequence}`;
  }
}
