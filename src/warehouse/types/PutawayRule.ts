import type { PutawayStrategy } from "./PutawayStrategy";

export interface PutawayRule {
  readonly id: string;
  readonly tenantId: string;
  readonly code: string;
  readonly name: string;
  readonly description?: string;
  readonly strategy: PutawayStrategy;
  readonly priority: number;
  readonly productId?: string;
  readonly skuId?: string;
  readonly warehouseId?: string;
  readonly zoneId?: string;
  readonly fixedLocationId?: string;
  readonly abcClass?: "A" | "B" | "C";
  readonly minimumTemperature?: number;
  readonly maximumTemperature?: number;
  readonly hazardousMaterialRequired?: boolean;
  readonly active: boolean;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreatePutawayRuleInput {
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  strategy: PutawayStrategy;
  priority?: number;
  productId?: string;
  skuId?: string;
  warehouseId?: string;
  zoneId?: string;
  fixedLocationId?: string;
  abcClass?: "A" | "B" | "C";
  minimumTemperature?: number;
  maximumTemperature?: number;
  hazardousMaterialRequired?: boolean;
  createdBy: string;
}
