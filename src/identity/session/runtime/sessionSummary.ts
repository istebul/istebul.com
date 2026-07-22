/**
 * İSTEBUL Identity — session özeti (PR-203C).
 *
 * Pipeline aşaması 5: Summary.
 * Yalnızca projeksiyon özeti — JWT / Cookie / Refresh Token / API / DB yok.
 */

import type { SessionContext } from './SessionContext';
import type { SessionProjection, SessionState } from './SessionModule';
import type { IdentityProjection } from '../../runtime/IdentityModule';
import type { AuthenticationProjection } from '../../authentication/runtime/AuthenticationModule';
import type {
  SessionSummary,
  SessionSummaryItem,
  SessionValidationIssue
} from './SessionResult';

function emptyStateCounts(): Record<SessionState, number> {
  return {
    active: 0,
    idle: 0,
    expired: 0,
    revoked: 0,
    pending: 0
  };
}

/**
 * Session projeksiyonlarından SessionSummary üretir.
 */
export function buildSessionSummary(
  sessions: readonly SessionProjection[],
  identityProjections: readonly IdentityProjection[],
  authenticationProjections: readonly AuthenticationProjection[],
  requestedCount: number,
  unavailableCount: number,
  hasErrors: boolean
): SessionSummary {
  const stateCounts = emptyStateCounts();
  let activeSessionCount = 0;
  let expiredSessionCount = 0;

  for (const item of sessions) {
    stateCounts[item.state] += 1;
    if (item.state === 'active') {
      activeSessionCount += 1;
    }
    if (item.state === 'expired' || item.expiration.isExpired) {
      expiredSessionCount += 1;
    }
  }

  return {
    success: !hasErrors && sessions.length > 0,
    sessionCount: sessions.length,
    activeSessionCount,
    expiredSessionCount,
    requestedCount,
    unavailableCount,
    identityProjectionCount: identityProjections.length,
    authenticationProjectionCount: authenticationProjections.length,
    stateCounts: Object.freeze(stateCounts)
  };
}

/**
 * Düz özet öğeleri üretir.
 */
export function buildSessionSummaryItems(
  context: SessionContext,
  summary: SessionSummary,
  validationIssues: readonly SessionValidationIssue[]
): readonly SessionSummaryItem[] {
  const items: SessionSummaryItem[] = [
    { key: 'locale', label: 'Locale', value: context.locale },
    {
      key: 'session-count',
      label: 'Session Count',
      value: summary.sessionCount
    },
    {
      key: 'active-session-count',
      label: 'Active Session Count',
      value: summary.activeSessionCount
    },
    {
      key: 'expired-session-count',
      label: 'Expired Session Count',
      value: summary.expiredSessionCount
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
      key: 'state-active',
      label: 'State: active',
      value: summary.stateCounts.active
    },
    {
      key: 'state-idle',
      label: 'State: idle',
      value: summary.stateCounts.idle
    },
    {
      key: 'state-expired',
      label: 'State: expired',
      value: summary.stateCounts.expired
    },
    {
      key: 'state-revoked',
      label: 'State: revoked',
      value: summary.stateCounts.revoked
    },
    {
      key: 'state-pending',
      label: 'State: pending',
      value: summary.stateCounts.pending
    }
  ];

  if (context.identityId) {
    items.push({
      key: 'identity-id',
      label: 'Identity ID',
      value: context.identityId
    });
  }

  if (context.authenticationId) {
    items.push({
      key: 'authentication-id',
      label: 'Authentication ID',
      value: context.authenticationId
    });
  }

  if (context.state) {
    items.push({
      key: 'state-filter',
      label: 'State Filter',
      value: context.state
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
