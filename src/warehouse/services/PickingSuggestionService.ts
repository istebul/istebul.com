import type { InventoryBalance } from "../types/InventoryBalance";
import type { PickingItem } from "../types/PickingItem";
import type {
  PickingSuggestion,
  PickingSuggestionScore,
} from "../types/PickingSuggestion";
import { InventoryValidationError } from "../types/InventoryErrors";
import type { PickingRepository } from "./PickingRepository";

export interface GeneratePickingSuggestionsInput {
  tenantId: string;
  pickingId: string;
  pickingItemId: string;
  balances: readonly InventoryBalance[];
  locationDistances?: Readonly<Record<string, number>>;
}

export interface PickingSuggestionServiceDependencies {
  repository: PickingRepository;
  createId?: () => string;
  now?: () => string;
}

interface EvaluatedBalance {
  readonly balance: InventoryBalance;
  readonly score: PickingSuggestionScore;
  readonly reasons: readonly string[];
  readonly warnings: readonly string[];
}

function normalizeScore(value: number): number {
  return Math.max(
    0,
    Math.min(100, Math.round(value)),
  );
}

function calculateQuantityScore(
  requestedQuantity: number,
  availableQuantity: number,
): number {
  if (availableQuantity <= 0) {
    return 0;
  }

  if (availableQuantity === requestedQuantity) {
    return 100;
  }

  if (availableQuantity > requestedQuantity) {
    const excessRatio =
      requestedQuantity / availableQuantity;

    return normalizeScore(
      70 + excessRatio * 30,
    );
  }

  return normalizeScore(
    (availableQuantity / requestedQuantity) * 70,
  );
}

function calculateDistanceScore(
  locationId: string,
  distances?: Readonly<Record<string, number>>,
): number {
  const distance = distances?.[locationId];

  if (distance === undefined) {
    return 50;
  }

  if (
    !Number.isFinite(distance) ||
    distance < 0
  ) {
    throw new InventoryValidationError(
      "Toplama lokasyonu mesafesi negatif olamaz.",
    );
  }

  return normalizeScore(100 - distance);
}

function calculateExpiryScore(
  _balance: InventoryBalance,
): number {
  /*
   * InventoryBalance modeli henüz son kullanma tarihi
   * taşımamaktadır. FEFO verisi modele eklenene kadar
   * nötr puan kullanılır.
   */
  return 50;
}

function calculateFifoScore(
  balance: InventoryBalance,
  oldestMovementAt?: string,
): number {
  if (!balance.lastMovementAt) {
    return 50;
  }

  if (
    oldestMovementAt !== undefined &&
    balance.lastMovementAt === oldestMovementAt
  ) {
    return 100;
  }

  return 70;
}

export class PickingSuggestionService {
  private readonly repository: PickingRepository;
  private readonly createId: () => string;
  private readonly now: () => string;

  constructor(
    dependencies: PickingSuggestionServiceDependencies,
  ) {
    this.repository = dependencies.repository;
    this.createId =
      dependencies.createId ??
      (() => crypto.randomUUID());
    this.now =
      dependencies.now ??
      (() => new Date().toISOString());
  }

  async generate(
    input: GeneratePickingSuggestionsInput,
  ): Promise<PickingSuggestion[]> {
    const tenantId = input.tenantId.trim();
    const pickingId = input.pickingId.trim();
    const pickingItemId =
      input.pickingItemId.trim();

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

    if (!pickingItemId) {
      throw new InventoryValidationError(
        "Toplama satırı boş bırakılamaz.",
      );
    }

    const picking =
      await this.repository.findById(
        tenantId,
        pickingId,
      );

    if (!picking) {
      throw new InventoryValidationError(
        `Toplama kaydı bulunamadı: ${pickingId}`,
      );
    }

    if (
      picking.status === "completed" ||
      picking.status === "cancelled"
    ) {
      throw new InventoryValidationError(
        "Tamamlanmış veya iptal edilmiş toplama için öneri üretilemez.",
      );
    }

    const item = picking.items.find(
      (current) =>
        current.id === pickingItemId,
    );

    if (!item) {
      throw new InventoryValidationError(
        `Toplama satırı bulunamadı: ${pickingItemId}`,
      );
    }

    if (item.remainingQuantity <= 0) {
      throw new InventoryValidationError(
        "Tamamlanmış toplama satırı için öneri üretilemez.",
      );
    }

    const eligibleBalances =
      input.balances
        .filter(
          (balance) =>
            balance.tenantId === item.tenantId,
        )
        .filter(
          (balance) =>
            balance.warehouseId ===
            item.warehouseId,
        )
        .filter(
          (balance) =>
            balance.productId === item.productId,
        )
        .filter(
          (balance) =>
            item.skuId === undefined ||
            balance.skuId === item.skuId,
        )
        .filter(
          (balance) =>
            balance.stockStatus ===
            item.stockStatus,
        )
        .filter(
          (balance) =>
            balance.unit === item.unit,
        )
        .filter(
          (balance) =>
            balance.quantity > 0,
        )
        .filter(
          (balance) =>
            balance.locationId !==
            picking.destinationLocationId,
        );

    if (eligibleBalances.length === 0) {
      throw new InventoryValidationError(
        "Toplama için uygun stok bakiyesi bulunamadı.",
      );
    }

    const oldestMovementAt =
      eligibleBalances
        .map(
          (balance) =>
            balance.lastMovementAt,
        )
        .filter(
          (value): value is string =>
            value !== undefined,
        )
        .sort()[0];

    const evaluated = eligibleBalances
      .map((balance) =>
        this.evaluateBalance(
          item,
          balance,
          oldestMovementAt,
          input.locationDistances,
        ),
      )
      .sort(
        (left, right) =>
          right.score.totalScore -
          left.score.totalScore,
      );

    const suggestions =
      this.allocateSuggestions(
        item,
        evaluated,
      );

    const saved: PickingSuggestion[] = [];

    for (const suggestion of suggestions) {
      saved.push(
        await this.repository.saveSuggestion(
          suggestion,
        ),
      );
    }

    return saved;
  }

  private evaluateBalance(
    item: PickingItem,
    balance: InventoryBalance,
    oldestMovementAt: string | undefined,
    locationDistances:
      | Readonly<Record<string, number>>
      | undefined,
  ): EvaluatedBalance {
    const reasons: string[] = [];
    const warnings: string[] = [];

    const quantityScore =
      calculateQuantityScore(
        item.remainingQuantity,
        balance.quantity,
      );

    const distanceScore =
      calculateDistanceScore(
        balance.locationId,
        locationDistances,
      );

    const expiryScore =
      calculateExpiryScore(balance);

    const fifoScore =
      calculateFifoScore(
        balance,
        oldestMovementAt,
      );

    let compatibilityScore = 70;

    if (
      item.tracking?.lotNumber !== undefined &&
      balance.lotNumber ===
        item.tracking.lotNumber
    ) {
      compatibilityScore += 15;
      reasons.push(
        "Stok bakiyesi istenen lot numarasıyla uyumludur.",
      );
    }

    if (
      item.tracking?.serialNumber !== undefined &&
      balance.serialNumber ===
        item.tracking.serialNumber
    ) {
      compatibilityScore += 15;
      reasons.push(
        "Stok bakiyesi istenen seri numarasıyla uyumludur.",
      );
    }

    if (balance.quantity < item.remainingQuantity) {
      warnings.push(
        "Bu lokasyondaki stok tek başına talebin tamamını karşılamamaktadır.",
      );
    }

    if (
      locationDistances?.[
        balance.locationId
      ] === undefined
    ) {
      warnings.push(
        "Lokasyon mesafe bilgisi bulunmadığı için varsayılan puan kullanıldı.",
      );
    }

    if (item.strategy === "fefo") {
      warnings.push(
        "Stok bakiyesinde son kullanma tarihi bulunmadığı için FEFO puanlamasında nötr değer kullanıldı.",
      );
    }

    compatibilityScore =
      normalizeScore(
        compatibilityScore,
      );

    let totalScore: number;

    switch (item.strategy) {
      case "fifo":
        totalScore =
          fifoScore * 0.4 +
          quantityScore * 0.25 +
          distanceScore * 0.15 +
          compatibilityScore * 0.2;
        break;

      case "fefo":
        totalScore =
          expiryScore * 0.4 +
          quantityScore * 0.25 +
          distanceScore * 0.15 +
          compatibilityScore * 0.2;
        break;

      case "nearest_location":
      case "route_optimized":
        totalScore =
          distanceScore * 0.4 +
          quantityScore * 0.3 +
          compatibilityScore * 0.2 +
          fifoScore * 0.1;
        break;

      default:
        totalScore =
          quantityScore * 0.35 +
          distanceScore * 0.2 +
          expiryScore * 0.15 +
          fifoScore * 0.1 +
          compatibilityScore * 0.2;
        break;
    }

    return {
      balance,
      score: {
        quantityScore,
        distanceScore,
        expiryScore,
        fifoScore,
        compatibilityScore,
        totalScore:
          normalizeScore(totalScore),
      },
      reasons,
      warnings,
    };
  }

  private allocateSuggestions(
    item: PickingItem,
    evaluated: readonly EvaluatedBalance[],
  ): PickingSuggestion[] {
    let remainingQuantity =
      item.remainingQuantity;

    const suggestions: PickingSuggestion[] =
      [];

    for (const evaluation of evaluated) {
      if (remainingQuantity <= 0) {
        break;
      }

      const suggestedQuantity =
        Math.min(
          evaluation.balance.quantity,
          remainingQuantity,
        );

      suggestions.push({
        id: this.createId(),
        tenantId: item.tenantId,
        pickingId: item.pickingId,
        pickingItemId: item.id,
        warehouseId: item.warehouseId,
        locationId:
          evaluation.balance.locationId,
        strategy: item.strategy,
        suggestedQuantity,
        unit: item.unit,
        balance: evaluation.balance,
        score: evaluation.score,
        reasons: evaluation.reasons,
        warnings: evaluation.warnings,
        selected: suggestions.length === 0,
        createdAt: this.now(),
      });

      remainingQuantity -=
        suggestedQuantity;
    }

    if (remainingQuantity > 0) {
      throw new InventoryValidationError(
        `Toplama için kullanılabilir stok yetersizdir. Eksik miktar: ${remainingQuantity}`,
      );
    }

    return suggestions;
  }
}
