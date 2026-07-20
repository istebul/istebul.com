/**
 * İSTEBUL Business Decision Engine — PolicyRegistryRuntime (PR-103B).
 */

import type { PolicyDefinition } from './PolicyDefinition';
import { BUILTIN_POLICY_DEFINITIONS } from './builtinDefinitions';

/**
 * Runtime politika kayıt sistemi.
 */
export class PolicyRegistryRuntime {
  private readonly byId = new Map<string, PolicyDefinition>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      for (const definition of BUILTIN_POLICY_DEFINITIONS) {
        this.byId.set(definition.id, definition);
      }
    }
  }

  register(definition: PolicyDefinition): void {
    if (!definition?.id || typeof definition.id !== 'string') {
      throw new Error('PolicyDefinition.id zorunludur.');
    }
    if (this.byId.has(definition.id)) {
      throw new Error(`Politika tanımı zaten kayıtlı: ${definition.id}`);
    }
    if (!definition.name || typeof definition.name !== 'string') {
      throw new Error(`PolicyDefinition.name zorunludur: ${definition.id}`);
    }
    this.byId.set(definition.id, definition);
  }

  unregister(policyId: string): boolean {
    return this.byId.delete(policyId);
  }

  getById(policyId: string): PolicyDefinition | undefined {
    return this.byId.get(policyId);
  }

  getAll(): readonly PolicyDefinition[] {
    return Object.freeze(
      [...this.byId.values()].sort((a, b) => a.order - b.order)
    );
  }

  getEnabled(): readonly PolicyDefinition[] {
    return Object.freeze(this.getAll().filter((item) => item.enabled));
  }

  getByCategory(
    category: PolicyDefinition['category']
  ): readonly PolicyDefinition[] {
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

export function createPolicyRegistryRuntime(
  seedBuiltins = true
): PolicyRegistryRuntime {
  return new PolicyRegistryRuntime(seedBuiltins);
}

export default PolicyRegistryRuntime;
