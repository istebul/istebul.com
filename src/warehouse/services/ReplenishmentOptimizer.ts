import type {
  ReplenishmentAllocation,
} from "../types/ReplenishmentAllocation";
import type {
  ReplenishmentItem,
} from "../types/ReplenishmentItem";
import type {
  ReplenishmentRule,
} from "../types/ReplenishmentRule";
import type {
  ReplenishmentSuggestion,
} from "../types/ReplenishmentSuggestion";
import {
  InventoryValidationError,
} from "../types/InventoryErrors";

export interface ReplenishmentOptimizationInput {
  readonly items:
    readonly ReplenishmentItem[];
  readonly suggestions:
    readonly ReplenishmentSuggestion[];
  readonly rules?:
    readonly ReplenishmentRule[];
  readonly allowPartialAllocation?: boolean;
}

export interface ReplenishmentOptimizationSelection {
  readonly item:
    ReplenishmentItem;
  readonly suggestion:
    ReplenishmentSuggestion;
  readonly quantity: number;
  readonly sequence: number;
  readonly score: number;
  readonly reasons: readonly string[];
  readonly warnings: readonly string[];
}

export interface ReplenishmentOptimizationUnfulfilledItem {
  readonly replenishmentItemId: string;
  readonly requestedQuantity: number;
  readonly allocatedQuantity: number;
  readonly remainingQuantity: number;
  readonly reason: string;
}

export interface ReplenishmentOptimizationResult {
  readonly selections:
    readonly ReplenishmentOptimizationSelection[];
  readonly unfulfilledItems:
    readonly ReplenishmentOptimizationUnfulfilledItem[];
  readonly totalRequestedQuantity: number;
  readonly totalAllocatedQuantity: number;
  readonly totalRemainingQuantity: number;
  readonly fulfillmentRate: number;
  readonly sourceLocationCount: number;
  readonly destinationLocationCount: number;
  readonly averageSelectionScore: number;
}

export interface BuildReplenishmentAllocationsInput {
  readonly tenantId: string;
  readonly replenishmentId: string;
  readonly optimization:
    ReplenishmentOptimizationResult;
  readonly createId: () => string;
  readonly now: () => string;
}

export class ReplenishmentOptimizer {
  optimize(
    input: ReplenishmentOptimizationInput,
  ): ReplenishmentOptimizationResult {
    const allowPartialAllocation =
      input.allowPartialAllocation ??
      true;

    const items =
      [...input.items]
        .filter(
          (item) =>
            item.status !== "completed" &&
            item.status !== "cancelled",
        )
        .sort(
          (left, right) =>
            right.priority -
              left.priority ||
            this.requiredAtValue(
              left.requiredAt,
            ) -
              this.requiredAtValue(
                right.requiredAt,
              ) ||
            left.lineNumber -
              right.lineNumber,
        );

    if (items.length === 0) {
      throw new InventoryValidationError(
        "Optimize edilecek aktif ikmal satırı bulunamadı.",
      );
    }

    const sourceRemaining =
      this.buildSourceRemainingMap(
        input.suggestions,
      );

    const selections:
      ReplenishmentOptimizationSelection[] =
      [];

    const unfulfilledItems:
      ReplenishmentOptimizationUnfulfilledItem[] =
      [];

    let sequence = 0;

    for (const item of items) {
      const rule =
        this.findApplicableRule(
          item,
          input.rules ?? [],
        );

      const suggestions =
        input.suggestions
          .filter(
            (suggestion) =>
              suggestion
                .replenishmentItemId ===
              item.id,
          )
          .sort(
            (left, right) =>
              right.totalScore -
                left.totalScore ||
              left.sourceDistance -
                right.sourceDistance ||
              right.suggestedQuantity -
                left.suggestedQuantity,
          );

      let remainingQuantity =
        item.remainingQuantity;

      let allocatedQuantity = 0;

      for (
        const suggestion
        of suggestions
      ) {
        if (remainingQuantity <= 0) {
          break;
        }

        const sourceKey =
          this.sourceKey(suggestion);

        const remainingSource =
          sourceRemaining.get(
            sourceKey,
          ) ?? 0;

        if (remainingSource <= 0) {
          continue;
        }

        const maximumTransfer =
          rule?.maximumTransferQuantity ??
          Number.POSITIVE_INFINITY;

        const candidateQuantity =
          Math.min(
            remainingQuantity,
            suggestion.suggestedQuantity,
            remainingSource,
            maximumTransfer,
          );

        const normalizedQuantity =
          this.normalizeTransferQuantity({
            quantity:
              candidateQuantity,
            remainingDemand:
              remainingQuantity,
            ...(rule
              ?.minimumTransferQuantity !==
            undefined
              ? {
                  minimumTransferQuantity:
                    rule
                      .minimumTransferQuantity,
                }
              : {}),
            ...(rule?.transferMultiple !==
            undefined
              ? {
                  transferMultiple:
                    rule.transferMultiple,
                }
              : {}),
            allowPartialAllocation:
              rule
                ?.allowPartialAllocation ??
              allowPartialAllocation,
          });

        if (normalizedQuantity <= 0) {
          continue;
        }

        sequence += 1;

        selections.push({
          item:
            structuredClone(item),
          suggestion:
            structuredClone(
              suggestion,
            ),
          quantity:
            normalizedQuantity,
          sequence,
          score:
            this.calculateSelectionScore({
              suggestion,
              item,
              quantity:
                normalizedQuantity,
              ...(rule !== undefined
                ? { rule }
                : {}),
            }),
          reasons: [
            ...suggestion.reasons,
            `Kaynak lokasyondan ${normalizedQuantity} ${item.unit} tahsis edildi.`,
          ],
          warnings:
            normalizedQuantity <
            remainingQuantity
              ? [
                  ...suggestion.warnings,
                  "Kaynak seçimi kalan talebi kısmen karşılamaktadır.",
                ]
              : [
                  ...suggestion.warnings,
                ],
        });

        sourceRemaining.set(
          sourceKey,
          this.round(
            remainingSource -
              normalizedQuantity,
          ),
        );

        remainingQuantity =
          this.round(
            remainingQuantity -
              normalizedQuantity,
          );

        allocatedQuantity =
          this.round(
            allocatedQuantity +
              normalizedQuantity,
          );

        if (
          !allowPartialAllocation &&
          remainingQuantity > 0
        ) {
          break;
        }
      }

      if (remainingQuantity > 0) {
        unfulfilledItems.push({
          replenishmentItemId:
            item.id,
          requestedQuantity:
            item.remainingQuantity,
          allocatedQuantity,
          remainingQuantity,
          reason:
            suggestions.length === 0
              ? "İkmal satırı için uygun kaynak önerisi bulunamadı."
              : allowPartialAllocation
                ? "Uygun kaynak stoklar talebin tamamını karşılamadı."
                : "Kısmi tahsise izin verilmediği için talep tamamen karşılanamadı.",
        });
      }
    }

    const totalRequestedQuantity =
      this.round(
        items.reduce(
          (total, item) =>
            total +
            item.remainingQuantity,
          0,
        ),
      );

    const totalAllocatedQuantity =
      this.round(
        selections.reduce(
          (total, selection) =>
            total +
            selection.quantity,
          0,
        ),
      );

    const totalRemainingQuantity =
      this.round(
        Math.max(
          0,
          totalRequestedQuantity -
            totalAllocatedQuantity,
        ),
      );

    const fulfillmentRate =
      totalRequestedQuantity === 0
        ? 100
        : this.round(
            Math.min(
              100,
              (
                totalAllocatedQuantity /
                totalRequestedQuantity
              ) * 100,
            ),
          );

    const sourceLocationCount =
      new Set(
        selections.map(
          (selection) =>
            selection.suggestion
              .sourceLocationId,
        ),
      ).size;

    const destinationLocationCount =
      new Set(
        selections.map(
          (selection) =>
            selection.item
              .destinationLocationId,
        ),
      ).size;

    const averageSelectionScore =
      selections.length === 0
        ? 0
        : this.round(
            selections.reduce(
              (total, selection) =>
                total +
                selection.score,
              0,
            ) / selections.length,
          );

    return {
      selections,
      unfulfilledItems,
      totalRequestedQuantity,
      totalAllocatedQuantity,
      totalRemainingQuantity,
      fulfillmentRate,
      sourceLocationCount,
      destinationLocationCount,
      averageSelectionScore,
    };
  }

  buildAllocations(
    input:
      BuildReplenishmentAllocationsInput,
  ): ReplenishmentAllocation[] {
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

    return input.optimization
      .selections
      .map(
        (
          selection,
        ): ReplenishmentAllocation => {
          const timestamp =
            input.now();

          return {
            id: input.createId(),
            tenantId,
            replenishmentId,
            replenishmentItemId:
              selection.item.id,
            sourceLocationId:
              selection.suggestion
                .sourceLocationId,
            destinationLocationId:
              selection.item
                .destinationLocationId,
            productId:
              selection.item.productId,
            stockStatus:
              selection.item
                .stockStatus,
            unit:
              selection.item.unit,
            allocatedQuantity:
              selection.quantity,
            transferredQuantity: 0,
            remainingQuantity:
              selection.quantity,
            sequence:
              selection.sequence,
            score:
              selection.score,
            status: "planned",
            createdAt: timestamp,
            updatedAt: timestamp,
            ...(selection.item.skuId !==
            undefined
              ? {
                  skuId:
                    selection.item
                      .skuId,
                }
              : {}),
            ...(selection.suggestion
              .inventoryBalanceId !==
            undefined
              ? {
                  inventoryBalanceId:
                    selection.suggestion
                      .inventoryBalanceId,
                }
              : {}),
            ...(selection.suggestion
              .tracking !== undefined
              ? {
                  tracking:
                    structuredClone(
                      selection.suggestion
                        .tracking,
                    ),
                }
              : {}),
          };
        },
      );
  }

  normalizeTransferQuantity(input: {
    quantity: number;
    remainingDemand: number;
    minimumTransferQuantity?: number;
    transferMultiple?: number;
    allowPartialAllocation: boolean;
  }): number {
    this.requireNonNegativeNumber(
      input.quantity,
      "Transfer miktarı",
    );

    this.requireNonNegativeNumber(
      input.remainingDemand,
      "Kalan ikmal talebi",
    );

    let quantity =
      Math.min(
        input.quantity,
        input.remainingDemand,
      );

    if (
      input.transferMultiple !==
      undefined
    ) {
      this.requirePositiveNumber(
        input.transferMultiple,
        "Transfer katı",
      );

      quantity =
        Math.floor(
          quantity /
            input.transferMultiple,
        ) *
        input.transferMultiple;
    }

    if (
      input.minimumTransferQuantity !==
        undefined &&
      quantity <
        input.minimumTransferQuantity
    ) {
      if (
        !input.allowPartialAllocation ||
        input.remainingDemand >=
          input.minimumTransferQuantity
      ) {
        return 0;
      }
    }

    if (
      !input.allowPartialAllocation &&
      quantity <
        input.remainingDemand
    ) {
      return 0;
    }

    return this.round(
      Math.max(0, quantity),
    );
  }

  calculateSelectionScore(input: {
    suggestion:
      ReplenishmentSuggestion;
    item: ReplenishmentItem;
    rule?: ReplenishmentRule;
    quantity: number;
  }): number {
    const coverageScore =
      input.item.remainingQuantity === 0
        ? 100
        : Math.min(
            100,
            (
              input.quantity /
              input.item
                .remainingQuantity
            ) * 100,
          );

    const priorityScore =
      input.item.priority;

    const rulePriority =
      input.rule?.priority ??
      50;

    return this.clampScore(
      input.suggestion.totalScore *
        0.55 +
        coverageScore * 0.2 +
        priorityScore * 0.15 +
        rulePriority * 0.1,
    );
  }

  private findApplicableRule(
    item: ReplenishmentItem,
    rules: readonly ReplenishmentRule[],
  ): ReplenishmentRule | undefined {
    return [...rules]
      .filter(
        (rule) =>
          rule.active &&
          rule.tenantId ===
            item.tenantId,
      )
      .filter(
        (rule) =>
          rule.warehouseId ===
            undefined ||
          rule.warehouseId ===
            item.warehouseId,
      )
      .filter(
        (rule) =>
          rule.destinationLocationId ===
            undefined ||
          rule.destinationLocationId ===
            item.destinationLocationId,
      )
      .filter(
        (rule) =>
          rule.productId === undefined ||
          rule.productId ===
            item.productId,
      )
      .filter(
        (rule) =>
          rule.skuId === undefined ||
          rule.skuId === item.skuId,
      )
      .sort(
        (left, right) =>
          right.priority -
          left.priority,
      )[0];
  }

  private buildSourceRemainingMap(
    suggestions:
      readonly ReplenishmentSuggestion[],
  ): Map<string, number> {
    const map =
      new Map<string, number>();

    for (
      const suggestion
      of suggestions
    ) {
      const key =
        this.sourceKey(suggestion);

      const existing =
        map.get(key);

      const available =
        Math.max(
          0,
          suggestion.availableQuantity,
        );

      if (existing === undefined) {
        map.set(key, available);
      } else {
        map.set(
          key,
          Math.min(
            existing,
            available,
          ),
        );
      }
    }

    return map;
  }

  private sourceKey(
    suggestion:
      ReplenishmentSuggestion,
  ): string {
    return [
      suggestion.tenantId,
      suggestion.sourceLocationId,
      suggestion.productId,
      suggestion.skuId ?? "",
      suggestion.inventoryBalanceId ??
        "",
      suggestion.stockStatus,
      this.trackingKey(
        suggestion.tracking,
      ),
    ].join(":");
  }

  private trackingKey(
    tracking:
      ReplenishmentSuggestion["tracking"],
  ): string {
    if (tracking === undefined) {
      return "";
    }

    return JSON.stringify({
      lotNumber:
        tracking.lotNumber ?? "",
      serialNumber:
        tracking.serialNumber ?? "",
      productionDate:
        tracking.productionDate ?? "",
      expiryDate:
        tracking.expiryDate ?? "",
    });
  }

  private requiredAtValue(
    requiredAt: string | undefined,
  ): number {
    if (requiredAt === undefined) {
      return Number.MAX_SAFE_INTEGER;
    }

    const timestamp =
      Date.parse(requiredAt);

    return Number.isNaN(timestamp)
      ? Number.MAX_SAFE_INTEGER
      : timestamp;
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

    const normalized =
      value.trim();

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

  private requirePositiveNumber(
    value: unknown,
    fieldName: string,
  ): number {
    const normalized =
      this.requireNonNegativeNumber(
        value,
        fieldName,
      );

    if (normalized <= 0) {
      throw new InventoryValidationError(
        `${fieldName} sıfırdan büyük olmalıdır.`,
      );
    }

    return normalized;
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
