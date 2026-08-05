import type { PutawayItem } from "../types/PutawayItem";
import type {
  PutawaySuggestion,
} from "../types/PutawaySuggestion";
import { InventoryValidationError } from "../types/InventoryErrors";
import type { PutawayRepository } from "./PutawayRepository";
import {
  evaluatePutawayLocation,
  type PutawayLocationCandidate,
} from "./PutawayLocationEvaluator";

export interface GeneratePutawaySuggestionsInput {
  tenantId: string;
  putawayId: string;
  putawayItemId: string;
  candidates: readonly PutawayLocationCandidate[];
  productTemperature?: number;
  hazardousMaterial?: boolean;
  preferredZoneId?: string;
  abcClass?: "A" | "B" | "C";
}

export interface PutawaySuggestionServiceDependencies {
  repository: PutawayRepository;
  createId?: () => string;
  now?: () => string;
}

export class PutawaySuggestionService {
  private readonly repository: PutawayRepository;
  private readonly createId: () => string;
  private readonly now: () => string;

  constructor(
    dependencies: PutawaySuggestionServiceDependencies,
  ) {
    this.repository = dependencies.repository;
    this.createId =
      dependencies.createId ?? (() => crypto.randomUUID());
    this.now =
      dependencies.now ?? (() => new Date().toISOString());
  }

  async generate(
    input: GeneratePutawaySuggestionsInput,
  ): Promise<PutawaySuggestion[]> {
    const tenantId = input.tenantId.trim();
    const putawayId = input.putawayId.trim();
    const putawayItemId = input.putawayItemId.trim();

    if (!tenantId) {
      throw new InventoryValidationError(
        "Firma kimliği boş bırakılamaz.",
      );
    }

    if (!putawayId) {
      throw new InventoryValidationError(
        "Yerleştirme kimliği boş bırakılamaz.",
      );
    }

    if (!putawayItemId) {
      throw new InventoryValidationError(
        "Yerleştirme satırı boş bırakılamaz.",
      );
    }

    if (input.candidates.length === 0) {
      throw new InventoryValidationError(
        "Lokasyon önerisi oluşturmak için en az bir aday lokasyon gereklidir.",
      );
    }

    const putaway = await this.repository.findById(
      tenantId,
      putawayId,
    );

    if (!putaway) {
      throw new InventoryValidationError(
        `Yerleştirme kaydı bulunamadı: ${putawayId}`,
      );
    }

    if (
      putaway.status === "completed" ||
      putaway.status === "cancelled"
    ) {
      throw new InventoryValidationError(
        "Tamamlanmış veya iptal edilmiş yerleştirme için öneri üretilemez.",
      );
    }

    const item = putaway.items.find(
      (current) => current.id === putawayItemId,
    );

    if (!item) {
      throw new InventoryValidationError(
        `Yerleştirme satırı bulunamadı: ${putawayItemId}`,
      );
    }

    const suggestions = this.buildSuggestions(
      item,
      input,
    );

    if (suggestions.length === 0) {
      throw new InventoryValidationError(
        "Yerleştirme için uygun hedef lokasyon bulunamadı.",
      );
    }

    const saved: PutawaySuggestion[] = [];

    for (const suggestion of suggestions) {
      saved.push(
        await this.repository.saveSuggestion(suggestion),
      );
    }

    return saved;
  }

  private buildSuggestions(
    item: PutawayItem,
    input: GeneratePutawaySuggestionsInput,
  ): PutawaySuggestion[] {
    const evaluated = input.candidates
      .filter(
        (candidate) =>
          candidate.locationId !== item.sourceLocationId,
      )
      .map((candidate) => {
        const result = evaluatePutawayLocation({
          warehouseId: item.warehouseId,
          sourceLocationId: item.sourceLocationId,
          productId: item.productId,
          requestedQuantity: item.remainingQuantity,
          strategy: item.strategy,
          candidate,
          ...(item.skuId !== undefined
            ? { skuId: item.skuId }
            : {}),
          ...(input.productTemperature !== undefined
            ? {
                productTemperature:
                  input.productTemperature,
              }
            : {}),
          ...(input.hazardousMaterial !== undefined
            ? {
                hazardousMaterial:
                  input.hazardousMaterial,
              }
            : {}),
          ...(input.preferredZoneId?.trim()
            ? {
                preferredZoneId:
                  input.preferredZoneId.trim(),
              }
            : {}),
          ...(input.abcClass !== undefined
            ? { abcClass: input.abcClass }
            : {}),
        });

        return {
          candidate,
          result,
        };
      })
      .filter(({ result }) => result.eligible)
      .sort(
        (left, right) =>
          right.result.score.totalScore -
          left.result.score.totalScore,
      );

    return evaluated.map(
      ({ candidate, result }, index) => ({
        id: this.createId(),
        tenantId: item.tenantId,
        putawayId: item.putawayId,
        putawayItemId: item.id,
        warehouseId: item.warehouseId,
        sourceLocationId: item.sourceLocationId,
        targetLocationId: candidate.locationId,
        strategy: item.strategy,
        suggestedQuantity: Math.min(
          item.remainingQuantity,
          candidate.availableCapacity ??
            item.remainingQuantity,
        ),
        unit: item.unit,
        score: result.score,
        reasons: result.reasons,
        warnings: result.warnings,
        selected: index === 0,
        createdAt: this.now(),
        ...(candidate.availableCapacity !== undefined
          ? {
              availableCapacity:
                candidate.availableCapacity,
            }
          : {}),
        ...(candidate.distance !== undefined
          ? { distance: candidate.distance }
          : {}),
      }),
    );
  }
}
