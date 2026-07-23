import type { BusinessAnalyticsSnapshot } from '../models/analytics';
import type { BusinessHealthResult } from '../models/business-health';
import type {
  BusinessKpiSignals,
  BusinessKpiSnapshot,
  BusinessKpiValue,
  KpiComputeInput
} from '../models/business-kpi';
import { createDefaultKPIRegistry, KPIRegistry } from './KPIRegistry';
import { buildKpiTrends } from './KPITrend';

/**
 * Assemble an immutable BusinessKpiSnapshot from computed KPI values.
 */
export function createKpiSnapshot(params: {
  health: BusinessHealthResult;
  analytics: BusinessAnalyticsSnapshot;
  kpis: readonly BusinessKpiValue[];
  previousById?: Readonly<Partial<Record<string, number>>>;
}): BusinessKpiSnapshot {
  const { health, analytics, kpis } = params;
  const trends = buildKpiTrends(kpis, params.previousById ?? {});

  const signals: BusinessKpiSignals = Object.freeze({
    revenueDelta: analytics.revenueDelta,
    costDelta: analytics.costDelta,
    growth: analytics.growth,
    riskScore: analytics.riskScore,
    customerHealth: analytics.customerHealth,
    topMarginCategory: analytics.topMarginCategory,
    topMarginPercent: analytics.topMarginPercent,
    cashDropPercent: analytics.cashDropPercent,
    stockDaysRemaining: analytics.stockDaysRemaining,
    asOf: analytics.asOf
  });

  return Object.freeze({
    asOf: analytics.asOf,
    kpis: Object.freeze(kpis.map((k) => Object.freeze({ ...k }))),
    trends,
    healthScore: health.overallScore,
    signals,
    health,
    analytics
  });
}

/**
 * Compute KPI values from registry plug-ins for a health/analytics input.
 */
export function computeKpiValues(
  registry: KPIRegistry,
  input: KpiComputeInput
): readonly BusinessKpiValue[] {
  return Object.freeze(registry.list().map((plugin) => plugin.compute(input)));
}

export function createKpiSnapshotFromRegistry(
  registry: KPIRegistry,
  health: BusinessHealthResult,
  analytics: BusinessAnalyticsSnapshot,
  previousById?: Readonly<Partial<Record<string, number>>>
): BusinessKpiSnapshot {
  const kpis = computeKpiValues(registry, { health, analytics });
  return createKpiSnapshot({ health, analytics, kpis, previousById });
}

export function createDefaultKpiSnapshotBuilder(): KPIRegistry {
  return createDefaultKPIRegistry();
}

export default createKpiSnapshot;
