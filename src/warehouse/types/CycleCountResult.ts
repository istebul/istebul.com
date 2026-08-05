export const CYCLE_COUNT_RESULT_TYPES = [
  "match",
  "shortage",
  "surplus",
  "damaged",
  "unexpected_stock",
  "missing_stock",
  "recount_required",
] as const;

export type CycleCountResultType =
  (typeof CYCLE_COUNT_RESULT_TYPES)[number];

export const CYCLE_COUNT_RESULT_TYPE_LABELS: Record<
  CycleCountResultType,
  string
> = {
  match: "Stok Eşleşti",
  shortage: "Eksik Stok",
  surplus: "Fazla Stok",
  damaged: "Hasarlı Stok",
  unexpected_stock: "Beklenmeyen Stok",
  missing_stock: "Stok Bulunamadı",
  recount_required: "Yeniden Sayım Gerekli",
};

export interface CycleCountResult {
  readonly id: string;
  readonly tenantId: string;
  readonly cycleCountId: string;
  readonly cycleCountItemId: string;
  readonly type: CycleCountResultType;
  readonly expectedQuantity: number;
  readonly countedQuantity: number;
  readonly damagedQuantity: number;
  readonly varianceQuantity: number;
  readonly variancePercentage: number;
  readonly varianceValue?: number;
  readonly withinTolerance: boolean;
  readonly recountRequired: boolean;
  readonly adjustmentRequired: boolean;
  readonly calculatedAt: string;
}

export interface CalculateCycleCountResultInput {
  tenantId: string;
  cycleCountId: string;
  cycleCountItemId: string;
  expectedQuantity: number;
  countedQuantity: number;
  damagedQuantity?: number;
  unitCost?: number;
  toleranceQuantity?: number;
  tolerancePercentage?: number;
}

export function isCycleCountResultType(
  value: unknown,
): value is CycleCountResultType {
  return (
    typeof value === "string" &&
    CYCLE_COUNT_RESULT_TYPES.includes(
      value as CycleCountResultType,
    )
  );
}
