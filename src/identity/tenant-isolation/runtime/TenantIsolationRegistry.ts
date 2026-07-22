/**
 * İSTEBUL Identity — TenantIsolationRegistry (PR-203E).
 */

import type { TenantIsolationModule } from './TenantIsolationModule';
import { BUILTIN_TENANT_ISOLATION_MODULES } from './builtinModules';

/**
 * Runtime Tenant Isolation kayıt sistemi.
 *
 * Yeni global state yoktur — instance bazlı Map.
 */
export class TenantIsolationRegistry {
  private readonly byId = new Map<string, TenantIsolationModule>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      for (const definition of BUILTIN_TENANT_ISOLATION_MODULES) {
        this.byId.set(definition.id, definition);
      }
    }
  }

  register(definition: TenantIsolationModule): void {
    if (!definition?.id || typeof definition.id !== 'string') {
      throw new Error('TenantIsolationModule.id zorunludur.');
    }
    if (this.byId.has(definition.id)) {
      throw new Error(`Tenant Isolation zaten kayıtlı: ${definition.id}`);
    }
    const tenantId = definition.tenantIdentity?.tenantId;
    if (!tenantId || typeof tenantId !== 'string') {
      throw new Error(
        `TenantIsolationModule.tenantIdentity.tenantId zorunludur: ${definition.id}`
      );
    }
    if (!definition.boundary?.boundaryId) {
      throw new Error(
        `TenantIsolationModule.boundary.boundaryId zorunludur: ${definition.id}`
      );
    }
    if (!Array.isArray(definition.memberships)) {
      throw new Error(
        `TenantIsolationModule.memberships bir dizi olmalıdır: ${definition.id}`
      );
    }
    if (!Array.isArray(definition.decisions)) {
      throw new Error(
        `TenantIsolationModule.decisions bir dizi olmalıdır: ${definition.id}`
      );
    }
    this.byId.set(definition.id, definition);
  }

  unregister(isolationId: string): boolean {
    return this.byId.delete(isolationId);
  }

  getById(isolationId: string): TenantIsolationModule | undefined {
    return this.byId.get(isolationId);
  }

  getAll(): readonly TenantIsolationModule[] {
    return Object.freeze(
      [...this.byId.values()].sort((a, b) => a.order - b.order)
    );
  }

  getByTenantId(tenantId: string): readonly TenantIsolationModule[] {
    return Object.freeze(
      this.getAll().filter(
        (item) => item.tenantIdentity.tenantId === tenantId
      )
    );
  }

  getByIdentityId(identityId: string): readonly TenantIsolationModule[] {
    return Object.freeze(
      this.getAll().filter(
        (item) =>
          item.primaryIdentityId === identityId ||
          item.memberships.some((m) => m.identityId === identityId)
      )
    );
  }

  clear(): void {
    this.byId.clear();
  }

  count(): number {
    return this.byId.size;
  }

  tenantCount(): number {
    const tenants = new Set<string>();
    for (const item of this.byId.values()) {
      tenants.add(item.tenantIdentity.tenantId);
    }
    return tenants.size;
  }

  membershipCount(): number {
    let total = 0;
    for (const item of this.byId.values()) {
      total += item.memberships.length;
    }
    return total;
  }

  decisionCount(): number {
    let total = 0;
    for (const item of this.byId.values()) {
      total += item.decisions.length;
    }
    return total;
  }
}

export function createTenantIsolationRegistry(
  seedBuiltins = true
): TenantIsolationRegistry {
  return new TenantIsolationRegistry(seedBuiltins);
}

/** Alias — RegistryRuntime adlandırma uyumu */
export { TenantIsolationRegistry as TenantIsolationRegistryRuntime };
export const createTenantIsolationRegistryRuntime =
  createTenantIsolationRegistry;

export default TenantIsolationRegistry;
