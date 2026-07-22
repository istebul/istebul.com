/**
 * İSTEBUL Identity — Tenant Isolation modeli ve modül tanımı (PR-203E).
 *
 * Projection-only iskelet. Supabase RLS / Database / API / Middleware /
 * JWT Claims yok. Tenant Isolation yalnızca projeksiyon modelidir.
 */

/**
 * Isolation Decision — Allow / Deny / Restrict (projeksiyon).
 */
export type TenantIsolationDecisionOutcome =
  | 'allow'
  | 'deny'
  | 'restrict';

/**
 * Scope — erişim kapsamı seviyesi.
 */
export type TenantIsolationScopeLevel =
  | 'platform'
  | 'tenant'
  | 'membership'
  | 'self';

/**
 * Tenant Identity — kiracı kimlik alanları.
 */
export interface TenantIdentityRef {
  /** Tenant kimliği */
  tenantId: string;
  /** Slug */
  slug: string;
  /** Görünen ad */
  displayName: string;
}

/**
 * Tenant Boundary — sınır tanımı.
 */
export interface TenantBoundary {
  /** Sınır kimliği */
  boundaryId: string;
  /** Tenant kimliği */
  tenantId: string;
  /** Sınır etiketi */
  label: string;
  /** Katı sınır mı */
  strict: boolean;
}

/**
 * Tenant Membership — üyelik projeksiyonu.
 */
export interface TenantMembership {
  /** Üyelik kimliği */
  membershipId: string;
  /** Identity kimliği */
  identityId: string;
  /** Tenant kimliği */
  tenantId: string;
  /** Üyelik rolü etiketi */
  roleLabel?: string;
  /** Aktif mi */
  active: boolean;
}

/**
 * Scope — kapsam tanımı.
 */
export interface TenantIsolationScope {
  /** Kapsam kimliği */
  scopeId: string;
  /** Seviye */
  level: TenantIsolationScopeLevel;
  /** Tenant kimliği (tenant/membership seviyelerinde) */
  tenantId?: string;
}

/**
 * Isolation Rule — kural tanımı (gerçek RLS yok).
 */
export interface TenantIsolationRule {
  /** Kural kimliği */
  ruleId: string;
  /** Kural adı */
  name: string;
  /** Kaynak tenant */
  sourceTenantId: string;
  /** Hedef tenant (cross-tenant denemeleri için) */
  targetTenantId?: string;
  /** Etki */
  effect: TenantIsolationDecisionOutcome;
}

/**
 * Access Scope — erişim kapsamı.
 */
export interface TenantAccessScope {
  /** Erişim kapsamı kimliği */
  accessScopeId: string;
  /** İzin verilen tenant kimlikleri */
  allowedTenantIds: readonly string[];
  /** Cross-tenant erişim izni (projeksiyon bayrağı) */
  crossTenantAllowed: boolean;
}

/**
 * Isolation Decision — karar projeksiyonu.
 */
export interface TenantIsolationDecision {
  /** Karar kimliği */
  decisionId: string;
  /** Outcome */
  outcome: TenantIsolationDecisionOutcome;
  /** Identity */
  identityId: string;
  /** Kaynak tenant */
  sourceTenantId: string;
  /** Hedef tenant */
  targetTenantId: string;
  /** Kural kimliği */
  ruleId?: string;
  /** Sebep */
  reason?: string;
}

/**
 * TenantIsolationModule — registry kaydı.
 */
export interface TenantIsolationModule {
  /** Benzersiz kayıt */
  id: string;
  /** Tenant identity */
  tenantIdentity: TenantIdentityRef;
  /** Boundary */
  boundary: TenantBoundary;
  /** Memberships */
  memberships: readonly TenantMembership[];
  /** Scopes */
  scopes: readonly TenantIsolationScope[];
  /** Isolation rules */
  isolationRules: readonly TenantIsolationRule[];
  /** Access scope */
  accessScope: TenantAccessScope;
  /** Isolation decisions */
  decisions: readonly TenantIsolationDecision[];
  /** Bağlı identity (opsiyonel birincil) */
  primaryIdentityId?: string;
  /** Bağlı authorization (opsiyonel) */
  authorizationId?: string;
  /** Bağlı session (opsiyonel) */
  sessionId?: string;
  /** Sıralama */
  order: number;
  /** Oluşturulma */
  createdAt: string;
  /** Güncellenme */
  updatedAt: string;
}

/**
 * Tenant Isolation projeksiyonu — runtime çıktısı.
 */
export interface TenantIsolationProjection {
  isolationId: string;
  tenantIdentity: TenantIdentityRef;
  boundary: TenantBoundary;
  memberships: readonly TenantMembership[];
  scopes: readonly TenantIsolationScope[];
  isolationRules: readonly TenantIsolationRule[];
  accessScope: TenantAccessScope;
  decisions: readonly TenantIsolationDecision[];
  membershipCount: number;
  decisionCount: number;
  allowCount: number;
  denyCount: number;
  restrictCount: number;
  /** Foundation katmanında her zaman true — gerçek RLS yok */
  projected: true;
}

/**
 * TenantIsolationModule tanımını projeksiyona dönüştürür.
 */
export function toTenantIsolationProjection(
  module: TenantIsolationModule
): TenantIsolationProjection {
  const memberships = Object.freeze(
    module.memberships.map((item) => ({ ...item }))
  );
  const scopes = Object.freeze(module.scopes.map((item) => ({ ...item })));
  const isolationRules = Object.freeze(
    module.isolationRules.map((item) => ({ ...item }))
  );
  const decisions = Object.freeze(
    module.decisions.map((item) => ({ ...item }))
  );

  let allowCount = 0;
  let denyCount = 0;
  let restrictCount = 0;
  for (const decision of decisions) {
    if (decision.outcome === 'allow') {
      allowCount += 1;
    } else if (decision.outcome === 'deny') {
      denyCount += 1;
    } else {
      restrictCount += 1;
    }
  }

  return {
    isolationId: module.id,
    tenantIdentity: { ...module.tenantIdentity },
    boundary: { ...module.boundary },
    memberships,
    scopes,
    isolationRules,
    accessScope: {
      ...module.accessScope,
      allowedTenantIds: Object.freeze([...module.accessScope.allowedTenantIds])
    },
    decisions,
    membershipCount: memberships.length,
    decisionCount: decisions.length,
    allowCount,
    denyCount,
    restrictCount,
    projected: true
  };
}
