/**
 * İSTEBUL Platform Admin — UserSummary (PR-201C).
 */

import type { UserProjection, UserStatus, UserRole } from './User';

/**
 * User Summary — yürütme özeti.
 */
export interface UserSummary {
  /** Genel başarı */
  success: boolean;
  /** Projeksiyon üretilen kullanıcı sayısı */
  userCount: number;
  /** İstenen kullanıcı sayısı */
  requestedCount: number;
  /** Bulunamayan kullanıcı sayısı */
  unavailableCount: number;
  /** Durum bazlı sayılar */
  statusCounts: Readonly<Record<UserStatus, number>>;
  /** Rol bazlı sayılar */
  roleCounts: Readonly<Partial<Record<UserRole, number>>>;
}

/**
 * Özet öğesi — telemetry / UI için düz liste.
 */
export interface UserSummaryItem {
  key: string;
  label: string;
  value: string | number | boolean;
}

function emptyStatusCounts(): Record<UserStatus, number> {
  return {
    active: 0,
    invited: 0,
    suspended: 0,
    deactivated: 0
  };
}

/**
 * User projeksiyonlarından UserSummary üretir.
 */
export function buildUserSummary(
  projections: readonly UserProjection[],
  requestedCount: number,
  unavailableCount: number,
  hasErrors: boolean
): UserSummary {
  const statusCounts = emptyStatusCounts();
  const roleCounts: Partial<Record<UserRole, number>> = {};

  for (const item of projections) {
    statusCounts[item.status] += 1;
    roleCounts[item.role] = (roleCounts[item.role] ?? 0) + 1;
  }

  return {
    success: !hasErrors && projections.length > 0,
    userCount: projections.length,
    requestedCount,
    unavailableCount,
    statusCounts: Object.freeze(statusCounts),
    roleCounts: Object.freeze(roleCounts)
  };
}

/**
 * Düz özet öğeleri üretir.
 */
export function buildUserSummaryItems(
  summary: UserSummary,
  locale: 'tr' | 'en',
  actorId?: string
): readonly UserSummaryItem[] {
  const items: UserSummaryItem[] = [
    { key: 'locale', label: 'Locale', value: locale },
    {
      key: 'user-count',
      label: 'User Count',
      value: summary.userCount
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
      key: 'status-invited',
      label: 'Status: invited',
      value: summary.statusCounts.invited
    },
    {
      key: 'status-suspended',
      label: 'Status: suspended',
      value: summary.statusCounts.suspended
    },
    {
      key: 'status-deactivated',
      label: 'Status: deactivated',
      value: summary.statusCounts.deactivated
    }
  ];

  for (const [role, count] of Object.entries(summary.roleCounts)) {
    items.push({
      key: `role-${role}`,
      label: `Role: ${role}`,
      value: count ?? 0
    });
  }

  if (actorId) {
    items.push({ key: 'actor-id', label: 'Actor ID', value: actorId });
  }

  return Object.freeze(items);
}
