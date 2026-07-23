/**
 * İSTEBUL Business Analysis Engine — bulgu şablon kayıt sistemi.
 *
 * Henüz bulgu şablonu eklenmez.
 */

import type { FindingTemplateDefinition } from './FindingRegistryTypes';

const FINDINGS: FindingTemplateDefinition[] = [];

export const FINDING_REGISTRY: readonly FindingTemplateDefinition[] =
  Object.freeze(FINDINGS);

export function listFindingTemplates(): readonly FindingTemplateDefinition[] {
  return FINDING_REGISTRY;
}

export function getFindingTemplateByCode(
  code: string
): FindingTemplateDefinition | undefined {
  return FINDING_REGISTRY.find((entry) => entry.code === code);
}

export const FINDING_REGISTRY_COUNT = FINDING_REGISTRY.length;

export default FINDING_REGISTRY;
