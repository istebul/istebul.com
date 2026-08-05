import type {
  ShippingManifest,
  ShippingManifestPackage,
} from "../types/ShippingManifest";
import type {
  ShippingPackage,
} from "../types/ShippingPackage";
import {
  InventoryValidationError,
} from "../types/InventoryErrors";
import type {
  ShippingRepository,
} from "./ShippingRepository";
import {
  validateCreateShippingManifest,
} from "./ShippingValidator";

export interface ShippingManifestServiceDependencies {
  repository: ShippingRepository;
  createId?: () => string;
  now?: () => string;
  sequence?: () => number;
}

export interface GenerateShippingManifestInput {
  tenantId: string;
  shippingId: string;
  manifestId: string;
  generatedBy: string;
}

export interface ApproveShippingManifestInput {
  tenantId: string;
  shippingId: string;
  manifestId: string;
  approvedBy: string;
}

export interface SubmitShippingManifestInput {
  tenantId: string;
  shippingId: string;
  manifestId: string;
}

export interface AcceptShippingManifestInput {
  tenantId: string;
  shippingId: string;
  manifestId: string;
}

export interface RejectShippingManifestInput {
  tenantId: string;
  shippingId: string;
  manifestId: string;
  rejectionReason: string;
}

export interface CancelShippingManifestInput {
  tenantId: string;
  shippingId: string;
  manifestId: string;
  cancellationReason?: string;
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

function convertWeightToKg(
  value: number,
  unit?: "g" | "kg",
): number {
  return unit === "g"
    ? value / 1_000
    : value;
}

function convertVolumeToCm3(
  value: number,
  unit?: "cm3" | "m3",
): number {
  return unit === "m3"
    ? value * 1_000_000
    : value;
}

function buildManifestPackage(
  shippingPackage: ShippingPackage,
): ShippingManifestPackage {
  return {
    shippingPackageId:
      shippingPackage.id,
    packageNumber:
      shippingPackage.packageNumber,
    ...(shippingPackage.sscc !== undefined
      ? { sscc: shippingPackage.sscc }
      : {}),
    ...(shippingPackage
      .trackingNumber !== undefined
      ? {
          trackingNumber:
            shippingPackage
              .trackingNumber,
        }
      : {}),
    ...(shippingPackage.weight !==
    undefined
      ? {
          weight:
            shippingPackage.weight,
        }
      : {}),
    ...(shippingPackage.volume !==
    undefined
      ? {
          volume:
            shippingPackage.volume,
        }
      : {}),
  };
}

export class ShippingManifestService {
  private readonly repository:
    ShippingRepository;

  private readonly createId:
    () => string;

  private readonly now:
    () => string;

  private readonly sequence:
    () => number;

  constructor(
    dependencies:
      ShippingManifestServiceDependencies,
  ) {
    this.repository =
      dependencies.repository;

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

  async create(input: {
    tenantId: string;
    shippingId: string;
    carrierId?: string;
    serviceLevelId?: string;
    vehicleId?: string;
    notes?: string;
    createdBy: string;
  }): Promise<ShippingManifest> {
    const normalized =
      validateCreateShippingManifest(
        input,
      );

    const shipping =
      await this.repository.findById(
        normalized.tenantId,
        normalized.shippingId,
      );

    if (!shipping) {
      throw new InventoryValidationError(
        `Sevkiyat kaydı bulunamadı: ${normalized.shippingId}`,
      );
    }

    if (
      shipping.status === "delivered" ||
      shipping.status === "returned" ||
      shipping.status === "cancelled"
    ) {
      throw new InventoryValidationError(
        "Tamamlanmış, iade edilmiş veya iptal edilmiş sevkiyat için manifest oluşturulamaz.",
      );
    }

    const existing =
      await this.repository.listManifests(
        shipping.tenantId,
        shipping.id,
      );

    const activeManifest =
      existing.find(
        (manifest) =>
          manifest.status !==
            "cancelled" &&
          manifest.status !==
            "rejected",
      );

    if (activeManifest) {
      throw new InventoryValidationError(
        "Bu sevkiyat için aktif bir manifest zaten bulunmaktadır.",
      );
    }

    const timestamp = this.now();

    return this.repository.saveManifest({
      id: this.createId(),
      tenantId: shipping.tenantId,
      shippingId: shipping.id,
      manifestNumber:
        this.generateManifestNumber(),
      status: "draft",
      packageCount: 0,
      packages: [],
      createdBy:
        normalized.createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(normalized.carrierId !==
      undefined
        ? {
            carrierId:
              normalized.carrierId,
          }
        : shipping.carrierId !==
          undefined
          ? {
              carrierId:
                shipping.carrierId,
            }
          : {}),
      ...(normalized.serviceLevelId !==
      undefined
        ? {
            serviceLevelId:
              normalized.serviceLevelId,
          }
        : shipping.serviceLevelId !==
          undefined
          ? {
              serviceLevelId:
                shipping.serviceLevelId,
            }
          : {}),
      ...(normalized.vehicleId !==
      undefined
        ? {
            vehicleId:
              normalized.vehicleId,
          }
        : shipping.vehicleId !==
          undefined
          ? {
              vehicleId:
                shipping.vehicleId,
            }
          : {}),
      ...(normalized.notes !== undefined
        ? { notes: normalized.notes }
        : {}),
    });
  }

  async generate(
    input: GenerateShippingManifestInput,
  ): Promise<ShippingManifest> {
    const manifest =
      await this.get(
        input.tenantId,
        input.shippingId,
        input.manifestId,
      );

    if (
      manifest.status !== "draft" &&
      manifest.status !== "rejected"
    ) {
      throw new InventoryValidationError(
        "Yalnızca taslak veya reddedilmiş manifest yeniden oluşturulabilir.",
      );
    }

    const generatedBy =
      requireText(
        input.generatedBy,
        "Manifesti oluşturan kullanıcı",
      );

    const packages =
      await this.repository.listPackages(
        manifest.tenantId,
        manifest.shippingId,
      );

    if (packages.length === 0) {
      throw new InventoryValidationError(
        "Sevkiyat paketi bulunmadan manifest oluşturulamaz.",
      );
    }

    const invalidPackages =
      packages.filter(
        (shippingPackage) =>
          shippingPackage.status ===
            "pending" ||
          shippingPackage.status ===
            "cancelled",
      );

    if (invalidPackages.length > 0) {
      throw new InventoryValidationError(
        "Bekleyen veya iptal edilmiş paketler manifeste eklenemez.",
      );
    }

    const manifestPackages =
      packages.map(
        buildManifestPackage,
      );

    const totalWeightKg =
      packages.reduce(
        (total, shippingPackage) =>
          total +
          convertWeightToKg(
            shippingPackage.weight ?? 0,
            shippingPackage.weightUnit,
          ),
        0,
      );

    const totalVolumeCm3 =
      packages.reduce(
        (total, shippingPackage) =>
          total +
          convertVolumeToCm3(
            shippingPackage.volume ?? 0,
            shippingPackage.volumeUnit,
          ),
        0,
      );

    const timestamp = this.now();

    return this.repository.saveManifest({
      ...manifest,
      status: "generated",
      packageCount:
        manifestPackages.length,
      packages: manifestPackages,
      generatedBy,
      generatedAt: timestamp,
      updatedAt: timestamp,
      ...(totalWeightKg > 0
        ? {
            totalWeight:
              totalWeightKg,
            weightUnit: "kg",
          }
        : {}),
      ...(totalVolumeCm3 > 0
        ? {
            totalVolume:
              totalVolumeCm3,
            volumeUnit: "cm3",
          }
        : {}),
    });
  }

  async approve(
    input: ApproveShippingManifestInput,
  ): Promise<ShippingManifest> {
    const manifest =
      await this.get(
        input.tenantId,
        input.shippingId,
        input.manifestId,
      );

    if (
      manifest.status !== "generated"
    ) {
      throw new InventoryValidationError(
        "Yalnızca oluşturulmuş manifest onaylanabilir.",
      );
    }

    if (manifest.packageCount === 0) {
      throw new InventoryValidationError(
        "Paket içermeyen manifest onaylanamaz.",
      );
    }

    if (
      manifest.packages.length !==
      manifest.packageCount
    ) {
      throw new InventoryValidationError(
        "Manifest paket sayısı ile paket kayıtları uyuşmamaktadır.",
      );
    }

    const approvedBy =
      requireText(
        input.approvedBy,
        "Manifesti onaylayan kullanıcı",
      );

    const timestamp = this.now();

    return this.repository.saveManifest({
      ...manifest,
      status: "approved",
      approvedBy,
      approvedAt: timestamp,
      updatedAt: timestamp,
    });
  }

  async submit(
    input: SubmitShippingManifestInput,
  ): Promise<ShippingManifest> {
    const manifest =
      await this.get(
        input.tenantId,
        input.shippingId,
        input.manifestId,
      );

    if (
      manifest.status !== "approved"
    ) {
      throw new InventoryValidationError(
        "Yalnızca onaylanmış manifest taşıyıcıya gönderilebilir.",
      );
    }

    if (manifest.carrierId === undefined) {
      throw new InventoryValidationError(
        "Manifest gönderimi için taşıyıcı atanmalıdır.",
      );
    }

    const carrier =
      await this.repository
        .findCarrierById(
          manifest.tenantId,
          manifest.carrierId,
        );

    if (!carrier) {
      throw new InventoryValidationError(
        "Manifest taşıyıcısı bulunamadı.",
      );
    }

    if (!carrier.active) {
      throw new InventoryValidationError(
        "Pasif taşıyıcıya manifest gönderilemez.",
      );
    }

    if (!carrier.manifestSupported) {
      throw new InventoryValidationError(
        "Seçilen taşıyıcı manifest gönderimini desteklemiyor.",
      );
    }

    const timestamp = this.now();

    return this.repository.saveManifest({
      ...manifest,
      status: "submitted",
      submittedAt: timestamp,
      updatedAt: timestamp,
    });
  }

  async accept(
    input: AcceptShippingManifestInput,
  ): Promise<ShippingManifest> {
    const manifest =
      await this.get(
        input.tenantId,
        input.shippingId,
        input.manifestId,
      );

    if (
      manifest.status !== "submitted"
    ) {
      throw new InventoryValidationError(
        "Yalnızca gönderilmiş manifest kabul edilebilir.",
      );
    }

    const timestamp = this.now();

    return this.repository.saveManifest({
      ...manifest,
      status: "accepted",
      acceptedAt: timestamp,
      updatedAt: timestamp,
    });
  }

  async reject(
    input: RejectShippingManifestInput,
  ): Promise<ShippingManifest> {
    const manifest =
      await this.get(
        input.tenantId,
        input.shippingId,
        input.manifestId,
      );

    if (
      manifest.status !== "submitted"
    ) {
      throw new InventoryValidationError(
        "Yalnızca gönderilmiş manifest reddedilebilir.",
      );
    }

    const rejectionReason =
      requireText(
        input.rejectionReason,
        "Manifest ret nedeni",
      );

    return this.repository.saveManifest({
      ...manifest,
      status: "rejected",
      rejectionReason,
      updatedAt: this.now(),
    });
  }

  async cancel(
    input: CancelShippingManifestInput,
  ): Promise<ShippingManifest> {
    const manifest =
      await this.get(
        input.tenantId,
        input.shippingId,
        input.manifestId,
      );

    if (
      manifest.status === "accepted" ||
      manifest.status === "cancelled"
    ) {
      throw new InventoryValidationError(
        "Kabul edilmiş veya iptal edilmiş manifest doğrudan iptal edilemez.",
      );
    }

    const cancellationReason =
      input.cancellationReason
        ?.trim();

    const existingNotes =
      manifest.notes?.trim();

    const notes = [
      existingNotes,
      cancellationReason
        ? `İptal nedeni: ${cancellationReason}`
        : undefined,
    ]
      .filter(
        (
          value,
        ): value is string =>
          value !== undefined &&
          value.length > 0,
      )
      .join("\n");

    return this.repository.saveManifest({
      ...manifest,
      status: "cancelled",
      updatedAt: this.now(),
      ...(notes
        ? { notes }
        : {}),
    });
  }

  async get(
    tenantId: string,
    shippingId: string,
    manifestId: string,
  ): Promise<ShippingManifest> {
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

    const normalizedManifestId =
      requireText(
        manifestId,
        "Manifest kimliği",
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

    const manifests =
      await this.repository.listManifests(
        normalizedTenantId,
        normalizedShippingId,
      );

    const manifest =
      manifests.find(
        (current) =>
          current.id ===
          normalizedManifestId,
      );

    if (!manifest) {
      throw new InventoryValidationError(
        `Manifest bulunamadı: ${manifestId}`,
      );
    }

    return manifest;
  }

  async list(
    tenantId: string,
    shippingId: string,
  ): Promise<ShippingManifest[]> {
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

    return this.repository.listManifests(
      normalizedTenantId,
      normalizedShippingId,
    );
  }

  private generateManifestNumber():
    string {
    const date = this.now()
      .slice(0, 10)
      .replaceAll("-", "");

    const sequence = String(
      this.sequence(),
    ).padStart(6, "0");

    return `MNF-${date}-${sequence}`;
  }
}
