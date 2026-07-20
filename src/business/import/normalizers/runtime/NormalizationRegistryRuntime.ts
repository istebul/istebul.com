/**
 * İSTEBUL Business Import Engine — NormalizationRegistryRuntime (PR-101H).
 */

import type { NormalizationRule } from './NormalizationRule';
import { BUILTIN_NORMALIZATION_RULES } from './rules/builtinRules';

export class NormalizationRegistryRuntime {
  private readonly byId = new Map<string, NormalizationRule>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      for (const rule of BUILTIN_NORMALIZATION_RULES) {
        this.byId.set(rule.id, rule);
      }
    }
  }

  register(rule: NormalizationRule): void {
    if (!rule?.id || typeof rule.id !== 'string') {
      throw new Error('NormalizationRule.id zorunludur.');
    }
    if (this.byId.has(rule.id)) {
      throw new Error(`Normalization kuralı zaten kayıtlı: ${rule.id}`);
    }
    if (typeof rule.apply !== 'function') {
      throw new Error(`NormalizationRule.apply fonksiyon olmalıdır: ${rule.id}`);
    }
    this.byId.set(rule.id, rule);
  }

  unregister(ruleId: string): boolean {
    return this.byId.delete(ruleId);
  }

  getById(ruleId: string): NormalizationRule | undefined {
    return this.byId.get(ruleId);
  }

  getAll(): readonly NormalizationRule[] {
    return Object.freeze([...this.byId.values()]);
  }

  clear(): void {
    this.byId.clear();
  }

  count(): number {
    return this.byId.size;
  }
}

export function createNormalizationRegistryRuntime(
  seedBuiltins = true
): NormalizationRegistryRuntime {
  return new NormalizationRegistryRuntime(seedBuiltins);
}
