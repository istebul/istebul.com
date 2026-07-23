/**
 * İSTEBUL Identity — Tenant Provider → Tenant Runtime mapping (EPIC-302C).
 *
 * Provider sonucunu Tenant Isolation Runtime modeline dönüştürür.
 * Business Context / RLS / Middleware / API / Dashboard yok.
 */

import type { TenantProviderResult } from '../adapters/TenantProviderResult';
import type { TenantProviderStatus } from '../adapters/TenantProviderResult';
import type {
  TenantAccessScope,
  TenantBoundary,
  TenantIdentityRef,
  TenantIsolationDecision,
  TenantIsolationDecisionOutcome,
  TenantIsolationModule,
  TenantIsolationScope,
  TenantMembership
} from '../runtime/TenantIsolationModule';
import { toTenantIsolationProjection } from '../runtime/TenantIsolationModule';
import type { TenantSessionBridgeOperation } from './TenantSessionBridgeContext';
import type { TenantSessionBridgeValidationIssue } from './TenantSessionBridgeResult';
import type { TenantSessionBridgeBinding } from './TenantSessionBridgeRegistry';

export interface MapTenantProviderToIsolationOptions {
  operation: TenantSessionBridgeOperation;
  existingModule?: TenantIsolationModule;
  sessionId?: string;
  identityId?: string;
  nowIso?: string;
  order?: number;
}

/**
 * Provider status → isolation decision outcome (varsayılan).
 */
export function mapTenantProviderStatusToDecisionOutcome(
  status: TenantProviderStatus,
  operation: TenantSessionBridgeOperation,
  accessOutcome?: TenantIsolationDecisionOutcome
): TenantIsolationDecisionOutcome {
  if (accessOutcome) {
    return accessOutcome;
  }
  if (operation === 'validate') {
    return status === 'resolved' ? 'allow' : 'deny';
  }
  if (status === 'denied') {
    return 'deny';
  }
  if (status === 'resolved') {
    return 'allow';
  }
  return 'restrict';
}

/**
 * Provider sonucundan tenant / identity / session kimliklerini çözer.
 */
export function resolveTenantBridgeIdentifiers(
  providerResult: TenantProviderResult,
  options: MapTenantProviderToIsolationOptions
): {
  tenantId: string;
  slug: string;
  displayName: string;
  isolationModuleId: string;
  identityId: string;
  sessionId?: string;
} {
  const bagTenant = providerResult.bag?.supabaseTenant as
    | { id?: string; slug?: string; displayName?: string }
    | undefined;

  const tenantId =
    providerResult.tenant?.tenantId ||
    bagTenant?.id ||
    options.existingModule?.tenantIdentity.tenantId ||
    `tenant-bridge-${providerResult.providerId}`;

  const slug =
    providerResult.tenant?.slug ||
    bagTenant?.slug ||
    options.existingModule?.tenantIdentity.slug ||
    tenantId;

  const displayName =
    providerResult.tenant?.displayName ||
    bagTenant?.displayName ||
    options.existingModule?.tenantIdentity.displayName ||
    slug;

  const identityId =
    options.identityId ||
    providerResult.memberships?.[0]?.identityId ||
    options.existingModule?.primaryIdentityId ||
    'identity-unknown';

  const sessionId =
    options.sessionId || options.existingModule?.sessionId || undefined;

  const isolationModuleId =
    options.existingModule?.id || `isolation-bridge-${tenantId}`;

  return {
    tenantId,
    slug,
    displayName,
    isolationModuleId,
    identityId,
    sessionId
  };
}

/**
 * TenantProviderResult → TenantIsolationModule.
 */
export function mapTenantProviderResultToIsolationModule(
  providerResult: TenantProviderResult,
  options: MapTenantProviderToIsolationOptions
): TenantIsolationModule {
  const nowIso = options.nowIso ?? new Date().toISOString();
  const existing = options.existingModule;
  const ids = resolveTenantBridgeIdentifiers(providerResult, options);

  const tenantIdentity: TenantIdentityRef = {
    tenantId: ids.tenantId,
    slug: ids.slug,
    displayName: ids.displayName
  };

  const boundary: TenantBoundary = existing?.boundary ?? {
    boundaryId: `boundary-${ids.tenantId}`,
    tenantId: ids.tenantId,
    label: `${ids.displayName} boundary`,
    strict: true
  };

  const memberships: TenantMembership[] =
    providerResult.memberships && providerResult.memberships.length > 0
      ? providerResult.memberships.map((item) => ({ ...item }))
      : existing?.memberships
        ? existing.memberships.map((item) => ({ ...item }))
        : ids.identityId !== 'identity-unknown'
          ? [
              {
                membershipId: `membership-bridge-${ids.identityId}-${ids.tenantId}`,
                identityId: ids.identityId,
                tenantId: ids.tenantId,
                roleLabel: 'member',
                active: providerResult.success
              }
            ]
          : [];

  const scopes: TenantIsolationScope[] = existing?.scopes
    ? existing.scopes.map((item) => ({ ...item }))
    : [
        {
          scopeId: `scope-tenant-${ids.tenantId}`,
          level: 'tenant',
          tenantId: ids.tenantId
        },
        {
          scopeId: `scope-membership-${ids.tenantId}`,
          level: 'membership',
          tenantId: ids.tenantId
        }
      ];

  const accessScope: TenantAccessScope = providerResult.accessScope
    ? {
        ...providerResult.accessScope,
        allowedTenantIds: Object.freeze([
          ...providerResult.accessScope.allowedTenantIds
        ])
      }
    : existing?.accessScope
      ? {
          ...existing.accessScope,
          allowedTenantIds: Object.freeze([
            ...existing.accessScope.allowedTenantIds
          ])
        }
      : {
          accessScopeId: `access-scope-${ids.tenantId}`,
          allowedTenantIds: Object.freeze([ids.tenantId]),
          crossTenantAllowed: false
        };

  const outcome = mapTenantProviderStatusToDecisionOutcome(
    providerResult.status,
    options.operation,
    providerResult.accessOutcome
  );

  const decision: TenantIsolationDecision = {
    decisionId: `decision-bridge-${options.operation}-${ids.tenantId}`,
    outcome,
    identityId: ids.identityId,
    sourceTenantId: ids.tenantId,
    targetTenantId: ids.tenantId,
    ruleId: `rule-bridge-${options.operation}`,
    reason: `bridge:${options.operation}:${providerResult.status}`
  };

  const isolationRules =
    existing?.isolationRules && existing.isolationRules.length > 0
      ? existing.isolationRules.map((item) => ({ ...item }))
      : [
          {
            ruleId: `rule-bridge-${ids.tenantId}`,
            name: 'Bridge default boundary',
            sourceTenantId: ids.tenantId,
            effect: 'allow' as const
          }
        ];

  return {
    id: ids.isolationModuleId,
    tenantIdentity,
    boundary,
    memberships: Object.freeze(memberships),
    scopes: Object.freeze(scopes),
    isolationRules: Object.freeze(isolationRules),
    accessScope,
    decisions: Object.freeze([decision]),
    primaryIdentityId: ids.identityId,
    sessionId: ids.sessionId,
    order: options.order ?? existing?.order ?? 100,
    createdAt: existing?.createdAt || nowIso,
    updatedAt: nowIso
  };
}

/**
 * TenantIsolationModule → binding.
 */
export function createBridgeBindingFromIsolationModule(
  module: TenantIsolationModule,
  providerId: string,
  operation: TenantSessionBridgeOperation,
  existing?: TenantSessionBridgeBinding
): TenantSessionBridgeBinding {
  const nowIso = new Date().toISOString();
  return {
    id: existing?.id || `tenant-bridge-${module.id}`,
    providerId,
    tenantId: module.tenantIdentity.tenantId,
    isolationModuleId: module.id,
    sessionId: module.sessionId,
    identityId: module.primaryIdentityId,
    membershipCount: module.memberships.length,
    order: existing?.order ?? module.order,
    createdAt: existing?.createdAt || module.createdAt,
    updatedAt: nowIso,
    lastOperation: operation
  };
}

/**
 * Provider validation issue → bridge issue.
 */
export function mapTenantProviderIssuesToBridgeIssues(
  providerResult: TenantProviderResult | undefined
): TenantSessionBridgeValidationIssue[] {
  if (!providerResult) {
    return [];
  }
  return providerResult.validationIssues.map((issue) => ({
    code: issue.code,
    message: issue.message,
    severity: issue.severity
  }));
}

/**
 * TenantIsolationModule projeksiyon yardımcı.
 */
export function projectMappedIsolationModule(
  module: TenantIsolationModule
): ReturnType<typeof toTenantIsolationProjection> {
  return toTenantIsolationProjection(module);
}
