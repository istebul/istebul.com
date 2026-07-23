/**
 * İSTEBUL Business Import Engine — ValidationRegistryRuntime (PR-101C).
 */

import type { ValidationRule } from './ValidationRule';
import { BUILTIN_VALIDATION_RULES } from './rules/builtinRules';

/**
 * Validation kural kayıt sistemi.
 */
export class ValidationRegistryRuntime {
  private readonly byId = new Map<string, ValidationRule>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      for (const rule of BUILTIN_VALIDATION_RULES) {
        this.byId.set(rule.id, rule);
      }
    }
  }

  register(rule: ValidationRule): void {
    if (!rule?.id || typeof rule.id !== 'string') {
      throw new Error('ValidationRule.id zorunludur.');
    }
    if (this.byId.has(rule.id)) {
      throw new Error(`Validation kuralı zaten kayıtlı: ${rule.id}`);
    }
    if (typeof rule.validate !== 'function') {
      throw new Error(`ValidationRule.validate fonksiyon olmalıdır: ${rule.id}`);
    }
    this.byId.set(rule.id, rule);
  }

  unregister(ruleId: string): boolean {
    return this.byId.delete(ruleId);
  }

  getById(ruleId: string): ValidationRule | undefined {
    return this.byId.get(ruleId);
  }

  getAll(): readonly ValidationRule[] {
    return Object.freeze([...this.byId.values()]);
  }

  clear(): void {
    this.byId.clear();
  }

  count(): number {
    return this.byId.size;
  }
}

export function createValidationRegistryRuntime(
  seedBuiltins = true
): ValidationRegistryRuntime {
  return new ValidationRegistryRuntime(seedBuiltins);
}
