/**
 * İSTEBUL Business Decision Engine — ActionPlanRegistryRuntime (PR-103D).
 */

import type { ActionPlanDefinition } from './ActionPlanDefinition';
import { BUILTIN_ACTION_PLAN_DEFINITIONS } from './builtinDefinitions';

/**
 * Runtime Action Plan tanım kayıt sistemi.
 */
export class ActionPlanRegistryRuntime {
  private readonly byId = new Map<string, ActionPlanDefinition>();
  private readonly byRecommendationId = new Map<string, ActionPlanDefinition>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      for (const definition of BUILTIN_ACTION_PLAN_DEFINITIONS) {
        this.byId.set(definition.id, definition);
        if (definition.sourceRecommendationId) {
          this.byRecommendationId.set(
            definition.sourceRecommendationId,
            definition
          );
        }
      }
    }
  }

  register(definition: ActionPlanDefinition): void {
    if (!definition?.id || typeof definition.id !== 'string') {
      throw new Error('ActionPlanDefinition.id zorunludur.');
    }
    if (this.byId.has(definition.id)) {
      throw new Error(`Action Plan tanımı zaten kayıtlı: ${definition.id}`);
    }
    if (!definition.title || typeof definition.title !== 'string') {
      throw new Error(
        `ActionPlanDefinition.title zorunludur: ${definition.id}`
      );
    }
    this.byId.set(definition.id, definition);
    if (definition.sourceRecommendationId) {
      this.byRecommendationId.set(
        definition.sourceRecommendationId,
        definition
      );
    }
  }

  unregister(actionPlanId: string): boolean {
    const existing = this.byId.get(actionPlanId);
    if (!existing) {
      return false;
    }
    this.byId.delete(actionPlanId);
    if (existing.sourceRecommendationId) {
      this.byRecommendationId.delete(existing.sourceRecommendationId);
    }
    return true;
  }

  getById(actionPlanId: string): ActionPlanDefinition | undefined {
    return this.byId.get(actionPlanId);
  }

  getBySourceRecommendationId(
    recommendationId: string
  ): ActionPlanDefinition | undefined {
    return this.byRecommendationId.get(recommendationId);
  }

  getAll(): readonly ActionPlanDefinition[] {
    return Object.freeze(
      [...this.byId.values()].sort((a, b) => a.order - b.order)
    );
  }

  clear(): void {
    this.byId.clear();
    this.byRecommendationId.clear();
  }

  count(): number {
    return this.byId.size;
  }
}

export function createActionPlanRegistryRuntime(
  seedBuiltins = true
): ActionPlanRegistryRuntime {
  return new ActionPlanRegistryRuntime(seedBuiltins);
}

export default ActionPlanRegistryRuntime;
