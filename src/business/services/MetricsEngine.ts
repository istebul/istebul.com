import type { BusinessDataProvider } from '../types/business-provider';
import type {
  BusinessMetric,
  BusinessMetricId,
  BusinessMetricsResult
} from '../intelligence/types/business-metrics';
import type { RawBusinessData } from '../intelligence/types/raw-business-data';
import type { BusinessAnalyticsSnapshot } from '../intelligence/models/analytics';
import type { BusinessHealthResult } from '../intelligence/models/business-health';
import type { BusinessKpiSnapshot } from '../intelligence/models/business-kpi';
import type { EventIntelligenceResult } from '../intelligence/models/business-events';
import {
  AnalyticsEngine,
  createAnalyticsEngine
} from '../intelligence/core/AnalyticsEngine';
import {
  BusinessHealthEngine,
  createBusinessHealthEngine
} from '../intelligence/health/BusinessHealthEngine';
import { createScoringEngine, ScoringEngine } from '../intelligence/scoring/ScoringEngine';
import { createKPIEngine, KPIEngine } from '../intelligence/kpi/KPIEngine';
import {
  createEventProcessor,
  EventProcessor
} from '../intelligence/events/EventProcessor';
import { getDefaultBusinessDataProvider } from '../providers/ProviderFactory';

/** Derived signals computed for downstream InsightEngine (unchanged contract). */
export interface BusinessMetricSignals {
  revenueDelta: number;
  costDelta: number;
  growth: number;
  riskScore: number;
  customerHealth: number;
  topMarginCategory: string | null;
  topMarginPercent: number | null;
  cashDropPercent: number;
  stockDaysRemaining: number;
  asOf: string;
}

export interface MetricsEngineResult {
  metrics: BusinessMetricsResult;
  signals: BusinessMetricSignals;
  /** EPIC-540 Business Health + executive KPIs (UI markup unchanged). */
  health: BusinessHealthResult;
  /** EPIC-550 immutable KPI snapshot consumed by MetricsEngine. */
  kpi: BusinessKpiSnapshot;
  /** EPIC-550 event intelligence (observational by default). */
  events: EventIntelligenceResult;
}

const CORE_METRIC_IDS: readonly BusinessMetricId[] = Object.freeze([
  'revenue-trend',
  'cost-trend',
  'growth',
  'risk-score',
  'customer-health'
]);

/**
 * Map KPI snapshot → Advisor/Dashboard metrics.
 * Values come from KPI plugins that mirror analytics, preserving EPIC-510 numbers.
 */
function mapKpiSnapshotToMetrics(
  kpi: BusinessKpiSnapshot,
  health: BusinessHealthResult,
  events: EventIntelligenceResult
): MetricsEngineResult {
  const { signals } = kpi;
  const byId = new Map(kpi.kpis.map((k) => [k.id, k]));

  const metricsList: BusinessMetric[] = CORE_METRIC_IDS.map((id) => {
    const kpiValue = byId.get(id);
    if (!kpiValue) {
      throw new Error(`Missing core KPI in snapshot: ${id}`);
    }
    return {
      id,
      label: kpiValue.label,
      value: kpiValue.displayValue,
      numericValue: kpiValue.numericValue,
      unit: kpiValue.unit === 'days' ? 'score' : kpiValue.unit,
      direction: kpiValue.direction,
      periodLabel: kpiValue.periodLabel,
      description: kpiValue.description
    };
  });

  const metrics: BusinessMetricsResult = Object.freeze({
    metrics: Object.freeze(metricsList.map((m) => Object.freeze({ ...m }))),
    generatedAt: signals.asOf
  });

  const metricSignals: BusinessMetricSignals = Object.freeze({
    revenueDelta: signals.revenueDelta,
    costDelta: signals.costDelta,
    growth: signals.growth,
    riskScore: signals.riskScore,
    customerHealth: signals.customerHealth,
    topMarginCategory: signals.topMarginCategory,
    topMarginPercent: signals.topMarginPercent,
    cashDropPercent: signals.cashDropPercent,
    stockDaysRemaining: signals.stockDaysRemaining,
    asOf: signals.asOf
  });

  return Object.freeze({
    metrics,
    signals: metricSignals,
    health,
    kpi,
    events
  });
}

export interface MetricsEngineOptions {
  provider?: BusinessDataProvider;
  analyticsEngine?: AnalyticsEngine;
  scoringEngine?: ScoringEngine;
  healthEngine?: BusinessHealthEngine;
  kpiEngine?: KPIEngine;
  eventProcessor?: EventProcessor;
}

/**
 * Metrics Engine — consumes Health → KPI → Event Intelligence, then maps to metrics.
 * Existing metric/signal values preserved for Dashboard / Advisor UI.
 */
export class MetricsEngine {
  private readonly analyticsEngine: AnalyticsEngine;
  private readonly scoringEngine: ScoringEngine;
  private readonly healthEngine: BusinessHealthEngine;
  private readonly kpiEngine: KPIEngine;
  private readonly eventProcessor: EventProcessor;
  private lastResult: MetricsEngineResult | null = null;

  constructor(
    providerOrOptions: BusinessDataProvider | MetricsEngineOptions = getDefaultBusinessDataProvider()
  ) {
    if (
      providerOrOptions &&
      typeof providerOrOptions === 'object' &&
      'getSnapshot' in providerOrOptions
    ) {
      this.analyticsEngine = createAnalyticsEngine({ provider: providerOrOptions });
      this.scoringEngine = createScoringEngine();
      this.healthEngine = createBusinessHealthEngine({
        scoringEngine: this.scoringEngine
      });
      this.kpiEngine = createKPIEngine();
      this.eventProcessor = createEventProcessor();
    } else {
      const options = providerOrOptions as MetricsEngineOptions;
      this.analyticsEngine =
        options.analyticsEngine ??
        createAnalyticsEngine({
          provider: options.provider ?? getDefaultBusinessDataProvider()
        });
      this.scoringEngine = options.scoringEngine ?? createScoringEngine();
      this.healthEngine =
        options.healthEngine ??
        createBusinessHealthEngine({ scoringEngine: this.scoringEngine });
      this.kpiEngine = options.kpiEngine ?? createKPIEngine();
      this.eventProcessor = options.eventProcessor ?? createEventProcessor();
    }
  }

  compute(): MetricsEngineResult {
    const snapshot: BusinessAnalyticsSnapshot =
      this.analyticsEngine.getLastSnapshot() ?? this.analyticsEngine.compute();
    const scoring = this.scoringEngine.score(snapshot);
    const health = this.healthEngine.evaluateFromScores(scoring);
    const kpi = this.kpiEngine.compute(health, snapshot);
    const processed = this.eventProcessor.processFromSnapshot(kpi);
    this.kpiEngine.adoptSnapshot(processed.kpiSnapshot);
    const events = this.eventProcessor.toIntelligenceResult(processed);
    this.lastResult = mapKpiSnapshotToMetrics(processed.kpiSnapshot, health, events);
    return this.lastResult;
  }

  getLastResult(): MetricsEngineResult | null {
    return this.lastResult;
  }

  getAnalyticsEngine(): AnalyticsEngine {
    return this.analyticsEngine;
  }

  getHealthEngine(): BusinessHealthEngine {
    return this.healthEngine;
  }

  getKPIEngine(): KPIEngine {
    return this.kpiEngine;
  }

  getEventProcessor(): EventProcessor {
    return this.eventProcessor;
  }
}

/** Backward-compatible helper used by EPIC-510 call sites / tests. */
export function computeBusinessMetrics(raw: RawBusinessData): BusinessMetricsResult {
  const provider: BusinessDataProvider = {
    kind: 'mock',
    getSnapshot: () => raw
  };
  return new MetricsEngine(provider).compute().metrics;
}

export default MetricsEngine;
