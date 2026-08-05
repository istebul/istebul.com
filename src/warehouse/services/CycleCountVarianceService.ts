import type {
  CycleCountItem,
} from "../types/CycleCountItem";
import type {
  CalculateCycleCountResultInput,
  CycleCountResult,
  CycleCountResultType,
} from "../types/CycleCountResult";
import {
  InventoryValidationError,
} from "../types/InventoryErrors";

export interface CycleCountToleranceEvaluation {
  readonly quantityVarianceWithinTolerance: boolean;
  readonly percentageVarianceWithinTolerance: boolean;
  readonly withinTolerance: boolean;
}

export interface CycleCountVarianceSummary {
  readonly totalItems: number;
  readonly matchedItems: number;
  readonly shortageItems: number;
  readonly surplusItems: number;
  readonly damagedItems: number;
  readonly recountRequiredItems: number;
  readonly adjustmentRequiredItems: number;
  readonly totalExpectedQuantity: number;
  readonly totalCountedQuantity: number;
  readonly totalDamagedQuantity: number;
  readonly totalAbsoluteVariance: number;
  readonly totalVarianceValue: number;
  readonly lineAccuracyRate: number;
}

export interface CycleCountVarianceServiceDependencies {
  createId?: () => string;
  now?: () => string;
}

let internalSequence = 0;

export class CycleCountVarianceService {
  private readonly createId: () => string;

  private readonly now: () => string;

  constructor(
    dependencies:
      CycleCountVarianceServiceDependencies = {},
  ) {
    this.createId =
      dependencies.createId ??
      (() =>
        `cycle-count-result-${String(
          ++internalSequence,
        ).padStart(6, "0")}`);

    this.now =
      dependencies.now ??
      (() => new Date().toISOString());
  }

  calculate(
    input: CalculateCycleCountResultInput,
  ): CycleCountResult {
    const tenantId = this.requireText(
      input.tenantId,
      "Firma kimliği",
    );

    const cycleCountId = this.requireText(
      input.cycleCountId,
      "Sayım kimliği",
    );

    const cycleCountItemId =
      this.requireText(
        input.cycleCountItemId,
        "Sayım satırı kimliği",
      );

    const expectedQuantity =
      this.requireNonNegativeNumber(
        input.expectedQuantity,
        "Beklenen miktar",
      );

    const countedQuantity =
      this.requireNonNegativeNumber(
        input.countedQuantity,
        "Sayılan miktar",
      );

    const damagedQuantity =
      input.damagedQuantity === undefined
        ? 0
        : this.requireNonNegativeNumber(
            input.damagedQuantity,
            "Hasarlı miktar",
          );

    const unitCost =
      input.unitCost === undefined
        ? undefined
        : this.requireNonNegativeNumber(
            input.unitCost,
            "Birim maliyet",
          );

    const toleranceQuantity =
      input.toleranceQuantity === undefined
        ? undefined
        : this.requireNonNegativeNumber(
            input.toleranceQuantity,
            "Miktar toleransı",
          );

    const tolerancePercentage =
      input.tolerancePercentage === undefined
        ? undefined
        : this.requirePercentage(
            input.tolerancePercentage,
            "Yüzde toleransı",
          );

    const varianceQuantity =
      countedQuantity - expectedQuantity;

    const variancePercentage =
      this.calculateVariancePercentage(
        expectedQuantity,
        varianceQuantity,
      );

    const tolerance =
      this.evaluateTolerance({
        varianceQuantity,
        variancePercentage,
        ...(toleranceQuantity !== undefined
          ? { toleranceQuantity }
          : {}),
        ...(tolerancePercentage !== undefined
          ? { tolerancePercentage }
          : {}),
      });

    const resultType =
      this.resolveResultType({
        expectedQuantity,
        countedQuantity,
        damagedQuantity,
        varianceQuantity,
        withinTolerance:
          tolerance.withinTolerance,
      });

    const recountRequired =
      !tolerance.withinTolerance;

    const adjustmentRequired =
      varianceQuantity !== 0 ||
      damagedQuantity > 0;

    return {
      id: this.createId(),
      tenantId,
      cycleCountId,
      cycleCountItemId,
      type: resultType,
      expectedQuantity,
      countedQuantity,
      damagedQuantity,
      varianceQuantity,
      variancePercentage,
      withinTolerance:
        tolerance.withinTolerance,
      recountRequired,
      adjustmentRequired,
      calculatedAt: this.now(),
      ...(unitCost !== undefined
        ? {
            varianceValue:
              Math.abs(
                varianceQuantity,
              ) * unitCost,
          }
        : {}),
    };
  }

  calculateFromItem(
    item: CycleCountItem,
    countedQuantity: number,
    damagedQuantity = 0,
  ): CycleCountResult {
    return this.calculate({
      tenantId: item.tenantId,
      cycleCountId:
        item.cycleCountId,
      cycleCountItemId: item.id,
      expectedQuantity:
        item.expectedQuantity,
      countedQuantity,
      damagedQuantity,
      ...(item.unitCost !== undefined
        ? { unitCost: item.unitCost }
        : {}),
      ...(item.toleranceQuantity !==
      undefined
        ? {
            toleranceQuantity:
              item.toleranceQuantity,
          }
        : {}),
      ...(item.tolerancePercentage !==
      undefined
        ? {
            tolerancePercentage:
              item.tolerancePercentage,
          }
        : {}),
    });
  }

  evaluateTolerance(input: {
    varianceQuantity: number;
    variancePercentage: number;
    toleranceQuantity?: number;
    tolerancePercentage?: number;
  }): CycleCountToleranceEvaluation {
    const absoluteVarianceQuantity =
      Math.abs(input.varianceQuantity);

    const absoluteVariancePercentage =
      Math.abs(input.variancePercentage);

    const quantityVarianceWithinTolerance =
      input.toleranceQuantity ===
        undefined ||
      absoluteVarianceQuantity <=
        input.toleranceQuantity;

    const percentageVarianceWithinTolerance =
      input.tolerancePercentage ===
        undefined ||
      absoluteVariancePercentage <=
        input.tolerancePercentage;

    return {
      quantityVarianceWithinTolerance,
      percentageVarianceWithinTolerance,
      withinTolerance:
        quantityVarianceWithinTolerance &&
        percentageVarianceWithinTolerance,
    };
  }

  summarize(
    results: readonly CycleCountResult[],
  ): CycleCountVarianceSummary {
    const totalItems = results.length;

    const matchedItems =
      results.filter(
        (result) =>
          result.type === "match",
      ).length;

    const shortageItems =
      results.filter(
        (result) =>
          result.type === "shortage" ||
          result.type ===
            "missing_stock",
      ).length;

    const surplusItems =
      results.filter(
        (result) =>
          result.type === "surplus" ||
          result.type ===
            "unexpected_stock",
      ).length;

    const damagedItems =
      results.filter(
        (result) =>
          result.damagedQuantity > 0,
      ).length;

    const recountRequiredItems =
      results.filter(
        (result) =>
          result.recountRequired,
      ).length;

    const adjustmentRequiredItems =
      results.filter(
        (result) =>
          result.adjustmentRequired,
      ).length;

    const totalExpectedQuantity =
      results.reduce(
        (total, result) =>
          total +
          result.expectedQuantity,
        0,
      );

    const totalCountedQuantity =
      results.reduce(
        (total, result) =>
          total +
          result.countedQuantity,
        0,
      );

    const totalDamagedQuantity =
      results.reduce(
        (total, result) =>
          total +
          result.damagedQuantity,
        0,
      );

    const totalAbsoluteVariance =
      results.reduce(
        (total, result) =>
          total +
          Math.abs(
            result.varianceQuantity,
          ),
        0,
      );

    const totalVarianceValue =
      results.reduce(
        (total, result) =>
          total +
          (
            result.varianceValue ??
            0
          ),
        0,
      );

    const lineAccuracyRate =
      totalItems === 0
        ? 100
        : this.round(
            (
              matchedItems /
              totalItems
            ) * 100,
          );

    return {
      totalItems,
      matchedItems,
      shortageItems,
      surplusItems,
      damagedItems,
      recountRequiredItems,
      adjustmentRequiredItems,
      totalExpectedQuantity,
      totalCountedQuantity,
      totalDamagedQuantity,
      totalAbsoluteVariance,
      totalVarianceValue:
        this.round(
          totalVarianceValue,
        ),
      lineAccuracyRate,
    };
  }

  calculateVariancePercentage(
    expectedQuantity: number,
    varianceQuantity: number,
  ): number {
    if (expectedQuantity === 0) {
      return varianceQuantity === 0
        ? 0
        : 100;
    }

    return this.round(
      (
        varianceQuantity /
        expectedQuantity
      ) * 100,
    );
  }

  private resolveResultType(input: {
    expectedQuantity: number;
    countedQuantity: number;
    damagedQuantity: number;
    varianceQuantity: number;
    withinTolerance: boolean;
  }): CycleCountResultType {
    if (input.damagedQuantity > 0) {
      return "damaged";
    }

    if (
      input.expectedQuantity > 0 &&
      input.countedQuantity === 0
    ) {
      return "missing_stock";
    }

    if (
      input.expectedQuantity === 0 &&
      input.countedQuantity > 0
    ) {
      return "unexpected_stock";
    }

    if (
      input.varianceQuantity === 0
    ) {
      return "match";
    }

    if (!input.withinTolerance) {
      return "recount_required";
    }

    if (
      input.varianceQuantity < 0
    ) {
      return "shortage";
    }

    return "surplus";
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

  private requirePercentage(
    value: unknown,
    fieldName: string,
  ): number {
    const normalized =
      this.requireNonNegativeNumber(
        value,
        fieldName,
      );

    if (normalized > 100) {
      throw new InventoryValidationError(
        `${fieldName} 100 değerini aşamaz.`,
      );
    }

    return normalized;
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
