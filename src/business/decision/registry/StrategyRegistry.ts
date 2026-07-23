/**
 * İSTEBUL Business Decision Engine — strateji kayıt sistemi.
 *
 * Henüz içerik eklenmez.
 */

import type { DecisionStrategyDefinition } from '../strategies/DecisionStrategyContract';

const STRATEGIES: DecisionStrategyDefinition[] = [];

export const STRATEGY_REGISTRY: readonly DecisionStrategyDefinition[] =
  Object.freeze(STRATEGIES);

export function listStrategies(): readonly DecisionStrategyDefinition[] {
  return STRATEGY_REGISTRY;
}

export function getStrategyById(
  id: string
): DecisionStrategyDefinition | undefined {
  return STRATEGY_REGISTRY.find((entry) => entry.id === id);
}

export const STRATEGY_REGISTRY_COUNT = STRATEGY_REGISTRY.length;

export default STRATEGY_REGISTRY;
