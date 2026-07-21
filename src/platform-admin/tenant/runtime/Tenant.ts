/**
 * İSTEBUL Platform Admin — Tenant modeli (PR-201B).
 *
 * Projection-only iskelet. CRUD / API / DB yok.
 */

/**
 * Tenant yaşam durumu.
 */
export type TenantStatus = 'active' | 'suspended' | 'pending' | 'archived';

/**
 * Abonelik durumu.
 */
export type TenantSubscriptionStatus =
  | 'trial'
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'none';

/**
 * Plan kimliği.
 */
export type TenantPlanId = 'free' | 'starter' | 'pro' | 'enterprise';

/**
 * Tenant limitleri — projeksiyon alanları.
 */
export interface TenantLimits {
  /** Maksimum kullanıcı */
  maxUsers: number;
  /** Aylık AI istek limiti */
  maxAiRequestsPerMonth: number;
  /** Depolama (MB) */
  maxStorageMb: number;
}

/**
 * Tenant Identity — kimlik alanları.
 */
export interface TenantIdentity {
  /** Benzersiz tenant kimliği */
  id: string;
  /** Kısa kod / slug */
  slug: string;
  /** Görünen ad */
  displayName: string;
}

/**
 * Organization — organizasyon alanları.
 */
export interface TenantOrganization {
  /** Organizasyon adı */
  name: string;
  /** Ülke kodu (ISO 3166-1 alpha-2) */
  countryCode: string;
  /** Sektör etiketi */
  industry?: string;
}

/**
 * Tenant tanımı — registry kaydı.
 */
export interface TenantDefinition {
  identity: TenantIdentity;
  organization: TenantOrganization;
  subscriptionStatus: TenantSubscriptionStatus;
  plan: TenantPlanId;
  status: TenantStatus;
  limits: TenantLimits;
  createdAt: string;
  updatedAt: string;
}

/**
 * Tenant projeksiyonu — runtime çıktısı.
 */
export interface TenantProjection {
  identity: TenantIdentity;
  organization: TenantOrganization;
  subscriptionStatus: TenantSubscriptionStatus;
  plan: TenantPlanId;
  status: TenantStatus;
  limits: TenantLimits;
  createdAt: string;
  updatedAt: string;
  /** Foundation katmanında her zaman true — CRUD yok */
  projected: true;
}

/**
 * Tanımı projeksiyona dönüştürür.
 */
export function toTenantProjection(
  definition: TenantDefinition
): TenantProjection {
  return {
    identity: { ...definition.identity },
    organization: { ...definition.organization },
    subscriptionStatus: definition.subscriptionStatus,
    plan: definition.plan,
    status: definition.status,
    limits: { ...definition.limits },
    createdAt: definition.createdAt,
    updatedAt: definition.updatedAt,
    projected: true
  };
}
