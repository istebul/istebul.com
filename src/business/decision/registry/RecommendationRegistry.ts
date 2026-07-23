/**
 * İSTEBUL Business Decision Engine — öneri şablon kayıt sistemi.
 *
 * Henüz içerik eklenmez.
 */

import type { RecommendationTemplateDefinition } from './RecommendationRegistryTypes';

const RECOMMENDATIONS: RecommendationTemplateDefinition[] = [];

export const RECOMMENDATION_REGISTRY: readonly RecommendationTemplateDefinition[] =
  Object.freeze(RECOMMENDATIONS);

export function listRecommendationTemplates(): readonly RecommendationTemplateDefinition[] {
  return RECOMMENDATION_REGISTRY;
}

export function getRecommendationTemplateByCode(
  code: string
): RecommendationTemplateDefinition | undefined {
  return RECOMMENDATION_REGISTRY.find((entry) => entry.code === code);
}

export const RECOMMENDATION_REGISTRY_COUNT = RECOMMENDATION_REGISTRY.length;

export default RECOMMENDATION_REGISTRY;
