import type {
  CreateShippingInput,
  Shipping,
  ShippingListFilter,
} from "../types/Shipping";
import type {
  CreateShippingItemInput,
  ShippingItem,
} from "../types/ShippingItem";
import type {
  CreateShippingPackageInput,
  ShippingPackage,
} from "../types/ShippingPackage";
import type {
  ShippingSuggestion,
} from "../types/ShippingSuggestion";
import type {
  ShippingAsn,
} from "../types/ShippingAsn";
import type {
  ShippingException,
  ShippingExceptionType,
} from "../types/ShippingException";
import type {
  ShippingManifest,
} from "../types/ShippingManifest";
import type {
  ShippingProofOfDelivery,
} from "../types/ShippingProofOfDelivery";
import type {
  ShippingTask,
} from "../types/ShippingTask";
import type {
  ShippingTrackingEvent,
} from "../types/ShippingTracking";
import type {
  Packing,
} from "../types/Packing";
import type {
  PackingPackage,
} from "../types/PackingPackage";
import {
  InventoryValidationError,
} from "../types/InventoryErrors";
import type {
  PackingService,
} from "./PackingService";
import type {
  ShippingCarrierService,
} from "./ShippingCarrierService";
import type {
  ShippingAsnService,
} from "./ShippingAsnService";
import type {
  ShippingManifestService,
} from "./ShippingManifestService";
import type {
  ShippingTrackingService,
} from "./ShippingTrackingService";
import type {
  ShippingRepository,
} from "./ShippingRepository";
import type {
  GenerateShippingSuggestionsInput,
  ShippingSuggestionService,
} from "./ShippingSuggestionService";
import {
  validateConfirmShippingItemLoad,
  validateCreateShipping,
  validateCreateShippingItem,
  validateCreateShippingPackage,
  validateCreateShippingProofOfDelivery,
  validateCreateShippingTask,
  validateShippingLoadTotals,
} from "./ShippingValidator";

export interface ShippingServiceDependencies {
  repository: ShippingRepository;
  packingService: PackingService;
  carrierService: ShippingCarrierService;
  suggestionService: ShippingSuggestionService;
  manifestService: ShippingManifestService;
  asnService: ShippingAsnService;
  trackingService: ShippingTrackingService;
  createId?: () => string;
  now?: () => string;
  sequence?: () => number;
}

export interface CreateShippingFromPackingInput {
  tenantId: string;
  packingId: string;
  warehouseId?: string;
  shippingLocationId: string;
  strategy?: Shipping["strategy"];
  carrierId?: string;
  serviceLevelId?: string;
  vehicleId?: string;
  dockId?: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  priority?: number;
  plannedAt?: string;
  expectedDeliveryAt?: string;
  notes?: string;
  createdBy: string;
}

export interface AssignShippingResourcesInput {
  tenantId: string;
  shippingId: string;
  carrierId: string;
  serviceLevelId: string;
  vehicleId?: string;
  dockId?: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
}

function requireText(
  value: string,
  fieldName: string,
): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new InventoryValidationError(
      `${fieldName} boş bırakılamaz.`,
    );
  }

  return normalized;
}

function normalizeOptionalText(
  value?: string,
): string | undefined {
  const normalized = value?.trim();

  return normalized
    ? normalized
    : undefined;
}

export class ShippingService {
  private readonly repository:
    ShippingRepository;

  private readonly packingService:
    PackingService;

  private readonly carrierService:
    ShippingCarrierService;

  private readonly suggestionService:
    ShippingSuggestionService;

  private readonly manifestService:
    ShippingManifestService;

  private readonly asnService:
    ShippingAsnService;

  private readonly trackingService:
    ShippingTrackingService;

  private readonly createId:
    () => string;

  private readonly now:
    () => string;

  private readonly sequence:
    () => number;

  constructor(
    dependencies:
      ShippingServiceDependencies,
  ) {
    this.repository =
      dependencies.repository;

    this.packingService =
      dependencies.packingService;

    this.carrierService =
      dependencies.carrierService;

    this.suggestionService =
      dependencies.suggestionService;

    this.manifestService =
      dependencies.manifestService;

    this.asnService =
      dependencies.asnService;

    this.trackingService =
      dependencies.trackingService;

    this.createId =
      dependencies.createId ??
      (() => crypto.randomUUID());

    this.now =
      dependencies.now ??
      (() => new Date().toISOString());

    let internalSequence = 0;

    this.sequence =
      dependencies.sequence ??
      (() => ++internalSequence);
  }

  async create(
    input: CreateShippingInput,
  ): Promise<Shipping> {
    const normalized =
      validateCreateShipping(input);

    if (normalized.packingId !== undefined) {
      const existing =
        await this.repository
          .findByPackingId(
            normalized.tenantId,
            normalized.packingId,
          );

      if (existing) {
        throw new InventoryValidationError(
          "Bu paketleme kaydı için daha önce sevkiyat oluşturulmuş.",
        );
      }
    }

    if (normalized.orderId !== undefined) {
      const existing =
        await this.repository
          .findByOrderId(
            normalized.tenantId,
            normalized.orderId,
          );

      if (existing) {
        throw new InventoryValidationError(
          "Bu sipariş için daha önce sevkiyat oluşturulmuş.",
        );
      }
    }

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
          "Bu referans için daha önce sevkiyat oluşturulmuş.",
        );
      }
    }

    const timestamp = this.now();

    return this.repository.save({
      id: this.createId(),
      tenantId:
        normalized.tenantId,
      shippingNumber:
        this.generateShippingNumber(),
      warehouseId:
        normalized.warehouseId,
      shippingLocationId:
        normalized.shippingLocationId,
      strategy:
        normalized.strategy,
      status: "draft",
      shipFromAddress:
        normalized.shipFromAddress,
      shipToAddress:
        normalized.shipToAddress,
      priority:
        normalized.priority ?? 50,
      temperatureControlled:
        normalized
          .temperatureControlled ??
        false,
      hazardousMaterial:
        normalized.hazardousMaterial ??
        false,
      items: [],
      packages: [],
      exceptions: [],
      createdBy:
        normalized.createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(normalized.packingId !==
      undefined
        ? {
            packingId:
              normalized.packingId,
          }
        : {}),
      ...(normalized.orderId !==
      undefined
        ? {
            orderId:
              normalized.orderId,
          }
        : {}),
      ...(normalized.orderNumber !==
      undefined
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
      ...(normalized.carrierId !==
      undefined
        ? {
            carrierId:
              normalized.carrierId,
          }
        : {}),
      ...(normalized.serviceLevelId !==
      undefined
        ? {
            serviceLevelId:
              normalized.serviceLevelId,
          }
        : {}),
      ...(normalized.vehicleId !==
      undefined
        ? {
            vehicleId:
              normalized.vehicleId,
          }
        : {}),
      ...(normalized.dockId !==
      undefined
        ? {
            dockId:
              normalized.dockId,
          }
        : {}),
      ...(normalized.driverId !==
      undefined
        ? {
            driverId:
              normalized.driverId,
          }
        : {}),
      ...(normalized.driverName !==
      undefined
        ? {
            driverName:
              normalized.driverName,
          }
        : {}),
      ...(normalized.driverPhone !==
      undefined
        ? {
            driverPhone:
              normalized.driverPhone,
          }
        : {}),
      ...(normalized.plannedAt !==
      undefined
        ? {
            plannedAt:
              normalized.plannedAt,
          }
        : {}),
      ...(normalized
        .expectedDeliveryAt !==
      undefined
        ? {
            expectedDeliveryAt:
              normalized
                .expectedDeliveryAt,
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

  async createFromPacking(
    input: CreateShippingFromPackingInput,
  ): Promise<Shipping> {
    const tenantId = requireText(
      input.tenantId,
      "Firma kimliği",
    );

    const packingId = requireText(
      input.packingId,
      "Paketleme kimliği",
    );

    const existing =
      await this.repository
        .findByPackingId(
          tenantId,
          packingId,
        );

    if (existing) {
      throw new InventoryValidationError(
        "Bu paketleme kaydı için daha önce sevkiyat oluşturulmuş.",
      );
    }

    const packing =
      await this.packingService.get(
        tenantId,
        packingId,
      );

    if (
      packing.status !==
      "shipping_ready"
    ) {
      throw new InventoryValidationError(
        "Yalnızca sevkiyata hazır paketleme kaydı sevkiyata aktarılabilir.",
      );
    }

    if (packing.packages.length === 0) {
      throw new InventoryValidationError(
        "Paket bulunmadan sevkiyat oluşturulamaz.",
      );
    }

    const shipping =
      await this.create({
        tenantId:
          packing.tenantId,
        warehouseId:
          input.warehouseId ??
          packing.warehouseId,
        shippingLocationId:
          input.shippingLocationId,
        strategy:
          input.strategy ??
          "single_shipment",
        packingId:
          packing.id,
        ...(packing.orderId !== undefined
          ? {
              orderId:
                packing.orderId,
            }
          : {}),
        ...(packing.orderNumber !==
        undefined
          ? {
              orderNumber:
                packing.orderNumber,
            }
          : {}),
        referenceType: "packing",
        referenceId: packing.id,
        referenceNumber:
          packing.packingNumber,
        shipFromAddress:
          this.buildWarehouseAddress(
            packing,
          ),
        shipToAddress:
          this.buildDestinationAddress(
            packing,
          ),
        priority:
          input.priority ??
          packing.priority,
        temperatureControlled:
          this.isTemperatureControlled(
            packing,
          ),
        hazardousMaterial:
          this.hasHazardousMaterial(
            packing,
          ),
        createdBy:
          input.createdBy,
        ...(input.carrierId?.trim()
          ? {
              carrierId:
                input.carrierId.trim(),
            }
          : {}),
        ...(input.serviceLevelId?.trim()
          ? {
              serviceLevelId:
                input
                  .serviceLevelId
                  .trim(),
            }
          : {}),
        ...(input.vehicleId?.trim()
          ? {
              vehicleId:
                input.vehicleId.trim(),
            }
          : {}),
        ...(input.dockId?.trim()
          ? {
              dockId:
                input.dockId.trim(),
            }
          : {}),
        ...(input.driverId?.trim()
          ? {
              driverId:
                input.driverId.trim(),
            }
          : {}),
        ...(input.driverName?.trim()
          ? {
              driverName:
                input.driverName.trim(),
            }
          : {}),
        ...(input.driverPhone?.trim()
          ? {
              driverPhone:
                input.driverPhone.trim(),
            }
          : {}),
        ...(input.plannedAt !== undefined
          ? {
              plannedAt:
                input.plannedAt,
            }
          : {}),
        ...(input.expectedDeliveryAt !==
        undefined
          ? {
              expectedDeliveryAt:
                input.expectedDeliveryAt,
            }
          : {}),
        ...(input.notes?.trim()
          ? {
              notes:
                input.notes.trim(),
            }
          : {}),
      });

    for (const packingItem of packing.items) {
      if (
        packingItem.packedQuantity <= 0
      ) {
        continue;
      }

      await this.addItem({
        tenantId:
          shipping.tenantId,
        shippingId:
          shipping.id,
        packingId:
          packing.id,
        packingItemId:
          packingItem.id,
        ...(packing.orderId !== undefined
          ? {
              orderId:
                packing.orderId,
            }
          : {}),
        warehouseId:
          packingItem.warehouseId,
        productId:
          packingItem.productId,
        requestedQuantity:
          packingItem.packedQuantity,
        unit:
          packingItem.unit,
        temperatureControlled:
          packingItem
            .temperatureControlled,
        hazardousMaterial:
          packingItem
            .hazardousMaterial,
        createdBy:
          input.createdBy,
        ...(packingItem.skuId !==
        undefined
          ? {
              skuId:
                packingItem.skuId,
            }
          : {}),
        ...(packingItem.tracking !==
        undefined
          ? {
              tracking:
                packingItem.tracking,
            }
          : {}),
        ...(packingItem.unitWeight !==
        undefined
          ? {
              unitWeight:
                packingItem.unitWeight,
            }
          : {}),
        ...(packingItem.weightUnit !==
        undefined
          ? {
              weightUnit:
                packingItem.weightUnit,
            }
          : {}),
        ...(packingItem.unitVolume !==
        undefined
          ? {
              unitVolume:
                packingItem.unitVolume,
            }
          : {}),
        ...(packingItem.volumeUnit !==
        undefined
          ? {
              volumeUnit:
                packingItem.volumeUnit,
            }
          : {}),
      });
    }

    for (
      const packingPackage
      of packing.packages
    ) {
      await this.addPackageFromPacking({
        tenantId:
          shipping.tenantId,
        shippingId:
          shipping.id,
        packing,
        packingPackage,
      });
    }

    return this.get(
      shipping.tenantId,
      shipping.id,
    );
  }

  async get(
    tenantId: string,
    shippingId: string,
  ): Promise<Shipping> {
    const normalizedTenantId =
      requireText(
        tenantId,
        "Firma kimliği",
      );

    const normalizedShippingId =
      requireText(
        shippingId,
        "Sevkiyat kimliği",
      );

    const shipping =
      await this.repository.findById(
        normalizedTenantId,
        normalizedShippingId,
      );

    if (!shipping) {
      throw new InventoryValidationError(
        `Sevkiyat kaydı bulunamadı: ${shippingId}`,
      );
    }

    return shipping;
  }

  async list(
    filter: ShippingListFilter,
  ): Promise<Shipping[]> {
    const tenantId = requireText(
      filter.tenantId,
      "Firma kimliği",
    );

    return this.repository.list({
      ...filter,
      tenantId,
      ...(filter.search?.trim()
        ? {
            search:
              filter.search.trim(),
          }
        : {}),
    });
  }

  async addItem(
    input: CreateShippingItemInput,
  ): Promise<ShippingItem> {
    const normalized =
      validateCreateShippingItem(
        input,
      );

    const shipping =
      await this.get(
        normalized.tenantId,
        normalized.shippingId,
      );

    if (
      shipping.status !== "draft" &&
      shipping.status !== "planned"
    ) {
      throw new InventoryValidationError(
        "Yalnızca taslak veya planlanmış sevkiyata satır eklenebilir.",
      );
    }

    if (
      normalized.warehouseId !==
      shipping.warehouseId
    ) {
      throw new InventoryValidationError(
        "Sevkiyat satırının deposu sevkiyat deposuyla aynı olmalıdır.",
      );
    }

    const duplicate =
      shipping.items.find(
        (item) =>
          item.productId ===
            normalized.productId &&
          item.skuId ===
            normalized.skuId &&
          item.packingItemId ===
            normalized.packingItemId,
      );

    if (duplicate) {
      throw new InventoryValidationError(
        "Aynı ürün ve paketleme satırı sevkiyata daha önce eklenmiş.",
      );
    }

    const timestamp = this.now();

    return this.repository.saveItem({
      id: this.createId(),
      tenantId:
        shipping.tenantId,
      shippingId:
        shipping.id,
      lineNumber:
        shipping.items.length + 1,
      warehouseId:
        normalized.warehouseId,
      productId:
        normalized.productId,
      requestedQuantity:
        normalized.requestedQuantity,
      loadedQuantity: 0,
      deliveredQuantity: 0,
      returnedQuantity: 0,
      damagedQuantity: 0,
      missingQuantity: 0,
      remainingQuantity:
        normalized.requestedQuantity,
      unit:
        normalized.unit,
      temperatureControlled:
        normalized
          .temperatureControlled ??
        false,
      hazardousMaterial:
        normalized.hazardousMaterial ??
        false,
      createdBy:
        normalized.createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(normalized.packingId !==
      undefined
        ? {
            packingId:
              normalized.packingId,
          }
        : {}),
      ...(normalized.packingItemId !==
      undefined
        ? {
            packingItemId:
              normalized.packingItemId,
          }
        : {}),
      ...(normalized.orderId !==
      undefined
        ? {
            orderId:
              normalized.orderId,
          }
        : {}),
      ...(normalized.orderItemId !==
      undefined
        ? {
            orderItemId:
              normalized.orderItemId,
          }
        : {}),
      ...(normalized.skuId !== undefined
        ? {
            skuId:
              normalized.skuId,
          }
        : {}),
      ...(normalized.tracking !==
      undefined
        ? {
            tracking:
              normalized.tracking,
          }
        : {}),
      ...(normalized.unitWeight !==
      undefined
        ? {
            unitWeight:
              normalized.unitWeight,
          }
        : {}),
      ...(normalized.unitVolume !==
      undefined
        ? {
            unitVolume:
              normalized.unitVolume,
          }
        : {}),
      ...(normalized.weightUnit !==
      undefined
        ? {
            weightUnit:
              normalized.weightUnit,
          }
        : {}),
      ...(normalized.volumeUnit !==
      undefined
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

  async addPackage(
    input: CreateShippingPackageInput,
  ): Promise<ShippingPackage> {
    const normalized =
      validateCreateShippingPackage(
        input,
      );

    const shipping =
      await this.get(
        normalized.tenantId,
        normalized.shippingId,
      );

    if (
      shipping.status !== "draft" &&
      shipping.status !== "planned"
    ) {
      throw new InventoryValidationError(
        "Yalnızca taslak veya planlanmış sevkiyata paket eklenebilir.",
      );
    }

    const duplicate =
      shipping.packages.find(
        (shippingPackage) =>
          shippingPackage
            .packingPackageId ===
          normalized.packingPackageId,
      );

    if (duplicate) {
      throw new InventoryValidationError(
        "Bu paketleme paketi sevkiyata daha önce eklenmiş.",
      );
    }

    const timestamp = this.now();

    return this.repository.savePackage({
      id: this.createId(),
      tenantId:
        shipping.tenantId,
      shippingId:
        shipping.id,
      packingId:
        normalized.packingId,
      packingPackageId:
        normalized.packingPackageId,
      packageNumber:
        normalized.packageNumber,
      status: "pending",
      loadingSequence:
        normalized.loadingSequence ??
        shipping.packages.length + 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(normalized.sscc !== undefined
        ? {
            sscc:
              normalized.sscc,
          }
        : {}),
      ...(normalized.trackingNumber !==
      undefined
        ? {
            trackingNumber:
              normalized
                .trackingNumber,
          }
        : {}),
      ...(normalized.weight !==
      undefined
        ? {
            weight:
              normalized.weight,
          }
        : {}),
      ...(normalized.volume !==
      undefined
        ? {
            volume:
              normalized.volume,
          }
        : {}),
      ...(normalized.weightUnit !==
      undefined
        ? {
            weightUnit:
              normalized.weightUnit,
          }
        : {}),
      ...(normalized.volumeUnit !==
      undefined
        ? {
            volumeUnit:
              normalized.volumeUnit,
          }
        : {}),
      ...(normalized.palletId !==
      undefined
        ? {
            palletId:
              normalized.palletId,
          }
        : {}),
      ...(normalized.parentPackageId !==
      undefined
        ? {
            parentPackageId:
              normalized.parentPackageId,
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

  async assignResources(
    input: AssignShippingResourcesInput,
  ): Promise<Shipping> {
    const shipping =
      await this.get(
        input.tenantId,
        input.shippingId,
      );

    if (
      shipping.status !== "draft" &&
      shipping.status !== "planned"
    ) {
      throw new InventoryValidationError(
        "Kaynak ataması yalnızca taslak veya planlanmış sevkiyatta yapılabilir.",
      );
    }

    const carrierId = requireText(
      input.carrierId,
      "Taşıyıcı kimliği",
    );

    const serviceLevelId =
      requireText(
        input.serviceLevelId,
        "Servis seviyesi kimliği",
      );

    const carrier =
      await this.carrierService
        .getCarrier(
          shipping.tenantId,
          carrierId,
        );

    if (!carrier.active) {
      throw new InventoryValidationError(
        "Pasif taşıyıcı sevkiyata atanamaz.",
      );
    }

    const serviceLevel =
      await this.carrierService
        .getServiceLevel(
          shipping.tenantId,
          serviceLevelId,
        );

    if (
      serviceLevel.carrierId !==
      carrier.id
    ) {
      throw new InventoryValidationError(
        "Servis seviyesi seçilen taşıyıcıya ait değil.",
      );
    }

    if (!serviceLevel.active) {
      throw new InventoryValidationError(
        "Pasif servis seviyesi sevkiyata atanamaz.",
      );
    }

    const vehicleId =
      normalizeOptionalText(
        input.vehicleId,
      );

    const dockId =
      normalizeOptionalText(
        input.dockId,
      );

    if (vehicleId !== undefined) {
      const vehicle =
        await this.repository
          .findVehicleById(
            shipping.tenantId,
            vehicleId,
          );

      if (!vehicle || !vehicle.active) {
        throw new InventoryValidationError(
          "Aktif araç bulunamadı.",
        );
      }

      if (
        vehicle.carrierId !==
          undefined &&
        vehicle.carrierId !==
          carrier.id
      ) {
        throw new InventoryValidationError(
          "Araç seçilen taşıyıcıya ait değil.",
        );
      }
    }

    if (dockId !== undefined) {
      const dock =
        await this.repository
          .findDockById(
            shipping.tenantId,
            dockId,
          );

      if (
        !dock ||
        !dock.active ||
        dock.warehouseId !==
          shipping.warehouseId
      ) {
        throw new InventoryValidationError(
          "Sevkiyat deposuna ait aktif rampa bulunamadı.",
        );
      }
    }

    const timestamp = this.now();

    return this.repository.save({
      ...shipping,
      status: "planned",
      carrierId:
        carrier.id,
      serviceLevelId:
        serviceLevel.id,
      updatedAt: timestamp,
      ...(vehicleId !== undefined
        ? { vehicleId }
        : {}),
      ...(dockId !== undefined
        ? { dockId }
        : {}),
      ...(normalizeOptionalText(
        input.driverId,
      ) !== undefined
        ? {
            driverId:
              requireText(
                input.driverId ?? "",
                "Sürücü kimliği",
              ),
          }
        : {}),
      ...(normalizeOptionalText(
        input.driverName,
      ) !== undefined
        ? {
            driverName:
              requireText(
                input.driverName ?? "",
                "Sürücü adı",
              ),
          }
        : {}),
      ...(normalizeOptionalText(
        input.driverPhone,
      ) !== undefined
        ? {
            driverPhone:
              requireText(
                input.driverPhone ?? "",
                "Sürücü telefonu",
              ),
          }
        : {}),
    });
  }

  async generateSuggestions(
    input: GenerateShippingSuggestionsInput,
  ): Promise<ShippingSuggestion[]> {
    await this.get(
      input.tenantId,
      input.shippingId,
    );

    return this.suggestionService
      .generate(input);
  }

  async listPackages(
    tenantId: string,
    shippingId: string,
  ): Promise<ShippingPackage[]> {
    const shipping =
      await this.get(
        tenantId,
        shippingId,
      );

    return this.repository.listPackages(
      shipping.tenantId,
      shipping.id,
    );
  }

  async listSuggestions(
    tenantId: string,
    shippingId: string,
  ): Promise<ShippingSuggestion[]> {
    const shipping =
      await this.get(
        tenantId,
        shippingId,
      );

    return this.repository
      .listSuggestions(
        shipping.tenantId,
        shipping.id,
      );
  }

  async release(
    tenantId: string,
    shippingId: string,
  ): Promise<Shipping> {
    const shipping =
      await this.get(
        tenantId,
        shippingId,
      );

    if (
      shipping.status !== "draft" &&
      shipping.status !== "planned"
    ) {
      throw new InventoryValidationError(
        "Yalnızca taslak veya planlanmış sevkiyat operasyona açılabilir.",
      );
    }

    if (shipping.items.length === 0) {
      throw new InventoryValidationError(
        "Sevkiyat satırı bulunmadan operasyon başlatılamaz.",
      );
    }

    if (shipping.packages.length === 0) {
      throw new InventoryValidationError(
        "Sevkiyat paketi bulunmadan operasyon başlatılamaz.",
      );
    }

    if (
      shipping.carrierId === undefined ||
      shipping.serviceLevelId ===
        undefined
    ) {
      throw new InventoryValidationError(
        "Sevkiyata açmadan önce taşıyıcı ve servis seviyesi atanmalıdır.",
      );
    }

    const carrier =
      await this.carrierService
        .getCarrier(
          shipping.tenantId,
          shipping.carrierId,
        );

    const serviceLevel =
      await this.carrierService
        .getServiceLevel(
          shipping.tenantId,
          shipping.serviceLevelId,
        );

    if (
      !carrier.active ||
      !serviceLevel.active
    ) {
      throw new InventoryValidationError(
        "Pasif taşıyıcı veya servis seviyesiyle sevkiyat başlatılamaz.",
      );
    }

    if (
      serviceLevel.carrierId !==
      carrier.id
    ) {
      throw new InventoryValidationError(
        "Servis seviyesi sevkiyat taşıyıcısına ait değil.",
      );
    }

    if (
      shipping.temperatureControlled &&
      (
        !carrier.temperatureControlled ||
        !serviceLevel
          .temperatureControlled
      )
    ) {
      throw new InventoryValidationError(
        "Sıcaklık kontrollü sevkiyat için uygun taşıyıcı ve servis seviyesi gereklidir.",
      );
    }

    if (
      shipping.hazardousMaterial &&
      (
        !carrier
          .hazardousMaterialAllowed ||
        !serviceLevel
          .hazardousMaterialAllowed
      )
    ) {
      throw new InventoryValidationError(
        "Tehlikeli madde sevkiyatı için uygun taşıyıcı ve servis seviyesi gereklidir.",
      );
    }

    const timestamp = this.now();

    const released =
      await this.repository.save({
        ...shipping,
        status: "released",
        releasedAt: timestamp,
        updatedAt: timestamp,
      });

    for (
      const shippingPackage
      of released.packages
    ) {
      await this.repository
        .savePackage({
          ...shippingPackage,
          status: "loading_ready",
          updatedAt: timestamp,
        });
    }

    return this.get(
      released.tenantId,
      released.id,
    );
  }

  async createTask(
    input: import(
      "../types/ShippingTask"
    ).CreateShippingTaskInput,
  ): Promise<
    import(
      "../types/ShippingTask"
    ).ShippingTask
  > {
    const normalized =
      validateCreateShippingTask(
        input,
      );

    const shipping =
      await this.get(
        normalized.tenantId,
        normalized.shippingId,
      );

    if (
      shipping.status === "delivered" ||
      shipping.status === "returned" ||
      shipping.status === "cancelled"
    ) {
      throw new InventoryValidationError(
        "Tamamlanmış, iade edilmiş veya iptal edilmiş sevkiyata görev eklenemez.",
      );
    }

    if (
      normalized.warehouseId !==
      shipping.warehouseId
    ) {
      throw new InventoryValidationError(
        "Görev deposu sevkiyat deposuyla aynı olmalıdır.",
      );
    }

    if (
      normalized.shippingLocationId !==
      shipping.shippingLocationId
    ) {
      throw new InventoryValidationError(
        "Görev lokasyonu sevkiyat lokasyonuyla aynı olmalıdır.",
      );
    }

    if (
      normalized.shippingItemId !==
      undefined &&
      !shipping.items.some(
        (item) =>
          item.id ===
          normalized.shippingItemId,
      )
    ) {
      throw new InventoryValidationError(
        "Göreve bağlı sevkiyat satırı bulunamadı.",
      );
    }

    if (
      normalized.shippingPackageId !==
      undefined &&
      !shipping.packages.some(
        (shippingPackage) =>
          shippingPackage.id ===
          normalized.shippingPackageId,
      )
    ) {
      throw new InventoryValidationError(
        "Göreve bağlı sevkiyat paketi bulunamadı.",
      );
    }

    const timestamp = this.now();

    return this.repository.saveTask({
      id: this.createId(),
      tenantId:
        shipping.tenantId,
      shippingId:
        shipping.id,
      warehouseId:
        shipping.warehouseId,
      shippingLocationId:
        shipping.shippingLocationId,
      type: normalized.type,
      status:
        normalized.assignedUserId !==
          undefined ||
        normalized.assignedEquipmentId !==
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
      ...(normalized.shippingItemId !==
      undefined
        ? {
            shippingItemId:
              normalized.shippingItemId,
          }
        : {}),
      ...(normalized.shippingPackageId !==
      undefined
        ? {
            shippingPackageId:
              normalized
                .shippingPackageId,
          }
        : {}),
      ...(normalized.dockId !== undefined
        ? { dockId: normalized.dockId }
        : {}),
      ...(normalized.vehicleId !==
      undefined
        ? {
            vehicleId:
              normalized.vehicleId,
          }
        : {}),
      ...(normalized.assignedUserId !==
      undefined
        ? {
            assignedUserId:
              normalized.assignedUserId,
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
  }

  async listTasks(
    tenantId: string,
    shippingId: string,
  ): Promise<
    import(
      "../types/ShippingTask"
    ).ShippingTask[]
  > {
    const shipping =
      await this.get(
        tenantId,
        shippingId,
      );

    return this.repository.listTasks(
      shipping.tenantId,
      shipping.id,
    );
  }

  async startLoading(
    tenantId: string,
    shippingId: string,
  ): Promise<Shipping> {
    const shipping =
      await this.get(
        tenantId,
        shippingId,
      );

    if (
      shipping.status !== "released" &&
      shipping.status !==
        "loading_ready"
    ) {
      throw new InventoryValidationError(
        "Yükleme yalnızca sevkiyata açılmış veya yüklemeye hazır operasyonda başlatılabilir.",
      );
    }

    const tasks =
      await this.repository.listTasks(
        shipping.tenantId,
        shipping.id,
      );

    const loadingTasks =
      tasks.filter(
        (task) =>
          task.type ===
            "load_package" ||
          task.type ===
            "verify_packages",
      );

    if (loadingTasks.length === 0) {
      throw new InventoryValidationError(
        "Yükleme başlamadan önce en az bir paket yükleme veya paket doğrulama görevi oluşturulmalıdır.",
      );
    }

    if (shipping.dockId === undefined) {
      throw new InventoryValidationError(
        "Yükleme başlamadan önce rampa atanmalıdır.",
      );
    }

    const dock =
      await this.repository
        .findDockById(
          shipping.tenantId,
          shipping.dockId,
        );

    if (
      !dock ||
      !dock.active ||
      (
        dock.status !== "available" &&
        dock.status !== "reserved"
      )
    ) {
      throw new InventoryValidationError(
        "Atanmış rampa yükleme için uygun değil.",
      );
    }

    const timestamp = this.now();

    await this.repository.saveDock({
      ...dock,
      status: "occupied",
      updatedAt: timestamp,
    });

    return this.repository.save({
      ...shipping,
      status: "loading",
      loadingStartedAt: timestamp,
      updatedAt: timestamp,
    });
  }

  async confirmItemLoad(
    input: import(
      "../types/ShippingItem"
    ).ConfirmShippingItemLoadInput,
  ): Promise<ShippingItem> {
    const normalized =
      validateConfirmShippingItemLoad(
        input,
      );

    const shipping =
      await this.get(
        normalized.tenantId,
        normalized.shippingId,
      );

    if (shipping.status !== "loading") {
      throw new InventoryValidationError(
        "Sevkiyat satırı yalnızca yükleme devam ederken onaylanabilir.",
      );
    }

    const item =
      shipping.items.find(
        (current) =>
          current.id ===
          normalized.shippingItemId,
      );

    if (!item) {
      throw new InventoryValidationError(
        `Sevkiyat satırı bulunamadı: ${normalized.shippingItemId}`,
      );
    }

    validateShippingLoadTotals(
      item.remainingQuantity,
      normalized,
    );

    if (
      normalized.shippingPackageId !==
      undefined &&
      !shipping.packages.some(
        (shippingPackage) =>
          shippingPackage.id ===
          normalized.shippingPackageId,
      )
    ) {
      throw new InventoryValidationError(
        "Yükleme paket kaydı sevkiyata ait değil.",
      );
    }

    const loadedQuantity =
      item.loadedQuantity +
      normalized.quantity;

    const damagedQuantity =
      item.damagedQuantity +
      (
        normalized.damagedQuantity ??
        0
      );

    const missingQuantity =
      item.missingQuantity +
      (
        normalized.missingQuantity ??
        0
      );

    const remainingQuantity =
      Math.max(
        0,
        item.requestedQuantity -
          loadedQuantity -
          damagedQuantity -
          missingQuantity,
      );

    return this.repository.saveItem({
      ...item,
      loadedQuantity,
      damagedQuantity,
      missingQuantity,
      remainingQuantity,
      updatedAt: this.now(),
      ...(normalized.notes !== undefined
        ? { notes: normalized.notes }
        : {}),
    });
  }

  async loadPackage(input: {
    tenantId: string;
    shippingId: string;
    shippingPackageId: string;
    loadedBy: string;
  }): Promise<ShippingPackage> {
    const shipping =
      await this.get(
        input.tenantId,
        input.shippingId,
      );

    if (shipping.status !== "loading") {
      throw new InventoryValidationError(
        "Paket yalnızca yükleme devam ederken araca yüklenebilir.",
      );
    }

    const shippingPackage =
      shipping.packages.find(
        (current) =>
          current.id ===
          input.shippingPackageId,
      );

    if (!shippingPackage) {
      throw new InventoryValidationError(
        `Sevkiyat paketi bulunamadı: ${input.shippingPackageId}`,
      );
    }

    if (
      shippingPackage.status !==
        "loading_ready" &&
      shippingPackage.status !==
        "loading"
    ) {
      throw new InventoryValidationError(
        "Paket yüklemeye hazır durumda değil.",
      );
    }

    const loadedBy = requireText(
      input.loadedBy,
      "Yüklemeyi yapan kullanıcı",
    );

    const timestamp = this.now();

    return this.repository.savePackage({
      ...shippingPackage,
      status: "loaded",
      loadedBy,
      loadedAt: timestamp,
      updatedAt: timestamp,
    });
  }

  async completeLoading(
    tenantId: string,
    shippingId: string,
  ): Promise<Shipping> {
    const shipping =
      await this.get(
        tenantId,
        shippingId,
      );

    if (shipping.status !== "loading") {
      throw new InventoryValidationError(
        "Yalnızca yükleme devam eden sevkiyatın yüklemesi tamamlanabilir.",
      );
    }

    const incompleteItems =
      shipping.items.filter(
        (item) =>
          item.remainingQuantity > 0,
      );

    if (incompleteItems.length > 0) {
      throw new InventoryValidationError(
        "Tüm sevkiyat satırları sonuçlandırılmadan yükleme tamamlanamaz.",
      );
    }

    const unloadedPackages =
      shipping.packages.filter(
        (shippingPackage) =>
          shippingPackage.status !==
          "loaded",
      );

    if (unloadedPackages.length > 0) {
      throw new InventoryValidationError(
        "Tüm sevkiyat paketleri yüklenmeden araç yüklemesi tamamlanamaz.",
      );
    }

    const timestamp = this.now();

    return this.repository.save({
      ...shipping,
      status: "loaded",
      loadedAt: timestamp,
      updatedAt: timestamp,
    });
  }

  async createManifest(input: {
    tenantId: string;
    shippingId: string;
    notes?: string;
    createdBy: string;
  }): Promise<ShippingManifest> {
    const shipping =
      await this.get(
        input.tenantId,
        input.shippingId,
      );

    if (shipping.status !== "loaded") {
      throw new InventoryValidationError(
        "Manifest yalnızca yüklemesi tamamlanmış sevkiyat için oluşturulabilir.",
      );
    }

    return this.manifestService.create({
      tenantId: shipping.tenantId,
      shippingId: shipping.id,
      createdBy: input.createdBy,
      ...(shipping.carrierId !== undefined
        ? {
            carrierId:
              shipping.carrierId,
          }
        : {}),
      ...(shipping.serviceLevelId !==
      undefined
        ? {
            serviceLevelId:
              shipping.serviceLevelId,
          }
        : {}),
      ...(shipping.vehicleId !==
      undefined
        ? {
            vehicleId:
              shipping.vehicleId,
          }
        : {}),
      ...(input.notes?.trim()
        ? {
            notes:
              input.notes.trim(),
          }
        : {}),
    });
  }

  async generateManifest(input: {
    tenantId: string;
    shippingId: string;
    manifestId: string;
    generatedBy: string;
  }): Promise<ShippingManifest> {
    return this.manifestService.generate({
      tenantId: input.tenantId,
      shippingId: input.shippingId,
      manifestId: input.manifestId,
      generatedBy: input.generatedBy,
    });
  }

  async approveManifest(input: {
    tenantId: string;
    shippingId: string;
    manifestId: string;
    approvedBy: string;
  }): Promise<ShippingManifest> {
    return this.manifestService.approve({
      tenantId: input.tenantId,
      shippingId: input.shippingId,
      manifestId: input.manifestId,
      approvedBy: input.approvedBy,
    });
  }

  async submitManifest(input: {
    tenantId: string;
    shippingId: string;
    manifestId: string;
  }): Promise<ShippingManifest> {
    return this.manifestService.submit({
      tenantId: input.tenantId,
      shippingId: input.shippingId,
      manifestId: input.manifestId,
    });
  }

  async listManifests(
    tenantId: string,
    shippingId: string,
  ): Promise<ShippingManifest[]> {
    return this.manifestService.list(
      tenantId,
      shippingId,
    );
  }

  async createAsn(input: {
    tenantId: string;
    shippingId: string;
    senderCode?: string;
    receiverCode?: string;
    format?:
      | "json"
      | "xml"
      | "edi"
      | "edifact"
      | "custom";
    notes?: string;
    createdBy: string;
  }): Promise<ShippingAsn> {
    const shipping =
      await this.get(
        input.tenantId,
        input.shippingId,
      );

    if (
      shipping.status !== "loaded" &&
      shipping.status !== "dispatched"
    ) {
      throw new InventoryValidationError(
        "ASN yalnızca yüklenmiş veya sevk edilmiş operasyon için oluşturulabilir.",
      );
    }

    return this.asnService.create({
      tenantId: shipping.tenantId,
      shippingId: shipping.id,
      createdBy: input.createdBy,
      ...(input.senderCode?.trim()
        ? {
            senderCode:
              input.senderCode.trim(),
          }
        : {}),
      ...(input.receiverCode?.trim()
        ? {
            receiverCode:
              input.receiverCode.trim(),
          }
        : {}),
      ...(input.format !== undefined
        ? { format: input.format }
        : {}),
      ...(input.notes?.trim()
        ? {
            notes:
              input.notes.trim(),
          }
        : {}),
    });
  }

  async generateAsn(input: {
    tenantId: string;
    shippingId: string;
    asnId: string;
    generatedBy: string;
  }): Promise<ShippingAsn> {
    return this.asnService.generate({
      tenantId: input.tenantId,
      shippingId: input.shippingId,
      asnId: input.asnId,
      generatedBy: input.generatedBy,
    });
  }

  async sendAsn(input: {
    tenantId: string;
    shippingId: string;
    asnId: string;
  }): Promise<ShippingAsn> {
    return this.asnService.send({
      tenantId: input.tenantId,
      shippingId: input.shippingId,
      asnId: input.asnId,
    });
  }

  async listAsns(
    tenantId: string,
    shippingId: string,
  ): Promise<ShippingAsn[]> {
    return this.asnService.list(
      tenantId,
      shippingId,
    );
  }

  async dispatch(input: {
    tenantId: string;
    shippingId: string;
    dispatchedBy: string;
    trackingNumber?: string;
  }): Promise<Shipping> {
    const shipping =
      await this.get(
        input.tenantId,
        input.shippingId,
      );

    if (shipping.status !== "loaded") {
      throw new InventoryValidationError(
        "Yalnızca yüklemesi tamamlanmış sevkiyatın araç çıkışı yapılabilir.",
      );
    }

    requireText(
      input.dispatchedBy,
      "Araç çıkışını yapan kullanıcı",
    );

    if (
      shipping.vehicleId === undefined &&
      shipping.strategy !== "parcel"
    ) {
      throw new InventoryValidationError(
        "Araçlı sevkiyat için çıkıştan önce araç atanmalıdır.",
      );
    }

    const manifests =
      await this.repository.listManifests(
        shipping.tenantId,
        shipping.id,
      );

    const validManifest =
      manifests.find(
        (manifest) =>
          manifest.status ===
            "accepted" ||
          manifest.status ===
            "approved",
      );

    if (!validManifest) {
      throw new InventoryValidationError(
        "Araç çıkışı için onaylanmış veya kabul edilmiş manifest gereklidir.",
      );
    }

    if (
      shipping.carrierId !== undefined
    ) {
      const carrier =
        await this.carrierService
          .getCarrier(
            shipping.tenantId,
            shipping.carrierId,
          );

      if (
        carrier.asnSupported
      ) {
        const asns =
          await this.repository.listAsns(
            shipping.tenantId,
            shipping.id,
          );

        const validAsn =
          asns.find(
            (asn) =>
              asn.status === "sent" ||
              asn.status ===
                "acknowledged",
          );

        if (!validAsn) {
          throw new InventoryValidationError(
            "ASN destekli taşıyıcı için araç çıkışından önce ASN gönderilmelidir.",
          );
        }
      }
    }

    const timestamp = this.now();

    for (
      const shippingPackage
      of shipping.packages
    ) {
      if (
        shippingPackage.status !==
        "loaded"
      ) {
        throw new InventoryValidationError(
          "Yüklenmemiş paket bulunduğu için araç çıkışı yapılamaz.",
        );
      }

      await this.repository.savePackage({
        ...shippingPackage,
        status: "dispatched",
        dispatchedAt: timestamp,
        updatedAt: timestamp,
        ...(input.trackingNumber?.trim()
          ? {
              trackingNumber:
                input.trackingNumber.trim(),
            }
          : {}),
      });
    }

    await this.trackingService.createEvent({
      tenantId: shipping.tenantId,
      shippingId: shipping.id,
      type: "dispatched",
      message: "Araç çıkışı yapıldı.",
      source: "warehouse",
      occurredAt: timestamp,
      ...(input.trackingNumber?.trim()
        ? {
            trackingNumber:
              input.trackingNumber.trim(),
          }
        : {}),
    });

    if (shipping.dockId !== undefined) {
      const dock =
        await this.repository
          .findDockById(
            shipping.tenantId,
            shipping.dockId,
          );

      if (dock) {
        await this.repository.saveDock({
          ...dock,
          status: "available",
          updatedAt: timestamp,
        });
      }
    }

    return this.get(
      shipping.tenantId,
      shipping.id,
    );
  }

  async recordProofOfDelivery(
    input: import(
      "../types/ShippingProofOfDelivery"
    ).CreateShippingProofOfDeliveryInput,
  ): Promise<ShippingProofOfDelivery> {
    const normalized =
      validateCreateShippingProofOfDelivery(
        input,
      );

    const shipping =
      await this.get(
        normalized.tenantId,
        normalized.shippingId,
      );

    if (
      shipping.status !== "dispatched" &&
      shipping.status !== "in_transit" &&
      shipping.status !==
        "partially_delivered"
    ) {
      throw new InventoryValidationError(
        "Teslimat kanıtı yalnızca sevk edilmiş veya taşımadaki sevkiyat için kaydedilebilir.",
      );
    }

    const existing =
      await this.repository
        .listProofsOfDelivery(
          shipping.tenantId,
          shipping.id,
        );

    if (
      existing.some(
        (proof) =>
          proof.status !== "cancelled",
      )
    ) {
      throw new InventoryValidationError(
        "Bu sevkiyat için aktif teslimat kanıtı zaten bulunmaktadır.",
      );
    }

    const timestamp = this.now();

    const proof =
      await this.repository
        .saveProofOfDelivery({
          id: this.createId(),
          tenantId:
            shipping.tenantId,
          shippingId:
            shipping.id,
          status: "captured",
          recipientName:
            normalized.recipientName,
          photoUrls:
            normalized.photoUrls ?? [],
          documentUrls:
            normalized.documentUrls ?? [],
          deliveredAt:
            normalized.deliveredAt ??
            timestamp,
          capturedBy:
            normalized.capturedBy,
          createdAt: timestamp,
          updatedAt: timestamp,
          ...(normalized
            .recipientIdentityNumber !==
          undefined
            ? {
                recipientIdentityNumber:
                  normalized
                    .recipientIdentityNumber,
              }
            : {}),
          ...(normalized
            .recipientPhone !== undefined
            ? {
                recipientPhone:
                  normalized.recipientPhone,
              }
            : {}),
          ...(normalized.signatureUrl !==
          undefined
            ? {
                signatureUrl:
                  normalized.signatureUrl,
              }
            : {}),
          ...(normalized.latitude !==
          undefined
            ? {
                latitude:
                  normalized.latitude,
              }
            : {}),
          ...(normalized.longitude !==
          undefined
            ? {
                longitude:
                  normalized.longitude,
              }
            : {}),
          ...(normalized.deliveryAddress !==
          undefined
            ? {
                deliveryAddress:
                  normalized
                    .deliveryAddress,
              }
            : {}),
          ...(normalized.notes !== undefined
            ? {
                notes:
                  normalized.notes,
              }
            : {}),
        });

    await this.trackingService.createEvent({
      tenantId: shipping.tenantId,
      shippingId: shipping.id,
      type: "delivered",
      message:
        `Teslimat ${proof.recipientName} tarafından teslim alındı.`,
      source: "driver",
      occurredAt: proof.deliveredAt,
      ...(proof.latitude !== undefined
        ? {
            latitude:
              proof.latitude,
          }
        : {}),
      ...(proof.longitude !== undefined
        ? {
            longitude:
              proof.longitude,
          }
        : {}),
    });

    return proof;
  }

  async listProofsOfDelivery(
    tenantId: string,
    shippingId: string,
  ): Promise<ShippingProofOfDelivery[]> {
    const shipping =
      await this.get(
        tenantId,
        shippingId,
      );

    return this.repository
      .listProofsOfDelivery(
        shipping.tenantId,
        shipping.id,
      );
  }

  async createException(input: {
    tenantId: string;
    shippingId: string;
    type: ShippingExceptionType;
    message: string;
    shippingItemId?: string;
    shippingPackageId?: string;
    taskId?: string;
    manifestId?: string;
    dockId?: string;
    vehicleId?: string;
    carrierId?: string;
  }): Promise<ShippingException> {
    const shipping =
      await this.get(
        input.tenantId,
        input.shippingId,
      );

    const message = requireText(
      input.message,
      "Sevkiyat istisnası açıklaması",
    );

    if (
      input.shippingItemId !==
        undefined &&
      !shipping.items.some(
        (item) =>
          item.id ===
          input.shippingItemId,
      )
    ) {
      throw new InventoryValidationError(
        "İstisnaya bağlı sevkiyat satırı bulunamadı.",
      );
    }

    if (
      input.shippingPackageId !==
        undefined &&
      !shipping.packages.some(
        (shippingPackage) =>
          shippingPackage.id ===
          input.shippingPackageId,
      )
    ) {
      throw new InventoryValidationError(
        "İstisnaya bağlı sevkiyat paketi bulunamadı.",
      );
    }

    return this.repository.saveException({
      id: this.createId(),
      tenantId: shipping.tenantId,
      shippingId: shipping.id,
      type: input.type,
      message,
      warehouseId:
        shipping.warehouseId,
      resolved: false,
      createdAt: this.now(),
      ...(input.shippingItemId !==
      undefined
        ? {
            shippingItemId:
              input.shippingItemId,
          }
        : {}),
      ...(input.shippingPackageId !==
      undefined
        ? {
            shippingPackageId:
              input.shippingPackageId,
          }
        : {}),
      ...(input.taskId !== undefined
        ? { taskId: input.taskId }
        : {}),
      ...(input.manifestId !== undefined
        ? {
            manifestId:
              input.manifestId,
          }
        : {}),
      ...(input.dockId !== undefined
        ? { dockId: input.dockId }
        : {}),
      ...(input.vehicleId !== undefined
        ? {
            vehicleId:
              input.vehicleId,
          }
        : {}),
      ...(input.carrierId !== undefined
        ? {
            carrierId:
              input.carrierId,
          }
        : {}),
    });
  }

  async resolveException(input: {
    tenantId: string;
    shippingId: string;
    exceptionId: string;
    resolvedBy: string;
    resolutionNotes: string;
  }): Promise<ShippingException> {
    const shipping =
      await this.get(
        input.tenantId,
        input.shippingId,
      );

    const exceptions =
      await this.repository
        .listExceptions(
          shipping.tenantId,
          shipping.id,
        );

    const exception =
      exceptions.find(
        (current) =>
          current.id ===
          input.exceptionId,
      );

    if (!exception) {
      throw new InventoryValidationError(
        `Sevkiyat istisnası bulunamadı: ${input.exceptionId}`,
      );
    }

    if (exception.resolved) {
      throw new InventoryValidationError(
        "Sevkiyat istisnası daha önce çözülmüş.",
      );
    }

    return this.repository.saveException({
      ...exception,
      resolved: true,
      resolvedBy: requireText(
        input.resolvedBy,
        "İstisnayı çözen kullanıcı",
      ),
      resolvedAt: this.now(),
      resolutionNotes: requireText(
        input.resolutionNotes,
        "Çözüm açıklaması",
      ),
    });
  }

  async listExceptions(
    tenantId: string,
    shippingId: string,
  ): Promise<ShippingException[]> {
    const shipping =
      await this.get(
        tenantId,
        shippingId,
      );

    return this.repository.listExceptions(
      shipping.tenantId,
      shipping.id,
    );
  }

  async listTrackingEvents(
    tenantId: string,
    shippingId: string,
  ): Promise<ShippingTrackingEvent[]> {
    return this.trackingService.list(
      tenantId,
      shippingId,
    );
  }

  async completeDelivery(
    tenantId: string,
    shippingId: string,
  ): Promise<Shipping> {
    const shipping =
      await this.get(
        tenantId,
        shippingId,
      );

    if (
      shipping.status !== "delivered"
    ) {
      throw new InventoryValidationError(
        "Yalnızca teslim edilmiş sevkiyat tamamlanabilir.",
      );
    }

    const unresolvedExceptions =
      (
        await this.repository
          .listExceptions(
            shipping.tenantId,
            shipping.id,
          )
      ).filter(
        (exception) =>
          !exception.resolved,
      );

    if (
      unresolvedExceptions.length > 0
    ) {
      throw new InventoryValidationError(
        "Çözülmemiş sevkiyat istisnaları bulunduğu için teslimat tamamlanamaz.",
      );
    }

    const proofs =
      await this.repository
        .listProofsOfDelivery(
          shipping.tenantId,
          shipping.id,
        );

    if (
      !proofs.some(
        (proof) =>
          proof.status === "captured" ||
          proof.status === "verified",
      )
    ) {
      throw new InventoryValidationError(
        "Teslimat kanıtı olmadan sevkiyat tamamlanamaz.",
      );
    }

    const timestamp =
      shipping.actualDeliveryAt ??
      shipping.deliveredAt ??
      this.now();

    const deliveredItems =
      shipping.items.map(
        (item) => ({
          ...item,
          deliveredQuantity:
            item.loadedQuantity,
          remainingQuantity: 0,
          updatedAt: this.now(),
        }),
      );

    for (const item of deliveredItems) {
      await this.repository.saveItem(
        item,
      );
    }

    return this.repository.save({
      ...shipping,
      status: "delivered",
      deliveredAt: timestamp,
      actualDeliveryAt: timestamp,
      updatedAt: this.now(),
    });
  }

  async markReturned(input: {
    tenantId: string;
    shippingId: string;
    reason: string;
  }): Promise<Shipping> {
    const shipping =
      await this.get(
        input.tenantId,
        input.shippingId,
      );

    if (
      shipping.status !==
        "delivery_failed" &&
      shipping.status !==
        "in_transit" &&
      shipping.status !==
        "partially_delivered"
    ) {
      throw new InventoryValidationError(
        "Sevkiyat mevcut durumunda iadeye alınamaz.",
      );
    }

    const reason = requireText(
      input.reason,
      "İade nedeni",
    );

    await this.trackingService.createEvent({
      tenantId: shipping.tenantId,
      shippingId: shipping.id,
      type: "returned",
      message:
        `Sevkiyat iadeye alındı. Neden: ${reason}`,
      source: "warehouse",
      occurredAt: this.now(),
    });

    return this.get(
      shipping.tenantId,
      shipping.id,
    );
  }

  async cancel(input: {
    tenantId: string;
    shippingId: string;
    cancellationReason: string;
  }): Promise<Shipping> {
    const shipping =
      await this.get(
        input.tenantId,
        input.shippingId,
      );

    if (
      shipping.status === "dispatched" ||
      shipping.status === "in_transit" ||
      shipping.status === "delivered" ||
      shipping.status ===
        "partially_delivered" ||
      shipping.status ===
        "delivery_failed" ||
      shipping.status === "returned"
    ) {
      throw new InventoryValidationError(
        "Araç çıkışı yapılmış veya teslimat sürecine girmiş sevkiyat doğrudan iptal edilemez.",
      );
    }

    if (shipping.status === "cancelled") {
      throw new InventoryValidationError(
        "Sevkiyat daha önce iptal edilmiş.",
      );
    }

    const cancellationReason =
      requireText(
        input.cancellationReason,
        "İptal nedeni",
      );

    const timestamp = this.now();

    for (
      const shippingPackage
      of shipping.packages
    ) {
      await this.repository.savePackage({
        ...shippingPackage,
        status: "cancelled",
        updatedAt: timestamp,
      });
    }

    if (shipping.dockId !== undefined) {
      const dock =
        await this.repository
          .findDockById(
            shipping.tenantId,
            shipping.dockId,
          );

      if (
        dock &&
        (
          dock.status === "reserved" ||
          dock.status === "occupied"
        )
      ) {
        await this.repository.saveDock({
          ...dock,
          status: "available",
          updatedAt: timestamp,
        });
      }
    }

    return this.repository.save({
      ...shipping,
      status: "cancelled",
      cancelledAt: timestamp,
      cancellationReason,
      updatedAt: timestamp,
    });
  }

  private async addPackageFromPacking(
    input: {
      tenantId: string;
      shippingId: string;
      packing: Packing;
      packingPackage: PackingPackage;
    },
  ): Promise<ShippingPackage> {
    return this.addPackage({
      tenantId:
        input.tenantId,
      shippingId:
        input.shippingId,
      packingId:
        input.packing.id,
      packingPackageId:
        input.packingPackage.id,
      packageNumber:
        input.packingPackage
          .packageNumber,
      loadingSequence:
        input.packing.packages.findIndex(
          (packingPackage) =>
            packingPackage.id ===
            input.packingPackage.id,
        ) + 1,
      ...(input.packingPackage.sscc !==
      undefined
        ? {
            sscc:
              input.packingPackage.sscc,
          }
        : {}),
      ...(input.packingPackage
        .actualWeight !== undefined
        ? {
            weight:
              input.packingPackage
                .actualWeight,
          }
        : input.packingPackage
          .calculatedWeight !== undefined
          ? {
              weight:
                input.packingPackage
                  .calculatedWeight,
            }
          : {}),
      ...(input.packingPackage
        .actualVolume !== undefined
        ? {
            volume:
              input.packingPackage
                .actualVolume,
          }
        : input.packingPackage
          .calculatedVolume !== undefined
          ? {
              volume:
                input.packingPackage
                  .calculatedVolume,
            }
          : {}),
      weightUnit:
        input.packingPackage.weightUnit,
      volumeUnit:
        input.packingPackage.volumeUnit,
      ...(input.packingPackage
        .parentPackageId !== undefined
        ? {
            parentPackageId:
              input.packingPackage
                .parentPackageId,
          }
        : {}),
    });
  }

  private buildWarehouseAddress(
    packing: Packing,
  ): Shipping["shipFromAddress"] {
    const timestamp = this.now();

    return {
      id: this.createId(),
      tenantId:
        packing.tenantId,
      type: "ship_from",
      name: "Depo Çıkış Adresi",
      countryCode: "TR",
      country: "Türkiye",
      city: "Belirtilmedi",
      addressLine1:
        `Depo: ${packing.warehouseId}`,
      residential: false,
      validated: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  private buildDestinationAddress(
    packing: Packing,
  ): Shipping["shipToAddress"] {
    const timestamp = this.now();

    return {
      id: this.createId(),
      tenantId:
        packing.tenantId,
      type: "ship_to",
      name: "Teslimat Adresi",
      countryCode: "TR",
      country: "Türkiye",
      city: "Belirtilmedi",
      addressLine1:
        `Sevkiyat lokasyonu: ${packing.shippingLocationId ?? packing.packingLocationId}`,
      residential: false,
      validated: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  private isTemperatureControlled(
    packing: Packing,
  ): boolean {
    return packing.items.some(
      (item) =>
        item.temperatureControlled,
    );
  }

  private hasHazardousMaterial(
    packing: Packing,
  ): boolean {
    return packing.items.some(
      (item) =>
        item.hazardousMaterial,
    );
  }

  private generateShippingNumber():
    string {
    const date = this.now()
      .slice(0, 10)
      .replaceAll("-", "");

    const sequence = String(
      this.sequence(),
    ).padStart(6, "0");

    return `SVK-${date}-${sequence}`;
  }
}
