import type {
  WaveCapacity,
  WaveCapacityInput,
} from "../types/WaveCapacity";
import {
  InventoryValidationError,
} from "../types/InventoryErrors";
import type {
  WaveRepository,
} from "./WaveRepository";
import {
  validateWaveCapacityInput,
} from "./WaveValidator";

export interface WaveCapacityServiceDependencies {
  readonly repository:
    WaveRepository;
  readonly now?: () => string;
}

export interface WaveCapacitySummary {
  readonly feasibleCount: number;
  readonly blockedCount: number;
  readonly averageOverallUtilizationRate: number;
  readonly maximumOverallUtilizationRate: number;
  readonly laborBlockedCount: number;
  readonly equipmentBlockedCount: number;
  readonly orderBlockedCount: number;
  readonly lineBlockedCount: number;
  readonly itemBlockedCount: number;
  readonly weightBlockedCount: number;
  readonly volumeBlockedCount: number;
}

export class WaveCapacityService {
  private readonly repository:
    WaveRepository;

  private readonly now: () => string;

  constructor(
    dependencies:
      WaveCapacityServiceDependencies,
  ) {
    this.repository =
      dependencies.repository;

    this.now =
      dependencies.now ??
      (() => new Date().toISOString());
  }

  calculate(
    input: WaveCapacityInput,
  ): WaveCapacity {
    const normalized =
      validateWaveCapacityInput(
        input,
      );

    const blockingReasons: string[] = [];
    const warnings: string[] = [];

    const laborUtilizationRate =
      this.calculateUtilizationRate(
        normalized.requiredLaborMinutes,
        normalized.availableLaborMinutes,
      );

    const equipmentUtilizationRate =
      this.calculateUtilizationRate(
        normalized
          .requiredEquipmentMinutes,
        normalized
          .availableEquipmentMinutes,
      );

    const orderUtilizationRate =
      this.calculateUtilizationRate(
        normalized
          .requiredOrderCapacity,
        normalized
          .availableOrderCapacity,
      );

    const lineUtilizationRate =
      this.calculateUtilizationRate(
        normalized
          .requiredLineCapacity,
        normalized
          .availableLineCapacity,
      );

    const itemUtilizationRate =
      this.calculateUtilizationRate(
        normalized
          .requiredItemCapacity,
        normalized
          .availableItemCapacity,
      );

    const weightUtilizationRate =
      normalized.requiredWeightCapacity ===
          undefined ||
        normalized.availableWeightCapacity ===
          undefined
        ? undefined
        : this.calculateUtilizationRate(
            normalized
              .requiredWeightCapacity,
            normalized
              .availableWeightCapacity,
          );

    const volumeUtilizationRate =
      normalized.requiredVolumeCapacity ===
          undefined ||
        normalized.availableVolumeCapacity ===
          undefined
        ? undefined
        : this.calculateUtilizationRate(
            normalized
              .requiredVolumeCapacity,
            normalized
              .availableVolumeCapacity,
          );

    this.evaluateCapacity({
      label: "Personel",
      required:
        normalized.requiredLaborMinutes,
      available:
        normalized.availableLaborMinutes,
      utilizationRate:
        laborUtilizationRate,
      blockingReasons,
      warnings,
    });

    this.evaluateCapacity({
      label: "Ekipman",
      required:
        normalized
          .requiredEquipmentMinutes,
      available:
        normalized
          .availableEquipmentMinutes,
      utilizationRate:
        equipmentUtilizationRate,
      blockingReasons,
      warnings,
    });

    this.evaluateCapacity({
      label: "Sipariş",
      required:
        normalized
          .requiredOrderCapacity,
      available:
        normalized
          .availableOrderCapacity,
      utilizationRate:
        orderUtilizationRate,
      blockingReasons,
      warnings,
    });

    this.evaluateCapacity({
      label: "Satır",
      required:
        normalized
          .requiredLineCapacity,
      available:
        normalized
          .availableLineCapacity,
      utilizationRate:
        lineUtilizationRate,
      blockingReasons,
      warnings,
    });

    this.evaluateCapacity({
      label: "Ürün",
      required:
        normalized
          .requiredItemCapacity,
      available:
        normalized
          .availableItemCapacity,
      utilizationRate:
        itemUtilizationRate,
      blockingReasons,
      warnings,
    });

    if (
      normalized.requiredWeightCapacity !==
        undefined &&
      normalized.availableWeightCapacity !==
        undefined &&
      weightUtilizationRate !== undefined
    ) {
      this.evaluateCapacity({
        label: "Ağırlık",
        required:
          normalized
            .requiredWeightCapacity,
        available:
          normalized
            .availableWeightCapacity,
        utilizationRate:
          weightUtilizationRate,
        blockingReasons,
        warnings,
      });
    }

    if (
      normalized.requiredVolumeCapacity !==
        undefined &&
      normalized.availableVolumeCapacity !==
        undefined &&
      volumeUtilizationRate !== undefined
    ) {
      this.evaluateCapacity({
        label: "Hacim",
        required:
          normalized
            .requiredVolumeCapacity,
        available:
          normalized
            .availableVolumeCapacity,
        utilizationRate:
          volumeUtilizationRate,
        blockingReasons,
        warnings,
      });
    }

    const rates = [
      laborUtilizationRate,
      equipmentUtilizationRate,
      orderUtilizationRate,
      lineUtilizationRate,
      itemUtilizationRate,
      ...(weightUtilizationRate !==
      undefined
        ? [weightUtilizationRate]
        : []),
      ...(volumeUtilizationRate !==
      undefined
        ? [volumeUtilizationRate]
        : []),
    ];

    const overallUtilizationRate =
      rates.length === 0
        ? 0
        : this.round(
            rates.reduce(
              (total, rate) =>
                total + rate,
              0,
            ) / rates.length,
          );

    return {
      tenantId:
        normalized.tenantId,
      warehouseId:
        normalized.warehouseId,
      availableLaborMinutes:
        normalized
          .availableLaborMinutes,
      requiredLaborMinutes:
        normalized
          .requiredLaborMinutes,
      availableEquipmentMinutes:
        normalized
          .availableEquipmentMinutes,
      requiredEquipmentMinutes:
        normalized
          .requiredEquipmentMinutes,
      availableOrderCapacity:
        normalized
          .availableOrderCapacity,
      requiredOrderCapacity:
        normalized
          .requiredOrderCapacity,
      availableLineCapacity:
        normalized
          .availableLineCapacity,
      requiredLineCapacity:
        normalized
          .requiredLineCapacity,
      availableItemCapacity:
        normalized
          .availableItemCapacity,
      requiredItemCapacity:
        normalized
          .requiredItemCapacity,
      laborUtilizationRate,
      equipmentUtilizationRate,
      orderUtilizationRate,
      lineUtilizationRate,
      itemUtilizationRate,
      overallUtilizationRate,
      feasible:
        blockingReasons.length === 0,
      blockingReasons,
      warnings,
      calculatedAt: this.now(),
      ...(normalized.waveId !==
      undefined
        ? {
            waveId:
              normalized.waveId,
          }
        : {}),
      ...(normalized
        .availableWeightCapacity !==
      undefined
        ? {
            availableWeightCapacity:
              normalized
                .availableWeightCapacity,
          }
        : {}),
      ...(normalized
        .requiredWeightCapacity !==
      undefined
        ? {
            requiredWeightCapacity:
              normalized
                .requiredWeightCapacity,
          }
        : {}),
      ...(normalized
        .availableVolumeCapacity !==
      undefined
        ? {
            availableVolumeCapacity:
              normalized
                .availableVolumeCapacity,
          }
        : {}),
      ...(normalized
        .requiredVolumeCapacity !==
      undefined
        ? {
            requiredVolumeCapacity:
              normalized
                .requiredVolumeCapacity,
          }
        : {}),
    };
  }

  async calculateAndSave(
    input: WaveCapacityInput,
  ): Promise<WaveCapacity> {
    const capacity =
      this.calculate(input);

    if (capacity.waveId === undefined) {
      throw new InventoryValidationError(
        "Dalga kapasite sonucunu kaydetmek için dalga kimliği zorunludur.",
      );
    }

    const wave =
      await this.repository.findById(
        capacity.tenantId,
        capacity.waveId,
      );

    if (!wave) {
      throw new InventoryValidationError(
        `Dalga kaydı bulunamadı: ${capacity.waveId}`,
      );
    }

    if (
      wave.warehouseId !==
      capacity.warehouseId
    ) {
      throw new InventoryValidationError(
        "Kapasite kaydı deposu ile dalga deposu uyuşmuyor.",
      );
    }

    return this.repository
      .saveCapacity(capacity);
  }

  calculateUtilizationRate(
    required: number,
    available: number,
  ): number {
    this.requireNonNegativeNumber(
      required,
      "Gerekli kapasite",
    );

    this.requireNonNegativeNumber(
      available,
      "Kullanılabilir kapasite",
    );

    if (available === 0) {
      return required === 0
        ? 0
        : 100;
    }

    return this.round(
      Math.min(
        100,
        Math.max(
          0,
          (
            required /
            available
          ) * 100,
        ),
      ),
    );
  }

  summarize(
    capacities:
      readonly WaveCapacity[],
  ): WaveCapacitySummary {
    const feasibleCount =
      capacities.filter(
        (capacity) =>
          capacity.feasible,
      ).length;

    const blockedCount =
      capacities.length -
      feasibleCount;

    const averageOverallUtilizationRate =
      capacities.length === 0
        ? 0
        : this.round(
            capacities.reduce(
              (total, capacity) =>
                total +
                capacity
                  .overallUtilizationRate,
              0,
            ) / capacities.length,
          );

    const maximumOverallUtilizationRate =
      capacities.length === 0
        ? 0
        : Math.max(
            ...capacities.map(
              (capacity) =>
                capacity
                  .overallUtilizationRate,
            ),
          );

    const countBlockedBy =
      (label: string): number =>
        capacities.filter(
          (capacity) =>
            capacity.blockingReasons.some(
              (reason) =>
                reason.startsWith(
                  `${label} kapasitesi`,
                ),
            ),
        ).length;

    return {
      feasibleCount,
      blockedCount,
      averageOverallUtilizationRate,
      maximumOverallUtilizationRate:
        this.round(
          maximumOverallUtilizationRate,
        ),
      laborBlockedCount:
        countBlockedBy("Personel"),
      equipmentBlockedCount:
        countBlockedBy("Ekipman"),
      orderBlockedCount:
        countBlockedBy("Sipariş"),
      lineBlockedCount:
        countBlockedBy("Satır"),
      itemBlockedCount:
        countBlockedBy("Ürün"),
      weightBlockedCount:
        countBlockedBy("Ağırlık"),
      volumeBlockedCount:
        countBlockedBy("Hacim"),
    };
  }

  private evaluateCapacity(input: {
    label: string;
    required: number;
    available: number;
    utilizationRate: number;
    blockingReasons: string[];
    warnings: string[];
  }): void {
    if (
      input.required >
      input.available
    ) {
      input.blockingReasons.push(
        `${input.label} kapasitesi yetersiz: gerekli ${input.required}, kullanılabilir ${input.available}.`,
      );

      return;
    }

    if (
      input.utilizationRate >= 90
    ) {
      input.warnings.push(
        `${input.label} kapasitesi kritik seviyede kullanılmaktadır: %${input.utilizationRate}.`,
      );
    } else if (
      input.utilizationRate >= 75
    ) {
      input.warnings.push(
        `${input.label} kapasitesi yüksek seviyede kullanılmaktadır: %${input.utilizationRate}.`,
      );
    }
  }

  private requireNonNegativeNumber(
    value: unknown,
    fieldName: string,
  ): number {
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < 0
    ) {
      throw new InventoryValidationError(
        `${fieldName} sıfır veya daha büyük olmalıdır.`,
      );
    }

    return value;
  }

  private round(
    value: number,
  ): number {
    return Math.round(
      (
        value +
        Number.EPSILON
      ) * 10000,
    ) / 10000;
  }
}
