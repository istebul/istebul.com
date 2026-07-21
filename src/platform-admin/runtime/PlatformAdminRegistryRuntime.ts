/**
 * İSTEBUL Platform Admin — PlatformAdminRegistryRuntime (PR-201A).
 */

import type { PlatformAdminModule } from './PlatformAdminModule';
import { BUILTIN_PLATFORM_ADMIN_MODULES } from './builtinModules';

/**
 * Runtime Platform Admin modül kayıt sistemi.
 */
export class PlatformAdminRegistryRuntime {
  private readonly byId = new Map<string, PlatformAdminModule>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      for (const definition of BUILTIN_PLATFORM_ADMIN_MODULES) {
        this.byId.set(definition.id, definition);
      }
    }
  }

  register(definition: PlatformAdminModule): void {
    if (!definition?.id || typeof definition.id !== 'string') {
      throw new Error('PlatformAdminModule.id zorunludur.');
    }
    if (this.byId.has(definition.id)) {
      throw new Error(`Platform Admin modülü zaten kayıtlı: ${definition.id}`);
    }
    if (!definition.name || typeof definition.name !== 'string') {
      throw new Error(
        `PlatformAdminModule.name zorunludur: ${definition.id}`
      );
    }
    this.byId.set(definition.id, definition);
  }

  unregister(moduleId: string): boolean {
    return this.byId.delete(moduleId);
  }

  getById(moduleId: string): PlatformAdminModule | undefined {
    return this.byId.get(moduleId);
  }

  getAll(): readonly PlatformAdminModule[] {
    return Object.freeze(
      [...this.byId.values()].sort((a, b) => a.order - b.order)
    );
  }

  getByCategory(
    category: PlatformAdminModule['category']
  ): readonly PlatformAdminModule[] {
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

export function createPlatformAdminRegistryRuntime(
  seedBuiltins = true
): PlatformAdminRegistryRuntime {
  return new PlatformAdminRegistryRuntime(seedBuiltins);
}

export default PlatformAdminRegistryRuntime;
