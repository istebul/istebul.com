import type {
  CycleCountAccuracy,
  CycleCountAccuracyFilter,
} from "../types/CycleCountAccuracy";
import type {
  CycleCountItem,
} from "../types/CycleCountItem";
import type {
  CycleCountResult,
} from "../types/CycleCountResult";
import {
  InventoryValidationError,
} from "../types/InventoryErrors";

export interface CycleCountAccuracyInput {
  filter: CycleCountAccuracyFilter;
  items: readonly CycleCountItem[];
  results: readonly CycleCountResult[];
}

export interface CycleCountAccuracyBreakdown {
  readonly accuracy: CycleCountAccuracy;
  readonly matchedItemIds: readonly string[];
  readonly varianceItemIds: readonly string[];
  readonly recountItemIds: readonly string[];
  readonly adjustedItemIds: readonly string[];
}

export interface CycleCountAccuracyServiceDependencies {
  now?: () => string;
}

export class CycleCountAccuracyService {
  private readonly now: () => string;

  constructor(
    dependencies:
      CycleCountAccuracyServiceDependencies = {},
  ) {
    this.now =
      dependencies.now ??
      (() => new Date().toISOString());
  }

  calculate(
    input: CycleCountAccuracyInput,
  ): CycleCountAccuracy {
    return this.calculateBreakdown(
      input,
    ).accuracy;
  }

  calculateBreakdown(
    input: CycleCountAccuracyInput,
  ): CycleCountAccuracyBreakdown {
    const filter =
      this.validateFilter(input.filter);

    const items =
      this.filterItems(
        input.items,
        filter,
      );

    const itemIds = new Set(
      items.map((item) => item.id),
    );

    const results =
      input.results.filter(
        (result) =>
          result.tenantId ===
            filter.tenantId &&
          itemIds.has(
            result.cycleCountItemId,
          ),
      );

    const resultByItemId = new Map(
      results.map(
        (result) => [
          result.cycleCountItemId,
          result,
        ],
      ),
    );

    const countedItems =
      items.filter(
        (item) =>
          resultByItemId.has(item.id),
      );

    const matchedItemIds =
      countedItems
        .filter((item) => {
          const result =
            resultByItemId.get(item.id);

          return (
            result !== undefined &&
            result.varianceQuantity === 0 &&
            result.damagedQuantity === 0
          );
        })
        .map((item) => item.id);

    const varianceItemIds =
      countedItems
        .filter((item) => {
          const result =
            resultByItemId.get(item.id);

          return (
            result !== undefined &&
            (
              result.varianceQuantity !== 0 ||
              result.damagedQuantity > 0
            )
          );
        })
        .map((item) => item.id);

    const recountItemIds =
      countedItems
        .filter((item) => {
          const result =
            resultByItemId.get(item.id);

          return (
            item.recountRequired ||
            result?.recountRequired === true
          );
        })
        .map((item) => item.id);

    const adjustedItemIds =
      countedItems
        .filter(
          (item) =>
            item.status === "adjusted",
        )
        .map((item) => item.id);

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

    const totalCountedItems =
      countedItems.length;

    const matchedItems =
      matchedItemIds.length;

    const varianceItems =
      varianceItemIds.length;

    const recountItems =
      recountItemIds.length;

    const adjustedItems =
      adjustedItemIds.length;

    const quantityAccuracyRate =
      this.calculateQuantityAccuracyRate(
        totalExpectedQuantity,
        totalAbsoluteVariance,
      );

    const lineAccuracyRate =
      this.calculateRate(
        matchedItems,
        totalCountedItems,
      );

    const firstCountAccurateItems =
      countedItems.filter((item) => {
        const result =
          resultByItemId.get(item.id);

        return (
          item.secondCountQuantity ===
            undefined &&
          result !== undefined &&
          result.varianceQuantity === 0 &&
          result.damagedQuantity === 0
        );
      }).length;

    const firstCountAccuracyRate =
      this.calculateRate(
        firstCountAccurateItems,
        totalCountedItems,
      );

    const adjustmentRate =
      this.calculateRate(
        adjustedItems,
        totalCountedItems,
      );

    const accuracy: CycleCountAccuracy = {
      tenantId: filter.tenantId,
      periodStart:
        filter.periodStart,
      periodEnd:
        filter.periodEnd,
      totalCountedItems,
      matchedItems,
      varianceItems,
      recountItems,
      adjustedItems,
      totalExpectedQuantity,
      totalCountedQuantity,
      totalAbsoluteVariance,
      totalVarianceValue:
        this.round(
          totalVarianceValue,
        ),
      quantityAccuracyRate,
      lineAccuracyRate,
      firstCountAccuracyRate,
      adjustmentRate,
      calculatedAt: this.now(),
      ...(filter.warehouseId !==
      undefined
        ? {
            warehouseId:
              filter.warehouseId,
          }
        : {}),
      ...(filter.locationId !==
      undefined
        ? {
            locationId:
              filter.locationId,
          }
        : {}),
      ...(filter.productId !==
      undefined
        ? {
            productId:
              filter.productId,
          }
        : {}),
    };

    return {
      accuracy,
      matchedItemIds,
      varianceItemIds,
      recountItemIds,
      adjustedItemIds,
    };
  }

  calculateQuantityAccuracyRate(
    totalExpectedQuantity: number,
    totalAbsoluteVariance: number,
  ): number {
    this.requireNonNegativeNumber(
      totalExpectedQuantity,
      "Toplam beklenen miktar",
    );

    this.requireNonNegativeNumber(
      totalAbsoluteVariance,
      "Toplam mutlak fark",
    );

    if (totalExpectedQuantity === 0) {
      return totalAbsoluteVariance === 0
        ? 100
        : 0;
    }

    const accuracy =
      (
        1 -
        totalAbsoluteVariance /
          totalExpectedQuantity
      ) * 100;

    return this.clampRate(
      accuracy,
    );
  }

  calculateRate(
    numerator: number,
    denominator: number,
  ): number {
    this.requireNonNegativeNumber(
      numerator,
      "Oran payı",
    );

    this.requireNonNegativeNumber(
      denominator,
      "Oran paydası",
    );

    if (denominator === 0) {
      return 100;
    }

    return this.clampRate(
      (
        numerator /
        denominator
      ) * 100,
    );
  }

  private filterItems(
    items: readonly CycleCountItem[],
    filter: CycleCountAccuracyFilter,
  ): CycleCountItem[] {
    return items
      .filter(
        (item) =>
          item.tenantId ===
          filter.tenantId,
      )
      .filter(
        (item) =>
          filter.warehouseId ===
            undefined ||
          item.warehouseId ===
            filter.warehouseId,
      )
      .filter(
        (item) =>
          filter.locationId ===
            undefined ||
          item.locationId ===
            filter.locationId,
      )
      .filter(
        (item) =>
          filter.productId ===
            undefined ||
          item.productId ===
            filter.productId,
      )
      .filter((item) => {
        const countedAt =
          item.recountedAt ??
          item.countedAt;

        if (countedAt === undefined) {
          return false;
        }

        return (
          countedAt >=
            filter.periodStart &&
          countedAt <=
            filter.periodEnd
        );
      })
      .map((item) =>
        structuredClone(item),
      );
  }

  private validateFilter(
    filter: CycleCountAccuracyFilter,
  ): CycleCountAccuracyFilter {
    const tenantId =
      this.requireText(
        filter.tenantId,
        "Firma kimliği",
      );

    const periodStart =
      this.requireDate(
        filter.periodStart,
        "Dönem başlangıç tarihi",
      );

    const periodEnd =
      this.requireDate(
        filter.periodEnd,
        "Dönem bitiş tarihi",
      );

    if (periodEnd < periodStart) {
      throw new InventoryValidationError(
        "Dönem bitiş tarihi başlangıç tarihinden önce olamaz.",
      );
    }

    return {
      tenantId,
      periodStart,
      periodEnd,
      ...this.optionalTextField(
        "warehouseId",
        filter.warehouseId,
      ),
      ...this.optionalTextField(
        "locationId",
        filter.locationId,
      ),
      ...this.optionalTextField(
        "productId",
        filter.productId,
      ),
    };
  }

  private optionalTextField<
    Key extends string,
  >(
    key: Key,
    value: unknown,
  ): Partial<Record<Key, string>> {
    const normalized =
      this.normalizeOptionalText(value);

    if (normalized === undefined) {
      return {};
    }

    return {
      [key]: normalized,
    } as Record<Key, string>;
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

  private normalizeOptionalText(
    value: unknown,
  ): string | undefined {
    if (
      value === undefined ||
      value === null
    ) {
      return undefined;
    }

    if (typeof value !== "string") {
      throw new InventoryValidationError(
        "İsteğe bağlı metin alanı geçersiz.",
      );
    }

    const normalized = value.trim();

    return normalized || undefined;
  }

  private requireDate(
    value: unknown,
    fieldName: string,
  ): string {
    const text =
      this.requireText(
        value,
        fieldName,
      );

    const timestamp =
      Date.parse(text);

    if (Number.isNaN(timestamp)) {
      throw new InventoryValidationError(
        `${fieldName} geçerli bir tarih olmalıdır.`,
      );
    }

    return new Date(
      timestamp,
    ).toISOString();
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

  private clampRate(
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
