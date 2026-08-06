import type {
  WaveStrategy,
} from "./WaveStrategy";

export interface WaveRule {
  readonly id: string;
  readonly tenantId: string;
  readonly code: string;
  readonly name: string;
  readonly description?: string;
  readonly warehouseId?: string;
  readonly zoneId?: string;
  readonly routeId?: string;
  readonly carrierId?: string;
  readonly serviceLevel?: string;
  readonly temperatureZone?: string;
  readonly strategy: WaveStrategy;
  readonly maximumOrders?: number;
  readonly maximumLines?: number;
  readonly maximumItems?: number;
  readonly maximumWeight?: number;
  readonly maximumVolume?: number;
  readonly maximumEstimatedMinutes?: number;
  readonly cutoffBufferMinutes?: number;
  readonly minimumPriority?: number;
  readonly automaticPlanning: boolean;
  readonly automaticRelease: boolean;
  readonly allowPartialRelease: boolean;
  readonly priority: number;
  readonly active: boolean;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateWaveRuleInput {
  tenantId: string;
  code: string;
  name: string;
  strategy: WaveStrategy;
  createdBy: string;
  description?: string;
  warehouseId?: string;
  zoneId?: string;
  routeId?: string;
  carrierId?: string;
  serviceLevel?: string;
  temperatureZone?: string;
  maximumOrders?: number;
  maximumLines?: number;
  maximumItems?: number;
  maximumWeight?: number;
  maximumVolume?: number;
  maximumEstimatedMinutes?: number;
  cutoffBufferMinutes?: number;
  minimumPriority?: number;
  automaticPlanning?: boolean;
  automaticRelease?: boolean;
  allowPartialRelease?: boolean;
  priority?: number;
}
