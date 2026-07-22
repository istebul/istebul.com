/**
 * İSTEBUL Identity — Business Context projection model (EPIC-302D).
 *
 * Bridge katmanı projeksiyon modeli.
 * Supabase / Repository / CRUD / Dashboard / API / Middleware yok.
 */

/**
 * Business context durumu.
 */
export type BusinessContextStatus =
  | 'active'
  | 'pending'
  | 'invalid'
  | 'stale';

/**
 * Workspace ilişkilendirme projeksiyonu.
 */
export interface BusinessContextWorkspaceRef {
  /** Workspace kimliği */
  workspaceId: string;
  /** Workspace etiketi */
  label: string;
  /** İlişkili business modül kimliği */
  moduleId?: string;
  /** Aktif mi */
  active: boolean;
}

/**
 * Business Context modülü — bridge registry kaydı.
 */
export interface BusinessContextModule {
  /** Benzersiz kayıt */
  id: string;
  /** Business kimliği (tenant ile eşleşen işletme kimliği) */
  businessId: string;
  /** Tenant kimliği */
  tenantId: string;
  /** Görünen ad */
  displayName: string;
  /** Durum */
  status: BusinessContextStatus;
  /** İlişkili workspace'ler */
  workspaces: readonly BusinessContextWorkspaceRef[];
  /** Business runtime modül kimlikleri */
  moduleIds: readonly string[];
  /** Session kimliği */
  sessionId?: string;
  /** Identity kimliği */
  identityId?: string;
  /** Upstream tenant isolation / binding kimliği */
  tenantBindingId?: string;
  /** Sıralama */
  order: number;
  /** Oluşturulma */
  createdAt: string;
  /** Güncellenme */
  updatedAt: string;
}

/**
 * Business Context projeksiyonu.
 */
export interface BusinessContextProjection {
  contextId: string;
  businessId: string;
  tenantId: string;
  displayName: string;
  status: BusinessContextStatus;
  workspaces: readonly BusinessContextWorkspaceRef[];
  moduleIds: readonly string[];
  workspaceCount: number;
  moduleCount: number;
  sessionId?: string;
  identityId?: string;
  /** Bridge katmanında her zaman true — CRUD yok */
  projected: true;
}

/**
 * BusinessContextModule → projeksiyon.
 */
export function toBusinessContextProjection(
  module: BusinessContextModule
): BusinessContextProjection {
  const workspaces = Object.freeze(
    module.workspaces.map((item) => ({ ...item }))
  );
  return {
    contextId: module.id,
    businessId: module.businessId,
    tenantId: module.tenantId,
    displayName: module.displayName,
    status: module.status,
    workspaces,
    moduleIds: Object.freeze([...module.moduleIds]),
    workspaceCount: workspaces.length,
    moduleCount: module.moduleIds.length,
    sessionId: module.sessionId,
    identityId: module.identityId,
    projected: true
  };
}
