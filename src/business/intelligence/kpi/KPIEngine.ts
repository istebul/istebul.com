import type { BusinessAnalyticsSnapshot } from '../models/analytics';
import type { BusinessHealthResult } from '../models/business-health';
import type { BusinessKpiSnapshot } from '../models/business-kpi';
import { createDefaultKPIRegistry, KPIRegistry } from './KPIRegistry';
import { createKpiSnapshotFromRegistry } from './KPISnapshot';

export interface KPIEngineOptions {
  registry?: KPIRegistry;
}

/**
 * KPI Engine — produces immutable KPI snapshots from Business Health + Analytics.
 */
export class KPIEngine {
  private readonly registry: KPIRegistry;
  private lastSnapshot: BusinessKpiSnapshot | null = null;
  private previousValues: Readonly<Partial<Record<string, number>>> = Object.freeze({});

  constructor(options: KPIEngineOptions = {}) {
    this.registry = options.registry ?? createDefaultKPIRegistry();
  }

  /**
   * Build a frozen KPI snapshot from health + analytics.
   */
  compute(
    health: BusinessHealthResult,
    analytics?: BusinessAnalyticsSnapshot
  ): BusinessKpiSnapshot {
    const snapshotAnalytics = analytics ?? health.analytics;
    const snapshot = createKpiSnapshotFromRegistry(
      this.registry,
      health,
      snapshotAnalytics,
      this.previousValues
    );
    this.previousValues = Object.freeze(
      Object.fromEntries(snapshot.kpis.map((k) => [k.id, k.numericValue]))
    );
    this.lastSnapshot = snapshot;
    return snapshot;
  }

  /** Replace last snapshot (used by EventProcessor after KPI patches). */
  adoptSnapshot(snapshot: BusinessKpiSnapshot): BusinessKpiSnapshot {
    this.lastSnapshot = snapshot;
    this.previousValues = Object.freeze(
      Object.fromEntries(snapshot.kpis.map((k) => [k.id, k.numericValue]))
    );
    return snapshot;
  }

  getLastSnapshot(): BusinessKpiSnapshot | null {
    return this.lastSnapshot;
  }

  getRegistry(): KPIRegistry {
    return this.registry;
  }
}

export function createKPIEngine(options: KPIEngineOptions = {}): KPIEngine {
  return new KPIEngine(options);
}

export default KPIEngine;
