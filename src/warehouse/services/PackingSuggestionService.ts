import type {
  Packing,
} from "../types/Packing";
import type {
  PackingContainer,
} from "../types/PackingContainer";
import type {
  PackingItem,
} from "../types/PackingItem";
import type {
  PackingStrategy,
} from "../types/PackingStrategy";
import type {
  PackingSuggestion,
  PackingSuggestionScore,
} from "../types/PackingSuggestion";
import {
  InventoryValidationError,
} from "../types/InventoryErrors";
import type {
  PackingRepository,
} from "./PackingRepository";

export interface GeneratePackingSuggestionsInput {
  tenantId: string;
  packingId: string;
  packingItemIds?: readonly string[];
  containers?: readonly PackingContainer[];
}

export interface PackingSuggestionServiceDependencies {
  repository: PackingRepository;
  createId?: () => string;
  now?: () => string;
}

interface PackingRequirement {
  readonly items: readonly PackingItem[];
  readonly totalWeight?: number;
  readonly totalVolume?: number;
  readonly weightUnit?: "g" | "kg";
  readonly volumeUnit?: "cm3" | "m3";
  readonly temperatureControlled: boolean;
  readonly hazardousMaterial: boolean;
  readonly mixedSku: boolean;
}

interface EvaluatedContainer {
  readonly container: PackingContainer;
  readonly score: PackingSuggestionScore;
  readonly estimatedWeight: number;
  readonly estimatedVolume: number;
  readonly suggestedPackageCount: number;
  readonly reasons: readonly string[];
  readonly warnings: readonly string[];
}

function normalizeScore(
  value: number,
): number {
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(value),
    ),
  );
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

function calculateContainerVolumeCm3(
  container: PackingContainer,
): number | undefined {
  const dimensions =
    container.dimensions;

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

function calculateUtilizationScore(
  requiredValue: number,
  availableValue?: number,
): number {
  if (
    availableValue === undefined ||
    availableValue <= 0
  ) {
    return 50;
  }

  const ratio =
    requiredValue / availableValue;

  if (ratio > 1) {
    return 0;
  }

  if (ratio >= 0.85) {
    return 100;
  }

  if (ratio >= 0.7) {
    return 90;
  }

  if (ratio >= 0.5) {
    return 75;
  }

  if (ratio >= 0.25) {
    return 60;
  }

  return 40;
}

function resolveStrategyScore(
  strategy: PackingStrategy,
  container: PackingContainer,
  requirement: PackingRequirement,
): number {
  switch (strategy) {
    case "palletization":
      return container.type === "pallet"
        ? 100
        : 20;

    case "temperature_controlled":
      return container.temperatureControlled
        ? 100
        : 0;

    case "hazardous_material":
      return container.hazardousMaterialAllowed
        ? 100
        : 0;

    case "single_package":
      return 90;

    case "multi_package":
      return 80;

    case "single_sku":
      return requirement.mixedSku
        ? 20
        : 100;

    case "mixed_sku":
      return requirement.mixedSku
        ? 100
        : 75;

    case "weight_based":
      return container.maximumWeight !== undefined
        ? 100
        : 50;

    case "volume_based":
    case "cartonization":
      return (
        container.maximumVolume !== undefined ||
        container.dimensions !== undefined
      )
        ? 100
        : 50;

    case "carrier_optimized":
      return 75;
  }
}

export class PackingSuggestionService {
  private readonly repository:
    PackingRepository;

  private readonly createId:
    () => string;

  private readonly now:
    () => string;

  constructor(
    dependencies:
      PackingSuggestionServiceDependencies,
  ) {
    this.repository =
      dependencies.repository;

    this.createId =
      dependencies.createId ??
      (() => crypto.randomUUID());

    this.now =
      dependencies.now ??
      (() =>
        new Date().toISOString());
  }

  async generate(
    input: GeneratePackingSuggestionsInput,
  ): Promise<PackingSuggestion[]> {
    const tenantId =
      input.tenantId.trim();

    const packingId =
      input.packingId.trim();

    if (!tenantId) {
      throw new InventoryValidationError(
        "Firma kimliği boş bırakılamaz.",
      );
    }

    if (!packingId) {
      throw new InventoryValidationError(
        "Paketleme kimliği boş bırakılamaz.",
      );
    }

    const packing =
      await this.repository.findById(
        tenantId,
        packingId,
      );

    if (!packing) {
      throw new InventoryValidationError(
        `Paketleme kaydı bulunamadı: ${packingId}`,
      );
    }

    if (
      packing.status === "packed" ||
      packing.status ===
        "shipping_ready" ||
      packing.status === "cancelled"
    ) {
      throw new InventoryValidationError(
        "Tamamlanmış veya iptal edilmiş paketleme için ambalaj önerisi oluşturulamaz.",
      );
    }

    const items =
      this.resolveItems(
        packing,
        input.packingItemIds,
      );

    const containers =
      input.containers ??
      await this.repository
        .listContainers(
          tenantId,
          true,
        );

    if (containers.length === 0) {
      throw new InventoryValidationError(
        "Ambalaj önerisi için en az bir aktif ambalaj tanımı gereklidir.",
      );
    }

    const requirement =
      this.buildRequirement(items);

    const evaluated = containers
      .filter(
        (container) =>
          container.tenantId ===
            tenantId &&
          container.active,
      )
      .map(
        (container) =>
          this.evaluateContainer(
            packing.strategy,
            container,
            requirement,
          ),
      )
      .filter(
        (
          result,
        ): result is EvaluatedContainer =>
          result !== null,
      )
      .sort(
        (left, right) =>
          right.score.totalScore -
          left.score.totalScore,
      );

    if (evaluated.length === 0) {
      throw new InventoryValidationError(
        "Paketleme koşullarına uygun ambalaj bulunamadı.",
      );
    }

    const suggestions =
      evaluated.map(
        (
          result,
          index,
        ): PackingSuggestion => ({
          id: this.createId(),
          tenantId,
          packingId,
          packingItemIds:
            items.map(
              (item) => item.id,
            ),
          containerId:
            result.container.id,
          strategy:
            packing.strategy,
          container:
            result.container,
          suggestedPackageCount:
            result.suggestedPackageCount,
          estimatedWeight:
            result.estimatedWeight,
          estimatedVolume:
            result.estimatedVolume,
          score: result.score,
          reasons: result.reasons,
          warnings: result.warnings,
          selected: index === 0,
          createdAt: this.now(),
        }),
      );

    const saved:
      PackingSuggestion[] = [];

    for (
      const suggestion
      of suggestions
    ) {
      saved.push(
        await this.repository
          .saveSuggestion(
            suggestion,
          ),
      );
    }

    return saved;
  }

  private resolveItems(
    packing: Packing,
    packingItemIds?:
      readonly string[],
  ): PackingItem[] {
    if (
      packingItemIds === undefined
    ) {
      const remainingItems =
        packing.items.filter(
          (item) =>
            item.remainingQuantity > 0,
        );

      if (
        remainingItems.length === 0
      ) {
        throw new InventoryValidationError(
          "Ambalaj önerisi oluşturulacak paketleme satırı bulunamadı.",
        );
      }

      return remainingItems;
    }

    const normalizedIds = [
      ...new Set(
        packingItemIds
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    ];

    if (
      normalizedIds.length === 0
    ) {
      throw new InventoryValidationError(
        "En az bir paketleme satırı seçilmelidir.",
      );
    }

    const items =
      normalizedIds.map(
        (id) => {
          const item =
            packing.items.find(
              (current) =>
                current.id === id,
            );

          if (!item) {
            throw new InventoryValidationError(
              `Paketleme satırı bulunamadı: ${id}`,
            );
          }

          if (
            item.remainingQuantity <= 0
          ) {
            throw new InventoryValidationError(
              `Tamamlanmış paketleme satırı için öneri oluşturulamaz: ${id}`,
            );
          }

          return item;
        },
      );

    return items;
  }

  private buildRequirement(
    items: readonly PackingItem[],
  ): PackingRequirement {
    let totalWeight:
      number | undefined = 0;

    let totalVolume:
      number | undefined = 0;

    for (const item of items) {
      if (
        item.unitWeight === undefined ||
        item.weightUnit === undefined
      ) {
        totalWeight = undefined;
      } else if (
        totalWeight !== undefined
      ) {
        totalWeight +=
          convertWeightToKg(
            item.unitWeight,
            item.weightUnit,
          ) *
          item.remainingQuantity;
      }

      if (
        item.unitVolume === undefined ||
        item.volumeUnit === undefined
      ) {
        totalVolume = undefined;
      } else if (
        totalVolume !== undefined
      ) {
        totalVolume +=
          convertVolumeToCm3(
            item.unitVolume,
            item.volumeUnit,
          ) *
          item.remainingQuantity;
      }
    }

    const productKeys =
      new Set(
        items.map(
          (item) =>
            `${item.productId}:${item.skuId ?? ""}`,
        ),
      );

    return {
      items,
      ...(totalWeight !== undefined
        ? {
            totalWeight,
            weightUnit: "kg",
          }
        : {}),
      ...(totalVolume !== undefined
        ? {
            totalVolume,
            volumeUnit: "cm3",
          }
        : {}),
      temperatureControlled:
        items.some(
          (item) =>
            item.temperatureControlled,
        ),
      hazardousMaterial:
        items.some(
          (item) =>
            item.hazardousMaterial,
        ),
      mixedSku:
        productKeys.size > 1,
    };
  }

  private evaluateContainer(
    strategy: PackingStrategy,
    container: PackingContainer,
    requirement: PackingRequirement,
  ): EvaluatedContainer | null {
    if (
      requirement
        .temperatureControlled &&
      !container
        .temperatureControlled
    ) {
      return null;
    }

    if (
      requirement
        .hazardousMaterial &&
      !container
        .hazardousMaterialAllowed
    ) {
      return null;
    }

    const reasons: string[] = [];
    const warnings: string[] = [];

    const containerMaximumWeight =
      container.maximumWeight !==
        undefined &&
      container.weightUnit !==
        undefined
        ? convertWeightToKg(
            container.maximumWeight,
            container.weightUnit,
          )
        : undefined;

    const containerMaximumVolume =
      container.maximumVolume !==
        undefined &&
      container.volumeUnit !==
        undefined
        ? convertVolumeToCm3(
            container.maximumVolume,
            container.volumeUnit,
          )
        : calculateContainerVolumeCm3(
            container,
          );

    const totalWeight =
      requirement.totalWeight ?? 0;

    const totalVolume =
      requirement.totalVolume ?? 0;

    const weightPackageCount =
      requirement.totalWeight !==
          undefined &&
      containerMaximumWeight !==
          undefined
        ? Math.ceil(
            requirement.totalWeight /
              containerMaximumWeight,
          )
        : 1;

    const volumePackageCount =
      requirement.totalVolume !==
          undefined &&
      containerMaximumVolume !==
          undefined
        ? Math.ceil(
            requirement.totalVolume /
              containerMaximumVolume,
          )
        : 1;

    const suggestedPackageCount =
      Math.max(
        1,
        weightPackageCount,
        volumePackageCount,
      );

    const perPackageWeight =
      totalWeight /
      suggestedPackageCount;

    const perPackageVolume =
      totalVolume /
      suggestedPackageCount;

    if (
      containerMaximumWeight !==
        undefined &&
      perPackageWeight >
        containerMaximumWeight
    ) {
      return null;
    }

    if (
      containerMaximumVolume !==
        undefined &&
      perPackageVolume >
        containerMaximumVolume
    ) {
      return null;
    }

    const weightScore =
      requirement.totalWeight !==
        undefined
        ? calculateUtilizationScore(
            perPackageWeight,
            containerMaximumWeight,
          )
        : 50;

    const volumeScore =
      requirement.totalVolume !==
        undefined
        ? calculateUtilizationScore(
            perPackageVolume,
            containerMaximumVolume,
          )
        : 50;

    let compatibilityScore = 70;

    if (
      requirement
        .temperatureControlled &&
      container
        .temperatureControlled
    ) {
      compatibilityScore += 15;
      reasons.push(
        "Ambalaj sıcaklık kontrollü ürünlerle uyumludur.",
      );
    }

    if (
      requirement
        .hazardousMaterial &&
      container
        .hazardousMaterialAllowed
    ) {
      compatibilityScore += 15;
      reasons.push(
        "Ambalaj tehlikeli madde taşımasına uygundur.",
      );
    }

    if (
      container.type === "carton" ||
      container.type === "box"
    ) {
      compatibilityScore += 5;
      reasons.push(
        "Ambalaj standart koli paketleme operasyonuna uygundur.",
      );
    }

    compatibilityScore =
      normalizeScore(
        compatibilityScore,
      );

    const utilizationScore =
      normalizeScore(
        (weightScore +
          volumeScore) /
          2,
      );

    const strategyScore =
      normalizeScore(
        resolveStrategyScore(
          strategy,
          container,
          requirement,
        ),
      );

    const totalScore =
      normalizeScore(
        weightScore * 0.2 +
        volumeScore * 0.25 +
        compatibilityScore * 0.25 +
        utilizationScore * 0.2 +
        strategyScore * 0.1,
      );

    if (
      requirement.totalWeight ===
        undefined
    ) {
      warnings.push(
        "Ürün ağırlık bilgisi eksik olduğu için varsayılan ağırlık puanı kullanıldı.",
      );
    }

    if (
      requirement.totalVolume ===
        undefined
    ) {
      warnings.push(
        "Ürün hacim bilgisi eksik olduğu için varsayılan hacim puanı kullanıldı.",
      );
    }

    if (
      suggestedPackageCount > 1
    ) {
      reasons.push(
        `Talep ${suggestedPackageCount} paket kullanılarak karşılanabilir.`,
      );
    }

    return {
      container,
      score: {
        weightScore,
        volumeScore,
        compatibilityScore,
        utilizationScore,
        strategyScore,
        totalScore,
      },
      estimatedWeight:
        totalWeight,
      estimatedVolume:
        totalVolume,
      suggestedPackageCount,
      reasons,
      warnings,
    };
  }
}
