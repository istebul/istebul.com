import type {
  Shipping,
} from "../types/Shipping";
import type {
  ShippingCarrier,
} from "../types/ShippingCarrier";
import type {
  ShippingDock,
} from "../types/ShippingDock";
import type {
  ShippingServiceLevel,
} from "../types/ShippingServiceLevel";
import type {
  ShippingSuggestion,
  ShippingSuggestionScore,
} from "../types/ShippingSuggestion";
import type {
  ShippingVehicle,
} from "../types/ShippingVehicle";
import {
  InventoryValidationError,
} from "../types/InventoryErrors";
import type {
  ShippingRepository,
} from "./ShippingRepository";
import type {
  ShippingCarrierService,
} from "./ShippingCarrierService";

export interface ShippingCostEstimate {
  readonly carrierId: string;
  readonly serviceLevelId: string;
  readonly amount: number;
  readonly currency: string;
}

export interface GenerateShippingSuggestionsInput {
  tenantId: string;
  shippingId: string;

  carriers?: readonly ShippingCarrier[];
  serviceLevels?: readonly ShippingServiceLevel[];
  vehicles?: readonly ShippingVehicle[];
  docks?: readonly ShippingDock[];
  costEstimates?: readonly ShippingCostEstimate[];

  requireTracking?: boolean;
  requireManifest?: boolean;
  requireAsn?: boolean;
  requireProofOfDelivery?: boolean;

  international?: boolean;
  plannedDispatchAt?: string;

  preferredCarrierId?: string;
  preferredServiceLevelId?: string;
  preferredVehicleId?: string;
  preferredDockId?: string;

  maximumSuggestionCount?: number;
}

export interface ShippingRequirementSummary {
  readonly totalWeightKg: number;
  readonly totalVolumeCm3: number;
  readonly packageCount: number;
  readonly temperatureControlled: boolean;
  readonly hazardousMaterial: boolean;
  readonly international: boolean;
}

interface ShippingOptionEvaluation {
  readonly carrier: ShippingCarrier;
  readonly serviceLevel: ShippingServiceLevel;
  readonly vehicle?: ShippingVehicle;
  readonly dock?: ShippingDock;
  readonly estimatedCost?: number;
  readonly currency?: string;
  readonly estimatedDeliveryAt?: string;
  readonly score: ShippingSuggestionScore;
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

function clampScore(
  value: number,
): number {
  return Math.max(
    0,
    Math.min(100, Math.round(value)),
  );
}

function convertWeightToKg(
  value: number,
  unit?: "g" | "kg" | "ton",
): number {
  if (unit === "g") {
    return value / 1_000;
  }

  if (unit === "ton") {
    return value * 1_000;
  }

  return value;
}

function convertVolumeToCm3(
  value: number,
  unit?: "cm3" | "m3",
): number {
  return unit === "m3"
    ? value * 1_000_000
    : value;
}

function normalizeOptionalText(
  value?: string,
): string | undefined {
  const normalized = value?.trim();

  return normalized
    ? normalized
    : undefined;
}

export class ShippingSuggestionService {
  private readonly repository:
    ShippingRepository;

  private readonly carrierService:
    ShippingCarrierService;

  private readonly createId:
    () => string;

  private readonly now:
    () => string;

  constructor(
    dependencies: {
      repository: ShippingRepository;
      carrierService: ShippingCarrierService;
      createId?: () => string;
      now?: () => string;
    },
  ) {
    this.repository =
      dependencies.repository;

    this.carrierService =
      dependencies.carrierService;

    this.createId =
      dependencies.createId ??
      (() => crypto.randomUUID());

    this.now =
      dependencies.now ??
      (() => new Date().toISOString());
  }

  async generate(
    input: GenerateShippingSuggestionsInput,
  ): Promise<ShippingSuggestion[]> {
    const tenantId = requireText(
      input.tenantId,
      "Firma kimliği",
    );

    const shippingId = requireText(
      input.shippingId,
      "Sevkiyat kimliği",
    );

    const shipping =
      await this.repository.findById(
        tenantId,
        shippingId,
      );

    if (!shipping) {
      throw new InventoryValidationError(
        `Sevkiyat kaydı bulunamadı: ${shippingId}`,
      );
    }

    if (
      shipping.status === "delivered" ||
      shipping.status === "returned" ||
      shipping.status === "cancelled"
    ) {
      throw new InventoryValidationError(
        "Tamamlanmış, iade edilmiş veya iptal edilmiş sevkiyat için öneri üretilemez.",
      );
    }

    const requirement =
      this.buildRequirement(
        shipping,
        input,
      );

    const carriers =
      input.carriers ??
      await this.repository.listCarriers(
        tenantId,
        true,
      );

    const serviceLevels =
      input.serviceLevels ??
      await this.repository.listServiceLevels(
        tenantId,
        undefined,
        true,
      );

    const vehicles =
      input.vehicles ??
      await this.repository.listVehicles(
        tenantId,
        true,
      );

    const docks =
      input.docks ??
      await this.repository.listDocks(
        tenantId,
        shipping.warehouseId,
        true,
      );

    const costEstimates =
      input.costEstimates ?? [];

    const evaluations:
      ShippingOptionEvaluation[] = [];

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
        const compatibility =
          this.carrierService
            .evaluateCompatibility(
              carrier,
              serviceLevel,
              {
                temperatureControlled:
                  requirement
                    .temperatureControlled,
                hazardousMaterial:
                  requirement
                    .hazardousMaterial,
                international:
                  requirement.international,
                trackingRequired:
                  input.requireTracking ??
                  false,
                manifestRequired:
                  input.requireManifest ??
                  false,
                asnRequired:
                  input.requireAsn ??
                  false,
                proofOfDeliveryRequired:
                  input
                    .requireProofOfDelivery ??
                  false,
                maximumWeight:
                  requirement.totalWeightKg,
                weightUnit: "kg",
                maximumVolume:
                  requirement.totalVolumeCm3,
                volumeUnit: "cm3",
              },
            );

        if (!compatibility.compatible) {
          continue;
        }

        const compatibleVehicles =
          this.findCompatibleVehicles(
            shipping,
            carrier,
            vehicles,
            requirement,
          );

        const vehicleOptions =
          compatibleVehicles.length > 0
            ? compatibleVehicles
            : [undefined];

        const compatibleDocks =
          this.findCompatibleDocks(
            shipping,
            docks,
            compatibleVehicles,
            requirement,
          );

        const dockOptions =
          compatibleDocks.length > 0
            ? compatibleDocks
            : [undefined];

        for (const vehicle of vehicleOptions) {
          for (const dock of dockOptions) {
            const costEstimate =
              costEstimates.find(
                (estimate) =>
                  estimate.carrierId ===
                    carrier.id &&
                  estimate.serviceLevelId ===
                    serviceLevel.id,
              );

            const preferredCarrierId =
              normalizeOptionalText(
                input.preferredCarrierId,
              );

            const preferredServiceLevelId =
              normalizeOptionalText(
                input.preferredServiceLevelId,
              );

            const preferredVehicleId =
              normalizeOptionalText(
                input.preferredVehicleId,
              );

            const preferredDockId =
              normalizeOptionalText(
                input.preferredDockId,
              );

            const minimumCost =
              this.findMinimumCost(
                costEstimates,
              );

            const maximumCost =
              this.findMaximumCost(
                costEstimates,
              );

            const evaluation =
              this.evaluateOption({
                shipping,
                carrier,
                serviceLevel,
                requirement,
                compatibilityReasons:
                  compatibility.reasons,
                compatibilityWarnings:
                  compatibility.warnings,
                ...(vehicle !== undefined
                  ? { vehicle }
                  : {}),
                ...(dock !== undefined
                  ? { dock }
                  : {}),
                ...(costEstimate !== undefined
                  ? {
                      estimatedCost:
                        costEstimate.amount,
                      currency:
                        costEstimate.currency,
                    }
                  : {}),
                ...(input.plannedDispatchAt !==
                undefined
                  ? {
                      plannedDispatchAt:
                        input.plannedDispatchAt,
                    }
                  : {}),
                ...(preferredCarrierId !==
                undefined
                  ? { preferredCarrierId }
                  : {}),
                ...(preferredServiceLevelId !==
                undefined
                  ? {
                      preferredServiceLevelId,
                    }
                  : {}),
                ...(preferredVehicleId !==
                undefined
                  ? { preferredVehicleId }
                  : {}),
                ...(preferredDockId !== undefined
                  ? { preferredDockId }
                  : {}),
                ...(minimumCost !== undefined
                  ? { minimumCost }
                  : {}),
                ...(maximumCost !== undefined
                  ? { maximumCost }
                  : {}),
              });

            if (evaluation) {
              evaluations.push(
                evaluation,
              );
            }
          }
        }
      }
    }

    if (evaluations.length === 0) {
      throw new InventoryValidationError(
        "Sevkiyat koşullarını karşılayan taşıyıcı, servis seviyesi, araç veya rampa seçeneği bulunamadı.",
      );
    }

    const sorted = evaluations.sort(
      (left, right) =>
        right.score.totalScore -
          left.score.totalScore ||
        (
          left.estimatedCost ??
          Number.MAX_SAFE_INTEGER
        ) -
          (
            right.estimatedCost ??
            Number.MAX_SAFE_INTEGER
          ),
    );

    const maximumSuggestionCount =
      input.maximumSuggestionCount ??
      10;

    if (
      !Number.isInteger(
        maximumSuggestionCount,
      ) ||
      maximumSuggestionCount < 1 ||
      maximumSuggestionCount > 100
    ) {
      throw new InventoryValidationError(
        "Maksimum öneri sayısı 1 ile 100 arasında tam sayı olmalıdır.",
      );
    }

    const selected =
      sorted.slice(
        0,
        maximumSuggestionCount,
      );

    const suggestions:
      ShippingSuggestion[] = [];

    for (
      let index = 0;
      index < selected.length;
      index += 1
    ) {
      const evaluation =
        selected[index];

      if (evaluation === undefined) {
        continue;
      }

      const suggestion:
        ShippingSuggestion = {
          id: this.createId(),
          tenantId,
          shippingId,
          carrierId:
            evaluation.carrier.id,
          serviceLevelId:
            evaluation.serviceLevel.id,
          carrier:
            evaluation.carrier,
          serviceLevel:
            evaluation.serviceLevel,
          score: evaluation.score,
          reasons: evaluation.reasons,
          warnings: evaluation.warnings,
          selected: index === 0,
          createdAt: this.now(),
          ...(evaluation.vehicle !==
          undefined
            ? {
                vehicleId:
                  evaluation.vehicle.id,
                vehicle:
                  evaluation.vehicle,
              }
            : {}),
          ...(evaluation.dock !==
          undefined
            ? {
                dockId:
                  evaluation.dock.id,
                dock:
                  evaluation.dock,
              }
            : {}),
          ...(evaluation.estimatedCost !==
          undefined
            ? {
                estimatedCost:
                  evaluation.estimatedCost,
              }
            : {}),
          ...(evaluation.currency !==
          undefined
            ? {
                currency:
                  evaluation.currency,
              }
            : {}),
          ...(evaluation
            .estimatedDeliveryAt !==
          undefined
            ? {
                estimatedDeliveryAt:
                  evaluation
                    .estimatedDeliveryAt,
              }
            : {}),
        };

      suggestions.push(
        await this.repository
          .saveSuggestion(
            suggestion,
          ),
      );
    }

    return suggestions;
  }

  buildRequirement(
    shipping: Shipping,
    input?: Pick<
      GenerateShippingSuggestionsInput,
      "international"
    >,
  ): ShippingRequirementSummary {
    const totalWeightKg =
      shipping.packages.reduce(
        (total, shippingPackage) =>
          total +
          convertWeightToKg(
            shippingPackage.weight ?? 0,
            shippingPackage.weightUnit,
          ),
        0,
      );

    const totalVolumeCm3 =
      shipping.packages.reduce(
        (total, shippingPackage) =>
          total +
          convertVolumeToCm3(
            shippingPackage.volume ?? 0,
            shippingPackage.volumeUnit,
          ),
        0,
      );

    const international =
      input?.international ??
      (
        shipping.shipFromAddress
          .countryCode !==
        shipping.shipToAddress
          .countryCode
      );

    return {
      totalWeightKg,
      totalVolumeCm3,
      packageCount:
        shipping.packages.length,
      temperatureControlled:
        shipping.temperatureControlled ||
        shipping.items.some(
          (item) =>
            item.temperatureControlled,
        ),
      hazardousMaterial:
        shipping.hazardousMaterial ||
        shipping.items.some(
          (item) =>
            item.hazardousMaterial,
        ),
      international,
    };
  }

  private findCompatibleVehicles(
    shipping: Shipping,
    carrier: ShippingCarrier,
    vehicles:
      readonly ShippingVehicle[],
    requirement:
      ShippingRequirementSummary,
  ): ShippingVehicle[] {
    return vehicles
      .filter(
        (vehicle) =>
          vehicle.active,
      )
      .filter(
        (vehicle) =>
          vehicle.carrierId ===
            undefined ||
          vehicle.carrierId ===
            carrier.id,
      )
      .filter(
        (vehicle) =>
          !requirement
            .temperatureControlled ||
          vehicle
            .temperatureControlled,
      )
      .filter(
        (vehicle) =>
          !requirement
            .hazardousMaterial ||
          vehicle
            .hazardousMaterialAllowed,
      )
      .filter((vehicle) => {
        if (
          vehicle.maximumWeight ===
          undefined
        ) {
          return true;
        }

        const maximumWeightKg =
          convertWeightToKg(
            vehicle.maximumWeight,
            vehicle.weightUnit,
          );

        return (
          requirement.totalWeightKg <=
          maximumWeightKg
        );
      })
      .filter((vehicle) => {
        if (
          vehicle.maximumVolume ===
          undefined
        ) {
          return true;
        }

        const maximumVolumeCm3 =
          convertVolumeToCm3(
            vehicle.maximumVolume,
            vehicle.volumeUnit,
          );

        return (
          requirement.totalVolumeCm3 <=
          maximumVolumeCm3
        );
      })
      .filter(
        (vehicle) =>
          vehicle.packageCapacity ===
            undefined ||
          requirement.packageCount <=
            vehicle.packageCapacity,
      )
      .filter(
        (vehicle) =>
          shipping.vehicleId ===
            undefined ||
          vehicle.id ===
            shipping.vehicleId,
      );
  }

  private findCompatibleDocks(
    shipping: Shipping,
    docks: readonly ShippingDock[],
    vehicles:
      readonly ShippingVehicle[],
    requirement:
      ShippingRequirementSummary,
  ): ShippingDock[] {
    return docks
      .filter(
        (dock) =>
          dock.active,
      )
      .filter(
        (dock) =>
          dock.warehouseId ===
          shipping.warehouseId,
      )
      .filter(
        (dock) =>
          dock.status === "available" ||
          (
            dock.status === "reserved" &&
            dock.id === shipping.dockId
          ),
      )
      .filter(
        (dock) =>
          !requirement
            .temperatureControlled ||
          dock.temperatureControlled,
      )
      .filter(
        (dock) =>
          !requirement
            .hazardousMaterial ||
          dock.hazardousMaterialAllowed,
      )
      .filter((dock) => {
        if (
          dock.vehicleTypes.length ===
            0 ||
          vehicles.length === 0
        ) {
          return true;
        }

        return vehicles.some(
          (vehicle) =>
            dock.vehicleTypes.includes(
              vehicle.type,
            ),
        );
      })
      .filter(
        (dock) =>
          shipping.dockId ===
            undefined ||
          dock.id === shipping.dockId,
      );
  }

  private evaluateOption(input: {
    shipping: Shipping;
    carrier: ShippingCarrier;
    serviceLevel: ShippingServiceLevel;
    vehicle?: ShippingVehicle;
    dock?: ShippingDock;
    requirement:
      ShippingRequirementSummary;
    compatibilityReasons:
      readonly string[];
    compatibilityWarnings:
      readonly string[];
    estimatedCost?: number;
    currency?: string;
    plannedDispatchAt?: string;
    preferredCarrierId?: string;
    preferredServiceLevelId?: string;
    preferredVehicleId?: string;
    preferredDockId?: string;
    minimumCost?: number;
    maximumCost?: number;
  }): ShippingOptionEvaluation | null {
    const reasons = [
      ...input.compatibilityReasons,
    ];

    const warnings = [
      ...input.compatibilityWarnings,
    ];

    if (
      input.vehicle === undefined &&
      (
        input.shipping.strategy ===
          "full_truckload" ||
        input.shipping.vehicleId !==
          undefined
      )
    ) {
      return null;
    }

    if (
      input.dock === undefined &&
      (
        input.shipping.status ===
          "released" ||
        input.shipping.dockId !==
          undefined
      )
    ) {
      return null;
    }

    const costScore =
      this.calculateCostScore(
        input.estimatedCost,
        input.minimumCost,
        input.maximumCost,
      );

    let serviceLevelScore =
      this.calculateServiceLevelScore(
        input.serviceLevel,
        input.shipping,
      );

    const capacityScore =
      this.calculateCapacityScore(
        input.vehicle,
        input.serviceLevel,
        input.requirement,
      );

    let compatibilityScore = 85;

    if (
      input.requirement
        .temperatureControlled
    ) {
      compatibilityScore += 5;
      reasons.push(
        "Sıcaklık kontrollü sevkiyat koşulları karşılanıyor.",
      );
    }

    if (
      input.requirement
        .hazardousMaterial
    ) {
      compatibilityScore += 5;
      reasons.push(
        "Tehlikeli madde sevkiyat koşulları karşılanıyor.",
      );
    }

    if (
      input.requirement.international
    ) {
      compatibilityScore += 5;
      reasons.push(
        "Uluslararası taşıma koşulları karşılanıyor.",
      );
    }

    let availabilityScore = 70;

    if (input.vehicle !== undefined) {
      availabilityScore += 15;
      reasons.push(
        "Uygun araç seçeneği bulundu.",
      );
    } else {
      warnings.push(
        "Araç seçimi daha sonra yapılmalıdır.",
      );
    }

    if (input.dock !== undefined) {
      availabilityScore += 15;
      reasons.push(
        "Uygun yükleme rampası bulundu.",
      );
    } else {
      warnings.push(
        "Rampa seçimi daha sonra yapılmalıdır.",
      );
    }

    if (
      input.preferredCarrierId ===
      input.carrier.id
    ) {
      compatibilityScore += 5;
      reasons.push(
        "Tercih edilen taşıyıcıyla eşleşiyor.",
      );
    }

    if (
      input.preferredServiceLevelId ===
      input.serviceLevel.id
    ) {
      serviceLevelScore += 5;
      reasons.push(
        "Tercih edilen servis seviyesiyle eşleşiyor.",
      );
    }

    if (
      input.vehicle !== undefined &&
      input.preferredVehicleId ===
        input.vehicle.id
    ) {
      availabilityScore += 5;
      reasons.push(
        "Tercih edilen araçla eşleşiyor.",
      );
    }

    if (
      input.dock !== undefined &&
      input.preferredDockId ===
        input.dock.id
    ) {
      availabilityScore += 5;
      reasons.push(
        "Tercih edilen rampayla eşleşiyor.",
      );
    }

    const score:
      ShippingSuggestionScore = {
        costScore:
          clampScore(costScore),
        serviceLevelScore:
          clampScore(
            serviceLevelScore,
          ),
        capacityScore:
          clampScore(capacityScore),
        compatibilityScore:
          clampScore(
            compatibilityScore,
          ),
        availabilityScore:
          clampScore(
            availabilityScore,
          ),
        totalScore: 0,
      };

    const totalScore = clampScore(
      score.costScore * 0.2 +
      score.serviceLevelScore * 0.25 +
      score.capacityScore * 0.2 +
      score.compatibilityScore * 0.2 +
      score.availabilityScore * 0.15,
    );

    const estimatedDeliveryAt =
      this.calculateEstimatedDeliveryAt(
        input.serviceLevel,
        input.plannedDispatchAt ??
          input.shipping.plannedAt,
      );

    return {
      carrier: input.carrier,
      serviceLevel:
        input.serviceLevel,
      score: {
        ...score,
        totalScore,
      },
      reasons,
      warnings,
      ...(input.vehicle !== undefined
        ? { vehicle: input.vehicle }
        : {}),
      ...(input.dock !== undefined
        ? { dock: input.dock }
        : {}),
      ...(input.estimatedCost !==
      undefined
        ? {
            estimatedCost:
              input.estimatedCost,
          }
        : {}),
      ...(input.currency !== undefined
        ? {
            currency:
              input.currency,
          }
        : {}),
      ...(estimatedDeliveryAt !==
      undefined
        ? {
            estimatedDeliveryAt,
          }
        : {}),
    };
  }

  private calculateCostScore(
    cost: number | undefined,
    minimumCost: number | undefined,
    maximumCost: number | undefined,
  ): number {
    if (
      cost === undefined ||
      minimumCost === undefined ||
      maximumCost === undefined
    ) {
      return 60;
    }

    if (maximumCost === minimumCost) {
      return 100;
    }

    const ratio =
      (
        cost - minimumCost
      ) /
      (
        maximumCost - minimumCost
      );

    return 100 - ratio * 70;
  }

  private calculateServiceLevelScore(
    serviceLevel:
      ShippingServiceLevel,
    shipping: Shipping,
  ): number {
    let score = 60;

    const maximumDeliveryHours =
      serviceLevel
        .maximumDeliveryHours;

    if (
      maximumDeliveryHours !==
      undefined
    ) {
      if (
        maximumDeliveryHours <= 8
      ) {
        score = 100;
      } else if (
        maximumDeliveryHours <= 24
      ) {
        score = 90;
      } else if (
        maximumDeliveryHours <= 48
      ) {
        score = 80;
      } else if (
        maximumDeliveryHours <= 72
      ) {
        score = 70;
      } else {
        score = 60;
      }
    }

    if (
      shipping.expectedDeliveryAt !==
        undefined &&
      shipping.plannedAt !==
        undefined &&
      maximumDeliveryHours !==
        undefined
    ) {
      const availableHours =
        (
          Date.parse(
            shipping.expectedDeliveryAt,
          ) -
          Date.parse(
            shipping.plannedAt,
          )
        ) /
        3_600_000;

      if (
        maximumDeliveryHours >
        availableHours
      ) {
        score -= 40;
      }
    }

    if (
      serviceLevel.trackingSupported
    ) {
      score += 5;
    }

    if (
      serviceLevel
        .proofOfDeliveryRequired
    ) {
      score += 5;
    }

    return score;
  }

  private calculateCapacityScore(
    vehicle:
      ShippingVehicle | undefined,
    serviceLevel:
      ShippingServiceLevel,
    requirement:
      ShippingRequirementSummary,
  ): number {
    let score = 70;

    if (
      serviceLevel.maximumWeight !==
        undefined &&
      serviceLevel.weightUnit !==
        undefined &&
      requirement.totalWeightKg > 0
    ) {
      const capacityKg =
        convertWeightToKg(
          serviceLevel.maximumWeight,
          serviceLevel.weightUnit,
        );

      score += this.calculateUtilizationScore(
        requirement.totalWeightKg,
        capacityKg,
      ) * 0.4;
    }

    if (
      serviceLevel.maximumVolume !==
        undefined &&
      serviceLevel.volumeUnit !==
        undefined &&
      requirement.totalVolumeCm3 > 0
    ) {
      const capacityCm3 =
        convertVolumeToCm3(
          serviceLevel.maximumVolume,
          serviceLevel.volumeUnit,
        );

      score += this.calculateUtilizationScore(
        requirement.totalVolumeCm3,
        capacityCm3,
      ) * 0.3;
    }

    if (vehicle !== undefined) {
      let vehicleScore = 0;
      let checks = 0;

      if (
        vehicle.maximumWeight !==
          undefined &&
        requirement.totalWeightKg > 0
      ) {
        vehicleScore +=
          this.calculateUtilizationScore(
            requirement.totalWeightKg,
            convertWeightToKg(
              vehicle.maximumWeight,
              vehicle.weightUnit,
            ),
          );

        checks += 1;
      }

      if (
        vehicle.maximumVolume !==
          undefined &&
        requirement.totalVolumeCm3 > 0
      ) {
        vehicleScore +=
          this.calculateUtilizationScore(
            requirement.totalVolumeCm3,
            convertVolumeToCm3(
              vehicle.maximumVolume,
              vehicle.volumeUnit,
            ),
          );

        checks += 1;
      }

      if (
        vehicle.packageCapacity !==
          undefined &&
        requirement.packageCount > 0
      ) {
        vehicleScore +=
          this.calculateUtilizationScore(
            requirement.packageCount,
            vehicle.packageCapacity,
          );

        checks += 1;
      }

      if (checks > 0) {
        score =
          vehicleScore / checks;
      } else {
        score = 80;
      }
    }

    return score;
  }

  private calculateUtilizationScore(
    used: number,
    capacity: number,
  ): number {
    if (
      capacity <= 0 ||
      used > capacity
    ) {
      return 0;
    }

    const utilization =
      used / capacity;

    if (
      utilization >= 0.7 &&
      utilization <= 0.95
    ) {
      return 100;
    }

    if (
      utilization >= 0.5
    ) {
      return 85;
    }

    if (
      utilization >= 0.3
    ) {
      return 70;
    }

    return 55;
  }

  private calculateEstimatedDeliveryAt(
    serviceLevel:
      ShippingServiceLevel,
    plannedDispatchAt?: string,
  ): string | undefined {
    if (
      plannedDispatchAt === undefined ||
      serviceLevel
        .maximumDeliveryHours ===
        undefined
    ) {
      return undefined;
    }

    const timestamp =
      Date.parse(plannedDispatchAt);

    if (Number.isNaN(timestamp)) {
      return undefined;
    }

    return new Date(
      timestamp +
      serviceLevel
        .maximumDeliveryHours *
        3_600_000,
    ).toISOString();
  }

  private findMinimumCost(
    estimates:
      readonly ShippingCostEstimate[],
  ): number | undefined {
    const values = estimates
      .map((estimate) =>
        estimate.amount,
      )
      .filter(
        (value) =>
          Number.isFinite(value) &&
          value >= 0,
      );

    return values.length > 0
      ? Math.min(...values)
      : undefined;
  }

  private findMaximumCost(
    estimates:
      readonly ShippingCostEstimate[],
  ): number | undefined {
    const values = estimates
      .map((estimate) =>
        estimate.amount,
      )
      .filter(
        (value) =>
          Number.isFinite(value) &&
          value >= 0,
      );

    return values.length > 0
      ? Math.max(...values)
      : undefined;
  }
}
