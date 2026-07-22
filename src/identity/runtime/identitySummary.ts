/**
 * İSTEBUL Identity — kimlik özeti (PR-203A).
 *
 * Pipeline aşaması 3: Summary.
 * Yalnızca projeksiyon özeti — Auth / API / DB yok.
 */

import type { IdentityContext } from './IdentityContext';
import type {
  IdentityProjection,
  IdentityStatus
} from './IdentityModule';
import type {
  IdentityExecutionSummary,
  IdentitySummaryItem,
  IdentityValidationIssue
} from './IdentityResult';

function emptyStatusCounts(): Record<IdentityStatus, number> {
  return {
    active: 0,
    inactive: 0,
    pending: 0,
    suspended: 0
  };
}

/**
 * Identity projeksiyonlarından yürütme özeti üretir.
 */
export function buildIdentitySummary(
  projections: readonly IdentityProjection[],
  requestedCount: number,
  unavailableCount: number,
  hasErrors: boolean
): IdentityExecutionSummary {
  const statusCounts = emptyStatusCounts();
  let roleCount = 0;
  let permissionCount = 0;

  for (const item of projections) {
    statusCounts[item.status] += 1;
    roleCount += item.roles.length;
    permissionCount += item.permissions.length;
  }

  return {
    success: !hasErrors && projections.length > 0,
    identityCount: projections.length,
    roleCount,
    permissionCount,
    requestedCount,
    unavailableCount,
    statusCounts: Object.freeze(statusCounts)
  };
}

/**
 * Identity özet öğelerini üretir.
 */
export function buildIdentitySummaryItems(
  context: IdentityContext,
  summary: IdentityExecutionSummary,
  validationIssues: readonly IdentityValidationIssue[]
): readonly IdentitySummaryItem[] {
  const items: IdentitySummaryItem[] = [
    {
      key: 'locale',
      label: 'Locale',
      value: context.locale
    },
    {
      key: 'identity-count',
      label: 'Identity Count',
      value: summary.identityCount
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
      key: 'status-active',
      label: 'Status: active',
      value: summary.statusCounts.active
    },
    {
      key: 'status-inactive',
      label: 'Status: inactive',
      value: summary.statusCounts.inactive
    },
    {
      key: 'status-pending',
      label: 'Status: pending',
      value: summary.statusCounts.pending
    },
    {
      key: 'status-suspended',
      label: 'Status: suspended',
      value: summary.statusCounts.suspended
    }
  ];

  if (context.tenantId) {
    items.push({
      key: 'tenant-id',
      label: 'Tenant ID',
      value: context.tenantId
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
