/**
 * İSTEBUL Identity — Authorization (RBAC) modeli ve modül tanımı (PR-203D).
 *
 * Projection-only iskelet. Middleware / JWT Claims / Policy Engine /
 * Supabase RLS / API / DB yok. Role ve Permission değerlendirmesi yalnızca
 * temsil edilir; gerçek policy engine yoktur.
 */

/**
 * Decision — Allow / Deny (projeksiyon).
 */
export type AuthorizationDecisionOutcome = 'allow' | 'deny';

/**
 * Role kapsamı.
 */
export type AuthorizationRoleScope = 'platform' | 'business' | 'tenant';

/**
 * Action — eylem tanımı.
 */
export interface AuthorizationAction {
  /** Eylem kimliği */
  id: string;
  /** Eylem adı */
  name: string;
}

/**
 * Resource — kaynak tanımı.
 */
export interface AuthorizationResource {
  /** Kaynak kimliği */
  id: string;
  /** Kaynak tipi */
  type: string;
  /** Görünen ad */
  name: string;
}

/**
 * Permission — izin tanımı (action + resource).
 */
export interface AuthorizationPermission {
  /** İzin kimliği */
  id: string;
  /** Eylem */
  action: AuthorizationAction;
  /** Kaynak */
  resource: AuthorizationResource;
}

/**
 * Role — rol tanımı.
 */
export interface AuthorizationRole {
  /** Rol kimliği */
  id: string;
  /** Görünen ad */
  name: string;
  /** Kapsam */
  scope: AuthorizationRoleScope;
  /** Bağlı izin kimlikleri */
  permissionIds: readonly string[];
}

/**
 * Policy — politika tanımı (gerçek engine yok).
 */
export interface AuthorizationPolicy {
  /** Politika kimliği */
  id: string;
  /** Görünen ad */
  name: string;
  /** Bağlı rol kimlikleri */
  roleIds: readonly string[];
  /** Etki */
  effect: AuthorizationDecisionOutcome;
  /** Opsiyonel kaynak filtresi */
  resourceId?: string;
  /** Opsiyonel eylem filtresi */
  actionId?: string;
}

/**
 * Decision — karar projeksiyonu.
 */
export interface AuthorizationDecision {
  /** Karar kimliği */
  decisionId: string;
  /** Allow / Deny */
  outcome: AuthorizationDecisionOutcome;
  /** Rol kimliği */
  roleId: string;
  /** İzin kimliği */
  permissionId: string;
  /** Kaynak kimliği */
  resourceId: string;
  /** Eylem kimliği */
  actionId: string;
  /** Opsiyonel politika kimliği */
  policyId?: string;
  /** Sebep etiketi */
  reason?: string;
}

/**
 * AuthorizationModule — registry kaydı (RBAC projeksiyonu).
 */
export interface AuthorizationModule {
  /** Benzersiz authorization kaydı */
  id: string;
  /** Bağlı identity */
  identityId: string;
  /** Bağlı authentication (opsiyonel) */
  authenticationId?: string;
  /** Bağlı session (opsiyonel) */
  sessionId?: string;
  /** Principal kimliği */
  principalId: string;
  /** Roller */
  roles: readonly AuthorizationRole[];
  /** İzinler */
  permissions: readonly AuthorizationPermission[];
  /** Politikalar */
  policies: readonly AuthorizationPolicy[];
  /** Kararlar */
  decisions: readonly AuthorizationDecision[];
  /** Sıralama */
  order: number;
  /** Oluşturulma */
  createdAt: string;
  /** Güncellenme */
  updatedAt: string;
}

/**
 * Authorization projeksiyonu — runtime çıktısı.
 */
export interface AuthorizationProjection {
  authorizationId: string;
  identityId: string;
  authenticationId?: string;
  sessionId?: string;
  principalId: string;
  roles: readonly AuthorizationRole[];
  permissions: readonly AuthorizationPermission[];
  policies: readonly AuthorizationPolicy[];
  decisions: readonly AuthorizationDecision[];
  /** Allow karar sayısı */
  allowCount: number;
  /** Deny karar sayısı */
  denyCount: number;
  /** Foundation katmanında her zaman true — gerçek engine yok */
  projected: true;
}

/**
 * Authorization alt nesnelerini kontrollü şekilde kopyalar ve dondurur.
 */
function freezeRole(role: AuthorizationRole): AuthorizationRole {
  return Object.freeze({
    ...role,
    permissionIds: Object.freeze([...role.permissionIds])
  });
}

function freezePermission(
  permission: AuthorizationPermission
): AuthorizationPermission {
  return Object.freeze({
    ...permission,
    action: Object.freeze({ ...permission.action }),
    resource: Object.freeze({ ...permission.resource })
  });
}

function freezePolicy(policy: AuthorizationPolicy): AuthorizationPolicy {
  return Object.freeze({
    ...policy,
    roleIds: Object.freeze([...policy.roleIds])
  });
}

function freezeDecision(
  decision: AuthorizationDecision
): AuthorizationDecision {
  return Object.freeze({ ...decision });
}

/**
 * AuthorizationModule için bağımsız ve immutable snapshot üretir.
 */
export function freezeAuthorizationModule(
  module: AuthorizationModule
): AuthorizationModule {
  return Object.freeze({
    ...module,
    roles: Object.freeze(module.roles.map(freezeRole)),
    permissions: Object.freeze(module.permissions.map(freezePermission)),
    policies: Object.freeze(module.policies.map(freezePolicy)),
    decisions: Object.freeze(module.decisions.map(freezeDecision))
  });
}

/**
 * AuthorizationModule tanımını immutable projeksiyona dönüştürür.
 */
export function toAuthorizationProjection(
  module: AuthorizationModule
): AuthorizationProjection {
  const snapshot = freezeAuthorizationModule(module);

  const allowCount = snapshot.decisions.filter(
    (decision) => decision.outcome === 'allow'
  ).length;

  const denyCount = snapshot.decisions.filter(
    (decision) => decision.outcome === 'deny'
  ).length;

  return Object.freeze({
    authorizationId: snapshot.id,
    identityId: snapshot.identityId,
    authenticationId: snapshot.authenticationId,
    sessionId: snapshot.sessionId,
    principalId: snapshot.principalId,
    roles: snapshot.roles,
    permissions: snapshot.permissions,
    policies: snapshot.policies,
    decisions: snapshot.decisions,
    allowCount,
    denyCount,
    projected: true
  });
}
