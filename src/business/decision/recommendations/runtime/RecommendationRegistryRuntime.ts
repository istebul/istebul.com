/**
 * İSTEBUL Business Decision Engine — RecommendationRegistryRuntime (PR-103C).
 */

import type { RecommendationDefinition } from './RecommendationDefinition';
import { BUILTIN_RECOMMENDATION_DEFINITIONS } from './builtinDefinitions';

/**
 * Runtime recommendation tanım kayıt sistemi.
 */
export class RecommendationRegistryRuntime {
  private readonly byId = new Map<string, RecommendationDefinition>();
  private readonly byPolicyId = new Map<string, RecommendationDefinition>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      for (const definition of BUILTIN_RECOMMENDATION_DEFINITIONS) {
        this.byId.set(definition.id, definition);
        if (definition.sourcePolicyId) {
          this.byPolicyId.set(definition.sourcePolicyId, definition);
        }
      }
    }
  }

  register(definition: RecommendationDefinition): void {
    if (!definition?.id || typeof definition.id !== 'string') {
      throw new Error('RecommendationDefinition.id zorunludur.');
    }
    if (this.byId.has(definition.id)) {
      throw new Error(`Recommendation tanımı zaten kayıtlı: ${definition.id}`);
    }
    if (!definition.title || typeof definition.title !== 'string') {
      throw new Error(
        `RecommendationDefinition.title zorunludur: ${definition.id}`
      );
    }
    this.byId.set(definition.id, definition);
    if (definition.sourcePolicyId) {
      this.byPolicyId.set(definition.sourcePolicyId, definition);
    }
  }

  unregister(recommendationId: string): boolean {
    const existing = this.byId.get(recommendationId);
    if (!existing) {
      return false;
    }
    this.byId.delete(recommendationId);
    if (existing.sourcePolicyId) {
      this.byPolicyId.delete(existing.sourcePolicyId);
    }
    return true;
  }

  getById(recommendationId: string): RecommendationDefinition | undefined {
    return this.byId.get(recommendationId);
  }

  getBySourcePolicyId(policyId: string): RecommendationDefinition | undefined {
    return this.byPolicyId.get(policyId);
  }

  getAll(): readonly RecommendationDefinition[] {
    return Object.freeze(
      [...this.byId.values()].sort((a, b) => a.order - b.order)
    );
  }

  getByCategory(
    category: RecommendationDefinition['category']
  ): readonly RecommendationDefinition[] {
    return Object.freeze(
      this.getAll().filter((item) => item.category === category)
    );
  }

  clear(): void {
    this.byId.clear();
    this.byPolicyId.clear();
  }

  count(): number {
    return this.byId.size;
  }
}

export function createRecommendationRegistryRuntime(
  seedBuiltins = true
): RecommendationRegistryRuntime {
  return new RecommendationRegistryRuntime(seedBuiltins);
}

export default RecommendationRegistryRuntime;
