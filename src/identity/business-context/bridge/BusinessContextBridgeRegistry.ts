/**
 * İSTEBUL Identity — BusinessContextBridgeRegistry (EPIC-302D).
 *
 * Tenant binding ↔ Business Context bağlarını tutar.
 * Instance bazlı Map — global state yoktur.
 */

import type { BusinessContextBridgeOperation } from './BusinessContextBridgeContext';

/**
 * Tenant Session Bridge ile Business Context arasındaki bağ.
 */
export interface BusinessContextBridgeBinding {
  /** Binding kimliği */
  id: string;
  /** Business kimliği */
  businessId: string;
  /** Tenant kimliği */
  tenantId: string;
  /** BusinessContextModule.id */
  businessContextModuleId: string;
  /** Upstream tenant session bridge binding kimliği */
  tenantBridgeBindingId?: string;
  /** Session kimliği */
  sessionId?: string;
  /** Identity kimliği */
  identityId?: string;
  /** Workspace sayısı */
  workspaceCount: number;
  /** Business modül sayısı */
  moduleCount: number;
  /** Sıralama */
  order: number;
  /** Oluşturulma ISO */
  createdAt: string;
  /** Güncellenme ISO */
  updatedAt: string;
  /** Son bridge operasyonu */
  lastOperation: BusinessContextBridgeOperation;
}

/**
 * Bridge binding kayıt sistemi.
 */
export class BusinessContextBridgeRegistry {
  private readonly byId = new Map<string, BusinessContextBridgeBinding>();

  register(binding: BusinessContextBridgeBinding): void {
    if (!binding?.id || typeof binding.id !== 'string') {
      throw new Error('BusinessContextBridgeBinding.id zorunludur.');
    }
    if (this.byId.has(binding.id)) {
      throw new Error(`Bridge binding zaten kayıtlı: ${binding.id}`);
    }
    if (
      !binding.businessContextModuleId ||
      typeof binding.businessContextModuleId !== 'string'
    ) {
      throw new Error(
        `BusinessContextBridgeBinding.businessContextModuleId zorunludur: ${binding.id}`
      );
    }
    if (!binding.tenantId || typeof binding.tenantId !== 'string') {
      throw new Error(
        `BusinessContextBridgeBinding.tenantId zorunludur: ${binding.id}`
      );
    }
    if (!binding.businessId || typeof binding.businessId !== 'string') {
      throw new Error(
        `BusinessContextBridgeBinding.businessId zorunludur: ${binding.id}`
      );
    }
    this.byId.set(binding.id, binding);
  }

  upsert(binding: BusinessContextBridgeBinding): void {
    if (!binding?.id || typeof binding.id !== 'string') {
      throw new Error('BusinessContextBridgeBinding.id zorunludur.');
    }
    this.byId.set(binding.id, binding);
  }

  unregister(bindingId: string): boolean {
    return this.byId.delete(bindingId);
  }

  getById(bindingId: string): BusinessContextBridgeBinding | undefined {
    return this.byId.get(bindingId);
  }

  getByTenantId(tenantId: string): readonly BusinessContextBridgeBinding[] {
    return Object.freeze(
      this.getAll().filter((item) => item.tenantId === tenantId)
    );
  }

  getByBusinessId(
    businessId: string
  ): readonly BusinessContextBridgeBinding[] {
    return Object.freeze(
      this.getAll().filter((item) => item.businessId === businessId)
    );
  }

  getByBusinessContextModuleId(
    moduleId: string
  ): BusinessContextBridgeBinding | undefined {
    return this.getAll().find(
      (item) => item.businessContextModuleId === moduleId
    );
  }

  getBySessionId(
    sessionId: string
  ): BusinessContextBridgeBinding | undefined {
    return this.getAll().find((item) => item.sessionId === sessionId);
  }

  getByIdentityId(
    identityId: string
  ): readonly BusinessContextBridgeBinding[] {
    return Object.freeze(
      this.getAll().filter((item) => item.identityId === identityId)
    );
  }

  getAll(): readonly BusinessContextBridgeBinding[] {
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

export function createBusinessContextBridgeRegistry(): BusinessContextBridgeRegistry {
  return new BusinessContextBridgeRegistry();
}

/** Alias — RegistryRuntime adlandırma uyumu */
export {
  BusinessContextBridgeRegistry as BusinessContextBridgeRegistryRuntime
};
export const createBusinessContextBridgeRegistryRuntime =
  createBusinessContextBridgeRegistry;

export default BusinessContextBridgeRegistry;
