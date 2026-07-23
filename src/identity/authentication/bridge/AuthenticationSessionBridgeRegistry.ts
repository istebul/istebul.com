/**
 * İSTEBUL Identity — AuthenticationSessionBridgeRegistry (EPIC-301C).
 *
 * Provider oturumu ↔ SessionModule bağlarını tutar.
 * Instance bazlı Map — global state yoktur.
 */

import type { AuthenticationSessionBridgeOperation } from './AuthenticationSessionBridgeContext';

/**
 * Provider sonucu ile Session Runtime kaydı arasındaki bağ.
 */
export interface AuthenticationSessionBridgeBinding {
  /** Binding kimliği */
  id: string;
  /** Provider kimliği */
  providerId: string;
  /** Authentication kimliği */
  authenticationId: string;
  /** SessionModule.id */
  sessionModuleId: string;
  /** Session.sessionId */
  sessionId: string;
  /** Identity kimliği */
  identityId: string;
  /** Principal kimliği */
  principalId: string;
  /** Sıralama */
  order: number;
  /** Oluşturulma ISO */
  createdAt: string;
  /** Güncellenme ISO */
  updatedAt: string;
  /** Son bridge operasyonu */
  lastOperation: AuthenticationSessionBridgeOperation;
}

/**
 * Bridge binding kayıt sistemi.
 */
export class AuthenticationSessionBridgeRegistry {
  private readonly byId = new Map<string, AuthenticationSessionBridgeBinding>();

  register(binding: AuthenticationSessionBridgeBinding): void {
    if (!binding?.id || typeof binding.id !== 'string') {
      throw new Error('AuthenticationSessionBridgeBinding.id zorunludur.');
    }
    if (this.byId.has(binding.id)) {
      throw new Error(`Bridge binding zaten kayıtlı: ${binding.id}`);
    }
    if (!binding.sessionModuleId || typeof binding.sessionModuleId !== 'string') {
      throw new Error(
        `AuthenticationSessionBridgeBinding.sessionModuleId zorunludur: ${binding.id}`
      );
    }
    if (!binding.sessionId || typeof binding.sessionId !== 'string') {
      throw new Error(
        `AuthenticationSessionBridgeBinding.sessionId zorunludur: ${binding.id}`
      );
    }
    if (!binding.providerId || typeof binding.providerId !== 'string') {
      throw new Error(
        `AuthenticationSessionBridgeBinding.providerId zorunludur: ${binding.id}`
      );
    }
    this.byId.set(binding.id, binding);
  }

  upsert(binding: AuthenticationSessionBridgeBinding): void {
    if (!binding?.id || typeof binding.id !== 'string') {
      throw new Error('AuthenticationSessionBridgeBinding.id zorunludur.');
    }
    this.byId.set(binding.id, binding);
  }

  unregister(bindingId: string): boolean {
    return this.byId.delete(bindingId);
  }

  getById(bindingId: string): AuthenticationSessionBridgeBinding | undefined {
    return this.byId.get(bindingId);
  }

  getBySessionId(
    sessionId: string
  ): AuthenticationSessionBridgeBinding | undefined {
    return this.getAll().find((item) => item.sessionId === sessionId);
  }

  getBySessionModuleId(
    sessionModuleId: string
  ): AuthenticationSessionBridgeBinding | undefined {
    return this.getAll().find(
      (item) => item.sessionModuleId === sessionModuleId
    );
  }

  getByIdentityId(
    identityId: string
  ): readonly AuthenticationSessionBridgeBinding[] {
    return Object.freeze(
      this.getAll().filter((item) => item.identityId === identityId)
    );
  }

  getByProviderId(
    providerId: string
  ): readonly AuthenticationSessionBridgeBinding[] {
    return Object.freeze(
      this.getAll().filter((item) => item.providerId === providerId)
    );
  }

  getAll(): readonly AuthenticationSessionBridgeBinding[] {
    return Object.freeze(
      [...this.byId.values()].sort((a, b) => a.order - b.order)
    );
  }

  clear(): void {
    this.byId.clear();
  }

  count(): number {
    return this.byId.size;
  }
}

export function createAuthenticationSessionBridgeRegistry(): AuthenticationSessionBridgeRegistry {
  return new AuthenticationSessionBridgeRegistry();
}

/** Alias — RegistryRuntime adlandırma uyumu */
export {
  AuthenticationSessionBridgeRegistry as AuthenticationSessionBridgeRegistryRuntime
};
export const createAuthenticationSessionBridgeRegistryRuntime =
  createAuthenticationSessionBridgeRegistry;

export default AuthenticationSessionBridgeRegistry;
