import type { PutawayStrategy } from "./PutawayStrategy";

export interface PutawaySuggestionScore {
  readonly capacityScore: number;
  readonly distanceScore: number;
  readonly compatibilityScore: number;
  readonly strategyScore: number;
  readonly totalScore: number;
}

export interface PutawaySuggestion {
  readonly id: string;
  readonly tenantId: string;
  readonly putawayId: string;
  readonly putawayItemId: string;
  readonly warehouseId: string;
  readonly sourceLocationId: string;
  readonly targetLocationId: string;
  readonly strategy: PutawayStrategy;
  readonly suggestedQuantity: number;
  readonly unit: string;
  readonly availableCapacity?: number;
  readonly distance?: number;
  readonly score: PutawaySuggestionScore;
  readonly reasons: readonly string[];
  readonly warnings: readonly string[];
  readonly selected: boolean;
  readonly createdAt: string;
}

export interface CreatePutawaySuggestionInput {
  tenantId: string;
  putawayId: string;
  putawayItemId: string;
  warehouseId: string;
  sourceLocationId: string;
  targetLocationId: string;
  strategy: PutawayStrategy;
  suggestedQuantity: number;
  unit: string;
  availableCapacity?: number;
  distance?: number;
  score: PutawaySuggestionScore;
  reasons?: readonly string[];
  warnings?: readonly string[];
}
