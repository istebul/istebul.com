/**
 * İSTEBUL Business Analysis Engine — RuleRegistryRuntime (PR-102C).
 */

import type { RuleDefinition } from './RuleDefinition';
import { BUILTIN_RULE_DEFINITIONS } from './builtinDefinitions';

/**
 * Runtime kural kayıt sistemi.
 */
export class RuleRegistryRuntime {
  private readonly byId = new Map<string, RuleDefinition>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      for (const definition of BUILTIN_RULE_DEFINITIONS) {
        this.byId.set(definition.id, definition);
      }
    }
  }

  register(definition: RuleDefinition): void {
    if (!definition?.id || typeof definition.id !== 'string') {
      throw new Error('RuleDefinition.id zorunludur.');
    }
    if (this.byId.has(definition.id)) {
      throw new Error(`Kural tanımı zaten kayıtlı: ${definition.id}`);
    }
    if (!definition.name || typeof definition.name !== 'string') {
      throw new Error(`RuleDefinition.name zorunludur: ${definition.id}`);
    }
    this.byId.set(definition.id, definition);
  }

  unregister(ruleId: string): boolean {
    return this.byId.delete(ruleId);
  }

  getById(ruleId: string): RuleDefinition | undefined {
    return this.byId.get(ruleId);
  }

  getAll(): readonly RuleDefinition[] {
    return Object.freeze(
      [...this.byId.values()].sort((a, b) => a.order - b.order)
    );
  }

  getEnabled(): readonly RuleDefinition[] {
    return Object.freeze(this.getAll().filter((item) => item.enabled));
  }

  getByCategory(
    category: RuleDefinition['category']
  ): readonly RuleDefinition[] {
    return Object.freeze(
      this.getAll().filter((item) => item.category === category)
    );
  }

  clear(): void {
    this.byId.clear();
  }

  count(): number {
    return this.byId.size;
  }
}

export function createRuleRegistryRuntime(
  seedBuiltins = true
): RuleRegistryRuntime {
  return new RuleRegistryRuntime(seedBuiltins);
}

export default RuleRegistryRuntime;
