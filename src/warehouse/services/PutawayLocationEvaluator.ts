import type { PutawayStrategy } from "../types/PutawayStrategy";
import type {
  PutawaySuggestionScore,
} from "../types/PutawaySuggestion";
import { InventoryValidationError } from "../types/InventoryErrors";

export interface PutawayLocationCandidate {
  readonly locationId: string;
  readonly warehouseId: string;
  readonly active: boolean;
  readonly blocked?: boolean;
  readonly availableCapacity?: number;
  readonly distance?: number;
  readonly minimumTemperature?: number;
  readonly maximumTemperature?: number;
  readonly hazardousMaterialAllowed?: boolean;
  readonly fixedProductId?: string;
  readonly fixedSkuId?: string;
  readonly zoneId?: string;
  readonly abcClass?: "A" | "B" | "C";
}

export interface PutawayLocationEvaluationInput {
  readonly warehouseId: string;
  readonly sourceLocationId: string;
  readonly productId: string;
  readonly skuId?: string;
  readonly requestedQuantity: number;
  readonly strategy: PutawayStrategy;
  readonly productTemperature?: number;
  readonly hazardousMaterial?: boolean;
  readonly preferredZoneId?: string;
  readonly abcClass?: "A" | "B" | "C";
  readonly candidate: PutawayLocationCandidate;
}

export interface PutawayLocationEvaluationResult {
  readonly eligible: boolean;
  readonly score: PutawaySuggestionScore;
  readonly reasons: readonly string[];
  readonly warnings: readonly string[];
}

function normalizeScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function calculateCapacityScore(
  requestedQuantity: number,
  availableCapacity?: number,
): number {
  if (availableCapacity === undefined) {
    return 50;
  }

  if (availableCapacity < requestedQuantity) {
    return 0;
  }

  const ratio = requestedQuantity / availableCapacity;

  if (ratio >= 0.75) {
    return 100;
  }

  if (ratio >= 0.5) {
    return 85;
  }

  if (ratio >= 0.25) {
    return 70;
  }

  return 55;
}

function calculateDistanceScore(
  distance?: number,
): number {
  if (distance === undefined) {
    return 50;
  }

  if (!Number.isFinite(distance) || distance < 0) {
    throw new InventoryValidationError(
      "Lokasyon mesafesi negatif olamaz.",
    );
  }

  return normalizeScore(100 - distance);
}

export function evaluatePutawayLocation(
  input: PutawayLocationEvaluationInput,
): PutawayLocationEvaluationResult {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const candidate = input.candidate;

  if (!candidate.active) {
    return {
      eligible: false,
      score: {
        capacityScore: 0,
        distanceScore: 0,
        compatibilityScore: 0,
        strategyScore: 0,
        totalScore: 0,
      },
      reasons: [],
      warnings: ["Lokasyon aktif değildir."],
    };
  }

  if (candidate.blocked === true) {
    return {
      eligible: false,
      score: {
        capacityScore: 0,
        distanceScore: 0,
        compatibilityScore: 0,
        strategyScore: 0,
        totalScore: 0,
      },
      reasons: [],
      warnings: ["Lokasyon bloke durumdadır."],
    };
  }

  if (candidate.warehouseId !== input.warehouseId) {
    return {
      eligible: false,
      score: {
        capacityScore: 0,
        distanceScore: 0,
        compatibilityScore: 0,
        strategyScore: 0,
        totalScore: 0,
      },
      reasons: [],
      warnings: ["Lokasyon farklı bir depoya aittir."],
    };
  }

  if (
    candidate.availableCapacity !== undefined &&
    candidate.availableCapacity < input.requestedQuantity
  ) {
    return {
      eligible: false,
      score: {
        capacityScore: 0,
        distanceScore: 0,
        compatibilityScore: 0,
        strategyScore: 0,
        totalScore: 0,
      },
      reasons: [],
      warnings: ["Lokasyon kapasitesi yetersizdir."],
    };
  }

  if (
    input.hazardousMaterial === true &&
    candidate.hazardousMaterialAllowed !== true
  ) {
    return {
      eligible: false,
      score: {
        capacityScore: 0,
        distanceScore: 0,
        compatibilityScore: 0,
        strategyScore: 0,
        totalScore: 0,
      },
      reasons: [],
      warnings: [
        "Lokasyon tehlikeli madde yerleştirmesine uygun değildir.",
      ],
    };
  }

  if (
    input.productTemperature !== undefined &&
    candidate.minimumTemperature !== undefined &&
    input.productTemperature <
      candidate.minimumTemperature
  ) {
    return {
      eligible: false,
      score: {
        capacityScore: 0,
        distanceScore: 0,
        compatibilityScore: 0,
        strategyScore: 0,
        totalScore: 0,
      },
      reasons: [],
      warnings: ["Ürün sıcaklığı lokasyon aralığının altındadır."],
    };
  }

  if (
    input.productTemperature !== undefined &&
    candidate.maximumTemperature !== undefined &&
    input.productTemperature >
      candidate.maximumTemperature
  ) {
    return {
      eligible: false,
      score: {
        capacityScore: 0,
        distanceScore: 0,
        compatibilityScore: 0,
        strategyScore: 0,
        totalScore: 0,
      },
      reasons: [],
      warnings: ["Ürün sıcaklığı lokasyon aralığının üzerindedir."],
    };
  }

  let compatibilityScore = 70;
  let strategyScore = 50;

  if (
    candidate.fixedProductId !== undefined &&
    candidate.fixedProductId === input.productId
  ) {
    compatibilityScore += 20;
    reasons.push("Lokasyon ürün için sabit olarak tanımlıdır.");
  }

  if (
    candidate.fixedSkuId !== undefined &&
    candidate.fixedSkuId === input.skuId
  ) {
    compatibilityScore += 10;
    reasons.push("Lokasyon SKU ile uyumludur.");
  }

  if (
    input.preferredZoneId !== undefined &&
    candidate.zoneId === input.preferredZoneId
  ) {
    compatibilityScore += 10;
    reasons.push("Lokasyon tercih edilen bölgededir.");
  }

  if (
    input.abcClass !== undefined &&
    candidate.abcClass === input.abcClass
  ) {
    compatibilityScore += 10;
    reasons.push("Lokasyon ABC sınıfıyla uyumludur.");
  }

  switch (input.strategy) {
    case "fixed_location":
      strategyScore =
        candidate.fixedProductId === input.productId ||
        candidate.fixedSkuId === input.skuId
          ? 100
          : 20;
      break;

    case "nearest_location":
      strategyScore = calculateDistanceScore(
        candidate.distance,
      );
      break;

    case "capacity_based":
      strategyScore = calculateCapacityScore(
        input.requestedQuantity,
        candidate.availableCapacity,
      );
      break;

    case "zone_based":
      strategyScore =
        input.preferredZoneId !== undefined &&
        candidate.zoneId === input.preferredZoneId
          ? 100
          : 40;
      break;

    case "temperature_based":
      strategyScore =
        input.productTemperature !== undefined
          ? 100
          : 60;
      break;

    case "hazardous_material_based":
      strategyScore =
        input.hazardousMaterial === true &&
        candidate.hazardousMaterialAllowed === true
          ? 100
          : 60;
      break;

    case "abc_class_based":
      strategyScore =
        input.abcClass !== undefined &&
        candidate.abcClass === input.abcClass
          ? 100
          : 40;
      break;

    case "dynamic_location":
    case "fifo":
    case "fefo":
      strategyScore = 75;
      break;
  }

  const capacityScore = calculateCapacityScore(
    input.requestedQuantity,
    candidate.availableCapacity,
  );

  const distanceScore = calculateDistanceScore(
    candidate.distance,
  );

  compatibilityScore = normalizeScore(
    compatibilityScore,
  );

  strategyScore = normalizeScore(strategyScore);

  const totalScore = normalizeScore(
    capacityScore * 0.3 +
      distanceScore * 0.2 +
      compatibilityScore * 0.3 +
      strategyScore * 0.2,
  );

  if (candidate.availableCapacity === undefined) {
    warnings.push(
      "Lokasyon kapasite bilgisi bulunmadığı için varsayılan puan kullanıldı.",
    );
  }

  if (candidate.distance === undefined) {
    warnings.push(
      "Lokasyon mesafe bilgisi bulunmadığı için varsayılan puan kullanıldı.",
    );
  }

  return {
    eligible: true,
    score: {
      capacityScore,
      distanceScore,
      compatibilityScore,
      strategyScore,
      totalScore,
    },
    reasons,
    warnings,
  };
}

export class PutawayLocationEvaluator {
  static evaluate = evaluatePutawayLocation;
}
