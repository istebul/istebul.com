import type { BusinessDataProvider } from '../types/business-provider';
import type {
  BusinessMetric,
  BusinessMetricsResult
} from '../intelligence/types/business-metrics';
import type { RawBusinessData } from '../intelligence/types/raw-business-data';
import type { BusinessAnalyticsSnapshot } from '../intelligence/models/analytics';
import type { BusinessHealthResult } from '../intelligence/models/business-health';
import {
  AnalyticsEngine,
  createAnalyticsEngine
} from '../intelligence/core/AnalyticsEngine';
import {
  BusinessHealthEngine,
  createBusinessHealthEngine
} from '../intelligence/health/BusinessHealthEngine';
import { createScoringEngine, ScoringEngine } from '../intelligence/scoring/ScoringEngine';
import { getDefaultBusinessDataProvider } from '../providers/ProviderFactory';
import {
  directionFromDelta,
  formatPercentDelta
} from '../intelligence/utils/analytics-score';

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
}

function mapAnalyticsToMetrics(
  snapshot: BusinessAnalyticsSnapshot,
  health: BusinessHealthResult
): MetricsEngineResult {
  const {
    revenueDelta,
    costDelta,
    growth,
    riskScore,
    customerHealth,
    topMarginCategory,
    topMarginPercent,
    cashDropPercent,
    stockDaysRemaining,
    asOf
  } = snapshot;

  const metricsList: BusinessMetric[] = [
    {
      id: 'revenue-trend',
      label: 'Revenue Trend',
      value: formatPercentDelta(revenueDelta),
      numericValue: revenueDelta,
      unit: 'percent',
      direction: directionFromDelta(revenueDelta),
      periodLabel: 'Son 7 gün',
      description: 'Gelir serisinin dönem başı–sonu değişimi.'
    },
    {
      id: 'cost-trend',
      label: 'Cost Trend',
      value: formatPercentDelta(costDelta),
      numericValue: costDelta,
      unit: 'percent',
      direction: directionFromDelta(costDelta),
      periodLabel: 'Son 7 gün',
      description: 'Operasyonel maliyet trendi.'
    },
    {
      id: 'growth',
      label: 'Growth',
      value: formatPercentDelta(growth),
      numericValue: growth,
      unit: 'percent',
      direction: directionFromDelta(growth),
      periodLabel: 'Müşteri tabanı',
      description: 'Aktif müşteri sayısındaki büyüme.'
    },
    {
      id: 'risk-score',
      label: 'Risk Score',
      value: String(riskScore),
      numericValue: riskScore,
      unit: 'score',
      direction: riskScore >= 60 ? 'up' : riskScore <= 35 ? 'down' : 'flat',
      periodLabel: '0–100',
      description: 'Maliyet, nakit, churn ve stok sinyallerinden türetilen risk skoru.'
    },
    {
      id: 'customer-health',
      label: 'Customer Health',
      value: String(customerHealth),
      numericValue: customerHealth,
      unit: 'score',
      direction: customerHealth >= 70 ? 'up' : customerHealth <= 45 ? 'down' : 'flat',
      periodLabel: '0–100',
      description: 'Churn ve büyüme dengesi üzerinden müşteri sağlığı.'
    }
  ];

  const metrics: BusinessMetricsResult = Object.freeze({
    metrics: Object.freeze(metricsList.map((m) => Object.freeze({ ...m }))),
    generatedAt: asOf
  });

  const signals: BusinessMetricSignals = Object.freeze({
    revenueDelta,
    costDelta,
    growth,
    riskScore,
    customerHealth,
    topMarginCategory,
    topMarginPercent,
    cashDropPercent,
    stockDaysRemaining,
    asOf
  });

  return Object.freeze({ metrics, signals, health });
}

export interface MetricsEngineOptions {
  provider?: BusinessDataProvider;
  analyticsEngine?: AnalyticsEngine;
  scoringEngine?: ScoringEngine;
  healthEngine?: BusinessHealthEngine;
}

/**
 * Metrics Engine — consumes Analytics → Scoring → Health, then maps to KPI metrics.
 * Existing metric/signal values preserved for Dashboard / Advisor UI.
 */
export class MetricsEngine {
  private readonly analyticsEngine: AnalyticsEngine;
  private readonly scoringEngine: ScoringEngine;
  private readonly healthEngine: BusinessHealthEngine;
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
    }
  }

  compute(): MetricsEngineResult {
    const snapshot =
      this.analyticsEngine.getLastSnapshot() ?? this.analyticsEngine.compute();
    const scoring = this.scoringEngine.score(snapshot);
    const health = this.healthEngine.evaluateFromScores(scoring);
    this.lastResult = mapAnalyticsToMetrics(snapshot, health);
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
