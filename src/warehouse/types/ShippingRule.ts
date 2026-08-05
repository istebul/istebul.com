import type {
  ShippingStrategy,
} from "./ShippingStrategy";

export interface ShippingRule {
  readonly id: string;
  readonly tenantId: string;
  readonly code: string;
  readonly name: string;
  readonly description?: string;

  readonly warehouseId?: string;
  readonly carrierId?: string;
  readonly serviceLevelId?: string;

  readonly strategy?: ShippingStrategy;

  readonly minimumWeight?: number;
  readonly maximumWeight?: number;
  readonly minimumVolume?: number;
  readonly maximumVolume?: number;

  readonly temperatureControlled?: boolean;
  readonly hazardousMaterial?: boolean;
  readonly international?: boolean;

  readonly priority: number;
  readonly active: boolean;

  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
