/**
 * İSTEBUL Business Decision Engine — karar profil kayıt sistemi.
 *
 * Henüz içerik eklenmez.
 */

import type { DecisionDefinitionEntry } from './DecisionRegistryTypes';

const DECISIONS: DecisionDefinitionEntry[] = [];

export const DECISION_REGISTRY: readonly DecisionDefinitionEntry[] =
  Object.freeze(DECISIONS);

export function listDecisions(): readonly DecisionDefinitionEntry[] {
  return DECISION_REGISTRY;
}

export function getDecisionById(
  id: string
): DecisionDefinitionEntry | undefined {
  return DECISION_REGISTRY.find((entry) => entry.id === id);
}

export const DECISION_REGISTRY_COUNT = DECISION_REGISTRY.length;

export default DECISION_REGISTRY;
