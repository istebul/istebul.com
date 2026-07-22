/**
 * İSTEBUL Identity — Authentication/Session → Identity mapping (EPIC-301D).
 *
 * Provider + Session Bridge sonuçlarını Identity Runtime modeline dönüştürür.
 */

import type { AuthenticationProviderResult } from '../authentication/adapters/AuthenticationProviderResult';
import type { AuthenticationStatus } from '../authentication/runtime/AuthenticationModule';
import type { AuthenticationSessionBridgeResult } from '../authentication/bridge/AuthenticationSessionBridgeResult';
import type {
  IdentityModule,
  IdentityStatus,
  IdentityTenant,
  IdentityUser
} from '../runtime/IdentityModule';
import { toIdentityProjection } from '../runtime/IdentityModule';
import type { IdentityBridgeOperation } from './IdentityBridgeContext';
import type { IdentityBridgeValidationIssue } from './IdentityBridgeResult';
import type { IdentityBridgeBinding } from './IdentityBridgeRegistry';

export interface MapToIdentityModuleOptions {
  operation: IdentityBridgeOperation;
  existingModule?: IdentityModule;
  nowIso?: string;
  order?: number;
}

/**
 * Authentication status → Identity status.
 */
export function mapAuthenticationStatusToIdentityStatus(
  status: AuthenticationStatus,
  operation: IdentityBridgeOperation
): IdentityStatus {
  if (operation === 'logout') {
    return 'inactive';
  }
  switch (status) {
    case 'authenticated':
      return 'active';
    case 'expired':
      return 'inactive';
    case 'revoked':
      return 'suspended';
    case 'pending':
      return 'pending';
    case 'unauthenticated':
    default:
      return operation === 'validate' ? 'inactive' : 'pending';
  }
}

/**
 * Provider + session bridge sonuçlarından kimlikleri çözer.
 */
export function resolveIdentityIdentifiers(
  providerResult: AuthenticationProviderResult,
  sessionBridgeResult?: AuthenticationSessionBridgeResult,
  existingModule?: IdentityModule
): {
  identityId: string;
  identityModuleId: string;
  displayName: string;
  email?: string;
  tenantId: string;
  sessionId?: string;
  principalId?: string;
  authenticationId?: string;
} {
  const bagUser = providerResult.bag?.supabaseUser as
    | { id?: string; email?: string; displayName?: string; tenantId?: string }
    | undefined;

  const identityId =
    providerResult.principal?.identityId ||
    bagUser?.id ||
    existingModule?.user.id ||
    existingModule?.id ||
    'identity-unknown';

  const displayName =
    providerResult.principal?.displayName ||
    bagUser?.displayName ||
    bagUser?.email ||
    existingModule?.user.displayName ||
    identityId;

  const email =
    bagUser?.email ||
    existingModule?.user.email ||
    (providerResult.principal?.displayName?.includes('@')
      ? providerResult.principal.displayName
      : undefined);

  const tenantId =
    providerResult.principal?.tenantId ||
    bagUser?.tenantId ||
    existingModule?.tenant.id ||
    'tenant-bridge-default';

  const sessionId =
    sessionBridgeResult?.sessionModule?.session.sessionId ||
    sessionBridgeResult?.binding?.sessionId ||
    providerResult.credentialReference?.credentialId ||
    (providerResult.bag?.supabaseSession as { sessionId?: string } | undefined)
      ?.sessionId ||
    existingModule?.sessionReference.sessionId;

  const principalId =
    providerResult.principal?.principalId ||
    sessionBridgeResult?.sessionModule?.session.principalId ||
    existingModule?.claims.principalId?.toString();

  const authenticationId =
    sessionBridgeResult?.sessionModule?.session.authenticationId ||
    sessionBridgeResult?.binding?.authenticationId;

  const identityModuleId = existingModule?.id || `identity-bridge-${identityId}`;

  return {
    identityId,
    identityModuleId,
    displayName,
    email,
    tenantId,
    sessionId,
    principalId,
    authenticationId
  };
}

/**
 * Provider + Session Bridge → IdentityModule.
 */
export function mapIntegrationResultsToIdentityModule(
  providerResult: AuthenticationProviderResult,
  options: MapToIdentityModuleOptions,
  sessionBridgeResult?: AuthenticationSessionBridgeResult
): IdentityModule {
  const nowIso = options.nowIso ?? new Date().toISOString();
  const existing = options.existingModule;
  const ids = resolveIdentityIdentifiers(
    providerResult,
    sessionBridgeResult,
    existing
  );
  const status = mapAuthenticationStatusToIdentityStatus(
    providerResult.status,
    options.operation
  );

  const user: IdentityUser = {
    id: ids.identityId,
    displayName: ids.displayName,
    email: ids.email,
    username: existing?.user.username
  };

  const tenant: IdentityTenant = {
    id: ids.tenantId,
    slug: existing?.tenant.slug || ids.tenantId,
    displayName: existing?.tenant.displayName || ids.tenantId
  };

  const sessionExpiresAt =
    sessionBridgeResult?.sessionModule?.session.expiration.expiresAt ||
    providerResult.credentialReference?.expiresAt ||
    existing?.sessionReference.expiresAt;

  const sessionIssuedAt =
    sessionBridgeResult?.sessionModule?.session.lifetime.startedAt ||
    providerResult.credentialReference?.issuedAt ||
    existing?.sessionReference.issuedAt ||
    nowIso;

  const claims = Object.freeze({
    ...(existing?.claims ?? {}),
    providerId: providerResult.providerId,
    authenticationStatus: providerResult.status,
    ...(ids.principalId ? { principalId: ids.principalId } : {}),
    ...(ids.authenticationId
      ? { authenticationId: ids.authenticationId }
      : {}),
    bridgeOperation: options.operation
  });

  return {
    id: ids.identityModuleId,
    user,
    tenant,
    roles: existing?.roles ?? Object.freeze([]),
    permissions: existing?.permissions ?? Object.freeze([]),
    claims,
    sessionReference: {
      sessionId: ids.sessionId || `sess-bridge-${ids.identityId}`,
      issuedAt: sessionIssuedAt,
      expiresAt: sessionExpiresAt
    },
    status,
    order: options.order ?? existing?.order ?? 100,
    createdAt: existing?.createdAt || nowIso,
    updatedAt: nowIso
  };
}

/**
 * IdentityModule → binding.
 */
export function createIdentityBridgeBindingFromModule(
  module: IdentityModule,
  providerId: string,
  operation: IdentityBridgeOperation,
  sessionBridgeResult?: AuthenticationSessionBridgeResult,
  existing?: IdentityBridgeBinding
): IdentityBridgeBinding {
  const nowIso = new Date().toISOString();
  return {
    id: existing?.id || `identity-bridge-${module.id}`,
    providerId,
    identityModuleId: module.id,
    identityId: module.user.id,
    sessionModuleId:
      sessionBridgeResult?.sessionModule?.id || existing?.sessionModuleId,
    sessionId:
      sessionBridgeResult?.sessionModule?.session.sessionId ||
      module.sessionReference.sessionId ||
      existing?.sessionId,
    sessionBridgeBindingId:
      sessionBridgeResult?.binding?.id || existing?.sessionBridgeBindingId,
    authenticationId:
      sessionBridgeResult?.sessionModule?.session.authenticationId ||
      existing?.authenticationId,
    principalId:
      typeof module.claims.principalId === 'string'
        ? module.claims.principalId
        : existing?.principalId,
    order: existing?.order ?? module.order,
    createdAt: existing?.createdAt || module.createdAt,
    updatedAt: nowIso,
    lastOperation: operation
  };
}

/**
 * Provider / session bridge validation issues → identity bridge issues.
 */
export function mapIntegrationIssuesToIdentityBridgeIssues(
  providerResult?: AuthenticationProviderResult,
  sessionBridgeResult?: AuthenticationSessionBridgeResult
): IdentityBridgeValidationIssue[] {
  const issues: IdentityBridgeValidationIssue[] = [];
  if (providerResult) {
    for (const issue of providerResult.validationIssues) {
      issues.push({
        code: issue.code,
        message: issue.message,
        severity: issue.severity
      });
    }
  }
  if (sessionBridgeResult) {
    for (const issue of sessionBridgeResult.validationIssues) {
      issues.push({
        code: `SESSION_${issue.code}`,
        message: issue.message,
        severity: issue.severity
      });
    }
  }
  return issues;
}

/**
 * IdentityModule projeksiyon yardımcı.
 */
export function projectMappedIdentityModule(
  module: IdentityModule
): ReturnType<typeof toIdentityProjection> {
  return toIdentityProjection(module);
}
