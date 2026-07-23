/**
 * İSTEBUL Identity — kimlik modeli ve modül tanımı (PR-203A).
 *
 * Projection-only iskelet. Login / Logout / Auth / JWT / API / DB yok.
 */

/**
 * Kimlik yaşam durumu.
 */
export type IdentityStatus = 'active' | 'inactive' | 'pending' | 'suspended';

/**
 * Rol kapsamı — Platform Admin ve Business Admin ortak kullanımı.
 */
export type IdentityRoleScope = 'platform' | 'business' | 'tenant';

/**
 * Yerleşik rol kimlikleri — iskelet (authorization yok).
 */
export type IdentityRoleId =
  | 'platform-owner'
  | 'platform-admin'
  | 'business-admin'
  | 'tenant-admin'
  | 'tenant-member'
  | 'viewer';

/**
 * User — kimlik kullanıcı alanları.
 */
export interface IdentityUser {
  /** Benzersiz kullanıcı kimliği */
  id: string;
  /** Görünen ad */
  displayName: string;
  /** E-posta (projeksiyon) */
  email?: string;
  /** Opsiyonel kullanıcı adı / handle */
  username?: string;
}

/**
 * Tenant — kimlik kiracı alanları.
 */
export interface IdentityTenant {
  /** Benzersiz tenant kimliği */
  id: string;
  /** Kısa kod / slug */
  slug: string;
  /** Görünen ad */
  displayName: string;
}

/**
 * Role — rol tanımı.
 */
export interface IdentityRole {
  /** Rol kimliği */
  id: IdentityRoleId | string;
  /** Görünen ad */
  name: string;
  /** Rol kapsamı */
  scope: IdentityRoleScope;
}

/**
 * Permission — izin tanımı.
 */
export interface IdentityPermission {
  /** İzin kimliği */
  id: string;
  /** Eylem */
  action: string;
  /** Kaynak */
  resource: string;
}

/**
 * Claims — projeksiyon claim haritası (JWT doğrulama yok).
 */
export interface IdentityClaims {
  readonly [key: string]: string | number | boolean | readonly string[];
}

/**
 * Session Reference — oturum referansı (login/logout yok).
 */
export interface SessionReference {
  /** Oturum kimliği (referans) */
  sessionId: string;
  /** Veriliş zamanı ISO */
  issuedAt?: string;
  /** Bitiş zamanı ISO */
  expiresAt?: string;
}

/**
 * Identity — kimlik agregatı (model çekirdeği).
 */
export interface Identity {
  /** Benzersiz kimlik kaydı */
  id: string;
  /** Kullanıcı */
  user: IdentityUser;
  /** Tenant */
  tenant: IdentityTenant;
  /** Roller */
  roles: readonly IdentityRole[];
  /** İzinler */
  permissions: readonly IdentityPermission[];
  /** Claims */
  claims: IdentityClaims;
  /** Oturum referansı */
  sessionReference: SessionReference;
  /** Durum */
  status: IdentityStatus;
}

/**
 * IdentityModule — registry kaydı (Identity + sıralama / tarihler).
 */
export interface IdentityModule extends Identity {
  /** Sıralama */
  order: number;
  /** Oluşturulma */
  createdAt: string;
  /** Güncellenme */
  updatedAt: string;
}

/**
 * Identity projeksiyonu — runtime çıktısı.
 */
export interface IdentityProjection {
  identityId: string;
  user: IdentityUser;
  tenant: IdentityTenant;
  roles: readonly IdentityRole[];
  permissions: readonly IdentityPermission[];
  claims: IdentityClaims;
  sessionReference: SessionReference;
  status: IdentityStatus;
  /** Foundation katmanında her zaman true — auth/CRUD yok */
  projected: true;
}

/**
 * Identity / IdentityModule tanımını projeksiyona dönüştürür.
 */
export function toIdentityProjection(
  module: IdentityModule | Identity
): IdentityProjection {
  return {
    identityId: module.id,
    user: { ...module.user },
    tenant: { ...module.tenant },
    roles: Object.freeze(module.roles.map((role) => ({ ...role }))),
    permissions: Object.freeze(
      module.permissions.map((permission) => ({ ...permission }))
    ),
    claims: Object.freeze({ ...module.claims }),
    sessionReference: { ...module.sessionReference },
    status: module.status,
    projected: true
  };
}
