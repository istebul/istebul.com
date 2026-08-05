import type {
  PackingContainer,
} from "./PackingContainer";
import type {
  PackingStrategy,
} from "./PackingStrategy";

export interface PackingSuggestionScore {
  readonly weightScore: number;
  readonly volumeScore: number;
  readonly compatibilityScore: number;
  readonly utilizationScore: number;
  readonly strategyScore: number;
  readonly totalScore: number;
}

export interface PackingSuggestion {
  readonly id: string;
  readonly tenantId: string;
  readonly packingId: string;
  readonly packingItemIds: readonly string[];
  readonly containerId: string;
  readonly strategy: PackingStrategy;
  readonly container: PackingContainer;
  readonly suggestedPackageCount: number;
  readonly estimatedWeight: number;
  readonly estimatedVolume: number;
  readonly score: PackingSuggestionScore;
  readonly reasons: readonly string[];
  readonly warnings: readonly string[];
  readonly selected: boolean;
  readonly createdAt: string;
}

export interface CreatePackingSuggestionInput {
  tenantId: string;
  packingId: string;
  packingItemIds: readonly string[];
  strategy: PackingStrategy;
  containers: readonly PackingContainer[];
}
