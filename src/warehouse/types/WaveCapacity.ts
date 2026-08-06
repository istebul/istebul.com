export interface WaveCapacity {
  readonly tenantId: string;
  readonly warehouseId: string;
  readonly waveId?: string;
  readonly availableLaborMinutes: number;
  readonly requiredLaborMinutes: number;
  readonly availableEquipmentMinutes: number;
  readonly requiredEquipmentMinutes: number;
  readonly availableOrderCapacity: number;
  readonly requiredOrderCapacity: number;
  readonly availableLineCapacity: number;
  readonly requiredLineCapacity: number;
  readonly availableItemCapacity: number;
  readonly requiredItemCapacity: number;
  readonly availableWeightCapacity?: number;
  readonly requiredWeightCapacity?: number;
  readonly availableVolumeCapacity?: number;
  readonly requiredVolumeCapacity?: number;
  readonly laborUtilizationRate: number;
  readonly equipmentUtilizationRate: number;
  readonly orderUtilizationRate: number;
  readonly lineUtilizationRate: number;
  readonly itemUtilizationRate: number;
  readonly overallUtilizationRate: number;
  readonly feasible: boolean;
  readonly blockingReasons: readonly string[];
  readonly warnings: readonly string[];
  readonly calculatedAt: string;
}

export interface WaveCapacityInput {
  tenantId: string;
  warehouseId: string;
  waveId?: string;
  availableLaborMinutes: number;
  requiredLaborMinutes: number;
  availableEquipmentMinutes: number;
  requiredEquipmentMinutes: number;
  availableOrderCapacity: number;
  requiredOrderCapacity: number;
  availableLineCapacity: number;
  requiredLineCapacity: number;
  availableItemCapacity: number;
  requiredItemCapacity: number;
  availableWeightCapacity?: number;
  requiredWeightCapacity?: number;
  availableVolumeCapacity?: number;
  requiredVolumeCapacity?: number;
}
