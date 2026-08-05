import type {
  CycleCountStrategy,
} from "./CycleCountStrategy";

export const CYCLE_COUNT_ABC_CLASSES = [
  "A",
  "B",
  "C",
  "unclassified",
] as const;

export type CycleCountAbcClass =
  (typeof CYCLE_COUNT_ABC_CLASSES)[number];

export const CYCLE_COUNT_ABC_CLASS_LABELS: Record<
  CycleCountAbcClass,
  string
> = {
  A: "A Sınıfı",
  B: "B Sınıfı",
  C: "C Sınıfı",
  unclassified: "Sınıflandırılmamış",
};

export interface CycleCountRule {
  readonly id: string;
  readonly tenantId: string;
  readonly code: string;
  readonly name: string;
  readonly description?: string;
  readonly strategy: CycleCountStrategy;
  readonly abcClass?: CycleCountAbcClass;
  readonly warehouseId?: string;
  readonly zoneId?: string;
  readonly locationType?: string;
  readonly productCategoryId?: string;
  readonly productId?: string;
  readonly stockStatus?: string;
  readonly minimumStockValue?: number;
  readonly maximumStockValue?: number;
  readonly minimumMovementCount?: number;
  readonly maximumDaysSinceLastCount?: number;
  readonly frequencyDays: number;
  readonly toleranceQuantity?: number;
  readonly tolerancePercentage?: number;
  readonly blindCount: boolean;
  readonly recountRequired: boolean;
  readonly approvalRequired: boolean;
  readonly freezeInventory: boolean;
  readonly priority: number;
  readonly active: boolean;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateCycleCountRuleInput {
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  strategy: CycleCountStrategy;
  abcClass?: CycleCountAbcClass;
  warehouseId?: string;
  zoneId?: string;
  locationType?: string;
  productCategoryId?: string;
  productId?: string;
  stockStatus?: string;
  minimumStockValue?: number;
  maximumStockValue?: number;
  minimumMovementCount?: number;
  maximumDaysSinceLastCount?: number;
  frequencyDays: number;
  toleranceQuantity?: number;
  tolerancePercentage?: number;
  blindCount?: boolean;
  recountRequired?: boolean;
  approvalRequired?: boolean;
  freezeInventory?: boolean;
  priority?: number;
  createdBy: string;
}

export function isCycleCountAbcClass(
  value: unknown,
): value is CycleCountAbcClass {
  return (
    typeof value === "string" &&
    CYCLE_COUNT_ABC_CLASSES.includes(
      value as CycleCountAbcClass,
    )
  );
}
