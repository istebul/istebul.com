/**
 * İSTEBUL Identity — AuthenticationRegistry (PR-203B).
 */

import type {
  AuthenticationModule,
  AuthenticationStatus
} from './AuthenticationModule';
import { BUILTIN_AUTHENTICATION_MODULES } from './builtinModules';

/**
 * Runtime Authentication kayıt sistemi.
 *
 * Yeni global state yoktur — instance bazlı Map.
 */
export class AuthenticationRegistry {
  private readonly byId = new Map<string, AuthenticationModule>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      for (const definition of BUILTIN_AUTHENTICATION_MODULES) {
        this.byId.set(definition.id, definition);
      }
    }
  }

  register(definition: AuthenticationModule): void {
    if (!definition?.id || typeof definition.id !== 'string') {
      throw new Error('AuthenticationModule.id zorunludur.');
    }
    if (this.byId.has(definition.id)) {
      throw new Error(`Authentication zaten kayıtlı: ${definition.id}`);
    }
    const principalId = definition.state?.principal?.principalId;
    if (!principalId || typeof principalId !== 'string') {
      throw new Error(
        `AuthenticationModule.state.principal.principalId zorunludur: ${definition.id}`
      );
    }
    const identityId = definition.state?.principal?.identityId;
    if (!identityId || typeof identityId !== 'string') {
      throw new Error(
        `AuthenticationModule.state.principal.identityId zorunludur: ${definition.id}`
      );
    }
    this.byId.set(definition.id, definition);
  }

  unregister(authenticationId: string): boolean {
    return this.byId.delete(authenticationId);
  }

  getById(authenticationId: string): AuthenticationModule | undefined {
    return this.byId.get(authenticationId);
  }

  getAll(): readonly AuthenticationModule[] {
    return Object.freeze(
      [...this.byId.values()].sort((a, b) => a.order - b.order)
    );
  }

  getByIdentityId(identityId: string): readonly AuthenticationModule[] {
    return Object.freeze(
      this.getAll().filter(
        (item) => item.state.principal.identityId === identityId
      )
    );
  }

  getByStatus(status: AuthenticationStatus): readonly AuthenticationModule[] {
    return Object.freeze(
      this.getAll().filter((item) => item.state.status === status)
    );
  }

  clear(): void {
    this.byId.clear();
  }

  count(): number {
    return this.byId.size;
  }

  /**
   * authenticated status’ündeki kayıt sayısı.
   */
  authenticatedCount(): number {
    return this.getByStatus('authenticated').length;
  }
}

export function createAuthenticationRegistry(
  seedBuiltins = true
): AuthenticationRegistry {
  return new AuthenticationRegistry(seedBuiltins);
}

/** Alias — RegistryRuntime adlandırma uyumu */
export { AuthenticationRegistry as AuthenticationRegistryRuntime };
export const createAuthenticationRegistryRuntime = createAuthenticationRegistry;

export default AuthenticationRegistry;
