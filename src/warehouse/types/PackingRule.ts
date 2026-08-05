import type {
  PackingContainerType,
} from "./PackingContainer";
import type {
  PackingStrategy,
} from "./PackingStrategy";

export interface PackingRule {
  readonly id: string;
  readonly tenantId: string;
  readonly code: string;
  readonly name: string;
  readonly description?: string;
  readonly strategy: PackingStrategy;
  readonly priority: number;
  readonly productId?: string;
  readonly skuId?: string;
  readonly warehouseId?: string;
  readonly containerType?: PackingContainerType;
  readonly minimumWeight?: number;
  readonly maximumWeight?: number;
  readonly minimumVolume?: number;
  readonly maximumVolume?: number;
  readonly weightUnit?: "g" | "kg";
  readonly volumeUnit?: "cm3" | "m3";
  readonly temperatureControlledRequired?: boolean;
  readonly hazardousMaterialAllowed?: boolean;
  readonly mixedSkuAllowed?: boolean;
  readonly sealRequired?: boolean;
  readonly labelRequired?: boolean;
  readonly active: boolean;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreatePackingRuleInput {
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  strategy: PackingStrategy;
  priority?: number;
  productId?: string;
  skuId?: string;
  warehouseId?: string;
  containerType?: PackingContainerType;
  minimumWeight?: number;
  maximumWeight?: number;
  minimumVolume?: number;
  maximumVolume?: number;
  weightUnit?: "g" | "kg";
  volumeUnit?: "cm3" | "m3";
  temperatureControlledRequired?: boolean;
  hazardousMaterialAllowed?: boolean;
  mixedSkuAllowed?: boolean;
  sealRequired?: boolean;
  labelRequired?: boolean;
  createdBy: string;
}
