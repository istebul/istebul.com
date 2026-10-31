/**
 * İSTEBUL Identity — AuthorizationRegistry (PR-203D).
 */

import {
  freezeAuthorizationModule,
  type AuthorizationModule
} from './AuthorizationModule';
import { BUILTIN_AUTHORIZATION_MODULES } from './builtinModules';

/**
 * Runtime Authorization kayıt sistemi.
 *
 * Yeni global state yoktur — instance bazlı Map.
 */
export class AuthorizationRegistry {
  private readonly byId = new Map<string, AuthorizationModule>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      for (const definition of BUILTIN_AUTHORIZATION_MODULES) {
        this.byId.set(definition.id, definition);
      }
    }
  }

  register(definition: AuthorizationModule): void {
    if (
      !definition ||
      typeof definition.id !== 'string' ||
      !definition.id.trim() ||
      definition.id !== definition.id.trim()
    ) {
      throw new Error('AuthorizationModule.id zorunludur.');
    }

    if (this.byId.has(definition.id)) {
      throw new Error(`Authorization zaten kayıtlı: ${definition.id}`);
    }

    if (
      typeof definition.identityId !== 'string' ||
      !definition.identityId.trim() ||
      definition.identityId !== definition.identityId.trim()
    ) {
      throw new Error(
        `AuthorizationModule.identityId zorunludur: ${definition.id}`
      );
    }

    if (
      typeof definition.principalId !== 'string' ||
      !definition.principalId.trim() ||
      definition.principalId !== definition.principalId.trim()
    ) {
      throw new Error(
        `AuthorizationModule.principalId zorunludur: ${definition.id}`
      );
    }

    if (!Array.isArray(definition.roles)) {
      throw new Error(
        `AuthorizationModule.roles bir dizi olmalıdır: ${definition.id}`
      );
    }

    if (!Array.isArray(definition.permissions)) {
      throw new Error(
        `AuthorizationModule.permissions bir dizi olmalıdır: ${definition.id}`
      );
    }

    if (!Array.isArray(definition.policies)) {
      throw new Error(
        `AuthorizationModule.policies bir dizi olmalıdır: ${definition.id}`
      );
    }

    if (!Array.isArray(definition.decisions)) {
      throw new Error(
        `AuthorizationModule.decisions bir dizi olmalıdır: ${definition.id}`
      );
    }

    if (!Number.isSafeInteger(definition.order) || definition.order < 1) {
      throw new Error(
        `AuthorizationModule.order pozitif güvenli bir tam sayı olmalıdır: ${definition.id}`
      );
    }

    this.byId.set(definition.id, freezeAuthorizationModule(definition));
  }

  unregister(authorizationId: string): boolean {
    return this.byId.delete(authorizationId);
  }

  getById(authorizationId: string): AuthorizationModule | undefined {
    return this.byId.get(authorizationId);
  }

  getAll(): readonly AuthorizationModule[] {
    return Object.freeze(
      [...this.byId.values()].sort((a, b) => a.order - b.order)
    );
  }

  getByIdentityId(identityId: string): readonly AuthorizationModule[] {
    return Object.freeze(
      this.getAll().filter((item) => item.identityId === identityId)
    );
  }

  getBySessionId(sessionId: string): readonly AuthorizationModule[] {
    return Object.freeze(
      this.getAll().filter((item) => item.sessionId === sessionId)
    );
  }

  clear(): void {
    this.byId.clear();
  }

  count(): number {
    return this.byId.size;
  }

  roleCount(): number {
    let total = 0;
    for (const item of this.byId.values()) {
      total += item.roles.length;
    }
    return total;
  }

  permissionCount(): number {
    let total = 0;
    for (const item of this.byId.values()) {
      total += item.permissions.length;
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

export function createAuthorizationRegistry(
  seedBuiltins = true
): AuthorizationRegistry {
  return new AuthorizationRegistry(seedBuiltins);
}

/** Alias — RegistryRuntime adlandırma uyumu */
export { AuthorizationRegistry as AuthorizationRegistryRuntime };
export const createAuthorizationRegistryRuntime = createAuthorizationRegistry;

export default AuthorizationRegistry;
