/**
 * İSTEBUL Business Analysis Engine — FindingRegistryRuntime (PR-102D).
 */

import type { FindingDefinition } from './FindingDefinition';
import { BUILTIN_FINDING_DEFINITIONS } from './builtinDefinitions';

/**
 * Runtime finding tanım kayıt sistemi.
 */
export class FindingRegistryRuntime {
  private readonly byId = new Map<string, FindingDefinition>();
  private readonly byRuleId = new Map<string, FindingDefinition>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      for (const definition of BUILTIN_FINDING_DEFINITIONS) {
        this.byId.set(definition.id, definition);
        if (definition.sourceRuleId) {
          this.byRuleId.set(definition.sourceRuleId, definition);
        }
      }
    }
  }

  register(definition: FindingDefinition): void {
    if (!definition?.id || typeof definition.id !== 'string') {
      throw new Error('FindingDefinition.id zorunludur.');
    }
    if (this.byId.has(definition.id)) {
      throw new Error(`Finding tanımı zaten kayıtlı: ${definition.id}`);
    }
    if (!definition.title || typeof definition.title !== 'string') {
      throw new Error(`FindingDefinition.title zorunludur: ${definition.id}`);
    }
    this.byId.set(definition.id, definition);
    if (definition.sourceRuleId) {
      this.byRuleId.set(definition.sourceRuleId, definition);
    }
  }

  unregister(findingId: string): boolean {
    const existing = this.byId.get(findingId);
    if (!existing) {
      return false;
    }
    this.byId.delete(findingId);
    if (existing.sourceRuleId) {
      this.byRuleId.delete(existing.sourceRuleId);
    }
    return true;
  }

  getById(findingId: string): FindingDefinition | undefined {
    return this.byId.get(findingId);
  }

  getBySourceRuleId(ruleId: string): FindingDefinition | undefined {
    return this.byRuleId.get(ruleId);
  }

  getAll(): readonly FindingDefinition[] {
    return Object.freeze(
      [...this.byId.values()].sort((a, b) => a.order - b.order)
    );
  }

  getByCategory(
    category: FindingDefinition['category']
  ): readonly FindingDefinition[] {
    return Object.freeze(
      this.getAll().filter((item) => item.category === category)
    );
  }

  clear(): void {
    this.byId.clear();
    this.byRuleId.clear();
  }

  count(): number {
    return this.byId.size;
  }
}

export function createFindingRegistryRuntime(
  seedBuiltins = true
): FindingRegistryRuntime {
  return new FindingRegistryRuntime(seedBuiltins);
}

export default FindingRegistryRuntime;
