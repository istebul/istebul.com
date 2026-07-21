/**
 * İSTEBUL Platform Admin — User modeli (PR-201C).
 *
 * Projection-only iskelet. CRUD / Auth / API / DB yok.
 */

/**
 * Kullanıcı yaşam durumu.
 */
export type UserStatus = 'active' | 'invited' | 'suspended' | 'deactivated';

/**
 * Platform Admin kullanıcı rolü — iskelet (authorization yok).
 */
export type UserRole =
  | 'platform-owner'
  | 'platform-admin'
  | 'tenant-admin'
  | 'tenant-member'
  | 'support'
  | 'viewer';

/**
 * User Identity — kimlik alanları.
 */
export interface UserIdentity {
  /** Benzersiz kullanıcı kimliği */
  id: string;
  /** Opsiyonel kullanıcı adı / handle */
  username?: string;
}

/**
 * Tenant referansı — kullanıcı–tenant bağı (projeksiyon).
 */
export interface UserTenantReference {
  /** Tenant kimliği */
  tenantId: string;
  /** Tenant slug (izlenebilirlik) */
  tenantSlug?: string;
}

/**
 * User tanımı — registry kaydı.
 */
export interface UserDefinition {
  identity: UserIdentity;
  displayName: string;
  email: string;
  role: UserRole;
  tenantReference: UserTenantReference;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * User projeksiyonu — runtime çıktısı.
 */
export interface UserProjection {
  identity: UserIdentity;
  displayName: string;
  email: string;
  role: UserRole;
  tenantReference: UserTenantReference;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  /** Foundation katmanında her zaman true — CRUD yok */
  projected: true;
}

/**
 * Tanımı projeksiyona dönüştürür.
 */
export function toUserProjection(definition: UserDefinition): UserProjection {
  return {
    identity: { ...definition.identity },
    displayName: definition.displayName,
    email: definition.email,
    role: definition.role,
    tenantReference: { ...definition.tenantReference },
    status: definition.status,
    createdAt: definition.createdAt,
    updatedAt: definition.updatedAt,
    projected: true
  };
}
