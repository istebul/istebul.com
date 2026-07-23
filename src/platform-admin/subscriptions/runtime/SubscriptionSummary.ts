/**
 * İSTEBUL Platform Admin — SubscriptionSummary (PR-201D).
 */

import type {
  SubscriptionProjection,
  SubscriptionStatus,
  SubscriptionPlanId
} from './Subscription';

/**
 * Subscription Summary — yürütme özeti.
 */
export interface SubscriptionSummary {
  /** Genel başarı */
  success: boolean;
  /** Projeksiyon üretilen abonelik sayısı */
  subscriptionCount: number;
  /** İstenen abonelik sayısı */
  requestedCount: number;
  /** Bulunamayan abonelik sayısı */
  unavailableCount: number;
  /** Durum bazlı sayılar */
  statusCounts: Readonly<Record<SubscriptionStatus, number>>;
  /** Plan bazlı sayılar */
  planCounts: Readonly<Partial<Record<SubscriptionPlanId, number>>>;
}

/**
 * Özet öğesi — telemetry / UI için düz liste.
 */
export interface SubscriptionSummaryItem {
  key: string;
  label: string;
  value: string | number | boolean;
}

function emptyStatusCounts(): Record<SubscriptionStatus, number> {
  return {
    trialing: 0,
    active: 0,
    past_due: 0,
    cancelled: 0,
    paused: 0
  };
}

/**
 * Subscription projeksiyonlarından SubscriptionSummary üretir.
 */
export function buildSubscriptionSummary(
  projections: readonly SubscriptionProjection[],
  requestedCount: number,
  unavailableCount: number,
  hasErrors: boolean
): SubscriptionSummary {
  const statusCounts = emptyStatusCounts();
  const planCounts: Partial<Record<SubscriptionPlanId, number>> = {};

  for (const item of projections) {
    statusCounts[item.status] += 1;
    planCounts[item.plan] = (planCounts[item.plan] ?? 0) + 1;
  }

  return {
    success: !hasErrors && projections.length > 0,
    subscriptionCount: projections.length,
    requestedCount,
    unavailableCount,
    statusCounts: Object.freeze(statusCounts),
    planCounts: Object.freeze(planCounts)
  };
}

/**
 * Düz özet öğeleri üretir.
 */
export function buildSubscriptionSummaryItems(
  summary: SubscriptionSummary,
  locale: 'tr' | 'en',
  actorId?: string
): readonly SubscriptionSummaryItem[] {
  const items: SubscriptionSummaryItem[] = [
    { key: 'locale', label: 'Locale', value: locale },
    {
      key: 'subscription-count',
      label: 'Subscription Count',
      value: summary.subscriptionCount
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
      key: 'status-trialing',
      label: 'Status: trialing',
      value: summary.statusCounts.trialing
    },
    {
      key: 'status-active',
      label: 'Status: active',
      value: summary.statusCounts.active
    },
    {
      key: 'status-past_due',
      label: 'Status: past_due',
      value: summary.statusCounts.past_due
    },
    {
      key: 'status-cancelled',
      label: 'Status: cancelled',
      value: summary.statusCounts.cancelled
    },
    {
      key: 'status-paused',
      label: 'Status: paused',
      value: summary.statusCounts.paused
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
