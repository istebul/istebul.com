/**
 * İSTEBUL Platform Admin — TenantSummary (PR-201B).
 */

import type { TenantProjection, TenantStatus, TenantPlanId } from './Tenant';

/**
 * Tenant Summary — yürütme özeti.
 */
export interface TenantSummary {
  /** Genel başarı */
  success: boolean;
  /** Projeksiyon üretilen tenant sayısı */
  tenantCount: number;
  /** İstenen tenant sayısı */
  requestedCount: number;
  /** Bulunamayan tenant sayısı */
  unavailableCount: number;
  /** Durum bazlı sayılar */
  statusCounts: Readonly<Record<TenantStatus, number>>;
  /** Plan bazlı sayılar */
  planCounts: Readonly<Partial<Record<TenantPlanId, number>>>;
}

/**
 * Özet öğesi — telemetry / UI için düz liste.
 */
export interface TenantSummaryItem {
  key: string;
  label: string;
  value: string | number | boolean;
}

function emptyStatusCounts(): Record<TenantStatus, number> {
  return {
    active: 0,
    suspended: 0,
    pending: 0,
    archived: 0
  };
}

/**
 * Tenant projeksiyonlarından TenantSummary üretir.
 */
export function buildTenantSummary(
  projections: readonly TenantProjection[],
  requestedCount: number,
  unavailableCount: number,
  hasErrors: boolean
): TenantSummary {
  const statusCounts = emptyStatusCounts();
  const planCounts: Partial<Record<TenantPlanId, number>> = {};

  for (const item of projections) {
    statusCounts[item.status] += 1;
    planCounts[item.plan] = (planCounts[item.plan] ?? 0) + 1;
  }

  return {
    success: !hasErrors && projections.length > 0,
    tenantCount: projections.length,
    requestedCount,
    unavailableCount,
    statusCounts: Object.freeze(statusCounts),
    planCounts: Object.freeze(planCounts)
  };
}

/**
 * Düz özet öğeleri üretir.
 */
export function buildTenantSummaryItems(
  summary: TenantSummary,
  locale: 'tr' | 'en',
  actorId?: string
): readonly TenantSummaryItem[] {
  const items: TenantSummaryItem[] = [
    { key: 'locale', label: 'Locale', value: locale },
    {
      key: 'tenant-count',
      label: 'Tenant Count',
      value: summary.tenantCount
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
      key: 'status-suspended',
      label: 'Status: suspended',
      value: summary.statusCounts.suspended
    },
    {
      key: 'status-pending',
      label: 'Status: pending',
      value: summary.statusCounts.pending
    },
    {
      key: 'status-archived',
      label: 'Status: archived',
      value: summary.statusCounts.archived
    }
  ];

  for (const [plan, count] of Object.entries(summary.planCounts)) {
    items.push({
      key: `plan-${plan}`,
      label: `Plan: ${plan}`,
      value: count ?? 0
    });
  }

  if (actorId) {
    items.push({ key: 'actor-id', label: 'Actor ID', value: actorId });
  }

  return Object.freeze(items);
}
