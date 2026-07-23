/**
 * İSTEBUL Platform Admin — UserRegistryRuntime (PR-201C).
 */

import type { UserDefinition } from './User';
import { BUILTIN_USER_DEFINITIONS } from './builtinUsers';

/**
 * Runtime User kayıt sistemi.
 */
export class UserRegistryRuntime {
  private readonly byId = new Map<string, UserDefinition>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      for (const definition of BUILTIN_USER_DEFINITIONS) {
        this.byId.set(definition.identity.id, definition);
      }
    }
  }

  register(definition: UserDefinition): void {
    const id = definition?.identity?.id;
    if (!id || typeof id !== 'string') {
      throw new Error('UserDefinition.identity.id zorunludur.');
    }
    if (this.byId.has(id)) {
      throw new Error(`User zaten kayıtlı: ${id}`);
    }
    if (!definition.email || typeof definition.email !== 'string') {
      throw new Error(`UserDefinition.email zorunludur: ${id}`);
    }
    if (!definition.displayName || typeof definition.displayName !== 'string') {
      throw new Error(`UserDefinition.displayName zorunludur: ${id}`);
    }
    this.byId.set(id, definition);
  }

  unregister(userId: string): boolean {
    return this.byId.delete(userId);
  }

  getById(userId: string): UserDefinition | undefined {
    return this.byId.get(userId);
  }

  getAll(): readonly UserDefinition[] {
    return Object.freeze(
      [...this.byId.values()].sort((a, b) =>
        a.identity.id.localeCompare(b.identity.id)
      )
    );
  }

  getByStatus(status: UserDefinition['status']): readonly UserDefinition[] {
    return Object.freeze(
      this.getAll().filter((item) => item.status === status)
    );
  }

  getByTenantId(tenantId: string): readonly UserDefinition[] {
    return Object.freeze(
      this.getAll().filter(
        (item) => item.tenantReference.tenantId === tenantId
      )
    );
  }

  clear(): void {
    this.byId.clear();
  }

  count(): number {
    return this.byId.size;
  }
}

export function createUserRegistryRuntime(
  seedBuiltins = true
): UserRegistryRuntime {
  return new UserRegistryRuntime(seedBuiltins);
}

export default UserRegistryRuntime;
