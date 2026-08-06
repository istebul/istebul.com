import type {
  InventoryTracking,
} from "./InventoryMovement";
import type {
  ReplenishmentSource,
} from "./ReplenishmentSource";

export interface ReplenishmentDemand {
  readonly id: string;
  readonly tenantId: string;
  readonly replenishmentId: string;
  readonly warehouseId: string;
  readonly destinationLocationId: string;
  readonly productId: string;
  readonly skuId?: string;
  readonly stockStatus: string;
  readonly unit: string;
  readonly currentQuantity: number;
  readonly minimumQuantity?: number;
  readonly maximumQuantity?: number;
  readonly orderDemandQuantity: number;
  readonly forecastDemandQuantity: number;
  readonly safetyStockQuantity: number;
  readonly requiredQuantity: number;
  readonly urgencyScore: number;
  readonly priority: number;
  readonly source: ReplenishmentSource;
  readonly tracking?: InventoryTracking;
  readonly requiredAt?: string;
  readonly createdAt: string;
}

export interface CreateReplenishmentDemandInput {
  tenantId: string;
  replenishmentId: string;
  warehouseId: string;
  destinationLocationId: string;
  productId: string;
  stockStatus: string;
  unit: string;
  currentQuantity: number;
  orderDemandQuantity?: number;
  forecastDemandQuantity?: number;
  safetyStockQuantity?: number;
  priority?: number;
  source: ReplenishmentSource;
  skuId?: string;
  minimumQuantity?: number;
  maximumQuantity?: number;
  tracking?: InventoryTracking;
  requiredAt?: string;
}
