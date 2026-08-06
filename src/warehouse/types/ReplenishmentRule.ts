import type {
  ReplenishmentStrategy,
} from "./ReplenishmentStrategy";

export interface ReplenishmentRule {
  readonly id: string;
  readonly tenantId: string;
  readonly code: string;
  readonly name: string;
  readonly description?: string;
  readonly warehouseId?: string;
  readonly zoneId?: string;
  readonly destinationLocationId?: string;
  readonly productId?: string;
  readonly skuId?: string;
  readonly productCategoryId?: string;
  readonly abcClass?: "A" | "B" | "C";
  readonly strategy: ReplenishmentStrategy;
  readonly minimumQuantity?: number;
  readonly maximumQuantity?: number;
  readonly safetyStockQuantity?: number;
  readonly reorderPoint?: number;
  readonly targetFillPercentage?: number;
  readonly minimumTransferQuantity?: number;
  readonly maximumTransferQuantity?: number;
  readonly transferMultiple?: number;
  readonly leadTimeMinutes?: number;
  readonly priority: number;
  readonly automaticRelease: boolean;
  readonly allowPartialAllocation: boolean;
  readonly active: boolean;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateReplenishmentRuleInput {
  tenantId: string;
  code: string;
  name: string;
  strategy: ReplenishmentStrategy;
  createdBy: string;
  description?: string;
  warehouseId?: string;
  zoneId?: string;
  destinationLocationId?: string;
  productId?: string;
  skuId?: string;
  productCategoryId?: string;
  abcClass?: "A" | "B" | "C";
  minimumQuantity?: number;
  maximumQuantity?: number;
  safetyStockQuantity?: number;
  reorderPoint?: number;
  targetFillPercentage?: number;
  minimumTransferQuantity?: number;
  maximumTransferQuantity?: number;
  transferMultiple?: number;
  leadTimeMinutes?: number;
  priority?: number;
  automaticRelease?: boolean;
  allowPartialAllocation?: boolean;
}
