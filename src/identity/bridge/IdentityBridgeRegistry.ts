/**
 * İSTEBUL Identity — IdentityBridgeRegistry (EPIC-301D).
 *
 * Authentication / Session bridge ↔ IdentityModule bağlarını tutar.
 * Instance bazlı Map — global state yoktur.
 */

import type { IdentityBridgeOperation } from './IdentityBridgeContext';

/**
 * Provider/session bridge ile Identity Runtime kaydı arasındaki bağ.
 */
export interface IdentityBridgeBinding {
  /** Binding kimliği */
  id: string;
  /** Provider kimliği */
  providerId: string;
  /** IdentityModule.id */
  identityModuleId: string;
  /** Kullanıcı / identity kimliği */
  identityId: string;
  /** SessionModule.id (varsa) */
  sessionModuleId?: string;
  /** Session.sessionId (varsa) */
  sessionId?: string;
  /** Session bridge binding id (varsa) */
  sessionBridgeBindingId?: string;
  /** Authentication kimliği (varsa) */
  authenticationId?: string;
  /** Principal kimliği (varsa) */
  principalId?: string;
  /** Sıralama */
  order: number;
  /** Oluşturulma ISO */
  createdAt: string;
  /** Güncellenme ISO */
  updatedAt: string;
  /** Son bridge operasyonu */
  lastOperation: IdentityBridgeOperation;
}

/**
 * Identity bridge binding kayıt sistemi.
 */
export class IdentityBridgeRegistry {
  private readonly byId = new Map<string, IdentityBridgeBinding>();

  register(binding: IdentityBridgeBinding): void {
    if (!binding?.id || typeof binding.id !== 'string') {
      throw new Error('IdentityBridgeBinding.id zorunludur.');
    }
    if (this.byId.has(binding.id)) {
      throw new Error(`Identity bridge binding zaten kayıtlı: ${binding.id}`);
    }
    if (!binding.identityModuleId || typeof binding.identityModuleId !== 'string') {
      throw new Error(
        `IdentityBridgeBinding.identityModuleId zorunludur: ${binding.id}`
      );
    }
    if (!binding.identityId || typeof binding.identityId !== 'string') {
      throw new Error(
        `IdentityBridgeBinding.identityId zorunludur: ${binding.id}`
      );
    }
    if (!binding.providerId || typeof binding.providerId !== 'string') {
      throw new Error(
        `IdentityBridgeBinding.providerId zorunludur: ${binding.id}`
      );
    }
    this.byId.set(binding.id, binding);
  }

  upsert(binding: IdentityBridgeBinding): void {
    if (!binding?.id || typeof binding.id !== 'string') {
      throw new Error('IdentityBridgeBinding.id zorunludur.');
    }
    this.byId.set(binding.id, binding);
  }

  unregister(bindingId: string): boolean {
    return this.byId.delete(bindingId);
  }

  getById(bindingId: string): IdentityBridgeBinding | undefined {
    return this.byId.get(bindingId);
  }

  getByIdentityId(identityId: string): readonly IdentityBridgeBinding[] {
    return Object.freeze(
      this.getAll().filter((item) => item.identityId === identityId)
    );
  }

  getByIdentityModuleId(
    identityModuleId: string
  ): IdentityBridgeBinding | undefined {
    return this.getAll().find(
      (item) => item.identityModuleId === identityModuleId
    );
  }

  getBySessionId(sessionId: string): IdentityBridgeBinding | undefined {
    return this.getAll().find((item) => item.sessionId === sessionId);
  }

  getByProviderId(providerId: string): readonly IdentityBridgeBinding[] {
    return Object.freeze(
      this.getAll().filter((item) => item.providerId === providerId)
    );
  }

  getAll(): readonly IdentityBridgeBinding[] {
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

export function createIdentityBridgeRegistry(): IdentityBridgeRegistry {
  return new IdentityBridgeRegistry();
}

/** Alias — RegistryRuntime adlandırma uyumu */
export { IdentityBridgeRegistry as IdentityBridgeRegistryRuntime };
export const createIdentityBridgeRegistryRuntime = createIdentityBridgeRegistry;

export default IdentityBridgeRegistry;
