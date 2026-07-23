/**
 * İSTEBUL Identity — tenant isolation özeti (PR-203E).
 *
 * Pipeline aşaması 7: Summary.
 * Yalnızca projeksiyon özeti — Supabase RLS / DB / API / Middleware yok.
 */

import type { TenantIsolationContext } from './TenantIsolationContext';
import type { TenantIsolationProjection } from './TenantIsolationModule';
import type { IdentityProjection } from '../../runtime/IdentityModule';
import type { AuthenticationProjection } from '../../authentication/runtime/AuthenticationModule';
import type { SessionProjection } from '../../session/runtime/SessionModule';
import type { AuthorizationProjection } from '../../authorization/runtime/AuthorizationModule';
import type {
  TenantIsolationSummary,
  TenantIsolationSummaryItem,
  TenantIsolationValidationIssue
} from './TenantIsolationResult';

/**
 * Tenant Isolation projeksiyonlarından Summary üretir.
 */
export function buildTenantIsolationSummary(
  isolations: readonly TenantIsolationProjection[],
  identityProjections: readonly IdentityProjection[],
  authenticationProjections: readonly AuthenticationProjection[],
  sessionProjections: readonly SessionProjection[],
  authorizationProjections: readonly AuthorizationProjection[],
  requestedCount: number,
  unavailableCount: number,
  hasErrors: boolean
): TenantIsolationSummary {
  const tenantIds = new Set<string>();
  let membershipCount = 0;
  let isolationDecisionCount = 0;
  let allowCount = 0;
  let denyCount = 0;
  let restrictCount = 0;

  for (const item of isolations) {
    tenantIds.add(item.tenantIdentity.tenantId);
    membershipCount += item.membershipCount;
    isolationDecisionCount += item.decisionCount;
    allowCount += item.allowCount;
    denyCount += item.denyCount;
    restrictCount += item.restrictCount;
  }

  return {
    success: !hasErrors && isolations.length > 0,
    tenantCount: tenantIds.size,
    membershipCount,
    isolationDecisionCount,
    allowCount,
    denyCount,
    restrictCount,
    requestedCount,
    unavailableCount,
    identityProjectionCount: identityProjections.length,
    authenticationProjectionCount: authenticationProjections.length,
    sessionProjectionCount: sessionProjections.length,
    authorizationProjectionCount: authorizationProjections.length
  };
}

/**
 * Düz özet öğeleri üretir.
 */
export function buildTenantIsolationSummaryItems(
  context: TenantIsolationContext,
  summary: TenantIsolationSummary,
  validationIssues: readonly TenantIsolationValidationIssue[]
): readonly TenantIsolationSummaryItem[] {
  const items: TenantIsolationSummaryItem[] = [
    { key: 'locale', label: 'Locale', value: context.locale },
    {
      key: 'tenant-count',
      label: 'Tenant Count',
      value: summary.tenantCount
    },
    {
      key: 'membership-count',
      label: 'Membership Count',
      value: summary.membershipCount
    },
    {
      key: 'isolation-decision-count',
      label: 'Isolation Decision Count',
      value: summary.isolationDecisionCount
    },
    {
      key: 'allow-count',
      label: 'Allow Count',
      value: summary.allowCount
    },
    {
      key: 'deny-count',
      label: 'Deny Count',
      value: summary.denyCount
    },
    {
      key: 'restrict-count',
      label: 'Restrict Count',
      value: summary.restrictCount
    },
    {
      key: 'identity-projection-count',
      label: 'Identity Projection Count',
      value: summary.identityProjectionCount
    },
    {
      key: 'authentication-projection-count',
      label: 'Authentication Projection Count',
      value: summary.authenticationProjectionCount
    },
    {
      key: 'session-projection-count',
      label: 'Session Projection Count',
      value: summary.sessionProjectionCount
    },
    {
      key: 'authorization-projection-count',
      label: 'Authorization Projection Count',
      value: summary.authorizationProjectionCount
    },
    {
      key: 'requested-count',
      label: 'Requested Count',
      value: summary.requestedCount
    },
    {
      key: 'unavailable-count',
      label: 'Unavailable Count',
      value: summary.unavailableCount
    },
    {
      key: 'validation-issue-count',
      label: 'Validation Issue Count',
      value: validationIssues.length
    },
    {
      key: 'has-errors',
      label: 'Has Errors',
      value: validationIssues.some((item) => item.severity === 'error')
    },
    {
      key: 'success',
      label: 'Success',
      value: summary.success
    }
  ];

  if (context.tenantId) {
    items.push({
      key: 'tenant-id',
      label: 'Tenant ID',
      value: context.tenantId
    });
  }

  if (context.identityId) {
    items.push({
      key: 'identity-id',
      label: 'Identity ID',
      value: context.identityId
    });
  }

  if (context.decisionOutcome) {
    items.push({
      key: 'decision-outcome-filter',
      label: 'Decision Outcome Filter',
      value: context.decisionOutcome
    });
  }

  if (context.actorId) {
    items.push({
      key: 'actor-id',
      label: 'Actor ID',
      value: context.actorId
    });
  }

  return Object.freeze(items);
}
