/**
 * İSTEBUL Business Admin — BusinessAdminRegistryRuntime (PR-202A).
 */

import type { BusinessAdminModule } from './BusinessAdminModule';
import { BUILTIN_BUSINESS_ADMIN_MODULES } from './builtinModules';

/**
 * Runtime Business Admin modül kayıt sistemi.
 */
export class BusinessAdminRegistryRuntime {
  private readonly byId = new Map<string, BusinessAdminModule>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      for (const definition of BUILTIN_BUSINESS_ADMIN_MODULES) {
        this.byId.set(definition.id, definition);
      }
    }
  }

  register(definition: BusinessAdminModule): void {
    if (!definition?.id || typeof definition.id !== 'string') {
      throw new Error('BusinessAdminModule.id zorunludur.');
    }
    if (this.byId.has(definition.id)) {
      throw new Error(`Business Admin modülü zaten kayıtlı: ${definition.id}`);
    }
    if (!definition.name || typeof definition.name !== 'string') {
      throw new Error(
        `BusinessAdminModule.name zorunludur: ${definition.id}`
      );
    }
    this.byId.set(definition.id, definition);
  }

  unregister(moduleId: string): boolean {
    return this.byId.delete(moduleId);
  }

  getById(moduleId: string): BusinessAdminModule | undefined {
    return this.byId.get(moduleId);
  }

  getAll(): readonly BusinessAdminModule[] {
    return Object.freeze(
      [...this.byId.values()].sort((a, b) => a.order - b.order)
    );
  }

  getByCategory(
    category: BusinessAdminModule['category']
  ): readonly BusinessAdminModule[] {
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

export function createBusinessAdminRegistryRuntime(
  seedBuiltins = true
): BusinessAdminRegistryRuntime {
  return new BusinessAdminRegistryRuntime(seedBuiltins);
}

export default BusinessAdminRegistryRuntime;
