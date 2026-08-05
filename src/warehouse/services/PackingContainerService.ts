import type {
  CreatePackingContainerInput,
  PackingContainer,
  PackingContainerDimensions,
} from "../types/PackingContainer";
import {
  InventoryValidationError,
} from "../types/InventoryErrors";
import type {
  PackingRepository,
} from "./PackingRepository";
import {
  validateCreatePackingContainer,
} from "./PackingValidator";

export interface PackingContainerServiceDependencies {
  repository: PackingRepository;
  createId?: () => string;
  now?: () => string;
}

export interface PackingContainerCompatibilityInput {
  tenantId: string;
  requiredWeight?: number;
  weightUnit?: "g" | "kg";
  requiredVolume?: number;
  volumeUnit?: "cm3" | "m3";
  temperatureControlled?: boolean;
  hazardousMaterial?: boolean;
  containerTypes?: readonly PackingContainer["type"][];
}

export interface PackingContainerCapacity {
  readonly containerId: string;
  readonly maximumWeightKg?: number;
  readonly maximumVolumeCm3?: number;
  readonly usableWeightKg?: number;
  readonly usableVolumeCm3?: number;
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

function calculateDimensionsVolumeCm3(
  dimensions?: PackingContainerDimensions,
): number | undefined {
  if (!dimensions) {
    return undefined;
  }

  const multiplier =
    dimensions.unit === "mm"
      ? 0.1
      : dimensions.unit === "m"
        ? 100
        : 1;

  return (
    dimensions.length *
    multiplier *
    dimensions.width *
    multiplier *
    dimensions.height *
    multiplier
  );
}

export class PackingContainerService {
  private readonly repository:
    PackingRepository;

  private readonly createId:
    () => string;

  private readonly now:
    () => string;

  constructor(
    dependencies:
      PackingContainerServiceDependencies,
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

  async create(
    input: CreatePackingContainerInput,
  ): Promise<PackingContainer> {
    const normalized =
      validateCreatePackingContainer(
        input,
      );

    const existing =
      await this.repository
        .findContainerByCode(
          normalized.tenantId,
          normalized.code,
        );

    if (existing) {
      throw new InventoryValidationError(
        `Ambalaj kodu daha önce kullanılmış: ${normalized.code}`,
      );
    }

    const timestamp = this.now();

    return this.repository.saveContainer({
      id: this.createId(),
      tenantId: normalized.tenantId,
      code: normalized.code,
      name: normalized.name,
      type: normalized.type,
      temperatureControlled:
        normalized.temperatureControlled ??
        false,
      hazardousMaterialAllowed:
        normalized.hazardousMaterialAllowed ??
        false,
      reusable:
        normalized.reusable ?? false,
      active: true,
      createdBy: normalized.createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(normalized.description !== undefined
        ? {
            description:
              normalized.description,
          }
        : {}),
      ...(normalized.dimensions !== undefined
        ? {
            dimensions:
              normalized.dimensions,
          }
        : {}),
      ...(normalized.emptyWeight !== undefined
        ? {
            emptyWeight:
              normalized.emptyWeight,
          }
        : {}),
      ...(normalized.maximumWeight !== undefined
        ? {
            maximumWeight:
              normalized.maximumWeight,
          }
        : {}),
      ...(normalized.maximumVolume !== undefined
        ? {
            maximumVolume:
              normalized.maximumVolume,
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
    });
  }

  async get(
    tenantId: string,
    containerId: string,
  ): Promise<PackingContainer> {
    const normalizedTenantId =
      tenantId.trim();

    const normalizedContainerId =
      containerId.trim();

    if (!normalizedTenantId) {
      throw new InventoryValidationError(
        "Firma kimliği boş bırakılamaz.",
      );
    }

    if (!normalizedContainerId) {
      throw new InventoryValidationError(
        "Ambalaj kimliği boş bırakılamaz.",
      );
    }

    const container =
      await this.repository
        .findContainerById(
          normalizedTenantId,
          normalizedContainerId,
        );

    if (!container) {
      throw new InventoryValidationError(
        `Ambalaj kaydı bulunamadı: ${containerId}`,
      );
    }

    return container;
  }

  async list(
    tenantId: string,
    activeOnly = false,
  ): Promise<PackingContainer[]> {
    const normalizedTenantId =
      tenantId.trim();

    if (!normalizedTenantId) {
      throw new InventoryValidationError(
        "Firma kimliği boş bırakılamaz.",
      );
    }

    return this.repository.listContainers(
      normalizedTenantId,
      activeOnly,
    );
  }

  async setActive(
    tenantId: string,
    containerId: string,
    active: boolean,
  ): Promise<PackingContainer> {
    const container = await this.get(
      tenantId,
      containerId,
    );

    return this.repository.saveContainer({
      ...container,
      active,
      updatedAt: this.now(),
    });
  }

  calculateCapacity(
    container: PackingContainer,
  ): PackingContainerCapacity {
    const maximumWeightKg =
      container.maximumWeight !== undefined &&
      container.weightUnit !== undefined
        ? convertWeightToKg(
            container.maximumWeight,
            container.weightUnit,
          )
        : undefined;

    const emptyWeightKg =
      container.emptyWeight !== undefined &&
      container.weightUnit !== undefined
        ? convertWeightToKg(
            container.emptyWeight,
            container.weightUnit,
          )
        : 0;

    const maximumVolumeCm3 =
      container.maximumVolume !== undefined &&
      container.volumeUnit !== undefined
        ? convertVolumeToCm3(
            container.maximumVolume,
            container.volumeUnit,
          )
        : calculateDimensionsVolumeCm3(
            container.dimensions,
          );

    const usableWeightKg =
      maximumWeightKg !== undefined
        ? Math.max(
            0,
            maximumWeightKg -
              emptyWeightKg,
          )
        : undefined;

    return {
      containerId: container.id,
      ...(maximumWeightKg !== undefined
        ? { maximumWeightKg }
        : {}),
      ...(maximumVolumeCm3 !== undefined
        ? { maximumVolumeCm3 }
        : {}),
      ...(usableWeightKg !== undefined
        ? { usableWeightKg }
        : {}),
      ...(maximumVolumeCm3 !== undefined
        ? {
            usableVolumeCm3:
              maximumVolumeCm3,
          }
        : {}),
    };
  }

  async findCompatible(
    input: PackingContainerCompatibilityInput,
  ): Promise<PackingContainer[]> {
    const tenantId =
      input.tenantId.trim();

    if (!tenantId) {
      throw new InventoryValidationError(
        "Firma kimliği boş bırakılamaz.",
      );
    }

    const requiredWeightKg =
      input.requiredWeight !== undefined
        ? convertWeightToKg(
            input.requiredWeight,
            input.weightUnit ?? "kg",
          )
        : undefined;

    const requiredVolumeCm3 =
      input.requiredVolume !== undefined
        ? convertVolumeToCm3(
            input.requiredVolume,
            input.volumeUnit ?? "cm3",
          )
        : undefined;

    const containerTypes =
      input.containerTypes !== undefined
        ? new Set(input.containerTypes)
        : undefined;

    const containers =
      await this.repository.listContainers(
        tenantId,
        true,
      );

    return containers.filter(
      (container) => {
        if (
          containerTypes !== undefined &&
          !containerTypes.has(
            container.type,
          )
        ) {
          return false;
        }

        if (
          input.temperatureControlled ===
            true &&
          !container.temperatureControlled
        ) {
          return false;
        }

        if (
          input.hazardousMaterial === true &&
          !container
            .hazardousMaterialAllowed
        ) {
          return false;
        }

        const capacity =
          this.calculateCapacity(
            container,
          );

        if (
          requiredWeightKg !== undefined &&
          capacity.usableWeightKg !==
            undefined &&
          requiredWeightKg >
            capacity.usableWeightKg
        ) {
          return false;
        }

        if (
          requiredVolumeCm3 !== undefined &&
          capacity.usableVolumeCm3 !==
            undefined &&
          requiredVolumeCm3 >
            capacity.usableVolumeCm3
        ) {
          return false;
        }

        return true;
      },
    );
  }
}
