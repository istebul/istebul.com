import type {
  InventoryTracking,
} from "../types/InventoryMovement";
import type {
  Replenishment,
} from "../types/Replenishment";
import type {
  ReplenishmentItem,
} from "../types/ReplenishmentItem";
import type {
  ReplenishmentSuggestion,
} from "../types/ReplenishmentSuggestion";
import {
  InventoryValidationError,
} from "../types/InventoryErrors";
import type {
  ReplenishmentRepository,
} from "./ReplenishmentRepository";

export interface ReplenishmentSourceCandidate {
  readonly tenantId: string;
  readonly warehouseId: string;
  readonly locationId: string;
  readonly productId: string;
  readonly skuId?: string;
  readonly inventoryBalanceId?: string;
  readonly stockStatus: string;
  readonly unit: string;
  readonly availableQuantity: number;
  readonly reservedQuantity?: number;
  readonly minimumRemainingQuantity?: number;
  readonly distance?: number;
  readonly stockAgeDays?: number;
  readonly locationCapacityAvailable?: number;
  readonly active: boolean;
  readonly blocked?: boolean;
  readonly replenishmentEnabled?: boolean;
  readonly tracking?: InventoryTracking;
}

export interface ReplenishmentDestinationContext {
  readonly locationId: string;
  readonly currentQuantity: number;
  readonly maximumQuantity?: number;
  readonly availableCapacity?: number;
}

export interface GenerateReplenishmentSuggestionsInput {
  readonly tenantId: string;
  readonly replenishmentId: string;
  readonly replenishmentItemId: string;
  readonly candidates:
    readonly ReplenishmentSourceCandidate[];
  readonly destination:
    ReplenishmentDestinationContext;
  readonly maximumSuggestions?: number;
}

export interface ReplenishmentSuggestionEvaluation {
  readonly candidate:
    ReplenishmentSourceCandidate;
  readonly eligible: boolean;
  readonly suggestedQuantity: number;
  readonly score: number;
  readonly capacityScore: number;
  readonly distanceScore: number;
  readonly stockAgeScore: number;
  readonly compatibilityScore: number;
  readonly reasons: readonly string[];
  readonly warnings: readonly string[];
}

export interface ReplenishmentSuggestionServiceDependencies {
  readonly repository:
    ReplenishmentRepository;
  readonly createId?: () => string;
  readonly now?: () => string;
}

let internalSequence = 0;

export class ReplenishmentSuggestionService {
  private readonly repository:
    ReplenishmentRepository;

  private readonly createId: () => string;

  private readonly now: () => string;

  constructor(
    dependencies:
      ReplenishmentSuggestionServiceDependencies,
  ) {
    this.repository =
      dependencies.repository;

    this.createId =
      dependencies.createId ??
      (() =>
        `replenishment-suggestion-${String(
          ++internalSequence,
        ).padStart(6, "0")}`);

    this.now =
      dependencies.now ??
      (() => new Date().toISOString());
  }

  async generate(
    input:
      GenerateReplenishmentSuggestionsInput,
  ): Promise<ReplenishmentSuggestion[]> {
    const tenantId =
      this.requireText(
        input.tenantId,
        "Firma kimliği",
      );

    const replenishmentId =
      this.requireText(
        input.replenishmentId,
        "İkmal kimliği",
      );

    const replenishmentItemId =
      this.requireText(
        input.replenishmentItemId,
        "İkmal satırı kimliği",
      );

    const replenishment =
      await this.requireReplenishment(
        tenantId,
        replenishmentId,
      );

    const item =
      this.requireItem(
        replenishment,
        replenishmentItemId,
      );

    const destination =
      this.validateDestination(
        input.destination,
        item,
      );

    const maximumSuggestions =
      input.maximumSuggestions ?? 10;

    if (
      !Number.isInteger(
        maximumSuggestions,
      ) ||
      maximumSuggestions <= 0
    ) {
      throw new InventoryValidationError(
        "Maksimum öneri sayısı sıfırdan büyük tam sayı olmalıdır.",
      );
    }

    const evaluations =
      input.candidates
        .map((candidate) =>
          this.evaluateCandidate({
            candidate,
            replenishment,
            item,
            destination,
          }),
        )
        .filter(
          (evaluation) =>
            evaluation.eligible,
        )
        .sort(
          (left, right) =>
            right.score -
              left.score ||
            right.suggestedQuantity -
              left.suggestedQuantity ||
            left.candidate.locationId
              .localeCompare(
                right.candidate
                  .locationId,
                "tr",
                { numeric: true },
              ),
        )
        .slice(0, maximumSuggestions);

    if (evaluations.length === 0) {
      throw new InventoryValidationError(
        "İkmal koşullarını karşılayan uygun kaynak lokasyon bulunamadı.",
      );
    }

    const suggestions:
      ReplenishmentSuggestion[] = [];

    for (
      const evaluation
      of evaluations
    ) {
      const suggestion:
        ReplenishmentSuggestion = {
        id: this.createId(),
        tenantId,
        replenishmentId,
        replenishmentItemId,
        sourceLocationId:
          evaluation.candidate
            .locationId,
        destinationLocationId:
          item.destinationLocationId,
        productId: item.productId,
        stockStatus:
          item.stockStatus,
        unit: item.unit,
        suggestedQuantity:
          evaluation.suggestedQuantity,
        availableQuantity:
          evaluation.candidate
            .availableQuantity,
        sourceRemainingQuantity:
          this.round(
            evaluation.candidate
              .availableQuantity -
              evaluation
                .suggestedQuantity,
          ),
        sourceDistance:
          evaluation.candidate
            .distance ?? 0,
        capacityScore:
          evaluation.capacityScore,
        distanceScore:
          evaluation.distanceScore,
        stockAgeScore:
          evaluation.stockAgeScore,
        compatibilityScore:
          evaluation
            .compatibilityScore,
        totalScore:
          evaluation.score,
        reasons:
          evaluation.reasons,
        warnings:
          evaluation.warnings,
        createdAt: this.now(),
        ...(item.skuId !== undefined
          ? { skuId: item.skuId }
          : {}),
        ...(evaluation.candidate
          .inventoryBalanceId !==
        undefined
          ? {
              inventoryBalanceId:
                evaluation.candidate
                  .inventoryBalanceId,
            }
          : {}),
        ...(evaluation.candidate
          .tracking !== undefined
          ? {
              tracking:
                structuredClone(
                  evaluation.candidate
                    .tracking,
                ),
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

  evaluateCandidate(input: {
    candidate:
      ReplenishmentSourceCandidate;
    replenishment: Replenishment;
    item: ReplenishmentItem;
    destination:
      ReplenishmentDestinationContext;
  }): ReplenishmentSuggestionEvaluation {
    const {
      candidate,
      replenishment,
      item,
      destination,
    } = input;

    const reasons: string[] = [];
    const warnings: string[] = [];

    let eligible = true;

    if (
      candidate.tenantId !==
      replenishment.tenantId
    ) {
      eligible = false;
      warnings.push(
        "Kaynak stok farklı firmaya aittir.",
      );
    }

    if (
      candidate.warehouseId !==
      replenishment.warehouseId
    ) {
      eligible = false;
      warnings.push(
        "Kaynak stok farklı depoya aittir.",
      );
    }

    if (!candidate.active) {
      eligible = false;
      warnings.push(
        "Kaynak lokasyon aktif değildir.",
      );
    }

    if (candidate.blocked === true) {
      eligible = false;
      warnings.push(
        "Kaynak lokasyon bloke durumdadır.",
      );
    }

    if (
      candidate.replenishmentEnabled ===
      false
    ) {
      eligible = false;
      warnings.push(
        "Kaynak lokasyon ikmal işlemlerine kapalıdır.",
      );
    }

    if (
      candidate.locationId ===
      item.destinationLocationId
    ) {
      eligible = false;
      warnings.push(
        "Kaynak ve hedef lokasyon aynı olamaz.",
      );
    }

    if (
      candidate.productId !==
      item.productId
    ) {
      eligible = false;
      warnings.push(
        "Kaynak stok ürünü ikmal satırı ürünüyle uyuşmuyor.",
      );
    }

    if (
      candidate.skuId !==
      item.skuId
    ) {
      eligible = false;
      warnings.push(
        "Kaynak stok SKU bilgisi ikmal satırıyla uyuşmuyor.",
      );
    }

    if (
      candidate.stockStatus !==
      item.stockStatus
    ) {
      eligible = false;
      warnings.push(
        "Kaynak stok durumu ikmal satırıyla uyuşmuyor.",
      );
    }

    if (
      candidate.unit !== item.unit
    ) {
      eligible = false;
      warnings.push(
        "Kaynak stok ölçü birimi ikmal satırıyla uyuşmuyor.",
      );
    }

    if (
      !this.trackingMatches(
        candidate.tracking,
        item.tracking,
      )
    ) {
      eligible = false;
      warnings.push(
        "Kaynak stok takip bilgileri ikmal satırıyla uyuşmuyor.",
      );
    }

    const reservedQuantity =
      candidate.reservedQuantity ?? 0;

    const minimumRemainingQuantity =
      candidate
        .minimumRemainingQuantity ??
      0;

    const usableQuantity =
      Math.max(
        0,
        candidate.availableQuantity -
          reservedQuantity -
          minimumRemainingQuantity,
      );

    if (usableQuantity <= 0) {
      eligible = false;
      warnings.push(
        "Kaynak lokasyonda kullanılabilir stok bulunmamaktadır.",
      );
    }

    const destinationRemaining =
      this.calculateDestinationRemaining(
        item,
        destination,
      );

    if (destinationRemaining <= 0) {
      eligible = false;
      warnings.push(
        "Hedef lokasyon ikmal kapasitesi doludur.",
      );
    }

    const suggestedQuantity =
      this.round(
        Math.min(
          item.remainingQuantity,
          usableQuantity,
          destinationRemaining,
        ),
      );

    if (suggestedQuantity <= 0) {
      eligible = false;
      warnings.push(
        "Önerilebilecek ikmal miktarı bulunamadı.",
      );
    }

    const capacityScore =
      this.calculateCapacityScore({
        requestedQuantity:
          item.remainingQuantity,
        suggestedQuantity,
        destinationRemaining,
      });

    const distanceScore =
      this.calculateDistanceScore(
        candidate.distance ?? 0,
      );

    const stockAgeScore =
      this.calculateStockAgeScore(
        candidate.stockAgeDays ?? 0,
      );

    const compatibilityScore =
      eligible ? 100 : 0;

    const totalScore =
      this.round(
        capacityScore * 0.4 +
          distanceScore * 0.25 +
          stockAgeScore * 0.2 +
          compatibilityScore * 0.15,
      );

    if (eligible) {
      reasons.push(
        `${suggestedQuantity} ${item.unit} ikmal edilebilir.`,
      );

      if (
        suggestedQuantity >=
        item.remainingQuantity
      ) {
        reasons.push(
          "Kaynak stok ikmal satırının kalan talebini tamamen karşılıyor.",
        );
      } else {
        warnings.push(
          "Kaynak stok ikmal satırını yalnızca kısmen karşılıyor.",
        );
      }

      if (
        candidate.stockAgeDays !==
          undefined &&
        candidate.stockAgeDays > 0
      ) {
        reasons.push(
          "Daha eski stok kullanımına öncelik verildi.",
        );
      }

      if (
        candidate.distance !==
          undefined
      ) {
        reasons.push(
          "Kaynak lokasyon mesafesi puanlamaya dahil edildi.",
        );
      }
    }

    return {
      candidate:
        structuredClone(candidate),
      eligible,
      suggestedQuantity:
        eligible
          ? suggestedQuantity
          : 0,
      score:
        eligible ? totalScore : 0,
      capacityScore:
        eligible
          ? capacityScore
          : 0,
      distanceScore:
        eligible
          ? distanceScore
          : 0,
      stockAgeScore:
        eligible
          ? stockAgeScore
          : 0,
      compatibilityScore,
      reasons,
      warnings,
    };
  }

  calculateCapacityScore(input: {
    requestedQuantity: number;
    suggestedQuantity: number;
    destinationRemaining: number;
  }): number {
    if (
      input.requestedQuantity <= 0 ||
      input.destinationRemaining <= 0
    ) {
      return 0;
    }

    const requestCoverage =
      input.suggestedQuantity /
      input.requestedQuantity;

    const destinationCoverage =
      input.suggestedQuantity /
      input.destinationRemaining;

    return this.clampScore(
      (
        requestCoverage * 0.75 +
        destinationCoverage * 0.25
      ) * 100,
    );
  }

  calculateDistanceScore(
    distance: number,
  ): number {
    if (
      !Number.isFinite(distance) ||
      distance < 0
    ) {
      throw new InventoryValidationError(
        "Kaynak lokasyon mesafesi sıfır veya daha büyük olmalıdır.",
      );
    }

    return this.clampScore(
      100 - Math.min(100, distance),
    );
  }

  calculateStockAgeScore(
    stockAgeDays: number,
  ): number {
    if (
      !Number.isFinite(
        stockAgeDays,
      ) ||
      stockAgeDays < 0
    ) {
      throw new InventoryValidationError(
        "Stok yaşı sıfır veya daha büyük olmalıdır.",
      );
    }

    return this.clampScore(
      Math.min(
        100,
        stockAgeDays * 4,
      ),
    );
  }

  async list(
    tenantId: string,
    replenishmentId: string,
  ): Promise<ReplenishmentSuggestion[]> {
    await this.requireReplenishment(
      tenantId,
      replenishmentId,
    );

    return this.repository
      .listSuggestions(
        tenantId,
        replenishmentId,
      );
  }

  private calculateDestinationRemaining(
    item: ReplenishmentItem,
    destination:
      ReplenishmentDestinationContext,
  ): number {
    const maximumQuantity =
      item.maximumQuantity ??
      destination.maximumQuantity;

    const stockLimit =
      maximumQuantity === undefined
        ? Number.POSITIVE_INFINITY
        : Math.max(
            0,
            maximumQuantity -
              destination
                .currentQuantity,
          );

    const physicalCapacity =
      destination.availableCapacity ===
        undefined
        ? Number.POSITIVE_INFINITY
        : Math.max(
            0,
            destination
              .availableCapacity,
          );

    return Math.min(
      stockLimit,
      physicalCapacity,
      item.remainingQuantity,
    );
  }

  private validateDestination(
    destination:
      ReplenishmentDestinationContext,
    item: ReplenishmentItem,
  ): ReplenishmentDestinationContext {
    const locationId =
      this.requireText(
        destination.locationId,
        "Hedef lokasyon kimliği",
      );

    if (
      locationId !==
      item.destinationLocationId
    ) {
      throw new InventoryValidationError(
        "Hedef lokasyon ikmal satırıyla uyuşmuyor.",
      );
    }

    this.requireNonNegativeNumber(
      destination.currentQuantity,
      "Hedef lokasyon mevcut miktarı",
    );

    if (
      destination.maximumQuantity !==
      undefined
    ) {
      this.requireNonNegativeNumber(
        destination.maximumQuantity,
        "Hedef lokasyon maksimum miktarı",
      );
    }

    if (
      destination.availableCapacity !==
      undefined
    ) {
      this.requireNonNegativeNumber(
        destination.availableCapacity,
        "Hedef lokasyon kullanılabilir kapasitesi",
      );
    }

    return {
      locationId,
      currentQuantity:
        destination.currentQuantity,
      ...(destination.maximumQuantity !==
      undefined
        ? {
            maximumQuantity:
              destination
                .maximumQuantity,
          }
        : {}),
      ...(destination
        .availableCapacity !== undefined
        ? {
            availableCapacity:
              destination
                .availableCapacity,
          }
        : {}),
    };
  }

  private trackingMatches(
    candidate:
      InventoryTracking | undefined,
    expected:
      InventoryTracking | undefined,
  ): boolean {
    if (expected === undefined) {
      return true;
    }

    return (
      candidate?.lotNumber ===
        expected.lotNumber &&
      candidate?.serialNumber ===
        expected.serialNumber &&
      candidate?.productionDate ===
        expected.productionDate &&
      candidate?.expiryDate ===
        expected.expiryDate
    );
  }

  private async requireReplenishment(
    tenantId: string,
    replenishmentId: string,
  ): Promise<Replenishment> {
    const replenishment =
      await this.repository.findById(
        this.requireText(
          tenantId,
          "Firma kimliği",
        ),
        this.requireText(
          replenishmentId,
          "İkmal kimliği",
        ),
      );

    if (!replenishment) {
      throw new InventoryValidationError(
        `İkmal kaydı bulunamadı: ${replenishmentId}`,
      );
    }

    return replenishment;
  }

  private requireItem(
    replenishment: Replenishment,
    itemId: string,
  ): ReplenishmentItem {
    const item =
      replenishment.items.find(
        (current) =>
          current.id === itemId,
      );

    if (!item) {
      throw new InventoryValidationError(
        `İkmal satırı bulunamadı: ${itemId}`,
      );
    }

    if (
      item.status === "completed" ||
      item.status === "cancelled"
    ) {
      throw new InventoryValidationError(
        "Tamamlanmış veya iptal edilmiş ikmal satırı için öneri üretilemez.",
      );
    }

    return item;
  }

  private requireText(
    value: unknown,
    fieldName: string,
  ): string {
    if (typeof value !== "string") {
      throw new InventoryValidationError(
        `${fieldName} metin olmalıdır.`,
      );
    }

    const normalized = value.trim();

    if (!normalized) {
      throw new InventoryValidationError(
        `${fieldName} boş bırakılamaz.`,
      );
    }

    return normalized;
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

  private clampScore(
    value: number,
  ): number {
    return this.round(
      Math.min(
        100,
        Math.max(0, value),
      ),
    );
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
