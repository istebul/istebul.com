/**
 * İSTEBUL Business Analysis Engine — kural kayıt sistemi.
 *
 * Henüz kural içeriği eklenmez.
 */

import type { AnalysisRuleDefinition } from '../rules/AnalysisRuleContract';

const RULES: AnalysisRuleDefinition[] = [];

export const RULE_REGISTRY: readonly AnalysisRuleDefinition[] =
  Object.freeze(RULES);

export function listRules(): readonly AnalysisRuleDefinition[] {
  return RULE_REGISTRY;
}

export function getRuleById(
  id: string
): AnalysisRuleDefinition | undefined {
  return RULE_REGISTRY.find((rule) => rule.id === id);
}

export const RULE_REGISTRY_COUNT = RULE_REGISTRY.length;

export default RULE_REGISTRY;
