/**
 * İSTEBUL Business Import Engine — SemanticRegistryRuntime (PR-101G).
 */

import type { SemanticRule } from './SemanticRule';
import { BUILTIN_SEMANTIC_RULES } from './rules/builtinRules';

/**
 * Semantic kural kayıt sistemi.
 */
export class SemanticRegistryRuntime {
  private readonly byId = new Map<string, SemanticRule>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      for (const rule of BUILTIN_SEMANTIC_RULES) {
        this.byId.set(rule.id, rule);
      }
    }
  }

  register(rule: SemanticRule): void {
    if (!rule?.id || typeof rule.id !== 'string') {
      throw new Error('SemanticRule.id zorunludur.');
    }
    if (this.byId.has(rule.id)) {
      throw new Error(`Semantic kuralı zaten kayıtlı: ${rule.id}`);
    }
    if (typeof rule.match !== 'function') {
      throw new Error(`SemanticRule.match fonksiyon olmalıdır: ${rule.id}`);
    }
    this.byId.set(rule.id, rule);
  }

  unregister(ruleId: string): boolean {
    return this.byId.delete(ruleId);
  }

  getById(ruleId: string): SemanticRule | undefined {
    return this.byId.get(ruleId);
  }

  getAll(): readonly SemanticRule[] {
    return Object.freeze([...this.byId.values()]);
  }

  clear(): void {
    this.byId.clear();
  }

  count(): number {
    return this.byId.size;
  }
}

export function createSemanticRegistryRuntime(
  seedBuiltins = true
): SemanticRegistryRuntime {
  return new SemanticRegistryRuntime(seedBuiltins);
}
