/**
 * İSTEBUL Platform Admin — TenantRegistryRuntime (PR-201B).
 */

import type { TenantDefinition } from './Tenant';
import { BUILTIN_TENANT_DEFINITIONS } from './builtinTenants';

/**
 * Runtime Tenant kayıt sistemi.
 */
export class TenantRegistryRuntime {
  private readonly byId = new Map<string, TenantDefinition>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      for (const definition of BUILTIN_TENANT_DEFINITIONS) {
        this.byId.set(definition.identity.id, definition);
      }
    }
  }

  register(definition: TenantDefinition): void {
    const id = definition?.identity?.id;
    if (!id || typeof id !== 'string') {
      throw new Error('TenantDefinition.identity.id zorunludur.');
    }
    if (this.byId.has(id)) {
      throw new Error(`Tenant zaten kayıtlı: ${id}`);
    }
    if (
      !definition.identity.slug ||
      typeof definition.identity.slug !== 'string'
    ) {
      throw new Error(`TenantDefinition.identity.slug zorunludur: ${id}`);
    }
    this.byId.set(id, definition);
  }

  unregister(tenantId: string): boolean {
    return this.byId.delete(tenantId);
  }

  getById(tenantId: string): TenantDefinition | undefined {
    return this.byId.get(tenantId);
  }

  getAll(): readonly TenantDefinition[] {
    return Object.freeze(
      [...this.byId.values()].sort((a, b) =>
        a.identity.id.localeCompare(b.identity.id)
      )
    );
  }

  getByStatus(
    status: TenantDefinition['status']
  ): readonly TenantDefinition[] {
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
}

export function createTenantRegistryRuntime(
  seedBuiltins = true
): TenantRegistryRuntime {
  return new TenantRegistryRuntime(seedBuiltins);
}

export default TenantRegistryRuntime;
