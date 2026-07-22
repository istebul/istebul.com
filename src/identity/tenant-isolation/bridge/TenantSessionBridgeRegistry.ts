/**
 * İSTEBUL Identity — TenantSessionBridgeRegistry (EPIC-302C).
 *
 * Provider tenant sonucu ↔ TenantIsolationModule bağlarını tutar.
 * Session kimliği ile tenant bağlamını eşleştirir.
 * Instance bazlı Map — global state yoktur.
 */

import type { TenantSessionBridgeOperation } from './TenantSessionBridgeContext';

/**
 * Provider sonucu ile Tenant Runtime kaydı arasındaki bağ.
 */
export interface TenantSessionBridgeBinding {
  /** Binding kimliği */
  id: string;
  /** Provider kimliği */
  providerId: string;
  /** Tenant kimliği */
  tenantId: string;
  /** TenantIsolationModule.id */
  isolationModuleId: string;
  /** Session kimliği (session ↔ tenant eşleştirme) */
  sessionId?: string;
  /** Identity kimliği */
  identityId?: string;
  /** Senkronize edilen üyelik sayısı */
  membershipCount: number;
  /** Sıralama */
  order: number;
  /** Oluşturulma ISO */
  createdAt: string;
  /** Güncellenme ISO */
  updatedAt: string;
  /** Son bridge operasyonu */
  lastOperation: TenantSessionBridgeOperation;
}

/**
 * Bridge binding kayıt sistemi.
 */
export class TenantSessionBridgeRegistry {
  private readonly byId = new Map<string, TenantSessionBridgeBinding>();

  register(binding: TenantSessionBridgeBinding): void {
    if (!binding?.id || typeof binding.id !== 'string') {
      throw new Error('TenantSessionBridgeBinding.id zorunludur.');
    }
    if (this.byId.has(binding.id)) {
      throw new Error(`Bridge binding zaten kayıtlı: ${binding.id}`);
    }
    if (!binding.isolationModuleId || typeof binding.isolationModuleId !== 'string') {
      throw new Error(
        `TenantSessionBridgeBinding.isolationModuleId zorunludur: ${binding.id}`
      );
    }
    if (!binding.tenantId || typeof binding.tenantId !== 'string') {
      throw new Error(
        `TenantSessionBridgeBinding.tenantId zorunludur: ${binding.id}`
      );
    }
    if (!binding.providerId || typeof binding.providerId !== 'string') {
      throw new Error(
        `TenantSessionBridgeBinding.providerId zorunludur: ${binding.id}`
      );
    }
    this.byId.set(binding.id, binding);
  }

  upsert(binding: TenantSessionBridgeBinding): void {
    if (!binding?.id || typeof binding.id !== 'string') {
      throw new Error('TenantSessionBridgeBinding.id zorunludur.');
    }
    this.byId.set(binding.id, binding);
  }

  unregister(bindingId: string): boolean {
    return this.byId.delete(bindingId);
  }

  getById(bindingId: string): TenantSessionBridgeBinding | undefined {
    return this.byId.get(bindingId);
  }

  getByTenantId(tenantId: string): readonly TenantSessionBridgeBinding[] {
    return Object.freeze(
      this.getAll().filter((item) => item.tenantId === tenantId)
    );
  }

  getByIsolationModuleId(
    isolationModuleId: string
  ): TenantSessionBridgeBinding | undefined {
    return this.getAll().find(
      (item) => item.isolationModuleId === isolationModuleId
    );
  }

  getBySessionId(
    sessionId: string
  ): TenantSessionBridgeBinding | undefined {
    return this.getAll().find((item) => item.sessionId === sessionId);
  }

  getByIdentityId(
    identityId: string
  ): readonly TenantSessionBridgeBinding[] {
    return Object.freeze(
      this.getAll().filter((item) => item.identityId === identityId)
    );
  }

  getByProviderId(
    providerId: string
  ): readonly TenantSessionBridgeBinding[] {
    return Object.freeze(
      this.getAll().filter((item) => item.providerId === providerId)
    );
  }

  getAll(): readonly TenantSessionBridgeBinding[] {
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

export function createTenantSessionBridgeRegistry(): TenantSessionBridgeRegistry {
  return new TenantSessionBridgeRegistry();
}

/** Alias — RegistryRuntime adlandırma uyumu */
export {
  TenantSessionBridgeRegistry as TenantSessionBridgeRegistryRuntime
};
export const createTenantSessionBridgeRegistryRuntime =
  createTenantSessionBridgeRegistry;

export default TenantSessionBridgeRegistry;
