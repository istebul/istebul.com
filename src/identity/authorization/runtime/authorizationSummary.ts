/**
 * İSTEBUL Identity — authorization özeti (PR-203D).
 *
 * Pipeline aşaması 6: Summary.
 * Yalnızca projeksiyon özeti — Middleware / Policy Engine / RLS / API / DB yok.
 */

import type { AuthorizationContext } from './AuthorizationContext';
import type { AuthorizationProjection } from './AuthorizationModule';
import type { IdentityProjection } from '../../runtime/IdentityModule';
import type { AuthenticationProjection } from '../../authentication/runtime/AuthenticationModule';
import type { SessionProjection } from '../../session/runtime/SessionModule';
import type {
  AuthorizationSummary,
  AuthorizationSummaryItem,
  AuthorizationValidationIssue
} from './AuthorizationResult';

/**
 * Authorization projeksiyonlarından AuthorizationSummary üretir.
 */
export function buildAuthorizationSummary(
  authorizations: readonly AuthorizationProjection[],
  identityProjections: readonly IdentityProjection[],
  authenticationProjections: readonly AuthenticationProjection[],
  sessionProjections: readonly SessionProjection[],
  requestedCount: number,
  unavailableCount: number,
  hasErrors: boolean
): AuthorizationSummary {
  let roleCount = 0;
  let permissionCount = 0;
  let decisionCount = 0;
  let allowCount = 0;
  let denyCount = 0;

  for (const item of authorizations) {
    roleCount += item.roles.length;
    permissionCount += item.permissions.length;
    decisionCount += item.decisions.length;
    allowCount += item.allowCount;
    denyCount += item.denyCount;
  }

  return {
    success: !hasErrors && authorizations.length > 0,
    authorizationCount: authorizations.length,
    roleCount,
    permissionCount,
    decisionCount,
    allowCount,
    denyCount,
    requestedCount,
    unavailableCount,
    identityProjectionCount: identityProjections.length,
    authenticationProjectionCount: authenticationProjections.length,
    sessionProjectionCount: sessionProjections.length
  };
}

/**
 * Düz özet öğeleri üretir.
 */
export function buildAuthorizationSummaryItems(
  context: AuthorizationContext,
  summary: AuthorizationSummary,
  validationIssues: readonly AuthorizationValidationIssue[]
): readonly AuthorizationSummaryItem[] {
  const items: AuthorizationSummaryItem[] = [
    { key: 'locale', label: 'Locale', value: context.locale },
    {
      key: 'authorization-count',
      label: 'Authorization Count',
      value: summary.authorizationCount
    },
    {
      key: 'role-count',
      label: 'Role Count',
      value: summary.roleCount
    },
    {
      key: 'permission-count',
      label: 'Permission Count',
      value: summary.permissionCount
    },
    {
      key: 'decision-count',
      label: 'Decision Count',
      value: summary.decisionCount
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

  if (context.identityId) {
    items.push({
      key: 'identity-id',
      label: 'Identity ID',
      value: context.identityId
    });
  }

  if (context.sessionId) {
    items.push({
      key: 'session-id',
      label: 'Session ID',
      value: context.sessionId
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
