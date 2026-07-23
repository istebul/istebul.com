/**
 * İSTEBUL Platform Admin — Subscription modeli (PR-201D).
 *
 * Projection-only iskelet. Payment / Billing / API / DB yok.
 */

/**
 * Abonelik yaşam durumu.
 */
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'paused';

/**
 * Plan kimliği.
 */
export type SubscriptionPlanId = 'free' | 'starter' | 'pro' | 'enterprise';

/**
 * Faturalama döngüsü — projeksiyon alanı (ödeme yok).
 */
export type SubscriptionBillingCycle = 'monthly' | 'yearly' | 'none';

/**
 * Kullanım limitleri — projeksiyon alanları.
 */
export interface SubscriptionUsageLimits {
  /** Maksimum kullanıcı */
  maxUsers: number;
  /** Aylık AI istek limiti */
  maxAiRequestsPerMonth: number;
  /** Depolama (MB) */
  maxStorageMb: number;
}

/**
 * Subscription Identity — kimlik alanları.
 */
export interface SubscriptionIdentity {
  /** Benzersiz abonelik kimliği */
  id: string;
  /** İnsan okunabilir etiket */
  label?: string;
}

/**
 * Tenant referansı — abonelik–tenant bağı (projeksiyon).
 */
export interface SubscriptionTenantReference {
  /** Tenant kimliği */
  tenantId: string;
  /** Tenant slug (izlenebilirlik) */
  tenantSlug?: string;
}

/**
 * Subscription tanımı — registry kaydı.
 */
export interface SubscriptionDefinition {
  identity: SubscriptionIdentity;
  tenantReference: SubscriptionTenantReference;
  plan: SubscriptionPlanId;
  status: SubscriptionStatus;
  billingCycle: SubscriptionBillingCycle;
  usageLimits: SubscriptionUsageLimits;
  renewalDate: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Subscription projeksiyonu — runtime çıktısı.
 */
export interface SubscriptionProjection {
  identity: SubscriptionIdentity;
  tenantReference: SubscriptionTenantReference;
  plan: SubscriptionPlanId;
  status: SubscriptionStatus;
  billingCycle: SubscriptionBillingCycle;
  usageLimits: SubscriptionUsageLimits;
  renewalDate: string;
  createdAt: string;
  updatedAt: string;
  /** Foundation katmanında her zaman true — CRUD yok */
  projected: true;
}

/**
 * Tanımı projeksiyona dönüştürür.
 */
export function toSubscriptionProjection(
  definition: SubscriptionDefinition
): SubscriptionProjection {
  return {
    identity: { ...definition.identity },
    tenantReference: { ...definition.tenantReference },
    plan: definition.plan,
    status: definition.status,
    billingCycle: definition.billingCycle,
    usageLimits: { ...definition.usageLimits },
    renewalDate: definition.renewalDate,
    createdAt: definition.createdAt,
    updatedAt: definition.updatedAt,
    projected: true
  };
}
