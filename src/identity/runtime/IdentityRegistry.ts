/**
 * İSTEBUL Identity — IdentityRegistry (PR-203A).
 */

import type { IdentityModule, IdentityStatus } from './IdentityModule';
import { BUILTIN_IDENTITY_MODULES } from './builtinModules';

/**
 * Runtime Identity kayıt sistemi.
 *
 * Platform Admin ve Business Admin tarafından ortak kullanılır.
 * Yeni global state yoktur — instance bazlı Map.
 */
export class IdentityRegistry {
  private readonly byId = new Map<string, IdentityModule>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      for (const definition of BUILTIN_IDENTITY_MODULES) {
        this.byId.set(definition.id, definition);
      }
    }
  }

  register(definition: IdentityModule): void {
    if (!definition?.id || typeof definition.id !== 'string') {
      throw new Error('IdentityModule.id zorunludur.');
    }
    if (this.byId.has(definition.id)) {
      throw new Error(`Identity zaten kayıtlı: ${definition.id}`);
    }
    if (!definition.user?.id || typeof definition.user.id !== 'string') {
      throw new Error(`IdentityModule.user.id zorunludur: ${definition.id}`);
    }
    if (!definition.tenant?.id || typeof definition.tenant.id !== 'string') {
      throw new Error(`IdentityModule.tenant.id zorunludur: ${definition.id}`);
    }
    this.byId.set(definition.id, definition);
  }

  unregister(identityId: string): boolean {
    return this.byId.delete(identityId);
  }

  getById(identityId: string): IdentityModule | undefined {
    return this.byId.get(identityId);
  }

  getAll(): readonly IdentityModule[] {
    return Object.freeze(
      [...this.byId.values()].sort((a, b) => a.order - b.order)
    );
  }

  getByTenantId(tenantId: string): readonly IdentityModule[] {
    return Object.freeze(
      this.getAll().filter((item) => item.tenant.id === tenantId)
    );
  }

  getByStatus(status: IdentityStatus): readonly IdentityModule[] {
    return Object.freeze(
      this.getAll().filter((item) => item.status === status)
    );
  }

  clear(): void {
    this.byId.clear();
  }

  count(): number {
    return this.byId.size;
  }

  /**
   * Kayıtlı kimliklerdeki toplam rol sayısı.
   */
  roleCount(): number {
    let total = 0;
    for (const item of this.byId.values()) {
      total += item.roles.length;
    }
    return total;
  }

  /**
   * Kayıtlı kimliklerdeki toplam izin sayısı.
   */
  permissionCount(): number {
    let total = 0;
    for (const item of this.byId.values()) {
      total += item.permissions.length;
    }
    return total;
  }
}

export function createIdentityRegistry(seedBuiltins = true): IdentityRegistry {
  return new IdentityRegistry(seedBuiltins);
}

/** Alias — Architecture Freeze ile uyumlu RegistryRuntime adlandırma */
export { IdentityRegistry as IdentityRegistryRuntime };
export const createIdentityRegistryRuntime = createIdentityRegistry;

export default IdentityRegistry;
