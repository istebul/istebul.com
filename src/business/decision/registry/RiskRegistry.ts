/**
 * İSTEBUL Business Decision Engine — risk şablon kayıt sistemi.
 *
 * Henüz içerik eklenmez.
 */

import type { RiskTemplateDefinition } from './RiskRegistryTypes';

const RISKS: RiskTemplateDefinition[] = [];

export const RISK_REGISTRY: readonly RiskTemplateDefinition[] =
  Object.freeze(RISKS);

export function listRiskTemplates(): readonly RiskTemplateDefinition[] {
  return RISK_REGISTRY;
}

export function getRiskTemplateByCode(
  code: string
): RiskTemplateDefinition | undefined {
  return RISK_REGISTRY.find((entry) => entry.code === code);
}

export const RISK_REGISTRY_COUNT = RISK_REGISTRY.length;

export default RISK_REGISTRY;
