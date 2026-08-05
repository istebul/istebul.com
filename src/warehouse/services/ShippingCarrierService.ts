import type {
  CreateShippingCarrierInput,
  ShippingCarrier,
} from "../types/ShippingCarrier";
import type {
  CreateShippingServiceLevelInput,
  ShippingServiceLevel,
} from "../types/ShippingServiceLevel";
import {
  InventoryValidationError,
} from "../types/InventoryErrors";
import type {
  ShippingRepository,
} from "./ShippingRepository";
import {
  validateCreateShippingCarrier,
  validateCreateShippingServiceLevel,
} from "./ShippingValidator";

export interface ShippingCarrierServiceDependencies {
  repository: ShippingRepository;
  createId?: () => string;
  now?: () => string;
}

export interface ShippingCapabilityRequirement {
  temperatureControlled?: boolean;
  hazardousMaterial?: boolean;
  international?: boolean;
  trackingRequired?: boolean;
  manifestRequired?: boolean;
  asnRequired?: boolean;
  proofOfDeliveryRequired?: boolean;
  maximumWeight?: number;
  maximumVolume?: number;
  weightUnit?: "g" | "kg";
  volumeUnit?: "cm3" | "m3";
}

export interface CompatibleShippingOption {
  readonly carrier: ShippingCarrier;
  readonly serviceLevel: ShippingServiceLevel;
  readonly reasons: readonly string[];
  readonly warnings: readonly string[];
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
  unit: "g" | "kg",
): number {
  return unit === "g"
    ? value / 1_000
    : value;
}

function convertVolumeToCm3(
  value: number,
  unit: "cm3" | "m3",
): number {
  return unit === "m3"
    ? value * 1_000_000
    : value;
}

export class ShippingCarrierService {
  private readonly repository:
    ShippingRepository;

  private readonly createId:
    () => string;

  private readonly now:
    () => string;

  constructor(
    dependencies:
      ShippingCarrierServiceDependencies,
  ) {
    this.repository =
      dependencies.repository;

    this.createId =
      dependencies.createId ??
      (() => crypto.randomUUID());

    this.now =
      dependencies.now ??
      (() => new Date().toISOString());
  }

  async createCarrier(
    input: CreateShippingCarrierInput,
  ): Promise<ShippingCarrier> {
    const normalized =
      validateCreateShippingCarrier(
        input,
      );

    const existing =
      await this.repository
        .findCarrierByCode(
          normalized.tenantId,
          normalized.code,
        );

    if (existing) {
      throw new InventoryValidationError(
        `Taşıyıcı kodu daha önce kullanılmış: ${normalized.code}`,
      );
    }

    const timestamp = this.now();

    return this.repository.saveCarrier({
      id: this.createId(),
      tenantId:
        normalized.tenantId,
      code: normalized.code,
      name: normalized.name,
      type: normalized.type,
      apiEnabled:
        normalized.apiEnabled ?? false,
      trackingSupported:
        normalized.trackingSupported ??
        false,
      manifestSupported:
        normalized.manifestSupported ??
        false,
      asnSupported:
        normalized.asnSupported ?? false,
      temperatureControlled:
        normalized.temperatureControlled ??
        false,
      hazardousMaterialAllowed:
        normalized
          .hazardousMaterialAllowed ??
        false,
      international:
        normalized.international ??
        false,
      serviceLevels: [],
      active: true,
      createdBy:
        normalized.createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(normalized.taxNumber !==
      undefined
        ? {
            taxNumber:
              normalized.taxNumber,
          }
        : {}),
      ...(normalized.contactName !==
      undefined
        ? {
            contactName:
              normalized.contactName,
          }
        : {}),
      ...(normalized.phone !== undefined
        ? { phone: normalized.phone }
        : {}),
      ...(normalized.email !== undefined
        ? { email: normalized.email }
        : {}),
      ...(normalized.website !==
      undefined
        ? {
            website:
              normalized.website,
          }
        : {}),
      ...(normalized.accountNumber !==
      undefined
        ? {
            accountNumber:
              normalized.accountNumber,
          }
        : {}),
      ...(normalized.integrationCode !==
      undefined
        ? {
            integrationCode:
              normalized.integrationCode,
          }
        : {}),
    });
  }

  async getCarrier(
    tenantId: string,
    carrierId: string,
  ): Promise<ShippingCarrier> {
    const normalizedTenantId =
      requireText(
        tenantId,
        "Firma kimliği",
      );

    const normalizedCarrierId =
      requireText(
        carrierId,
        "Taşıyıcı kimliği",
      );

    const carrier =
      await this.repository
        .findCarrierById(
          normalizedTenantId,
          normalizedCarrierId,
        );

    if (!carrier) {
      throw new InventoryValidationError(
        `Taşıyıcı bulunamadı: ${carrierId}`,
      );
    }

    return carrier;
  }

  async listCarriers(
    tenantId: string,
    activeOnly = false,
  ): Promise<ShippingCarrier[]> {
    const normalizedTenantId =
      requireText(
        tenantId,
        "Firma kimliği",
      );

    return this.repository.listCarriers(
      normalizedTenantId,
      activeOnly,
    );
  }

  async setCarrierActive(
    tenantId: string,
    carrierId: string,
    active: boolean,
  ): Promise<ShippingCarrier> {
    const carrier =
      await this.getCarrier(
        tenantId,
        carrierId,
      );

    if (carrier.active === active) {
      return carrier;
    }

    return this.repository.saveCarrier({
      ...carrier,
      active,
      updatedAt: this.now(),
    });
  }

  async createServiceLevel(
    input: CreateShippingServiceLevelInput,
  ): Promise<ShippingServiceLevel> {
    const normalized =
      validateCreateShippingServiceLevel(
        input,
      );

    const carrier =
      await this.getCarrier(
        normalized.tenantId,
        normalized.carrierId,
      );

    if (!carrier.active) {
      throw new InventoryValidationError(
        "Pasif taşıyıcı için servis seviyesi oluşturulamaz.",
      );
    }

    const existing =
      await this.repository
        .findServiceLevelByCode(
          normalized.tenantId,
          normalized.carrierId,
          normalized.code,
        );

    if (existing) {
      throw new InventoryValidationError(
        `Servis seviyesi kodu bu taşıyıcı için daha önce kullanılmış: ${normalized.code}`,
      );
    }

    if (
      normalized.temperatureControlled ===
        true &&
      !carrier.temperatureControlled
    ) {
      throw new InventoryValidationError(
        "Taşıyıcı sıcaklık kontrollü taşıma desteklemediği için bu servis seviyesi oluşturulamaz.",
      );
    }

    if (
      normalized.hazardousMaterialAllowed ===
        true &&
      !carrier.hazardousMaterialAllowed
    ) {
      throw new InventoryValidationError(
        "Taşıyıcı tehlikeli madde taşımayı desteklemediği için bu servis seviyesi oluşturulamaz.",
      );
    }

    if (
      normalized.international === true &&
      !carrier.international
    ) {
      throw new InventoryValidationError(
        "Taşıyıcı uluslararası taşıma desteklemediği için bu servis seviyesi oluşturulamaz.",
      );
    }

    if (
      normalized.trackingSupported === true &&
      !carrier.trackingSupported
    ) {
      throw new InventoryValidationError(
        "Taşıyıcı takip desteği sunmadığı için bu servis seviyesi takip destekli olarak tanımlanamaz.",
      );
    }

    const timestamp = this.now();

    return this.repository
      .saveServiceLevel({
        id: this.createId(),
        tenantId:
          normalized.tenantId,
        carrierId:
          normalized.carrierId,
        code: normalized.code,
        name: normalized.name,
        type: normalized.type,
        temperatureControlled:
          normalized
            .temperatureControlled ??
          false,
        hazardousMaterialAllowed:
          normalized
            .hazardousMaterialAllowed ??
          false,
        international:
          normalized.international ??
          false,
        trackingSupported:
          normalized
            .trackingSupported ??
          false,
        proofOfDeliveryRequired:
          normalized
            .proofOfDeliveryRequired ??
          false,
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
        ...(normalized
          .minimumDeliveryHours !==
        undefined
          ? {
              minimumDeliveryHours:
                normalized
                  .minimumDeliveryHours,
            }
          : {}),
        ...(normalized
          .maximumDeliveryHours !==
        undefined
          ? {
              maximumDeliveryHours:
                normalized
                  .maximumDeliveryHours,
            }
          : {}),
        ...(normalized.cutoffTime !==
        undefined
          ? {
              cutoffTime:
                normalized.cutoffTime,
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
      });
  }

  async getServiceLevel(
    tenantId: string,
    serviceLevelId: string,
  ): Promise<ShippingServiceLevel> {
    const normalizedTenantId =
      requireText(
        tenantId,
        "Firma kimliği",
      );

    const normalizedServiceLevelId =
      requireText(
        serviceLevelId,
        "Servis seviyesi kimliği",
      );

    const serviceLevel =
      await this.repository
        .findServiceLevelById(
          normalizedTenantId,
          normalizedServiceLevelId,
        );

    if (!serviceLevel) {
      throw new InventoryValidationError(
        `Servis seviyesi bulunamadı: ${serviceLevelId}`,
      );
    }

    return serviceLevel;
  }

  async listServiceLevels(
    tenantId: string,
    carrierId?: string,
    activeOnly = false,
  ): Promise<ShippingServiceLevel[]> {
    const normalizedTenantId =
      requireText(
        tenantId,
        "Firma kimliği",
      );

    const normalizedCarrierId =
      carrierId?.trim() || undefined;

    return this.repository
      .listServiceLevels(
        normalizedTenantId,
        normalizedCarrierId,
        activeOnly,
      );
  }

  async setServiceLevelActive(
    tenantId: string,
    serviceLevelId: string,
    active: boolean,
  ): Promise<ShippingServiceLevel> {
    const serviceLevel =
      await this.getServiceLevel(
        tenantId,
        serviceLevelId,
      );

    if (serviceLevel.active === active) {
      return serviceLevel;
    }

    if (active) {
      const carrier =
        await this.getCarrier(
          tenantId,
          serviceLevel.carrierId,
        );

      if (!carrier.active) {
        throw new InventoryValidationError(
          "Pasif taşıyıcıya bağlı servis seviyesi aktifleştirilemez.",
        );
      }
    }

    return this.repository
      .saveServiceLevel({
        ...serviceLevel,
        active,
        updatedAt: this.now(),
      });
  }

  async findCompatibleOptions(
    tenantId: string,
    requirement:
      ShippingCapabilityRequirement,
  ): Promise<CompatibleShippingOption[]> {
    const normalizedTenantId =
      requireText(
        tenantId,
        "Firma kimliği",
      );

    const carriers =
      await this.repository
        .listCarriers(
          normalizedTenantId,
          true,
        );

    const serviceLevels =
      await this.repository
        .listServiceLevels(
          normalizedTenantId,
          undefined,
          true,
        );

    const options:
      CompatibleShippingOption[] = [];

    for (const carrier of carriers) {
      const carrierServiceLevels =
        serviceLevels.filter(
          (serviceLevel) =>
            serviceLevel.carrierId ===
            carrier.id,
        );

      for (
        const serviceLevel
        of carrierServiceLevels
      ) {
        const evaluation =
          this.evaluateCompatibility(
            carrier,
            serviceLevel,
            requirement,
          );

        if (evaluation.compatible) {
          options.push({
            carrier,
            serviceLevel,
            reasons:
              evaluation.reasons,
            warnings:
              evaluation.warnings,
          });
        }
      }
    }

    return options.sort(
      (left, right) => {
        const leftHours =
          left.serviceLevel
            .maximumDeliveryHours ??
          Number.MAX_SAFE_INTEGER;

        const rightHours =
          right.serviceLevel
            .maximumDeliveryHours ??
          Number.MAX_SAFE_INTEGER;

        if (leftHours !== rightHours) {
          return leftHours - rightHours;
        }

        return left.carrier.name
          .localeCompare(
            right.carrier.name,
            "tr",
          );
      },
    );
  }

  evaluateCompatibility(
    carrier: ShippingCarrier,
    serviceLevel: ShippingServiceLevel,
    requirement:
      ShippingCapabilityRequirement,
  ): {
    compatible: boolean;
    reasons: string[];
    warnings: string[];
  } {
    const reasons: string[] = [];
    const warnings: string[] = [];

    if (!carrier.active) {
      return {
        compatible: false,
        reasons,
        warnings: [
          "Taşıyıcı pasif durumda.",
        ],
      };
    }

    if (!serviceLevel.active) {
      return {
        compatible: false,
        reasons,
        warnings: [
          "Servis seviyesi pasif durumda.",
        ],
      };
    }

    if (
      serviceLevel.carrierId !==
      carrier.id
    ) {
      return {
        compatible: false,
        reasons,
        warnings: [
          "Servis seviyesi taşıyıcıyla ilişkili değil.",
        ],
      };
    }

    if (
      requirement
        .temperatureControlled ===
        true &&
      (
        !carrier.temperatureControlled ||
        !serviceLevel
          .temperatureControlled
      )
    ) {
      return {
        compatible: false,
        reasons,
        warnings: [
          "Sıcaklık kontrollü taşıma desteği bulunmuyor.",
        ],
      };
    }

    if (
      requirement.hazardousMaterial ===
        true &&
      (
        !carrier
          .hazardousMaterialAllowed ||
        !serviceLevel
          .hazardousMaterialAllowed
      )
    ) {
      return {
        compatible: false,
        reasons,
        warnings: [
          "Tehlikeli madde taşıma desteği bulunmuyor.",
        ],
      };
    }

    if (
      requirement.international ===
        true &&
      (
        !carrier.international ||
        !serviceLevel.international
      )
    ) {
      return {
        compatible: false,
        reasons,
        warnings: [
          "Uluslararası taşıma desteği bulunmuyor.",
        ],
      };
    }

    if (
      requirement.trackingRequired ===
        true &&
      (
        !carrier.trackingSupported ||
        !serviceLevel
          .trackingSupported
      )
    ) {
      return {
        compatible: false,
        reasons,
        warnings: [
          "Sevkiyat takip desteği bulunmuyor.",
        ],
      };
    }

    if (
      requirement.manifestRequired ===
        true &&
      !carrier.manifestSupported
    ) {
      return {
        compatible: false,
        reasons,
        warnings: [
          "Manifest desteği bulunmuyor.",
        ],
      };
    }

    if (
      requirement.asnRequired === true &&
      !carrier.asnSupported
    ) {
      return {
        compatible: false,
        reasons,
        warnings: [
          "ASN desteği bulunmuyor.",
        ],
      };
    }

    if (
      requirement
        .proofOfDeliveryRequired ===
        true &&
      !serviceLevel
        .proofOfDeliveryRequired
    ) {
      return {
        compatible: false,
        reasons,
        warnings: [
          "Teslimat kanıtı zorunluluğu desteklenmiyor.",
        ],
      };
    }

    if (
      requirement.maximumWeight !==
        undefined &&
      requirement.weightUnit !==
        undefined &&
      serviceLevel.maximumWeight !==
        undefined &&
      serviceLevel.weightUnit !==
        undefined
    ) {
      const requiredWeightKg =
        convertWeightToKg(
          requirement.maximumWeight,
          requirement.weightUnit,
        );

      const allowedWeightKg =
        convertWeightToKg(
          serviceLevel.maximumWeight,
          serviceLevel.weightUnit,
        );

      if (
        requiredWeightKg >
        allowedWeightKg
      ) {
        return {
          compatible: false,
          reasons,
          warnings: [
            "Sevkiyat ağırlığı servis seviyesi kapasitesini aşıyor.",
          ],
        };
      }

      reasons.push(
        "Ağırlık kapasitesi sevkiyat için uygundur.",
      );
    }

    if (
      requirement.maximumVolume !==
        undefined &&
      requirement.volumeUnit !==
        undefined &&
      serviceLevel.maximumVolume !==
        undefined &&
      serviceLevel.volumeUnit !==
        undefined
    ) {
      const requiredVolumeCm3 =
        convertVolumeToCm3(
          requirement.maximumVolume,
          requirement.volumeUnit,
        );

      const allowedVolumeCm3 =
        convertVolumeToCm3(
          serviceLevel.maximumVolume,
          serviceLevel.volumeUnit,
        );

      if (
        requiredVolumeCm3 >
        allowedVolumeCm3
      ) {
        return {
          compatible: false,
          reasons,
          warnings: [
            "Sevkiyat hacmi servis seviyesi kapasitesini aşıyor.",
          ],
        };
      }

      reasons.push(
        "Hacim kapasitesi sevkiyat için uygundur.",
      );
    }

    if (
      requirement.trackingRequired ===
      true
    ) {
      reasons.push(
        "Sevkiyat takip desteği bulunuyor.",
      );
    }

    if (
      requirement.manifestRequired ===
      true
    ) {
      reasons.push(
        "Manifest desteği bulunuyor.",
      );
    }

    if (
      requirement.asnRequired === true
    ) {
      reasons.push(
        "ASN desteği bulunuyor.",
      );
    }

    if (
      requirement
        .temperatureControlled ===
      true
    ) {
      reasons.push(
        "Sıcaklık kontrollü taşıma desteği bulunuyor.",
      );
    }

    if (
      requirement.hazardousMaterial ===
      true
    ) {
      reasons.push(
        "Tehlikeli madde taşıma desteği bulunuyor.",
      );
    }

    if (reasons.length === 0) {
      reasons.push(
        "Taşıyıcı ve servis seviyesi temel sevkiyat koşullarını karşılıyor.",
      );
    }

    if (!carrier.apiEnabled) {
      warnings.push(
        "Taşıyıcı API entegrasyonu etkin değil; işlemler manuel yürütülebilir.",
      );
    }

    return {
      compatible: true,
      reasons,
      warnings,
    };
  }
}
