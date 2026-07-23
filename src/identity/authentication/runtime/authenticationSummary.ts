/**
 * İSTEBUL Identity — authentication özeti (PR-203B).
 *
 * Pipeline aşaması 4: Summary.
 * Yalnızca projeksiyon özeti — Auth provider / API / DB yok.
 */

import type { AuthenticationContext } from './AuthenticationContext';
import type {
  AuthenticationProjection,
  AuthenticationStatus
} from './AuthenticationModule';
import type { IdentityProjection } from '../../runtime/IdentityModule';
import type {
  AuthenticationSummary,
  AuthenticationSummaryItem,
  AuthenticationValidationIssue
} from './AuthenticationResult';

function emptyStatusCounts(): Record<AuthenticationStatus, number> {
  return {
    authenticated: 0,
    unauthenticated: 0,
    expired: 0,
    revoked: 0,
    pending: 0
  };
}

/**
 * Authentication projeksiyonlarından AuthenticationSummary üretir.
 */
export function buildAuthenticationSummary(
  authentications: readonly AuthenticationProjection[],
  identityProjections: readonly IdentityProjection[],
  requestedCount: number,
  unavailableCount: number,
  hasErrors: boolean
): AuthenticationSummary {
  const statusCounts = emptyStatusCounts();
  const principalIds = new Set<string>();

  for (const item of authentications) {
    statusCounts[item.status] += 1;
    if (item.status === 'authenticated') {
      principalIds.add(item.principal.principalId);
    }
  }

  return {
    success: !hasErrors && authentications.length > 0,
    authenticationStateCount: authentications.length,
    authenticatedPrincipalCount: principalIds.size,
    requestedCount,
    unavailableCount,
    identityProjectionCount: identityProjections.length,
    statusCounts: Object.freeze(statusCounts)
  };
}

/**
 * Düz özet öğeleri üretir.
 */
export function buildAuthenticationSummaryItems(
  context: AuthenticationContext,
  summary: AuthenticationSummary,
  validationIssues: readonly AuthenticationValidationIssue[]
): readonly AuthenticationSummaryItem[] {
  const items: AuthenticationSummaryItem[] = [
    { key: 'locale', label: 'Locale', value: context.locale },
    {
      key: 'authentication-state-count',
      label: 'Authentication State Count',
      value: summary.authenticationStateCount
    },
    {
      key: 'authenticated-principal-count',
      label: 'Authenticated Principal Count',
      value: summary.authenticatedPrincipalCount
    },
    {
      key: 'identity-projection-count',
      label: 'Identity Projection Count',
      value: summary.identityProjectionCount
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
    },
    {
      key: 'status-authenticated',
      label: 'Status: authenticated',
      value: summary.statusCounts.authenticated
    },
    {
      key: 'status-unauthenticated',
      label: 'Status: unauthenticated',
      value: summary.statusCounts.unauthenticated
    },
    {
      key: 'status-expired',
      label: 'Status: expired',
      value: summary.statusCounts.expired
    },
    {
      key: 'status-revoked',
      label: 'Status: revoked',
      value: summary.statusCounts.revoked
    },
    {
      key: 'status-pending',
      label: 'Status: pending',
      value: summary.statusCounts.pending
    }
  ];

  if (context.identityId) {
    items.push({
      key: 'identity-id',
      label: 'Identity ID',
      value: context.identityId
    });
  }

  if (context.status) {
    items.push({
      key: 'status-filter',
      label: 'Status Filter',
      value: context.status
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
