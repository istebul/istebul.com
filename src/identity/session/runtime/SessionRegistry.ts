/**
 * İSTEBUL Identity — SessionRegistry (PR-203C).
 */

import { freezeSessionModule, type SessionModule, type SessionState } from './SessionModule';
import { BUILTIN_SESSION_MODULES } from './builtinModules';

/**
 * Runtime Session kayıt sistemi.
 *
 * Yeni global state yoktur — instance bazlı Map.
 */
export class SessionRegistry {
  private readonly byId = new Map<string, SessionModule>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      for (const definition of BUILTIN_SESSION_MODULES) {
        this.byId.set(definition.id, freezeSessionModule(definition));
      }
    }
  }

  register(definition: SessionModule): void {
    if (
      !definition?.id ||
      typeof definition.id !== 'string' ||
      !definition.id.trim()
    ) {
      throw new Error('SessionModule.id zorunludur.');
    }
    if (this.byId.has(definition.id)) {
      throw new Error(`Session zaten kayıtlı: ${definition.id}`);
    }
    if (!Number.isSafeInteger(definition.order) || definition.order < 1) {
      throw new Error('SessionModule.order pozitif güvenli tam sayı olmalıdır.');
    }
    const sessionId = definition.session?.sessionId;
    if (
      !sessionId ||
      typeof sessionId !== 'string' ||
      !sessionId.trim()
    ) {
      throw new Error(
        `SessionModule.session.sessionId zorunludur: ${definition.id}`
      );
    }
    const identityId = definition.session?.identityId;
    if (
      !identityId ||
      typeof identityId !== 'string' ||
      !identityId.trim()
    ) {
      throw new Error(
        `SessionModule.session.identityId zorunludur: ${definition.id}`
      );
    }
    const authenticationId = definition.session?.authenticationId;
    if (
      !authenticationId ||
      typeof authenticationId !== 'string' ||
      !authenticationId.trim()
    ) {
      throw new Error(
        `SessionModule.session.authenticationId zorunludur: ${definition.id}`
      );
    }
    this.byId.set(definition.id, freezeSessionModule(definition));
  }

  unregister(sessionModuleId: string): boolean {
    return this.byId.delete(sessionModuleId);
  }

  getById(sessionModuleId: string): SessionModule | undefined {
    return this.byId.get(sessionModuleId);
  }

  getBySessionId(sessionId: string): SessionModule | undefined {
    return this.getAll().find((item) => item.session.sessionId === sessionId);
  }

  getAll(): readonly SessionModule[] {
    return Object.freeze(
      [...this.byId.values()].sort((a, b) => a.order - b.order)
    );
  }

  getByIdentityId(identityId: string): readonly SessionModule[] {
    return Object.freeze(
      this.getAll().filter((item) => item.session.identityId === identityId)
    );
  }

  getByAuthenticationId(authenticationId: string): readonly SessionModule[] {
    return Object.freeze(
      this.getAll().filter(
        (item) => item.session.authenticationId === authenticationId
      )
    );
  }

  getByState(state: SessionState): readonly SessionModule[] {
    return Object.freeze(
      this.getAll().filter((item) => item.session.state === state)
    );
  }

  clear(): void {
    this.byId.clear();
  }

  count(): number {
    return this.byId.size;
  }

  activeCount(): number {
    return this.getByState('active').length;
  }

  expiredCount(): number {
    return this.getAll().filter(
      (item) =>
        item.session.state === 'expired' || item.session.expiration.isExpired
    ).length;
  }
}

export function createSessionRegistry(seedBuiltins = true): SessionRegistry {
  return new SessionRegistry(seedBuiltins);
}

/** Alias — RegistryRuntime adlandırma uyumu */
export { SessionRegistry as SessionRegistryRuntime };
export const createSessionRegistryRuntime = createSessionRegistry;

export default SessionRegistry;
